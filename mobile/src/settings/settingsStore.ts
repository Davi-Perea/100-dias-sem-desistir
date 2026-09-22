import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { isGoalId, type GoalId } from '@/config/goals';
import { isDevBuild } from '@/journey/devBuild';
import { createWriteQueue } from '@/progress/writeQueue';
import { READER_FONT_DEFAULT, normalizeReaderFontSize } from '@/reader/readerFontSize';

/** Preferências e estado de onboarding. LOCAL-ONLY (spec §21). */

export type ReadingMode = 'in_app' | 'own_bible' | 'both';
export type ReminderSlot = 'morning' | 'afternoon' | 'evening' | 'custom' | 'none';

/** Limite do nome: cabe em qualquer saudação sem quebrar a tela. */
export const PROFILE_NAME_MAX = 40;

export type Profile = { name: string | null; goals: GoalId[] };

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
   * Marcos que a pessoa guardou com "Guardar este marco" (E3). Distinto de
   * "visto", que é gravado na abertura: sem isso, reabrir a tela voltava o
   * rótulo para "Guardar este marco". Só neste aparelho; apagado com o resto.
   */
  milestonesKept: number[];
  /**
   * Ministério da pessoa, escolhido localmente entre os da escala. Serve para
   * destacar os dias do ministério e avisar na véspera. Não vai para servidor.
   */
  ministry: string | null;
  /** Aviso local diário às 12h com quem conduz o altar de hoje. Opt-in. */
  altarReminder: boolean;
  /**
   * Perfil local da entrada (E4): como a pessoa quer ser chamada e as metas
   * dela para os 100 dias. SÓ neste aparelho, nunca em analytics ou servidor
   * (metas como "jejuar" são dado de fé). Não é o perfil da comunidade.
   */
  profile: Profile;
  /**
   * Ferramentas de desenvolvimento. Em build de release são descartadas na carga
   * e na gravação, e o useJourney as ignora (DIA-01/PER-01): nada de DEV vale na loja.
   * R4-15: "Carregamento lento" e "Falha ao carregar" saíram — nada os lia.
   */
  dev: { dayOverride: number | null };
};

export const SETTINGS_KEY = 'settings:v2';

export const DEFAULT_SETTINGS: Settings = {
  onboardingCompleted: false,
  readingMode: null,
  lastUsedReadingMode: null,
  fastingEnabled: false,
  reminder: { slot: 'none', hour: 7, minute: 0 },
  readerFontSize: READER_FONT_DEFAULT,
  analyticsEnabled: false,
  milestonesSeen: [],
  milestonesKept: [],
  ministry: null,
  altarReminder: false,
  profile: { name: null, goals: [] },
  dev: { dayOverride: null },
};

/**
 * Nome: espaços das pontas e repetidos saem, vazio vira null, corta no limite.
 * Exportada para a tela aplicar a mesma regra antes de gravar.
 */
export function normalizeProfileName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 0 ? Array.from(clean).slice(0, PROFILE_NAME_MAX).join('').trim() : null;
}

function normalizeProfile(value: unknown): Profile {
  const p = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const goals = Array.isArray(p.goals) ? p.goals.filter(isGoalId) : [];
  return { name: normalizeProfileName(p.name), goals: Array.from(new Set(goals)) };
}

let cache: Settings | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const enqueue = createWriteQueue();

const READING_MODES: readonly ReadingMode[] = ['in_app', 'own_bible', 'both'];
const REMINDER_SLOTS: readonly ReminderSlot[] = ['morning', 'afternoon', 'evening', 'custom', 'none'];

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T | null): T | null =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const intIn = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;

/**
 * Normalização ÚNICA das preferências (PER-05): roda na carga e em toda gravação,
 * então nenhuma tela precisa corrigir valor salvo por conta própria. Campo
 * ausente, de tipo errado ou fora da faixa volta ao padrão; campos que esta
 * versão não conhece passam intactos.
 */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const reminder = (r.reminder && typeof r.reminder === 'object' ? r.reminder : {}) as Record<string, unknown>;
  const dev = (r.dev && typeof r.dev === 'object' ? r.dev : {}) as Record<string, unknown>;
  const override = dev.dayOverride;
  return {
    ...(r as Partial<Settings>),
    onboardingCompleted: bool(r.onboardingCompleted, d.onboardingCompleted),
    readingMode: oneOf(READING_MODES, r.readingMode, null),
    lastUsedReadingMode: oneOf(READING_MODES, r.lastUsedReadingMode, null),
    fastingEnabled: bool(r.fastingEnabled, d.fastingEnabled),
    reminder: {
      slot: oneOf(REMINDER_SLOTS, reminder.slot, d.reminder.slot) ?? d.reminder.slot,
      hour: intIn(reminder.hour, 0, 23, d.reminder.hour),
      minute: intIn(reminder.minute, 0, 59, d.reminder.minute),
    },
    // Escala do B3: 18 era o padrão antigo e vira 19 aqui, para toda tela
    // (Aparência, leitor, D1) ver o mesmo valor.
    readerFontSize: normalizeReaderFontSize(r.readerFontSize as number | undefined),
    analyticsEnabled: bool(r.analyticsEnabled, d.analyticsEnabled),
    milestonesSeen: Array.isArray(r.milestonesSeen)
      ? r.milestonesSeen.filter((day): day is number => typeof day === 'number' && Number.isInteger(day))
      : [],
    milestonesKept: Array.isArray(r.milestonesKept)
      ? r.milestonesKept.filter((day): day is number => typeof day === 'number' && Number.isInteger(day))
      : [],
    ministry: typeof r.ministry === 'string' && r.ministry.length > 0 ? r.ministry : null,
    altarReminder: bool(r.altarReminder, d.altarReminder),
    profile: normalizeProfile(r.profile),
    // Em release, nada de DEV sobrevive (DIA-01/PER-01).
    dev: {
      dayOverride:
        isDevBuild() && typeof override === 'number' && Number.isInteger(override) && override >= 1 ? override : null,
    },
  };
}

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  let value: Settings;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    value = raw ? normalizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    value = DEFAULT_SETTINGS;
  }
  // Uma gravação pode ter terminado enquanto o disco era lido: ela vale mais.
  if (cache) return cache;
  cache = value;
  return cache;
}

/** Grava no disco e só então atualiza o cache (PER-02). Se o disco falhar, rejeita e nada muda. */
export function updateSettings(patch: (current: Settings) => Settings): Promise<Settings> {
  return enqueue(async () => {
    const next = normalizeSettings(patch(await loadSettings()));
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    cache = next;
    emit();
    return next;
  });
}

/** Volta as preferências ao padrão, no disco e no cache, e avisa as telas (PER-03). */
export function wipeSettings(): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    cache = DEFAULT_SETTINGS;
    emit();
  });
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
