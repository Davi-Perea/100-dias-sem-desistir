import { router } from 'expo-router';
import { View } from 'react-native';

import { isDemoMode } from '@/config/demo';
import { useFasting } from '@/fasting/fastingStore';
import { useDataset, useJourney } from '@/journey/useJourney';
import { useReflections } from '@/reflections/reflectionsStore';
import { useSettings } from '@/settings/settingsStore';
import { AppText, Button, Screen, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SettingsList } from '@/ui/voce/SettingsList';
import { SubScreen } from '@/ui/voce/SubScreen';

/**
 * A pendência de autorização da igreja, em uma linha discreta e em um lugar só.
 *
 * Substitui (2026-09-22, feedback do fundador na prévia do Dia 23) a faixa que
 * aparecia em cima de TODA tela com conteúdo real. Regras desta linha:
 *
 * - aparece só em `pending_authorization`. Vira `authorized` no dataset e ela
 *   some sozinha, sem ninguém mexer em tela;
 * - é informação, não alarme: sem faixa amarela, sem ícone de alerta, sem
 *   `accessibilityRole="alert"` — quem abre Ajustes não está sendo avisado de um
 *   problema dele;
 * - não é a trava de publicação. A trava é o build: `assertRightsForStore`
 *   (app.config.ts) recusa a variante de loja e `assertProductionReady` derruba
 *   um release na abertura. Esta linha não muda nada disso.
 *
 * O valor técnico (`pending_authorization`) nunca aparece escrito (F5/REGRAS).
 */
function PendingAuthorizationNote() {
  const dataset = useDataset();
  if (dataset.provenance.rights_status !== 'pending_authorization') return null;
  return (
    <View style={{ gap: spacing.xs }} testID="rights-pending-note">
      <AppText variant="bodySm">Conteúdo aguardando autorização da igreja</AppText>
      <AppText variant="caption">
        O guia dos 100 Dias é material da igreja. Esta versão do app ainda não foi autorizada por escrito
        para publicação, e por isso não deve ser distribuída.
      </AppText>
    </View>
  );
}

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
      {/* Fim da lista: a pendência de direitos é rodapé de Ajustes, não manchete de tela. */}
      <PendingAuthorizationNote />
      {/* Modo demonstração (config/demo.ts): o app aparece como a pessoa o verá, sem o painel. */}
      {__DEV__ && !isDemoMode() ? (
        <Button title="Painel de desenvolvimento" variant="underline" onPress={() => router.push('/dev')} />
      ) : null}
    </SubScreen>
  );
}
