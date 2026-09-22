/**
 * Edge Function `submit-post` — publica o post do dia com fotos passando pelo
 * filtro automático de imagem (F5, feedback do fundador de 2026-09-22).
 * Lógica em _shared/submit-post.ts (handler) e _shared/image-moderation.ts
 * (provedor por segredo: MODERATION_PROVIDER=aws-rekognition + chaves AWS; sem
 * segredo, a foto espera a aprovação humana). Varredura: { action: 'sweep' } com
 * x-cron-secret (COMMUNITY_CRON_SECRET).
 */
import { env, log, rpcOrThrow, serve, serviceClient, userClient } from '../_shared/deno.ts';
import type { CryptoDeps } from '../_shared/image-moderation.ts';
import { imageModeratorFromEnv } from '../_shared/image-moderation.ts';
import { DbError, handleSubmitPost } from '../_shared/submit-post.ts';

const PHOTO_BUCKET = 'community-photos';

/** A cópia garante um ArrayBuffer próprio (o tipo que o crypto.subtle aceita). */
function buffer(data: Uint8Array): ArrayBuffer {
  return data.slice().buffer as ArrayBuffer;
}

const webCrypto: CryptoDeps = {
  sha256: async (data) => new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(data))),
  hmacSha256: async (key, data) => {
    const imported = await crypto.subtle.importKey('raw', buffer(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', imported, buffer(data)));
  },
};

type PhotoRow = { photo_path: string };

serve(
  (req) => {
    const admin = serviceClient();
    return handleSubmitPost(req, {
      cronSecret: env('COMMUNITY_CRON_SECRET'),
      moderator: imageModeratorFromEnv(env, {
        fetch: (url, init) => fetch(url, init),
        crypto: webCrypto,
        now: () => new Date(),
      }),
      createPost: async (token, args) => {
        const { data, error } = await userClient(token).rpc('create_community_post', args);
        if (error) throw new DbError(typeof error.code === 'string' ? error.code : null);
        const row = Array.isArray(data) ? (data[0] as { post_id: string; status: string } | undefined) : undefined;
        return row ?? null;
      },
      photosForCheck: async (postId) =>
        ((await rpcOrThrow<PhotoRow[] | null>(admin, 'service_post_photos_for_check', { target_post: postId })) ?? []).map(
          (row) => row.photo_path,
        ),
      downloadPhoto: async (path) => {
        const { data, error } = await admin.storage.from(PHOTO_BUCKET).download(path);
        if (error || !data) throw new Error('download falhou');
        return new Uint8Array(await data.arrayBuffer());
      },
      recordChecks: async (postId, provider, results) =>
        (await rpcOrThrow<string | null>(admin, 'service_record_photo_checks', {
          target_post: postId,
          provider,
          results,
        })) ?? null,
      pendingPosts: async (max) =>
        (await rpcOrThrow<string[] | null>(admin, 'service_pending_photo_posts', { max_items: max, min_age_seconds: 120 })) ??
        [],
      log,
    });
  },
  { cors: false },
);
