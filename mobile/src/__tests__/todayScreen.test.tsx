import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
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
 * `patch` permite variar as fixtures de um caso (ex.: escala com nomes) sem tocar nelas.
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

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  // Fixa a data para que "hoje" seja sempre o dia 17.
  loadCampaignOnDay(17);
});

describe('tela Início', () => {
  test('mostra o dia oficial, o tema e a leitura do dia', async () => {
    await seedSettings();
    await render(<TodayScreen />);

    // O numeral e o "de 100" são dois textos no layout do handoff; o rótulo de
    // acessibilidade é que junta os dois numa frase.
    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());
    expect(screen.getByText('Tema de hoje')).toBeTruthy();
    expect(screen.getByText(/Salmos 2–3/)).toBeTruthy();
    expect(screen.getByText(/Provérbios 2/)).toBeTruthy();
    expect(screen.getByText(/capítulos/)).toBeTruthy();
    expect(screen.getByText(/DEV FIXTURE|desenvolvimento/i)).toBeTruthy();
  });

  test('conclui o dia, oferece a reflexão e desfaz', async () => {
    await seedSettings({ readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());

    // Antes de concluir, a reflexão ainda não é oferecida.
    expect(screen.queryByTestId('reflection-card')).toBeNull();

    fireEvent.press(screen.getByTestId('complete-day'));

    await waitFor(() => expect(screen.getByTestId('day-completed')).toBeTruthy());
    expect(screen.getByText('Minha reflexão · só você vê')).toBeTruthy();
    expect(screen.getByTestId('reflection-card')).toBeTruthy();
    // A intercessão continua ao alcance depois de ler.
    expect(screen.getByTestId('open-intercession')).toBeTruthy();
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeTruthy();

    // "Desfazer" está sempre disponível no dia corrente, sem confirmação extra.
    fireEvent.press(screen.getByTestId('undo-complete'));
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    expect((await loadCompletions(CAMPAIGN)).days[17]).toBeUndefined();
  });

  test('a preferência de leitura muda a ordem dos CTAs, não a disponibilidade', async () => {
    await seedSettings({ readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByText('Concluir leitura')).toBeTruthy());
    // As duas formas continuam presentes.
    expect(screen.getByText('Ler aqui no app')).toBeTruthy();
  });

  test('"Ler agora" abre o Reader como rota contextual', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByText('Ler agora')).toBeTruthy());
    fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '17' } }),
    );
  });

  test('a linha de jejum só aparece se o usuário optou, e o registro é privado', async () => {
    await seedSettings({ fastingEnabled: false });
    const first = await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByLabelText('Dia 17 de 100')).toBeTruthy());
    expect(screen.queryByTestId('fasting-card')).toBeNull();
    await first.unmount();

    await seedSettings({ fastingEnabled: true });
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('fasting-card')).toBeTruthy());
    expect(screen.getByText('Registro privado. Fica só neste aparelho.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('fasting-toggle'));
    await waitFor(async () => expect((await loadFasting(CAMPAIGN)).days[17]).toBeTruthy());
    expect(screen.getByTestId('fasting-toggle').props.accessibilityState.checked).toBe(true);
  });

  test('o progresso coletivo não inventa número quando não há fonte', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('church-progress')).toBeTruthy());
    // Nenhum número de "pessoas já leram hoje" enquanto a agregação não existir.
    expect(screen.queryByText(/pessoas já leram hoje/)).toBeNull();
    expect(screen.getByText('Progresso da igreja')).toBeTruthy();
  });

  test('ANTES da campanha não revela a leitura do dia 1', async () => {
    await seedSettings();
    loadCampaignOnDay(0);
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.getByText(/Faltam/)).toBeTruthy();
    // Nenhuma referência de leitura, nenhum CTA de conclusão.
    expect(screen.queryByText(/Salmos 1/)).toBeNull();
    expect(screen.queryByTestId('complete-day')).toBeNull();
    expect(screen.queryByText('Ler agora')).toBeNull();
  });

  test('DEPOIS da campanha mostra o encerramento e mantém o dia 100 acessível', async () => {
    await seedSettings();
    loadCampaignOnDay(130);
    await render(<TodayScreen />);

    await waitFor(() => expect(screen.getByTestId('after-campaign-card')).toBeTruthy());
    expect(screen.getByText('Jornada encerrada · 100 dias')).toBeTruthy();
    // O conteúdo do último dia continua disponível para quem não concluiu.
    expect(screen.getByText('Tema do dia 100')).toBeTruthy();
    expect(screen.getByTestId('complete-day')).toBeTruthy();
    // A linha do altar passa a falar do Dia 100 no passado: dia 100 → ((100-1)%3)+1 = 1;
    // monte (100-1)%7 = 1 → Família.
    const altar = within(screen.getByTestId('altar-today'));
    expect(altar.getByText('Conduziu no Dia 100: Ministério de exemplo 1')).toBeTruthy();
    expect(altar.queryByText(/Hoje conduz/)).toBeNull();
    expect(screen.getByLabelText('Monte do dia: Família')).toBeTruthy();
  });

  test('mostra o monte, o versículo-base e os motivos de oração do dia', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('sphere-pill')).toBeTruthy());

    // Fixtures seguem SPHERE_ORDER: dia 17 → índice 16 % 7 = 2 → Educação.
    expect(screen.getByLabelText('Monte do dia: Educação')).toBeTruthy();
    expect(within(screen.getByTestId('sphere-pill')).getByText('Educação')).toBeTruthy();

    // Versículo-base das fixtures: (17-1) % 5 = 1 → "PRO 3:5", formatado em pt-BR.
    expect(screen.getByText('Versículo-base')).toBeTruthy();
    expect(screen.getByText('Provérbios 3:5').props.testID).toBe('key-verse');

    // Motivos como a igreja escreveu, um por linha, dentro do próprio bloco.
    const points = within(screen.getByTestId('prayer-points'));
    expect(points.getByText('Motivos de oração')).toBeTruthy();
    expect(points.getByText('Motivo de exemplo A do dia 17')).toBeTruthy();
    expect(points.getByText('Motivo de exemplo B do dia 17')).toBeTruthy();
  });

  test('sem motivos de oração o bloco some em vez de ficar vazio', async () => {
    await seedSettings();
    loadCampaignOnDay(17, patchDay17({ prayer_points: [] }));
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('key-verse')).toBeTruthy());
    expect(screen.queryByTestId('prayer-points')).toBeNull();
    expect(screen.queryByText('Motivos de oração')).toBeNull();
  });

  test('a linha do altar mostra o ministério da escala e o monte do dia', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-today')).toBeTruthy());

    const altar = within(screen.getByTestId('altar-today'));
    expect(altar.getByText('Altar das 12h30')).toBeTruthy();
    // Fixture do dia 17: ((17-1) % 3) + 1 = 2.
    expect(altar.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
    expect(altar.getByText(/Educação/)).toBeTruthy();
  });

  test('nomes de líderes da escala não aparecem sem autorização da igreja', async () => {
    await seedSettings();
    // Mesmo que a escala traga o rótulo com nomes, sem `leader_names_authorized`
    // a tela só pode mostrar o ministério.
    loadCampaignOnDay(
      17,
      patchDay17({ altar: { ministry: 'Ministério de exemplo 2', leaders_label: 'Líderes de exemplo' } }),
    );
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-today')).toBeTruthy());

    expect(screen.getByText('Hoje conduz: Ministério de exemplo 2')).toBeTruthy();
    expect(screen.queryByText(/Líderes de exemplo/)).toBeNull();
  });

  test('"Intercessão do dia" abre a intercessão do dia oficial', async () => {
    await seedSettings();
    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('open-intercession')).toBeTruthy());

    fireEvent.press(screen.getByTestId('open-intercession'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/intercessao/[day]', params: { day: '17' } });
  });

  test('retomada após intervalo usa linguagem de acolhimento, não de falha', async () => {
    await seedSettings();
    await AsyncStorage.setItem(
      `completions:v1:${CAMPAIGN}`,
      JSON.stringify({ days: { 10: new Date().toISOString() }, updatedAt: new Date().toISOString() }),
    );
    _resetCompletionsCacheForTests();

    await render(<TodayScreen />);
    await waitFor(() => expect(screen.getByTestId('return-module')).toBeTruthy());
    expect(screen.getByText(/Que bom ter você/)).toBeTruthy();
    expect(screen.queryByText(/perdeu/i)).toBeNull();
    expect(screen.queryByText(/sequência/i)).toBeNull();
    expect(screen.queryByText(/falhou/i)).toBeNull();
  });
});
