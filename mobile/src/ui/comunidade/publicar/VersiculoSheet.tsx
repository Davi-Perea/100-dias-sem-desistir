import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { getBook, type Book } from '@/bible/books';
import { loadKeyVerse } from '@/journey/keyVerse';
import { getHighlight } from '@/marks/colors';
import { marksByBook, useMarks, verseKey, type VerseMark, type VerseRef } from '@/marks/marksStore';
import { getBibleProvider, type Verse } from '@/reader/provider';
import { chapterReference, NEW_TESTAMENT, OLD_TESTAMENT } from '@/ui/biblia/bibleNav';
import { AppText, Button, Sheet } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { faces, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

import { verseCanonical, verseLabel, type VerseChip } from './rascunho';

/**
 * Escolher o versículo do post: QUALQUER versículo da Bíblia (pedido do fundador,
 * 2026-09-22), no caminho que a aba Bíblia já usa — livro → capítulo → versículo —
 * com os versículos que a pessoa MARCOU em destaque no topo, como atalho.
 *
 * O que é reaproveitado, nada reconstruído: `BOOKS`/`OLD_TESTAMENT`/`NEW_TESTAMENT`
 * e `chapterReference` da aba Bíblia, o `BibleTextProvider` (Bíblia Livre
 * empacotada) para saber quais versículos o capítulo tem, e o store local de
 * marcas (src/marks) para o atalho.
 *
 * O que sai do aparelho é SÓ a referência. O texto da Bíblia Livre aparece aqui e
 * na prévia do post, lido no aparelho a partir da referência (o feed faz o mesmo);
 * a anotação da pessoa e a cor da marca nunca vão ao post. Com o provedor de
 * exemplo (sem tradução licenciada), a lista mostra só os números: texto de
 * exemplo nunca se passa por versículo.
 */

/** Passo dentro da folha. */
type Stage = 'marcados' | 'livros' | 'capitulos' | 'versiculos';

/** Célula da grade de capítulos: a mesma da aba Bíblia (piso 56, acima do alvo de 48). */
const CELL = 56;

type ChapterState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; verses: Verse[]; withText: boolean };

/** O que voltou do provedor, com o capítulo a que pertence: outro capítulo = ainda carregando. */
type Loaded = { key: string } & ({ verses: Verse[]; withText: boolean } | { failed: true });

export function VersiculoSheet({
  visible,
  onClose,
  onAttach,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onAttach: (attachment: VerseChip) => void;
  initial: VerseChip | null;
}) {
  const { colors } = useTheme();
  const marks = useMarks();
  const groups = marksByBook(marks);
  const marked: VerseMark[] = groups.flatMap((group) => group.items);

  const [stage, setStage] = useState<Stage>('marcados');
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [chosen, setChosen] = useState<VerseRef | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);

  // Cada abertura começa do que já está anexado (ou do zero). Ajuste durante a
  // renderização (padrão do React para "estado que depende de prop"), sem efeito.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const start = initial ? initial.ref : null;
      setChosen(start);
      setBook(start ? (getBook(start.book) ?? null) : null);
      setChapter(start ? start.chapter : null);
      setStage('marcados');
      setBusy(false);
    }
  }

  // Sem nenhuma marca, o atalho não existe: a folha abre direto na Bíblia.
  const showing: Stage = stage === 'marcados' && marked.length === 0 ? 'livros' : stage;

  // Versículos do capítulo escolhido, lidos no aparelho. O estado guarda a QUAL
  // capítulo a resposta pertence: enquanto ela não chega, a tela diz "abrindo".
  const chapterKey = book && chapter !== null ? `${book.id}.${chapter}` : null;
  const chapterState: ChapterState =
    loaded === null || loaded.key !== chapterKey
      ? { phase: 'loading' }
      : 'failed' in loaded
        ? { phase: 'error' }
        : { phase: 'ready', verses: loaded.verses, withText: loaded.withText };

  useEffect(() => {
    if (showing !== 'versiculos' || !book || chapter === null || chapterKey === null) return;
    let alive = true;
    (async () => {
      try {
        const provider = getBibleProvider();
        const withText = !provider.getMetadata().isDevPlaceholder;
        const passage = await provider.getPassage(chapterReference(book.id, chapter));
        if (alive) setLoaded({ key: chapterKey, verses: passage.verses, withText });
      } catch {
        if (alive) setLoaded({ key: chapterKey, failed: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [showing, book, chapter, chapterKey]);

  const attach = async () => {
    if (!chosen || busy) return;
    const ref = { book: chosen.book, chapter: chosen.chapter, verse: chosen.verse };
    let text: string | null = null;
    let translation: string | null = null;
    setBusy(true);
    try {
      // Só para a prévia no aparelho; sem texto (falha, tradução de exemplo), fica só a referência.
      const verse = await loadKeyVerse(verseCanonical(ref));
      text = verse?.text ?? null;
      translation = verse?.translation ?? null;
    } finally {
      setBusy(false);
    }
    onAttach({ kind: 'versiculo', ref, label: verseLabel(ref), text, translation });
  };

  /* ------------------------------------------------------------------ peças */

  const row = (input: {
    key: string;
    label: string;
    detail?: string | null;
    spoken: string;
    selected?: boolean;
    testID: string;
    onPress: () => void;
  }) => (
    <Pressable
      key={input.key}
      onPress={input.onPress}
      accessibilityRole={input.selected === undefined ? 'button' : 'radio'}
      accessibilityState={input.selected === undefined ? undefined : { selected: input.selected, checked: input.selected }}
      accessibilityLabel={input.spoken}
      testID={input.testID}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: input.selected ? 2.5 : 1.5,
          borderColor: input.selected ? colors.text : colors.controlBorder,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="rowLabel">{input.label}</AppText>
        {input.detail ? <AppText variant="caption">{input.detail}</AppText> : null}
      </View>
      {input.selected ? <Icon name="check" size={20} color={colors.text} /> : null}
    </Pressable>
  );

  const attachButton = (
    <Button
      title="Anexar versículo"
      onPress={attach}
      disabled={!chosen}
      loading={busy}
      testID="verse-attach"
    />
  );

  /* ---------------------------------------------------------- os quatro passos */

  let body;
  if (marks === null && stage === 'marcados') {
    body = <AppText variant="caption">Carregando os seus versículos…</AppText>;
  } else if (showing === 'marcados') {
    body = (
      <View style={{ gap: spacing.lg }} testID="verse-marked">
        <AppText variant="bodySm">
          Escolha um dos versículos que você marcou, ou procure qualquer outro na Bíblia. O post leva a referência; a
          sua anotação fica só no celular.
        </AppText>
        <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
          {marked.map((mark) =>
            row({
              key: verseKey(mark),
              label: verseLabel(mark),
              detail: mark.color ? `Marcado em ${getHighlight(mark.color).label.toLocaleLowerCase('pt-BR')}` : null,
              spoken: mark.color
                ? `${verseLabel(mark)}. Marcado em ${getHighlight(mark.color).label.toLocaleLowerCase('pt-BR')}`
                : verseLabel(mark),
              selected: chosen !== null && verseKey(chosen) === verseKey(mark),
              testID: `verse-option-${verseKey(mark)}`,
              onPress: () => setChosen({ book: mark.book, chapter: mark.chapter, verse: mark.verse }),
            }),
          )}
        </View>
        <Button
          title="Escolher outro na Bíblia"
          variant="outline"
          onPress={() => setStage('livros')}
          testID="verse-open-bible"
        />
        {attachButton}
      </View>
    );
  } else if (showing === 'livros') {
    body = (
      <View style={{ gap: spacing.lg }} testID="verse-books">
        <AppText variant="bodySm">Escolha o livro.</AppText>
        {[
          { title: 'Antigo Testamento', books: OLD_TESTAMENT },
          { title: 'Novo Testamento', books: NEW_TESTAMENT },
        ].map((section) => (
          <View key={section.title} style={{ gap: spacing.xs }}>
            <AppText variant="cap" accessibilityRole="header">
              {section.title}
            </AppText>
            {section.books.map((item) =>
              row({
                key: item.id,
                label: item.name,
                spoken: item.name,
                testID: `verse-book-${item.id}`,
                onPress: () => {
                  setBook(item);
                  setChapter(null);
                  setStage('capitulos');
                },
              }),
            )}
          </View>
        ))}
      </View>
    );
  } else if (showing === 'capitulos' && book) {
    body = (
      <View style={{ gap: spacing.lg }} testID="verse-chapters">
        <AppText variant="bodySm">{`Escolha o capítulo de ${book.name}.`}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {Array.from({ length: book.chapters }, (_, index) => index + 1).map((number) => (
            <Pressable
              key={number}
              onPress={() => {
                setChapter(number);
                setStage('versiculos');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${book.name} capítulo ${number}`}
              testID={`verse-chapter-${number}`}
              style={({ pressed }) => [
                {
                  minWidth: CELL,
                  minHeight: Math.max(CELL, MIN_TOUCH),
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.sm,
                  borderWidth: 1.5,
                  borderColor: colors.controlBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <AppText style={{ fontFamily: faces.sg700, fontSize: 17, lineHeight: 22, color: colors.text }}>
                {number}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  } else if (book && chapter !== null) {
    body = (
      <View style={{ gap: spacing.lg }} testID="verse-verses">
        <AppText variant="bodySm">{`Escolha o versículo de ${book.name} ${chapter}.`}</AppText>
        {chapterState.phase === 'loading' ? (
          <AppText variant="caption" accessibilityLiveRegion="polite">
            Abrindo o capítulo…
          </AppText>
        ) : chapterState.phase === 'error' ? (
          <View style={{ gap: spacing.md }} testID="verse-chapter-error">
            <AppText variant="bodySm">Não foi possível abrir este capítulo no seu celular.</AppText>
            <Button
              title="Escolher outro capítulo"
              variant="outline"
              onPress={() => setStage('capitulos')}
              testID="verse-chapter-retry"
            />
          </View>
        ) : (
          <>
            <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
              {chapterState.verses.map((verse) => {
                const ref = { book: book.id, chapter, verse: verse.verse };
                const label = `${book.name} ${chapter}:${verse.verse}`;
                return row({
                  key: verseKey(ref),
                  label: String(verse.verse),
                  detail: chapterState.withText ? verse.text : null,
                  spoken: label,
                  selected: chosen !== null && verseKey(chosen) === verseKey(ref),
                  testID: `verse-option-${verseKey(ref)}`,
                  onPress: () => setChosen(ref),
                });
              })}
            </View>
            {attachButton}
          </>
        )}
      </View>
    );
  } else {
    body = <AppText variant="caption">Escolha o livro e o capítulo.</AppText>;
  }

  /** Volta um passo dentro da folha (nunca fecha: "Fechar" e o véu fazem isso). */
  const back = (() => {
    if (showing === 'livros' && marked.length > 0) {
      return { label: 'Voltar aos seus marcados', to: 'marcados' as Stage };
    }
    if (showing === 'capitulos') return { label: 'Escolher outro livro', to: 'livros' as Stage };
    if (showing === 'versiculos') return { label: 'Escolher outro capítulo', to: 'capitulos' as Stage };
    return null;
  })();

  return (
    <Sheet visible={visible} onClose={onClose} title="Versículo" testID="verse-sheet">
      <View style={{ gap: spacing.lg }}>
        {back ? (
          <Button
            title={back.label}
            variant="underline"
            onPress={() => setStage(back.to)}
            style={{ alignSelf: 'flex-start' }}
            testID="verse-back"
          />
        ) : null}
        {body}
        <Button title="Fechar" variant="underline" onPress={onClose} testID="verse-close" />
      </View>
    </Sheet>
  );
}
