import { Pressable, Text } from 'react-native';

import { useFace } from '@/ui/components';
import { MIN_TOUCH, faces, radius, useTheme } from '@/ui/theme';

/**
 * "Aa" da leitura livre: o mesmo botão da barra do leitor (B1). Caixa de piso
 * 48×48 com borda `controlBorder` (3,59:1 no claro, limite de controle), rótulo
 * com teto de 1,6× para nunca atravessar a caixa; o nome falado vem do botão.
 */
export function TextSizeButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const face = useFace();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Tamanho do texto"
      testID="bible-text-size"
      style={({ pressed }) => [
        {
          minWidth: MIN_TOUCH,
          minHeight: MIN_TOUCH,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: colors.controlBorder,
          borderRadius: radius.sm,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.6}
        aria-hidden
        style={{ fontFamily: face(faces.sg700), fontSize: 16, lineHeight: 20, color: colors.text }}
      >
        Aa
      </Text>
    </Pressable>
  );
}
