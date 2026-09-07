import { palettes, type Palette } from '@/ui/theme';

/**
 * Regressão de contraste WCAG 2.1 nos dois temas.
 * Texto: 4.5:1. Limite de controle interativo (WCAG 1.4.11): 3:1.
 * Este teste falha se alguém mudar um token e quebrar a legibilidade.
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
  { fg: 'text', bg: 'surfaceMuted', min: 4.5, label: 'corpo sobre card mudo' },
  { fg: 'text', bg: 'readerBackground', min: 4.5, label: 'texto do leitor' },
  { fg: 'textSecondary', bg: 'background', min: 4.5, label: 'secundário sobre fundo' },
  { fg: 'textSecondary', bg: 'surface', min: 4.5, label: 'secundário sobre card' },
  { fg: 'textMuted', bg: 'background', min: 4.5, label: 'auxiliar sobre fundo' },
  { fg: 'textMuted', bg: 'surface', min: 4.5, label: 'auxiliar sobre card' },
  { fg: 'textMuted', bg: 'surfaceMuted', min: 4.5, label: 'auxiliar sobre card mudo' },
  { fg: 'accent', bg: 'background', min: 4.5, label: 'acento como texto' },
  { fg: 'accent', bg: 'surface', min: 4.5, label: 'acento sobre card' },
  { fg: 'accent', bg: 'accentSoft', min: 4.5, label: 'acento sobre card de acento' },
  { fg: 'onAccent', bg: 'accent', min: 4.5, label: 'texto do botão primário' },
  { fg: 'danger', bg: 'background', min: 4.5, label: 'texto de erro' },
  { fg: 'onDanger', bg: 'danger', min: 4.5, label: 'texto do botão destrutivo' },
  { fg: 'devBanner', bg: 'devBannerSurface', min: 4.5, label: 'aviso de conteúdo DEV' },
];

const NON_TEXT_PAIRS: Pair[] = [
  { fg: 'controlBorder', bg: 'background', min: 3, label: 'contorno de controle sobre fundo' },
  { fg: 'controlBorder', bg: 'surface', min: 3, label: 'contorno de controle sobre card' },
  { fg: 'controlBorder', bg: 'surfaceMuted', min: 3, label: 'contorno de controle sobre card mudo' },
  { fg: 'success', bg: 'surface', min: 3, label: 'ícone de concluído' },
  { fg: 'success', bg: 'accentSoft', min: 3, label: 'ícone de concluído sobre acento' },
  { fg: 'accent', bg: 'surfaceSunken', min: 3, label: 'barra de progresso preenchida' },
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
});

describe('sanidade da fórmula', () => {
  test('preto sobre branco é 21:1 e cores iguais são 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#1F5F5B', '#1F5F5B')).toBeCloseTo(1, 5);
  });
});
