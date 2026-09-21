import { useState } from 'react';
import { type StyleProp, TextInput, type TextInputProps, type TextStyle } from 'react-native';

import { useFace } from './components';
import { faces, useTheme } from './theme';

/**
 * Campo de texto longo: B5 (reflexão, piso 220) e C3 (publicar, piso 140).
 *
 * Desenho: raio 18, fundo `surfaceWarm`, Source Serif 19/32, placeholder em
 * `textMuted` (placeholder é texto: 6,90:1 no branco, 6,33:1 no quente).
 *
 * CORREÇÃO TÉCNICA (REGRAS 29): o desenho não tem borda, e `surfaceWarm` contra a
 * página branca mede 1,09:1 — o campo não tem limite visível. Borda de 1,5px em
 * `controlBorder` (3,59:1 no branco, 3,29:1 no quente; 5,15/4,79:1 no escuro) e,
 * com foco, 2,5px em `text`: o foco muda de espessura E de tom, não só de cor
 * (REGRAS 30). O padding compensa a espessura para o texto não pular ao focar.
 *
 * `accessibilityLabel` é obrigatório: placeholder não é rótulo e some ao digitar.
 * `minHeight`, nunca `height`: o campo cresce com o texto e com a fonte.
 */

const REST_BORDER = 1.5;
const FOCUS_BORDER = 2.5;
const PADDING = 16;

export function TextField({
  minHeight,
  accessibilityLabel,
  style,
  onFocus,
  onBlur,
  multiline = true,
  ...rest
}: Omit<TextInputProps, 'style'> & {
  /** 220 em B5, 140 em C3. */
  minHeight: number;
  accessibilityLabel: string;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const [focused, setFocused] = useState(false);
  const border = focused ? FOCUS_BORDER : REST_BORDER;
  const inset = PADDING + (FOCUS_BORDER - border);
  return (
    <TextInput
      {...rest}
      multiline={multiline}
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={colors.textMuted}
      textAlignVertical="top"
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        {
          minHeight,
          borderRadius: 18,
          backgroundColor: colors.surfaceWarm,
          borderWidth: border,
          borderColor: focused ? colors.text : colors.controlBorder,
          padding: inset,
          fontFamily: face(faces.ss400),
          fontSize: 19,
          lineHeight: 32,
          color: colors.text,
        },
        style,
      ]}
    />
  );
}
