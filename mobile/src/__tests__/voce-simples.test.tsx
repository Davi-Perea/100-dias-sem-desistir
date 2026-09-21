/**
 * Você simples (pedido do fundador, 2026-09-21): só o que tem destaque fica à
 * vista; o resto mora dentro de cada linha. Privacidade nova, contato da Ajuda
 * e o aviso do altar dentro de Lembretes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, Linking } from 'react-native';

import YouScreen from '@/app/(tabs)/voce';
import HelpScreen from '@/app/ajuda';
import ReminderScreen from '@/app/lembrete';
import PrivacyScreen from '@/app/privacidade';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, completedCount, loadCompletions, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests, loadReflections, reflectionCount, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
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

// Contato controlado pelo teste: nulo (padrão do repositório) ou preenchido.
const mockContact: { email: string | null; url: string | null } = { email: null, url: null };
jest.mock('@/config/contato', () => ({
  get SUPPORT_EMAIL() {
    return mockContact.email;
  },
  get PRIVACY_URL() {
    return mockContact.url;
  },
}));

const mockCloud = { configured: false };
jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => mockCloud.configured }));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const reminders = jest.requireMock('@/reminders/reminders') as { syncAltarReminders: jest.Mock };
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
let openURL: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  reminders.syncAltarReminders.mockClear();
  mockContact.email = null;
  mockContact.url = null;
  mockCloud.configured = false;
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  loadCampaignOnDay(17);
});

afterEach(() => {
  announce.mockRestore();
  openURL.mockRestore();
  alert.mockRestore();
});

afterAll(() => {
  resetToBundledContent();
});

describe('Você: só o que tem destaque', () => {
  test('progresso e oito linhas com chevron; nada de conta, altar ou aviso solto', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('progress-block')).toBeTruthy());

    const rows = screen.getAllByTestId(/^row-/).map((node) => node.props.testID as string);
    expect(rows).toEqual([
      'row-reflections',
      'row-ministry',
      'row-fasting',
      'row-reminder',
      'row-reading',
      'row-proposito',
      'row-privacy',
      'row-help',
    ]);
    expect(screen.queryByTestId('altar-reminder-toggle')).toBeNull();
    expect(screen.queryByText(/Conta|Liderança|Altar de hoje/)).toBeNull();
  });
});

describe('Privacidade', () => {
  test('diz o que fica no aparelho e que nada é enviado; sem URL, sem link', async () => {
    await render(<PrivacyScreen />);
    expect(screen.getByText('Privacidade')).toBeTruthy();
    expect(screen.getByText(/ficam guardados só neste aparelho/)).toBeTruthy();
    expect(screen.getByTestId('privacy-no-send')).toBeTruthy();
    expect(screen.queryByTestId('privacy-policy-link')).toBeNull();
  });

  test('com a nuvem configurada, a frase "não envia" some em vez de mentir', async () => {
    mockCloud.configured = true;
    await render(<PrivacyScreen />);
    expect(screen.queryByTestId('privacy-no-send')).toBeNull();
  });

  test('com URL preenchida, o link abre a política', async () => {
    mockContact.url = 'https://exemplo.org/privacidade';
    await render(<PrivacyScreen />);
    await fireEvent.press(screen.getByTestId('privacy-policy-link'));
    expect(openURL).toHaveBeenCalledWith('https://exemplo.org/privacidade');
  });

  test('apagar pede confirmação; cancelar não apaga, confirmar apaga tudo', async () => {
    await seedSettings();
    await setDayCompleted(CAMPAIGN, 1, true);
    await saveReflection(CAMPAIGN, 1, 'só para mim');
    await render(<PrivacyScreen />);

    await fireEvent.press(screen.getByTestId('privacy-wipe'));
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[];
    expect(buttons.map((b) => b.style)).toEqual(['cancel', 'destructive']);
    // Nada foi apagado só por abrir a confirmação.
    expect((await loadSettings()).onboardingCompleted).toBe(true);

    buttons[1].onPress?.();
    await waitFor(async () => expect((await loadSettings()).onboardingCompleted).toBe(false));
    expect(completedCount(await loadCompletions(CAMPAIGN))).toBe(0);
    expect(reflectionCount(await loadReflections(CAMPAIGN))).toBe(0);
  });
});

describe('Ajuda e contato', () => {
  test('sem e-mail preenchido, a seção de contato não aparece', async () => {
    setBibleProvider(devBibleProvider);
    await render(<HelpScreen />);
    // O título não promete um contato que não existe (1.5).
    expect(screen.getByText('Ajuda')).toBeTruthy();
    expect(screen.queryByText('Ajuda e contato')).toBeNull();
    expect(screen.queryByTestId('help-contact')).toBeNull();
    expect(screen.queryByText('Fale com a gente')).toBeNull();
  });

  test('com e-mail, "Fale com a gente" abre o mailto', async () => {
    mockContact.email = 'contato@exemplo.org';
    setBibleProvider(devBibleProvider);
    await render(<HelpScreen />);
    expect(screen.getByText('Ajuda e contato')).toBeTruthy();
    expect(screen.getByText('Fale com a gente')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('help-contact'));
    expect(openURL).toHaveBeenCalledWith('mailto:contato@exemplo.org');
  });
});

describe('Lembretes: o aviso do altar mora aqui', () => {
  test('marcar pede a permissão no gesto e liga a preferência', async () => {
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-reminder-toggle')).toBeTruthy());
    expect(screen.getByText('Lembretes')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));
    await waitFor(async () => expect((await loadSettings()).altarReminder).toBe(true));
    expect(reminders.syncAltarReminders).toHaveBeenCalledWith(true, expect.anything(), expect.any(Date), {
      requestPermission: true,
    });
  });

  test('recusa do sistema: volta a desligado e o motivo aparece colado à caixa', async () => {
    reminders.syncAltarReminders.mockResolvedValueOnce({ ok: false, reason: 'Permissão de notificações negada.' });
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-reminder-toggle')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));
    await waitFor(() => expect(screen.getByTestId('altar-reminder-notice')).toBeTruthy());
    expect((await loadSettings()).altarReminder).toBe(false);
  });
});

describe('Lembretes: desligar o aviso do altar', () => {
  test('desligar só grava a preferência; o hook do layout cancela os agendamentos', async () => {
    await seedSettings({ altarReminder: true });
    await render(<ReminderScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('altar-reminder-toggle').props.accessibilityState.checked).toBe(true),
    );
    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));
    await waitFor(async () => expect((await loadSettings()).altarReminder).toBe(false));
    expect(reminders.syncAltarReminders).not.toHaveBeenCalled();
  });
});
