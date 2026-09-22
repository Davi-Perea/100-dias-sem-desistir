import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion as useReanimatedReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BRAND_YELLOW, useReducedMotion, useTheme } from '../theme';

/**
 * J5 · confete da tela "Dia N concluído" (feedback do fundador, 2026-09-22).
 *
 * Poucos elementos (18), uma queda só (sem laço), cores da marca: amarelo,
 * azul da comunidade e a tinta do tema. Decorativo: some do leitor de tela, não
 * recebe toque e nada de informação depende dele.
 *
 * "Reduzir movimento": NADA é desenhado. O hook do tema (`useReducedMotion`)
 * responde de forma assíncrona; por isso também vale o do Reanimated (lido na
 * hora) e a queda só começa depois de um instante — quem tem a opção ligada não
 * vê nem um quadro de confete.
 */

const PIECES = 18;
/** Duração da queda de cada peça. */
export const CONFETTI_FALL_MS = 1900;
/** Espera antes da primeira peça: dá tempo de a preferência do sistema chegar. */
const START_DELAY_MS = 140;

type Piece = { x: number; delay: number; drift: number; spin: number; w: number; h: number; color: number };

/** Sequência fixa (sem Math.random): mesmo desenho em toda conclusão e em teste. */
function pieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const t = (i * 37) % PIECES;
    return {
      x: (i + 0.5) / PIECES,
      delay: (t * 55) % 520,
      drift: ((i % 5) - 2) * 14,
      spin: (i % 2 === 0 ? 1 : -1) * (220 + ((i * 53) % 260)),
      w: i % 3 === 0 ? 10 : 7,
      h: i % 3 === 0 ? 6 : 12,
      color: i % 3,
    };
  });
}

const PIECE_LIST = pieces();

export function Confetti({ testID = 'confetti' }: { testID?: string }) {
  const themeReduced = useReducedMotion();
  const engineReduced = useReanimatedReducedMotion();
  const reduced = themeReduced || engineReduced;
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(id);
  }, [reduced]);

  if (reduced || !started) return null;
  return <ConfettiFall testID={testID} />;
}

function ConfettiFall({ testID }: { testID: string }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const palette = [BRAND_YELLOW, colors.blue, colors.text];
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
  width,
  height,
}: {
  piece: Piece;
  color: string;
  width: number;
  height: number;
}) {
  const progress: SharedValue<number> = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: CONFETTI_FALL_MS, easing: Easing.in(Easing.quad) }),
    );
    return () => cancelAnimation(progress);
  }, [piece.delay, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      // Some no último quinto da queda, sem corte seco na borda.
      opacity: p === 0 ? 0 : p > 0.8 ? (1 - p) * 5 : 1,
      transform: [
        { translateX: piece.drift * p },
        { translateY: -24 + (height + 48) * p },
        { rotate: `${piece.spin * p}deg` },
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
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
