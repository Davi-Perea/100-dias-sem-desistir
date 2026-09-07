import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';

/**
 * Direção visual (spec §28): premium, editorial, calma, contemporânea, mobile-native.
 * Base de papel e tinta ("warm paper white + ink"), acento verde-profundo, sem marca final.
 *
 * Todos os pares de token abaixo foram medidos com a fórmula de contraste da WCAG 2.1
 * nos DOIS temas. Alterar qualquer cor exige rodar a auditoria de contraste de novo.
 * Mínimos: texto 4.5:1 · limite de controle interativo 3:1.
 */
const light = {
  background: '#F6F3EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EDE8E0',
  surfaceSunken: '#E4DDD2',
  /** Divisor decorativo. Não usar como único indicador de controle. */
  border: '#E0D9CD',
  borderStrong: '#CFC5B5',
  /** Limite de controle interativo (radio, checkbox, marcador). ≥3:1 exigido. */
  controlBorder: '#8A8073',
  text: '#1B1815',
  textSecondary: '#5C544A',
  textMuted: '#635B50',
  accent: '#1F5F5B',
  accentSoft: '#DDE9E7',
  onAccent: '#FFFFFF',
  success: '#2F6B4F',
  warning: '#7E601B',
  danger: '#9E3B33',
  onDanger: '#FFFFFF',
  readerBackground: '#FBF8F3',
  devBanner: '#7E601B',
  devBannerSurface: '#F6ECD4',
};

const dark: typeof light = {
  background: '#121110',
  surface: '#1C1A18',
  surfaceMuted: '#26231F',
  surfaceSunken: '#0E0D0C',
  border: '#302C27',
  borderStrong: '#453F38',
  controlBorder: '#7A7065',
  text: '#F2EDE5',
  textSecondary: '#B5ADA1',
  textMuted: '#9D9488',
  accent: '#6FB3AC',
  accentSoft: '#1E2E2C',
  onAccent: '#0B1A19',
  success: '#6BBF92',
  warning: '#D6AC5A',
  danger: '#E0817A',
  /** Tinta escura: branco sobre o vermelho claro do tema escuro daria 2.77:1. */
  onDanger: '#1B1815',
  readerBackground: '#17150F',
  devBanner: '#D6AC5A',
  devBannerSurface: '#2A2313',
};

/** Ritmo 4/8dp. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

/** Tamanhos de ícone como token: nada de 20/22/26 arbitrários espalhados pelas telas. */
export const iconSize = { sm: 18, md: 24, lg: 28 } as const;

/** iOS 44pt / Android 48dp — usamos o maior dos dois. */
export const MIN_TOUCH = 48;

/** Medida de leitura confortável; evita parágrafos de ponta a ponta em tablet/paisagem. */
export const MAX_CONTENT_WIDTH = 640;

/** Duração de micro-interação (150–300ms). */
export const MOTION_MS = 200;

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
};

export type Palette = typeof light;

/** Exportadas para o teste de regressão de contraste. */
export const palettes = { light, dark } as const;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark, spacing, radius };
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
 * Insets horizontais adaptativos: telas maiores e paisagem ganham margem,
 * em vez de repetir a mesma calha estreita do celular.
 */
export function useGutter(): number {
  const { width } = useWindowDimensions();
  if (width >= 900) return spacing.xxl + spacing.lg;
  if (width >= 600) return spacing.xxl;
  return spacing.lg;
}
