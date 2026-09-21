/**
 * Edge Functions da Comunidade, com dependências FALSAS (sem Deno, sem banco).
 *
 * PROVA: a lógica dos handlers — quem é aceito, a ordem da exclusão de conta, o
 * que a drenagem apaga ou guarda, o que o filtro segura. NÃO PROVA: o runtime
 * Deno, o supabase-js dentro dele, nem o SQL (esses só num projeto Supabase:
 * docs/technical/COMUNIDADE_V2_DEPLOY.md §9).
 */
import { handleDeleteAccount, parseMaxAuthAge } from '../_shared/account-deletion.ts';
import type { DeleteAccountDeps } from '../_shared/account-deletion.ts';
import { bearerToken, corsHeaders, hasCronSecret, lastAuthenticatedAt, parseAllowedOrigins } from '../_shared/http.ts';
import type { EdgeRequest } from '../_shared/http.ts';
import { handleModerateText } from '../_shared/moderate-text.ts';
import type { ModerateTextDeps } from '../_shared/moderate-text.ts';
import { drainStorageDeletions, handleDrain } from '../_shared/storage-drain.ts';
import type { DrainDeps, QueueItem } from '../_shared/storage-drain.ts';
import { BASE_TERMS_PT_BR } from '../_shared/terms-pt-br.ts';
import { configuredTerms, normalizeTerm, textVerdict } from '../_shared/text-filter.ts';

const SECRET = 'x'.repeat(40);
const USER = '10000000-0000-4000-8000-000000000001';
const POST = '20000000-0000-4000-8000-000000000001';
const NOW = 1_790_000_000;

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function jwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'ES256' })}.${b64url(payload)}.assinatura`;
}
function request(init: { method?: string; headers?: Record<string, string>; body?: unknown }): EdgeRequest {
  const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: init.method ?? 'POST',
    header: (name) => headers[name.toLowerCase()] ?? null,
    json: async () => init.body ?? null,
  };
}

// ---------------------------------------------------------------------------
describe('http', () => {
  test('segredo do cron: exato, e nunca aceito se a função não tiver um segredo forte', () => {
    expect(hasCronSecret(request({ headers: { 'x-cron-secret': SECRET } }), SECRET)).toBe(true);
    expect(hasCronSecret(request({ headers: { 'x-cron-secret': `${SECRET}y` } }), SECRET)).toBe(false);
    expect(hasCronSecret(request({ headers: {} }), SECRET)).toBe(false);
    expect(hasCronSecret(request({ headers: { 'x-cron-secret': 'curto' } }), 'curto')).toBe(false);
    expect(hasCronSecret(request({ headers: { 'x-cron-secret': '' } }), null)).toBe(false);
  });

  test('bearer e amr: pega o login mais recente', () => {
    expect(bearerToken(request({ headers: { Authorization: 'Bearer abc.def.ghi' } }))).toBe('abc.def.ghi');
    expect(bearerToken(request({ headers: { Authorization: 'Basic x' } }))).toBeNull();
    expect(lastAuthenticatedAt({ amr: [{ method: 'otp', timestamp: 10 }, { method: 'otp', timestamp: 30 }] })).toBe(30);
    expect(lastAuthenticatedAt({})).toBeNull();
  });

  test('CORS só para origens https configuradas', () => {
    const allowed = parseAllowedOrigins('https://exclusao.exemplo.org/, http://evil.com, javascript:alert(1)');
    expect(allowed).toEqual(['https://exclusao.exemplo.org']);
    expect(corsHeaders('https://exclusao.exemplo.org', allowed)['Access-Control-Allow-Origin']).toBe(
      'https://exclusao.exemplo.org',
    );
    expect(corsHeaders('https://outro.org', allowed)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
describe('delete-account', () => {
  function deps(overrides: Partial<DeleteAccountDeps> = {}) {
    const calls: string[] = [];
    const base: DeleteAccountDeps = {
      getUser: jest.fn(async () => ({ id: USER })),
      prepare: jest.fn(async () => {
        calls.push('prepare');
        return [
          { bucket_id: 'community-photos', object_name: 'a.jpg' },
          { bucket_id: 'community-photos', object_name: 'b.jpg' },
        ];
      }),
      photosInUse: jest.fn(async () => []),
      remove: jest.fn(async () => {
        calls.push('remove');
        return true;
      }),
      confirm: jest.fn(async () => {}),
      deleteUser: jest.fn(async () => {
        calls.push('deleteUser');
      }),
      nowSeconds: () => NOW,
      maxAuthAgeSeconds: 600,
      log: jest.fn(),
      ...overrides,
    };
    return { deps: base, calls };
  }
  const fresh = jwt({ sub: USER, amr: [{ method: 'otp', timestamp: NOW - 60 }] });
  const post = (token: string | null, body: unknown = { confirm: true }) =>
    request({ headers: token ? { Authorization: `Bearer ${token}` } : {}, body });

  test('login recente: apaga dados da comunidade e fotos ANTES de apagar a conta', async () => {
    const { deps: d, calls } = deps();
    const res = await handleDeleteAccount(post(fresh), d);
    expect(res).toEqual({ status: 200, body: { deleted: true } });
    expect(d.prepare).toHaveBeenCalledWith(USER);
    expect(d.remove).toHaveBeenCalledWith('community-photos', ['a.jpg', 'b.jpg']);
    expect(d.confirm).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(['prepare', 'remove', 'deleteUser']);
    expect(d.deleteUser).toHaveBeenCalledWith(USER);
  });

  test('login antigo: 401 reauth_required e NADA é apagado', async () => {
    const { deps: d } = deps();
    const old = jwt({ sub: USER, amr: [{ method: 'otp', timestamp: NOW - 601 }] });
    const res = await handleDeleteAccount(post(old), d);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'reauth_required', max_age_seconds: 600 });
    expect(d.prepare).not.toHaveBeenCalled();
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('sem amr, amr no futuro, token de outra pessoa ou token recusado pelo Auth: não apaga', async () => {
    const cases = [
      jwt({ sub: USER }),
      jwt({ sub: USER, amr: [{ method: 'otp', timestamp: NOW + 3600 }] }),
      jwt({ sub: 'outra-pessoa', amr: [{ method: 'otp', timestamp: NOW }] }),
    ];
    for (const token of cases) {
      const { deps: d } = deps();
      expect((await handleDeleteAccount(post(token), d)).status).toBe(401);
      expect(d.deleteUser).not.toHaveBeenCalled();
    }
    const { deps: refused } = deps({ getUser: jest.fn(async () => null) });
    expect((await handleDeleteAccount(post(fresh), refused)).body).toEqual({ error: 'unauthorized' });
    const { deps: noToken } = deps();
    expect((await handleDeleteAccount(post(null), noToken)).status).toBe(401);
  });

  test('sem confirm: true não apaga; GET não apaga', async () => {
    const { deps: d } = deps();
    expect((await handleDeleteAccount(post(fresh, {}), d)).body).toEqual({ error: 'confirmation_required' });
    expect((await handleDeleteAccount(request({ method: 'GET' }), d)).status).toBe(405);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  test('sessão anônima (sem como se reautenticar) pode apagar', async () => {
    const { deps: d } = deps({ prepare: jest.fn(async () => []) });
    const anon = jwt({ sub: USER, is_anonymous: true, amr: [{ method: 'anonymous', timestamp: NOW - 86_400 }] });
    expect((await handleDeleteAccount(post(anon), d)).status).toBe(200);
    expect(d.deleteUser).toHaveBeenCalled();
  });

  test('Storage fora do ar não impede a exclusão (as fotos ficam na fila do cron)', async () => {
    const { deps: d } = deps({ remove: jest.fn(async () => false) });
    expect((await handleDeleteAccount(post(fresh), d)).status).toBe(200);
    expect(d.confirm).not.toHaveBeenCalled();
    expect(d.deleteUser).toHaveBeenCalled();
  });

  test('falha ao apagar a conta: 500 sem detalhe do servidor', async () => {
    const { deps: d } = deps({
      deleteUser: jest.fn(async () => {
        throw new Error('detalhe interno com e-mail');
      }),
    });
    const res = await handleDeleteAccount(post(fresh), d);
    expect(res).toEqual({ status: 500, body: { error: 'deletion_failed' } });
    expect(JSON.stringify((d.log as jest.Mock).mock.calls)).not.toMatch(/e-mail|10000000/);
  });

  test('prazo do login recente: 60 s a 1 h; outro valor volta ao padrão de 10 min', () => {
    expect(parseMaxAuthAge('300')).toBe(300);
    expect(parseMaxAuthAge('5')).toBe(600);
    expect(parseMaxAuthAge('abc')).toBe(600);
    expect(parseMaxAuthAge(null)).toBe(600);
  });
});

// ---------------------------------------------------------------------------
describe('drain-storage-deletions', () => {
  function queue(items: QueueItem[], overrides: Partial<DrainDeps> = {}) {
    const pending = [...items];
    const d: DrainDeps = {
      enqueueOrphans: jest.fn(async () => 1),
      claim: jest.fn(async (max: number) => pending.splice(0, max)),
      photosInUse: jest.fn(async () => []),
      remove: jest.fn(async () => true),
      confirm: jest.fn(async () => {}),
      ...overrides,
    };
    return d;
  }
  const photo = (name: string, bucket = 'community-photos'): QueueItem => ({ bucket_id: bucket, object_name: name });

  test('só com o segredo do cron', async () => {
    const d = queue([]);
    expect((await handleDrain(request({}), { ...d, cronSecret: SECRET, log: jest.fn() })).status).toBe(401);
    expect(d.claim).not.toHaveBeenCalled();
    const ok = await handleDrain(request({ headers: { 'x-cron-secret': SECRET } }), {
      ...d,
      cronSecret: SECRET,
      log: jest.fn(),
    });
    expect(ok.status).toBe(200);
    expect(d.enqueueOrphans).toHaveBeenCalledWith(24);
  });

  test('apaga, confirma, e guarda na fila o que o Storage recusou', async () => {
    const d = queue([photo('a.jpg'), photo('b.jpg')], { remove: jest.fn(async () => false) });
    const summary = await drainStorageDeletions(d, { batchSize: 10 });
    expect(summary).toMatchObject({ claimed: 2, deleted: 0, failed: 2 });
    expect(d.confirm).not.toHaveBeenCalled();

    const ok = queue([photo('a.jpg'), photo('b.jpg')]);
    expect(await drainStorageDeletions(ok, { batchSize: 10 })).toMatchObject({ deleted: 2, failed: 0 });
    expect(ok.confirm).toHaveBeenCalledWith('community-photos', 'a.jpg');
  });

  test('foto que voltou a ser de um post sai da fila SEM ser apagada', async () => {
    const d = queue([photo('usada.jpg'), photo('solta.jpg')], { photosInUse: jest.fn(async () => ['usada.jpg']) });
    const summary = await drainStorageDeletions(d, { batchSize: 10 });
    expect(d.remove).toHaveBeenCalledWith('community-photos', ['solta.jpg']);
    expect(d.confirm).toHaveBeenCalledWith('community-photos', 'usada.jpg');
    expect(summary).toMatchObject({ deleted: 1, keptInUse: 1 });
  });

  test('bucket fora da lista nunca é apagado', async () => {
    const d = queue([photo('x.jpg', 'outro-bucket')]);
    expect(await drainStorageDeletions(d)).toMatchObject({ skippedBucket: 1, deleted: 0 });
    expect(d.remove).not.toHaveBeenCalled();
  });

  test('para quando a fila acaba e respeita o teto de lotes', async () => {
    const many = Array.from({ length: 25 }, (_, i) => photo(`${i}.jpg`));
    const d = queue(many);
    const summary = await drainStorageDeletions(d, { batchSize: 10, maxBatches: 2 });
    expect(summary.claimed).toBe(20);
    expect(d.claim).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
describe('filtro de palavras', () => {
  const terms = configuredTerms(BASE_TERMS_PT_BR, null, null);

  test('lista base: normalizada, sem repetição, e configurável por segredo', () => {
    expect(terms.every((t) => normalizeTerm(t) === t)).toBe(true);
    expect(new Set(terms).size).toBe(terms.length);
    const custom = configuredTerms(BASE_TERMS_PT_BR, 'Fofoca, xx', 'merda,PIX');
    expect(custom).toContain('fofoca');
    expect(custom).toContain('xx');
    expect(custom).not.toContain('merda');
    expect(custom).not.toContain('pix');
    expect(normalizeTerm('a')).toBeNull();
    expect(normalizeTerm('  Coração  Aflito ')).toBe('coracao aflito');
  });

  test('texto de oração comum passa limpo', () => {
    for (const text of [
      'Hoje orei pela minha família. Amém!',
      'Dia 3: Deus é fiel, 100 dias de oração',
      'Obrigado, irmãos, pela intercessão.',
      'Que a paz do Senhor esteja com vocês',
      'Computador quebrou, mas a fé não',
    ]) {
      expect(textVerdict(text, terms)).toEqual({ hold: null, matched: [] });
    }
  });

  test('segura termo, também disfarçado (acento, repetição, números, letras separadas)', () => {
    for (const text of ['que MERDA', 'que merdaaaa', 'p0rr4', 'isso é uma p u t a sacanagem', 'Pôrra']) {
      expect(textVerdict(text, terms).hold).toBe('termo');
    }
  });

  test('link e contato como o filtro do banco', () => {
    expect(textVerdict('veja www.site.com', terms).hold).toBe('link');
    expect(textVerdict('https://x.io/a', terms).hold).toBe('link');
    // Como no banco: e-mail terminado em .com/.br cai antes em 'link' (segura do mesmo jeito).
    expect(textVerdict('me chama: ana@exemplo.com', terms).hold).toBe('link');
    expect(textVerdict('me chama: ana@igreja.xyz', terms).hold).toBe('contato');
    expect(textVerdict('(11) 98765-4321', terms).hold).toBe('contato');
  });
});

// ---------------------------------------------------------------------------
describe('moderate-text', () => {
  function deps(overrides: Partial<ModerateTextDeps> = {}): ModerateTextDeps {
    return {
      cronSecret: SECRET,
      configuredTerms: ['merda'],
      syncTerms: jest.fn(async () => ({ added: 1, removed: 0 })),
      storedTerms: jest.fn(async () => ['fofoca']),
      getContent: jest.fn(async () => ({ body: 'que fofoca', status: 'published' })),
      hold: jest.fn(async () => true),
      isModerator: jest.fn(async () => true),
      sqlVerdict: jest.fn(async () => null),
      log: jest.fn(),
      ...overrides,
    };
  }
  const cron = (body: unknown) => request({ headers: { 'x-cron-secret': SECRET }, body });

  test('sync_terms e recheck exigem o segredo', async () => {
    const d = deps();
    for (const action of ['sync_terms', 'recheck']) {
      const res = await handleModerateText(request({ body: { action, kind: 'post', id: POST } }), d);
      expect(res.status).toBe(401);
    }
    expect(d.syncTerms).not.toHaveBeenCalled();
    expect(d.getContent).not.toHaveBeenCalled();
  });

  test('sync_terms grava a lista configurada; lista vazia é recusada', async () => {
    const d = deps();
    expect((await handleModerateText(cron({ action: 'sync_terms' }), d)).body).toEqual({ added: 1, removed: 0, total: 1 });
    expect(d.syncTerms).toHaveBeenCalledWith(['merda']);
    const empty = deps({ configuredTerms: [] });
    expect((await handleModerateText(cron({ action: 'sync_terms' }), empty)).status).toBe(400);
    expect(empty.syncTerms).not.toHaveBeenCalled();
  });

  test('recheck usa também os termos da igreja e segura o texto publicado; a resposta não traz o texto', async () => {
    const d = deps();
    const res = await handleModerateText(cron({ action: 'recheck', kind: 'post', id: POST }), d);
    expect(res.body).toEqual({ held: true, reason: 'termo' });
    expect(d.hold).toHaveBeenCalledWith('post', POST, 'termo');
    expect(JSON.stringify(res.body)).not.toContain('fofoca');
  });

  test('recheck não mexe em conteúdo limpo, fora do ar ou só com foto', async () => {
    for (const content of [
      { body: 'Amém, irmã', status: 'published' },
      { body: 'que merda', status: 'in_review' },
      { body: null, status: 'published' },
      null,
    ]) {
      const d = deps({ getContent: jest.fn(async () => content) });
      expect((await handleModerateText(cron({ action: 'recheck', kind: 'comment', id: POST }), d)).body).toEqual({
        held: false,
      });
      expect(d.hold).not.toHaveBeenCalled();
    }
  });

  test('recheck recusa tipo ou id estranho', async () => {
    const d = deps();
    expect((await handleModerateText(cron({ action: 'recheck', kind: 'user', id: POST }), d)).status).toBe(400);
    expect((await handleModerateText(cron({ action: 'recheck', kind: 'post', id: 'x' }), d)).status).toBe(400);
  });

  test('check: só moderação, com o veredito das duas camadas', async () => {
    const auth = { Authorization: 'Bearer abc.def.ghi' };
    const d = deps({ sqlVerdict: jest.fn(async () => 'termo') });
    const res = await handleModerateText(request({ headers: auth, body: { action: 'check', text: 'que merdaaa' } }), d);
    expect(res.body).toEqual({ hold: 'termo', matched: ['merda'], sql_hold: 'termo' });

    const member = deps({ isModerator: jest.fn(async () => false) });
    expect((await handleModerateText(request({ headers: auth, body: { action: 'check', text: 'x' } }), member)).status).toBe(403);
    expect((await handleModerateText(request({ body: { action: 'check', text: 'x' } }), d)).status).toBe(403);
  });

  test('ação desconhecida', async () => {
    expect((await handleModerateText(cron({ action: 'apagar_tudo' }), deps())).status).toBe(400);
  });
});
