import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';

import { AppText, Block, Button, StateView, useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { goBackOrHome } from '@/ui/BackBar';
import { COMMUNITY_ENTRY_ROUTE } from '@/ui/comunidade/perfil/routes';
import { MIN_TOUCH, type Palette, faces, spacing, useTheme } from '@/ui/theme';

import { audienceSentence, type TermsDocument } from './textos';
import type { CommunityStatusState } from './useCommunityStatus';

/**
 * Peças das telas de publicar, regras e consentimento. Só composição dos
 * componentes-base (src/ui/components.tsx); nada de token novo.
 */

/* ------------------------------------------------------------- negrito */

/** Divide "a **b** c" em trechos; os ímpares são negrito. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split('**')
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}

/**
 * Texto com o negrito do rascunho. O peso vem da FACE (nunca `fontWeight`):
 * Source Serif 600 no corpo serifado, Schibsted 700 no de interface.
 */
export function RichText({
  text,
  variant = 'body',
  color,
  serif = true,
  testID,
}: {
  text: string;
  variant?: 'body' | 'bodySm' | 'item' | 'rowLabel';
  color: string;
  serif?: boolean;
  testID?: string;
}) {
  const face = useFace();
  const boldFace = face(serif ? faces.ss600 : faces.sg700);
  return (
    <AppText variant={variant} style={{ color }} testID={testID}>
      {splitBold(text).map((part, index) =>
        part.bold ? (
          <Text key={index} style={{ fontFamily: boldFace }}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </AppText>
  );
}

/* ------------------------------------------------------- corpo do texto */

/**
 * Seções de um documento (regras ou consentimento). `marker` é o ponto de 10px
 * da lista: amarelo em C4 (sobre tinta, 12,92:1), tinta nas regras.
 */
export function TermsBody({ doc, colors, marker }: { doc: TermsDocument; colors: Palette; marker: string }) {
  return (
    <View style={{ gap: spacing.xl }}>
      {doc.sections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={{ gap: spacing.md }}>
          {section.title ? (
            <AppText variant="readingRef" accessibilityRole="header" style={{ color: colors.text }}>
              {section.title}
            </AppText>
          ) : null}
          {(section.paragraphs ?? []).map((paragraph, index) => (
            <RichText key={`p${index}`} text={paragraph} color={colors.textSecondary} />
          ))}
          {(section.bullets ?? []).map((bullet, index) => (
            <View key={`b${index}`} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
              <View
                aria-hidden
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: marker, marginTop: 9 }}
              />
              <View style={{ flex: 1 }}>
                <RichText text={bullet} color={colors.text} variant="item" serif={false} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------ aviso de quem vê */

/**
 * Aviso permanente acima do campo (C3, REGRAS 18) com a frase única (rascunho
 * §3). `blueSoft` + `onBlueSoft`: 14,05:1 no claro, 15,94:1 no escuro.
 */
export function AudienceNotice({ testID = 'audience-notice' }: { testID?: string }) {
  const { colors } = useTheme();
  return (
    <Block tone="blueSoft" style={{ borderRadius: 16 }} testID={testID}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <View aria-hidden style={{ paddingTop: 2 }}>
          <Icon name="community" size={22} color={colors.blue} cutout={colors.blueSoft} />
        </View>
        <AppText variant="bodySm" style={{ flex: 1, color: colors.onBlueSoft }}>
          {audienceSentence()}
        </AppText>
      </View>
    </Block>
  );
}

/* ---------------------------------------------------------------- teclado */

/**
 * Teclado aberto é estado de layout (REGRAS 28). No iOS os eventos "will"
 * chegam antes da animação; no Android só existem os "did".
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, () => setVisible(true));
    const b = Keyboard.addListener(hide, () => setVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}

/* ------------------------------------------------- estados sem formulário */

/**
 * Tudo o que não é o formulário: carregando, Comunidade desligada, sem conta,
 * erro do servidor, sem perfil, suspenso. Sempre com uma saída.
 */
export function CommunityGateView({
  state,
  step,
}: {
  state: CommunityStatusState & { reload: () => void };
  step?: 'needs_join' | 'blocked' | 'profile' | 'cannot_publish';
}) {
  const back = <Button title="Voltar" variant="outline" onPress={goBackOrHome} testID="gate-back" />;
  if (state.kind === 'loading') return <StateView kind="loading" />;
  if (state.kind === 'unavailable') {
    return <StateView kind="empty" icon="community" title="Comunidade" message={state.message} action={back} />;
  }
  if (state.kind === 'signed_out') {
    return (
      <StateView
        kind="empty"
        icon="community"
        title="Entre na comunidade"
        message="Para escrever para a igreja, entre na comunidade. Basta criar o seu perfil; não precisa de e-mail."
        action={
          <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
            <Button title="Entrar na comunidade" onPress={() => router.push(COMMUNITY_ENTRY_ROUTE)} testID="gate-sign-in" />
            <Button title="Agora não" variant="underline" onPress={goBackOrHome} />
          </View>
        }
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <StateView
        kind="error"
        icon="alert"
        title="Não foi possível abrir"
        message={state.message}
        action={
          <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
            <Button title="Tentar de novo" onPress={state.reload} testID="gate-retry" />
            <Button title="Voltar" variant="underline" onPress={goBackOrHome} />
          </View>
        }
      />
    );
  }
  if (step === 'needs_join') {
    return (
      <StateView
        kind="empty"
        icon="community"
        title="Entre na comunidade"
        message="Para participar, crie o seu perfil. Quem cria o perfil entra na comunidade."
        action={
          <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
            <Button title="Criar meu perfil" onPress={() => router.push(COMMUNITY_ENTRY_ROUTE)} testID="gate-join" />
            <Button title="Agora não" variant="underline" onPress={goBackOrHome} testID="gate-back" />
          </View>
        }
      />
    );
  }
  if (step === 'blocked') {
    return (
      <StateView
        kind="empty"
        icon="lock"
        title="Participação suspensa"
        message="Sua participação na comunidade está suspensa."
        action={back}
      />
    );
  }
  return (
    <StateView
      kind="empty"
      icon="lock"
      title="Publicação indisponível"
      message="Antes de publicar, leia e aceite as regras e o consentimento."
      action={back}
    />
  );
}

/** Faixa de aviso (texto pendente ou desatualizado): `warningSurface` + `warning` (5,00:1 / 8,91:1). */
export function NoticeBand({ text, colors, testID }: { text: string; colors: Palette; testID?: string }) {
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.warningSurface,
        borderRadius: 14,
        padding: spacing.lg,
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'flex-start',
      }}
    >
      <View aria-hidden style={{ paddingTop: 1 }}>
        <Icon name="alert" size={18} color={colors.warning} />
      </View>
      <AppText variant="rowLabel" style={{ flex: 1, color: colors.warning }}>
        {text}
      </AppText>
    </View>
  );
}


