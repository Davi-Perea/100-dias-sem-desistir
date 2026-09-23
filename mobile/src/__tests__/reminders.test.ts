import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCampaign, resetToBundledContent } from '@/journey/datasetSource';
import { daysForMinistry, listMinistries } from '@/journey/ministries';
import {
  ALTAR_REMINDER_PREFIX,
  ALTAR_TIME,
  altarReminderPlan,
  campaignDateTimeForDay,
  localDateTimeForDay,
  MINISTRY_EVE_TIME,
  MINISTRY_REMINDER_PREFIX,
  ministryReminderPlan,
  reminderWindowDays,
  syncAltarReminders,
  syncMinistryReminders,
  ABSENCE_DELAYS_DAYS,
  COVERAGE_REMINDER_ID,
  dailyReminderPlan,
  IOS_PENDING_LIMIT,
} from '@/reminders/reminders';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

/**
 * Planos de lembrete (funções puras) sobre o dataset REAL dos 100 Dias.
 *
 * "Agora" é sempre construído com `localDateTimeForDay` (véspera) ou
 * `campaignDateTimeForDay` (altar), nunca com string ISO fixa, para que o teste
 * não dependa do fuso da máquina. O altar é um instante absoluto em São Paulo
 * (DIA-03); a véspera usa o relógio do aparelho.
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

    // D-5: a tela de bloqueio não mostra o ministério nem o monte.
    expect(plan[0].body).not.toContain('Kids');
    expect(plan[0].body).toContain('Dia 30');
    expect(plan[0].body).not.toContain('Família');
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

describe('altarReminderPlan (altar de hoje às 12h de São Paulo, janela rolante)', () => {
  const window = reminderWindowDays();

  test('no Dia 13 de manhã: começa hoje, uma janela inteira, todos às 12:00 de SP, nenhum no passado', () => {
    const now = campaignDateTimeForDay(13, campaign(), { hour: 10, minute: 0 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan).toHaveLength(window);
    expect(plan.map((p) => p.day)).toEqual(Array.from({ length: window }, (_, i) => 13 + i));
    expect(plan[0].id).toBe(`${ALTAR_REMINDER_PREFIX}13`);
    expect(plan[0].body).toContain('Dia 13');
    // D-5: nem quem conduz nem a palavra "altar" na tela de bloqueio.
    expect(plan[0].body).not.toContain('Diaconia');
    expect(plan[0].body).not.toContain('Mídia e Comunicação');

    for (const item of plan) {
      expect(item.id).toBe(`${ALTAR_REMINDER_PREFIX}${item.day}`);
      // 12h00 em −03:00 = 15h00 UTC, em qualquer fuso da máquina.
      expect(item.when.getUTCHours()).toBe(ALTAR_TIME.hour + 3);
      expect(item.when.getUTCMinutes()).toBe(ALTAR_TIME.minute);
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
      expect(item.when.getTime()).toBe(campaignDateTimeForDay(item.day, campaign(), ALTAR_TIME).getTime());
    }
  });

  test('no Dia 13 às 12h30 o altar de hoje já passou: o primeiro aviso é o Dia 14', () => {
    const now = campaignDateTimeForDay(13, campaign(), { hour: 12, minute: 30 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan[0].id).toBe(`${ALTAR_REMINDER_PREFIX}14`);
    expect(plan.map((p) => p.id)).not.toContain(`${ALTAR_REMINDER_PREFIX}13`);
    expect(plan.map((p) => p.day)).toEqual(Array.from({ length: window }, (_, i) => 14 + i));
    for (const item of plan) {
      expect(item.when.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  test('perto do fim a janela para no Dia 100: do Dia 95 restam 6 avisos', () => {
    const now = campaignDateTimeForDay(95, campaign(), { hour: 8, minute: 0 });
    const plan = altarReminderPlan(campaign(), now);

    expect(plan).toHaveLength(6);
    expect(plan.map((p) => p.day)).toEqual([95, 96, 97, 98, 99, 100]);
    expect(plan[plan.length - 1].id).toBe(`${ALTAR_REMINDER_PREFIX}100`);
  });

  test('depois do Dia 100 não há mais altar a lembrar', () => {
    const now = campaignDateTimeForDay(100, campaign(), { hour: 13, minute: 0 });
    expect(altarReminderPlan(campaign(), now)).toEqual([]);
  });
});

describe('nomes de líderes nunca vazam para as notificações', () => {
  test('nenhum corpo de lembrete (altar ou ministério) contém "Prs.", "Pra." ou "Pr."', () => {
    const bodies: string[] = [];

    // Altar: percorre a campanha inteira em janelas a partir do Dia 1.
    for (let day = 1; day <= 100; day += reminderWindowDays()) {
      const now = campaignDateTimeForDay(day, campaign(), { hour: 8, minute: 0 });
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
  test('useReminderSync não chama ensureNotificationPermission e toda sincronização passa BACKGROUND', () => {
    const source = readFileSync(join(__dirname, '..', 'reminders', 'useReminderSync.ts'), 'utf8');
    expect(source).not.toMatch(/ensureNotificationPermission|requestPermissionsAsync/);
    expect(source).toMatch(/const BACKGROUND: SyncOptions = \{ requestPermission: false \};/);
    expect(source.match(/requestPermission: false/g) ?? []).toHaveLength(1);
    expect(source).not.toMatch(/requestPermission: true/);
    // As três famílias (leitura, ministério, altar) passam a opção de fundo.
    const calls = source.match(/sync(Daily|Ministry|Altar)Reminders?\([^;]*?BACKGROUND\)/gs) ?? [];
    expect(calls).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ grupo D */

/**
 * AUDITORIA EXTERNA 2026-09-23: uma tentativa de agendamento tem de ser tudo ou
 * nada. O defeito era: itens 1 e 2 agendados, item 3 recusado pelo sistema,
 * `ok: false` devolvido — e os dois primeiros ficavam armados no celular, sem
 * caminho de desligar, porque para o app o lembrete estava desligado.
 */
describe('agendar é tudo ou nada', () => {
  const ministry = 'Intercessão/Bálsamo';
  const beforeStart = () => localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);

  /** Ids que o prefixo desta família criou durante a tentativa. */
  const familyDays = () => daysForMinistry(ministry);

  test('falha no terceiro item cancela os dois que ESTA tentativa criou, e só eles', async () => {
    let calls = 0;
    notifications.scheduleNotificationAsync.mockImplementation(async () => {
      calls += 1;
      if (calls === 3) throw new Error('iOS recusou');
      return 'id';
    });

    const result = await syncMinistryReminders(ministry, familyDays(), campaign(), beforeStart(), {
      requestPermission: false,
    });

    expect(result.ok).toBe(false);
    expect(calls).toBe(3);

    // Os ids agendados com sucesso nesta tentativa: o 1º e o 2º.
    const agendados = notifications.scheduleNotificationAsync.mock.calls
      .slice(0, 2)
      .map(([input]: [{ identifier: string }]) => input.identifier);
    expect(agendados).toHaveLength(2);

    const cancelados = notifications.cancelScheduledNotificationAsync.mock.calls.map(([id]: [string]) => id);
    for (const id of agendados) expect(cancelados).toContain(id);

    // E nada além disso: o cancelamento por id não pode encostar em outra
    // família. O único outro cancelamento permitido é o do prefixo desta mesma
    // família, que o resync faz ANTES de agendar.
    const forasteiros = cancelados.filter(
      (id: string) => !agendados.includes(id) && !id.startsWith(MINISTRY_REMINDER_PREFIX),
    );
    expect(forasteiros).toEqual([]);
    for (const prefixo of [ALTAR_REMINDER_PREFIX, 'daily-reminder-', 'absence-']) {
      expect(cancelados.filter((id: string) => id.startsWith(prefixo))).toEqual([]);
    }
  });

  test('falha já no primeiro item não cancela nada por id — não havia o que desfazer', async () => {
    notifications.scheduleNotificationAsync.mockRejectedValue(new Error('iOS recusou'));

    const result = await syncMinistryReminders(ministry, familyDays(), campaign(), beforeStart(), {
      requestPermission: false,
    });

    expect(result.ok).toBe(false);
    // Uma tentativa só: a primeira falha interrompe o laço.
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const porId = notifications.cancelScheduledNotificationAsync.mock.calls.map(([id]: [string]) => id);
    expect(porId.filter((id: string) => id.startsWith(MINISTRY_REMINDER_PREFIX))).toEqual([]);
  });

  test('sem falha nenhuma, nada é cancelado por id', async () => {
    const result = await syncMinistryReminders(ministry, familyDays(), campaign(), beforeStart(), {
      requestPermission: false,
    });
    expect(result.ok).toBe(true);
    const porId = notifications.cancelScheduledNotificationAsync.mock.calls.map(([id]: [string]) => id);
    expect(porId.filter((id: string) => id.startsWith(MINISTRY_REMINDER_PREFIX))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ grupo E */

/**
 * AUDITORIA EXTERNA 2026-09-23 (P1): a zona morta do iOS.
 *
 * Cenário: iPhone, lembrete diário LIGADO, a pessoa agenda e nunca mais abre o
 * app. A janela rolante do iOS acaba, e o aviso de ausência não cobre esse caso
 * porque só é agendado com o lembrete diário desligado. Antes, a pessoa que
 * mais precisava do lembrete era a única que parava de receber, em silêncio.
 */
describe('iOS: quem liga o lembrete e some não cai num silêncio', () => {
  const TIME = { hour: 7, minute: 0 };
  const iosWindow = () => reminderWindowDays('ios');
  /** Manhã do Dia 1, antes do horário do lembrete. */
  const dia1 = () => localDateTimeForDay(1, campaign(), { hour: 6, minute: 0 });

  test('o plano do iPhone não termina na janela: há um aviso depois dela', () => {
    const plan = dailyReminderPlan(TIME, campaign(), dia1(), iosWindow());
    const retomada = plan.filter((item) => item.id === COVERAGE_REMINDER_ID);
    expect(retomada).toHaveLength(1);

    // Ele cai UM dia depois do último aviso da janela — sem buraco entre os dois.
    const diarios = plan.filter((item) => item.id !== COVERAGE_REMINDER_ID);
    expect(diarios).toHaveLength(iosWindow());
    expect(retomada[0].day).toBe(diarios[diarios.length - 1].day + 1);
    expect(retomada[0].when.getTime()).toBeGreaterThan(diarios[diarios.length - 1].when.getTime());
  });

  test('a pessoa que some recebe algo depois do fim da janela', () => {
    const now = dia1();
    const plan = dailyReminderPlan(TIME, campaign(), now, iosWindow());
    const ultimo = plan[plan.length - 1];
    // Sem tocar no app, o último agendamento do sistema é o de retomada.
    expect(ultimo.id).toBe(COVERAGE_REMINDER_ID);
    // E ele não anuncia leitura de dia nenhum: dispara longe, e prometer "a
    // leitura de hoje" seria mentira quando chegasse a hora.
    expect(ultimo.body).not.toMatch(/Dia \d+/);
  });

  test('não insiste: um aviso de retomada, nunca uma fila deles', () => {
    const plan = dailyReminderPlan(TIME, campaign(), dia1(), iosWindow());
    expect(plan.filter((item) => item.id === COVERAGE_REMINDER_ID)).toHaveLength(1);
  });

  test('no Android não existe: a janela cobre a campanha inteira', () => {
    const plan = dailyReminderPlan(TIME, campaign(), dia1(), reminderWindowDays('android'));
    expect(plan.some((item) => item.id === COVERAGE_REMINDER_ID)).toBe(false);
  });

  test('perto do fim da campanha também não existe: não há dia depois do Dia 100', () => {
    const quaseFim = localDateTimeForDay(campaign().total_days - 2, campaign(), { hour: 6, minute: 0 });
    const plan = dailyReminderPlan(TIME, campaign(), quaseFim, iosWindow());
    expect(plan.some((item) => item.id === COVERAGE_REMINDER_ID)).toBe(false);
    expect(plan[plan.length - 1].day).toBeLessThanOrEqual(campaign().total_days);
  });

  test('o orçamento do iPhone continua cabendo nos 64 pendentes', () => {
    const janela = iosWindow();
    const maiorMinisterio = Math.max(
      ...listMinistries().map((m) => m.days.length),
    );
    // leitura (janela + retomada) + altar (janela) + ministério + ausência
    const total = janela + 1 + janela + maiorMinisterio + ABSENCE_DELAYS_DAYS.length;
    expect(total).toBeLessThanOrEqual(IOS_PENDING_LIMIT);
  });
});
