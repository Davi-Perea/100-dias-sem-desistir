import React, { createContext, type PropsWithChildren, type ReactNode, useContext } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type DimensionValue,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ContentState } from '@/journey/datasetSource';

import { Icon, type IconName } from './icons';
import { announceNotice } from './voce/announce';
import {
  BRAND_YELLOW,
  BUTTON_MIN_HEIGHT,
  MAX_CONTENT_WIDTH,
  MIN_TOUCH,
  type FixedSurface,
  type Palette,
  faces,
  fixedPalette,
  floatShadow,
  glass,
  gutter,
  promoteFace,
  radius,
  spacing,
  useBoldText,
  useGutter,
  useReducedMotion,
  useTheme,
} from './theme';

/**
 * Componentes-base do redesenho. Especificação: `design_handoff_100_dias/TOKENS.md` §5.
 *
 * Regra de piso, a mais cara já corrigida neste app: toda caixa que contém texto
 * usa `minHeight` com `paddingVertical`, nunca `height`. O tamanho do desenho é
 * o mínimo; com a fonte do sistema maior, a caixa cresce junto.
 */

/* ------------------------------------------------------------------ texto */

/**
 * Troca a face pela de um degrau acima quando o "Texto em Negrito" do sistema
 * está ligado. Como o peso vem da face, essa é a única forma de honrar a
 * preferência sem o Android sintetizar negrito.
 */
export function useFace(): (face: string) => string {
  const bold = useBoldText();
  return (face) => (bold ? promoteFace(face) : face);
}

/* ------------------------------------------------------------------ layout */

/**
 * Sobre que superfície um bloco está desenhado. Existe por uma correção de
 * contraste do tema escuro (TEMA_ESCURO_PROPOSTA, achado 2): no claro, o bloco
 * branco sobre o fundo quente mede 1,09:1; no escuro os dois tokens quase
 * coincidem (1,01:1) e o bloco some. O Block lê o fundo de trás daqui e, só no
 * escuro, sobe um degrau. Screen, Sheet e o próprio Block declaram o fundo.
 */
export type Backdrop = 'page' | 'warm' | 'surface' | 'muted' | 'fixed';

const BackdropContext = createContext<Backdrop>('page');

/** O fundo sob o componente atual (para quem desenha bloco próprio). */
export function useBackdrop(): Backdrop {
  return useContext(BackdropContext);
}

function toneBackdrop(tone: ScreenTone): Backdrop {
  if (tone === 'warm') return 'warm';
  if (tone === 'ink' || tone === 'yellow') return 'fixed';
  return 'page';
}

export type ScreenTone = 'default' | 'warm' | 'reader' | 'ink' | 'yellow';

function toneBackground(tone: ScreenTone, colors: Palette): string {
  if (tone === 'warm') return colors.surfaceWarm;
  // Superfícies fixas: não mudam com o tema (TOKENS §2, regra de inversão).
  if (tone === 'ink') return '#111111';
  if (tone === 'yellow') return BRAND_YELLOW;
  return colors.background;
}

export function Screen({
  children,
  style,
  tone = 'default',
  edges,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: ScreenTone;
  edges?: readonly ('top' | 'bottom' | 'left' | 'right')[];
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges ?? ['top', 'left', 'right']}
      style={[{ flex: 1, backgroundColor: toneBackground(tone, colors) }, style]}
    >
      <BackdropContext.Provider value={toneBackdrop(tone)}>{children}</BackdropContext.Provider>
    </SafeAreaView>
  );
}

/**
 * Conteúdo rolável com a calha do desenho (24 no telefone) e medida máxima de
 * leitura. Toda tela rola: com fonte grande, nada pode ficar fora de alcance.
 */
export function ScreenScroll({
  children,
  contentStyle,
  gap = spacing.xl,
  inset,
}: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle>; gap?: number; inset?: number }>) {
  const gutterWidth = useGutter();
  const horizontal = inset ?? gutterWidth;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingHorizontal: horizontal,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl * 2,
          gap,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + horizontal * 2,
          alignSelf: 'center',
        },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/* --------------------------------------------------------------- tipografia */

export type TextVariant =
  // Escala do TOKENS.md §3.
  | 'dayNumeral'
  | 'dayNumeralLg'
  | 'display'
  | 'displayXl'
  | 'milestone'
  | 'screenTitle'
  | 'blockTitleLg'
  | 'blockTitle'
  | 'readingRef'
  | 'action'
  | 'item'
  | 'rowLabel'
  | 'caption'
  | 'captionStrong'
  | 'cap'
  | 'tabLabel'
  | 'read'
  | 'body'
  | 'bodySm'
  | 'quote'
  | 'chapterNumeral'
  // Provisórias da migração: existem só nas telas que ainda não foram
  // redesenhadas e saem com elas. `uiBody` é o parágrafo de interface sem
  // serifa, que o TOKENS.md não tem (pergunta 15 ao designer).
  | 'uiBody'
  | 'secondary'
  | 'muted'
  | 'tick'
  | 'readItalic'
  | 'editor'
  | 'verse';

function textStyle(variant: TextVariant, colors: Palette): TextStyle {
  switch (variant) {
    case 'dayNumeral':
      return { fontFamily: faces.sg800, fontSize: 58, lineHeight: 54, letterSpacing: -2.6, color: colors.text };
    case 'dayNumeralLg':
      return { fontFamily: faces.sg800, fontSize: 76, lineHeight: 72, letterSpacing: -3.4, color: colors.text };
    case 'display':
      return { fontFamily: faces.sg800, fontSize: 38, lineHeight: 40, letterSpacing: -1.6, color: colors.text };
    case 'displayXl':
      return { fontFamily: faces.sg800, fontSize: 50, lineHeight: 50, letterSpacing: -2.4, color: colors.text };
    case 'milestone':
      return { fontFamily: faces.sg800, fontSize: 180, lineHeight: 160, letterSpacing: -10, color: colors.text };
    case 'screenTitle':
      return { fontFamily: faces.sg700, fontSize: 30, lineHeight: 34, letterSpacing: -0.9, color: colors.text };
    case 'blockTitleLg':
      return { fontFamily: faces.sg700, fontSize: 27, lineHeight: 32, letterSpacing: -0.8, color: colors.text };
    case 'blockTitle':
      return { fontFamily: faces.sg700, fontSize: 23, lineHeight: 28, letterSpacing: -0.5, color: colors.text };
    case 'readingRef':
      return { fontFamily: faces.sg700, fontSize: 21, lineHeight: 25, letterSpacing: -0.5, color: colors.text };
    case 'action':
      return { fontFamily: faces.sg700, fontSize: 17, lineHeight: 22, color: colors.text };
    case 'item':
      return { fontFamily: faces.sg500, fontSize: 16, lineHeight: 21, color: colors.text };
    case 'rowLabel':
      return { fontFamily: faces.sg600, fontSize: 15, lineHeight: 20, color: colors.text };
    case 'caption':
      return { fontFamily: faces.sg500, fontSize: 13, lineHeight: 18, color: colors.textMuted };
    case 'captionStrong':
      return { fontFamily: faces.sg700, fontSize: 12.5, lineHeight: 17, color: colors.text };
    case 'cap':
      return {
        fontFamily: faces.sg600,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: colors.textMuted,
      };
    case 'tabLabel':
      return { fontFamily: faces.sg500, fontSize: 11, lineHeight: 13, color: colors.navInactive };
    case 'read':
      // Entrelinha sempre 1,7×. O leitor recalcula a partir do tamanho escolhido.
      return { fontFamily: faces.ss400, fontSize: 19, lineHeight: 32, color: colors.text };
    case 'body':
      return { fontFamily: faces.ss400, fontSize: 17, lineHeight: 27, color: colors.text };
    case 'bodySm':
      return { fontFamily: faces.ss400, fontSize: 15, lineHeight: 24, color: colors.textSecondary };
    case 'quote':
      return { fontFamily: faces.ss400i, fontSize: 17, lineHeight: 27, color: colors.text };
    case 'chapterNumeral':
      return { fontFamily: faces.ss600, fontSize: 44, lineHeight: 48, color: colors.text };
    // --- provisórias -----------------------------------------------------------
    case 'uiBody':
      return { fontFamily: faces.sg500, fontSize: 17, lineHeight: 26, color: colors.textSecondary };
    case 'secondary':
      return { fontFamily: faces.sg500, fontSize: 15, lineHeight: 22, color: colors.textSecondary };
    case 'muted':
      return { fontFamily: faces.sg500, fontSize: 13, lineHeight: 18, color: colors.textMuted };
    case 'tick':
      return { fontFamily: faces.sg500, fontSize: 11.5, lineHeight: 15, color: colors.textMuted };
    case 'readItalic':
      return { fontFamily: faces.ss400i, fontSize: 17, lineHeight: 27, color: colors.text };
    case 'editor':
      return { fontFamily: faces.ss400, fontSize: 19, lineHeight: 32, color: colors.text };
    case 'verse':
      return { fontFamily: faces.sg500, fontSize: 11, lineHeight: 16, color: colors.textMuted };
  }
}

export function AppText({
  variant = 'uiBody',
  style,
  ...rest
  // `ComponentPropsWithRef`: no React 19 `ref` é prop comum de componente de
  // função e segue no `...rest` até o Text (o foco do leitor de tela usa).
}: { variant?: TextVariant; style?: StyleProp<TextStyle> } & React.ComponentPropsWithRef<typeof Text>) {
  const { colors } = useTheme();
  const face = useFace();
  const flat = StyleSheet.flatten([textStyle(variant, colors), style]) ?? {};
  // A face final pode vir do estilo da tela, então a promoção vem depois dele.
  const final = flat.fontFamily ? { ...flat, fontFamily: face(flat.fontFamily) } : flat;
  return <Text {...rest} style={final} />;
}

/** Rótulo de seção em caixa alta, marcado como cabeçalho para leitor de tela (REGRAS 32). */
export function Cap({
  children,
  style,
  ...rest
}: PropsWithChildren<{ style?: StyleProp<TextStyle> }> & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  // Repassa accessibilityLabel/testID: caps com "·" precisam de rótulo falado
  // sem o símbolo (REGRAS 32).
  return (
    <AppText variant="cap" accessibilityRole="header" {...rest} style={style}>
      {children}
    </AppText>
  );
}

/**
 * Realce amarelo tipo marca-texto. O amarelo é FUNDO e a tinta continua #111:
 * 12,92:1. O TELAS (A1) pede "padding 0 4 raio 4", mas texto aninhado no React
 * Native não aceita padding nem raio; o realce fica rente à palavra.
 *
 * A tinta é fixa e não `colors.text`: no tema escuro a palavra herdaria o
 * branco da frase e mediria 1,46:1 sobre o amarelo (TEMA_ESCURO_PROPOSTA,
 * achado 1). Fixa, mede 12,92:1 nos dois temas.
 * PROVISÓRIO (pergunta 1 ao designer): confirmar #111111 dentro do realce.
 */
export function Highlight({ children }: PropsWithChildren) {
  return <Text style={{ backgroundColor: BRAND_YELLOW, color: '#111111' }}>{children}</Text>;
}

/* --------------------------------------------------------------- superfícies */

/** Filete divisor de 1px. Decorativo. */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

/** Compatibilidade com o nome antigo. */
export const Divider = Rule;

export type BlockTone = 'surface' | 'warm' | 'muted' | 'ink' | 'blueSoft';

/**
 * Bloco de conteúdo: raio 22, borda de 1px a 6% de tinta, piso de 48.
 * Vira botão quando recebe `onPress`.
 */
export function Block({
  children,
  onPress,
  tone = 'surface',
  style,
  accessibilityLabel,
  testID,
}: PropsWithChildren<{
  onPress?: () => void;
  tone?: BlockTone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}>) {
  const { colors, isDark } = useTheme();
  const backdrop = useBackdrop();
  const background = blockFill(tone, backdrop, colors, isDark);
  const base: ViewStyle = {
    backgroundColor: background,
    borderRadius: radius.block,
    // Tinta fixa só é legítima numa superfície declarada fixa. Quando um bloco de
    // tinta cai numa tela que segue o tema, no escuro ele mede 1,00:1 contra a
    // página e deixa de existir (TOKENS §2, erro 2); o filete o mantém visível.
    borderWidth: tone === 'ink' ? (isDark ? 1 : 0) : 1,
    borderColor:
      tone === 'blueSoft'
        ? colors.blueSoftBorder
        : isDark
          ? glass.blockBorderDark
          : glass.blockBorder,
    padding: spacing.lg,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  };
  const inner = <BackdropContext.Provider value={BLOCK_BACKDROP[tone]}>{children}</BackdropContext.Provider>;
  if (!onPress) {
    return (
      <View
        style={[base, style]}
        testID={testID}
        accessible={accessibilityLabel !== undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [base, pressed && { opacity: 0.72 }, style]}
    >
      {inner}
    </Pressable>
  );
}

/** O fundo que cada tom de bloco oferece aos blocos dentro dele. */
const BLOCK_BACKDROP: Record<BlockTone, Backdrop> = {
  surface: 'surface',
  warm: 'warm',
  muted: 'muted',
  ink: 'fixed',
  blueSoft: 'surface',
};

/**
 * Preenchimento do bloco conforme o tom e o fundo de trás.
 *
 * CORREÇÃO TÉCNICA do tema escuro (TEMA_ESCURO_PROPOSTA, achado 2; A3, B3, D4,
 * E1): bloco `surface` sobre fundo quente, ou bloco quente sobre folha, mede
 * 1,01:1 no escuro — contra 1,09:1 no claro — e o bloco deixa de existir. No
 * escuro ele sobe para `surfaceMuted` (1,11:1 e 1,10:1, o mesmo degrau do claro)
 * e mantém a borda de 10% de branco. O tema claro não muda.
 * PROVISÓRIO (pergunta 2 ao designer): `surfaceMuted` + borda é a proposta, não
 * o desenho.
 */
export function blockFill(tone: BlockTone, backdrop: Backdrop, colors: Palette, isDark: boolean): string {
  if (isDark && tone === 'surface' && backdrop === 'warm') return colors.surfaceMuted;
  if (isDark && tone === 'warm' && backdrop === 'surface') return colors.surfaceMuted;
  return {
    surface: colors.surface,
    warm: colors.surfaceWarm,
    muted: colors.surfaceMuted,
    ink: '#111111',
    blueSoft: colors.blueSoft,
  }[tone];
}

/** Compatibilidade: `Card` continua existindo com a aparência do bloco novo. */
export function Card(props: PropsWithChildren<{
  onPress?: () => void;
  tone?: BlockTone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}>) {
  return <Block {...props} />;
}

/** Círculo de ícone em `surfaceMuted` (56 nas folhas e estados vazios, 48 nas linhas). */
export function IconCircle({ name, size = 56 }: { name: IconName; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden
    >
      <Icon name={name} size={Math.round(size * 0.41)} color={colors.text} />
    </View>
  );
}

/**
 * Avatar sem foto: superfície invertida (`markSurface`) com as iniciais em `onMark`.
 * Decorativo — o nome está sempre escrito ao lado.
 */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const face = useFace();
  // Só palavras que começam com letra: "Maria (exemplo)" vira "M", não "M(".
  const initials = name
    .trim()
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.markSurface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden
    >
      <Text
        allowFontScaling={false}
        style={{ fontFamily: face(faces.sg700), fontSize: size * 0.35, color: colors.onMark }}
      >
        {initials}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------- ações */

export type ButtonVariant = 'primary' | 'blue' | 'outline' | 'yellow' | 'underline' | 'danger';

/**
 * Botão do TOKENS §5: quatro variantes cheias de piso 56 e raio 16, e duas de
 * texto de piso 48. Um primário por tela.
 *
 * `tone` escolhe a paleta: a do tema, ou a de uma superfície fixa ('ink' para
 * C4/E2/E4, 'yellow' para F1/E3). Numa superfície fixa o botão também não pode
 * mudar com o tema, senão o primário sobre amarelo viraria branco com texto
 * escuro no tema escuro. `onInk` é o nome antigo de `tone="ink"`.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  onInk = false,
  tone,
  icon,
  style,
  testID,
  accessibilityHint,
  accessibilityLabel,
  selected,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** @deprecated use `tone="ink"`. */
  onInk?: boolean;
  tone?: 'theme' | FixedSurface;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
  /** Nome falado; padrão = `title`. Use quando o título tem "·"/"~" ou muda a cada passo. */
  accessibilityLabel?: string;
  /** Estado de seleção anunciado (ex.: horário escolhido no lembrete). */
  selected?: boolean;
}) {
  const theme = useTheme();
  const face = useFace();
  const surface = tone ?? (onInk ? 'ink' : 'theme');
  const c = surface === 'theme' ? theme.colors : fixedPalette(surface);
  const inactive = disabled || loading;

  // `Math.max(..., MIN_TOUCH)` não é cinto e suspensório: `container` entra
  // DEPOIS da base no array de estilos, então um piso menor aqui apagaria o
  // alvo de toque da base em todo botão de texto do app.
  const filled = Math.max(BUTTON_MIN_HEIGHT, MIN_TOUCH);
  let container: ViewStyle;
  let labelColor: string;
  let isText = false;
  switch (variant) {
    case 'primary':
      container = { minHeight: filled, borderRadius: radius.button, backgroundColor: c.text };
      labelColor = c.surface;
      break;
    case 'blue':
      container = { minHeight: filled, borderRadius: radius.button, backgroundColor: c.blue };
      labelColor = c.onBlue;
      break;
    case 'outline':
      container = { minHeight: filled, borderRadius: radius.button, borderWidth: 2, borderColor: c.text };
      labelColor = c.text;
      break;
    case 'yellow':
      container = { minHeight: filled, borderRadius: radius.button, backgroundColor: c.accent };
      labelColor = c.onAccent;
      break;
    case 'danger':
      container = { minHeight: MIN_TOUCH };
      labelColor = c.danger;
      isText = true;
      break;
    case 'underline':
    default:
      container = { minHeight: MIN_TOUCH };
      labelColor = c.text;
      isText = true;
      break;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      // O nome vem do título, e não dos filhos: com `loading` o rótulo vira um
      // indicador de progresso e o botão ficaria sem nome no leitor de tela.
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading, ...(selected === undefined ? {} : { selected }) }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingVertical: spacing.md,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        container,
        // Desabilitado a 0,45, como pede o TOKENS, que exige declarar o
        // contraste resultante: primário claro 3,03:1, primário escuro 4,38:1,
        // contornado e sublinhado claros 3,03:1. Controle inativo é isento da
        // WCAG 1.4.3; os valores ficam medidos em contrast.test.ts.
        inactive && { opacity: 0.45 },
        pressed && !inactive && { opacity: 0.72 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          <Text
            style={
              isText
                ? {
                    fontFamily: face(faces.sg600),
                    fontSize: 15,
                    lineHeight: 20,
                    color: labelColor,
                    // O TOKENS pede sublinhado com offset 3. O React Native não
                    // tem offset de sublinhado; fica o sublinhado padrão da face.
                    textDecorationLine: variant === 'underline' ? 'underline' : 'none',
                    textAlign: 'center',
                  }
                : {
                    fontFamily: face(faces.sg700),
                    fontSize: 17,
                    lineHeight: 22,
                    color: labelColor,
                    textAlign: 'center',
                  }
            }
          >
            {title}
          </Text>
          {icon ? <Icon name={icon} size={18} color={labelColor} /> : null}
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ estados */

/** Barra de progresso: trilha `surfaceSunken`, preenchimento amarelo (D4 usa 10px). */
export function ProgressBar({
  value,
  height = 10,
  label,
}: {
  /** 0 a 1. */
  value: number;
  height?: number;
  label: string;
}) {
  const { colors } = useTheme();
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}
    >
      <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: BRAND_YELLOW }} />
    </View>
  );
}

/** Pílula de escolha. Contornada = inativa; preenchida com `markSurface` e texto `onMark` = ativa. */
export function Pill({
  label,
  active = false,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const body = (
    <View
      style={{
        minHeight: 36,
        paddingVertical: spacing.sm,
        minWidth: 72,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.markSurface : 'transparent',
        borderWidth: active ? 0 : 1.5,
        borderColor: colors.controlBorder,
      }}
    >
      <Text style={{ fontFamily: face(faces.sg700), fontSize: 14, color: active ? colors.onMark : colors.text }}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [{ minHeight: MIN_TOUCH, justifyContent: 'center' }, pressed && { opacity: 0.72 }]}
    >
      {body}
    </Pressable>
  );
}

/** Compatibilidade com o nome antigo. */
export function Chip({ label }: { label: string; tone?: 'default' | 'accent' }) {
  return <Pill label={label} />;
}

/**
 * Caixa de marcação de 28×28, raio 8, borda 2px (A3, jejum). Marcada, segue a
 * regra do "marcado": `markSurface` com o check em `onMark`. O alvo é 48×48.
 */
export function Checkbox({
  checked,
  onToggle,
  label,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.72 },
      ]}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: checked ? colors.markSurface : colors.controlBorder,
          backgroundColor: checked ? colors.markSurface : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={18} color={colors.onMark} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Linha de lista (D1): piso 48, rótulo `rowLabel`, valor em legenda, chevron.
 * Filete entre as linhas, nunca acima da primeira.
 */
export function SettingRow({
  label,
  value,
  onPress,
  first = false,
  testID,
  accessibilityHint,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  first?: boolean;
  testID?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <View
      style={{
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <AppText variant="rowLabel" style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? (
        // Sem flexShrink quem colapsa é o RÓTULO: some a palavra que diz o que
        // a linha faz e o valor (um e-mail) fica inteiro.
        <AppText variant="caption" style={{ flexShrink: 1 }}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Icon name="chevron-right" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  return (
    <View>
      {first ? null : <Rule />}
      {onPress ? (
        <Pressable
          onPress={onPress}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={value ? `${label}, ${value}` : label}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => [pressed && { opacity: 0.72 }]}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

/**
 * Opção de escolha (F2): piso 76, raio 16.
 *
 * O estado aparece por FORMA e por cor: selecionada tem borda de 2,5px em tinta e
 * círculo cheio com ponto; não selecionada tem borda de 1,5px e círculo vazado.
 * A borda da não selecionada é `controlBorder` (3,59:1) — o `borderStrong` que
 * estava aqui media 1,44:1, abaixo do mínimo de limite de controle.
 */
export function ChoiceRow({
  label,
  description,
  selected,
  onPress,
  compact = false,
  testID,
  accessibilityLabel,
}: {
  label: string;
  /** Nome falado; padrão = "label. description". Use quando o texto tem "·". */
  accessibilityLabel?: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Piso de 62 em vez de 76: lista de horários do lembrete. */
  compact?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={accessibilityLabel ?? (description ? `${label}. ${description}` : label)}
      style={({ pressed }) => [
        {
          minHeight: compact ? 62 : 76,
          borderRadius: radius.button,
          borderWidth: selected ? 2.5 : 1.5,
          borderColor: selected ? colors.text : colors.controlBorder,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          backgroundColor: colors.surface,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="action">{label}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.markSurface : 'transparent',
          borderWidth: selected ? 0 : 2,
          borderColor: colors.controlBorder,
        }}
      >
        {selected ? (
          <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.onMark }} />
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Segmentos de passo (D3: 5px raio 3; E2: 6px). Preenchido em tinta, vazio em
 * `borderStrong`. Decorativo: o passo é dito em texto ao lado ("Passo 1 de 5").
 */
export function StepBar({
  step,
  total,
  height = 5,
  filledColor,
  emptyColor,
}: {
  step: number;
  total: number;
  height?: number;
  filledColor?: string;
  emptyColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch' }} aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height,
            borderRadius: 3,
            backgroundColor: index < step ? (filledColor ?? colors.text) : (emptyColor ?? colors.borderStrong),
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------- esqueleto */

/**
 * F3 · Carregando. Esqueleto na forma do conteúdo, não roda girando.
 *
 * Retângulos em `surfaceSunken`, SEM animação de brilho: movimento tem que ser
 * dispensável, e aqui não acrescenta nada. Os retângulos são decorativos e
 * somem do leitor de tela; quem fala é o "Carregando…".
 *
 * Um retângulo de esqueleto não contém texto, então medida fixa aqui é legítima
 * (a regra de minHeight vale para caixa com texto).
 *
 * Moram aqui, e não em Skeleton.tsx, porque o StateView (carregando genérico)
 * usa os três: Skeleton.tsx importa de components.tsx, e o contrário faria um
 * ciclo de módulos. Skeleton.tsx reexporta.
 */
export function SkeletonBlock({
  width = '100%',
  height,
  radius: r = 6,
  testID,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      testID={testID}
      style={{ width, height, borderRadius: r, backgroundColor: colors.surfaceSunken }}
    />
  );
}

/** "Carregando…" Schibsted 500 13/18, centralizado. É o único nome acessível do estado. */
export function LoadingCaption() {
  return (
    <AppText
      variant="caption"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Carregando"
      style={{ textAlign: 'center' }}
      testID="loading-caption"
    >
      Carregando…
    </AppText>
  );
}

/** Painel quente de esqueleto: raio 22, padding 16, gap 12 (as medidas do painel de hoje). */
export function SkeletonPanel({ children, testID }: PropsWithChildren<{ testID?: string }>) {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      testID={testID}
      style={{
        backgroundColor: colors.surfaceWarm,
        borderRadius: radius.block,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------ molde de vazio e de erro */

/**
 * O ÚNICO molde de estado vazio e de erro do app (F5, F6): glifo em círculo de
 * 56, título curto, uma frase que explica sem culpar, e as ações. Centralizado.
 * O StateView e os ErrorState/EmptyState de `entrada/States.tsx` desenham por
 * aqui; nenhum dos dois tem tipografia ou moldura própria.
 *
 * Nenhum código técnico na tela — nada de `error.message`, nome de enum ou
 * `pending_authorization`. Quem chama passa a cópia humana.
 *
 * `flexGrow` com piso em vez de `flex: 1`: dentro de uma rolagem, `flex: 1`
 * vira base zero e o estado colapsava (LACUNAS B32). Quem usa dentro de uma
 * ScrollView passa `contentContainerStyle={{ flexGrow: 1 }}`, e o estado ocupa
 * a sobra e centraliza.
 *
 * `inset`: o StateView nasceu com padding nos quatro lados (as telas o põem
 * direto na Screen, sem calha); os estados do grupo F moram dentro de uma
 * coluna que já tem calha e só levam o vertical. Mantidos os dois para nenhuma
 * tela mudar de aparência na unificação.
 */
export function StateLayout({
  kind,
  glyph,
  title,
  message,
  children,
  inset = 'all',
  testID,
  titleTestID,
  messageTestID,
}: PropsWithChildren<{
  kind: 'empty' | 'error';
  /** Círculo de 56 decorativo (IconCircle, LockCircle, "!"). */
  glyph?: ReactNode;
  title?: string;
  message?: string;
  inset?: 'all' | 'vertical';
  testID?: string;
  titleTestID?: string;
  messageTestID?: string;
}>) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexGrow: 1,
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
        ...(inset === 'all' ? { padding: spacing.xl } : { paddingVertical: spacing.xl }),
        gap: spacing.md,
      }}
    >
      {glyph}
      {title ? (
        <AppText
          variant="blockTitle"
          accessibilityRole="header"
          // F6 (vazio) pede Schibsted 700 24/29; F5 (erro) pede 26/31.
          style={
            kind === 'error'
              ? { fontSize: 26, lineHeight: 31, letterSpacing: 0, textAlign: 'center' }
              : { fontSize: 24, lineHeight: 29, letterSpacing: 0, textAlign: 'center' }
          }
          testID={titleTestID}
        >
          {title}
        </AppText>
      ) : null}
      {message ? (
        // Source Serif 17/27 (F5). A cor não foi especificada: `textSecondary` (10,85:1).
        // PROVISÓRIO (pergunta 18 ao designer): a frase do F6 não tem tipografia
        // dada; fica a do F5.
        <AppText variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }} testID={messageTestID}>
          {message}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Estados de carregando, vazio e erro das telas. Vazio e erro desenham pelo
 * StateLayout (molde único); carregando é o esqueleto do F3.
 *
 * PROVISÓRIO (pergunta 13 ao designer): o F3 só desenha o esqueleto da
 * Jornada. As telas sem esqueleto próprio levam um genérico — faixa de título
 * e dois painéis quentes com linhas — em vez da roda girando, que o F3 proíbe.
 */
export function StateView({
  kind,
  title,
  message,
  action,
  icon,
}: {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  if (kind === 'loading') {
    return (
      <View
        testID="state-loading"
        style={{ flexGrow: 1, minHeight: 240, padding: spacing.xl, gap: spacing.lg }}
      >
        <View aria-hidden style={{ gap: spacing.lg }}>
          <SkeletonBlock width="60%" height={34} />
          {[0, 1].map((index) => (
            <SkeletonPanel key={index}>
              <SkeletonBlock width="40%" height={14} />
              <SkeletonBlock height={18} />
              <SkeletonBlock width="75%" height={18} />
            </SkeletonPanel>
          ))}
        </View>
        <LoadingCaption />
      </View>
    );
  }
  return (
    <StateLayout
      kind={kind}
      glyph={icon ? <IconCircle name={icon} /> : null}
      title={title}
      message={message}
      testID="state-view"
    >
      {action}
    </StateLayout>
  );
}

/**
 * Faixa de alerta (F4): piso 48, raio 14, ponto amarelo de 8px.
 *
 * Diz o que CONTINUA funcionando, nunca o que quebrou: leitura, progresso e
 * reflexões são locais e não dependem de rede.
 */
export function OfflineBanner({ message }: { message?: string }) {
  const { colors } = useTheme();
  const face = useFace();
  const text = message ?? 'Sem internet. Sua leitura, seu progresso e as suas reflexões continuam salvos.';
  // A faixa entra sozinha quando a rede cai: no Android a live region anuncia;
  // no iOS o VoiceOver não diz nada, e por isso ela é anunciada ao montar (R4-3).
  React.useEffect(() => {
    announceNotice(text);
  }, [text]);
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}
      style={{
        minHeight: MIN_TOUCH,
        borderRadius: 14,
        backgroundColor: colors.alertSurface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_YELLOW }} />
      <Text style={{ flex: 1, fontFamily: face(faces.sg600), fontSize: 13.5, lineHeight: 19, color: colors.onAlert }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Falha de gravação local (PER-02). Os stores só atualizam a tela depois que o
 * disco confirma; quando o disco recusa, nada mudou e a pessoa precisa saber.
 * Cópia humana, sem texto técnico, em `danger` (6,1:1 sobre o fundo e sobre o
 * quente). Região viva no Android; anúncio explícito no iOS.
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: o desenho não tem estado de
 * falha ao salvar; a frase segue a da reflexão B5).
 */
export const SAVE_ERROR_COPY = 'Não foi possível salvar. Tente de novo.';

export function SaveErrorNotice({ message = SAVE_ERROR_COPY, testID = 'save-error' }: { message?: string; testID?: string }) {
  const { colors } = useTheme();
  React.useEffect(() => {
    announceNotice(message);
  }, [message]);
  return (
    <AppText
      variant="bodySm"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.danger }}
      testID={testID}
    >
      {message}
    </AppText>
  );
}

/**
 * Aviso de conteúdo FICTÍCIO de desenvolvimento (fixtures `DEV_ONLY`).
 *
 * 2026-09-22 (feedback do fundador na prévia do Dia 23): a faixa "Conteúdo real
 * dos 100 Dias, aguardando autorização…" SAIU de todas as telas. Ela repetia em
 * cada tela um assunto que é da igreja e não de quem lê, e emoldurava o
 * material real como se fosse provisório. No lugar dela ficou UMA linha
 * discreta dentro de Ajustes (`src/app/ajustes.tsx`), enquanto o dataset
 * estiver em `pending_authorization`.
 *
 * O que NÃO mudou — e nunca foi esta faixa: a trava de publicação. Quem impede
 * a distribuição é o build. `assertRightsForStore` (app.config.ts) recusa gerar
 * a variante de loja e `assertProductionReady` (journey/datasetSource.ts)
 * derruba um release na abertura com conteúdo não autorizado.
 *
 * O que CONTINUA em todas as telas: o aviso das fixtures. Conteúdo fictício não
 * pode ser confundido com o material da igreja em nenhuma tela (REGRAS §17–18),
 * e ele só existe em build de desenvolvimento e no painel DEV.
 *
 * Por isso `pending` e `authorized` não renderizam nada. A prop `state` fica:
 * quem chama continua passando o estado do conteúdo, sem saber desta regra.
 */
export function DevContentBanner({
  state,
  compact = false,
  tone = 'theme',
}: {
  state: ContentState;
  compact?: boolean;
  /** Superfície fixa (E2/E4 de tinta, E3/F1 amarelas): a faixa não segue o tema. */
  tone?: 'theme' | FixedSurface;
}) {
  const theme = useTheme();
  const colors = tone === 'theme' ? theme.colors : fixedPalette(tone);
  const face = useFace();
  // `pending` e `authorized` não têm faixa: o conteúdo real da igreja aparece
  // sem moldura, e a pendência de autorização mora em Ajustes.
  if (state !== 'fixture') return null;
  const text = compact
    ? 'Conteúdo de desenvolvimento.'
    : 'Conteúdo de desenvolvimento. Textos e cronograma são fictícios e não representam o plano da igreja.';
  return (
    <View
      accessibilityRole="alert"
      testID="content-banner"
      style={{
        backgroundColor: colors.warningSurface,
        borderRadius: 14,
        minHeight: compact ? 40 : MIN_TOUCH,
        paddingHorizontal: spacing.lg,
        paddingVertical: compact ? spacing.sm : spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <Icon name="alert" size={18} color={colors.warning} />
      <Text style={{ flex: 1, fontFamily: face(faces.sg600), fontSize: 12.5, lineHeight: 17, color: colors.warning }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Folha modal (TOKENS §5): raio 28 só no topo, calha 26, alça de 40×5, piso
 * inferior de 40 mais a área segura.
 *
 * Para em 88% da tela e rola por dentro. Sem isso, em fonte grande ela crescia
 * para fora da tela levando o botão de fechar junto — e como as rotas não têm
 * cabeçalho nativo, no iOS não sobrava jeito de sair. O scrim fecha ao toque.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: PropsWithChildren<{ visible: boolean; onClose: () => void; title?: string; testID?: string }>) {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: isDark ? glass.scrimDark : glass.scrim }}
      />
      <View
        testID={testID}
        aria-modal
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: gutter.sheet,
          paddingTop: spacing.md,
          paddingBottom: 40 + insets.bottom,
          gap: spacing.lg,
          maxHeight: height * 0.88,
          ...floatShadow,
          // CORREÇÃO TÉCNICA do tema escuro (TEMA_ESCURO_PROPOSTA, achado 3): o
          // véu escurece uma página que já era escura, e a folha mede 1,16:1
          // contra ele (no claro, 3,54:1). Nenhum cinza escuro chega a 3:1 sem
          // virar "folha cinza"; o filete de 1px no topo sobe a borda para
          // 1,64:1 contra o véu. A alça e o conteúdo continuam identificando a
          // folha. O claro não muda.
          // PROVISÓRIO (pergunta 3 ao designer): filete no topo, ou outra solução.
          ...(isDark ? { borderTopWidth: 1, borderColor: glass.hairlineDark } : null),
        }}
      >
        <View
          style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, alignSelf: 'center' }}
          aria-hidden
        />
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xs }}
          showsVerticalScrollIndicator={false}
        >
          {title ? (
            <AppText
              variant="blockTitle"
              accessibilityRole="header"
              style={{ fontSize: 24, lineHeight: 28, letterSpacing: 0 }}
            >
              {title}
            </AppText>
          ) : null}
          {/* A folha é o fundo de trás do que vier dentro dela, inclusive
              quando a tela que a abriu é quente (o Modal herda o contexto). */}
          <BackdropContext.Provider value="surface">{children}</BackdropContext.Provider>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ jornada */

export type JourneyNodeState = 'done' | 'open' | 'today' | 'future';

/**
 * Nó da jornada — quatro formas, nunca só cor (TOKENS §5):
 *   lido · círculo cheio de 13 em tinta
 *   em aberto · anel de 14, traço 3, em azul
 *   hoje · círculo de 20 em amarelo com anel de 3 em tinta
 *   futuro · ponto de 7 em `borderStrong`
 * No escuro o anel de hoje é branco em volta do amarelo (1,46:1 entre os dois,
 * 18,88:1 contra a página); o tamanho e a forma distinguem o nó.
 * PROVISÓRIO (pergunta 8 ao designer): o anel continua branco no escuro?
 * Decorativo para o leitor de tela: o estado vai escrito no rótulo da linha.
 */
export function JourneyNode({ state, testID }: { state: JourneyNodeState; testID?: string }) {
  const { colors } = useTheme();
  const shape: ViewStyle =
    state === 'done'
      ? { width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.text }
      : state === 'open'
        ? { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.blue }
        : state === 'today'
          ? { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.text }
          : { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.borderStrong };
  return <View style={shape} testID={testID} aria-hidden />;
}
