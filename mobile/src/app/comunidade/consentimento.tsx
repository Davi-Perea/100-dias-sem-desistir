import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_TERMS_NOTICE } from '@/community/demoApi';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Button, LoadingCaption, Screen } from '@/ui/components';
import { availabilityNotice, continueFlow, useTermsAcceptance } from '@/ui/comunidade/publicar/aceite';
import { flowParams, parseDay, ROUTES, safeNext } from '@/ui/comunidade/publicar/fluxo';
import { NoticeBand, TermsBody } from '@/ui/comunidade/publicar/partes';
import { consentDocument } from '@/ui/comunidade/publicar/textos';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { BRAND_YELLOW, MAX_CONTENT_WIDTH, fixedPalette, spacing, useGutter } from '@/ui/theme';

/**
 * C4 · Consentimento destacado, antes da primeira publicação.
 *
 * Superfície FIXA em tinta (TOKENS §2): as cores não mudam com o tema, e por
 * isso vêm de `fixedPalette('ink')` (texto branco 18,88:1, secundário 10,84:1,
 * marcador amarelo 12,92:1). Texto do rascunho legal §2, com a frase única de
 * quem vê (§3). Nada começa marcado: sem tocar no botão, nada é aceito.
 *
 * O aceite envia a versão do servidor e o sha256 do texto exato mostrado. Se a
 * versão ainda for PENDENTE, a tela diz que a publicação não foi liberada pela
 * igreja e não oferece o botão. Pede de novo quando o texto muda (o servidor
 * devolve `needs_publish_consent` para a versão nova), por isso não existe "uma
 * vez na vida".
 *
 * "Guardar só para mim" → B5 do dia (nada é enviado); sem dia, volta.
 */
export default function ConsentScreen() {
  const params = useLocalSearchParams<{ next?: string; day?: string }>();
  const next = safeNext(params.next);
  const day = parseDay(params.day);
  const colors = fixedPalette('ink');
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const state = useCommunityStatus();
  const [doc] = useState(() => consentDocument());
  const { availability, accept, busy, error, demo } = useTermsAcceptance(doc, state);

  const keepForMe = () => {
    if (day !== null) router.replace({ pathname: '/reflexao/[day]', params: { day: String(day) } });
    else goBackOrHome();
  };

  const onAccept = async () => {
    if (await accept()) continueFlow({ after: 'consent', needsPublishConsent: false, next, day });
  };

  const notice = availability ? availabilityNotice(availability) : null;
  const rulesPending = state.kind === 'ready' && state.status.needsRules;

  const action = (() => {
    if (state.kind === 'loading') return <LoadingCaption />;
    if (state.kind === 'unavailable') return <NoticeBand text={state.message} colors={colors} testID="consent-notice" />;
    if (state.kind === 'signed_out') {
      return (
        <NoticeBand
          text="Para publicar, entre com o seu e-mail. A comunidade é para quem tem 18 anos ou mais."
          colors={colors}
          testID="consent-notice"
        />
      );
    }
    if (state.kind === 'error') {
      return (
        <View style={{ gap: spacing.sm }}>
          <NoticeBand text={state.message} colors={colors} testID="consent-notice" />
          <Button title="Tentar de novo" variant="outline" tone="ink" onPress={state.reload} />
        </View>
      );
    }
    if (notice) return <NoticeBand text={notice} colors={colors} testID="consent-notice" />;
    if (rulesPending) {
      // As regras vêm antes (rascunho §1). Chegar aqui sem elas é link direto.
      return (
        <Button
          title="Ler as regras primeiro"
          variant="yellow"
          tone="ink"
          onPress={() => router.replace({ pathname: ROUTES.regras, params: flowParams(next, day) })}
          testID="consent-rules-first"
        />
      );
    }
    return (
      <View style={{ gap: spacing.sm }}>
        {error ? (
          <AppText
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
            testID="consent-error"
          >
            {error}
          </AppText>
        ) : null}
        <Button
          title="Concordo e quero publicar"
          variant="yellow"
          tone="ink"
          onPress={onAccept}
          loading={busy}
          testID="consent-accept"
        />
      </View>
    );
  })();

  return (
    <Screen tone="ink">
      <StatusBar style="light" />
      <View style={{ paddingHorizontal: inset - spacing.sm }}>
        <BackBar label="Voltar" tone="ink" />
      </View>
      <ScrollView
        testID="consent-scroll"
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
      >
        <AppText
          variant="display"
          accessibilityRole="header"
          // C4: Schibsted 800 36/40 −1,4 em branco.
          style={{ fontSize: 36, lineHeight: 40, letterSpacing: -1.4, color: colors.text }}
          testID="consent-title"
        >
          {doc.title}
        </AppText>
        {notice && state.kind === 'ready' ? (
          <NoticeBand text={notice} colors={colors} testID="consent-top-notice" />
        ) : null}
        {demo ? <NoticeBand text={DEMO_TERMS_NOTICE} colors={colors} testID="consent-demo-notice" /> : null}
        <TermsBody doc={doc} colors={colors} marker={BRAND_YELLOW} />
        <Button
          title="Regras da comunidade"
          variant="underline"
          tone="ink"
          onPress={() => router.push({ pathname: ROUTES.regras, params: { ler: '1' } })}
          testID="consent-read-rules"
        />
        <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
          {action}
          <Button
            title="Guardar só para mim"
            variant="underline"
            tone="ink"
            onPress={keepForMe}
            accessibilityHint="Nada é enviado."
            testID="consent-keep"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
