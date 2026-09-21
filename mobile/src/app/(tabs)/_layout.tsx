import { Tabs } from 'expo-router';
import { type ComponentProps, useState } from 'react';

import { COMMUNITY_ENABLED } from '@/config/features';
import { useMilestoneTrigger } from '@/journey/useMilestoneTrigger';
import { bibleTabVisible } from '@/ui/biblia/visibility';
import { GlassTabBar } from '@/ui/TabBar';
import { TABBAR_MIN_HEIGHT, useTheme } from '@/ui/theme';

/**
 * Destinos (TELAS): Jornada (casa) · Comunidade · Bíblia · Você. Não existe mais a
 * aba "Início": ela e a Jornada mostravam o mesmo dia de dois jeitos e viraram
 * uma só, a casa em "/". O leitor, o dia e a intercessão são rotas contextuais,
 * sem barra.
 *
 * A Comunidade ainda mora em `juntos.tsx` (a rota não muda de nome para não
 * quebrar quem já navega para ela).
 * PROVISÓRIO até o grupo C (feed) existir: o conteúdo dela é o do Juntos de hoje.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: sem servidor na V1, uma aba
 * "em breve" é rejeição na Apple, guideline 2.1): com `COMMUNITY_ENABLED`
 * desligado a aba sai da barra (`href: null`), que fica Jornada · Bíblia · Você. A rota
 * continua registrada para o trabalho futuro.
 *
 * Cada tela desenha o próprio cabeçalho, por isso não há header de navegação.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  // O marco em tela cheia era disparado pela aba Início, que deixou de existir.
  useMilestoneTrigger();
  /**
   * A barra é medida, não suposta. O token é só o piso: em fonte grande os
   * rótulos das abas quebram e a barra cresce, e a constante ainda ignorava a
   * faixa do indicador de home — o fim da Jornada ficava atrás do vidro.
   */
  // Até a primeira medição: o piso da barra mais os 26 do fundo.
  const [barHeight, setBarHeight] = useState(TABBAR_MIN_HEIGHT + 26);
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as ComponentProps<typeof GlassTabBar>)} onHeight={setBarHeight} />}
      screenOptions={{
        headerShown: false,
        // A tab bar flutua sobre o conteúdo; a cena reserva a altura embaixo.
        sceneStyle: { backgroundColor: colors.background, paddingBottom: barHeight },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Jornada' }} />
      <Tabs.Screen name="juntos" options={{ title: 'Comunidade', href: COMMUNITY_ENABLED ? undefined : null }} />
      {/* Leitura livre (decisão do fundador, 2026-09-21: a Bíblia Livre dentro do
          app). Entre Jornada e Você; em release só aparece com texto de verdade. */}
      <Tabs.Screen name="biblia" options={{ title: 'Bíblia', href: bibleTabVisible() ? undefined : null }} />
      <Tabs.Screen name="voce" options={{ title: 'Você' }} />
    </Tabs>
  );
}
