import { router } from 'expo-router';
import { useState } from 'react';

import { formatTime, scheduleDailyReminder, SLOT_LABELS, SLOT_TIMES } from '@/reminders/reminders';
import { updateSettings, useSettings, type ReminderSlot } from '@/settings/settingsStore';
import { AppText, Button, ChoiceRow } from '@/ui/components';
import { OnboardingStep } from '@/ui/OnboardingStep';

const CUSTOM = { hour: 21, minute: 0 };

/** A permissão do sistema só é pedida DEPOIS da escolha (spec §5, tela 6). */
export default function ReminderOnboardingScreen() {
  const settings = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const slot = settings?.reminder.slot ?? 'none';

  const choose = (next: ReminderSlot, hour: number, minute: number) => {
    setNotice(null);
    setBlocked(false);
    return updateSettings((s) => ({ ...s, reminder: { slot: next, hour, minute } }));
  };

  /**
   * Negar a permissão de notificação NUNCA pode prender o usuário no onboarding:
   * o lembrete é opcional (spec §5, tela 6). Em caso de falha, explicamos e seguimos.
   */
  const finish = async () => {
    setBusy(true);
    try {
      const reminder = settings?.reminder;
      if (reminder && reminder.slot !== 'none' && !blocked) {
        const result = await scheduleDailyReminder(reminder.hour, reminder.minute);
        if (!result.ok) {
          await updateSettings((s) => ({ ...s, reminder: { ...s.reminder, slot: 'none' } }));
          setNotice(`${result.reason} Você pode seguir sem lembrete e ativar depois em Você.`);
          setBlocked(true);
          return;
        }
      }
      router.push('/onboarding/pronto');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingStep
      step={3}
      title="Quando você quer ser lembrado da sua leitura?"
      subtitle="Um lembrete local, agendado no seu aparelho."
      footer={
        <Button
          title={blocked ? 'Continuar sem lembrete' : 'Continuar'}
          onPress={finish}
          loading={busy}
          testID="reminder-continue"
        />
      }>
      {(['morning', 'afternoon', 'evening'] as const).map((option) => (
        <ChoiceRow
          key={option}
          label={SLOT_LABELS[option]}
          description={formatTime(SLOT_TIMES[option].hour, SLOT_TIMES[option].minute)}
          compact
          selected={slot === option}
          onPress={() => choose(option, SLOT_TIMES[option].hour, SLOT_TIMES[option].minute)}
          testID={`onboarding-reminder-${option}`}
        />
      ))}
      <ChoiceRow
        label={SLOT_LABELS.custom}
        description={formatTime(CUSTOM.hour, CUSTOM.minute)}
        compact
        selected={slot === 'custom'}
        onPress={() => choose('custom', CUSTOM.hour, CUSTOM.minute)}
        testID="onboarding-reminder-custom"
      />
      <ChoiceRow
        label={SLOT_LABELS.none}
        compact
        selected={slot === 'none'}
        onPress={() => choose('none', 7, 0)}
        testID="onboarding-reminder-none"
      />
      {notice ? <AppText variant="caption">{notice}</AppText> : null}
      <AppText variant="caption">Você pode mudar ou desligar o lembrete depois, em Você.</AppText>
    </OnboardingStep>
  );
}
