import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TogetherScreen from '@/app/(tabs)/juntos';
import PropositoScreen from '@/app/proposito';
import { getCampaign, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import { PROPOSITO, flowSteps, publicSections } from '@/journey/proposito';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };

/** Coloca a campanha ativa no dia informado (0 = ainda não começou). */
function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  mockRouter.push.mockClear();
  loadCampaignOnDay(17);
});

describe('página Sobre o propósito', () => {
  test('mostra as oito seções públicas da orientação e esconde as de líderes', async () => {
    await render(<PropositoScreen />);

    const sections = publicSections();
    expect(sections).toHaveLength(8);
    for (const section of sections) {
      expect(screen.getByText(section.heading)).toBeTruthy();
    }
    sections.forEach((_, index) => expect(screen.getByTestId(`proposito-section-${index}`)).toBeTruthy());

    // As duas seções dirigidas a líderes existem no dado, mas não nesta página.
    expect(PROPOSITO.sections.filter((s) => !s.public).map((s) => s.heading)).toEqual([
      'PARTICIPAÇÃO E RESPONSABILIDADE DOS MINISTÉRIOS',
      'QUAL É A RESPONSABILIDADE DO LÍDER?',
    ]);
    expect(screen.queryByText('QUAL É A RESPONSABILIDADE DO LÍDER?')).toBeNull();
    expect(screen.queryByText('PARTICIPAÇÃO E RESPONSABILIDADE DOS MINISTÉRIOS')).toBeNull();
    expect(screen.queryByText(/Pedimos a cada líder/)).toBeNull();
  });

  test('título, introdução e fonte vêm verbatim do texto da igreja', async () => {
    await render(<PropositoScreen />);

    expect(screen.getByText(PROPOSITO.subtitle)).toBeTruthy();
    for (const paragraph of PROPOSITO.intro) {
      expect(screen.getByText(paragraph)).toBeTruthy();
    }
    expect(
      screen.getByText(`Texto da orientação da igreja (${PROPOSITO.source.file}), reproduzido sem alterações.`),
    ).toBeTruthy();
  });

  test('o fluxo da reunião usa os cinco passos de flowSteps()', async () => {
    await render(<PropositoScreen />);

    const steps = flowSteps();
    expect(steps).toHaveLength(5);
    for (const step of steps) {
      expect(screen.getByText(step.title)).toBeTruthy();
      expect(screen.getByText(step.description)).toBeTruthy();
      expect(screen.getByLabelText(`Passo ${step.step}`)).toBeTruthy();
    }
  });

  test('não traz a saudação do documento aos líderes', async () => {
    await render(<PropositoScreen />);
    expect(screen.queryByText(/Queridos líderes/)).toBeNull();
  });
});

describe('Juntos: altar das 12h30', () => {
  test('mostra quem conduz hoje, o monte e a data, sem conta', async () => {
    await render(<TogetherScreen />);

    await waitFor(() => expect(screen.getByTestId('altar-today')).toBeTruthy());
    expect(screen.getByText('Altar das 12h30')).toBeTruthy();
    // Dia 17 da fixture: ministério ((17-1) % 3) + 1 = 2, monte = Educação.
    expect(screen.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
    expect(screen.getByLabelText('Monte do dia: Educação')).toBeTruthy();
    expect(screen.getByText(`Dia 17 · ${formatDayDate(17, getCampaign())}`)).toBeTruthy();
    // Nomes de líderes não autorizados nunca aparecem.
    expect(screen.queryByText(/Prs\./)).toBeNull();

    fireEvent.press(screen.getByTestId('open-proposito'));
    expect(mockRouter.push).toHaveBeenCalledWith('/proposito');
  });

  test('antes da campanha aponta para o Dia 1 sem dizer "hoje"', async () => {
    loadCampaignOnDay(0);
    await render(<TogetherScreen />);

    await waitFor(() => expect(screen.getByTestId('altar-today')).toBeTruthy());
    expect(screen.getByText(`O altar começa em ${formatDayDate(1, getCampaign())}`)).toBeTruthy();
    expect(screen.getByText('Dia 1 conduz: Ministério de exemplo 1')).toBeTruthy();
    expect(screen.getByLabelText('Monte do dia: Igreja')).toBeTruthy();
    expect(screen.queryByText(/Hoje conduz/)).toBeNull();
  });
});
