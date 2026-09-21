import type { Href } from 'expo-router';

/**
 * Rotas das telas de conta e perfil da Comunidade. As outras telas (feed,
 * publicar) usam estas constantes para chegar aqui.
 */
export const COMMUNITY_ENTRY_ROUTE = '/comunidade/entrar' as Href;
export const COMMUNITY_ACCOUNT_ROUTE = '/comunidade/conta-e-privacidade' as Href;
export const MY_POSTS_ROUTE = '/comunidade/minhas-publicacoes' as Href;
/** Conta de e-mail (código por e-mail), que volta para quem chamou depois do código. */
export const SIGN_IN_ROUTE = '/conta?reason=comunidade' as Href;
