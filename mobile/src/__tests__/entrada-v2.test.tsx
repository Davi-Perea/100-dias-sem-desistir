import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';

import { clearRecordedEvents, recordedEvents, setAnalyticsEnabled } from '@/analytics/analytics';
import OnboardingLayout from '@/app/onboarding/_layout';
import WelcomeScreen from '@/app/onboarding/index';
import LeituraStep from '@/app/onboarding/leitura';
import LembreteStep from '@/app/onboarding/lembrete';
import GoalsStep from '@/app/onboarding/metas';
import NameStep from '@/app/onboarding/nome';
import { GOAL_IDS, GOALS, goalLabel, isGoalId } from '@/config/goals';
import {
  _resetSettingsCacheForTests,
  DEFAULT_SETTINGS,
  getCachedSettings,
  loadSettings,
  normalizeSettings,
  PROFILE_NAME_MAX,
  SETTINGS_KEY,
} from '@/settings/settingsStore';
import { useDoveTransition } from '@/ui/entrada/doveContext';
import {
  contentOpacityAt,
  DIRECTION_CYCLE,
  DOVE_ASPECT,
  DOVE_DRIFT,
  DOVE_EASE,
  DOVE_FLIGHT_MS,
  DOVE_HEADING,
  DOVE_REDUCED_IN_MS,
  DOVE_REDUCED_OUT_MS,
  DOVE_SWAP_AT,
  DOVE_SWAP_DIP,
  DOVE_SWELL,
  DOVE_TILT,
  doveGeometry,
  dovePose,
  DoveTransitionProvider,
} from '@/ui/motion/DoveTransition';
import { ONBOARDING_STEP, ONBOARDING_STEPS } from '@/ui/OnboardingStep';
import { MIN_TOUCH, palettes } from '@/ui/theme';

/**
 * Entrada v2 (feedback do Davi, 2026-09-22, itens E1–E5): texto novo da F1, sem
 * a nota da leitura, sem o passo do jejum, passos de nome e metas, e a pomba
 * gigante do designer atravessando a tela em cada "seguir" da entrada, nunca com
 * "Reduzir movimento" e nunca na saída para a Jornada.
 */

/**
 * Reanimated no Jest (sobre o mock global de jest.setup.js), fazendo o papel da
 * thread de UI: as animações NÃO terminam sozinhas (o teste chama o fim), a
 * reação que vê a pomba cruzar o meio fica guardada para o teste disparar, e os
 * valores compartilhados sobrevivem entre renderizações, como no aparelho.
 */
type MockTiming = { to: unknown; duration?: number; done?: (finished?: boolean) => void; taken?: boolean };
const mockMotion: {
  timings: MockTiming[];
  reaction: { react: (crossed: boolean, previous: boolean | null) => void } | null;
  engineReduced: boolean;
} = { timings: [], reaction: null, engineReduced: false };
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  const { useState } = jest.requireActual('react');
  return {
    ...actual,
    useReducedMotion: () => mockMotion.engineReduced,
    useSharedValue: (init: unknown) => useState(() => actual.useSharedValue(init))[0],
    withTiming: (to: unknown, config?: { duration?: number }, done?: (finished?: boolean) => void) => {
      mockMotion.timings.push({ to, duration: config?.duration, done });
      return to;
    },
    useAnimatedReaction: (_prepare: unknown, react: (crossed: boolean, previous: boolean | null) => void) => {
      mockMotion.reaction = { react };
    },
  };
});

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockStack: { options: Record<string, unknown> | null; render: (() => ReactNode) | null } = {
  options: null,
  render: null,
};
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: Object.assign(
    ({ screenOptions }: { screenOptions: Record<string, unknown> }) => {
      mockStack.options = screenOptions;
      return mockStack.render ? mockStack.render() : null;
    },
    { Screen: () => null },
  ),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

const mockReminders = { scheduleDailyReminder: jest.fn(), cancelDailyReminder: jest.fn() };
jest.mock('@/reminders/reminders', () => {
  const actual = jest.requireActual('@/reminders/reminders');
  return {
    ...actual,
    scheduleDailyReminder: (...args: unknown[]) => mockReminders.scheduleDailyReminder(...args),
    cancelDailyReminder: (...args: unknown[]) => mockReminders.cancelDailyReminder(...args),
  };
});

const mockScheme = { value: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme.value,
}));

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: false, ...patch }));
  _resetSettingsCacheForTests();
  await loadSettings();
}

function mockReducedMotion(value: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(value);
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockMotion.timings = [];
  mockMotion.reaction = null;
  mockMotion.engineReduced = false;
  mockStack.options = null;
  mockStack.render = null;
  mockScheme.value = 'light';
  mockRouter.canGoBack.mockReturnValue(true);
  mockReminders.scheduleDailyReminder.mockResolvedValue({ ok: true });
  mockReminders.cancelDailyReminder.mockResolvedValue(undefined);
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

/* ------------------------------------------------------------ E1 · F1 */

describe('E1 · boas-vindas com o texto do fundador', () => {
  test('parágrafo novo; o antigo saiu', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByTestId('welcome-body').props.children).toBe(
      'Cem dias de Palavra, oração e consagração junto com a sua igreja.',
    );
    expect(screen.queryByText(/A igreja inteira lê a mesma coisa/)).toBeNull();
  });
});

/* ------------------------------------------------------ E2 / E3 · ordem */

describe('E2/E3 · leitura sem a nota e entrada sem o jejum', () => {
  test('a leitura não tem mais a frase de apoio e segue para o lembrete', async () => {
    await seedSettings({ readingMode: 'in_app' });
    await render(<LeituraStep />);
    expect(screen.queryByText(/Bíblia impressa não é pior/)).toBeNull();
    expect(screen.queryByTestId('reading-support')).toBeNull();
    await fireEvent.press(screen.getByTestId('reading-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/lembrete');
    expect(mockRouter.push).not.toHaveBeenCalledWith('/onboarding/jejum');
  });

  test('a rota do jejum saiu da entrada e nenhuma tela dela aponta para lá', () => {
    const dir = join(__dirname, '..', 'app', 'onboarding');
    expect(existsSync(join(dir, 'jejum.tsx'))).toBe(false);
    for (const file of ['index.tsx', 'nome.tsx', 'metas.tsx', 'leitura.tsx', 'lembrete.tsx', '_layout.tsx']) {
      expect(readFileSync(join(dir, file), 'utf8')).not.toMatch(/onboarding\/jejum|fastingEnabled: true/);
    }
  });

  test('terminar a entrada não liga o jejum nem manda nome ou metas para analytics', async () => {
    await seedSettings({ readingMode: 'in_app', profile: { name: 'Davi', goals: ['jejuar', 'orar-todo-dia'] } });
    setAnalyticsEnabled(true);
    clearRecordedEvents();
    try {
      await render(<LembreteStep />);
      await fireEvent.press(screen.getByTestId('reminder-continue'));
      await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
      expect(getCachedSettings()?.fastingEnabled).toBe(false);
      const events = JSON.stringify(recordedEvents());
      expect(events).toMatch(/onboarding_completed/);
      expect(events).not.toMatch(/Davi|jejuar|orar-todo-dia|goals|profile|fasting/i);
    } finally {
      setAnalyticsEnabled(false);
    }
  });
});

/* ------------------------------------------------ barra de passos (4) */

describe('barra de passos: quatro passos, na ordem nome → metas → leitura → lembrete', () => {
  test('constantes', () => {
    expect(ONBOARDING_STEPS).toBe(4);
    expect(ONBOARDING_STEP).toEqual({ nome: 1, metas: 2, leitura: 3, lembrete: 4 });
  });

  test.each([
    { name: 'nome', Step: NameStep, label: 'Passo 1 de 4' },
    { name: 'metas', Step: GoalsStep, label: 'Passo 2 de 4' },
    { name: 'leitura', Step: LeituraStep, label: 'Passo 3 de 4' },
    { name: 'lembrete', Step: LembreteStep, label: 'Passo 4 de 4' },
  ])('$name diz "$label"', async ({ Step, label }) => {
    await seedSettings();
    await render(<Step />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

/* -------------------------------------------------------- E4 · nome */

describe('E4 · "Como podemos te chamar?"', () => {
  test('título, campo com rótulo acessível, "Continuar" só com nome', async () => {
    await seedSettings();
    await render(<NameStep />);
    expect(screen.getByTestId('onboarding-step-title').props.children).toBe('Como podemos te chamar?');
    const input = screen.getByTestId('name-input');
    expect(input.props.accessibilityLabel).toBe('Seu nome');
    expect(input.props.maxLength).toBe(PROFILE_NAME_MAX);
    // Piso, nunca altura travada: o campo cresce com a fonte.
    expect(flat(input).minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(flat(input).height).toBeUndefined();
    expect(screen.getByTestId('name-continue').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(input, '   ');
    expect(screen.getByTestId('name-continue').props.accessibilityState.disabled).toBe(true);
  });

  test('grava o nome limpo só no aparelho e segue para as metas', async () => {
    await seedSettings();
    await render(<NameStep />);
    await fireEvent.changeText(screen.getByTestId('name-input'), '  Davi   Lima ');
    await fireEvent.press(screen.getByTestId('name-continue'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/metas'));
    expect(getCachedSettings()?.profile.name).toBe('Davi Lima');
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored.profile).toEqual({ name: 'Davi Lima', goals: [], customGoal: null });
  });

  test('"Pular" segue sem gravar e sem apagar um nome já gravado', async () => {
    await seedSettings({ profile: { name: 'Ana', goals: [] } });
    await render(<NameStep />);
    await waitFor(() => expect(screen.getByTestId('name-input').props.value).toBe('Ana'));
    await fireEvent.press(screen.getByTestId('name-skip'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/metas');
    expect(getCachedSettings()?.profile.name).toBe('Ana');
  });

  test('disco falhando: avisa e não avança', async () => {
    await seedSettings();
    await render(<NameStep />);
    const setItem = AsyncStorage.setItem as jest.Mock;
    setItem.mockRejectedValueOnce(new Error('disco cheio'));
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Davi');
    await fireEvent.press(screen.getByTestId('name-continue'));
    await waitFor(() => expect(screen.getByTestId('name-save-error')).toBeTruthy());
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------- E4 · metas */

describe('E4 · "Quais são suas metas para estes 100 dias?"', () => {
  test('as seis metas, como caixas de múltipla escolha com alvo de 48', async () => {
    await seedSettings();
    await render(<GoalsStep />);
    expect(screen.getByTestId('onboarding-step-title').props.children).toBe(
      'Quais são suas metas para estes 100 dias?',
    );
    for (const goal of GOALS) {
      const row = screen.getByRole('checkbox', { name: goal.label });
      expect(row.props.accessibilityState.checked).toBe(false);
      const style = flat(screen.getByTestId(`goal-${goal.id}`));
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(style.height).toBeUndefined();
      expect(style.paddingVertical).toBeGreaterThan(0);
    }
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  test('marca várias, desmarca, grava na hora; "Pular" some com meta marcada', async () => {
    await seedSettings();
    await render(<GoalsStep />);
    expect(screen.getByTestId('goals-continue').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('goals-skip')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('goal-biblia-inteira'));
    await fireEvent.press(screen.getByTestId('goal-jejuar'));
    await waitFor(() => expect(getCachedSettings()?.profile.goals).toEqual(['biblia-inteira', 'jejuar']));
    await fireEvent.press(screen.getByTestId('goal-biblia-inteira'));
    await waitFor(() => expect(getCachedSettings()?.profile.goals).toEqual(['jejuar']));

    // Estado por forma, não só cor.
    expect(flat(screen.getByTestId('goal-jejuar')).borderWidth).toBe(2.5);
    expect(flat(screen.getByTestId('goal-biblia-inteira')).borderWidth).toBe(1.5);
    expect(screen.getByRole('checkbox', { name: goalLabel('jejuar') }).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByTestId('goals-skip')).toBeNull();

    await fireEvent.press(screen.getByTestId('goals-continue'));
    // Fora do layout (sem provedor) não há voo: a troca é imediata.
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/leitura');
  });

  test('"Pular" sem metas segue para a leitura', async () => {
    await seedSettings();
    await render(<GoalsStep />);
    await fireEvent.press(screen.getByTestId('goals-skip'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/leitura');
    expect(getCachedSettings()?.profile.goals).toEqual([]);
  });

  test.each(['light', 'dark'] as const)('caixa marcada usa o par "marcado" auditado (%s)', async (scheme) => {
    mockScheme.value = scheme;
    await seedSettings({ profile: { name: null, goals: ['orar-todo-dia'] } });
    await render(<GoalsStep />);
    const row = screen.getByTestId('goal-orar-todo-dia');
    await waitFor(() => expect(flat(row).borderColor).toBe(palettes[scheme].text));
    expect(flat(screen.getByTestId('goal-ler-em-familia')).borderColor).toBe(palettes[scheme].controlBorder);
  });
});

/* ---------------------------------------------------- perfil local */

describe('settings.profile: formato compartilhado e normalização', () => {
  test('padrão', () => {
    expect(DEFAULT_SETTINGS.profile).toEqual({ name: null, goals: [], customGoal: null });
    expect(normalizeSettings({}).profile).toEqual({ name: null, goals: [], customGoal: null });
  });

  test('descarta metas desconhecidas e repetidas; limpa e corta o nome', () => {
    const long = 'x'.repeat(PROFILE_NAME_MAX + 10);
    expect(
      normalizeSettings({ profile: { name: '  Ana   Clara ', goals: ['jejuar', 'nada', 'jejuar', 3, 'conhecer-mais'] } })
        .profile,
    ).toEqual({ name: 'Ana Clara', goals: ['jejuar', 'conhecer-mais'], customGoal: null });
    expect(normalizeSettings({ profile: { name: long, goals: 'jejuar' } }).profile).toEqual({
      name: 'x'.repeat(PROFILE_NAME_MAX),
      goals: [],
      customGoal: null,
    });
    expect(normalizeSettings({ profile: { name: '   ' } }).profile.name).toBeNull();
    expect(normalizeSettings({ profile: 'lixo' }).profile).toEqual({ name: null, goals: [], customGoal: null });
  });

  test('ids e rótulos das metas', () => {
    expect(GOAL_IDS).toEqual([
      'biblia-inteira',
      'orar-todo-dia',
      'jejuar',
      'nao-desistir',
      'ler-em-familia',
      'conhecer-mais',
    ]);
    expect(GOALS.every((goal) => goal.label.length > 0)).toBe(true);
    expect(isGoalId('jejuar')).toBe(true);
    expect(isGoalId('ranking')).toBe(false);
  });
});

/* --------------------------------------------------------- E5 · pomba */

/** A próxima animação ainda não terminada com esta duração (o teste é a thread de UI). */
function takeTiming(duration: number): MockTiming {
  const timing = mockMotion.timings.find((t) => t.duration === duration && !t.taken);
  if (!timing) throw new Error(`nenhuma animação pendente de ${duration} ms`);
  timing.taken = true;
  return timing;
}
const pendingTimings = (duration: number) => mockMotion.timings.filter((t) => t.duration === duration && !t.taken);

/** A pomba cruza o meio da tela (0,5 do caminho): a thread de UI pede a troca. */
async function passMiddle() {
  await act(async () => {
    mockMotion.reaction?.react(true, false);
  });
}

/** Uma animação chega ao fim. */
async function finish(duration: number) {
  const timing = takeTiming(duration);
  await act(async () => {
    timing.done?.(true);
  });
}

async function flushReducedMotion() {
  await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
  await act(async () => {
    await Promise.resolve();
  });
}

/** Botão de teste que pede um voo e anota se o toque foi aceito. */
function FlyButton({ onResult }: { onResult: (accepted: boolean) => void }) {
  const flyDove = useDoveTransition();
  return <Pressable testID="fly" onPress={() => onResult(flyDove(() => mockRouter.push('/destino')))} />;
}

const bird = () => screen.getByTestId('dove-transition-bird', { includeHiddenElements: true });

describe('E5 · a pomba do designer atravessa a tela e troca o passo quando passa pelo meio', () => {
  test('os números do handoff (TransitionBird)', () => {
    expect(DOVE_FLIGHT_MS).toBe(720);
    expect(DOVE_EASE).toEqual([0.7, 0, 0.2, 1]);
    expect(DOVE_SWAP_AT).toBe(0.5);
    expect(DOVE_SWAP_DIP).toBe(0.1);
    expect(DOVE_TILT).toBe(2);
    expect(DOVE_DRIFT).toBe(0.02);
    expect(DOVE_SWELL).toBe(0.035);
    expect(DOVE_ASPECT).toBe(1.3733);
    expect(DOVE_REDUCED_OUT_MS).toBe(90);
    expect(DIRECTION_CYCLE).toEqual(['bottom-to-top', 'left-to-right', 'top-to-bottom', 'right-to-left']);
    expect(DIRECTION_CYCLE.map((d) => DOVE_HEADING[d])).toEqual([0, 90, 180, -90]);
  });

  test('pomba maior que a tela: entra e sai inteira por fora e passa pelo centro na troca', () => {
    const [w, h] = [390, 844];
    for (const direction of DIRECTION_CYCLE) {
      const g = doveGeometry(direction, w, h);
      const vertical = direction === 'bottom-to-top' || direction === 'top-to-bottom';
      const along = vertical ? h : w;
      const cross = vertical ? w : h;
      expect(g.length).toBeGreaterThanOrEqual(1.15 * along - 1e-9);
      expect(g.span).toBeGreaterThanOrEqual(1.2 * cross - 1e-9);
      expect(g.span / g.length).toBeCloseTo(DOVE_ASPECT, 6);
      // Nas pontas do caminho o centro da pomba está a meia viagem + meio corpo:
      // ela está inteira fora da tela.
      for (const p of [0, 1]) {
        const pose = dovePose(p, g);
        expect(Math.abs(vertical ? pose.y : pose.x)).toBeCloseTo(along / 2 + g.length / 2, 6);
        expect(pose.scale).toBeCloseTo(1, 6);
      }
      // No meio: centralizada no eixo da viagem, só a curva lateral de 2%.
      const mid = dovePose(DOVE_SWAP_AT, g);
      expect(vertical ? mid.y : mid.x).toBeCloseTo(0, 6);
      expect(Math.abs(vertical ? mid.x : mid.y)).toBeCloseTo(DOVE_DRIFT * cross, 6);
      expect(mid.scale).toBeCloseTo(1 + DOVE_SWELL, 6);
      expect(mid.rotate).toBeCloseTo(DOVE_HEADING[direction], 6);
    }
    // De baixo para cima: começa embaixo, termina em cima.
    const up = doveGeometry('bottom-to-top', w, h);
    expect(dovePose(0, up).y).toBeGreaterThan(0);
    expect(dovePose(1, up).y).toBeLessThan(0);
  });

  test('o conteúdo esmaece em volta da troca (0,1 do caminho de cada lado)', () => {
    expect(contentOpacityAt(0, false, 0)).toBe(1);
    expect(contentOpacityAt(0.4, false, 0)).toBeCloseTo(1, 6);
    expect(contentOpacityAt(0.45, false, 0)).toBeCloseTo(0.5, 6);
    expect(contentOpacityAt(0.52, false, 0)).toBe(0);
    expect(contentOpacityAt(0.52, true, 0.52)).toBe(0);
    expect(contentOpacityAt(0.57, true, 0.52)).toBeCloseTo(0.5, 6);
    expect(contentOpacityAt(1, true, 0.52)).toBe(1);
  });

  test('"Começar": a troca acontece UMA vez, no meio do voo; a camada não pega toque nem leitor de tela', async () => {
    mockReducedMotion(false);
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    const layer = screen.getByTestId('dove-transition', { includeHiddenElements: true });
    expect(layer.props.pointerEvents).toBe('none');
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    // Em repouso a pomba está montada (imagem já carregada), mas invisível.
    expect(flat(bird()).opacity).toBe(0);

    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(1);
    expect(mockRouter.push).not.toHaveBeenCalled();

    // Segundo toque durante o voo: ignorado, nenhum voo novo.
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(1);

    await passMiddle();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/nome');
    // Em voo a pomba aparece (o mock só recalcula o estilo quando renderiza: aqui, na troca).
    expect(flat(bird()).opacity).toBe(1);
    // O quadro seguinte ainda está depois do meio: não troca de novo.
    await passMiddle();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);

    await finish(DOVE_FLIGHT_MS);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(flat(bird()).opacity).toBe(0);
    expect(flat(screen.getByTestId('dove-content')).opacity).toBe(1);
  });

  test('toque durante o voo é ignorado: flyDove devolve false até a pomba sair da tela', async () => {
    mockReducedMotion(false);
    const results: boolean[] = [];
    await render(
      <DoveTransitionProvider>
        <FlyButton onResult={(accepted) => results.push(accepted)} />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.press(screen.getByTestId('fly'));
    await fireEvent.press(screen.getByTestId('fly'));
    expect(results).toEqual([true, false]);
    await passMiddle();
    await fireEvent.press(screen.getByTestId('fly'));
    expect(results).toEqual([true, false, false]);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);

    await finish(DOVE_FLIGHT_MS);
    await fireEvent.press(screen.getByTestId('fly'));
    expect(results).toEqual([true, false, false, true]);
  });

  test('se o quadro do meio não chegar, a troca acontece no fim do voo, uma vez', async () => {
    mockReducedMotion(false);
    const results: boolean[] = [];
    await render(
      <DoveTransitionProvider>
        <FlyButton onResult={(accepted) => results.push(accepted)} />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.press(screen.getByTestId('fly'));
    await finish(DOVE_FLIGHT_MS);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  test('a direção gira a cada voo: baixo→cima, esquerda→direita, cima→baixo, direita→esquerda', async () => {
    mockReducedMotion(false);
    await render(
      <DoveTransitionProvider>
        <FlyButton onResult={() => undefined} />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    const rotations: string[] = [];
    for (let i = 0; i < 5; i++) {
      await fireEvent.press(screen.getByTestId('fly'));
      await passMiddle();
      // O mock deixa a animação no ponto final (p = 1): rumo menos a inclinação.
      const transform = flat(bird()).transform as Record<string, unknown>[];
      rotations.push(transform[2].rotate as string);
      await finish(DOVE_FLIGHT_MS);
    }
    const expected = [0, 90, 180, -90, 0].map((heading) => `${heading - DOVE_TILT}deg`);
    expect(rotations).toEqual(expected);
  });

  test('a pomba branca é tingida: tinta sobre o amarelo da F1, branca depois no tema escuro', async () => {
    mockScheme.value = 'dark';
    mockReducedMotion(false);
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    expect(bird().props.source).toBe(require('../../assets/pomba/dove-up.png'));
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(flat(bird()).tintColor).toBe('#111111');
    await passMiddle();
    expect(flat(bird()).tintColor).toBe(palettes.dark.text);
    await finish(DOVE_FLIGHT_MS);
  });

  test('nas telas claras a pomba tem a cor do texto do tema', async () => {
    mockReducedMotion(false);
    await seedSettings();
    await render(
      <DoveTransitionProvider>
        <GoalsStep />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.press(screen.getByTestId('goals-skip'));
    expect(flat(bird()).tintColor).toBe(palettes.light.text);
    await passMiddle();
    expect(flat(bird()).tintColor).toBe(palettes.light.text);
    await finish(DOVE_FLIGHT_MS);
  });

  test.each([
    {
      name: 'nome → metas ("Pular")',
      seed: {},
      Step: NameStep,
      press: 'name-skip',
      to: '/onboarding/metas',
    },
    {
      name: 'metas → leitura',
      seed: {},
      Step: GoalsStep,
      press: 'goals-skip',
      to: '/onboarding/leitura',
    },
    {
      name: 'leitura → lembrete',
      seed: { readingMode: 'in_app' },
      Step: LeituraStep,
      press: 'reading-continue',
      to: '/onboarding/lembrete',
    },
  ])('$name também voa, e troca no meio', async ({ seed, Step, press, to }) => {
    mockReducedMotion(false);
    await seedSettings(seed);
    await render(
      <DoveTransitionProvider>
        <Step />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.press(screen.getByTestId(press));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
    await passMiddle();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(to);
    await finish(DOVE_FLIGHT_MS);
  });

  test('nome: "Continuar" grava e então voa para as metas', async () => {
    mockReducedMotion(false);
    await seedSettings();
    await render(
      <DoveTransitionProvider>
        <NameStep />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Davi');
    await fireEvent.press(screen.getByTestId('name-continue'));
    await waitFor(() => expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(1));
    expect(getCachedSettings()?.profile.name).toBe('Davi');
    expect(mockRouter.push).not.toHaveBeenCalled();
    await passMiddle();
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/metas');
    await finish(DOVE_FLIGHT_MS);
  });

  test('leitura: toque repetido durante o voo não repete o evento', async () => {
    mockReducedMotion(false);
    await seedSettings({ readingMode: 'own_bible' });
    setAnalyticsEnabled(true);
    clearRecordedEvents();
    try {
      await render(
        <DoveTransitionProvider>
          <LeituraStep />
        </DoveTransitionProvider>,
      );
      await flushReducedMotion();
      await fireEvent.press(screen.getByTestId('reading-continue'));
      await fireEvent.press(screen.getByTestId('reading-continue'));
      const selected = recordedEvents().filter((e) => e.event.name === 'reading_mode_selected');
      expect(selected).toHaveLength(1);
      await passMiddle();
      await finish(DOVE_FLIGHT_MS);
    } finally {
      setAnalyticsEnabled(false);
    }
  });

  test('o último passo NÃO voa: lembrete → Jornada é troca normal', async () => {
    mockReducedMotion(false);
    await seedSettings({ readingMode: 'in_app' });
    await render(
      <DoveTransitionProvider>
        <LembreteStep />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    await fireEvent.press(screen.getByTestId('reminder-continue'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(0);
    expect(flat(bird()).opacity).toBe(0);
  });

  test('todo "seguir" da entrada voa, menos o último', () => {
    const dir = join(__dirname, '..', 'app', 'onboarding');
    const flying = ['index.tsx', 'nome.tsx', 'metas.tsx', 'leitura.tsx', 'lembrete.tsx'].filter((file) =>
      /flyDove\(/.test(readFileSync(join(dir, file), 'utf8')),
    );
    expect(flying).toEqual(['index.tsx', 'nome.tsx', 'metas.tsx', 'leitura.tsx']);
  });

  test('com "Reduzir movimento": nenhum voo; o conteúdo esmaece em 90 ms, troca e volta', async () => {
    mockReducedMotion(true);
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    // A pomba nem é montada.
    expect(screen.queryByTestId('dove-transition', { includeHiddenElements: true })).toBeNull();

    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(0);
    expect(pendingTimings(DOVE_REDUCED_OUT_MS)).toHaveLength(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
    // Toque durante o esmaecimento também é ignorado.
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(pendingTimings(DOVE_REDUCED_OUT_MS)).toHaveLength(1);

    await finish(DOVE_REDUCED_OUT_MS);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/nome');
    await finish(DOVE_REDUCED_IN_MS);
    expect(flat(screen.getByTestId('dove-content')).opacity).toBe(1);
    expect(screen.queryByTestId('dove-transition', { includeHiddenElements: true })).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  test('"Reduzir movimento" lido pelo Reanimated também desliga o voo', async () => {
    mockReducedMotion(false);
    mockMotion.engineReduced = true;
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await flushReducedMotion();
    expect(screen.queryByTestId('dove-transition', { includeHiddenElements: true })).toBeNull();
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(pendingTimings(DOVE_FLIGHT_MS)).toHaveLength(0);
    await finish(DOVE_REDUCED_OUT_MS);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/nome');
    await finish(DOVE_REDUCED_IN_MS);
  });

  test('durante o voo a pilha entra sem deslize; depois, o voltar volta a deslizar', async () => {
    mockReducedMotion(false);
    mockStack.render = () => <FlyButton onResult={() => undefined} />;
    await render(<OnboardingLayout />);
    await flushReducedMotion();
    expect(mockStack.options).toMatchObject({ animation: 'slide_from_right' });

    await fireEvent.press(screen.getByTestId('fly'));
    expect(mockStack.options).toMatchObject({ animation: 'none' });
    await passMiddle();
    expect(mockRouter.push).toHaveBeenCalledWith('/destino');
    expect(mockStack.options).toMatchObject({ animation: 'none' });

    await finish(DOVE_FLIGHT_MS);
    expect(mockStack.options).toMatchObject({ animation: 'slide_from_right' });
  });

  test('nenhum arquivo da entrada declara fontWeight', () => {
    const files = [
      join(__dirname, '..', 'app', 'onboarding', 'nome.tsx'),
      join(__dirname, '..', 'app', 'onboarding', 'metas.tsx'),
      join(__dirname, '..', 'ui', 'entrada', 'GoalRow.tsx'),
      join(__dirname, '..', 'ui', 'motion', 'DoveTransition.tsx'),
    ];
    for (const file of files) expect(readFileSync(file, 'utf8')).not.toMatch(/fontWeight/);
  });
});
