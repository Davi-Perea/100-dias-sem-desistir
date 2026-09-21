/**
 * Edge Function `delete-account` — exclusão de conta pelo app e pela página web.
 * Autenticada pelo token da própria pessoa (verify_jwt = false no config.toml
 * porque a verificação é feita aqui, pelo Auth, e é compatível com as chaves
 * novas de assinatura). A lógica está em _shared/account-deletion.ts.
 *
 * Chamada: POST /functions/v1/delete-account, Authorization: Bearer <token>,
 * corpo { "confirm": true }. Respostas: 200 { deleted: true } ·
 * 401 { error: 'reauth_required' } (pedir código novo por e-mail e repetir) ·
 * 401 unauthorized · 400 confirmation_required · 500 deletion_failed.
 */
import { handleDeleteAccount, parseMaxAuthAge } from '../_shared/account-deletion.ts';
import { env, log, rpcOrThrow, serve, serviceClient } from '../_shared/deno.ts';
import type { QueueItem } from '../_shared/storage-drain.ts';

serve(
  (req) => {
    const admin = serviceClient();
    return handleDeleteAccount(req, {
      getUser: async (token) => {
        const { data, error } = await admin.auth.getUser(token);
        return error || !data.user ? null : { id: data.user.id };
      },
      prepare: async (userId) =>
        (await rpcOrThrow<QueueItem[] | null>(admin, 'service_prepare_account_deletion', { target: userId })) ?? [],
      photosInUse: async (names) => (await rpcOrThrow<string[] | null>(admin, 'service_photos_in_use', { names })) ?? [],
      remove: async (bucket, paths) => !(await admin.storage.from(bucket).remove(paths)).error,
      confirm: async (bucket, name) => {
        await rpcOrThrow(admin, 'confirm_storage_deletion', { target_bucket: bucket, target_object: name });
      },
      deleteUser: async (userId) => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error('deleteUser falhou');
      },
      nowSeconds: () => Math.floor(Date.now() / 1000),
      maxAuthAgeSeconds: parseMaxAuthAge(env('DELETE_ACCOUNT_MAX_AUTH_AGE_SECONDS')),
      log,
    });
  },
  { cors: true },
);
