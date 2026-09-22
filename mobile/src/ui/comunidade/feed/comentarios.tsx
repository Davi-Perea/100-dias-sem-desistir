import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import type { CommunityStatus, PostComment } from '@/community/types';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { AppText, Avatar, Rule, SaveErrorNotice, useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, faces, spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';
import { useKeyboardVisible } from '@/ui/comunidade/publicar/partes';

import { LimitNote } from '../LimitNote';
import { AmenButton } from './AmenButton';
import { relativeTime } from './tempo';
import { humanError, needsConsent } from './useCommunity';

/**
 * Partes da conversa de um post, usadas pela folha "Comentários" do feed (F4)
 * e pela tela `/comunidade/post/<id>` (link direto): a lista, a linha do
 * comentário e o campo. Sem GIF e sem mensagem privada: "chegar na pessoa" é
 * comentar no post dela.
 *
 * O comentário passa pelo mesmo filtro do post: texto limpo aparece na hora;
 * texto segurado fica "Em análise" e só quem escreveu vê. O campo começa vazio:
 * nada vem da reflexão privada (B5).
 */

export const COMMENTS_GUTTER = 20;
/** O aviso de limite aparece 100 caracteres antes dos 1.000 do servidor. */
const COMMENT_NEAR_FROM = LIMITS.commentBody - 100;
/** Dito ao voltar das regras e do consentimento: nada foi enviado sozinho. */
export const AFTER_CONSENT_COMMENT = 'Pronto. Seu comentário ainda não foi enviado: toque em Enviar para mandar.';

export type CommentsListState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; items: PostComment[] };

/**
 * Amém em comentário que levou à tela de aceite: marcado sozinho quando a pessoa
 * volta (o toque dela já disse o que queria; a tela de aceite só veio antes). Vale
 * por 10 minutos: quem desistiu do aceite e volta outro dia não ganha um Amém
 * que já esqueceu.
 */
const PENDING_AMEN_TTL_MS = 10 * 60 * 1000;
let pendingCommentAmen: { postId: string; commentId: string; at: number } | null = null;

export function rememberPendingCommentAmen(postId: string, commentId: string, now = Date.now()) {
  pendingCommentAmen = { postId, commentId, at: now };
}

/** Tira o Amém pendente (deste post, se informado), se houver e ainda valer. */
export function takePendingCommentAmen(postId?: string, now = Date.now()): { postId: string; commentId: string } | null {
  const pending = pendingCommentAmen;
  if (!pending) return null;
  if (now - pending.at > PENDING_AMEN_TTL_MS) {
    pendingCommentAmen = null;
    return null;
  }
  if (postId !== undefined && pending.postId !== postId) return null;
  pendingCommentAmen = null;
  return { postId: pending.postId, commentId: pending.commentId };
}

/**
 * Para quem abriu a folha (que fechou para o aceite): grava o Amém pendente sem
 * precisar reabrir a conversa. Silencioso se falhar: a pessoa vê o estado real
 * ao abrir os comentários.
 */
export async function flushPendingCommentAmen(api: CommunityApi): Promise<boolean> {
  const pending = takePendingCommentAmen();
  if (!pending) return false;
  try {
    return await api.setCommentAmen(pending.commentId, true);
  } catch {
    return false;
  }
}

/** Meu Amém num comentário: o número acompanha. */
export function withCommentAmen(comment: PostComment, next: boolean): PostComment {
  if (comment.iSaidAmen === next) return comment;
  return { ...comment, iSaidAmen: next, amenCount: Math.max(0, comment.amenCount + (next ? 1 : -1)) };
}

/** Só o que é público, mais o que é MEU em qualquer estado (com o selo). */
export function visibleComments(items: PostComment[]): PostComment[] {
  return items.filter((c) => c.status === 'published' || c.isMine);
}

/**
 * Estado da conversa: lista, campo, envio. `openConsent` é quem leva às regras
 * e ao consentimento (a folha fecha antes; a tela empurra a rota) — o que está
 * no campo não é enviado sozinho depois do aceite.
 */
export function useComments({
  api,
  postId,
  status,
  openConsent,
  initialText = '',
  initialNotice = null,
  onCountChange,
}: {
  api: CommunityApi;
  postId: string;
  status: CommunityStatus;
  openConsent: (draft: string) => void;
  initialText?: string;
  initialNotice?: string | null;
  /** +1 ao publicar, -1 ao apagar/sumir: o número do cartão acompanha. */
  onCountChange?: (delta: number) => void;
}) {
  const [list, setList] = useState<CommentsListState>({ phase: 'loading' });
  const [text, setText] = useState(initialText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const items = await api.postComments(postId);
      if (request.current === id) setList({ phase: 'ready', items: visibleComments(items) });
    } catch (err) {
      if (request.current === id) setList({ phase: 'error', message: humanError(err) });
    }
  }, [api, postId]);

  // Foi aceitar regras/consentimento a partir daqui (a tela continua montada):
  // ao voltar, diz que o comentário (que continua no campo) ainda não saiu.
  const askedConsent = useRef(false);
  const gated = needsConsent(status);
  useEffect(() => {
    if (!askedConsent.current || gated) return;
    askedConsent.current = false;
    setNotice(AFTER_CONSENT_COMMENT);
    announceNotice(AFTER_CONSENT_COMMENT);
  }, [gated]);

  // Amém nos comentários: marca na hora (otimista). Toques seguidos não travam:
  // vale o último; quando a resposta chega, se a pessoa já mudou de ideia, manda
  // de novo. Se o servidor recusar, volta ao que era e diz por quê.
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const amenWant = useRef(new Map<string, boolean>());
  const amenBusy = useRef(new Set<string>());

  const patchAmen = useCallback((commentId: string, next: boolean) => {
    setList((prev) =>
      prev.phase === 'ready'
        ? { phase: 'ready', items: prev.items.map((c) => (c.commentId === commentId ? withCommentAmen(c, next) : c)) }
        : prev,
    );
  }, []);

  const syncAmen = useCallback(
    async (commentId: string) => {
      if (amenBusy.current.has(commentId)) return;
      amenBusy.current.add(commentId);
      try {
        for (;;) {
          const want = amenWant.current.get(commentId);
          if (want === undefined) return;
          try {
            const got = await api.setCommentAmen(commentId, want);
            if (amenWant.current.get(commentId) !== want) continue;
            amenWant.current.delete(commentId);
            patchAmen(commentId, got);
            return;
          } catch (err) {
            if (amenWant.current.get(commentId) !== want) continue;
            amenWant.current.delete(commentId);
            patchAmen(commentId, !want);
            setError(humanError(err));
            return;
          }
        }
      } finally {
        amenBusy.current.delete(commentId);
      }
    },
    [api, patchAmen],
  );

  const toggleAmen = useCallback(
    (commentId: string, next: boolean) => {
      if (next && gated) {
        rememberPendingCommentAmen(postId, commentId);
        openConsent(textRef.current);
        return;
      }
      setError(null);
      amenWant.current.set(commentId, next);
      patchAmen(commentId, next);
      void syncAmen(commentId);
    },
    [gated, postId, openConsent, patchAmen, syncAmen],
  );

  // Voltou do aceite com um Amém pendente neste post: marca agora.
  const ready = list.phase === 'ready';
  useEffect(() => {
    if (gated || !ready) return;
    const pending = takePendingCommentAmen(postId);
    if (!pending) return;
    // Fora do corpo do efeito (a marcação mexe no estado da lista).
    let applied = false;
    void Promise.resolve().then(() => {
      if (applied) return;
      applied = true;
      toggleAmen(pending.commentId, true);
    });
    return () => {
      // Desmontou antes: o pendente volta a esperar.
      if (!applied) {
        applied = true;
        rememberPendingCommentAmen(pending.postId, pending.commentId);
      }
    };
  }, [gated, ready, postId, toggleAmen]);

  const cleaned = cleanText(text);
  const length = cleaned === null ? 0 : charLength(cleaned);
  const tooLong = length > LIMITS.commentBody;
  const canSend = cleaned !== null && !tooLong && !sending;

  async function send() {
    if (!cleaned || tooLong) return;
    if (gated) {
      askedConsent.current = true;
      openConsent(text);
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
        amenCount: 0,
        iSaidAmen: false,
      };
      setList((prev) => (prev.phase === 'ready' ? { phase: 'ready', items: [...prev.items, mine] } : prev));
      setText('');
      if (result.status === 'published') onCountChange?.(1);
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
    setList((prev) => {
      if (prev.phase !== 'ready') return prev;
      const gone = prev.items.find((c) => c.commentId === commentId);
      if (gone?.status === 'published') onCountChange?.(-1);
      return { phase: 'ready', items: prev.items.filter((c) => c.commentId !== commentId) };
    });
  }

  return { list, text, setText, send, sending, error, notice, length, canSend, load, drop, toggleAmen };
}

function statusLabel(comment: PostComment): string | null {
  if (!comment.isMine || comment.status === 'published') return null;
  if (comment.status === 'in_review') return 'Em análise · só você vê';
  if (comment.status === 'not_published') return 'Não publicado · só você vê';
  return 'Tirado do ar · só você vê';
}

/** Número de Amém dito em palavra, junto do botão (o botão diz "Amém" e se está marcado). */
export function commentAmenSpoken(count: number, iSaidAmen: boolean): string {
  if (count <= 0) return 'Ninguém disse Amém ainda';
  if (iSaidAmen) {
    const others = count - 1;
    if (others <= 0) return 'Você disse Amém';
    return `Você e mais ${others} ${others === 1 ? 'pessoa disseram' : 'pessoas disseram'} Amém`;
  }
  return `${count} ${count === 1 ? 'pessoa disse' : 'pessoas disseram'} Amém`;
}

/** Mão de 22 no alvo de 48: o recuo põe o desenho alinhado ao texto do comentário. */
const COMMENT_AMEN_ICON = 22;

export function CommentRow({
  comment,
  onMore,
  onAmen,
  gutter = COMMENTS_GUTTER,
}: {
  comment: PostComment;
  onMore: () => void;
  /** Sem ele (ou em comentário que não está publicado), não há Amém. */
  onAmen?: (next: boolean) => void;
  gutter?: number;
}) {
  const { colors } = useTheme();
  const when = relativeTime(comment.createdAt);
  const label = statusLabel(comment);
  const canAmen = onAmen !== undefined && comment.status === 'published';
  return (
    <View testID={`comment-${comment.commentId}`}>
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingLeft: gutter, paddingRight: gutter - 12, paddingTop: spacing.md }}>
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
          {canAmen && onAmen ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: -(MIN_TOUCH - COMMENT_AMEN_ICON) / 2,
                marginTop: -spacing.xs,
              }}
            >
              <AmenButton
                checked={comment.iSaidAmen}
                onToggle={onAmen}
                size={COMMENT_AMEN_ICON}
                label={`Amém, comentário de ${comment.authorName}`}
                testID={`comment-amen-${comment.commentId}`}
              />
              {comment.amenCount > 0 ? (
                <AppText
                  variant="captionStrong"
                  accessibilityLabel={commentAmenSpoken(comment.amenCount, comment.iSaidAmen)}
                  testID={`comment-amen-count-${comment.commentId}`}
                  style={{ color: colors.text }}
                >
                  {comment.amenCount.toLocaleString('pt-BR')}
                </AppText>
              ) : null}
            </View>
          ) : null}
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

/** Sem comentários: a tela diz onde escrever. */
export function CommentsEmpty({ gutter = COMMENTS_GUTTER }: { gutter?: number }) {
  return (
    <View style={{ paddingHorizontal: gutter, paddingVertical: spacing.xl }} testID="comments-empty">
      <AppText variant="body" style={{ textAlign: 'center' }}>
        Ninguém comentou ainda.
      </AppText>
      <AppText variant="caption" style={{ textAlign: 'center', marginTop: spacing.xs }}>
        Para comentar, escreva no campo lá embaixo e toque em Enviar.
      </AppText>
    </View>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  canSend,
  sending,
  length,
  error,
  notice,
  bottomInset,
  gutter = COMMENTS_GUTTER,
  onSheet = false,
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
  gutter?: number;
  /** Dentro da folha o fundo é o da folha (surface); na tela, o da página. */
  onSheet?: boolean;
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
        backgroundColor: onSheet ? colors.surface : colors.background,
        paddingHorizontal: gutter,
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
