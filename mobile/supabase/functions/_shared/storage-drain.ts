/**
 * Drena private.storage_deletion_queue: apaga os arquivos pela API do Storage
 * (apagar a linha de storage.objects por SQL deixaria o arquivo órfão) e só
 * então tira da fila. Sem nada de Deno: os testes Jest usam dependências falsas.
 *
 * Garantias:
 *  - só apaga em buckets da lista (hoje, só 'community-photos');
 *  - antes de apagar, pergunta ao banco se o arquivo voltou a ser usado por um
 *    post (corrida entre a varredura de órfãos e alguém publicando): se voltou,
 *    tira da fila SEM apagar;
 *  - falha do Storage deixa o item na fila; claim_storage_deletions só devolve
 *    o mesmo item de novo depois de 10 minutos, então o laço não gira em falso.
 */

import { hasCronSecret, reply } from './http.ts';
import type { EdgeRequest, EdgeResponse } from './http.ts';

export const PHOTO_BUCKET = 'community-photos';
/** Upload que não virou post em 24 h é abandono (arquitetura §8). */
export const ORPHAN_MAX_AGE_HOURS = 24;
export const DELETABLE_BUCKETS: readonly string[] = [PHOTO_BUCKET];

export type QueueItem = { bucket_id: string; object_name: string };

export type DrainDeps = {
  /** Põe na fila os uploads soltos (sem post) mais velhos que N horas. Devolve quantos. */
  enqueueOrphans(maxAgeHours: number): Promise<number>;
  /** claim_storage_deletions(max_items). */
  claim(maxItems: number): Promise<QueueItem[]>;
  /** Quais destes nomes ainda estão ligados a um post. */
  photosInUse(names: string[]): Promise<string[]>;
  /** storage.from(bucket).remove(paths). false = o Storage recusou ou falhou. */
  remove(bucket: string, paths: string[]): Promise<boolean>;
  /** confirm_storage_deletion(bucket, name). */
  confirm(bucket: string, name: string): Promise<void>;
};

export type DrainOptions = {
  batchSize?: number;
  maxBatches?: number;
  /** null = não varre órfãos nesta execução (a exclusão de conta não varre). */
  orphanMaxAgeHours?: number | null;
};

export type DrainSummary = {
  orphansQueued: number;
  claimed: number;
  deleted: number;
  keptInUse: number;
  skippedBucket: number;
  failed: number;
};

const REMOVE_CHUNK = 100;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Apaga um grupo de arquivos de um bucket e confirma na fila. */
export async function deleteObjects(
  deps: Pick<DrainDeps, 'photosInUse' | 'remove' | 'confirm'>,
  bucket: string,
  names: string[],
  summary: DrainSummary,
): Promise<void> {
  const unique = [...new Set(names)];
  if (!DELETABLE_BUCKETS.includes(bucket)) {
    summary.skippedBucket += unique.length;
    return;
  }
  const inUse = new Set(bucket === PHOTO_BUCKET ? await deps.photosInUse(unique) : []);
  for (const name of unique.filter((n) => inUse.has(n))) {
    await deps.confirm(bucket, name); // voltou a ser foto de um post: não apaga
    summary.keptInUse += 1;
  }
  for (const group of chunks(
    unique.filter((n) => !inUse.has(n)),
    REMOVE_CHUNK,
  )) {
    let ok = false;
    try {
      ok = await deps.remove(bucket, group);
    } catch {
      ok = false;
    }
    if (!ok) {
      summary.failed += group.length;
      continue;
    }
    for (const name of group) await deps.confirm(bucket, name);
    summary.deleted += group.length;
  }
}

export function emptySummary(): DrainSummary {
  return { orphansQueued: 0, claimed: 0, deleted: 0, keptInUse: 0, skippedBucket: 0, failed: 0 };
}

export async function drainStorageDeletions(deps: DrainDeps, options: DrainOptions = {}): Promise<DrainSummary> {
  const batchSize = Math.min(Math.max(options.batchSize ?? 100, 1), 500);
  const maxBatches = Math.min(Math.max(options.maxBatches ?? 10, 1), 50);
  const summary = emptySummary();

  if (options.orphanMaxAgeHours != null) {
    summary.orphansQueued = await deps.enqueueOrphans(Math.max(1, Math.floor(options.orphanMaxAgeHours)));
  }

  for (let batch = 0; batch < maxBatches; batch++) {
    const items = await deps.claim(batchSize);
    if (items.length === 0) break;
    summary.claimed += items.length;
    const byBucket = new Map<string, string[]>();
    for (const item of items) {
      if (!item || typeof item.bucket_id !== 'string' || typeof item.object_name !== 'string') continue;
      byBucket.set(item.bucket_id, [...(byBucket.get(item.bucket_id) ?? []), item.object_name]);
    }
    for (const [bucket, names] of byBucket) await deleteObjects(deps, bucket, names, summary);
    if (items.length < batchSize) break;
  }
  return summary;
}

/** Handler da Edge Function `drain-storage-deletions` (cron, com x-cron-secret). */
export async function handleDrain(
  req: EdgeRequest,
  deps: DrainDeps & { cronSecret: string | null | undefined; log(event: string, data?: Record<string, unknown>): void },
): Promise<EdgeResponse> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!hasCronSecret(req, deps.cronSecret)) return reply(401, { error: 'unauthorized' });
  try {
    const summary = await drainStorageDeletions(deps, { orphanMaxAgeHours: ORPHAN_MAX_AGE_HOURS });
    deps.log('storage_drained', summary);
    return reply(200, summary);
  } catch {
    deps.log('storage_drain_failed');
    return reply(500, { error: 'drain_failed' });
  }
}
