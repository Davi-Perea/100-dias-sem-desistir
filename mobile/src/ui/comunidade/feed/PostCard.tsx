import { Pressable, View } from 'react-native';

import { AppText, Rule } from '@/ui/components';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

import { AmenButton, AmenSummary } from './AmenButton';
import { PhotoCarousel } from './PhotoCarousel';
import { relativeTime } from './tempo';
import type { CardModel } from './useFeed';
import { activityLine } from './v2';

/**
 * Cartão do post do dia (F1, "diário compartilhado"):
 *
 *   (avatar) Ana · há 4 h            ···  ← denunciar, bloquear, apagar o meu
 *            Leitura do dia · Dia 3       ← tipo da atividade
 *   texto
 *   [fotos em carrossel, 1–4]
 *   Amém (rostinhos) 12   Comentar 3        Ver leitura ›
 *
 * SAIU o rótulo do grupo no topo (2026-09-22): todo post vai para a igreja
 * inteira, e uma etiqueta "Toda a igreja" repetida em cada cartão só ocupa linha.
 *
 * O número e os rostinhos de Amém são decisão do fundador (F3). "Em análise" só
 * existe no cartão do próprio autor (o servidor nunca manda para mais ninguém),
 * dito em palavra, sem Amém nem comentário.
 *
 * O cartão não tem calha própria na foto: a lista não tem padding lateral, e o
 * texto recebe a calha aqui, para a foto ir de ponta a ponta.
 */
export function PostCard({
  card,
  photos,
  gutter,
  onAmen,
  onComments,
  onMore,
  onOpenReading,
  now,
}: {
  card: CardModel;
  /** URLs assinadas (fotos do post, fotos de perfil, rostinhos), por caminho. */
  photos: Map<string, string>;
  gutter: number;
  onAmen: (next: boolean) => void;
  onComments: () => void;
  onMore: () => void;
  /** "Ver leitura": abre o leitor no dia anexado. */
  onOpenReading?: (day: number) => void;
  now?: number;
}) {
  const { colors } = useTheme();
  const when = relativeTime(card.at, now);
  const who = card.isMine ? 'sua publicação' : `publicação de ${card.authorName}`;
  const activity = activityLine(card.kind, card.dayNumber, card.verse);
  const nameLine = when.short ? `${card.authorName} · ${when.short}` : card.authorName;
  const spoken = [card.authorName, when.spoken, activity?.replace(/ · /g, ', ')].filter(Boolean).join(', ');

  const header = (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: gutter, paddingRight: gutter - 12 }}>
        <ProfileAvatar
          name={card.authorName}
          uri={card.avatarPath ? photos.get(card.avatarPath) : undefined}
          size={42}
          testID={`post-avatar-${card.postId}`}
        />
        <View style={{ flex: 1, gap: 2, paddingVertical: spacing.xs }} accessible accessibilityLabel={spoken}>
          <AppText variant="rowLabel" style={{ lineHeight: 19 }} testID={`post-author-${card.postId}`}>
            {nameLine}
          </AppText>
          {activity ? (
            <AppText
              variant="caption"
              style={{ color: colors.blue, fontSize: 13, lineHeight: 18 }}
              testID={`post-activity-${card.postId}`}
            >
              {activity}
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={card.isMine ? 'Opções da sua publicação' : `Denunciar ou bloquear, ${who}`}
          testID={`post-more-${card.postId}`}
          style={({ pressed }) => [
            { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
            pressed && { opacity: 0.72 },
          ]}
        >
          <Icon name="more" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );

  const review = card.inReview ? (
    <View
      style={{
        marginHorizontal: gutter,
        backgroundColor: colors.blueSoft,
        borderColor: colors.blueSoftBorder,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: MIN_TOUCH,
        gap: 2,
      }}
      accessible
      accessibilityLabel="Em análise. Só você vê. Uma pessoa da equipe da igreja olha antes de aparecer para os outros."
      testID={`post-in-review-${card.postId}`}
    >
      <AppText variant="captionStrong" style={{ color: colors.onBlueSoft, fontSize: 13, lineHeight: 18 }}>
        Em análise · só você vê
      </AppText>
      <AppText variant="caption" style={{ color: colors.onBlueSoft }}>
        Uma pessoa da equipe da igreja olha antes de aparecer para os outros.
      </AppText>
    </View>
  ) : null;

  const bodyText = card.body ? (
    <AppText variant="body" style={{ paddingHorizontal: gutter }} testID={`post-body-${card.postId}`}>
      {card.body}
    </AppText>
  ) : null;

  const readingDay = card.dayNumber;
  const seeReading =
    readingDay && onOpenReading ? (
      <Pressable
        onPress={() => onOpenReading(readingDay)}
        accessibilityRole="link"
        accessibilityLabel={`Ver leitura do dia ${readingDay}`}
        testID={`post-reading-${card.postId}`}
        style={({ pressed }) => [
          {
            minHeight: MIN_TOUCH,
            paddingVertical: spacing.sm,
            paddingLeft: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            marginLeft: 'auto',
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <AppText variant="rowLabel" style={{ color: colors.blue }}>
          Ver leitura
        </AppText>
        <Icon name="chevron-right" size={18} color={colors.blue} />
      </Pressable>
    ) : null;

  const comments = card.commentCount;
  const actions = card.inReview ? (
    seeReading ? (
      <View style={{ flexDirection: 'row', paddingHorizontal: gutter }}>{seeReading}</View>
    ) : null
  ) : (
    // Recuo 14 na calha de 20 do feed: o ícone de 27 no alvo de 48 cai alinhado ao texto.
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: spacing.xs,
        paddingLeft: Math.max(14, gutter - 6),
        paddingRight: gutter,
      }}
    >
      <AmenButton checked={card.iSaidAmen} onToggle={onAmen} testID={`post-amen-${card.postId}`} />
      <AmenSummary
        count={card.amenCount}
        iSaidAmen={card.iSaidAmen}
        faces={card.amenFaces}
        urls={photos}
        testID={`post-amen-summary-${card.postId}`}
      />
      <Pressable
        onPress={onComments}
        accessibilityRole="button"
        accessibilityLabel={
          comments > 0 ? `Comentários, ${comments} ${comments === 1 ? 'comentário' : 'comentários'}` : 'Comentar'
        }
        testID={`post-comment-${card.postId}`}
        style={({ pressed }) => [
          {
            minWidth: MIN_TOUCH,
            minHeight: MIN_TOUCH,
            paddingVertical: spacing.sm,
            marginLeft: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Icon name="comment" size={26} color={colors.text} />
        {comments > 0 ? (
          <AppText variant="rowLabel" testID={`post-comment-count-${card.postId}`}>
            {comments.toLocaleString('pt-BR')}
          </AppText>
        ) : null}
      </Pressable>
      {seeReading}
    </View>
  );

  return (
    <View testID={`post-${card.postId}`} style={{ paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
      {header}
      {review}
      {bodyText}
      {card.photoPaths.length ? <PhotoCarousel paths={card.photoPaths} urls={photos} authorName={card.authorName} /> : null}
      {actions}
      <Rule />
    </View>
  );
}
