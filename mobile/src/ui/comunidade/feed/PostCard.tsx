import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { AppText, Avatar, Rule, useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, faces, spacing, useTheme } from '@/ui/theme';

import { AmenButton } from './AmenButton';
import { postMeta } from './tempo';
import type { CardModel } from './useFeed';

/**
 * Cartão do feed (C1): avatar de 42, nome, "Dia 17 · há 2 h", "···" em alvo de
 * 48, foto em sangria total 1:1 com filete acima e abaixo, fileira de ações
 * (Amém e comentar, 48×48, gap 4, recuo 14), legenda e "Ver comentários".
 *
 * Sem rótulo nos ícones e sem número em lugar nenhum: nem de Amém, nem de
 * comentários. "Em análise" só existe no cartão do próprio autor (o servidor
 * nunca manda para mais ninguém) e é dito em palavra, não em cor.
 *
 * O cartão não tem calha própria na foto: a lista não tem padding lateral, e o
 * texto recebe a calha aqui, para a foto poder ir de ponta a ponta.
 */
export function PostCard({
  card,
  photoUrl,
  gutter,
  onAmen,
  onComments,
  onMore,
  now,
}: {
  card: CardModel;
  photoUrl: string | undefined;
  gutter: number;
  onAmen: (next: boolean) => void;
  onComments: () => void;
  onMore: () => void;
  now?: number;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const meta = postMeta(card.dayNumber, card.at, now);
  const hasPhoto = Boolean(card.photoPath);
  const who = card.isMine ? 'sua publicação' : `publicação de ${card.authorName}`;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: gutter, paddingRight: gutter - 12 }}>
      <Avatar name={card.authorName} size={42} />
      <View
        style={{ flex: 1, gap: 2, paddingVertical: spacing.xs }}
        accessible
        accessibilityLabel={meta.spoken ? `${card.authorName}, ${meta.spoken}` : card.authorName}
      >
        <AppText variant="rowLabel" style={{ lineHeight: 19 }}>
          {card.authorName}
        </AppText>
        {meta.short ? (
          <AppText variant="caption" style={{ fontSize: 12, lineHeight: 16 }}>
            {meta.short}
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

  const actions = card.inReview ? null : (
    // Recuo 14 na calha de 20 do feed: o ícone de 27 no alvo de 48 cai alinhado ao texto.
    <View style={{ flexDirection: 'row', gap: spacing.xs, paddingLeft: Math.max(14, gutter - 6) }}>
      <AmenButton checked={card.iSaidAmen} onToggle={onAmen} testID={`post-amen-${card.postId}`} />
      <Pressable
        onPress={onComments}
        accessibilityRole="button"
        accessibilityLabel="Comentar"
        testID={`post-comment-${card.postId}`}
        style={({ pressed }) => [
          { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Icon name="comment" size={26} color={colors.text} />
      </Pressable>
    </View>
  );

  const bodyText = card.body ? (
    <AppText variant="body" style={{ paddingHorizontal: gutter }} testID={`post-body-${card.postId}`}>
      {hasPhoto ? (
        <Text style={{ fontFamily: face(faces.sg600), fontSize: 15, color: colors.text }}>{`${card.authorName} `}</Text>
      ) : null}
      {card.body}
    </AppText>
  ) : null;

  const seeComments = card.inReview ? null : (
    <Pressable
      onPress={onComments}
      accessibilityRole="button"
      accessibilityLabel={`Ver comentários da ${who}`}
      testID={`post-see-comments-${card.postId}`}
      style={({ pressed }) => [
        { minHeight: MIN_TOUCH, paddingVertical: spacing.sm, paddingHorizontal: gutter, justifyContent: 'center', alignSelf: 'flex-start' },
        pressed && { opacity: 0.72 },
      ]}
    >
      <AppText variant="rowLabel" style={{ color: colors.textSecondary }}>
        Ver comentários
      </AppText>
    </Pressable>
  );

  return (
    <View testID={`post-${card.postId}`} style={{ paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
      {header}
      {review}
      {hasPhoto ? (
        <>
          <PostPhoto url={photoUrl} authorName={card.authorName} />
          {actions}
          {bodyText}
        </>
      ) : (
        <>
          {bodyText}
          {actions}
        </>
      )}
      {seeComments}
      <Rule />
    </View>
  );
}

/**
 * Foto de ponta a ponta, 1:1, filete acima e abaixo. A URL é assinada e curta;
 * sem ela (ainda assinando, ou o servidor recusou) fica o quadro vazio, e se a
 * imagem falhar a tela diz isso em vez de mostrar um buraco.
 */
function PostPhoto({ url, authorName }: { url: string | undefined; authorName: string }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View>
      <Rule />
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceSunken, justifyContent: 'center' }}>
        {url && !failed ? (
          <Image
            source={{ uri: url }}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Foto publicada por ${authorName}`}
            testID="post-photo"
          />
        ) : failed ? (
          <AppText variant="caption" style={{ textAlign: 'center', padding: spacing.lg }}>
            Não foi possível mostrar a foto agora.
          </AppText>
        ) : null}
      </View>
      <Rule />
    </View>
  );
}
