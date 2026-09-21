import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { createElement } from 'react';

import {
  getCampaignNow,
  msUntilNextCampaignMidnight,
  refreshCampaignClock,
  subscribeCampaignClock,
} from '@/journey/campaignClock';
import { getDataset, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, rawCampaignDay } from '@/journey/officialDay';
import { daysSinceLastCompletion, WELCOME_BACK_MIN_GAP } from '@/journey/returnGap';
import type { Campaign, JourneyDataset } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { _resetFastingCacheForTests, loadFasting, setFastingKept } from '@/fasting/fastingStore';
import {
  _resetCompletionsCacheForTests,
  COMPLETIONS_PREFIX,
  loadCompletions,
  setDayCompleted,
} from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests, loadReflections, saveReflection } from '@/reflections/reflectionsStore';
import {
  _resetSettingsCacheForTests,
  getCachedSettings,
  loadSettings,
  normalizeSettings,
  SETTINGS_KEY,
  subscribeSettings,
  updateSettings,
} from '@/settings/settingsStore';
import { wipeLocalData } from '@/settings/wipeLocalData';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement: h } = jest.requireActual('react');
  return {
    Redirect: ({ href }: { href: string }) => h(Text, { testID: 'redirect' }, `redirect:${href}`),
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  };
});

const CAMPAIGN_ID = 'dev-fixture-campaign';
const DAY_MS = 86_400_000;
const SP: Campaign = { ...devDataset().campaign, start_date: '2026-09-23', utc_offset_minutes: -180 };

const g = globalThis as unknown as { __DEV__: boolean };
const ORIGINAL_DEV = g.__DEV__;
function simulateRelease() {
  g.__DEV__ = false;
}

/** Dataset cuja data de início faz de HOJE o dia informado (0 = campanha no futuro). */
function datasetOnDay(day: number): JourneyDataset {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * DAY_MS;
  return { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } };
}

function resetCaches() {
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  _resetFastingCacheForTests();
}

beforeEach(async () => {
  g.__DEV__ = ORIGINAL_DEV;
  await AsyncStorage.clear();
  resetCaches();
});

afterEach(() => {
  g.__DEV__ = ORIGINAL_DEV;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(() => resetToDevFixtures());

// ───────────────────────────────────────────── DIA-01 / PER-01 / DIR-01
describe('build de release (__DEV__ = false): nada de DEV tem efeito', () => {
  test('dia simulado salvo no disco é descartado na carga', async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, dev: { dayOverride: 100 } }));
    simulateRelease();
    expect((await loadSettings()).dev.dayOverride).toBeNull();
  });

  test('useJourney ignora o dia simulado: dia e fase vêm só do relógio', async () => {
    expect(loadDataset(datasetOnDay(0), 'development').ok).toBe(true);
    // O cache foi carregado ainda em DEV, com o dia 100 simulado…
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, dev: { dayOverride: 100 } }));
    expect((await loadSettings()).dev.dayOverride).toBe(100);
    // …e mesmo assim, em release, a campanha segue antes do início e nada abre.
    simulateRelease();
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.phase).toBe('before_start');
    expect(result.current.isDayUnlocked(1)).toBe(false);
    expect(result.current.isDayUnlocked(100)).toBe(false);
  });

  test('gravar um dia simulado em release não persiste', async () => {
    simulateRelease();
    await updateSettings((s) => ({ ...s, dev: { dayOverride: 17 } }));
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}').dev.dayOverride).toBeNull();
  });

  test('fixtures fictícias não entram: resetToDevFixtures lança e não troca o conteúdo', () => {
    const before = getDataset();
    simulateRelease();
    expect(() => resetToDevFixtures()).toThrow();
    expect(getDataset()).toBe(before);
  });

  test('o modo "development" do carregador vira "production" em release', () => {
    const before = getDataset();
    simulateRelease();
    const result = loadDataset(devDataset(), 'development');
    expect(result.ok).toBe(false);
    expect(getDataset()).toBe(before);
  });

  test('a rota /dev redireciona para o início', async () => {
    simulateRelease();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DevRoute = require('@/app/dev').default;
    await render(createElement(DevRoute));
    expect(screen.getByTestId('redirect')).toHaveTextContent('redirect:/');
  });
});

// ───────────────────────────────────────────── DIA-02 / R0-5
describe('acolhida de retorno: lacuna pelo instante da última conclusão', () => {
  /** ISO do meio-dia (São Paulo) do dia N da campanha SP. */
  const onCampaignDay = (n: number) => new Date(Date.UTC(2026, 8, 23 + n - 1, 15)).toISOString();

  test('entrou no dia 20 e leu o Dia 1 hoje: lacuna 0', () => {
    expect(daysSinceLastCompletion({ days: { 1: onCampaignDay(20) }, updatedAt: '' }, 20, SP)).toBe(0);
  });

  test('lê todo dia, cinco dias atrás da igreja: lacuna 0, não 5', () => {
    const completions = { days: { 19: onCampaignDay(24), 20: onCampaignDay(25) }, updatedAt: '' };
    expect(daysSinceLastCompletion(completions, 25, SP)).toBe(0);
  });

  test('o limiar garante três dias em aberto ANTES de hoje (R0-5)', () => {
    // Última conclusão no dia 14; hoje 17 → só 15 e 16 em aberto: sem acolhida.
    const two = daysSinceLastCompletion({ days: { 14: onCampaignDay(14) }, updatedAt: '' }, 17, SP)!;
    expect(two).toBe(3);
    expect(two >= WELCOME_BACK_MIN_GAP).toBe(false);
    // Última conclusão no dia 13; hoje 17 → 14, 15 e 16 em aberto: acolhida.
    const three = daysSinceLastCompletion({ days: { 13: onCampaignDay(13) }, updatedAt: '' }, 17, SP)!;
    expect(three).toBe(4);
    expect(three >= WELCOME_BACK_MIN_GAP).toBe(true);
  });

  test('useJourney: quem leu o Dia 10 agora, no dia 17, não recebe a acolhida', async () => {
    expect(loadDataset(datasetOnDay(17), 'development').ok).toBe(true);
    await setDayCompleted(CAMPAIGN_ID, 10, true);
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.gapDays).toBe(0);
    expect(result.current.welcomeBack).toBe(false);
  });

  test('useJourney: ausente há 4 dias com hoje em aberto recebe a acolhida', async () => {
    expect(loadDataset(datasetOnDay(17), 'development').ok).toBe(true);
    await AsyncStorage.setItem(
      `${COMPLETIONS_PREFIX}${CAMPAIGN_ID}`,
      JSON.stringify({ days: { 13: new Date(Date.now() - 4 * DAY_MS).toISOString() }, updatedAt: '' }),
    );
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.gapDays).toBe(4);
    expect(result.current.welcomeBack).toBe(true);
  });
});

// ───────────────────────────────────────────── DIA-04
describe('relógio único com virada na meia-noite de São Paulo', () => {
  test('tempo até a próxima meia-noite no fuso da campanha', () => {
    // 23h59 em São Paulo (02h59 UTC) → 60 s até a meia-noite, mais a folga de 1 s.
    expect(msUntilNextCampaignMidnight(new Date('2026-09-23T02:59:00Z'), -180)).toBe(61_000);
    // 00h00 em ponto → um dia inteiro até a próxima.
    expect(msUntilNextCampaignMidnight(new Date('2026-09-23T03:00:00Z'), -180)).toBe(DAY_MS + 1_000);
  });

  test('todas as instâncias viram de dia juntas, sem sair do app', () => {
    jest.useFakeTimers({ now: new Date('2026-09-23T02:59:30Z') }); // 22/09, 23h59m30s em SP
    loadDataset(devDataset(), 'development');
    const campaign = { ...SP };
    const a = jest.fn();
    const b = jest.fn();
    const offA = subscribeCampaignClock(a);
    const offB = subscribeCampaignClock(b);
    expect(rawCampaignDay(getCampaignNow(), campaign)).toBe(0);
    jest.advanceTimersByTime(31_000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(rawCampaignDay(getCampaignNow(), campaign)).toBe(1);
    offA();
    offB();
  });

  test('refreshCampaignClock (volta do background) avisa quem ouve', () => {
    const listener = jest.fn();
    const off = subscribeCampaignClock(listener);
    refreshCampaignClock();
    expect(listener).toHaveBeenCalled();
    off();
  });

  test('useJourney expõe daysToStart do mesmo relógio da fase', async () => {
    expect(loadDataset(datasetOnDay(-2), 'development').ok).toBe(true);
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.phase).toBe('before_start');
    expect(result.current.daysToStart).toBe(3);
  });
});

// ───────────────────────────────────────────── PER-02
describe('grava no disco antes de atualizar o cache', () => {
  test('reflexão: falha de disco rejeita e o cache não finge que salvou', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco cheio'));
    await expect(saveReflection(CAMPAIGN_ID, 3, 'texto')).rejects.toThrow('disco cheio');
    expect((await loadReflections(CAMPAIGN_ID)).byDay[3]).toBeUndefined();
  });

  test('conclusão: falha de disco rejeita e o dia segue em aberto', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('E/S'));
    await expect(setDayCompleted(CAMPAIGN_ID, 5, true)).rejects.toThrow('E/S');
    expect((await loadCompletions(CAMPAIGN_ID)).days[5]).toBeUndefined();
    // A próxima gravação não carrega a que falhou.
    await setDayCompleted(CAMPAIGN_ID, 6, true);
    expect(Object.keys((await loadCompletions(CAMPAIGN_ID)).days)).toEqual(['6']);
  });

  test('jejum e preferências seguem a mesma regra', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('y'));
    await expect(setFastingKept(CAMPAIGN_ID, 2, true)).rejects.toThrow('x');
    await expect(updateSettings((s) => ({ ...s, ministry: 'Louvor' }))).rejects.toThrow('y');
    expect((await loadFasting(CAMPAIGN_ID)).days[2]).toBeUndefined();
    expect((await loadSettings()).ministry).toBeNull();
  });

  test('duas gravações seguidas não se apagam (fila)', async () => {
    await Promise.all([
      updateSettings((s) => ({ ...s, ministry: 'Louvor' })),
      updateSettings((s) => ({ ...s, fastingEnabled: true })),
    ]);
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored.ministry).toBe('Louvor');
    expect(stored.fastingEnabled).toBe(true);
  });
});

// ───────────────────────────────────────────── PER-03
describe('apagar tudo limpa disco e caches', () => {
  test('nada volta na gravação seguinte', async () => {
    await setDayCompleted(CAMPAIGN_ID, 1, true);
    await saveReflection(CAMPAIGN_ID, 1, 'segredo');
    await setFastingKept(CAMPAIGN_ID, 1, true);
    await updateSettings((s) => ({ ...s, onboardingCompleted: true, ministry: 'X' }));
    const notified = jest.fn();
    const off = subscribeSettings(notified);

    await wipeLocalData();
    off();

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(notified).toHaveBeenCalled();
    expect(getCachedSettings()?.onboardingCompleted).toBe(false);
    expect(Object.keys((await loadCompletions(CAMPAIGN_ID)).days)).toEqual([]);
    expect((await loadReflections(CAMPAIGN_ID)).byDay).toEqual({});
    expect((await loadFasting(CAMPAIGN_ID)).days).toEqual({});

    await setDayCompleted(CAMPAIGN_ID, 3, true);
    await saveReflection(CAMPAIGN_ID, 3, 'nova');
    await updateSettings((s) => ({ ...s, readerFontSize: 21 }));
    const comp = JSON.parse((await AsyncStorage.getItem(`${COMPLETIONS_PREFIX}${CAMPAIGN_ID}`)) ?? '{}');
    const settings = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(Object.keys(comp.days)).toEqual(['3']);
    expect(settings.onboardingCompleted).toBe(false);
    expect(settings.ministry).toBeNull();
  });
});

// ───────────────────────────────────────────── PER-05
describe('normalização única das preferências', () => {
  test('18 antigo vira 19 na carga, e só na carga', async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ readerFontSize: 18 }));
    expect((await loadSettings()).readerFontSize).toBe(19);
  });

  test('campos de tipo errado ou fora da faixa voltam ao padrão', () => {
    const s = normalizeSettings({
      onboardingCompleted: 'sim',
      readingMode: 'audio',
      reminder: { slot: 'noite', hour: 30, minute: -1 },
      readerFontSize: 99,
      milestonesSeen: [7, 'x', 1.5],
      ministry: '',
      dev: { dayOverride: 'dez', slowLoad: true },
    });
    expect(s.onboardingCompleted).toBe(false);
    expect(s.readingMode).toBeNull();
    expect(s.reminder).toEqual({ slot: 'none', hour: 7, minute: 0 });
    expect(s.readerFontSize).toBe(30);
    expect(s.milestonesSeen).toEqual([7]);
    expect(s.ministry).toBeNull();
    expect(s.dev).toEqual({ dayOverride: null });
  });

  test('toda gravação passa pela mesma normalização', async () => {
    await updateSettings((s) => ({ ...s, readerFontSize: 18 }));
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}').readerFontSize).toBe(19);
  });
});
