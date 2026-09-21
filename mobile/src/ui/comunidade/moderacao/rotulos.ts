import type { HoldReason, ReportReason } from '@/community/types';

import type { ModerationKind } from './moderacaoApi';

/**
 * Cópia da fila de moderação. Nenhum nome de enum chega à tela (TELAS F5): tudo
 * passa por aqui. Os motivos são a lista fechada do servidor
 * (`community_report_reason`), que é também o que o autor lê em "Minhas publicações".
 */
export const REASON_LABEL: Record<ReportReason, string> = {
  ofensivo: 'Ofensivo',
  assedio: 'Assédio',
  spam: 'Propaganda ou repetição',
  rosto_de_terceiro: 'Rosto de outra pessoa',
  crianca_exposta: 'Criança exposta',
  dado_pessoal: 'Dado pessoal',
  falso_ou_enganoso: 'Falso ou enganoso',
  risco_a_vida: 'Risco à vida',
  outro: 'Outro motivo',
};

export const HOLD_LABEL: Record<HoldReason, string> = {
  foto: 'Foto, que sempre passa por uma pessoa',
  termo: 'Palavra da lista da igreja',
  link: 'Link',
  contato: 'Telefone ou e-mail',
  denuncia: 'Denúncia urgente, fora do ar até a análise',
};

export const KIND_LABEL: Record<ModerationKind, string> = {
  approve: 'Aprovado',
  reject: 'Recusado',
  remove: 'Removido',
  restore: 'Restaurado',
  auto_hold: 'Segurado pelo filtro',
  urgent_hide: 'Fora do ar por denúncia urgente',
  suspend_member: 'Pessoa suspensa',
  remove_member: 'Pessoa removida',
  reinstate_member: 'Pessoa reativada',
  action_report: 'Denúncia atendida',
  dismiss_report: 'Denúncia arquivada',
};

/**
 * Orientação curta para quem modera, nos dois motivos que pedem protocolo
 * próprio (00-DECISOES §4; rascunho jurídico §4). Não substitui o protocolo.
 */
export const REASON_GUIDANCE: Partial<Record<ReportReason, string>> = {
  risco_a_vida: 'Siga o protocolo de crise da equipe: acolher e indicar o CVV, 188. Chame o apoio pastoral.',
  crianca_exposta: 'Se houver qualquer sinal de abuso, siga o protocolo jurídico da igreja, não só a remoção.',
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parse(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function span(ms: number): string {
  if (ms < HOUR) {
    const minutes = Math.max(1, Math.round(ms / MINUTE));
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  const days = Math.round(ms / DAY);
  return days === 1 ? '1 dia' : `${days} dias`;
}

/** "há 3 horas". Por extenso: o leitor de tela lê igual ao que está escrito. */
export function timeAgo(iso: string | null, now: number): string {
  const at = parse(iso);
  if (at === null) return '';
  return `há ${span(Math.max(0, now - at))}`;
}

/** Prazo da denúncia: "prazo em 3 horas" ou "prazo vencido há 1 hora". */
export function dueLabel(iso: string | null, now: number): { text: string; late: boolean } | null {
  const at = parse(iso);
  if (at === null) return null;
  if (at >= now) return { text: `prazo em ${span(at - now)}`, late: false };
  return { text: `prazo vencido há ${span(now - at)}`, late: true };
}
