import { Pressable, View } from 'react-native';

import { AppText } from '../components';
import { Icon } from '../icons';
import { radius, spacing, useTheme } from '../theme';

/**
 * Linha de meta (E4): o molde da ChoiceRow, mas de MÚLTIPLA escolha. Por isso é
 * `checkbox` e o indicador é a caixa quadrada da Checkbox (raio 8), não o
 * círculo do rádio: a forma diz "pode marcar várias" antes de qualquer texto.
 *
 * Estado por forma, não só cor (REGRAS 30): marcada, a borda vai de 1,5 para 2,5
 * em `text` e a caixa se enche com o check. `minHeight` + `paddingVertical`:
 * o rótulo cresce com o Dynamic Type e a linha acompanha (piso 62, alvo ≥ 48).
 */
export function GoalRow({
  label,
  checked,
  onToggle,
  testID,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          minHeight: 62,
          borderRadius: radius.button,
          borderWidth: checked ? 2.5 : 1.5,
          borderColor: checked ? colors.text : colors.controlBorder,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          backgroundColor: colors.surface,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <AppText variant="action" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: checked ? colors.markSurface : colors.controlBorder,
          backgroundColor: checked ? colors.markSurface : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={18} color={colors.onMark} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}
