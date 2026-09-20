import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getCampaign } from '@/journey/datasetSource';
import { daysForMinistry } from '@/journey/ministries';
import { useSettings } from '@/settings/settingsStore';

import { syncAltarReminders, syncMinistryReminders } from './reminders';

/**
 * Mantém os lembretes locais iguais às escolhas da pessoa:
 *  - mudou o ministério → refaz as vésperas;
 *  - ligou/desligou o altar de hoje, ou o app voltou ao primeiro plano → refaz a
 *    janela rolante (ela só cobre 14 dias, então precisa avançar com o uso).
 * Falhas (web, permissão negada) são silenciosas aqui: as telas que ligam o
 * lembrete já mostram o motivo na hora da escolha.
 */
export function useReminderSync() {
  const settings = useSettings();
  const ready = settings !== null;
  const ministry = settings?.ministry ?? null;
  const altarEnabled = settings?.altarReminder ?? false;

  useEffect(() => {
    if (!ready) return;
    const campaign = getCampaign();
    syncMinistryReminders(ministry, daysForMinistry(ministry), campaign, new Date()).catch(() => {});
  }, [ready, ministry]);

  useEffect(() => {
    if (!ready) return;
    const run = () => syncAltarReminders(altarEnabled, getCampaign(), new Date()).catch(() => {});
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [ready, altarEnabled]);
}
