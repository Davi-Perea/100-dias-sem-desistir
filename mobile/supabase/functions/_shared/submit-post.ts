/**
 * Handler da Edge Function `submit-post` (F5, feedback do fundador de
 * 2026-09-22). Sem nada de Deno: testado no Jest.
 *
 * Ações (corpo JSON):
 *  - { post: {...} }  (com o token da pessoa): cria o post pela RPC
 *    — inclusive o `accept_terms` da linha embaixo do botão de publicar
 *    (2026-09-22): ele segue para a RPC e é registrado na MESMA transação que
 *    cria o post. Sem tela de aceite no meio, e sem post sem aceite.
 *    create_community_post AGINDO COMO A PESSOA (todas as regras do banco valem:
 *    consentimento, perfil, fotos dela, limites). Se o post ficou em análise só
 *    por causa das fotos e há filtro de imagem configurado, manda cada foto ao
 *    provedor e grava o resultado (service_record_photo_checks): tudo limpo →
 *    'published' na hora; suspeita ou erro → continua 'in_review' para uma
 *    pessoa. Sem filtro configurado → 'in_review' (aprovação humana, como antes).
 *  - { action: 'sweep' } (segredo x-cron-secret): retoma posts que ficaram
 *    esperando o filtro (a função caiu, o provedor ficou fora do ar).
 *
 * A resposta nunca traz os rótulos do provedor (só a moderação os vê) nem
 * texto de erro do banco: só um código curto e, quando é regra do banco, o
 * SQLSTATE (CM00x, 22023, P0002, 42501) para o app traduzir.
 */
import { asObject, bearerToken, hasCronSecret, reply, UUID_RE } from './http.ts';
import type { EdgeRequest, EdgeResponse, Json } from './http.ts';
import type { ImageModerator } from './image-moderation.ts';

export type CheckVerdict = 'limpa' | 'suspeita' | 'erro';
export type CheckResult = { photo_path: string; verdict: CheckVerdict; labels: string[] };

/** Erro de RPC com o SQLSTATE (ou o código do PostgREST). */
export class DbError extends Error {
  readonly code: string | null;
  constructor(code: string | null) {
    super(`rpc falhou: ${code ?? 'sem código'}`);
    this.name = 'DbError';
    this.code = code;
  }
}

export type SubmitPostDeps = {
  cronSecret: string | null | undefined;
  /** null = sem filtro de imagem configurado (a foto espera uma pessoa). */
  moderator: ImageModerator | null;
  /** create_community_post com o token da pessoa. Lança DbError. */
  createPost(token: string, args: Json): Promise<{ post_id: string; status: string } | null>;
  /** service_post_photos_for_check (chave de serviço). */
  photosForCheck(postId: string): Promise<string[]>;
  /** Baixa a foto do bucket privado (chave de serviço). */
  downloadPhoto(path: string): Promise<Uint8Array>;
  /** service_record_photo_checks (chave de serviço). Devolve o estado do post. */
  recordChecks(postId: string, provider: string, results: CheckResult[]): Promise<string | null>;
  /** service_pending_photo_posts (chave de serviço). */
  pendingPosts(max: number): Promise<string[]>;
  log(event: string, data?: Record<string, unknown>): void;
};

const PHOTO_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const PASSTHROUGH = new Set(['CM001', 'CM002', 'CM003', 'CM004', 'CM005', 'CM006', 'CM007', '22023', 'P0002', '42501']);
/** Token vencido ou inválido segundo o PostgREST. */
const AUTH_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

function isNullableString(value: unknown, max: number): value is string | null | undefined {
  return value === null || value === undefined || (typeof value === 'string' && value.length <= max);
}
function isNullableInt(value: unknown, min: number, max: number): value is number | null | undefined {
  return value === null || value === undefined || (Number.isInteger(value) && (value as number) >= min && (value as number) <= max);
}

const SHA256_RE = /^[0-9a-f]{64}$/i;
/** Chaves do aceite embutido (private.apply_inline_accept). */
const ACCEPT_STRINGS = ['name', 'rules_version', 'rules_sha256', 'consent_version', 'consent_sha256', 'app_version'];

/**
 * O aceite que vem JUNTO com o post (decisão do fundador de 2026-09-22: não há
 * tela de aceite). Aqui só a forma: `confirms_16` obrigatório, chaves conhecidas,
 * strings curtas e hash com cara de sha256. Quem confere versão e hash contra o
 * texto vigente é o banco (private.accept_community_terms, CM005) — e é ele que
 * grava a prova. `undefined` devolve null: quem já aceitou não manda nada.
 */
export function sanitizeAcceptTerms(raw: unknown): Json | null | false {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return false;
  const accept = raw as Record<string, unknown>;
  if (accept.confirms_16 !== true) return false;
  const out: Record<string, unknown> = { confirms_16: true };
  for (const key of ACCEPT_STRINGS) {
    const value = accept[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || value.length === 0 || value.length > 200) return false;
    if (key.endsWith('_sha256') && !SHA256_RE.test(value)) return false;
    out[key] = value;
  }
  for (const key of Object.keys(accept)) {
    if (key !== 'confirms_16' && !ACCEPT_STRINGS.includes(key)) return false;
  }
  return out as Json;
}

/**
 * Só as chaves conhecidas, com tipo e tamanho grosseiros. A regra fina (e a de
 * verdade) é do banco; isto só impede lixo de chegar à RPC.
 */
export function sanitizePostArgs(raw: unknown): Json | null {
  const post = asObject(raw);
  const photos = post.post_photo_paths;
  const accept = sanitizeAcceptTerms(post.accept_terms);
  if (accept === false) return null;
  if (
    !isNullableString(post.post_body, 4000) ||
    !isNullableString(post.post_activity, 20) ||
    !isNullableString(post.post_verse_book, 3) ||
    !isNullableString(post.post_audience, 20) ||
    !isNullableInt(post.post_day, 1, 100) ||
    !isNullableInt(post.post_verse_chapter, 1, 150) ||
    !isNullableInt(post.post_verse_start, 1, 176) ||
    !isNullableInt(post.post_verse_end, 1, 176)
  ) {
    return null;
  }
  if (photos !== null && photos !== undefined) {
    if (!Array.isArray(photos) || photos.length > 4 || photos.some((p) => typeof p !== 'string' || !PHOTO_RE.test(p))) {
      return null;
    }
  }
  return {
    post_body: post.post_body ?? null,
    post_photo_paths: Array.isArray(photos) && photos.length > 0 ? photos : null,
    post_day: post.post_day ?? null,
    post_activity: post.post_activity ?? 'livre',
    post_verse_book: post.post_verse_book ?? null,
    post_verse_chapter: post.post_verse_chapter ?? null,
    post_verse_start: post.post_verse_start ?? null,
    post_verse_end: post.post_verse_end ?? null,
    post_audience: post.post_audience ?? 'igreja',
    accept_terms: accept,
  };
}

/**
 * Passa as fotos do post pelo filtro e grava. Nunca lança: falha em qualquer
 * ponto deixa o post em análise (uma pessoa decide). Devolve o estado novo, ou
 * null se nada foi gravado.
 */
export async function checkPostPhotos(postId: string, deps: SubmitPostDeps): Promise<string | null> {
  const moderator = deps.moderator;
  if (!moderator) return null;
  try {
    const paths = await deps.photosForCheck(postId);
    if (paths.length === 0) return null;
    const results: CheckResult[] = [];
    for (const path of paths) {
      try {
        const verdict = await moderator.check(await deps.downloadPhoto(path));
        results.push({ photo_path: path, verdict: verdict.verdict, labels: verdict.labels });
      } catch {
        results.push({ photo_path: path, verdict: 'erro', labels: [] });
      }
    }
    const status = await deps.recordChecks(postId, moderator.name, results);
    deps.log('photos_checked', {
      photos: results.length,
      suspect: results.filter((r) => r.verdict === 'suspeita').length,
      errors: results.filter((r) => r.verdict === 'erro').length,
      published: status === 'published',
    });
    return status;
  } catch {
    deps.log('photo_check_failed');
    return null;
  }
}

export async function handleSubmitPost(req: EdgeRequest, deps: SubmitPostDeps): Promise<EdgeResponse> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const body = asObject(await req.json());

  if (body.action === 'sweep') {
    if (!hasCronSecret(req, deps.cronSecret)) return reply(401, { error: 'unauthorized' });
    if (!deps.moderator) return reply(200, { processed: 0, published: 0, reason: 'no_provider' });
    let ids: string[];
    try {
      ids = (await deps.pendingPosts(20)).filter((id) => UUID_RE.test(id));
    } catch {
      return reply(500, { error: 'sweep_failed' });
    }
    let published = 0;
    for (const id of ids) {
      if ((await checkPostPhotos(id, deps)) === 'published') published += 1;
    }
    return reply(200, { processed: ids.length, published });
  }

  if (body.action !== undefined && body.action !== 'submit') return reply(400, { error: 'unknown_action' });

  const token = bearerToken(req);
  if (!token) return reply(401, { error: 'unauthorized' });
  const args = sanitizePostArgs(body.post);
  if (!args) return reply(400, { error: 'invalid_input' });

  let created: { post_id: string; status: string } | null;
  try {
    created = await deps.createPost(token, args);
  } catch (error) {
    const code = error instanceof DbError ? error.code : null;
    if (code && AUTH_CODES.has(code)) return reply(401, { error: 'unauthorized' });
    if (code && PASSTHROUGH.has(code)) return reply(400, { error: 'rejected', code });
    deps.log('create_failed', { code: code ?? 'desconhecido' });
    return reply(500, { error: 'create_failed' });
  }
  if (!created || typeof created.post_id !== 'string' || !UUID_RE.test(created.post_id)) {
    return reply(500, { error: 'create_failed' });
  }

  let status = created.status;
  let photoCheck: 'sem_filtro' | 'feito' | null = null;
  if (status === 'in_review' && args.post_photo_paths) {
    if (!deps.moderator) {
      photoCheck = 'sem_filtro';
    } else {
      const after = await checkPostPhotos(created.post_id, deps);
      if (after) status = after;
      photoCheck = 'feito';
    }
  }
  return reply(200, { post_id: created.post_id, status, photo_check: photoCheck });
}
