import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type TextStyle, useWindowDimensions, View } from 'react-native';

import { AppText } from './components';
import { MIN_TOUCH, type FixedSurface, type Palette, fixedPalette, spacing, useTheme } from './theme';

/**
 * Barra de voltar das telas contextuais. Nenhuma rota usa o cabeçalho nativo
 * (headerShown:false): o título nativo não cresce com a fonte do sistema.
 *
 * Casos do desenho:
 *   A3  "‹ Jornada"                 · data à direita
 *   E1  "‹ Dia 17"
 *   D3  "‹ Voltar"                  · "Passo 1 de 5" à direita
 *   C4  "‹ Voltar" sobre tinta fixa (tone="ink")
 *   B5  "Cancelar" · "Dia 17" · "Excluir" em `danger` (desabilitado se vazio)
 *   C3  "Cancelar" · pílula "Publicar" (passe a pílula em `right`)
 *
 * O rótulo de voltar é `rowLabel` (Schibsted 600 15/20). "‹" é glifo decorativo:
 * o leitor de tela ouve "Voltar para Jornada", nunca "menor que".
 *
 * Fonte grande (R4-1, REGRAS 25): numa linha única, "‹ Voltar" + "Passo 1 de 3"
 * medem ~527px a 3,571× numa coluna de 354, e "Excluir" (B5) saía da tela. A
 * partir de `STACK_AT` a barra EMPILHA: o voltar numa linha, título e
 * direita na seguinte, que quebra (`flexWrap`) se ainda não couber. Abaixo do
 * limiar a linha é a do desenho, e mesmo assim todo texto pode encolher e
 * quebrar (`flexShrink: 1`) em vez de atravessar a borda.
 */

/**
 * Mesmo limiar da linha de dia da Jornada (`STACK_AT` em journeyRowHeight.ts):
 * a 1,6× o par mais largo do desenho ("‹ Voltar" + "Passo 1 de 3") ainda cabe
 * numa coluna de 354 com folga; acima disso, não.
 */
export const BACK_BAR_STACK_AT = 1.6;

export type BackBarAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `danger` para "Excluir" (B5). */
  variant?: 'default' | 'danger';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

/** Sem pilha (deep link, lembrete) `router.back()` fica morto: vai para a casa. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function BackBar({
  label = 'Voltar',
  onBack,
  chevron = true,
  backAccessibilityLabel,
  title,
  titleAccessibilityLabel,
  rightText,
  rightTextAccessibilityLabel,
  rightTextStyle,
  rightAction,
  right,
  tone = 'theme',
  testID = 'back-bar',
}: {
  /** "Jornada", "Dia 17", "Voltar", "Cancelar". */
  label?: string;
  /** Padrão: volta na pilha, ou vai para a casa se não houver pilha. */
  onBack?: () => void;
  /** `false` em "Cancelar" (B5, C3), que não leva "‹". */
  chevron?: boolean;
  backAccessibilityLabel?: string;
  /** Centro da barra (B5 "Dia 17"). */
  title?: string;
  titleAccessibilityLabel?: string;
  /** Texto informativo à direita (A3 data, D3 "Passo 1 de 5"). Não é botão. */
  rightText?: string;
  rightTextAccessibilityLabel?: string;
  /** Estilo do texto à direita. Padrão: Schibsted 700 13/18 em `textMuted` (D3). */
  rightTextStyle?: StyleProp<TextStyle>;
  /** Ação de texto à direita (B5 "Excluir"). */
  rightAction?: BackBarAction;
  /** Qualquer outro nó à direita (C3 pílula "Publicar"). */
  right?: ReactNode;
  /** Superfície fixa (C4 sobre tinta): a cor não muda com o tema. */
  tone?: 'theme' | FixedSurface;
  testID?: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= BACK_BAR_STACK_AT;
  const c: Palette = tone === 'theme' ? theme.colors : fixedPalette(tone);
  const back = onBack ?? goBackOrHome;
  const spoken =
    backAccessibilityLabel ??
    (!chevron || label === 'Voltar' ? label : `Voltar para ${label}`);

  const backButton = (
    <Pressable
      onPress={back}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      testID="back-button"
      hitSlop={4}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          minWidth: MIN_TOUCH,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          flexShrink: 1,
          // Empilhada, o alvo não se estica pela linha inteira: só o rótulo.
          alignSelf: stacked ? 'flex-start' : undefined,
          maxWidth: '100%',
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      {chevron ? (
        <AppText variant="rowLabel" style={{ color: c.text }} aria-hidden>
          ‹
        </AppText>
      ) : null}
      <AppText variant="rowLabel" style={{ color: c.text, flexShrink: 1 }} testID="back-bar-label">
        {label}
      </AppText>
    </Pressable>
  );

  const titleNode = title ? (
    <AppText
      variant="rowLabel"
      accessibilityRole="header"
      accessibilityLabel={titleAccessibilityLabel}
      style={{ color: c.text, textAlign: stacked ? 'left' : 'center', flexShrink: 1 }}
      testID="back-bar-title"
    >
      {title}
    </AppText>
  ) : null;

  const rightTextNode = rightText ? (
    <AppText
      variant="captionStrong"
      accessibilityLabel={rightTextAccessibilityLabel}
      // D3: Schibsted 700 13/18. A cor não foi especificada; `textMuted` mede
      // 6,90:1 no branco e 6,33:1 no quente.
      style={[
        { fontSize: 13, lineHeight: 18, color: c.textMuted, textAlign: stacked ? 'left' : 'right', flexShrink: 1 },
        rightTextStyle,
      ]}
      testID="back-bar-right-text"
    >
      {rightText}
    </AppText>
  ) : null;

  const rightActionNode = rightAction ? <BarTextAction action={rightAction} colors={c} stacked={stacked} /> : null;
  const hasSecondRow = Boolean(title || rightText || rightAction || right);

  if (stacked) {
    return (
      <View testID={testID} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {backButton}
        {hasSecondRow ? (
          <View
            testID="back-bar-second-row"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: spacing.md,
              minHeight: MIN_TOUCH,
            }}
          >
            {titleNode}
            {rightTextNode}
            {rightActionNode}
            {right}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, gap: spacing.sm }}
    >
      {backButton}
      {/* minWidth 0: sem ele o centro não cede e empurra a direita para fora. */}
      <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>{titleNode}</View>
      {rightTextNode}
      {rightActionNode}
      {right}
    </View>
  );
}

function BarTextAction({ action, colors, stacked }: { action: BackBarAction; colors: Palette; stacked: boolean }) {
  const disabled = action.disabled ?? false;
  return (
    <Pressable
      onPress={action.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityHint={action.accessibilityHint}
      accessibilityState={{ disabled }}
      testID={action.testID}
      hitSlop={4}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          minWidth: MIN_TOUCH,
          paddingVertical: spacing.sm,
          alignItems: stacked ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
          flexShrink: 1,
        },
        // Desabilitado a 0,45, como o Button. Contraste declarado (TOKENS §5):
        // "Excluir" em `danger` fica 2,14:1 no branco, 2,09:1 no quente e 2,28:1
        // no escuro. A WCAG isenta controle inativo; o estado vai no
        // accessibilityState, não só na opacidade.
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.72 },
      ]}
    >
      <AppText
        variant="rowLabel"
        style={{ color: action.variant === 'danger' ? colors.danger : colors.text, flexShrink: 1 }}
      >
        {action.label}
      </AppText>
    </Pressable>
  );
}
