import { Stack } from 'expo-router';

import { useDoveInFlight } from '@/ui/entrada/doveContext';
import { DoveTransitionProvider } from '@/ui/motion/DoveTransition';
import { MOTION_MS, useReducedMotion, useTheme } from '@/ui/theme';

/**
 * Entrada: boas-vindas → nome → metas → leitura → lembrete.
 *
 * Todo "seguir" entre esses passos é com a pomba (E5): a troca acontece quando
 * ela passa pelo meio da tela. O último passo sai da entrada para a Jornada com
 * troca normal: este layout (e a pomba) desmonta nessa hora.
 */
export default function OnboardingLayout() {
  return (
    <DoveTransitionProvider>
      <OnboardingStack />
    </DoveTransitionProvider>
  );
}

function OnboardingStack() {
  const { colors } = useTheme();
  // TOKENS §5: com "Reduzir movimento" a transição desliga inteira. O Stack
  // aninhado não herda o animationDuration do raiz, então repete o MOTION_MS.
  const reduced = useReducedMotion();
  // Durante o voo a tela nova entra SEM deslize: a pomba já cobre a troca, e um
  // deslize por baixo dela brigaria com o voo. No fim do voo a opção volta a
  // deslizar, então o "voltar" (gesto, botão, Android) continua deslizando.
  const inFlight = useDoveInFlight();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduced || inFlight ? 'none' : 'slide_from_right',
        animationDuration: MOTION_MS,
      }}
    />
  );
}
