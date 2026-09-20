import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';

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
import { setBibleProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

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
    getBibleProvider: () => {
      const real = actual.getBibleProvider();
      wrapper ??= {
        getMetadata: () => real.getMetadata(),
        getPassage: (reference: unknown) => {
          mockGetPassage(reference);
          return real.getPassage(reference);
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

const TODAY = 17;
const FUTURE = 40;

beforeEach(async () => {
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
 * rota é rota: link direto, histórico e deep link chegam na mesma tela, e uma
 * regra que só existe no botão é decoração.
 */
describe('leitor de um dia que ainda não abriu', () => {
  test('mostra a data em que abre, em vez do texto do dia', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByText(`Dia ${FUTURE}`)).toBeTruthy());
    expect(screen.getByText(/Abre em/)).toBeTruthy();
    expect(screen.getByTestId('reader-locked-back')).toBeTruthy();
    expect(screen.queryByText(labelOf(FUTURE))).toBeNull();
  });

  test('não pede a passagem ao provedor de texto bíblico', async () => {
    mockDay = String(FUTURE);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByText(`Dia ${FUTURE}`)).toBeTruthy());

    // Com uma tradução licenciada, isso seria uma requisição de conteúdo que
    // não deveria existir — e ela aconteceria antes de qualquer tela aparecer.
    expect(mockGetPassage).not.toHaveBeenCalled();
  });

  test('o dia de hoje continua abrindo e pedindo a passagem', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(mockGetPassage).toHaveBeenCalled());
    expect(screen.queryByTestId('reader-locked-back')).toBeNull();
  });
});

describe('reflexão de um dia que ainda não abriu', () => {
  test('não revela a referência da leitura daquele dia', async () => {
    mockDay = String(FUTURE);
    await render(<ReflectionScreen />);

    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.queryByText(labelOf(FUTURE))).toBeNull();
    expect(screen.getByText(/salva neste aparelho/)).toBeTruthy();
  });

  test('no dia de hoje a referência aparece', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.getByText(labelOf(TODAY))).toBeTruthy();
  });
});
