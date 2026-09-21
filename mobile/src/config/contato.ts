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
 */

/** E-mail de suporte (ex.: "contato@igreja.org"). Preenchido pelo fundador antes do envio. */
export const SUPPORT_EMAIL: string | null = null;

/** URL https da política de privacidade completa. Preenchido pelo fundador antes do envio. */
export const PRIVACY_URL: string | null = null;

/**
 * URL https da página web de exclusão de conta (exigência do Google Play para
 * apps com conta). Enquanto for `null`, o link não aparece em "Conta e
 * privacidade" (src/ui/comunidade/perfil/copy.ts). Ainda NÃO entra em
 * assertContactForStore: a V1 não cria conta em release (a nuvem só liga com
 * ACCOUNT_DELETION_AVAILABLE, em src/cloud/config.ts). Passa a ser obrigatória
 * no build de loja no mesmo dia em que a conta ligar em release.
 */
export const ACCOUNT_DELETION_URL: string | null = null;
