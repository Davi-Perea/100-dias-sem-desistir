/**
 * "Tem que dar pra curtir tudo" (fundador, 2026-09-23): Amém em post E em
 * comentário, marcando na hora, sem travar, e desfazendo se o servidor recusar.
 *
 * Prova: o desenho do Amém é o do Phosphor (mão levantada `hand`, bold/fill); o
 * cliente pede e junta o Amém dos comentários (e sobrevive a um servidor ainda
 * sem a migration); a demonstração segue as regras do servidor; a tela marca na
 * hora, aguenta toques seguidos e desfaz no erro.
 *
 * O ACEITE NÃO É MAIS UMA TELA (decisão do fundador, 2026-09-22): o primeiro Amém
 * num comentário registra 16+, as regras e o consentimento destacado no PRÓPRIO
 * toque, com a linha do aceite à vista embaixo do campo. A folha não fecha e
 * ninguém navega.
 * NÃO prova o banco: isso é do pgTAP 16_comunidade_amem_comentario.test.sql.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus, PostComment } from '@/community/types';
import { commentAmenSpoken, withCommentAmen } from '@/ui/comunidade/feed/comentarios';
import { Icon } from '@/ui/icons';
import { CommentsSheet } from '@/ui/comunidade/sheets/CommentsSheet';
import { ACEITE_LINE_SPOKEN, CAMPOS, PENDING_NOTICE, type CampoId } from '@/ui/comunidade/publicar/textos';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));

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
  test('mãos em oração do Phosphor (hands-praying): bold desmarcado, fill marcado, viewBox 256', async () => {
    await render(<Icon name="amen" size={27} color="#000" />);
    // Início exato dos paths oficiais (@phosphor-icons/core 2.1.1, hands-praying-bold/fill).
    const off = JSON.stringify(screen.toJSON());
    expect(off).toContain('M238.15,177.18l-35.53-35.53L166.45,22.3');
    expect(off).toContain('"vbWidth":256');
    await render(<Icon name="amen-filled" size={27} color="#000" />);
    expect(JSON.stringify(screen.toJSON())).toContain('M235.32,180l-36.24-36.25L162.62,23.46');
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
    // `accept_terms: null` = este toque não traz aceite (quem já aceitou).
    expect(rpc).toHaveBeenCalledWith('set_comment_amen', { target_comment: C1, amen: true, accept_terms: null });
    await expect(api.setCommentAmen('nao-e-uuid', true)).rejects.toBeInstanceOf(CommunityError);
  });
});

/* -------------------------------------------------------------------- tela */

function fakeApi(items: PostComment[], setCommentAmen: (id: string, amen: boolean) => Promise<boolean>) {
  const api = {
    postComments: jest.fn(async () => items),
    setCommentAmen: jest.fn(setCommentAmen),
    createComment: jest.fn(),
    // O aceite no toque passa por aqui (as mesmas RPCs de sempre).
    updateProfile: jest.fn(async () => {}),
    acceptTerms: jest.fn(async () => {}),
  };
  return api;
}

async function renderSheet(api: ReturnType<typeof fakeApi>, current: CommunityStatus) {
  const onClose = jest.fn();
  const onAccepted = jest.fn();
  const view = await render(
    <CommentsSheet
      api={api as unknown as CommunityApi}
      status={current}
      target={{ postId: POST, authorName: 'Ana' }}
      onClose={onClose}
      onAccepted={onAccepted}
    />,
  );
  await waitFor(() => expect(screen.getByTestId(`comment-amen-${C1}`)).toBeTruthy(), { timeout: 5000 });
  return { ...view, onClose, onAccepted };
}

/** O texto das regras/consentimento aprovado pela igreja nesta versão. */
const ORIGINAL_CAMPOS = { ...CAMPOS };
function igrejaAprovou(version: string) {
  for (const key of Object.keys(CAMPOS) as CampoId[]) CAMPOS[key] = `valor-${key}`;
  CAMPOS.versaoRegras = version;
  CAMPOS.versaoConsentimento = version;
}

describe('Amém na conversa', () => {
  beforeEach(() => {
    Object.assign(CAMPOS, ORIGINAL_CAMPOS);
    mockRouter.push.mockClear();
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
    await renderSheet(api, status({ needsPublishConsent: true }));
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    await waitFor(() => expect(api.setCommentAmen).toHaveBeenCalledWith(C1, false));
    expect(api.acceptTerms).not.toHaveBeenCalled();
    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`comment-amen-count-${C1}`)).toBeNull();
  });

  test('primeiro Amém: a linha do aceite está à vista e o próprio toque registra; a folha não fecha', async () => {
    igrejaAprovou('1.0');
    const api = fakeApi([comment(C1)], async (_id, amen) => amen);
    const gated = await renderSheet(api, status({ needsRules: true, needsPublishConsent: true }));
    // A linha fica à vista ANTES do toque: ninguém aceita sem ler (e o link abre as regras).
    const linha = screen.getByTestId('comment-aceite-line');
    expect(linha.props.accessibilityLabel).toBe(ACEITE_LINE_SPOKEN);
    expect(linha.props.accessibilityRole).toBe('link');

    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));

    // As duas finalidades registradas ANTES de o Amém existir (Google Play; Apple 1.2).
    await waitFor(() => expect(api.acceptTerms).toHaveBeenCalledTimes(2));
    expect(api.acceptTerms).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'community_rules', version: '1.0', sha256: expect.any(String) }),
    );
    expect(api.acceptTerms).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'community_publish', version: '1.0', sha256: expect.any(String) }),
    );
    // Nome e 16+ já existiam: nada de perfil foi reescrito.
    expect(api.updateProfile).not.toHaveBeenCalled();
    await waitFor(() => expect(api.setCommentAmen).toHaveBeenCalledWith(C1, true));

    // Ninguém navegou e a conversa continua aberta, com o Amém marcado.
    expect(gated.onClose).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('comments-sheet')).toBeTruthy();
    expect(gated.onAccepted).toHaveBeenCalled();
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId(`comment-amen-count-${C1}`).props.children).toBe('3');
  });

  test('Launch Gate: com o texto da igreja ainda em rascunho, o Amém diz isso e nada é registrado', async () => {
    // CAMPOS como vem de fábrica: versão null = texto não aprovado.
    const api = fakeApi([comment(C1)], async (_id, amen) => amen);
    const gated = await renderSheet(api, status({ needsRules: true, needsPublishConsent: true }));
    await fireEvent.press(screen.getByTestId(`comment-amen-${C1}`));
    await waitFor(() => expect(screen.getByTestId('comment-notice').props.children).toBe(PENDING_NOTICE));
    expect(api.acceptTerms).not.toHaveBeenCalled();
    expect(api.setCommentAmen).not.toHaveBeenCalled();
    expect(gated.onClose).not.toHaveBeenCalled();
    // O Amém não fica marcado por engano.
    expect(screen.getByTestId(`comment-amen-${C1}`).props.accessibilityState).toMatchObject({ checked: false });
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
    // A prévia do app começa VAZIA (2026-09-22): o conteúdo de exemplo só existe
    // para um teste que pede por ele, e é dele que este caso precisa.
    demo._resetDemoForTests(undefined, { withExamples: true });
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
