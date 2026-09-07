import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderSlot } from '@/settings/settingsStore';

/**
 * Lembrete de leitura: notificação LOCAL, sem conta e sem servidor (spec §15).
 * Android: expo-notifications só usa alarme exato se o app tiver a permissão;
 * como não declaramos SCHEDULE_EXACT_ALARM, o agendamento é inexato — o que a
 * política do Google Play exige para lembretes que não são despertador/calendário.
 */
export const DAILY_REMINDER_ID = 'daily-reading-reminder';
const ANDROID_CHANNEL_ID = 'reading-reminders';

export type ReminderResult = { ok: true } | { ok: false; reason: string };

export const SLOT_TIMES: Record<Exclude<ReminderSlot, 'custom' | 'none'>, { hour: number; minute: number }> = {
  morning: { hour: 7, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
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

/** A permissão do SO só é pedida depois de o usuário escolher um horário (spec §5, tela 6). */
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
  if (!granted) return { ok: false, reason: 'Permissão de notificações negada. Você pode ativar nos ajustes do sistema.' };
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
