import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion as useReanimatedReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { DoveContext, DoveInFlightContext, type DoveFly, type DoveTone } from '../entrada/doveContext';
import { palettes, useReducedMotion, useTheme } from '../theme';

/**
 * E5 · a pomba gigante atravessa a tela e, quando passa pelo meio, o passo troca.
 *
 * Porte fiel do `TransitionBird` do designer (handoff "Dove Transition",
 * 2026-09-22: `TransitionBird.jsx` + protótipo `Dove Transition.dc.html`), de
 * Framer Motion para Reanimated. Mesma geometria, mesma curva, mesmos números:
 *
 * - a pomba é MAIOR que a tela: corpo ≥ 1,15× o eixo da viagem, asas ≥ 1,2× o
 *   eixo cruzado (proporção do asset 1,3733); entra e sai inteira por fora;
 * - 720 ms, cubic-bezier(0.7, 0, 0.2, 1): o bico aparece devagar, passa num
 *   sopro, sai fluida;
 * - a troca roda UMA vez, quando o caminho cruza 0,5 (pomba no centro). Quem
 *   detecta é a thread de UI, a cada quadro; a troca em si roda na thread JS;
 * - o conteúdo esmaece em volta da troca (0,1 do caminho de cada lado);
 * - inclinação de 2°, curva lateral de 2% do eixo cruzado, 3,5% de crescimento
 *   no meio;
 * - a direção gira a cada voo: de baixo para cima, da esquerda para a direita,
 *   de cima para baixo, da direita para a esquerda.
 *
 * O asset é BRANCO: a cor vem do `tintColor`. Tinta #111111 sobre o amarelo da
 * F1 (`toneBefore: 'black'`), `colors.text` nas telas do tema (tinta no claro,
 * branca no escuro).
 *
 * Toque durante a transição é ignorado (`flyDove` devolve `false`). A camada da
 * pomba não recebe toque e some do leitor de tela: é decorativa, nada de
 * informação depende dela.
 *
 * "Reduzir movimento" (o hook do tema, assíncrono, OU o do Reanimated, lido na
 * hora): nenhum voo. O conteúdo esmaece em 90 ms, troca e volta em 110 ms.
 */

/** Duração do voo inteiro, de uma borda à outra. */
export const DOVE_FLIGHT_MS = 720;
/** Curva tempo → distância: revelação lenta do bico, sopro, saída fluida. */
export const DOVE_EASE = [0.7, 0, 0.2, 1] as const;
/** Fração do caminho em que o passo troca: 0,5 = pomba no centro. */
export const DOVE_SWAP_AT = 0.5;
/** Quanto do caminho (de cada lado da troca) o conteúdo leva para esmaecer e voltar. */
export const DOVE_SWAP_DIP = 0.1;
/** Inclinação, em graus, ao longo da curva. */
export const DOVE_TILT = 2;
/** Curva lateral, em fração do eixo cruzado. */
export const DOVE_DRIFT = 0.02;
/** Crescimento no meio do caminho. */
export const DOVE_SWELL = 0.035;
/** Envergadura / comprimento do corpo em `assets/pomba/dove-up.png` (1766×1286). */
export const DOVE_ASPECT = 1.3733;
/** "Reduzir movimento": o conteúdo some em 90 ms, troca, e volta em 110 ms. */
export const DOVE_REDUCED_OUT_MS = 90;
export const DOVE_REDUCED_IN_MS = 110;

export type DoveDirection = 'bottom-to-top' | 'left-to-right' | 'top-to-bottom' | 'right-to-left';

/** Uma direção por voo, em ciclo. */
export const DIRECTION_CYCLE: readonly DoveDirection[] = [
  'bottom-to-top',
  'left-to-right',
  'top-to-bottom',
  'right-to-left',
];

/** Rotação do asset (cabeça para cima) em cada direção. */
export const DOVE_HEADING: Record<DoveDirection, number> = {
  'bottom-to-top': 0,
  'top-to-bottom': 180,
  'left-to-right': 90,
  'right-to-left': -90,
};

const TRAVEL: Record<DoveDirection, readonly [number, number]> = {
  'bottom-to-top': [0, -1],
  'top-to-bottom': [0, 1],
  'left-to-right': [1, 0],
  'right-to-left': [-1, 0],
};

const DOVE_UP = require('../../../assets/pomba/dove-up.png');
const DOVE_EASING = Easing.bezier(...DOVE_EASE);
/** Parada fora do palco entre um voo e outro (além de invisível). */
const OFFSTAGE = 10000;

const IDLE = 0;
const FLIGHT = 1;
const REDUCED = 2;

export type DoveGeometry = {
  /** Vetor da viagem. */
  ux: number;
  uy: number;
  /** Perpendicular (horário em relação à viagem), para a curva lateral. */
  px: number;
  py: number;
  /** Eixo cruzado, em px. */
  cross: number;
  /** Meia viagem: do centro da tela até a pomba ficar inteira fora. */
  half: number;
  heading: number;
  /** Comprimento do corpo (eixo da viagem) e envergadura (eixo cruzado). */
  length: number;
  span: number;
};

/** Tamanho e caminho da pomba numa direção, para uma tela `width × height`. */
export function doveGeometry(direction: DoveDirection, width: number, height: number, scale = 1): DoveGeometry {
  const [ux, uy] = TRAVEL[direction];
  const vertical = ux === 0;
  const along = vertical ? height : width;
  const cross = vertical ? width : height;
  const length = Math.max(1.15 * along, (1.2 * cross) / DOVE_ASPECT) * scale;
  return {
    ux,
    uy,
    px: uy === 0 ? 0 : -uy,
    py: ux,
    cross,
    half: along / 2 + length / 2,
    heading: DOVE_HEADING[direction],
    length,
    span: length * DOVE_ASPECT,
  };
}

/** Posição da pomba em `p` (0 → 1, já com a curva aplicada). */
export function dovePose(p: number, g: DoveGeometry) {
  'worklet';
  const wave = Math.sin(p * Math.PI);
  const d = -g.half + 2 * g.half * p;
  const dr = wave * DOVE_DRIFT * g.cross;
  return {
    x: g.ux * d + g.px * dr,
    y: g.uy * d + g.py * dr,
    rotate: g.heading + Math.cos(p * Math.PI) * DOVE_TILT,
    scale: 1 + wave * DOVE_SWELL,
  };
}

/** Opacidade do conteúdo em `p`: cai até a troca, volta a partir dela. */
export function contentOpacityAt(p: number, swapped: boolean, pSwap: number) {
  'worklet';
  const v = swapped ? (p - pSwap) / DOVE_SWAP_DIP : (DOVE_SWAP_AT - p) / DOVE_SWAP_DIP;
  return Math.min(1, Math.max(0, v));
}

function toneColor(tone: DoveTone | undefined, themed: string) {
  if (tone === 'black') return palettes.light.text;
  if (tone === 'white') return palettes.dark.text;
  return themed;
}

type FlightGeometry = DoveGeometry & { k: number };
type Flight = { id: number; action: () => void; reduced: boolean; swapped: boolean; started: boolean };
type FlightView = { id: number; swapped: boolean; toneBefore?: DoveTone; toneAfter?: DoveTone };

export function DoveTransitionProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const themeReduced = useReducedMotion();
  const engineReduced = useReanimatedReducedMotion();
  const reduced = themeReduced || engineReduced;

  // O palco é a área do provedor (a entrada inteira); antes do primeiro
  // onLayout vale a janela.
  const windowSize = useWindowDimensions();
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const width = layout?.width ?? windowSize.width;
  const height = layout?.height ?? windowSize.height;
  // A imagem tem tamanho fixo (o do voo vertical, o maior no retrato) e cada
  // voo ajusta pela escala: nada de layout muda entre um voo e outro.
  const base = doveGeometry('bottom-to-top', width, height);

  // O que a renderização precisa do voo: tom antes/depois da troca e "em voo".
  const [view, setView] = useState<FlightView | null>(null);

  const busy = useRef(false);
  const current = useRef<Flight | null>(null);
  const flights = useRef(0);
  const seq = useRef(0);
  const alive = useRef(true);

  const mode = useSharedValue(IDLE);
  const progress = useSharedValue(0);
  const swapped = useSharedValue(0);
  const pSwap = useSharedValue(0);
  const dip = useSharedValue(1);
  const flightId = useSharedValue(0);
  const geometry = useSharedValue<FlightGeometry | null>(null);

  // Saindo da entrada no meio de uma transição, nada roda depois: nem troca,
  // nem fim de voo.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAnimation(progress);
      cancelAnimation(dip);
    };
  }, [progress, dip]);

  /** A troca do passo. Uma vez por voo, na thread JS. */
  const swapNow = useCallback((id: number) => {
    const flight = current.current;
    if (!alive.current || !flight || flight.id !== id || flight.swapped) return;
    flight.swapped = true;
    flight.action();
    setView((v) => (v && v.id === id ? { ...v, swapped: true } : v));
  }, []);

  /** Fim da transição: volta ao repouso e libera o próximo toque. */
  const land = useCallback(
    (id: number) => {
      const flight = current.current;
      if (!alive.current || !flight || flight.id !== id) return;
      // Como no protótipo: se a troca não chegou a acontecer, acontece agora.
      if (!flight.swapped) swapNow(id);
      current.current = null;
      busy.current = false;
      flights.current += 1;
      mode.set(IDLE);
      progress.set(0);
      swapped.set(0);
      dip.set(1);
      setView(null);
    },
    [swapNow, mode, progress, swapped, dip],
  );

  // A thread de UI vê o caminho cruzar 0,5 e pede a troca à thread JS
  // (`scheduleOnRN`: o `runOnJS` do Reanimated 4, que marca o antigo como obsoleto).
  useAnimatedReaction(
    () => mode.get() === FLIGHT && progress.get() >= DOVE_SWAP_AT,
    (crossed, previous) => {
      if (crossed && !previous) scheduleOnRN(swapNow, flightId.get());
    },
    [swapNow],
  );

  // Depois que a troca foi aplicada (a tela nova já está na árvore), o conteúdo
  // volta: no voo, a partir do ponto do caminho em que a troca aconteceu; com
  // "Reduzir movimento", em 110 ms, e só então a transição termina.
  const swappedId = view?.swapped ? view.id : 0;
  useEffect(() => {
    if (!swappedId) return;
    const flight = current.current;
    if (!flight || flight.id !== swappedId) return;
    if (flight.reduced) {
      dip.set(
        withTiming(1, { duration: DOVE_REDUCED_IN_MS }, () => {
          'worklet';
          scheduleOnRN(land, swappedId);
        }),
      );
      return;
    }
    scheduleOnUI((id: number) => {
      'worklet';
      if (flightId.get() !== id) return;
      pSwap.set(progress.get());
      swapped.set(1);
    }, swappedId);
  }, [swappedId, dip, land, flightId, pSwap, progress, swapped]);

  const fly = useCallback<DoveFly>(
    (action, options) => {
      if (busy.current || !alive.current) return false;
      busy.current = true;
      seq.current += 1;
      const id = seq.current;
      current.current = { id, action, reduced, swapped: false, started: false };
      setView({ id, swapped: false, toneBefore: options?.toneBefore, toneAfter: options?.toneAfter });
      return true;
    },
    [reduced],
  );

  // O voo começa depois do render que leva o tom da pomba e o "em voo" da
  // pilha: nem um quadro sai com a cor do voo anterior.
  const startingId = view && !view.swapped ? view.id : 0;
  useEffect(() => {
    if (!startingId) return;
    const flight = current.current;
    if (!flight || flight.id !== startingId || flight.started) return;
    flight.started = true;
    flightId.set(startingId);

    if (flight.reduced) {
      mode.set(REDUCED);
      dip.set(
        withTiming(0, { duration: DOVE_REDUCED_OUT_MS }, () => {
          'worklet';
          scheduleOnRN(swapNow, startingId);
        }),
      );
      return;
    }

    const direction = DIRECTION_CYCLE[flights.current % DIRECTION_CYCLE.length];
    const g = doveGeometry(direction, width, height);
    geometry.set({ ...g, k: g.length / base.length });
    swapped.set(0);
    pSwap.set(0);
    progress.set(0);
    mode.set(FLIGHT);
    progress.set(
      withTiming(1, { duration: DOVE_FLIGHT_MS, easing: DOVE_EASING }, () => {
        'worklet';
        scheduleOnRN(land, startingId);
      }),
    );
  }, [startingId, width, height, base.length, flightId, mode, dip, geometry, swapped, pSwap, progress, swapNow, land]);

  const contentStyle = useAnimatedStyle(() => {
    const m = mode.get();
    if (m === REDUCED) return { opacity: dip.get() };
    if (m === FLIGHT) return { opacity: contentOpacityAt(progress.get(), swapped.get() === 1, pSwap.get()) };
    return { opacity: 1 };
  });

  const birdStyle = useAnimatedStyle(() => {
    const g = geometry.get();
    if (mode.get() !== FLIGHT || !g) {
      return {
        opacity: 0,
        transform: [{ translateX: 0 }, { translateY: OFFSTAGE }, { rotate: '0deg' }, { scale: 1 }],
      };
    }
    const pose = dovePose(progress.get(), g);
    return {
      opacity: 1,
      transform: [
        { translateX: pose.x },
        { translateY: pose.y },
        { rotate: `${pose.rotate}deg` },
        { scale: pose.scale * g.k },
      ],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    setLayout((prev) =>
      prev && prev.width === next.width && prev.height === next.height ? prev : { width: next.width, height: next.height },
    );
  };

  const tint = toneColor(view ? (view.swapped ? view.toneAfter : view.toneBefore) : undefined, colors.text);

  return (
    <DoveContext.Provider value={fly}>
      <DoveInFlightContext.Provider value={view !== null}>
        <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayout}>
          <Animated.View style={[styles.fill, contentStyle]} testID="dove-content">
            {children}
          </Animated.View>
          {/* Com "Reduzir movimento" a pomba nem é montada. Fora disso fica
              montada e invisível entre os voos: a imagem já está decodificada
              quando o próximo voo começa. */}
          {reduced ? null : (
            <View
              pointerEvents="none"
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[StyleSheet.absoluteFill, styles.stage]}
              testID="dove-transition"
            >
              <Animated.Image
                source={DOVE_UP}
                resizeMode="stretch"
                fadeDuration={0}
                style={[
                  {
                    position: 'absolute',
                    left: (width - base.span) / 2,
                    top: (height - base.length) / 2,
                    width: base.span,
                    height: base.length,
                    tintColor: tint,
                  },
                  birdStyle,
                ]}
                testID="dove-transition-bird"
              />
            </View>
          )}
        </View>
      </DoveInFlightContext.Provider>
    </DoveContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stage: { overflow: 'hidden', zIndex: 10 },
});
