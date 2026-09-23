import { Pressable, View } from 'react-native';

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
 * A velocidade aparece como rótulo fixo ("1x" = a velocidade de leitura que
 * escolhemos, não 100% do motor) e ainda NÃO é ajustável: mais um controle sem
 * necessidade provada é mais uma coisa para a pessoa entender. Fica preparado
 * para virar botão no dia em que alguém pedir.
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
  /** Rótulo da velocidade, ex.: "1x". Só informativo nesta versão. */
  velocidade: string;
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
        <AppText variant="caption" style={{ color: colors.textMuted }} testID="mini-player-velocidade">
          {velocidade}
        </AppText>
      </View>

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
