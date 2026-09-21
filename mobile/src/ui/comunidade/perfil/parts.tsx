import { router, Stack } from 'expo-router';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_BADGE, demoSignIn, isCommunityDemo } from '@/community/demoApi';
import { BackBar } from '@/ui/BackBar';
import { AppText, Button, Screen, Sheet, StateView, useFace } from '@/ui/components';
import { faces, MAX_CONTENT_WIDTH, radius, spacing, useGutter, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { SIGN_IN_ROUTE } from './routes';
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
          title="Comunidade indisponível"
          message="A comunidade não está disponível nesta versão do app. Sua jornada pessoal continua funcionando por completo neste aparelho."
        />
      </ProfileScreen>
    );
  }
  if (account.kind === 'signed_out' && isCommunityDemo()) {
    // Demonstração: o passo do e-mail é simulado. Nenhum e-mail sai, nenhum código é pedido.
    return (
      <ProfileScreen testID="community-account-demo-sign-in">
        <StateView
          kind="empty"
          icon="person"
          title="Entrar com o seu e-mail"
          message={`${DEMO_BADGE}. No app de verdade, aqui você digita o e-mail e recebe um código. Na demonstração, este passo é simulado.`}
          action={<Button title="Continuar na demonstração" onPress={demoSignIn} testID="community-demo-sign-in" />}
        />
      </ProfileScreen>
    );
  }
  if (account.kind === 'signed_out') {
    return (
      <ProfileScreen testID="community-account-signed-out">
        <StateView
          kind="empty"
          icon="person"
          title="Entre com o seu e-mail"
          message="Esta parte da comunidade usa a sua conta de e-mail. Sem senha: enviamos um código."
          action={
            <Button
              title="Entrar com meu e-mail"
              onPress={() => router.push(SIGN_IN_ROUTE)}
              testID="community-sign-in"
            />
          }
        />
      </ProfileScreen>
    );
  }
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
 * Campo de uma linha (código, nome, palavra de confirmação). Borda de 1,5px em
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
  mono = false,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  testID?: string;
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  maxLength?: number;
  /** Letras espaçadas, para o código de entrada. */
  mono?: boolean;
  onSubmitEditing?: () => void;
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
        fontFamily: face(mono ? faces.sg700 : faces.sg500),
        fontSize: mono ? 20 : 17,
        letterSpacing: mono ? 2 : 0,
        color: colors.text,
      }}
    />
  );
}
