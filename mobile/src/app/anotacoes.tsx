import { router, Stack, type Href } from 'expo-router';
import { View } from 'react-native';

import { getHighlight, highlightColor } from '@/marks/colors';
import { marksByBook, useMarks, verseKey, type VerseMark } from '@/marks/marksStore';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { chapterHref } from '@/ui/biblia/bibleNav';
import { AppText, Block, Button, Cap, Screen, ScreenScroll } from '@/ui/components';
import { ListSkeleton } from '@/ui/entrada/ListSkeleton';
import { EmptyState } from '@/ui/entrada/States';
import { faces, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Minhas anotações (B2, feedback de 2026-09-22). Marcas de texto e anotações
 * por livro, na ordem do cânon; tocar abre o capítulo na aba Bíblia.
 *
 * Local, sem nuvem, sem compartilhamento. Mostra a referência e a anotação da
 * pessoa, nunca uma cópia do texto bíblico (o texto está no capítulo).
 */
export default function MarksScreen() {
  const marks = useMarks();
  const inset = useGutter();
  const groups = marksByBook(marks);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingHorizontal: inset }}>
        <BackBar label="Voltar" onBack={goBackOrHome} testID="marks-back-bar" />
      </View>
      <ScreenScroll gap={spacing.md}>
        <AppText
          variant="screenTitle"
          accessibilityRole="header"
          style={{ fontFamily: faces.sg800, fontSize: 32, lineHeight: 36 }}
          testID="marks-title"
        >
          Minhas anotações
        </AppText>

        {!marks ? (
          <ListSkeleton />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="note"
            title="Nada marcado ainda"
            message="Toque num versículo durante a leitura para marcar com uma cor ou escrever uma anotação. Fica só neste aparelho."
            action={
              <Button
                title="Abrir a Bíblia"
                variant="outline"
                onPress={() => router.navigate('/biblia' as Href)}
                testID="marks-empty-bible"
              />
            }
            testID="marks-empty"
          />
        ) : (
          <>
            <Cap>Só neste aparelho</Cap>
            {groups.map(({ book, items }) => (
              <View key={book.id} style={{ gap: spacing.sm }} testID={`marks-book-${book.id}`}>
                <AppText variant="blockTitle" accessibilityRole="header" style={{ marginTop: spacing.md }}>
                  {book.name}
                </AppText>
                {items.map((mark) => (
                  <MarkRow key={verseKey(mark)} mark={mark} bookName={book.name} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

function MarkRow({ mark, bookName }: { mark: VerseMark; bookName: string }) {
  const { colors, isDark } = useTheme();
  const reference = `${bookName} ${mark.chapter}:${mark.verse}`;
  const colorLabel = mark.color ? getHighlight(mark.color).label : null;
  const spoken = [reference, colorLabel ? `marcado em ${colorLabel.toLowerCase()}` : null, mark.note || null]
    .filter(Boolean)
    .join('. ');
  return (
    <Block
      tone="warm"
      onPress={() => router.push(chapterHref({ book: mark.book, chapter: mark.chapter }))}
      accessibilityLabel={spoken}
      testID={`mark-${verseKey(mark)}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {mark.color ? (
          // Amostra com limite em `controlBorder`: a cor não é o único sinal, o
          // nome dela vai escrito ao lado.
          <View
            aria-hidden
            testID={`mark-swatch-${verseKey(mark)}`}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: highlightColor(mark.color, isDark),
              borderWidth: 1.5,
              borderColor: colors.controlBorder,
            }}
          />
        ) : null}
        <AppText variant="action" style={{ flexShrink: 1 }}>
          {reference}
        </AppText>
        {colorLabel ? (
          <AppText variant="caption" style={{ flexShrink: 1 }}>
            {colorLabel}
          </AppText>
        ) : null}
      </View>
      {mark.note ? (
        <AppText variant="quote" numberOfLines={3} style={{ marginTop: spacing.xs }}>
          {mark.note}
        </AppText>
      ) : null}
    </Block>
  );
}
