/**
 * Contato e política de privacidade publicados nas telas "Ajuda e contato" e
 * "Privacidade".
 *
 * Preenchido pelo fundador antes do envio às lojas. Enquanto for `null`, a
 * linha ou o link correspondente NÃO aparece: nunca um link quebrado nem um
 * endereço inventado.
 *
 * Atenção antes de enviar: a App Store (diretriz 1.5) exige um meio de contato
 * alcançável no app, e as duas lojas pedem a URL da política de privacidade.
 * A variante production do app.config.ts (assertContactForStore) RECUSA gerar o
 * build de loja enquanto algum dos dois for null ou a URL não for https.
 * Sem e-mail, a tela e a linha em Você se chamam "Ajuda" (não "Ajuda e contato").
 *
 * REGRA (2026-09-22, feedback do fundador): nada de RÓTULO SEM VALOR. Enquanto
 * o e-mail não existir, a LINHA INTEIRA some — rótulo, cap da seção, rodapé,
 * "quem cuida deste app". Não vale mostrar "Enviar um e-mail" sem endereço,
 * nem "E-mail: —", nem um rótulo cinza desabilitado.
 *
 * Quem for escrever uma superfície nova de contato: trate string vazia e
 * espaços em branco como AUSENTE (`SUPPORT_EMAIL?.trim() || null`, como em
 * `app/ajuda.tsx`) e trate ausente como "esta parte da tela não existe hoje".
 * A conferência não fica aqui, e sim em cada tela, porque os testes trocam este
 * módulo por um dublê com as duas constantes.
 */

/** E-mail de suporte (ex.: "contato@igreja.org"). Preenchido pelo fundador antes do envio. */
export const SUPPORT_EMAIL: string | null = null;

/** URL https da política de privacidade completa. Preenchido pelo fundador antes do envio. */
export const PRIVACY_URL: string | null = null;
