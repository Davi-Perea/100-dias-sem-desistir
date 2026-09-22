import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommunityApi } from '@/community/api';
import type { CommunityStatus, PostComment } from '@/community/types';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { BackBar } from '@/ui/BackBar';
import { AppText, Avatar, Rule, SaveErrorNotice, Screen, useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, faces, spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';
import { useKeyboardVisible } from '@/ui/comunidade/publicar/partes';

import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { FeedError, FeedSkeleton, GateView } from './FeedStates';
import { consentHref } from './rotas';
import { relativeTime } from './tempo';
import { humanError, needsConsent, useCommunity } from './useCommunity';
import { LimitNote } from '../LimitNote';

const GUTTER = 20;
/** O aviso de limite aparece 100 caracteres antes dos 1.000 do servidor. */
const COMMENT_NEAR_FROM = LIMITS.commentBody - 100;
/** Dito ao voltar das regras e do consentimento: nada foi enviado sozinho. */
export const AFTER_CONSENT_COMMENT = 'Pronto. Seu comentário ainda não foi enviado: toque em Enviar para mandar.';

/**
 * C6 · Comentários de uma publicação: lista e campo.
 *
 * "Chegar na pessoa" é aqui (não existe mensagem privada). O comentário passa
 * pelo mesmo filtro do post: texto limpo aparece na hora; texto segurado fica
 * "Em análise" e só quem escreveu vê. Sem contagem de comentários em lugar
 * nenhum. Cada comentário tem "···" para denunciar ou bloquear (C5), ou apagar
 * quando é seu.
 *
 * O desenho põe Amém também no comentário; o servidor só tem Amém de
 * publicação (`set_amen`), então aqui não há Amém — pedido registrado.
 *
 * O campo começa sempre vazio: nada vem da reflexão privada (B5).
 */
export function CommentsScreen({ postId }: { postId: string }) {
  const { gate, reload } = useCommunity();

  let content: ReactNode;
  if (gate.kind === 'ready') {
    return <ReadyComments postId={postId} api={gate.api} status={gate.status} />;
  } else if (gate.kind === 'loading') {
    content = <FeedSkeleton gutter={GUTTER} />;
  } else {
    content = (
      <View style={{ paddingHorizontal: GUTTER }}>
        <GateView gate={gate} onRetry={reload} />
      </View>
    );
  }
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <CommentsHeader />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>
    </Screen>
  );
}

function CommentsHeader() {
  return (
    <View style={{ paddingHorizontal: GUTTER - 8, gap: spacing.xs, paddingBottom: spacing.sm }}>
      <BackBar label="Voltar" />
      <AppText
        variant="blockTitle"
        accessibilityRole="header"
        style={{ fontSize: 20, lineHeight: 25, letterSpacing: 0, paddingHorizontal: 8 }}
      >
        Comentários
      </AppText>
    </View>
  );
}

type ListState = { phase: 'loading' } | { phase: 'error'; message: string } | { phase: 'ready'; items: PostComment[] };

/** Só o que é público, mais o que é MEU em qualquer estado (com o selo). */
function visible(items: PostComment[]): PostComment[] {
  return items.filter((c) => c.status === 'published' || c.isMine);
}

function ReadyComments({ postId, api, status }: { postId: string; api: CommunityApi; status: CommunityStatus }) {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ListState>({ phase: 'loading' });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const items = await api.postComments(postId);
      if (request.current === id) setList({ phase: 'ready', items: visible(items) });
    } catch (err) {
      if (request.current === id) setList({ phase: 'error', message: humanError(err) });
    }
  }, [api, postId]);

  // Ao abrir e a cada volta (do consentimento, por exemplo): a lista fica em dia.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Foi aceitar regras/consentimento a partir daqui: ao voltar, a tela diz que
  // o comentário (que continua no campo) ainda não saiu — nada sai sem um toque.
  const askedConsent = useRef(false);
  const gated = needsConsent(status);
  useEffect(() => {
    if (!askedConsent.current || gated) return;
    askedConsent.current = false;
    setNotice(AFTER_CONSENT_COMMENT);
    announceNotice(AFTER_CONSENT_COMMENT);
  }, [gated]);

  const cleaned = cleanText(text);
  const length = cleaned === null ? 0 : charLength(cleaned);
  const tooLong = length > LIMITS.commentBody;
  const canSend = cleaned !== null && !tooLong && !sending;

  async function send() {
    if (!cleaned || tooLong) return;
    if (gated) {
      askedConsent.current = true;
      router.push(consentHref(status));
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.createComment(postId, cleaned);
      const mine: PostComment = {
        commentId: result.id,
        body: cleaned,
        status: result.status,
        createdAt: new Date().toISOString(),
        authorName: status.displayName ?? 'Você',
        isMine: true,
      };
      setList((prev) => (prev.phase === 'ready' ? { phase: 'ready', items: [...prev.items, mine] } : prev));
      setText('');
      const message =
        result.status === 'published'
          ? 'Comentário publicado.'
          : 'Seu comentário está em análise. Só você vê até uma pessoa da igreja olhar.';
      setNotice(result.status === 'published' ? null : message);
      announceNotice(message);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setSending(false);
    }
  }

  function drop(commentId: string) {
    setList((prev) =>
      prev.phase === 'ready' ? { phase: 'ready', items: prev.items.filter((c) => c.commentId !== commentId) } : prev,
    );
  }

  let body: ReactNode;
  if (list.phase === 'loading') body = <FeedSkeleton gutter={GUTTER} />;
  else if (list.phase === 'error') {
    body = (
      <View style={{ paddingHorizontal: GUTTER }}>
        <FeedError message={list.message} onRetry={load} testID="comments-error" />
      </View>
    );
  } else if (list.items.length === 0) {
    body = (
      <View style={{ paddingHorizontal: GUTTER, paddingVertical: spacing.xl }} testID="comments-empty">
        <AppText variant="body" style={{ textAlign: 'center' }}>
          Ninguém comentou ainda.
        </AppText>
        <AppText variant="caption" style={{ textAlign: 'center', marginTop: spacing.xs }}>
          Para comentar, escreva no campo lá embaixo e toque em Enviar.
        </AppText>
      </View>
    );
  } else {
    body = (
      <View>
        {list.items.map((comment) => (
          <CommentRow
            key={comment.commentId}
            comment={comment}
            onMore={() =>
              setSheet({
                kind: 'comment',
                commentId: comment.commentId,
                authorName: comment.authorName,
                isMine: comment.isMine,
              })
            }
          />
        ))}
      </View>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Teclado aberto é estado de layout (REGRAS 28). 'padding' também no
          Android, como em B5: com o edge-to-edge do RN 0.86 a janela não encolhe
          com o teclado. PROVISÓRIO: ainda não verificado em aparelho. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + GUTTER * 2, alignSelf: 'center' }}>
          <CommentsHeader />
          <Rule />
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
          {list.phase === 'ready' ? (
            <Composer
              value={text}
              onChange={setText}
              onSend={send}
              canSend={canSend}
              sending={sending}
              length={length}
              error={error}
              notice={notice}
              bottomInset={insets.bottom}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <ReportSheet
        api={api}
        target={sheet}
        onClose={() => setSheet(null)}
        onDeleted={(t) => t.kind === 'comment' && drop(t.commentId)}
        onHidden={(t) => t.kind === 'comment' && drop(t.commentId)}
        onBlocked={(t) => {
          if (t.kind === 'comment') drop(t.commentId);
          // O servidor tira o resto do que a pessoa bloqueada escreveu (e o post, se for dela).
          load();
        }}
      />
    </Screen>
  );
}

function statusLabel(comment: PostComment): string | null {
  if (!comment.isMine || comment.status === 'published') return null;
  if (comment.status === 'in_review') return 'Em análise · só você vê';
  if (comment.status === 'not_published') return 'Não publicado · só você vê';
  return 'Tirado do ar · só você vê';
}

function CommentRow({ comment, onMore }: { comment: PostComment; onMore: () => void }) {
  const { colors } = useTheme();
  const when = relativeTime(comment.createdAt);
  const label = statusLabel(comment);
  return (
    <View testID={`comment-${comment.commentId}`}>
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingLeft: GUTTER, paddingRight: GUTTER - 12, paddingTop: spacing.md }}>
        <Avatar name={comment.authorName} size={40} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View accessible accessibilityLabel={when.spoken ? `${comment.authorName}, ${when.spoken}` : comment.authorName}>
            <AppText variant="rowLabel">
              {comment.authorName}
              {when.short ? <AppText variant="caption">{`  ${when.short}`}</AppText> : null}
            </AppText>
          </View>
          {label ? (
            <AppText
              variant="captionStrong"
              style={{ color: colors.onBlueSoft, backgroundColor: colors.blueSoft, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 8 }}
              accessibilityLabel={label.replace(' · ', '. ')}
              testID={`comment-status-${comment.commentId}`}
            >
              {label}
            </AppText>
          ) : null}
          <AppText variant="body" style={{ fontSize: 16, lineHeight: 26 }}>
            {comment.body}
          </AppText>
        </View>
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={comment.isMine ? 'Opções do seu comentário' : `Denunciar ou bloquear, comentário de ${comment.authorName}`}
          testID={`comment-more-${comment.commentId}`}
          style={({ pressed }) => [
            { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
            pressed && { opacity: 0.72 },
          ]}
        >
          <Icon name="more" size={22} color={colors.text} />
        </Pressable>
      </View>
      <Rule style={{ marginTop: spacing.md }} />
    </View>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  canSend,
  sending,
  length,
  error,
  notice,
  bottomInset,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
  /** Caracteres do texto, contados como o servidor conta. */
  length: number;
  error: string | null;
  notice: string | null;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const [focused, setFocused] = useState(false);
  // Com o teclado aberto, a fonte grande (3,571×) e um telefone pequeno, o bloco
  // fixo pode ficar mais alto que o espaço acima do teclado e esconder o campo e o
  // Enviar. Então: a legenda (já lida antes do foco) sai, o campo cresce menos e o
  // recuo do indicador de início, que o teclado já cobre, vira zero.
  const keyboard = useKeyboardVisible();
  const { height } = useWindowDimensions();
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: GUTTER,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm + (keyboard ? 0 : bottomInset),
        gap: spacing.xs,
      }}
    >
      {notice ? (
        <AppText variant="caption" accessibilityLiveRegion="polite" testID="comment-notice">
          {notice}
        </AppText>
      ) : null}
      {error ? <SaveErrorNotice message={error} testID="comment-error" /> : null}
      <LimitNote
        length={length}
        max={LIMITS.commentBody}
        nearFrom={COMMENT_NEAR_FROM}
        testID={length > LIMITS.commentBody ? 'comment-too-long' : 'comment-limit'}
      />
      {keyboard ? null : (
        <AppText variant="caption" testID="comment-visibility-note">
          Aparece com o seu nome para as pessoas da comunidade.
        </AppText>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          placeholder="Escrever um comentário"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Escrever um comentário"
          testID="comment-input"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minHeight: MIN_TOUCH,
            maxHeight: keyboard ? Math.min(160, Math.round(height * 0.22)) : 160,
            borderRadius: 24,
            borderWidth: focused ? 2.5 : 1.5,
            borderColor: focused ? colors.text : colors.controlBorder,
            backgroundColor: colors.surfaceWarm,
            paddingHorizontal: focused ? 15 : 16,
            paddingVertical: focused ? 11 : 12,
            fontFamily: face(faces.ss400),
            fontSize: 16,
            lineHeight: 22,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentário"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          testID="comment-send"
          style={({ pressed }) => [
            {
              width: MIN_TOUCH,
              height: MIN_TOUCH,
              borderRadius: MIN_TOUCH / 2,
              backgroundColor: colors.blue,
              alignItems: 'center',
              justifyContent: 'center',
            },
            !canSend && { opacity: 0.45 },
            pressed && canSend && { opacity: 0.72 },
          ]}
        >
          <Icon name="send" size={22} color={colors.onBlue} />
        </Pressable>
      </View>
    </View>
  );
}
