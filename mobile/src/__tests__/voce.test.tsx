import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import YouScreen from '@/app/(tabs)/voce';
import AppearanceScreen from '@/app/aparencia';
import HelpScreen from '@/app/ajuda';
import FastingScreen from '@/app/jejum';
import ReminderScreen from '@/app/lembrete';
import { _resetFastingCacheForTests, setFastingKept } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';

// Reanimated não carrega no Jest sem o módulo nativo (ver support/reanimatedVoceMock).
jest.mock('react-native-reanimated', () => jest.requireActual('./support/reanimatedVoceMock'));
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

// O agendamento real é coberto em reminders.test.ts; aqui só importa que a
// tela peça a permissão no gesto e desfaça a preferência quando o sistema recusa.
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

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const reminders = jest.requireMock('@/reminders/reminders') as { scheduleDailyReminder: jest.Mock };
const CAMPAIGN = BUNDLED_CONTENT.campaign.id;

/** Conteúdo REAL da igreja, com "hoje" no dia pedido. */
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
  loadCampaignOnDay(17);
});

afterAll(() => {
  resetToBundledContent();
});

describe('D1 · Você', () => {
  test('título "Você" e os números reais e locais', async () => {
    await seedSettings({ fastingEnabled: true });
    for (const day of [1, 2, 5]) await setDayCompleted(CAMPAIGN, day, true);
    await saveReflection(CAMPAIGN, 2, 'só para mim');
    await setFastingKept(CAMPAIGN, 2, true);
    _resetCompletionsCacheForTests();

    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('progress-block')).toBeTruthy());

    expect(screen.getByTestId('voce-title').props.children).toBe('Você');
    // Sem conta na V1, a identidade (avatar e "Sem conta conectada") saiu.
    expect(screen.queryByText('Sua jornada')).toBeNull();
    expect(screen.queryByText('Sem conta conectada')).toBeNull();
    // MEU PROGRESSO: os dias lidos de verdade, nunca uma estimativa.
    expect(screen.getByText('Meu progresso')).toBeTruthy();
    expect(screen.getByTestId('progress-count').props.children).toBe(3);
    expect(screen.getByLabelText('3 de 100 dias lidos')).toBeTruthy();
    expect(screen.getByTestId('row-reflections').props.accessibilityLabel).toBe('Minhas reflexões, 1');
    expect(screen.getByTestId('row-fasting').props.accessibilityLabel).toBe('Meu jejum, 1 dia');
  });

  test('três grupos com cap marcado como cabeçalho, e sem "Meu grupo"', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-reminder')).toBeTruthy());

    const headers = screen.getAllByRole('header').map((node) => node.props.children);
    expect(headers).toEqual(expect.arrayContaining(['Meu progresso', 'Minha jornada', 'Preferências', 'Sobre']));
    expect(headers.indexOf('Meu progresso')).toBeLessThan(headers.indexOf('Minha jornada'));
    expect(headers.indexOf('Minha jornada')).toBeLessThan(headers.indexOf('Preferências'));
    expect(headers.indexOf('Preferências')).toBeLessThan(headers.indexOf('Sobre'));

    // REGRAS 11: sem servidor, o grupo não aparece com número inventado.
    expect(screen.queryByTestId('row-group')).toBeNull();
    expect(screen.queryByText(/pessoas/)).toBeNull();

    expect(screen.getByTestId('row-fasting').props.accessibilityLabel).toBe('Meu jejum, Desligado');
    expect(screen.getByTestId('row-reminder').props.accessibilityLabel).toBe('Lembretes, Desligado');

    const routes: [string, string][] = [
      ['row-reflections', '/reflexoes'],
      ['row-fasting', '/jejum'],
      ['row-reminder', '/lembrete'],
      ['row-ministry', '/ministerio'],
      ['row-proposito', '/proposito'],
      ['row-privacy', '/privacidade'],
      ['row-help', '/ajuda'],
    ];
    for (const [id, route] of routes) {
      await fireEvent.press(screen.getByTestId(id));
      expect(mockRouter.push).toHaveBeenLastCalledWith(route);
    }
    // Sem e-mail de suporte preenchido, a linha não promete contato (1.5).
    expect(within(screen.getByTestId('row-help')).getByText('Ajuda')).toBeTruthy();
  });

  test('o lembrete escolhido aparece em HH:MM', async () => {
    await seedSettings({ reminder: { slot: 'custom', hour: 7, minute: 0 } });
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-reminder')).toBeTruthy());
    expect(screen.getByTestId('row-reminder').props.accessibilityLabel).toBe('Lembretes, 07:00');
  });

  test('antes da campanha a régua não marca hoje nem lido, e não há linha "Altar de hoje"', async () => {
    loadCampaignOnDay(0);
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('progress-block')).toBeTruthy());
    expect(screen.getByTestId('progress-count').props.children).toBe(0);
    expect(screen.queryByTestId('row-altar-today')).toBeNull();
  });
});

describe('telas que saem de Você', () => {
  test('Ajuda nunca mostra o valor técnico dos direitos', async () => {
    setBibleProvider(devBibleProvider);
    await render(<HelpScreen />);
    expect(screen.getByText('Ajuda')).toBeTruthy();
    expect(screen.queryByText('Ajuda e contato')).toBeNull();
    expect(screen.queryByText(/pending_authorization|dev_fixture|partially_authorized/)).toBeNull();
    expect(screen.getByTestId('help-rights').props.children.join('')).toMatch(
      /Situação dos direitos: aguardando autorização escrita da igreja\./,
    );
    // C-07: sem autorização a faixa de aviso é obrigatória.
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('Meu jejum liga e desliga a participação, e o cap não fala o "·"', async () => {
    await seedSettings();
    await render(<FastingScreen />);
    await waitFor(() => expect(screen.getByTestId('fasting-enabled')).toBeTruthy());
    expect(screen.getByLabelText('Meu jejum, só você vê')).toBeTruthy();
    expect(screen.getByTestId('fasting-enabled').props.accessibilityState.checked).toBe(false);
    await fireEvent.press(screen.getByTestId('fasting-enabled'));
    await waitFor(async () => expect((await loadSettings()).fastingEnabled).toBe(true));
    expect(screen.getByText('0 dias cumpridos')).toBeTruthy();
  });

  test('Tamanho da letra segue a escala do leitor (B3) dentro de 14–30 e não tem opção de estatísticas', async () => {
    setBibleProvider(licensed);
    await seedSettings({ readerFontSize: 29 });
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('font-bigger')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('font-bigger'));
    await waitFor(async () => expect((await loadSettings()).readerFontSize).toBe(30));
    await waitFor(() => expect(screen.getByTestId('font-bigger').props.accessibilityState.disabled).toBe(true));
    // D-4: o app não tem SDK de análise e não envia nada; a opção saiu da interface.
    expect(screen.queryByTestId('analytics-toggle')).toBeNull();
    expect(screen.queryByText(/dados de uso/)).toBeNull();
  });

  test('Tamanho da letra: o 18 antigo chega como 19 (mesma escala do leitor)', async () => {
    setBibleProvider(licensed);
    await seedSettings({ readerFontSize: 18 });
    expect((await loadSettings()).readerFontSize).toBe(19);
    await render(<AppearanceScreen />);
    await waitFor(() => expect(screen.getByTestId('font-sample')).toBeTruthy());
    expect(StyleSheet.flatten(screen.getByTestId('font-sample').props.style).fontSize).toBe(19);
  });

  test('Lembrete de leitura: recusa do sistema volta para "Sem lembrete" e mostra o motivo', async () => {
    reminders.scheduleDailyReminder.mockResolvedValueOnce({ ok: false, reason: 'Permissão de notificações negada.' });
    await seedSettings();
    await render(<ReminderScreen />);
    await waitFor(() => expect(screen.getByTestId('reminder-0700')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reminder-0700'));
    await waitFor(() => expect(screen.getByText('Permissão de notificações negada.')).toBeTruthy());
    expect((await loadSettings()).reminder.slot).toBe('none');
  });
});
