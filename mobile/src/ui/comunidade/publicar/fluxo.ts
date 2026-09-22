import type { CommunityStatus, ContentStatus } from '@/community/types';
import { cleanText } from '@/community/validation';

/**
 * Antes da primeira publicação, comentário ou Amém (pedido do fundador de
 * 2026-09-22, aba “Juntos”): UMA tela só, com a confirmação de 16+ (ECA
 * Digital), o aceite das regras (Google Play), o consentimento destacado (LGPD
 * art. 11) e o nome, se a pessoa ainda não deu um. Foto de perfil e ministério
 * NÃO são mais exigidos. Ler não passa por aqui.
 */
export function needsAceite(status: CommunityStatus): boolean {
  return (
    status.needsRules ||
    status.needsPublishConsent ||
    !status.profile.ageConfirmed ||
    !cleanText(status.displayName ?? status.profile.displayName)
  );
}

/** Onde a tela de publicar está. Puro, para testar sem tela. */
export type PublishStep =
  /** Ainda não entrou (a entrada é automática; a tela espera). */
  | 'needs_join'
  /** Participação suspensa ou removida. */
  | 'blocked'
  /** Falta a tela única de aceite (16+, regras, consentimento, nome). */
  | 'aceite'
  | 'form';

export function publishStep(status: CommunityStatus): PublishStep {
  if (!status.isMember) return status.memberStatus ? 'blocked' : 'needs_join';
  if (status.memberStatus !== 'active') return 'blocked';
  if (needsAceite(status)) return 'aceite';
  return 'form';
}

export const ROUTES = {
  publicar: '/comunidade/publicar',
  consentimento: '/comunidade/consentimento',
  regras: '/comunidade/regras',
  /** Perfil da comunidade (nome, bio, foto e ministério opcionais, e-mail opcional). */
  perfil: '/comunidade/perfil',
  /** A aba Juntos (o feed). */
  juntos: '/juntos',
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
    return { title: 'Publicado', message: 'Sua publicação já aparece no Juntos.' };
  }
  if (sent.hadPhoto) {
    return {
      title: 'Em análise',
      message:
        // F5: o filtro automático desconfiou da foto (ou não há filtro, e toda foto espera uma pessoa).
        'Antes de aparecer para todos, a sua foto passa pelo olhar de uma pessoa da equipe da igreja. Enquanto isso, ' +
        'a sua publicação fica "em análise" e só você a vê, em "Minhas publicações".',
    };
  }
  return {
    title: 'Em análise',
    message:
      'O programa que confere os textos segurou a sua publicação, e uma pessoa da equipe olha em seguida. ' +
      'Enquanto isso, ela fica "em análise" e só você a vê, em "Minhas publicações".',
  };
}
