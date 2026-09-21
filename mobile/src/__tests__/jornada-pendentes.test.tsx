import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import JourneyHome from '@/app/(tabs)/index';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { entryMessage } from '@/journey/returnGap';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { _resetEntryDismissalForTests, ENTRY_DISMISS_KEY } from '@/ui/jornada/entryDismissal';
import { buildRows } from '@/ui/jornada/rows';

/**
 * Pedido do fundador (2026-09-21): os dias em aberto aparecem, mas o destaque é
 * hoje. Acima de hoje só os três dias mais recentes; o resto numa linha recolhida.
 * Ao entrar, uma mensagem com o número de dias em aberto (nunca "perdidos").
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
  useSegments: () => ['(tabs)'],
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const CAMPAIGN = 'dev-fixture-campaign';
const MARK_17 = `${CAMPAIGN}:17`;

function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('fixture inválida no teste');
}

async function seedCompletions(days: number[]) {
  const at = new Date().toISOString();
  await AsyncStorage.setItem(
    `completions:v1:${CAMPAIGN}`,
    JSON.stringify({ days: Object.fromEntries(days.map((d) => [d, at])), updatedAt: at }),
  );
  _resetCompletionsCacheForTests();
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function listRows() {
  return screen.getByTestId('journey-list').props.data as { kind: string; day?: number; from?: number }[];
}

/** A lista abre rolada até hoje; no harness, as linhas de cima só existem depois de ela "ver" o topo. */
async function scrollListToTop() {
  const list = screen.getByTestId('journey-list');
  await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 3000 } } });
  await fireEvent(list, 'contentSizeChange', 390, 9000);
  await fireEvent.scroll(list, {
    nativeEvent: {
      contentOffset: { x: 0, y: 0 },
      contentSize: { width: 390, height: 9000 },
      layoutMeasurement: { width: 390, height: 3000 },
    },
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  _resetEntryDismissalForTests();
  mockRouter.push.mockClear();
  loadCampaignOnDay(17);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
});

/* ------------------------------------------------------------ as linhas */

describe('acima de hoje, só os três dias mais recentes', () => {
  test('o resto vira uma linha recolhida no topo; o futuro continua recolhido', () => {
    const rows = buildRows(17, 100, false, []);
    expect(rows.slice(0, 5)).toEqual([
      { kind: 'gap', from: 1, to: 13 },
      { kind: 'day', day: 14 },
      { kind: 'day', day: 15 },
      { kind: 'day', day: 16 },
      { kind: 'day', day: 17 },
    ]);
    expect(rows.slice(5)).toEqual([
      { kind: 'day', day: 18 },
      { kind: 'day', day: 19 },
      { kind: 'day', day: 20 },
      { kind: 'gap', from: 21, to: 99 },
      { kind: 'day', day: 100 },
    ]);
  });

  test('no começo da campanha não há linha recolhida', () => {
    expect(buildRows(4, 100, false, []).slice(0, 4)).toEqual([
      { kind: 'day', day: 1 },
      { kind: 'day', day: 2 },
      { kind: 'day', day: 3 },
      { kind: 'day', day: 4 },
    ]);
    expect(buildRows(1, 100, false, [])[0]).toEqual({ kind: 'day', day: 1 });
  });

  test('expandida, a trilha mostra os cem dias; depois da campanha, os três últimos à vista', () => {
    expect(buildRows(17, 100, true, [])).toHaveLength(100);
    expect(buildRows(101, 100, false, [])).toEqual([
      { kind: 'gap', from: 1, to: 97 },
      { kind: 'day', day: 98 },
      { kind: 'day', day: 99 },
      { kind: 'day', day: 100 },
    ]);
  });

  test('a linha recolhida diz quantos dias em aberto ela esconde, e expande tudo', async () => {
    await seedCompletions(range(1, 6)); // 7–16 em aberto; 7–13 ficam recolhidos.
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-list')).toBeTruthy());
    await scrollListToTop();
    await waitFor(() => expect(screen.getByText('Mostrar dias anteriores · 7 em aberto')).toBeTruthy());
    expect(screen.getByLabelText('Mostrar dias anteriores, do Dia 1 ao Dia 13. 7 dias em aberto')).toBeTruthy();
    expect(screen.queryByTestId('journey-day-7')).toBeNull();

    await fireEvent.press(screen.getByTestId('journey-gap-1'));
    expect(listRows().filter((row) => row.kind === 'day')).toHaveLength(100);
    await scrollListToTop();
    await waitFor(() => expect(screen.getByTestId('journey-day-7')).toBeTruthy());
  });

  test('sem nenhum em aberto a linha não mostra número', async () => {
    await seedCompletions(range(1, 16));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-list')).toBeTruthy());
    await scrollListToTop();
    await waitFor(() => expect(screen.getByText('Mostrar dias anteriores')).toBeTruthy());
    expect(screen.queryByText(/Mostrar dias anteriores ·/)).toBeNull();
  });
});

/* ------------------------------------------------------- a mensagem de entrada */

describe('mensagem de entrada', () => {
  const base = { running: true, officialDay: 17, completedCount: 3 };

  test.each([
    [0, [] as number[]],
    [1, [16]],
  ])('com %i dia(s) em aberto não aparece', (_n, pending) => {
    expect(entryMessage({ ...base, pendingDays: pending })).toBeNull();
  });

  test('com 2 dias em aberto aparece; com 10 também, pelo mais antigo', () => {
    expect(entryMessage({ ...base, pendingDays: [15, 16] })).toEqual({
      variant: 'resume',
      openCount: 2,
      firstOpen: 15,
      todayDay: 17,
    });
    expect(entryMessage({ ...base, pendingDays: range(7, 16) })).toMatchObject({ openCount: 10, firstOpen: 7 });
    expect(entryMessage({ ...base, completedCount: 0, pendingDays: range(1, 16) })).toMatchObject({
      variant: 'first_time',
      firstOpen: 1,
    });
    // Fora da campanha em curso, nada.
    expect(entryMessage({ ...base, running: false, pendingDays: range(7, 16) })).toBeNull();
  });

  test.each([
    ['0 em aberto', range(1, 16)],
    ['1 em aberto', range(1, 15)],
  ])('na tela, com %s, não há mensagem', async (_label, done) => {
    await seedCompletions(done);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByTestId('entry-message')).toBeNull();
  });

  test('quem já leu antes: "Você tem 2 dias em aberto. Quer retomar?"', async () => {
    await seedCompletions(range(1, 14));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('entry-message')).toBeTruthy());
    expect(screen.getByText('Você tem 2 dias em aberto.')).toBeTruthy();
    expect(screen.getByText('Quer retomar?')).toBeTruthy();
    expect(screen.getByText('Retomar pelo Dia 15')).toBeTruthy();
  });

  test('com 10 em aberto retoma pelo mais antigo e abre aquele dia', async () => {
    await seedCompletions(range(1, 6));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText('Você tem 10 dias em aberto.')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('entry-message-start'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dia/[day]', params: { day: '7' } });
  });

  test('quem nunca concluiu nada: "A igreja está no Dia 17", começa pelo Dia 1', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('entry-message')).toBeTruthy());
    expect(screen.getByText('A igreja está no Dia 17.')).toBeTruthy();
    expect(screen.getByText('Os dias anteriores continuam abertos para você.')).toBeTruthy();
    expect(screen.getByText('Começar pelo Dia 1')).toBeTruthy();
    expect(screen.getByLabelText('Ir para hoje, Dia 17')).toBeTruthy();
    // Sem culpa.
    expect(screen.queryByText(/perdeu|perdido|atrasad|pendente|falhou/i)).toBeNull();
    // Hoje continua sendo o destaque: o painel está lá.
    expect(screen.getByTestId('today-panel')).toBeTruthy();
  });

  test('"Ir para hoje" dispensa a mensagem e grava o dia', async () => {
    await seedCompletions(range(1, 6));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('entry-message')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('entry-message-today'));
    await waitFor(() => expect(screen.queryByTestId('entry-message')).toBeNull());
    expect(screen.getByTestId('today-panel')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(ENTRY_DISMISS_KEY)).toBe(MARK_17));
  });

  test('reabrindo o app no mesmo dia, continua dispensada', async () => {
    await seedCompletions(range(1, 6));
    await AsyncStorage.setItem(ENTRY_DISMISS_KEY, MARK_17);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByTestId('entry-message')).toBeNull();
  });

  test('no dia seguinte ela volta', async () => {
    await seedCompletions(range(1, 6));
    await AsyncStorage.setItem(ENTRY_DISMISS_KEY, MARK_17);
    loadCampaignOnDay(18);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText('Você tem 11 dias em aberto.')).toBeTruthy(), { timeout: 3000 });
  });

  test('se o armazenamento falhar, a mensagem só continua aparecendo', async () => {
    const original = AsyncStorage.getItem.bind(AsyncStorage);
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockImplementation((key: string) => {
      if (key === ENTRY_DISMISS_KEY) return Promise.reject(new Error('disco'));
      return original(key);
    });
    try {
      await render(<JourneyHome />);
      await waitFor(() => expect(screen.getByTestId('entry-message')).toBeTruthy(), { timeout: 3000 });
    } finally {
      spy.mockRestore();
    }
  });
});
