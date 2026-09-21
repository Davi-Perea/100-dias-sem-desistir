import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import type { Book } from '@/bible/books';
import { getBibleProvider } from '@/reader/provider';
import { AppText, Button, Screen, ScreenScroll, SettingRow } from '@/ui/components';
import {
  NEW_TESTAMENT,
  OLD_TESTAMENT,
  bookHref,
  chapterHref,
  chapterLabel,
  loadBiblePosition,
  type BiblePosition,
} from '@/ui/biblia/bibleNav';
import { PlaceholderNotice } from '@/ui/biblia/PlaceholderNotice';
import { spacing } from '@/ui/theme';

/**
 * Aba Bíblia: leitura livre, fora da campanha. Antigo e Novo Testamento em
 * linhas de piso 48 e, no topo, "Continuar em <Livro N>" quando há última
 * leitura. Nada daqui conclui dia da Jornada.
 *
 * Decisão do fundador (2026-09-21): a Bíblia Livre entra dentro do app. A aba
 * também deixa o app útil antes de 23/09, quando a Jornada só mostra a contagem.
 */
export default function BibleTab() {
  const metadata = getBibleProvider().getMetadata();
  const [last, setLast] = useState<BiblePosition | null>(null);

  // Relida a cada foco: voltar de um capítulo atualiza o "Continuar em".
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadBiblePosition().then((position) => alive && setLast(position));
      return () => {
        alive = false;
      };
    }, []),
  );

  const openBook = (book: Book) => router.push(bookHref(book.id));

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="screenTitle" accessibilityRole="header" testID="bible-title">
            Bíblia
          </AppText>
          <AppText variant="caption" testID="bible-translation">
            {metadata.name}
          </AppText>
        </View>

        {metadata.isDevPlaceholder ? <PlaceholderNotice /> : null}

        {last ? (
          <Button
            title={`Continuar em ${chapterLabel(last)}`}
            icon="chevron-right"
            onPress={() => router.push(chapterHref(last))}
            testID="bible-continue"
          />
        ) : null}

        <Testament title="Antigo Testamento" books={OLD_TESTAMENT} onOpen={openBook} testID="bible-ot" />
        <Testament title="Novo Testamento" books={NEW_TESTAMENT} onOpen={openBook} testID="bible-nt" />
      </ScreenScroll>
    </Screen>
  );
}

function Testament({
  title,
  books,
  onOpen,
  testID,
}: {
  title: string;
  books: readonly Book[];
  onOpen: (book: Book) => void;
  testID: string;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <AppText variant="cap" accessibilityRole="header">
        {title}
      </AppText>
      <View>
        {books.map((book, index) => (
          <SettingRow
            key={book.id}
            label={book.name}
            first={index === 0}
            onPress={() => onOpen(book)}
            accessibilityHint={`${book.chapters} ${book.chapters === 1 ? 'capítulo' : 'capítulos'}`}
            testID={`bible-book-${book.id}`}
          />
        ))}
      </View>
    </View>
  );
}
