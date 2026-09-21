/**
 * LISTA BASE do filtro de palavras (pt-BR). PROPOSTA do engenheiro, 2026-09-21:
 * palavrões e ofensas de uso comum, escritos sem acento e em minúsculas.
 *
 * - Um termo da lista NUNCA recusa um texto: só o segura para uma pessoa olhar.
 *   Por isso ela pode ser mais larga do que estreita.
 * - Quem decide a lista de verdade é a igreja (responsável pelas regras,
 *   docs/product/comunidade/04-moderacao.md). Ela pode:
 *     acrescentar sem deploy  → admin_set_filter_term (fica como termo da igreja);
 *     acrescentar à base      → segredo FILTER_EXTRA_TERMS (lista com vírgulas);
 *     desligar termo da base  → segredo FILTER_DISABLED_TERMS.
 *   Depois de mudar um segredo: rodar a ação sync_terms (COMUNIDADE_V2_DEPLOY.md).
 * - Letra repetida, número no lugar de letra e letras separadas são tratados na
 *   segunda passada (text-filter.ts); não precisa listar as variações aqui.
 */
export const BASE_TERMS_PT_BR: readonly string[] = [
  // palavrões
  'porra',
  'caralho',
  'cacete',
  'merda',
  'bosta',
  'foda',
  'foder',
  'fodase',
  'foda se',
  'fodido',
  'fodida',
  'puta',
  'puto',
  'putaria',
  'filho da puta',
  'fdp',
  'pqp',
  'vsf',
  'vai se foder',
  'tnc',
  'tomar no cu',
  'cu',
  'cuzao',
  'arrombado',
  'arrombada',
  'buceta',
  'xoxota',
  'piroca',
  'punheta',
  'boquete',
  'viado',
  'corno',
  'desgracado',
  'desgracada',
  // ofensas diretas
  'vagabundo',
  'vagabunda',
  'otario',
  'otaria',
  'imbecil',
  'retardado',
  'retardada',
  'babaca',
  'escroto',
  'escrota',
  'lixo humano',
  // conteúdo sexual e pedido de dinheiro (golpe comum; doação está fora do escopo)
  'nudes',
  'pix',
];
