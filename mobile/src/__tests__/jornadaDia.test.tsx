import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import DayScreen from '@/app/dia/[day]';
import { getCampaign, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, loadCompletions } from '@/progress/completionsStore';
import { _resetFastingCacheForTests, loadFasting } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

let mockParams: { day: string } = { day: '17' };

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

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock; replace: jest.Mock };
const CAMPAIGN = 'dev-fixture-campaign';

function loadCampaignOnDay(day: number, patch: (dataset: JourneyDataset) => JourneyDataset = (d) => d) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    patch({ ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } }),
    'development',
  );
  if (!result.ok) throw new Error('fixture inválida no teste');
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, ...patch }));
  _resetSettingsCacheForTests();
}

async function openDay(day: number) {
  mockParams = { day: String(day) };
  await render(<DayScreen />);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  loadCampaignOnDay(17);
  await seedSettings();
});

afterAll(() => resetToDevFixtures());

describe('A3 · o dia completo', () => {
  test('mostra a barra de voltar com a data, o dia, o monte, a ênfase e a leitura', async () => {
    await openDay(17);
    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());

    expect(screen.getByLabelText('Voltar para Jornada')).toBeTruthy();
    expect(screen.getByText(formatDayDate(17, getCampaign()))).toBeTruthy();
    expect(screen.getByLabelText('Monte do dia: Educação')).toBeTruthy();
    expect(screen.getByTestId('day-emphasis')).toBeTruthy();
    expect(screen.getByText('Salmos 2–3 · Provérbios 2')).toBeTruthy();
    // A faixa C-07 é obrigatória em tela de conteúdo.
    expect(screen.getByTestId('content-banner')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('day-primary'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '17' } });
  });

  test('versículo-base só como referência, e os motivos de oração como a igreja escreveu', async () => {
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('key-verse')).toBeTruthy());
    // Fixture do dia 17: (17-1) % 5 = 1 → "PRO 3:5".
    expect(screen.getByText('Provérbios 3:5')).toBeTruthy();
    expect(screen.getByText('Versículo-base')).toBeTruthy();
    expect(screen.getByText('Motivos de oração')).toBeTruthy();
    expect(screen.getByText('Motivo de exemplo A do dia 17')).toBeTruthy();
    expect(screen.getByText('Motivo de exemplo B do dia 17')).toBeTruthy();
  });

  test('sem motivos de oração o bloco some em vez de ficar vazio', async () => {
    loadCampaignOnDay(17, (dataset) => ({
      ...dataset,
      days: dataset.days.map((d) => (d.day_number === 17 ? { ...d, prayer_points: [] } : d)),
    }));
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-reading')).toBeTruthy());
    expect(screen.queryByTestId('prayer-points')).toBeNull();
    expect(screen.queryByText('Motivos de oração')).toBeNull();
  });

  test('"Hoje conduz" só no dia de hoje', async () => {
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-altar')).toBeTruthy());
    // Fixture: ((17 − 1) % 3) + 1 = 2.
    expect(screen.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
  });

  test('CORREÇÃO: num dia passado, "Conduziu" — nunca "hoje" de um dia que não é hoje', async () => {
    await openDay(15);
    await waitFor(() => expect(screen.getByTestId('day-altar')).toBeTruthy());
    // ((15 − 1) % 3) + 1 = 3.
    expect(screen.getByText('Conduziu: Ministério de exemplo 3')).toBeTruthy();
    expect(screen.queryByText(/Hoje conduz/)).toBeNull();
  });

  test('nomes de líderes da escala não aparecem sem autorização da igreja', async () => {
    loadCampaignOnDay(17, (dataset) => ({
      ...dataset,
      days: dataset.days.map((d) =>
        d.day_number === 17 ? { ...d, altar: { ministry: 'Ministério de exemplo 2', leaders_label: 'Líderes de exemplo' } } : d,
      ),
    }));
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-altar')).toBeTruthy());
    expect(screen.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
    expect(screen.queryByText(/Líderes de exemplo/)).toBeNull();
  });

  test('R0-6: nem com a autorização da igreja o nome do líder aparece no altar', async () => {
    loadCampaignOnDay(17, (dataset) => ({
      ...dataset,
      DEV_ONLY: false,
      NOT_PRODUCTION_CONTENT: false,
      provenance: {
        ...dataset.provenance,
        rights_status: 'authorized',
        rights_reference: 'teste',
        leader_names_authorized: true,
      },
      days: dataset.days.map((d) =>
        d.day_number === 17 ? { ...d, altar: { ministry: 'Ministério de exemplo 2', leaders_label: 'Líderes de exemplo' } } : d,
      ),
    }));
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-altar')).toBeTruthy());
    expect(screen.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
    expect(screen.queryByText(/Líderes de exemplo/)).toBeNull();
  });

  test('intercessão e reflexão abrem as rotas do mesmo dia', async () => {
    await openDay(15);
    await waitFor(() => expect(screen.getByTestId('day-intercession')).toBeTruthy());
    // Cinco passos: sai de proposito.json, não da cópia do desenho.
    expect(screen.getByText('Cinco passos · modo altar')).toBeTruthy();
    expect(screen.getByLabelText('Intercessão do dia. Cinco passos, modo altar')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('day-intercession'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/intercessao/[day]', params: { day: '15' } });
    await fireEvent.press(screen.getByTestId('day-reflection'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reflexao/[day]', params: { day: '15' } });
  });

  test('PROVISÓRIO: quem leu na própria Bíblia conclui o dia aqui, e pode desfazer', async () => {
    await openDay(15);
    await waitFor(() => expect(screen.getByTestId('day-complete')).toBeTruthy());
    expect(screen.getByText('Concluir leitura')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-complete'));
    await waitFor(() => expect(screen.getByTestId('day-done')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[15]).toBeTruthy();
    expect(screen.queryByTestId('day-complete')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Desfazer a conclusão do dia 15'));
    await waitFor(() => expect(screen.getByTestId('day-complete')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[15]).toBeUndefined();
  });

  test('o jejum só aparece para quem optou; o registro é privado e diz "hoje" só hoje', async () => {
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-reading')).toBeTruthy());
    expect(screen.queryByTestId('day-fasting')).toBeNull();
    await screen.unmount();

    await seedSettings({ fastingEnabled: true });
    await openDay(17);
    await waitFor(() => expect(screen.getByTestId('day-fasting')).toBeTruthy());
    expect(screen.getByLabelText('Cumpri meu jejum hoje. Só você vê')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-fasting'));
    await waitFor(async () => expect((await loadFasting(CAMPAIGN)).days[17]).toBeTruthy());
    expect(screen.getByTestId('day-fasting').props.accessibilityState.checked).toBe(true);
    await screen.unmount();

    await openDay(15);
    await waitFor(() => expect(screen.getByTestId('day-fasting')).toBeTruthy());
    expect(screen.getByLabelText('Cumpri meu jejum neste dia. Só você vê')).toBeTruthy();
    expect(screen.queryByLabelText(/jejum hoje/)).toBeNull();
  });

  test('dia futuro: o bloqueio é da rota e não revela nada daquele dia', async () => {
    await openDay(18);
    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());
    expect(screen.getByText(`Abre em ${formatDayDate(18, getCampaign())}.`)).toBeTruthy();
    expect(screen.queryByTestId('day-reading')).toBeNull();
    expect(screen.queryByLabelText(/Monte do dia/)).toBeNull();
    expect(screen.queryByText(/Motivo de exemplo/)).toBeNull();
    expect(screen.queryByText(/Salmos|Provérbios|João/)).toBeNull();
  });

  test('dia inexistente volta para a casa', async () => {
    await openDay(250);
    await waitFor(() => expect(screen.getByText('Dia não encontrado')).toBeTruthy());
    await fireEvent.press(screen.getByText('Voltar para a Jornada'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
