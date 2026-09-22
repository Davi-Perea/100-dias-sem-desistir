import type { CommunityStatus, ContentStatus } from '@/community/types';
import { cleanText } from '@/community/validation';

/**
 * Falta registrar o aceite (16+ do ECA Digital, regras do Google Play,
 * consentimento destacado da LGPD art. 11, e o nome, se a pessoa ainda não deu
 * um)? Ler nunca passa por aqui.
 *
 * DECISÃO DO FUNDADOR (2026-09-22): isto NÃO é mais uma tela no meio do caminho.
 * A linha embaixo do botão diz o que o toque significa, e o toque em Publicar
 * (ou em Enviar comentário, ou no primeiro Amém) registra o aceite e faz a ação
 * em seguida. Esta função é só "o aceite já está registrado?".
 */
export function needsAceite(status: CommunityStatus): boolean {
  return (
    status.needsRules ||
    status.needsPublishConsent ||
    !status.profile.ageConfirmed ||
    !cleanText(status.displayName ?? status.profile.displayName)
  );
}

/**
 * Onde a tela de publicar está. Puro, para testar sem tela. Não existe mais o
 * passo 'aceite' (2026-09-22): quem é membro ativo vê o formulário, e o aceite
 * acontece no toque em Publicar.
 */
export type PublishStep =
  /** Ainda não entrou (a entrada é automática; a tela espera). */
  | 'needs_join'
  /** Participação suspensa ou removida. */
  | 'blocked'
  | 'form';

export function publishStep(status: CommunityStatus): PublishStep {
  if (!status.isMember) return status.memberStatus ? 'blocked' : 'needs_join';
  if (status.memberStatus !== 'active') return 'blocked';
  return 'form';
}

export const ROUTES = {
  publicar: '/comunidade/publicar',
  /**
   * Rota ANTIGA da tela de aceite. Ela não tem mais tela: quem chega por um link
   * velho é levado às regras (`app/comunidade/consentimento.tsx`).
   */
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

/*
 * `reachedEnd` e `fitsWithoutScroll` saíram (2026-09-22): eles existiam para
 * liberar o botão de aceitar depois de rolar as regras até o fim, e não há mais
 * botão de aceitar em tela nenhuma.
 */

export type Sent = { status: ContentStatus; hadPhoto: boolean };

/**
 * O que a pessoa lê depois de enviar. "Em análise" só o autor vê.
 *
 * FOTO: o desenho é publicar direto (decisão do fundador, 2026-09-22). Mas o F5
 * do próprio feedback mantém o caminho seguro: "sem filtro configurado, cai para
 * aprovação humana". Hoje o servidor está EXATAMENTE assim — sem
 * `MODERATION_PROVIDER`, `submit-post` devolve `in_review` para toda foto —, e
 * então dizer "o filtro automático segurou a SUA foto" seria contar um exame que
 * não houve. A frase abaixo é verdadeira nos dois casos (filtro desconfiou ×
 * ainda não há filtro) e não muda de sentido quando o filtro for ligado.
 * REVISÃO FINAL 2026-09-22: corrigido aqui; a decisão de ligar o filtro (ou de
 * publicar sem ele) continua sendo do fundador e não depende deste texto.
 */
export function sentCopy(sent: Sent): { title: string; message: string } {
  if (sent.status === 'published') {
    return { title: 'Publicado', message: 'Sua publicação já aparece no Juntos.' };
  }
  if (sent.hadPhoto) {
    return {
      title: 'Em análise',
      message:
        'A sua foto está passando por uma conferência antes de aparecer para todos, e uma pessoa da equipe da ' +
        'igreja olha em seguida. Enquanto isso, a sua publicação fica "em análise" e só você a vê, em ' +
        '"Minhas publicações".',
    };
  }
  return {
    title: 'Em análise',
    message:
      'O programa que confere os textos segurou a sua publicação, e uma pessoa da equipe olha em seguida. ' +
      'Enquanto isso, ela fica "em análise" e só você a vê, em "Minhas publicações".',
  };
}
