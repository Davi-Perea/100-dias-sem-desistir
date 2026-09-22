/**
 * Edge Function submit-post e o filtro automático de imagem (F5), com
 * dependências FALSAS (sem Deno, sem banco, sem AWS).
 *
 * PROVA: a assinatura AWS SigV4 (vetor oficial "get-vanilla" da suíte de testes
 * da AWS), o pedido e a leitura do DetectModerationLabels, a regra conservadora
 * do veredito, a configuração por segredo (sem segredo = sem filtro) e o
 * handler: quem é aceito, o que vai para a RPC, quando publica na hora e quando
 * fica em análise. NÃO PROVA: a AWS de verdade (nem que o Rekognition atende em
 * sa-east-1), o runtime Deno nem o SQL (esse é do pgTAP 15).
 */
import { createHash, createHmac } from 'crypto';

import type { EdgeRequest } from '../_shared/http.ts';
import {
  imageModeratorFromEnv,
  labelsFromResponse,
  rekognitionModerator,
  signAwsV4,
  toBase64,
} from '../_shared/image-moderation.ts';
import type { CryptoDeps, FetchLike, ImageModerator, ModeratorDeps } from '../_shared/image-moderation.ts';
import { DbError, handleSubmitPost, sanitizeAcceptTerms, sanitizePostArgs } from '../_shared/submit-post.ts';
import type { CheckResult, SubmitPostDeps } from '../_shared/submit-post.ts';

const nodeCrypto: CryptoDeps = {
  sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()),
  hmacSha256: async (key, data) => new Uint8Array(createHmac('sha256', key).update(data).digest()),
};

const SECRET = 'x'.repeat(40);
const POST_ID = '20000000-0000-4000-8000-000000000001';
const PHOTO_A = 'aaaaaaaa-0000-4000-8000-000000000001.jpg';
const PHOTO_B = 'aaaaaaaa-0000-4000-8000-000000000002.jpg';

function request(init: { method?: string; headers?: Record<string, string>; body?: unknown }): EdgeRequest {
  const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: init.method ?? 'POST',
    header: (name) => headers[name.toLowerCase()] ?? null,
    json: async () => init.body ?? null,
  };
}

// ---------------------------------------------------------------------------
describe('AWS SigV4', () => {
  test('vetor oficial get-vanilla da suíte de testes SigV4 da AWS', async () => {
    const headers = await signAwsV4(
      { method: 'GET', host: 'example.amazonaws.com', path: '/', region: 'us-east-1', service: 'service', headers: {}, body: '' },
      { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' },
      new Date(Date.UTC(2015, 7, 30, 12, 36, 0)),
      nodeCrypto,
    );
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, ' +
        'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
    expect(headers['x-amz-date']).toBe('20150830T123600Z');
    // 'host' é assinado mas não vai no fetch (o fetch põe o da URL).
    expect(headers.host).toBeUndefined();
  });

  test('credencial temporária assina e manda o x-amz-security-token', async () => {
    const headers = await signAwsV4(
      { method: 'POST', host: 'h.amazonaws.com', path: '/', region: 'sa-east-1', service: 'rekognition', headers: {}, body: '{}' },
      { accessKeyId: 'AKID', secretAccessKey: 'segredo', sessionToken: 'tok' },
      new Date(Date.UTC(2026, 8, 22)),
      nodeCrypto,
    );
    expect(headers['x-amz-security-token']).toBe('tok');
    expect(headers.authorization).toContain('SignedHeaders=host;x-amz-date;x-amz-security-token');
  });

  test('base64 igual ao do Node', () => {
    for (const bytes of [new Uint8Array([]), new Uint8Array([1]), new Uint8Array([1, 2]), new Uint8Array([255, 0, 128, 7])]) {
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });
});

// ---------------------------------------------------------------------------
describe('Amazon Rekognition DetectModerationLabels', () => {
  function moderatorWith(respond: () => { ok: boolean; status: number; body: unknown }) {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body });
      const r = respond();
      return { ok: r.ok, status: r.status, json: async () => r.body };
    };
    const deps: ModeratorDeps = { fetch, crypto: nodeCrypto, now: () => new Date(Date.UTC(2026, 8, 22, 10)) };
    const moderator = rekognitionModerator(
      { accessKeyId: 'AKID', secretAccessKey: 'segredo', region: 'sa-east-1', minConfidence: 50 },
      deps,
    );
    return { moderator, calls };
  }

  test('pedido: região, alvo, JSON com a imagem em base64 e a confiança mínima, assinado', async () => {
    const { moderator, calls } = moderatorWith(() => ({ ok: true, status: 200, body: { ModerationLabels: [] } }));
    await expect(moderator.check(new Uint8Array([0xff, 0xd8, 0xff]))).resolves.toEqual({ verdict: 'limpa', labels: [] });
    expect(calls[0].url).toBe('https://rekognition.sa-east-1.amazonaws.com/');
    expect(calls[0].headers['x-amz-target']).toBe('RekognitionService.DetectModerationLabels');
    expect(calls[0].headers['content-type']).toBe('application/x-amz-json-1.1');
    expect(calls[0].headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\/20260922\/sa-east-1\/rekognition\/aws4_request/);
    expect(JSON.parse(calls[0].body)).toEqual({ Image: { Bytes: '/9j/' }, MinConfidence: 50 });
  });

  test('qualquer rótulo acima da confiança mínima = suspeita (vai para uma pessoa)', async () => {
    const { moderator } = moderatorWith(() => ({
      ok: true,
      status: 200,
      body: { ModerationLabels: [{ Name: 'Graphic Violence', ParentName: 'Violence', Confidence: 91.2 }] },
    }));
    await expect(moderator.check(new Uint8Array([1]))).resolves.toEqual({
      verdict: 'suspeita',
      labels: ['Graphic Violence', 'Violence'],
    });
  });

  test('rótulo abaixo da confiança mínima não conta; resposta sem a lista é erro', () => {
    expect(labelsFromResponse({ ModerationLabels: [{ Name: 'Alcohol', ParentName: '', Confidence: 20 }] }, 50)).toEqual([]);
    expect(() => labelsFromResponse({}, 50)).toThrow();
  });

  test('provedor fora do ar (HTTP 500) lança: a foto não é liberada', async () => {
    const { moderator } = moderatorWith(() => ({ ok: false, status: 500, body: {} }));
    await expect(moderator.check(new Uint8Array([1]))).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
describe('configuração por segredo', () => {
  const deps: ModeratorDeps = { fetch: jest.fn(), crypto: nodeCrypto, now: () => new Date() };
  const envOf = (vars: Record<string, string>) => (name: string) => vars[name] ?? null;

  test('sem provedor, provedor desconhecido ou chaves faltando: sem filtro (aprovação humana)', () => {
    expect(imageModeratorFromEnv(envOf({}), deps)).toBeNull();
    expect(imageModeratorFromEnv(envOf({ MODERATION_PROVIDER: 'outro' }), deps)).toBeNull();
    expect(imageModeratorFromEnv(envOf({ MODERATION_PROVIDER: 'aws-rekognition', AWS_ACCESS_KEY_ID: 'a' }), deps)).toBeNull();
    expect(
      imageModeratorFromEnv(
        envOf({ MODERATION_PROVIDER: 'aws-rekognition', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 'b', MODERATION_AWS_REGION: 'x;y' }),
        deps,
      ),
    ).toBeNull();
  });

  test('com provedor e chaves: Rekognition, em sa-east-1 por padrão', async () => {
    const fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ModerationLabels: [] }) }));
    const moderator = imageModeratorFromEnv(
      envOf({ MODERATION_PROVIDER: 'aws-rekognition', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 'b' }),
      { ...deps, fetch },
    );
    expect(moderator?.name).toBe('aws-rekognition');
    await moderator?.check(new Uint8Array([1]));
    expect(fetch).toHaveBeenCalledWith('https://rekognition.sa-east-1.amazonaws.com/', expect.anything());
  });
});

// ---------------------------------------------------------------------------
describe('submit-post', () => {
  function deps(overrides: Partial<SubmitPostDeps> = {}) {
    const recorded: { postId: string; provider: string; results: CheckResult[] }[] = [];
    const base: SubmitPostDeps = {
      cronSecret: SECRET,
      moderator: null,
      createPost: jest.fn(async () => ({ post_id: POST_ID, status: 'in_review' })),
      photosForCheck: jest.fn(async () => [PHOTO_A, PHOTO_B]),
      downloadPhoto: jest.fn(async () => new Uint8Array([0xff, 0xd8])),
      recordChecks: jest.fn(async (postId: string, provider: string, results: CheckResult[]) => {
        recorded.push({ postId, provider, results });
        return results.every((r) => r.verdict === 'limpa') ? 'published' : 'in_review';
      }),
      pendingPosts: jest.fn(async () => [POST_ID]),
      log: jest.fn(),
    };
    return { deps: { ...base, ...overrides }, recorded };
  }
  const clean: ImageModerator = { name: 'aws-rekognition', check: jest.fn(async () => ({ verdict: 'limpa' as const, labels: [] })) };
  const withPhotos = { post: { post_body: 'Culto de hoje', post_photo_paths: [PHOTO_A, PHOTO_B], post_activity: 'livre' } };
  const auth = { Authorization: 'Bearer token.da.pessoa' };

  test('sem token: 401, e nada é criado', async () => {
    const { deps: d } = deps();
    await expect(handleSubmitPost(request({ body: withPhotos }), d)).resolves.toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(d.createPost).not.toHaveBeenCalled();
  });

  test('entrada estranha (5 fotos, caminho com barra, dia 0) nem chega à RPC', async () => {
    const { deps: d } = deps();
    for (const post of [
      { post_photo_paths: [PHOTO_A, PHOTO_B, PHOTO_A, PHOTO_B, PHOTO_A] },
      { post_photo_paths: ['../outra/foto.jpg'] },
      { post_body: 'oi', post_day: 0 },
    ]) {
      await expect(handleSubmitPost(request({ headers: auth, body: { post } }), d)).resolves.toMatchObject({ status: 400 });
    }
    expect(d.createPost).not.toHaveBeenCalled();
    expect(sanitizePostArgs({ post_body: 'oi', user_id: 'vazou' })).not.toHaveProperty('user_id');
  });

  test('cria COMO A PESSOA (token dela) e repassa só as chaves conhecidas', async () => {
    const { deps: d } = deps();
    await handleSubmitPost(request({ headers: auth, body: withPhotos }), d);
    expect(d.createPost).toHaveBeenCalledWith('token.da.pessoa', {
      post_body: 'Culto de hoje',
      post_photo_paths: [PHOTO_A, PHOTO_B],
      post_day: null,
      post_activity: 'livre',
      post_verse_book: null,
      post_verse_chapter: null,
      post_verse_start: null,
      post_verse_end: null,
      post_audience: 'igreja',
      // Quem já aceitou não manda nada: null, e a RPC segue como sempre.
      accept_terms: null,
    });
  });

  /**
   * Aceite NO ATO (decisão do fundador de 2026-09-22): post COM FOTO passa por
   * aqui, então o aceite da linha embaixo do botão tem de atravessar esta função
   * intacto até a RPC — senão a primeira publicação com foto falharia por falta
   * de consentimento e o aceite se perderia no caminho.
   */
  test('o aceite da linha embaixo do botão atravessa até a RPC', async () => {
    const { deps: d } = deps();
    const accept = {
      confirms_16: true,
      name: 'Ana',
      rules_version: 'regras-1',
      rules_sha256: 'ab'.repeat(32),
      consent_version: 'consent-1',
      consent_sha256: 'cd'.repeat(32),
      app_version: '1.0.0 (7)',
    };
    await handleSubmitPost(request({ headers: auth, body: { post: { ...withPhotos.post, accept_terms: accept } } }), d);
    expect(d.createPost).toHaveBeenCalledWith('token.da.pessoa', expect.objectContaining({ accept_terms: accept }));
  });

  test('aceite malformado é recusado aqui (400), sem chegar ao banco', async () => {
    const { deps: d } = deps();
    for (const accept_terms of [
      { name: 'Ana' }, // sem confirms_16: nada de aceite implícito
      { confirms_16: 'sim' },
      { confirms_16: true, rules_sha256: 'não é hash' },
      { confirms_16: true, chave_inventada: 'x' },
      'sim',
      [],
    ]) {
      await expect(
        handleSubmitPost(request({ headers: auth, body: { post: { ...withPhotos.post, accept_terms } } }), d),
      ).resolves.toMatchObject({ status: 400 });
    }
    expect(d.createPost).not.toHaveBeenCalled();
    expect(sanitizeAcceptTerms(undefined)).toBeNull();
    expect(sanitizeAcceptTerms({ confirms_16: true })).toEqual({ confirms_16: true });
  });

  test('regra do banco (perfil incompleto) volta com o SQLSTATE; token vencido vira 401; o resto é genérico', async () => {
    const reject = (code: string | null) => deps({ createPost: jest.fn(async () => Promise.reject(new DbError(code))) }).deps;
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), reject('CM007'))).resolves.toEqual({
      status: 400,
      body: { error: 'rejected', code: 'CM007' },
    });
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), reject('PGRST301'))).resolves.toMatchObject({
      status: 401,
    });
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), reject('XX000'))).resolves.toEqual({
      status: 500,
      body: { error: 'create_failed' },
    });
  });

  test('SEM filtro configurado: a foto fica em análise para uma pessoa (padrão seguro)', async () => {
    const { deps: d } = deps();
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), d)).resolves.toEqual({
      status: 200,
      body: { post_id: POST_ID, status: 'in_review', photo_check: 'sem_filtro' },
    });
    expect(d.photosForCheck).not.toHaveBeenCalled();
    expect(d.recordChecks).not.toHaveBeenCalled();
  });

  test('COM filtro e tudo limpo: publicado na hora', async () => {
    const { deps: d, recorded } = deps({ moderator: clean });
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), d)).resolves.toEqual({
      status: 200,
      body: { post_id: POST_ID, status: 'published', photo_check: 'feito' },
    });
    expect(recorded).toEqual([
      {
        postId: POST_ID,
        provider: 'aws-rekognition',
        results: [
          { photo_path: PHOTO_A, verdict: 'limpa', labels: [] },
          { photo_path: PHOTO_B, verdict: 'limpa', labels: [] },
        ],
      },
    ]);
  });

  test('uma foto suspeita ou com erro de download: fica em análise, com o motivo gravado para a moderação', async () => {
    const suspect: ImageModerator = {
      name: 'aws-rekognition',
      check: jest.fn().mockResolvedValueOnce({ verdict: 'suspeita', labels: ['Violence'] }),
    };
    const { deps: d, recorded } = deps({
      moderator: suspect,
      downloadPhoto: jest.fn().mockResolvedValueOnce(new Uint8Array([1])).mockRejectedValueOnce(new Error('sumiu')),
    });
    const response = await handleSubmitPost(request({ headers: auth, body: withPhotos }), d);
    expect(response.body).toMatchObject({ status: 'in_review' });
    expect(JSON.stringify(response.body)).not.toContain('Violence'); // rótulo é só da moderação
    expect(recorded[0].results.map((r) => r.verdict)).toEqual(['suspeita', 'erro']);
  });

  test('texto limpo sem foto: não passa pelo filtro de imagem', async () => {
    const { deps: d } = deps({
      moderator: clean,
      createPost: jest.fn(async () => ({ post_id: POST_ID, status: 'published' })),
    });
    await expect(
      handleSubmitPost(request({ headers: auth, body: { post: { post_body: 'Li hoje.' } } }), d),
    ).resolves.toMatchObject({ status: 200, body: { status: 'published', photo_check: null } });
    expect(d.photosForCheck).not.toHaveBeenCalled();
  });

  test('falha ao gravar o resultado não derruba a publicação: fica em análise', async () => {
    const { deps: d } = deps({ moderator: clean, recordChecks: jest.fn(async () => Promise.reject(new Error('banco'))) });
    await expect(handleSubmitPost(request({ headers: auth, body: withPhotos }), d)).resolves.toMatchObject({
      status: 200,
      body: { status: 'in_review' },
    });
  });

  test('varredura: só com o segredo do cron; sem provedor não faz nada; com provedor retoma os pendentes', async () => {
    const { deps: none } = deps();
    await expect(handleSubmitPost(request({ body: { action: 'sweep' } }), none)).resolves.toMatchObject({ status: 401 });
    await expect(
      handleSubmitPost(request({ headers: { 'x-cron-secret': SECRET }, body: { action: 'sweep' } }), none),
    ).resolves.toEqual({ status: 200, body: { processed: 0, published: 0, reason: 'no_provider' } });
    const { deps: d } = deps({ moderator: clean });
    await expect(
      handleSubmitPost(request({ headers: { 'x-cron-secret': SECRET }, body: { action: 'sweep' } }), d),
    ).resolves.toEqual({ status: 200, body: { processed: 1, published: 1 } });
  });

  test('método e ação desconhecidos', async () => {
    const { deps: d } = deps();
    await expect(handleSubmitPost(request({ method: 'GET' }), d)).resolves.toMatchObject({ status: 405 });
    await expect(handleSubmitPost(request({ headers: auth, body: { action: 'apagar' } }), d)).resolves.toMatchObject({
      status: 400,
    });
  });
});
