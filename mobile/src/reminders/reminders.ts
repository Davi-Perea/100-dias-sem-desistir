import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { altarForDisplay, getCampaign, getDay } from '@/journey/datasetSource';
import { listMinistries } from '@/journey/ministries';
import { dateOfDay, rawCampaignDay } from '@/journey/officialDay';
import type { Campaign } from '@/journey/types';
import type { ReminderSlot } from '@/settings/settingsStore';

/**
 * Lembretes: notificações LOCAIS, sem conta e sem servidor (spec §15).
 * Android: expo-notifications só usa alarme exato se o app tiver a permissão;
 * como não declaramos SCHEDULE_EXACT_ALARM, o agendamento é inexato — o que a
 * política do Google Play exige para lembretes que não são despertador/calendário.
 *
 * Três famílias, cada uma com o próprio prefixo de identificador, TODAS presas
 * aos dias da campanha (Dia 1 a total_days) e agendadas com gatilho DATE:
 *  - leitura diária (LEM-01): um aviso por dia da campanha, em janela rolante;
 *  - véspera do dia do meu ministério (uma por dia do ministério, 2 ou 24);
 *  - altar de hoje às 12h de São Paulo (janela rolante).
 * As janelas são refeitas na abertura e a cada volta ao primeiro plano
 * (useReminderSync). O tamanho delas sai do orçamento de agendamentos
 * pendentes: ver `reminderWindowDays`.
 *
 * Texto na tela de bloqueio (LEM-02, decisão D-5): título e corpo neutros, sem
 * nome de ministério, sem "altar" e sem quem conduz. Filiação a ministério de
 * igreja é dado sensível (LGPD art. 5º, II; invariante C-10). O detalhe fica
 * dentro do app, que a notificação abre.
 */
/** Id do antigo gatilho DAILY, que repetia sem fim. Só é usado para cancelar o que sobrou dele. */
export const DAILY_REMINDER_ID = 'daily-reading-reminder';
export const DAILY_REMINDER_PREFIX = 'daily-reading-day-';
export const MINISTRY_REMINDER_PREFIX = 'ministry-eve-';
export const ALTAR_REMINDER_PREFIX = 'altar-today-';
/**
 * Canal com lockscreenVisibility PRIVATE (D-5). No Android, as configurações de
 * um canal ficam fixas depois de criado, então a mudança exige um id novo; o
 * canal antigo é apagado.
 */
export const ANDROID_CHANNEL_ID = 'reminders-private';
const LEGACY_ANDROID_CHANNEL_IDS = ['reading-reminders'];

/**
 * Véspera às 19h no relógio do aparelho: ela não está presa a um encontro, e 19h
 * locais do dia anterior continuam sendo a véspera em São Paulo em qualquer fuso
 * habitado. Altar às 12h de SÃO PAULO, meia hora antes do encontro presencial
 * das 12h30 na igreja (DIA-03): instante absoluto, qualquer que seja o fuso do
 * aparelho.
 */
export const MINISTRY_EVE_TIME = { hour: 19, minute: 0 } as const;
export const ALTAR_TIME = { hour: 12, minute: 0 } as const;

/**
 * Orçamento de agendamentos pendentes (LEM-01, LEM-04).
 * iOS: no máximo 64 por app; o que passar disso o sistema descarta em silêncio.
 * Reserva o maior ministério da escala inteiro (a véspera não tem janela: são
 * todos os dias do ministério) e uma folga para o teste do painel DEV; o resto
 * é dividido igualmente entre a leitura diária e o altar. Com a escala atual:
 * (64 − 24 − 2) / 2 = 19 dias para cada uma.
 * Android: o limite prático é o do AlarmManager (500 alarmes por app) e a
 * campanha inteira cabe (100 + 100 + 24), então a janela cobre todos os dias
 * restantes e quem fica semanas sem abrir o app continua recebendo.
 */
// PROVISÓRIO (decisão do engenheiro, 2026-09-21: orçamento do iOS dividido em partes iguais entre leitura e altar; a véspera do ministério é reservada inteira porque não tem janela)
export const IOS_PENDING_LIMIT = 64;
const IOS_SLACK = 2;
const ANDROID_WINDOW_DAYS = 100;

export function reminderWindowDays(platform: string = Platform.OS): number {
  if (platform === 'android') return ANDROID_WINDOW_DAYS;
  const largestMinistry = listMinistries().reduce((max, m) => Math.max(max, m.days.length), 0);
  return Math.max(1, Math.floor((IOS_PENDING_LIMIT - IOS_SLACK - largestMinistry) / 2));
}

export type ReminderResult = { ok: true } | { ok: false; reason: string };

/**
 * `requestPermission` só é verdadeiro quando a chamada nasce de um gesto do
 * usuário. Em segundo plano (abertura do app, volta do background) o padrão é
 * falso: agenda o que já está permitido e desiste em silêncio do resto.
 */
export type SyncOptions = { requestPermission?: boolean };

const PERMISSION_DENIED = 'Permissão de notificações negada. Você pode ativar nos ajustes do sistema.';
const UNSUPPORTED = 'Notificações locais não são suportadas na web.';

/** Resolve a permissão conforme a origem da chamada: gesto pede, segundo plano só lê. */
async function permissionFor(options: SyncOptions | undefined): Promise<boolean> {
  return options?.requestPermission ? ensureNotificationPermission() : hasNotificationPermission();
}

export const SLOT_TIMES: Record<Exclude<ReminderSlot, 'custom' | 'none'>, { hour: number; minute: number }> = {
  morning: { hour: 7, minute: 0 },
  // 13:00 é o horário concreto que o handoff mostra na tela 01d.
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

export const SLOT_LABELS: Record<ReminderSlot, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  custom: 'Escolher horário',
  none: 'Sem lembrete',
};

export function isReminderSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

let handlerInstalled = false;
export function setupNotificationHandler() {
  if (handlerInstalled || !isReminderSupported()) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Só LÊ o estado da permissão. Não abre diálogo, então pode rodar a qualquer momento. */
export async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/**
 * Pede a permissão ao sistema. Só pode ser chamada a partir de um GESTO do
 * usuário: escolher um horário, marcar o aviso do altar, escolher o ministério.
 * O iOS só mostra o diálogo uma vez na vida do aplicativo; gastá-lo na abertura,
 * antes de a pessoa entender para quê, é perder o lembrete para sempre.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Lembretes',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  for (const legacy of LEGACY_ANDROID_CHANNEL_IDS) {
    await Notifications.deleteNotificationChannelAsync(legacy).catch(() => {});
  }
}

/* ------------------------------------------------ planos (funções puras) */

/**
 * Data de calendário da campanha, hora no relógio LOCAL do aparelho. Serve para
 * o que a pessoa escolheu no próprio relógio (lembrete de leitura às 07:00) e
 * para a véspera. Para o altar, que é um encontro em São Paulo, use
 * `campaignDateTimeForDay`.
 */
export function localDateTimeForDay(
  dayNumber: number,
  campaign: Campaign,
  time: { hour: number; minute: number },
  offsetDays = 0,
): Date {
  const [year, month, day] = dateOfDay(dayNumber, campaign).split('-').map(Number);
  return new Date(year, month - 1, day + offsetDays, time.hour, time.minute, 0, 0);
}

/**
 * Instante ABSOLUTO de um horário no fuso da campanha (DIA-03): 12h00 em −03:00
 * são 15h00 UTC, em qualquer fuso do aparelho.
 */
export function campaignDateTimeForDay(
  dayNumber: number,
  campaign: Campaign,
  time: { hour: number; minute: number },
): Date {
  const [year, month, day] = dateOfDay(dayNumber, campaign).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, time.hour, time.minute) - campaign.utc_offset_minutes * 60_000);
}

export type PlannedReminder = { id: string; day: number; when: Date; title: string; body: string };

/** Textos das notificações: neutros na tela de bloqueio (D-5). */
export const DAILY_TITLE = 'Sua leitura de hoje';
export const DAILY_BODY = 'Um dia de cada vez. Vamos continuar a jornada.';
export const MINISTRY_EVE_TITLE = 'Lembrete para amanhã';
export const ALTAR_TITLE = 'Lembrete para hoje';

/**
 * Leitura diária (LEM-01): um aviso por dia da campanha, no horário escolhido,
 * só no futuro, nunca antes do Dia 1 nem depois de total_days, limitado à janela.
 */
export function dailyReminderPlan(
  time: { hour: number; minute: number } | null,
  campaign: Campaign,
  now: Date,
  windowDays = reminderWindowDays(),
): PlannedReminder[] {
  if (!time) return [];
  // Começa um dia antes do dia da campanha: o horário é local e, num fuso
  // adiantado em relação a São Paulo, "hoje às 07:00" ainda pode ser o dia
  // anterior da campanha. O filtro de futuro descarta o que já passou.
  const first = Math.max(1, rawCampaignDay(now, campaign) - 1);
  const plan: PlannedReminder[] = [];
  for (let day = first; day <= campaign.total_days && plan.length < windowDays; day += 1) {
    const when = localDateTimeForDay(day, campaign, time);
    if (when.getTime() <= now.getTime()) continue;
    plan.push({ id: `${DAILY_REMINDER_PREFIX}${day}`, day, when, title: DAILY_TITLE, body: DAILY_BODY });
  }
  return plan;
}

/** Véspera de cada dia do ministério, só no futuro. O texto não nomeia o ministério (D-5). */
export function ministryReminderPlan(ministry: string | null, days: number[], campaign: Campaign, now: Date): PlannedReminder[] {
  if (!ministry) return [];
  return days
    .map((day) => ({
      id: `${MINISTRY_REMINDER_PREFIX}${day}`,
      day,
      when: localDateTimeForDay(day, campaign, MINISTRY_EVE_TIME, -1),
      title: MINISTRY_EVE_TITLE,
      body: `Abra o app para ver o que está marcado para o Dia ${day}.`,
    }))
    .filter((item) => item.when.getTime() > now.getTime());
}

/**
 * Altar de hoje, às 12h de São Paulo, para os próximos dias da janela; nunca no
 * passado. Só entram dias que têm altar na escala. O texto não diz quem conduz
 * nem usa a palavra "altar" (D-5).
 */
export function altarReminderPlan(campaign: Campaign, now: Date, windowDays = reminderWindowDays()): PlannedReminder[] {
  const first = Math.max(1, rawCampaignDay(now, campaign));
  const plan: PlannedReminder[] = [];
  for (let day = first; day <= campaign.total_days && plan.length < windowDays; day += 1) {
    if (!altarForDisplay(getDay(day))) continue;
    const when = campaignDateTimeForDay(day, campaign, ALTAR_TIME);
    if (when.getTime() <= now.getTime()) continue;
    plan.push({
      id: `${ALTAR_REMINDER_PREFIX}${day}`,
      day,
      when,
      title: ALTAR_TITLE,
      body: `Encontro das 12h30 · Dia ${day}.`,
    });
  }
  return plan;
}

/* --------------------------------------------------------- agendamento */

/**
 * As sincronizações rodam uma de cada vez. A tela que liga o aviso chama
 * `sync*` para mostrar o motivo de uma falha, e o hook do layout reage à mesma
 * mudança de settings: sem fila, as duas cancelariam e agendariam ao mesmo tempo
 * e poderiam pedir a permissão do sistema duas vezes.
 */
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function cancelWithPrefix(prefix: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

/**
 * Agenda o plano. Uma recusa do SO (cota de agendamentos, canal removido) vira
 * `{ ok: false }` em vez de exceção solta: quem chamou precisa saber para poder
 * desfazer a preferência em vez de prometer um aviso que não vem.
 */
async function schedulePlan(plan: PlannedReminder[]): Promise<ReminderResult> {
  for (const item of plan) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: { title: item.title, body: item.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.when,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    } catch {
      return { ok: false, reason: 'O sistema recusou o agendamento do lembrete. Tente de novo mais tarde.' };
    }
  }
  return { ok: true };
}

/**
 * Cancela a família e agenda o plano de novo. Cancelar sempre é o que mantém o
 * estado do SO igual ao da escolha, sem contabilidade, e é também o que rearma
 * os alarmes que o Android apaga num "Forçar parada". A permissão só é
 * consultada quando há algo a agendar.
 */
function resync(prefix: string, cancelExtra: (() => Promise<void>) | null, plan: () => PlannedReminder[], options?: SyncOptions) {
  if (!isReminderSupported()) return Promise.resolve<ReminderResult>({ ok: false, reason: UNSUPPORTED });
  return serialized(async (): Promise<ReminderResult> => {
    if (cancelExtra) await cancelExtra();
    await cancelWithPrefix(prefix);
    const items = plan();
    if (items.length === 0) return { ok: true };
    const granted = await permissionFor(options);
    if (!granted) return { ok: false, reason: PERMISSION_DENIED };
    await ensureAndroidChannel();
    return schedulePlan(items);
  });
}

const cancelLegacyDaily = () => Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

/**
 * Janela rolante da leitura diária (LEM-01). `time` nulo = sem lembrete. O
 * antigo gatilho DAILY, sem data de fim, é sempre cancelado junto.
 */
export function syncDailyReminder(
  time: { hour: number; minute: number } | null,
  campaign: Campaign,
  now: Date,
  options?: SyncOptions,
): Promise<ReminderResult> {
  return resync(DAILY_REMINDER_PREFIX, cancelLegacyDaily, () => dailyReminderPlan(time, campaign, now), options);
}

/** Desliga a leitura diária. Passa pela mesma fila das sincronizações. */
export async function cancelDailyReminder(): Promise<void> {
  if (!isReminderSupported()) return;
  await serialized(async () => {
    await cancelLegacyDaily();
    await cancelWithPrefix(DAILY_REMINDER_PREFIX);
  }).catch(() => {});
}

/**
 * Liga a leitura diária no horário escolhido. Nasce de um GESTO (tela de
 * lembrete, onboarding), então pode pedir a permissão. A assinatura (hora,
 * minuto) é a que as telas já usam.
 */
export function scheduleDailyReminder(
  hour: number,
  minute: number,
  campaign: Campaign = getCampaign(),
  now: Date = new Date(),
): Promise<ReminderResult> {
  return syncDailyReminder({ hour, minute }, campaign, now, { requestPermission: true });
}

/** Reagenda as vésperas do ministério escolhido. */
export function syncMinistryReminders(
  ministry: string | null,
  days: number[],
  campaign: Campaign,
  now: Date,
  options?: SyncOptions,
): Promise<ReminderResult> {
  return resync(MINISTRY_REMINDER_PREFIX, null, () => ministryReminderPlan(ministry, days, campaign, now), options);
}

/** Janela rolante do altar de hoje. Chamar a cada abertura do app. */
export function syncAltarReminders(
  enabled: boolean,
  campaign: Campaign,
  now: Date,
  options?: SyncOptions,
): Promise<ReminderResult> {
  return resync(ALTAR_REMINDER_PREFIX, null, () => (enabled ? altarReminderPlan(campaign, now) : []), options);
}

export async function scheduleTestNotification(seconds = 5): Promise<ReminderResult> {
  if (!isReminderSupported()) return { ok: false, reason: UNSUPPORTED };
  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: 'Permissão de notificações negada pelo sistema.' };
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Teste de lembrete', body: `Disparado ${seconds}s depois de agendar.` },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
  return { ok: true };
}

export async function listScheduledReminders() {
  if (!isReminderSupported()) return [];
  return Notifications.getAllScheduledNotificationsAsync();
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
