import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toCommunityError } from '@/community/errors';
import { authorLine } from '@/community/profile';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { getDay } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { TextField } from '@/ui/TextField';
import { AppText, Block, Button, Screen, StateView } from '@/ui/components';
import { LimitNote } from '@/ui/comunidade/LimitNote';
import { MY_POSTS_ROUTE } from '@/ui/comunidade/perfil/routes';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { flowParams, parseDay, publishStep, ROUTES, sentCopy, type Sent } from '@/ui/comunidade/publicar/fluxo';
import {
  cameraConfigured,
  pickManyFromLibrary,
  preparePhoto,
  takePhoto,
  type PickedAsset,
  type PreparedPhoto,
} from '@/ui/comunidade/publicar/foto';
import { AudienceNotice, CommunityGateView, RichText } from '@/ui/comunidade/publicar/partes';
import { AttachBar, AttachChips, PhotoStrip, type AttachButton } from '@/ui/comunidade/publicar/pecas';
import { AudienceButton, PublicoSheet } from '@/ui/comunidade/publicar/PublicoSheet';
import {
  buildNewPost,
  hasAttachment,
  hasContent,
  isDirty,
  MAX_POST_PHOTOS,
  removeAttachment,
  upsertAttachment,
  type Attachment,
  type Audience,
  type VerseChip,
} from '@/ui/comunidade/publicar/rascunho';
import { PHOTO_WARNING } from '@/ui/comunidade/publicar/textos';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { VersiculoSheet } from '@/ui/comunidade/publicar/VersiculoSheet';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, radius, spacing, useGutter, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

/** Piso do campo (TELAS C3). */
const FIELD_MIN_HEIGHT = 140;
/** A partir daqui o contador aparece. O limite é o do servidor (LIMITS.postBody). */
const COUNTER_FROM = LIMITS.postBody - 200;
/** Depois de "Publicado", volta sozinho ao feed (o feed recarrega no foco e o post novo fica no topo). */
const BACK_TO_FEED_MS = 1500;

type PhotoItem = { key: string; photo: PreparedPhoto };
type PhotoStage = 'idle' | 'warning-galeria' | 'warning-camera' | 'preparing';

/** Referência formatada da leitura do dia (só o que o guia diz; o app não reescreve). */
function readingReference(day: number): string | null {
  return readingSummary(getDay(day))?.label ?? null;
}

/**
 * F2 · Criar post (modal), no formato de "diário compartilhado".
 *
 * - Cancelar · "Criar post" · avatar + "Nome · Ministério" de quem publica.
 * - A frase EXATA de quem vê (C5, texto do fundador) fica acima do campo, sempre.
 * - "O que Deus falou com você hoje?" começa VAZIO. A reflexão privada nunca
 *   pré-preenche (REGRAS 14): esta tela não lê a reflexão.
 * - Anexos (cada um é escolha da pessoa, e só o que ela anexou sai do aparelho):
 *   Leitura do dia ("Dia N · referência"), Versículo (um dos que ela marcou; só a
 *   referência; o texto da Bíblia Livre é só prévia, no aparelho), Oração ou
 *   Jejum (só o tipo), Galeria (até 4 fotos) e Câmera. Viram chips removíveis.
 * - Foto: aviso de rosto de outras pessoas e de crianças ANTES da galeria ou da
 *   câmera; preparada no aparelho (1600 px, JPEG 0,8, sem EXIF/XMP/IPTC) e só
 *   enviada ao publicar.
 * - Embaixo: "Toda a igreja ▾ / Meu ministério" e "Publicar".
 * - Antes do formulário, o fluxo de sempre: entrar, perfil completo (nome, foto,
 *   ministério, 16+), regras e consentimento.
 * - Depois: "Publicado" (volta ao feed) ou "Em análise" (F5: foto que o filtro
 *   segurou ou que espera uma pessoa; só o autor vê).
 * - Sem localização, sem marcar pessoas, sem mensagem privada.
 *
 * Sai o `NewPost` de src/community/types.ts (rascunho.ts): texto, até 4 fotos,
 * dia, tipo, referência do versículo e público. Nunca a anotação, a cor da
 * marca, o texto bíblico nem o registro de jejum.
 *
 * Parâmetro: `day` (dia concluído, vindo de "Dia N concluído"): a leitura desse
 * dia já vem anexada, e a pessoa pode tirar.
 */
export default function PublishScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const paramDay = parseDay(params.day);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const state = useCommunityStatus();
  const journey = useJourney();

  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoStage, setPhotoStage] = useState<PhotoStage>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(() =>
    paramDay !== null
      ? [
          {
            kind: 'leitura',
            day: paramDay,
            reference: readingReference(paramDay),
          },
        ]
      : [],
  );
  const [audience, setAudience] = useState<Audience>('igreja');
  const [sheet, setSheet] = useState<'verse' | 'audience' | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const photoSeq = useRef(0);

  const ready = state.kind === 'ready' ? state : null;
  const step = ready ? publishStep(ready.status) : null;
  const api = ready?.api ?? null;
  const profile = ready?.status.profile ?? null;
  const ministry = profile?.ministry ?? null;
  const displayName = ready?.status.displayName ?? profile?.displayName ?? '';
  const avatarPath = profile?.avatarPath ?? null;

  /** Dia que "Leitura do dia" anexa: o que veio da conclusão, ou o de hoje na campanha. */
  const readingDay = paramDay ?? (journey.phase === 'before_start' ? null : journey.officialDay);

  // Perfil, regras e consentimento são telas próprias; esta volta depois.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || (step !== 'profile' && step !== 'rules' && step !== 'consent')) return;
    redirected.current = true;
    const pathname = step === 'profile' ? ROUTES.perfil : step === 'rules' ? ROUTES.regras : ROUTES.consentimento;
    router.replace({
      pathname,
      params: flowParams(ROUTES.publicar, paramDay),
    } as never);
  }, [step, paramDay]);

  // Foto de perfil (URL assinada; a própria aparece mesmo em análise).
  useEffect(() => {
    if (!api || !avatarPath) return;
    let alive = true;
    api.signPhotoUrls([avatarPath]).then(
      (urls) => {
        if (alive) setAvatarUri(urls.get(avatarPath) ?? null);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [api, avatarPath]);

  useEffect(() => {
    if (!sent) return;
    const copy = sentCopy(sent);
    announceNotice(`${copy.title}. ${copy.message}`);
    if (sent.status !== 'published') return;
    // "Publicado": volta ao feed. Com leitor de tela, fica até a pessoa tocar (o aviso não é cortado).
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (on) => {
        if (alive && !on) timer = setTimeout(goBackOrHome, BACK_TO_FEED_MS);
      },
      () => {},
    );
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [sent]);

  const cleaned = cleanText(body);
  const length = charLength(body.trim());
  const overLimit = length > LIMITS.postBody;
  const draft = { body: cleaned, photoCount: photos.length, attachments };
  const dirty = isDirty(draft, paramDay);
  const canSend = hasContent(draft) && !overLimit && !sending && photoStage !== 'preparing';
  const photosLeft = MAX_POST_PHOTOS - photos.length;
  // Sem ministério no perfil ("Nenhum"), o post vai para a igreja inteira.
  const effectiveAudience: Audience = ministry ? audience : 'igreja';

  const cancel = () => {
    if (!dirty || sent) {
      goBackOrHome();
      return;
    }
    Alert.alert('Descartar publicação?', 'O que você escreveu e o que anexou não serão enviados.', [
      { text: 'Continuar escrevendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: goBackOrHome },
    ]);
  };

  /* ------------------------------------------------------------- fotos */

  const addPrepared = async (assets: PickedAsset[]) => {
    const prepared: PhotoItem[] = [];
    let failure: string | null = null;
    for (const asset of assets) {
      try {
        const photo = await preparePhoto(asset);
        photoSeq.current += 1;
        prepared.push({ key: `foto-${photoSeq.current}`, photo });
      } catch (error) {
        failure ??= toCommunityError(error).message;
      }
    }
    if (prepared.length > 0) setPhotos((current) => [...current, ...prepared].slice(0, MAX_POST_PHOTOS));
    if (failure) setPhotoError(failure);
  };

  const openPhotoWarning = (source: 'galeria' | 'camera') => {
    setPhotoError(null);
    if (photosLeft <= 0) {
      setPhotoError(`Cabem até ${MAX_POST_PHOTOS} fotos por publicação. Tire uma para escolher outra.`);
      return;
    }
    if (source === 'camera' && !cameraConfigured()) {
      setPhotoError('A câmera ainda não está liberada nesta versão do app. Escolha uma foto da galeria.');
      return;
    }
    setPhotoStage(source === 'galeria' ? 'warning-galeria' : 'warning-camera');
  };

  const pickPhotos = async () => {
    const fromCamera = photoStage === 'warning-camera';
    setPhotoError(null);
    setPhotoStage('preparing');
    try {
      if (fromCamera) {
        const shot = await takePhoto();
        if (shot.kind === 'denied') {
          setPhotoError(
            'Sem permissão para usar a câmera. Você pode liberar nos Ajustes do celular ou usar a galeria.',
          );
        } else if (shot.kind === 'photo') {
          await addPrepared([shot.asset]);
        }
      } else {
        await addPrepared(await pickManyFromLibrary(photosLeft));
      }
    } catch (failure) {
      setPhotoError(toCommunityError(failure).message);
    } finally {
      setPhotoStage('idle');
    }
  };

  /* ------------------------------------------------------------ anexos */

  const toggle = (next: Attachment) =>
    setAttachments((current) =>
      hasAttachment(current, next.kind) ? removeAttachment(current, next.kind) : upsertAttachment(current, next),
    );

  const verseAttached = (attachments.find((item) => item.kind === 'versiculo') as VerseChip | undefined) ?? null;

  const buttons: AttachButton[] = [
    {
      id: 'leitura',
      label: 'Leitura',
      accessibilityLabel: readingDay !== null ? `Leitura do dia ${readingDay}` : 'Leitura do dia',
      accessibilityHint: readingDay === null ? 'A campanha ainda não começou.' : undefined,
      selected: hasAttachment(attachments, 'leitura'),
      disabled: readingDay === null,
      onPress: () => {
        if (readingDay !== null)
          toggle({
            kind: 'leitura',
            day: readingDay,
            reference: readingReference(readingDay),
          });
      },
    },
    {
      id: 'versiculo',
      label: 'Versículo',
      accessibilityLabel: 'Versículo que você marcou',
      selected: verseAttached !== null,
      onPress: () => setSheet('verse'),
    },
    {
      id: 'oracao',
      label: 'Oração',
      accessibilityLabel: 'Oração',
      selected: hasAttachment(attachments, 'oracao'),
      onPress: () => toggle({ kind: 'oracao' }),
    },
    {
      id: 'jejum',
      label: 'Jejum',
      accessibilityLabel: 'Jejum',
      selected: hasAttachment(attachments, 'jejum'),
      onPress: () => toggle({ kind: 'jejum' }),
    },
    {
      id: 'galeria',
      label: 'Galeria',
      accessibilityLabel: `Galeria, até ${MAX_POST_PHOTOS} fotos`,
      selected: photos.length > 0,
      onPress: () => openPhotoWarning('galeria'),
    },
    {
      id: 'camera',
      label: 'Câmera',
      accessibilityLabel: 'Câmera',
      onPress: () => openPhotoWarning('camera'),
    },
  ];

  /* ------------------------------------------------------------- enviar */

  const send = async () => {
    if (!ready || !canSend) return;
    const client = ready.api;
    setSending(true);
    setSendError(null);
    const uploaded: string[] = [];
    try {
      for (const item of photos.slice(0, MAX_POST_PHOTOS)) uploaded.push(await client.uploadPhoto(item.photo.bytes));
      const input = buildNewPost({
        body: cleaned,
        photoPaths: uploaded,
        attachments,
        audience: effectiveAudience,
      });
      const result = await client.createPost(input);
      setSent({ status: result.status, hadPhoto: uploaded.length > 0 });
    } catch (failure) {
      // Fotos subiram mas o post não foi criado: não deixa arquivo solto.
      for (const path of uploaded) client.discardPhoto(path).catch(() => {});
      const known = toCommunityError(failure);
      if (known.code === 'needs_consent' || known.code === 'terms_outdated' || known.code === 'needs_profile') {
        // O texto mudou, o aceite caiu ou o perfil ficou incompleto: o status novo leva de volta ao fluxo.
        redirected.current = false;
        state.reload();
      }
      setSendError(known.message);
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------------------------------ fora do formulário */

  if (!ready || step !== 'form') {
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
              <Button title="Ver no feed" onPress={goBackOrHome} testID="publish-done" />
            ) : (
              <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
                <Button
                  title="Ver minhas publicações"
                  onPress={() => router.replace(MY_POSTS_ROUTE)}
                  testID="publish-my-posts"
                />
                <Button title="Voltar ao feed" variant="underline" onPress={goBackOrHome} testID="publish-done" />
              </View>
            )
          }
        />
      </Screen>
    );
  }

  /* ------------------------------------------------------------- partes */

  const photoWarning =
    photoStage === 'warning-galeria' || photoStage === 'warning-camera' ? (
      <Block tone="warm" testID="photo-warning">
        <View style={{ gap: spacing.md }}>
          <AppText variant="rowLabel" accessibilityRole="header">
            {PHOTO_WARNING.title}
          </AppText>
          {PHOTO_WARNING.bullets.map((line, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                alignItems: 'flex-start',
              }}
            >
              <View
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.text,
                  marginTop: 9,
                }}
              />
              <View style={{ flex: 1 }}>
                <RichText text={line} variant="bodySm" color={colors.textSecondary} />
              </View>
            </View>
          ))}
          <Button
            title={photoStage === 'warning-camera' ? 'Abrir a câmera' : 'Escolher do celular'}
            onPress={pickPhotos}
            testID="photo-pick"
          />
          <Button
            title="Agora não"
            variant="underline"
            onPress={() => setPhotoStage('idle')}
            testID="photo-warning-close"
          />
        </View>
      </Block>
    ) : null;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar
            label="Cancelar"
            chevron={false}
            onBack={cancel}
            backAccessibilityLabel="Cancelar publicação"
            title="Criar post"
          />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: inset,
            paddingTop: spacing.md,
            paddingBottom: spacing.xl,
            gap: spacing.lg,
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH + inset * 2,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: MIN_TOUCH,
            }}
            testID="publish-author"
          >
            <ProfileAvatar name={displayName || '?'} uri={avatarUri} size={44} />
            <AppText variant="rowLabel" style={{ flex: 1 }} testID="publish-author-line">
              {authorLine(displayName, ministry)}
            </AppText>
          </View>

          <AudienceNotice />

          <View style={{ gap: spacing.xs }}>
            <TextField
              minHeight={FIELD_MIN_HEIGHT}
              value={body}
              onChangeText={setBody}
              placeholder="O que Deus falou com você hoje?"
              accessibilityLabel="O que Deus falou com você hoje?"
              selectionColor={colors.text}
              testID="publish-input"
            />
            <LimitNote length={length} max={LIMITS.postBody} nearFrom={COUNTER_FROM} testID="publish-counter" />
          </View>

          <AttachChips
            attachments={attachments}
            onRemove={(attachment) => setAttachments((current) => removeAttachment(current, attachment.kind))}
          />
          {verseAttached?.text ? (
            <View testID="verse-preview" style={{ gap: spacing.xs }}>
              <AppText variant="quote">{verseAttached.text}</AppText>
              {verseAttached.translation ? (
                <AppText variant="caption">{`${verseAttached.label} · ${verseAttached.translation}`}</AppText>
              ) : null}
            </View>
          ) : null}

          <PhotoStrip
            photos={photos.map((item) => ({
              key: item.key,
              uri: item.photo.uri,
            }))}
            onRemove={(key) => setPhotos((current) => current.filter((item) => item.key !== key))}
          />
          {photoStage === 'preparing' ? (
            <AppText variant="caption" accessibilityLiveRegion="polite" testID="photo-preparing">
              Preparando a foto…
            </AppText>
          ) : null}
          {photoWarning}
          {photoError ? (
            <AppText
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger }}
              testID="photo-error"
            >
              {photoError}
            </AppText>
          ) : null}

          <AttachBar buttons={buttons} />

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

        {/* Rodapé: público e Publicar. Quebra em duas linhas com fonte grande. */}
        <View
          testID="publish-footer"
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: inset,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            columnGap: spacing.lg,
            rowGap: spacing.xs,
          }}
        >
          <AudienceButton audience={effectiveAudience} ministry={ministry} onPress={() => setSheet('audience')} />
          <Button
            title="Publicar"
            variant="blue"
            onPress={send}
            disabled={!canSend}
            loading={sending}
            style={{
              minHeight: MIN_TOUCH,
              borderRadius: radius.pill,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xl,
            }}
            testID="publish-send"
          />
        </View>
      </KeyboardAvoidingView>

      <VersiculoSheet
        visible={sheet === 'verse'}
        onClose={() => setSheet(null)}
        initial={verseAttached}
        onAttach={(attachment) => {
          setAttachments((current) => upsertAttachment(current, attachment));
          setSheet(null);
        }}
      />
      <PublicoSheet
        visible={sheet === 'audience'}
        onClose={() => setSheet(null)}
        audience={effectiveAudience}
        ministry={ministry}
        onChoose={(next) => {
          setAudience(next);
          setSheet(null);
        }}
      />
    </Screen>
  );
}
