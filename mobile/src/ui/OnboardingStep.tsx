import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Cap, Screen, StepBar } from './components';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from './theme';

/** Uma decisão por tela: leitura, jejum e lembrete. */
export const ONBOARDING_STEPS = 3;

/** Casca das telas 01b–01d: barra de passos, título de 32px e rodapé fixo. */
export function OnboardingStep({
  step,
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<{ step: number; title: string; subtitle?: string; footer: ReactNode }>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const inset = useGutter();

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, paddingHorizontal: inset, gap: spacing.md }}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Passo ${step} de ${ONBOARDING_STEPS}`}
          accessibilityValue={{ min: 1, max: ONBOARDING_STEPS, now: step }}
        >
          <StepBar step={step} total={ONBOARDING_STEPS} />
        </View>
        <Cap>
          Passo {step} de {ONBOARDING_STEPS}
        </Cap>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: inset,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + inset * 2,
          alignSelf: 'center',
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <AppText variant="blockTitleLg" style={{ fontSize: 32, lineHeight: 36 }}>
            {title}
          </AppText>
          {subtitle ? <AppText variant="secondary">{subtitle}</AppText> : null}
        </View>
        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: inset,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {footer}
      </View>
    </Screen>
  );
}
