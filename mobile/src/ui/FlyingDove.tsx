import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Dove } from './brand';
import { AppText } from './components';
import { BRAND_YELLOW, FLY_MS, useReducedMotion, useTheme } from './theme';

const BLOCK_H = 46;
const DOVE_W = 42;
const MARKS = 11;

type Props = {
  /** Dias concluídos. */
  completed: number;
  totalDays: number;
};

/**
 * Progresso pessoal (tela 08): a pomba voa sobre a trilha dos 100 dias.
 *
 * Junto com a régua, é um dos dois momentos com personalidade do produto. O voo
 * é puramente decorativo — a posição e o texto "X de 100" carregam o dado — por
 * isso ele desliga inteiro em "Reduzir movimento" sem perda de informação.
 */
export function FlyingDove({ completed, totalDays }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // O valor animado nasce uma vez e nunca muda de identidade. Guardar em estado
  // (e não em ref) é o que a regra do React 19 pede: ref não se lê durante render.
  const [fly] = useState(() => new Animated.Value(0));

  const ratio = totalDays > 0 ? Math.min(1, Math.max(0, completed / totalDays)) : 0;

  useEffect(() => {
    if (reduced) {
      fly.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fly, {
          toValue: 1,
          duration: FLY_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fly, {
          toValue: 0,
          duration: FLY_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fly, reduced]);

  const lift = fly.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const tilt = fly.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '-1deg'] });

  const doveLeft = Math.max(0, width * ratio - DOVE_W / 2);
  const trailRight = width - doveLeft + 4;

  return (
    <View>
      <View style={{ height: BLOCK_H }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {/* Trilho e preenchimento do percurso já feito. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 12,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.border,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 12,
            width: width * ratio,
            height: 3,
            borderRadius: 2,
            backgroundColor: BRAND_YELLOW,
          }}
        />

        {/* Onze marcas: de dez em dez dias. As pontas são mais altas. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 6,
            height: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
          aria-hidden
        >
          {Array.from({ length: MARKS }, (_, index) => (
            <View
              key={index}
              style={{
                width: 1.5,
                height: index === 0 || index === MARKS - 1 ? 14 : 9,
                backgroundColor: index === 0 ? colors.text : colors.borderStrong,
              }}
            />
          ))}
        </View>

        {/* Rastro: três traços atrás da pomba, cada vez mais fracos. */}
        {width > 0 && ratio > 0.04 ? (
          <View
            style={{ position: 'absolute', right: trailRight, bottom: 26, alignItems: 'flex-end', gap: 3 }}
          aria-hidden
          >
            {[
              { w: 12, o: 0.34 },
              { w: 9, o: 0.22 },
              { w: 6, o: 0.12 },
            ].map((trail) => (
              <View
                key={trail.w}
                style={{ width: trail.w, height: 2, backgroundColor: colors.text, opacity: trail.o }}
              />
            ))}
          </View>
        ) : null}

        {width > 0 ? (
          <Animated.View
            style={{
              position: 'absolute',
              left: doveLeft,
              bottom: 17,
              transform: [{ translateY: lift }, { rotate: tilt }],
            }}
          >
            <Dove width={DOVE_W} role="marker" />
          </Animated.View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <AppText variant="tick">Dia 1</AppText>
        <AppText variant="tick">Dia {totalDays}</AppText>
      </View>
    </View>
  );
}
