import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_TERMS_NOTICE } from '@/community/demoApi';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Button, LoadingCaption, Screen } from '@/ui/components';
import { availabilityNotice, continueFlow, useTermsAcceptance } from '@/ui/comunidade/publicar/aceite';
import { COMMUNITY_ENTRY_ROUTE } from '@/ui/comunidade/perfil/routes';
import { fitsWithoutScroll, parseDay, reachedEnd, safeNext } from '@/ui/comunidade/publicar/fluxo';
import { NoticeBand, TermsBody } from '@/ui/comunidade/publicar/partes';
import { rulesDocument } from '@/ui/comunidade/publicar/textos';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Regras da comunidade. Aparecem antes da primeira publicação, comentário ou
 * Amém (rascunho legal §1): a pessoa rola até o fim e toca em "Li e aceito as
 * regras". Sem botão de pular; "Agora não" volta sem publicar.
 *
 * Parâmetros: `next` (rota da Comunidade para onde seguir), `day` (dia da
 * leitura, repassado), `ler=1` (só leitura, pelo link "Regras da comunidade").
 */
export default function RulesScreen() {
  const params = useLocalSearchParams<{ next?: string; day?: string; ler?: string }>();
  const readOnly = params.ler === '1';
  const next = safeNext(params.next);
  const day = parseDay(params.day);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const state = useCommunityStatus();
  const [doc] = useState(() => rulesDocument());
  const { availability, accept, busy, error, demo } = useTermsAcceptance(doc, state);

  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const atEnd = scrolledToEnd || fitsWithoutScroll(viewport, contentHeight);

  const onAccept = async () => {
    if (!(await accept())) return;
    const needsPublishConsent = state.kind === 'ready' ? state.status.needsPublishConsent : true;
    continueFlow({ after: 'rules', needsPublishConsent, next, day });
  };

  const alreadyAccepted = state.kind === 'ready' && !state.status.needsRules;
  const notice = availability ? availabilityNotice(availability) : null;

  const acceptArea = (() => {
    if (readOnly) {
      return <Button title="Voltar" variant="outline" onPress={goBackOrHome} testID="rules-back" />;
    }
    if (state.kind === 'loading') return <LoadingCaption />;
    if (state.kind === 'unavailable') return <NoticeBand text={state.message} colors={colors} testID="rules-notice" />;
    if (state.kind === 'signed_out') {
      // C6: antes era só um aviso, sem saída. Agora leva à entrada (sem e-mail).
      return <Button title="Entrar na comunidade" onPress={() => router.push(COMMUNITY_ENTRY_ROUTE)} testID="rules-enter" />;
    }
    if (state.kind === 'error') {
      return (
        <View style={{ gap: spacing.sm }}>
          <NoticeBand text={state.message} colors={colors} testID="rules-notice" />
          <Button title="Tentar de novo" variant="outline" onPress={state.reload} />
        </View>
      );
    }
    if (alreadyAccepted) {
      return (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption">Você já aceitou estas regras.</AppText>
          <Button
            title="Continuar"
            onPress={() =>
              continueFlow({ after: 'rules', needsPublishConsent: state.status.needsPublishConsent, next, day })
            }
            testID="rules-continue"
          />
        </View>
      );
    }
    if (notice) return <NoticeBand text={notice} colors={colors} testID="rules-notice" />;
    return (
      <View style={{ gap: spacing.sm }}>
        {error ? (
          <AppText
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
            testID="rules-error"
          >
            {error}
          </AppText>
        ) : null}
        <Button
          title="Li e aceito as regras"
          onPress={onAccept}
          disabled={!atEnd}
          loading={busy}
          accessibilityHint={atEnd ? undefined : 'Role até o fim das regras para aceitar.'}
          testID="rules-accept"
        />
        {atEnd ? null : <AppText variant="caption">Role até o fim das regras para aceitar.</AppText>}
      </View>
    );
  })();

  return (
    <Screen>
      <View style={{ paddingHorizontal: inset - spacing.sm }}>
        <BackBar label="Voltar" />
      </View>
      <ScrollView
        testID="rules-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: inset,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.xl,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + inset * 2,
          alignSelf: 'center',
        }}
        scrollEventThrottle={32}
        onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        onScroll={(event) => {
          if (!scrolledToEnd && reachedEnd(event.nativeEvent)) setScrolledToEnd(true);
        }}
      >
        <AppText variant="blockTitleLg" accessibilityRole="header" testID="rules-title">
          {doc.title}
        </AppText>
        {!readOnly && notice && state.kind === 'ready' && !alreadyAccepted ? (
          <NoticeBand text={notice} colors={colors} testID="rules-top-notice" />
        ) : null}
        {demo ? <NoticeBand text={DEMO_TERMS_NOTICE} colors={colors} testID="rules-demo-notice" /> : null}
        <TermsBody doc={doc} colors={colors} marker={colors.text} />
        <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
          {acceptArea}
          {readOnly ? null : (
            <Button title="Agora não" variant="underline" onPress={goBackOrHome} testID="rules-not-now" />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
