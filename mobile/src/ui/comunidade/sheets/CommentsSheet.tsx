import { type ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommunityApi } from '@/community/api';
import type { CommunityStatus } from '@/community/types';
import { AppText, Rule } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { floatShadow, glass, MIN_TOUCH, radius, spacing, useReducedMotion, useTheme } from '@/ui/theme';

import { CommentRow, CommentsEmpty, COMMENTS_GUTTER as GUTTER, Composer, useComments } from '../feed/comentarios';
import { FeedError, FeedSkeleton } from '../feed/FeedStates';
import { ReportSheet, type SheetTarget } from './ReportSheet';

/**
 * F4 · "Comentários" em folha, sobre o feed: lista e campo, sem GIF. Arrastar a
 * folha não é o único jeito de fechar: tem "Fechar" (48×48), o véu e o voltar do
 * Android.
 *
 * Antes do primeiro comentário a folha FECHA e quem abriu leva às regras e ao
 * consentimento (uma folha aberta ficaria por cima da tela seguinte). O que
 * estava no campo volta junto quando a pessoa reabre, com o aviso de que ainda
 * não foi enviado.
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
  onNeedsConsent,
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
  /** A folha já fechou; quem abriu leva às regras/consentimento, guardando o rascunho. */
  onNeedsConsent: (postId: string, draft: string) => void;
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
          onNeedsConsent={onNeedsConsent}
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
  onNeedsConsent,
  initialText,
  initialNotice,
  onCountChange,
  onPostGone,
}: {
  api: CommunityApi;
  status: CommunityStatus;
  target: CommentsTarget;
  onClose: () => void;
  onNeedsConsent: (postId: string, draft: string) => void;
  initialText?: string;
  initialNotice?: string | null;
  onCountChange?: (postId: string, delta: number) => void;
  onPostGone?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<SheetTarget | null>(null);
  const talk = useComments({
    api,
    postId: target.postId,
    status,
    initialText,
    initialNotice,
    openConsent: (draft) => {
      onClose();
      onNeedsConsent(target.postId, draft);
    },
    onCountChange: (delta) => onCountChange?.(target.postId, delta),
  });
  const { load } = talk;
  useEffect(() => {
    load();
  }, [load]);

  let body: ReactNode;
  if (talk.list.phase === 'loading') body = <FeedSkeleton gutter={GUTTER} />;
  else if (talk.list.phase === 'error') {
    body = (
      <View style={{ paddingHorizontal: GUTTER }}>
        <FeedError message={talk.list.message} onRetry={load} testID="comments-error" />
      </View>
    );
  } else if (talk.list.items.length === 0) {
    body = <CommentsEmpty />;
  } else {
    body = (
      <View>
        {talk.list.items.map((comment) => (
          <CommentRow
            key={comment.commentId}
            comment={comment}
            onMore={() =>
              setReport({ kind: 'comment', commentId: comment.commentId, authorName: comment.authorName, isMine: comment.isMine })
            }
          />
        ))}
      </View>
    );
  }

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
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
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
