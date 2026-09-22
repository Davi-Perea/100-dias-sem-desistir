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
  'EXPO_PUBLIC_DEMO_SEED',
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
/** Pessoas de exemplo: primeiros nomes inventados, sem sobrenome (demoApi.ts). */
const EXAMPLE_NAMES = ['Marina', 'Tiago', 'Letícia', 'Felipe', 'Bruna', 'Rodrigo', 'Camila'];
/** JPEG mínimo sem metadados (SOI, DQT curto, SOS). */
const CLEAN_JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]);

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
  let demoAvatarPath = '';
  function setup() {
    g.__DEV__ = true;
    const { demo } = load(DEMO_ENV);
    demo._resetDemoForTests(Date.parse('2026-09-25T12:00:00Z'));
    const api = demo.getDemoCommunityApi()!;
    demoAvatarPath = demo.DEMO_AVATAR_PATH;
    return { api, demo };
  }

  async function join() {
    const ctx = setup();
    ctx.demo.demoSignIn();
    await expect(ctx.api.joinCommunity({ displayName: 'Davi' })).resolves.toBeUndefined();
    return ctx;
  }

  /** Perfil completo (C4): foto, nome, 16+ e ministério. A foto fica só na memória. */
  async function completeProfile(api: NonNullable<ReturnType<DemoModule['getDemoCommunityApi']>>) {
    await api.setAvatar({ bytes: CLEAN_JPEG, uri: 'file:///cache/eu.jpg' });
    await api.updateProfile({ name: 'Davi', confirms16: true, ministry: 'Comunicação' });
  }

  async function consent(api: NonNullable<ReturnType<DemoModule['getDemoCommunityApi']>>) {
    await completeProfile(api);
    await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
  }

  it('sem entrar (conta do aparelho), não há sessão; entrar é direto, sem e-mail (C2)', async () => {
    const { api, demo } = setup();
    expect(demo.getDemoSession()).toBeNull();
    await expect(api.getStatus()).rejects.toMatchObject({ code: 'session_expired' });
    demo.demoSignIn();
    expect(demo.getDemoSession()).toEqual({ userId: expect.any(String) });
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: false, needsRules: true, rulesVersion: 'PENDENTE' });
  });

  it('C3: sem código, a demonstração entra direto', async () => {
    const { api, demo } = setup();
    demo.demoSignIn();
    await api.joinCommunity({ displayName: 'Davi' });
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: true, memberStatus: 'active', displayName: 'Davi' });
  });

  it('feed com 5 publicações de exemplo, primeiros nomes inventados sem "(exemplo)" na tela, sem foto', async () => {
    const { api } = await join();
    const page = await api.feedPage();
    expect(page.posts).toHaveLength(5);
    expect(page.ended).toBe(true);
    expect(page.nextCursor).toBeNull();
    for (const post of page.posts) {
      expect(EXAMPLE_NAMES).toContain(post.authorName);
      expect(post.photoPath).toBeNull();
      expect(post.isMine).toBe(false);
      expect(post.amenCount).toBeGreaterThan(0);
      for (const face of post.amenFaces ?? []) expect(EXAMPLE_NAMES).toContain(face.name);
      expect(post.audience).toBe('igreja');
    }
    // F1: tipos variados; o versículo é só a referência.
    expect(page.posts.map((p) => p.kind)).toEqual(['leitura', 'oracao', 'versiculo', 'jejum', null]);
    expect(page.posts[2].verse).toEqual({ book: 'PSA', chapter: 119, verseStart: 105, verseEnd: null });
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

  it('C4: com as regras e o consentimento, publicar e comentar ainda pedem o perfil completo; Amém não', async () => {
    const { api } = await join();
    await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    const [first] = (await api.feedPage()).posts;
    await expect(api.createPost({ body: 'Oi' })).rejects.toMatchObject({ code: 'needs_profile' });
    await expect(api.createComment(first.postId, 'Amém')).rejects.toMatchObject({ code: 'needs_profile' });
    await expect(api.setAmen(first.postId, true)).resolves.toBe(true);
    await expect(api.getStatus()).resolves.toMatchObject({ canPublish: false, profileComplete: false });
    await api.setAvatar({ bytes: CLEAN_JPEG, uri: 'file:///cache/eu.jpg' });
    await api.updateProfile({ confirms16: true, noMinistry: true });
    const status = await api.getStatus();
    expect(status.profile).toMatchObject({ displayName: 'Davi', ministry: null, ministryAnswered: true, avatarStatus: 'in_review' });
    expect(status).toMatchObject({ profileComplete: true, canPublish: true });
    const post = await api.createPost({ body: 'Primeira vez aqui.' });
    const mine = (await api.feedPage()).posts.find((p) => p.postId === post.id);
    expect(mine).toMatchObject({ authorName: 'Davi', authorMinistry: null, authorAvatarPath: demoAvatarPath });
    const urls = await api.signPhotoUrls([demoAvatarPath]);
    expect(urls.get(demoAvatarPath)).toBe('file:///cache/eu.jpg');
  });

  it('N3: e-mail opcional; novidades só com e-mail e desmarcadas por padrão', async () => {
    const { api } = await join();
    await expect(api.getStatus()).resolves.toMatchObject({ profile: { contactEmail: null, newsOptIn: false } });
    await expect(api.setContact({ email: null, wantsNews: true })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(api.setContact({ email: 'isso-nao', wantsNews: false })).rejects.toMatchObject({ code: 'invalid_input' });
    await api.setContact({ email: ' Davi@Exemplo.com ', wantsNews: false });
    await expect(api.getStatus()).resolves.toMatchObject({ profile: { contactEmail: 'davi@exemplo.com', newsOptIn: false } });
  });

  it('F5: fotos de post (até 4) funcionam na demonstração, só na memória, e aparecem na hora (filtro simulado)', async () => {
    const { api, demo } = await join();
    await consent(api);
    await expect(api.uploadPhoto(new Uint8Array([1]))).rejects.toMatchObject({ code: 'photo_not_jpeg' });
    const path = await api.uploadPhoto(CLEAN_JPEG);
    const second = await api.uploadPhoto(CLEAN_JPEG);
    const post = await api.createPost({ photoPaths: [path, second], day: 3, kind: 'leitura' });
    expect(post.status).toBe('published');
    const mine = (await api.myPosts()).find((p) => p.postId === post.id);
    expect(mine).toMatchObject({ photoPath: path, photoPaths: [path, second], status: 'published', decidedBy: 'automatico' });
    const urls = await api.signPhotoUrls([path]);
    expect(urls.get(path)).toBe(`data:image/jpeg;base64,${demo._bytesToBase64ForTests(CLEAN_JPEG)}`);
    expect(demo._bytesToBase64ForTests(CLEAN_JPEG)).toBe(Buffer.from(CLEAN_JPEG).toString('base64'));
    expect((await api.feedPage()).posts[0]).toMatchObject({ postId: post.id, photoPaths: [path, second], kind: 'leitura' });
    await expect(api.createPost({ photoPaths: ['nao-subiu.jpg'] })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('F3: meu Amém soma 1 e põe o meu rosto na frente; desmarcar volta', async () => {
    const { api } = await join();
    await consent(api);
    const marina = (await api.feedPage()).posts.find((p) => p.authorName === 'Marina')!;
    await api.setAmen(marina.postId, true);
    const after = (await api.feedPage()).posts.find((p) => p.postId === marina.postId)!;
    expect(after.amenCount).toBe((marina.amenCount ?? 0) + 1);
    expect(after.amenFaces?.[0]).toMatchObject({ name: 'Davi', isMine: true });
    expect(after.amenFaces).toHaveLength(3);
    await api.setAmen(marina.postId, false);
    expect((await api.feedPage()).posts.find((p) => p.postId === marina.postId)?.amenCount).toBe(marina.amenCount);
  });

  it('F3: quem eu bloqueio sai dos rostinhos e da contagem', async () => {
    const { api } = await join();
    const before = (await api.feedPage()).posts.find((p) => p.authorName === 'Marina')!;
    const tiago = (await api.feedPage()).posts.find((p) => p.authorName === 'Tiago')!;
    await api.blockAuthor({ postId: tiago.postId });
    const after = (await api.feedPage()).posts.find((p) => p.postId === before.postId)!;
    expect(after.amenFaces?.map((f) => f.name)).not.toContain('Tiago');
    expect(after.amenCount).toBe((before.amenCount ?? 0) - 1);
  });

  it('F6: o post do ministério só aparece com ministério no perfil; o escopo "ministério" filtra', async () => {
    const { api } = await join();
    expect((await api.feedPage()).posts.some((p) => p.audience === 'ministerio')).toBe(false);
    await expect(api.feedPage(null, { scope: 'ministerio' })).resolves.toMatchObject({ posts: [] });
    await api.updateProfile({ ministry: 'Comunicação' });
    const all = await api.feedPage();
    expect(all.posts).toHaveLength(6);
    const ministry = await api.feedPage(null, { scope: 'ministerio' });
    expect(ministry.posts).toHaveLength(1);
    expect(ministry.posts[0]).toMatchObject({ audience: 'ministerio', audienceMinistry: 'Comunicação', kind: 'oracao' });
  });

  it('F6: publicar para "Meu ministério" exige ministério no perfil', async () => {
    const { api } = await join();
    await api.setAvatar({ bytes: CLEAN_JPEG, uri: 'file:///cache/eu.jpg' });
    await api.updateProfile({ confirms16: true, noMinistry: true });
    await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: SHA, appVersion: 't' });
    await expect(api.createPost({ body: 'Oi', audience: 'ministerio' })).rejects.toMatchObject({ code: 'invalid_input' });
    await api.updateProfile({ ministry: 'Comunicação' });
    const post = await api.createPost({ body: 'Oi, ministério', audience: 'ministerio' });
    const mine = (await api.myPosts()).find((p) => p.postId === post.id);
    expect(mine).toMatchObject({ audience: 'ministerio', audienceMinistry: 'Comunicação' });
  });

  it('F8: ao publicar, alguém de exemplo diz Amém e o sino acende; ver apaga', async () => {
    const { api } = await join();
    await consent(api);
    await expect(api.getStatus()).resolves.toMatchObject({ hasNewActivity: false });
    const post = await api.createPost({ kind: 'jejum' });
    const activity = await api.myActivity();
    expect(activity).toEqual([
      expect.objectContaining({ kind: 'amen', postId: post.id, actorName: 'Marina', unread: true }),
    ]);
    await expect(api.getStatus()).resolves.toMatchObject({ hasNewActivity: true });
    await api.markActivitySeen();
    await expect(api.getStatus()).resolves.toMatchObject({ hasNewActivity: false });
    expect((await api.myActivity())[0].unread).toBe(false);
  });

  it('Amém devolve só o meu estado; comentários funcionam', async () => {
    const { api } = await join();
    await consent(api);
    const marina = (await api.feedPage()).posts.find((p) => p.authorName === 'Marina')!;
    await expect(api.setAmen(marina.postId, true)).resolves.toBe(true);
    expect((await api.feedPage()).posts.find((p) => p.postId === marina.postId)?.iSaidAmen).toBe(true);
    const before = await api.postComments(marina.postId);
    expect(before).toHaveLength(1);
    const created = await api.createComment(marina.postId, 'Que bom ler isso.');
    expect(created.status).toBe('published');
    const after = await api.postComments(marina.postId);
    expect(after.map((c) => c.isMine)).toEqual([false, true]);
    await api.deleteComment(created.id);
    await expect(api.postComments(marina.postId)).resolves.toHaveLength(1);
  });

  it('bloquear esconde tudo de quem escreveu; desbloquear devolve', async () => {
    const { api } = await join();
    const tiago = (await api.feedPage()).posts.find((p) => p.authorName === 'Tiago')!;
    await api.blockAuthor({ postId: tiago.postId });
    expect((await api.feedPage()).posts).toHaveLength(4);
    const blocks = await api.myBlocks();
    expect(blocks).toEqual([expect.objectContaining({ displayName: 'Tiago' })]);
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

  it('sair da comunidade apaga o que a pessoa fez e volta a não ser membro', async () => {
    const { api, demo } = await join();
    await consent(api);
    await api.createPost({ body: 'Obrigado a todos.' });
    await api.leaveCommunity();
    await expect(api.getStatus()).resolves.toMatchObject({ isMember: false });
    await expect(api.myPosts()).rejects.toMatchObject({ code: 'needs_join' });
    demo.demoSignOut();
    expect(demo.getDemoSession()).toBeNull();
  });
});

describe('prévia "um desconhecido instala no dia 23" (EXPO_PUBLIC_DEMO_DAY=1)', () => {
  function dayOne(env: Record<string, string> = {}) {
    g.__DEV__ = true;
    const { demo } = load({ ...DEMO_ENV, EXPO_PUBLIC_DEMO_DAY: '1', ...env });
    demo._resetDemoForTests(Date.parse('2026-09-23T10:30:00Z'));
    const api = demo.getDemoCommunityApi()!;
    demo.demoSignIn();
    return { api, demo };
  }

  it('poucas publicações do Dia 1, recentes, sobre começar; sem nada da própria pessoa', async () => {
    const { api } = dayOne();
    await api.joinCommunity({ displayName: 'Davi' });
    const page = await api.feedPage();
    expect(page.posts).toHaveLength(5);
    const now = Date.parse('2026-09-23T10:30:00Z');
    for (const post of page.posts) {
      expect(post.dayNumber).toBe(1);
      expect(EXAMPLE_NAMES).toContain(post.authorName);
      expect(post.authorName).not.toMatch(/exemplo|\s/i);
      expect(post.isMine).toBe(false);
      expect(post.photoPath).toBeNull();
      // Da última hora e meia: a primeira manhã da campanha.
      expect(now - Date.parse(post.publishedAt)).toBeLessThanOrEqual(2 * 60 * 60_000);
      // Nada de dias anteriores nem de "atraso" no primeiro dia.
      expect(post.body ?? '').not.toMatch(/ontem|atrasei|semana passada/i);
    }
    expect(page.posts.some((p) => /Gênesis/.test(p.body ?? ''))).toBe(true);
    // Versículo: só a referência, do começo de Gênesis.
    expect(page.posts.find((p) => p.kind === 'versiculo')?.verse).toEqual({
      book: 'GEN',
      chapter: 1,
      verseStart: 1,
      verseEnd: null,
    });
    // Alguns com Amém; um ainda sem.
    expect(page.posts.filter((p) => (p.amenCount ?? 0) > 0).length).toBeGreaterThanOrEqual(3);
    expect(page.posts.some((p) => (p.amenCount ?? 0) === 0)).toBe(true);
    // Alguns com comentário.
    const withComments = page.posts.filter((p) => (p.commentCount ?? 0) > 0);
    expect(withComments.length).toBeGreaterThanOrEqual(2);
    for (const c of await api.postComments(withComments[0].postId)) expect(EXAMPLE_NAMES).toContain(c.authorName);
    await expect(api.myPosts()).resolves.toEqual([]);
  });

  it('mesmo sem EXPO_PUBLIC_DEMO_SEED=false, o Dia 1 não traz publicação própria', async () => {
    const { api } = dayOne({ EXPO_PUBLIC_DEMO_SEED: 'true' });
    await api.joinCommunity({ displayName: 'Davi' });
    await expect(api.myPosts()).resolves.toEqual([]);
  });

  it('nenhuma etiqueta de demonstração vai para a tela (só o código sabe)', () => {
    const { demo } = dayOne();
    expect(demo.DEMO_LABELS_ON_SCREEN).toBe(false);
    expect(demo.DEMO_FIRST_AMEN_NAME).not.toMatch(/exemplo/i);
    expect(EXAMPLE_NAMES).toContain(demo.DEMO_FIRST_AMEN_NAME);
  });

  it('continua só em desenvolvimento: em release o Dia 1 de exemplo não existe', () => {
    g.__DEV__ = false;
    const { demo } = load({ ...DEMO_ENV, EXPO_PUBLIC_DEMO_DAY: '1' });
    expect(demo.getDemoCommunityApi()).toBeNull();
  });
});
