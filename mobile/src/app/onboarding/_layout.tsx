import { Stack } from 'expo-router';

import { DoveTransitionProvider } from '@/ui/motion/DoveTransition';
import { MOTION_MS, useReducedMotion, useTheme } from '@/ui/theme';

/**
 * Entrada: boas-vindas → nome → metas → leitura → lembrete.
 *
 * As telas a que se chega com a pomba (E5: nome e leitura) trocam por
 * esmaecimento, não por deslize: a troca acontece quando a pomba passa pelo
 * meio, e um deslize lateral por baixo dela brigaria com o voo.
 */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  // TOKENS §5: com "Reduzir movimento" a transição desliga inteira. O Stack
  // aninhado não herda o animationDuration do raiz, então repete o MOTION_MS.
  const reduced = useReducedMotion();
  const doveTarget = { animation: reduced ? ('none' as const) : ('fade' as const) };
  return (
    <DoveTransitionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: reduced ? 'none' : 'slide_from_right',
          animationDuration: MOTION_MS,
        }}
      >
        <Stack.Screen name="nome" options={doveTarget} />
        <Stack.Screen name="leitura" options={doveTarget} />
      </Stack>
    </DoveTransitionProvider>
  );
}
