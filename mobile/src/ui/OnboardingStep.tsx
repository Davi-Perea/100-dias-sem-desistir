import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Screen } from './components';
import { spacing, useTheme } from './theme';

export const ONBOARDING_STEPS = 4;

/** Casca comum das telas de onboarding: cabeçalho, corpo rolável e rodapé fixo. */
export function OnboardingStep({
  step,
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<{ step: number; title: string; subtitle?: string; footer: ReactNode }>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View
          style={{ flexDirection: 'row', gap: 6 }}
          accessibilityRole="progressbar"
          accessibilityLabel={`Passo ${step} de ${ONBOARDING_STEPS}`}
          accessibilityValue={{ min: 1, max: ONBOARDING_STEPS, now: step }}>
          {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < step ? colors.accent : colors.surfaceSunken,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
          <AppText variant="display">{title}</AppText>
          {subtitle ? <AppText variant="secondary">{subtitle}</AppText> : null}
        </View>
        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}>
        {footer}
      </View>
    </Screen>
  );
}
