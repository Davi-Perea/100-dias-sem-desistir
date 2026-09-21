import type { ReportReason } from '@/community/types';

/**
 * Motivos da denúncia (C5), na lista fechada do servidor (`REPORT_REASONS`).
 * O texto é do app (revisável), não da igreja.
 */
export type ReasonOption = { reason: ReportReason; label: string; description?: string };

/**
 * Motivos que tiram a publicação do ar NA HORA (urgent_hide no servidor,
 * COMUNIDADE_V2_ARQUITETURA §5; report_community_content): criança exposta e rosto
 * de terceiro, em publicação ou comentário. Denúncia de pessoa não esconde nada.
 */
export const URGENT_REASONS: readonly ReportReason[] = ['crianca_exposta', 'rosto_de_terceiro'];

export type ReportSubject = 'post' | 'comment' | 'person';

export function reasonOptions(subject: ReportSubject, hasPhoto: boolean): ReasonOption[] {
  const options: ReasonOption[] = [];
  // "Apareço nesta foto e não autorizei" só faz sentido onde há foto.
  if (subject === 'post' && hasPhoto) {
    options.push({
      reason: 'rosto_de_terceiro',
      label: 'Apareço nesta foto e não autorizei',
      description: 'A publicação sai do ar na hora, e depois alguém da equipe olha.',
    });
  }
  options.push({
    reason: 'crianca_exposta',
    label: 'Expõe uma criança ou um adolescente',
    description:
      subject === 'post'
        ? 'A publicação sai do ar na hora, e depois alguém da equipe olha.'
        : subject === 'comment'
          ? 'O comentário sai do ar na hora, e depois alguém da equipe olha.'
          : undefined,
  });
  options.push(
    { reason: 'ofensivo', label: 'Ofensa, deboche ou discriminação' },
    { reason: 'assedio', label: 'Perseguição ou ameaça' },
    { reason: 'dado_pessoal', label: 'Mostra dados pessoais de alguém' },
    { reason: 'falso_ou_enganoso', label: 'Golpe, notícia falsa ou link suspeito' },
    { reason: 'spam', label: 'Propaganda, venda ou pedido de dinheiro' },
    { reason: 'risco_a_vida', label: 'Alguém pode estar correndo perigo' },
    { reason: 'outro', label: 'Outro motivo' },
  );
  return options;
}

/**
 * Promessa de prazo da moderação.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21): o servidor trabalha com 24 h
 * (report_due_hours em community_settings), o piso que a Apple cobra pela 1.2.
 * A tela só promete prazo quando a igreja confirmar que a escala cumpre as 24 h
 * (`00-DECISOES.md` §4 e o rascunho jurídico §4: "prometer só o que a escala
 * cumpre"); aí esta constante vira 24. Se a escala não comportar 24 h, o caso
 * volta ao Product Brain antes de ligar a Comunidade, sem afrouxar o prazo.
 */
export const REVIEW_HOURS: number | null = null;

export function reviewPromise(): string {
  return REVIEW_HOURS
    ? `Uma pessoa da equipe da igreja vai olhar em até ${REVIEW_HOURS} h.`
    : 'Uma pessoa da equipe da igreja vai olhar.';
}

/** Protocolo curto para a pessoa guardar (o recibo inteiro é um uuid). */
export function receiptCode(reportId: string): string {
  return reportId.replace(/-/g, '').slice(0, 8).toUpperCase();
}
