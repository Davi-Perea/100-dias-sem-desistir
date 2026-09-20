import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isValidEmail,
  OTP_LENGTH,
  requestOtp,
  secondsUntilResendAllowed,
  verifyOtp,
} from '@/cloud/auth';
import { isCloudConfigured } from '@/cloud/config';
import { CloudError } from '@/cloud/errors';
import { AppText, Button, Card, Screen, StateView } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

type Step = 'email' | 'code';

/**
 * Conta por e-mail + código (spec §3). Esta tela só aparece quando o usuário
 * pede algo que exige nuvem (§4) — nunca na abertura do app.
 */
export default function AccountScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const configured = isCloudConfigured();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!configured) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Conta' }} />
        <StateView
          kind="empty"
          title="Conta indisponível nesta versão"
          message="Esta build não está conectada ao servidor. Sua jornada pessoal continua funcionando por completo."
          action={<Button title="Voltar" variant="underline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(email);
      setStep('code');
      setCooldown(secondsUntilResendAllowed(email));
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email, code);
      // Volta exatamente para onde o usuário estava (spec §4).
      router.back();
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível confirmar o código.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: step === 'email' ? 'Criar ou entrar na conta' : 'Confirmar código' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.lg,
          }}>
          {step === 'email' ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="blockTitle">Sua conta</AppText>
                <AppText variant="secondary">
                  {reason === 'group'
                    ? 'Para entrar em um grupo, precisamos identificar você. Nada da sua jornada pessoal muda.'
                    : 'Usamos a conta apenas para o que depende do servidor.'}
                </AppText>
              </View>

              <Card tone="muted">
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="cap">Continua sem conta</AppText>
                  <AppText variant="muted">
                    Leitura, progresso, jejum, reflexão privada e lembrete seguem funcionando neste aparelho,
                    inclusive sem internet.
                  </AppText>
                </View>
              </Card>

              <View style={{ gap: spacing.sm }}>
                <AppText variant="cap">Seu e-mail</AppText>
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Seu endereço de e-mail"
                  maxFontSizeMultiplier={1.8}
                  testID="email-input"
                  style={{
                    minHeight: 52,
                    borderWidth: 1,
                    borderColor: colors.controlBorder,
                    backgroundColor: colors.surface,
                    borderRadius: radius.button,
                    paddingHorizontal: spacing.lg,
                    fontSize: 16,
                    color: colors.text,
                  }}
                />
                <AppText variant="muted">Enviamos um código de {OTP_LENGTH} dígitos. Sem senha.</AppText>
              </View>

              {error ? (
                <AppText accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="auth-error">
                  {error}
                </AppText>
              ) : null}

              <Button
                title="Enviar código"
               
                loading={busy}
                disabled={!isValidEmail(email)}
                onPress={send}
                testID="send-code"
              />
            </>
          ) : (
            <>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="blockTitle">Digite o código</AppText>
                <AppText variant="secondary">Enviamos um código de {OTP_LENGTH} dígitos para {email}.</AppText>
              </View>

              <TextInput
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                  setError(null);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={`Código de ${OTP_LENGTH} dígitos`}
                maxFontSizeMultiplier={1.6}
                testID="code-input"
                style={{
                  minHeight: 60,
                  borderWidth: 1,
                  borderColor: colors.controlBorder,
                  backgroundColor: colors.surface,
                  borderRadius: radius.button,
                  paddingHorizontal: spacing.lg,
                  fontSize: 28,
                  letterSpacing: 8,
                  textAlign: 'center',
                  color: colors.text,
                }}
              />

              {error ? (
                <AppText accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="auth-error">
                  {error}
                </AppText>
              ) : null}

              <Button
                title="Confirmar"
               
                loading={busy}
                disabled={code.length !== OTP_LENGTH}
                onPress={confirm}
                testID="confirm-code"
              />

              <Button
                title={cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
                variant="underline"
                disabled={cooldown > 0 || busy}
                onPress={send}
                testID="resend-code"
              />

              <Button
                title="Usar outro e-mail"
                variant="underline"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
