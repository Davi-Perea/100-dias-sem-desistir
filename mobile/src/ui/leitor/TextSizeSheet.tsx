import { Text, View } from 'react-native';

import {
  READER_FONT_MAX,
  READER_FONT_MIN,
  readLineHeight,
  readerFontFraction,
} from '@/reader/readerFontSize';
import { AppText, Button, Sheet, useFace } from '@/ui/components';
import { BRAND_YELLOW, faces, spacing, useTheme } from '@/ui/theme';

import { LabelProbe, useOneLineFit } from './LabelProbe';

/**
 * B3 · Tamanho do texto. Folha modal sobre o leitor.
 *
 * Ordem do TELAS: alça · título · amostra no tamanho corrente · "Diminuir" e
 * "Aumentar" contornados de 56 · régua 14 — trilha — 30 · valor "19 pt" · a frase
 * sobre o tamanho de letra do celular · "Pronto" (do app atual; LACUNAS P19).
 *
 * A frase "cresce ... até o máximo que o sistema permite" só é verdadeira porque
 * nem o texto bíblico nem esta amostra têm `maxFontSizeMultiplier` (o leitor
 * antigo travava em 1,8×). Se alguém puser um teto aqui ou no leitor, a frase
 * passa a mentir e precisa mudar junto.
 */

const SAMPLE = 'Exemplo do tamanho atual do texto de leitura.';
const LABELS = ['Diminuir', 'Aumentar'] as const;
/** Padding lateral do botão (20 + 20) mais a borda de 2 dos dois lados. */
const BUTTON_CHROME = 44;

export function TextSizeSheet({
  visible,
  onClose,
  size,
  onStep,
}: {
  visible: boolean;
  onClose: () => void;
  /** Tamanho efetivo, já normalizado. */
  size: number;
  onStep: (direction: 1 | -1) => void;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const fit = useOneLineFit();
  // Os dois lado a lado enquanto o rótulo mais largo cabe em uma linha dentro de
  // metade da largura; senão empilham. Medido, não por escala (REGRAS 26).
  const sideBySide = fit.fits((box) => (box - spacing.md) / 2 - BUTTON_CHROME);
  const atMin = size <= READER_FONT_MIN;
  const atMax = size >= READER_FONT_MAX;

  return (
    <Sheet visible={visible} onClose={onClose} title="Tamanho do texto" testID="text-size-sheet">
      {/* Amostra: bloco surfaceWarm raio 16, Source Serif no tamanho corrente,
          entrelinha 1,7×, SEM teto de escala — ver o comentário do topo. */}
      <View
        style={{ backgroundColor: colors.surfaceWarm, borderRadius: 16, padding: spacing.lg, minHeight: 48 }}
      >
        <Text
          testID="text-size-sample"
          style={{
            fontFamily: face(faces.ss400),
            fontSize: size,
            lineHeight: readLineHeight(size),
            color: colors.text,
          }}
        >
          {SAMPLE}
        </Text>
      </View>

      <View
        onLayout={(event) => fit.setBoxWidth(Math.floor(event.nativeEvent.layout.width))}
        testID="text-size-buttons"
        style={{ flexDirection: sideBySide ? 'row' : 'column', gap: spacing.md }}
      >
        <LabelProbe labels={LABELS} onWidth={fit.setLabelWidth} testID="text-size-probe" />
        <Button
          title="Diminuir"
          variant="outline"
          onPress={() => onStep(-1)}
          disabled={atMin}
          style={sideBySide ? { flex: 1 } : undefined}
          testID="font-smaller"
        />
        <Button
          title="Aumentar"
          variant="outline"
          onPress={() => onStep(1)}
          disabled={atMax}
          style={sideBySide ? { flex: 1 } : undefined}
          testID="font-bigger"
        />
      </View>

      {/* Régua. O amarelo sobre a trilha mede ~1,4:1 e só é aceitável porque
          nunca é o único sinal: o valor vai escrito ao lado ("19 pt"). Para o
          leitor de tela a régua inteira é um controle ajustável.
          R1-15: com a fonte do sistema no máximo, "14 — trilha — 30 — 19 pt"
          não cabe numa linha estreita. A linha quebra (flexWrap): "14 — trilha —
          30" fica junto, com a trilha num piso de 48, e o valor desce para a
          linha de baixo quando não sobra espaço ao lado. */}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Tamanho do texto"
        accessibilityValue={{ min: READER_FONT_MIN, max: READER_FONT_MAX, now: size, text: `${size} pontos` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment' && !atMax) onStep(1);
          if (event.nativeEvent.actionName === 'decrement' && !atMin) onStep(-1);
        }}
        testID="text-size-ruler"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: spacing.md,
          rowGap: spacing.xs,
        }}
      >
        <View
          testID="text-size-track-row"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexGrow: 1, flexBasis: 200 }}
        >
          <AppText variant="caption">{READER_FONT_MIN}</AppText>
          <View
            style={{
              flex: 1,
              minWidth: 48,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.surfaceSunken,
              overflow: 'hidden',
            }}
          >
            <View
              testID="text-size-fill"
              style={{ width: `${readerFontFraction(size) * 100}%`, height: 8, backgroundColor: BRAND_YELLOW }}
            />
          </View>
          <AppText variant="caption">{READER_FONT_MAX}</AppText>
        </View>
        <AppText
          testID="text-size-value"
          style={{ fontFamily: faces.sg700, fontSize: 14, lineHeight: 18, color: colors.text }}
        >
          {`${size} pt`}
        </AppText>
      </View>

      <AppText variant="caption">
        O texto também cresce com o tamanho de letra do seu celular, até o máximo que o sistema permite.
      </AppText>

      {/* R1-3: um fechar visível no fim da folha. Com fonte grande a folha chega
          a 88% da tela e sobra uma faixa estreita de scrim — sem este botão,
          só o voltar do Android fechava. PROVISÓRIO (LACUNAS P19): mantido do
          app atual até o designer decidir. */}
      <Button title="Pronto" variant="outline" onPress={onClose} testID="text-size-done" />
    </Sheet>
  );
}
