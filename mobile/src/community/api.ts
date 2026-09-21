import type { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { getSupabase } from '@/cloud/client';
import { COMMUNITY_ENABLED } from '@/config/features';

import { communityError, toCommunityError } from './errors';
import { assertPhotoSafeToUpload, isPhotoPath, newPhotoPath, PHOTO_BUCKET, SIGNED_URL_TTL_SECONDS } from './photos';
import type {
  CommunityStatus,
  ContentStatus,
  FeedCursor,
  FeedPage,
  FeedPost,
  HoldReason,
  MemberStatus,
  MyBlock,
  MyPost,
  PostComment,
  PublishResult,
  ReportReason,
  ReportTarget,
  TermsPurpose,
} from './types';
import { REPORT_REASONS } from './types';
import {
  cleanText,
  isUuid,
  isValidCommentBody,
  isValidDisplayName,
  isValidPostBody,
  LIMITS,
  normalizeInviteCode,
  charLength,
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
};

type Row = Record<string, unknown>;

const CONTENT_STATUSES: readonly ContentStatus[] = ['in_review', 'published', 'not_published', 'removed'];
const HOLD_REASONS: readonly HoldReason[] = ['foto', 'termo', 'link', 'contato', 'denuncia'];
const MEMBER_STATUSES: readonly MemberStatus[] = ['active', 'suspended', 'removed'];

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

export function toFeedPost(row: Row): FeedPost {
  return {
    postId: str(row.post_id) ?? '',
    body: str(row.body),
    photoPath: str(row.photo_path),
    dayNumber: num(row.day_number),
    publishedAt: str(row.published_at) ?? '',
    authorName: str(row.author_name) ?? '',
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

export function toMyPost(row: Row): MyPost {
  const decidedBy = row.decided_by === 'pessoa' || row.decided_by === 'automatico' ? row.decided_by : null;
  return {
    postId: str(row.post_id) ?? '',
    body: str(row.body),
    photoPath: str(row.photo_path),
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
  return {
    isMember: bool(row.is_member),
    memberStatus: oneOf(row.member_status, MEMBER_STATUSES),
    displayName: str(row.display_name),
    canPublish: bool(row.can_publish),
    needsPublishConsent: row.needs_publish_consent !== false,
    needsRules: row.needs_rules !== false,
    publishConsentVersion: str(row.publish_consent_version) ?? 'PENDENTE',
    rulesVersion: str(row.rules_version) ?? 'PENDENTE',
    isModerator: bool(row.is_moderator),
  };
}

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

    /** 'joined' ou 'invalid_code' (inválido, vencido, revogado e esgotado dão a mesma resposta). */
    async redeemInviteCode(input: {
      code: string;
      displayName: string;
      confirmsAdult: boolean;
    }): Promise<'joined' | 'invalid_code'> {
      const code = normalizeInviteCode(input.code);
      if (!code) return 'invalid_code'; // não gasta tentativa com o que nem tem forma de código
      if (!isValidDisplayName(input.displayName)) throw communityError('invalid_input');
      if (!input.confirmsAdult) throw communityError('needs_adult_account');
      const joined = await call('redeem_invite_code', {
        invite_code: code,
        chosen_name: input.displayName.trim(),
        confirms_adult: true,
      });
      return joined === true ? 'joined' : 'invalid_code';
    },

    async setDisplayName(name: string): Promise<void> {
      if (!isValidDisplayName(name)) throw communityError('invalid_input');
      await call('set_community_display_name', { new_name: name.trim() });
    },

    /** Primeira página sem cursor; as seguintes com o nextCursor da anterior. */
    async feedPage(cursor?: FeedCursor | null): Promise<FeedPage> {
      const data = await call(
        'community_feed',
        cursor ? { before_published_at: cursor.beforePublishedAt, before_post: cursor.beforePost } : {},
      );
      return toFeedPage(data);
    },

    async postComments(postId: string): Promise<PostComment[]> {
      const data = await call('community_post_comments', { target_post: requireUuid(postId) });
      return rows(data).map(toComment);
    },

    /** "Minhas publicações": inclusive em análise, não publicadas e removidas, com o motivo. */
    async myPosts(): Promise<MyPost[]> {
      return rows(await call('my_community_posts')).map(toMyPost);
    },

    /** Texto limpo volta 'published'; texto segurado pelo filtro e toda foto voltam 'in_review'. */
    async createPost(input: { body?: string | null; photoPath?: string | null; day?: number | null }): Promise<PublishResult> {
      const body = cleanText(input.body);
      const photoPath = input.photoPath ?? null;
      if (!body && !photoPath) throw communityError('invalid_input');
      if (!isValidPostBody(body)) throw communityError('invalid_input');
      if (photoPath && !isPhotoPath(photoPath)) throw communityError('invalid_input');
      const day = input.day ?? null;
      if (day !== null && (!Number.isInteger(day) || day < 1 || day > 100)) throw communityError('invalid_input');
      const data = await call('create_community_post', {
        post_body: body,
        post_photo_path: photoPath,
        post_day: day,
      });
      return toPublishResult(data, 'post_id');
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

    /** Liga/desliga o MEU Amém. Devolve só o meu novo estado; não existe total. */
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

/** Adapta o SupabaseClient ao cliente mínimo. */
export function communityClientFrom(supabase: SupabaseClient): CommunityClient {
  return {
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
  if (!supabase) return null;
  return createCommunityApi(communityClientFrom(supabase), {
    randomUUID: deps.randomUUID ?? (() => Crypto.randomUUID()),
  });
}
