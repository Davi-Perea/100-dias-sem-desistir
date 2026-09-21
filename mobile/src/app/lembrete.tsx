import * as Device from 'expo-device';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useJourney } from '@/journey/useJourney';
import {
  cancelDailyReminder,
  formatTime,
  isReminderSupported,
  listScheduledReminders,
  scheduleDailyReminder,
  scheduleTestNotification,
  syncAltarReminders,
} from '@/reminders/reminders';
import { updateSettings, useSettings, type ReminderSlot } from '@/settings/settingsStore';
import { AppText, Block, Button, Cap, SAVE_ERROR_COPY, Screen, StateView } from '@/ui/components';
import { ReminderTimePicker } from '@/ui/lembrete/ReminderTimePicker';
import { spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';
import { SubScreen } from '@/ui/voce/SubScreen';
import { ToggleRow } from '@/ui/voce/ToggleRow';

/**
 * Lembretes (D1 → aqui): a leitura diária e o aviso do altar das 12h30.
 * Notificações locais, sem conta e sem rede.
 *
 * PROVISÓRIO (pergunta 12 ao designer): tela não desenhada. O horário é o
 * seletor único (`ReminderTimePicker`, o mesmo do onboarding): horários prontos
 * ou o do seletor do sistema, e todo dia da campanha chega "Hora de ler a
 * Bíblia". A permissão do sistema só é pedida no gesto de escolher um horário
 * (REGRAS 13); recusa volta para "Sem lembrete".
 */
export default function ReminderScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const journey = useJourney();
  const [status, setStatus] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [altarNotice, setAltarNotice] = useState<string | null>(null);
  const supported = isReminderSupported();

  // A contagem de agendamentos é ferramenta de conferência: só em __DEV__.
  const refresh = useCallback(async () => {
    if (!__DEV__) return;
    setScheduled((await listScheduledReminders()).length);
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
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

  // Mostra o resultado e, no iOS (sem live region), anuncia ao leitor de tela.
  const report = (message: string) => {
    setStatus(message);
    announceNotice(message);
  };

  const apply = async (slot: ReminderSlot, hour: number, minute: number) => {
    setBusy(true);
    try {
      if (slot === 'none') {
        await cancelDailyReminder();
        await updateSettings((s) => ({ ...s, reminder: { slot: 'none', hour, minute } }));
        report('Lembrete desativado.');
      } else {
        const result = await scheduleDailyReminder(hour, minute);
        if (!result.ok) {
          await updateSettings((s) => ({ ...s, reminder: { slot: 'none', hour, minute } }));
          report(result.reason);
        } else {
          await updateSettings((s) => ({ ...s, reminder: { slot, hour, minute } }));
          // Com a campanha encerrada o agendador não marca nada (não há dia a
          // lembrar): dizer "Lembrete diário às HH:MM" seria falso.
          // PROVISÓRIO (decisão do engenheiro, 2026-09-21: cópia sem desenho).
          report(
            journey.phase === 'finished'
              ? 'A jornada terminou; não há leituras a lembrar.'
              : `Todo dia às ${formatTime(hour, minute)} chega: Hora de ler a Bíblia.`,
          );
        }
      }
      await refresh();
    } catch {
      // PER-02: a preferência não gravou; o aviso fica logo abaixo dos horários.
      report(SAVE_ERROR_COPY);
    } finally {
      setBusy(false);
    }
  };

  const current = settings.reminder;

  // Aviso do altar das 12h30 (veio do Você, 2026-09-21). PER-02: se o disco
  // recusar, nada mudou; o aviso diz isso logo abaixo da caixa.
  const toggleAltarReminder = () => applyAltarReminder().catch(() => setAltarNotice(SAVE_ERROR_COPY));

  const applyAltarReminder = async () => {
    if (settings.altarReminder) {
      setAltarNotice(null);
      await updateSettings((s) => ({ ...s, altarReminder: false }));
      return;
    }
    await updateSettings((s) => ({ ...s, altarReminder: true }));
    // Aqui existe o gesto: a pessoa acabou de marcar a caixa. Só um gesto pode
    // abrir o diálogo de permissão do sistema (REGRAS 13).
    const result = await syncAltarReminders(true, journey.campaign, new Date(), { requestPermission: true });
    if (result.ok) {
      setAltarNotice(null);
      return;
    }
    // Web e permissão negada: o motivo aparece e a preferência volta a
    // "desligado", porque nada foi agendado.
    setAltarNotice(result.reason);
    await updateSettings((s) => ({ ...s, altarReminder: false }));
  };

  return (
    <SubScreen title="Lembretes" gap={spacing.lg}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="blockTitle" accessibilityRole="header">Quando você quer ser lembrado?</AppText>
        <AppText variant="bodySm">
          Notificação local, agendada no seu aparelho. Não depende de conta nem de conexão.
        </AppText>
      </View>

      {!supported ? (
        <Block tone="muted">
          <AppText variant="caption">
            Notificações locais não são suportadas na web. Teste em um aparelho iOS ou Android.
          </AppText>
        </Block>
      ) : null}
      {supported && !Device.isDevice ? (
        <Block tone="muted">
          <AppText variant="caption">Emuladores podem não exibir notificações. Prefira um aparelho físico.</AppText>
        </Block>
      ) : null}

      <ReminderTimePicker
        current={current}
        onChoose={(choice) => apply(choice.slot, choice.hour, choice.minute)}
        disabled={busy}
        testIDPrefix="reminder"
      />

      {status ? (
        // Tinta, não amarelo: o amarelo sobre branco mede 1,46:1, e este texto
        // inclui o motivo de uma permissão negada — a pessoa precisa conseguir lê-lo.
        <AppText variant="rowLabel" accessibilityLiveRegion="polite" style={{ color: colors.text }}>
          {status}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Cap>Altar</Cap>
        <ToggleRow
          label="Aviso do altar das 12h30"
          caption="Um aviso local por dia, antes do altar. Só neste aparelho."
          checked={settings.altarReminder}
          onToggle={toggleAltarReminder}
          notice={altarNotice}
          first
          testID="altar-reminder-toggle"
          noticeTestID="altar-reminder-notice"
        />
      </View>

      {/*
        A contagem de agendamentos e o teste de 5 s são ferramenta de conferência
        técnica (LACUNAS P31; o F5 pede nenhuma informação técnica na tela): só
        aparecem em __DEV__, nunca na build de release.
      */}
      {__DEV__ ? (
        <Block tone="muted" testID="reminder-dev-tools">
          <View style={{ gap: spacing.sm }}>
            <AppText variant="caption">{scheduled} agendamento(s) ativo(s) no sistema.</AppText>
            <Button
              title="Testar agora (5 s)"
              variant="underline"
              disabled={!supported || busy}
              onPress={async () => {
                const result = await scheduleTestNotification(5);
                report(result.ok ? 'Notificação de teste em 5 segundos.' : result.reason);
                await refresh();
              }}
            />
          </View>
        </Block>
      ) : null}
    </SubScreen>
  );
}
