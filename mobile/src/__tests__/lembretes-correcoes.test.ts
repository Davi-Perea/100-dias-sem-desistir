import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

import { getCampaign, resetToBundledContent } from '@/journey/datasetSource';
import { daysForMinistry, listMinistries } from '@/journey/ministries';
import {
  ALTAR_REMINDER_PREFIX,
  ALTAR_TIME,
  altarReminderPlan,
  ANDROID_CHANNEL_ID,
  campaignDateTimeForDay,
  cancelDailyReminder,
  DAILY_REMINDER_ID,
  COVERAGE_REMINDER_ID,
  DAILY_REMINDER_PREFIX,
  dailyReminderPlan,
  IOS_PENDING_LIMIT,
  localDateTimeForDay,
  MINISTRY_REMINDER_PREFIX,
  ministryReminderPlan,
  reminderWindowDays,
  scheduleDailyReminder,
  syncAltarReminders,
  syncDailyReminder,
  syncMinistryReminders,
} from '@/reminders/reminders';
import { useReminderSync } from '@/reminders/useReminderSync';
import { DEFAULT_SETTINGS, type Settings } from '@/settings/settingsStore';

/**
 * Correções do grupo G6b (lembretes): LEM-01, LEM-02 (com a decisão D-5),
 * LEM-03, LEM-04 e DIA-03. Tudo sobre o dataset REAL dos 100 Dias.
 */

type Scheduled = { identifier: string; trigger: { type: string; date?: Date } };

// Agenda falsa do sistema: guarda o que foi agendado para os testes contarem.
const mockPending = new Map<string, Scheduled>();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockPending.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (req: Scheduled) => {
    mockPending.set(req.identifier, req);
    return req.identifier;
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockPending.values()]),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2, SECRET: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

let mockSettings: Settings = { ...DEFAULT_SETTINGS };
jest.mock('@/settings/settingsStore', () => {
  const actual = jest.requireActual('@/settings/settingsStore');
  return { ...actual, useSettings: () => mockSettings };
});

const notifications = jest.requireMock('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
  deleteNotificationChannelAsync: jest.Mock;
};

const campaign = () => getCampaign();
const MORNING = { hour: 7, minute: 0 } as const;
const BIGGEST_MINISTRY = 'Intercessão/Bálsamo';
const originalOS = Platform.OS;

function setPlatform(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

function pendingWith(prefix: string): Scheduled[] {
  return [...mockPending.values()].filter((n) => n.identifier.startsWith(prefix));
}

beforeEach(() => {
  resetToBundledContent();
  mockPending.clear();
  mockSettings = { ...DEFAULT_SETTINGS };
  setPlatform('ios');
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
  notifications.scheduleNotificationAsync.mockClear();
  notifications.cancelScheduledNotificationAsync.mockClear();
  notifications.setNotificationChannelAsync.mockClear();
  notifications.deleteNotificationChannelAsync.mockClear();
});

afterAll(() => setPlatform(originalOS));

/* ------------------------------------------------------------------ LEM-01 */

describe('LEM-01: a leitura diária vive só dentro da campanha', () => {
  test('agendado hoje (21/09): nada em 21 nem 22/09; o primeiro aviso é o Dia 1 (23/09) às 07:00', () => {
    const now = localDateTimeForDay(1, campaign(), { hour: 10, minute: 0 }, -2);
    const plan = dailyReminderPlan(MORNING, campaign(), now);

    expect(plan[0].day).toBe(1);
    expect(plan[0].when.getTime()).toBe(localDateTimeForDay(1, campaign(), MORNING).getTime());
    // A janela + o aviso de retomada que a tapa no fim (auditoria de 23/09).
    expect(plan).toHaveLength(reminderWindowDays() + 1);
    expect(plan.filter((p) => p.id === COVERAGE_REMINDER_ID)).toHaveLength(1);
    for (const item of plan.filter((p) => p.id !== COVERAGE_REMINDER_ID)) {
      expect(item.id).toBe(`${DAILY_REMINDER_PREFIX}${item.day}`);
      expect(item.when.getHours()).toBe(7);
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  test('perto do fim, nunca passa do Dia 100', () => {
    const now = localDateTimeForDay(95, campaign(), { hour: 8, minute: 0 });
    const plan = dailyReminderPlan(MORNING, campaign(), now);
    // 07:00 do Dia 95 já passou às 08:00: restam 96..100.
    expect(plan.map((p) => p.day)).toEqual([96, 97, 98, 99, 100]);
  });

  test('com a campanha encerrada, não sobra nenhum aviso', () => {
    const now = localDateTimeForDay(100, campaign(), { hour: 8, minute: 0 });
    expect(dailyReminderPlan(MORNING, campaign(), now)).toEqual([]);
    expect(dailyReminderPlan(MORNING, campaign(), localDateTimeForDay(100, campaign(), MORNING, 1))).toEqual([]);
  });

  test('sem horário escolhido, nada', () => {
    expect(dailyReminderPlan(null, campaign(), localDateTimeForDay(10, campaign(), MORNING))).toEqual([]);
  });

  test('scheduleDailyReminder agenda gatilhos DATE (nunca DAILY) e apaga o antigo gatilho sem fim', async () => {
    mockPending.set(DAILY_REMINDER_ID, { identifier: DAILY_REMINDER_ID, trigger: { type: 'daily' } });
    const now = localDateTimeForDay(10, campaign(), { hour: 6, minute: 0 });

    const result = await scheduleDailyReminder(7, 0, campaign(), now);

    expect(result.ok).toBe(true);
    expect(mockPending.has(DAILY_REMINDER_ID)).toBe(false);
    const daily = pendingWith(DAILY_REMINDER_PREFIX);
    // A janela + a retomada: o aviso de retomada mora na mesma família, para ser
    // cancelado e reagendado junto com ela a cada abertura do app.
    expect(daily).toHaveLength(reminderWindowDays() + 1);
    for (const n of daily) expect(n.trigger.type).toBe('date');
    for (const call of notifications.scheduleNotificationAsync.mock.calls) {
      expect(call[0].trigger.type).not.toBe('daily');
    }
    // Gesto: pode pedir a permissão (aqui já concedida, então só lê).
    expect(notifications.getPermissionsAsync).toHaveBeenCalled();
  });

  test('cancelDailyReminder apaga a janela inteira e o gatilho antigo', async () => {
    mockPending.set(DAILY_REMINDER_ID, { identifier: DAILY_REMINDER_ID, trigger: { type: 'daily' } });
    await syncDailyReminder(MORNING, campaign(), localDateTimeForDay(10, campaign(), { hour: 6, minute: 0 }));
    expect(pendingWith(DAILY_REMINDER_PREFIX).length).toBeGreaterThan(0);

    await cancelDailyReminder();

    expect(pendingWith(DAILY_REMINDER_PREFIX)).toHaveLength(0);
    expect(mockPending.has(DAILY_REMINDER_ID)).toBe(false);
  });
});

/* -------------------------------------------------- LEM-01 + LEM-04: orçamento */

describe('LEM-01/LEM-04: orçamento de 64 agendamentos do iOS', () => {
  test('a janela do iOS reserva o maior ministério inteiro e divide o resto entre leitura e altar', () => {
    const largest = Math.max(...listMinistries().map((m) => m.days.length));
    expect(largest).toBe(daysForMinistry(BIGGEST_MINISTRY).length);
    const window = reminderWindowDays('ios');
    expect(2 * window + largest).toBeLessThanOrEqual(IOS_PENDING_LIMIT - 1);
    // Mais que os 14 dias de antes (LEM-04).
    expect(window).toBeGreaterThan(14);
  });

  test('pior caso real no iOS (véspera da campanha, maior ministério, leitura e altar ligados) cabe em 64', async () => {
    const now = localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);
    await syncMinistryReminders(BIGGEST_MINISTRY, daysForMinistry(BIGGEST_MINISTRY), campaign(), now);
    await syncDailyReminder(MORNING, campaign(), now);
    await syncAltarReminders(true, campaign(), now);

    expect(pendingWith(MINISTRY_REMINDER_PREFIX)).toHaveLength(24);
    expect(pendingWith(DAILY_REMINDER_PREFIX)).toHaveLength(reminderWindowDays('ios') + 1);
    expect(pendingWith(ALTAR_REMINDER_PREFIX)).toHaveLength(reminderWindowDays('ios'));
    expect(mockPending.size).toBeLessThan(IOS_PENDING_LIMIT);
  });

  test('no Android, sem o teto de 64, a janela cobre a campanha inteira', () => {
    const window = reminderWindowDays('android');
    const now = campaignDateTimeForDay(1, campaign(), { hour: 8, minute: 0 });
    expect(altarReminderPlan(campaign(), now, window)).toHaveLength(100);
    expect(dailyReminderPlan(MORNING, campaign(), localDateTimeForDay(1, campaign(), { hour: 6, minute: 0 }), window)).toHaveLength(100);
  });
});

/* ------------------------------------------------------------ LEM-02 / D-5 */

describe('LEM-02 (D-5): tela de bloqueio neutra', () => {
  function allTexts(): string[] {
    const texts: string[] = [];
    const eve = localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);
    for (const m of listMinistries()) {
      for (const item of ministryReminderPlan(m.name, m.days, campaign(), eve)) texts.push(item.title, item.body);
    }
    for (let day = 1; day <= 100; day += 1) {
      const now = campaignDateTimeForDay(day, campaign(), { hour: 8, minute: 0 });
      for (const item of altarReminderPlan(campaign(), now, 1)) texts.push(item.title, item.body);
    }
    for (const item of dailyReminderPlan(MORNING, campaign(), eve, 100)) texts.push(item.title, item.body);
    return texts;
  }

  test('nenhum título ou corpo traz nome de ministério', () => {
    const names = listMinistries().map((m) => m.name);
    expect(names.length).toBeGreaterThan(1);
    const texts = allTexts();
    expect(texts.length).toBeGreaterThan(300);
    for (const text of texts) {
      for (const name of names) expect(text).not.toContain(name);
    }
  });

  test('nenhum título ou corpo usa a palavra "altar"', () => {
    for (const text of allTexts()) expect(text.toLowerCase()).not.toContain('altar');
  });

  test('títulos neutros: "Lembrete para hoje" (altar) e "Lembrete para amanhã" (véspera)', () => {
    const now = localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);
    expect(altarReminderPlan(campaign(), now)[0].title).toBe('Lembrete para hoje');
    expect(ministryReminderPlan('Kids', daysForMinistry('Kids'), campaign(), now)[0].title).toBe('Lembrete para amanhã');
  });

  test('Android: canal com lockscreenVisibility PRIVATE, id novo, e o canal antigo é apagado', async () => {
    setPlatform('android');
    await syncAltarReminders(true, campaign(), campaignDateTimeForDay(10, campaign(), { hour: 8, minute: 0 }));

    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      ANDROID_CHANNEL_ID,
      expect.objectContaining({ lockscreenVisibility: 2 }),
    );
    expect(ANDROID_CHANNEL_ID).not.toBe('reading-reminders');
    expect(notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('reading-reminders');
    for (const call of notifications.scheduleNotificationAsync.mock.calls) {
      expect(call[0].trigger.channelId).toBe(ANDROID_CHANNEL_ID);
    }
  });
});

/* ------------------------------------------------------------------ DIA-03 */

describe('DIA-03: altar às 12h00 de São Paulo, em qualquer fuso do aparelho', () => {
  test('o instante é 15h00 UTC (12h00 em −03:00), calculado sem o fuso da máquina', () => {
    expect(campaign().utc_offset_minutes).toBe(-180);
    for (const day of [1, 5, 45, 70, 100]) {
      const when = campaignDateTimeForDay(day, campaign(), ALTAR_TIME);
      const [y, m, d] = when.toISOString().slice(0, 10).split('-').map(Number);
      expect(when.getTime()).toBe(Date.UTC(y, m - 1, d, 15, 0));
    }
    // Dia 1 = 23/09/2026 às 12:00 de SP.
    expect(campaignDateTimeForDay(1, campaign(), ALTAR_TIME).toISOString()).toBe('2026-09-23T15:00:00.000Z');
  });

  test('o plano do altar usa o instante de São Paulo', () => {
    const now = campaignDateTimeForDay(20, campaign(), { hour: 9, minute: 0 });
    for (const item of altarReminderPlan(campaign(), now)) {
      expect(item.when.toISOString().slice(11, 16)).toBe('15:00');
    }
  });
});

/* ------------------------------------------------------------------ LEM-03 */

describe('LEM-03: vésperas voltam quando o app volta ao primeiro plano', () => {
  test('permissão ligada nos Ajustes e volta ao app em memória: as vésperas são agendadas sem reiniciar', async () => {
    const listeners: ((state: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      listeners.push(cb);
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);

    mockSettings = { ...DEFAULT_SETTINGS, onboardingCompleted: true, ministry: 'Kids' };
    // Arranque sem permissão: nada é agendado e o diálogo nunca é aberto.
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });

    // O relógio real está antes das vésperas do Kids (dias 30 e 80) até dezembro de 2026.
    const kidsDays = daysForMinistry('Kids');
    const futureEves = ministryReminderPlan('Kids', kidsDays, campaign(), new Date()).length;

    await renderHook(() => useReminderSync());
    await waitFor(() => expect(notifications.getPermissionsAsync).toHaveBeenCalled());
    expect(pendingWith(MINISTRY_REMINDER_PREFIX)).toHaveLength(0);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    // A pessoa liga as notificações nos Ajustes e volta.
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    await act(async () => {
      for (const l of listeners) l('active');
    });

    await waitFor(() => expect(pendingWith(MINISTRY_REMINDER_PREFIX)).toHaveLength(futureEves));
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

/* ---------------------------------------------------- agendamento inexato */

describe('agendamento continua inexato', () => {
  test('nenhuma configuração declara SCHEDULE_EXACT_ALARM', () => {
    const config = readFileSync(join(__dirname, '..', '..', 'app.config.ts'), 'utf8');
    expect(config).not.toMatch(/SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM/);
  });
});
