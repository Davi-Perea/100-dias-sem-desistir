import { View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';

import { BRAND_YELLOW, useRulerWidth, useTheme } from './theme';

/**
 * A régua dos cem dias — assinatura do produto, gerada por código.
 *
 * Geometria do TOKENS §5: viewBox `0 0 W 36`, `x(i) = 3 + (i-1) * ((W-6)/99)`.
 * Traço lido 2,2px em amarelo, altura 16; futuro 1,6px em `borderStrong`, altura
 * 10; hoje 3px em tinta, altura cheia, raio 2.
 *
 * O amarelo mede ~1,4:1 contra a trilha. Isso só é aceitável porque ele nunca
 * carrega o dado sozinho: a altura e a forma de cada traço diferenciam, e há
 * sempre rótulo em texto ao lado. Se em algum lugar o amarelo virar o único
 * sinal, deixa de ser aceitável.
 */
export type RulerVariant =
  /** Jornada, Você, encerrada: amarelo para o lido, tinta para hoje. */
  | 'default'
  /**
   * Depois do dia 100 (E5, D1 encerrado): sem traço de hoje, e todo dia não
   * lido aparece como "em aberto" (a forma do "em aberto" é a pergunta 14).
   */
  | 'finished'
  /** Antes da campanha (A5): nenhum traço amarelo. */
  | 'inactive'
  /** Marco (E3, fundo amarelo fixo): lido em tinta sobre trilha de 22% de tinta. */
  | 'onYellow'
  /** Chegada (E4, fundo de tinta fixo). */
  | 'onInk';

type Props = {
  totalDays: number;
  /** Dia oficial da campanha; 0 antes do início. */
  officialDay: number;
  /** Dias realmente lidos pela pessoa — nunca "de 1 até N". */
  completed: ReadonlySet<number> | number[];
  variant?: RulerVariant;
  /** Largura útil; por padrão acompanha a calha da tela. */
  width?: number;
  /** Descrição para leitor de tela. A régua é densa demais para ser lida traço a traço. */
  accessibilityLabel?: string;
};

const VIEW_H = 36;
const MID = VIEW_H / 2;

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

  // Superfícies fixas não seguem o tema: as cores delas também não podem seguir.
  const readTick = variant === 'onYellow' ? '#111111' : BRAND_YELLOW;
  const futureTick =
    variant === 'onYellow' ? 'rgba(17,17,17,0.22)' : variant === 'onInk' ? '#3D3A36' : colors.borderStrong;
  const todayTick = variant === 'onInk' ? '#FFFFFF' : colors.text;
  // Hoje é dia de calendário da igreja. O marco é contagem pessoal (sem data),
  // então nas telas de marco e de chegada não existe "hoje" na régua.
  const showsToday = variant === 'default';
  const finished = variant === 'finished';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ??
        (showsToday
          ? `Régua dos ${totalDays} dias. ${done.size} lidos, dia oficial ${officialDay}.`
          : `Régua dos ${totalDays} dias. ${done.size} lidos.`)
      }
    >
      <Svg width={W} height={VIEW_H} viewBox={`0 0 ${W} ${VIEW_H}`}>
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const cx = x(day);
          // "Lido" é sempre o que a PESSOA leu. Antes da campanha nada está lido.
          const isRead = variant === 'inactive' ? false : done.has(day);
          const isToday = showsToday && day === officialDay && !isRead;
          const isOpen = !isRead && (finished || (showsToday && day < officialDay));

          if (isToday) {
            return (
              <Line key={day} x1={cx} y1={1.5} x2={cx} y2={VIEW_H - 1.5} stroke={todayTick} strokeWidth={3} strokeLinecap="round" />
            );
          }
          if (isRead) {
            return <Line key={day} x1={cx} y1={MID - 8} x2={cx} y2={MID + 8} stroke={readTick} strokeWidth={2.2} />;
          }
          if (isOpen) {
            // O TOKENS não define o "em aberto" (pergunta 14 ao designer). Até lá
            // ele mantém uma forma própria — traço curto com anel no topo — em
            // azul, a cor do "em aberto" nos nós da jornada. Sem isso ficaria
            // idêntico ao futuro, e a régua voltaria a depender só de cor.
            return (
              <G key={day}>
                <Line x1={cx} y1={MID - 3} x2={cx} y2={MID + 5} stroke={colors.blue} strokeWidth={1.6} />
                <Circle cx={cx} cy={MID - 6} r={2.4} fill="none" stroke={colors.blue} strokeWidth={1.4} />
              </G>
            );
          }
          return <Line key={day} x1={cx} y1={MID - 5} x2={cx} y2={MID + 5} stroke={futureTick} strokeWidth={1.6} />;
        })}
      </Svg>
    </View>
  );
}
