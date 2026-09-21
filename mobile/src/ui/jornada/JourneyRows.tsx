import type { ReactNode } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { AppText, JourneyNode, type JourneyNodeState } from '../components';
import { Icon } from '../icons';
import { BRAND_YELLOW, faces, spacing, useTheme } from '../theme';
import {
  GAP_ROW_PAD,
  LINE_GAP,
  OPEN_ROW_PAD,
  ROW_PAD,
} from '@/journey/journeyRowHeight';

/**
 * Peças da lista da Jornada (A1): o trilho, a linha de dia e a reticência.
 *
 * Trilho (TOKENS §5): coluna de 20 com a linha de 2px — CHEIA em `text` acima de
 * hoje, PONTILHADA em `borderStrong` abaixo (traço 4, intervalo 5). É a linha
 * que carrega o progresso; o nó mostra o estado por FORMA, nunca só por cor.
 */

export const RAIL_W = 20;
/** Espaço entre a coluna do trilho e o rótulo (TELAS A1, "gap 14"). */
export const RAIL_GAP = 14;

export type RailKind = 'solid' | 'dotted' | 'none';

/** Um trecho do trilho que ocupa o espaço livre da coluna (acima ou abaixo do nó). */
export function RailSegment({ kind, height }: { kind: RailKind; height?: number }) {
  const { colors } = useTheme();
  const size = height === undefined ? { flex: 1 } : { height };
  if (kind === 'none') return <View style={[{ width: 2 }, size]} />;
  if (kind === 'solid') return <View style={[{ width: 2, backgroundColor: colors.text }, size]} />;
  return (
    <View style={[{ width: 2 }, size]}>
      <Svg width={2} height="100%" style={StyleSheet.absoluteFill}>
        <Line x1={1} y1={0} x2={1} y2="100%" stroke={colors.borderStrong} strokeWidth={2} strokeDasharray="4 5" />
      </Svg>
    </View>
  );
}

export type DayRowKind = 'done' | 'open' | 'future';

const NODE: Record<DayRowKind, JourneyNodeState> = { done: 'done', open: 'open', future: 'future' };

/**
 * Linha de dia passado, em aberto ou futuro.
 *
 *   passado · "Dia 15 · Economia" Schibsted 600 15/20, "Concluído" 500 12,5/17 em `textMuted`
 *   em aberto · fundo `blueSoft` raio 14, recuo de −6; rótulo em 700; "Em aberto" 700 em `blue` + "›"
 *   futuro · rótulo em `textMuted`, "Em breve"; nenhum conteúdo do dia
 *
 * `minHeight` é o número que a lista declara no `getItemLayout` (quem calcula é
 * `journeyRowHeight`, não esta peça).
 */
export function DayRow({
  day,
  kind,
  label,
  status,
  top,
  bottom,
  minHeight,
  stacked,
  ministry,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLayout,
}: {
  day: number;
  kind: DayRowKind;
  label: string;
  status: string;
  top: RailKind;
  bottom: RailKind;
  minHeight: number;
  stacked: boolean;
  ministry: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const open = kind === 'open';
  const labelColor = kind === 'future' ? colors.textMuted : colors.text;
  const statusColor = open ? colors.blue : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={`journey-day-${day}`}
      style={({ pressed }) => [
        { flexDirection: 'row', gap: RAIL_GAP, minHeight },
        open && {
          backgroundColor: colors.blueSoft,
          borderRadius: 14,
          marginLeft: -6,
          paddingLeft: 6,
          paddingRight: 10,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <View style={{ width: RAIL_W, alignItems: 'center' }}>
        <RailSegment kind={top} />
        <JourneyNode state={NODE[kind]} />
        <RailSegment kind={bottom} />
      </View>

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingVertical: open ? OPEN_ROW_PAD : ROW_PAD,
          gap: LINE_GAP,
        }}
      >
        <View
          style={
            stacked
              ? { gap: LINE_GAP }
              : { flexDirection: 'row', alignItems: 'center', gap: spacing.md }
          }
        >
          <AppText
            variant="rowLabel"
            style={[
              { color: labelColor },
              open && { fontFamily: faces.sg700 },
              stacked ? null : { flex: 1 },
            ]}
          >
            {label}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <AppText
              variant="captionStrong"
              style={{ color: statusColor, fontFamily: open ? faces.sg700 : faces.sg500 }}
            >
              {status}
            </AppText>
            {open ? (
              <AppText variant="captionStrong" style={{ color: colors.blue }} aria-hidden>
                ›
              </AppText>
            ) : null}
          </View>
        </View>
        {ministry ? <MinistryNote day={day} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * PROVISÓRIO (LACUNAS P14, sem pergunta própria ao designer): o A1 não diz se o marcador
 * "Seu ministério conduz o altar" sai da Jornada. Ele é a única função visível de
 * "Meu ministério" além do aviso, então continua, como no app de hoje. O amarelo
 * só acompanha: quem carrega a informação é o texto.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: a escala é o que permite ao
 * ministério se preparar): nas linhas FUTURAS o marcador também aparece (e é dito
 * no rótulo acessível). Isso contraria conscientemente o A1.5 ("nenhum conteúdo
 * do dia aparece"): o monte, a ênfase e a leitura do dia futuro continuam
 * escondidos; só a escala do altar, que a igreja já divulga com antecedência,
 * fica à vista. Precisa entrar na lista de perguntas ao designer.
 */
function MinistryNote({ day }: { day: number }) {
  return (
    <View testID={`journey-ministry-${day}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View aria-hidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_YELLOW }} />
      <AppText variant="caption" style={{ flexShrink: 1 }}>
        Seu ministério conduz o altar
      </AppText>
    </View>
  );
}

/**
 * Reticência de um trecho comprimido, clicável para expandir.
 *
 * PROVISÓRIO (LACUNAS P14, sem pergunta própria ao designer): o A1 mostra as
 * linhas uma a uma e não diz se a compressão de trechos longos continua. Ela
 * continua, como no app de hoje — 100 linhas seguidas não são navegáveis —, com
 * o trilho passando por ela.
 */
export function GapRow({
  from,
  to,
  rail,
  minHeight,
  onPress,
  onLayout,
}: {
  from: number;
  to: number;
  rail: RailKind;
  minHeight: number;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const count = to - from + 1;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={`Mostrar os dias ${from} a ${to}`}
      testID={`journey-gap-${from}`}
      style={({ pressed }) => [{ flexDirection: 'row', gap: RAIL_GAP, minHeight }, pressed && { opacity: 0.72 }]}
    >
      <View style={{ width: RAIL_W, alignItems: 'center' }}>
        <RailSegment kind={rail} />
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: GAP_ROW_PAD,
        }}
      >
        <AppText variant="caption">{count === 1 ? '1 dia' : `${count} dias`}</AppText>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/**
 * Recuo do nó de hoje antes da primeira medida da cap: recuo de 4 do painel +
 * borda de 1 do Block + padding 16 + meia cap (7) − meio nó (10) = 18.
 */
export const TODAY_NODE_OFFSET = 18;

/**
 * Linha que abriga o painel de hoje: nó de 20 à altura da cap, trilho cheio acima
 * e pontilhado abaixo. A cap cresce com o Dynamic Type, então o recuo do nó vem da
 * MEDIDA da cap (`nodeOffset`, calculado pela casa com `todayNodeOffset`), não de
 * uma constante amarrada a uma caixa de texto (REGRAS 26).
 */
export function TodayRow({
  day,
  top,
  bottom,
  children,
  nodeOffset = TODAY_NODE_OFFSET,
  onLayout,
}: {
  day: number;
  top: RailKind;
  bottom: RailKind;
  children: ReactNode;
  nodeOffset?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View testID={`journey-day-${day}`} onLayout={onLayout} style={{ flexDirection: 'row', gap: RAIL_GAP }}>
      <View style={{ width: RAIL_W, alignItems: 'center' }}>
        <RailSegment kind={top} height={nodeOffset} />
        <JourneyNode state="today" />
        <RailSegment kind={bottom} />
      </View>
      {/* TELAS A1: recuo de 4 no topo e 10 embaixo. */}
      <View style={{ flex: 1, marginTop: TODAY_PANEL_TOP, marginBottom: 10 }}>{children}</View>
    </View>
  );
}

/** Recuo do painel dentro da linha de hoje (TELAS A1). */
const TODAY_PANEL_TOP = 4;
/** Nó de hoje: 20 de diâmetro (TOKENS §5). */
const TODAY_NODE = 20;

/**
 * Recuo do nó a partir da medida da cap: `capY` é a posição da cap dentro do
 * painel (o `onLayout` do Yoga já conta a borda e o padding do Block) e
 * `capHeight` a altura dela. O nó centra na cap, qualquer que seja a fonte.
 */
export function todayNodeOffset(capY: number, capHeight: number): number {
  return Math.max(0, Math.round(TODAY_PANEL_TOP + capY + capHeight / 2 - TODAY_NODE / 2));
}

/**
 * Linha recolhida dos dias anteriores, no topo da trilha: "Mostrar dias
 * anteriores · N em aberto" (ou só "Mostrar dias anteriores" sem nenhum em
 * aberto). Um toque expande a trilha inteira.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: pedido do fundador — os dias em
 * aberto aparecem, mas o destaque é hoje): acima de hoje ficam só os três dias
 * mais recentes; o resto mora aqui. Mesma caixa da reticência (`GapRow`, piso 48,
 * paddingVertical 8, texto 13/18), para a altura declarada ser a mesma; quebra
 * de linha em fonte grande é medida pela casa.
 */
export function EarlierDaysRow({
  to,
  openCount,
  minHeight,
  onPress,
  onLayout,
}: {
  to: number;
  openCount: number;
  minHeight: number;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const label = openCount > 0 ? `Mostrar dias anteriores · ${openCount} em aberto` : 'Mostrar dias anteriores';
  const spoken =
    openCount === 0
      ? `Mostrar dias anteriores, do Dia 1 ao Dia ${to}`
      : `Mostrar dias anteriores, do Dia 1 ao Dia ${to}. ${openCount === 1 ? '1 dia em aberto' : `${openCount} dias em aberto`}`;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      testID="journey-gap-1"
      style={({ pressed }) => [{ flexDirection: 'row', gap: RAIL_GAP, minHeight }, pressed && { opacity: 0.72 }]}
    >
      <View style={{ width: RAIL_W, alignItems: 'center' }}>
        <RailSegment kind="none" />
        <RailSegment kind="solid" />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: GAP_ROW_PAD }}>
        <AppText
          variant="caption"
          style={[{ flexShrink: 1 }, openCount > 0 ? { color: colors.blue, fontFamily: faces.sg700 } : null]}
        >
          {label}
        </AppText>
        <Icon name="chevron-down" size={16} color={openCount > 0 ? colors.blue : colors.textMuted} />
      </View>
    </Pressable>
  );
}
