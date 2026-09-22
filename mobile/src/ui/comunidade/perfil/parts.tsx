import { Stack } from 'expo-router';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ensureDeviceSession } from '@/community/deviceSession';
import { toCommunityError } from '@/community/errors';
import { BackBar } from '@/ui/BackBar';
import { AppText, Button, Screen, Sheet, StateView, useFace } from '@/ui/components';
import { faces, MAX_CONTENT_WIDTH, radius, spacing, useGutter, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import type { CommunityAccount } from './useCommunityAccount';

/**
 * Moldura das telas de conta e perfil: sem cabeçalho nativo (o título nativo não
 * cresce com a fonte), barra de voltar própria, calha do desenho e rolagem, para
 * nada ficar fora de alcance com a fonte grande.
 */
export function ProfileScreen({
  children,
  back,
  testID,
}: PropsWithChildren<{ back?: ReactNode; testID?: string }>) {
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        testID={testID}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: gutter,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl * 2,
          gap: spacing.xl,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + gutter * 2,
          alignSelf: 'center',
        }}
      >
        {back ?? <BackBar />}
        {children}
      </ScrollView>
    </Screen>
  );
}

/**
 * Os estados que não são "pronto": um só "Voltar", uma frase que explica sem
 * culpar, e uma saída. Nunca dado falso, nunca "em breve".
 */
export function AccountStateView({ account }: { account: Exclude<CommunityAccount, { kind: 'ready' }> }) {
  if (account.kind === 'loading') {
    return (
      <ProfileScreen testID="community-account-loading">
        <StateView kind="loading" />
      </ProfileScreen>
    );
  }
  if (account.kind === 'unavailable') {
    return (
      <ProfileScreen testID="community-account-unavailable">
        <StateView
          kind="empty"
          icon="community"
          title="Juntos indisponível"
          message="O Juntos não está disponível nesta versão do app. Sua jornada pessoal continua funcionando por completo neste aparelho."
        />
      </ProfileScreen>
    );
  }
  if (account.kind === 'signed_out') return <SignedOutIntro />;
  return (
    <ProfileScreen testID="community-account-error">
      <StateView
        kind="error"
        icon="alert"
        title="Não deu para carregar"
        message={`${account.message} Sua jornada e as suas reflexões estão salvas neste aparelho.`}
        action={<Button title="Tentar de novo" onPress={account.retry} testID="community-retry" />}
      />
    </ProfileScreen>
  );
}

/**
 * Conta SEM e-mail (C2): a conta fica ligada a este aparelho (sessão anônima do
 * Supabase; na demonstração, direto). Desde 2026-09-22 (aba "Juntos") ela é
 * criada SOZINHA: nenhuma tela pede "entrar". Esta frase fica para "Conta e
 * privacidade" explicar o que é a conta.
 */
export const DEVICE_ACCOUNT_COPY = 'Sua conta no Juntos fica ligada a este celular, sem e-mail e sem senha.';

/** Sem sessão: cria a do aparelho sozinha e espera. Se não der, diz e oferece tentar de novo. */
function SignedOutIntro() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    ensureDeviceSession().catch((failure: unknown) => {
      if (alive) setError(toCommunityError(failure).message);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);
  return (
    <ProfileScreen testID="community-account-signed-out">
      {error ? (
        <StateView
          kind="error"
          icon="alert"
          title="Não deu para abrir agora"
          message={error}
          action={
            <Button
              title="Tentar de novo"
              onPress={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
              testID="community-sign-in"
            />
          }
        />
      ) : (
        <StateView kind="loading" />
      )}
    </ProfileScreen>
  );
}

/** Erro de uma ação, em `danger`, anunciado também no iOS. */
export function ActionError({ message, testID = 'action-error' }: { message: string | null; testID?: string }) {
  const { colors } = useTheme();
  useEffect(() => {
    if (message) announceNotice(message);
  }, [message]);
  if (!message) return null;
  return (
    <AppText
      variant="rowLabel"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.danger }}
      testID={testID}
    >
      {message}
    </AppText>
  );
}

/** Confirmação na folha modal: uma frase do que acontece e duas saídas do mesmo tamanho. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
  error = null,
  children,
  confirmDisabled = false,
  testID,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
  confirmDisabled?: boolean;
  testID?: string;
}>) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} title={title} testID={testID}>
      <AppText variant="body" style={{ color: colors.textSecondary }}>
        {message}
      </AppText>
      {children}
      <ActionError message={error} testID={testID ? `${testID}-error` : 'confirm-error'} />
      <View style={{ gap: spacing.md }}>
        <Button
          title={confirmLabel}
          onPress={onConfirm}
          loading={busy}
          disabled={confirmDisabled}
          testID={testID ? `${testID}-confirm` : 'confirm'}
        />
        <Button
          title="Cancelar"
          variant="outline"
          onPress={onClose}
          disabled={busy}
          testID={testID ? `${testID}-cancel` : 'confirm-cancel'}
        />
      </View>
    </Sheet>
  );
}

/**
 * Campo de uma linha (nome, e-mail, palavra de confirmação). Borda de 1,5px em
 * `controlBorder` (3,59:1) e, com foco, 2,5px em tinta: o foco muda de espessura
 * e de tom. `minHeight` + `paddingVertical`, nunca `height`, e sem teto de fonte.
 */
export function LineField({
  value,
  onChangeText,
  accessibilityLabel,
  testID,
  placeholder,
  autoCapitalize = 'none',
  maxLength,
  onSubmitEditing,
  keyboardType,
  autoComplete,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  testID?: string;
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  maxLength?: number;
  onSubmitEditing?: () => void;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'name' | 'off';
}) {
  const { colors } = useTheme();
  const face = useFace();
  const [focused, setFocused] = useState(false);
  const border = focused ? 2.5 : 1.5;
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      spellCheck={false}
      maxLength={maxLength}
      onSubmitEditing={onSubmitEditing}
      keyboardType={keyboardType}
      autoComplete={autoComplete}
      returnKeyType="done"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        minHeight: 56,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg + (2.5 - border),
        borderWidth: border,
        borderColor: focused ? colors.text : colors.controlBorder,
        backgroundColor: colors.surface,
        borderRadius: radius.button,
        fontFamily: face(faces.sg500),
        fontSize: 17,
        color: colors.text,
      }}
    />
  );
}
