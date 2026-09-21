import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { expandChapters, parseReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getBibleProvider, type Passage } from '@/reader/provider';
import { saveReaderPosition } from '@/reader/readerPosition';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { TopBar } from '@/ui/Lockup';
import {
  AppText,
  Button,
  Cap,
  Screen,
  ScreenScroll,
  Sheet,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import {
  BRAND_YELLOW,
  BUTTON_HEIGHT,
  MAX_CONTENT_WIDTH,
  MIN_TOUCH,
  fonts,
  glass,
  radius,
  spacing,
  useTheme,
} from '@/ui/theme';

const MIN_FONT = 14;
const MAX_FONT = 30;

/**
 * Leitor bíblico (tela 04). Rota contextual, nunca uma aba.
 *
 * O texto fica sempre em superfície OPACA: vidro só na barra de topo. Ler sobre
 * material translúcido é exatamente o que o handoff proíbe.
 */
export default function ReaderScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const settings = useSettings();
  const journey = useJourney();
  const scrollRef = useRef<ScrollView>(null);

  const [chapterIndex, setChapterIndex] = useState(0);
  /** Resultado chaveado pelo capítulo: evita setState síncrono dentro do efeito. */
  const [result, setResult] = useState<{ key: string; passage?: Passage; error?: Error } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sizeSheet, setSizeSheet] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  /**
   * Altura real do rodapé. Ele é absoluto sobre o texto, então a rolagem precisa
   * reservar o espaço dele embaixo — e esse espaço deixou de ser constante quando
   * o botão passou a crescer com a fonte. Reservar 180 fixo em fonte grande
   * esconderia o fim do capítulo e o aviso de direitos atrás do rodapé.
   */
  const [footerHeight, setFooterHeight] = useState(0);

  const dayData = getDay(dayNumber);
  const unlocked = journey.isDayUnlocked(dayNumber);
  const provider = getBibleProvider();
  const metadata = provider.getMetadata();

  const chapters = useMemo(() => {
    if (!dayData) return [];
    return dayData.readings.flatMap((reading) =>
      expandChapters(reading.canonical_reference).map((chapter) => ({
        ...chapter,
        source: reading.canonical_reference,
      })),
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
    if (!reference || !unlocked) return;
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
  }, [reference, chapterKey, dayNumber, chapterIndex, provider, unlocked]);

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

  // A leitura de cada dia abre no dia oficial da igreja. Vale para toque na
  // Jornada e para link direto: senão a regra seria só um botão escondido.
  if (Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= journey.campaign.total_days && !unlocked) {
    return (
      <Screen tone="reader">
        <TopBar />
        <ScreenScroll>
          <Icon name="lock" size={26} color={colors.text} />
          <AppText variant="blockTitleLg">Dia {dayNumber}</AppText>
          <AppText variant="body">Abre em {formatDayDate(dayNumber, journey.campaign)}.</AppText>
          <AppText variant="secondary">
            A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.
          </AppText>
          <Button title="Voltar" variant="outline" onPress={() => router.back()} testID="reader-locked-back" />
        </ScreenScroll>
      </Screen>
    );
  }

  if (!Number.isInteger(dayNumber) || !dayData || chapters.length === 0) {
    return (
      <Screen tone="reader">
        <StateView
          kind="empty"
          title="Leitura não encontrada"
          message="Este dia não tem leituras definidas."
          action={<Button title="Voltar" variant="outline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const done = isDayCompleted(journey.completions, dayNumber);
  const fontSize = settings?.readerFontSize ?? 18;
  const isLastChapter = chapterIndex >= chapters.length - 1;
  const chapterProgress = (chapterIndex + 1) / chapters.length;

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

  const readOwnBible = async () => {
    await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'own_bible' }));
    await setDayCompleted(journey.campaign.id, dayNumber, true);
    track({ name: 'reading_completed', dayNumber, mode: 'own_bible' });
    router.back();
  };

  return (
    <Screen tone="reader" edges={['left', 'right']}>
      {/* ------------------------------------------------- barra de topo (vidro) */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: isDark ? glass.darkLight : glass.reader,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar leitura"
            testID="reader-back"
            style={({ pressed }) => [
              { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
              pressed && { opacity: 0.72 },
            ]}
          >
            <Icon name="chevron-left" size={24} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={{ fontFamily: fonts.label, fontSize: 15, color: colors.text }} numberOfLines={1}>
              {current.bookName} {current.chapter}
            </AppText>
            <AppText variant="tick">
              Dia {dayNumber} · capítulo {chapterIndex + 1} de {chapters.length}
            </AppText>
          </View>

          <Pressable
            onPress={() => setSizeSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Tamanho do texto"
            testID="reader-text-size"
            style={({ pressed }) => [
              { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
              pressed && { opacity: 0.72 },
            ]}
          >
            <Icon name="text-size" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Filete de 3px: o preenchimento amarelo é o avanço dentro do dia. */}
        <View
          style={{ height: 3, backgroundColor: colors.surfaceSunken }}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Capítulo ${chapterIndex + 1} de ${chapters.length}`}
          accessibilityValue={{ min: 0, max: chapters.length, now: chapterIndex + 1 }}
        >
          <View style={{ width: `${chapterProgress * 100}%`, height: 3, backgroundColor: BRAND_YELLOW }} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: spacing.xl + 2,
          paddingTop: spacing.xl,
          paddingBottom: (footerHeight || insets.bottom + 180) + spacing.lg,
          gap: spacing.lg,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        }}
      >
        {/* ------------------------------------------------ cabeça do capítulo */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <Cap style={{ flex: 1 }}>{current.bookName}</Cap>
          <AppText variant="tick" style={{ flex: 1, textAlign: 'right' }}>
            {metadata.abbreviation} · texto segue o tamanho do sistema
          </AppText>
        </View>
        <Text
          style={{ fontFamily: fonts.readStrong, fontSize: 44, lineHeight: 48, color: colors.text }}
          accessibilityRole="header"
        >
          {current.chapter}
        </Text>

        {metadata.isDevPlaceholder ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.devBanner,
              borderRadius: radius.sm,
              padding: spacing.md,
              gap: 2,
              backgroundColor: colors.devBannerSurface,
            }}
          >
            <Text style={{ fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.8, color: colors.devBanner }}>
              DEV FIXTURE — NOT PRODUCTION CONTENT
            </Text>
            <AppText variant="tick" style={{ color: colors.devBanner }}>
              Texto de exemplo. Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida.
            </AppText>
          </View>
        ) : null}

        {error ? (
          <StateView
            kind="error"
            title="Não foi possível carregar"
            message={error.message}
            action={<Button title="Tentar de novo" variant="outline" onPress={() => setReloadTick((t) => t + 1)} />}
          />
        ) : !passage ? (
          <StateView kind="loading" />
        ) : (
          passage.verses.map((verse) => (
            <Text
              key={verse.verse}
              accessibilityLabel={`Versículo ${verse.verse}. ${verse.text}`}
              maxFontSizeMultiplier={1.8}
              style={{ fontFamily: fonts.read, fontSize, lineHeight: fontSize * 1.7, color: colors.text }}
            >
              <Text
                style={{
                  fontFamily: fonts.item,
                  fontSize: Math.max(11, fontSize * 0.61),
                  color: colors.textMuted,
                }}
              >
                {verse.verse}{' '}
              </Text>
              {verse.text}
            </Text>
          ))
        )}

        <AppText variant="tick" style={{ marginTop: spacing.lg }}>
          {metadata.copyrightNotice}
        </AppText>
      </ScrollView>

      {/* ------------------------------------------------------------- rodapé */}
      <View
        onLayout={(event) => setFooterHeight(Math.round(event.nativeEvent.layout.height))}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.sm,
          backgroundColor: colors.readerBackground,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        }}
      >
        {/* Sem alignItems: o quadrado de capítulo anterior estica junto com o
            botão ao lado, que é o único par do app com altura casada. */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Pressable
            onPress={() => setChapterIndex((i) => Math.max(0, i - 1))}
            disabled={chapterIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Capítulo anterior"
            accessibilityState={{ disabled: chapterIndex === 0 }}
            testID="reader-previous"
            style={({ pressed }) => [
              {
                width: 56,
                minHeight: BUTTON_HEIGHT,
                borderRadius: radius.button,
                borderWidth: 2,
                borderColor: colors.text,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: chapterIndex === 0 ? 0.35 : 1,
              },
              pressed && chapterIndex > 0 && { opacity: 0.72 },
            ]}
          >
            <Icon name="chevron-left" size={22} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            {isLastChapter || done ? (
              <Button
                title={done ? 'Voltar' : 'Concluir leitura'}
                icon={done ? undefined : 'check'}
                onPress={done ? () => router.back() : completeDay}
                loading={busy}
                testID="reader-complete"
              />
            ) : (
              <Button
                title="Próximo capítulo"
                icon="chevron-right"
                onPress={() => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
                testID="reader-next"
              />
            )}
          </View>
        </View>

        {!done ? (
          <Button title="Prefiro ler na minha Bíblia" variant="underline" onPress={readOwnBible} />
        ) : null}
      </View>

      <Sheet visible={sizeSheet} onClose={() => setSizeSheet(false)} title="Tamanho do texto">
        <AppText variant="secondary">
          O texto também acompanha o tamanho de fonte do seu aparelho.
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button title="Diminuir" variant="outline" onPress={() => changeFont(-2)} style={{ flex: 1 }} />
          <Button title="Aumentar" variant="outline" onPress={() => changeFont(2)} style={{ flex: 1 }} />
        </View>
        <Text style={{ fontFamily: fonts.read, fontSize, lineHeight: fontSize * 1.7, color: colors.text }}>
          Exemplo do tamanho atual do texto de leitura.
        </Text>
        <Button title="Pronto" variant="outline" onPress={() => setSizeSheet(false)} />
      </Sheet>
    </Screen>
  );
}
