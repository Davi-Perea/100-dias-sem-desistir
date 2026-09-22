import type { Href } from 'expo-router';

import type { VerseAttachment } from '@/community/types';

import { COMMUNITY_ENTRY_ROUTE, COMMUNITY_PROFILE_ROUTE, MY_POSTS_ROUTE, SIGN_IN_ROUTE } from '../perfil/routes';
import { ROUTES as PUBLISH_ROUTES } from '../publicar/fluxo';

/**
 * Rotas que o feed e a conversa abrem. As telas são de outras partes (entrada e
 * conta em `perfil/`, publicar, regras e consentimento em `publicar/`); aqui só
 * se reaproveitam as constantes delas, para um nome de rota nunca divergir.
 */
export const COMMUNITY_ROUTES = {
  /** Conta de e-mail com código, voltando para a Comunidade (opcional desde 2026-09-22, C2). */
  conta: SIGN_IN_ROUTE,
  /** Entrar sem e-mail (conta do aparelho), e os passos do perfil (sem código, C3). */
  entrar: COMMUNITY_ENTRY_ROUTE,
  /** Perfil da comunidade: foto, nome, ministério, bio, 16+ e e-mail opcional. */
  perfil: COMMUNITY_PROFILE_ROUTE,
  /** C3. A própria tela manda para regras e consentimento quando faltam. */
  publicar: PUBLISH_ROUTES.publicar as Href,
  /** Regras da comunidade, para ler a qualquer momento. */
  regras: { pathname: PUBLISH_ROUTES.regras, params: { ler: '1' } } as unknown as Href,
  /** "Minhas publicações", com status e apagar. */
  minhas: MY_POSTS_ROUTE,
  /** A1, a casa. */
  jornada: '/' as Href,
} as const;

/* A rota do ACEITE saiu daqui (decisão do fundador, 2026-09-22): não há tela de
   aceite antes de participar. O feed e a conversa registram o aceite no próprio
   toque (Amém, Enviar), e o que abre é `regras` — onde os dois textos do aceite
   podem ser lidos. */

/** C6 (desta parte). */
export function commentsHref(postId: string): Href {
  return { pathname: '/comunidade/post/[id]', params: { id: postId } } as unknown as Href;
}

/** F8 · Atividade: Amém e comentários nos meus posts, dentro do app (sem push). */
export const ACTIVITY_ROUTE = '/comunidade/atividade' as Href;

/** "Ver leitura": o leitor no dia anexado ao post. */
export function readerHref(day: number): Href {
  return { pathname: '/reader/[day]', params: { day: String(day) } } as unknown as Href;
}

/**
 * "Ver leitura" de um post que anexou VERSÍCULO e não dia: o capítulo dele na
 * Bíblia (leitura livre, que não conclui dia nenhum da campanha). Mesma rota que
 * `chapterHref` de ui/biblia/bibleNav.ts monta; texto montado e afirmado como
 * `Href` pelo mesmo motivo dito lá (os tipos de rota só se regeneram com o
 * servidor de desenvolvimento).
 */
export function verseHref(verse: VerseAttachment): Href {
  return `/biblia/${verse.book}/${verse.chapter}` as Href;
}
