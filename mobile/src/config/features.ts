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

/**
 * Foto no Juntos (decisão do fundador, 2026-09-23: lançar hoje, texto primeiro).
 *
 * O filtro automático de imagem depende de uma conta AWS que não existe ainda.
 * Sem ele, toda foto teria de esperar uma pessoa aprovar, uma a uma — e com a
 * igreja inteira publicando isso não se sustenta num domingo.
 *
 * A Apple (1.2) e o Google exigem filtro ANTES de publicar conteúdo gerado por
 * usuário. Texto tem filtro (lista de termos, link, telefone, e-mail, e a fila
 * humana). Imagem não tem. Então imagem sai, e o Juntos nasce como texto +
 * comentários — que é uma decisão de escopo, não uma regra afrouxada.
 *
 * O que NÃO muda com isto: denunciar, bloquear, moderar, o filtro de texto e a
 * fila de moderação continuam iguais.
 *
 * Para religar: conta AWS, credenciais nos secrets das Edge Functions
 * (MODERATION_PROVIDER, AWS_*), e este valor para `true`. O caminho de foto
 * inteiro continua no código, testado — só não tem entrada na tela.
 */
export const COMMUNITY_PHOTOS_ENABLED = false;

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

/**
 * PROVA DE CONCEITO: "Ouvir capítulo" (autorizada pelo fundador em 23/09/2026).
 *
 * Lê em voz alta o texto da Bíblia Livre que já está no app, com a voz do
 * próprio aparelho. Só Gênesis 1, só para avaliar se a qualidade da voz serve.
 *
 * DESLIGADA POR PADRÃO, e é assim que ela fica fora da produção: o build de
 * produção não define a variável, então a chave é `false` e o botão não existe.
 * Ligar exige `EXPO_PUBLIC_POC_OUVIR=true` no ambiente do build de rascunho —
 * um ato explícito, que ninguém faz sem querer.
 *
 * Se a voz for aprovada, isto vira feature de verdade e esta chave morre.
 */
export const POC_OUVIR_ENABLED: boolean = process.env.EXPO_PUBLIC_POC_OUVIR === 'true';

/** Só este capítulo fala, na POC. Escopo dado pelo fundador. */
export const POC_OUVIR_LIVRO = 'GEN';
export const POC_OUVIR_CAPITULO = 1;

/**
 * Comparador de vozes da POC. Existe só para o fundador ouvir as vozes do
 * aparelho dele lado a lado; NUNCA aparece no produto (decisão de 23/09/2026:
 * "no visible technical voice selector in production"). Chave separada da POC
 * justamente para o experimento poder rodar sem ele.
 */
export const POC_OUVIR_VOZES: boolean = process.env.EXPO_PUBLIC_POC_OUVIR_VOZES === 'true';
