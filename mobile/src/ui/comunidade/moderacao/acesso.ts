import type { CommunityStatus } from '@/community/types';

/**
 * Pode abrir a moderação? O papel vem do servidor (`is_moderator`), e o estado
 * da PRÓPRIA conta do moderador na comunidade vale por cima dele: quem foi
 * suspenso ou removido não modera ninguém, nem enquanto o papel não é tirado.
 *
 * `memberStatus` nulo é quem modera sem perfil na comunidade (administrador do
 * app): o papel continua valendo.
 *
 * Isto só decide o que a TELA mostra. A regra de verdade precisa estar no
 * servidor (`private.is_community_moderator()`), pedida ao agente de SQL:
 * sem ela, as RPCs de moderação ainda aceitariam um moderador suspenso.
 */
export function canModerate(status: Pick<CommunityStatus, 'isModerator' | 'memberStatus'>): boolean {
  if (!status.isModerator) return false;
  return status.memberStatus !== 'suspended' && status.memberStatus !== 'removed';
}
