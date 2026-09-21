/**
 * Modo demonstração (pedido do fundador, 2026-09-21): ver o app como se a
 * campanha já tivesse começado, sem o painel de desenvolvimento. Só liga com
 * __DEV__ e EXPO_PUBLIC_DEMO_MODE=true; em release nada disso tem efeito.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, renderHook, screen, waitFor } from '@testing-library/react-native';

import YouScreen from '@/app/(tabs)/voce';
import { DEMO_DAY_DEFAULT, demoDay, demoSeedDays, isDemoMode } from '@/config/demo';
import { _resetDemoSeedForTests } from '@/journey/demoSeed';
import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { _resetCompletionsCacheForTests, COMPLETIONS_PREFIX, setDayCompleted } from '@/progress/completionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const CAMPAIGN_ID = 'dev-fixture-campaign';
const DAY_MS = 86_400_000;
const g = globalThis as unknown as { __DEV__: boolean };
const ORIGINAL_DEV = g.__DEV__;

/** Dataset cuja data de início deixa HOJE dois dias antes do Dia 1 (como em 21/09). */
function datasetBeforeStart(): JourneyDataset {
  const base = devDataset();
  const todayInTz = calendarDateInCampaignTz(new Date(), base.campaign);
  const [y, m, d] = todayInTz.split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) + 2 * DAY_MS;
  return { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } };
}

async function mountJourney() {
  expect(loadDataset(datasetBeforeStart(), 'development').ok).toBe(true);
  const hook = await renderHook(() => useJourney());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

async function storedDays(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(`${COMPLETIONS_PREFIX}${CAMPAIGN_ID}`);
  if (!raw) return [];
  return Object.keys((JSON.parse(raw) as { days: Record<string, string> }).days).map(Number).sort((a, b) => a - b);
}

function setDemoEnv(mode: string | undefined, day?: string) {
  if (mode === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE;
  else process.env.EXPO_PUBLIC_DEMO_MODE = mode;
  if (day === undefined) delete process.env.EXPO_PUBLIC_DEMO_DAY;
  else process.env.EXPO_PUBLIC_DEMO_DAY = day;
}

beforeEach(async () => {
  g.__DEV__ = true;
  setDemoEnv(undefined);
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetDemoSeedForTests();
});

afterEach(() => {
  g.__DEV__ = ORIGINAL_DEV;
  setDemoEnv(undefined);
});

afterAll(() => resetToDevFixtures());

describe('leitura das variáveis', () => {
  test('liga só com EXPO_PUBLIC_DEMO_MODE exatamente "true"', () => {
    setDemoEnv('1');
    expect(isDemoMode()).toBe(false);
    setDemoEnv('TRUE');
    expect(isDemoMode()).toBe(false);
    setDemoEnv('true');
    expect(isDemoMode()).toBe(true);
  });

  test('dia padrão 3; valor inválido volta ao padrão', () => {
    setDemoEnv('true');
    expect(demoDay()).toBe(DEMO_DAY_DEFAULT);
    expect(DEMO_DAY_DEFAULT).toBe(3);
    setDemoEnv('true', '17');
    expect(demoDay()).toBe(17);
    for (const bad of ['0', '-2', '2.5', 'dez', '101', ' ']) {
      setDemoEnv('true', bad);
      expect(demoDay()).toBe(DEMO_DAY_DEFAULT);
    }
    setDemoEnv(undefined, '17');
    expect(demoDay()).toBeNull();
  });

  test('progresso de exemplo: 1..(dia − 2); o dia anterior fica em aberto', () => {
    expect(demoSeedDays(1)).toEqual([]);
    expect(demoSeedDays(2)).toEqual([]);
    expect(demoSeedDays(3)).toEqual([1]);
    expect(demoSeedDays(6)).toEqual([1, 2, 3, 4]);
  });
});

describe('com __DEV__ e o modo ligado', () => {
  test('a campanha aparece em curso no dia da demonstração, com progresso de exemplo', async () => {
    setDemoEnv('true');
    const { result } = await mountJourney();
    expect(result.current.phase).toBe('running');
    expect(result.current.officialDay).toBe(3);
    await waitFor(() => expect(result.current.completedCount).toBe(1));
    expect(result.current.dayState(1)).toBe('completed');
    expect(result.current.dayState(2)).toBe('pending');
    expect(result.current.dayState(3)).toBe('today');
    expect(await storedDays()).toEqual([1]);
  });

  test('o dia simulado não é gravado nas preferências: desligar volta à data real', async () => {
    setDemoEnv('true', '10');
    const first = await mountJourney();
    expect(first.result.current.officialDay).toBe(10);
    const saved = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}') as { dev?: { dayOverride?: unknown } };
    expect(saved.dev?.dayOverride ?? null).toBeNull();
    await first.unmount();

    setDemoEnv(undefined);
    _resetSettingsCacheForTests();
    const second = await mountJourney();
    expect(second.result.current.phase).toBe('before_start');
  });

  test('não mexe no progresso de quem já marcou algo', async () => {
    setDemoEnv('true', '8');
    await setDayCompleted(CAMPAIGN_ID, 5, true);
    _resetCompletionsCacheForTests();
    const { result } = await mountJourney();
    expect(result.current.officialDay).toBe(8);
    await new Promise((r) => setTimeout(r, 20));
    expect(await storedDays()).toEqual([5]);
  });

  test('o dia escolhido no painel DEV vale mais que o da demonstração', async () => {
    setDemoEnv('true', '3');
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, dev: { dayOverride: 25 } }));
    _resetSettingsCacheForTests();
    const { result } = await mountJourney();
    expect(result.current.officialDay).toBe(25);
  });

  test('a faixa de conteúdo não autorizado continua valendo', async () => {
    setDemoEnv('true');
    const { result } = await mountJourney();
    expect(result.current.isDevContent).toBe(true);
  });

  test('o Você esconde a entrada do painel de desenvolvimento', async () => {
    setDemoEnv('true');
    expect(loadDataset(datasetBeforeStart(), 'development').ok).toBe(true);
    await render(<YouScreen />);
    await screen.findByTestId('row-help');
    expect(screen.queryByText('Painel de desenvolvimento')).toBeNull();
  });

  test('sem o modo, o painel continua no Você em desenvolvimento', async () => {
    expect(loadDataset(datasetBeforeStart(), 'development').ok).toBe(true);
    await render(<YouScreen />);
    await screen.findByTestId('row-help');
    expect(screen.getByText('Painel de desenvolvimento')).toBeTruthy();
  });
});

describe('build de release (__DEV__ = false): nada do modo demonstração liga', () => {
  test('as variáveis são ignoradas', () => {
    g.__DEV__ = false;
    setDemoEnv('true', '17');
    expect(isDemoMode()).toBe(false);
    expect(demoDay()).toBeNull();
  });

  test('a campanha segue a data real e nenhum progresso é gravado', async () => {
    // A fixture só carrega em desenvolvimento; depois o build passa a se comportar como release.
    expect(loadDataset(datasetBeforeStart(), 'development').ok).toBe(true);
    g.__DEV__ = false;
    setDemoEnv('true', '17');
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.phase).toBe('before_start');
    expect(result.current.officialDay).not.toBe(17);
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.completedCount).toBe(0);
    expect(await storedDays()).toEqual([]);
  });
});
