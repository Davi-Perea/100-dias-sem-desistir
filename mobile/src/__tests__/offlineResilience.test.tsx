import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import JourneyScreen from '@/app/(tabs)/jornada';
import { _setSupabaseClientForTests } from '@/cloud/client';
import { _setCloudConfigForTests } from '@/cloud/config';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, loadCompletions } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { createFakeSupabase } from '@/testing/fakeSupabase';

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

const CAMPAIGN = 'dev-fixture-campaign';

/** Coloca a campanha ativa no dia informado, sem depender do relógio da máquina. */
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
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  loadCampaignOnDay(17);
});

afterEach(() => {
  _setCloudConfigForTests(null);
  _setSupabaseClientForTests(null);
});

/**
 * Regra do spec §14: nenhuma falha de nuvem pode quebrar o núcleo local.
 * Aqui a nuvem está configurada e TODA chamada falha.
 */
describe('o núcleo local sobrevive à nuvem quebrada', () => {
  function breakTheCloud() {
    const fake = createFakeSupabase();
    const boom = () => Promise.reject(new Error('Network request failed'));
    fake.client.auth.getSession.mockImplementation(boom);
    fake.client.auth.getUser.mockImplementation(boom);
    fake.client.from.mockImplementation(() => {
      throw new Error('Network request failed');
    });
    fake.client.rpc.mockImplementation(boom);
    _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
    _setSupabaseClientForTests(fake.client as unknown as SupabaseClient);
    return fake;
  }

  test('Hoje continua carregando e concluindo o dia', async () => {
    breakTheCloud();
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());
    expect(screen.getByText(/Salmos 2–3/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy();
  });

  test('Jornada continua renderizando o caminho', async () => {
    breakTheCloud();
    await render(<JourneyScreen />);
    await waitFor(() => expect(screen.getByTestId('journey-day-17')).toBeTruthy());
  });

  test('o progresso segue no aparelho, sem nenhuma escrita na nuvem', async () => {
    const fake = breakTheCloud();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(async () => expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy());

    // Nada de progresso foi enviado: sync na nuvem não faz parte desta execução.
    expect(fake.calls).toHaveLength(0);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  test('sem nuvem configurada o comportamento é idêntico', async () => {
    _setCloudConfigForTests(null);
    _setSupabaseClientForTests(null);
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());
    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
  });
});
