import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_LABELS_ON_SCREEN, DEMO_TERMS_NOTICE } from '@/community/demoApi';
import { useSettings } from '@/settings/settingsStore';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, LoadingCaption, Screen } from '@/ui/components';
import {
  aceiteNeeds,
  availabilityNotice,
  continueAfterAceite,
  markAceite,
  nameOk,
  useAceite,
} from '@/ui/comunidade/publicar/aceite';
import { AgeCheck, NameField } from '@/ui/comunidade/perfil/PerfilCampos';
import { parseDay, ROUTES, safeNext } from '@/ui/comunidade/publicar/fluxo';
import { CommunityGateView, NoticeBand, RichText, TermsBody } from '@/ui/comunidade/publicar/partes';
import { aceiteDocument, RULES_SUMMARY, rulesDocument } from '@/ui/comunidade/publicar/textos';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Tela ÚNICA de aceite do Juntos (pedido do fundador, 2026-09-22). Aparece só
 * na primeira interação que expõe a pessoa (primeira publicação, primeiro
 * comentário ou primeiro Amém), nunca para ler. Nela, e só nela:
 *
 *   - o consentimento destacado (LGPD art. 11, I), num bloco próprio, com a
 *     frase exata de quem vê;
 *   - as regras em quatro linhas, com o link para ler as completas (Google Play,
 *     conteúdo gerado por usuários);
 *   - "Tenho 16 anos ou mais" (ECA Digital), sem nada marcado de antemão;
 *   - o nome, só se ela ainda não deu um (o da entrada do app vem preenchido).
 *
 * Um botão só: "Concordo e continuar". Depois, a pessoa volta exatamente para a
 * ação que queria (o Amém é registrado, o comentário e o post continuam onde
 * estavam). "Agora não" volta sem nada enviado. Foto de perfil e ministério não
 * são pedidos.
 *
 * Parâmetros: `next` (rota do Juntos para onde seguir) e `day` (repassado).
 */
export default function AceiteScreen() {
  const params = useLocalSearchParams<{ next?: string; day?: string }>();
  const next = safeNext(params.next);
  const day = parseDay(params.day);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const settings = useSettings();
  const state = useCommunityStatus();
  const [docs] = useState(() => ({ rules: rulesDocument(), consent: aceiteDocument() }));
  const { availability, accept, busy, error, demo } = useAceite(docs, state);
  const [age, setAge] = useState(false);
  const [typedName, setTypedName] = useState<string | null>(null);

  const ready = state.kind === 'ready' ? state : null;
  const needs = ready ? aceiteNeeds(ready.status) : null;
  // O nome da entrada do app já vem escrito; a pessoa pode trocar.
  const name = typedName ?? settings?.profile.name ?? '';
  const notice = availability ? availabilityNotice(availability) : null;

  const leave = () => {
    markAceite('declined');
    goBackOrHome();
  };

  const onAccept = async () => {
    if (await accept({ name })) continueAfterAceite({ next, day });
  };

  const canAccept =
    needs !== null && (!needs.age || age) && (!needs.name || nameOk(name)) && availability === 'ready' && !busy;

  const action = (() => {
    if (state.kind !== 'ready') return <CommunityGateView state={state} />;
    if (notice) return <NoticeBand text={notice} colors={colors} testID="consent-notice" />;
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
          title="Concordo e continuar"
          onPress={onAccept}
          loading={busy}
          disabled={!canAccept}
          accessibilityHint={canAccept || busy ? undefined : hintFor(needs, age, name)}
          testID="consent-accept"
        />
      </View>
    );
  })();

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar label="Voltar" onBack={leave} />
        </View>
        <ScrollView
          testID="consent-scroll"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
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
          <AppText variant="display" accessibilityRole="header" testID="consent-title">
            {docs.consent.title}
          </AppText>
          {demo && DEMO_LABELS_ON_SCREEN ? (
            <NoticeBand text={DEMO_TERMS_NOTICE} colors={colors} testID="consent-demo-notice" />
          ) : null}

          {/* O consentimento destacado, num bloco só dele (LGPD art. 11, I). */}
          <Block tone="warm" testID="consent-block">
            <TermsBody doc={docs.consent} colors={colors} marker={colors.text} />
          </Block>

          <View style={{ gap: spacing.md }} testID="consent-rules">
            <AppText variant="readingRef" accessibilityRole="header">
              Regras do Juntos
            </AppText>
            {RULES_SUMMARY.map((line, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <View
                  aria-hidden
                  style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text, marginTop: 9 }}
                />
                <View style={{ flex: 1 }}>
                  <RichText text={line} color={colors.text} variant="item" serif={false} />
                </View>
              </View>
            ))}
            <Button
              title="Ler as regras completas"
              variant="underline"
              onPress={() => router.push({ pathname: ROUTES.regras, params: { ler: '1' } })}
              style={{ alignSelf: 'flex-start' }}
              testID="consent-read-rules"
            />
          </View>

          {needs?.name ? (
            <View style={{ gap: spacing.sm }} testID="consent-name">
              <AppText variant="readingRef" accessibilityRole="header">
                Seu nome
              </AppText>
              <AppText variant="bodySm">É como a igreja vai te ver. Não precisa ser o nome completo.</AppText>
              <NameField value={name} onChange={setTypedName} />
            </View>
          ) : null}

          {needs?.age ? <AgeCheck checked={age} onToggle={() => setAge((value) => !value)} /> : null}

          <View style={{ gap: spacing.md }}>
            {state.kind === 'loading' ? <LoadingCaption /> : action}
            <Button title="Agora não" variant="underline" onPress={leave} testID="consent-not-now" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function hintFor(needs: ReturnType<typeof aceiteNeeds> | null, age: boolean, name: string): string | undefined {
  if (!needs) return undefined;
  if (needs.age && !age) return 'Marque "Tenho 16 anos ou mais" para continuar.';
  if (needs.name && !nameOk(name)) return 'Escreva o seu nome para continuar.';
  return undefined;
}
