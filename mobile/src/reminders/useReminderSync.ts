import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getCampaign } from '@/journey/datasetSource';
import { daysForMinistry } from '@/journey/ministries';
import { useSettings } from '@/settings/settingsStore';

import { absenceEnabled, absenceScheduled } from './absencePref';
import {
  simulatedCampaignDay,
  syncAbsenceReminders,
  syncAltarReminders,
  syncDailyReminder,
  syncMinistryReminders,
  type SyncOptions,
} from './reminders';

/** Sincronização de fundo: nunca abre o diálogo de permissão. */
const BACKGROUND: SyncOptions = { requestPermission: false };

/**
 * Mantém os lembretes locais iguais às escolhas da pessoa. As três famílias
 * (leitura diária, véspera do ministério, altar de hoje) são refeitas:
 *  - quando a escolha correspondente muda;
 *  - na abertura e toda vez que o app volta ao primeiro plano. As janelas da
 *    leitura e do altar são rolantes e precisam avançar com o uso (LEM-01,
 *    LEM-04), e quem liga as notificações nos Ajustes do sistema e volta ao app
 *    ainda em memória precisa ver as vésperas agendadas sem reiniciar (LEM-03).
 * Este hook NUNCA pede a permissão do sistema: ele roda sem gesto nenhum. Pedir
 * ali gastaria o único diálogo que o iOS concede, antes de a pessoa saber para
 * quê. Ele agenda o que já está permitido e desiste em silêncio do resto; quem
 * pede é a tela onde a pessoa marcou o lembrete, e é lá que o motivo de uma
 * recusa aparece. As chamadas passam pela fila de `reminders.ts`, uma por vez.
 *
 * Os avisos de ausência (N2) contam a partir da última abertura: são refeitos
 * em TODA abertura e volta ao primeiro plano, e nunca chegam a quem abre o app
 * todo dia. Com dia simulado (demonstração, painel DEV), a leitura diária é
 * agendada a partir de hoje, na data real (N1).
 */
export function useReminderSync() {
  const settings = useSettings();
  const ready = settings !== null;
  const ministry = settings?.ministry ?? null;
  const altarEnabled = settings?.altarReminder ?? false;
  const slot = settings?.reminder.slot ?? 'none';
  const hour = settings?.reminder.hour ?? 0;
  const minute = settings?.reminder.minute ?? 0;
  const dailyOn = slot !== 'none';
  const absenceOn = settings ? absenceEnabled(settings) : false;
  // Muda com o dia do painel DEV; em release é sempre null.
  const devDay = settings?.dev.dayOverride ?? null;

  useEffect(() => {
    if (!ready) return;
    const syncDaily = () =>
      syncDailyReminder(dailyOn ? { hour, minute } : null, getCampaign(), new Date(), BACKGROUND).catch(() => {});
    syncDaily();
    return onForeground(syncDaily);
  }, [ready, dailyOn, hour, minute, devDay]);

  useEffect(() => {
    if (!ready) return;
    const syncMinistry = () =>
      syncMinistryReminders(ministry, daysForMinistry(ministry), getCampaign(), new Date(), BACKGROUND).catch(() => {});
    syncMinistry();
    return onForeground(syncMinistry);
  }, [ready, ministry]);

  useEffect(() => {
    if (!ready) return;
    const syncAltar = () => syncAltarReminders(altarEnabled, getCampaign(), new Date(), BACKGROUND).catch(() => {});
    syncAltar();
    return onForeground(syncAltar);
  }, [ready, altarEnabled]);

  // N2: o lembrete diário já avisa todo dia; com ele ligado, a ausência não agenda.
  const absenceActive = absenceScheduled(absenceOn, dailyOn);
  useEffect(() => {
    if (!ready) return;
    const syncAbsence = () =>
      syncAbsenceReminders(absenceActive, getCampaign(), new Date(), BACKGROUND, simulatedCampaignDay()).catch(
        () => {},
      );
    syncAbsence();
    return onForeground(syncAbsence);
  }, [ready, absenceActive, devDay]);
}

/** Roda `run` sempre que o app volta a ficar ativo; devolve a limpeza do efeito. */
function onForeground(run: () => void): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') run();
  });
  return () => subscription.remove();
}
