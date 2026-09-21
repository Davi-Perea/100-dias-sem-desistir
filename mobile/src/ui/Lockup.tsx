import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './components';
import { Icon } from './icons';
import { MIN_TOUCH, fonts, spacing, useTheme } from './theme';

/**
 * Barra de topo das rotas contextuais: ‹ voltar, título opcional, ação à direita.
 *
 * @deprecated tela nova usa `BackBar` (src/ui/BackBar.tsx), que tem o rótulo de
 * voltar em texto ("‹ Jornada", "‹ Dia 17", "Cancelar") como no desenho. Este
 * fica só para as telas antigas e sai com a última delas.
 */
export function TopBar({
  title,
  right,
  onBack,
  tone = 'default',
}: {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
  tone?: 'default' | 'ink';
}) {
  const { colors } = useTheme();
  const ink = tone === 'ink' ? '#FFFFFF' : colors.text;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TOUCH,
        gap: spacing.sm,
      }}
    >
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        testID="back-button"
        style={({ pressed }) => [
          { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'flex-start', justifyContent: 'center' },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Icon name="chevron-left" size={24} color={ink} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <AppText style={{ fontFamily: fonts.label, fontSize: 15, color: ink }} numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
      </View>
      <View style={{ minWidth: MIN_TOUCH, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Botão de ícone de 48×48 para as barras de topo. */
export function BarButton({
  icon,
  label,
  onPress,
  tone = 'default',
  testID,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  tone?: 'default' | 'ink';
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Icon name={icon} size={22} color={tone === 'ink' ? '#FFFFFF' : colors.text} />
    </Pressable>
  );
}
