import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { getBook } from '@/bible/books';
import { BackBar } from '@/ui/BackBar';
import { AppText, Button, Screen, ScreenScroll, StateView } from '@/ui/components';
import { backToBible, chapterHref, loadBiblePosition, type BiblePosition } from '@/ui/biblia/bibleNav';
import { MIN_TOUCH, faces, radius, spacing, useTheme } from '@/ui/theme';

/** Célula da grade: piso 56 (acima do alvo de 48), cresce com a fonte do sistema. */
const CELL = 56;

/**
 * Grade de capítulos de um livro (leitura livre). O capítulo da última leitura
 * vem marcado por FORMA e cor (fundo `markSurface`) e dito ao leitor de tela.
 */
export default function BibleBookScreen() {
  const { livro } = useLocalSearchParams<{ livro: string }>();
  const book = typeof livro === 'string' ? getBook(livro.toUpperCase()) : undefined;
  const { colors } = useTheme();
  const [last, setLast] = useState<BiblePosition | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadBiblePosition().then((position) => alive && setLast(position));
      return () => {
        alive = false;
      };
    }, []),
  );

  if (!book) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <StateView
          kind="empty"
          icon="alert"
          title="Livro não encontrado"
          message="Escolha um livro na lista da Bíblia."
          action={<Button title="Voltar" variant="outline" onPress={backToBible} />}
        />
      </Screen>
    );
  }

  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  const lastHere = last && last.book === book.id ? last.chapter : null;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={spacing.xl}>
        <BackBar label="Bíblia" onBack={backToBible} />
        <View style={{ gap: spacing.xs }}>
          <AppText variant="screenTitle" accessibilityRole="header" testID="bible-book-title">
            {book.name}
          </AppText>
          <AppText variant="caption">
            {book.chapters === 1 ? '1 capítulo' : `${book.chapters} capítulos`}
          </AppText>
        </View>

        <View
          testID="bible-chapter-grid"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        >
          {chapters.map((chapter) => {
            const marked = chapter === lastHere;
            return (
              <Pressable
                key={chapter}
                onPress={() => router.push(chapterHref({ book: book.id, chapter }))}
                accessibilityRole="button"
                accessibilityLabel={
                  marked ? `Capítulo ${chapter}, última leitura` : `Capítulo ${chapter}`
                }
                testID={`bible-chapter-${chapter}`}
                style={({ pressed }) => [
                  {
                    minWidth: CELL,
                    minHeight: Math.max(CELL, MIN_TOUCH),
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    // Borda de controle (3,59:1) na célula comum; a marcada é cheia.
                    borderWidth: 1.5,
                    borderColor: marked ? colors.markSurface : colors.controlBorder,
                    backgroundColor: marked ? colors.markSurface : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: faces.sg700,
                    fontSize: 17,
                    lineHeight: 22,
                    color: marked ? colors.onMark : colors.text,
                    textAlign: 'center',
                  }}
                >
                  {chapter}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
