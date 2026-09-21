import { Tabs } from 'expo-router';
import { useState } from 'react';

import { GlassTabBar } from '@/ui/TabBar';
import { TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

/**
 * Quatro destinos do handoff: Início · Jornada · Juntos · Você.
 * O leitor é rota contextual, não aba.
 *
 * Cada tela desenha o próprio cabeçalho (lockup da marca), por isso não há
 * header de navegação aqui.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  /**
   * A barra é medida, não suposta. O token é só o piso: em fonte grande os
   * rótulos das abas quebram e a barra cresce, e a constante ainda ignorava a
   * faixa do indicador de home — o fim da Jornada ficava atrás do vidro.
   */
  const [barHeight, setBarHeight] = useState(TAB_BAR_HEIGHT);
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} onHeight={setBarHeight} />}
      screenOptions={{
        headerShown: false,
        // A tab bar flutua sobre o conteúdo; a cena reserva a altura embaixo.
        sceneStyle: { backgroundColor: colors.background, paddingBottom: barHeight },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="jornada" options={{ title: 'Jornada' }} />
      <Tabs.Screen name="juntos" options={{ title: 'Juntos' }} />
      <Tabs.Screen name="voce" options={{ title: 'Você' }} />
    </Tabs>
  );
}
