import * as Device from 'expo-device';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  cancelDailyReminder,
  formatTime,
  isReminderSupported,
  listScheduledReminders,
  scheduleDailyReminder,
  scheduleTestNotification,
  SLOT_LABELS,
  SLOT_TIMES,
} from '@/reminders/reminders';
import { updateSettings, useSettings, type ReminderSlot } from '@/settings/settingsStore';
import { AppText, Button, Card, ChoiceRow, Screen, ScreenScroll, StateView } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

const CUSTOM_TIMES = [
  { hour: 5, minute: 30 },
  { hour: 6, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 30 },
  { hour: 21, minute: 30 },
  { hour: 22, minute: 0 },
];

export default function ReminderScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const supported = isReminderSupported();

  const refresh = useCallback(async () => {
    setScheduled((await listScheduledReminders()).length);
  }, []);

  useEffect(() => {
    let alive = true;
    listScheduledReminders().then((list) => alive && setScheduled(list.length));
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const apply = async (slot: ReminderSlot, hour: number, minute: number) => {
    setBusy(true);
    try {
      if (slot === 'none') {
        await cancelDailyReminder();
        await updateSettings((s) => ({ ...s, reminder: { slot: 'none', hour, minute } }));
        setStatus('Lembrete desativado.');
      } else {
        const result = await scheduleDailyReminder(hour, minute);
        if (!result.ok) {
          await updateSettings((s) => ({ ...s, reminder: { slot: 'none', hour, minute } }));
          setStatus(result.reason);
        } else {
          await updateSettings((s) => ({ ...s, reminder: { slot, hour, minute } }));
          setStatus(`Lembrete diário às ${formatTime(hour, minute)}.`);
        }
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const current = settings.reminder;

  return (
    <Screen>
      <ScreenScroll>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="blockTitle">Quando você quer ser lembrado?</AppText>
          <AppText variant="secondary">
            Notificação local, agendada no seu aparelho. Não depende de conta nem de conexão.
          </AppText>
        </View>

        {!supported ? (
          <Card tone="muted">
            <AppText variant="muted">
              Notificações locais não são suportadas na web. Teste em um aparelho iOS ou Android.
            </AppText>
          </Card>
        ) : null}
        {supported && !Device.isDevice ? (
          <Card tone="muted">
            <AppText variant="muted">Emuladores podem não exibir notificações. Prefira um aparelho físico.</AppText>
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {(['morning', 'afternoon', 'evening'] as const).map((slot) => (
            <ChoiceRow
              key={slot}
              label={SLOT_LABELS[slot]}
              description={formatTime(SLOT_TIMES[slot].hour, SLOT_TIMES[slot].minute)}
              compact
              selected={current.slot === slot}
              onPress={() => apply(slot, SLOT_TIMES[slot].hour, SLOT_TIMES[slot].minute)}
              testID={`reminder-${slot}`}
            />
          ))}
          <ChoiceRow
            label={SLOT_LABELS.none}
            selected={current.slot === 'none'}
            onPress={() => apply('none', current.hour, current.minute)}
            testID="reminder-none"
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="cap">Escolher horário</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CUSTOM_TIMES.map((t) => {
              const selected = current.slot === 'custom' && current.hour === t.hour && current.minute === t.minute;
              return (
                <Button
                  key={`${t.hour}-${t.minute}`}
                  title={formatTime(t.hour, t.minute)}
                  variant={selected ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => apply('custom', t.hour, t.minute)}
                  style={{ paddingHorizontal: spacing.lg }}
                />
              );
            })}
          </View>
        </View>

        {status ? (
          <AppText accessibilityLiveRegion="polite" style={{ color: colors.accent }}>
            {status}
          </AppText>
        ) : null}

        <Card tone="muted">
          <View style={{ gap: spacing.sm }}>
            <AppText variant="muted">{scheduled} agendamento(s) ativo(s) no sistema.</AppText>
            <Button
              title="Testar agora (5 s)"
              variant="underline"
              disabled={!supported || busy}
              onPress={async () => {
                const result = await scheduleTestNotification(5);
                setStatus(result.ok ? 'Notificação de teste em 5 segundos.' : result.reason);
                await refresh();
              }}
            />
          </View>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}
