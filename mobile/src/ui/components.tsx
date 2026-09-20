import React, { type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ContentState } from '@/journey/datasetSource';

import { Icon, type IconName } from './icons';
import {
  BRAND_YELLOW,
  BUTTON_HEIGHT,
  MAX_CONTENT_WIDTH,
  MIN_TOUCH,
  type Palette,
  fonts,
  floatShadow,
  glass,
  gutter,
  radius,
  spacing,
  useGutter,
  useTheme,
} from './theme';

/* ------------------------------------------------------------------ layout */

export type ScreenTone = 'default' | 'warm' | 'reader' | 'ink' | 'yellow';

function toneBackground(tone: ScreenTone, colors: Palette): string {
  if (tone === 'warm') return colors.surfaceWarm;
  if (tone === 'reader') return colors.readerBackground;
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
      {children}
    </SafeAreaView>
  );
}

/**
 * Conteúdo rolável com a calha do handoff (26px no telefone) e medida máxima de
 * leitura. O mock tem altura fixa de 844px porque é um retrato de iPhone; aqui a
 * tela rola de verdade e sobrevive a texto grande.
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
  | 'displayXl'
  | 'display'
  | 'screenTitle'
  | 'blockTitleLg'
  | 'blockTitle'
  | 'action'
  | 'item'
  | 'caption'
  | 'cap'
  | 'tick'
  | 'body'
  | 'secondary'
  | 'muted'
  | 'read'
  | 'readItalic'
  | 'quote'
  | 'editor'
  | 'verse';

/**
 * Escala tipográfica do handoff. O peso vem da FAMÍLIA (Archivo 500…900,
 * Literata 400/600) — nenhuma variante declara `fontWeight`, porque combinar os
 * dois faz o Android sintetizar negrito por cima de uma face que já é negra.
 *
 * `letterSpacing` do handoff vem em em; aqui vira px sobre o tamanho da variante.
 */
function textStyle(variant: TextVariant, colors: Palette): TextStyle {
  switch (variant) {
    case 'displayXl':
      return { fontFamily: fonts.display, fontSize: 84, lineHeight: 80, letterSpacing: -3.8, color: colors.text };
    case 'display':
      return { fontFamily: fonts.display, fontSize: 56, lineHeight: 55, letterSpacing: -2.3, color: colors.text };
    case 'screenTitle':
      return { fontFamily: fonts.title, fontSize: 34, lineHeight: 35, letterSpacing: -1, color: colors.text };
    case 'blockTitleLg':
      return { fontFamily: fonts.title, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: colors.text };
    case 'blockTitle':
      return { fontFamily: fonts.title, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: colors.text };
    case 'action':
      return { fontFamily: fonts.label, fontSize: 17, lineHeight: 20, color: colors.text };
    case 'item':
      return { fontFamily: fonts.item, fontSize: 15.5, lineHeight: 20, color: colors.text };
    case 'caption':
      return { fontFamily: fonts.item, fontSize: 12.5, lineHeight: 16, color: colors.textMuted };
    case 'cap':
      return {
        fontFamily: fonts.label,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 1.54,
        textTransform: 'uppercase',
        color: colors.textMuted,
      };
    case 'tick':
      return { fontFamily: fonts.item, fontSize: 11.5, lineHeight: 15, color: colors.textMuted };
    case 'body':
      return { fontFamily: fonts.body, fontSize: 17, lineHeight: 26, color: colors.textSecondary };
    case 'secondary':
      return { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary };
    case 'muted':
      return { fontFamily: fonts.item, fontSize: 13, lineHeight: 18, color: colors.textMuted };
    case 'read':
      return { fontFamily: fonts.read, fontSize: 18, lineHeight: 30.6, color: colors.text };
    case 'readItalic':
      return { fontFamily: fonts.readItalic, fontSize: 17, lineHeight: 25.5, color: colors.text };
    case 'quote':
      return { fontFamily: fonts.read, fontSize: 16.5, lineHeight: 24, color: colors.text };
    case 'editor':
      return { fontFamily: fonts.read, fontSize: 19, lineHeight: 30.4, color: colors.text };
    case 'verse':
      return { fontFamily: fonts.item, fontSize: 11, lineHeight: 16, color: colors.textMuted };
  }
}

export function AppText({
  variant = 'body',
  style,
  ...rest
}: { variant?: TextVariant; style?: StyleProp<TextStyle> } & React.ComponentProps<typeof Text>) {
  const { colors } = useTheme();
  return <Text {...rest} style={[textStyle(variant, colors), style]} />;
}

/** Rótulo de seção em caixa alta. */
export function Cap({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return (
    <AppText variant="cap" style={style}>
      {children}
    </AppText>
  );
}

/**
 * Realce amarelo tipo marca-texto. O amarelo é FUNDO; a tinta continua #111,
 * então o par mede 12,9:1. Amarelo nunca vira cor de letra.
 */
export function Highlight({ children }: PropsWithChildren) {
  return <Text style={{ backgroundColor: BRAND_YELLOW, color: '#111111' }}>{children}</Text>;
}

/* --------------------------------------------------------------- superfícies */

/** Filete divisor de 1px. */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

/** Compatibilidade com o nome antigo. */
export const Divider = Rule;

/**
 * Bloco de conteúdo: branco, raio 20–24, borda de 6% de tinta.
 * Vira botão quando recebe `onPress`, com alvo garantido de 48dp.
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
  tone?: 'surface' | 'warm' | 'muted' | 'ink';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}>) {
  const { colors, isDark } = useTheme();
  const background =
    tone === 'ink'
      ? '#111111'
      : tone === 'muted'
        ? colors.surfaceMuted
        : tone === 'warm'
          ? colors.surfaceWarm
          : colors.surface;
  const base: ViewStyle = {
    backgroundColor: background,
    borderRadius: radius.blockLg,
    borderWidth: tone === 'ink' ? 0 : StyleSheet.hairlineWidth,
    borderColor: isDark ? glass.blockBorderDark : glass.blockBorder,
    padding: spacing.lg,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  };
  if (!onPress) {
    return (
      <View
        style={[base, style]}
        testID={testID}
        accessible={accessibilityLabel !== undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
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
      {children}
    </Pressable>
  );
}

/** Compatibilidade: `Card` continua existindo com a aparência do bloco novo. */
export function Card({
  children,
  onPress,
  tone = 'surface',
  style,
  accessibilityLabel,
  testID,
}: PropsWithChildren<{
  onPress?: () => void;
  tone?: 'surface' | 'warm' | 'muted' | 'ink';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}>) {
  return (
    <Block onPress={onPress} tone={tone} style={style} accessibilityLabel={accessibilityLabel} testID={testID}>
      {children}
    </Block>
  );
}

/** Círculo de ícone de 56px das linhas da tela do Dia. */
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
    >
      <Icon name={name} size={Math.round(size * 0.41)} color={colors.text} />
    </View>
  );
}

/** Avatar preto com iniciais em amarelo. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#111111',
        alignItems: 'center',
        justifyContent: 'center',
      }}
          aria-hidden
    >
      <Text style={{ fontFamily: fonts.label, fontSize: size * 0.35, color: BRAND_YELLOW }}>{initials}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------- ações */

export type ButtonVariant = 'primary' | 'outline' | 'underline' | 'yellow' | 'danger';

/**
 * Hierarquia do handoff, um primário por tela:
 *   1 primário (56px, tinta) · 2 contornado (borda 2px) · 3 texto sublinhado
 *   4 amarelo — só sobre preto ou em tela de marco.
 *
 * `onInk` inverte as variantes para as telas de fundo preto (Dia 100).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  onInk = false,
  icon,
  style,
  testID,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onInk?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const ink = onInk ? '#FFFFFF' : colors.text;
  const surface = onInk ? '#111111' : colors.surface;

  let container: ViewStyle;
  let labelColor: string;
  switch (variant) {
    case 'primary':
      container = {
        height: BUTTON_HEIGHT,
        borderRadius: radius.button,
        backgroundColor: ink,
        paddingHorizontal: spacing.xl,
      };
      labelColor = surface;
      break;
    case 'yellow':
      container = {
        height: BUTTON_HEIGHT,
        borderRadius: radius.button,
        backgroundColor: BRAND_YELLOW,
        paddingHorizontal: spacing.xl,
      };
      labelColor = '#111111';
      break;
    case 'outline':
      container = {
        height: 52,
        borderRadius: radius.button,
        borderWidth: 2,
        borderColor: ink,
        paddingHorizontal: spacing.lg,
      };
      labelColor = ink;
      break;
    case 'danger':
      container = { height: MIN_TOUCH, paddingHorizontal: spacing.sm };
      labelColor = colors.danger;
      break;
    case 'underline':
    default:
      container = { height: 44, paddingHorizontal: spacing.xs };
      labelColor = ink;
      break;
  }

  const isText = variant === 'underline' || variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        container,
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
            style={{
              fontFamily: isText ? fonts.item : fonts.label,
              fontSize: isText ? 15 : 17,
              color: labelColor,
              textDecorationLine: isText ? 'underline' : 'none',
              textAlign: 'center',
            }}
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

/** Barra de progresso simples (igreja, grupo, capítulo). */
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

/** Pílula. Contornada = inativa; preenchida de tinta com texto amarelo = ativa. */
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
  const body = (
    <View
      style={{
        height: 36,
        minWidth: 72,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.text : 'transparent',
        borderWidth: active ? 0 : 1.5,
        borderColor: colors.controlBorder,
      }}
    >
      <Text style={{ fontFamily: fonts.label, fontSize: 14, color: active ? BRAND_YELLOW : colors.text }}>
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

/** Caixa de marcação de 28px, raio 8, borda 2px. Usada no jejum. */
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
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: checked ? colors.text : colors.controlBorder,
          backgroundColor: checked ? colors.text : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={18} color={BRAND_YELLOW} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Linha de lista de 42–46px com valor e chevron (tela 08 e preferências).
 * A área tocável é estendida para 48dp sem esticar a linha visual.
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
      <AppText variant="item" style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? <AppText variant="caption">{value}</AppText> : null}
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
 * Linha de escolha de 76px do onboarding.
 *
 * O estado aparece por FORMA e por cor: borda de 2,5px mais o círculo preenchido
 * com check, não só uma mudança de tom. Quem não distingue cor continua vendo
 * qual opção está marcada.
 */
export function ChoiceRow({
  label,
  description,
  selected,
  onPress,
  compact = false,
  testID,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** 62px em vez de 76px: usado na lista de horários do lembrete (01d). */
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
      accessibilityLabel={description ? `${label}. ${description}` : label}
      style={({ pressed }) => [
        {
          minHeight: compact ? 62 : 76,
          borderRadius: radius.buttonLg,
          borderWidth: selected ? 2.5 : 1.5,
          borderColor: selected ? colors.text : colors.borderStrong,
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
          backgroundColor: selected ? colors.text : 'transparent',
          borderWidth: selected ? 0 : 2,
          borderColor: colors.controlBorder,
        }}
      >
        {selected ? <Icon name="check" size={16} color={BRAND_YELLOW} strokeWidth={2.8} /> : null}
      </View>
    </Pressable>
  );
}

/** Barra de passos do onboarding: 3 segmentos de 28×4. */
export function StepBar({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', gap: 6 }}
          aria-hidden
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            width: 28,
            height: 4,
            borderRadius: 2,
            backgroundColor: index < step ? colors.text : colors.borderStrong,
          }}
        />
      ))}
    </View>
  );
}

export function StateView({
  kind,
  title,
  message,
  action,
}: {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  if (kind === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <ActivityIndicator color={colors.text} />
        <AppText variant="caption" style={{ marginTop: spacing.md }}>
          Carregando…
        </AppText>
      </View>
    );
  }
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}
    >
      {title ? (
        <AppText variant="blockTitle" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      ) : null}
      {message ? (
        <AppText variant="secondary" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

/**
 * Faixa preta de 44px com ponto amarelo (estado e4).
 *
 * Diz o que CONTINUA funcionando, não o que quebrou: leitura, progresso e
 * reflexões são locais e não dependem de rede.
 */
export function OfflineBanner({ message }: { message?: string }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        minHeight: 44,
        borderRadius: radius.button,
        backgroundColor: '#111111',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_YELLOW }} />
      <Text style={{ flex: 1, fontFamily: fonts.item, fontSize: 13.5, lineHeight: 19, color: '#FFFFFF' }}>
        {message ?? 'Sem internet. Sua leitura, progresso e reflexões continuam salvos.'}
      </Text>
    </View>
  );
}

/**
 * Aviso de conteúdo não liberado para o público.
 *
 * Não faz parte do handoff: existe para que ninguém confunda o que está na
 * tela com o que a igreja autorizou publicar. Três estados:
 *  - fixture: conteúdo fictício de desenvolvimento;
 *  - pending: conteúdo REAL da igreja, ainda sem autorização escrita;
 *  - authorized: nada a avisar, o componente não renderiza.
 */
export function DevContentBanner({ state, compact = false }: { state: ContentState; compact?: boolean }) {
  const { colors } = useTheme();
  if (state === 'authorized') return null;
  const text =
    state === 'fixture'
      ? compact
        ? 'Conteúdo de desenvolvimento.'
        : 'Conteúdo de desenvolvimento. Textos e cronograma são fictícios e não representam o plano da igreja.'
      : compact
        ? 'Aguardando autorização da igreja.'
        : 'Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja para publicação. Não distribuir esta versão.';
  return (
    <View
      accessibilityRole="alert"
      testID="content-banner"
      style={{
        backgroundColor: colors.devBannerSurface,
        borderRadius: radius.button,
        paddingHorizontal: spacing.lg,
        paddingVertical: compact ? spacing.sm : spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <Icon name="alert" size={18} color={colors.devBanner} />
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.item,
          fontSize: 12.5,
          lineHeight: 17,
          color: colors.devBanner,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * Folha modal: scrim + superfície branca com raio 28 no topo e alça de 40×5.
 * Usada no dia bloqueado (e3) e nas ferramentas de líder (07).
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; testID?: string }>) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: glass.scrim }}
      />
      <View
        testID={testID}
        aria-modal
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: gutter.sheet + spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
          ...floatShadow,
        }}
      >
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.borderStrong,
            alignSelf: 'center',
          }}
        />
        <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 28 }}>
          {title}
        </AppText>
        {children}
      </View>
    </Modal>
  );
}
