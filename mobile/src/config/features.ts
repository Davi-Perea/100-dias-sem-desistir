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

/**
 * J6 (feedback do fundador, 2026-09-22): TODOS os dias da campanha abrem, sem
 * "Em breve" nem cadeado. Decisão do fundador que substitui a REGRAS 7 (o dia
 * futuro trancado pela rota). CHAVE ÚNICA: voltar a `false` restaura o
 * comportamento antigo inteiro (linhas "Em breve", folha do cadeado, rotas
 * dia/leitor/intercessão/reflexão trancadas), porque tudo passa por
 * `isDayUnlocked` em journey/useJourney.ts.
 *
 * Limites que continuam valendo com a chave ligada:
 *  - antes de 23/09 (fase `before_start`) nenhum dia abre;
 *  - hoje continua o destaque (o painel de hoje);
 *  - concluir um dia é só para hoje e os dias que já passaram (dia futuro se
 *    lê, mas não conta no progresso nem dispara marco antes da hora).
 *
 * RECOMENDADO confirmar com o pastor: a chave libera também o guia de
 * intercessão dos dias futuros.
 */
export const FUTURE_DAYS_OPEN = true;
