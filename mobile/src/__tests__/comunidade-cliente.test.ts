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
  requestServerAccountDeletion,
  termsSha256,
  toFeedPage,
  toMyPost,
  type CommunityClient,
} from '@/community/api';
import { CommunityError } from '@/community/errors';
import { normalizeNewPost } from '@/community/validation';
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

  test('o post do feed não carrega nenhum identificador de pessoa (F3: número e rostinhos, sem id)', async () => {
    const { community } = api({
      community_feed: {
        data: [
          {
            ...feedRow(0),
            author_id: 'vazou',
            amen_count: 7,
            amen_faces: [{ name: 'Bruno', avatar_path: null, is_mine: false, user_id: 'vazou' }],
          },
        ],
      },
    });
    const page = await community.feedPage();
    expect(Object.keys(page.posts[0]).sort()).toEqual(
      [
        'amenCount',
        'amenFaces',
        'audience',
        'audienceMinistry',
        'authorAvatarPath',
        'authorMinistry',
        'authorName',
        'body',
        'commentCount',
        'dayNumber',
        'iSaidAmen',
        'isMine',
        'kind',
        'photoPath',
        'photoPaths',
        'postId',
        'publishedAt',
        'verse',
      ].sort(),
    );
    expect(page.posts[0].amenCount).toBe(7);
    expect(page.posts[0].amenFaces).toEqual([{ name: 'Bruno', avatarPath: null, isMine: false }]);
    expect(JSON.stringify(page.posts[0])).not.toContain('vazou');
  });
});

describe('publicar e comentar', () => {
  test('post de texto: corpo aparado, sem foto e sem dia', async () => {
    const { community, rpc } = api({ create_community_post: { data: [{ post_id: POST, status: 'published' }] } });
    await expect(community.createPost({ body: '  Deus é fiel  ' })).resolves.toEqual({ id: POST, status: 'published' });
    expect(rpc).toHaveBeenCalledWith('create_community_post', {
      post_body: 'Deus é fiel',
      post_photo_paths: null,
      post_day: null,
      post_activity: 'livre',
      post_verse_book: null,
      post_verse_chapter: null,
      post_verse_start: null,
      post_verse_end: null,
      post_audience: 'igreja',
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

describe('Amém (desde 2026-09-22 o número e os rostinhos vêm no feed; set_amen devolve só o meu estado)', () => {
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
      join_community: { data: true },
    });
    await community.feedPage();
    await community.createPost({ body: 'a' });
    await community.createComment(POST, 'b');
    await community.setAmen(POST, false);
    await community.report({ postId: POST, reason: 'spam' });
    await community.blockAuthor({ commentId: COMMENT });
    await community.joinCommunity({ displayName: 'Ana' });
    for (const [, args] of rpc.mock.calls) {
      const keys = Object.keys(args ?? {});
      expect(keys).not.toContain('user_id');
      expect(keys).not.toContain('author_id');
    }
  });
});

describe('entrada sem código (C3) e consentimento', () => {
  test('nome é aparado antes de enviar', async () => {
    const { community, rpc } = api({ join_community: { data: true } });
    await expect(community.joinCommunity({ displayName: ' Ana ' })).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('join_community', { chosen_name: 'Ana' });
  });

  test('C1/C3/C4: entra sem código, sem idade e sem nome (o nome vem depois, no perfil)', async () => {
    const { community, rpc } = api({ join_community: { data: true } });
    await community.joinCommunity();
    expect(rpc).toHaveBeenCalledWith('join_community', { chosen_name: null });
    expect(rpc.mock.calls.flatMap(([, args]) => Object.keys(args ?? {}))).not.toContain('invite_code');
    await expectCode(community.joinCommunity({ displayName: 'x'.repeat(41) }), 'invalid_input');
  });

  test('suspenso ou removido: o servidor recusa com CM004', async () => {
    const { community } = api({ join_community: { error: { code: 'CM004', message: 'bloqueada' } } });
    await expectCode(community.joinCommunity(), 'blocked_from_community');
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
    ['CM001', 'needs_join'],
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

describe('exclusão de conta (Edge Function delete-account)', () => {
  function edgeError(status: number, body: unknown, name = 'FunctionsHttpError') {
    return { name, message: 'Edge Function returned a non-2xx status code', context: { status, json: async () => body } };
  }
  function functions(result: { data?: unknown; error?: unknown } | Error) {
    return {
      invoke: jest.fn(async (_name: string, _options: { body: Record<string, unknown> }) => {
        if (result instanceof Error) throw result;
        return { data: result.data ?? null, error: result.error ?? null };
      }),
    };
  }

  test('chama delete-account com confirm: true e nenhum id de pessoa', async () => {
    const fake = functions({ data: { deleted: true } });
    await expect(requestServerAccountDeletion(fake)).resolves.toBe('deleted');
    expect(fake.invoke).toHaveBeenCalledWith('delete-account', { body: { confirm: true } });
    expect(JSON.stringify(fake.invoke.mock.calls)).not.toMatch(/user_id|author_id|email/);
  });

  test('login antigo vira "needs_recent_login" (pedir código novo), sem erro', async () => {
    const fake = functions({ error: edgeError(401, { error: 'reauth_required', max_age_seconds: 600 }) });
    await expect(requestServerAccountDeletion(fake)).resolves.toBe('needs_recent_login');
  });

  test('sessão inválida, falha do servidor, resposta estranha e rede viram erros seguros', async () => {
    await expectCode(requestServerAccountDeletion(functions({ error: edgeError(401, { error: 'unauthorized' }) })), 'session_expired');
    await expectCode(
      requestServerAccountDeletion(functions({ error: edgeError(500, { error: 'deletion_failed' }) })),
      'unknown',
    );
    await expectCode(requestServerAccountDeletion(functions({ data: { ok: 1 } })), 'unknown');
    await expectCode(
      requestServerAccountDeletion(functions({ error: { name: 'FunctionsFetchError', message: 'x' } })),
      'offline',
    );
  });
});

describe('perfil (feedback de 2026-09-22: C1, C4, N3)', () => {
  const CLEAN = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]);
  const EXIF = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02,
  ]);
  const PATH = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg';

  test('status traz o perfil; foto com estado desconhecido nunca vira "aprovada"', async () => {
    const { community } = api({
      my_community_status: {
        data: [
          {
            is_member: true,
            member_status: 'active',
            display_name: 'Davi',
            ministry: 'Comunicação',
            ministry_answered: true,
            bio: null,
            avatar_path: PATH,
            avatar_status: 'algo-novo',
            age_confirmed: true,
            contact_email: null,
            news_opt_in: false,
            profile_complete: true,
          },
        ],
      },
    });
    const status = await community.getStatus();
    expect(status.profile).toMatchObject({ displayName: 'Davi', ministry: 'Comunicação', avatarStatus: 'in_review' });
    expect(status.profileComplete).toBe(true);
  });

  test('passos do perfil: nulo = não mexe; "Nenhum" é no_ministry; bio, nome e ministério com limite', async () => {
    const { community, rpc } = api();
    await community.updateProfile({ name: '  Davi ', confirms16: true });
    expect(rpc).toHaveBeenLastCalledWith('set_community_profile', {
      new_name: 'Davi',
      new_ministry: null,
      no_ministry: false,
      new_bio: null,
      clear_bio: false,
      confirms_16: true,
    });
    await community.updateProfile({ noMinistry: true });
    expect(rpc).toHaveBeenLastCalledWith(
      'set_community_profile',
      expect.objectContaining({ no_ministry: true, new_ministry: null }),
    );
    await expectCode(community.updateProfile({ ministry: 'Louvor', noMinistry: true }), 'invalid_input');
    await expectCode(community.updateProfile({ bio: 'b'.repeat(161) }), 'invalid_input');
    await expectCode(community.updateProfile({ name: 'x'.repeat(41) }), 'invalid_input');
  });

  test('foto de perfil: recusa metadado antes da rede, sobe com nome aleatório e volta "em análise"', async () => {
    const { community, rpc, upload } = api({ set_community_avatar: { data: 'in_review' } });
    await expectCode(community.setAvatar({ bytes: EXIF, uri: 'file:///x.jpg' }), 'photo_has_metadata');
    expect(upload).not.toHaveBeenCalled();
    await expect(community.setAvatar({ bytes: CLEAN, uri: 'file:///x.jpg' })).resolves.toBe('in_review');
    expect(upload).toHaveBeenCalledWith(PATH, CLEAN, { contentType: 'image/jpeg', upsert: false });
    expect(rpc).toHaveBeenCalledWith('set_community_avatar', { new_path: PATH });
  });

  test('se o perfil recusa a foto, o arquivo enviado é descartado', async () => {
    const { community, remove } = api({ set_community_avatar: { error: { code: '22023' } } });
    await expectCode(community.setAvatar({ bytes: CLEAN, uri: 'file:///x.jpg' }), 'invalid_input');
    expect(remove).toHaveBeenCalledWith([PATH]);
  });

  test('N3: e-mail opcional em minúsculas; novidades sem e-mail nem saem do aparelho', async () => {
    const { community, rpc } = api();
    await expectCode(community.setContact({ email: null, wantsNews: true }), 'invalid_input');
    await expectCode(community.setContact({ email: 'sem-arroba', wantsNews: false }), 'invalid_input');
    expect(rpc).not.toHaveBeenCalled();
    await community.setContact({ email: ' Davi@Exemplo.com ', wantsNews: true });
    expect(rpc).toHaveBeenCalledWith('set_community_contact', { new_email: 'davi@exemplo.com', wants_news: true });
  });

  test('perfil incompleto no servidor (CM007) vira mensagem própria', async () => {
    const { community } = api({ create_community_post: { error: { code: 'CM007' } } });
    await expectCode(community.createPost({ body: 'Oi' }), 'needs_profile');
  });
});

describe('diário compartilhado (F1, F3, F5, F6, F8 — 2026-09-22)', () => {
  const PHOTO_A = 'aaaaaaaa-0000-4000-8000-000000000001.jpg';
  const PHOTO_B = 'aaaaaaaa-0000-4000-8000-000000000002.jpg';

  function withFunctions(result: { data?: unknown; error?: unknown } | Error, rpcResults: Record<string, RpcResult> = {}) {
    const fake = fakeClient(rpcResults);
    const invoke = jest.fn(async (_name: string, _options: { body: Record<string, unknown> }) => {
      if (result instanceof Error) throw result;
      return { data: result.data ?? null, error: result.error ?? null };
    });
    const client: CommunityClient = { ...fake.client, functions: { invoke } };
    return { ...fake, invoke, community: createCommunityApi(client, { randomUUID: () => 'x' }) };
  }
  function edgeError(status: number, body: unknown) {
    return { name: 'FunctionsHttpError', context: { status, json: async () => body } };
  }

  // 2026-09-22: acabou o público por ministério. O que a tela pedir é ignorado e
  // o post vai para a igreja inteira (o servidor recusa o resto com 22023).
  test('F1: tipo, dia e versículo (só a referência) vão para a RPC, sempre para a igreja inteira', async () => {
    const { community, rpc } = api({ create_community_post: { data: [{ post_id: POST, status: 'published' }] } });
    await community.createPost({
      body: ' Deus falou comigo ',
      kind: 'versiculo',
      day: 3,
      verse: { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: 17 },
      audience: 'ministerio',
    });
    expect(rpc).toHaveBeenCalledWith('create_community_post', {
      post_body: 'Deus falou comigo',
      post_photo_paths: null,
      post_day: 3,
      post_activity: 'versiculo',
      post_verse_book: 'JHN',
      post_verse_chapter: 3,
      post_verse_start: 16,
      post_verse_end: 17,
      post_audience: 'igreja',
    });
  });

  test('F1: "Jejum" sem texto sai; vazio de tudo, 5 fotos, foto repetida, livro inexistente ou capítulo além do livro não saem', async () => {
    const { community, rpc } = api({ create_community_post: { data: [{ post_id: POST, status: 'published' }] } });
    await expect(community.createPost({ kind: 'jejum' })).resolves.toEqual({ id: POST, status: 'published' });
    rpc.mockClear();
    await expectCode(community.createPost({}), 'invalid_input');
    await expectCode(community.createPost({ photoPaths: [PHOTO_A, PHOTO_B, PHOTO_A.replace('1.jpg', '3.jpg'), PHOTO_A.replace('1.jpg', '4.jpg'), PHOTO_A.replace('1.jpg', '5.jpg')] }), 'invalid_input');
    await expectCode(community.createPost({ photoPaths: [PHOTO_A, PHOTO_A] }), 'invalid_input');
    await expectCode(community.createPost({ kind: 'versiculo' }), 'invalid_input');
    await expectCode(community.createPost({ verse: { book: 'XYZ', chapter: 1, verseStart: 1, verseEnd: null } }), 'invalid_input');
    await expectCode(community.createPost({ verse: { book: 'JUD', chapter: 2, verseStart: 1, verseEnd: null } }), 'invalid_input');
    await expectCode(community.createPost({ verse: { book: 'PSA', chapter: 23, verseStart: 4, verseEnd: 2 } }), 'invalid_input');
    await expectCode(community.createPost({ body: 'oi', kind: 'corrida' as never }), 'invalid_input');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('photoPath antigo repetido em photoPaths conta uma vez só', () => {
    const ok = () => true;
    expect(normalizeNewPost({ photoPaths: [PHOTO_A], photoPath: PHOTO_A }, ok)?.photoPaths).toEqual([PHOTO_A]);
    expect(normalizeNewPost({ photoPaths: [PHOTO_A], photoPath: PHOTO_B }, ok)?.photoPaths).toEqual([PHOTO_A, PHOTO_B]);
    expect(normalizeNewPost({ photoPaths: [PHOTO_A, PHOTO_A] }, ok)).toBeNull();
  });

  test('F5: post com foto vai por submit-post (filtro automático) e pode sair publicado na hora', async () => {
    const { community, invoke, rpc } = withFunctions({ data: { post_id: POST, status: 'published', photo_check: 'feito' } });
    await expect(community.createPost({ body: 'Culto', photoPaths: [PHOTO_A, PHOTO_B] })).resolves.toEqual({
      id: POST,
      status: 'published',
    });
    expect(invoke).toHaveBeenCalledWith('submit-post', {
      body: { post: expect.objectContaining({ post_body: 'Culto', post_photo_paths: [PHOTO_A, PHOTO_B] }) },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  test('F5: a foto antiga (photoPath) também serve; sem filtro no servidor volta "em análise"', async () => {
    const { community } = withFunctions({ data: { post_id: POST, status: 'in_review', photo_check: 'sem_filtro' } });
    await expect(community.createPost({ photoPath: PHOTO_A })).resolves.toEqual({ id: POST, status: 'in_review' });
  });

  test('F5: texto sem foto vai direto pela RPC, mesmo com as funções disponíveis', async () => {
    const { community, invoke, rpc } = withFunctions(
      { data: {} },
      { create_community_post: { data: [{ post_id: POST, status: 'published' }] } },
    );
    await community.createPost({ body: 'Li hoje.' });
    expect(invoke).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('create_community_post', expect.anything());
  });

  test('F5: função não publicada (404) cai na RPC; regra do banco vem traduzida; rede fora vira "sem conexão"', async () => {
    const missing = withFunctions(
      { error: edgeError(404, {}) },
      { create_community_post: { data: [{ post_id: POST, status: 'in_review' }] } },
    );
    await expect(missing.community.createPost({ photoPaths: [PHOTO_A] })).resolves.toEqual({ id: POST, status: 'in_review' });
    expect(missing.rpc).toHaveBeenCalledWith('create_community_post', expect.objectContaining({ post_photo_paths: [PHOTO_A] }));

    const profile = withFunctions({ error: edgeError(400, { error: 'rejected', code: 'CM007' }) });
    await expectCode(profile.community.createPost({ photoPaths: [PHOTO_A] }), 'needs_profile');
    expect(profile.rpc).not.toHaveBeenCalled();

    const offline = withFunctions({ error: { name: 'FunctionsFetchError' } });
    await expectCode(offline.community.createPost({ photoPaths: [PHOTO_A] }), 'offline');
    // Sem repetir pela RPC: a função pode ter criado o post antes de cair.
    expect(offline.rpc).not.toHaveBeenCalled();

    const expired = withFunctions({ error: edgeError(401, { error: 'unauthorized' }) });
    await expectCode(expired.community.createPost({ photoPaths: [PHOTO_A] }), 'session_expired');
  });

  test('um feed só: a RPC nunca recebe feed_scope, nem quando a tela antiga pede escopo', async () => {
    const { community, rpc } = api({ community_feed: { data: [] } });
    await community.feedPage(null, { scope: 'ministerio' });
    expect(rpc).toHaveBeenCalledWith('community_feed', {});
    await community.feedPage({ beforePublishedAt: '2026-09-23T10:00:00Z', beforePost: POST });
    expect(rpc).toHaveBeenLastCalledWith('community_feed', {
      before_published_at: '2026-09-23T10:00:00Z',
      before_post: POST,
    });
  });

  test('F1/F3/F6: campos novos do feed, lidos com segurança', async () => {
    const { community } = api({
      community_feed: {
        data: [
          {
            ...feedRow(0),
            activity: 'leitura',
            verse_book: 'PSA',
            verse_chapter: 23,
            verse_start: 1,
            verse_end: null,
            photo_path: PHOTO_A,
            photo_paths: [PHOTO_A, PHOTO_B, '../x.jpg'],
            audience: 'ministerio',
            audience_ministry: 'Louvor',
            amen_count: 1,
            amen_faces: [
              { name: 'Eu', avatar_path: PHOTO_B, is_mine: true },
              { name: 'Ana' },
              { name: '  ' },
              { name: 'Bia' },
              { name: 'Caio' },
            ],
            comment_count: 2,
          },
          { ...feedRow(1), activity: 'livre', audience: 'outra-coisa' },
        ],
      },
    });
    const [first, second] = (await community.feedPage()).posts;
    expect(first).toMatchObject({
      kind: 'leitura',
      verse: { book: 'PSA', chapter: 23, verseStart: 1, verseEnd: null },
      photoPath: PHOTO_A,
      photoPaths: [PHOTO_A, PHOTO_B],
      audience: 'ministerio',
      audienceMinistry: 'Louvor',
      commentCount: 2,
    });
    // No máximo 3 rostos; o número nunca é menor que os rostos que vieram.
    expect(first.amenFaces?.map((f) => f.name)).toEqual(['Eu', 'Ana', 'Bia']);
    expect(first.amenCount).toBe(3);
    expect(second).toMatchObject({ kind: null, audience: 'igreja', audienceMinistry: null, amenCount: 0, amenFaces: [], photoPaths: [] });
  });

  test('F8: atividade (Amém e comentário), sem nome vira "Alguém da comunidade", linha estranha some; marcar como visto', async () => {
    const { community, rpc } = api({
      my_community_activity: {
        data: [
          { activity_id: '60000000-0000-4000-8000-000000000001', kind: 'comentario', post_id: POST, actor_name: 'Ana', actor_avatar_path: null, created_at: '2026-10-01T12:00:00Z', preview: 'Que bom!', unread: true },
          { activity_id: '60000000-0000-4000-8000-000000000002', kind: 'amen', post_id: POST, actor_name: null, actor_avatar_path: null, created_at: '2026-10-01T11:00:00Z', preview: 'ignorado', unread: false },
          { activity_id: '60000000-0000-4000-8000-000000000003', kind: 'seguiu', post_id: POST },
        ],
      },
      my_community_status: { data: [{ is_member: true, has_new_activity: true }] },
    });
    await expect(community.myActivity()).resolves.toEqual([
      { activityId: '60000000-0000-4000-8000-000000000001', kind: 'comment', postId: POST, actorName: 'Ana', actorAvatarPath: null, at: '2026-10-01T12:00:00Z', preview: 'Que bom!', unread: true },
      { activityId: '60000000-0000-4000-8000-000000000002', kind: 'amen', postId: POST, actorName: 'Alguém da comunidade', actorAvatarPath: null, at: '2026-10-01T11:00:00Z', preview: null, unread: false },
    ]);
    await expect(community.getStatus()).resolves.toMatchObject({ hasNewActivity: true });
    await community.markActivitySeen();
    expect(rpc).toHaveBeenCalledWith('mark_community_activity_seen', undefined);
  });
});
