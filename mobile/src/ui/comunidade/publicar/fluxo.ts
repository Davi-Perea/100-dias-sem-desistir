import type { CommunityStatus, ContentStatus } from '@/community/types';

/**
 * Ordem das telas antes da primeira publicação ou comentário: perfil completo
 * (foto, nome, ministério e 16+, feedback de 2026-09-22 C1/C4) → regras (rolar
 * até o fim + "Li e aceito", rascunho legal §1) → consentimento destacado (§2)
 * → a ação. O Amém não passa pelo perfil (ninguém vê quem deu Amém). Puro, para
 * testar sem tela.
 */
export type PublishStep =
  /** Ainda não entrou na comunidade (não criou o perfil; sem código desde o C3). */
  | 'needs_join'
  /** Participação suspensa ou removida. */
  | 'blocked'
  /** Falta foto, nome, ministério ou a confirmação de 16+ (o servidor recusa com CM007). */
  | 'profile'
  | 'rules'
  | 'consent'
  | 'form'
  /** Membro ativo, textos aceitos, e ainda assim o servidor diz que não pode publicar. */
  | 'cannot_publish';

export function publishStep(status: CommunityStatus): PublishStep {
  if (!status.isMember) return 'needs_join';
  if (status.memberStatus !== 'active') return 'blocked';
  if (!status.profileComplete) return 'profile';
  if (status.needsRules) return 'rules';
  if (status.needsPublishConsent) return 'consent';
  if (!status.canPublish) return 'cannot_publish';
  return 'form';
}

export const ROUTES = {
  publicar: '/comunidade/publicar',
  consentimento: '/comunidade/consentimento',
  regras: '/comunidade/regras',
  /** Perfil da comunidade (foto, nome, ministério, bio, 16+ e e-mail opcional). */
  perfil: '/comunidade/perfil',
} as const;

/**
 * Para onde voltar depois de aceitar. Só rotas internas da Comunidade: o valor
 * chega por parâmetro de rota (que pode vir de um link), e não pode levar a
 * pessoa para fora do app nem para outra área.
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  return /^\/comunidade(\/[a-z0-9-]+)*$/.test(raw) ? raw : null;
}

/** Dia da leitura (1 a 100) vindo de parâmetro de rota, ou null. */
export function parseDay(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\d{1,3}$/.test(raw)) return null;
  const day = Number.parseInt(raw, 10);
  return day >= 1 && day <= 100 ? day : null;
}

/** Parâmetros que seguem de tela em tela no fluxo (nunca o texto da publicação). */
export function flowParams(next: string | null, day: number | null): Record<string, string> {
  const params: Record<string, string> = {};
  if (next) params.next = next;
  if (day !== null) params.day = String(day);
  return params;
}

/** Folga, em pontos, para contar como "chegou ao fim" (o salto elástico do iOS não chega a zero). */
export const END_SLACK = 24;

type ScrollMetrics = {
  contentOffset: { y: number };
  contentSize: { height: number };
  layoutMeasurement: { height: number };
};

/** Chegou ao fim da rolagem das regras? */
export function reachedEnd({ contentOffset, contentSize, layoutMeasurement }: ScrollMetrics): boolean {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - END_SLACK;
}

/** Conteúdo que cabe inteiro na tela conta como lido até o fim: não há rolagem para fazer. */
export function fitsWithoutScroll(viewport: number, contentHeight: number): boolean {
  return viewport > 0 && contentHeight > 0 && contentHeight <= viewport + END_SLACK;
}

export type Sent = { status: ContentStatus; hadPhoto: boolean };

/** O que a pessoa lê depois de enviar. "Em análise" só o autor vê. */
export function sentCopy(sent: Sent): { title: string; message: string } {
  if (sent.status === 'published') {
    return { title: 'Publicado', message: 'Sua publicação já aparece na comunidade.' };
  }
  if (sent.hadPhoto) {
    return {
      title: 'Em análise',
      message:
        'Antes de aparecer, uma pessoa da equipe da igreja olha a sua foto. Enquanto isso, a sua publicação fica ' +
        '"em análise" e só você a vê, em "Minhas publicações".',
    };
  }
  return {
    title: 'Em análise',
    message:
      'O programa que confere os textos segurou a sua publicação, e uma pessoa da equipe olha em seguida. ' +
      'Enquanto isso, ela fica "em análise" e só você a vê, em "Minhas publicações".',
  };
}
