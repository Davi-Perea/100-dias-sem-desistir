import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ReaderScreen from '@/app/reader/[day]';
import ReflectionScreen from '@/app/reflexao/[day]';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

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


/** Parâmetro de rota do caso corrente; lido tarde, na chamada do hook. */
let mockDay = '17';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ day: mockDay }),
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

/**
 * Espiona o provedor de texto bíblico sem trocá-lo: o teste precisa saber se o
 * app PEDIU a passagem, e a resposta continua vindo do provedor real.
 */
const mockGetPassage = jest.fn();
jest.mock('@/reader/provider', () => {
  const actual = jest.requireActual('@/reader/provider');
  // Identidade estável, como a do provedor real: a tela guarda o provedor na
  // dependência de um efeito, e um objeto novo a cada render viraria laço.
  let wrapper: unknown = null;
  return {
    ...actual,
    // O provedor real é resolvido a cada chamada: o teste troca entre o de
    // exemplo (guia) e um com texto (licenciado de teste).
    getBibleProvider: () => {
      actual.getBibleProvider();
      wrapper ??= {
        getMetadata: () => actual.getBibleProvider().getMetadata(),
        getPassage: (reference: unknown) => {
          mockGetPassage(reference);
          return actual.getBibleProvider().getPassage(reference);
        },
      };
      return wrapper;
    },
  };
});

/** Coloca a campanha ativa no dia informado, como nas outras telas testadas. */
function loadCampaignOnDay(day: number) {
  const base: JourneyDataset = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

/** Rótulo da leitura daquele dia ("Gênesis 39–45"), como a UI o escreveria. */
function labelOf(day: number): RegExp {
  const summary = readingSummary(getDay(day));
  if (!summary) throw new Error(`fixture do dia ${day} sem leitura`);
  return new RegExp(escape(summary.label));
}

/** Provedor com texto de teste (nunca bíblico): o leitor pede passagens a ele. */
const licensed: BibleTextProvider = {
  getMetadata: () => ({ ...devBibleProvider.getMetadata(), id: 'licenciada-teste', isDevPlaceholder: false }),
  getPassage: async (reference) => ({
    reference: `${reference.book} ${reference.chapterStart}`,
    book: reference.book,
    bookName: reference.book,
    chapter: reference.chapterStart,
    verses: [{ verse: 1, text: 'Frase de teste.' }],
  }),
};

/** Anda o leitor até o último capítulo (onde fica o gesto de concluir). */
async function goToLastChapter() {
  for (let i = 0; i < 40 && screen.queryByTestId('reader-next'); i++) {
    await fireEvent.press(screen.getByTestId('reader-next'));
  }
}

const TODAY = 17;
const FUTURE = 40;

beforeEach(async () => {
  mockFutureOpen = false;
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  mockGetPassage.mockClear();
  // Fora do `_layout`, nenhum provedor está registrado; o do modo DEV serve,
  // porque o que está em teste é QUEM é perguntado, não o texto devolvido.
  setBibleProvider(devBibleProvider);
  mockDay = String(TODAY);
  loadCampaignOnDay(TODAY);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
});

/**
 * O dia abre no dia oficial da igreja. A Jornada já não oferece o toque, mas
 * rota é rota: link direto, histórico e deep link chegam no mesmo cadeado (A4),
 * e uma regra que só existe no botão é decoração.
 */
describe('leitor de um dia que ainda não abriu', () => {
  test('mostra o cadeado com a data em que abre, em vez do texto do dia', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());
    expect(screen.getByText(/Abre em/)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`Dia ${FUTURE} abre em`))).toBeTruthy();
    expect(screen.getByTestId('locked-day-home')).toBeTruthy();
    expect(screen.queryByText(labelOf(FUTURE))).toBeNull();
    expect(screen.queryByTestId('reader-footer')).toBeNull();
  });

  test('não pede a passagem ao provedor de texto bíblico', async () => {
    setBibleProvider(licensed);
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());

    // Com uma tradução licenciada, isso seria uma requisição de conteúdo que
    // não deveria existir — e ela aconteceria antes de qualquer tela aparecer.
    expect(mockGetPassage).not.toHaveBeenCalled();
  });

  test('com texto licenciado, o dia de hoje continua abrindo e pedindo a passagem', async () => {
    setBibleProvider(licensed);
    await render(<ReaderScreen />);
    await waitFor(() => expect(mockGetPassage).toHaveBeenCalled());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
    expect(screen.getByTestId('reader-footer')).toBeTruthy();
  });

  test('sem texto licenciado, o dia de hoje abre o guia e não pede nada ao provedor', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
    expect(mockGetPassage).not.toHaveBeenCalled();
  });

  test('sem texto licenciado, o dia futuro continua trancado e não mostra o guia', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());
    expect(screen.queryByTestId('reader-guide')).toBeNull();
    expect(screen.queryByTestId('reader-guide-reference')).toBeNull();
  });
});

/**
 * A reflexão também tranca pela rota (REGRAS 7): antes ela abria o editor de um
 * dia futuro e só escondia a referência. O guarda continua o mesmo — a
 * referência daquele dia não aparece — e agora nem o editor aparece.
 */
describe('reflexão de um dia que ainda não abriu', () => {
  test('não revela a referência da leitura daquele dia', async () => {
    mockDay = String(FUTURE);
    await render(<ReflectionScreen />);

    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());
    expect(screen.queryByText(labelOf(FUTURE))).toBeNull();
    expect(screen.queryByTestId('reflection-input')).toBeNull();
    expect(screen.queryByTestId('reflection-save')).toBeNull();
  });

  test('no dia de hoje a referência aparece', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.getByText(labelOf(TODAY))).toBeTruthy();
    expect(screen.getByText(/salva neste aparelho/)).toBeTruthy();
  });
});

/**
 * J6 · com a chave FUTURE_DAYS_OPEN ligada (decisão do fundador, 2026-09-22), o
 * dia futuro abre como os outros: sem cadeado no leitor nem na reflexão.
 */
describe('com FUTURE_DAYS_OPEN ligada', () => {
  beforeEach(() => {
    mockFutureOpen = true;
  });

  test('o leitor do dia futuro abre e pede a passagem ao provedor', async () => {
    setBibleProvider(licensed);
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(mockGetPassage).toHaveBeenCalled());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
    expect(screen.getByTestId('reader-footer')).toBeTruthy();
  });

  test('sem texto licenciado, o dia futuro abre o guia', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
  });

  test('a reflexão do dia futuro abre com a referência daquele dia', async () => {
    mockDay = String(FUTURE);
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
    expect(screen.getByText(labelOf(FUTURE))).toBeTruthy();
  });

  // Integração (leitor): ler adiantado não conclui; progresso e marcos só contam o dia que chegou.
  test('no leitor do dia futuro não há Concluir leitura, só a data em que o dia poderá ser concluído', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    await goToLastChapter();
    expect(screen.queryByText('Concluir leitura')).toBeNull();
    expect(screen.getByTestId('reader-future-note')).toHaveTextContent(
      /^Você poderá concluir este dia a partir de \d{2}\/\d{2}\/\d{4}\.$/,
    );
    expect(screen.getByText('Voltar')).toBeTruthy();
  });

  test('no leitor do dia de hoje Concluir leitura continua e não há a frase do dia futuro', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    await goToLastChapter();
    expect(screen.getByText('Concluir leitura')).toBeTruthy();
    expect(screen.queryByTestId('reader-future-note')).toBeNull();
  });

  test('um número fora da campanha continua sem abrir', async () => {
    mockDay = '101';
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.queryByTestId('reader-footer')).toBeNull());
    expect(screen.queryByTestId('reader-guide')).toBeNull();
  });
});
