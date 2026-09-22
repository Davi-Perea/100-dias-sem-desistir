import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { clearRecordedEvents, recordedEvents, setAnalyticsEnabled } from '@/analytics/analytics';
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
import { DOVE_FLIGHT_MS, DOVE_SWAP_AT, DoveTransitionProvider } from '@/ui/motion/DoveTransition';
import { ONBOARDING_STEP, ONBOARDING_STEPS } from '@/ui/OnboardingStep';
import { MIN_TOUCH, palettes } from '@/ui/theme';

/**
 * Entrada v2 (feedback do Davi, 2026-09-22, itens E1–E5): texto novo da F1, sem
 * a nota da leitura, sem o passo do jejum, passos de nome e metas, e a pomba
 * atravessando a tela em duas transições, nunca com "Reduzir movimento".
 */

// Reanimated/worklets: mock global em jest.setup.js.

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: Object.assign(() => null, { Screen: () => null }),
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
    expect(stored.profile).toEqual({ name: 'Davi Lima', goals: [] });
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
    expect(DEFAULT_SETTINGS.profile).toEqual({ name: null, goals: [] });
    expect(normalizeSettings({}).profile).toEqual({ name: null, goals: [] });
  });

  test('descarta metas desconhecidas e repetidas; limpa e corta o nome', () => {
    const long = 'x'.repeat(PROFILE_NAME_MAX + 10);
    expect(
      normalizeSettings({ profile: { name: '  Ana   Clara ', goals: ['jejuar', 'nada', 'jejuar', 3, 'conhecer-mais'] } })
        .profile,
    ).toEqual({ name: 'Ana Clara', goals: ['jejuar', 'conhecer-mais'] });
    expect(normalizeSettings({ profile: { name: long, goals: 'jejuar' } }).profile).toEqual({
      name: 'x'.repeat(PROFILE_NAME_MAX),
      goals: [],
    });
    expect(normalizeSettings({ profile: { name: '   ' } }).profile.name).toBeNull();
    expect(normalizeSettings({ profile: 'lixo' }).profile).toEqual({ name: null, goals: [] });
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

describe('E5 · a pomba atravessa a tela e troca o passo quando passa', () => {
  test('"Começar": a pomba voa, a tela troca no meio do voo e a camada some no fim', async () => {
    mockReducedMotion(false);
    jest.useFakeTimers();
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    const layer = screen.getByTestId('dove-transition', { includeHiddenElements: true });
    // Decorativa: fora do leitor de tela, e segura os toques durante o voo.
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(layer.props.pointerEvents).toBe('auto');
    expect(mockRouter.push).not.toHaveBeenCalled();

    // Segundo toque durante o voo não empilha outra tela.
    await fireEvent.press(screen.getByTestId('onboarding-start'));

    await act(async () => {
      jest.advanceTimersByTime(DOVE_FLIGHT_MS * DOVE_SWAP_AT);
    });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/nome');
    expect(screen.getByTestId('dove-transition', { includeHiddenElements: true })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DOVE_FLIGHT_MS);
    });
    expect(screen.queryByTestId('dove-transition', { includeHiddenElements: true })).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  test('a pomba sai preta sobre o amarelo fixo, mesmo no tema escuro', async () => {
    mockScheme.value = 'dark';
    mockReducedMotion(false);
    jest.useFakeTimers();
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    const sources: unknown[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      const n = node as { props?: { testID?: string; source?: unknown }; children?: unknown };
      if (n.props?.source !== undefined) sources.push(n.props.source);
      walk(n.children);
    };
    const findLayer = (node: unknown): unknown => {
      if (!node || typeof node !== 'object') return null;
      if (Array.isArray(node)) return node.map(findLayer).find(Boolean) ?? null;
      const n = node as { props?: { testID?: string }; children?: unknown };
      return n.props?.testID === 'dove-transition' ? n : findLayer(n.children);
    };
    walk(findLayer(screen.toJSON()));
    expect(sources).toEqual([
      require('../../assets/brand/dove-black.png'),
      require('../../assets/brand/dove-white.png'),
    ]);
    await act(async () => {
      jest.advanceTimersByTime(DOVE_FLIGHT_MS);
    });
  });

  test('metas → leitura também voa', async () => {
    mockReducedMotion(false);
    await seedSettings();
    jest.useFakeTimers();
    await render(
      <DoveTransitionProvider>
        <GoalsStep />
      </DoveTransitionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await fireEvent.press(screen.getByTestId('goals-skip'));
    expect(screen.getByTestId('dove-transition', { includeHiddenElements: true })).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(DOVE_FLIGHT_MS);
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/leitura');
  });

  test('com "Reduzir movimento": nenhuma pomba, a troca é imediata', async () => {
    mockReducedMotion(true);
    await render(
      <DoveTransitionProvider>
        <WelcomeScreen />
      </DoveTransitionProvider>,
    );
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(screen.queryByTestId('dove-transition', { includeHiddenElements: true })).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/nome');
  });

  test('só duas transições voam (começar → nome, metas → leitura), não todas', () => {
    const dir = join(__dirname, '..', 'app', 'onboarding');
    const flying = ['index.tsx', 'nome.tsx', 'metas.tsx', 'leitura.tsx', 'lembrete.tsx'].filter((file) =>
      /flyDove\(/.test(readFileSync(join(dir, file), 'utf8')),
    );
    expect(flying).toEqual(['index.tsx', 'metas.tsx']);
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
