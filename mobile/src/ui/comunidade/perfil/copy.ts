import * as contato from '@/config/contato';
import type { ContentStatus, HoldReason, MyPost, ReportReason } from '@/community/types';

/**
 * Textos de "Minhas publicações" e de "Conta e privacidade".
 *
 * Nenhum texto diz QUAL pessoa decidiu (o servidor nem entrega) e nenhum mostra
 * código técnico ou nome de enum. O estado é dito em palavra, e também por
 * forma (ícone), nunca só por cor.
 *
 * RASCUNHO: os textos seguem `docs/legal/COMUNIDADE_REGRAS_E_CONSENTIMENTO_rascunho.md`
 * §4 e esperam a revisão do advogado, como o resto da Comunidade.
 */

export const STATUS_LABEL: Record<ContentStatus, string> = {
  published: 'Publicado',
  in_review: 'Em análise',
  not_published: 'Não publicado',
  removed: 'Tirado do ar',
};

/** Por que está em análise. Em análise, só o autor vê. */
export const HOLD_COPY: Record<HoldReason, string> = {
  foto: 'Toda foto passa por uma pessoa da equipe da igreja antes de aparecer. Enquanto isso, só você vê.',
  termo: 'O filtro automático segurou o texto para uma pessoa da equipe olhar. Enquanto isso, só você vê.',
  link: 'O texto tem um link, e por isso uma pessoa da equipe olha antes. Enquanto isso, só você vê.',
  contato:
    'O texto parece ter um telefone ou e-mail, e por isso uma pessoa da equipe olha antes. Enquanto isso, só você vê.',
  denuncia:
    'Alguém denunciou esta publicação e ela saiu do ar enquanto uma pessoa da equipe olha. Ninguém concluiu ainda que você errou.',
};

export const IN_REVIEW_FALLBACK = 'Uma pessoa da equipe da igreja vai olhar antes de aparecer. Enquanto isso, só você vê.';

/** Motivo da lista fechada, em uma frase das regras. */
export const REASON_LABEL: Record<ReportReason, string> = {
  ofensivo: 'Ofensa, humilhação ou deboche.',
  assedio: 'Assédio, ameaça ou perseguição.',
  spam: 'Propaganda, venda ou pedido de dinheiro.',
  rosto_de_terceiro: 'Aparece o rosto de alguém que não autorizou.',
  crianca_exposta: 'Aparece ou é exposta uma criança ou um adolescente.',
  dado_pessoal: 'Tem dado pessoal de outra pessoa.',
  falso_ou_enganoso: 'Notícia falsa, golpe ou link suspeito.',
  risco_a_vida: 'Fala de risco à vida. Se for o seu caso, ligue 188 (CVV).',
  outro: 'Vai contra as regras da comunidade.',
};

export function decidedByCopy(decidedBy: MyPost['decidedBy']): string | null {
  if (decidedBy === 'pessoa') return 'Quem decidiu: uma pessoa da equipe de cuidado da comunidade.';
  if (decidedBy === 'automatico') return 'Quem decidiu: o filtro automático. Ainda não foi uma pessoa.';
  return null;
}

/**
 * E-mail de contato publicado (preenchido pelo fundador). null = a linha não
 * aparece, nunca um endereço inventado.
 */
export function supportEmail(): string | null {
  return contato.SUPPORT_EMAIL;
}

/**
 * Página web de exclusão de conta (`ACCOUNT_DELETION_URL` em src/config/contato.ts).
 * Sem inventar endereço: enquanto for null ou não for https, a linha não aparece.
 */
export function accountDeletionUrl(): string | null {
  const value: unknown = contato.ACCOUNT_DELETION_URL;
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

/** Como pedir revisão de uma decisão (ECA Digital art. 30). */
export function appealCopy(): string {
  const email = supportEmail();
  return email
    ? `Se achar que foi engano, peça revisão pelo e-mail ${email}, dizendo a data da publicação. Outra pessoa da equipe, que não decidiu da primeira vez, olha de novo.`
    : 'Se achar que foi engano, peça revisão à equipe de cuidado da comunidade da sua igreja, dizendo a data da publicação. Outra pessoa da equipe, que não decidiu da primeira vez, olha de novo.';
}

/** "01/10/2026" no fuso da campanha. Data ilegível vira vazio, nunca "Invalid Date". */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return date.toISOString().slice(0, 10).split('-').reverse().join('/');
  }
}

/** Linha de contexto do post: "Dia 17 · 01/10/2026". */
export function postContext(post: Pick<MyPost, 'dayNumber' | 'createdAt'>): string {
  const date = formatDate(post.createdAt);
  const day = post.dayNumber ? `Dia ${post.dayNumber}` : null;
  return [day, date].filter(Boolean).join(' · ');
}
