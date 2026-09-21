import { Pressable } from 'react-native';

import { Icon } from '@/ui/icons';
import { MIN_TOUCH, useTheme } from '@/ui/theme';

/**
 * Amém (REGRAS 19 e 33): marca e desmarca, alternando contorno (`bold`) e cheio
 * (`fill`). Sem número em lugar nenhum — nem para quem publicou. "Amém" é o nome
 * acessível; o estado vai em `checked`, então a forma e o leitor de tela dizem a
 * mesma coisa, sem depender de cor.
 */
export function AmenButton({
  checked,
  onToggle,
  size = 27,
  disabled = false,
  testID,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  /** 27 no cartão (C1), 22 no comentário (C6). */
  size?: number;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      disabled={disabled}
      accessibilityRole="togglebutton"
      accessibilityLabel="Amém"
      accessibilityState={{ checked, disabled }}
      testID={testID}
      hitSlop={0}
      style={({ pressed }) => [
        { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.72 },
      ]}
    >
      <Icon name={checked ? 'amen-filled' : 'amen'} size={size} color={colors.text} />
    </Pressable>
  );
}
