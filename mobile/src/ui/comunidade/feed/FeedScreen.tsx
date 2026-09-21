import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import type { CommunityStatus } from '@/community/types';
import { getDay } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { useOnline } from '@/net/useOnline';
import { AppText, Button, DevContentBanner, OfflineBanner, Rule, SaveErrorNotice, Screen } from '@/ui/components';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { FeedEmpty, FeedEnd, FeedError, FeedSkeleton, GateView } from './FeedStates';
import { PostCard } from './PostCard';
import { commentsHref, COMMUNITY_ROUTES, consentHref } from './rotas';
import { needsConsent, useCommunity } from './useCommunity';
import { useFeed } from './useFeed';

/** Calha das telas de lista e feed (TELAS, convenções): 20. */
const FEED_GUTTER = 20;
const COLUMN = { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + FEED_GUTTER * 2, alignSelf: 'center' } as const;

/**
 * C1 · Feed da Comunidade.
 *
 * Cabeçalho ("Comunidade" + pílula "Escrever"), a linha do dia que a igreja
 * está lendo (o feed nunca esquece de onde veio), os cartões e o fim explícito.
 * Estados: sem servidor, sem conta, sem código, suspensa, carregando (esqueleto
 * na forma do post), erro (F5), vazio (C2) e sem internet (o feed fica
 * indisponível, a jornada não).
 */
export function FeedScreen() {
  const { gate, reload } = useCommunity();
  const journey = useJourney();
  const online = useOnline();

  const header = (
    <FeedHeader
      canWrite={gate.kind === 'ready'}
      onWrite={() => {
        if (gate.kind !== 'ready') return;
        router.push(COMMUNITY_ROUTES.publicar);
      }}
      day={journey.phase === 'before_start' ? null : journey.officialDay}
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

function FeedHeader({ canWrite, onWrite, day }: { canWrite: boolean; onWrite: () => void; day: number | null }) {
  const { colors } = useTheme();
  const reading = day ? readingSummary(getDay(day)) : null;
  const line = day ? `Dia ${day}${reading ? ` · a igreja está lendo ${reading.label}` : ''}` : null;
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
          paddingHorizontal: FEED_GUTTER,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        <AppText variant="screenTitle" accessibilityRole="header" style={{ flex: 1, minWidth: 160 }}>
          Comunidade
        </AppText>
        {canWrite ? (
          <Pressable
            onPress={onWrite}
            accessibilityRole="button"
            accessibilityLabel="Escrever para a comunidade"
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
        ) : null}
      </View>
      {line ? (
        <Pressable
          onPress={() => router.navigate(COMMUNITY_ROUTES.jornada)}
          accessibilityRole="link"
          accessibilityLabel={`Dia ${day}${reading ? `, a igreja está lendo ${reading.label.replace(/·/g, ',')}` : ''}. Abrir a Jornada`}
          testID="feed-day-line"
          style={({ pressed }) => [
            { minHeight: MIN_TOUCH, paddingVertical: spacing.sm, paddingHorizontal: FEED_GUTTER, justifyContent: 'center' },
            pressed && { opacity: 0.72 },
          ]}
        >
          <AppText variant="rowLabel" style={{ fontSize: 13, lineHeight: 18, color: colors.blue }}>
            {line}
          </AppText>
        </Pressable>
      ) : null}
      <Rule />
    </View>
  );
}

function OfflineNotice() {
  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }} testID="feed-offline">
      <OfflineBanner />
      <AppText variant="bodySm">A comunidade volta quando a internet voltar.</AppText>
    </View>
  );
}

function ReadyFeed({
  header,
  api,
  status,
  online,
  day,
}: {
  header: ReactNode;
  api: CommunityApi;
  status: CommunityStatus;
  online: boolean;
  day: number;
}) {
  const journey = useJourney();
  const feed = useFeed(api, status.displayName ?? 'Você');
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  // Carrega ao aparecer e se atualiza ao voltar de Publicar, dos comentários ou do consentimento.
  useFocusEffect(feed.onFocus);

  const gated = needsConsent(status);
  const openConsent = () => router.push(consentHref(status));

  let list: ReactNode;
  const state = feed.state;
  if (state.phase === 'loading') {
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
        <FeedEmpty day={day} firstDay={day <= 1} />
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
            photoUrl={card.photoPath ? feed.photos.get(card.photoPath) : undefined}
            onAmen={(next) => (gated ? openConsent() : feed.toggleAmen(card.postId, next))}
            onComments={() => router.push(commentsHref(card.postId))}
            onMore={() =>
              setSheet({
                kind: 'post',
                postId: card.postId,
                authorName: card.authorName,
                isMine: card.isMine,
                hasPhoto: Boolean(card.photoPath),
              })
            }
          />
        ))}
        <View style={{ paddingHorizontal: FEED_GUTTER }}>
          {state.ended ? (
            <FeedEnd />
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
        </View>
        {list}
        {state.phase === 'ready' ? (
          <View style={{ paddingHorizontal: FEED_GUTTER, gap: spacing.xs }}>
            <Button
              title="Minhas publicações"
              variant="underline"
              onPress={() => router.push(COMMUNITY_ROUTES.minhas)}
              testID="feed-my-posts"
            />
            <Button
              title="Regras da comunidade"
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
    </>
  );
}
