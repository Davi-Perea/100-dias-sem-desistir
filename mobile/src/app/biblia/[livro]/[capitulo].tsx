import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBibleProvider, type Passage } from '@/reader/provider';
import { normalizeReaderFontSize, stepReaderFontSize } from '@/reader/readerFontSize';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { BackBar } from '@/ui/BackBar';
import { AppText, Button, Cap, Screen, StateView } from '@/ui/components';
import { ChapterText } from '@/ui/biblia/ChapterText';
import { PlaceholderNotice } from '@/ui/biblia/PlaceholderNotice';
import { TextSizeButton } from '@/ui/biblia/TextSizeButton';
import {
  backToBible,
  chapterLabel,
  chapterReference,
  nextChapter,
  previousChapter,
  resolveChapter,
  saveBiblePosition,
  type BiblePosition,
} from '@/ui/biblia/bibleNav';
import { ErrorState } from '@/ui/entrada/States';
import { ReaderFooter, type ReaderPrimary } from '@/ui/leitor/ReaderFooter';
import { TextSizeSheet } from '@/ui/leitor/TextSizeSheet';
import { MAX_CONTENT_WIDTH, spacing, useGutter } from '@/ui/theme';

/** Calha do corpo do leitor (TELAS B1): o capítulo livre lê igual ao do dia. */
const READER_GUTTER = 26;

/**
 * Um capítulo em leitura livre. Mesmo corpo do leitor do dia (cap do livro,
 * numeral, versículos do provedor, "Aa" e atribuição no fim), sem nada da
 * campanha: não há "Concluir leitura" e nenhum dia da Jornada muda aqui.
 *
 * Anterior e próximo atravessam livros (Gênesis 50 → Êxodo 1) e trocam o
 * capítulo NO LUGAR (`setParams`), para o voltar continuar levando à grade ou à
 * aba, e não a cada capítulo lido antes.
 */
export default function BibleChapterScreen() {
  const params = useLocalSearchParams<{ livro: string; capitulo: string }>();
  const resolved = resolveChapter(params.livro, params.capitulo);
  const position: BiblePosition | null = resolved ? { book: resolved.book.id, chapter: resolved.chapter } : null;
  const insets = useSafeAreaInsets();
  const gutterWidth = useGutter();
  const settings = useSettings();
  const scrollRef = useRef<ScrollView>(null);
  const provider = getBibleProvider();
  const metadata = provider.getMetadata();

  const [reloadTick, setReloadTick] = useState(0);
  const [result, setResult] = useState<{ key: string; passage?: Passage; error?: boolean } | null>(null);
  const [sizeSheet, setSizeSheet] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  /** Último capítulo anunciado ao leitor de tela (só trocas, não a abertura). */
  const announcedRef = useRef<string | null>(null);

  const positionKey = position ? `${position.book}-${position.chapter}` : '';
  const loadKey = `${positionKey}#${reloadTick}`;
  const reference = useMemo(
    () => (position ? chapterReference(position.book, position.chapter) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionKey],
  );

  useEffect(() => {
    if (!reference) return;
    let alive = true;
    provider.getPassage(reference).then(
      (passage) => alive && setResult({ key: loadKey, passage }),
      () => alive && setResult({ key: loadKey, error: true }),
    );
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    return () => {
      alive = false;
    };
  }, [reference, loadKey, provider]);

  // Última posição da leitura livre, em chave própria (não é a do leitor do dia).
  useEffect(() => {
    if (!reference) return;
    saveBiblePosition({ book: reference.book, chapter: reference.chapterStart });
  }, [reference]);

  // A troca de capítulo é anunciada; a abertura não (o título já é lido ao entrar).
  useEffect(() => {
    if (!reference) return;
    const label = chapterLabel({ book: reference.book, chapter: reference.chapterStart });
    if (announcedRef.current !== null && announcedRef.current !== label) {
      AccessibilityInfo.announceForAccessibility(label);
    }
    announcedRef.current = label;
  }, [reference]);

  if (!position || !resolved) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <StateView
          kind="empty"
          icon="alert"
          title="Capítulo não encontrado"
          message="Escolha um livro e um capítulo na lista da Bíblia."
          action={<Button title="Voltar" variant="outline" onPress={backToBible} />}
        />
      </Screen>
    );
  }

  const fresh = result?.key === loadKey ? result : null;
  const passage = fresh?.passage ?? null;
  const failed = fresh?.error === true;
  const fontSize = normalizeReaderFontSize(settings?.readerFontSize);
  const label = chapterLabel(position);
  const previous = previousChapter(position);
  const next = nextChapter(position);

  const goTo = (target: BiblePosition) =>
    router.setParams({ livro: target.book, capitulo: String(target.chapter) });

  // Se o disco recusar, o store não muda e o texto fica no tamanho salvo.
  const stepFont = (direction: 1 | -1) =>
    updateSettings((s) => ({ ...s, readerFontSize: stepReaderFontSize(s.readerFontSize, direction) })).catch(
      () => undefined,
    );

  const primary: ReaderPrimary = next
    ? { title: 'Próximo capítulo', icon: 'chevron-right', onPress: () => goTo(next), testID: 'bible-next' }
    : // Apocalipse 22: não há próximo; volta à lista de livros.
      { title: 'Voltar aos livros', onPress: () => router.navigate('/biblia' as Href), testID: 'bible-next' };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingHorizontal: gutterWidth }}>
        <BackBar
          onBack={backToBible}
          title={label}
          right={<TextSizeButton onPress={() => setSizeSheet(true)} />}
          testID="bible-back-bar"
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: READER_GUTTER,
          paddingTop: spacing.lg,
          paddingBottom: (footerHeight || insets.bottom + 180) + spacing.lg,
          gap: spacing.lg,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + READER_GUTTER * 2,
          alignSelf: 'center',
        }}
      >
        {metadata.isDevPlaceholder ? <PlaceholderNotice /> : null}

        <View style={{ gap: spacing.xs }}>
          {/* Só o numeral é cabeçalho: a cap do livro não repete o anúncio. */}
          <Cap accessibilityRole="text">{resolved.book.name}</Cap>
          <AppText
            variant="chapterNumeral"
            accessibilityRole="header"
            accessibilityLabel={`Capítulo ${position.chapter}`}
            testID="bible-chapter-numeral"
          >
            {position.chapter}
          </AppText>
        </View>

        {failed ? (
          <ErrorState
            message="Este capítulo não carregou. Tente de novo."
            onRetry={() => setReloadTick((t) => t + 1)}
            // O rodapé já tem o primário ("Próximo capítulo"): aqui vai contornado.
            retryVariant="outline"
            testID="bible-error"
          />
        ) : !passage ? (
          <StateView kind="loading" />
        ) : (
          <>
            <ChapterText
              verses={passage.verses}
              heading={passage.heading}
              fontSize={fontSize}
              book={position.book}
              chapter={position.chapter}
            />
            {/* Atribuição exigida pela licença (CC BY), no fim de cada capítulo. */}
            <AppText variant="caption" style={{ marginTop: spacing.lg }} testID="bible-attribution">
              {metadata.copyrightNotice}
            </AppText>
          </>
        )}
      </ScrollView>

      <ReaderFooter
        primary={primary}
        isFirstChapter={previous === null}
        onPrevious={() => previous && goTo(previous)}
        bottomPadding={Math.max(40, insets.bottom)}
        onHeight={setFooterHeight}
      />

      <TextSizeSheet visible={sizeSheet} onClose={() => setSizeSheet(false)} size={fontSize} onStep={stepFont} />
    </Screen>
  );
}
