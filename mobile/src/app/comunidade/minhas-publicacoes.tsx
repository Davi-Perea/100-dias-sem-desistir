import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import type { MyPost } from '@/community/types';
import { AppText, Button, StateView } from '@/ui/components';
import { postContext } from '@/ui/comunidade/perfil/copy';
import { MyPostCard } from '@/ui/comunidade/perfil/MyPostCard';
import { AccountStateView, ConfirmSheet, ProfileScreen } from '@/ui/comunidade/perfil/parts';
import { communityMessage, useCommunityAccount } from '@/ui/comunidade/perfil/useCommunityAccount';
import { spacing } from '@/ui/theme';

/**
 * Minhas publicações: todas as da pessoa, em qualquer estado, com o motivo em
 * palavras (publicado · em análise · não publicado · tirado do ar). "Em análise"
 * só o autor vê, e é aqui que ele vê. Nunca diz QUAL pessoa decidiu.
 *
 * A lista é a que o servidor devolve (`my_community_posts`), inteira e com fim.
 */
export default function MyPostsScreen() {
  const account = useCommunityAccount();
  if (account.kind !== 'ready') return <AccountStateView account={account} />;
  if (!account.status.isMember) {
    return (
      <ProfileScreen testID="my-posts-not-member">
        <StateView
          kind="empty"
          icon="community"
          title="Nada publicado"
          message="Você ainda não entrou na comunidade, então não há publicações suas."
        />
      </ProfileScreen>
    );
  }
  return <MyPosts api={account.api} />;
}

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; posts: MyPost[] };

function MyPosts({ api }: { api: CommunityApi }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [tick, setTick] = useState(0);
  const [target, setTarget] = useState<MyPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const retry = useCallback(() => {
    setLoad({ kind: 'loading' });
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    api.myPosts().then(
      (posts) => {
        if (!alive) return;
        setLoad({ kind: 'ready', posts });
        // A foto do próprio post (inclusive em análise) só abre por URL assinada.
        // Se a assinatura falhar, o post aparece sem a imagem, dizendo "Com foto".
        api.signPhotoUrls(posts.map((post) => post.photoPath)).then(
          (urls) => {
            if (alive) setPhotos(urls);
          },
          () => {},
        );
      },
      (error: unknown) => {
        if (alive) setLoad({ kind: 'error', message: communityMessage(error) });
      },
    );
    return () => {
      alive = false;
    };
  }, [api, tick]);

  const confirmDelete = async () => {
    if (!target) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await api.deletePost(target.postId);
      setLoad((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', posts: current.posts.filter((post) => post.postId !== target.postId) }
          : current,
      );
      setNotice('Publicação apagada.');
      setTarget(null);
    } catch (error) {
      setDeleteError(communityMessage(error, 'Não foi possível apagar agora. Tente de novo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileScreen testID="my-posts">
      <AppText variant="screenTitle" accessibilityRole="header">
        Minhas publicações
      </AppText>
      {load.kind === 'loading' ? <StateView kind="loading" /> : null}
      {load.kind === 'error' ? (
        <StateView
          kind="error"
          icon="alert"
          title="Não deu para carregar"
          message={load.message}
          action={<Button title="Tentar de novo" onPress={retry} testID="my-posts-retry" />}
        />
      ) : null}
      {load.kind === 'ready' && load.posts.length === 0 ? (
        <StateView
          kind="empty"
          icon="note"
          title="Nada publicado ainda"
          message="O que você publicar para a comunidade aparece aqui, com o estado de cada publicação. Só você vê esta lista."
        />
      ) : null}
      {notice ? (
        <AppText variant="rowLabel" accessibilityLiveRegion="polite" testID="my-posts-notice">
          {notice}
        </AppText>
      ) : null}
      {load.kind === 'ready' && load.posts.length > 0 ? (
        <View style={{ gap: spacing.lg }}>
          <AppText variant="bodySm">
            Só você vê esta lista. O que está em análise ou fora do ar não aparece para mais ninguém.
          </AppText>
          {load.posts.map((post) => (
            <MyPostCard
              key={post.postId}
              post={post}
              photoUrl={post.photoPath ? (photos.get(post.photoPath) ?? null) : null}
              onDelete={() => {
                setNotice(null);
                setDeleteError(null);
                setTarget(post);
              }}
            />
          ))}
          <AppText variant="caption" style={{ textAlign: 'center' }} testID="my-posts-end">
            Essas são todas as suas publicações.
          </AppText>
        </View>
      ) : null}

      <ConfirmSheet
        visible={target !== null}
        title="Apagar esta publicação?"
        message={`${target ? `${postContext(target)}. ` : ''}Ela sai do ar e some para todos, com os comentários e os Améns. Não dá para desfazer.`}
        confirmLabel="Apagar publicação"
        onConfirm={confirmDelete}
        onClose={() => setTarget(null)}
        busy={busy}
        error={deleteError}
        testID="my-posts-delete"
      />
    </ProfileScreen>
  );
}
