import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { clearRecordedEvents, recordedEvents, setAnalyticsEnabled } from '@/analytics/analytics';
import OnboardingLayout from '@/app/onboarding/_layout';
import LembreteStep from '@/app/onboarding/lembrete';
import ReflectionsScreen from '@/app/reflexoes';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, getCachedSettings, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { StateView } from '@/ui/components';
import { ErrorBoundaryScreen } from '@/ui/entrada/ErrorBoundaryScreen';
import { EmptyState, ErrorState } from '@/ui/entrada/States';
import { _setBoldTextForTests, MOTION_MS, spacing } from '@/ui/theme';

import { resetViewport } from './support/viewport';

/**
 * Correções do grupo G5 (entrada e fundação) sobre as revisões R4-* , R3-12 e
 * PER-06. Os testes de BackBar em fonte grande (R4-1) moram no
 * dynamicType.test.tsx; os do cadeado e do esqueleto, no fundacao.test.tsx.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockStackOptions: { value: Record<string, unknown> | null } = { value: null };
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
      mockStackOptions.value = screenOptions;
      return null;
    },
    { Screen: () => null },
  ),
}));

const mockHideSplash = jest.fn(() => Promise.resolve());
jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideSplash(),
  preventAutoHideAsync: () => Promise.resolve(),
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

const mockReminders = {
  scheduleDailyReminder: jest.fn(),
  cancelDailyReminder: jest.fn(),
};
jest.mock('@/reminders/reminders', () => {
  const actual = jest.requireActual('@/reminders/reminders');
  return {
    ...actual,
    scheduleDailyReminder: (...args: unknown[]) => mockReminders.scheduleDailyReminder(...args),
    cancelDailyReminder: (...args: unknown[]) => mockReminders.cancelDailyReminder(...args),
  };
});

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'light',
}));

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

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
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: false, ...patch }));
  _resetSettingsCacheForTests();
  await loadSettings();
}

beforeEach(async () => {
  resetViewport();
  _setBoldTextForTests(false);
  jest.clearAllMocks();
  mockStackOptions.value = null;
  mockRouter.canGoBack.mockReturnValue(true);
  mockReminders.scheduleDailyReminder.mockResolvedValue({ ok: true });
  mockReminders.cancelDailyReminder.mockResolvedValue(undefined);
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  loadCampaignOnDay(17);
});

/* ------------------------------------------------------------ R4-6 · F5 */

describe('R4-6 · exceção de render cai no F5, não em tela branca', () => {
  test('o layout raiz exporta o ErrorBoundary do Expo Router', () => {
    const source = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(source).toMatch(/export const ErrorBoundary = ErrorBoundaryScreen;/);
  });

  test('molde do F5, uma saída sempre, e nenhum texto técnico do erro', async () => {
    const retry = jest.fn(() => Promise.resolve());
    const error = new TypeError("Cannot read properties of undefined (reading 'day')");
    await render(<ErrorBoundaryScreen error={error} retry={retry} />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByTestId('error-title').props.children).toBe('Não deu para carregar');
    expect(screen.getByTestId('error-title').props.accessibilityRole).toBe('header');
    const shown = JSON.stringify(screen.toJSON());
    expect(shown).not.toMatch(/Cannot read|TypeError|undefined/);
    // A frase não afirma "a leitura de hoje": a falha pode ser de qualquer tela.
    expect(shown).not.toMatch(/leitura de hoje/);

    await fireEvent.press(screen.getByTestId('error-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('"Ir para a Jornada" troca para a casa e limpa o erro', async () => {
    const retry = jest.fn(() => Promise.resolve());
    await render(<ErrorBoundaryScreen error={new Error('x')} retry={retry} />);
    await fireEvent.press(screen.getByTestId('error-boundary-home'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('esconde a splash: uma falha antes dela sair não prende a pessoa', async () => {
    await render(<ErrorBoundaryScreen error={new Error('x')} retry={() => Promise.resolve()} />);
    expect(mockHideSplash).toHaveBeenCalled();
  });
});

/* ---------------------------------------------------- R4-2 · carregando */

describe('R4-2 · o carregando genérico é esqueleto, não roda girando', () => {
  test('StateView kind="loading" desenha esqueleto e só a legenda fala', async () => {
    await render(<StateView kind="loading" />);
    expect(screen.getByTestId('state-loading')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    // A roda girando é um host "ActivityIndicator"; nenhum nó dela na árvore.
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/ActivityIndicator|"animating"/);
  });
});

/* ------------------------------------------------- R4-15 · molde único */

describe('R4-15 · um molde só de vazio e de erro', () => {
  test('StateView e EmptyState/ErrorState saem com a mesma tipografia', async () => {
    const empty = await render(<StateView kind="empty" title="Nada aqui" message="Frase." />);
    const viewEmptyTitle = flat(screen.getByText('Nada aqui'));
    const viewEmptyMessage = flat(screen.getByText('Frase.'));
    await empty.unmount();

    const f6 = await render(<EmptyState icon="book" title="Nada aqui" message="Frase." />);
    expect(flat(screen.getByTestId('empty-title'))).toEqual(viewEmptyTitle);
    expect(flat(screen.getByTestId('empty-message'))).toEqual(viewEmptyMessage);
    await f6.unmount();

    const error = await render(<StateView kind="error" title="Não deu para carregar" message="Frase." />);
    const viewErrorTitle = flat(screen.getByText('Não deu para carregar'));
    await error.unmount();

    await render(<ErrorState onRetry={() => {}} message="Frase." />);
    expect(flat(screen.getByTestId('error-title'))).toEqual(viewErrorTitle);
  });

  test('StateView não mudou de aparência: padding nos quatro lados, piso 240', async () => {
    await render(<StateView kind="empty" title="Nada aqui" />);
    expect(flat(screen.getByTestId('state-view'))).toMatchObject({ flexGrow: 1, minHeight: 240, padding: spacing.xl });
  });
});

/* ------------------------------------------------------ R4-9 · cadeado */

describe('R4-9 · o F6 usa o cadeado do desenho', () => {
  test('Minhas reflexões vazia mostra o LockCircle do A4', async () => {
    await seedSettings({ onboardingCompleted: true });
    await render(<ReflectionsScreen />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
    expect(screen.getByTestId('lock-circle', { includeHiddenElements: true })).toBeTruthy();
  });

  test('EmptyState aceita um glifo pronto no lugar do ícone', async () => {
    const { View } = jest.requireActual('react-native');
    await render(<EmptyState glyph={<View testID="glyph" />} title="T" message="M" />);
    expect(screen.getByTestId('glyph', { includeHiddenElements: true })).toBeTruthy();
  });
});

/* ------------------------------------------------ F2 · passo do lembrete */

describe('F2 · passo 3, lembrete', () => {
  test('R4-5: cada chip diz o horário que grava (21:00 grava 21h)', async () => {
    await seedSettings();
    await render(<LembreteStep />);
    expect(screen.getByText('21:00')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-reminder-2100'));
    await waitFor(() => expect(mockReminders.scheduleDailyReminder).toHaveBeenCalledWith(21, 0));
  });

  test('R4-13: recusa de permissão vira UMA frase, sem se contradizer', async () => {
    await seedSettings();
    mockReminders.scheduleDailyReminder.mockResolvedValue({
      ok: false,
      reason: 'Permissão de notificações negada. Você pode ativar nos ajustes do sistema.',
    });
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-0700'));
    await waitFor(() => expect(screen.getByTestId('reminder-notice')).toBeTruthy());
    expect(screen.getByTestId('reminder-notice').props.children).toBe(
      'Permissão de notificações negada. Você pode seguir sem lembrete e ativar depois em Você.',
    );
  });

  test('R4-13: agendamento que estoura não some em silêncio', async () => {
    await seedSettings();
    mockReminders.scheduleDailyReminder.mockRejectedValue(new Error('quota'));
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-0700'));
    await waitFor(() => expect(screen.getByTestId('reminder-notice')).toBeTruthy());
    expect(screen.getByTestId('reminder-notice').props.children).toMatch(/^Não deu para agendar o lembrete agora\./);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/quota/);
    expect(getCachedSettings()?.reminder.slot).toBe('none');
    expect(screen.getByText('Continuar sem lembrete')).toBeTruthy();
  });

  test('R4-4: depois da recusa, um horário aceito devolve o "Continuar"', async () => {
    await seedSettings();
    mockReminders.scheduleDailyReminder.mockResolvedValueOnce({ ok: false, reason: 'Permissão de notificações negada.' });
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-0700'));
    await waitFor(() => expect(screen.getByText('Continuar sem lembrete')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('onboarding-reminder-1900'));
    await waitFor(() => expect(getCachedSettings()?.reminder.slot).toBe('evening'));
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(screen.queryByText('Continuar sem lembrete')).toBeNull();
  });

  test('PER-06: o evento de fim de onboarding não carrega jejum', async () => {
    await seedSettings({ readingMode: 'in_app', fastingEnabled: true });
    setAnalyticsEnabled(true);
    clearRecordedEvents();
    try {
      await render(<LembreteStep />);
      await fireEvent.press(screen.getByTestId('reminder-continue'));
      await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
      const [recorded] = recordedEvents();
      expect(recorded.event).toEqual({ name: 'onboarding_completed', readingMode: 'in_app', reminder: 'none' });
      expect(JSON.stringify(recordedEvents())).not.toMatch(/fasting|jejum/i);
    } finally {
      setAnalyticsEnabled(false);
      clearRecordedEvents();
    }
  });

  test('PER-06: o tipo do evento não tem campo de jejum', () => {
    const source = readFileSync(join(__dirname, '..', 'analytics', 'analytics.ts'), 'utf8');
    expect(source).not.toMatch(/fasting/);
  });
});

/* ---------------------------------------------- R4-12 · movimento reduzido */

describe('R4-12 · a transição do onboarding respeita "Reduzir movimento"', () => {
  test('sem a preferência: desliza em MOTION_MS', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<OnboardingLayout />);
    await waitFor(() => expect(mockStackOptions.value).toMatchObject({ animation: 'slide_from_right' }));
    expect(mockStackOptions.value).toMatchObject({ animationDuration: MOTION_MS });
  });

  test('com a preferência: nenhuma animação', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<OnboardingLayout />);
    await waitFor(() => expect(mockStackOptions.value).toMatchObject({ animation: 'none' }));
  });
});

/* ------------------------------------------------ R4-11 · splash e D-4 */

describe('layout raiz', () => {
  const source = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

  test('R4-11: a splash só sai com a rota do portão já decidida (ou por tempo)', () => {
    expect(source).toMatch(/fontsReady && \(routeSettled \|\| splashTimedOut\)/);
  });

  test('D-4: em release o buffer de analytics nunca liga', () => {
    expect(source).toMatch(/setAnalyticsEnabled\(__DEV__ && settings\.analyticsEnabled\)/);
  });
});
