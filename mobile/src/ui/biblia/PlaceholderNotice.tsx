import { Text, View } from 'react-native';

import { useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, faces, spacing, useTheme } from '@/ui/theme';

/**
 * Faixa do provedor de desenvolvimento: com ele registrado o "capítulo" é texto
 * de exemplo escrito para o projeto, nunca texto bíblico, e a tela precisa dizer
 * isso. Mesmas cores da faixa de conteúdo (`warning` sobre `warningSurface`).
 * Em release a aba nem aparece com esse provedor (ver `bibleTabVisible`).
 */
export function PlaceholderNotice() {
  const { colors } = useTheme();
  const face = useFace();
  return (
    <View
      accessibilityRole="alert"
      testID="bible-placeholder-notice"
      style={{
        backgroundColor: colors.warningSurface,
        borderRadius: 14,
        minHeight: MIN_TOUCH,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <Icon name="alert" size={18} color={colors.warning} />
      <Text style={{ flex: 1, fontFamily: face(faces.sg600), fontSize: 12.5, lineHeight: 17, color: colors.warning }}>
        Texto de exemplo de desenvolvimento. Não é texto bíblico.
      </Text>
    </View>
  );
}
