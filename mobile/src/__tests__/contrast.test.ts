import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

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
  // Marca invertida (check, pílula selecionada, número do passo, avatar). No
  // claro é tinta com amarelo; no escuro os papéis trocam com a superfície.
  // Escrever o fundo como `text` dava amarelo sobre branco no tema escuro.
  { fg: 'onMark', bg: 'markSurface', min: 4.5, label: 'conteúdo da marca invertida' },
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
  // A marca precisa se destacar da página em que é desenhada, senão some:
  // com fundo fixo #111111 o círculo desaparecia sobre a página escura.
  { fg: 'markSurface', bg: 'background', min: 3, label: 'marca invertida sobre a página' },
  { fg: 'markSurface', bg: 'surface', min: 3, label: 'marca invertida sobre card' },
  { fg: 'markSurface', bg: 'surfaceWarm', min: 3, label: 'marca invertida sobre off-white' },
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

  test('o conteúdo da marca nunca é a própria superfície da marca', () => {
    expect(palette.onMark).not.toBe(palette.markSurface);
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

  /**
   * Varredura da REGRA das superfícies invertidas, não da forma literal de um
   * bug já corrigido.
   *
   * Uma "superfície invertida" é uma mini-superfície pintada com a tinta e
   * preenchida com conteúdo da marca. Ela quebra de dois jeitos no tema escuro:
   *   1. fundo escrito como `colors.text` — que no escuro é #FFFFFF — com
   *      conteúdo amarelo: 1,46:1, invisível;
   *   2. fundo fixo em #111111 numa tela cujo fundo segue o tema: 1:1 com a
   *      página escura, a superfície deixa de existir.
   * O par `markSurface`/`onMark` resolve os dois. Fundo fixo continua legítimo
   * quando a tela declara que a superfície é fixa (`tone`, `onInk`, `variant`,
   * `isArrival`) — aí o fundo não muda com o tema e a tinta está certa.
   *
   * O próprio scanner é testado abaixo com casos sintéticos, para não virar uma
   * varredura que passa porque não enxerga nada.
   */
  const INK_BACKGROUND = /backgroundColor:\s*[^,;\n]*\bcolors\.text\b/;
  const FIXED_INK_BACKGROUND = /backgroundColor:\s*[^,;\n]*'#111(?:111)?'/;
  const FIXED_SURFACE_GATE = /\bonInk\b|\btone ===|\bvariant ===|\bisArrival\b|\btone\b\s*\?/;
  const BRAND_CONTENT = /(?:color|stroke|fill)\s*[:=]\s*\{?\s*[^,;}\n]*(?:BRAND_YELLOW|'#FFD100'|colors\.accent|colors\.onMark)/;

  /**
   * Devolve "linha: motivo" para cada superfície invertida arriscada.
   *
   * Limite conhecido: o scanner lê texto, não o programa. Ele resolve um nível
   * de apelido local (`const bg = '#111111'` … `backgroundColor: bg`), mas uma
   * cor que venha de outro módulo, de um objeto ou de duas indireções passa.
   * É rede de proteção contra reincidência, não prova de ausência.
   */
  function scanInvertedSurfaces(source: string): string[] {
    const lines = source.split('\n');
    const risks: string[] = [];

    // Apelidos locais que guardam tinta fixa sem declarar superfície fixa.
    const inkAliases = new Set<string>();
    for (const line of lines) {
      const alias = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*[^;\n]*'#111(?:111)?'/.exec(line);
      if (alias && !FIXED_SURFACE_GATE.test(line)) inkAliases.add(alias[1]);
    }
    lines.forEach((line, index) => {
      const inkFromTheme = INK_BACKGROUND.test(line);
      const aliased = /backgroundColor:\s*([A-Za-z_$][\w$]*)\s*[,}]/.exec(line);
      const inkFixed =
        (FIXED_INK_BACKGROUND.test(line) || (aliased !== null && inkAliases.has(aliased[1]))) &&
        !FIXED_SURFACE_GATE.test(line);
      if (!inkFromTheme && !inkFixed) return;
      if (inkFixed) {
        risks.push(`${index + 1}: fundo fixo em tinta sem declarar superfície fixa`);
        return;
      }
      // O conteúdo é filho do elemento: varre até o fechamento da tag.
      for (let k = index + 1; k < Math.min(lines.length, index + 20); k += 1) {
        if (BRAND_CONTENT.test(lines[k])) {
          risks.push(`${index + 1}: fundo \`colors.text\` com conteúdo da marca (linha ${k + 1})`);
          return;
        }
        if (/^\s*<\//.test(lines[k])) return;
      }
    });
    return risks;
  }

  test('o scanner enxerga as formas reais do defeito e poupa os usos legítimos', () => {
    const flagged = [
      `<View style={{ backgroundColor: colors.text }}>\n  <Icon color={BRAND_YELLOW} />\n</View>`,
      `<View style={{ backgroundColor: checked ? colors.text : 'transparent' }}>\n  <Icon color={BRAND_YELLOW} />\n</View>`,
      `<View style={{ backgroundColor: index < step ? colors.text : colors.borderStrong }}>\n  <Text style={{ color: '#FFD100' }}>x</Text>\n</View>`,
      `<View style={{ backgroundColor: colors.text }}>\n  <Text style={{ color: colors.accent }}>x</Text>\n</View>`,
      `<View style={{ backgroundColor: '#111111' }}>\n  <Text>x</Text>\n</View>`,
      // Forma indireta: a tinta passa por um apelido local antes de virar fundo.
      `const bg = '#111111';\n<View style={{ backgroundColor: bg }}>\n  <Text>x</Text>\n</View>`,
    ];
    for (const snippet of flagged) expect(scanInvertedSurfaces(snippet)).not.toEqual([]);

    const clean = [
      // Tinta sobre a página, sem conteúdo da marca: ponto de lista, barra de passos.
      `<View style={{ backgroundColor: colors.text, width: 6 }} />`,
      // Superfície declaradamente fixa.
      `const bg = tone === 'ink' ? '#111111' : colors.surface;`,
      `<View style={{ backgroundColor: onInk ? '#111111' : colors.surface }} />`,
      // Apelido gated: a superfície é fixa por declaração.
      `const bg = tone === 'ink' ? '#111111' : colors.surface;\n<View style={{ backgroundColor: bg }} />`,
      // Amarelo como FUNDO com tinta por cima: o sentido correto.
      `<Text style={{ backgroundColor: BRAND_YELLOW, color: '#111111' }}>x</Text>`,
      // O par novo.
      `<View style={{ backgroundColor: colors.markSurface }}>\n  <Icon color={colors.onMark} />\n</View>`,
    ];
    for (const snippet of clean) expect(scanInvertedSurfaces(snippet)).toEqual([]);
  });

  test('nenhuma superfície invertida do aplicativo perde contraste no tema escuro', () => {
    const src = join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        // O caminho relativo importa: há cinco [day].tsx neste projeto.
        for (const risk of scanInvertedSurfaces(readFileSync(full, 'utf8'))) {
          offenders.push(`${relative(src, full).replace(/\\\\/g, '/')}:${risk}`);
        }
      }
    };
    walk(src);
    expect(offenders).toEqual([]);
  });

  test('preto sobre branco é 21:1 e cores iguais são 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#111111', '#111111')).toBeCloseTo(1, 5);
  });
});
