import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toCommunityError } from '@/community/errors';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { TextField } from '@/ui/TextField';
import { AppText, Block, Button, Screen, StateView } from '@/ui/components';
import { LimitNote } from '@/ui/comunidade/LimitNote';
import { MY_POSTS_ROUTE } from '@/ui/comunidade/perfil/routes';
import { flowParams, parseDay, publishStep, ROUTES, sentCopy, type Sent } from '@/ui/comunidade/publicar/fluxo';
import { pickFromLibrary, preparePhoto, type PreparedPhoto } from '@/ui/comunidade/publicar/foto';
import { AudienceNotice, CommunityGateView, RichText, useKeyboardVisible } from '@/ui/comunidade/publicar/partes';
import { PHOTO_WARNING } from '@/ui/comunidade/publicar/textos';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, radius, spacing, useGutter, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';
import { ToggleRow } from '@/ui/voce/ToggleRow';

/** Piso do campo (TELAS C3). */
const FIELD_MIN_HEIGHT = 140;
/** A partir daqui o contador aparece. O limite é o do servidor (LIMITS.postBody), não os 5.000 do desenho. */
const COUNTER_FROM = LIMITS.postBody - 200;

/**
 * C3 · Publicar: texto e uma foto opcional.
 *
 * - Antes do formulário, o fluxo: entrar (sem e-mail, conta do aparelho),
 *   entrar criando o perfil (sem código, C3), perfil completo (foto, nome,
 *   ministério e 16+, C1/C4),
 *   regras aceitas e consentimento dado (rascunho legal §1–2). O que faltar, a
 *   tela leva até lá ou diz o que é.
 * - Aviso PERMANENTE acima do campo com a frase única de quem vê (REGRAS 18).
 * - A foto: aviso sobre rosto de outras pessoas e crianças no momento de escolher;
 *   preparada no aparelho (1600 px, JPEG 0,8, sem EXIF/XMP/IPTC) e só enviada
 *   ao publicar.
 * - O campo começa VAZIO, sempre. A reflexão privada (B5) nunca pré-preenche uma
 *   publicação (REGRAS 14): esta tela não lê a reflexão.
 * - Teclado aberto é estado de layout (REGRAS 28): com ele, a área da foto vira uma
 *   linha curta ABAIXO do campo, para o aviso e o campo ficarem à vista.
 * - Sem localização e sem marcar pessoas.
 *
 * Parâmetro: `day` (dia da leitura concluída, vindo de B4). Sem ele, não há "Marcar o dia".
 */
export default function PublishScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = parseDay(params.day);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const { width } = useWindowDimensions();
  const keyboard = useKeyboardVisible();
  const state = useCommunityStatus();

  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoStage, setPhotoStage] = useState<'idle' | 'warning' | 'preparing'>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [markDay, setMarkDay] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const step = state.kind === 'ready' ? publishStep(state.status) : null;

  // Perfil, regras e consentimento são telas próprias; esta volta depois.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || (step !== 'profile' && step !== 'rules' && step !== 'consent')) return;
    redirected.current = true;
    const pathname = step === 'profile' ? ROUTES.perfil : step === 'rules' ? ROUTES.regras : ROUTES.consentimento;
    router.replace({ pathname, params: flowParams(ROUTES.publicar, day) } as never);
  }, [step, day]);

  useEffect(() => {
    if (sent) announceNotice(`${sentCopy(sent).title}. ${sentCopy(sent).message}`);
  }, [sent]);

  const cleaned = cleanText(body);
  const length = charLength(body.trim());
  const overLimit = length > LIMITS.postBody;
  const dirty = cleaned !== null || photo !== null;
  const canSend = dirty && !overLimit && !sending && photoStage !== 'preparing';

  const cancel = () => {
    if (!dirty || sent) {
      goBackOrHome();
      return;
    }
    Alert.alert('Descartar publicação?', 'O que você escreveu e a foto escolhida não serão enviados.', [
      { text: 'Continuar escrevendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: goBackOrHome },
    ]);
  };

  const choosePhoto = async () => {
    setPhotoError(null);
    setPhotoStage('preparing');
    try {
      const picked = await pickFromLibrary();
      if (picked) setPhoto(await preparePhoto(picked));
    } catch (failure) {
      setPhotoError(toCommunityError(failure).message);
    } finally {
      setPhotoStage('idle');
    }
  };

  const send = async () => {
    if (state.kind !== 'ready' || !canSend) return;
    const { api } = state;
    setSending(true);
    setSendError(null);
    let uploaded: string | null = null;
    try {
      if (photo) uploaded = await api.uploadPhoto(photo.bytes);
      const result = await api.createPost({
        body: cleaned,
        photoPath: uploaded,
        day: day !== null && markDay ? day : null,
      });
      setSent({ status: result.status, hadPhoto: photo !== null });
    } catch (failure) {
      // A foto subiu mas o post não foi criado: não deixa arquivo solto.
      if (uploaded) api.discardPhoto(uploaded).catch(() => {});
      const known = toCommunityError(failure);
      if (known.code === 'needs_consent' || known.code === 'terms_outdated' || known.code === 'needs_profile') {
        // O texto mudou, o aceite caiu ou o perfil ficou incompleto (foto recusada):
        // o status novo leva de volta ao fluxo.
        redirected.current = false;
        state.reload();
      }
      setSendError(known.message);
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------------------------------ fora do formulário */

  if (state.kind !== 'ready' || step !== 'form') {
    const gateStep = step === 'needs_join' || step === 'blocked' || step === 'cannot_publish' ? step : undefined;
    const waiting = step === 'profile' || step === 'rules' || step === 'consent';
    return (
      <Screen>
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar label="Voltar" />
        </View>
        {waiting ? <StateView kind="loading" /> : <CommunityGateView state={state} step={gateStep} />}
      </Screen>
    );
  }

  if (sent) {
    const copy = sentCopy(sent);
    return (
      <Screen>
        <StateView
          kind="empty"
          icon={sent.status === 'published' ? 'check' : 'clock'}
          title={copy.title}
          message={copy.message}
          action={
            sent.status === 'published' ? (
              <Button title="Voltar" onPress={goBackOrHome} testID="publish-done" />
            ) : (
              <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
                <Button
                  title="Ver minhas publicações"
                  onPress={() => router.replace(MY_POSTS_ROUTE)}
                  testID="publish-my-posts"
                />
                <Button title="Voltar" variant="underline" onPress={goBackOrHome} testID="publish-done" />
              </View>
            )
          }
        />
      </Screen>
    );
  }

  /* ---------------------------------------------------------------- foto */

  const areaMinHeight = Math.round((Math.min(width, MAX_CONTENT_WIDTH + inset * 2) - inset * 2) * 0.75);

  const photoWarning = (
    <Block tone="warm" testID="photo-warning">
      <View style={{ gap: spacing.md }}>
        <AppText variant="rowLabel" accessibilityRole="header">
          {PHOTO_WARNING.title}
        </AppText>
        {PHOTO_WARNING.bullets.map((line, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <View
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text, marginTop: 9 }}
            />
            <View style={{ flex: 1 }}>
              <RichText text={line} variant="bodySm" color={colors.textSecondary} />
            </View>
          </View>
        ))}
        <Button title="Escolher do celular" onPress={choosePhoto} testID="photo-pick" />
        <Button title="Agora não" variant="underline" onPress={() => setPhotoStage('idle')} testID="photo-warning-close" />
      </View>
    </Block>
  );

  const photoErrorNode = photoError ? (
    <AppText
      variant="bodySm"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.danger }}
      testID="photo-error"
    >
      {photoError}
    </AppText>
  ) : null;

  const photoActions = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg }}>
      <Button
        title="Trocar foto"
        variant="underline"
        onPress={() => setPhotoStage('warning')}
        testID="photo-change"
      />
      <Button title="Tirar a foto" variant="underline" onPress={() => setPhoto(null)} testID="photo-remove" />
    </View>
  );

  const photoSection = (() => {
    if (photoStage === 'warning') return photoWarning;
    if (photoStage === 'preparing') {
      return (
        <View
          testID="photo-preparing"
          accessibilityLiveRegion="polite"
          style={{ minHeight: keyboard ? MIN_TOUCH : areaMinHeight, justifyContent: 'center' }}
        >
          <AppText variant="caption">Preparando a foto…</AppText>
        </View>
      );
    }
    if (photo) {
      if (keyboard) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH }}>
            <Image
              source={{ uri: photo.uri }}
              style={{ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.sm }}
              accessible
              accessibilityLabel="Foto escolhida"
            />
            <AppText variant="rowLabel" style={{ flex: 1 }}>
              Foto escolhida
            </AppText>
            <Button title="Tirar a foto" variant="underline" onPress={() => setPhoto(null)} />
          </View>
        );
      }
      return (
        <View style={{ gap: spacing.xs }}>
          <Image
            testID="photo-preview"
            source={{ uri: photo.uri }}
            resizeMode="contain"
            accessible
            accessibilityLabel="Foto escolhida"
            style={{
              width: '100%',
              aspectRatio: Math.max(photo.width / Math.max(photo.height, 1), 3 / 4),
              borderRadius: 18,
              backgroundColor: colors.surfaceMuted,
            }}
          />
          {photoActions}
        </View>
      );
    }
    if (keyboard) {
      return (
        <Button
          title="Escolher uma foto (opcional)"
          variant="underline"
          onPress={() => setPhotoStage('warning')}
          testID="photo-open"
          style={{ alignSelf: 'flex-start' }}
        />
      );
    }
    return (
      <Pressable
        onPress={() => setPhotoStage('warning')}
        accessibilityRole="button"
        accessibilityLabel="Escolher uma foto. Opcional"
        testID="photo-open"
        style={({ pressed }) => [
          {
            minHeight: areaMinHeight,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.lg,
            borderRadius: 18,
            borderWidth: 2,
            borderStyle: 'dashed',
            // Limite de controle: 3,59:1 no branco, 5,15:1 no escuro.
            borderColor: colors.controlBorder,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <AppText variant="action" style={{ fontSize: 16, lineHeight: 21, textAlign: 'center' }}>
          Escolher uma foto
        </AppText>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Opcional
        </AppText>
      </Pressable>
    );
  })();

  /* --------------------------------------------------------------- tela */

  const publishPill = (
    <Button
      title="Publicar"
      variant="blue"
      onPress={send}
      disabled={!canSend}
      loading={sending}
      // C3: pílula `blue` de piso 48 e raio 999 (o Button cresce com a fonte).
      style={{ minHeight: MIN_TOUCH, borderRadius: radius.pill, paddingVertical: spacing.sm }}
      testID="publish-send"
    />
  );

  const field = (
    <View style={{ gap: spacing.xs }}>
      <TextField
        minHeight={FIELD_MIN_HEIGHT}
        value={body}
        onChangeText={setBody}
        placeholder="O que Deus falou com você hoje?"
        accessibilityLabel="Texto da publicação"
        selectionColor={colors.text}
        testID="publish-input"
      />
      <LimitNote length={length} max={LIMITS.postBody} nearFrom={COUNTER_FROM} testID="publish-counter" />
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar
            label="Cancelar"
            chevron={false}
            onBack={cancel}
            backAccessibilityLabel="Cancelar publicação"
            right={publishPill}
          />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: inset,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.lg,
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH + inset * 2,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <AudienceNotice />
          {keyboard ? null : photoSection}
          {keyboard ? null : photoErrorNode}
          {field}
          {keyboard ? photoSection : null}
          {keyboard ? photoErrorNode : null}
          {day !== null ? (
            <ToggleRow
              first
              label={`Marcar o dia ${day}`}
              caption={`Aparece junto com a leitura do dia ${day}`}
              checked={markDay}
              onToggle={() => setMarkDay((value) => !value)}
              testID="publish-mark-day"
            />
          ) : null}
          {sendError ? (
            <AppText
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger }}
              testID="publish-error"
            >
              {sendError}
            </AppText>
          ) : null}
          <Button
            title="Regras da comunidade"
            variant="underline"
            onPress={() => router.push({ pathname: ROUTES.regras, params: { ler: '1' } })}
            style={{ alignSelf: 'flex-start' }}
            testID="publish-rules"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
