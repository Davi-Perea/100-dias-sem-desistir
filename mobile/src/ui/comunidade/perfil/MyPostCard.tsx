import { Alert, Image, Linking, View } from 'react-native';

import type { ContentStatus, MyPost } from '@/community/types';
import { AppText, Block, Button } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons';
import { radius, spacing, useTheme } from '@/ui/theme';

import {
  appealCopy,
  decidedByCopy,
  HOLD_COPY,
  IN_REVIEW_FALLBACK,
  postContext,
  REASON_LABEL,
  STATUS_LABEL,
  supportEmail,
} from './copy';

/** O estado aparece por palavra E por forma: cada um tem o seu ícone. */
const STATUS_ICON: Record<ContentStatus, IconName> = {
  published: 'check',
  in_review: 'clock',
  not_published: 'alert',
  removed: 'alert',
};

export function StatusTag({ status, testID }: { status: ContentStatus; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 30,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        // Limite de controle a 3,59:1; o texto dentro é tinta (18,88:1).
        borderWidth: 1.5,
        borderColor: colors.controlBorder,
        backgroundColor: status === 'published' ? colors.surface : colors.surfaceMuted,
      }}
    >
      <Icon name={STATUS_ICON[status]} size={16} color={colors.text} />
      <AppText variant="captionStrong">{STATUS_LABEL[status]}</AppText>
    </View>
  );
}

/** Por que a publicação está como está, em frases curtas. */
export function statusExplanation(post: MyPost): string[] {
  if (post.status === 'published') return [];
  if (post.status === 'in_review') {
    return [post.holdReason ? HOLD_COPY[post.holdReason] : IN_REVIEW_FALLBACK];
  }
  const lines: string[] = [
    post.status === 'removed'
      ? 'Esta publicação saiu do ar. Só você a vê aqui.'
      : 'Esta publicação não foi publicada. Só você a vê aqui.',
  ];
  if (post.reason) lines.push(`Motivo: ${REASON_LABEL[post.reason]}`);
  if (post.noteForAuthor) lines.push(`Nota da equipe: ${post.noteForAuthor}`);
  const who = decidedByCopy(post.decidedBy);
  if (who) lines.push(who);
  lines.push(appealCopy());
  return lines;
}

export function MyPostCard({
  post,
  photoUrl,
  onDelete,
}: {
  post: MyPost;
  photoUrl: string | null;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const context = postContext(post);
  const explanation = statusExplanation(post);
  const email = supportEmail();
  const contestable = post.status === 'not_published' || post.status === 'removed';
  return (
    <Block tone="surface" testID={`my-post-${post.postId}`}>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <StatusTag status={post.status} testID={`my-post-status-${post.postId}`} />
          {context ? <AppText variant="caption">{context}</AppText> : null}
        </View>
        {post.photoPath ? (
          photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              accessible
              accessibilityLabel="Foto desta publicação"
              style={{ width: '100%', aspectRatio: 1, borderRadius: radius.button, backgroundColor: colors.surfaceMuted }}
              resizeMode="cover"
            />
          ) : (
            <AppText variant="caption">Com foto.</AppText>
          )
        ) : null}
        {post.body ? <AppText variant="body">{post.body}</AppText> : null}
        {explanation.length > 0 ? (
          <Block tone={post.status === 'in_review' ? 'blueSoft' : 'muted'}>
            <View style={{ gap: spacing.sm }} testID={`my-post-explanation-${post.postId}`}>
              {explanation.map((line) => (
                <AppText
                  key={line}
                  variant="bodySm"
                  style={{ color: post.status === 'in_review' ? colors.onBlueSoft : colors.textSecondary }}
                >
                  {line}
                </AppText>
              ))}
            </View>
          </Block>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg }}>
          {contestable && email ? (
            <Button
              title="Pedir revisão por e-mail"
              variant="underline"
              onPress={() => {
                const subject = encodeURIComponent('Pedido de revisão de publicação');
                const body = encodeURIComponent(`Publicação de ${context || 'data não informada'}.`);
                // Sem app de e-mail no aparelho, o toque não pode morrer calado: diz o endereço.
                Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
                  Alert.alert(
                    'Não deu para abrir o e-mail',
                    `Escreva para ${email}, dizendo a data da publicação: ${context || 'data não informada'}.`,
                  );
                });
              }}
              testID={`my-post-appeal-${post.postId}`}
            />
          ) : null}
          <Button
            title="Apagar"
            variant="danger"
            onPress={onDelete}
            accessibilityLabel={`Apagar a publicação${context ? ` de ${context.replace(' · ', ', ')}` : ''}`}
            testID={`my-post-delete-${post.postId}`}
          />
        </View>
      </View>
    </Block>
  );
}
