/**
 * Interruptores de superfície da build. Uma superfície desligada aqui continua
 * existindo como rota (para o trabalho futuro), mas não tem entrada visível.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: a Comunidade não tem servidor
 * na V1 e a Apple rejeita aba ou tela "em breve"/"indisponível" — App Review
 * Guideline 2.1, completude do app). A barra fica Jornada · Você. Religar só
 * quando o feed (grupo C) existir de verdade e a nuvem puder ligar em release
 * (D-6: exclusão de conta no app e na web).
 */
export const COMMUNITY_ENABLED = false;
