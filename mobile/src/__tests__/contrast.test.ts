import { BRAND_YELLOW, palettes, type Palette } from '@/ui/theme';

/**
 * Regressão de contraste WCAG 2.1 nos dois temas.
 * Texto: 4.5:1. Limite de controle interativo (WCAG 1.4.11): 3:1.
 *
 * O sistema do handoff tem uma regra que este arquivo protege: o amarelo da
 * marca é PREENCHIMENTO, nunca tinta de texto. Por isso não existe par
 * "accent como texto" aqui — existe o par inverso, tinta sobre amarelo.
 */
function relativeLuminance(hex: string): number {
  const channels = (hex.replace('#', '').match(/../g) ?? []).map((pair) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

type Pair = { fg: keyof Palette; bg: keyof Palette; min: number; label: string };

const TEXT_PAIRS: Pair[] = [
  { fg: 'text', bg: 'background', min: 4.5, label: 'corpo sobre fundo' },
  { fg: 'text', bg: 'surface', min: 4.5, label: 'corpo sobre card' },
  { fg: 'text', bg: 'surfaceWarm', min: 4.5, label: 'corpo sobre off-white quente' },
  { fg: 'text', bg: 'surfaceMuted', min: 4.5, label: 'corpo sobre card mudo' },
  { fg: 'text', bg: 'readerBackground', min: 4.5, label: 'texto do leitor' },
  { fg: 'textSecondary', bg: 'background', min: 4.5, label: 'secundário sobre fundo' },
  { fg: 'textSecondary', bg: 'surface', min: 4.5, label: 'secundário sobre card' },
  { fg: 'textSecondary', bg: 'surfaceWarm', min: 4.5, label: 'secundário sobre off-white' },
  { fg: 'textMuted', bg: 'background', min: 4.5, label: 'auxiliar sobre fundo' },
  { fg: 'textMuted', bg: 'surface', min: 4.5, label: 'auxiliar sobre card' },
  { fg: 'textMuted', bg: 'surfaceWarm', min: 4.5, label: 'auxiliar sobre off-white' },
  { fg: 'textMuted', bg: 'surfaceMuted', min: 4.5, label: 'auxiliar sobre card mudo' },
  // Aba inativa da tab bar de vidro; o vidro assenta sobre estas duas superfícies.
  { fg: 'navInactive', bg: 'surface', min: 4.5, label: 'aba inativa sobre vidro claro' },
  { fg: 'navInactive', bg: 'surfaceWarm', min: 4.5, label: 'aba inativa sobre vidro quente' },
  // Tinta sobre amarelo: pílula da aba ativa, botão amarelo, realce de texto.
  { fg: 'onAccent', bg: 'accent', min: 4.5, label: 'tinta sobre amarelo da marca' },
  { fg: 'danger', bg: 'background', min: 4.5, label: 'texto de erro' },
  { fg: 'onDanger', bg: 'danger', min: 4.5, label: 'texto do botão destrutivo' },
  { fg: 'devBanner', bg: 'devBannerSurface', min: 4.5, label: 'aviso de conteúdo DEV' },
];

const NON_TEXT_PAIRS: Pair[] = [
  { fg: 'controlBorder', bg: 'background', min: 3, label: 'contorno de controle sobre fundo' },
  { fg: 'controlBorder', bg: 'surface', min: 3, label: 'contorno de controle sobre card' },
  { fg: 'controlBorder', bg: 'surfaceWarm', min: 3, label: 'contorno de controle sobre off-white' },
  { fg: 'controlBorder', bg: 'surfaceMuted', min: 3, label: 'contorno de controle sobre card mudo' },
  // Nó de dia concluído na Jornada e o check dentro dele.
  { fg: 'nodeDone', bg: 'surface', min: 3, label: 'nó de dia concluído' },
  { fg: 'surface', bg: 'nodeDone', min: 3, label: 'check dentro do nó concluído' },
  { fg: 'success', bg: 'surface', min: 3, label: 'ícone de concluído' },
];

describe.each([
  ['claro', palettes.light],
  ['escuro', palettes.dark],
])('contraste no tema %s', (_name, palette) => {
  test.each(TEXT_PAIRS)('texto $fg sobre $bg ($label) ≥ $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });

  test.each(NON_TEXT_PAIRS)('elemento $fg sobre $bg ($label) ≥ $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });

  test('todo token é um hex de 6 dígitos', () => {
    for (const value of Object.values(palette)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  test('amarelo e a tinta que vai sobre ele nunca são a mesma cor', () => {
    expect(palette.onAccent).not.toBe(palette.accent);
  });
});

describe('regras do sistema visual', () => {
  test('o token de acento é exatamente o amarelo da marca nos dois temas', () => {
    expect(palettes.light.accent).toBe(BRAND_YELLOW);
    expect(palettes.dark.accent).toBe(BRAND_YELLOW);
  });

  /**
   * O preenchimento amarelo da régua e das barras de progresso mede ~1,4:1 contra
   * a trilha clara — abaixo de 3:1. Isso é aceito porque o amarelo nunca carrega
   * o dado sozinho: a régua diferencia os dias pela ALTURA e pela FORMA do traço,
   * e toda barra de progresso acompanha rótulo em texto mais `accessibilityValue`.
   * O teste registra a medição para que a exceção continue explícita.
   */
  test('o preenchimento de progresso é medido e documentado como exceção', () => {
    const fill = contrastRatio(palettes.light.accent, palettes.light.surfaceSunken);
    expect(fill).toBeLessThan(3);
    expect(fill).toBeGreaterThan(1);
  });

  /**
   * A regra "amarelo nunca é tinta de texto" existe por causa desta medição:
   * 1,46:1 sobre branco. No tema escuro o mesmo amarelo passa folgado sobre a
   * tinta, e é assim que o handoff o usa no Dia 100 — a proibição vale para
   * superfície clara, que é onde ela pode ser violada sem querer.
   */
  test('o amarelo da marca é ilegível como texto sobre superfície clara', () => {
    expect(contrastRatio(palettes.light.accent, palettes.light.surface)).toBeLessThan(4.5);
    expect(contrastRatio(palettes.dark.accent, palettes.dark.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('preto sobre branco é 21:1 e cores iguais são 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#111111', '#111111')).toBeCloseTo(1, 5);
  });
});
