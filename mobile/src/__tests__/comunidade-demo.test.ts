/**
 * Comunidade de demonstração (src/community/demoApi.ts): só em build de
 * desenvolvimento, com EXPO_PUBLIC_DEMO_MODE=true, Comunidade ligada e SEM nuvem.
 * Em release, getCommunityApi() nunca devolve a demonstração.
 */
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  digestStringAsync: jest.fn(async () => 'ab'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

type ApiModule = typeof import('@/community/api');
type DemoModule = typeof import('@/community/demoApi');

const g = globalThis as unknown as { __DEV__: boolean };
const ORIGINAL_DEV = g.__DEV__;
const ENV_KEYS = [
  'EXPO_PUBLIC_DEMO_MODE',
  'EXPO_PUBLIC_DEMO_DAY',
  'EXPO_PUBLIC_COMMUNITY_ENABLED',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function load(env: Partial<Record<(typeof ENV_KEYS)[number], string>>): { api: ApiModule; demo: DemoModule } {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  let api!: ApiModule;
  let demo!: DemoModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- módulos novos a cada ambiente
    api = require('@/community/api') as ApiModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- idem
    demo = require('@/community/demoApi') as DemoModule;
  });
  return { api, demo };
}

const DEMO_ENV = { EXPO_PUBLIC_DEMO_MODE: 'true', EXPO_PUBLIC_COMMUNITY_ENABLED: 'true', EXPO_PUBLIC_DEMO_DAY: '3' };
const SHA = 'ab'.repeat(32);

afterEach(() => {
  g.__DEV__ = ORIGINAL_DEV;
  for (const key of ENV_KEYS) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL_ENV[key];
  }
});

describe('portão da demonstração', () => {
  it('em release (__DEV__ = false) getCommunityApi nunca devolve a demonstração', () => {
    g.__DEV__ = false;
    const { api, demo } = load(DEMO_ENV);
    expect(demo.isCommunityDemo()).toBe(false);
    expect(demo.getDemoCommunityApi()).toBeNull();
    expect(api.getCommunityApi()).toBeNull();
    demo.demoSignIn();
    expect(demo.getDemoSession()).toBeNull();
  });

  it('em desenvolvimento, sem EXPO_PUBLIC_DEMO_MODE, não há demonstração', () => {
    g.__DEV__ = true;
    const { api } = load({ EXPO_PUBLIC_COMMUNITY_ENABLED: 'true' });
    expect(api.getCommunityApi()).toBeNull();
  });

  it('sem a Comunidade ligada, não há demonstração', () => {
    g.__DEV__ = true;
    const { api } = load({ EXPO_PUBLIC_DEMO_MODE: 'true' });
    expect(api.getCommunityApi()).toBeNull();
  });

  it('com a nuvem configurada, a demonstração não liga', () => {
    g.__DEV__ = true;
    const { demo } = load({
      ...DEMO_ENV,
      EXPO_PUBLIC_SUPABASE_URL: 'https://exemplo.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'chave-anonima-de-teste',
    });
    expect(demo.isCommunityDemo()).toBe(false);
    expect(demo.getDemoCommunityApi()).toBeNull();
  });

  it('um cliente passado explicitamente nunca vira demonstração', () => {
    g.__DEV__ = true;
    const { api } = load(DEMO_ENV);
    expect(api.getCommunityApi({ supabase: null })).toBeNull();
  });

  it('em desenvolvimento com as variáveis, getCommunityApi devolve a demonstração', () => {
    g.__DEV__ = true;
    const { api, demo } = load(DEMO_ENV);
    const client = api.getCommunityApi();
    expect(client).not.toBeNull();
    expect(demo.isDemoCommunityApi(client)).toBe(true);
  });
});

describe('comunidade de demonstração em memória', () => {
  function setup() {
    g.__DEV__ = true;
    const { demo } = load(DEMO_ENV);
    demo._resetDemoForTests(Date.parse('2026-09-25T12:00:00Z'));
    const api = demo.getDemoCommunityApi()!;
    return { api, demo };
  }

  async function join() {
    const ctx = setup();
    ctx.demo.demoSignIn();
    await expect(ctx.api.redeemInviteCode({ code: 'DEMAX-23456', displayName: 'Davi', confirmsAdult: true })).resolves.toBe(
      'joined',
    );
    return ctx;
  }

  async function consent(api: NonNullable<ReturnType<DemoModule['getDemoCommunityApi']>>) {
    await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
  }

  it('sem o passo de e-mail simulado, não há sessão', async () => {
    const { api, demo } = setup();
    expect(demo.getDemoSession()).toBeNull();
    await expect(api.getStatus()).rejects.toMatchObject({ code: 'session_expired' });
    demo.demoSignIn();
    expect(demo.getDemoSession()?.email).toBe(demo.DEMO_EMAIL_LABEL);
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: false, needsRules: true, rulesVersion: 'PENDENTE' });
  });

  it('só o código de demonstração entra; código errado dá a mesma resposta do servidor', async () => {
    const { api, demo } = setup();
    demo.demoSignIn();
    await expect(api.redeemInviteCode({ code: 'ABCDE-23456', displayName: 'Davi', confirmsAdult: true })).resolves.toBe(
      'invalid_code',
    );
    await expect(api.redeemInviteCode({ code: 'DEMAX23456', displayName: 'Davi', confirmsAdult: false })).rejects.toMatchObject(
      { code: 'needs_adult_account' },
    );
    await expect(api.redeemInviteCode({ code: 'demax-23456', displayName: 'Davi', confirmsAdult: true })).resolves.toBe('joined');
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: true, memberStatus: 'active', displayName: 'Davi' });
  });

  it('feed com 5 publicações de exemplo, nomes fictícios marcados, sem foto e sem contador', async () => {
    const { api } = await join();
    const page = await api.feedPage();
    expect(page.posts).toHaveLength(5);
    expect(page.ended).toBe(true);
    expect(page.nextCursor).toBeNull();
    for (const post of page.posts) {
      expect(post.authorName).toMatch(/ \(exemplo\)$/);
      expect(post.photoPath).toBeNull();
      expect(post.isMine).toBe(false);
      expect(Object.keys(post)).not.toContain('amenCount');
    }
    // Ordem: mais recente primeiro; dias relativos ao dia simulado (3).
    expect(page.posts[0].dayNumber).toBe(3);
    expect(page.posts[4].dayNumber).toBe(1);
  });

  it('"Minhas publicações" começa com uma "Em análise", que também aparece no topo do feed pelo useFeed', async () => {
    const { api } = await join();
    const mine = await api.myPosts();
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ status: 'in_review', holdReason: 'termo' });
    const page = await api.feedPage();
    expect(page.posts.some((p) => p.postId === mine[0].postId)).toBe(false);
  });

  it('publicar, comentar e Amém pedem regras e consentimento antes', async () => {
    const { api } = await join();
    const [first] = (await api.feedPage()).posts;
    await expect(api.createPost({ body: 'Oi' })).rejects.toMatchObject({ code: 'needs_consent' });
    await expect(api.setAmen(first.postId, true)).rejects.toMatchObject({ code: 'needs_consent' });
    await expect(api.createComment(first.postId, 'Amém')).rejects.toMatchObject({ code: 'needs_consent' });
    await consent(api);
    await expect(api.getStatus()).resolves.toMatchObject({ canPublish: true, needsRules: false, needsPublishConsent: false });
  });

  it('publica texto limpo; link fica em análise e só a pessoa vê', async () => {
    const { api } = await join();
    await consent(api);
    const ok = await api.createPost({ body: 'Terminei a leitura de hoje.', day: 3 });
    expect(ok.status).toBe('published');
    const held = await api.createPost({ body: 'Vejam www.exemplo.com' });
    expect(held.status).toBe('in_review');
    const page = await api.feedPage();
    expect(page.posts[0]).toMatchObject({ postId: ok.id, isMine: true, authorName: 'Davi', dayNumber: 3 });
    expect(page.posts.some((p) => p.postId === held.id)).toBe(false);
    const mine = await api.myPosts();
    expect(mine.map((p) => p.status).sort()).toEqual(['in_review', 'in_review', 'published']);
    await api.deletePost(ok.id);
    expect((await api.feedPage()).posts.some((p) => p.postId === ok.id)).toBe(false);
  });

  it('foto não é enviada na demonstração', async () => {
    const { api } = await join();
    await consent(api);
    await expect(api.uploadPhoto(new Uint8Array([1]))).rejects.toMatchObject({ code: 'feature_disabled' });
  });

  it('Amém devolve só o meu estado; comentários funcionam', async () => {
    const { api } = await join();
    await consent(api);
    const maria = (await api.feedPage()).posts.find((p) => p.authorName === 'Maria (exemplo)')!;
    await expect(api.setAmen(maria.postId, true)).resolves.toBe(true);
    expect((await api.feedPage()).posts.find((p) => p.postId === maria.postId)?.iSaidAmen).toBe(true);
    const before = await api.postComments(maria.postId);
    expect(before).toHaveLength(1);
    const created = await api.createComment(maria.postId, 'Que bom ler isso.');
    expect(created.status).toBe('published');
    const after = await api.postComments(maria.postId);
    expect(after.map((c) => c.isMine)).toEqual([false, true]);
    await api.deleteComment(created.id);
    await expect(api.postComments(maria.postId)).resolves.toHaveLength(1);
  });

  it('bloquear esconde tudo de quem escreveu; desbloquear devolve', async () => {
    const { api } = await join();
    const joao = (await api.feedPage()).posts.find((p) => p.authorName === 'João (exemplo)')!;
    await api.blockAuthor({ postId: joao.postId });
    expect((await api.feedPage()).posts).toHaveLength(4);
    const blocks = await api.myBlocks();
    expect(blocks).toEqual([expect.objectContaining({ displayName: 'João (exemplo)' })]);
    await api.unblock(blocks[0].blockId);
    expect((await api.feedPage()).posts).toHaveLength(5);
  });

  it('denúncia devolve recibo; urgente tira do ar', async () => {
    const { api } = await join();
    const [first, second] = (await api.feedPage()).posts;
    const receipt = await api.report({ postId: first.postId, reason: 'spam' });
    expect(receipt).toMatch(/^[0-9a-f-]{36}$/);
    expect((await api.feedPage()).posts).toHaveLength(5);
    await api.report({ postId: second.postId, reason: 'crianca_exposta' });
    expect((await api.feedPage()).posts.some((p) => p.postId === second.postId)).toBe(false);
  });

  it('sair da comunidade apaga o que a pessoa fez e volta ao passo do código', async () => {
    const { api, demo } = await join();
    await consent(api);
    await api.createPost({ body: 'Obrigado a todos.' });
    await api.leaveCommunity();
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: false });
    await expect(api.myPosts()).rejects.toMatchObject({ code: 'needs_invite' });
    demo.demoSignOut();
    expect(demo.getDemoSession()).toBeNull();
  });
});
