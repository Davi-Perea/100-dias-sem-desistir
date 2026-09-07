import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { expandChapters, formatReference, parseReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getBibleProvider, type Passage } from '@/reader/provider';
import { saveReaderPosition } from '@/reader/readerPosition';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Button, Screen, StateView } from '@/ui/components';
import { fonts, iconSize, MAX_CONTENT_WIDTH, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

const MIN_FONT = 14;
const MAX_FONT = 30;

/** Reader é rota contextual (spec §7/§16): aberto a partir de Hoje ou Jornada, nunca uma aba. */
export default function ReaderScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const settings = useSettings();
  const journey = useJourney();
  const scrollRef = useRef<ScrollView>(null);

  const [chapterIndex, setChapterIndex] = useState(0);
  /** Resultado chaveado pelo capítulo: evita setState síncrono dentro do efeito. */
  const [result, setResult] = useState<{ key: string; passage?: Passage; error?: Error } | null>(null);
  const [busy, setBusy] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const dayData = getDay(dayNumber);
  const provider = getBibleProvider();
  const metadata = provider.getMetadata();

  /** Todos os capítulos do dia, achatados: o leitor pagina capítulo a capítulo. */
  const chapters = useMemo(() => {
    if (!dayData) return [];
    return dayData.readings.flatMap((reading) =>
      expandChapters(reading.canonical_reference).map((chapter) => ({ ...chapter, source: reading.canonical_reference })),
    );
  }, [dayData]);

  const current = chapters[chapterIndex];
  const chapterKey = current ? `${current.book}-${current.chapter}#${reloadTick}` : '';
  const reference = useMemo(
    () => (current ? parseReference(`${current.book} ${current.chapter}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapterKey],
  );

  useEffect(() => {
    if (!reference) return;
    let alive = true;
    provider.getPassage(reference).then(
      (loaded) => alive && setResult({ key: chapterKey, passage: loaded }),
      (err: unknown) =>
        alive && setResult({ key: chapterKey, error: err instanceof Error ? err : new Error(String(err)) }),
    );
    saveReaderPosition({ dayNumber, readingIndex: 0, chapterIndex });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    return () => {
      alive = false;
    };
  }, [reference, chapterKey, dayNumber, chapterIndex, provider]);

  const fresh = result?.key === chapterKey ? result : null;
  const passage = fresh?.passage ?? null;
  const error = fresh?.error ?? (current && !reference ? new Error('Referência inválida.') : null);

  const changeFont = useCallback(
    (delta: number) =>
      updateSettings((s) => ({
        ...s,
        readerFontSize: Math.max(MIN_FONT, Math.min(MAX_FONT, s.readerFontSize + delta)),
      })),
    [],
  );

  if (!Number.isInteger(dayNumber) || !dayData || chapters.length === 0) {
    return (
      <Screen tone="reader">
        <StateView kind="empty" title="Leitura não encontrada" message="Este dia não tem leituras definidas." />
      </Screen>
    );
  }

  const done = isDayCompleted(journey.completions, dayNumber);
  const fontSize = settings?.readerFontSize ?? 18;
  const isLastChapter = chapterIndex >= chapters.length - 1;

  const completeDay = async () => {
    setBusy(true);
    try {
      await setDayCompleted(journey.campaign.id, dayNumber, true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      track({ name: 'reading_completed', dayNumber, mode: 'in_app' });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tone="reader">
      {/* Cabeçalho próprio: o leitor precisa de cromo mínimo e removível. */}
      {chromeVisible ? (
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border, backgroundColor: colors.readerBackground },
          ]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar leitura"
            hitSlop={10}
            style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={iconSize.lg} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="muted">Dia {dayNumber}</AppText>
            <AppText style={{ fontWeight: '600' }} numberOfLines={1}>
              {current ? `${current.bookName} ${current.chapter}` : ''}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Pressable
              onPress={() => changeFont(-2)}
              accessibilityRole="button"
              accessibilityLabel="Diminuir tamanho da fonte"
              hitSlop={8}
              style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ fontSize: 15, fontWeight: '700' }}>A−</AppText>
            </Pressable>
            <Pressable
              onPress={() => changeFont(2)}
              accessibilityRole="button"
              accessibilityLabel="Aumentar tamanho da fonte"
              hitSlop={8}
              style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ fontSize: 17, fontWeight: '700' }}>A+</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: chromeVisible ? spacing.xl : insets.top + spacing.xl,
          paddingBottom: insets.bottom + 140,
          gap: spacing.lg,
          // Medida de leitura: em tablet/paisagem o texto não vai de ponta a ponta.
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        }}>
        <Pressable onPress={() => setChromeVisible((v) => !v)} accessibilityRole="button" accessibilityLabel="Alternar controles de leitura">
          <View style={{ gap: spacing.sm }}>
            <AppText variant="eyebrow">{formatReference(current.source)}</AppText>
            <AppText variant="title" style={{ fontFamily: fonts.serif, fontSize: fontSize + 8 }}>
              {current.bookName} {current.chapter}
            </AppText>
          </View>
        </Pressable>

        {metadata.isDevPlaceholder ? (
          <View style={[styles.notice, { backgroundColor: colors.devBannerSurface, borderColor: colors.devBanner }]}>
            <AppText style={{ color: colors.devBanner, fontWeight: '700', fontSize: 11, letterSpacing: 0.8 }}>
              DEV FIXTURE — NOT PRODUCTION CONTENT
            </AppText>
            <AppText variant="muted" style={{ color: colors.devBanner }}>
              Texto de exemplo. Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida.
            </AppText>
          </View>
        ) : null}

        {error ? (
          <StateView kind="error" message={error.message} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : !passage ? (
          <StateView kind="loading" message="Carregando o capítulo." />
        ) : (
          passage.verses.map((verse) => (
            <Text
              key={verse.verse}
              accessibilityLabel={`Versículo ${verse.verse}. ${verse.text}`}
              maxFontSizeMultiplier={1.8}
              style={{ fontFamily: fonts.serif, fontSize, lineHeight: fontSize * 1.62, color: colors.text }}>
              <Text style={{ fontSize: Math.max(11, fontSize * 0.62), color: colors.accent, fontWeight: '700' }}>
                {verse.verse}{' '}
              </Text>
              {verse.text}
            </Text>
          ))
        )}

        <AppText variant="muted" style={{ fontSize: 12, marginTop: spacing.lg }}>
          {metadata.copyrightNotice}
        </AppText>
      </ScrollView>

      <View
        style={[
          styles.toolbar,
          { paddingBottom: insets.bottom + spacing.sm, backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            onPress={() => setChapterIndex((i) => Math.max(0, i - 1))}
            disabled={chapterIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Capítulo anterior"
            accessibilityState={{ disabled: chapterIndex === 0 }}
            style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: chapterIndex === 0 ? 0.35 : 1 }}>
            <Ionicons name="chevron-back" size={iconSize.md} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="muted">
              Capítulo {chapterIndex + 1} de {chapters.length}
            </AppText>
          </View>

          <Pressable
            onPress={() => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
            disabled={isLastChapter}
            accessibilityRole="button"
            accessibilityLabel="Próximo capítulo"
            accessibilityState={{ disabled: isLastChapter }}
            style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: isLastChapter ? 0.35 : 1 }}>
            <Ionicons name="chevron-forward" size={iconSize.md} color={colors.text} />
          </Pressable>
        </View>

        {done ? (
          <Button title="Dia concluído ✓" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            title="Concluir leitura de hoje"
            onPress={completeDay}
            loading={busy}
            testID="reader-complete"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notice: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, gap: 2 },
});
