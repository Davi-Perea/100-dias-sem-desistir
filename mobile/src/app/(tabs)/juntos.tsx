import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useJourney } from '@/journey/useJourney';
import { AppText, Card, DevContentBanner, Screen, ScreenScroll, StateView } from '@/ui/components';
import { iconSize, spacing, useTheme } from '@/ui/theme';

/**
 * Aba Juntos (spec §16). Nesta execução a camada comunitária ainda NÃO existe:
 * grupos, insights, reações e presença dependem de conta e backend, que são de
 * execuções seguintes. A tela diz isso em vez de simular números ou grupos.
 */
export default function TogetherScreen() {
  const { colors } = useTheme();
  const journey = useJourney();

  if (!journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenScroll>
        {journey.isDevContent ? <DevContentBanner compact /> : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="eyebrow">A igreja</AppText>
          <AppText variant="title">
            {journey.phase === 'before_start'
              ? 'A jornada começa em breve'
              : `Dia ${journey.officialDay} de ${journey.campaign.total_days}`}
          </AppText>
          <AppText variant="secondary">
            Toda a igreja caminha no mesmo dia da jornada, calculado a partir da data de início da campanha.
          </AppText>
        </View>

        <Card tone="muted">
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <Ionicons name="people-outline" size={iconSize.md} color={colors.textMuted} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <AppText style={{ fontWeight: '600' }}>A comunidade chega depois</AppText>
              <AppText variant="muted">
                Grupos, direção do ministério, insights e presença dos outros participantes fazem parte do produto, mas
                ainda não estão nesta versão.
              </AppText>
            </View>
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">Enquanto isso</AppText>
            <AppText variant="muted">
              Sua jornada pessoal funciona por completo e sem conexão: leitura, progresso, jejum e reflexão privada
              ficam guardados apenas neste aparelho.
            </AppText>
          </View>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}
