/**
 * Cliente da Comunidade (V2) com um cliente Supabase SIMULADO.
 *
 * Prova o comportamento do CLIENTE: o que ele envia a cada RPC, que nunca manda
 * user_id, que valida antes de gastar rede, que traduz os erros do servidor sem
 * repassar o texto cru e que fica desligado na V1. NÃO prova RLS: isso é dos
 * testes pgTAP em supabase/tests/07–10 (NÃO EXECUTADOS, sem banco nesta máquina).
 */
import {
  createCommunityApi,
  getCommunityApi,
  termsSha256,
  toFeedPage,
  toMyPost,
  type CommunityClient,
} from '@/community/api';
import { CommunityError } from '@/community/errors';
import { COMMUNITY_ENABLED } from '@/config/features';

// jest.mock é içado pelo babel-jest para antes dos imports.
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'),
  digestStringAsync: jest.fn(async () => 'AB'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

type RpcResult = { data?: unknown; error?: unknown };

function fakeClient(results: Record<string, RpcResult> = {}) {
  const rpc = jest.fn(async (fn: string, _args?: Record<string, unknown>) => {
    const configured = results[fn] ?? {};
    return { data: configured.data ?? null, error: configured.error ?? null };
  });
  const upload = jest.fn(async () => ({ data: { path: 'ok' }, error: null }));
  const createSignedUrls = jest.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://assinada/${path}`, error: null })),
    error: null,
  }));
  const remove = jest.fn(async () => ({ data: [], error: null }));
  const from = jest.fn(() => ({ upload, createSignedUrls, remove }));
  const client: CommunityClient = { rpc, storage: { from } };
  return { client, rpc, upload, createSignedUrls, remove, from };
}

const POST = '20000000-0000-4000-8000-000000000001';
const COMMENT = '30000000-0000-4000-8000-000000000001';

function api(results: Record<string, RpcResult> = {}) {
  const fake = fakeClient(results);
  return { ...fake, community: createCommunityApi(fake.client, { randomUUID: () => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' }) };
}

function feedRow(i: number) {
  return {
    post_id: `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    body: `Post ${i}`,
    photo_path: null,
    day_number: 3,
    published_at: `2026-10-01T12:${String(59 - i).padStart(2, '0')}:00Z`,
    author_name: 'Ana',
    is_mine: false,
    i_said_amen: i === 0,
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(CommunityError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('portão da V1', () => {
  test('a Comunidade está desligada nesta build e o ponto de entrada devolve null', () => {
    expect(COMMUNITY_ENABLED).toBe(false);
    expect(getCommunityApi()).toBeNull();
  });

  test('ligada mas sem nuvem configurada, também devolve null (nunca erro na tela)', () => {
    expect(getCommunityApi({ enabled: true, supabase: null })).toBeNull();
  });
});

describe('feed com fim', () => {
  test('primeira página sem cursor; 20 itens geram o cursor do último', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => feedRow(i));
    const { community, rpc } = api({ community_feed: { data: rows } });
    const page = await community.feedPage();
    expect(rpc).toHaveBeenCalledWith('community_feed', {});
    expect(page.posts).toHaveLength(20);
    expect(page.ended).toBe(false);
    expect(page.nextCursor).toEqual({ beforePublishedAt: rows[19].published_at, beforePost: rows[19].post_id });
    expect(page.posts[0]).toMatchObject({ postId: rows[0].post_id, authorName: 'Ana', iSaidAmen: true, dayNumber: 3 });
  });

  test('página seguinte manda o cursor; menos de 20 itens = acabou', async () => {
    const { community, rpc } = api({ community_feed: { data: [feedRow(0), feedRow(1)] } });
    const page = await community.feedPage({ beforePublishedAt: '2026-10-01T00:00:00Z', beforePost: POST });
    expect(rpc).toHaveBeenCalledWith('community_feed', {
      before_published_at: '2026-10-01T00:00:00Z',
      before_post: POST,
    });
    expect(page.ended).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  test('resposta vazia ou estranha vira página vazia e encerrada', () => {
    expect(toFeedPage(null)).toEqual({ posts: [], ended: true, nextCursor: null });
  });

  test('o post do feed não carrega nenhum identificador de pessoa nem contagem', async () => {
    const { community } = api({ community_feed: { data: [{ ...feedRow(0), author_id: 'vazou', amen_count: 7 }] } });
    const page = await community.feedPage();
    expect(Object.keys(page.posts[0]).sort()).toEqual(
      ['authorName', 'body', 'dayNumber', 'iSaidAmen', 'isMine', 'photoPath', 'postId', 'publishedAt'].sort(),
    );
  });
});

describe('publicar e comentar', () => {
  test('post de texto: corpo aparado, sem foto e sem dia', async () => {
    const { community, rpc } = api({ create_community_post: { data: [{ post_id: POST, status: 'published' }] } });
    await expect(community.createPost({ body: '  Deus é fiel  ' })).resolves.toEqual({ id: POST, status: 'published' });
    expect(rpc).toHaveBeenCalledWith('create_community_post', {
      post_body: 'Deus é fiel',
      post_photo_path: null,
      post_day: null,
    });
  });

  test('post vazio, longo demais, com dia fora de 1–100 ou com caminho de foto estranho nem sai do aparelho', async () => {
    const { community, rpc } = api();
    await expectCode(community.createPost({ body: '   ' }), 'invalid_input');
    await expectCode(community.createPost({ body: 'a'.repeat(2001) }), 'invalid_input');
    await expectCode(community.createPost({ body: 'oi', day: 101 }), 'invalid_input');
    await expectCode(community.createPost({ photoPath: '../outra-pessoa/foto.jpg' }), 'invalid_input');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('estado desconhecido vindo do servidor nunca vira "publicado"', async () => {
    const { community } = api({ create_community_post: { data: [{ post_id: POST, status: 'algo_novo' }] } });
    await expect(community.createPost({ body: 'oi' })).resolves.toEqual({ id: POST, status: 'in_review' });
  });

  test('comentário ("chegar na pessoa") vai pelo id do post', async () => {
    const { community, rpc } = api({ create_community_comment: { data: [{ comment_id: COMMENT, status: 'in_review' }] } });
    await expect(community.createComment(POST, ' Orando por você ')).resolves.toEqual({ id: COMMENT, status: 'in_review' });
    expect(rpc).toHaveBeenCalledWith('create_community_comment', { target_post: POST, comment_body: 'Orando por você' });
  });

  test('id que não é uuid (deep link adulterado) não vai para a rede', async () => {
    const { community, rpc } = api();
    await expectCode(community.createComment('1 or 1=1', 'oi'), 'invalid_input');
    await expectCode(community.setAmen('abc', true), 'invalid_input');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('Amém sem contagem', () => {
  test('liga e desliga só o MEU Amém; a resposta é o meu estado', async () => {
    const { community, rpc } = api({ set_amen: { data: true } });
    await expect(community.setAmen(POST, true)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('set_amen', { target_post: POST, amen: true });
  });
});

describe('denunciar e bloquear a partir do conteúdo', () => {
  test('denunciar a pessoa que escreveu um comentário', async () => {
    const { community, rpc } = api({ report_community_content: { data: '50000000-0000-4000-8000-000000000001' } });
    await expect(
      community.report({ commentId: COMMENT, person: true, reason: 'assedio', details: '  insiste  ' }),
    ).resolves.toBe('50000000-0000-4000-8000-000000000001');
    expect(rpc).toHaveBeenCalledWith('report_community_content', {
      target_post: null,
      target_comment: COMMENT,
      report_person: true,
      report_reason: 'assedio',
      report_details: 'insiste',
    });
  });

  test('motivo fora da lista e detalhe longo são recusados no aparelho', async () => {
    const { community, rpc } = api();
    await expectCode(community.report({ postId: POST, reason: 'qualquer' as never }), 'invalid_input');
    await expectCode(community.report({ postId: POST, reason: 'outro', details: 'x'.repeat(501) }), 'invalid_input');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('bloquear pelo post, sem conhecer o user_id do autor', async () => {
    const { community, rpc } = api();
    await community.blockAuthor({ postId: POST });
    expect(rpc).toHaveBeenCalledWith('block_community_author', { target_post: POST, target_comment: null });
  });

  test('nenhuma chamada do cliente manda user_id ou author_id', async () => {
    const { community, rpc } = api({
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
      create_community_comment: { data: [{ comment_id: COMMENT, status: 'published' }] },
      report_community_content: { data: '50000000-0000-4000-8000-000000000001' },
      redeem_invite_code: { data: true },
    });
    await community.feedPage();
    await community.createPost({ body: 'a' });
    await community.createComment(POST, 'b');
    await community.setAmen(POST, false);
    await community.report({ postId: POST, reason: 'spam' });
    await community.blockAuthor({ commentId: COMMENT });
    await community.redeemInviteCode({ code: 'ABCDE-23456', displayName: 'Ana', confirmsAdult: true });
    for (const [, args] of rpc.mock.calls) {
      const keys = Object.keys(args ?? {});
      expect(keys).not.toContain('user_id');
      expect(keys).not.toContain('author_id');
    }
  });
});

describe('entrada com código e consentimento', () => {
  test('código é normalizado antes de enviar', async () => {
    const { community, rpc } = api({ redeem_invite_code: { data: true } });
    await expect(
      community.redeemInviteCode({ code: ' abcde 23456 ', displayName: ' Ana ', confirmsAdult: true }),
    ).resolves.toBe('joined');
    expect(rpc).toHaveBeenCalledWith('redeem_invite_code', {
      invite_code: 'ABCDE23456',
      chosen_name: 'Ana',
      confirms_adult: true,
    });
  });

  test('o que nem tem forma de código não gasta uma das 5 tentativas', async () => {
    const { community, rpc } = api();
    await expect(community.redeemInviteCode({ code: '12', displayName: 'Ana', confirmsAdult: true })).resolves.toBe(
      'invalid_code',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test('sem declarar 18+ não envia', async () => {
    const { community, rpc } = api();
    await expectCode(
      community.redeemInviteCode({ code: 'ABCDE-23456', displayName: 'Ana', confirmsAdult: false }),
      'needs_adult_account',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test('código recusado pelo servidor', async () => {
    const { community } = api({ redeem_invite_code: { data: false } });
    await expect(community.redeemInviteCode({ code: 'ABCDE-23456', displayName: 'Ana', confirmsAdult: true })).resolves.toBe(
      'invalid_code',
    );
  });

  test('aceite manda versão e hash do texto exibido, em minúsculas', async () => {
    const { community, rpc } = api();
    await community.acceptTerms({ purpose: 'community_rules', version: 'regras-1', sha256: 'AB'.repeat(32), appVersion: '1.1.0' });
    expect(rpc).toHaveBeenCalledWith('accept_community_terms', {
      terms_purpose: 'community_rules',
      terms_version: 'regras-1',
      terms_sha256: 'ab'.repeat(32),
      client_app_version: '1.1.0',
    });
    await expectCode(
      community.acceptTerms({ purpose: 'community_rules', version: 'regras-1', sha256: 'não é hash', appVersion: '1' }),
      'invalid_input',
    );
  });

  test('termsSha256 devolve hex minúsculo', async () => {
    await expect(termsSha256('texto')).resolves.toBe('ab'.repeat(32));
  });

  test('estado da comunidade com servidor sem resposta vira "não é membro, precisa aceitar"', async () => {
    const { community } = api({ my_community_status: { data: [] } });
    await expect(community.getStatus()).resolves.toMatchObject({
      isMember: false,
      canPublish: false,
      needsPublishConsent: true,
      needsRules: true,
      publishConsentVersion: 'PENDENTE',
    });
  });
});

describe('Minhas publicações', () => {
  test('mostra estado, motivo e se foi pessoa ou filtro', () => {
    expect(
      toMyPost({
        post_id: POST,
        body: 'x',
        photo_path: null,
        day_number: null,
        status: 'removed',
        hold_reason: null,
        created_at: '2026-10-01T00:00:00Z',
        published_at: '2026-10-01T00:00:00Z',
        decided_by: 'pessoa',
        reason: 'crianca_exposta',
        note_for_author: 'Fotos de crianças não podem ser publicadas.',
      }),
    ).toMatchObject({ status: 'removed', decidedBy: 'pessoa', reason: 'crianca_exposta' });
  });
});

describe('erros do servidor viram mensagens seguras', () => {
  test.each([
    ['CM001', 'needs_invite'],
    ['CM002', 'needs_consent'],
    ['CM003', 'rate_limited'],
    ['CM004', 'blocked_from_community'],
    ['CM005', 'terms_outdated'],
    ['CM006', 'needs_adult_account'],
    ['22023', 'invalid_input'],
    ['42501', 'not_authorized'],
    ['P0002', 'not_found'],
  ])('%s -> %s, sem repassar o texto do banco', async (sqlstate, code) => {
    const { community } = api({
      create_community_post: { error: { code: sqlstate, message: 'relation public.community_posts violou X' } },
    });
    const promise = community.createPost({ body: 'oi' });
    await expectCode(promise, code);
    await expect(promise).rejects.not.toThrow(/community_posts/);
  });

  test('falha de rede vira "sem conexão"', async () => {
    const fake = fakeClient();
    fake.rpc.mockRejectedValueOnce(new TypeError('Network request failed'));
    const community = createCommunityApi(fake.client, { randomUUID: () => 'x' });
    await expectCode(community.feedPage(), 'offline');
  });
});
