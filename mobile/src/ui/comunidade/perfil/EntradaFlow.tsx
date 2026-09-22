import type { CommunityProfile } from '@/community/types';

import type { MinistryChoice } from './PerfilCampos';

/**
 * A antiga entrada em passos (foto → nome + 16+ → ministério → bio) SAIU em
 * 2026-09-22 (aba "Juntos", pedido do fundador): quem abre a aba já está
 * dentro, e o que expõe a pessoa passa pela tela única de aceite
 * (`app/comunidade/consentimento.tsx`). Foto de perfil, ministério e bio
 * continuam no perfil, opcionais.
 *
 * Ficam aqui só as peças que o perfil ainda usa.
 */

export { NAME_TOO_LONG_COPY } from './PerfilCampos';

export function ministryChoice(profile: CommunityProfile): MinistryChoice {
  if (!profile.ministryAnswered) return undefined;
  return profile.ministry ? { none: false, name: profile.ministry } : { none: true };
}
