import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { createWriteQueue } from '@/progress/writeQueue';

/**
 * Jejum: acompanhamento PRIVADO de uma decisão já tomada (spec §9).
 * LOCAL-ONLY e permanentemente fora de grupo, líder, admin, analytics, ranking e nuvem.
 * Nenhuma função aqui pode ganhar um caminho de rede.
 */
export type FastingLog = { days: Record<number, string>; updatedAt: string };

export const FASTING_PREFIX = 'fasting:v1:';
const EMPTY: FastingLog = { days: {}, updatedAt: '' };
const keyFor = (campaignId: string) => `${FASTING_PREFIX}${campaignId}`;

const cache = new Map<string, FastingLog>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const enqueue = createWriteQueue();

export async function loadFasting(campaignId: string): Promise<FastingLog> {
  const cached = cache.get(campaignId);
  if (cached) return cached;
  let value: FastingLog = EMPTY;
  try {
    const raw = await AsyncStorage.getItem(keyFor(campaignId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FastingLog>;
      const days: Record<number, string> = {};
      for (const [k, v] of Object.entries(parsed.days ?? {})) {
        const n = Number(k);
        if (Number.isInteger(n) && typeof v === 'string') days[n] = v;
      }
      value = { days, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '' };
    }
  } catch {
    value = EMPTY;
  }
  // Uma gravação pode ter terminado enquanto o disco era lido: ela vale mais.
  const settled = cache.get(campaignId);
  if (settled) return settled;
  cache.set(campaignId, value);
  return value;
}

/** Grava no disco e só então atualiza o cache (PER-02). Se o disco falhar, rejeita e nada muda. */
export function setFastingKept(campaignId: string, dayNumber: number, kept: boolean): Promise<FastingLog> {
  return enqueue(async () => {
    const current = await loadFasting(campaignId);
    const days = { ...current.days };
    if (kept) days[dayNumber] = new Date().toISOString();
    else delete days[dayNumber];
    const next: FastingLog = { days, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(keyFor(campaignId), JSON.stringify(next));
    cache.set(campaignId, next);
    emit();
    return next;
  });
}

export function isFastingKept(log: FastingLog | null, dayNumber: number): boolean {
  return !!log?.days[dayNumber];
}

export function fastingKeptCount(log: FastingLog | null): number {
  return log ? Object.keys(log.days).length : 0;
}

export function fastingKeptDays(log: FastingLog | null): number[] {
  return log ? Object.keys(log.days).map(Number).sort((a, b) => a - b) : [];
}

export function resetFasting(campaignId: string): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.removeItem(keyFor(campaignId));
    cache.delete(campaignId);
    emit();
  });
}

/** Apaga o jejum de TODAS as campanhas, no disco e no cache, e avisa as telas (PER-03). */
export function wipeAllFasting(): Promise<void> {
  return enqueue(async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(FASTING_PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    cache.clear();
    emit();
  });
}

export function subscribeFasting(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFasting(campaignId: string): FastingLog | null {
  const [state, setState] = useState<FastingLog | null>(cache.get(campaignId) ?? null);
  useEffect(() => {
    let alive = true;
    loadFasting(campaignId).then((f) => alive && setState(f));
    const unsubscribe = subscribeFasting(() => {
      loadFasting(campaignId).then((f) => alive && setState(f));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [campaignId]);
  return state;
}

export function _resetFastingCacheForTests() {
  cache.clear();
}
