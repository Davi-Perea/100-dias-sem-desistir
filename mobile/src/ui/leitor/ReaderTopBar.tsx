import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, useFace } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { BRAND_YELLOW, MIN_TOUCH, faces, glass, radius, spacing, useTheme } from '@/ui/theme';

/**
 * Barra de topo de vidro do leitor (B1): "✕" · título e posição · "Aa", e o
 * filete de progresso de 3px embaixo.
 *
 * Vidro: `rgba(255,255,255,0.92)` / `rgba(17,17,17,0.9)` com desfoque (TOKENS
 * §2). O texto rola por baixo dela, por isso ela é absoluta e devolve a altura
 * medida para a rolagem. No Android o desfoque não é imitado com opacidade
 * chapada: a barra é sólida em `surface` com elevação 8, como o TOKENS §2
 * ("Camada de vidro") manda quando o desfoque sai caro.
 */
export function ReaderTopBar({
  topInset,
  title,
  dayNumber,
  chapterIndex,
  chapterCount,
  done = false,
  onClose,
  onTextSize,
  onHeight,
}: {
  topInset: number;
  /** "Josué 9" */
  title: string;
  dayNumber: number;
  /** Base zero. */
  chapterIndex: number;
  chapterCount: number;
  /** Dia já concluído: o filete fica cheio. */
  done?: boolean;
  onClose: () => void;
  onTextSize: () => void;
  onHeight: (height: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const face = useFace();
  const useGlass = Platform.OS === 'ios';
  const position = chapterIndex + 1;
  // R1-8: "fração de capítulos LIDOS" (TELAS B1) — os anteriores ao atual; o
  // dia concluído enche o filete. No capítulo 1 de um dia aberto, é zero.
  const read = done ? chapterCount : chapterIndex;
  const progress = chapterCount > 0 ? read / chapterCount : 0;

  return (
    <View
      testID="reader-top-bar"
      onLayout={(event) => onHeight(Math.round(event.nativeEvent.layout.height))}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        paddingTop: topInset,
        backgroundColor: useGlass ? 'transparent' : colors.surface,
        elevation: useGlass ? 0 : 8,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? glass.hairlineDark : glass.hairline,
      }}
    >
      {useGlass ? (
        <BlurView
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? glass.readerDark : glass.reader }]}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar leitura"
          testID="reader-back"
          style={({ pressed }) => [
            { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
            pressed && { opacity: 0.72 },
          ]}
        >
          {/* "✕" do desenho como ícone de traço: não cresce com a fonte, então o
              alvo de 48×48 nunca é atravessado. */}
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.xs }}>
          <AppText
            accessibilityRole="header"
            style={{ fontFamily: faces.sg700, fontSize: 16, lineHeight: 20, color: colors.text, textAlign: 'center' }}
            testID="reader-title"
          >
            {title}
          </AppText>
          <AppText
            // O "·" não é lido: o leitor de tela ouve a frase inteira.
            accessibilityLabel={`Dia ${dayNumber}, capítulo ${position} de ${chapterCount}`}
            style={{ fontFamily: faces.sg500, fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: 'center' }}
          >
            {`Dia ${dayNumber} · capítulo ${position} de ${chapterCount}`}
          </AppText>
        </View>

        <Pressable
          onPress={onTextSize}
          accessibilityRole="button"
          accessibilityLabel="Tamanho do texto"
          testID="reader-text-size"
          style={({ pressed }) => [
            {
              minWidth: MIN_TOUCH,
              minHeight: MIN_TOUCH,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: colors.controlBorder,
              // Raio não especificado no TELAS; o `sm` da escala.
              borderRadius: radius.sm,
            },
            pressed && { opacity: 0.72 },
          ]}
        >
          {/* "Aa" cresce com a fonte do sistema (REGRAS 25), com teto de 1,6×:
              16 → 25,6, que ainda cabe na caixa de minWidth/minHeight 48 sem
              atravessá-la. PROVISÓRIO (decisão do engenheiro, 2026-09-21: o
              teto responde à LACUNAS C52 até o designer dizer se o "Aa" é ícone
              ou texto). O nome falado vem do rótulo acessível do botão.
              PROVISÓRIO (LACUNAS P1): sem tradução licenciada nada na página usa
              o tamanho escolhido — só a amostra da folha muda. Esconder o "Aa"
              enquanto não houver texto é decisão de produto, levada ao dono. */}
          <Text
            maxFontSizeMultiplier={1.6}
            aria-hidden
            style={{ fontFamily: face(faces.sg700), fontSize: 16, lineHeight: 20, color: colors.text }}
          >
            Aa
          </Text>
        </Pressable>
      </View>

      {/* Filete de 3px: trilha surfaceSunken, preenchimento amarelo na fração
          lida. Nunca é o único sinal — a posição vai escrita logo acima, e é por
          isso que o filete fica fora do leitor de tela (R1-10): senão a posição
          seria anunciada duas vezes seguidas. */}
      <View
        style={{ height: 3, backgroundColor: colors.surfaceSunken }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        testID="reader-progress"
      >
        <View style={{ width: `${progress * 100}%`, height: 3, backgroundColor: BRAND_YELLOW }} />
      </View>
    </View>
  );
}
