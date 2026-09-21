import { Pressable, View } from 'react-native';

import { AppText, Checkbox } from '../components';
import { Icon } from '../icons';
import { MIN_TOUCH, spacing, useTheme } from '../theme';
import { speakList } from './a11y';

/**
 * Linha de 48 do A3: título Schibsted 600 15/20 e legenda 13/18 embaixo
 * ("Intercessão do dia / Cinco passos · modo altar"). Com destino, ganha o
 * chevron e vira botão; sem destino (o altar), é só informação.
 */
export function DayLinkRow({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const spoken = `${title}. ${speakList(subtitle)}`;
  const body = (
    <View
      style={{
        minHeight: MIN_TOUCH,
        paddingVertical: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="rowLabel">{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      testID={testID}
      style={({ pressed }) => [pressed && { opacity: 0.72 }]}
    >
      {body}
    </Pressable>
  );
}

/**
 * Caixa de jejum do A3: 28×28 raio 8 borda 2px (o `Checkbox` da fundação já é
 * isso, com alvo de 48), "Cumpri meu jejum hoje / Só você vê".
 */
export function FastingRow({
  title,
  subtitle,
  checked,
  onToggle,
  testID,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  return (
    <View style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {/* O texto ao lado some do leitor de tela porque já está no nome da caixa. */}
      <Checkbox checked={checked} onToggle={onToggle} label={`${title}. ${subtitle}`} testID={testID} />
      <View style={{ flex: 1, gap: 2 }} aria-hidden>
        <AppText variant="rowLabel">{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
    </View>
  );
}
