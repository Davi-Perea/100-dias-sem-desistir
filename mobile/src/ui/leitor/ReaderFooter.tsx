import { Pressable, View } from 'react-native';

import { AppText, Button, SaveErrorNotice } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons';
import { BUTTON_MIN_HEIGHT, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

import { LabelProbe, useOneLineFit } from './LabelProbe';

/**
 * Rodapé fixo do leitor (B1) e a versão empilhada de fonte grande (B2).
 *
 * B1: quadrado de 56 com "‹" + botão primário que ocupa o resto; embaixo, o
 * sublinhado "Prefiro ler na minha Bíblia" (grava o modo e volta; não conclui).
 * B2: quando o rótulo do primário não cabe em UMA linha na largura que sobra ao
 * lado do quadrado, o rodapé empilha: primário em cima, "Capítulo anterior"
 * embaixo, os dois com piso 64. A seta vira palavra, porque um quadrado de 56 com
 * seta não cabe ao lado de uma palavra grande.
 *
 * O limiar é MEDIDO (LabelProbe + largura real do rodapé), não uma escala fixa:
 * o desenho fala em "~2,9×", mas o ponto em que o rótulo deixa de caber muda com
 * a largura do aparelho e com o "Texto em Negrito" do sistema.
 *
 * CORREÇÃO TÉCNICA (B2, "rótulo de 24/30"): o desenho representa a fonte grande
 * desenhando o rótulo em 24/30. Aqui o rótulo continua 17/22 e é o sistema que o
 * aumenta — declarar 24 como base faria o sistema multiplicar de novo.
 *
 * A altura do rodapé é devolvida a quem rola (`onHeight`), para o fim do
 * capítulo continuar alcançável acima dele em fonte grande.
 */

export type ReaderPrimary = {
  title: string;
  icon?: IconName;
  onPress: () => void;
  loading?: boolean;
  testID: string;
};

/** Quadrado de 56 + gap de 12, padding lateral do botão (20 + 20). */
const SQUARE = 56;
const BUTTON_PADDING = 40;
/** Ícone de 18 + gap de 8 dentro do botão. */
const ICON_ROOM = 26;
/** Piso do rodapé empilhado (B2). */
const STACKED_MIN_HEIGHT = 64;

export function ReaderFooter({
  primary,
  isFirstChapter,
  onPrevious,
  ownBible,
  bottomPadding,
  onHeight,
  saveFailed = false,
  note,
}: {
  primary: ReaderPrimary;
  isFirstChapter: boolean;
  onPrevious: () => void;
  /** "Prefiro ler na minha Bíblia"; ausente quando o dia já está concluído. */
  ownBible?: () => void;
  bottomPadding: number;
  onHeight: (height: number) => void;
  /** "Concluir leitura" não gravou (PER-02): o aviso fica logo acima do primário. */
  saveFailed?: boolean;
  /** Frase curta acima do primário (J6: dia futuro que ainda não pode ser concluído). */
  note?: string;
}) {
  const { colors } = useTheme();
  const fit = useOneLineFit();
  const iconRoom = primary.icon ? ICON_ROOM : 0;
  const stacked = !fit.fits((box) => box - SQUARE - spacing.md - BUTTON_PADDING - iconRoom);

  return (
    <View
      testID="reader-footer"
      onLayout={(event) => onHeight(Math.round(event.nativeEvent.layout.height))}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 26,
        paddingTop: spacing.md,
        paddingBottom: bottomPadding,
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      {note ? (
        <AppText variant="caption" testID="reader-future-note">
          {note}
        </AppText>
      ) : null}
      {saveFailed ? <SaveErrorNotice testID="reader-save-error" /> : null}
      <View
        testID="reader-footer-box"
        onLayout={(event) => fit.setBoxWidth(Math.floor(event.nativeEvent.layout.width))}
      >
        <LabelProbe labels={[primary.title]} onWidth={fit.setLabelWidth} testID="reader-footer-probe" />
        {stacked ? (
          <View style={{ gap: spacing.md }} testID="reader-footer-stacked">
            <Button
              title={primary.title}
              icon={primary.icon}
              onPress={primary.onPress}
              loading={primary.loading}
              testID={primary.testID}
              style={{ minHeight: STACKED_MIN_HEIGHT }}
            />
            {/* PROVISÓRIO (LACUNAS B2 — sem pergunta própria ao designer): o
                desenho do empilhado não mostra o capítulo 1. Fica o mesmo
                controle do modo em linha, desabilitado, para os dois modos terem
                os mesmos botões. */}
            <Button
              title="Capítulo anterior"
              variant="outline"
              onPress={onPrevious}
              disabled={isFirstChapter}
              testID="reader-previous"
              style={{ minHeight: STACKED_MIN_HEIGHT }}
            />
          </View>
        ) : (
          // Sem alignItems: o quadrado estica junto com o botão ao lado, que
          // cresce com o rótulo; é o único par do app com altura casada.
          <View style={{ flexDirection: 'row', gap: spacing.md }} testID="reader-footer-row">
            <Pressable
              onPress={onPrevious}
              disabled={isFirstChapter}
              accessibilityRole="button"
              accessibilityLabel="Capítulo anterior"
              accessibilityState={{ disabled: isFirstChapter }}
              testID="reader-previous"
              style={({ pressed }) => [
                {
                  width: SQUARE,
                  minHeight: Math.max(BUTTON_MIN_HEIGHT, MIN_TOUCH),
                  borderRadius: radius.button,
                  borderWidth: 2,
                  borderColor: colors.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Desabilitado a 0,35, como pede o TELAS. Contraste declarado:
                  // seta e borda ficam ~2,3:1 no claro e ~3,2:1 no escuro. A WCAG
                  // isenta controle inativo; o estado vai no accessibilityState.
                  opacity: isFirstChapter ? 0.35 : 1,
                },
                pressed && !isFirstChapter && { opacity: 0.72 },
              ]}
            >
              {/* "‹" do desenho como ícone de traço: não cresce com a fonte e
                  cabe sempre no quadrado; o nome falado é "Capítulo anterior". */}
              <Icon name="chevron-left" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Button
                title={primary.title}
                icon={primary.icon}
                onPress={primary.onPress}
                loading={primary.loading}
                testID={primary.testID}
              />
            </View>
          </View>
        )}
      </View>

      {ownBible ? (
        // PROVISÓRIO (pergunta 2 ao designer): o desenho não diz o que este link
        // faz. Pela D-1 (invariante P-09) ele grava o modo e volta, e NUNCA
        // conclui o dia; concluir é sempre "Concluir leitura".
        <Button
          title="Prefiro ler na minha Bíblia"
          variant="underline"
          onPress={ownBible}
          testID="reader-own-bible"
        />
      ) : null}
    </View>
  );
}
