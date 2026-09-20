import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** Preferências e estado de onboarding. LOCAL-ONLY (spec §21). */

export type ReadingMode = 'in_app' | 'own_bible' | 'both';
export type ReminderSlot = 'morning' | 'afternoon' | 'evening' | 'custom' | 'none';

export type Settings = {
  onboardingCompleted: boolean;
  readingMode: ReadingMode | null;
  /** Última forma de leitura efetivamente usada; o Hoje lembra dela (spec §5, tela 2). */
  lastUsedReadingMode: ReadingMode | null;
  fastingEnabled: boolean;
  reminder: { slot: ReminderSlot; hour: number; minute: number };
  readerFontSize: number;
  analyticsEnabled: boolean;
  /**
   * Marcos já mostrados em tela cheia. O handoff pede que a tela de marco
   * apareça UMA vez; guardar isso evita que ela reapareça a cada retorno.
   */
  milestonesSeen: number[];
  /**
   * Ministério da pessoa, escolhido localmente entre os da escala. Serve para
   * destacar os dias do ministério e avisar na véspera. Não vai para servidor.
   */
  ministry: string | null;
  /** Aviso local diário às 12h com quem conduz o altar de hoje. Opt-in. */
  altarReminder: boolean;
  /** Ferramentas de desenvolvimento; nunca visíveis em produção. */
  dev: { slowLoad: boolean; failLoad: boolean; dayOverride: number | null };
};

export const SETTINGS_KEY = 'settings:v2';

export const DEFAULT_SETTINGS: Settings = {
  onboardingCompleted: false,
  readingMode: null,
  lastUsedReadingMode: null,
  fastingEnabled: false,
  reminder: { slot: 'none', hour: 7, minute: 0 },
  readerFontSize: 18,
  analyticsEnabled: false,
  milestonesSeen: [],
  ministry: null,
  altarReminder: false,
  dev: { slowLoad: false, failLoad: false, dayOverride: null },
};

let cache: Settings | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function merge(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    reminder: { ...DEFAULT_SETTINGS.reminder, ...(r.reminder ?? {}) },
    milestonesSeen: Array.isArray(r.milestonesSeen) ? r.milestonesSeen.filter((d) => typeof d === 'number') : [],
    dev: { ...DEFAULT_SETTINGS.dev, ...(r.dev ?? {}) },
  };
}

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    cache = raw ? merge(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache;
}

export async function updateSettings(patch: (current: Settings) => Settings): Promise<Settings> {
  const next = patch(await loadSettings());
  cache = next;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  emit();
  return next;
}

export function getCachedSettings(): Settings | null {
  return cache;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** null enquanto carrega do disco. */
export function useSettings(): Settings | null {
  const [state, setState] = useState<Settings | null>(cache);
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setState(s));
    const unsubscribe = subscribeSettings(() => alive && setState(cache));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return state;
}

export function useUpdateSettings() {
  return useCallback((patch: (current: Settings) => Settings) => updateSettings(patch), []);
}

export function _resetSettingsCacheForTests() {
  cache = null;
}
