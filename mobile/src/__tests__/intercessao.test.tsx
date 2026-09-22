import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler } from 'react-native';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
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

// FUTURE_DAYS_OPEN (J6) ligada abre os dias futuros; estes casos presumem o cadeado,
// então a chave fica desligada aqui (getter real: o spread do Babel congelaria o valor).
const mockFutureOpen = false;
jest.mock('@/config/features', () => {
  const mocked = { ...jest.requireActual('@/config/features') };
  Object.defineProperty(mocked, 'FUTURE_DAYS_OPEN', { get: () => mockFutureOpen, enumerable: true });
  return mocked;
});

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  canGoBack: jest.Mock;
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
const DAY17_CAPTION = 'Altar das 12h30 · hoje conduz: Ministério de exemplo 2';

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.canGoBack.mockReset();
  mockRouter.canGoBack.mockReturnValue(true);
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

    const date = formatDayDate(17, getCampaign());
    expect(screen.getByText(`Intercessão do dia · ${date}`)).toBeTruthy();
    // O leitor de tela não ouve o "·" (REGRAS 32).
    expect(screen.getByLabelText(`Intercessão do dia, ${date}`)).toBeTruthy();
    // Voltar leva o número do dia (TELAS E1: "‹ Dia 17").
    expect(screen.getByLabelText('Voltar para Dia 17')).toBeTruthy();
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
    // Só o passo corrente está na tela; o modo normal saiu.
    expect(screen.queryByText(STEPS[1].title)).toBeNull();
    expect(screen.queryByTestId('flow-step-1')).toBeNull();
    expect(screen.queryByTestId('enter-altar-mode')).toBeNull();
    // Rótulo visível "Passo 2", e o nome acessível contém o texto visível (WCAG 2.5.3).
    expect(screen.getByText('Passo 2')).toBeTruthy();
    expect(screen.getByTestId('altar-next').props.accessibilityLabel).toBe('Passo 2');
    // Passo 1 não tem passo anterior: o "‹" fica montado e inativo (R3-2).
    expect(screen.getByTestId('altar-previous').props.accessibilityState).toMatchObject({ disabled: true });
    // O aviso de conteúdo (C-07) continua durante o modo altar.
    expect(screen.getByTestId('content-banner')).toBeTruthy();

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
    expect(screen.getByTestId('altar-next').props.accessibilityLabel).toBe('Concluir');

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

  test('modo altar: cada passo é dito UMA vez, por um mecanismo só', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    // O jest-expo já entrega um jest.fn aqui: zera o que outros testes chamaram.
    announce.mockClear();
    focus.mockClear();
    try {
      await renderToday();
      expect(announce).not.toHaveBeenCalled();
      await enterAltarMode();
      // Entrada: o foco vai para o título do passo 1 (que diz "Passo 1 de 5: …"),
      // sem anúncio somado.
      await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
      expect(announce).not.toHaveBeenCalled();
      expect(focus.mock.calls[0][1]).toBe('focus');
      expect(screen.getByTestId('altar-step-heading').props.accessibilityLabel).toBe(`Passo 1 de 5: ${STEPS[0].title}`);

      // Troca: o foco fica no rodapé e o passo novo é anunciado uma vez.
      fireEvent.press(screen.getByTestId('altar-next'));
      await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenLastCalledWith(`Passo 2 de 5: ${STEPS[1].title}`);
      expect(focus).toHaveBeenCalledTimes(1);
    } finally {
      announce.mockRestore();
      focus.mockRestore();
    }
  });

  test('modo altar: "‹" volta um passo e tem nome acessível', async () => {
    await renderToday();
    await enterAltarMode();
    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());

    expect(screen.getByLabelText('Passo anterior')).toBeTruthy();
    fireEvent.press(screen.getByTestId('altar-previous'));
    await waitFor(() => expect(screen.getByText('Passo 1 de 5')).toBeTruthy());
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
  });

  test('dia passado não diz "hoje conduz", diz "conduziu"', async () => {
    mockDay = '10';
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByTestId('flow-step-1')).toBeTruthy());
    const caption = screen.getByTestId('altar-caption');
    expect(caption.props.children).toMatch(/^Altar das 12h30 · conduziu: /);
    expect(screen.queryByText(/hoje conduz/)).toBeNull();
    expect(screen.getByLabelText('Voltar para Dia 10')).toBeTruthy();
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

  /** Nada do dia 40 pode aparecer: nem passos, nem ênfase, nem motivos, nem escala. */
  function expectNothingOfDay40() {
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
    expect(screen.queryByLabelText(/Monte do dia/)).toBeNull();
  }

  test('dia futuro abre a folha do cadeado (A4) e nenhum conteúdo do dia', async () => {
    mockDay = '40';
    await render(<IntercessionScreen />);
    const date = formatDayDate(40, getCampaign());
    await waitFor(() => expect(screen.getByTestId('locked-day-sheet')).toBeTruthy());

    expect(screen.getByText(`Abre em ${date}.`)).toBeTruthy();
    expect(screen.getByLabelText(`Dia 40 abre em ${date}.`)).toBeTruthy();
    // A segunda frase ("Nada foi perdido…") é do LockSheet (R3-12, outro grupo).
    expect(screen.getByText(/^A intercessão de cada dia abre no dia oficial da igreja\./)).toBeTruthy();
    expectNothingOfDay40();

    fireEvent.press(screen.getByTestId('locked-day-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('dia futuro aberto a frio (deep link, sem pilha) vira tela e leva para a casa', async () => {
    mockDay = '40';
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByTestId('locked-day-screen')).toBeTruthy());
    expectNothingOfDay40();

    fireEvent.press(screen.getByTestId('locked-day-home'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();
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
