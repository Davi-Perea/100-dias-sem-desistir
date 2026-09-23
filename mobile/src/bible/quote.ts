/**
 * Moldura de citação do texto bíblico.
 *
 * O app põe aspas em volta do versículo para ele não parecer texto solto, mas a
 * regra de conteúdo é dura: o texto da tradução nunca é reescrito, cortado nem
 * ajustado. Quando a própria tradução já traz aspas na ponta — Gênesis 12:2–3 é
 * fala de Deus e a Bíblia Livre fecha com elas —, somar a nossa produzia
 * "…serão benditas.”””". Quem cede é a moldura, não o versículo.
 */

/** Aspas tipográficas do pt-BR. */
export const OPEN_QUOTE = '“';
export const CLOSE_QUOTE = '”';

/** Qualquer aspa que uma tradução possa usar nas pontas de uma fala. */
const QUOTE_EDGE = /["'“”«»]/;

/** As aspas que faltam em volta de `text` — vazias do lado que já tem a sua. */
export function quoteFrame(text: string): { open: string; close: string } {
  const trimmed = text.trim();
  const first = trimmed.charAt(0);
  const last = trimmed.charAt(trimmed.length - 1);
  return {
    open: first && QUOTE_EDGE.test(first) ? '' : OPEN_QUOTE,
    close: last && QUOTE_EDGE.test(last) ? '' : CLOSE_QUOTE,
  };
}
