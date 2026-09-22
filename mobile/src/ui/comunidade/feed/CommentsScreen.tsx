import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommunityApi } from '@/community/api';
import type { CommunityStatus } from '@/community/types';
import { BackBar } from '@/ui/BackBar';
import { AppText, Rule, Screen } from '@/ui/components';
import { MAX_CONTENT_WIDTH, spacing } from '@/ui/theme';

import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { CommentRow, CommentsEmpty, COMMENTS_GUTTER as GUTTER, Composer, useComments } from './comentarios';
import { FeedError, FeedSkeleton, GateView } from './FeedStates';
import { consentHref } from './rotas';
import { useCommunity } from './useCommunity';

export { AFTER_CONSENT_COMMENT } from './comentarios';

/**
 * C6 · Comentários de uma publicação em tela cheia (`/comunidade/post/<id>`),
 * para quem chega por link ou pela Atividade (F8). No feed, a mesma conversa
 * abre na folha "Comentários" (F4, `sheets/CommentsSheet.tsx`); as partes são
 * as mesmas (`comentarios.tsx`).
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

function ReadyComments({ postId, api, status }: { postId: string; api: CommunityApi; status: CommunityStatus }) {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const talk = useComments({ api, postId, status, openConsent: () => router.push(consentHref(status)) });
  const { load } = talk;

  // Ao abrir e a cada volta (do consentimento, por exemplo): a lista fica em dia.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
              setSheet({ kind: 'comment', commentId: comment.commentId, authorName: comment.authorName, isMine: comment.isMine })
            }
            onAmen={(next) => talk.toggleAmen(comment.commentId, next)}
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
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <ReportSheet
        api={api}
        target={sheet}
        onClose={() => setSheet(null)}
        onDeleted={(t) => t.kind === 'comment' && talk.drop(t.commentId)}
        onHidden={(t) => t.kind === 'comment' && talk.drop(t.commentId)}
        onBlocked={(t) => {
          if (t.kind === 'comment') talk.drop(t.commentId);
          // O servidor tira o resto do que a pessoa bloqueada escreveu (e o post, se for dela).
          load();
        }}
      />
    </Screen>
  );
}
