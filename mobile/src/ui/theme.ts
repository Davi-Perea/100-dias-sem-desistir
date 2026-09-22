import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';

/**
 * Sistema visual do redesenho "100 dias sem desistir".
 *
 * Fonte da verdade: `design_handoff_100_dias/TOKENS.md`. Todo valor daqui sai de
 * lá, sem arredondar. Contraste medido pela WCAG 2.1: 4,5:1 para texto (sem a
 * concessão de texto grande) e 3:1 para limite de controle.
 *
 * Amarelo #FFD100 é preenchimento e realce: NUNCA cor de texto sobre superfície
 * clara (1,46:1). Tinta é #111111. O azul é a comunidade — e, diferente do
 * amarelo, pode ser texto.
 *
 * Alterar qualquer valor daqui exige rodar a auditoria de contraste
 * (`src/__tests__/contrast.test.ts`) de novo.
 */

/** Amarelo da marca. Preenchimento, progresso, seleção, marco. Nunca tinta de texto sobre claro. */
export const BRAND_YELLOW = '#FFD100';

const light = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  /** Off-white quente: blocos de conteúdo, tela do Dia. */
  surfaceWarm: '#F7F5F0',
  /** Círculo de ícone, avatar neutro. */
  surfaceMuted: '#F1EFE9',
  /** Trilha de barra de progresso. */
  surfaceSunken: '#EDEBE5',
  /** Filete divisor de 1px. Decorativo — nunca o único indicador de um controle. */
  border: '#E6E3DC',
  /** Dia futuro, alça de folha, linha pontilhada. */
  borderStrong: '#D9D6CF',
  /** Limite de controle (3,59:1 sobre branco, 3,29:1 sobre quente). NUNCA cor de texto. */
  controlBorder: '#8A877F',
  text: '#111111',
  textSecondary: '#3F3D38',
  /** Legenda, rótulo secundário, placeholder. */
  textMuted: '#5C5A54',
  navInactive: '#55534E',
  accent: BRAND_YELLOW,
  accentSoft: '#FFF3C4',
  onAccent: '#111111',
  /** Texto secundário sobre amarelo — hex plano, nunca opacidade (6,71:1). */
  onAccentMuted: '#4F430D',
  /**
   * "Marcado". No claro é tinta com conteúdo amarelo; no escuro os papéis se
   * invertem com a superfície. O fundo NUNCA é escrito como `text`: no escuro
   * isso daria amarelo sobre branco (1,46:1).
   */
  markSurface: '#111111',
  onMark: BRAND_YELLOW,
  /** A comunidade. Pode ser texto: 8,48:1 sobre branco. */
  blue: '#2A4C86',
  onBlue: '#FFFFFF',
  blueSoft: '#E6EDF7',
  blueSoftBorder: '#CFDCEE',
  onBlueSoft: '#1F2A3D',
  /** Faixa "sem internet". O conteúdo é branco nos dois temas. */
  alertSurface: '#111111',
  onAlert: '#FFFFFF',
  danger: '#9E3B33',
  onDanger: '#FFFFFF',
  warning: '#7E601B',
  warningSurface: '#F6ECD4',

  // --- Provisórios da migração ----------------------------------------------
  // Existem só porque as telas antigas ainda não foram refeitas. Cada um sai na
  // etapa em que a última tela que o consome for redesenhada.
  /** @deprecated = `background`. O leitor não tem mais fundo próprio. */
  readerBackground: '#FFFFFF',
  /** @deprecated o nó "lido" do redesenho é `text`. Sai na etapa 2 (Jornada). */
  nodeDone: '#3F3D38',
  /** @deprecated = `warning`. */
  devBanner: '#7E601B',
  /** @deprecated = `warningSurface`. */
  devBannerSurface: '#F6ECD4',
  /** @deprecated sem uso nas telas; mantido porque a auditoria de contraste o cobre. */
  success: '#2F6B4F',
} as const;

/**
 * Tema escuro. O amarelo não muda de valor: muda de papel. Nenhuma tela escura
 * foi desenhada tela a tela ainda (etapa 8); estes valores são os do TOKENS.md.
 *
 * Nenhum valor daqui mudou com a TEMA_ESCURO_PROPOSTA: as correções de
 * contraste dela estão em como os componentes COMBINAM estes tokens (medidas em
 * `contrast.test.ts`, bloco "tema escuro: correções"):
 *   - texto dentro do realce amarelo é sempre #111111 (achado 1);
 *   - bloco `surface` sobre fundo quente, ou quente sobre folha, sobe para
 *     `surfaceMuted` (achado 2; `blockFill` em components.tsx);
 *   - a folha modal ganha filete no topo (achado 3);
 *   - anel de "não leu" e borda de caixa usam `controlBorder`, nunca
 *     `borderStrong` (achado 4): 4,75:1 contra 1,54:1.
 */
const dark: Record<keyof typeof light, string> = {
  background: '#111111',
  surface: '#1A1A19',
  surfaceWarm: '#1A1917',
  surfaceMuted: '#232220',
  surfaceSunken: '#0B0B0B',
  border: '#2E2C29',
  borderStrong: '#3D3A36',
  controlBorder: '#8A857C',
  text: '#FFFFFF',
  textSecondary: '#C7C4BD',
  textMuted: '#A6A29A',
  navInactive: '#A6A29A',
  accent: BRAND_YELLOW,
  accentSoft: '#3A3100',
  onAccent: '#111111',
  onAccentMuted: '#4F430D',
  markSurface: BRAND_YELLOW,
  onMark: '#111111',
  blue: '#A9C2E8',
  onBlue: '#111111',
  blueSoft: '#1A2231',
  blueSoftBorder: '#2C3A52',
  onBlueSoft: '#FFFFFF',
  alertSurface: '#6B6A63',
  onAlert: '#FFFFFF',
  danger: '#E0817A',
  /** Inverte no escuro: branco sobre o vermelho claro daria 2,77:1. */
  onDanger: '#111111',
  warning: '#D6AC5A',
  warningSurface: '#2A2313',
  readerBackground: '#111111',
  nodeDone: '#C7C4BD',
  devBanner: '#D6AC5A',
  devBannerSurface: '#2A2313',
  success: '#6BBF92',
};

/** Todas as paletas têm as mesmas chaves; os valores são hex de 6 dígitos. */
export type Palette = Record<keyof typeof light, string>;

/** Exportadas para o teste de regressão de contraste. */
export const palettes = { light, dark } as const;

/**
 * Superfícies fixas: F1 boas-vindas e E3 marco (amarelo); C4 consentimento,
 * E2 modo altar e E4 dia 100 (tinta). Elas NÃO mudam com o tema — e por isso o
 * conteúdo delas também não pode mudar.
 *
 * Correção técnica sobre o TELAS.md, que escreve ali tokens temáticos: o
 * `textSecondary` claro sobre tinta mede 1,74:1, e o escuro sobre amarelo
 * 1,19:1 — o texto some. A regra é fixar a paleta pela superfície: tinta usa os
 * valores do tema escuro (10,84:1 no secundário), amarelo usa os do claro
 * (7,42:1). O botão primário sobre amarelo continua tinta com rótulo branco.
 */
export type FixedSurface = 'ink' | 'yellow';

export function fixedPalette(surface: FixedSurface): Palette {
  // Só o fundo é fixado; o resto vem inteiro do tema correspondente. Assim o
  // botão primário sobre amarelo é tinta com rótulo branco (`text`/`surface` do
  // claro), e sobre tinta é branco com rótulo escuro (`text`/`surface` do escuro).
  if (surface === 'ink') return { ...dark, background: '#111111' };
  return { ...light, background: BRAND_YELLOW };
}

/** Escala do handoff: 4 · 8 · 12 · 16 · 24 · 32. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Raios do TOKENS.md. `buttonLg`, `blockLg` e `card` são provisórios: saem
 * quando o último consumidor antigo for redesenhado.
 */
export const radius = {
  sm: 10,
  button: 16,
  block: 22,
  sheet: 28,
  pill: 999,
  /** @deprecated = `button`. */
  buttonLg: 16,
  /** @deprecated = `block`. */
  blockLg: 22,
  /** @deprecated = `block`. */
  card: 22,
} as const;

/** Calha: 24 em tela e lista, 26 em folha. 40 a partir de 600px, 64 a partir de 900px. */
export const gutter = { screen: 24, sheet: 26 } as const;

export const iconSize = { sm: 18, md: 22, lg: 26 } as const;

/**
 * Alturas do handoff. São PISOS de caixa, nunca medidas fixas.
 *
 * Consuma-as como `minHeight` com `paddingVertical`; declarar `height` com elas
 * é o defeito. O texto cresce com o Dynamic Type do sistema — até 3,571× neste
 * build — e caixa travada não acompanha: o rótulo atravessa a borda e, num botão
 * preenchido, sai na cor da própria superfície, isto é, some (1,00:1). Quem
 * precisa reservar espaço para uma dessas caixas mede a altura real com
 * `onLayout` em vez de repetir a constante.
 */

/** iOS 44pt / Android 48dp — usamos o maior dos dois. Piso absoluto de toque. */
export const MIN_TOUCH = 48;

/** Botão principal. Piso: a caixa cresce com o rótulo. */
export const BUTTON_MIN_HEIGHT = 56;

/** Barra de navegação flutuante: 20 de margem lateral, 26 do fundo. Piso. */
export const TABBAR_MIN_HEIGHT = 64;

/** @deprecated = `BUTTON_MIN_HEIGHT`. */
export const BUTTON_HEIGHT = BUTTON_MIN_HEIGHT;

/** @deprecated = `TABBAR_MIN_HEIGHT`. A barra agora flutua; a reserva é medida. */
export const TAB_BAR_HEIGHT = TABBAR_MIN_HEIGHT;

/** Medida de leitura confortável; evita parágrafos de ponta a ponta em tablet. */
export const MAX_CONTENT_WIDTH = 640;

/** Transição de navegação: 220ms ease-out. */
export const MOTION_MS = 220;

/** Ciclo do voo da pomba. */
export const FLY_MS = 3200;

/**
 * As oito faces empacotadas (OFL, nada buscado na rede em tempo de execução):
 * Schibsted Grotesk 400–800 para interface e display, Source Serif 4 para
 * leitura, citação e texto humano.
 *
 * Em React Native o peso vem da FAMÍLIA, não de `fontWeight`: combinar os dois
 * faz o Android sintetizar negrito sobre uma face que já é negra. Nenhum estilo
 * deste app declara `fontWeight` (o teste de contraste varre isso).
 */
export const faces = {
  sg400: 'SchibstedGrotesk_400Regular',
  sg500: 'SchibstedGrotesk_500Medium',
  sg600: 'SchibstedGrotesk_600SemiBold',
  sg700: 'SchibstedGrotesk_700Bold',
  sg800: 'SchibstedGrotesk_800ExtraBold',
  ss400: 'SourceSerif4_400Regular',
  ss600: 'SourceSerif4_600SemiBold',
  ss400i: 'SourceSerif4_400Regular_Italic',
} as const;

export type Face = (typeof faces)[keyof typeof faces];

/**
 * Papéis tipográficos. Os nomes são os de antes do redesenho, para que as telas
 * que ainda não foram refeitas continuem compilando com as faces novas.
 */
export const fonts = {
  /** Schibsted 800 — numerais e display. */
  display: faces.sg800,
  /** Schibsted 700 — títulos de tela e de bloco. */
  title: faces.sg700,
  /** Schibsted 700 — rótulos e ações. */
  label: faces.sg700,
  /** Schibsted 600 — rótulo de linha, legenda forte. */
  item: faces.sg600,
  /** Schibsted 500 — interface corrida. */
  body: faces.sg500,
  /** Schibsted 400. */
  regular: faces.sg400,
  /** Source Serif 400 — leitura bíblica, parágrafo humano, post. */
  read: faces.ss400,
  /** Source Serif 400 itálico — citação da orientação da igreja. */
  readItalic: faces.ss400i,
  /** Source Serif 600 — numeral de capítulo. */
  readStrong: faces.ss600,
} as const;

/**
 * "Texto em Negrito" do sistema (REGRAS 31). Como o peso vem da face, negrito é
 * trocar de face: cada uma sobe um degrau dentro das oito empacotadas. O 800
 * continua 800 (não há face mais pesada empacotada) e o itálico continua itálico.
 * O React Native 0.86 só expõe essa preferência no iOS; no Android fica desligada.
 */
const PROMOTED: Record<Face, Face> = {
  [faces.sg400]: faces.sg500,
  [faces.sg500]: faces.sg600,
  [faces.sg600]: faces.sg700,
  [faces.sg700]: faces.sg800,
  [faces.sg800]: faces.sg800,
  [faces.ss400]: faces.ss600,
  [faces.ss600]: faces.ss600,
  [faces.ss400i]: faces.ss400i,
};

export function promoteFace(face: string): string {
  return (PROMOTED as Record<string, string>)[face] ?? face;
}

// Um único ouvinte para o app inteiro, em vez de um por texto na tela.
let boldText = false;
const boldListeners = new Set<() => void>();
let boldStarted = false;

function startBoldText() {
  if (boldStarted || Platform.OS !== 'ios') return;
  boldStarted = true;
  const info = AccessibilityInfo as unknown as {
    isBoldTextEnabled?: () => Promise<boolean>;
    addEventListener: (event: string, handler: (value: boolean) => void) => { remove: () => void } | undefined;
  };
  const set = (value: boolean) => {
    if (value === boldText) return;
    boldText = value;
    boldListeners.forEach((listener) => listener());
  };
  info.isBoldTextEnabled?.().then(set, () => {});
  info.addEventListener('boldTextChanged', set);
}

/** Só para testes: liga ou desliga o "Texto em Negrito" sem depender do iOS. */
export function _setBoldTextForTests(value: boolean) {
  boldText = value;
  boldListeners.forEach((listener) => listener());
}

function subscribeBoldText(listener: () => void) {
  // O ouvinte do sistema começa na primeira inscrição, não durante o render.
  startBoldText();
  boldListeners.add(listener);
  return () => {
    boldListeners.delete(listener);
  };
}
const getBoldText = () => boldText;
const getBoldTextServer = () => false;

export function useBoldText(): boolean {
  return useSyncExternalStore(subscribeBoldText, getBoldText, getBoldTextServer);
}

/** Vidro: só na camada de navegação, barras de topo e folhas. Nunca atrás de texto bíblico. */
export const glass = {
  /** Barra de navegação flutuante. */
  nav: 'rgba(255,255,255,0.86)',
  navDark: 'rgba(26,25,23,0.88)',
  /** Barra de topo do leitor. */
  reader: 'rgba(255,255,255,0.92)',
  readerDark: 'rgba(17,17,17,0.9)',
  hairline: 'rgba(17,17,17,0.08)',
  hairlineDark: 'rgba(255,255,255,0.12)',
  scrim: 'rgba(17,17,17,0.5)',
  scrimDark: 'rgba(0,0,0,0.6)',
  blockBorder: 'rgba(17,17,17,0.06)',
  blockBorderDark: 'rgba(255,255,255,0.10)',
  // Provisórios da migração.
  /** @deprecated = `nav`. */
  light: 'rgba(255,255,255,0.86)',
  /** @deprecated = `navDark`. */
  darkLight: 'rgba(26,25,23,0.88)',
  /** @deprecated sem equivalente no TOKENS.md. */
  warm: 'rgba(247,245,240,0.84)',
  /** @deprecated sem equivalente no TOKENS.md. */
  darkWarm: 'rgba(26,25,23,0.84)',
} as const;

/**
 * Sombra da folha modal: 0 12px 30px rgba(17,17,17,0.4). Em `boxShadow`, com a
 * string CSS do desenho: o `shadowRadius` do iOS não é o blur do CSS (é cerca
 * de metade), e copiar 30 ali deixava a sombra mais difusa que a desenhada.
 */
export const floatShadow = { boxShadow: '0 12px 30px rgba(17,17,17,0.4)' } as const;

/** Sombra da barra flutuante: 0 10px 28px rgba(17,17,17,0.14) / rgba(0,0,0,0.5). */
export function navShadow(isDark: boolean) {
  return { boxShadow: isDark ? '0 10px 28px rgba(0,0,0,0.5)' : '0 10px 28px rgba(17,17,17,0.14)' } as const;
}

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: (isDark ? dark : light) as Palette, isDark, spacing, radius };
}

/** Respeita "Reduzir movimento" do sistema (iOS e Android). Todo movimento desliga inteiro. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => alive && setReduced(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) =>
      setReduced(value),
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** Calha adaptativa: 24 no telefone, 40 a partir de 600px, 64 a partir de 900px. */
export function useGutter(): number {
  const { width } = useWindowDimensions();
  if (width >= 900) return 64;
  if (width >= 600) return 40;
  return gutter.screen;
}

/** Largura útil da régua dos 100 dias: a largura real menos a calha em uso. */
export function useRulerWidth(): number {
  const { width } = useWindowDimensions();
  const inset = useGutter();
  return Math.max(240, Math.min(width, MAX_CONTENT_WIDTH) - inset * 2);
}
