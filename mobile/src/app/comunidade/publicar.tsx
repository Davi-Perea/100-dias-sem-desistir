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
import { useSettings } from '@/settings/settingsStore';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { TextField } from '@/ui/TextField';
import { AppText, Button, Screen, StateView } from '@/ui/components';
import { LimitNote } from '@/ui/comunidade/LimitNote';
import { MY_POSTS_ROUTE } from '@/ui/comunidade/perfil/routes';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { aceiteDocs, availabilityNotice, aceiteNeeds, nameOk, useAceite } from '@/ui/comunidade/publicar/aceite';
import { needsAceite, parseDay, publishStep, ROUTES, sentCopy, type Sent } from '@/ui/comunidade/publicar/fluxo';
import {
  cameraConfigured,
  pickManyFromLibrary,
  preparePhoto,
  takePhoto,
  type PickedAsset,
  type PreparedPhoto,
} from '@/ui/comunidade/publicar/foto';
import { AudienceNotice, CommunityGateView, NoticeBand } from '@/ui/comunidade/publicar/partes';
import { AceiteLine, AttachBar, AttachChips, PhotoStrip, type AttachButton } from '@/ui/comunidade/publicar/pecas';
import {
  attachSummary,
  buildNewPost,
  hasAttachment,
  hasContent,
  isDirty,
  MAX_POST_PHOTOS,
  removeAttachment,
  upsertAttachment,
  type Attachment,
  type VerseChip,
} from '@/ui/comunidade/publicar/rascunho';
import { ACEITE_NEEDS_NAME } from '@/ui/comunidade/publicar/textos';
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

/**
 * "Ver no feed" tem de CHEGAR no feed. Voltar não serve: quem publicou depois de
 * concluir o dia veio por `/comunidade/depois/<dia>`, que se substituiu no
 * caminho, e embaixo desta tela está a Jornada — voltar levaria para lá, com o
 * botão prometendo o feed. Então esta tela sai de cena (`replace`) e a aba Juntos
 * entra; ela recarrega no foco e o post novo fica no topo.
 */
function goToFeed() {
  router.replace(ROUTES.juntos as never);
}

type PhotoItem = { key: string; photo: PreparedPhoto };
/** Não há mais aviso antes da galeria nem da câmera (2026-09-22): escolher ou preparar. */
type PhotoStage = 'idle' | 'preparing';

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
 *   Leitura do dia ("Dia N · referência"), Versículo (QUALQUER um da Bíblia, pelo
 *   caminho livro → capítulo → versículo, com os marcados em destaque no topo; só
 *   a referência sai, o texto da Bíblia Livre é prévia no aparelho), Oração ou
 *   Jejum (só o tipo), Galeria (até 4 fotos) e Câmera. Viram chips removíveis, com
 *   um resumo discreto do que vai junto.
 * - Foto: sem aviso antes (2026-09-22). Galeria abre a galeria, Câmera abre a
 *   câmera, e a única pergunta é a permissão do sistema. A foto é preparada no
 *   aparelho (1600 px, JPEG 0,8, sem EXIF/XMP/IPTC) e só enviada ao publicar.
 * - Embaixo: "Publicar" e, embaixo dele, a linha do aceite. A escolha de público
 *   SAIU (2026-09-22): todo post vai para a igreja inteira.
 * - O formulário abre na hora (a entrada no Juntos é automática) e NÃO existe mais
 *   tela de aceite no meio do caminho (decisão do fundador, 2026-09-22): a linha
 *   embaixo do botão diz "Ao publicar, você confirma que tem 16 anos ou mais e
 *   aceita as regras do Juntos.", com link para as regras, e o toque em "Publicar"
 *   registra o aceite (16+, regras e consentimento destacado, pelas mesmas RPCs) e
 *   publica em seguida. Foto de perfil e ministério não são exigidos.
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
  const settings = useSettings();

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
  const [sheet, setSheet] = useState<'verse' | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const photoSeq = useRef(0);

  const [docs] = useState(aceiteDocs);
  const aceite = useAceite(docs, state);

  const ready = state.kind === 'ready' ? state : null;
  const step = ready ? publishStep(ready.status) : null;
  const api = ready?.api ?? null;
  const profile = ready?.status.profile ?? null;
  const ministry = profile?.ministry ?? null;
  // Antes do aceite a pessoa pode ainda não ter nome no Juntos: vale o da entrada do app.
  // "Você" é só para MOSTRAR (a linha do autor) — nunca é nome para registrar.
  const ownName = cleanText(ready?.status.displayName ?? profile?.displayName ?? settings?.profile.name ?? null);
  const displayName = ownName ?? 'Você';
  const avatarPath = profile?.avatarPath ?? null;

  /** Dia que "Leitura do dia" anexa: o que veio da conclusão, ou o de hoje na campanha. */
  const readingDay = paramDay ?? (journey.phase === 'before_start' ? null : journey.officialDay);

  /* --------------------------------------------------------------- o aceite
     Não há tela de aceite (2026-09-22): o toque em "Publicar" registra e publica.
     Só três coisas podem impedir, e cada uma é dita na hora:
       - o texto das regras/consentimento ainda não foi aprovado pela igreja
         (Launch Gate; `availability`), e aí ninguém publica;
       - a pessoa nunca deu um nome, nem na entrada do app (o servidor recusa,
         CM007), e aí a tela manda para o perfil;
       - o servidor recusou o registro (a mensagem dele aparece no lugar do envio). */
  const mustAccept = ready !== null && needsAceite(ready.status);
  /** Nome que vai junto do aceite: o do Juntos, senão o da entrada do app. Nunca "Você". */
  const aceiteName = ownName ?? '';
  const missingName = mustAccept && ready !== null && aceiteNeeds(ready.status).name && !nameOk(aceiteName);
  const aceiteBlock = mustAccept && aceite.availability !== null ? availabilityNotice(aceite.availability) : null;

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
        if (alive && !on) timer = setTimeout(goToFeed, BACK_TO_FEED_MS);
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
  const canSend =
    hasContent(draft) && !overLimit && !sending && !aceite.busy && photoStage !== 'preparing' && aceiteBlock === null;
  const photosLeft = MAX_POST_PHOTOS - photos.length;
  const summary = attachSummary(attachments, photos.length);
  /** Um lugar só para a recusa: a do envio ou a do registro do aceite. */
  const errorLine = sendError ?? aceite.error;

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

  /**
   * Uma foto por vez, e cada original é solto assim que vira bytes finais
   * (AUDITORIA EXTERNA 2026-09-23, pico de memória). O laço já era serial; o que
   * faltava era largar o que não serve mais: enquanto `assets` segurasse as
   * quatro, nenhuma podia ser recolhida antes do fim do laço.
   */
  const addPrepared = async (assets: PickedAsset[]) => {
    const prepared: PhotoItem[] = [];
    let failure: string | null = null;
    const fila = [...assets];
    while (fila.length > 0) {
      // `shift` tira a referência da fila: a partir daqui só a variável local
      // aponta para esta foto, e ela morre no fim da volta.
      const asset = fila.shift() as PickedAsset;
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

  /**
   * Galeria e Câmera abrem DIRETO (decisão do fundador, 2026-09-22): o aviso de
   * rosto de outras pessoas, de crianças e o da câmera saíram. A única pergunta
   * que aparece é a permissão do sistema, pedida pelo próprio seletor.
   *
   * Continuam aqui as duas recusas que não são aviso e sim fato: o post já está
   * cheio, e a build sem o texto de finalidade da câmera (pedir a permissão sem
   * ele encerra o app no iOS).
   */
  const openPhotos = async (source: 'galeria' | 'camera') => {
    setPhotoError(null);
    if (photosLeft <= 0) {
      setPhotoError(`Cabem até ${MAX_POST_PHOTOS} fotos por publicação. Tire uma para escolher outra.`);
      return;
    }
    if (source === 'camera' && !cameraConfigured()) {
      setPhotoError('A câmera ainda não está liberada nesta versão do app. Escolha uma foto da galeria.');
      return;
    }
    const fromCamera = source === 'camera';
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
      // Em desenvolvimento, o motivo cru vai junto: sem ele, "não foi possível
      // preparar esta foto" não diz em que passo parou (relato do fundador,
      // 2026-09-22). Em release, só a frase para a pessoa.
      const detail = __DEV__ && failure instanceof Error && failure.message ? ` (${failure.message})` : '';
      setPhotoError(`${toCommunityError(failure).message}${detail}`);
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
      accessibilityLabel: 'Versículo da Bíblia',
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
      onPress: () => void openPhotos('galeria'),
    },
    {
      id: 'camera',
      label: 'Câmera',
      accessibilityLabel: 'Câmera',
      onPress: () => void openPhotos('camera'),
    },
  ];

  /* ------------------------------------------------------------- enviar */

  const send = async () => {
    if (!ready || !canSend) return;
    setSendError(null);
    // Primeira publicação: o aceite é registrado AGORA, antes de existir conteúdo
    // (Google Play; Apple 1.2). Se o registro não passar, nada é publicado.
    if (mustAccept) {
      if (missingName) {
        setSendError(ACEITE_NEEDS_NAME);
        return;
      }
      const accepted = await aceite.accept({ name: aceiteName });
      if (!accepted) return;
    }
    const client = ready.api;
    setSending(true);
    const uploaded: string[] = [];
    try {
      for (const item of photos.slice(0, MAX_POST_PHOTOS)) uploaded.push(await client.uploadPhoto(item.photo.bytes));
      const input = buildNewPost({
        body: cleaned,
        photoPaths: uploaded,
        attachments,
        // Um feed só (2026-09-22): todo post vai para a igreja inteira.
        audience: 'igreja',
      });
      const result = await client.createPost(input);
      setSent({ status: result.status, hadPhoto: uploaded.length > 0 });
    } catch (failure) {
      // Fotos subiram mas o post não foi criado: não deixa arquivo solto.
      for (const path of uploaded) client.discardPhoto(path).catch(() => {});
      const known = toCommunityError(failure);
      if (known.code === 'needs_consent' || known.code === 'terms_outdated' || known.code === 'needs_profile') {
        // O aceite caiu ou o texto mudou: com o status novo, o próximo "Publicar"
        // registra o aceite de novo antes de tentar publicar.
        state.reload();
      }
      setSendError(known.message);
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------------------------------ fora do formulário */

  if (!ready || step !== 'form') {
    const gateStep = step === 'needs_join' || step === 'blocked' ? step : undefined;
    return (
      <Screen>
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar label="Voltar" />
        </View>
        <CommunityGateView state={state} step={gateStep} />
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
              <Button title="Ver no feed" onPress={goToFeed} testID="publish-done" />
            ) : (
              <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
                <Button
                  title="Ver minhas publicações"
                  onPress={() => router.replace(MY_POSTS_ROUTE)}
                  testID="publish-my-posts"
                />
                <Button title="Voltar ao feed" variant="underline" onPress={goToFeed} testID="publish-done" />
              </View>
            )
          }
        />
      </Screen>
    );
  }

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

          {/* Resumo discreto do que vai junto (item 4 do fundador): uma linha, nunca um passo. */}
          {summary ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="caption" testID="attach-summary">
                {summary}
              </AppText>
              <AttachChips
                attachments={attachments}
                onRemove={(attachment) => setAttachments((current) => removeAttachment(current, attachment.kind))}
              />
            </View>
          ) : null}
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

          {/* O texto das regras ou do consentimento ainda não foi aprovado pela
              igreja: ninguém aceita e ninguém publica, e a tela diz isso. */}
          {aceiteBlock ? <NoticeBand text={aceiteBlock} colors={colors} testID="publish-pending" /> : null}
          {errorLine !== null ? (
            <View style={{ gap: spacing.sm }}>
              <AppText
                variant="bodySm"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ color: colors.danger }}
                testID="publish-error"
              >
                {errorLine}
              </AppText>
              {missingName ? (
                <Button
                  title="Escrever o meu nome"
                  variant="outline"
                  onPress={() => router.push(ROUTES.perfil as never)}
                  style={{ alignSelf: 'flex-start' }}
                  testID="publish-write-name"
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* Rodapé: "Publicar" e, embaixo dele, a linha do aceite (decisão do
            fundador, 2026-09-22 — a tela de aceite saiu). A escolha de público
            também saiu: todo post vai para a igreja inteira. */}
        <View
          testID="publish-footer"
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: inset,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            gap: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: spacing.xs }}>
            <Button
              title="Publicar"
              variant="blue"
              onPress={send}
              disabled={!canSend}
              loading={sending || aceite.busy}
              style={{
                minHeight: MIN_TOUCH,
                borderRadius: radius.pill,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xl,
              }}
              testID="publish-send"
            />
          </View>
          <AceiteLine onOpenRules={() => router.push({ pathname: ROUTES.regras, params: { ler: '1' } })} />
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
    </Screen>
  );
}
