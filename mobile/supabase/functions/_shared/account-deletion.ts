/**
 * Exclusão de conta (app e página web). Sem nada de Deno: testado no Jest.
 *
 * Ordem (SECURITY_V0.md, COMUNIDADE_V2_ARQUITETURA.md §8):
 *  1. o Auth valida o token (getUser) e o `sub` do token bate com a pessoa;
 *  2. o corpo traz `confirm: true` (nada é apagado por um GET ou por engano);
 *  3. login RECENTE: o `amr` do token precisa ser de até N segundos atrás. Senão
 *     a resposta é 401 `reauth_required` e o app pede um código novo por e-mail.
 *     Sessão anônima não tem como se reautenticar e não tem Comunidade: passa;
 *  4. service_prepare_account_deletion: apaga tudo o que a pessoa fez na
 *     Comunidade (a mesma private.purge_community_member de "sair") e põe na fila
 *     TODAS as fotos dela, inclusive uploads soltos, devolvendo a lista;
 *  5. apaga essas fotos pelo Storage já (o que falhar fica na fila para o cron);
 *  6. auth.admin.deleteUser: a cascata apaga o resto (perfil, grupos,
 *     consentimentos, Amém, bloqueios); denúncias e registros de moderação ficam
 *     com o id em null.
 *
 * Nada é registrado que ligue o pedido à pessoa (minimização, LGPD art. 6º, III).
 */
import { bearerToken, asObject, decodeJwtPayload, lastAuthenticatedAt, reply } from './http.ts';
import type { EdgeRequest, EdgeResponse } from './http.ts';
import { deleteObjects, emptySummary } from './storage-drain.ts';
import type { DrainDeps, QueueItem } from './storage-drain.ts';

export const DEFAULT_MAX_AUTH_AGE_SECONDS = 600;

export type DeleteAccountDeps = Pick<DrainDeps, 'photosInUse' | 'remove' | 'confirm'> & {
  /** auth.getUser(token) com a chave de serviço. null = token inválido ou vencido. */
  getUser(token: string): Promise<{ id: string } | null>;
  prepare(userId: string): Promise<QueueItem[]>;
  deleteUser(userId: string): Promise<void>;
  nowSeconds(): number;
  maxAuthAgeSeconds: number;
  log(event: string, data?: Record<string, unknown>): void;
};

export function parseMaxAuthAge(raw: string | null | undefined): number {
  const value = Number(raw);
  // Entre 1 e 60 minutos; qualquer outra coisa volta ao padrão de 10.
  return Number.isInteger(value) && value >= 60 && value <= 3600 ? value : DEFAULT_MAX_AUTH_AGE_SECONDS;
}

export async function handleDeleteAccount(req: EdgeRequest, deps: DeleteAccountDeps): Promise<EdgeResponse> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const token = bearerToken(req);
  if (!token) return reply(401, { error: 'unauthorized' });

  let user: { id: string } | null = null;
  try {
    user = await deps.getUser(token);
  } catch {
    user = null;
  }
  const payload = user ? decodeJwtPayload(token) : null;
  if (!user || !payload || payload.sub !== user.id) return reply(401, { error: 'unauthorized' });

  const body = asObject(await req.json());
  if (body.confirm !== true) return reply(400, { error: 'confirmation_required' });

  if (payload.is_anonymous !== true) {
    const at = lastAuthenticatedAt(payload);
    const now = deps.nowSeconds();
    // Horário no futuro (relógio adulterado) também não vale.
    if (at === null || now - at > deps.maxAuthAgeSeconds || at - now > 60) {
      return reply(401, { error: 'reauth_required', max_age_seconds: deps.maxAuthAgeSeconds });
    }
  }

  try {
    const queued = await deps.prepare(user.id);
    const summary = emptySummary();
    try {
      const byBucket = new Map<string, string[]>();
      for (const item of queued) byBucket.set(item.bucket_id, [...(byBucket.get(item.bucket_id) ?? []), item.object_name]);
      for (const [bucket, names] of byBucket) await deleteObjects(deps, bucket, names, summary);
    } catch {
      // As fotos continuam na fila; o cron drain-storage-deletions termina o serviço.
      summary.failed += 1;
    }
    await deps.deleteUser(user.id);
    deps.log('account_deleted', { photos_deleted: summary.deleted, photos_pending: summary.failed });
    return reply(200, { deleted: true });
  } catch {
    deps.log('account_deletion_failed');
    return reply(500, { error: 'deletion_failed' });
  }
}
