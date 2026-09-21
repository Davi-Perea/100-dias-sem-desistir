/**
 * Correções do grupo Você (revisão de telas R2-*, decisão D-4 e D-5).
 * Cada teste guarda um achado; o id está no nome.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import YouScreen from '@/app/(tabs)/voce';
import AppearanceScreen from '@/app/aparencia';
import HelpScreen from '@/app/ajuda';
import AccountScreen from '@/app/conta';
import FastingScreen from '@/app/jejum';
import ReminderScreen from '@/app/lembrete';
import MinistryScreen from '@/app/ministerio';
import { BUNDLED_CONTENT, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { listMinistries } from '@/journey/ministries';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { ToggleRow } from '@/ui/voce/ToggleRow';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
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

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/reminders/reminders', () => ({
  syncMinistryReminders: jest.fn().mockResolvedValue({ ok: true }),
  syncAltarReminders: jest.fn().mockResolvedValue({ ok: true }),
  scheduleDailyReminder: jest.fn().mockResolvedValue({ ok: true }),
  cancelDailyReminder: jest.fn().mockResolvedValue(undefined),
  scheduleTestNotification: jest.fn().mockResolvedValue({ ok: true }),
  listScheduledReminders: jest.fn().mockResolvedValue([]),
  isReminderSupported: () => true,
  formatTime: (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  SLOT_TIMES: { morning: { hour: 7, minute: 0 }, afternoon: { hour: 13, minute: 0 }, evening: { hour: 20, minute: 0 } },
  SLOT_LABELS: { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', custom: 'Horário escolhido', none: 'Sem lembrete' },
}));

// Nuvem controlada pelo teste: configurada ou não, com ou sem sessão, e o papel.
const mockCloud: {
  configured: boolean;
  email: string | null;
  role: 'none' | 'member' | 'leader' | 'admin';
} = { configured: false, email: null, role: 'none' };

jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => mockCloud.configured }));
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: mockCloud.configured,
    loading: false,
    session: mockCloud.email ? { user: { email: mockCloud.email } } : null,
    signedIn: !!mockCloud.email,
    role: mockCloud.role,
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));
jest.mock('@/cloud/auth', () => ({
  isValidEmail: (value: string) => /.+@.+\..+/.test(value),
  OTP_LENGTH: 6,
  requestOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue(undefined),
  secondsUntilResendAllowed: () => 0,
  signOut: jest.fn().mockResolvedValue(undefined),
}));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const reminders = jest.requireMock('@/reminders/reminders') as {
  scheduleDailyReminder: jest.Mock;
  syncMinistryReminders: jest.Mock;
};
const auth = jest.requireMock('@/cloud/auth') as { signOut: jest.Mock };
const CAMPAIGN = BUNDLED_CONTENT.campaign.id;

function loadCampaignOnDay(day: number) {
  const base = BUNDLED_CONTENT;
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('O dataset de teste não passou no validador.');
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }));
  _resetSettingsCacheForTests();
}

let announce: jest.SpyInstance;

/** Provedor licenciado de teste: só com ele existe a seção de tamanho do texto. */
const licensed: BibleTextProvider = {
  getMetadata: () => ({ ...devBibleProvider.getMetadata(), id: 'licenciada-teste', isDevPlaceholder: false }),
  getPassage: devBibleProvider.getPassage,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  // Gate 1 aberto: o padrão é o provedor sem texto (o leitor é um guia).
  setBibleProvider(devBibleProvider);
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  reminders.scheduleDailyReminder.mockClear();
  reminders.syncMinistryReminders.mockClear();
  auth.signOut.mockClear();
  mockParams.current = {};
  mockCloud.configured = false;
  mockCloud.email = null;
  mockCloud.role = 'none';
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  loadCampaignOnDay(17);
});

afterEach(() => {
  announce.mockRestore();
});

afterAll(() => {
  resetToBundledContent();
});

describe('D1 · Você', () => {
  test('R2-10 (revisto em 2026-09-21): sem "Altar de hoje", o Você não mostra escala nem a faixa C-07', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('progress-block')).toBeTruthy());
    expect(screen.queryByTestId('row-altar-today')).toBeNull();
    expect(screen.queryByTestId('content-banner')).toBeNull();
  });

  test('R2-6 (revisto em 2026-09-21): nem com papel de líder aparecem Liderança ou Conta', async () => {
    mockCloud.configured = true;
    mockCloud.email = 'lider@exemplo.com';
    mockCloud.role = 'admin';
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-help')).toBeTruthy());
    expect(screen.queryByTestId('row-leader-tools')).toBeNull();
    expect(screen.queryByTestId('row-admin')).toBeNull();
    expect(screen.queryByTestId('row-account')).toBeNull();
    expect(screen.queryByText('Liderança')).toBeNull();
  });

  test('R2-8 e R2-7: a régua não repete a contagem, e o número não tem tracking inventado', async () => {
    await seedSettings();
    for (const day of [1, 2, 3]) await setDayCompleted(CAMPAIGN, day, true);
    _resetCompletionsCacheForTests();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('progress-count').props.children).toBe(3));

    expect(screen.getByLabelText('3 de 100 dias lidos')).toBeTruthy();
    // A régua só desenha depois de medir a largura.
    await fireEvent(screen.getByTestId('progress-ruler-slot'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 36, x: 0, y: 0 } },
    });
    await waitFor(() => expect(screen.getByLabelText('Régua dos 100 dias, dia oficial 17.')).toBeTruthy());
    expect(screen.queryByLabelText(/3 lidos/)).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('progress-count').props.style).letterSpacing).toBe(0);
  });

  test('R2-3: "Leitura" abre a tela com "Como eu leio"; D-4: sem linha de estatísticas', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-reading')).toBeTruthy());
    expect(screen.getByTestId('row-reading').props.accessibilityLabel).toBe('Leitura, Guia no app');
    await fireEvent.press(screen.getByTestId('row-reading'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/aparencia', params: { secao: 'leitura' } });
    expect(screen.queryByText(/dados de uso/)).toBeNull();
  });

  test('D-5: a legenda do aviso do altar (agora em Lembretes) não promete o ministério que conduz', async () => {
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-reminder-toggle')).toBeTruthy());
    expect(screen.queryByText(/quem conduz/)).toBeNull();
  });
});

describe('Tamanho da letra / Como eu leio', () => {
  test('R2-4: os três rótulos exatos do F2, sem descrição que prometa texto ou marcação', async () => {
    await seedSettings();
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('mode-in_app')).toBeTruthy());
    expect(within(screen.getByTestId('mode-in_app')).getByText('Seguir o guia no app')).toBeTruthy();
    expect(within(screen.getByTestId('mode-own_bible')).getByText('Usar a minha Bíblia')).toBeTruthy();
    expect(within(screen.getByTestId('mode-both')).getByText('Vou alternar')).toBeTruthy();
    expect(screen.queryByText(/tela de hoje|marca o dia|Depende do dia/)).toBeNull();
  });

  test('R2-3: aberta por "Tamanho da letra", o tamanho vem primeiro', async () => {
    setBibleProvider(licensed);
    await seedSettings();
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('font-sample')).toBeTruthy());
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers[0]).toBe('Tamanho da letra');
    expect(headers.indexOf('Tamanho do texto de leitura')).toBeLessThan(headers.indexOf('Como eu leio'));
  });

  test('R2-3: aberta por "Leitura", o título e a primeira seção são "Como eu leio"', async () => {
    setBibleProvider(licensed);
    mockParams.current = { secao: 'leitura' };
    await seedSettings();
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('font-sample')).toBeTruthy());
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers[0]).toBe('Como eu leio');
    // Sem cabeçalho repetido: o título já diz "Como eu leio".
    expect(headers.filter((h) => h === 'Como eu leio')).toHaveLength(1);
    expect(headers[1]).toBe('Tamanho do texto de leitura');
    await fireEvent.press(screen.getByTestId('mode-own_bible'));
    await waitFor(async () => expect((await loadSettings()).readingMode).toBe('own_bible'));
  });

  test('Gate 1 aberto (guia): sem seção de tamanho, que não teria efeito em tela nenhuma', async () => {
    mockParams.current = { secao: 'leitura' };
    await seedSettings();
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('mode-in_app')).toBeTruthy());
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers[0]).toBe('Como eu leio');
    expect(headers).toContain('Do seu aparelho');
    expect(headers).not.toContain('Tamanho do texto de leitura');
    expect(screen.queryByTestId('font-sample')).toBeNull();
    expect(screen.queryByTestId('font-smaller')).toBeNull();
    expect(screen.queryByTestId('font-bigger')).toBeNull();
    expect(screen.queryByText(/também cresce/)).toBeNull();
  });

  test('Gate 1 aberto: mesmo sem secao o título nunca é "Tamanho da letra"', async () => {
    await seedSettings();
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('mode-in_app')).toBeTruthy());
    expect(screen.queryByText('Tamanho da letra')).toBeNull();
    expect(screen.getAllByRole('header')[0].props.children).toBe('Como eu leio');
  });
});

describe('Conta', () => {
  test('R2-9: sem nuvem, um só "Voltar" e nada de "build" ou "servidor"', async () => {
    await render(<AccountScreen />);
    expect(screen.getByText('Conta indisponível nesta versão')).toBeTruthy();
    expect(screen.getAllByText('Voltar')).toHaveLength(1);
    expect(screen.queryByText(/build|servidor/)).toBeNull();
  });

  test('R2-9/R2-2: o título diz o que a tela faz, e "Seu e-mail" não é cabeçalho', async () => {
    mockCloud.configured = true;
    await render(<AccountScreen />);
    expect(screen.getByText('Criar ou entrar na conta')).toBeTruthy();
    expect(screen.queryByText('Conta e privacidade')).toBeNull();
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers).not.toContain('Seu e-mail');

    await fireEvent.changeText(screen.getByTestId('email-input'), 'voce@exemplo.com');
    await fireEvent.press(screen.getByTestId('send-code'));
    await waitFor(() => expect(screen.getByText('Confirmar código')).toBeTruthy());
  });

  test('R2-2: conectado, mostra o e-mail, "Sair" funciona e diz com honestidade o que falta', async () => {
    mockCloud.configured = true;
    mockCloud.email = 'voce@exemplo.com';
    await render(<AccountScreen />);
    expect(screen.getByTestId('account-signed-in')).toBeTruthy();
    expect(screen.getByText('Conectado como voce@exemplo.com.')).toBeTruthy();
    expect(screen.getByText(/Excluir a conta e exportar os dados ainda não estão disponíveis/)).toBeTruthy();
    expect(screen.queryByTestId('email-input')).toBeNull();
    await fireEvent.press(screen.getByTestId('sign-out'));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });
});

describe('Recusas de permissão anunciadas no iOS (R2-5)', () => {
  test('ToggleRow anuncia o motivo com announceForAccessibility', async () => {
    const { rerender } = await render(
      <ToggleRow label="Aviso" checked={false} onToggle={() => {}} notice={null} noticeTestID="n" />,
    );
    expect(announce).not.toHaveBeenCalled();
    await rerender(
      <ToggleRow label="Aviso" checked={false} onToggle={() => {}} notice="Permissão negada." noticeTestID="n" />,
    );
    expect(announce).toHaveBeenCalledWith('Permissão negada.');
  });

  test('Meu ministério: o motivo fica colado ao ministério tocado e é anunciado', async () => {
    reminders.syncMinistryReminders.mockResolvedValueOnce({ ok: false, reason: 'Permissão de notificações negada.' });
    await seedSettings();
    await render(<MinistryScreen />);
    const index = listMinistries().findIndex((m) => m.name === 'Kids');
    await waitFor(() => expect(screen.getByTestId(`ministry-${index}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`ministry-${index}`));
    await waitFor(() => expect(screen.getByTestId('ministry-notice')).toBeTruthy());
    expect(announce).toHaveBeenCalledWith('Permissão de notificações negada.');

    // Logo depois da linha tocada, na mesma lista.
    const ids = screen
      .getAllByTestId(/^ministry-(\d+|notice)$/)
      .map((node) => node.props.testID as string);
    expect(ids[ids.indexOf(`ministry-${index}`) + 1]).toBe('ministry-notice');
  });

  test('Lembrete: a recusa é anunciada', async () => {
    reminders.scheduleDailyReminder.mockResolvedValueOnce({ ok: false, reason: 'Permissão de notificações negada.' });
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('reminder-morning')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reminder-morning'));
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Permissão de notificações negada.'));
  });
});

describe('Lembrete: ferramentas técnicas só em __DEV__ (R2-13)', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const original = g.__DEV__;
  afterEach(() => {
    g.__DEV__ = original;
  });

  test('em release não há contagem de agendamentos nem teste de 5 s', async () => {
    g.__DEV__ = false;
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('reminder-morning')).toBeTruthy());
    expect(screen.queryByTestId('reminder-dev-tools')).toBeNull();
    expect(screen.queryByText(/agendamento|Testar agora/)).toBeNull();
  });

  test('em desenvolvimento as ferramentas continuam', async () => {
    g.__DEV__ = true;
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('reminder-dev-tools')).toBeTruthy());
  });
});

describe('Meu jejum e Ajuda', () => {
  test('R2-8: o cap "Meu jejum · só você vê" não é um segundo cabeçalho', async () => {
    await seedSettings();
    await render(<FastingScreen />);
    await waitFor(() => expect(screen.getByTestId('fasting-enabled')).toBeTruthy());
    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers.filter((h) => typeof h === 'string' && h.startsWith('Meu jejum'))).toEqual(['Meu jejum']);
    expect(screen.getByLabelText('Meu jejum, só você vê')).toBeTruthy();
  });

  test('R2-11: a Ajuda não fala de "insight" nem de "grupo"', async () => {
    setBibleProvider(devBibleProvider);
    await render(<HelpScreen />);
    expect(screen.queryByText(/insight|grupo/i)).toBeNull();
    expect(screen.getByText(/a reflexão privada nunca vira publicação/)).toBeTruthy();
  });

  test('Ajuda: o aviso de copyright só aparece com tradução licenciada', async () => {
    setBibleProvider(devBibleProvider);
    const first = await render(<HelpScreen />);
    expect(screen.queryByTestId('help-copyright')).toBeNull();
    expect(screen.queryByText(/DEV FIXTURE/)).toBeNull();
    first.unmount();
    setBibleProvider(licensed);
    await render(<HelpScreen />);
    expect(screen.getByTestId('help-copyright')).toBeTruthy();
  });
});
