import { useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, View } from 'react-native';

import { copyText } from '@/marks/clipboard';
import { HIGHLIGHTS, highlightColor, type HighlightId } from '@/marks/colors';
import { NOTE_MAX_LENGTH, getVerseMark, saveVerseMark, useMarks, type VerseRef } from '@/marks/marksStore';
import { getBibleProvider } from '@/reader/provider';
import { AppText, Button, Sheet } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { TextField } from '@/ui/TextField';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

/** Diâmetro da amostra de cor; o alvo de toque em volta dela tem 48. */
const SWATCH = 40;

/**
 * B2 · Folha do versículo (feedback de 2026-09-22). Abre ao tocar num
 * versículo, no leitor do dia e na aba Bíblia (via `ChapterText`).
 *
 * Ordem: referência (título) · trecho do versículo · cinco cores de marca-texto
 * · a anotação, se houver · "Anotar" · "Copiar" · "Tirar marca" (só com cor).
 * Nenhum primário no menu: as ações são equivalentes. "Anotar" troca a folha
 * pelo campo de texto, com "Salvar anotação" como único primário.
 *
 * Tudo fica só no aparelho (`marks/marksStore`). Se o disco recusar, nada muda
 * e a folha avisa "Não foi possível salvar." (PER-02).
 *
 * Teclado: a `Sheet` é ancorada no fundo do Modal. No iOS o teclado cobriria o
 * campo, então um espaçador da altura do teclado entra no fim da folha. No
 * Android o Modal já redimensiona a janela (adjustResize) e o espaçador fica 0.
 */
export function VerseSheet({
  verseRef,
  bookName,
  verseText,
  onClose,
}: {
  verseRef: VerseRef;
  bookName: string;
  verseText: string;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const marks = useMarks();
  const mark = getVerseMark(marks, verseRef);
  const [mode, setMode] = useState<'menu' | 'note'>('menu');
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const keyboard = useIosKeyboardHeight();
  const label = `${bookName} ${verseRef.chapter}:${verseRef.verse}`;

  const save = async (patch: { color?: HighlightId | null; note?: string }) => {
    setFailed(false);
    setSaving(true);
    try {
      await saveVerseMark(verseRef, patch);
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    const translation = getBibleProvider().getMetadata().name;
    try {
      await copyText(`“${verseText}” ${label} (${translation})`);
      setCopied(true);
      AccessibilityInfo.announceForAccessibility('Versículo copiado.');
    } catch {
      setCopied(false);
    }
  };

  const startNote = () => {
    setDraft(mark?.note ?? '');
    setFailed(false);
    setMode('note');
  };

  const saveNote = async (note: string) => {
    if (await save({ note })) setMode('menu');
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={mode === 'note' ? `Anotação · ${label}` : label}
      testID="verse-sheet"
    >
      {mode === 'menu' ? (
        <>
          <AppText variant="read" numberOfLines={4} style={{ color: colors.textSecondary }} testID="verse-sheet-text">
            {verseText}
          </AppText>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="captionStrong">Marca-texto</AppText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Cor do marca-texto"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
            >
              {HIGHLIGHTS.map((h) => {
                const selected = mark?.color === h.id;
                return (
                  <Pressable
                    key={h.id}
                    accessibilityRole="radio"
                    accessibilityLabel={h.label}
                    accessibilityState={{ checked: selected, disabled: saving }}
                    disabled={saving}
                    onPress={() => save({ color: h.id })}
                    testID={`verse-color-${h.id}`}
                    style={{
                      minWidth: MIN_TOUCH,
                      minHeight: MIN_TOUCH,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Limite em `controlBorder` (3,59:1): a cor clara sobre a folha
                        mede 1,2–1,5:1. Selecionada: borda de tinta mais grossa E
                        check — nunca só a cor. */}
                    <View
                      testID={`verse-color-${h.id}-swatch`}
                      style={{
                        width: SWATCH,
                        height: SWATCH,
                        borderRadius: SWATCH / 2,
                        backgroundColor: highlightColor(h.id, isDark),
                        borderWidth: selected ? 3 : 1.5,
                        borderColor: selected ? colors.text : colors.controlBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected ? <Icon name="check" size={18} color={colors.text} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {mark?.note ? (
            <View style={{ gap: spacing.xs }} testID="verse-sheet-note">
              <AppText variant="captionStrong">Sua anotação</AppText>
              <AppText variant="body">{mark.note}</AppText>
            </View>
          ) : null}

          <Button
            title={mark?.note ? 'Editar anotação' : 'Anotar'}
            icon="note"
            variant="outline"
            onPress={startNote}
            testID="verse-note"
          />
          <Button
            title={copied ? 'Copiado' : 'Copiar'}
            variant="outline"
            onPress={copy}
            testID="verse-copy"
          />
          {mark?.color ? (
            <Button
              title="Tirar marca"
              variant="underline"
              onPress={() => save({ color: null })}
              disabled={saving}
              testID="verse-unmark"
            />
          ) : null}
        </>
      ) : (
        <>
          <TextField
            minHeight={140}
            value={draft}
            onChangeText={setDraft}
            maxLength={NOTE_MAX_LENGTH}
            autoFocus
            placeholder="Escreva sua anotação."
            accessibilityLabel={`Anotação sobre ${label}`}
            testID="verse-note-input"
          />
          <AppText variant="caption">Sua anotação fica só neste aparelho.</AppText>
          <Button
            title="Salvar anotação"
            onPress={() => saveNote(draft)}
            loading={saving}
            testID="verse-note-save"
          />
          {mark?.note ? (
            <Button
              title="Apagar anotação"
              variant="danger"
              onPress={() => saveNote('')}
              disabled={saving}
              testID="verse-note-delete"
            />
          ) : null}
          <Button
            title="Cancelar"
            variant="underline"
            onPress={() => {
              setFailed(false);
              setMode('menu');
            }}
            testID="verse-note-cancel"
          />
        </>
      )}

      {failed ? (
        <AppText
          variant="caption"
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger }}
          testID="verse-sheet-error"
        >
          Não foi possível salvar. Tente de novo.
        </AppText>
      ) : null}

      {keyboard > 0 ? <View style={{ height: keyboard }} testID="verse-sheet-keyboard" /> : null}
    </Sheet>
  );
}

/** Altura do teclado no iOS (0 no Android e na web, onde a janela já se ajusta). */
function useIosKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
