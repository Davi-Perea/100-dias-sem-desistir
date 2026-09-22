import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { loadKeyVerse } from '@/journey/keyVerse';
import { getHighlight } from '@/marks/colors';
import { marksByBook, useMarks, verseKey, type VerseMark } from '@/marks/marksStore';
import { AppText, Button, Sheet } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

import { verseCanonical, verseLabel, type VerseChip } from './rascunho';

/**
 * Escolher o versículo do post entre os que a pessoa MARCOU (store local de
 * src/marks). A lista mostra só a referência e a cor, lidas do aparelho. Ao
 * anexar, o post leva SÓ a referência. O texto da Bíblia Livre é buscado no
 * aparelho para a prévia (e o feed o mostra a partir da referência); a anotação
 * da pessoa e a cor da marca nunca vão ao post.
 */
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
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Cada abertura começa do que já está anexado (ou do zero). Ajuste durante a
  // renderização (padrão do React para "estado que depende de prop"), sem efeito.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setChosen(initial ? verseKey(initial.ref) : null);
    }
  }

  const all: VerseMark[] = groups.flatMap((group) => group.items);
  const selected = all.find((mark) => verseKey(mark) === chosen) ?? null;

  const attach = async () => {
    if (!selected || busy) return;
    const ref = {
      book: selected.book,
      chapter: selected.chapter,
      verse: selected.verse,
    };
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
    onAttach({
      kind: 'versiculo',
      ref,
      label: verseLabel(ref),
      text,
      translation,
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Versículo" testID="verse-sheet">
      {marks === null ? (
        <AppText variant="caption">Carregando os seus versículos…</AppText>
      ) : all.length === 0 ? (
        <View style={{ gap: spacing.md }} testID="verse-empty">
          <AppText variant="bodySm">
            Você ainda não marcou nenhum versículo. Na Bíblia, toque num versículo e escolha uma cor para marcar.
          </AppText>
          <Button title="Fechar" variant="outline" onPress={onClose} testID="verse-close" />
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <AppText variant="bodySm">
            Escolha um dos versículos que você marcou. O post leva a referência; a sua anotação fica só no celular.
          </AppText>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
            {all.map((mark) => {
              const key = verseKey(mark);
              const isChosen = key === chosen;
              const label = verseLabel(mark);
              const color = mark.color
                ? `Marcado em ${getHighlight(mark.color).label.toLocaleLowerCase('pt-BR')}`
                : null;
              return (
                <Pressable
                  key={key}
                  onPress={() => setChosen(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isChosen, checked: isChosen }}
                  accessibilityLabel={color ? `${label}. ${color}` : label}
                  testID={`verse-option-${key}`}
                  style={({ pressed }) => [
                    {
                      minHeight: MIN_TOUCH,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.sm,
                      borderWidth: isChosen ? 2.5 : 1.5,
                      borderColor: isChosen ? colors.text : colors.controlBorder,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="rowLabel">{label}</AppText>
                    {color ? <AppText variant="caption">{color}</AppText> : null}
                  </View>
                  {isChosen ? <Icon name="check" size={20} color={colors.text} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Button title="Anexar versículo" onPress={attach} disabled={!selected} loading={busy} testID="verse-attach" />
        </View>
      )}
    </Sheet>
  );
}
