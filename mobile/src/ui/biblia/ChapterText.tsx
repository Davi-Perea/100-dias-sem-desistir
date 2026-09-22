import { useState } from 'react';
import { Text, View } from 'react-native';

import { getBook } from '@/bible/books';
import { highlightColor, getHighlight } from '@/marks/colors';
import { chapterMarks, useMarks, verseKey, type VerseRef } from '@/marks/marksStore';
import type { Verse } from '@/reader/provider';
import { readLineHeight } from '@/reader/readerFontSize';
import { useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { VerseSheet } from '@/ui/leitor/VerseSheet';
import { faces, spacing, useTheme } from '@/ui/theme';

/** Estado falado depois do texto, sem pontuação dobrada ("frase.. Marcado"). */
function spokenState(text: string, state: string): string {
  if (!state) return '';
  const sep = /[.!?;:…]$/.test(text.trim()) ? ' ' : '. ';
  return `${sep}${state[0].toUpperCase()}${state.slice(1)}.`;
}

/**
 * Corpo de um capítulo: um parágrafo por versículo, com o número que o PROVEDOR
 * fornecer (o app nunca inventa estrutura de versículos — REGRAS 1.5).
 *
 * É a mesma composição do leitor do dia (`app/reader/[day].tsx`, modo TEXTO):
 * Source Serif 400 no tamanho escolhido em "Aa", entrelinha 1,7× e o numeral em
 * 12/19 do tamanho, em `textMuted` (6,90:1 no claro, 7,42:1 no escuro).
 *
 * Sem `maxFontSizeMultiplier`: o texto cresce com a fonte do sistema sem teto,
 * que é o que a folha B3 promete ("até o máximo que o sistema permite").
 *
 * B2 (feedback de 2026-09-22): com `book` e `chapter`, tocar num versículo abre
 * a folha de marca-texto, anotação e cópia (`VerseSheet`). O versículo marcado
 * leva a cor como fundo do parágrafo (texto e numeral passam 4,5:1 sobre as
 * cinco cores nos dois temas, ver `marks/colors.ts`); com anotação, um ícone
 * discreto no fim. A cor e a anotação também vão no nome falado.
 */
export function ChapterText({
  verses,
  fontSize,
  heading,
  book,
  chapter,
}: {
  verses: readonly Verse[];
  fontSize: number;
  /** Título que a tradução põe antes do versículo 1 (ex.: título do salmo); não é versículo. */
  heading?: string | null;
  /** Livro e capítulo do texto: sem eles, os versículos não são tocáveis. */
  book?: string;
  chapter?: number;
}) {
  const { colors, isDark } = useTheme();
  const face = useFace();
  const marks = useMarks();
  const [open, setOpen] = useState<{ ref: VerseRef; text: string } | null>(null);
  const markable = typeof book === 'string' && typeof chapter === 'number';
  const byVerse = markable ? chapterMarks(marks, book, chapter) : {};
  const bookName = markable ? (getBook(book)?.name ?? book) : '';

  return (
    <View style={{ gap: spacing.lg }} testID="chapter-text">
      {heading ? (
        // Itálico em `textSecondary` (10,85:1 no claro, 10,84:1 no escuro), do tamanho do texto.
        <Text
          testID="chapter-heading"
          style={{
            fontFamily: face(faces.ss400i),
            fontSize,
            lineHeight: readLineHeight(fontSize),
            color: colors.textSecondary,
          }}
        >
          {heading}
        </Text>
      ) : null}
      {verses.map((verse) => {
        const mark = byVerse[verse.verse];
        const state = [
          mark?.color ? `marcado em ${getHighlight(mark.color).label.toLowerCase()}` : null,
          mark?.note ? 'com anotação' : null,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Text
            key={verse.verse}
            accessibilityLabel={`Versículo ${verse.verse}. ${verse.text}${spokenState(verse.text, state)}`}
            accessibilityRole={markable ? 'button' : undefined}
            accessibilityHint={markable ? 'Abre marca-texto, anotação e copiar.' : undefined}
            onPress={
              markable
                ? () => setOpen({ ref: { book, chapter, verse: verse.verse }, text: verse.text })
                : undefined
            }
            testID={`verse-${verse.verse}`}
            style={{
              fontFamily: face(faces.ss400),
              fontSize,
              lineHeight: readLineHeight(fontSize),
              color: colors.text,
              // O realce alarga 4 de cada lado sem mexer no texto: o recuo
              // negativo devolve o espaço, marcado ou não.
              marginHorizontal: -4,
              paddingHorizontal: 4,
              borderRadius: 6,
              backgroundColor: mark?.color ? highlightColor(mark.color, isDark) : undefined,
            }}
          >
            <Text style={{ fontSize: Math.round((12 * fontSize) / 19), color: colors.textMuted }}>
              {verse.verse}{' '}
            </Text>
            {verse.text}
            {mark?.note ? (
              <Text testID={`verse-note-${verse.verse}`} aria-hidden>
                {' '}
                <Icon name="note" size={Math.round(fontSize * 0.8)} color={colors.textMuted} />
              </Text>
            ) : null}
          </Text>
        );
      })}
      {open ? (
        <VerseSheet
          key={verseKey(open.ref)}
          verseRef={open.ref}
          bookName={bookName}
          verseText={open.text}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </View>
  );
}
