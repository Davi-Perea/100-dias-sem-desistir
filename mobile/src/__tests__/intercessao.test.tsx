import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import IntercessionScreen from '@/app/intercessao/[day]';
import { formatReference } from '@/bible/references';
import { getCampaign, getDay, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import { flowSteps } from '@/journey/proposito';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
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

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
};
const mockKeepAwake = jest.requireMock('expo-keep-awake').useKeepAwake as jest.Mock;

/**
 * Coloca a campanha ativa no dia informado. `patch` permite variar as fixtures
 * de um caso (ex.: escala com nomes) sem tocar nelas.
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

async function seedSettings() {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
}

/** Renderiza e espera o modo normal do dia 17 aparecer. */
async function renderToday() {
  await render(<IntercessionScreen />);
  await waitFor(() => expect(screen.getByTestId('flow-step-1')).toBeTruthy());
}

async function enterAltarMode() {
  fireEvent.press(screen.getByTestId('enter-altar-mode'));
  await waitFor(() => expect(screen.getByText('Passo 1 de 5')).toBeTruthy());
}

const STEPS = flowSteps();
/** Dia 17 nas fixtures: monte "Educação", versículo PRO 3:5, ministério de exemplo 2. */
const DAY17_VERSE = formatReference('PRO 3:5');
const DAY17_CAPTION = 'Altar das 12h30 · conduz: Ministério de exemplo 2';

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockKeepAwake.mockClear();
  mockDay = '17';
  resetToDevFixtures(new Date());
  loadCampaignOnDay(17);
  await seedSettings();
});

describe('Intercessão do dia', () => {
  test('a orientação da igreja tem exatamente cinco passos', () => {
    expect(STEPS).toHaveLength(5);
    expect(STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  test('mostra cabeçalho, monte, ênfase, escala e os cinco passos', async () => {
    await renderToday();
    const day = getDay(17);
    if (!day?.title) throw new Error('fixture do dia 17 sem título');

    expect(screen.getByText(`Intercessão do dia · Dia 17 · ${formatDayDate(17, getCampaign())}`)).toBeTruthy();
    expect(screen.getByTestId('content-banner')).toBeTruthy();
    expect(screen.getByLabelText('Monte do dia: Educação')).toBeTruthy();
    expect(screen.getAllByText(day.title).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(DAY17_CAPTION)).toBeTruthy();

    for (const step of STEPS) {
      expect(screen.getByTestId(`flow-step-${step.step}`)).toBeTruthy();
      expect(screen.getByText(step.title)).toBeTruthy();
      expect(screen.getByText(step.description)).toBeTruthy();
      expect(screen.getByLabelText(`Passo ${step.step} de 5: ${step.title}`)).toBeTruthy();
    }
    expect(screen.getByTestId('enter-altar-mode')).toBeTruthy();
  });

  test('passo 4 mostra o monte e os motivos de oração das fixtures', async () => {
    await renderToday();
    const list = within(screen.getByTestId('flow-step-4')).getByTestId('prayer-points');
    expect(within(list).getByText('Motivo de exemplo A do dia 17')).toBeTruthy();
    expect(within(list).getByText('Motivo de exemplo B do dia 17')).toBeTruthy();
    // Pílula do cabeçalho + cap do passo 4.
    expect(screen.getAllByText('Educação').length).toBe(2);
  });

  test('passo 3 mostra o versículo-base e abre o leitor do dia', async () => {
    await renderToday();
    const step3 = within(screen.getByTestId('flow-step-3'));
    expect(step3.getByText('Versículo-base')).toBeTruthy();
    expect(step3.getByText(DAY17_VERSE)).toBeTruthy();
    fireEvent.press(step3.getByText('Abrir no leitor'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '17' } });
  });

  test('modo altar: um passo por vez, tela acesa, "Concluir" volta ao normal', async () => {
    await renderToday();
    expect(mockKeepAwake).not.toHaveBeenCalled();

    await enterAltarMode();
    expect(mockKeepAwake).toHaveBeenCalled();
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
    expect(screen.getByLabelText(`Passo 1 de 5: ${STEPS[0].title}`)).toBeTruthy();
    // Só o passo corrente está na tela; o modo normal saiu.
    expect(screen.queryByText(STEPS[1].title)).toBeNull();
    expect(screen.queryByTestId('flow-step-1')).toBeNull();
    expect(screen.queryByTestId('enter-altar-mode')).toBeNull();
    expect(screen.getByText('Próximo passo')).toBeTruthy();

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());
    expect(screen.getByText(STEPS[1].title)).toBeTruthy();
    expect(screen.queryByText(STEPS[0].title)).toBeNull();

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 3 de 5')).toBeTruthy());
    expect(screen.getByText('Versículo-base')).toBeTruthy();
    expect(screen.getByText(DAY17_VERSE)).toBeTruthy();

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 4 de 5')).toBeTruthy());
    expect(screen.getByText('Educação')).toBeTruthy();
    const points = screen.getByTestId('altar-prayer-points');
    expect(within(points).getByText('Motivo de exemplo A do dia 17')).toBeTruthy();
    expect(within(points).getByText('Motivo de exemplo B do dia 17')).toBeTruthy();

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 5 de 5')).toBeTruthy());
    expect(screen.getByText('Concluir')).toBeTruthy();
    expect(screen.queryByText('Próximo passo')).toBeNull();

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByTestId('enter-altar-mode')).toBeTruthy());
    expect(screen.getByTestId('flow-step-5')).toBeTruthy();
    expect(screen.queryByText('Passo 5 de 5')).toBeNull();
    // Concluir o modo altar é sair de uma tela, não uma navegação.
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('"Sair do modo altar" volta ao modo normal sem sair da tela', async () => {
    await renderToday();
    await enterAltarMode();
    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());

    fireEvent.press(screen.getByTestId('exit-altar-mode'));
    await waitFor(() => expect(screen.getByTestId('enter-altar-mode')).toBeTruthy());
    expect(screen.queryByText('Passo 2 de 5')).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();

    // Entrar de novo recomeça do passo 1.
    await enterAltarMode();
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
  });

  test('o botão de voltar do Android sai do modo altar, não da tela', async () => {
    type BackPressHandler = Parameters<typeof BackHandler.addEventListener>[1];
    const captured: { handler: BackPressHandler | null } = { handler: null };
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      captured.handler = handler;
      return { remove: jest.fn() };
    });
    try {
      await renderToday();
      expect(captured.handler).toBeNull();

      await enterAltarMode();
      expect(captured.handler).not.toBeNull();

      let consumed: ReturnType<BackPressHandler> | undefined;
      await act(async () => {
        consumed = captured.handler?.({} as Parameters<BackPressHandler>[0]);
      });
      expect(consumed).toBe(true);
      await waitFor(() => expect(screen.getByTestId('enter-altar-mode')).toBeTruthy());
      expect(mockRouter.back).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test('dia futuro mostra o cadeado e nenhum conteúdo do dia', async () => {
    mockDay = '40';
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByText('Dia 40')).toBeTruthy());

    expect(screen.getByText(`Abre em ${formatDayDate(40, getCampaign())}.`)).toBeTruthy();
    expect(screen.getByText('Voltar')).toBeTruthy();
    expect(screen.queryByTestId('enter-altar-mode')).toBeNull();
    for (const step of STEPS) {
      expect(screen.queryByTestId(`flow-step-${step.step}`)).toBeNull();
      expect(screen.queryByText(step.title)).toBeNull();
    }
    const day40 = getDay(40);
    if (!day40?.title) throw new Error('fixture do dia 40 sem título');
    expect(screen.queryByText(day40.title)).toBeNull();
    expect(screen.queryByText(/Motivo de exemplo .* do dia 40/)).toBeNull();
    expect(screen.queryByTestId('altar-caption')).toBeNull();
  });

  test('dia inválido não quebra a tela', async () => {
    mockDay = 'abc';
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByText('Dia não encontrado')).toBeTruthy());
    expect(screen.queryByTestId('flow-step-1')).toBeNull();
  });

  test('nunca mostra nomes de líderes sem autorização da igreja', async () => {
    // As fixtures trazem leaders_label nulo; aqui forçamos um rótulo no dado bruto
    // para provar que a tela passa por `altarOfDay` e não pelo campo direto.
    loadCampaignOnDay(17, (dataset) => ({
      ...dataset,
      days: dataset.days.map((d) =>
        d.day_number === 17 && d.altar
          ? { ...d, altar: { ministry: d.altar.ministry, leaders_label: 'Nome de exemplo' } }
          : d,
      ),
    }));
    await renderToday();
    expect(screen.queryByText(/Nome de exemplo/)).toBeNull();
    expect(screen.getByText(DAY17_CAPTION)).toBeTruthy();

    await enterAltarMode();
    expect(screen.queryByText(/Nome de exemplo/)).toBeNull();
  });
});
