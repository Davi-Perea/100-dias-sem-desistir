import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { track } from '@/analytics/analytics';
import { getBibleProvider } from '@/reader/provider';
import {
  READER_FONT_MAX,
  READER_FONT_MIN,
  normalizeReaderFontSize,
  readLineHeight,
  stepReaderFontSize,
} from '@/reader/readerFontSize';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { AppText, Button, Cap, ChoiceRow, Rule, Screen, StateView } from '@/ui/components';
import { spacing, useReducedMotion, useTheme } from '@/ui/theme';
import { SubScreen } from '@/ui/voce/SubScreen';

/**
 * Os três rótulos exatos do F2 (onboarding/leitura.tsx), sem descrição: a antiga
 * prometia texto na "tela de hoje" (que não existe e, com o Gate 1 aberto, não
 * mostra texto) e uma marcação cujo lugar ainda é a pergunta 2 ao designer.
 * "Seguir o guia no app" pelo mesmo motivo (2026-09-21): o leitor é um guia.
 */
const MODES: { mode: ReadingMode; label: string }[] = [
  { mode: 'in_app', label: 'Seguir o guia no app' },
  { mode: 'own_bible', label: 'Usar a minha Bíblia' },
  { mode: 'both', label: 'Vou alternar' },
];

/**
 * Tamanho da letra e modo de leitura (D1 → aqui).
 *
 * PROVISÓRIO (pergunta 12 ao designer): tela não desenhada. O título segue o
 * nome da linha de D1 que abriu a tela: "Tamanho da letra" põe o tamanho em
 * primeiro; "Leitura" (`?secao=leitura`) põe "Como eu leio" em primeiro e
 * como título. O modo de leitura continua aqui (pergunta 11).
 *
 * Sem opção de estatísticas de uso: o app não tem SDK de análise e não envia
 * nada (decisão D-4, 2026-09-21). A preferência antiga do settings só alimenta
 * o buffer em memória do painel DEV; nada sai do aparelho.
 *
 * Gate 1 aberto (2026-09-21): sem tradução licenciada o leitor é um guia e
 * nenhuma tela usa o tamanho do texto de leitura. A seção de tamanho só
 * aparece com texto licenciado (mesma regra hasLicensedText do leitor, que
 * pelo mesmo motivo esconde o "Aa"): um controle sem efeito é 2.1/2.3. Com o
 * guia, a tela é "Como eu leio" (modos + "Do seu aparelho").
 *
 * O tamanho segue a MESMA escala do B3 (padrão 19; 14 · 15 · 17 … 29 · 30;
 * entrelinha 1,7×), de `@/reader/readerFontSize`: uma tela não pode mostrar
 * um valor que a outra não alcança (LACUNAS C47).
 */
export default function AppearanceScreen() {
  const { colors, isDark } = useTheme();
  const settings = useSettings();
  const reducedMotion = useReducedMotion();
  const { secao } = useLocalSearchParams<{ secao?: string }>();
  const hasLicensedText = !getBibleProvider().getMetadata().isDevPlaceholder;
  // Sem texto licenciado não há seção de tamanho: a tela é só "Como eu leio".
  const readingFirst = secao === 'leitura' || !hasLicensedText;

  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const fontSize = normalizeReaderFontSize(settings.readerFontSize);
  // PER-02: se o disco recusar, o store não muda e a régua fica no tamanho salvo.
  const changeFont = (direction: 1 | -1) =>
    updateSettings((s) => ({ ...s, readerFontSize: stepReaderFontSize(s.readerFontSize, direction) })).catch(() => undefined);

  const fontSection = (
    <View style={{ gap: spacing.md }}>
      <Cap>Tamanho do texto de leitura</Cap>
      {/* Amostra escrita pelo app — nunca texto de tradução bíblica. Entrelinha 1,7×. */}
      <AppText
        variant="read"
        style={{ fontSize, lineHeight: readLineHeight(fontSize), color: colors.text }}
        testID="font-sample"
      >
        Exemplo do tamanho atual do texto de leitura.
      </AppText>
      {/* Quebra em duas linhas quando a fonte do sistema não deixa os dois lado a lado. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <Button
          title="Diminuir"
          variant="outline"
          disabled={fontSize <= READER_FONT_MIN}
          onPress={() => changeFont(-1)}
          style={{ flexGrow: 1, flexBasis: 140 }}
          testID="font-smaller"
        />
        <Button
          title="Aumentar"
          variant="outline"
          disabled={fontSize >= READER_FONT_MAX}
          onPress={() => changeFont(1)}
          style={{ flexGrow: 1, flexBasis: 140 }}
          testID="font-bigger"
        />
      </View>
      <AppText variant="caption">
        O texto também cresce com o tamanho de letra do seu celular, até o máximo que o sistema permite.
      </AppText>
    </View>
  );

  const modeSection = (
    <View style={{ gap: spacing.md }}>
      {/* Aberta por "Leitura", o título já diz "Como eu leio": sem cabeçalho repetido. */}
      {readingFirst ? null : <Cap>Como eu leio</Cap>}
      {MODES.map((option) => (
        <ChoiceRow
          key={option.mode}
          label={option.label}
          selected={settings.readingMode === option.mode}
          onPress={() => {
            track({ name: 'reading_mode_selected', mode: option.mode });
            updateSettings((s) => ({ ...s, readingMode: option.mode })).catch(() => undefined);
          }}
          testID={`mode-${option.mode}`}
        />
      ))}
    </View>
  );

  return (
    <SubScreen title={readingFirst ? 'Como eu leio' : 'Tamanho da letra'}>
      {readingFirst ? modeSection : fontSection}

      {hasLicensedText ? (
        <>
          <Rule />
          {readingFirst ? fontSection : modeSection}
        </>
      ) : null}

      <Rule />

      <View style={{ gap: spacing.sm }}>
        <Cap>Do seu aparelho</Cap>
        <AppText variant="caption">
          Tema {isDark ? 'escuro' : 'claro'}, seguindo o sistema. Reduzir movimento{' '}
          {reducedMotion ? 'está ligado: as animações estão desligadas.' : 'está desligado.'}
        </AppText>
      </View>
    </SubScreen>
  );
}
