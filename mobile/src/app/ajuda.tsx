import { Stack, router } from 'expo-router';
import { View } from 'react-native';

import { contentState } from '@/journey/datasetSource';
import { useDataset } from '@/journey/useJourney';
import { getBibleProvider } from '@/reader/provider';
import { AppText, Cap, DevContentBanner, Rule, Screen, ScreenScroll, SettingRow } from '@/ui/components';
import { spacing } from '@/ui/theme';

/** Ajuda: o que o app faz, o que fica privado e de onde vem o conteúdo. */
export default function HelpScreen() {
  const dataset = useDataset();
  const metadata = getBibleProvider().getMetadata();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Ajuda' }} />
      <ScreenScroll gap={spacing.xl}>
        <DevContentBanner state={contentState()} />

        <View style={{ gap: spacing.md }}>
          <Cap>Como funciona</Cap>
          <AppText variant="body">
            A igreja inteira segue o mesmo dia. O dia oficial não retrocede quando você falta: os dias que
            passaram continuam abertos e os que ainda não chegaram abrem na data.
          </AppText>
          <SettingRow label="Sobre o propósito" onPress={() => router.push('/proposito')} first testID="help-proposito" />
        </View>

        <Rule />

        <View style={{ gap: spacing.md }}>
          <Cap>O que fica só com você</Cap>
          <AppText variant="body">
            Suas reflexões, seu jejum e seu progresso ficam neste aparelho. Nada disso vai para o grupo, para a
            liderança ou para um relatório. Compartilhar um insight, quando existir, será sempre um texto novo,
            escrito por você naquele momento.
          </AppText>
        </View>

        <Rule />

        <View style={{ gap: spacing.md }}>
          <Cap>Conteúdo e direitos</Cap>
          <AppText variant="body">
            Fonte editorial: {dataset.provenance.source_name}. Situação dos direitos:{' '}
            {dataset.provenance.rights_status}.
          </AppText>
          <AppText variant="caption">{metadata.copyrightNotice}</AppText>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
