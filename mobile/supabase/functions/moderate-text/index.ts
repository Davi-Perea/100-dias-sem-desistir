/**
 * Edge Function `moderate-text` — filtro de palavras em pt-BR, sem serviço
 * externo. Ações sync_terms e recheck (segredo x-cron-secret, chamadas pelo
 * banco) e check (moderação, com o token da pessoa). Lógica em
 * _shared/moderate-text.ts e _shared/text-filter.ts; lista base em
 * _shared/terms-pt-br.ts (+ segredos FILTER_EXTRA_TERMS e FILTER_DISABLED_TERMS).
 */
import { env, log, rpcOrThrow, serve, serviceClient, userClient } from '../_shared/deno.ts';
import { handleModerateText } from '../_shared/moderate-text.ts';
import { BASE_TERMS_PT_BR } from '../_shared/terms-pt-br.ts';
import { configuredTerms } from '../_shared/text-filter.ts';

type ContentRow = { body: string | null; status: string };
type SyncRow = { added: number; removed: number };
type StatusRow = { is_moderator: boolean };

serve(
  (req) => {
    const admin = serviceClient();
    return handleModerateText(req, {
      cronSecret: env('COMMUNITY_CRON_SECRET'),
      configuredTerms: configuredTerms(BASE_TERMS_PT_BR, env('FILTER_EXTRA_TERMS'), env('FILTER_DISABLED_TERMS')),
      syncTerms: async (terms) => {
        const rows = await rpcOrThrow<SyncRow[] | null>(admin, 'service_sync_filter_terms', { base_terms: terms });
        return rows?.[0] ?? { added: 0, removed: 0 };
      },
      storedTerms: async () => (await rpcOrThrow<string[] | null>(admin, 'service_list_filter_terms')) ?? [],
      getContent: async (kind, id) => {
        const rows = await rpcOrThrow<ContentRow[] | null>(admin, 'service_community_text', {
          content_kind: kind,
          target: id,
        });
        return rows?.[0] ?? null;
      },
      hold: async (kind, id, reason) =>
        (await rpcOrThrow<boolean | null>(admin, 'service_hold_community_text', {
          content_kind: kind,
          target: id,
          hold: reason,
        })) === true,
      isModerator: async (token) => {
        const rows = await rpcOrThrow<StatusRow[] | null>(userClient(token), 'my_community_status');
        return rows?.[0]?.is_moderator === true;
      },
      sqlVerdict: async (text) => (await rpcOrThrow<string | null>(admin, 'service_text_verdict', { input: text })) ?? null,
      log,
    });
  },
  { cors: true },
);
