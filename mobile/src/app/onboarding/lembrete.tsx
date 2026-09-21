import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { track } from '@/analytics/analytics';
import { cancelDailyReminder, scheduleDailyReminder } from '@/reminders/reminders';
import { DEFAULT_SETTINGS, updateSettings, useSettings, type ReminderSlot } from '@/settings/settingsStore';
import { AppText, Button, SAVE_ERROR_COPY } from '@/ui/components';
import { ReminderTimePicker } from '@/ui/lembrete/ReminderTimePicker';
import { OnboardingStep, StepSupport } from '@/ui/OnboardingStep';

const LATER = 'Você pode seguir sem lembrete e ativar depois em Você.';
/**
 * O motivo de recusa do reminders.ts já traz "Você pode ativar nos ajustes do
 * sistema."; somado ao LATER, o aviso se repetia e se contradizia (R4-13).
 */
const DENIED_NOTICE = `Permissão de notificações negada. ${LATER}`;

/**
 * Passo 3 de 3 · lembrete, no molde do F2. É o ÚLTIMO passo: o "Continuar"
 * daqui faz o que a antiga tela "Tudo pronto" fazia — grava
 * `onboardingCompleted`, dispara `onboarding_completed` e abre a casa.
 *
 * É o ÚNICO lugar do onboarding que pede a permissão de notificação, e só no
 * gesto de escolher um horário (REGRAS 13): o iOS mostra o diálogo uma vez na
 * vida do app. Recusa DESFAZ a preferência — volta a "Sem lembrete", diz o
 * motivo e o botão passa a "Continuar sem lembrete" (TELAS D3) — em vez de
 * prometer um aviso que não vem. Nada aqui prende a pessoa: o lembrete é
 * opcional e "Continuar" funciona sempre.
 *
 * O horário é o seletor único (ReminderTimePicker, o mesmo da tela
 * Lembretes, pedido do fundador em 2026-09-21): horários prontos ou o do seletor
 * do sistema. Isso resolve a pergunta 18 ao designer (não havia seletor de hora).
 */
export default function ReminderOnboardingScreen() {
  const settings = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  // Trava síncrona: dois toques seguidos não podem abrir dois diálogos do sistema.
  const pending = useRef(false);

  const choose = async (next: ReminderSlot, hour: number, minute: number) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (next === 'none') {
        await cancelDailyReminder();
        await updateSettings((s) => ({ ...s, reminder: { ...s.reminder, slot: 'none' } }));
        return;
      }
      const result = await scheduleDailyReminder(hour, minute);
      if (!result.ok) {
        await updateSettings((s) => ({ ...s, reminder: { slot: 'none', hour, minute } }));
        setDenied(true);
        setNotice(
          result.reason.startsWith('Permissão de notificações negada') ? DENIED_NOTICE : `${result.reason} ${LATER}`,
        );
        return;
      }
      await updateSettings((s) => ({ ...s, reminder: { slot: next, hour, minute } }));
      setDenied(false);
    } catch {
      // Agendamento que estoura (cota do sistema, canal removido) não pode
      // sumir em silêncio nem deixar a preferência prometendo um aviso (R4-13).
      await cancelDailyReminder().catch(() => undefined);
      await updateSettings((s) => ({ ...s, reminder: { ...s.reminder, slot: 'none' } })).catch(() => undefined);
      setDenied(true);
      setNotice(`Não deu para agendar o lembrete agora. ${LATER}`);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const finish = async () => {
    if (settings) {
      // Jejum nunca entra em analytics (PER-06): é prática religiosa, dado
      // sensível pela LGPD art. 5º, II.
      track({
        name: 'onboarding_completed',
        readingMode: settings.readingMode ?? 'unset',
        reminder: settings.reminder.slot,
      });
    }
    try {
      await updateSettings((s) => ({ ...s, onboardingCompleted: true }));
    } catch {
      // PER-02: sem gravar, o portão traria a pessoa de volta; fica aqui com o aviso.
      setNotice(SAVE_ERROR_COPY);
      return;
    }
    router.replace('/');
  };

  return (
    <OnboardingStep
      step={3}
      title="Quando você quer ser lembrado da sua leitura?"
      support={
        <>
          {notice ? (
            <AppText
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID="reminder-notice"
            >
              {notice}
            </AppText>
          ) : null}
          <StepSupport testID="reminder-support">
            Todo dia, no horário escolhido, chega “Hora de ler a Bíblia” com a leitura do dia. É um lembrete local,
            agendado no seu aparelho. Você pode mudar ou desligar depois, em Você.
          </StepSupport>
        </>
      }
      footer={
        <Button
          title={denied ? 'Continuar sem lembrete' : 'Continuar'}
          onPress={finish}
          disabled={busy}
          testID="reminder-continue"
        />
      }
    >
      <ReminderTimePicker
        current={settings?.reminder ?? DEFAULT_SETTINGS.reminder}
        onChoose={(choice) => choose(choice.slot, choice.hour, choice.minute)}
        disabled={busy}
        testIDPrefix="onboarding-reminder"
      />
    </OnboardingStep>
  );
}
