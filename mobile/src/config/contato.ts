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

/**
 * E-mail de suporte. Autorizado pelo fundador como endereço PÚBLICO em
 * 23/09/2026, e é o mesmo que consta como contato de privacidade no texto já
 * publicado.
 */
export const SUPPORT_EMAIL: string | null = 'pereadavi12@gmail.com';

/**
 * Política de privacidade completa, no domínio de produção.
 *
 * Ficou `null` enquanto a página não existia. Ela está no ar desde 23/09/2026, e
 * manter `null` depois disso é pior que o estado inicial: a tela de Privacidade
 * esconde a linha quando não há URL, então quem usa pelo navegador não tinha
 * caminho nenhum até o texto — que é exigência da LGPD e das duas lojas.
 *
 * Com a barra no fim de propósito: sem ela o servidor responde 301 e o aparelho
 * faz um salto a mais.
 */
export const PRIVACY_URL: string | null = 'https://100diassemdesistir.com.br/politica-de-privacidade/';

/**
 * URL https da página web de exclusão de conta (exigência do Google Play para
 * apps com conta). Enquanto for `null`, o link não aparece em "Conta e
 * privacidade" (src/ui/comunidade/perfil/copy.ts). Ainda NÃO entra em
 * assertContactForStore: a V1 não cria conta em release (a nuvem só liga com
 * ACCOUNT_DELETION_AVAILABLE, em src/cloud/config.ts). Passa a ser obrigatória
 * no build de loja no mesmo dia em que a conta ligar em release.
 */
export const ACCOUNT_DELETION_URL: string | null = 'https://100diassemdesistir.com.br/excluir-conta/';
