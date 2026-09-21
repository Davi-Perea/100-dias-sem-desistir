import { router } from 'expo-router';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

import { AppText, Button } from '../components';
import { HundredDayRuler } from '../HundredDayRuler';
import { spacing, useTheme } from '../theme';
import { FINISHED_NUMERAL, useDisplayNumeral } from './displayNumeral';
import { extensoCap } from './extenso';

/**
 * E5 · campanha encerrada, estado da casa. Todo número vem do aparelho: dias
 * lidos (`completedCount`) e reflexões (`reflectionCount`). Nada fica quebrado
 * depois do dia 100: os dias em aberto continuam abrindo.
 *
 * PROVISÓRIO (sem pergunta própria ao designer — LACUNAS P36): o desenho não diz
 * onde o E5 fica em relação à trilha nem para onde vai "Ver a jornada inteira".
 * Aqui ele é o topo da casa e a trilha continua logo abaixo; o botão expande a
 * trilha (sem reticências — "inteira" é inteira) e rola até o dia 1. Variantes que o desenho não tem: com 100 lidos a frase dos dias em
 * aberto sairia falsa e some; com 0 lidos a primeira frase some; 0 e 1 reflexão
 * ajustam o rótulo do botão.
 */
export function finishedCopy(read: number, total: number): string {
  const parts: string[] = [];
  if (read === 1) parts.push('Um dia na Palavra com a sua igreja.');
  else if (read > 1) parts.push(`${extensoCap(read)} dias na Palavra com a sua igreja.`);
  if (read < total) parts.push('Os dias que ficaram abertos continuam abertos — pode ler quando quiser.');
  return parts.join(' ');
}

export function reflectionsLabel(count: number): string {
  if (count === 0) return 'Minhas reflexões';
  if (count === 1) return 'Minha 1 reflexão';
  return `Minhas ${count} reflexões`;
}

export function CampaignFinished({
  total,
  readDays,
  reflectionCount,
  onSeeJourney,
  onLayout,
}: {
  total: number;
  readDays: number[];
  reflectionCount: number;
  onSeeJourney: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const read = readDays.length;
  // Fonte grande: a política do numeral do marco (ver displayNumeral).
  const numeral = useDisplayNumeral(String(read), FINISHED_NUMERAL);
  return (
    <View onLayout={onLayout} style={{ gap: spacing.xl, paddingBottom: spacing.xl }} testID="after-campaign-card">
      <View style={{ gap: spacing.md }}>
        <AppText variant="cap" accessibilityRole="header" accessibilityLabel={`Jornada encerrada, ${total} dias`}>
          {`Jornada encerrada · ${total} dias`}
        </AppText>
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.sm }}
          onLayout={numeral.onLayout}
          accessible
          accessibilityLabel={`${read} ${read === 1 ? 'dia lido' : 'dias lidos'} de ${total}`}
          testID="finished-count"
        >
          {/* TELAS E5: Schibsted 800 54/52; o tracking não foi dado, fica o do dayNumeral. */}
          <AppText variant="dayNumeral" style={numeral.style} maxFontSizeMultiplier={numeral.maxFontSizeMultiplier}>
            {String(read)}
          </AppText>
          <AppText variant="rowLabel" style={{ color: colors.textMuted }}>
            {`${read === 1 ? 'dia lido' : 'dias lidos'} de ${total}`}
          </AppText>
        </View>
        {/* PROVISÓRIO (pergunta 14 ao designer / LACUNAS P46): "régua com 83%
            preenchido" pintaria 1..83 como lidos para quem leu salteado. A régua
            pinta os dias REALMENTE lidos, e todo dia não lido é "em aberto" — por
            isso a variante 'finished': não há "hoje" depois da campanha. */}
        <HundredDayRuler
          totalDays={total}
          officialDay={total + 1}
          completed={readDays}
          variant="finished"
          accessibilityLabel={`Régua dos ${total} dias. ${read} lidos.`}
        />
        <AppText variant="body">{finishedCopy(read, total)}</AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title="Ver a jornada inteira" onPress={onSeeJourney} testID="finished-see-journey" />
        <Button
          title={reflectionsLabel(reflectionCount)}
          variant="outline"
          onPress={() => router.push('/reflexoes')}
          testID="finished-reflections"
        />
      </View>

      {/* PROVISÓRIO (sem pergunta própria ao designer — LACUNAS P19): cópia literal do
          TELAS; a "próxima jornada" ainda não tem canal de distribuição. */}
      <AppText variant="bodySm">
        A comunidade continua aberta. Quando a igreja marcar a próxima jornada, ela aparece aqui.
      </AppText>
    </View>
  );
}
