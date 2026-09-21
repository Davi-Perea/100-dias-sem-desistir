import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import JejumStep from '@/app/onboarding/jejum';
import WelcomeScreen from '@/app/onboarding/index';
import LeituraStep from '@/app/onboarding/leitura';
import LembreteStep from '@/app/onboarding/lembrete';
import ReflectionsScreen from '@/app/reflexoes';
import { _setCloudConfigForTests } from '@/cloud/config';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests, REFLECTIONS_PREFIX, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, getCachedSettings, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { ErrorState } from '@/ui/entrada/States';
import { _setBoldTextForTests, BRAND_YELLOW, faces, palettes } from '@/ui/theme';

import { resetViewport } from './support/viewport';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

const mockStatusBar = jest.fn((_props: { style: string }) => null);
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style: string }) => mockStatusBar(props),
}));

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

const mockScheme = { value: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme.value,
}));

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

/** Coloca a campanha ativa no dia informado (0 = começa amanhã). */
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
  mockScheme.value = 'light';
  _setBoldTextForTests(false);
  _setCloudConfigForTests(null);
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  mockReminders.scheduleDailyReminder.mockResolvedValue({ ok: true });
  mockReminders.cancelDailyReminder.mockResolvedValue(undefined);
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  loadCampaignOnDay(17);
});

/* -------------------------------------------------------------------- F1 */

describe('F1 · boas-vindas', () => {
  test('cópia exata, título como cabeçalho sem a quebra no nome acessível', async () => {
    await render(<WelcomeScreen />);
    const title = screen.getByTestId('welcome-title');
    expect(title.props.children).toBe('100 dias\nsem desistir');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLabel).toBe('100 dias sem desistir');
    expect(flat(title)).toMatchObject({ fontFamily: faces.sg800, fontSize: 50, lineHeight: 50, letterSpacing: -2.4 });
    expect(
      screen.getByText(
        'A igreja inteira lê a mesma coisa, no mesmo dia. Você não é obrigado a nada — pode só ler, pode só orar, pode voltar depois de faltar.',
      ),
    ).toBeTruthy();
    expect(flat(screen.getByTestId('welcome-body'))).toMatchObject({ fontFamily: faces.ss400, fontSize: 20, lineHeight: 32 });
  });

  test.each(['light', 'dark'] as const)('superfície fixa: nada muda com o tema %s', async (scheme) => {
    mockScheme.value = scheme;
    await render(<WelcomeScreen />);
    // Fundo amarelo, título e parágrafo com hex fixo.
    expect(flat(screen.getByTestId('welcome-title')).color).toBe('#111111');
    expect(flat(screen.getByTestId('welcome-body')).color).toBe('#3F3D38');
    const backgrounds: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      const n = node as { props?: { style?: unknown }; children?: unknown };
      const bg = (StyleSheet.flatten(n.props?.style as never) as { backgroundColor?: string } | undefined)?.backgroundColor;
      if (bg) backgrounds.push(bg);
      walk(n.children);
    };
    walk(screen.toJSON());
    expect(backgrounds[0]).toBe(BRAND_YELLOW);
    // Primário tinta com rótulo branco nos dois temas.
    const start = screen.getByTestId('onboarding-start');
    expect(flat(start).backgroundColor).toBe(palettes.light.text);
    // Pomba preta, 112×72, sempre: branca sobre o amarelo sumiria.
    const dove = screen.getByLabelText('Lagoinha');
    expect(dove.props.source).toBe(require('../../assets/brand/dove-black.png'));
    expect(flat(dove)).toMatchObject({ width: 112, height: 72 });
    // Barra de status escura sobre o amarelo, inclusive no tema escuro.
    expect(mockStatusBar).toHaveBeenCalledWith({ style: 'dark' });
  });

  test('"Começar" vai direto ao passo 1, sem muro de login', async () => {
    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/leitura');
  });

  test('"Já tenho perfil" só aparece com nuvem (sem ela, /conta só diria "indisponível")', async () => {
    await render(<WelcomeScreen />);
    expect(screen.queryByText('Já tenho perfil')).toBeNull();
  });

  test('com nuvem, "Já tenho perfil" abre /conta', async () => {
    _setCloudConfigForTests({ url: 'https://x.supabase.co', anonKey: 'anon' });
    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByTestId('onboarding-sign-in'));
    expect(mockRouter.push).toHaveBeenCalledWith('/conta');
  });
});

/* -------------------------------------------------------------------- F2 */

describe('F2 · passo 1, como você vai ler', () => {
  test('voltar, passo, título 800 34/38 e as três opções exatas', async () => {
    await seedSettings();
    await render(<LeituraStep />);
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeTruthy();
    expect(screen.getByText('Passo 1 de 3')).toBeTruthy();
    const title = screen.getByTestId('onboarding-step-title');
    expect(title.props.children).toBe('Como você pretende ler na maioria dos dias?');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ fontFamily: faces.sg800, fontSize: 34, lineHeight: 38 });
    for (const label of ['Ler no app', 'Usar a minha Bíblia', 'Vou alternar']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    }
    expect(screen.getByText('Ler na Bíblia impressa não é pior. Dá para mudar depois quando quiser.')).toBeTruthy();
  });

  test('"Continuar" desabilitado até escolher; a escolha fica gravada', async () => {
    await seedSettings();
    await render(<LeituraStep />);
    const cont = screen.getByTestId('reading-continue');
    expect(cont.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(cont);
    expect(mockRouter.push).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('onboarding-mode-own_bible'));
    await waitFor(() => expect(getCachedSettings()?.readingMode).toBe('own_bible'));
    expect(getCachedSettings()?.lastUsedReadingMode).toBe('own_bible');
    await waitFor(() => expect(screen.getByTestId('reading-continue').props.accessibilityState.disabled).toBe(false));
    // Estado por forma, não só cor: a opção marcada tem borda de 2,5.
    expect(flat(screen.getByTestId('onboarding-mode-own_bible')).borderWidth).toBe(2.5);
    expect(flat(screen.getByTestId('onboarding-mode-in_app')).borderWidth).toBe(1.5);
    await fireEvent.press(screen.getByTestId('reading-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/jejum');
  });

  test('voltar sem pilha leva às boas-vindas', async () => {
    await seedSettings();
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<LeituraStep />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
  });
});

describe('F2 · passo 2, jejum no mesmo molde', () => {
  test('só a decisão de participar; nada de perguntar do que jejua', async () => {
    await seedSettings();
    await render(<JejumStep />);
    expect(screen.getByText('Passo 2 de 3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('fasting-yes'));
    await waitFor(() => expect(getCachedSettings()?.fastingEnabled).toBe(true));
    expect(screen.queryByText(/alimento|duração|motivo|método/i)).toBeNull();
    await fireEvent.press(screen.getByTestId('fasting-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/lembrete');
  });
});

describe('F2 · passo 3, lembrete', () => {
  test('não pede permissão ao abrir; só ao escolher um horário', async () => {
    await seedSettings();
    await render(<LembreteStep />);
    expect(screen.getByText('Passo 3 de 3')).toBeTruthy();
    expect(mockReminders.scheduleDailyReminder).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('onboarding-reminder-0700'));
    await waitFor(() => expect(mockReminders.scheduleDailyReminder).toHaveBeenCalledWith(7, 0));
    await waitFor(() => expect(getCachedSettings()?.reminder.slot).toBe('morning'));
  });

  test('recusa volta a "Sem lembrete" e mostra o motivo', async () => {
    await seedSettings();
    mockReminders.scheduleDailyReminder.mockResolvedValue({ ok: false, reason: 'Permissão de notificações negada.' });
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-1900'));
    await waitFor(() => expect(screen.getByTestId('reminder-notice')).toBeTruthy());
    expect(getCachedSettings()?.reminder.slot).toBe('none');
    expect(screen.getByRole('radio', { name: 'Sem lembrete' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText(/Permissão de notificações negada\. Você pode seguir sem lembrete/)).toBeTruthy();
    // TELAS D3: depois da recusa o botão diz o que vai acontecer (R4-4).
    expect(screen.getByText('Continuar sem lembrete')).toBeTruthy();
  });

  test('"Sem lembrete" cancela sem pedir permissão', async () => {
    await seedSettings({ reminder: { slot: 'morning', hour: 7, minute: 0 } });
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-none'));
    await waitFor(() => expect(mockReminders.cancelDailyReminder).toHaveBeenCalled());
    expect(mockReminders.scheduleDailyReminder).not.toHaveBeenCalled();
    await waitFor(() => expect(getCachedSettings()?.reminder.slot).toBe('none'));
  });

  test('"Continuar" termina o onboarding (o que "Tudo pronto" fazia) e abre a casa', async () => {
    await seedSettings({ readingMode: 'in_app', fastingEnabled: true });
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('reminder-continue'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored).toMatchObject({ onboardingCompleted: true, readingMode: 'in_app', fastingEnabled: true });
    // Continuar não pede permissão: ela só nasce do gesto de escolher.
    expect(mockReminders.scheduleDailyReminder).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------- F3 / F6 */

describe('F6 · Minhas reflexões vazia, e F3 no carregando', () => {
  test('esqueleto em vez de roda girando enquanto carrega', async () => {
    await seedSettings({ onboardingCompleted: true });
    // A leitura das reflexões fica pendurada: o carregando precisa aparecer.
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation();
    getItem.mockImplementation((key: string) =>
      key.startsWith(REFLECTIONS_PREFIX) ? new Promise(() => {}) : original?.(key),
    );
    try {
      await render(<ReflectionsScreen />);
      expect(screen.getByTestId('list-skeleton')).toBeTruthy();
      expect(screen.getByLabelText('Carregando')).toBeTruthy();
      expect(screen.queryByTestId('empty-state')).toBeNull();
      // Título e voltar continuam: o esqueleto é só do miolo.
      expect(screen.getByTestId('reflections-title')).toBeTruthy();
    } finally {
      if (original) getItem.mockImplementation(original);
    }
  });

  test('molde: título 800 32/36, cadeado, cópia exata, "Escrever a de hoje"', async () => {
    await seedSettings({ onboardingCompleted: true });
    await render(<ReflectionsScreen />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
    const title = screen.getByTestId('reflections-title');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ fontFamily: faces.sg800, fontSize: 32, lineHeight: 36 });
    const empty = screen.getByTestId('empty-title');
    expect(empty.props.children).toBe('Nada escrito ainda');
    expect(empty.props.accessibilityRole).toBe('header');
    expect(flat(empty)).toMatchObject({ fontFamily: faces.sg700, fontSize: 24, lineHeight: 29 });
    expect(
      screen.getByText('Suas reflexões aparecem aqui depois que você escrever a primeira. Só você vê.'),
    ).toBeTruthy();
    const write = screen.getByTestId('reflections-write-today');
    // Botão contornado.
    expect(flat(write)).toMatchObject({ borderWidth: 2 });
    await fireEvent.press(write);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reflexao/[day]', params: { day: '17' } });
  });

  test('antes da campanha não existe "hoje": fica a ação de voltar', async () => {
    loadCampaignOnDay(0);
    await seedSettings({ onboardingCompleted: true });
    await render(<ReflectionsScreen />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
    expect(screen.queryByTestId('reflections-write-today')).toBeNull();
    expect(screen.getByTestId('reflections-empty-back')).toBeTruthy();
  });

  test('com reflexões, a lista aparece e o vazio some', async () => {
    await seedSettings({ onboardingCompleted: true });
    await saveReflection(devDataset().campaign.id, 3, 'texto meu');
    _resetReflectionsCacheForTests();
    await render(<ReflectionsScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-3')).toBeTruthy());
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });
});

/* -------------------------------------------------------------------- F5 */

describe('F5 · erro', () => {
  test('cópia exata, uma saída sempre e nenhum código técnico', async () => {
    const retry = jest.fn();
    const own = jest.fn();
    await render(
      <ErrorState onRetry={retry} secondary={{ label: 'Ler na minha Bíblia', onPress: own, testID: 'error-own' }} />,
    );
    const title = screen.getByTestId('error-title');
    expect(title.props.children).toBe('Não deu para carregar');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ fontFamily: faces.sg700, fontSize: 26, lineHeight: 31 });
    expect(
      screen.getByText('A leitura de hoje não veio. Sua jornada e as suas reflexões estão salvas — nada foi perdido.'),
    ).toBeTruthy();
    expect(flat(screen.getByTestId('error-circle', { includeHiddenElements: true }))).toMatchObject({
      width: 56,
      height: 56,
      backgroundColor: palettes.light.surfaceMuted,
    });
    expect(screen.queryByText(/pending_authorization|Error|undefined/)).toBeNull();
    await fireEvent.press(screen.getByTestId('error-retry'));
    await fireEvent.press(screen.getByTestId('error-own'));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(own).toHaveBeenCalledTimes(1);
  });
});
