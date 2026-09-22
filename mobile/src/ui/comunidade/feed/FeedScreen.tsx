import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { DEMO_BADGE, DEMO_LABELS_ON_SCREEN, isCommunityDemo } from '@/community/demoApi';
import type { CommunityStatus } from '@/community/types';
import { useJourney } from '@/journey/useJourney';
import { useOnline } from '@/net/useOnline';
import { AppText, Button, DevContentBanner, OfflineBanner, Pill, Rule, SaveErrorNotice, Screen } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { CommentsSheet, type CommentsTarget } from '../sheets/CommentsSheet';
import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { AFTER_CONSENT_COMMENT, flushPendingCommentAmen, takePendingCommentAmen } from './comentarios';
import { FeedEmpty, FeedEnd, FeedError, FeedSkeleton, GateView } from './FeedStates';
import { PostCard } from './PostCard';
import { takeAceiteOutcome } from '../publicar/aceite';
import { ROUTES as PUBLISH_ROUTES } from '../publicar/fluxo';
import { ACTIVITY_ROUTE, COMMUNITY_ROUTES, readerHref } from './rotas';
import { needsConsent, useCommunity } from './useCommunity';
import { useFeed } from './useFeed';
import { type FeedScope, hasNewActivity } from './v2';

/** Calha das telas de lista e feed (TELAS, convenções): 20. */
const FEED_GUTTER = 20;
/** Dito ao voltar do aceite: o Amém que levou até lá foi registrado. */
export const AFTER_CONSENT_FEED = 'Pronto. Seu Amém foi registrado.';

/** A tela única de aceite (16+, regras, consentimento e nome, se faltar). */
const ACEITE_ROUTE = PUBLISH_ROUTES.consentimento as never;

const COLUMN = { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + FEED_GUTTER * 2, alignSelf: 'center' } as const;

/**
 * C1 · Juntos, o "diário compartilhado" (FEEDBACK_DAVI_2026-09-22, F1–F8):
 * cada pessoa conta o seu dia com a Bíblia, e a igreja acompanha.
 *
 * Quem abre a aba já está dentro (2026-09-22): a entrada é automática
 * (useCommunity), sem tela de entrar, sem código, sem perfil. A primeira
 * interação que expõe (post, comentário, Amém) abre a tela única de aceite e,
 * ao concordar, a ação que a pessoa queria acontece.
 *
 * Topo: "Juntos", o sino da Atividade (F8, com ponto quando há novidade),
 * "Escrever", e os filtros "Toda a igreja · Meu ministério" (F6: sem
 * seguidores). Depois os posts do dia e o fim explícito.
 *
 * Estados: sem servidor, suspensa, entrando/carregando (esqueleto
 * na forma do post), erro (F5), vazio (C2) e sem internet (o feed fica
 * indisponível, a jornada não).
 */
export function FeedScreen() {
  const { gate, reload } = useCommunity();
  const journey = useJourney();
  const online = useOnline();
  const [scope, setScope] = useState<FeedScope>('igreja');

  const ready = gate.kind === 'ready';
  const header = (
    <FeedHeader
      ready={ready}
      unread={ready ? hasNewActivity(gate.status) : false}
      scope={scope}
      onScope={setScope}
      onWrite={() => ready && router.push(COMMUNITY_ROUTES.publicar)}
    />
  );

  if (gate.kind === 'ready') {
    return (
      <Screen>
        <View style={COLUMN}>
          <ReadyFeed
            header={header}
            api={gate.api}
            status={gate.status}
            online={online}
            day={Math.max(1, journey.officialDay)}
            scope={scope}
          />
        </View>
      </Screen>
    );
  }

  let content: ReactNode;
  if (gate.kind === 'loading') {
    content = <FeedSkeleton gutter={FEED_GUTTER} />;
  } else {
    content = (
      <View style={{ paddingHorizontal: FEED_GUTTER, paddingTop: spacing.lg }}>
        {!online && gate.kind === 'error' ? <OfflineNotice /> : null}
        <GateView gate={gate} onRetry={reload} />
      </View>
    );
  }

  return (
    <Screen>
      <View style={COLUMN}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          {header}
          <View style={{ paddingHorizontal: FEED_GUTTER }}>
            <DevContentBanner state={journey.contentState} compact />
          </View>
          {content}
        </ScrollView>
      </View>
    </Screen>
  );
}

function FeedHeader({
  ready,
  unread,
  scope,
  onScope,
  onWrite,
}: {
  ready: boolean;
  unread: boolean;
  scope: FeedScope;
  onScope: (scope: FeedScope) => void;
  onWrite: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.sm,
          paddingHorizontal: FEED_GUTTER,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        }}
      >
        <AppText variant="screenTitle" accessibilityRole="header" style={{ flex: 1, minWidth: 160 }}>
          Juntos
        </AppText>
        {ready ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Pressable
              onPress={() => router.push(ACTIVITY_ROUTE)}
              accessibilityRole="button"
              accessibilityLabel={unread ? 'Atividade, tem novidade' : 'Atividade'}
              testID="feed-bell"
              style={({ pressed }) => [
                { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
                pressed && { opacity: 0.72 },
              ]}
            >
              <View>
                <Icon name="bell" size={24} color={colors.text} />
                {unread ? (
                  // Ponto em `danger` (não amarelo: 1,46:1 no claro) com anel da página.
                  <View
                    testID="feed-bell-dot"
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -3,
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: colors.danger,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
            <Pressable
              onPress={onWrite}
              accessibilityRole="button"
              accessibilityLabel="Escrever no Juntos"
              testID="feed-write"
              style={({ pressed }) => [
                {
                  minHeight: MIN_TOUCH,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: 20,
                  borderRadius: 999,
                  backgroundColor: colors.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <AppText variant="action" style={{ color: colors.onBlue }}>
                Escrever
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
      {DEMO_LABELS_ON_SCREEN && isCommunityDemo() ? <DemoBadge /> : null}
      {ready ? (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, paddingHorizontal: FEED_GUTTER, paddingBottom: spacing.xs }}
          testID="feed-scope"
        >
          <Pill label="Toda a igreja" active={scope === 'igreja'} onPress={() => onScope('igreja')} testID="feed-scope-igreja" />
          <Pill
            label="Meu ministério"
            active={scope === 'ministerio'}
            onPress={() => onScope('ministerio')}
            testID="feed-scope-ministerio"
          />
        </View>
      ) : null}
      <Rule />
    </View>
  );
}

/** Selo discreto da demonstração (demoApi.ts): nada sai do aparelho. */
function DemoBadge() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: FEED_GUTTER, paddingBottom: spacing.xs, flexDirection: 'row' }}>
      <View
        testID="feed-demo-badge"
        accessible
        accessibilityLabel="Demonstração. Nada é enviado."
        style={{
          borderWidth: 1,
          borderColor: colors.controlBorder,
          borderRadius: 999,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
        }}
      >
        <AppText variant="caption" style={{ color: colors.textSecondary }}>
          {DEMO_BADGE}
        </AppText>
      </View>
    </View>
  );
}

function OfflineNotice() {
  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }} testID="feed-offline">
      <OfflineBanner />
      <AppText variant="bodySm">O Juntos volta quando a internet voltar.</AppText>
    </View>
  );
}

/** "Meu ministério" sem ministério no perfil: diz isso e leva ao perfil. */
function NoMinistry() {
  return (
    <View style={{ paddingHorizontal: FEED_GUTTER, paddingVertical: spacing.xl, gap: spacing.md }} testID="feed-no-ministry">
      <AppText variant="action" style={{ textAlign: 'center' }}>
        Você ainda não escolheu um ministério
      </AppText>
      <AppText variant="bodySm" style={{ textAlign: 'center' }}>
        Escolha o seu no perfil para ver aqui o que as pessoas dele estão compartilhando.
      </AppText>
      <Button title="Escolher no perfil" variant="outline" onPress={() => router.push(COMMUNITY_ROUTES.perfil)} testID="feed-no-ministry-profile" />
    </View>
  );
}

type CommentsOpen = { target: CommentsTarget; text: string; notice: string | null };

function ReadyFeed({
  header,
  api,
  status,
  online,
  day,
  scope,
}: {
  header: ReactNode;
  api: CommunityApi;
  status: CommunityStatus;
  online: boolean;
  day: number;
  scope: FeedScope;
}) {
  const journey = useJourney();
  const ministry = status.profile.ministry;
  const noMinistry = scope === 'ministerio' && !ministry;
  const feed = useFeed(api, status.displayName ?? 'Você', ministry, status.profile.avatarPath, noMinistry ? 'igreja' : scope);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [comments, setComments] = useState<CommentsOpen | null>(null);
  // Rascunho de comentário guardado quando a folha fechou para o aceite.
  const draft = useRef<{ postId: string; text: string } | null>(null);

  // Carrega ao aparecer e se atualiza ao voltar de Publicar, da Atividade ou do consentimento.
  useFocusEffect(feed.onFocus);

  const gated = needsConsent(status);
  // O Amém que abriu o aceite fica guardado. Se a pessoa concordou ("Concordo e
  // continuar" é o toque dela), ele é registrado assim que o status novo chega;
  // se ela saiu sem concordar, é esquecido.
  const pendingAmen = useRef<{ postId: string; next: boolean } | null>(null);
  const [consentNotice, setConsentNotice] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const outcome = takeAceiteOutcome();
      if (outcome !== 'accepted') pendingAmen.current = null;
      // Saiu do aceite sem concordar: o Amém de comentário dado pela folha também é esquecido.
      if (outcome === 'declined') takePendingCommentAmen();
    }, []),
  );
  const toggleAmen = useRef(feed.toggleAmen);
  useEffect(() => {
    toggleAmen.current = feed.toggleAmen;
  });
  // Amém de comentário dado pela folha (que fechou para o aceite): gravado ao
  // voltar liberado, sem precisar reabrir a conversa.
  useEffect(() => {
    if (!gated) void flushPendingCommentAmen(api);
  }, [gated, api]);
  useEffect(() => {
    const pending = pendingAmen.current;
    if (gated || !pending) return;
    pendingAmen.current = null;
    toggleAmen.current(pending.postId, pending.next);
    setConsentNotice(AFTER_CONSENT_FEED);
    announceNotice(AFTER_CONSENT_FEED);
  }, [gated]);
  const openConsent = (amen?: { postId: string; next: boolean }) => {
    pendingAmen.current = amen ?? null;
    router.push(ACEITE_ROUTE);
  };

  const openComments = (target: CommentsTarget) => {
    const saved = draft.current?.postId === target.postId ? draft.current : null;
    draft.current = null;
    setComments({
      target,
      text: saved?.text ?? '',
      notice: saved && !gated ? AFTER_CONSENT_COMMENT : null,
    });
  };

  const state = feed.state;
  let list: ReactNode;
  if (noMinistry) {
    list = <NoMinistry />;
  } else if (state.phase === 'loading') {
    list = <FeedSkeleton gutter={FEED_GUTTER} />;
  } else if (state.phase === 'error') {
    list = (
      <View style={{ paddingHorizontal: FEED_GUTTER }}>
        <FeedError message={state.message} onRetry={() => feed.reload()} />
      </View>
    );
  } else if (state.posts.length === 0 && state.inReview.length === 0) {
    list = (
      <View style={{ paddingHorizontal: FEED_GUTTER }}>
        <FeedEmpty day={day} firstDay={day <= 1} ministry={scope === 'ministerio'} />
      </View>
    );
  } else {
    const cards = [...state.inReview, ...state.posts];
    list = (
      <View>
        {cards.map((card) => (
          <PostCard
            key={`${card.inReview ? 'r' : 'p'}-${card.postId}`}
            card={card}
            gutter={FEED_GUTTER}
            photos={feed.photos}
            onAmen={(next) => {
              if (gated) {
                openConsent({ postId: card.postId, next });
                return;
              }
              setConsentNotice(null);
              feed.toggleAmen(card.postId, next);
            }}
            onComments={() => openComments({ postId: card.postId, authorName: card.authorName })}
            onOpenReading={(readingDay) => router.push(readerHref(readingDay))}
            onMore={() =>
              setSheet({
                kind: 'post',
                postId: card.postId,
                authorName: card.authorName,
                isMine: card.isMine,
                hasPhoto: card.photoPaths.length > 0,
              })
            }
          />
        ))}
        <View style={{ paddingHorizontal: FEED_GUTTER }}>
          {state.ended ? (
            <FeedEnd ministry={scope === 'ministerio'} />
          ) : (
            <View style={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
              <Button
                title="Ver publicações anteriores"
                variant="outline"
                loading={feed.loadingMore}
                onPress={() => feed.loadMore()}
                testID="feed-more"
              />
              {feed.moreError ? <SaveErrorNotice message={feed.moreError} testID="feed-more-error" /> : null}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} accessibilityLabel="Atualizar" />
        }
        testID="feed-scroll"
      >
        {header}
        <View style={{ paddingHorizontal: FEED_GUTTER, gap: spacing.sm }}>
          <DevContentBanner state={journey.contentState} compact />
          {!online ? <OfflineNotice /> : null}
          {feed.notice ? <SaveErrorNotice message={feed.notice} testID="feed-notice" /> : null}
          {consentNotice ? (
            <AppText variant="rowLabel" accessibilityLiveRegion="polite" testID="feed-consent-notice">
              {consentNotice}
            </AppText>
          ) : null}
        </View>
        {list}
        {state.phase === 'ready' || noMinistry ? (
          <View style={{ paddingHorizontal: FEED_GUTTER, gap: spacing.xs }}>
            <Button
              title="Minhas publicações"
              variant="underline"
              onPress={() => router.push(COMMUNITY_ROUTES.minhas)}
              testID="feed-my-posts"
            />
            <Button
              title="Regras do Juntos"
              variant="underline"
              onPress={() => router.push(COMMUNITY_ROUTES.regras)}
              testID="feed-rules"
            />
          </View>
        ) : null}
      </ScrollView>
      <ReportSheet
        api={api}
        target={sheet}
        onClose={() => setSheet(null)}
        onDeleted={(t) => t.kind === 'post' && feed.removeCard(t.postId)}
        onHidden={(t) => t.kind === 'post' && feed.removeCard(t.postId)}
        onBlocked={(t) => feed.afterBlock(t.kind === 'post' ? t.postId : null)}
      />
      <CommentsSheet
        api={api}
        status={status}
        target={comments?.target ?? null}
        initialText={comments?.text}
        initialNotice={comments?.notice}
        onClose={() => setComments(null)}
        onNeedsConsent={(postId, text) => {
          draft.current = { postId, text };
          openConsent();
        }}
        onCountChange={feed.bumpComments}
        onPostGone={() => feed.afterBlock(null)}
      />
    </>
  );
}
