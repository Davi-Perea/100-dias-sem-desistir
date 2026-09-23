import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommunityApi } from '@/community/api';
import { COMMENTS_SERVER_LIMIT, type CommunityStatus } from '@/community/types';
import { AppText, Rule } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { floatShadow, glass, MIN_TOUCH, radius, spacing, useReducedMotion, useTheme } from '@/ui/theme';

import { CommentRow, CommentsEmpty, COMMENTS_GUTTER as GUTTER, Composer, useComments } from '../feed/comentarios';
import { FeedError, FeedSkeleton } from '../feed/FeedStates';
import { COMMUNITY_ROUTES } from '../feed/rotas';
import { needsConsent } from '../feed/useCommunity';
import { ReportSheet, type SheetTarget } from './ReportSheet';

/**
 * F4 · "Comentários" em folha, sobre o feed: lista e campo, sem GIF. Arrastar a
 * folha não é o único jeito de fechar: tem "Fechar" (48×48), o véu e o voltar do
 * Android.
 *
 * O ACEITE NÃO FECHA MAIS A FOLHA (decisão do fundador, 2026-09-22): a tela de
 * aceite antes de participar saiu. Enquanto o aceite falta, a linha "Ao publicar,
 * você confirma que tem 16 anos ou mais e aceita as regras do Juntos." fica à
 * vista embaixo do campo (com link para as regras), e o PRÓPRIO toque em Enviar —
 * ou no primeiro Amém de um comentário — registra 16+, as regras e o
 * consentimento destacado antes de criar o conteúdo, como o Google Play e o Apple
 * 1.2 pedem. Ninguém navega e o que foi escrito nunca se perde.
 *
 * Denunciar, bloquear e apagar o meu comentário: a mesma folha de C5, aberta de
 * dentro desta.
 */
export type CommentsTarget = { postId: string; authorName: string };

export function CommentsSheet({
  api,
  status,
  target,
  onClose,
  onAccepted,
  initialText,
  initialNotice,
  onCountChange,
  onPostGone,
}: {
  api: CommunityApi;
  status: CommunityStatus;
  /** null = fechada. */
  target: CommentsTarget | null;
  onClose: () => void;
  /** Aceite registrado no toque: quem tem o estado da comunidade pergunta de novo. */
  onAccepted?: () => void;
  initialText?: string;
  initialNotice?: string | null;
  onCountChange?: (postId: string, delta: number) => void;
  /** Bloqueou quem escreveu: o servidor tira o resto; o feed recarrega. */
  onPostGone?: () => void;
}) {
  const { isDark } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType={reduced ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar comentários"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: isDark ? glass.scrimDark : glass.scrim }}
      />
      {target ? (
        <SheetBody
          key={target.postId}
          api={api}
          status={status}
          target={target}
          onClose={onClose}
          onAccepted={onAccepted}
          initialText={initialText}
          initialNotice={initialNotice}
          onCountChange={onCountChange}
          onPostGone={onPostGone}
        />
      ) : null}
    </Modal>
  );
}

function SheetBody({
  api,
  status,
  target,
  onClose,
  onAccepted,
  initialText,
  initialNotice,
  onCountChange,
  onPostGone,
}: {
  api: CommunityApi;
  status: CommunityStatus;
  target: CommentsTarget;
  onClose: () => void;
  onAccepted?: () => void;
  initialText?: string;
  initialNotice?: string | null;
  onCountChange?: (postId: string, delta: number) => void;
  onPostGone?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<SheetTarget | null>(null);
  /** O aceite ainda falta: a linha fica à vista, e o toque em Enviar registra. */
  const aceiteFalta = needsConsent(status);
  const talk = useComments({
    api,
    postId: target.postId,
    status,
    showsAceiteLine: aceiteFalta,
    onAccepted,
    initialText,
    initialNotice,
    onCountChange: (delta) => onCountChange?.(target.postId, delta),
  });
  const { load } = talk;
  useEffect(() => {
    load();
  }, [load]);

  // AUDITORIA EXTERNA 2026-09-23: mesma correção da tela cheia (CommentsScreen),
  // porque é por esta folha que a maioria das conversas é aberta. Lista
  // virtualizada, e o teto do servidor avisado em vez de cortar calado.
  const noTeto = talk.list.phase === 'ready' && talk.list.items.length >= COMMENTS_SERVER_LIMIT;

  let body: ReactNode = null;
  if (talk.list.phase === 'loading') body = <FeedSkeleton gutter={GUTTER} />;
  else if (talk.list.phase === 'error') {
    body = (
      <View style={{ paddingHorizontal: GUTTER }}>
        <FeedError message={talk.list.message} onRetry={load} testID="comments-error" />
      </View>
    );
  } else if (talk.list.items.length === 0) {
    body = <CommentsEmpty />;
  }

  const comentarios = talk.list.phase === 'ready' ? talk.list.items : [];

  return (
    <KeyboardAvoidingView behavior="padding" style={{ maxHeight: height * 0.9 }}>
      <View
        testID="comments-sheet"
        aria-modal
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingTop: spacing.md,
          minHeight: Math.min(height * 0.6, 520),
          maxHeight: height * 0.9,
          ...floatShadow,
          // Mesmo filete do Sheet no escuro (TEMA_ESCURO_PROPOSTA, achado 3).
          ...(isDark ? { borderTopWidth: 1, borderColor: glass.hairlineDark } : null),
        }}
      >
        <View
          style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, alignSelf: 'center' }}
          aria-hidden
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: GUTTER, paddingRight: GUTTER - 12 }}>
          <AppText
            variant="blockTitle"
            accessibilityRole="header"
            style={{ flex: 1, fontSize: 20, lineHeight: 25, letterSpacing: 0 }}
          >
            Comentários
          </AppText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            testID="comments-sheet-close"
            style={({ pressed }) => [
              { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
              pressed && { opacity: 0.72 },
            ]}
          >
            <Icon name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Rule />
        <FlatList
          data={comentarios}
          keyExtractor={(comment) => comment.commentId}
          renderItem={({ item: comment }) => (
            <CommentRow
              comment={comment}
              onMore={() =>
                setReport({
                  kind: 'comment',
                  commentId: comment.commentId,
                  authorName: comment.authorName,
                  isMine: comment.isMine,
                })
              }
              onAmen={(next) => talk.toggleAmen(comment.commentId, next)}
            />
          )}
          ListEmptyComponent={body}
          ListFooterComponent={
            noTeto ? (
              <View style={{ paddingHorizontal: GUTTER, paddingTop: spacing.md }}>
                <AppText variant="caption" accessibilityLiveRegion="polite" testID="comments-truncated">
                  Esta conversa passou de {COMMENTS_SERVER_LIMIT} comentários. Por enquanto o app mostra os{' '}
                  {COMMENTS_SERVER_LIMIT} primeiros.
                </AppText>
              </View>
            ) : null
          }
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          testID="comments-sheet-list"
        />
        {talk.list.phase === 'ready' ? (
          <Composer
            value={talk.text}
            onChange={talk.setText}
            onSend={talk.send}
            canSend={talk.canSend}
            sending={talk.sending}
            length={talk.length}
            error={talk.error}
            notice={talk.notice}
            bottomInset={insets.bottom}
            onSheet
            needsAceite={aceiteFalta}
            onOpenRules={() => router.push(COMMUNITY_ROUTES.regras)}
          />
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </View>
      <ReportSheet
        api={api}
        target={report}
        onClose={() => setReport(null)}
        onDeleted={(t) => t.kind === 'comment' && talk.drop(t.commentId)}
        onHidden={(t) => t.kind === 'comment' && talk.drop(t.commentId)}
        onBlocked={(t) => {
          if (t.kind === 'comment') talk.drop(t.commentId);
          load();
          onPostGone?.();
        }}
      />
    </KeyboardAvoidingView>
  );
}
