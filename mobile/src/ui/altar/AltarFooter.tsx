import { Pressable, Text, View } from 'react-native';

import { useFace } from '../components';
import { faces, fixedPalette, radius, spacing } from '../theme';

/** E2 é superfície fixa de tinta: nada aqui segue o tema. */
const INK = fixedPalette('ink');

/** Piso do rodapé do modo altar (TELAS E2: quadrado de 64 e botão de 64). */
export const ALTAR_FOOTER_MIN = 64;

/**
 * Cor do "‹" inativo no passo 1: `borderStrong` do escuro (#3D3A36), 1,67:1 sobre
 * a tinta. Controle inativo é isento da WCAG 1.4.3/1.4.11; o número fica
 * declarado em contrast.test.ts. Cor plana, sem opacidade, para a auditoria de
 * token enxergar o valor real.
 */
export const ALTAR_PREVIOUS_INACTIVE = INK.borderStrong;

/**
 * Rodapé do modo altar (E2): quadrado de 64 com borda de 2px branca e "‹", e o
 * botão amarelo de 64 com "Passo N".
 *
 * Não usa o `Button` compartilhado porque o rodapé tem regras próprias de foco:
 *
 * - O "‹" fica SEMPRE montado. No passo 1 ele é inativo, não some. Se sumisse, o
 *   botão com foco seria desmontado ao voltar ao passo 1 e o leitor de tela
 *   perderia o foco e releria o topo (anúncio duplo); e o botão amarelo mudaria
 *   de largura debaixo do dedo de quem conduz com o telefone apoiado (R3-2).
 * - O botão amarelo tem como nome acessível o texto visível ("Passo 4",
 *   "Concluir"), por causa da WCAG 2.5.3 (rótulo no nome): quem usa Controle por
 *   Voz (iOS) ou Voice Access (Android) diz "Toque em Passo 4". A função vem na
 *   dica, que é estável.
 *   Custo conhecido: com o foco parado nele, o nome muda a cada toque, e alguns
 *   leitores de tela releem o nome novo depois do anúncio do passo. O anúncio
 *   do passo continua sendo um só (AltarMode). VERIFICAÇÃO OBRIGATÓRIA em
 *   aparelho com VoiceOver, TalkBack, Controle por Voz e Voice Access.
 *   PROVISÓRIO (decisão do engenheiro, 2026-09-21: WCAG 2.5.3 prevalece sobre
 *   a possível releitura curta do nome).
 */
export function AltarFooter({
  index,
  total,
  onPrevious,
  onNext,
}: {
  /** Índice do passo corrente, a partir de 0. */
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const face = useFace();
  const isFirst = index === 0;
  const isLast = index >= total - 1;
  // PROVISÓRIO (LACUNAS P34, sem resposta do designer): o rótulo do último passo
  // não foi desenhado. Mantido o de hoje, "Concluir", que volta à intercessão.
  const nextLabel = isLast ? 'Concluir' : `Passo ${index + 2}`;
  const previousColor = isFirst ? ALTAR_PREVIOUS_INACTIVE : INK.text;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' }}>
      {/* PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P34 não desenha o
          "‹" do passo 1). Fica montado e inativo, com a mesma largura, para o
          foco e o botão amarelo não mudarem de lugar. */}
      <Pressable
        onPress={onPrevious}
        disabled={isFirst}
        accessibilityRole="button"
        accessibilityLabel="Passo anterior"
        accessibilityState={{ disabled: isFirst }}
        testID="altar-previous"
        style={({ pressed }) => [
          {
            minWidth: ALTAR_FOOTER_MIN,
            minHeight: ALTAR_FOOTER_MIN,
            borderRadius: radius.button,
            borderWidth: 2,
            borderColor: previousColor,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.md,
          },
          pressed && !isFirst && { opacity: 0.72 },
        ]}
      >
        <Text aria-hidden style={{ fontFamily: face(faces.sg700), fontSize: 28, lineHeight: 32, color: previousColor }}>
          ‹
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        accessibilityHint={isLast ? 'Sai do modo altar' : 'Vai para o próximo passo'}
        testID="altar-next"
        style={({ pressed }) => [
          {
            flex: 1,
            minHeight: ALTAR_FOOTER_MIN,
            borderRadius: radius.button,
            backgroundColor: INK.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.md,
            paddingHorizontal: 20,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        {/* onAccent #111111 sobre #FFD100: 12,92:1. */}
        <Text style={{ fontFamily: face(faces.sg700), fontSize: 17, lineHeight: 22, color: INK.onAccent, textAlign: 'center' }}>
          {nextLabel}
        </Text>
      </Pressable>
    </View>
  );
}
