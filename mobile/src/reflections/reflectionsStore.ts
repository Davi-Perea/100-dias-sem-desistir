import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * Reflexão privada por dia (spec §11). LOCAL-ONLY: não vai ao backend, não é analisada,
 * não alimenta analytics e não entra em IA. "Compartilhar insight" é uma ação social
 * separada, com campo próprio que começa vazio — nada privado vira público sozinho.
 */
export type Reflections = { byDay: Record<number, { body: string; updatedAt: string }> };

export const REFLECTIONS_PREFIX = 'reflections:v1:';
const EMPTY: Reflections = { byDay: {} };
const keyFor = (campaignId: string) => `${REFLECTIONS_PREFIX}${campaignId}`;

const cache = new Map<string, Reflections>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadReflections(campaignId: string): Promise<Reflections> {
  const cached = cache.get(campaignId);
  if (cached) return cached;
  let value: Reflections = EMPTY;
  try {
    const raw = await AsyncStorage.getItem(keyFor(campaignId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Reflections>;
      const byDay: Reflections['byDay'] = {};
      for (const [k, v] of Object.entries(parsed.byDay ?? {})) {
        const n = Number(k);
        const entry = v as { body?: unknown; updatedAt?: unknown };
        if (Number.isInteger(n) && typeof entry?.body === 'string') {
          byDay[n] = { body: entry.body, updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '' };
        }
      }
      value = { byDay };
    }
  } catch {
    value = EMPTY;
  }
  cache.set(campaignId, value);
  return value;
}

export async function saveReflection(campaignId: string, dayNumber: number, body: string): Promise<Reflections> {
  const current = await loadReflections(campaignId);
  const byDay = { ...current.byDay };
  const trimmed = body.trim();
  if (trimmed) byDay[dayNumber] = { body: trimmed, updatedAt: new Date().toISOString() };
  else delete byDay[dayNumber];
  const next: Reflections = { byDay };
  cache.set(campaignId, next);
  await AsyncStorage.setItem(keyFor(campaignId), JSON.stringify(next));
  emit();
  return next;
}

export const deleteReflection = (campaignId: string, dayNumber: number) => saveReflection(campaignId, dayNumber, '');

export function getReflection(reflections: Reflections | null, dayNumber: number): string {
  return reflections?.byDay[dayNumber]?.body ?? '';
}

export function reflectionCount(reflections: Reflections | null): number {
  return reflections ? Object.keys(reflections.byDay).length : 0;
}

export function reflectionDays(reflections: Reflections | null): number[] {
  return reflections ? Object.keys(reflections.byDay).map(Number).sort((a, b) => a - b) : [];
}

export async function resetReflections(campaignId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(campaignId));
  cache.delete(campaignId);
  emit();
}

export function subscribeReflections(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReflections(campaignId: string): Reflections | null {
  const [state, setState] = useState<Reflections | null>(cache.get(campaignId) ?? null);
  useEffect(() => {
    let alive = true;
    loadReflections(campaignId).then((r) => alive && setState(r));
    const unsubscribe = subscribeReflections(() => {
      loadReflections(campaignId).then((r) => alive && setState(r));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [campaignId]);
  return state;
}

export function _resetReflectionsCacheForTests() {
  cache.clear();
}
