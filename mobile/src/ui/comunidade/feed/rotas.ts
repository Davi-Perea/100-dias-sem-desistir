import type { Href } from 'expo-router';

import type { CommunityStatus } from '@/community/types';

import { COMMUNITY_ENTRY_ROUTE, MY_POSTS_ROUTE, SIGN_IN_ROUTE } from '../perfil/routes';
import { ROUTES as PUBLISH_ROUTES } from '../publicar/fluxo';

/**
 * Rotas que o feed e a conversa abrem. As telas são de outras partes (entrada e
 * conta em `perfil/`, publicar, regras e consentimento em `publicar/`); aqui só
 * se reaproveitam as constantes delas, para um nome de rota nunca divergir.
 */
export const COMMUNITY_ROUTES = {
  /** Conta de e-mail com código, voltando para a Comunidade. */
  conta: SIGN_IN_ROUTE,
  /** Código da igreja, nome e declaração de 18+. */
  entrar: COMMUNITY_ENTRY_ROUTE,
  /** C3. A própria tela manda para regras e consentimento quando faltam. */
  publicar: PUBLISH_ROUTES.publicar as Href,
  /** Regras da comunidade, para ler a qualquer momento. */
  regras: { pathname: PUBLISH_ROUTES.regras, params: { ler: '1' } } as unknown as Href,
  /** "Minhas publicações", com status e apagar. */
  minhas: MY_POSTS_ROUTE,
  /** A1, a casa. */
  jornada: '/' as Href,
} as const;

/**
 * Antes do primeiro comentário ou Amém: regras (se faltarem) e depois o
 * consentimento destacado. Sem `next`: ao aceitar, o fluxo volta para a tela
 * que pediu (o feed ou os comentários), e a pessoa toca de novo — nada é
 * enviado sem um toque dela depois do aceite.
 */
export function consentHref(status: CommunityStatus): Href {
  return (status.needsRules ? PUBLISH_ROUTES.regras : PUBLISH_ROUTES.consentimento) as Href;
}

/** C6 (desta parte). */
export function commentsHref(postId: string): Href {
  return { pathname: '/comunidade/post/[id]', params: { id: postId } } as unknown as Href;
}
