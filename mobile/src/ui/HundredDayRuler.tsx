import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { BRAND_YELLOW, useRulerWidth, useTheme } from './theme';

/**
 * A régua dos 100 dias — assinatura do produto, gerada por código.
 *
 * Geometria do handoff, preservada exatamente:
 *   viewBox `0 0 W 40` · `x(i) = 3 + (i-1) * ((W-6)/99)`
 *
 * A informação está na FORMA de cada traço, não só na cor: hoje é o traço mais
 * alto de todos, em aberto ganha um círculo no topo, futuro é curto e baixo.
 * Isso é o que faz a régua sobreviver a daltonismo e a fundo amarelo.
 */
export type RulerVariant =
  /** Início e estados: faixa amarela + tinta. */
  | 'default'
  /** Antes da campanha: tudo cinza, sem faixa. */
  | 'inactive'
  /** Marco (fundo amarelo): traços pretos, sem faixa. */
  | 'onYellow'
  /** Dia 100 (fundo preto): traços amarelos, sem faixa. */
  | 'onInk';

type Props = {
  totalDays: number;
  /** Dia oficial da campanha; 0 antes do início. */
  officialDay: number;
  /** Dias já concluídos. */
  completed: ReadonlySet<number> | number[];
  variant?: RulerVariant;
  /** Largura útil; por padrão acompanha a calha da tela. */
  width?: number;
  /** Descrição para leitor de tela. A régua é densa demais para ser lida traço a traço. */
  accessibilityLabel?: string;
};

const VIEW_H = 40;

export function HundredDayRuler({
  totalDays,
  officialDay,
  completed,
  variant = 'default',
  width,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const measured = useRulerWidth();
  const W = Math.round(width ?? measured);
  const done = completed instanceof Set ? completed : new Set(completed);

  const step = (W - 6) / (totalDays - 1);
  const x = (i: number) => 3 + (i - 1) * step;

  const inkTick =
    variant === 'onInk' ? BRAND_YELLOW : variant === 'inactive' ? colors.borderStrong : colors.text;
  const futureTick = variant === 'onInk' ? 'rgba(255,209,0,0.30)' : colors.borderStrong;
  const bandVisible = variant === 'default' && officialDay >= 1;
  const openFill = variant === 'onInk' ? '#111111' : colors.surface;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ??
        `Régua dos ${totalDays} dias. ${done.size} concluídos, dia oficial ${officialDay}.`
      }
    >
      <Svg width={W} height={VIEW_H} viewBox={`0 0 ${W} ${VIEW_H}`}>
        {bandVisible ? (
          <Rect x={0} y={5} width={Math.min(W, x(officialDay) + 3)} height={30} rx={2} fill={BRAND_YELLOW} />
        ) : null}

        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const cx = x(day);
          // "Percorrido" é sempre o que a PESSOA leu, nunca o que o calendário
          // já passou: a tela de marco celebra a contagem dela, e pintar 1..N
          // como lidos mentiria para quem entrou atrasado. Antes da campanha
          // nada está percorrido, então tudo cai no traço de futuro.
          const isDone = variant === 'inactive' ? false : done.has(day);
          const isToday = variant === 'default' && day === officialDay && !isDone;
          const isOpen = variant === 'default' && day < officialDay && !isDone;

          if (isDone) {
            return <Line key={day} x1={cx} y1={11} x2={cx} y2={29} stroke={inkTick} strokeWidth={2} />;
          }
          if (isToday) {
            // O traço mais alto da régua: "hoje" se acha sem depender de cor.
            return <Line key={day} x1={cx} y1={2} x2={cx} y2={38} stroke={inkTick} strokeWidth={3} />;
          }
          if (isOpen) {
            return (
              <G key={day}>
                <Line x1={cx} y1={17} x2={cx} y2={29} stroke={inkTick} strokeWidth={1.6} />
                <Circle cx={cx} cy={13.4} r={2.6} fill={openFill} stroke={inkTick} strokeWidth={1.4} />
              </G>
            );
          }
          return <Line key={day} x1={cx} y1={15} x2={cx} y2={25} stroke={futureTick} strokeWidth={1.6} />;
        })}
      </Svg>
    </View>
  );
}
