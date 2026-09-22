import { useCallback, useRef, useState } from 'react';

import type { CommunityApi } from '@/community/api';
import type { FeedCursor, FeedPost, MyPost } from '@/community/types';

import { humanError } from './useCommunity';

/**
 * Estado do feed (C1). O feed TEM FIM: a próxima página só vem quando a pessoa
 * toca em "Ver publicações anteriores" (nunca ao chegar no fim da rolagem), e
 * quando o servidor devolve menos de uma página o fim é dito com todas as letras.
 *
 * O que só o autor vê: as publicações dele que estão "Em análise" (toda foto, e
 * o texto que o filtro segurou) vêm de `my_community_posts` e aparecem no topo,
 * marcadas, só para ele. O feed do servidor nunca as devolve para ninguém.
 */
export type CardModel = {
  postId: string;
  authorName: string;
  /** "Nome · Ministério X" (C4); null = "Nenhum" ou não respondeu: só o nome. */
  authorMinistry: string | null;
  /** Foto de perfil (aprovada; a própria sempre). null = iniciais. */
  avatarPath: string | null;
  body: string | null;
  photoPath: string | null;
  dayNumber: number | null;
  /** Publicação (no feed) ou criação (em análise). */
  at: string;
  isMine: boolean;
  iSaidAmen: boolean;
  /** true = "Em análise", só o autor vê; sem Amém e sem comentários. */
  inReview: boolean;
};

export function fromFeed(post: FeedPost): CardModel {
  return {
    postId: post.postId,
    authorName: post.authorName,
    authorMinistry: post.authorMinistry,
    avatarPath: post.authorAvatarPath,
    body: post.body,
    photoPath: post.photoPath,
    dayNumber: post.dayNumber,
    at: post.publishedAt,
    isMine: post.isMine,
    iSaidAmen: post.iSaidAmen,
    inReview: false,
  };
}

export function fromMine(post: MyPost, myName: string, myMinistry: string | null = null, myAvatar: string | null = null): CardModel {
  return {
    postId: post.postId,
    authorName: myName,
    authorMinistry: myMinistry,
    avatarPath: myAvatar,
    body: post.body,
    photoPath: post.photoPath,
    dayNumber: post.dayNumber,
    at: post.createdAt,
    isMine: true,
    iSaidAmen: false,
    inReview: true,
  };
}

type FeedState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'ready';
      inReview: CardModel[];
      posts: CardModel[];
      cursor: FeedCursor | null;
      ended: boolean;
    };

export function useFeed(
  api: CommunityApi | null,
  myName: string,
  myMinistry: string | null = null,
  myAvatar: string | null = null,
) {
  const [state, setState] = useState<FeedState>({ phase: 'loading' });
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  // Um Amém por vez por cartão: o segundo toque antes da resposta seria corrida.
  const amenInFlight = useRef(new Set<string>());

  const sign = useCallback(
    async (cards: CardModel[]) => {
      if (!api) return;
      try {
        // Fotos dos posts e as fotos de perfil, numa chamada só.
        const urls = await api.signPhotoUrls(cards.flatMap((c) => [c.photoPath, c.avatarPath]));
        if (urls.size === 0) return;
        setPhotos((prev) => new Map([...prev, ...urls]));
      } catch {
        // Sem URL a foto mostra o quadro "Foto indisponível"; o texto continua.
      }
    },
    [api],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!api) return;
      const id = ++generation.current;
      if (mode === 'refresh') setRefreshing(true);
      else setState({ phase: 'loading' });
      setMoreError(null);
      try {
        const [page, mine] = await Promise.all([
          api.feedPage(),
          // "Minhas publicações" é só para o selo "Em análise": se falhar, o feed segue.
          api.myPosts().catch(() => [] as MyPost[]),
        ]);
        if (generation.current !== id) return;
        const inReview = mine
          .filter((p) => p.status === 'in_review')
          .map((p) => fromMine(p, myName, myMinistry, myAvatar));
        const posts = page.posts.map(fromFeed);
        setState({ phase: 'ready', inReview, posts, cursor: page.nextCursor, ended: page.ended });
        sign([...inReview, ...posts]);
      } catch (error) {
        if (generation.current !== id) return;
        setState({ phase: 'error', message: humanError(error) });
      } finally {
        if (generation.current === id) setRefreshing(false);
      }
    },
    [api, myName, myMinistry, myAvatar, sign],
  );

  const refresh = useCallback(() => load('refresh'), [load]);

  /**
   * Chamado pela tela a cada foco: na primeira vez carrega, nas outras (volta de
   * Publicar, dos comentários, do consentimento) atualiza sem apagar a lista.
   */
  const loadedOnce = useRef(false);
  const onFocus = useCallback(() => {
    load(loadedOnce.current ? 'refresh' : 'initial');
    loadedOnce.current = true;
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!api || state.phase !== 'ready' || state.ended || !state.cursor || loadingMore) return;
    const id = generation.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await api.feedPage(state.cursor);
      if (generation.current !== id) return;
      const next = page.posts.map(fromFeed);
      setState((prev) => {
        if (prev.phase !== 'ready') return prev;
        const known = new Set(prev.posts.map((p) => p.postId));
        return {
          ...prev,
          posts: [...prev.posts, ...next.filter((p) => !known.has(p.postId))],
          cursor: page.nextCursor,
          ended: page.ended,
        };
      });
      sign(next);
    } catch (error) {
      if (generation.current === id) setMoreError(humanError(error));
    } finally {
      setLoadingMore(false);
    }
  }, [api, state, loadingMore, sign]);

  const patch = useCallback((postId: string, change: (card: CardModel) => CardModel | null) => {
    setState((prev) => {
      if (prev.phase !== 'ready') return prev;
      const apply = (list: CardModel[]) =>
        list.flatMap((card) => {
          if (card.postId !== postId) return [card];
          const next = change(card);
          return next ? [next] : [];
        });
      return { ...prev, posts: apply(prev.posts), inReview: apply(prev.inReview) };
    });
  }, []);

  /** Marca ou desmarca o MEU Amém. Não existe total em lugar nenhum. */
  const toggleAmen = useCallback(
    async (postId: string, next: boolean) => {
      if (!api || amenInFlight.current.has(postId)) return;
      amenInFlight.current.add(postId);
      setNotice(null);
      patch(postId, (card) => ({ ...card, iSaidAmen: next }));
      try {
        const confirmed = await api.setAmen(postId, next);
        patch(postId, (card) => ({ ...card, iSaidAmen: confirmed }));
      } catch (error) {
        patch(postId, (card) => ({ ...card, iSaidAmen: !next }));
        setNotice(humanError(error));
      } finally {
        amenInFlight.current.delete(postId);
      }
    },
    [api, patch],
  );

  /** Tira um cartão da tela (apagado, denúncia urgente). */
  const removeCard = useCallback((postId: string) => patch(postId, () => null), [patch]);

  /**
   * Depois de bloquear: o cartão sai na hora e o feed volta do começo. O app não
   * sabe quem escreveu o quê (nunca recebe o id de outra pessoa), então é o
   * servidor que tira o resto do que a pessoa bloqueada publicou.
   */
  const afterBlock = useCallback(
    (postId: string | null) => {
      if (postId) removeCard(postId);
      load('refresh');
    },
    [load, removeCard],
  );

  return {
    state,
    photos,
    loadingMore,
    moreError,
    notice,
    refreshing,
    reload: load,
    refresh,
    onFocus,
    loadMore,
    toggleAmen,
    removeCard,
    afterBlock,
  };
}
