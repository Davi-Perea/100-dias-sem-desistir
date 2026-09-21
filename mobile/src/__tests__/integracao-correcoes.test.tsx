import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import JourneyHome from '@/app/(tabs)/index';
import DayScreen from '@/app/dia/[day]';
import MilestoneScreen from '@/app/marco/[day]';
import ReflectionScreen from '@/app/reflexao/[day]';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, isDayCompleted, loadCompletions, setDayCompleted } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, getCachedSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { OfflineBanner, SAVE_ERROR_COPY } from '@/ui/components';

/**
 * Integração dos 8 grupos: o que um grupo pediu ao outro e ficou para a
 * integração. PER-02 nas telas (gravação recusada vira aviso, nunca silêncio),
 * "hoje" só no dia de hoje (reflexão B5), "Marco guardado" persistente e a faixa
 * sem internet anunciada.
 */

let mockParams: { day?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
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

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: () => {} })),
}));

const CAMPAIGN = 'dev-fixture-campaign';

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
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', milestonesSeen: [], ...patch }),
  );
  _resetSettingsCacheForTests();
}

/**
 * Rejeita a próxima gravação no disco (disco cheio). `mockRejectedValueOnce`,
 * e não `mockImplementation` + `mockRestore`: o setItem do mock do
 * AsyncStorage já é um jest.fn, e restaurá-lo apagaria a implementação dele.
 */
function failNextWrite() {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco cheio'));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  await seedSettings();
  loadCampaignOnDay(17);
  mockParams = {};
});

afterEach(() => {
  resetToBundledContent();
});

describe('Faixa sem internet (R4-3)', () => {
  test('é um elemento acessível, região viva, com a frase inteira como nome', async () => {
    await render(<OfflineBanner />);
    const banner = screen.getByLabelText(/^Sem internet./);
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessible).toBe(true);
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
    expect(banner.props.accessibilityLabel).toMatch(/^Sem internet\./);
  });
});

describe('B5 · "hoje" só no dia de hoje', () => {
  test('dia oficial: o título do desenho, com "hoje"', async () => {
    mockParams = { day: '17' };
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.getByText('O que ficou com você hoje?')).toBeTruthy();
  });

  test('dia passado: "neste dia", nunca "hoje"', async () => {
    mockParams = { day: '10' };
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());
    expect(screen.getByText('O que ficou com você neste dia?')).toBeTruthy();
    expect(screen.queryByText(/\bhoje\b/i)).toBeNull();
  });
});

describe('PER-02 · gravação recusada nas telas', () => {
  test('A3: "Concluir leitura" que não grava mostra o aviso e o dia continua aberto', async () => {
    mockParams = { day: '10' };
    await render(<DayScreen />);
    await waitFor(() => expect(screen.getByTestId('day-complete')).toBeTruthy());
    failNextWrite();
    fireEvent.press(screen.getByTestId('day-complete'));
    await waitFor(() => expect(screen.getByTestId('day-save-error')).toBeTruthy());
    expect(screen.getByText(SAVE_ERROR_COPY)).toBeTruthy();
    expect(isDayCompleted(await loadCompletions(CAMPAIGN), 10)).toBe(false);
    expect(screen.getByTestId('day-complete')).toBeTruthy();
  });

  test('painel de hoje: a falha aparece no painel; a próxima tentativa limpa o aviso', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    failNextWrite();
    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('today-save-error')).toBeTruthy());
    expect(screen.queryByTestId('day-completed')).toBeNull();

    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
    expect(screen.queryByTestId('today-save-error')).toBeNull();
  });
});

describe('E3 · "Marco guardado" sobrevive a reabrir a tela', () => {
  test('guardado fica em milestonesKept, separado de "visto"', async () => {
    loadCampaignOnDay(30);
    for (let day = 1; day <= 25; day += 1) await setDayCompleted(CAMPAIGN, day, true);
    mockParams = { day: '25' };
    const first = await render(<MilestoneScreen />);
    await waitFor(() => expect(getCachedSettings()?.milestonesSeen).toEqual([25]));
    expect(screen.getByText('Guardar este marco')).toBeTruthy();
    fireEvent.press(screen.getByTestId('milestone-keep'));
    await waitFor(() => expect(screen.getByText('Marco guardado')).toBeTruthy());
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}').milestonesKept).toEqual([25]);
    first.unmount();

    _resetSettingsCacheForTests();
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Marco guardado')).toBeTruthy());
  });
});
