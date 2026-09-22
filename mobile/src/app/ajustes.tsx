import { router } from 'expo-router';

import { isDemoMode } from '@/config/demo';
import { useFasting } from '@/fasting/fastingStore';
import { useJourney } from '@/journey/useJourney';
import { useReflections } from '@/reflections/reflectionsStore';
import { useSettings } from '@/settings/settingsStore';
import { Button, Screen, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SettingsList } from '@/ui/voce/SettingsList';
import { SubScreen } from '@/ui/voce/SubScreen';

/**
 * F7 · Ajustes: a engrenagem do perfil abre aqui a lista que antes era a aba
 * Você (reflexões, anotações, metas, ministério, jejum, lembretes, leitura,
 * sobre, privacidade, ajuda). Todo número é real e local.
 */
export default function SettingsScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const reflections = useReflections(journey.campaign.id);
  const fasting = useFasting(journey.campaign.id);

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  return (
    <SubScreen title="Ajustes" gap={spacing.xl} testID="ajustes">
      <SettingsList settings={settings} reflections={reflections} fasting={fasting} />
      {/* Modo demonstração (config/demo.ts): o app aparece como a pessoa o verá, sem o painel. */}
      {__DEV__ && !isDemoMode() ? (
        <Button title="Painel de desenvolvimento" variant="underline" onPress={() => router.push('/dev')} />
      ) : null}
    </SubScreen>
  );
}
