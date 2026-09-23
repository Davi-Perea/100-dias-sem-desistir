import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CommunityApi } from '@/community/api';
import { COMMENTS_SERVER_LIMIT, type CommunityStatus } from '@/community/types';
import { BackBar } from '@/ui/BackBar';
import { AppText, Rule, Screen } from '@/ui/components';
import { MAX_CONTENT_WIDTH, spacing } from '@/ui/theme';

import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { CommentRow, CommentsEmpty, COMMENTS_GUTTER as GUTTER, Composer, useComments } from './comentarios';
import { FeedError, FeedSkeleton, GateView } from './FeedStates';
import { COMMUNITY_ROUTES } from './rotas';
import { needsConsent, useCommunity } from './useCommunity';

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
    return <ReadyComments postId={postId} api={gate.api} status={gate.status} reload={reload} />;
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

function ReadyComments({
  postId,
  api,
  status,
  reload,
}: {
  postId: string;
  api: CommunityApi;
  status: CommunityStatus;
  reload: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  // Sem tela de aceite (2026-09-22): a linha fica embaixo do campo e o toque em
  // Enviar registra. Depois de registrado, o estado da comunidade é perguntado de novo.
  const needsAceite = needsConsent(status);
  const talk = useComments({ api, postId, status, showsAceiteLine: needsAceite, onAccepted: reload });
  const { load } = talk;

  // Ao abrir e a cada volta (do consentimento, por exemplo): a lista fica em dia.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /**
   * AUDITORIA EXTERNA 2026-09-23 (escala da conversa).
   *
   * Duas coisas, e só uma delas é resolvível aqui:
   *
   * 1. RENDER — era `items.map` dentro de um ScrollView: num post muito
   *    comentado, todas as linhas ficavam montadas ao mesmo tempo. Virou
   *    FlatList, que desmonta o que saiu da tela. Resolvido.
   *
   * 2. PAGINAÇÃO — o servidor NÃO tem cursor. `private.community_post_comments`
   *    devolve `limit 200`, ordenado do mais antigo para o mais novo, sem
   *    `before`/`after`. Isso não é payload infinito (é o que a auditoria
   *    supôs), é pior de outro jeito: é um corte SILENCIOSO. Num post com 250
   *    comentários, os 50 mais novos simplesmente não existem para ninguém, e
   *    nada na tela diz isso. Baixar tudo e fatiar aqui seria fingir que
   *    escala; então a tela passa a AVISAR quando bateu no teto, e a paginação
   *    de verdade fica registrada como pendência de servidor
   *    (docs/technical/COMUNIDADE_V2_COMENTARIOS_PAGINACAO.md).
   */
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
    <Screen edges={['top', 'left', 'right']}>
      {/* Teclado aberto é estado de layout (REGRAS 28). 'padding' também no
          Android, como em B5: com o edge-to-edge do RN 0.86 a janela não encolhe
          com o teclado. PROVISÓRIO: ainda não verificado em aparelho. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top}>
        <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + GUTTER * 2, alignSelf: 'center' }}>
          <CommentsHeader />
          <Rule />
          <FlatList
            data={comentarios}
            keyExtractor={(comment) => comment.commentId}
            renderItem={({ item: comment }) => (
              <CommentRow
                comment={comment}
                onMore={() =>
                  setSheet({
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
            contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            testID="comments-list"
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
              needsAceite={needsAceite}
              onOpenRules={() => router.push(COMMUNITY_ROUTES.regras)}
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
