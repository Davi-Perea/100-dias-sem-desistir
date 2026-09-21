import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { createWriteQueue } from './writeQueue';

/**
 * Conclusão de leitura por dia da jornada. LOCAL-first (spec §21/§22): funciona offline
 * e é a fonte de verdade do progresso pessoal. A sincronização com `user_day_completions`
 * entra quando o backend for conectado — sem event sourcing (spec §21).
 */
export type Completions = {
  /** day_number → ISO timestamp da conclusão. */
  days: Record<number, string>;
  updatedAt: string;
};

export const COMPLETIONS_PREFIX = 'completions:v1:';
const EMPTY: Completions = { days: {}, updatedAt: '' };
const keyFor = (campaignId: string) => `${COMPLETIONS_PREFIX}${campaignId}`;

const cache = new Map<string, Completions>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const enqueue = createWriteQueue();

export async function loadCompletions(campaignId: string): Promise<Completions> {
  const cached = cache.get(campaignId);
  if (cached) return cached;
  let value: Completions = EMPTY;
  try {
    const raw = await AsyncStorage.getItem(keyFor(campaignId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Completions>;
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
export function setDayCompleted(campaignId: string, dayNumber: number, completed: boolean): Promise<Completions> {
  return enqueue(async () => {
    const current = await loadCompletions(campaignId);
    const days = { ...current.days };
    if (completed) days[dayNumber] = new Date().toISOString();
    else delete days[dayNumber];
    const next: Completions = { days, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(keyFor(campaignId), JSON.stringify(next));
    cache.set(campaignId, next);
    emit();
    return next;
  });
}

export function isDayCompleted(completions: Completions | null, dayNumber: number): boolean {
  return !!completions?.days[dayNumber];
}

export function completedCount(completions: Completions | null): number {
  return completions ? Object.keys(completions.days).length : 0;
}

export function completedDayNumbers(completions: Completions | null): number[] {
  return completions ? Object.keys(completions.days).map(Number).sort((a, b) => a - b) : [];
}

/** Dias já liberados (≤ dia oficial) que continuam pendentes — nunca chamados de "falha" (spec §8). */
export function pendingDaysUpTo(completions: Completions | null, officialDay: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= officialDay; d++) if (!isDayCompleted(completions, d)) out.push(d);
  return out;
}

/**
 * Instante da conclusão mais recente (qualquer dia). A lacuna da acolhida de
 * retorno é medida a partir dele (`journey/returnGap.ts`, DIA-02).
 */
export function lastCompletionInstant(completions: Completions | null): Date | null {
  let latest: number | null = null;
  for (const iso of Object.values(completions?.days ?? {})) {
    const ms = Date.parse(iso);
    if (Number.isFinite(ms) && (latest === null || ms > latest)) latest = ms;
  }
  return latest === null ? null : new Date(latest);
}

export function resetCompletions(campaignId: string): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.removeItem(keyFor(campaignId));
    cache.delete(campaignId);
    emit();
  });
}

/** Apaga o progresso de TODAS as campanhas, no disco e no cache, e avisa as telas (PER-03). */
export function wipeAllCompletions(): Promise<void> {
  return enqueue(async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(COMPLETIONS_PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    cache.clear();
    emit();
  });
}

export function subscribeCompletions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCompletions(campaignId: string): Completions | null {
  const [state, setState] = useState<Completions | null>(cache.get(campaignId) ?? null);
  useEffect(() => {
    let alive = true;
    loadCompletions(campaignId).then((c) => alive && setState(c));
    const unsubscribe = subscribeCompletions(() => {
      loadCompletions(campaignId).then((c) => alive && setState(c));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [campaignId]);
  return state;
}

export function _resetCompletionsCacheForTests() {
  cache.clear();
}
