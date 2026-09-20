import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Dove } from './brand';
import { AppText, Avatar } from './components';
import { Icon } from './icons';
import { MIN_TOUCH, fonts, spacing, useTheme } from './theme';

/**
 * Lockup de cabeçalho: pomba + "100 dias na Palavra", com uma ação à direita.
 * Aparece no Início, na Jornada e nos estados.
 */
export function BrandHeader({ right, subtitle }: { right?: ReactNode; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Dove width={26} role="signature" />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: fonts.label, fontSize: 13.5, color: colors.text }}>
          100 dias na Palavra
        </AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

/**
 * Avatar do cabeçalho. Sem nome conhecido ele vira um botão neutro de conta —
 * inventar iniciais para quem não entrou seria mostrar uma identidade que não existe.
 */
export function AccountButton({ name }: { name: string | null }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/conta')}
      accessibilityRole="button"
      accessibilityLabel={name ? `Conta de ${name}` : 'Conta'}
      testID="account-button"
      style={({ pressed }) => [
        { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'flex-end', justifyContent: 'center' },
        pressed && { opacity: 0.72 },
      ]}
    >
      {name ? (
        <Avatar name={name} size={40} />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="person" size={20} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

/** Barra de topo das rotas contextuais: ‹ voltar, título opcional, ação à direita. */
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
