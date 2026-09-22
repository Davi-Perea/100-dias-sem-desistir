import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion as useReanimatedReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BRAND_YELLOW, useReducedMotion, useTheme } from '../theme';

/**
 * J5 · confete da tela "Dia N concluído".
 *
 * Refeito em 2026-09-22 (o fundador achou o primeiro feio): 48 papéis em vez de
 * 18, tamanhos e velocidades diferentes, uns quadrados e uns redondos, cada um
 * girando no seu ritmo, caindo com um balanço leve (seno) e sumindo aos poucos —
 * nada de fileira de tracinhos idênticos caindo em linha reta.
 *
 * Cores da marca, e só as que se VEEM no tema: amarelo, azul, a tinta do texto
 * (preta no claro, branca no escuro) e um quarto tom de apoio. "Branco" no tema
 * claro seria papel branco sobre fundo branco — invisível —, então no claro o
 * quarto tom é o cinza-areia da borda e no escuro é o cinza claro do tema.
 *
 * UM só relógio (`clock`) move as 48 peças: cada peça deriva a sua própria queda
 * dele, com atraso, duração e peso próprios. Assim a tela ganha movimento sem 48
 * animações concorrentes — e com fonte grande (3,571×) nada muda, porque o
 * confete é geometria absoluta, sem texto.
 *
 * Tudo acaba em menos de 3 s e o componente se desmonta sozinho: nada de laço
 * infinito nem de dezenas de views invisíveis sobrando na tela.
 *
 * Decorativo: some do leitor de tela, não recebe toque e nenhuma informação
 * depende dele.
 *
 * "Reduzir movimento": NADA é desenhado. O hook do tema (`useReducedMotion`)
 * responde de forma assíncrona; por isso também vale o do Reanimated (lido na
 * hora) e a queda só começa depois de um instante — quem tem a opção ligada não
 * vê nem um quadro de confete.
 */

/** Papéis na tela. O pedido é 40–60; 48 enche a tela sem pesar. */
export const CONFETTI_PIECES = 48;
/** Janela inteira da festa, do primeiro papel ao último sumir (2–3 s). */
export const CONFETTI_TOTAL_MS = 2950;
/** Espera antes do primeiro quadro: dá tempo de a preferência do sistema chegar. */
const START_DELAY_MS = 140;

type Piece = {
  /** Posição horizontal de largada, 0 a 1 da largura. */
  x: number;
  /** Quando esta peça começa a cair (ms). */
  delay: number;
  /** Quanto ela leva para atravessar a tela (ms) — é daqui que vem a velocidade. */
  duration: number;
  /** Aceleração da queda: quanto maior, mais "pesada" ela parece. */
  weight: number;
  /** Balanço lateral, em pixels para cada lado. */
  sway: number;
  /** Quantas idas e voltas de balanço durante a queda. */
  cycles: number;
  /** Onde o balanço começa, para as peças não balançarem juntas. */
  phase: number;
  /** Giro total em graus; o sinal é a direção. */
  spin: number;
  w: number;
  h: number;
  /** Papel redondo (confete de furador) em vez de retângulo. */
  round: boolean;
  /** Índice na paleta da marca. */
  color: number;
};

/**
 * Sorteio DETERMINÍSTICO (sem Math.random): a mesma festa em toda conclusão e em
 * teste, mas sem o padrão de fileira que a conta antiga (`i % 3`) deixava à vista.
 */
function noise(i: number, k: number): number {
  const v = Math.sin((i + 1) * 12.9898 + (k + 1) * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function pieces(): Piece[] {
  return Array.from({ length: CONFETTI_PIECES }, (_, i) => {
    const round = i % 5 === 0;
    const size = 6 + Math.round(noise(i, 7) * 7);
    return {
      // Espalhadas pela largura, com um empurrãozinho para não ficarem em grade.
      x: Math.min(0.98, Math.max(0.02, (i + 0.5) / CONFETTI_PIECES + (noise(i, 0) - 0.5) * 0.04)),
      delay: Math.round(noise(i, 1) * 460),
      duration: 1900 + Math.round(noise(i, 2) * 560),
      weight: 1.3 + noise(i, 3) * 0.5,
      sway: 10 + noise(i, 4) * 26,
      cycles: 1 + noise(i, 5) * 1.6,
      phase: noise(i, 6) * Math.PI * 2,
      spin: (i % 2 === 0 ? 1 : -1) * (240 + Math.round(noise(i, 8) * 620)),
      w: round ? size : 5 + Math.round(noise(i, 9) * 6),
      h: round ? size : 7 + Math.round(noise(i, 10) * 10),
      round,
      color: i % 4,
    };
  });
}

const PIECE_LIST = pieces();

export function Confetti({ testID = 'confetti' }: { testID?: string }) {
  const themeReduced = useReducedMotion();
  const engineReduced = useReanimatedReducedMotion();
  const reduced = themeReduced || engineReduced;
  const [phase, setPhase] = useState<'waiting' | 'falling' | 'over'>('waiting');

  useEffect(() => {
    if (reduced) return;
    const start = setTimeout(() => setPhase('falling'), START_DELAY_MS);
    // Acabada a queda, o componente sai de cena: nada fica animando atrás da tela.
    const end = setTimeout(() => setPhase('over'), START_DELAY_MS + CONFETTI_TOTAL_MS + 80);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [reduced]);

  if (reduced || phase !== 'falling') return null;
  return <ConfettiFall testID={testID} />;
}

function ConfettiFall({ testID }: { testID: string }) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  // Amarelo, azul, tinta e o quarto tom que se vê em cada tema (ver o topo).
  const palette = [BRAND_YELLOW, colors.blue, colors.text, isDark ? colors.textMuted : colors.borderStrong];
  const clock: SharedValue<number> = useSharedValue(0);

  useEffect(() => {
    // Relógio linear: a curva de cada queda é feita na peça, não aqui.
    clock.value = withTiming(CONFETTI_TOTAL_MS, { duration: CONFETTI_TOTAL_MS, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [clock]);

  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={StyleSheet.absoluteFill}
      testID={testID}
    >
      {PIECE_LIST.map((piece, index) => (
        <ConfettiPiece
          key={index}
          piece={piece}
          color={palette[piece.color]}
          clock={clock}
          width={width}
          height={height}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  color,
  clock,
  width,
  height,
}: {
  piece: Piece;
  color: string;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const local = (clock.value - piece.delay) / piece.duration;
    // Antes da vez dela e depois de sumir, a peça não aparece.
    if (local <= 0 || local >= 1) return { opacity: 0 };
    // Queda com aceleração (peso da peça) e balanço lateral em seno.
    const fall = Math.pow(local, piece.weight);
    const sway = Math.sin(piece.phase + local * piece.cycles * Math.PI * 2) * piece.sway;
    // Entra num piscar e sai devagar no último terço: sem corte seco na borda.
    const fadeIn = local < 0.06 ? local / 0.06 : 1;
    const fadeOut = local > 0.7 ? (1 - local) / 0.3 : 1;
    return {
      opacity: Math.min(fadeIn, fadeOut),
      transform: [
        { translateX: sway },
        { translateY: -30 + (height + 60) * fall },
        { rotate: `${piece.spin * local}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: piece.x * width - piece.w / 2,
          width: piece.w,
          height: piece.h,
          borderRadius: piece.round ? piece.w / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
