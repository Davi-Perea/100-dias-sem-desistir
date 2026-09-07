import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, loadCompletions } from '@/progress/completionsStore';
import { _resetFastingCacheForTests, loadFasting } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const CAMPAIGN = 'dev-fixture-campaign';

/** Coloca a campanha ativa no dia informado (0 = ainda não começou; >100 = encerrada). */
function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }),
  );
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  // Fixa a data para que "hoje" seja sempre o dia 17.
  resetToDevFixtures(new Date());
});

describe('tela Hoje', () => {
  test('mostra o dia oficial, a leitura e o versículo-chave', async () => {
    await seedSettings();
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByText('Dia 17 de 100')).toBeTruthy());
    expect(screen.getByText('Salmos 2–3')).toBeTruthy();
    expect(screen.getByText('Provérbios 2')).toBeTruthy();
    expect(screen.getByText('Provérbios 3:5')).toBeTruthy();
    expect(screen.getByText('DEV FIXTURE — NOT PRODUCTION CONTENT')).toBeTruthy();
  });

  test('conclui o dia, mostra reflexão e próximo passo, e desfaz', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());

    // Antes de concluir não há reflexão nem prévia do próximo dia (spec §6.8, §6.11).
    expect(screen.queryByTestId('reflection-card')).toBeNull();

    fireEvent.press(screen.getByTestId('complete-day'));

    await waitFor(() => expect(screen.getByText('Dia 17 concluído')).toBeTruthy());
    expect(screen.getByTestId('reflection-card')).toBeTruthy();
    expect(screen.getByText('Amanhã continuamos no dia 18.')).toBeTruthy();
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy();

    fireEvent.press(screen.getByTestId('undo-complete'));
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeUndefined();
  });

  test('a preferência de leitura muda a ordem dos CTAs, não a disponibilidade', async () => {
    await seedSettings({ readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByLabelText('Vou ler na minha Bíblia')).toBeTruthy());
    // As duas formas continuam presentes (spec §4.3, §6.5).
    expect(screen.getByLabelText('Ler aqui')).toBeTruthy();
  });

  test('"Ler aqui" abre o Reader como rota contextual', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByLabelText('Ler aqui')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Ler aqui'));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '17' } }),
    );
  });

  test('o cartão de jejum só aparece se o usuário optou, e o registro é privado', async () => {
    await seedSettings({ fastingEnabled: false });
    const first = await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByText('Dia 17 de 100')).toBeTruthy());
    expect(screen.queryByTestId('fasting-card')).toBeNull();
    await first.unmount();

    await seedSettings({ fastingEnabled: true });
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('fasting-card')).toBeTruthy());

    fireEvent.press(screen.getByTestId('fasting-toggle'));
    await waitFor(async () => expect((await loadFasting(CAMPAIGN)).days[17]).toBeTruthy());
    expect(screen.getByText('Cumprido hoje')).toBeTruthy();
  });

  test('ANTES da campanha não revela a leitura do dia 1', async () => {
    await seedSettings();
    loadCampaignOnDay(0);
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.getByText('A jornada ainda não começou')).toBeTruthy();
    // Nenhuma referência de leitura, nenhum CTA de conclusão.
    expect(screen.queryByText('Salmos 1')).toBeNull();
    expect(screen.queryByTestId('complete-day')).toBeNull();
    expect(screen.queryByLabelText('Ler aqui')).toBeNull();
  });

  test('DEPOIS da campanha mostra o encerramento e mantém o dia 100 acessível', async () => {
    await seedSettings();
    loadCampaignOnDay(130);
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByTestId('after-campaign-card')).toBeTruthy());
    expect(screen.getByText('A jornada da igreja terminou')).toBeTruthy();
    expect(screen.getByText('Jornada encerrada · 100 dias')).toBeTruthy();
    // O conteúdo do último dia continua disponível para quem não concluiu.
    expect(screen.getByText('Leitura do dia 100')).toBeTruthy();
    expect(screen.getByTestId('complete-day')).toBeTruthy();
  });

  test('retomada após intervalo usa linguagem de acolhimento, não de falha', async () => {
    await seedSettings();
    await AsyncStorage.setItem(
      `completions:v1:${CAMPAIGN}`,
      JSON.stringify({ days: { 10: new Date().toISOString() }, updatedAt: new Date().toISOString() }),
    );
    _resetCompletionsCacheForTests();

    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByText('Você voltou.')).toBeTruthy());
    expect(screen.getByText('Continue de onde quiser. A jornada segue com você.')).toBeTruthy();
    expect(screen.queryByText(/perdeu/i)).toBeNull();
    expect(screen.queryByText(/sequência/i)).toBeNull();
  });
});
