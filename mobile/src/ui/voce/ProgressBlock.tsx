import { useState } from 'react';
import { View } from 'react-native';

import type { CampaignPhase } from '@/journey/officialDay';

import { AppText, Block, Cap } from '../components';
import { HundredDayRuler } from '../HundredDayRuler';
import { faces, spacing, useTheme } from '../theme';

/**
 * D1 · "MEU PROGRESSO": bloco `surfaceWarm` com o número real de dias lidos
 * (Schibsted 800 44/44) + "de 100 dias lidos" e a régua dos cem dias pintando os
 * dias que a pessoa REALMENTE leu — nunca uma faixa contínua de 1 até N.
 *
 * A largura da régua é medida com `onLayout` dentro do bloco: a largura padrão
 * da régua é a da tela menos a calha, e dentro do padding do bloco ela vazaria.
 */
export function ProgressBlock({
  completedDays,
  totalDays,
  officialDay,
  phase,
}: {
  completedDays: number[];
  totalDays: number;
  officialDay: number;
  phase: CampaignPhase;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const count = completedDays.length;

  // Antes da campanha não há "hoje" nem dia lido na régua (variante de A5).
  // Depois do fim, todo dia não lido fica "em aberto" e nenhum é "hoje": o dia
  // oficial passa do último para a régua não marcar o dia 100 como hoje.
  const inactive = phase === 'before_start';
  const rulerDay = inactive ? 0 : phase === 'finished' ? totalDays + 1 : officialDay;

  return (
    <Block tone="warm" testID="progress-block">
      <View style={{ gap: spacing.md }}>
        <Cap>Meu progresso</Cap>
        <View
          accessible
          accessibilityLabel={`${count} de ${totalDays} dias lidos`}
          style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.sm }}
        >
          {/*
            TELAS D1 dá 44/44 sem tracking: letterSpacing 0. Critério único do
            grupo Você — onde o TELAS não dá tracking, não se inventa um (o −1,6
            da variante display foi pensado para 38px).
          */}
          <AppText
            variant="display"
            style={{ fontFamily: faces.sg800, fontSize: 44, lineHeight: 44, letterSpacing: 0 }}
            testID="progress-count"
          >
            {count}
          </AppText>
          <AppText variant="rowLabel" style={{ color: colors.textMuted }}>
            de {totalDays} dias lidos
          </AppText>
        </View>
        {/* 36 = altura do viewBox da régua (desenho, não texto): reserva o lugar até a medição. */}
        <View
          style={{ minHeight: 36 }}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          testID="progress-ruler-slot"
        >
          {width > 0 ? (
            <HundredDayRuler
              totalDays={totalDays}
              officialDay={rulerDay}
              completed={completedDays}
              variant={inactive ? 'inactive' : phase === 'finished' ? 'finished' : 'default'}
              width={width}
              // A contagem já foi dita logo acima ("N de 100 dias lidos"); a régua
              // diz o que só ela mostra, sem repetir o número.
              accessibilityLabel={
                inactive
                  ? `A jornada de ${totalDays} dias ainda não começou.`
                  : phase === 'finished'
                    ? `Régua dos ${totalDays} dias, jornada encerrada.`
                    : `Régua dos ${totalDays} dias, dia oficial ${officialDay}.`
              }
            />
          ) : null}
        </View>
      </View>
    </Block>
  );
}
