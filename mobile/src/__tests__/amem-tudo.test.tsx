/**
 * "Tem que dar pra curtir tudo" (fundador, 2026-09-23): Amém em post E em
 * comentário, marcando na hora, sem travar, e desfazendo se o servidor recusar.
 *
 * Prova: o desenho do Amém é o do Phosphor (mão levantada `hand`, bold/fill); o
 * cliente pede e junta o Amém dos comentários (e sobrevive a um servidor ainda
 * sem a migration); a demonstração segue as regras do servidor; a tela marca na
 * hora, aguenta toques seguidos, desfaz no erro, e antes do primeiro Amém leva à
 * tela de aceite e marca sozinha ao voltar.
 * NÃO prova o banco: isso é do pgTAP 16_comunidade_amem_comentario.test.sql.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus, PostComment } from '@/community/types';
import {
  commentAmenSpoken,
  rememberPendingCommentAmen,
  takePendingCommentAmen,
  withCommentAmen,
} from '@/ui/comunidade/feed/comentarios';
import { Icon } from '@/ui/icons';
import { CommentsSheet } from '@/ui/comunidade/sheets/CommentsSheet';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  digestStringAsync: jest.fn(async () => 'ab'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

const POST = '20000000-0000-4000-8000-000000000001';
const C1 = '30000000-0000-4000-8000-000000000001';
const C2 = '30000000-0000-4000-8000-000000000002';

function comment(id: string, extra: Partial<PostComment> = {}): PostComment {
  return {
    commentId: id,
    body: `Comentário ${id.slice(-1)}`,
    status: 'published',
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    authorName: 'Carla',
    isMine: false,
    amenCount: 2,
    iSaidAmen: false,
    ...extra,
  };
}

function status(extra: Partial<CommunityStatus> = {}): CommunityStatus {
  return {
    isMember: true,
    memberStatus: 'active',
    displayName: 'Davi',
    profile: {
      displayName: 'Davi',
      ministry: null,
      ministryAnswered: true,
      bio: null,
      avatarPath: null,
      avatarStatus: 'none',
      ageConfirmed: true,
      contactEmail: null,
      newsOptIn: false,
    },
    profileComplete: true,
    needsRules: false,
    needsPublishConsent: false,
    canPublish: true,
    publishConsentVersion: '1.0',
    rulesVersion: '1.0',
    isModerator: false,
    ...extra,
  } as CommunityStatus;
}

/* ------------------------------------------------------------------ ícone */

describe('o desenho do Amém', () => {
  test('mão levantada do Phosphor (hand): bold desmarcado, fill marcado, viewBox 256', async () => {
    await render(<Icon name="amen" size={27} color="#000" />);
    // Início exato dos paths oficiais (@phosphor-icons/core 2.1.1, hand-bold/fill).
    const off = JSON.stringify(screen.toJSON());
    expect(off).toContain('M188,44a32,32,0,0,0-8,1V44a32,32,0,0,0-60.79-14A32,32,0,0,0,76,60v50.83');
    expect(off).toContain('"vbWidth":256');
    await render(<Icon name="amen-filled" size={27} color="#000" />);
    expect(JSON.stringify(screen.toJSON())).toContain('M216,64v90.93c0,46.2-36.85,84.55-83,85.06A83.71,83.71,0,0,1,72.6,215.4');
  });
});

/* ------------------------------------------------------------ regras puras */

describe('regras puras', () => {
  test('meu Amém soma e tira 1, nunca abaixo de zero', () => {
    const c = comment(C1, { amenCount: 0 });
    expect(withCommentAmen(c, true)).toMatchObject({ iSaidAmen: true, amenCount: 1 });
    expect(withCommentAmen(withCommentAmen(c, true), false)).toMatchObject({ iSaidAmen: false, amenCount: 0 });
    expect(withCommentAmen(c, false)).toBe(c);
  });

  test('o número dito em palavra', () => {
    expect(commentAmenSpoken(1, true)).toBe('Você disse Amém');
    expect(commentAmenSpoken(2, true)).toBe('Você e mais 1 pessoa disseram Amém');
    expect(commentAmenSpoken(1, false)).toBe('1 pessoa disse Amém');
    expect(commentAmenSpoken(4, false)).toBe('4 pessoas disseram Amém');
  });

  test('Amém pendente: só do post certo, e vence em 10 minutos', () => {
    rememberPendingCommentAmen(POST, C1, 1_000);
    expect(takePendingCommentAmen('outro', 2_000)).toBeNull();
    expect(takePendingCommentAmen(POST, 2_000)).toEqual({ postId: POST, commentId: C1 });
    expect(takePendingCommentAmen(POST, 2_000)).toBeNull();
    rememberPendingCommentAmen(POST, C1, 0);
    expect(takePendingCommentAmen(POST, 11 * 60 * 1000)).toBeNull();
  });
});

/* ------------------------------------------------------------------ cliente */

describe('cliente', () => {
  function client(results: Record<string, { data?: unknown; error?: unknown }>) {
    const rpc = jest.fn(async (fn: string) => ({ data: results[fn]?.data ?? null, error: results[fn]?.error ?? null }));
    return { rpc, client: { rpc } as unknown as CommunityClient };
  }
  const row = { comment_id: C1, body: 'oi', status: 'published', created_at: '2026-09-23T10:00:00Z', author_name: 'Ana', is_mine: false };

  test('junta o número e o meu Amém de cada comentário', async () => {
    const { rpc, client: c } = client({
      community_post_comments: { data: [row] },
      community_comment_amens: { data: [{ comment_id: C1, amen_count: 3, i_said_amen: true }] },
    });
    const api = createCommunityApi(c, { randomUUID: () => 'x' });
    await expect(api.postComments(POST)).resolves.toEqual([
      expect.objectContaining({ commentId: C1, amenCount: 3, iSaidAmen: true }),
    ]);
    expect(rpc).toHaveBeenCalledWith('community_comment_amens', { target_post: POST });
  });

  test('servidor sem a função nova: os comentários abrem do mesmo jeito, Amém em zero', async () => {
    const { client: c } = client({
      community_post_comments: { data: [row] },
      community_comment_amens: { error: { code: 'PGRST202', message: 'not found' } },
    });
    const api = createCommunityApi(c, { randomUUID: () => 'x' });
    await expect(api.postComments(POST)).resolves.toEqual([
      expect.objectContaining({ commentId: C1, amenCount: 0, iSaidAmen: false }),
    ]);
  });

  test('setCommentAmen manda só o id do comentário e o estado; id inválido nem sai', async () => {
    const { rpc, client: c } = client({ set_comment_amen: { data: true } });
    const api = createCommunityApi(c, { randomUUID: () => 'x' });
    await expect(api.setCommentAmen(C1, true)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('set_comment_amen', { target_comment: C1, amen: true });
    await expect(api.setCommentAmen('nao-e-uuid', true)).rejects.toBeInstanceOf(CommunityError);
  });
});

/* -------------------------------------------------------------------- tela */

function fakeApi(items: PostComment[], setCommentAmen: (id: string, amen: boolean) => Promise<boolean>) {
  const api = {
    postComments: jest.fn(async () => items),
    setCommentAmen: jest.fn(setCommentAmen),
    createComment: jest.fn(),
  };
  return api;
}

async function renderSheet(api: ReturnType<typeof fakeApi>, current: CommunityStatus, onNeedsConsent = jest.fn()) {
  const onClose = jest.fn();
  const view = await render(
    <CommentsSheet
      api={api as unknown as CommunityApi}
      status={current}
      target={{ postId: POST, authorName: 'Ana' }}
      onClose={onClose}
      onNeedsConsent={onNeedsConsent}
    />,
  );
  await waitFor(() => expect(screen.getByTestId(`comment-amen-${C1}`)).toBeTruthy(), { timeout: 5000 });
  return { ...view, onClose, onNeedsConsent };
}

describe('Amém na conversa', () => {
  afterEach(() => {
    takePendingCommentAmen();
  });

  test('mãozinha com número em cada comentário publicado; toque marca na hora', async () => {
    let resolve!: (v: boolean) => void;
    const api = fakeApi([comment(C1), comment(C2, { status: 'in_review', isMine: true, amenCount: 0 })], () => new Promise((r) => (resolve = r)));
    await renderSheet(api, status());
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('2');
    // Comentário em análise (o meu) não tem Amém.
    expect(screen.queryByTestId(`comment-amen-${C2}`)).toBeNull();
    const button = screen.getByLabelText('Amém, comentário de Carla');
    expect(button.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(button);
    // Antes da resposta: já marcado e o número já subiu.
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('3');
    expect(screen.getByLabelText('Você e mais 2 pessoas disseram Amém')).toBeTruthy();
    await act(async () => resolve(true));
    expect(api.setCommentAmen).toHaveBeenCalledWith(C1, true);
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: true });
  });

  test('toques seguidos não travam: vale o último', async () => {
    const pending: ((v: boolean) => void)[] = [];
    const api = fakeApi([comment(C1)], (_id, amen) => new Promise((r) => pending.push(() => r(amen))));
    await renderSheet(api, status());
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    // Segundo toque já desmarcou na tela, sem esperar o primeiro.
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('2');
    await act(async () => pending.shift()?.(true));
    // A resposta velha não pinta por cima: manda o desejo novo.
    await waitFor(() => expect(api.setCommentAmen).toHaveBeenLastCalledWith(C1, false));
    await act(async () => pending.shift()?.(false));
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('2');
  });

  test('servidor recusa: volta ao que era e diz por quê', async () => {
    const api = fakeApi([comment(C1)], async () => {
      throw new CommunityError('not_found', 'Este comentário não está mais disponível.');
    });
    await renderSheet(api, status());
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    await waitFor(() => expect(screen.getByTestId('comment-error')).toBeTruthy());
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('2');
  });

  test('desmarcar não pede aceite', async () => {
    const api = fakeApi([comment(C1, { iSaidAmen: true, amenCount: 1 })], async (_id, amen) => amen);
    const view = await renderSheet(api, status({ needsPublishConsent: true }));
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    await waitFor(() => expect(api.setCommentAmen).toHaveBeenCalledWith(C1, false));
    expect(view.onNeedsConsent).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`comment-amen-count-${C1}`)).toBeNull();
  });  test('primeiro Amém: a folha fecha para a tela de aceite; ao voltar, marca sozinho', async () => {
    const api = fakeApi([comment(C1)], async (_id, amen) => amen);
    const gated = await renderSheet(api, status({ needsPublishConsent: true }));
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    expect(api.setCommentAmen).not.toHaveBeenCalled();
    expect(gated.onClose).toHaveBeenCalled();
    expect(gated.onNeedsConsent).toHaveBeenCalledWith(POST, '');
    gated.unmount();
    // Aceitou; a conversa abre de novo, já liberada: o Amém é gravado.
    await renderSheet(api, status());
    await waitFor(() => expect(api.setCommentAmen).toHaveBeenCalledWith(C1, true));
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('3');
  });


});

/* ---------------------------------------------------------- demonstração */

describe('demonstração', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const saved = { dev: g.__DEV__, env: { ...process.env } };
  afterEach(() => {
    g.__DEV__ = saved.dev;
    process.env = { ...saved.env };
  });

  test('Amém no comentário: marcar pede aceite; soma 1; desmarcar é livre', async () => {
    g.__DEV__ = true;
    Object.assign(process.env, { EXPO_PUBLIC_DEMO_MODE: 'true', EXPO_PUBLIC_COMMUNITY_ENABLED: 'true', EXPO_PUBLIC_DEMO_DAY: '3' });
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    let demo!: typeof import('@/community/demoApi');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- módulo novo com o ambiente da demonstração
      demo = require('@/community/demoApi') as typeof import('@/community/demoApi');
    });
    demo._resetDemoForTests();
    demo.demoSignIn();
    const api = demo.getDemoCommunityApi();
    if (!api) throw new Error('demonstração desligada');
    await api.joinCommunity({ displayName: 'Davi' });
    const feed = await api.feedPage();
    let target: { postId: string; comment: PostComment } | null = null;
    for (const p of feed.posts) {
      const list = await api.postComments(p.postId);
      const other = list.find((c) => !c.isMine && c.status === 'published');
      if (other) {
        target = { postId: p.postId, comment: other };
        break;
      }
    }
    if (!target) throw new Error('sem comentário de exemplo');
    const before = target.comment.amenCount;
    expect(before).toBeGreaterThan(0);

    const s = await api.getStatus();
    if (s.needsRules || s.needsPublishConsent) {
      // Outro módulo (isolateModules): compara pelo nome e pelo código, não pela classe.
      await expect(api.setCommentAmen(target.comment.commentId, true)).rejects.toMatchObject({ name: 'CommunityError', code: 'needs_consent' });
      await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: 'ab'.repeat(32), appVersion: 't' });
      await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: 'ab'.repeat(32), appVersion: 't' });
    }
    await expect(api.setCommentAmen(target.comment.commentId, true)).resolves.toBe(true);
    const after = (await api.postComments(target.postId)).find((c) => c.commentId === target.comment.commentId);
    expect(after).toMatchObject({ iSaidAmen: true, amenCount: before + 1 });
    await expect(api.setCommentAmen(target.comment.commentId, false)).resolves.toBe(false);
    const back = (await api.postComments(target.postId)).find((c) => c.commentId === target.comment.commentId);
    expect(back).toMatchObject({ iSaidAmen: false, amenCount: before });
  });
});
