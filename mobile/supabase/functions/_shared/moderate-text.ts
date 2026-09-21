/**
 * Handler da Edge Function `moderate-text`. Sem nada de Deno: testado no Jest.
 *
 * Ações (corpo JSON com `action`):
 *  - sync_terms  (segredo x-cron-secret): grava a lista base configurada em
 *    private.community_filter_terms (source = 'base'), onde o filtro SÍNCRONO do
 *    banco já a usa. Termos da igreja (source = 'igreja') não são tocados.
 *  - recheck     (segredo x-cron-secret; chamado pelo gatilho do banco logo depois
 *    de um texto aparecer): { kind: 'post' | 'comment', id }. Lê o texto no banco
 *    (o gatilho manda só o id, nunca o texto), passa o filtro com disfarces e, se
 *    pegar, devolve o conteúdo para "Em análise" com decided_by = 'automatico'.
 *    A resposta nunca traz o texto.
 *  - check       (moderação, com o token da pessoa): { text } → o que o filtro do
 *    banco e esta segunda passada diriam. Para a página de moderação testar a lista.
 */
import { asObject, bearerToken, hasCronSecret, reply, UUID_RE } from './http.ts';
import type { EdgeRequest, EdgeResponse } from './http.ts';
import { textVerdict } from './text-filter.ts';
import type { HoldReason } from './text-filter.ts';

export type ContentKind = 'post' | 'comment';

export type ModerateTextDeps = {
  cronSecret: string | null | undefined;
  /** Lista base já normalizada (base versionada + extras − desligados). */
  configuredTerms: string[];
  syncTerms(terms: string[]): Promise<{ added: number; removed: number }>;
  /** Todos os termos da tabela (igreja + base). */
  storedTerms(): Promise<string[]>;
  getContent(kind: ContentKind, id: string): Promise<{ body: string | null; status: string } | null>;
  hold(kind: ContentKind, id: string, reason: HoldReason): Promise<boolean>;
  isModerator(token: string): Promise<boolean>;
  sqlVerdict(text: string): Promise<string | null>;
  log(event: string, data?: Record<string, unknown>): void;
};

const MAX_CHECK_LENGTH = 2000;

async function allTerms(deps: ModerateTextDeps): Promise<string[]> {
  let stored: string[] = [];
  try {
    stored = await deps.storedTerms();
  } catch {
    stored = []; // a lista base continua valendo mesmo sem ler a tabela
  }
  return [...new Set([...deps.configuredTerms, ...stored])];
}

export async function handleModerateText(req: EdgeRequest, deps: ModerateTextDeps): Promise<EdgeResponse> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const body = asObject(await req.json());
  const action = body.action;

  if (action === 'sync_terms') {
    if (!hasCronSecret(req, deps.cronSecret)) return reply(401, { error: 'unauthorized' });
    // Lista vazia apagaria toda a base: quase sempre é segredo mal configurado.
    if (deps.configuredTerms.length === 0) return reply(400, { error: 'empty_term_list' });
    try {
      const result = await deps.syncTerms(deps.configuredTerms);
      deps.log('terms_synced', { ...result, total: deps.configuredTerms.length });
      return reply(200, { ...result, total: deps.configuredTerms.length });
    } catch {
      return reply(500, { error: 'sync_failed' });
    }
  }

  if (action === 'recheck') {
    if (!hasCronSecret(req, deps.cronSecret)) return reply(401, { error: 'unauthorized' });
    const kind = body.kind;
    const id = body.id;
    if ((kind !== 'post' && kind !== 'comment') || typeof id !== 'string' || !UUID_RE.test(id)) {
      return reply(400, { error: 'invalid_input' });
    }
    try {
      const content = await deps.getContent(kind, id);
      // Já saiu do ar, foi apagado, ou é só foto (foto sempre passa por uma pessoa).
      if (!content || content.status !== 'published' || !content.body) return reply(200, { held: false });
      const verdict = textVerdict(content.body, await allTerms(deps));
      if (!verdict.hold) return reply(200, { held: false });
      const held = await deps.hold(kind, id, verdict.hold);
      deps.log('text_held_on_recheck', { kind, reason: verdict.hold, held });
      return reply(200, { held, reason: verdict.hold });
    } catch {
      return reply(500, { error: 'recheck_failed' });
    }
  }

  if (action === 'check') {
    const token = bearerToken(req);
    let allowed = false;
    try {
      allowed = token !== null && (await deps.isModerator(token));
    } catch {
      allowed = false;
    }
    if (!allowed) return reply(403, { error: 'forbidden' });
    const text = body.text;
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_CHECK_LENGTH) {
      return reply(400, { error: 'invalid_input' });
    }
    try {
      const verdict = textVerdict(text, await allTerms(deps));
      const sqlHold = await deps.sqlVerdict(text);
      return reply(200, { hold: verdict.hold, matched: verdict.matched, sql_hold: sqlHold });
    } catch {
      return reply(500, { error: 'check_failed' });
    }
  }

  return reply(400, { error: 'unknown_action' });
}
