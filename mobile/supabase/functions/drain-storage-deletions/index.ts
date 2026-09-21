/**
 * Edge Function `drain-storage-deletions` — agendada (pg_cron a cada 15 min,
 * COMUNIDADE_V2_DEPLOY.md §7). Apaga pela API do Storage os arquivos da fila
 * private.storage_deletion_queue e os uploads soltos com mais de 24 h.
 * Só aceita o segredo x-cron-secret (COMMUNITY_CRON_SECRET). Lógica em
 * _shared/storage-drain.ts.
 */
import { env, log, rpcOrThrow, serve, serviceClient } from '../_shared/deno.ts';
import { handleDrain } from '../_shared/storage-drain.ts';
import type { QueueItem } from '../_shared/storage-drain.ts';

serve((req) => {
  const admin = serviceClient();
  return handleDrain(req, {
    cronSecret: env('COMMUNITY_CRON_SECRET'),
    enqueueOrphans: async (maxAgeHours) =>
      (await rpcOrThrow<number | null>(admin, 'service_enqueue_orphan_photos', { max_age_hours: maxAgeHours })) ?? 0,
    claim: async (maxItems) =>
      (await rpcOrThrow<QueueItem[] | null>(admin, 'claim_storage_deletions', { max_items: maxItems })) ?? [],
    photosInUse: async (names) => (await rpcOrThrow<string[] | null>(admin, 'service_photos_in_use', { names })) ?? [],
    remove: async (bucket, paths) => !(await admin.storage.from(bucket).remove(paths)).error,
    confirm: async (bucket, name) => {
      await rpcOrThrow(admin, 'confirm_storage_deletion', { target_bucket: bucket, target_object: name });
    },
    log,
  });
});
