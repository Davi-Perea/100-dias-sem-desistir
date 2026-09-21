import { Stack } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';

import { BackBar } from '../BackBar';
import { AppText, Screen, ScreenScroll } from '../components';
import { spacing } from '../theme';

/**
 * Casca das telas que saem de "Você" e não foram desenhadas: lembrete,
 * ministério, jejum, ajuda, aparência e conta.
 *
 * PROVISÓRIO (pergunta 12 ao designer): não existe molde para essas telas. Até
 * ele chegar, cada uma usa o que o desenho já tem para telas contextuais — a
 * barra "‹ Voltar" de D3 e um título `screenTitle` (30/34, o de "Minhas
 * reflexões") — sem inventar outro cabeçalho.
 *
 * CORREÇÃO TÉCNICA: o cabeçalho nativo é escondido aqui, na própria tela. O
 * título nativo não cresce com a fonte do sistema nem com o negrito, e
 * duplicaria o título da página.
 */
export function SubScreen({
  title,
  titleAccessibilityLabel,
  banner,
  gap = spacing.xl,
  children,
  testID,
}: PropsWithChildren<{
  title: string;
  titleAccessibilityLabel?: string;
  /** Faixa de aviso de conteúdo (C-07), logo abaixo do cabeçalho. */
  banner?: ReactNode;
  gap?: number;
  testID?: string;
}>) {
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={gap}>
        <View style={{ gap: spacing.md }} testID={testID}>
          <BackBar />
          {banner}
          <AppText variant="screenTitle" accessibilityRole="header" accessibilityLabel={titleAccessibilityLabel}>
            {title}
          </AppText>
        </View>
        {children}
      </ScreenScroll>
    </Screen>
  );
}

/**
 * Grupo de linhas com cap (D1): o cap é cabeçalho para leitor de tela e as
 * linhas vêm logo abaixo, com filete entre elas.
 */
export function RowGroup({ title, children, testID }: PropsWithChildren<{ title?: string; testID?: string }>) {
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      {title ? (
        <AppText variant="cap" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View>{children}</View>
    </View>
  );
}
