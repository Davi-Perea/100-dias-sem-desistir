import { Stack } from 'expo-router';

import { MOTION_MS, useReducedMotion, useTheme } from '@/ui/theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  // TOKENS §5: com "Reduzir movimento" a transição desliga inteira. O Stack
  // aninhado não herda o animationDuration do raiz, então repete o MOTION_MS.
  const reduced = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduced ? 'none' : 'slide_from_right',
        animationDuration: MOTION_MS,
      }}
    />
  );
}
