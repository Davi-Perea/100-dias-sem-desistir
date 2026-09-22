/**
 * Cores do marca-texto (item B2 do feedback de 2026-09-22).
 *
 * Cinco tons, um par por tema. O texto sobre a marca continua o do tema
 * (`text`) e o número do versículo continua `textMuted`; os valores foram
 * escolhidos para que os DOIS passem 4,5:1 sobre cada cor (medido em
 * `marcas.test.tsx`):
 *   claro — tinta #111111 de 14,38:1 a 16,33:1; numeral #5C5A54 de 5,25:1 a 5,96:1;
 *   escuro — branco de 12,41:1 a 13,99:1; numeral #A6A29A de 4,88:1 a 5,50:1.
 *
 * A marca contra a página mede só 1,2–1,5:1: ela é realce, nunca o único
 * sinal. A cor vai escrita no nome falado do versículo e na lista de anotações,
 * e a amostra da folha tem limite em `controlBorder`.
 *
 * Os tons não são o amarelo da marca (#FFD100): aquele é preenchimento de
 * interface, e realce de leitura em amarelo cheio cansaria o texto longo.
 */
export type HighlightId = 'amarelo' | 'verde' | 'azul' | 'rosa' | 'laranja';

export type Highlight = { id: HighlightId; label: string; light: string; dark: string };

export const HIGHLIGHTS: readonly Highlight[] = [
  { id: 'amarelo', label: 'Amarelo', light: '#FFEFA8', dark: '#3D3405' },
  { id: 'verde', label: 'Verde', light: '#D5EDD3', dark: '#1B3A24' },
  { id: 'azul', label: 'Azul', light: '#D6E4F7', dark: '#1C2E4D' },
  { id: 'rosa', label: 'Rosa', light: '#F7D9E3', dark: '#45202F' },
  { id: 'laranja', label: 'Laranja', light: '#FBDDC4', dark: '#452A12' },
];

export function isHighlightId(value: unknown): value is HighlightId {
  return HIGHLIGHTS.some((h) => h.id === value);
}

export function getHighlight(id: HighlightId): Highlight {
  return HIGHLIGHTS.find((h) => h.id === id) ?? HIGHLIGHTS[0];
}

export function highlightColor(id: HighlightId, isDark: boolean): string {
  const h = getHighlight(id);
  return isDark ? h.dark : h.light;
}
