import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCampaign, resetToBundledContent } from '@/journey/datasetSource';
import { daysForMinistry } from '@/journey/ministries';
import {
  ALTAR_REMINDER_PREFIX,
  ALTAR_TIME,
  altarReminderPlan,
  localDateTimeForDay,
  MINISTRY_EVE_TIME,
  MINISTRY_REMINDER_PREFIX,
  ministryReminderPlan,
  syncAltarReminders,
  syncMinistryReminders,
} from '@/reminders/reminders';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

/**
 * Planos de lembrete (funções puras) sobre o dataset REAL dos 100 Dias.
 *
 * "Agora" é sempre construído com `localDateTimeForDay`, nunca com string ISO
 * fixa, para que o teste não dependa do fuso da máquina. Limite conhecido: o
 * plano do altar escolhe o primeiro dia pelo fuso da CAMPANHA (`rawCampaignDay`)
 * e os horários pelo fuso do APARELHO; para horários de manhã os dois coincidem
 * em qualquer máquina entre UTC-16 e UTC+7 (o Brasil inteiro incluído).
 */
const campaign = () => getCampaign();

/** Nomes de líderes só podem aparecer com autorização; o dataset embarcado não tem. */
const LEADER_TITLE = /\b(Prs|Pra|Pr)\./;

beforeEach(() => {
  resetToBundledContent();
});

describe('localDateTimeForDay', () => {
  test('véspera do Dia 1 às 19h cai em 22/09/2026 às 19:00 no relógio local', () => {
    const when = localDateTimeForDay(1, campaign(), { hour: 19, minute: 0 }, -1);
    expect(when.getFullYear()).toBe(2026);
    expect(when.getMonth()).toBe(8);
    expect(when.getDate()).toBe(22);
    expect(when.getHours()).toBe(19);
    expect(when.getMinutes()).toBe(0);
  });

  test('sem deslocamento, o Dia 1 é o próprio início da campanha (23/09/2026)', () => {
    const when = localDateTimeForDay(1, campaign(), { hour: 0, minute: 0 });
    expect(when.getMonth()).toBe(8);
    expect(when.getDate()).toBe(23);
    expect(when.getHours()).toBe(0);
  });
});

describe('ministryReminderPlan (véspera do dia do meu ministério)', () => {
  test('Kids no início da campanha: dois avisos, na véspera dos dias 30 e 80 às 19h', () => {
    const now = localDateTimeForDay(1, campaign(), { hour: 10, minute: 0 });
    const plan = ministryReminderPlan('Kids', [30, 80], campaign(), now);

    expect(plan).toHaveLength(2);
    expect(plan.map((p) => p.id)).toEqual([`${MINISTRY_REMINDER_PREFIX}30`, `${MINISTRY_REMINDER_PREFIX}80`]);
    expect(plan.map((p) => p.day)).toEqual([30, 80]);

    expect(plan[0].when.getTime()).toBe(localDateTimeForDay(29, campaign(), MINISTRY_EVE_TIME).getTime());
    expect(plan[1].when.getTime()).toBe(localDateTimeForDay(79, campaign(), MINISTRY_EVE_TIME).getTime());
    for (const item of plan) {
      expect(item.when.getHours()).toBe(19);
      expect(item.when.getMinutes()).toBe(0);
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
    }

    expect(plan[0].body).toContain('Kids');
    expect(plan[0].body).toContain('Dia 30');
    expect(plan[0].body).toContain('Família');
    expect(plan[1].body).toContain('Dia 80');
  });

  test('no Dia 50 só resta a véspera do dia 80; a do dia 30 já passou', () => {
    const now = localDateTimeForDay(50, campaign(), { hour: 8, minute: 0 });
    const plan = ministryReminderPlan('Kids', [30, 80], campaign(), now);
    expect(plan.map((p) => p.id)).toEqual([`${MINISTRY_REMINDER_PREFIX}80`]);
  });

  test('sem ministério escolhido não há nada a agendar', () => {
    const now = localDateTimeForDay(1, campaign(), { hour: 10, minute: 0 });
    expect(ministryReminderPlan(null, [30], campaign(), now)).toEqual([]);
  });

  test('a véspera exatamente às 19h já não conta como futuro', () => {
    const now = localDateTimeForDay(30, campaign(), MINISTRY_EVE_TIME, -1);
    expect(ministryReminderPlan('Kids', [30, 80], campaign(), now).map((p) => p.day)).toEqual([80]);
  });
});

describe('altarReminderPlan (altar de hoje às 12h, janela rolante)', () => {
  test('no Dia 13 de manhã: começa hoje, 14 dias (13..26), todos às 12:00 local, nenhum no passado', () => {
    const now = localDateTimeForDay(13, campaign(), { hour: 10, minute: 0 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan).toHaveLength(14);
    expect(plan.map((p) => p.day)).toEqual(Array.from({ length: 14 }, (_, i) => 13 + i));
    expect(plan[0].id).toBe(`${ALTAR_REMINDER_PREFIX}13`);
    expect(plan[0].title).toContain('Dia 13');
    expect(plan[0].body).toContain('Diaconia');
    expect(plan[0].body).toContain('Mídia e Comunicação');

    for (const item of plan) {
      expect(item.id).toBe(`${ALTAR_REMINDER_PREFIX}${item.day}`);
      expect(item.when.getHours()).toBe(ALTAR_TIME.hour);
      expect(item.when.getMinutes()).toBe(ALTAR_TIME.minute);
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
      expect(item.when.getTime()).toBe(localDateTimeForDay(item.day, campaign(), ALTAR_TIME).getTime());
    }
  });

  test('no Dia 13 às 12h30 o altar de hoje já passou: o primeiro aviso é o Dia 14', () => {
    const now = localDateTimeForDay(13, campaign(), { hour: 12, minute: 30 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan[0].id).toBe(`${ALTAR_REMINDER_PREFIX}14`);
    expect(plan.map((p) => p.id)).not.toContain(`${ALTAR_REMINDER_PREFIX}13`);
    expect(plan.map((p) => p.day)).toEqual(Array.from({ length: 13 }, (_, i) => 14 + i));
    for (const item of plan) {
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  test('perto do fim a janela para no Dia 100: do Dia 95 restam 6 avisos', () => {
    const now = localDateTimeForDay(95, campaign(), { hour: 8, minute: 0 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan).toHaveLength(6);
    expect(plan.map((p) => p.day)).toEqual([95, 96, 97, 98, 99, 100]);
    expect(plan[plan.length - 1].id).toBe(`${ALTAR_REMINDER_PREFIX}100`);
  });

  test('depois do Dia 100 não há mais altar a lembrar', () => {
    const now = localDateTimeForDay(100, campaign(), { hour: 13, minute: 0 });
    expect(altarReminderPlan(campaign(), now)).toEqual([]);
  });
});

describe('nomes de líderes nunca vazam para as notificações', () => {
  test('nenhum corpo de lembrete (altar ou ministério) contém "Prs.", "Pra." ou "Pr."', () => {
    const bodies: string[] = [];

    // Altar: percorre a campanha inteira em janelas de 14 dias a partir do Dia 1.
    for (let day = 1; day <= 100; day += 14) {
      const now = localDateTimeForDay(day, campaign(), { hour: 8, minute: 0 });
      for (const item of altarReminderPlan(campaign(), now)) bodies.push(item.title, item.body);
    }
    expect(bodies.length).toBeGreaterThanOrEqual(100);

    // Ministério: a escala real (24 dias) de um ministério cujo rótulo na fonte traz "Prs.".
    // Ele conduz já no Dia 1, então "agora" é a manhã da véspera da campanha (22/09),
    // antes do primeiro aviso das 19h, para que os 24 entrem no plano.
    const now = localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);
    const ministryPlan = ministryReminderPlan('Intercessão/Bálsamo', daysForMinistry('Intercessão/Bálsamo'), campaign(), now);
    expect(ministryPlan).toHaveLength(24);
    for (const item of ministryPlan) bodies.push(item.title, item.body);

    for (const text of bodies) {
      expect(text).not.toMatch(LEADER_TITLE);
      expect(text).not.toContain('Prs.');
      expect(text).not.toContain('Pra.');
      expect(text).not.toContain('Pr.');
    }
  });
});

/* ------------------------------------------------------------------ grupo C */

const notifications = jest.requireMock('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
};

/** Permissão ainda não concedida: é o estado de quem acabou de instalar o app. */
function notYetGranted() {
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined' });
}

beforeEach(() => {
  notifications.getPermissionsAsync.mockReset().mockResolvedValue({ granted: true, status: 'granted' });
  notifications.requestPermissionsAsync.mockReset().mockResolvedValue({ granted: true, status: 'granted' });
  notifications.scheduleNotificationAsync.mockReset().mockResolvedValue('id');
  notifications.cancelScheduledNotificationAsync.mockReset().mockResolvedValue(undefined);
  notifications.getAllScheduledNotificationsAsync.mockReset().mockResolvedValue([]);
  notifications.setNotificationChannelAsync.mockReset().mockResolvedValue(undefined);
});

describe('o diálogo de permissão só nasce de um gesto', () => {
  const ministry = 'Intercessão/Bálsamo';
  const beforeStart = () => localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);

  test('sincronização de fundo não pede permissão nem quando ela ainda não existe', async () => {
    notYetGranted();
    const result = await syncMinistryReminders(ministry, daysForMinistry(ministry), campaign(), beforeStart(), {
      requestPermission: false,
    });

    // Nunca abre o diálogo: no iOS ele existe uma vez só na vida do aplicativo.
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    // E desiste em silêncio — sem agendar nada prometido pela metade.
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  test('sem opção nenhuma, o padrão também é não pedir', async () => {
    notYetGranted();
    await syncAltarReminders(true, campaign(), beforeStart());
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('sincronização de fundo agenda normalmente quando a permissão já existe', async () => {
    await syncAltarReminders(true, campaign(), beforeStart(), { requestPermission: false });
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  test('um gesto do usuário pede a permissão e agenda', async () => {
    notYetGranted();
    const result = await syncMinistryReminders(ministry, daysForMinistry(ministry), campaign(), beforeStart(), {
      requestPermission: true,
    });
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(24);
    expect(result.ok).toBe(true);
  });

  test('permissão negada devolve motivo em vez de estourar', async () => {
    notYetGranted();
    notifications.requestPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });
    const result = await syncAltarReminders(true, campaign(), beforeStart(), { requestPermission: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/ajustes do sistema/);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('recusa do sistema ao agendar vira motivo, não exceção solta', async () => {
    notifications.scheduleNotificationAsync.mockRejectedValue(new Error('too many pending notifications'));
    const result = await syncAltarReminders(true, campaign(), beforeStart(), { requestPermission: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Tente de novo/);
  });

  test('nada a agendar não chega a consultar a permissão', async () => {
    notYetGranted();
    // Ministério nenhum escolhido: o plano é vazio, então não há o que permitir.
    const result = await syncMinistryReminders(null, [], campaign(), beforeStart(), { requestPermission: true });
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});

describe('o hook de sincronização nunca pede permissão', () => {
  // Guarda de regressão por leitura da fonte: o defeito original era exatamente
  // uma chamada de permissão dentro do hook que roda na abertura do app. Um teste
  // de comportamento não pegaria alguém reintroduzindo isso em outro caminho.
  test('useReminderSync não chama ensureNotificationPermission e passa requestPermission: false', () => {
    const source = readFileSync(join(__dirname, '..', 'reminders', 'useReminderSync.ts'), 'utf8');
    expect(source).not.toMatch(/ensureNotificationPermission|requestPermissionsAsync/);
    expect(source.match(/requestPermission: false/g) ?? []).toHaveLength(2);
    expect(source).not.toMatch(/requestPermission: true/);
  });
});
