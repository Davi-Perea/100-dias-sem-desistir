import { render, screen, waitFor } from '@testing-library/react-native';

import MilestoneScreen from '@/app/marco/[day]';
import { loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

let mockParams: { day: string } = { day: '25' };

const CAMPAIGN = 'dev-fixture-campaign';

/** Coloca a campanha ativa no dia informado, sem depender do relógio da máquina. */
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

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, milestonesSeen: [] }));
  _resetSettingsCacheForTests();
  // A igreja está no dia 60; a pessoa entrou tarde e só agora fez a 25ª leitura.
  loadCampaignOnDay(60);
});

afterEach(() => {
  resetToBundledContent();
});

/**
 * O marco é disparado pela CONTAGEM de leituras da pessoa, não pelo dia oficial
 * da igreja. A tela não pode, portanto, descrever o dia de calendário homônimo:
 * quem entra atrasado leria a data, o monte e a ênfase de um dia que talvez nem
 * tenha lido. A separação entre progresso pessoal e dia oficial é a espinha do
 * produto, e esta tela era o único lugar que a quebrava.
 */
describe('tela de marco intermediário', () => {
  beforeEach(() => {
    mockParams = { day: '25' };
  });

  test('fala em leituras concluídas, não no dia do calendário', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText(/Marco · 25 de 100 dias lidos/)).toBeTruthy());
    // Nenhuma data: o dia 25 da igreja não tem relação com a 25ª leitura dela.
    expect(screen.queryByText(/\d\d\/\d\d\/\d{4}/)).toBeNull();
  });

  test('não descreve o monte nem a ênfase do dia homônimo', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-continue')).toBeTruthy());
    expect(screen.queryByTestId('milestone-day-line')).toBeNull();
  });

  test('a régua marca os dias que a pessoa leu, não 1 até o número do marco', async () => {
    await setDayCompleted(CAMPAIGN, 3, true);
    await setDayCompleted(CAMPAIGN, 47, true);
    await render(<MilestoneScreen />);
    // O rótulo da régua descreve a contagem pessoal.
    await waitFor(() => expect(screen.getByLabelText(/Régua com os 2 dias que você já leu, de 100\./)).toBeTruthy());
  });
});

describe('tela de chegada (Dia 100)', () => {
  beforeEach(() => {
    mockParams = { day: '100' };
  });

  test('mantém o dia e a data, porque 100 leituras implicam ter lido o Dia 100', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText(/Chegada · Dia 100 · \d\d\/\d\d\/\d{4}/)).toBeTruthy());
  });
});
