import { useState } from 'react';
import { Text, type TextStyle, View } from 'react-native';

import { useFace } from '@/ui/components';
import { faces } from '@/ui/theme';

/**
 * Mede a largura NATURAL, em uma linha, do mais largo de alguns rótulos — já com
 * o tamanho de letra do sistema e o "Texto em Negrito" aplicados, porque o texto
 * medido é um `<Text>` de verdade com a mesma face do botão.
 *
 * Existe para os limiares de B2 e B3 serem MEDIDOS e não constantes (REGRAS 26):
 * "empilha quando a largura disponível não couber o rótulo em uma linha". Uma
 * constante de escala (~2,9×) erraria em tablet, em telefone estreito e com
 * negrito do sistema; a medida acerta nos três.
 *
 * O container é invisível, fora do fluxo e escondido do leitor de tela. A
 * largura enorme do embrulho é só para o texto nunca quebrar enquanto é medido.
 *
 * O embrulho de 0×0 com `overflow: hidden` por fora NÃO é enfeite (achado no
 * teste com usuário real em Android, 23/09/2026). Na web, os 100.000px eram
 * largura de rolagem do DOCUMENTO: `document.scrollWidth` ia a 100.026px numa
 * tela de 412px. O Chrome do Android trata um documento mais largo que a janela
 * como área que se arrasta de lado, e o gesto de rolar para baixo passa a
 * disputar com o de arrastar para o lado — era isso que deixava a leitura da
 * Bíblia "difícil de rolar". Um elemento com `overflow: hidden` não empurra a
 * rolagem de quem está acima dele, e o filho continua sendo medido normalmente:
 * recortar muda só o que transborda, nunca o cálculo de layout.
 */

/** Rótulo de botão cheio (TOKENS §5): Schibsted 700 17/22. */
export const ACTION_LABEL: TextStyle = { fontFamily: faces.sg700, fontSize: 17, lineHeight: 22 };

export function LabelProbe({
  labels,
  style = ACTION_LABEL,
  onWidth,
  testID,
}: {
  labels: readonly string[];
  style?: TextStyle;
  onWidth: (width: number) => void;
  testID?: string;
}) {
  const face = useFace();
  const final = style.fontFamily ? { ...style, fontFamily: face(style.fontFamily) } : style;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Recorte: a régua de 100.000px existe para o texto não quebrar, e para
      // por aqui. Nada dela pode virar área de rolagem da página.
      style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden' }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, width: 100000, opacity: 0, flexDirection: 'row' }}>
        <View
          style={{ alignItems: 'flex-start' }}
          testID={testID}
          onLayout={(event) => onWidth(Math.ceil(event.nativeEvent.layout.width))}
        >
          {labels.map((label) => (
            <Text key={label} numberOfLines={1} style={final}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Estado dos dois lados da comparação: a largura do rótulo e a largura em que ele
 * precisa caber. Enquanto qualquer um não foi medido (primeiro quadro, testes),
 * responde "cabe" — o layout do desenho é o ponto de partida.
 */
export function useOneLineFit() {
  const [labelWidth, setLabelWidth] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  return {
    setLabelWidth,
    setBoxWidth,
    boxWidth,
    /** `room` = quanto sobra para o rótulo depois de descontar o que não é texto. */
    fits: (room: (box: number) => number) => labelWidth === 0 || boxWidth === 0 || labelWidth <= room(boxWidth),
  };
}
