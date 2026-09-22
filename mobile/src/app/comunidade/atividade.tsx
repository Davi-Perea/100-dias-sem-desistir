import { Stack } from 'expo-router';

import { ActivityScreen } from '@/ui/comunidade/feed/ActivityScreen';

/**
 * F8 · Atividade da Comunidade (`/comunidade/atividade`): Amém e comentários
 * nas minhas publicações, dentro do app, sem push. A barra é a própria
 * (BackBar), sem cabeçalho nativo.
 */
export default function ActivityRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityScreen />
    </>
  );
}
