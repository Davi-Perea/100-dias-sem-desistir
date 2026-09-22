import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import JourneyHome from '@/app/(tabs)/index';
import { _setSupabaseClientForTests } from '@/cloud/client';
import { _setCloudConfigForTests } from '@/cloud/config';
import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { isOffline } from '@/net/useOnline';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { createFakeSupabase } from '@/testing/fakeSupabase';
import { numeralWidth } from '@/ui/altar/milestoneNumeral';
import {
  COUNTDOWN_NUMERAL,
  fitDisplayNumeral,
  NUMERAL_MAX_SCALE,
  PANEL_NUMERAL,
} from '@/ui/jornada/displayNumeral';
import { _resetEntryDismissalForTests, ENTRY_DISMISS_KEY, entryDismissMark } from '@/ui/jornada/entryDismissal';
import { TODAY_NODE_OFFSET, todayNodeOffset } from '@/ui/jornada/JourneyRows';
import { openingIndex, openingOffset } from '@/ui/jornada/opening';

/**
 * J6 · chave única FUTURE_DAYS_OPEN (config/features.ts). Os casos deste arquivo
 * rodam com a chave DESLIGADA (o comportamento de antes: dia futuro trancado);
 * os casos com ela ligada ligam `mockFutureOpen` no próprio teste.
 */
let mockFutureOpen = false;
// Getter de verdade (defineProperty): num literal com spread, o Babel avalia o
// getter uma vez só, na criação do mock, e a chave ficaria congelada.
jest.mock('@/config/features', () => {
  const mocked = { ...jest.requireActual('@/config/features') };
  Object.defineProperty(mocked, 'FUTURE_DAYS_OPEN', { get: () => mockFutureOpen, enumerable: true });
  return mocked;
});


/**
 * Correções do grupo G1 (Jornada): R0-1..17 e R4-3, com as decisões D-1, D-2,
 * D-3, D-7 e D-8. Os casos do painel concluído e da acolhida sem número estão
 * em todayScreen.test.tsx; os do A3, em jornadaDia.test.tsx.
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

type NetState = { isConnected?: boolean; isInternetReachable?: boolean };
let mockNetwork: NetState = { isConnected: true, isInternetReachable: true };
let mockNetworkListener: ((state: NetState) => void) | null = null;
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve(mockNetwork)),
  addNetworkStateListener: jest.fn((listener: (state: NetState) => void) => {
    mockNetworkListener = listener;
    return { remove: () => (mockNetworkListener = null) };
  }),
}));

type LockProps = { visible: boolean; dayNumber: number; dateLabel: string };
let mockLockProps: LockProps | null = null;
jest.mock('@/ui/LockSheet', () => {
  const React = jest.requireActual('react');
  const actual = jest.requireActual('@/ui/LockSheet');
  return {
    ...actual,
    LockSheet: (props: LockProps) => {
      mockLockProps = props;
      return React.createElement(actual.LockSheet, props);
    },
  };
});

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };

/** Props que a casa entrega à lista (o elemento hospedeiro recebe as do FlatList). */
function listProps() {
  return screen.getByTestId('journey-list').props as { data: { kind: string; day?: number }[]; initialScrollIndex?: number };
}

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

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }));
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  mockFutureOpen = false;
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  _resetEntryDismissalForTests();
  mockRouter.push.mockClear();
  mockNetwork = { isConnected: true, isInternetReachable: true };
  mockNetworkListener = null;
  loadCampaignOnDay(17);
  await seedSettings();
});

afterEach(() => {
  _setCloudConfigForTests(null);
  _setSupabaseClientForTests(null);
});

afterAll(() => resetToDevFixtures());

/* ------------------------------------------------------------ R0-15 / R4-3 */

describe('F4 · a faixa "Sem internet" segue a rede real do aparelho', () => {
  test('só afirma "sem internet" com evidência; estado desconhecido conta como online', () => {
    expect(isOffline(undefined)).toBe(false);
    expect(isOffline({})).toBe(false);
    expect(isOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
    expect(isOffline({ isConnected: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });

  test('sem rede, quem usa SEM conta também vê a faixa', async () => {
    mockNetwork = { isConnected: false, isInternetReachable: false };
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText(/^Sem internet\./)).toBeTruthy());
  });

  test('a faixa entra e sai com a mudança de rede', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByText(/^Sem internet\./)).toBeNull();

    await act(async () => mockNetworkListener?.({ isConnected: false, isInternetReachable: false }));
    expect(screen.getByText(/^Sem internet\./)).toBeTruthy();
    await act(async () => mockNetworkListener?.({ isConnected: true, isInternetReachable: true }));
    expect(screen.queryByText(/^Sem internet\./)).toBeNull();
  });

  test('com a rede no ar, uma nuvem que falha NÃO vira "Sem internet"', async () => {
    const fake = createFakeSupabase();
    const boom = () => Promise.reject(new Error('permission denied'));
    fake.client.auth.getSession.mockImplementation(boom);
    fake.client.auth.getUser.mockImplementation(boom);
    fake.client.rpc.mockImplementation(boom);
    _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
    _setSupabaseClientForTests(fake.client as unknown as SupabaseClient);

    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByText(/^Sem internet\./)).toBeNull();
  });

  test('a omissão da frase da fila do F4 continua (a fila não existe)', async () => {
    mockNetwork = { isConnected: false };
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText(/^Sem internet\./)).toBeTruthy());
    expect(screen.queryByText(/fila/i)).toBeNull();
  });
});

/* ------------------------------------------------------------------ R0-1 */

describe('A1 · a casa inteira rola (REGRAS 26/27)', () => {
  test('o cabeçalho, a faixa C-07 e a faixa de rede ficam DENTRO da lista', async () => {
    mockNetwork = { isConnected: false };
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText(/^Sem internet\./)).toBeTruthy());
    const list = within(screen.getByTestId('journey-list'));
    expect(list.getByTestId('journey-header')).toBeTruthy();
    expect(list.getByTestId('content-banner')).toBeTruthy();
    expect(list.getByText(/^Sem internet\./)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ R0-2 */

describe('A1 · a abertura mostra as linhas logo acima de hoje', () => {
  // Linhas de 48 (dias 13–16), painel de 440, janela de 700: cabem as três de cima.
  const offsets = [0, 48, 96, 144, 192, 240, 680];
  const lengths = [48, 48, 48, 48, 48, 440, 48];
  const base = { running: true, offsets, lengths, todayIndex: 5, welcomeIndex: -1 };

  test('abre três linhas acima de hoje quando o painel inteiro ainda cabe', () => {
    const offset = openingOffset({ ...base, viewport: 700 });
    expect(offset).toBe(96);
    expect(openingIndex(offsets, offset)).toBe(2);
  });

  test('numa janela curta mostra só o que cabe sem cortar o painel', () => {
    // 520 − 440 − 16 = 64 de folga: uma linha e pouco; o índice inicial não corta o painel.
    const offset = openingOffset({ ...base, viewport: 520 });
    expect(offset).toBe(240 - 64);
    expect(openingIndex(offsets, offset)).toBe(4);
    expect(openingOffset({ ...base, viewport: 300 })).toBe(240);
  });

  test('com a acolhida abre nela; fora da campanha, no topo', () => {
    expect(openingOffset({ ...base, welcomeIndex: 3, viewport: 700 })).toBe(144);
    expect(openingOffset({ ...base, running: false, viewport: 700 })).toBeNull();
    expect(openingIndex(offsets, null)).toBeUndefined();
  });

  test('na casa, a lista não abre com o painel colado no topo quando cabe mais', async () => {
    // Sem a mensagem de entrada (dispensada hoje), que teria a abertura nela.
    await AsyncStorage.setItem(ENTRY_DISMISS_KEY, entryDismissMark('dev-fixture-campaign', 17));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    const { data: rows, initialScrollIndex } = listProps();
    const todayIndex = rows.findIndex((row) => row.kind === 'day' && row.day === 17);
    expect(initialScrollIndex).toBeLessThanOrEqual(todayIndex);
    expect(initialScrollIndex).toBeGreaterThanOrEqual(todayIndex - 3);
    // A linha "Em aberto" do dia 16 é a imediatamente acima do painel.
    expect(rows[todayIndex - 1]).toEqual({ kind: 'day', day: 16 });
  });
});

/* ------------------------------------------------------------------ R0-3 */

describe('A5 · "Criar meu perfil" (D-7)', () => {
  test('sem nuvem configurada o botão não aparece', async () => {
    loadCampaignOnDay(-1);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.queryByTestId('before-profile')).toBeNull();
    expect(screen.queryByText('Criar meu perfil')).toBeNull();
    expect(screen.getByTestId('before-reminder')).toBeTruthy();
  });

  test('com a nuvem ligada ele volta', async () => {
    _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
    loadCampaignOnDay(-1);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-profile')).toBeTruthy());
  });
});

/* ------------------------------------------------------------------ R0-10 */

describe('A4 · a folha do cadeado não muda de conteúdo ao fechar', () => {
  test('fechar mantém o dia e a data; só a visibilidade muda', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-18')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('journey-day-18'));
    await waitFor(() => expect(screen.getByTestId('locked-day-sheet')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('locked-day-back'));
    await waitFor(() => expect(mockLockProps?.visible).toBe(false));
    expect(mockLockProps?.dayNumber).toBe(18);
    expect(mockLockProps?.dateLabel).not.toBe('');
  });
});

/* ------------------------------------------------------------------ R0-11 */

describe('A1 · painel', () => {
  test('as ações são filhas diretas do painel (gap 12 do TELAS, sem View com gap 8)', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByTestId('day-open')).toBeNull();
    // D-8: "Ver o dia completo" fica.
    expect(screen.getByTestId('open-today')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ R0-12 */

describe('A1 · o nó de hoje acompanha a cap medida', () => {
  test('com a cap padrão o recuo é 18 (borda de 1 incluída); com fonte grande ele desce junto', () => {
    // Cap na posição 17 (borda 1 + padding 16), altura 14.
    expect(todayNodeOffset(17, 14)).toBe(TODAY_NODE_OFFSET);
    expect(todayNodeOffset(17, 14 * 2)).toBe(TODAY_NODE_OFFSET + 7);
  });
});

/* ------------------------------------------------------------------ R0-13 */

describe('numerais de exibição com fonte grande (política do marco)', () => {
  test('com fonte padrão num telefone de 390, fica o tamanho do desenho', () => {
    // Largura do painel: 390 − 2×20 − trilho 34 − padding 32 − borda 2 = 282.
    expect(fitDisplayNumeral('Dia 17', PANEL_NUMERAL, 282, 1).size).toBe(58);
  });

  test('em 3,571× o numeral acompanha só até 1,2×, cede tamanho e "Dia 100" cabe na largura medida', () => {
    // Num telefone de 390, o teto de 1,2× já basta: o tamanho do desenho cabe.
    expect(fitDisplayNumeral('Dia 100', PANEL_NUMERAL, 282, 3.571).size).toBe(58);
    // Telefone de 320: 320 − 2×20 − 34 − 32 − 2 = 212 de painel.
    const fitted = fitDisplayNumeral('Dia 100', PANEL_NUMERAL, 212, 3.571);
    expect(fitted.size).toBeLessThan(58);
    const rendered = numeralWidth('Dia 100', fitted.size, PANEL_NUMERAL) * NUMERAL_MAX_SCALE;
    expect(rendered).toBeLessThanOrEqual(212);
  });

  test('"Faltam" nunca quebra ao meio numa tela estreita', () => {
    const fitted = fitDisplayNumeral('Faltam', COUNTDOWN_NUMERAL, 272, 3.571);
    expect(numeralWidth('Faltam', fitted.size, COUNTDOWN_NUMERAL) * NUMERAL_MAX_SCALE).toBeLessThanOrEqual(272);
  });

  test('o numeral do painel acompanha a fonte só até 1,2×; o rótulo falado continua inteiro', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('day-numeral')).toBeTruthy());
    expect(screen.getByTestId('day-numeral').props.maxFontSizeMultiplier).toBe(NUMERAL_MAX_SCALE);
    expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy();
  });

  test('a contagem do A5 segue a mesma política', async () => {
    loadCampaignOnDay(-1);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-numeral')).toBeTruthy());
    expect(screen.getByTestId('before-numeral').props.maxFontSizeMultiplier).toBe(NUMERAL_MAX_SCALE);
  });
});

/* ------------------------------------------------------------------ R0-14 */

describe('E5 · "Ver a jornada inteira"', () => {
  test('expande a trilha: nenhuma reticência sobra', async () => {
    // Dias 1–60 lidos: o trecho 2–60 vira reticência na trilha comprimida.
    const at = new Date().toISOString();
    const days = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [i + 1, at]));
    await AsyncStorage.setItem('completions:v1:dev-fixture-campaign', JSON.stringify({ days, updatedAt: at }));
    _resetCompletionsCacheForTests();
    loadCampaignOnDay(130);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('finished-see-journey')).toBeTruthy());
    const before = listProps().data;
    expect(before.some((row) => row.kind === 'gap')).toBe(true);

    await fireEvent.press(screen.getByTestId('finished-see-journey'));
    await waitFor(() => expect(screen.getByText('Comprimir a linha')).toBeTruthy());
    const after = listProps().data;
    expect(after.some((row) => row.kind === 'gap')).toBe(false);
    expect(after).toHaveLength(100);
  });
});
