import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { VELOCIDADES } from '@/reader/audio/ajustes';

import { AppText } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

/**
 * O player da leitura em voz alta. Uma faixa no rodapé, e nada mais.
 *
 * O que ele NÃO é, por decisão do fundador (23/09/2026): não é cartão grande,
 * não tem "Continuar a escutar", não tem seletor de voz, não tem barra de
 * progresso. O texto da Bíblia continua sendo o assunto da tela; o player é
 * uma faixa que se ignora enquanto se lê.
 *
 *   ┌──────────────────────────────────────────┐
 *   │  ⏮  ▶/⏸  ⏭                           1x  │
 *   └──────────────────────────────────────────┘
 *
 * UMA LINHA SÓ (feedback do fundador, 24/09/2026, vendo no celular dele). Antes
 * eram duas: o nome do capítulo em cima, os botões embaixo. No leitor do dia o
 * player fica ACIMA do rodapé, e as duas barras juntas comiam um terço da tela
 * de um celular — numa tela cujo assunto é o texto.
 *
 * O nome do capítulo SAIU daqui de propósito: a barra de topo das duas telas já
 * diz "Gênesis 1". Repetir custava uma linha inteira para não informar nada. Ele
 * continua no nome acessível da faixa e no botão de tocar, para quem não vê.
 *
 * "1x" é a velocidade normal DESTE app (0,90 no motor), não 100% do motor: quem
 * nunca tocou no controle não pode passar a ouvir mais rápido sem ter pedido.
 * Tocar no rótulo abre as opções numa fileira, ali mesmo — sem modal.
 *
 * Nada aqui fala nem cancela nada: o player só desenha e avisa. Quem manda na
 * fala é `useOuvirCapitulo`.
 */

function Botao({
  icone,
  rotulo,
  onPress,
  desabilitado = false,
  cheio = false,
  testID,
}: {
  icone: IconName;
  rotulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  /** O botão de tocar: mesmo tamanho dos outros, mas pintado. */
  cheio?: boolean;
  testID: string;
}) {
  const { colors } = useTheme();
  // Todos do mesmo tamanho, e o menor que o dedo alcança: numa faixa de uma
  // linha só, um botão de 56 obrigaria a faixa inteira a crescer com ele.
  const lado = MIN_TOUCH;
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      testID={testID}
      style={({ pressed }) => [
        {
          minWidth: lado,
          minHeight: lado,
          borderRadius: lado / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // O botão do meio é o único cheio: num player, "tocar" tem de ser
          // óbvio à distância de um relance.
          backgroundColor: cheio ? colors.text : 'transparent',
        },
        pressed && { opacity: 0.72 },
        desabilitado && { opacity: 0.35 },
      ]}
    >
      <Icon name={icone} size={cheio ? 22 : 20} color={cheio ? colors.background : colors.text} />
    </Pressable>
  );
}

export function MiniPlayer({
  capitulo,
  tocando,
  velocidade,
  onVelocidade,
  onTocarOuPausar,
  onAnterior,
  onProximo,
  temAnterior,
  temProximo,
  recuoInferior,
}: {
  /** "Gênesis 1" — o que está sendo lido, em texto, sempre visível. */
  capitulo: string;
  tocando: boolean;
  /** Rótulo da velocidade em uso, ex.: "1x". */
  velocidade: string;
  onVelocidade: (rotulo: string) => void;
  onTocarOuPausar: () => void;
  onAnterior: () => void;
  onProximo: () => void;
  temAnterior: boolean;
  temProximo: boolean;
  /**
   * Margem segura do aparelho, POR DENTRO da faixa. Tem de ser aqui, e não num
   * embrulho por fora: com o recuo do lado de fora, a faixa não alcança a borda
   * da tela e o texto do capítulo aparece por baixo dela (visto no rascunho em
   * 23/09/2026).
   */
  recuoInferior: number;
}) {
  const { colors } = useTheme();
  const [abrindoVelocidade, setAbrindoVelocidade] = useState(false);
  return (
    <View
      testID="mini-player"
      accessibilityRole="toolbar"
      accessibilityLabel={`Ouvindo ${capitulo}`}
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: 2,
        paddingBottom: Math.max(2, recuoInferior),
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      {/* Sem modal: os rótulos no próprio player. Um modal para trocar
          velocidade seria mais tela do que decisão.

          `flexWrap`: com seis opções, uma fileira só estoura a largura de um
          celular estreito. Envolver é melhor que cortar ou rolar de lado. */}
      {abrindoVelocidade ? (
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs }}
          testID="mini-player-velocidades"
        >
          {VELOCIDADES.map((v) => {
            const ativa = v.rotulo === velocidade;
            return (
              <Pressable
                key={v.rotulo}
                onPress={() => {
                  onVelocidade(v.rotulo);
                  setAbrindoVelocidade(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={`Velocidade ${v.rotulo}`}
                testID={`mini-player-velocidade-${v.rotulo}`}
                style={({ pressed }) => [
                  {
                    minHeight: MIN_TOUCH,
                    paddingHorizontal: spacing.md,
                    justifyContent: 'center',
                    borderRadius: 999,
                    backgroundColor: ativa ? colors.text : 'transparent',
                  },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <AppText variant="caption" style={{ color: ativa ? colors.background : colors.text }}>
                  {v.rotulo}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Botao
          icone="skip-back"
          // "Ouvir o..." e não só "Capítulo anterior": no leitor do dia o rodapé
          // ABAIXO deste player tem o seu próprio "Capítulo anterior", e dois
          // botões com o mesmo nome deixam quem usa leitor de tela sem saber em
          // qual está. O nome diz o que o botão faz AQUI: andar ouvindo.
          rotulo="Ouvir o capítulo anterior"
          onPress={onAnterior}
          desabilitado={!temAnterior}
          testID="mini-player-anterior"
        />
        <Botao
          icone={tocando ? 'pause' : 'play'}
          rotulo={tocando ? 'Pausar a leitura' : `Ouvir ${capitulo}`}
          onPress={onTocarOuPausar}
          cheio
          testID="mini-player-tocar"
        />
        <Botao
          icone="skip-forward"
          rotulo="Ouvir o próximo capítulo"
          onPress={onProximo}
          desabilitado={!temProximo}
          testID="mini-player-proximo"
        />

        {/* Empurra a velocidade para a borda oposta, sem um View a mais. */}
        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => setAbrindoVelocidade((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Velocidade da leitura: ${velocidade}. Tocar para mudar.`}
          accessibilityState={{ expanded: abrindoVelocidade }}
          testID="mini-player-velocidade"
          // Alvo de 44 mesmo o rótulo sendo pequeno.
          style={({ pressed }) => [
            { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: 'flex-end', justifyContent: 'center' },
            pressed && { opacity: 0.72 },
          ]}
        >
          <AppText variant="caption" style={{ color: abrindoVelocidade ? colors.text : colors.textMuted }}>
            {velocidade}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
