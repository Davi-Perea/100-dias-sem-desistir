import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Dove } from '../brand';
import { DoveContext, type DoveFly, type DoveFlightOptions } from '../entrada/doveContext';
import { useReducedMotion } from '../theme';

/**
 * E5 · a pomba atravessa a tela e, quando passa pelo meio, o passo troca.
 *
 * Só em algumas transições da entrada (quem chama decide, com o
 * `useDoveTransition` de `src/ui/entrada/doveContext.ts`), nunca em todas:
 * repetida a cada toque ela vira espera, não vida.
 *
 * Com "Reduzir movimento" NÃO há voo nenhum: a ação roda na hora, e a troca de
 * tela segue a regra do Stack (sem animação). O voo é decorativo: a pomba some
 * do leitor de tela e nada de informação depende dela.
 *
 * Durante o voo uma camada transparente segura os toques: um segundo toque em
 * "Continuar" não pode empilhar a mesma tela duas vezes.
 */

/** Duração do voo inteiro, de uma borda à outra. */
export const DOVE_FLIGHT_MS = 1100;
/** Fração do voo em que a tela troca: a pomba está passando pelo meio. */
export const DOVE_SWAP_AT = 0.5;

/** Largura da pomba em voo; a altura sai da proporção do asset (224×144). */
const DOVE_W = 132;
const DOVE_H = Math.round((DOVE_W * 144) / 224);

type Flight = { key: number } & DoveFlightOptions;

export function DoveTransitionProvider({ children }: PropsWithChildren) {
  const reduced = useReducedMotion();
  const [flight, setFlight] = useState<Flight | null>(null);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const progress = useSharedValue(0);

  // Saindo do layout no meio do voo, nada fica agendado. A camada da pomba
  // desmonta junto, então a animação em curso não tem mais onde aparecer.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const fly = useCallback<DoveFly>(
    (action, options) => {
      if (busy.current) return;
      if (reduced) {
        action();
        return;
      }
      busy.current = true;
      setFlight({ key: Date.now(), ...options });
      progress.set(0);
      progress.set(withTiming(1, { duration: DOVE_FLIGHT_MS, easing: Easing.inOut(Easing.quad) }));
      timers.current.push(
        setTimeout(action, DOVE_FLIGHT_MS * DOVE_SWAP_AT),
        setTimeout(() => {
          busy.current = false;
          timers.current.length = 0;
          setFlight(null);
        }, DOVE_FLIGHT_MS),
      );
    },
    [progress, reduced],
  );

  return (
    <DoveContext.Provider value={fly}>
      <View style={{ flex: 1 }}>
        {children}
        {flight ? <DoveFlightLayer key={flight.key} flight={flight} progress={progress} /> : null}
      </View>
    </DoveContext.Provider>
  );
}

function DoveFlightLayer({ flight, progress }: { flight: Flight; progress: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();

  // Da esquerda (fora da tela) à direita (fora da tela), subindo num arco suave;
  // a asa "bate" com uma leve inclinação que vai e volta.
  const body = useAnimatedStyle(() => {
    const p = progress.value;
    const x = interpolate(p, [0, 1], [-DOVE_W, width]);
    const y = interpolate(p, [0, 0.5, 1], [height * 0.56, height * 0.4, height * 0.3]);
    const tilt = Math.sin(p * Math.PI * 6) * 4 - 6;
    const scale = interpolate(p, [0, 0.5, 1], [0.9, 1.08, 0.94]);
    return { transform: [{ translateX: x }, { translateY: y }, { rotate: `${tilt}deg` }, { scale }] };
  });
  // Troca de tom junto com a troca de tela.
  const before = useAnimatedStyle(() => ({ opacity: progress.value < DOVE_SWAP_AT ? 1 : 0 }));
  const after = useAnimatedStyle(() => ({ opacity: progress.value < DOVE_SWAP_AT ? 0 : 1 }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="auto"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      testID="dove-transition"
    >
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: DOVE_W, height: DOVE_H }, body]}>
        <Animated.View style={[StyleSheet.absoluteFill, before]}>
          <Dove width={DOVE_W} tone={flight.toneBefore} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, after]}>
          <Dove width={DOVE_W} tone={flight.toneAfter} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
