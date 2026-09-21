/**
 * Rótulo falado de uma referência bíblica (REGRAS 32): sem "·" nem "–", que o
 * leitor de tela pronunciaria como símbolos. "Josué 6–17 · Salmos 23" vira
 * "Josué 6 a 17, Salmos 23".
 */
export function spokenReference(label: string): string {
  return label
    .replace(/\s*[–—-]\s*/g, ' a ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*~\s*/g, ' cerca de ')
    .trim();
}
