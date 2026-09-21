import { useEffect, useState } from 'react';
import { AccessibilityInfo, useColorScheme, useWindowDimensions } from 'react-native';

/**
 * Sistema visual do handoff "100 Dias — Lagoinha".
 *
 * Amarelo #FFD100 é preenchimento e realce: NUNCA cor de texto. Tinta é #111111.
 * As superfícies são branco puro (leitura) e off-whites quentes (áreas humanas).
 *
 * Dois desvios deliberados do handoff, ambos por contraste medido pela WCAG 2.1;
 * estão marcados com DESVIO e explicados no lugar. Nenhuma outra cor foi alterada.
 *
 * Alterar qualquer valor daqui exige rodar a auditoria de contraste
 * (`src/__tests__/contrast.test.ts`) de novo.
 */

/** Amarelo da marca. Preenchimento, progresso, seleção, marco. Nunca tinta de texto. */
export const BRAND_YELLOW = '#FFD100';

const light = {
  /** Início, Jornada e leitor: superfície branca opaca. */
  background: '#FFFFFF',
  surface: '#FFFFFF',
  /** Áreas humanas: Juntos, tela do Dia. */
  surfaceWarm: '#F7F5F0',
  /** Círculos de ícone e avatar neutro. */
  surfaceMuted: '#F1EFE9',
  /** Fundo de estado (faixa offline, trilho de progresso de capítulo). */
  surfaceSunken: '#EDEBE5',
  /** Filete divisor de 1px. Decorativo — nunca o único indicador de um controle. */
  border: '#E6E3DC',
  /** Dias futuros, alça de folha, traços cinza. */
  borderStrong: '#D9D6CF',
  /**
   * DESVIO: o handoff pede #A9A69E na borda do círculo não selecionado (01b/01c).
   * Medido, dá 2,43:1 sobre branco — abaixo do mínimo 3:1 da WCAG 1.4.11 para
   * limite de controle, e o próprio handoff exige contraste acessível. Escurecido
   * ao valor mais próximo que passa sobre branco E sobre os off-whites quentes
   * (3,6:1 e 3,1:1), mantendo o mesmo cinza quente.
   */
  controlBorder: '#8A877F',
  /** Tinta principal. */
  text: '#111111',
  /** Parágrafos de apoio. */
  textSecondary: '#3F3D38',
  /** Legendas e rótulos secundários (6,4:1 sobre branco). */
  textMuted: '#5C5A54',
  /** Ícone e rótulo de aba inativa. */
  navInactive: '#55534E',
  accent: BRAND_YELLOW,
  /** Amarelo rebaixado para faixas de fundo largas. */
  accentSoft: '#FFF3C4',
  /** Sobre amarelo só entra tinta. */
  onAccent: '#111111',
  /** Ponto de dia concluído na Jornada. */
  nodeDone: '#3F3D38',
  /**
   * Marca invertida: o círculo do check, a pílula selecionada, o número do passo,
   * o avatar. No claro é tinta com conteúdo amarelo, como o handoff desenhou.
   * No escuro os papéis se invertem com a superfície (amarelo com tinta), que é
   * o que o handoff faz na tela do Dia 100 e o que a pílula da aba ativa já faz.
   * Os dois sentidos medem 12,9:1; escrever o fundo como `text` daria amarelo
   * sobre branco no escuro, que é ilegível.
   */
  markSurface: '#111111',
  onMark: BRAND_YELLOW,
  /**
   * Faixa de alerta (estado sem internet). O handoff pede uma faixa de tinta que
   * interrompe a página clara; no tema escuro uma faixa de tinta sobre página de
   * tinta não existiria, então ela clareia o suficiente para continuar sendo uma
   * faixa: 3,5:1 contra a página, 5,4:1 para o texto branco e 3,7:1 para o ponto
   * amarelo. O conteúdo é branco nos dois temas.
   */
  alertSurface: '#111111',
  onAlert: '#FFFFFF',
  success: '#2F6B4F',
  warning: '#7E601B',
  danger: '#9E3B33',
  onDanger: '#FFFFFF',
  readerBackground: '#FFFFFF',
  devBanner: '#7E601B',
  devBannerSurface: '#F6ECD4',
} as const;

/**
 * Tema escuro derivado da própria tela 11 do handoff (Dia 100: fundo #111,
 * amarelo e branco). O handoff especifica uma aparência clara; o app já oferecia
 * tema escuro e removê-lo seria uma regressão para quem depende dele. As relações
 * de marca são as mesmas — tinta e amarelo apenas trocam de papel com a superfície.
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
  nodeDone: '#C7C4BD',
  markSurface: BRAND_YELLOW,
  onMark: '#111111',
  alertSurface: '#6B6A63',
  onAlert: '#FFFFFF',
  success: '#6BBF92',
  warning: '#D6AC5A',
  danger: '#E0817A',
  /** Branco sobre o vermelho claro do tema escuro daria 2,77:1. */
  onDanger: '#111111',
  readerBackground: '#111111',
  devBanner: '#D6AC5A',
  devBannerSurface: '#2A2313',
};

/** Escala do handoff: 4 · 8 · 12 · 16 · 24 · 32. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Raio: botão 14–16, bloco de conteúdo 20–24, folha 28, pílula 999. */
export const radius = { sm: 8, button: 14, buttonLg: 16, block: 20, blockLg: 22, card: 24, sheet: 28, pill: 999 } as const;

/** Margem lateral: 26 em listas e texto, 20 em blocos de largura cheia, 14 em folhas. */
export const gutter = { screen: 26, block: 20, sheet: 14 } as const;

export const iconSize = { sm: 18, md: 22, lg: 26 } as const;

/**
 * Alturas do handoff. São PISOS de caixa, nunca medidas fixas.
 *
 * Consuma-as como `minHeight` com `paddingVertical`; declarar `height` com elas
 * é o defeito. O texto cresce com o Dynamic Type do sistema — até 3,571× no iOS,
 * segundo a tabela do próprio React Native — e caixa travada não acompanha: o
 * rótulo atravessa a borda e, num botão preenchido, sai na cor da própria
 * superfície, isto é, some (1,00:1). Quem precisa reservar espaço para uma dessas
 * caixas mede a altura real com `onLayout` em vez de repetir a constante.
 */

/** iOS 44pt / Android 48dp — usamos o maior dos dois. Piso absoluto de toque. */
export const MIN_TOUCH = 48;

/** Botão principal do handoff. Piso: a caixa cresce com o rótulo. */
export const BUTTON_HEIGHT = 56;

/** Tab bar de 86px, vidro. Piso: quem reserva espaço mede a barra renderizada. */
export const TAB_BAR_HEIGHT = 86;

/** Medida de leitura confortável; evita parágrafos de ponta a ponta em tablet. */
export const MAX_CONTENT_WIDTH = 640;

/** Transições de navegação: 200–260ms, ease-out. */
export const MOTION_MS = 220;

/** Ciclo do voo da pomba. */
export const FLY_MS = 3200;

/**
 * Famílias empacotadas localmente (Archivo + Literata, OFL).
 *
 * Em React Native o peso vem da FAMÍLIA, não de `fontWeight`: combinar os dois
 * faz o Android sintetizar negrito sobre uma face que já é negra. Por isso os
 * estilos deste app nomeiam a face e não declaram `fontWeight`.
 */
export const fonts = {
  /** Archivo 900 — display e numerais de marco. */
  display: 'Archivo_900Black',
  /** Archivo 800 — títulos de tela e de bloco. */
  title: 'Archivo_800ExtraBold',
  /** Archivo 700 — rótulos, ações e caps de seção. */
  label: 'Archivo_700Bold',
  /** Archivo 600 — itens de lista e legendas. */
  item: 'Archivo_600SemiBold',
  /** Archivo 500 — parágrafos de interface. */
  body: 'Archivo_500Medium',
  /** Literata 400 — leitura bíblica, reflexões, insights. */
  read: 'Literata_400Regular',
  /** Literata 400 itálico — fala da liderança. */
  readItalic: 'Literata_400Regular_Italic',
  /** Literata 600 — numeral de capítulo. */
  readStrong: 'Literata_600SemiBold',
} as const;

/** Vidro: só na camada de navegação, barras de topo e folhas. Nunca atrás de texto bíblico. */
export const glass = {
  light: 'rgba(255,255,255,0.82)',
  warm: 'rgba(247,245,240,0.84)',
  reader: 'rgba(255,255,255,0.86)',
  darkLight: 'rgba(17,17,17,0.82)',
  darkWarm: 'rgba(26,25,23,0.84)',
  hairline: 'rgba(17,17,17,0.08)',
  hairlineDark: 'rgba(255,255,255,0.12)',
  scrim: 'rgba(17,17,17,0.5)',
  blockBorder: 'rgba(17,17,17,0.06)',
  blockBorderDark: 'rgba(255,255,255,0.10)',
} as const;

/** Sombra: só em folhas flutuantes e no cartão de notificação. */
export const floatShadow = {
  shadowColor: '#111111',
  shadowOpacity: 0.4,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
} as const;

export type Palette = typeof light;

/** Exportadas para o teste de regressão de contraste. */
export const palettes = { light, dark } as const;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: (isDark ? dark : light) as Palette, isDark, spacing, radius };
}

/** Respeita "Reduzir movimento" do sistema (iOS e Android). */
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

/**
 * Calha adaptativa. O handoff especifica 26px no telefone; telas maiores ganham
 * margem em vez de repetir a mesma calha estreita.
 */
export function useGutter(): number {
  const { width } = useWindowDimensions();
  if (width >= 900) return 64;
  if (width >= 600) return 40;
  return gutter.screen;
}

/**
 * Largura útil da régua dos 100 dias. O handoff define W = 342 no telefone de
 * 390px (390 − 2×24). Aqui derivamos da largura real menos a calha em uso.
 */
export function useRulerWidth(): number {
  const { width } = useWindowDimensions();
  const inset = useGutter();
  return Math.max(240, Math.min(width, MAX_CONTENT_WIDTH) - inset * 2);
}
