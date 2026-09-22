import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { BackBar } from '@/ui/BackBar';
import { AppText, IconCircle, Rule, Screen, StateLayout } from '@/ui/components';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { Icon } from '@/ui/icons';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

import { FeedError, FeedSkeleton, GateView } from './FeedStates';
import { commentsHref } from './rotas';
import { relativeTime } from './tempo';
import { humanError, useCommunity } from './useCommunity';
import { type ActivityItem, activityApi, activityText } from './v2';

const GUTTER = 20;

/**
 * F8 · Atividade (o sino do feed): quem disse Amém e quem comentou nas MINHAS
 * publicações, dentro do app. Sem notificação push (decisão do fundador).
 *
 * Tocar abre a conversa do post. Ao abrir a tela, o servidor marca tudo como
 * visto (o ponto do sino some); o que era novo continua marcado "Novo" nesta
 * visita, em palavra, não só em cor.
 */
export function ActivityScreen() {
  const { gate, reload } = useCommunity();
  let content: ReactNode;
  if (gate.kind === 'ready') content = <ReadyActivity api={gate.api} />;
  else if (gate.kind === 'loading') content = <FeedSkeleton gutter={GUTTER} />;
  else {
    content = (
      <View style={{ paddingHorizontal: GUTTER }}>
        <GateView gate={gate} onRetry={reload} />
      </View>
    );
  }
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + GUTTER * 2, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: GUTTER - 8, gap: spacing.xs, paddingBottom: spacing.sm }}>
          <BackBar label="Voltar" />
          <AppText
            variant="blockTitle"
            accessibilityRole="header"
            style={{ fontSize: 20, lineHeight: 25, letterSpacing: 0, paddingHorizontal: 8 }}
          >
            Atividade
          </AppText>
        </View>
        <Rule />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }}>{content}</ScrollView>
      </View>
    </Screen>
  );
}

type State =
  | { phase: 'loading' }
  | { phase: 'unsupported' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; items: ActivityItem[]; photos: Map<string, string> };

function ReadyActivity({ api }: { api: CommunityApi }) {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const request = useRef(0);

  const load = useCallback(async () => {
    const activity = activityApi(api);
    if (!activity) {
      setState({ phase: 'unsupported' });
      return;
    }
    const id = ++request.current;
    try {
      const items = await activity.myActivity();
      if (request.current !== id) return;
      setState({ phase: 'ready', items, photos: new Map() });
      // Viu: o ponto do sino some. Se falhar, só volta a aparecer; nada se perde.
      activity.markActivitySeen().catch(() => {});
      const urls = await api.signPhotoUrls(items.map((i) => i.actorAvatarPath)).catch(() => new Map<string, string>());
      if (request.current === id && urls.size) {
        setState((prev) => (prev.phase === 'ready' ? { ...prev, photos: urls } : prev));
      }
    } catch (error) {
      if (request.current === id) setState({ phase: 'error', message: humanError(error) });
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.phase === 'loading') return <FeedSkeleton gutter={GUTTER} />;
  if (state.phase === 'error') {
    return (
      <View style={{ paddingHorizontal: GUTTER }}>
        <FeedError message={state.message} onRetry={load} testID="activity-error" />
      </View>
    );
  }
  if (state.phase === 'unsupported' || state.items.length === 0) {
    return (
      <StateLayout
        kind="empty"
        inset="vertical"
        testID={state.phase === 'unsupported' ? 'activity-unsupported' : 'activity-empty'}
        glyph={<IconCircle name="bell" />}
        title={state.phase === 'unsupported' ? 'A atividade ainda não chegou nesta versão' : 'Nada por aqui ainda'}
        message="Quando alguém disser Amém ou comentar nas suas publicações, aparece aqui. Sem notificação: você vê quando abrir."
      />
    );
  }
  return (
    <View>
      {state.items.map((item) => (
        <ActivityRow key={item.activityId} item={item} photo={item.actorAvatarPath ? state.photos.get(item.actorAvatarPath) : undefined} />
      ))}
      <AppText variant="caption" style={{ textAlign: 'center', paddingVertical: spacing.xl, paddingHorizontal: GUTTER }} testID="activity-end">
        Isso é tudo por enquanto.
      </AppText>
    </View>
  );
}

function ActivityRow({ item, photo }: { item: ActivityItem; photo: string | undefined }) {
  const { colors } = useTheme();
  const when = relativeTime(item.at);
  const text = activityText(item);
  const preview = item.kind === 'comment' && item.preview ? item.preview : null;
  const spoken = [item.unread ? 'Novo' : null, text, preview ? `"${preview}"` : null, when.spoken || null]
    .filter(Boolean)
    .join('. ');
  return (
    <Pressable
      onPress={() => router.push(commentsHref(item.postId))}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Abre a conversa da publicação"
      testID={`activity-${item.activityId}`}
      style={({ pressed }) => [
        {
          minHeight: Math.max(64, MIN_TOUCH),
          paddingVertical: spacing.md,
          paddingHorizontal: GUTTER,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: item.unread ? colors.blueSoft : 'transparent',
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <View>
        <ProfileAvatar name={item.actorName} uri={photo} size={40} />
        <View
          aria-hidden
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={item.kind === 'amen' ? 'amen-filled' : 'comment'} size={14} color={colors.text} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {item.unread ? (
          <AppText variant="captionStrong" style={{ color: colors.onBlueSoft }} testID={`activity-new-${item.activityId}`}>
            Novo
          </AppText>
        ) : null}
        <AppText variant="rowLabel" style={{ color: item.unread ? colors.onBlueSoft : colors.text }}>
          {text}
        </AppText>
        {preview ? (
          <AppText variant="bodySm" numberOfLines={2} style={{ color: item.unread ? colors.onBlueSoft : colors.textSecondary }}>
            {`“${preview}”`}
          </AppText>
        ) : null}
        {when.short ? (
          <AppText variant="caption" style={{ color: item.unread ? colors.onBlueSoft : colors.textMuted }}>
            {when.short}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
