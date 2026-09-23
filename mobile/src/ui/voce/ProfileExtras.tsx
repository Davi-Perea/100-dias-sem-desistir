import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { COMMUNITY_ENABLED } from '@/config/features';
import { SettingRow } from '@/ui/components';
import { ModerationEntry } from '@/ui/comunidade/moderacao/ModerationEntry';
import { COMMUNITY_ACCOUNT_ROUTE } from '@/ui/comunidade/perfil/routes';
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
      {/*
        AUDITORIA 2026-09-23, achado 3.2. "Conta e privacidade" é onde se sai da
        comunidade, se revoga o consentimento, se desbloqueia gente e se exclui a
        conta. O único caminho até lá estava dentro do trecho de /conta que só
        desenha para quem entrou com e-mail — e a entrada no Juntos é automática,
        sem e-mail. Resultado: nenhum toque no app chegava à tela, enquanto a
        própria escrita do app mandava a pessoa para ela. Apple 5.1.1(v), política
        de exclusão de dados do Google Play e o direito de revogar consentimento
        da LGPD exigem esse caminho dentro do app. A tela já aceita a conta do
        aparelho; só faltava a porta.
      */}
      <SettingRow
        label="Conta e privacidade"
        onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)}
        accessibilityHint="Sair da comunidade, apagar o que você publicou e excluir sua conta"
        testID="row-community-account"
      />
      <ModerationEntry />
    </View>
  );
}
