import { Text, View } from 'react-native';

import type { Verse } from '@/reader/provider';
import { readLineHeight } from '@/reader/readerFontSize';
import { useFace } from '@/ui/components';
import { faces, spacing, useTheme } from '@/ui/theme';

/**
 * Corpo de um capítulo: um parágrafo por versículo, com o número que o PROVEDOR
 * fornecer (o app nunca inventa estrutura de versículos — REGRAS 1.5).
 *
 * É a mesma composição do leitor do dia (`app/reader/[day].tsx`, modo TEXTO):
 * Source Serif 400 no tamanho escolhido em "Aa", entrelinha 1,7× e o numeral em
 * 12/19 do tamanho, em `textMuted` (6,90:1 no claro, 7,42:1 no escuro).
 *
 * Sem `maxFontSizeMultiplier`: o texto cresce com a fonte do sistema sem teto,
 * que é o que a folha B3 promete ("até o máximo que o sistema permite").
 */
export function ChapterText({
  verses,
  fontSize,
  heading,
}: {
  verses: readonly Verse[];
  fontSize: number;
  /** Título que a tradução põe antes do versículo 1 (ex.: título do salmo); não é versículo. */
  heading?: string | null;
}) {
  const { colors } = useTheme();
  const face = useFace();
  return (
    <View style={{ gap: spacing.lg }} testID="chapter-text">
      {heading ? (
        // Itálico em `textSecondary` (10,85:1 no claro, 10,84:1 no escuro), do tamanho do texto.
        <Text
          testID="chapter-heading"
          style={{
            fontFamily: face(faces.ss400i),
            fontSize,
            lineHeight: readLineHeight(fontSize),
            color: colors.textSecondary,
          }}
        >
          {heading}
        </Text>
      ) : null}
      {verses.map((verse) => (
        <Text
          key={verse.verse}
          accessibilityLabel={`Versículo ${verse.verse}. ${verse.text}`}
          testID={`verse-${verse.verse}`}
          style={{
            fontFamily: face(faces.ss400),
            fontSize,
            lineHeight: readLineHeight(fontSize),
            color: colors.text,
          }}
        >
          <Text style={{ fontSize: Math.round((12 * fontSize) / 19), color: colors.textMuted }}>
            {verse.verse}{' '}
          </Text>
          {verse.text}
        </Text>
      ))}
    </View>
  );
}
