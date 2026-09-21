/**
 * Interruptores de superfície da build. Uma superfície desligada aqui continua
 * existindo como rota (para o trabalho futuro), mas não tem entrada visível.
 *
 * Comunidade (branch comunidade-v2): liga só com
 * `EXPO_PUBLIC_COMMUNITY_ENABLED=true` no ambiente do build (o Babel do Expo
 * embute o valor em tempo de build; por isso a leitura é o literal
 * `process.env.EXPO_PUBLIC_...`, sem desestruturar). Qualquer outro valor, ou a
 * ausência da variável, é DESLIGADO: sem ela o app é idêntico à V1 (barra
 * Jornada · Bíblia · Você, leitor fechando ao concluir).
 *
 * Padrão desligado (decisão do engenheiro, 2026-09-21): a Apple rejeita aba ou
 * tela "em breve"/"indisponível" (App Review Guideline 2.1), e a Comunidade só
 * vai a público com servidor no ar, exclusão de conta no app e na web (D-6) e o
 * texto legal aprovado.
 */
export const COMMUNITY_ENABLED: boolean = process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true';
