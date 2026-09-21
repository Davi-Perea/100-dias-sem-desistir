import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { BRAND_YELLOW, fixedPalette, palettes, type Palette } from '@/ui/theme';

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
  // "Não foi possível salvar" dentro do painel quente de hoje (PER-02).
  { fg: 'danger', bg: 'surfaceWarm', min: 4.5, label: 'texto de erro sobre off-white' },
  { fg: 'onDanger', bg: 'danger', min: 4.5, label: 'texto do botão destrutivo' },
  { fg: 'devBanner', bg: 'devBannerSurface', min: 4.5, label: 'aviso de conteúdo DEV' },
  // --- redesenho "100 dias sem desistir" -------------------------------------
  { fg: 'warning', bg: 'warningSurface', min: 4.5, label: 'faixa de aviso de conteúdo (C-07)' },
  // Caixa "TEXTO AINDA NÃO LIBERADO" do leitor (B1): aviso sobre off-white quente.
  { fg: 'warning', bg: 'surfaceWarm', min: 4.5, label: 'aviso do texto não liberado (B1)' },
  { fg: 'onAlert', bg: 'alertSurface', min: 4.5, label: 'texto da faixa sem internet' },
  { fg: 'onAccentMuted', bg: 'accent', min: 4.5, label: 'secundário sobre amarelo' },
  // O azul é a comunidade e, diferente do amarelo, pode ser texto.
  { fg: 'blue', bg: 'background', min: 4.5, label: 'azul como texto sobre a página' },
  { fg: 'blue', bg: 'surface', min: 4.5, label: 'azul como texto sobre card' },
  { fg: 'blue', bg: 'surfaceWarm', min: 4.5, label: 'azul sobre off-white (cap "HOJE")' },
  { fg: 'blue', bg: 'surfaceMuted', min: 4.5, label: 'azul sobre card mudo' },
  { fg: 'blue', bg: 'blueSoft', min: 4.5, label: '"Em aberto" na linha azul da Jornada' },
  { fg: 'onBlue', bg: 'blue', min: 4.5, label: 'rótulo do botão azul' },
  { fg: 'onBlueSoft', bg: 'blueSoft', min: 4.5, label: 'texto na faixa azul pálida' },
  { fg: 'text', bg: 'blueSoft', min: 4.5, label: 'tinta na faixa azul pálida' },
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
  // Nós da jornada: forma E contraste. O anel azul do "em aberto" e o ponto
  // cheio do "lido" são os que carregam estado.
  { fg: 'blue', bg: 'background', min: 3, label: 'anel do dia em aberto' },
  { fg: 'blue', bg: 'blueSoft', min: 3, label: 'anel do dia em aberto na linha azul' },
  { fg: 'text', bg: 'surfaceWarm', min: 3, label: 'nó de dia lido' },
  { fg: 'alertSurface', bg: 'background', min: 3, label: 'faixa sem internet contra a página' },
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

/**
 * Superfícies fixas (F1, E3 amarelas; C4, E2, E4 de tinta) não mudam com o tema,
 * e o conteúdo delas também não pode mudar. O TELAS.md escrevia ali tokens
 * temáticos; estes testes medem as paletas fixas que substituem esses tokens,
 * e registram o defeito que elas evitam, para ninguém "simplificar" de volta.
 */
describe('superfícies fixas', () => {
  const ink = fixedPalette('ink');
  const yellow = fixedPalette('yellow');

  test.each([
    ['texto principal', ink.text],
    ['texto secundário ("Apocalipse 21:5")', ink.textSecondary],
    ['legenda', ink.textMuted],
    ['amarelo como texto ("Passo 3 de 5" no modo altar)', ink.accent],
  ])('sobre tinta, %s passa 4,5:1', (_label, fg) => {
    expect(contrastRatio(fg, ink.background)).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    ['texto principal', yellow.text],
    ['texto secundário (frase do marco)', yellow.textSecondary],
    ['secundário sobre amarelo', yellow.onAccentMuted],
  ])('sobre amarelo, %s passa 4,5:1', (_label, fg) => {
    expect(contrastRatio(fg, yellow.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('a faixa C-07 com tone fixo (E2/E3/E4) é legível nas duas superfícies', () => {
    for (const fixed of [ink, yellow]) {
      expect(contrastRatio(fixed.warning, fixed.warningSurface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('o botão primário continua legível nas duas superfícies fixas', () => {
    // Primário = fundo `text`, rótulo `surface` da paleta da superfície.
    expect(contrastRatio(yellow.surface, yellow.text)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ink.surface, ink.text)).toBeGreaterThanOrEqual(4.5);
    // E o botão em si se destaca do fundo amarelo.
    expect(contrastRatio(yellow.text, yellow.background)).toBeGreaterThanOrEqual(3);
  });

  test('"Marco guardado" (E3) é texto em cor plena sobre o amarelo: 12,92:1, nunca 0,45 de opacidade', () => {
    // O sublinhado com tone="yellow" usa `text` da paleta amarela. O botão fica
    // ativo depois do toque; desabilitado a 0,45 dava 2,82:1 (R3-5).
    expect(contrastRatio(yellow.text, yellow.background)).toBeCloseTo(12.92, 1);
    expect(
      Math.round(contrastRatio(composite(yellow.text, yellow.background, 0.45), yellow.background) * 100) / 100,
    ).toBeLessThan(3);
  });

  test('"‹" inativo do passo 1 no modo altar (E2): 1,67:1 declarado, controle inativo isento', () => {
    // Cor plana `borderStrong` do escuro, sem opacidade (ALTAR_PREVIOUS_INACTIVE).
    expect(Math.round(contrastRatio(ink.borderStrong, ink.background) * 100) / 100).toBeCloseTo(1.67, 1);
    // Ativo, a borda branca passa bem do limite de controle.
    expect(contrastRatio(ink.text, ink.background)).toBeGreaterThanOrEqual(3);
  });

  test('o defeito que as paletas fixas evitam: token temático sobre superfície fixa some', () => {
    // O `textSecondary` do tema claro sobre tinta, e o do escuro sobre amarelo.
    expect(contrastRatio(palettes.light.textSecondary, '#111111')).toBeLessThan(2);
    expect(contrastRatio(palettes.dark.textSecondary, BRAND_YELLOW)).toBeLessThan(1.5);
  });
});

/** Mistura `fg` sobre `bg` com opacidade `alpha` — o que a tela mostra de fato. */
function composite(fg: string, bg: string, alpha: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.replace('#', '').slice(i * 2, i * 2 + 2), 16);
  const mixed = [0, 1, 2].map((i) => Math.round(alpha * channel(fg, i) + (1 - alpha) * channel(bg, i)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * O TOKENS §5 exige: "se usar opacidade para desabilitado, declare o contraste
 * resultante, porque auditoria de token não enxerga opacidade". A opacidade vale
 * para o botão inteiro — fundo e rótulo misturam-se com a página. Controle
 * inativo é isento da WCAG 1.4.3; os números ficam registrados aqui para a
 * decisão continuar à vista, e mudam se alguém mexer na opacidade ou nas cores.
 */
describe('botão desabilitado a 0,45 — contraste declarado', () => {
  const ALPHA = 0.45;
  const measure = (label: string, fill: string, page: string) =>
    Math.round(contrastRatio(composite(label, page, ALPHA), composite(fill, page, ALPHA)) * 100) / 100;

  test('primário no claro: 3,03:1', () => {
    const p = palettes.light;
    expect(measure(p.surface, p.text, p.background)).toBeCloseTo(3.03, 1);
  });

  test('primário no escuro: 4,38:1', () => {
    const p = palettes.dark;
    expect(measure(p.surface, p.text, p.background)).toBeCloseTo(4.38, 1);
  });

  test('contornado e sublinhado no claro (rótulo sobre a página): 3,03:1', () => {
    const p = palettes.light;
    expect(Math.round(contrastRatio(composite(p.text, p.background, ALPHA), p.background) * 100) / 100).toBeCloseTo(
      3.03,
      1,
    );
  });
});

describe('regras do sistema visual', () => {
  /**
   * Em React Native o peso vem da face nomeada. `fontWeight` junto de uma face
   * faz o Android sintetizar negrito sobre uma face que já é negra — e com o
   * "Texto em Negrito" do iOS a face seria promovida E ganharia o peso.
   */
  test('nenhum estilo do aplicativo declara fontWeight', () => {
    const src = join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        readFileSync(full, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            if (/\bfontWeight\s*:/.test(line)) offenders.push(`${relative(src, full).replace(/\\/g, '/')}:${index + 1}`);
          });
      }
    };
    walk(src);
    expect(offenders).toEqual([]);
  });

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
