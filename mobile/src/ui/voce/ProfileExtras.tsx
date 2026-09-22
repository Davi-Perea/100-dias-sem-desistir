import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { COMMUNITY_ENABLED } from '@/config/features';
import { SettingRow } from '@/ui/components';
import { ModerationEntry } from '@/ui/comunidade/moderacao/ModerationEntry';
import { spacing } from '@/ui/theme';

/**
 * F7 · Ponto de encaixe do perfil para a Comunidade.
 *
 * Com a Comunidade desligada (a V1) não mostra nada. Ligada: o perfil público
 * (foto, nome, ministério, bio), "Minhas publicações" e, só para quem modera,
 * a fila de moderação.
 */
export function ProfileExtras() {
  if (!COMMUNITY_ENABLED) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <SettingRow
        first
        label="Meu perfil na comunidade"
        onPress={() => router.push('/comunidade/perfil' as Href)}
        accessibilityHint="Foto, nome, ministério e bio que aparecem nas suas publicações"
        testID="row-community-profile"
      />
      <SettingRow
        label="Minhas publicações"
        onPress={() => router.push('/comunidade/minhas-publicacoes' as Href)}
        testID="row-my-posts"
      />
      <ModerationEntry />
    </View>
  );
}
