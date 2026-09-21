import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isValidEmail,
  OTP_LENGTH,
  requestOtp,
  secondsUntilResendAllowed,
  signOut,
  verifyOtp,
} from '@/cloud/auth';
import { ACCOUNT_DELETION_AVAILABLE, isCloudConfigured } from '@/cloud/config';
import { CloudError } from '@/cloud/errors';
import { useCloudSession } from '@/cloud/useSession';
import { COMMUNITY_ENABLED } from '@/config/features';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, Cap, Screen, SettingRow, StateView, useFace } from '@/ui/components';
import { AccountDeletionSection } from '@/ui/comunidade/perfil/AccountDeletionSection';
import { COMMUNITY_ACCOUNT_ROUTE } from '@/ui/comunidade/perfil/routes';
import { faces, radius, spacing, useGutter, useTheme } from '@/ui/theme';

type Step = 'email' | 'code';

/**
 * Conta por e-mail + código (spec §3). Esta tela só aparece quando o usuário
 * pede algo que exige nuvem (§4) — nunca na abertura do app.
 *
 * PROVISÓRIO (pergunta 12 ao designer): "Conta e privacidade" não foi desenhada.
 * Enquanto ela não existir, o título diz o que a tela faz ("Criar ou entrar na
 * conta" / "Confirmar código", como antes) e não promete o que falta. Com
 * sessão, a tela mostra o e-mail conectado e "Sair". Exclusão de conta e
 * exportação dos dados ainda não existem: a tela diz isso sem botão morto.
 * É bloqueio de loja (LACUNAS B14), não lacuna visual — por isso a nuvem fica
 * desligada à força em build de release até a exclusão existir (decisão D-6).
 *
 * CORREÇÃO TÉCNICA: barra própria em vez do cabeçalho nativo (o título nativo
 * não cresce com a fonte do sistema); campos com a face do app, borda de 1,5px
 * em controlBorder (3,59:1) e sem teto de escala de fonte.
 */
export default function AccountScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const face = useFace();
  const gutter = useGutter();
  const configured = isCloudConfigured();
  const cloud = useCloudSession();

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
        <Stack.Screen options={{ headerShown: false }} />
        {/* Um só "Voltar": o da barra. */}
        <View style={{ paddingHorizontal: gutter, paddingTop: spacing.md }}>
          <BackBar />
        </View>
        <StateView
          kind="empty"
          title="Conta indisponível nesta versão"
          message="Esta versão do app ainda não tem conta. Sua jornada pessoal continua funcionando por completo neste aparelho."
        />
      </Screen>
    );
  }

  const signedInEmail = cloud.session?.user?.email ?? null;

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível sair da conta.');
    } finally {
      setBusy(false);
    }
  };

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
      goBackOrHome();
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível confirmar o código.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.lg,
          }}>
          <View style={{ gap: spacing.md }}>
            <BackBar />
            <AppText variant="screenTitle" accessibilityRole="header">
              {signedInEmail ? 'Sua conta' : step === 'email' ? 'Criar ou entrar na conta' : 'Confirmar código'}
            </AppText>
          </View>
          {signedInEmail ? (
            <>
              <View style={{ gap: spacing.sm }} testID="account-signed-in">
                <AppText variant="bodySm">Conectado como {signedInEmail}.</AppText>
                {COMMUNITY_ENABLED || ACCOUNT_DELETION_AVAILABLE ? null : (
                  <AppText variant="caption">
                    Excluir a conta e exportar os dados ainda não estão disponíveis nesta versão.
                  </AppText>
                )}
              </View>

              {COMMUNITY_ENABLED ? (
                // Com a Comunidade ligada, sair dela, apagar o que publicou e
                // excluir a conta moram em "Conta e privacidade" da comunidade.
                <SettingRow
                  first
                  label="Conta e privacidade"
                  onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)}
                  testID="account-community-privacy"
                />
              ) : null}

              {/* Apple 5.1.1(v): a exclusão depende só da sessão, nunca da Comunidade nem
                  de my_community_status responder. Por isso também mora aqui. */}
              {ACCOUNT_DELETION_AVAILABLE ? <AccountDeletionSection /> : null}

              {error ? (
                <AppText variant="rowLabel" accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="auth-error">
                  {error}
                </AppText>
              ) : null}

              <Button title="Sair desta conta" variant="outline" loading={busy} onPress={leave} testID="sign-out" />
            </>
          ) : step === 'email' ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="blockTitle" accessibilityRole="header">Sua conta</AppText>
                <AppText variant="bodySm">
                  {reason === 'group'
                    ? 'Para entrar em um grupo, precisamos identificar você. Nada da sua jornada pessoal muda.'
                    : reason === 'comunidade'
                      ? 'A comunidade usa uma conta com e-mail, só para quem tem 18 anos ou mais. Ninguém na comunidade vê o seu e-mail, e nada da sua jornada pessoal muda.'
                      : 'Usamos a conta apenas para o que depende do servidor.'}
                </AppText>
              </View>

              <Block tone="muted">
                <View style={{ gap: spacing.xs }}>
                  <Cap>Continua sem conta</Cap>
                  <AppText variant="caption">
                    Leitura, progresso, jejum, reflexão privada e lembrete seguem funcionando neste aparelho,
                    inclusive sem internet.
                  </AppText>
                </View>
              </Block>

              <View style={{ gap: spacing.sm }}>
                {/* Rótulo do campo, não seção: sem papel de cabeçalho (o campo já se anuncia). */}
                <AppText variant="cap" aria-hidden>
                  Seu e-mail
                </AppText>
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
                  testID="email-input"
                  style={{
                    minHeight: 56,
                    paddingVertical: spacing.md,
                    borderWidth: 1.5,
                    borderColor: colors.controlBorder,
                    backgroundColor: colors.surface,
                    borderRadius: radius.button,
                    paddingHorizontal: spacing.lg,
                    fontFamily: face(faces.sg500),
                    fontSize: 16,
                    color: colors.text,
                  }}
                />
                <AppText variant="caption">Enviamos um código de {OTP_LENGTH} dígitos. Sem senha.</AppText>
              </View>

              {error ? (
                <AppText variant="rowLabel" accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="auth-error">
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
                <AppText variant="blockTitle" accessibilityRole="header">Digite o código</AppText>
                <AppText variant="bodySm">Enviamos um código de {OTP_LENGTH} dígitos para {email}.</AppText>
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
                testID="code-input"
                style={{
                  minHeight: 60,
                  paddingVertical: spacing.md,
                  borderWidth: 1.5,
                  borderColor: colors.controlBorder,
                  backgroundColor: colors.surface,
                  borderRadius: radius.button,
                  paddingHorizontal: spacing.lg,
                  fontFamily: face(faces.sg700),
                  fontSize: 28,
                  letterSpacing: 8,
                  textAlign: 'center',
                  color: colors.text,
                }}
              />

              {error ? (
                <AppText variant="rowLabel" accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="auth-error">
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
