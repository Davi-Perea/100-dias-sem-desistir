import type { Href } from 'expo-router';

/**
 * Rotas das telas de conta e perfil da Comunidade. As outras telas (feed,
 * publicar) usam estas constantes para chegar aqui.
 */
export const COMMUNITY_ENTRY_ROUTE = '/comunidade/entrar' as Href;
export const COMMUNITY_ACCOUNT_ROUTE = '/comunidade/conta-e-privacidade' as Href;
/** Perfil (C4): foto, nome, ministério, bio, 16+ e e-mail opcional (N3). */
export const COMMUNITY_PROFILE_ROUTE = '/comunidade/perfil' as Href;
export const MY_POSTS_ROUTE = '/comunidade/minhas-publicacoes' as Href;
/**
 * Conta de e-mail (código por e-mail), que volta para quem chamou depois do
 * código. Desde 2026-09-22 (C2) a comunidade NÃO leva mais para cá: a entrada é
 * sem e-mail. Fica para quem já tem conta de e-mail e quer usá-la.
 */
export const SIGN_IN_ROUTE = '/conta?reason=comunidade' as Href;
