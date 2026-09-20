import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { altarForDisplay, getDay } from '@/journey/datasetSource';
import { dateOfDay, rawCampaignDay } from '@/journey/officialDay';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { Campaign } from '@/journey/types';
import type { ReminderSlot } from '@/settings/settingsStore';

/**
 * Lembretes: notificações LOCAIS, sem conta e sem servidor (spec §15).
 * Android: expo-notifications só usa alarme exato se o app tiver a permissão;
 * como não declaramos SCHEDULE_EXACT_ALARM, o agendamento é inexato — o que a
 * política do Google Play exige para lembretes que não são despertador/calendário.
 *
 * Três famílias, cada uma com o próprio prefixo de identificador:
 *  - leitura diária (uma notificação repetida);
 *  - véspera do dia do meu ministério (uma por dia do ministério, 2 ou 24);
 *  - altar de hoje às 12h (janela rolante de 14 dias, refeita a cada abertura).
 * O iOS aceita no máximo 64 agendamentos pendentes; a soma aqui fica abaixo disso.
 */
export const DAILY_REMINDER_ID = 'daily-reading-reminder';
export const MINISTRY_REMINDER_PREFIX = 'ministry-eve-';
export const ALTAR_REMINDER_PREFIX = 'altar-today-';
const ANDROID_CHANNEL_ID = 'reading-reminders';

/** Véspera às 19h; altar às 12h (meia hora antes do encontro das 12h30). */
export const MINISTRY_EVE_TIME = { hour: 19, minute: 0 } as const;
export const ALTAR_TIME = { hour: 12, minute: 0 } as const;
export const ALTAR_WINDOW_DAYS = 14;

export type ReminderResult = { ok: true } | { ok: false; reason: string };

/**
 * `requestPermission` só é verdadeiro quando a chamada nasce de um gesto do
 * usuário. Em segundo plano (abertura do app, volta do background) o padrão é
 * falso: agenda o que já está permitido e desiste em silêncio do resto.
 */
export type SyncOptions = { requestPermission?: boolean };

const PERMISSION_DENIED = 'Permissão de notificações negada. Você pode ativar nos ajustes do sistema.';

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
    name: 'Lembretes de leitura',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isReminderSupported()) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // não havia agendamento
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<ReminderResult> {
  if (!isReminderSupported()) return { ok: false, reason: 'Notificações locais não são suportadas na web.' };
  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: PERMISSION_DENIED };
  await ensureAndroidChannel();
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Sua leitura de hoje',
      body: 'Um dia de cada vez. Vamos continuar a jornada.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
  return { ok: true };
}

/* ------------------------------------------------ planos (funções puras) */

/**
 * Data-hora LOCAL do aparelho para um dia da campanha. A campanha vive em
 * São Paulo; para quem está lá, o relógio local e o da campanha coincidem.
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

export type PlannedReminder = { id: string; day: number; when: Date; title: string; body: string };

/** Véspera de cada dia do ministério, só no futuro. */
export function ministryReminderPlan(ministry: string | null, days: number[], campaign: Campaign, now: Date): PlannedReminder[] {
  if (!ministry) return [];
  return days
    .map((day) => {
      const sphere = getDay(day)?.sphere;
      return {
        id: `${MINISTRY_REMINDER_PREFIX}${day}`,
        day,
        when: localDateTimeForDay(day, campaign, MINISTRY_EVE_TIME, -1),
        title: 'Amanhã é o dia do seu ministério',
        body: `${ministry} conduz o altar das 12h30 no Dia ${day}${sphere ? ` · Monte: ${SPHERE_LABEL[sphere]}` : ''}.`,
      };
    })
    .filter((item) => item.when.getTime() > now.getTime());
}

/** Altar de hoje, às 12h, para os próximos dias da janela; nunca no passado. */
export function altarReminderPlan(campaign: Campaign, now: Date, windowDays = ALTAR_WINDOW_DAYS): PlannedReminder[] {
  const first = Math.max(1, rawCampaignDay(now, campaign));
  const last = Math.min(campaign.total_days, first + windowDays - 1);
  const plan: PlannedReminder[] = [];
  for (let day = first; day <= last; day += 1) {
    const journeyDay = getDay(day);
    const altar = altarForDisplay(journeyDay);
    if (!altar) continue;
    const when = localDateTimeForDay(day, campaign, ALTAR_TIME);
    if (when.getTime() <= now.getTime()) continue;
    const sphere = journeyDay?.sphere;
    plan.push({
      id: `${ALTAR_REMINDER_PREFIX}${day}`,
      day,
      when,
      title: `Altar das 12h30 · Dia ${day}`,
      body: `Hoje conduz: ${altar.ministry}${sphere ? ` · Monte: ${SPHERE_LABEL[sphere]}` : ''}.`,
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
 * Reagenda as vésperas do ministério escolhido. Cancelar sempre e agendar de
 * novo é o que mantém o estado do SO igual ao da escolha, sem contabilidade.
 * A permissão só é pedida quando há algo a agendar.
 */
export function syncMinistryReminders(
  ministry: string | null,
  days: number[],
  campaign: Campaign,
  now: Date,
  options?: SyncOptions,
): Promise<ReminderResult> {
  if (!isReminderSupported()) return Promise.resolve({ ok: false, reason: 'Notificações locais não são suportadas na web.' });
  return serialized(async () => {
    await cancelWithPrefix(MINISTRY_REMINDER_PREFIX);
    const plan = ministryReminderPlan(ministry, days, campaign, now);
    if (plan.length === 0) return { ok: true };
    const granted = await permissionFor(options);
    if (!granted) return { ok: false, reason: PERMISSION_DENIED };
    await ensureAndroidChannel();
    return schedulePlan(plan);
  });
}

/** Janela rolante do altar de hoje. Chamar a cada abertura do app. */
export function syncAltarReminders(
  enabled: boolean,
  campaign: Campaign,
  now: Date,
  options?: SyncOptions,
): Promise<ReminderResult> {
  if (!isReminderSupported()) return Promise.resolve({ ok: false, reason: 'Notificações locais não são suportadas na web.' });
  return serialized(async () => {
    await cancelWithPrefix(ALTAR_REMINDER_PREFIX);
    if (!enabled) return { ok: true };
    const plan = altarReminderPlan(campaign, now);
    if (plan.length === 0) return { ok: true };
    const granted = await permissionFor(options);
    if (!granted) return { ok: false, reason: PERMISSION_DENIED };
    await ensureAndroidChannel();
    return schedulePlan(plan);
  });
}

export async function scheduleTestNotification(seconds = 5): Promise<ReminderResult> {
  if (!isReminderSupported()) return { ok: false, reason: 'Notificações locais não são suportadas na web.' };
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
