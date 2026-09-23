/**
 * Moldura de citação do texto bíblico.
 *
 * O app põe aspas em volta do versículo para ele não parecer texto solto, mas a
 * regra de conteúdo é dura: o texto da tradução nunca é reescrito, cortado nem
 * ajustado. Quando o próprio versículo já usa aspas, a moldura some — inteira.
 *
 * Por que a regra é "tem aspa em qualquer lugar?" e não "tem aspa na ponta?":
 * medido sobre os 31.102 versículos da Bíblia Livre, olhar só as pontas deixava
 * 231 versículos com aspas desemparelhadas na tela; olhar o trecho todo deixa
 * 164 — que são exatamente os que JÁ vêm assim da tradução, porque a fala abre
 * num versículo e fecha em outro. Esses 164 continuam como estão: emparelhá-los
 * seria reescrever o texto. Ou seja, a moldura não acrescenta nem um
 * desequilíbrio. O caso que apareceu primeiro foi Gênesis 12:2–3 ("…serão
 * benditas.”””"), e o Dia 100 tinha o mesmo defeito ao contrário.
 */

/** Aspas tipográficas do pt-BR. */
export const OPEN_QUOTE = '“';
export const CLOSE_QUOTE = '”';

/** Qualquer aspa que uma tradução possa usar numa fala. */
const ANY_QUOTE = /["'“”«»]/;

/** As aspas que faltam em volta de `text` — vazias quando ele já tem as suas. */
export function quoteFrame(text: string): { open: string; close: string } {
  if (ANY_QUOTE.test(text)) return { open: '', close: '' };
  return { open: OPEN_QUOTE, close: CLOSE_QUOTE };
}
