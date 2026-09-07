import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, MIN_TOUCH, radius, spacing, useGutter, useReducedMotion, useTheme } from './theme';

export function Screen({
  children,
  style,
  tone = 'default',
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'default' | 'reader' }>) {
  const { colors } = useTheme();
  const backgroundColor = tone === 'reader' ? colors.readerBackground : colors.background;
  return <View style={[styles.screen, { backgroundColor }, style]}>{children}</View>;
}

/** ScrollView com padding seguro no rodapé (tabs + safe area). */
export function ScreenScroll({
  children,
  extraBottom = 0,
  contentStyle,
}: PropsWithChildren<{ extraBottom?: number; contentStyle?: StyleProp<ViewStyle> }>) {
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        {
          paddingHorizontal: gutter,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl + extraBottom,
          gap: spacing.lg,
          // Mantém a medida de leitura confortável em tablet e paisagem.
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        },
        contentStyle,
      ]}>
      {children}
    </ScrollView>
  );
}

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'secondary' | 'muted' | 'label' | 'eyebrow';

export function AppText({
  variant = 'body',
  style,
  children,
  ...rest
}: PropsWithChildren<
  { variant?: TextVariant; style?: StyleProp<TextStyle> } & React.ComponentProps<typeof Text>
>) {
  const { colors } = useTheme();
  const variants: Record<TextVariant, TextStyle> = {
    display: { fontSize: 34, fontWeight: '700', color: colors.text, letterSpacing: -0.8, lineHeight: 40 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.4, lineHeight: 32 },
    heading: { fontSize: 19, fontWeight: '600', color: colors.text, lineHeight: 25 },
    body: { fontSize: 16, color: colors.text, lineHeight: 23 },
    secondary: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    label: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    eyebrow: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
  };
  const isHeader = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={variant === 'display' ? 1.5 : variant === 'title' ? 1.6 : 2}
      accessibilityRole={rest.accessibilityRole ?? (isHeader ? 'header' : undefined)}
      style={[variants[variant], style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
  accessibilityLabel,
  accessibilityHint,
  testID,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'surface' | 'muted' | 'accent';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}>) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const backgroundColor =
    tone === 'accent' ? colors.accentSoft : tone === 'muted' ? colors.surfaceMuted : colors.surface;
  const base: ViewStyle = {
    backgroundColor,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
  };
  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [
        base,
        // Feedback de toque sem deslocar layout; a escala some com "Reduzir movimento".
        pressed && { opacity: 0.9, transform: reducedMotion ? undefined : [{ scale: 0.994 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  subtitle,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  ...rest
}: {
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'style' | 'children'>) {
  const { colors } = useTheme();
  const backgrounds: Record<string, string> = {
    primary: colors.accent,
    secondary: colors.surfaceMuted,
    ghost: 'transparent',
    quiet: 'transparent',
    danger: colors.danger,
  };
  const foregrounds: Record<string, string> = {
    primary: colors.onAccent,
    secondary: colors.text,
    ghost: colors.accent,
    quiet: colors.textSecondary,
    danger: colors.onDanger,
  };
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isDisabled, ...(rest.accessibilityState ?? {}) }}
      android_ripple={{ color: 'rgba(0,0,0,0.10)' }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && { minHeight: 56 },
        { backgroundColor: backgrounds[variant], opacity: isDisabled ? 0.45 : pressed ? 0.86 : 1 },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: colors.accent },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foregrounds[variant]} />
      ) : (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={[styles.buttonText, { color: foregrounds[variant] }]} maxFontSizeMultiplier={1.5}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.buttonSubtitle, { color: foregrounds[variant] }]} maxFontSizeMultiplier={1.5}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'accent',
}: {
  value: number;
  label?: string;
  tone?: 'accent' | 'muted';
}) {
  const { colors } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? `Progresso ${pct} por cento`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, backgroundColor: tone === 'accent' ? colors.accent : colors.borderStrong },
        ]}
      />
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'accent' }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: tone === 'accent' ? colors.accentSoft : colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}>
      <AppText style={{ fontWeight: '600', color: tone === 'accent' ? colors.accent : colors.text }}>{label}</AppText>
    </View>
  );
}

export function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={title}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText>{title}</AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.controlBorder }}
        thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
      />
    </View>
  );
}

export function ChoiceRow({
  title,
  subtitle,
  selected,
  onPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontWeight: '600' }}>{title}</AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
      </View>
      {/* O contorno é o único indicador do estado não selecionado: precisa de 3:1. */}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.accent : colors.controlBorder,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

export function StateView({
  kind,
  title,
  message,
  onRetry,
  action,
}: {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  const defaults = { loading: 'Carregando…', empty: 'Nada por aqui ainda', error: 'Algo deu errado' };
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      {kind === 'loading' ? <ActivityIndicator size="large" color={colors.accent} /> : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title ?? defaults[kind]}
      </AppText>
      {message ? (
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {kind === 'error' && onRetry ? <Button title="Tentar de novo" variant="secondary" onPress={onRetry} /> : null}
      {action}
    </View>
  );
}

/**
 * Banner obrigatório enquanto o app roda com fixtures (spec §17, §29):
 * nenhum conteúdo de desenvolvimento pode ser confundido com conteúdo final.
 */
export function DevContentBanner({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="Aviso: conteúdo de desenvolvimento, não é conteúdo real"
      style={[styles.devBanner, { backgroundColor: colors.devBannerSurface, borderColor: colors.devBanner }]}>
      <AppText style={{ color: colors.devBanner, fontWeight: '700', fontSize: 11, letterSpacing: 0.8 }}>
        DEV FIXTURE — NOT PRODUCTION CONTENT
      </AppText>
      {!compact ? (
        <AppText variant="muted" style={{ color: colors.devBanner }}>
          Conteúdo fictício de desenvolvimento. O conteúdo editorial real depende de autorização.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  button: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  buttonSubtitle: { fontSize: 12, opacity: 0.85, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: MIN_TOUCH, paddingVertical: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg },
  devBanner: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
