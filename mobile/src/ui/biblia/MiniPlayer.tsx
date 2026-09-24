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
 *   │ Gênesis 1                             1x │
 *   │           ⏮    ▶/⏸    ⏭                  │
 *   └──────────────────────────────────────────┘
 *
 * "1x" é a velocidade normal DESTE app (0,90 no motor), não 100% do motor: quem
 * nunca tocou no controle não pode passar a ouvir mais rápido sem ter pedido.
 * Tocar no rótulo abre quatro opções numa fileira, ali mesmo — sem modal.
 *
 * Nada aqui fala nem cancela nada: o player só desenha e avisa. Quem manda na
 * fala é `useOuvirCapitulo`.
 */

function Botao({
  icone,
  rotulo,
  onPress,
  desabilitado = false,
  grande = false,
  testID,
}: {
  icone: IconName;
  rotulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  grande?: boolean;
  testID: string;
}) {
  const { colors } = useTheme();
  const lado = grande ? 56 : MIN_TOUCH;
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
          backgroundColor: grande ? colors.text : 'transparent',
        },
        pressed && { opacity: 0.72 },
        desabilitado && { opacity: 0.35 },
      ]}
    >
      <Icon name={icone} size={grande ? 26 : 22} color={grande ? colors.background : colors.text} />
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
        paddingTop: spacing.sm,
        paddingBottom: Math.max(spacing.sm, recuoInferior),
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="rowLabel" numberOfLines={1} style={{ flex: 1 }} testID="mini-player-capitulo">
          {capitulo}
        </AppText>
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

      {/* Sem modal: quatro rótulos numa fileira, no próprio player. Um modal
          para trocar velocidade seria mais tela do que decisão. */}
      {abrindoVelocidade ? (
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}
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

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Botao
          icone="skip-back"
          rotulo="Capítulo anterior"
          onPress={onAnterior}
          desabilitado={!temAnterior}
          testID="mini-player-anterior"
        />
        <Botao
          icone={tocando ? 'pause' : 'play'}
          rotulo={tocando ? 'Pausar a leitura' : 'Ouvir o capítulo'}
          onPress={onTocarOuPausar}
          grande
          testID="mini-player-tocar"
        />
        <Botao
          icone="skip-forward"
          rotulo="Próximo capítulo"
          onPress={onProximo}
          desabilitado={!temProximo}
          testID="mini-player-proximo"
        />
      </View>
    </View>
  );
}
