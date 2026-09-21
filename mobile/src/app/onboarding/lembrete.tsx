import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { track } from '@/analytics/analytics';
import {
  cancelDailyReminder,
  formatTime,
  scheduleDailyReminder,
  SLOT_LABELS,
  SLOT_TIMES,
} from '@/reminders/reminders';
import { updateSettings, useSettings, type ReminderSlot } from '@/settings/settingsStore';
import { AppText, Button, ChoiceRow, SAVE_ERROR_COPY } from '@/ui/components';
import { OnboardingStep, StepSupport } from '@/ui/OnboardingStep';

const CUSTOM = { hour: 21, minute: 0 };

type TimedOption = {
  slot: Exclude<ReminderSlot, 'none'>;
  hour: number;
  minute: number;
  /** Rótulo desta tela, quando difere do SLOT_LABELS. Já diz o horário. */
  label?: string;
};

const TIMED: TimedOption[] = [
  { slot: 'morning', ...SLOT_TIMES.morning },
  { slot: 'afternoon', ...SLOT_TIMES.afternoon },
  { slot: 'evening', ...SLOT_TIMES.evening },
  // PROVISÓRIO (pergunta 18 ao designer): não há seletor de hora (seria
  // dependência nova). "Escolher horário" prometia uma escolha que não existe e
  // gravava 21:00 — e, com a permissão pedida no toque, gastava o único diálogo
  // do iOS num horário que a pessoa não escolheu (R4-5). Até o seletor, o
  // rótulo diz o horário que grava de fato.
  { slot: 'custom', ...CUSTOM, label: 'À noite, às 21h' },
];

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
 * PROVISÓRIO (pergunta 18 ao designer): o TELAS só diz "no mesmo molde", sem
 * cópia nem lista de horários. Ficam o título e os horários que o passo já tinha.
 */
export default function ReminderOnboardingScreen() {
  const settings = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  // Trava síncrona: dois toques seguidos não podem abrir dois diálogos do sistema.
  const pending = useRef(false);
  const slot = settings?.reminder.slot ?? 'none';

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
            Um lembrete local, agendado no seu aparelho. Você pode mudar ou desligar depois, em Você.
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
      {TIMED.map((option) => (
        <ChoiceRow
          key={option.slot}
          label={option.label ?? SLOT_LABELS[option.slot]}
          description={option.label ? undefined : formatTime(option.hour, option.minute)}
          selected={slot === option.slot}
          onPress={() => choose(option.slot, option.hour, option.minute)}
          testID={`onboarding-reminder-${option.slot}`}
        />
      ))}
      <ChoiceRow
        label={SLOT_LABELS.none}
        selected={slot === 'none'}
        onPress={() => choose('none', 7, 0)}
        testID="onboarding-reminder-none"
      />
    </OnboardingStep>
  );
}
