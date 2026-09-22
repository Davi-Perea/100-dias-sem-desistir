/**
 * Feedback do fundador (2026-09-22), frente "Você e lembretes":
 *  - N1: na demonstração, a leitura diária é agendada a partir de HOJE (data
 *    real) com o texto do dia simulado; teste de 10 s em Lembretes (só __DEV__);
 *  - N2: dois avisos de ausência (1 e 7 dias depois da última abertura), sem
 *    culpa, só na campanha, com interruptor e dentro do orçamento de 64 do iOS;
 *  - V1: cartão "Comece por aqui", "Minhas metas" (/metas), "Minhas anotações";
 *  - E3: a nota de privacidade do jejum em Meu jejum.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import * as Notifications from 'expo-notifications';

import YouScreen from '@/app/(tabs)/voce';
import SettingsScreen from '@/app/ajustes';
import FastingScreen from '@/app/jejum';
import ReminderScreen from '@/app/lembrete';
import GoalsScreen from '@/app/metas';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, getCampaign, getDay, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { listMinistries } from '@/journey/ministries';
import { calendarDateInCampaignTz, rawCampaignDay } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { absenceEnabled, absencePreference, absenceScheduled, withAbsencePreference } from '@/reminders/absencePref';
import {
  ABSENCE_BODY,
  ABSENCE_DELAYS_DAYS,
  ABSENCE_REMINDER_PREFIX,
  absenceReminderPlan,
  DAILY_REMINDER_PREFIX,
  dailyBody,
  IOS_PENDING_LIMIT,
  localDateTimeForDay,
  reminderWindowDays,
  simulatedDailyReminderPlan,
  syncAbsenceReminders,
  syncDailyReminder,
} from '@/reminders/reminders';
import {
  _resetSettingsCacheForTests,
  DEFAULT_SETTINGS,
  loadSettings,
  SETTINGS_KEY,
  type Settings,
} from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
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
// Reanimated não carrega no Jest sem o módulo nativo (ver support/reanimatedVoceMock).
jest.mock('react-native-reanimated', () => jest.requireActual('./support/reanimatedVoceMock'));
jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => false }));

/** Agendamentos pendentes do "sistema", por identificador. */
const mockPending = new Map<string, { trigger: unknown; content: { title: string; body: string } }>();
const mockPermission = { granted: true };
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockPermission.granted })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockPermission.granted })),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockPending.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(
    async (req: { identifier?: string; content: { title: string; body: string }; trigger: unknown }) => {
      const id = req.identifier ?? `test-${mockPending.size}`;
      mockPending.set(id, { trigger: req.trigger, content: req.content });
      return id;
    },
  ),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockPending.keys()].map((identifier) => ({ identifier }))),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

const mockRouter = jest.requireMock('expo-router') as {
  router: { push: jest.Mock };
  useLocalSearchParams: jest.Mock;
};
// A primeira tela renderizada da suíte carrega fontes e o dataset: passa dos 5 s padrão em máquina lenta.
jest.setTimeout(20_000);

const pendingWith = (prefix: string) => [...mockPending.keys()].filter((id) => id.startsWith(prefix));
const MORNING = { hour: 7, minute: 0 };
const campaign = () => getCampaign();

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

const settingsWith = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

let announce: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockPending.clear();
  mockPermission.granted = true;
  mockRouter.router.push.mockClear();
  mockRouter.useLocalSearchParams.mockReturnValue({});
  (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  resetToBundledContent();
});

afterEach(() => {
  announce.mockRestore();
});

afterAll(() => {
  resetToBundledContent();
});

/* ----------------------------------------------------------------- N1 */

describe('N1: na demonstração, o lembrete chega a partir de hoje', () => {
  // 22/09/2026 às 10h: véspera da campanha. Pela data real, amanhã já é o Dia 1.
  const beforeStart = () => localDateTimeForDay(1, campaign(), { hour: 10, minute: 0 }, -1);

  test('dia simulado 3: hoje às 07:00 já passou; amanhã (data real) chega com o texto do Dia 4', () => {
    const now = beforeStart();
    const plan = simulatedDailyReminderPlan(MORNING, campaign(), now, 3, 5);
    expect(plan).toHaveLength(5);
    expect(plan[0].day).toBe(4);
    expect(plan[0].id).toBe(`${DAILY_REMINDER_PREFIX}4`);
    expect(plan[0].when.getDate()).toBe(now.getDate() + 1);
    expect(plan[0].when.getHours()).toBe(7);
    expect(plan[0].body).toBe(dailyBody(4));
    expect(plan.map((p) => p.day)).toEqual([4, 5, 6, 7, 8]);
  });

  test('horário ainda por vir hoje: o primeiro aviso é HOJE, com o texto do dia simulado', () => {
    const now = beforeStart();
    const plan = simulatedDailyReminderPlan({ hour: 20, minute: 0 }, campaign(), now, 3, 2);
    expect(plan[0].day).toBe(3);
    expect(plan[0].when.getDate()).toBe(now.getDate());
    expect(plan[0].when.getHours()).toBe(20);
    const summary = readingSummary(getDay(3));
    if (summary) expect(plan[0].body).toContain(summary.label);
  });

  test('não passa do último dia da campanha', () => {
    const plan = simulatedDailyReminderPlan(MORNING, campaign(), beforeStart(), 98, 10);
    expect(plan.map((p) => p.day)).toEqual([99, 100]);
  });

  test('ponta a ponta: sincronizar com dia simulado agenda no sistema; na data real, antes do Dia 1, só a partir de 23/09', async () => {
    const now = beforeStart();
    await syncDailyReminder(MORNING, campaign(), now, undefined, 3);
    const simulated = pendingWith(DAILY_REMINDER_PREFIX);
    expect(simulated.length).toBe(reminderWindowDays());
    expect(simulated[0]).toBe(`${DAILY_REMINDER_PREFIX}4`);

    await syncDailyReminder(MORNING, campaign(), now, undefined, null);
    const real = pendingWith(DAILY_REMINDER_PREFIX);
    expect(real[0]).toBe(`${DAILY_REMINDER_PREFIX}1`);
  });
});

/* ----------------------------------------------------------------- N2 */

describe('N2: avisos de ausência', () => {
  const midCampaign = (hour: number, minute = 0) => localDateTimeForDay(10, campaign(), { hour, minute });

  test('dois avisos, 1 e 7 dias depois, no horário da última abertura e com texto sem culpa', () => {
    const lastOpen = midCampaign(14, 30);
    const plan = absenceReminderPlan(true, campaign(), lastOpen);
    expect(plan.map((p) => p.id)).toEqual([`${ABSENCE_REMINDER_PREFIX}1`, `${ABSENCE_REMINDER_PREFIX}7`]);
    expect(plan[0].when.getTime()).toBe(localDateTimeForDay(11, campaign(), { hour: 14, minute: 30 }).getTime());
    expect(plan[1].when.getTime()).toBe(localDateTimeForDay(17, campaign(), { hour: 14, minute: 30 }).getTime());
    for (const item of plan) {
      expect(item.body).toBe('Sua leitura de hoje está esperando por você.');
      expect(`${item.title} ${item.body}`).not.toMatch(/esquec|atras|perd|culpa|sequência|streak/i);
    }
    expect(ABSENCE_BODY).toBe('Sua leitura de hoje está esperando por você.');
  });

  test('aberto de madrugada ou tarde da noite: o aviso cai dentro de 09:00–20:00', () => {
    expect(absenceReminderPlan(true, campaign(), midCampaign(2))[0].when.getHours()).toBe(9);
    const late = absenceReminderPlan(true, campaign(), midCampaign(23, 40))[0].when;
    expect([late.getHours(), late.getMinutes()]).toEqual([20, 0]);
  });

  test('só durante a campanha: perto do fim sai o de 7 dias; depois do fim, nenhum', () => {
    const nearEnd = localDateTimeForDay(97, campaign(), { hour: 12, minute: 0 });
    expect(absenceReminderPlan(true, campaign(), nearEnd).map((p) => p.id)).toEqual([`${ABSENCE_REMINDER_PREFIX}1`]);
    const after = localDateTimeForDay(101, campaign(), { hour: 12, minute: 0 });
    expect(absenceReminderPlan(true, campaign(), after)).toEqual([]);
    const wellBefore = localDateTimeForDay(1, campaign(), { hour: 12, minute: 0 }, -30);
    expect(absenceReminderPlan(true, campaign(), wellBefore)).toEqual([]);
  });

  test('com dia simulado, a campanha conta a partir dele (a demonstração recebe os dois)', () => {
    const wellBefore = localDateTimeForDay(1, campaign(), { hour: 12, minute: 0 }, -30);
    const plan = absenceReminderPlan(true, campaign(), wellBefore, 3);
    expect(plan.map((p) => p.day)).toEqual([4, 10]);
  });

  test('desligado não agenda; cada abertura substitui os dois (nunca acumula)', async () => {
    expect(absenceReminderPlan(false, campaign(), midCampaign(12))).toEqual([]);
    await syncAbsenceReminders(true, campaign(), midCampaign(12), undefined, null);
    await syncAbsenceReminders(true, campaign(), localDateTimeForDay(12, campaign(), { hour: 12, minute: 0 }), undefined, null);
    expect(pendingWith(ABSENCE_REMINDER_PREFIX)).toHaveLength(ABSENCE_DELAYS_DAYS.length);
    await syncAbsenceReminders(false, campaign(), midCampaign(12), undefined, null);
    expect(pendingWith(ABSENCE_REMINDER_PREFIX)).toHaveLength(0);
  });

  test('orçamento do iOS: maior ministério + leitura + altar + dois avisos + folga do teste cabem em 64', () => {
    const largest = Math.max(...listMinistries().map((m) => m.days.length));
    const window = reminderWindowDays('ios');
    expect(2 * window + largest + ABSENCE_DELAYS_DAYS.length + 1).toBeLessThanOrEqual(IOS_PENDING_LIMIT);
  });

  test('preferência: sem escolha, ligado; escolha explícita vale mais', () => {
    const off = settingsWith({});
    const daily = settingsWith({ reminder: { slot: 'morning', hour: 7, minute: 0 } });
    expect(absencePreference(off)).toBeNull();
    expect(absenceEnabled(off)).toBe(true);
    expect(absenceEnabled(daily)).toBe(true);
    expect(absenceEnabled(withAbsencePreference(daily, false))).toBe(false);
    expect(absenceEnabled(withAbsencePreference(off, false))).toBe(false);
    expect(absenceEnabled(withAbsencePreference(off, true))).toBe(true);
  });

  test('agendamento: com o lembrete diário ligado, a ausência não agenda (sem dois avisos no mesmo dia)', () => {
    expect(absenceScheduled(true, false)).toBe(true);
    expect(absenceScheduled(true, true)).toBe(false);
    expect(absenceScheduled(false, false)).toBe(false);
    expect(absenceScheduled(false, true)).toBe(false);
  });
});

describe('Lembretes: interruptor de ausência e teste de 10 s', () => {
  test('sem lembrete diário, "Avisar se eu ficar sem abrir" nasce ligado; desligar cancela e grava', async () => {
    loadCampaignOnDay(10);
    await seedSettings();
    await render(<ReminderScreen />);
    const toggle = await screen.findByTestId('absence-reminder-toggle');
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByText('Avisar se eu ficar sem abrir')).toBeTruthy();
    expect(screen.getByText(/Com o lembrete diário ligado, ele já faz esse papel./)).toBeTruthy();

    await syncAbsenceReminders(true, getCampaign(), new Date(), undefined, null);
    expect(pendingWith(ABSENCE_REMINDER_PREFIX).length).toBeGreaterThan(0);

    await fireEvent.press(toggle);
    await waitFor(() => expect(screen.getByTestId('absence-reminder-toggle').props.accessibilityState).toEqual({ checked: false }));
    expect(absencePreference(await loadSettings())).toBe(false);
    await waitFor(() => expect(pendingWith(ABSENCE_REMINDER_PREFIX)).toHaveLength(0));
  });

  test('ligar com a permissão negada mostra o motivo e volta a desligado', async () => {
    loadCampaignOnDay(10);
    mockPermission.granted = false;
    await seedSettings({ absenceReminder: false });
    await render(<ReminderScreen />);
    const toggle = await screen.findByTestId('absence-reminder-toggle');
    expect(toggle.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(toggle);
    await screen.findByTestId('absence-reminder-notice');
    expect(absencePreference(await loadSettings())).toBe(false);
  });

  test('só em __DEV__: "Mandar um lembrete de teste em 10 s" agenda para daqui a 10 segundos', async () => {
    loadCampaignOnDay(3);
    await seedSettings();
    await render(<ReminderScreen />);
    await fireEvent.press(await screen.findByText('Mandar um lembrete de teste em 10 s'));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.trigger).toMatchObject({ type: 'timeInterval', seconds: 10, repeats: false });
    expect(call.content.body).toBe(dailyBody(rawCampaignDay(new Date(), getCampaign())));
  });
});

/* ----------------------------------------------------------------- V1 */

describe('V1: Você (F7: perfil)', () => {
  test('o carrossel "Complete seu perfil" substituiu o "Comece por aqui"', async () => {
    loadCampaignOnDay(5);
    await seedSettings({ profile: { name: 'Davi', goals: [] } });
    await render(<YouScreen />);
    await screen.findByTestId('complete-profile');
    expect(screen.queryByText('Comece por aqui')).toBeNull();
    expect(screen.queryByTestId('profile-step-name')).toBeNull();
    expect(screen.getByTestId('profile-step-goals')).toBeTruthy();
    expect(screen.getByTestId('profile-step-reminder')).toBeTruthy();
  });

  test('Ajustes: "Minhas metas" mostra a contagem e abre /metas; "Minhas anotações" abre /anotacoes', async () => {
    loadCampaignOnDay(5);
    await seedSettings({ profile: { name: null, goals: ['jejuar', 'orar-todo-dia'] } });
    await render(<SettingsScreen />);
    const goals = await screen.findByTestId('row-goals');
    expect(goals.props.accessibilityLabel).toBe('Minhas metas, 2 metas');
    await fireEvent.press(goals);
    expect(mockRouter.router.push).toHaveBeenLastCalledWith('/metas');
    await fireEvent.press(screen.getByTestId('row-notes'));
    expect(mockRouter.router.push).toHaveBeenLastCalledWith('/anotacoes');
  });
});

describe('V1: /metas', () => {
  test('marca e desmarca metas, e grava o nome limpo em settings.profile', async () => {
    await seedSettings({ profile: { name: null, goals: [] } });
    await render(<GoalsScreen />);
    const box = await screen.findByTestId('goal-jejuar');
    expect(box.props.accessibilityState).toEqual({ checked: false });

    await fireEvent.press(box);
    await waitFor(async () => expect((await loadSettings()).profile.goals).toEqual(['jejuar']));
    await fireEvent.press(screen.getByTestId('goal-biblia-inteira'));
    await waitFor(async () => expect((await loadSettings()).profile.goals).toEqual(['jejuar', 'biblia-inteira']));
    await fireEvent.press(screen.getByTestId('goal-jejuar'));
    await waitFor(async () => expect((await loadSettings()).profile.goals).toEqual(['biblia-inteira']));

    await fireEvent.changeText(screen.getByTestId('profile-name-input'), '  Davi  ');
    await waitFor(async () => expect((await loadSettings()).profile.name).toBe('Davi'));
    await fireEvent.changeText(screen.getByTestId('profile-name-input'), '   ');
    await waitFor(async () => expect((await loadSettings()).profile.name).toBeNull());
  });

  test('?secao=nome abre com o campo do nome em foco', async () => {
    mockRouter.useLocalSearchParams.mockReturnValue({ secao: 'nome' });
    await seedSettings({ profile: { name: 'Ana', goals: [] } });
    await render(<GoalsScreen />);
    const input = await screen.findByTestId('profile-name-input');
    expect(input.props.autoFocus).toBe(true);
    expect(input.props.value).toBe('Ana');
  });
});

/* ----------------------------------------------------------------- E3 */

describe('E3: nota do jejum em Meu jejum', () => {
  test('o registro do jejum fica só neste aparelho', async () => {
    await seedSettings();
    await render(<FastingScreen />);
    expect(
      await screen.findByText('O registro do jejum fica só neste aparelho. Não vai para grupo, líder, relatório ou servidor.'),
    ).toBeTruthy();
  });
});
