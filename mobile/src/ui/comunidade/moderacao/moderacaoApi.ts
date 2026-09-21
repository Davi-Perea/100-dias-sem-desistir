import { communityClientFrom, type CommunityClient } from '@/community/api';
import { communityError, toCommunityError } from '@/community/errors';
import type { ContentStatus, HoldReason, MemberStatus, ReportReason } from '@/community/types';
import { REPORT_REASONS } from '@/community/types';
import { charLength, cleanText, isUuid } from '@/community/validation';
import { getSupabase } from '@/cloud/client';
import { COMMUNITY_ENABLED } from '@/config/features';

/**
 * Cliente da fila de moderação dentro do app.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21): `src/community/api.ts` ainda
 * não tem as RPCs de moderação e não pertence a este agente. Este adaptador
 * chama as MESMAS RPCs de `20260921130100_comunidade_funcoes.sql`
 * (community_moderation_queue, community_open_reports, moderate_community_post,
 * moderate_community_comment, resolve_community_report,
 * suspend_community_author) pelo mesmo `CommunityClient`, e deve migrar para
 * `api.ts` quando o agente de servidor o absorver (ver "pedidos").
 *
 * O servidor é quem decide: toda RPC recusa quem não modera (42501) e grava a
 * decisão em `community_moderation_actions`. A tela só esconde o que seria inútil.
 *
 * Nem a moderação recebe o user_id de outra pessoa: a fila traz só se o autor
 * ainda existe (`authorKnown`, `reportedKnown`), e suspender vai pelo post, pelo
 * comentário ou pela denúncia; o servidor resolve quem é.
 */

type Row = Record<string, unknown>;
type Result<T> = { data: T | null; error: unknown };

export type QueueItem = {
  kind: 'post' | 'comment';
  itemId: string;
  postId: string;
  body: string | null;
  photoPath: string | null;
  holdReason: HoldReason | null;
  status: ContentStatus;
  /** O autor ainda existe (não excluiu a conta). Nunca o id. */
  authorKnown: boolean;
  authorName: string;
  authorStatus: MemberStatus | null;
  createdAt: string;
  openReports: number;
  urgent: boolean;
  dueAt: string | null;
};

export type OpenReport = {
  reportId: string;
  targetKind: 'post' | 'comment' | 'person';
  postId: string | null;
  commentId: string | null;
  /** A pessoa denunciada ainda existe. Nunca o id. */
  reportedKnown: boolean;
  reportedName: string;
  reason: ReportReason | null;
  details: string | null;
  urgent: boolean;
  createdAt: string;
  dueAt: string | null;
};

export type ModerationKind =
  | 'approve'
  | 'reject'
  | 'remove'
  | 'restore'
  | 'auto_hold'
  | 'urgent_hide'
  | 'suspend_member'
  | 'remove_member'
  | 'reinstate_member'
  | 'action_report'
  | 'dismiss_report';

export type HistoryEntry = {
  actionId: string;
  kind: ModerationKind | null;
  decidedBy: 'pessoa' | 'automatico' | null;
  reason: ReportReason | null;
  noteForAuthor: string | null;
  createdAt: string;
  /** Nome na comunidade de quem foi alvo (nunca o id). */
  targetName: string | null;
  /** Trecho do conteúdo, se ainda existir. */
  excerpt: string | null;
};

export type ContentDecision = 'approve' | 'reject' | 'remove';

/** De onde o servidor tira quem suspender: o conteúdo ou a denúncia, nunca um user_id. */
export type SuspendTarget = { kind: 'post' | 'comment' | 'report'; id: string };

const HOLD_REASONS: readonly HoldReason[] = ['foto', 'termo', 'link', 'contato', 'denuncia'];
const CONTENT_STATUSES: readonly ContentStatus[] = ['in_review', 'published', 'not_published', 'removed'];
const MEMBER_STATUSES: readonly MemberStatus[] = ['active', 'suspended', 'removed'];
const KINDS: readonly ModerationKind[] = [
  'approve',
  'reject',
  'remove',
  'restore',
  'auto_hold',
  'urgent_hide',
  'suspend_member',
  'remove_member',
  'reinstate_member',
  'action_report',
  'dismiss_report',
];
/** Mesmo limite de `note_for_author` na tabela (char_length <= 500). */
export const NOTE_MAX = 500;

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

export function toQueueItem(row: Row): QueueItem {
  return {
    kind: row.item_kind === 'comment' ? 'comment' : 'post',
    itemId: str(row.item_id) ?? '',
    postId: str(row.post_id) ?? '',
    body: str(row.body),
    photoPath: str(row.photo_path),
    holdReason: oneOf(row.hold_reason, HOLD_REASONS),
    // Estado desconhecido nunca vira "publicado".
    status: oneOf(row.item_status, CONTENT_STATUSES) ?? 'in_review',
    authorKnown: row.author_known === true,
    authorName: str(row.author_name) ?? '',
    authorStatus: oneOf(row.author_status, MEMBER_STATUSES),
    createdAt: str(row.created_at) ?? '',
    openReports: typeof row.open_reports === 'number' ? row.open_reports : 0,
    urgent: row.urgent === true,
    dueAt: str(row.due_at),
  };
}

export function toOpenReport(row: Row): OpenReport {
  const kind = row.target_kind === 'comment' || row.target_kind === 'person' ? row.target_kind : 'post';
  return {
    reportId: str(row.report_id) ?? '',
    targetKind: kind,
    postId: str(row.post_id),
    commentId: str(row.comment_id),
    reportedKnown: row.reported_known === true,
    reportedName: str(row.reported_name) ?? '',
    reason: oneOf(row.reason, REPORT_REASONS),
    details: str(row.details),
    urgent: row.urgent === true,
    createdAt: str(row.created_at) ?? '',
    dueAt: str(row.due_at),
  };
}

export function toHistoryEntry(row: Row): HistoryEntry {
  const decidedBy = row.decided_by === 'pessoa' || row.decided_by === 'automatico' ? row.decided_by : null;
  const id = row.action_id;
  return {
    actionId: typeof id === 'number' || typeof id === 'string' ? String(id) : '',
    kind: oneOf(row.kind, KINDS),
    decidedBy,
    reason: oneOf(row.reason, REPORT_REASONS),
    noteForAuthor: str(row.note_for_author),
    createdAt: str(row.created_at) ?? '',
    targetName: str(row.target_name),
    excerpt: str(row.excerpt),
  };
}

/** A RPC ainda não existe no servidor (PostgREST PGRST202 / Postgres 42883). */
function isMissingFunction(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'PGRST202' || code === '42883';
}

function requireUuid(value: string | null | undefined): string {
  if (!value || !isUuid(value)) throw communityError('invalid_input');
  return value;
}

function checkReasonAndNote(reason: ReportReason | null | undefined, note: string | null | undefined, required: boolean) {
  if (required && !reason) throw communityError('invalid_input');
  if (reason && !REPORT_REASONS.includes(reason)) throw communityError('invalid_input');
  const cleaned = cleanText(note);
  if (cleaned && charLength(cleaned) > NOTE_MAX) throw communityError('invalid_input');
  return cleaned;
}

export type ModerationApi = ReturnType<typeof createModerationApi>;

export function createModerationApi(client: Pick<CommunityClient, 'rpc'>) {
  async function raw(fn: string, args?: Record<string, unknown>): Promise<Result<unknown>> {
    try {
      return await client.rpc(fn, args);
    } catch (error) {
      throw toCommunityError(error);
    }
  }
  async function call(fn: string, args?: Record<string, unknown>): Promise<unknown> {
    const result = await raw(fn, args);
    if (result.error) throw toCommunityError(result.error);
    return result.data;
  }

  return {
    /** Tudo em análise + publicado com denúncia aberta; urgente primeiro, depois o prazo. */
    async queue(): Promise<QueueItem[]> {
      return rows(await call('community_moderation_queue')).map(toQueueItem);
    },

    /** Denúncias abertas, inclusive de pessoa. Urgente primeiro. */
    async openReports(): Promise<OpenReport[]> {
      return rows(await call('community_open_reports')).map(toOpenReport);
    },

    /**
     * Histórico das decisões. `null` = o servidor ainda não tem a RPC
     * (`community_moderation_history`, pedida ao agente de servidor): a tela
     * diz isso, em vez de inventar uma lista.
     */
    async history(): Promise<HistoryEntry[] | null> {
      const result = await raw('community_moderation_history');
      if (result.error) {
        if (isMissingFunction(result.error)) return null;
        throw toCommunityError(result.error);
      }
      return rows(result.data).map(toHistoryEntry);
    },

    /** Aprovar, recusar ou remover um post ou comentário. Recusar e remover exigem motivo. */
    async decide(input: {
      kind: 'post' | 'comment';
      id: string;
      decision: ContentDecision;
      reason?: ReportReason | null;
      note?: string | null;
    }): Promise<void> {
      const note = checkReasonAndNote(input.reason, input.note, input.decision !== 'approve');
      const reason = input.decision === 'approve' ? null : (input.reason ?? null);
      if (input.kind === 'post') {
        await call('moderate_community_post', {
          target_post: requireUuid(input.id),
          decision: input.decision,
          decision_reason: reason,
          note_for_author: input.decision === 'approve' ? null : note,
        });
      } else {
        await call('moderate_community_comment', {
          target_comment: requireUuid(input.id),
          decision: input.decision,
          decision_reason: reason,
          note_for_author: input.decision === 'approve' ? null : note,
        });
      }
    },

    /** Fecha a denúncia sem mexer no conteúdo: 'dismissed' (manter) ou 'actioned'. */
    async resolveReport(reportId: string, outcome: 'actioned' | 'dismissed'): Promise<void> {
      await call('resolve_community_report', { target_report: requireUuid(reportId), outcome });
    },

    /**
     * Suspende quem escreveu o post ou o comentário, ou a pessoa de uma denúncia.
     * Exige motivo; o servidor resolve o autor e recusa suspender a si mesmo.
     */
    async suspendMember(input: { target: SuspendTarget; reason: ReportReason; note?: string | null }): Promise<void> {
      const note = checkReasonAndNote(input.reason, input.note, true);
      const id = requireUuid(input.target.id);
      await call('suspend_community_author', {
        target_post: input.target.kind === 'post' ? id : null,
        target_comment: input.target.kind === 'comment' ? id : null,
        target_report: input.target.kind === 'report' ? id : null,
        new_status: 'suspended',
        decision_reason: input.reason,
        note_for_author: note,
      });
    },
  };
}

/** null com a Comunidade desligada nesta build ou sem nuvem configurada. */
export function getModerationApi(): ModerationApi | null {
  if (!COMMUNITY_ENABLED) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  return createModerationApi(communityClientFrom(supabase));
}
