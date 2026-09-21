import { Stack, useLocalSearchParams } from 'expo-router';

import { isUuid } from '@/community/validation';
import { BackBar } from '@/ui/BackBar';
import { Screen, StateView } from '@/ui/components';
import { CommentsScreen } from '@/ui/comunidade/feed/CommentsScreen';

/**
 * C6 · Comentários de uma publicação (`/comunidade/post/<id>`).
 *
 * O id vem da rota e pode vir adulterado (link): o que não é uuid nem chega a
 * perguntar ao servidor. A barra é a própria (BackBar), sem cabeçalho nativo.
 */
export default function PostCommentsRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(id) ? id[0] : id;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {postId && isUuid(postId) ? (
        <CommentsScreen postId={postId} />
      ) : (
        <Screen>
          <BackBar label="Voltar" />
          <StateView
            kind="empty"
            icon="comment"
            title="Publicação não encontrada"
            message="Ela pode ter sido apagada pela pessoa que escreveu."
          />
        </Screen>
      )}
    </>
  );
}
