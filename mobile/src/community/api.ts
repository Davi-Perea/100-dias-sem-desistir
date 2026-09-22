import type { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { getSupabase } from '@/cloud/client';
import { COMMUNITY_ENABLED } from '@/config/features';

import { getDemoCommunityApi } from './demoApi';
import { communityError, toCommunityError } from './errors';
import { assertPhotoSafeToUpload, isPhotoPath, newPhotoPath, PHOTO_BUCKET, SIGNED_URL_TTL_SECONDS } from './photos';
import { isValidContactEmail, profileArgs, type ProfileUpdate } from './profile';
import type {
  ActivityItem,
  AmenFace,
  AvatarStatus,
  CommunityStatus,
  ContentStatus,
  DiaryFields,
  FeedCursor,
  FeedPage,
  FeedPost,
  FeedScope,
  HoldReason,
  MemberStatus,
  MyBlock,
  MyPost,
  NewPost,
  PostComment,
  PostKind,
  PublishResult,
  ReportReason,
  ReportTarget,
  TermsPurpose,
  VerseAttachment,
} from './types';
import { MAX_AMEN_FACES, POST_KINDS, REPORT_REASONS } from './types';
import {
  cleanText,
  isUuid,
  isValidCommentBody,
  isValidDisplayName,
  LIMITS,
  charLength,
  normalizeNewPost,
} from './validation';

/**
 * Cliente da Comunidade (V2). Tudo passa pelas RPCs; o app nunca lê as tabelas.
 *
 * `createCommunityApi` recebe um cliente mínimo (injetável nos testes) e só tem
 * funções que traduzem argumentos e respostas. `getCommunityApi()` devolve null
 * enquanto COMMUNITY_ENABLED estiver desligado: nada disto roda na V1.
 */

type Result<T> = { data: T | null; error: unknown };

/** O que o cliente da Comunidade precisa do supabase-js. */
export type CommunityClient = {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Result<unknown>>;
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: ArrayBuffer | Uint8Array,
        options: { contentType: string; upsert: boolean },
      ): PromiseLike<Result<unknown>>;
      createSignedUrls(
        paths: string[],
        expiresIn: number,
      ): PromiseLike<Result<{ path: string | null; signedUrl: string | null; error: string | null }[]>>;
      remove(paths: string[]): PromiseLike<Result<unknown>>;
    };
  };
  /**
   * Edge Functions (supabase.functions). Post com foto vai por submit-post, que
   * passa as fotos pelo filtro automático (F5). Sem isto, o post vai pela RPC e a
   * foto espera a aprovação humana (o padrão seguro).
   */
  functions?: FunctionsInvoker;
};

type Row = Record<string, unknown>;

const CONTENT_STATUSES: readonly ContentStatus[] = ['in_review', 'published', 'not_published', 'removed'];
const HOLD_REASONS: readonly HoldReason[] = ['foto', 'termo', 'link', 'contato', 'denuncia'];
const MEMBER_STATUSES: readonly MemberStatus[] = ['active', 'suspended', 'removed'];
const AVATAR_STATUSES: readonly AvatarStatus[] = ['none', 'in_review', 'approved', 'rejected'];

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function bool(value: unknown): boolean {
  return value === true;
}
function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
/** Estado desconhecido nunca vira "publicado": o lado seguro é "em análise". */
function contentStatus(value: unknown): ContentStatus {
  return oneOf(value, CONTENT_STATUSES) ?? 'in_review';
}
function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function toVerse(row: Row): VerseAttachment | null {
  const book = str(row.verse_book);
  const chapter = num(row.verse_chapter);
  const verseStart = num(row.verse_start);
  if (!book || chapter === null || verseStart === null) return null;
  return { book, chapter, verseStart, verseEnd: num(row.verse_end) };
}

function toPhotoPaths(row: Row): string[] {
  const listed = Array.isArray(row.photo_paths)
    ? row.photo_paths.filter((p): p is string => typeof p === 'string' && isPhotoPath(p))
    : [];
  const first = str(row.photo_path);
  const paths = listed.length > 0 ? listed : first && isPhotoPath(first) ? [first] : [];
  return paths.slice(0, LIMITS.postPhotos);
}

/** Rostinhos de quem disse Amém: só nome, foto e se é o meu. Qualquer outra chave é ignorada. */
function toFaces(value: unknown): AmenFace[] {
  if (!Array.isArray(value)) return [];
  const faces: AmenFace[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const face = item as Row;
    const name = cleanText(str(face.name));
    if (!name) continue;
    faces.push({ name, avatarPath: str(face.avatar_path), isMine: bool(face.is_mine) });
  }
  return faces.slice(0, MAX_AMEN_FACES);
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Campos do diário compartilhado (F1, F3, F6). 'livre' vira kind null. */
function toDiary(row: Row): DiaryFields {
  const audience: FeedScope = row.audience === 'ministerio' ? 'ministerio' : 'igreja';
  const amenFaces = toFaces(row.amen_faces);
  return {
    kind: oneOf<PostKind>(row.activity, POST_KINDS),
    verse: toVerse(row),
    photoPaths: toPhotoPaths(row),
    audience,
    audienceMinistry: audience === 'ministerio' ? str(row.audience_ministry) : null,
    // O número nunca fica menor que os rostos que vieram.
    amenCount: Math.max(count(row.amen_count), amenFaces.length),
    amenFaces,
    commentCount: count(row.comment_count),
  };
}

export function toFeedPost(row: Row): FeedPost & DiaryFields {
  const diary = toDiary(row);
  return {
    ...diary,
    postId: str(row.post_id) ?? '',
    body: str(row.body),
    photoPath: diary.photoPaths[0] ?? null,
    dayNumber: num(row.day_number),
    publishedAt: str(row.published_at) ?? '',
    authorName: str(row.author_name) ?? '',
    authorMinistry: str(row.author_ministry),
    authorAvatarPath: str(row.author_avatar_path),
    isMine: bool(row.is_mine),
    iSaidAmen: bool(row.i_said_amen),
  };
}

/** Página do feed. Menos de LIMITS.feedPage itens = acabou (o feed tem fim). */
export function toFeedPage(data: unknown): FeedPage {
  const posts = rows(data).map(toFeedPost);
  const ended = posts.length < LIMITS.feedPage;
  const last = posts[posts.length - 1];
  return {
    posts,
    ended,
    nextCursor: ended || !last ? null : { beforePublishedAt: last.publishedAt, beforePost: last.postId },
  };
}

export function toComment(row: Row): PostComment {
  return {
    commentId: str(row.comment_id) ?? '',
    body: str(row.body) ?? '',
    status: contentStatus(row.status),
    createdAt: str(row.created_at) ?? '',
    authorName: str(row.author_name) ?? '',
    isMine: bool(row.is_mine),
  };
}

export function toMyPost(row: Row): MyPost & DiaryFields {
  const decidedBy = row.decided_by === 'pessoa' || row.decided_by === 'automatico' ? row.decided_by : null;
  const diary = toDiary(row);
  return {
    ...diary,
    postId: str(row.post_id) ?? '',
    body: str(row.body),
    photoPath: diary.photoPaths[0] ?? null,
    dayNumber: num(row.day_number),
    status: contentStatus(row.status),
    holdReason: oneOf(row.hold_reason, HOLD_REASONS),
    createdAt: str(row.created_at) ?? '',
    publishedAt: str(row.published_at),
    decidedBy,
    reason: oneOf(row.reason, REPORT_REASONS),
    noteForAuthor: str(row.note_for_author),
  };
}

export function toStatus(data: unknown): CommunityStatus {
  const row = rows(data)[0] ?? {};
  const avatarPath = str(row.avatar_path);
  const profile = {
    displayName: str(row.display_name),
    ministry: str(row.ministry),
    ministryAnswered: bool(row.ministry_answered),
    bio: str(row.bio),
    avatarPath,
    // Estado desconhecido com foto vira "em análise" (nunca "aprovada").
    avatarStatus: oneOf(row.avatar_status, AVATAR_STATUSES) ?? (avatarPath ? 'in_review' : 'none'),
    ageConfirmed: bool(row.age_confirmed),
    contactEmail: str(row.contact_email),
    newsOptIn: bool(row.news_opt_in),
  };
  return {
    isMember: bool(row.is_member),
    memberStatus: oneOf(row.member_status, MEMBER_STATUSES),
    displayName: profile.displayName,
    profile,
    profileComplete: bool(row.profile_complete),
    canPublish: bool(row.can_publish),
    needsPublishConsent: row.needs_publish_consent !== false,
    needsRules: row.needs_rules !== false,
    publishConsentVersion: str(row.publish_consent_version) ?? 'PENDENTE',
    rulesVersion: str(row.rules_version) ?? 'PENDENTE',
    isModerator: bool(row.is_moderator),
    hasNewActivity: bool(row.has_new_activity),
  };
}

/** Quem disse Amém sem ter escolhido nome ainda. */
export const ANONYMOUS_ACTOR = 'Alguém da comunidade';

/** Atividade (F8). Linha estranha é descartada; nunca vira item inventado. */
export function toActivity(row: Row): ActivityItem | null {
  const kind = row.kind === 'amen' ? 'amen' : row.kind === 'comentario' ? 'comment' : null;
  const activityId = str(row.activity_id);
  const postId = str(row.post_id);
  if (!kind || !activityId || !postId) return null;
  return {
    activityId,
    kind,
    postId,
    actorName: cleanText(str(row.actor_name)) ?? ANONYMOUS_ACTOR,
    actorAvatarPath: str(row.actor_avatar_path),
    at: str(row.created_at) ?? '',
    preview: kind === 'comment' ? str(row.preview) : null,
    unread: bool(row.unread),
  };
}

export const SUBMIT_POST_FUNCTION = 'submit-post';

/**
 * Argumentos de create_community_post (e do corpo de submit-post), validados no
 * aparelho com as mesmas regras do servidor (que confere tudo de novo).
 */
export function postArgs(input: NewPost): Record<string, unknown> {
  const post = normalizeNewPost(input, isPhotoPath);
  if (!post) throw communityError('invalid_input');
  return {
    post_body: post.body,
    post_photo_paths: post.photoPaths.length > 0 ? post.photoPaths : null,
    post_day: post.day,
    post_activity: post.kind ?? 'livre',
    post_verse_book: post.verse?.book ?? null,
    post_verse_chapter: post.verse?.chapter ?? null,
    post_verse_start: post.verse?.verseStart ?? null,
    post_verse_end: post.verse?.verseEnd ?? null,
    post_audience: post.audience,
  };
}

/** Códigos do banco que submit-post devolve em `code` (o resto vira erro genérico). */
const PASSTHROUGH_CODES = new Set(['CM001', 'CM002', 'CM003', 'CM004', 'CM005', 'CM006', 'CM007', '22023', 'P0002', '42501']);

function toPublishResult(data: unknown, idKey: 'post_id' | 'comment_id'): PublishResult {
  const row = rows(data)[0];
  const id = row ? str(row[idKey]) : null;
  if (!row || !id) throw communityError('unknown');
  return { id, status: contentStatus(row.status) };
}

function requireUuid(value: string | undefined): string {
  if (!value || !isUuid(value)) throw communityError('invalid_input');
  return value;
}

export type CommunityApi = ReturnType<typeof createCommunityApi>;
export type { ProfileUpdate } from './profile';


export function createCommunityApi(client: CommunityClient, deps: { randomUUID: () => string }) {
  async function call(fn: string, args?: Record<string, unknown>): Promise<unknown> {
    let result: Result<unknown>;
    try {
      result = await client.rpc(fn, args);
    } catch (error) {
      throw toCommunityError(error);
    }
    if (result.error) throw toCommunityError(result.error);
    return result.data;
  }

  return {
    async getStatus(): Promise<CommunityStatus> {
      return toStatus(await call('my_community_status'));
    },

    /** Registra o aceite do texto que a tela MOSTROU (versão + sha256 do texto exato). */
    async acceptTerms(input: {
      purpose: TermsPurpose;
      version: string;
      sha256: string;
      appVersion: string;
    }): Promise<void> {
      if (!/^[0-9a-f]{64}$/i.test(input.sha256) || !cleanText(input.version)) {
        throw communityError('invalid_input');
      }
      await call('accept_community_terms', {
        terms_purpose: input.purpose,
        terms_version: input.version,
        terms_sha256: input.sha256.toLowerCase(),
        client_app_version: input.appVersion,
      });
    },

    /**
     * Entra na comunidade SEM código (C3, decisão do fundador de 2026-09-22):
     * quem cria o perfil no app entra. Nome e o resto do perfil vêm depois, cada
     * passo pode ser pulado (C4). Sem declaração de idade na entrada (C1).
     * Quem está suspenso ou removido recebe 'blocked_from_community'.
     */
    async joinCommunity(input: { displayName?: string | null } = {}): Promise<void> {
      const name = cleanText(input.displayName);
      if (name && !isValidDisplayName(name)) throw communityError('invalid_input');
      await call('join_community', { chosen_name: name });
    },

    /**
     * Um ou mais passos do perfil. Campo ausente = não mexe. O nome não volta a
     * ficar vazio depois de escolhido; o ministério "Nenhum" é `noMinistry`.
     */
    async updateProfile(input: ProfileUpdate): Promise<void> {
      await call('set_community_profile', profileArgs(input));
    },

    /**
     * Foto de perfil JÁ PREPARADA (mesma regra da foto de post: reencodada, sem
     * EXIF/XMP/IPTC). Sobe, vira a foto de perfil e volta 'in_review': só depois
     * da moderação ela aparece para os outros.
     */
    async setAvatar(photo: { bytes: Uint8Array; uri: string }): Promise<AvatarStatus> {
      assertPhotoSafeToUpload(photo.bytes);
      const path = newPhotoPath(deps.randomUUID);
      let uploaded: Result<unknown>;
      try {
        uploaded = await client.storage.from(PHOTO_BUCKET).upload(path, photo.bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      } catch (error) {
        throw toCommunityError(error);
      }
      if (uploaded.error) throw toCommunityError(uploaded.error);
      try {
        const status = await call('set_community_avatar', { new_path: path });
        return oneOf(status, AVATAR_STATUSES) ?? 'in_review';
      } catch (error) {
        // Não deixa arquivo solto quando o perfil não aceitou a foto.
        client.storage.from(PHOTO_BUCKET).remove([path]).then(() => {}, () => {});
        throw error;
      }
    },

    async removeAvatar(): Promise<void> {
      await call('remove_community_avatar');
    },

    /** E-mail opcional e o aceite SEPARADO de novidades (N3). Sem e-mail, sem novidades. */
    async setContact(input: { email: string | null; wantsNews: boolean }): Promise<void> {
      const email = cleanText(input.email);
      if (email && !isValidContactEmail(email)) throw communityError('invalid_input');
      if (!email && input.wantsNews) throw communityError('invalid_input');
      await call('set_community_contact', { new_email: email ? email.toLowerCase() : null, wants_news: input.wantsNews });
    },

    async setDisplayName(name: string): Promise<void> {
      if (!isValidDisplayName(name)) throw communityError('invalid_input');
      await call('set_community_display_name', { new_name: name.trim() });
    },

    /**
     * Primeira página sem cursor; as seguintes com o nextCursor da anterior.
     * scope 'igreja' (padrão) = tudo o que eu posso ver; 'ministerio' = só o que
     * foi publicado para o meu ministério (F6).
     */
    async feedPage(cursor?: FeedCursor | null, options: { scope?: FeedScope } = {}): Promise<FeedPage> {
      const args: Record<string, unknown> = cursor
        ? { before_published_at: cursor.beforePublishedAt, before_post: cursor.beforePost }
        : {};
      if (options.scope === 'ministerio') args.feed_scope = 'ministerio';
      return toFeedPage(await call('community_feed', args));
    },

    /** Atividade no app (F8): Amém e comentários de outras pessoas nos meus posts. */
    async myActivity(): Promise<ActivityItem[]> {
      return rows(await call('my_community_activity'))
        .map(toActivity)
        .filter((item): item is ActivityItem => item !== null);
    },

    /** Marca toda a minha atividade como vista (apaga o ponto do sino). */
    async markActivitySeen(): Promise<void> {
      await call('mark_community_activity_seen');
    },

    async postComments(postId: string): Promise<PostComment[]> {
      const data = await call('community_post_comments', { target_post: requireUuid(postId) });
      return rows(data).map(toComment);
    },

    /** "Minhas publicações": inclusive em análise, não publicadas e removidas, com o motivo. */
    async myPosts(): Promise<MyPost[]> {
      return rows(await call('my_community_posts')).map(toMyPost);
    },

    /**
     * Publica o post do dia (F1): tipo, texto, até 4 fotos (já enviadas com
     * uploadPhoto), dia da campanha, versículo (só a referência) e público (F6).
     *
     * Sem foto: RPC direta; texto limpo volta 'published'. Com foto: submit-post,
     * que passa as fotos pelo filtro automático (F5) e devolve 'published' se tudo
     * estiver limpo, ou 'in_review' (suspeita, filtro não configurado, fora do ar).
     * Texto segurado pelo filtro de texto volta sempre 'in_review'.
     */
    async createPost(input: NewPost): Promise<PublishResult> {
      const args = postArgs(input);
      if (args.post_photo_paths && client.functions) {
        const viaFunction = await submitPost(client.functions, args);
        if (viaFunction) return viaFunction;
      }
      return toPublishResult(await call('create_community_post', args), 'post_id');
    },

    async deletePost(postId: string): Promise<void> {
      await call('delete_my_community_post', { target_post: requireUuid(postId) });
    },

    /** "Chegar na pessoa": comentar no post dela. Não existe mensagem privada. */
    async createComment(postId: string, body: string): Promise<PublishResult> {
      const cleaned = cleanText(body);
      if (!isValidCommentBody(cleaned)) throw communityError('invalid_input');
      const data = await call('create_community_comment', {
        target_post: requireUuid(postId),
        comment_body: cleaned,
      });
      return toPublishResult(data, 'comment_id');
    },

    async deleteComment(commentId: string): Promise<void> {
      await call('delete_my_community_comment', { target_comment: requireUuid(commentId) });
    },

    /** Liga/desliga o MEU Amém. Devolve só o meu novo estado; o número e os rostinhos (F3) vêm no feed. */
    async setAmen(postId: string, amen: boolean): Promise<boolean> {
      const data = await call('set_amen', { target_post: requireUuid(postId), amen });
      return data === true;
    },

    /** Denuncia a publicação, o comentário ou (person = true) quem escreveu. Devolve o recibo. */
    async report(input: ReportTarget & { person?: boolean; reason: ReportReason; details?: string | null }): Promise<string> {
      if (!REPORT_REASONS.includes(input.reason)) throw communityError('invalid_input');
      const details = cleanText(input.details);
      if (details && charLength(details) > LIMITS.reportDetails) throw communityError('invalid_input');
      const data = await call('report_community_content', {
        target_post: input.postId ? requireUuid(input.postId) : null,
        target_comment: input.commentId ? requireUuid(input.commentId) : null,
        report_person: input.person === true,
        report_reason: input.reason,
        report_details: details,
      });
      const id = str(data);
      if (!id) throw communityError('unknown');
      return id;
    },

    /** Bloqueia quem escreveu o post/comentário. O efeito vale nos dois sentidos. */
    async blockAuthor(target: ReportTarget): Promise<void> {
      await call('block_community_author', {
        target_post: target.postId ? requireUuid(target.postId) : null,
        target_comment: target.commentId ? requireUuid(target.commentId) : null,
      });
    },

    async unblock(blockId: string): Promise<void> {
      await call('unblock_community_member', { target_block: requireUuid(blockId) });
    },

    async myBlocks(): Promise<MyBlock[]> {
      return rows(await call('my_community_blocks')).map((row) => ({
        blockId: str(row.block_id) ?? '',
        displayName: str(row.display_name) ?? '',
        createdAt: str(row.created_at) ?? '',
      }));
    },

    /** Revoga o consentimento de publicar: tudo o que a pessoa publicou sai do ar (é apagado). */
    async revokePublishConsent(): Promise<void> {
      await call('revoke_community_publish_consent');
    },

    /** Sai da comunidade e apaga tudo o que fez nela (a conta do app continua). */
    async leaveCommunity(): Promise<void> {
      await call('leave_community');
    },

    /**
     * Sobe a foto JÁ PREPARADA (redimensionada e reencodada) e devolve o caminho
     * para createPost. Recusa JPEG com EXIF/XMP/IPTC antes de qualquer rede.
     */
    async uploadPhoto(bytes: Uint8Array): Promise<string> {
      assertPhotoSafeToUpload(bytes);
      const path = newPhotoPath(deps.randomUUID);
      let result: Result<unknown>;
      try {
        result = await client.storage.from(PHOTO_BUCKET).upload(path, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      } catch (error) {
        throw toCommunityError(error);
      }
      if (result.error) throw toCommunityError(result.error);
      return path;
    },

    /** Foto enviada que não virou post (a pessoa desistiu). */
    async discardPhoto(path: string): Promise<void> {
      if (!isPhotoPath(path)) throw communityError('invalid_input');
      const result = await client.storage.from(PHOTO_BUCKET).remove([path]);
      if (result.error) throw toCommunityError(result.error);
    },

    /**
     * URLs assinadas em lote (uma chamada por página do feed). Caminho que o
     * servidor recusou (post saiu do ar, bloqueio) simplesmente não volta.
     */
    async signPhotoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
      const unique = [...new Set(paths.filter((p): p is string => typeof p === 'string' && isPhotoPath(p)))];
      const urls = new Map<string, string>();
      if (unique.length === 0) return urls;
      const result = await client.storage.from(PHOTO_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
      if (result.error) throw toCommunityError(result.error);
      for (const item of result.data ?? []) {
        if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
      }
      return urls;
    },
  };
}

/**
 * sha256 (hex, minúsculo) do texto EXATO que a tela mostrou (consentimento ou
 * regras). O servidor só aceita o hash configurado para a versão vigente.
 */
export async function termsSha256(text: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
  return hex.toLowerCase();
}

/**
 * Chama submit-post (F5). Devolve null SÓ quando a função não está publicada no
 * projeto (404): aí o post vai pela RPC e a foto espera uma pessoa. Qualquer
 * outra falha vira erro: repetir pela RPC poderia criar o post duas vezes (a
 * função pode ter criado antes de cair).
 */
async function submitPost(functions: FunctionsInvoker, args: Record<string, unknown>): Promise<PublishResult | null> {
  let result: { data: unknown; error: unknown };
  try {
    result = await functions.invoke(SUBMIT_POST_FUNCTION, { body: { post: args } });
  } catch (error) {
    throw toCommunityError(error);
  }
  if (!result.error) {
    const row = (result.data ?? {}) as Row;
    const id = str(row.post_id);
    if (!id || !isUuid(id)) throw communityError('unknown');
    return { id, status: contentStatus(row.status) };
  }
  const name = (result.error as { name?: unknown } | null)?.name;
  if (name === 'FunctionsFetchError') throw communityError('offline');
  const context = (result.error as { context?: unknown } | null)?.context as { status?: unknown } | undefined;
  if (context?.status === 404) return null;
  const body = await edgeErrorBody(result.error);
  if (str(body?.error) === 'unauthorized') throw communityError('session_expired');
  const code = str(body?.code);
  if (code && PASSTHROUGH_CODES.has(code)) throw toCommunityError({ code });
  throw communityError('unknown');
}

/** Adapta o SupabaseClient ao cliente mínimo. */
export function communityClientFrom(supabase: SupabaseClient): CommunityClient {
  return {
    functions: supabase.functions,
    rpc: (fn, args) => supabase.rpc(fn, args),
    storage: {
      from: (bucket) => {
        const files = supabase.storage.from(bucket);
        return {
          upload: (path, body, options) => files.upload(path, body, options),
          createSignedUrls: (paths, expiresIn) => files.createSignedUrls(paths, expiresIn),
          remove: (paths) => files.remove(paths),
        };
      },
    },
  };
}

/**
 * Ponto de entrada das telas. null enquanto a Comunidade estiver desligada nesta
 * build (V1) ou sem nuvem configurada: a tela não deve nem existir nesse caso.
 */
export function getCommunityApi(
  deps: { enabled?: boolean; supabase?: SupabaseClient | null; randomUUID?: () => string } = {},
): CommunityApi | null {
  const enabled = deps.enabled ?? COMMUNITY_ENABLED;
  if (!enabled) return null;
  const supabase = deps.supabase === undefined ? getSupabase() : deps.supabase;
  if (!supabase) {
    // Demonstração em memória: só em build de desenvolvimento, com EXPO_PUBLIC_DEMO_MODE=true
    // e sem nuvem (ver demoApi.ts). Em release getDemoCommunityApi() é sempre null.
    return deps.supabase === undefined ? getDemoCommunityApi() : null;
  }
  return createCommunityApi(communityClientFrom(supabase), {
    randomUUID: deps.randomUUID ?? (() => Crypto.randomUUID()),
  });
}

// ---------------------------------------------------------------------------
// Exclusão de conta (Edge Function delete-account). Vale para o app inteiro,
// com ou sem Comunidade: por isso NÃO depende de COMMUNITY_ENABLED nem de
// getCommunityApi(). Quem liga isto à tela é src/cloud/auth.ts
// (requestAccountDeletion), que depois da resposta 'deleted' encerra a sessão
// local e apaga os dados do aparelho.
// ---------------------------------------------------------------------------

/** 'needs_recent_login' = pedir um código novo por e-mail e chamar de novo. */
export type AccountDeletionResult = 'deleted' | 'needs_recent_login';

/** O que a exclusão precisa do supabase-js (supabase.functions). */
export type FunctionsInvoker = {
  invoke(name: string, options: { body: Record<string, unknown> }): PromiseLike<{ data: unknown; error: unknown }>;
};

export const DELETE_ACCOUNT_FUNCTION = 'delete-account';

/** Lê o `{ error: '…' }` do corpo de uma resposta não-2xx da Edge Function. */
async function edgeErrorBody(error: unknown): Promise<Row | null> {
  const context = (error as { context?: unknown } | null)?.context as { json?: () => Promise<unknown> } | undefined;
  if (!context || typeof context.json !== 'function') return null;
  try {
    const body = await context.json();
    return body !== null && typeof body === 'object' ? (body as Row) : null;
  } catch {
    return null;
  }
}

async function edgeErrorCode(error: unknown): Promise<string | null> {
  return str((await edgeErrorBody(error))?.error);
}

/**
 * Pede ao servidor a exclusão da conta da sessão atual. Apaga a conta, tudo o que
 * a pessoa fez na Comunidade e as fotos dela. Só funciona com login recente (até
 * 10 min): fora disso devolve 'needs_recent_login', sem apagar nada.
 */
export async function requestServerAccountDeletion(functions: FunctionsInvoker): Promise<AccountDeletionResult> {
  let result: { data: unknown; error: unknown };
  try {
    result = await functions.invoke(DELETE_ACCOUNT_FUNCTION, { body: { confirm: true } });
  } catch (error) {
    throw toCommunityError(error);
  }
  if (!result.error) {
    if ((result.data as Row | null)?.deleted === true) return 'deleted';
    throw communityError('unknown');
  }
  const name = (result.error as { name?: unknown } | null)?.name;
  if (name === 'FunctionsFetchError') throw communityError('offline');
  const code = await edgeErrorCode(result.error);
  if (code === 'reauth_required') return 'needs_recent_login';
  if (code === 'unauthorized') throw communityError('session_expired');
  throw communityError('unknown');
}

/** Adapta o SupabaseClient (o tsc confere que supabase.functions serve). */
export function accountDeletionFrom(supabase: SupabaseClient): FunctionsInvoker {
  return supabase.functions;
}
