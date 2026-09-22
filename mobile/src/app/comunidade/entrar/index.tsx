import { Redirect } from 'expo-router';

import { ROUTES } from '@/ui/comunidade/publicar/fluxo';

/**
 * `/comunidade/entrar` não é mais uma tela (2026-09-22, aba "Juntos"): a
 * entrada é automática ao abrir o feed. Links antigos (perfil, conta e
 * privacidade) caem direto no Juntos.
 */
export default function EntrarNoJuntos() {
  return <Redirect href={ROUTES.juntos as never} />;
}
