import { View } from 'react-native';

import { SkeletonBlock, SkeletonPanel, LoadingCaption } from './components';
import { radius, spacing } from './theme';

/**
 * F3 · Carregando. Esqueleto na forma do conteúdo, não roda girando.
 *
 * Os primitivos (SkeletonBlock, SkeletonPanel, LoadingCaption) moram em
 * components.tsx, porque o StateView também os usa; daqui eles são reexportados
 * para quem já importava deste arquivo.
 */
export { LoadingCaption, SkeletonBlock, SkeletonPanel };

/** Linha de dia do esqueleto: coluna de trilho de 20 com o nó, rótulo, estado à direita. */
function SkeletonDayRow({ node }: { node: number }) {
  return (
    <View aria-hidden style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 20, alignItems: 'center' }}>
        <SkeletonBlock width={node} height={node} radius={node / 2} />
      </View>
      <View style={{ flex: 1 }}>
        <SkeletonBlock width="55%" height={14} />
      </View>
      <SkeletonBlock width={64} height={12} />
    </View>
  );
}

/**
 * F3 · o esqueleto do painel de hoje (A1): a linha de dia, o nó de hoje, e o
 * bloco com os QUATRO retângulos que o F3 enumera — numeral, pílula, ênfase e
 * botão. Nada além disso: retângulo a mais é desenho inventado.
 *
 * PROVISÓRIO (pergunta 13 ao designer / LACUNAS P42): o esqueleto só tem medida
 * no HTML, que não está no repositório. As alturas saem das variantes que cada
 * retângulo substitui (numeral 54, pílula 30, ênfase 28, botão 56); as larguras
 * são proporções razoáveis e não do desenho. O F3 põe a linha de dia "sobre
 * surfaceWarm"; aqui ela fica sobre o fundo da PÁGINA, como a linha de dia real
 * da Jornada, e só o painel é quente. Se o F3 pinta a tela inteira de
 * `surfaceWarm`, quem usa passa o fundo na tela.
 */
export function TodaySkeleton({ testID = 'today-skeleton' }: { testID?: string }) {
  return (
    <View testID={testID} style={{ gap: spacing.lg }}>
      <View aria-hidden style={{ gap: 0 }}>
        <SkeletonDayRow node={13} />
      </View>
      <View aria-hidden style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 20, alignItems: 'center', paddingTop: 4 }}>
          <SkeletonBlock width={20} height={20} radius={10} testID="skeleton-today-node" />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonPanel testID="skeleton-today-panel">
            <SkeletonBlock width="55%" height={54} radius={10} testID="skeleton-numeral" />
            <SkeletonBlock width={96} height={30} radius={radius.pill} testID="skeleton-pill" />
            <SkeletonBlock width="100%" height={28} testID="skeleton-emphasis" />
            <SkeletonBlock width="100%" height={56} radius={radius.button} testID="skeleton-button" />
          </SkeletonPanel>
        </View>
      </View>
      <LoadingCaption />
    </View>
  );
}
