import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import JourneyHome from '@/app/(tabs)/index';
import { getCampaign, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, loadCompletions } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { finishedCopy, reflectionsLabel } from '@/ui/jornada/CampaignFinished';
import { extenso, extensoCap } from '@/ui/jornada/extenso';
import { _resetEntryDismissalForTests } from '@/ui/jornada/entryDismissal';

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

/**
 * Coloca a campanha ativa no dia informado (0 = ainda não começou; >100 = encerrada).
 * `patch` permite variar as fixtures de um caso sem tocar nelas.
 */
function loadCampaignOnDay(day: number, patch: (dataset: JourneyDataset) => JourneyDataset = (d) => d) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    patch({ ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } }),
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
}

/** Variante das fixtures que altera só o dia 17 (o "hoje" dos testes). */
function patchDay17(change: Partial<JourneyDataset['days'][number]>) {
  return (dataset: JourneyDataset): JourneyDataset => ({
    ...dataset,
    days: dataset.days.map((d) => (d.day_number === 17 ? { ...d, ...change } : d)),
  });
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }),
  );
  _resetSettingsCacheForTests();
}

/** `daysAgo`: há quantos dias as conclusões aconteceram (a acolhida mede pelo instante). */
async function seedCompletions(days: number[], daysAgo = 0) {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  await AsyncStorage.setItem(
    `completions:v1:${CAMPAIGN}`,
    JSON.stringify({ days: Object.fromEntries(days.map((d) => [d, at])), updatedAt: at }),
  );
  _resetCompletionsCacheForTests();
}

/**
 * A lista é virtualizada e abre rolada até hoje; no harness não há layout, então
 * as linhas ACIMA de hoje só existem depois de a lista "ver" uma janela no topo.
 */
async function scrollListToTop() {
  const list = screen.getByTestId('journey-list');
  await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 3000 } } });
  await fireEvent(list, 'contentSizeChange', 390, 6000);
  await fireEvent.scroll(list, {
    nativeEvent: {
      contentOffset: { x: 0, y: 0 },
      contentSize: { width: 390, height: 6000 },
      layoutMeasurement: { width: 390, height: 3000 },
    },
  });
}

beforeEach(async () => {
  mockFutureOpen = false;
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  _resetEntryDismissalForTests();
  mockRouter.push.mockClear();
  // Fixa a data para que "hoje" seja sempre o dia 17.
  loadCampaignOnDay(17);
});

/* ---------------------------------------------------------------- A1 */

describe('A1 · a casa abre no dia da igreja', () => {
  test('o painel de hoje mostra a cap, o dia, o monte, a ênfase e a leitura', async () => {
    await seedSettings();
    await render(<JourneyHome />);

    // O numeral e o "de 100" são dois textos; o rótulo acessível junta os dois.
    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());
    const panel = within(screen.getByTestId('today-panel'));
    // A cap tem rótulo sem o "·" (REGRAS 32).
    expect(panel.getByLabelText('Hoje, a igreja está aqui')).toBeTruthy();
    // Fixtures seguem SPHERE_ORDER: dia 17 → índice 16 % 7 = 2 → Educação.
    expect(panel.getByLabelText('Monte do dia: Educação')).toBeTruthy();
    expect(panel.getByText(/Salmos 2–3/)).toBeTruthy();
    expect(panel.getByText(/Provérbios 2/)).toBeTruthy();
    // O conteúdo é de desenvolvimento: a faixa C-07 está na casa.
    expect(screen.getByTestId('content-banner')).toBeTruthy();
    expect(screen.getByText(/desenvolvimento/i)).toBeTruthy();
    // O cabeçalho é o do desenho, com o círculo de conta indo para o Você.
    expect(screen.getByText('100 dias sem desistir')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-button'));
    expect(mockRouter.push).toHaveBeenCalledWith('/voce');
  });

  test('a estimativa aparece com "~" e é falada sem os símbolos', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    // Dia 17 da fixture: PSA 2-3 + PRO 2 = 3 capítulos, 3 min cada.
    expect(screen.getByText('3 capítulos · ~9 min')).toBeTruthy();
    expect(screen.getByLabelText('3 capítulos, cerca de 9 minutos')).toBeTruthy();
    expect(screen.getByLabelText('Salmos 2–3, Provérbios 2')).toBeTruthy();
  });

  test('o realce amarelo só cai na palavra do campo theme_highlight', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('day-emphasis')).toBeTruthy());
    // A ênfase da igreja vem de `title`; a fixture marca "exemplo".
    expect(within(screen.getByTestId('day-emphasis')).getByText('exemplo')).toBeTruthy();
  });

  test('sem theme_highlight a ênfase aparece inteira, sem o app escolher palavra', async () => {
    await seedSettings();
    loadCampaignOnDay(17, patchDay17({ theme_highlight: null }));
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('day-emphasis')).toBeTruthy());
    const emphasis = within(screen.getByTestId('day-emphasis'));
    expect(emphasis.queryByText('exemplo')).toBeNull();
    expect(screen.getByText('Dia 17 — título de exemplo')).toBeTruthy();
  });

  test('"Ler agora" abre o leitor como rota contextual', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText('Ler agora')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('read-now'));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '17' } }),
    );
  });

  test('"Vou ler na minha Bíblia" marca o modo e NÃO conclui o dia (P-09, D-1)', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText('Vou ler na minha Bíblia')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('secondary-read'));

    // PROVISÓRIO (pergunta 2): "Concluir leitura" vira a ação principal e o
    // sublinhado devolve o leitor do app.
    await waitFor(() => expect(screen.getByText('Ler no app')).toBeTruthy());
    expect(screen.queryByTestId('read-now')).toBeNull();
    expect(screen.getByText('Concluir leitura')).toBeTruthy();
    expect(screen.queryByTestId('day-completed')).toBeNull();
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeUndefined();
  });

  test('no modo do app o painel também tem "Concluir leitura" (D-1)', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('read-now')).toBeTruthy());
    expect(screen.getByText('Concluir leitura')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy();
  });

  test('quem lê na própria Bíblia conclui, vê o dia concluído e pode desfazer', async () => {
    await seedSettings({ readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByText('Concluir leitura')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
    expect(screen.getByText('Dia 17 concluído')).toBeTruthy();
    // R0-16: a conclusão não grava o modo; a linha é só a referência, sem afirmar onde leu.
    const done = within(screen.getByTestId('day-completed'));
    expect(done.getByText('Salmos 2–3 · Provérbios 2')).toBeTruthy();
    expect(screen.queryByText(/lido na sua Bíblia|lido aqui no app/)).toBeNull();
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy();

    // PROVISÓRIO (pergunta 1, D-2): "Desfazer" discreto, sem confirmação extra, com rótulo falado completo.
    expect(screen.getByLabelText('Desfazer a conclusão do dia 17')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('undo-complete'));
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeUndefined();
  });

  test('o painel dá acesso ao dia completo de hoje (A3)', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('open-today')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('open-today'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dia/[day]', params: { day: '17' } });
  });

  test('a casa não inventa número coletivo', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByText(/pessoas já leram/)).toBeNull();
    expect(screen.queryByText(/% da igreja/)).toBeNull();
  });
});

describe('A1 · as linhas da jornada', () => {
  test('dia passado lido diz "Concluído"; dia passado não lido diz "Em aberto"', async () => {
    await seedSettings();
    await seedCompletions([16]);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-list')).toBeTruthy());
    await scrollListToTop();

    // Dia 16 → Família; dia 15 → Igreja. O rótulo falado não tem o "·".
    await waitFor(() => expect(screen.getByLabelText('Dia 16, Família. Concluído.')).toBeTruthy());
    // A casa já abre com o dia 16 à vista (R0-2); o 15 chega quando a lista vê o topo.
    await waitFor(() => expect(screen.getByLabelText('Dia 15, Igreja. Em aberto.')).toBeTruthy());
    expect(screen.getByText('Dia 16 · Família')).toBeTruthy();
    // Nada de culpa: nenhum vermelho de falha, nenhuma contagem de falta.
    expect(screen.queryByText(/perdeu|atrasad|falhou/i)).toBeNull();
  });

  test('o dia em aberto é clicável e abre o A3 daquele dia', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-list')).toBeTruthy());
    await scrollListToTop();
    await waitFor(() => expect(screen.getByTestId('journey-day-15')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('journey-day-15'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dia/[day]', params: { day: '15' } });
  });

  test('dia futuro não revela nada e abre a folha do cadeado (A4)', async () => {
    await seedSettings();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-18')).toBeTruthy());

    // Nem o monte do dia 18 aparece na linha.
    expect(screen.getByLabelText('Dia 18. Em breve.')).toBeTruthy();
    expect(screen.queryByText(/Dia 18 ·/)).toBeNull();

    await fireEvent.press(screen.getByTestId('journey-day-18'));
    await waitFor(() => expect(screen.getByTestId('locked-day-sheet')).toBeTruthy());
    expect(screen.getByText(`Abre em ${formatDayDate(18, getCampaign())}.`)).toBeTruthy();
    // Nenhum conteúdo do dia 18 na folha: nem leitura, nem monte.
    expect(within(screen.getByTestId('locked-day-sheet')).queryByLabelText(/Monte do dia/)).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------- A2 */

describe('A2 · mensagem de entrada (no lugar da acolhida antiga)', () => {
  // Os casos completos (0/1/2/10 dias, variantes, expandir, dispensar) estão em jornada-pendentes.test.tsx.
  test('quem voltou depois de dias sem ler vê quantos dias estão em aberto, sem culpa', async () => {
    await seedSettings();
    // Concluiu o dia 10 há sete dias: 1–9 e 11–16 em aberto antes de hoje.
    await seedCompletions([10], 7);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('entry-message')).toBeTruthy());
    expect(screen.getByText('Você tem 15 dias em aberto.')).toBeTruthy();
    expect(screen.getByText('Retomar pelo Dia 1')).toBeTruthy();
    expect(screen.queryByText(/perdeu|perdido|atrasad|pendente|falhou|sequência/i)).toBeNull();
  });
});

/* ---------------------------------------------------------------- A5 */

describe('A5 · antes da campanha', () => {
  test('mostra a contagem e as pontas, e não revela nada do dia 1', async () => {
    await seedSettings();
    loadCampaignOnDay(-1);
    await render(<JourneyHome />);

    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.getByLabelText('Faltam 2 dias')).toBeTruthy();
    expect(screen.getByText(/A igreja começa em/)).toBeTruthy();
    expect(screen.getByLabelText(/^Dia 1, \d{2}\/\d{2}\/\d{4}$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Dia 100, \d{2}\/\d{2}\/\d{4}$/)).toBeTruthy();
    // Nenhuma referência de leitura, nenhum monte, nenhum CTA de leitura.
    expect(screen.queryByText(/Salmos 1/)).toBeNull();
    expect(screen.queryByLabelText(/Monte do dia/)).toBeNull();
    expect(screen.queryByTestId('complete-day')).toBeNull();
    expect(screen.queryByText('Ler agora')).toBeNull();
    // A faixa C-07 continua.
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('na véspera a concordância é de um dia só', async () => {
    await seedSettings();
    loadCampaignOnDay(0);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.getByLabelText('Falta 1 dia')).toBeTruthy();
  });

  test('"Ajustar meu lembrete" não pede permissão na abertura: só leva à tela do lembrete', async () => {
    await seedSettings();
    loadCampaignOnDay(0);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-reminder')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('before-reminder'));
    expect(mockRouter.push).toHaveBeenCalledWith('/lembrete');
  });
});

/* ---------------------------------------------------------------- E5 */

describe('E5 · campanha encerrada', () => {
  test('mostra os números reais do aparelho e mantém os dias abertos', async () => {
    await seedSettings();
    await seedCompletions([1, 2, 3]);
    loadCampaignOnDay(130);
    await render(<JourneyHome />);

    await waitFor(() => expect(screen.getByTestId('after-campaign-card')).toBeTruthy());
    expect(screen.getByLabelText('Jornada encerrada, 100 dias')).toBeTruthy();
    expect(screen.getByLabelText('3 dias lidos de 100')).toBeTruthy();
    expect(screen.getByText(finishedCopy(3, 100))).toBeTruthy();
    expect(screen.getByText('Minhas reflexões')).toBeTruthy();
    // Depois da campanha não existe "hoje": nem painel, nem "Hoje conduz".
    expect(screen.queryByTestId('today-panel')).toBeNull();
    expect(screen.queryByText(/Hoje conduz/)).toBeNull();

    // O primeiro dia não lido continua abrindo: os dias anteriores aos três
    // últimos ficam na linha recolhida do topo, que expande a trilha.
    await scrollListToTop();
    await waitFor(() => expect(screen.getByTestId('journey-gap-1')).toBeTruthy());
    expect(screen.getByText('Mostrar dias anteriores · 94 em aberto')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('journey-gap-1'));
    await scrollListToTop();
    await waitFor(() => expect(screen.getByTestId('journey-day-4')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('journey-day-4'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dia/[day]', params: { day: '4' } });
  });

  test('as variantes que o desenho não tem não mentem', () => {
    expect(finishedCopy(83, 100)).toBe(
      'Oitenta e três dias na Palavra com a sua igreja. Os dias que ficaram abertos continuam abertos — pode ler quando quiser.',
    );
    // Com os 100 lidos não há dia aberto para falar.
    expect(finishedCopy(100, 100)).toBe('Cem dias na Palavra com a sua igreja.');
    expect(finishedCopy(0, 100)).toBe('Os dias que ficaram abertos continuam abertos — pode ler quando quiser.');
    expect(reflectionsLabel(42)).toBe('Minhas 42 reflexões');
    expect(reflectionsLabel(1)).toBe('Minha 1 reflexão');
    expect(reflectionsLabel(0)).toBe('Minhas reflexões');
  });
});

describe('número por extenso', () => {
  test('pt-BR, masculino', () => {
    expect(extenso(0)).toBe('zero');
    expect(extenso(3)).toBe('três');
    expect(extenso(16)).toBe('dezesseis');
    expect(extenso(20)).toBe('vinte');
    expect(extenso(83)).toBe('oitenta e três');
    expect(extenso(100)).toBe('cem');
    expect(extenso(101)).toBe('cento e um');
    expect(extenso(365)).toBe('trezentos e sessenta e cinco');
    expect(extensoCap(5)).toBe('Cinco');
  });
});
