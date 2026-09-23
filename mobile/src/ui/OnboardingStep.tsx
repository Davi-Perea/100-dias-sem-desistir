import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';

import { BackBar } from './BackBar';
import { AppText, Screen, StepBar } from './components';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from './theme';

/**
 * Uma decisão por tela: nome, metas, leitura e — só onde o lembrete existe —
 * lembrete (F2 e os passos no mesmo molde). O jejum saiu da entrada em
 * 2026-09-22 (feedback E3): a pessoa liga em Meu jejum, onde fica também a nota
 * de privacidade.
 *
 * No navegador são TRÊS: o lembrete é notificação local do celular e não existe
 * lá (`REMINDERS_AVAILABLE`). O contador tem de acompanhar, senão a barra diria
 * "Passo 3 de 4" e ficaria faltando um passo que nunca chega.
 */
export const ONBOARDING_STEPS = REMINDERS_AVAILABLE ? 4 : 3;

/** Número de cada passo, para a barra e o "Passo N de N" não divergirem entre telas. */
export const ONBOARDING_STEP = { nome: 1, metas: 2, leitura: 3, lembrete: 4 } as const;

/** Voltar do passo: na pilha, ou para as boas-vindas se não houver pilha (deep link, recarga). */
export function backFromStep() {
  if (router.canGoBack()) router.back();
  else router.replace('/onboarding');
}

/**
 * Molde do F2 · "Como você vai ler": "‹ Voltar" + "Passo N de 4", quatro
 * segmentos, título Schibsted 800 34/38, as opções, a frase de apoio e o
 * primário no rodapé.
 *
 * O rodapé fica fixo e o miolo rola: em fonte grande as opções crescem, e o
 * "Continuar" não pode sair da tela junto com elas. Com o teclado aberto (passo
 * do nome) a coluna encolhe: 'padding' também no Android, pelo mesmo motivo do
 * B5 (edge-to-edge no RN 0.86, a janela não encolhe sozinha).
 */
export function OnboardingStep({
  step,
  title,
  support,
  footer,
  onBack = backFromStep,
  children,
}: PropsWithChildren<{
  step: number;
  title: string;
  /** Frase de apoio abaixo das opções. */
  support?: ReactNode;
  footer: ReactNode;
  onBack?: () => void;
}>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const inset = useGutter();
  const column = {
    paddingHorizontal: inset,
    width: '100%' as const,
    maxWidth: MAX_CONTENT_WIDTH + inset * 2,
    alignSelf: 'center' as const,
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={[column, { gap: spacing.sm }]}>
          <BackBar label="Voltar" onBack={onBack} rightText={`Passo ${step} de ${ONBOARDING_STEPS}`} />
          <StepBar step={step} total={ONBOARDING_STEPS} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[column, { paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md }]}
        >
          {/* F2 pede Schibsted 800 34/38, fora da escala do TOKENS (display é
              38/40, LACUNAS C60): vale a tela. O tracking não foi especificado e
              fica o do `display`. */}
          <AppText
            variant="display"
            accessibilityRole="header"
            style={{ fontSize: 34, lineHeight: 38, marginBottom: spacing.md }}
            testID="onboarding-step-title"
          >
            {title}
          </AppText>
          {children}
          {support ? <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>{support}</View> : null}
        </ScrollView>

        <View
          style={[
            column,
            {
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Frase de apoio do passo.
 * PROVISÓRIO (pergunta 18 ao designer): o TELAS dá a cópia do F2 mas não a
 * tipografia; sem as capturas do grupo F, fica o parágrafo de apoio do TOKENS
 * (`bodySm`, Source Serif 15/24 em `textSecondary`, 10,85:1).
 */
export function StepSupport({ children, testID }: PropsWithChildren<{ testID?: string }>) {
  return (
    <AppText variant="bodySm" testID={testID}>
      {children}
    </AppText>
  );
}
