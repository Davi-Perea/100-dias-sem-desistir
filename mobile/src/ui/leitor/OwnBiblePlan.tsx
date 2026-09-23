import { View } from 'react-native';

import { AppText, Button, Cap, SaveErrorNotice } from '@/ui/components';
import { speakList } from '@/ui/jornada/a11y';
import { BRAND_YELLOW, spacing, useTheme } from '@/ui/theme';

/**
 * B1 · Leitura na própria Bíblia — a tela enxuta.
 *
 * Pedido do fundador (2026-09-22): quem escolheu "Vou ler na minha Bíblia" não
 * quer o app passando capítulo por capítulo. Quer saber O QUE ler hoje e ter
 * onde dizer que leu. Então: a referência do dia GRANDE, a lista dos capítulos
 * daquele dia e "Concluir leitura". Nada de texto bíblico, nada de "Aa" (não há
 * texto na página para aumentar), nada de "próximo capítulo".
 *
 * O sublinhado "Ler aqui no app" devolve o leitor com texto — e só aparece
 * quando existe tradução licenciada empacotada; sem ela o app não tem texto para
 * oferecer e o convite seria falso.
 *
 * Invariante P-09: a conclusão continua sendo um gesto explícito. Abrir esta
 * tela não conclui dia nenhum.
 */
export function OwnBiblePlan({
  reference,
  detail,
  chapters,
  done,
  completable,
  busy,
  saveFailed = false,
  futureNote,
  onComplete,
  onBack,
  onReadInApp,
}: {
  /** "Gênesis 1–12" — as referências do dia, como a Jornada as escreve. */
  reference: string;
  /** "12 capítulos · ~36 min"; o "~" é do app, nunca da igreja. */
  detail: string | null;
  /** "Gênesis 1", "Gênesis 2", … na ordem da leitura. */
  chapters: string[];
  done: boolean;
  /** Dia que já chegou: só ele pode ser concluído (J6). */
  completable: boolean;
  busy: boolean;
  /** A última gravação falhou (PER-02): nada mudou no disco. */
  saveFailed?: boolean;
  /** Frase do dia futuro: a partir de quando ele pode ser concluído. */
  futureNote?: string;
  onComplete: () => void;
  onBack: () => void;
  /** Ausente sem tradução licenciada: não há texto no app para oferecer. */
  onReadInApp?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View testID="own-bible-plan" style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Cap>Leitura deste dia</Cap>
        {/* `display` (38/40), como no guia: cabe em uma linha de 375 pt com a
            calha de 26 e, em fonte grande, quebra como qualquer título — sem
            teto de escala. O "·" entre duas referências não é falado (REGRAS 32). */}
        <AppText
          variant="display"
          accessibilityRole="header"
          accessibilityLabel={speakList(reference)}
          testID="own-bible-reference"
        >
          {reference}
        </AppText>
        {detail ? (
          <AppText variant="caption" testID="own-bible-detail">
            {detail}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: spacing.xs }}>
        <Cap>Capítulos</Cap>
        <View accessibilityRole="list" style={{ gap: spacing.xs }} testID="own-bible-chapters">
          {chapters.map((label, index) => (
            <View
              key={`${index}-${label}`}
              accessibilityRole="text"
              // Piso por minHeight + paddingVertical: a linha cresce com a fonte
              // do sistema, nunca corta. Não é alvo de toque (não abre nada).
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 32,
                paddingVertical: spacing.xs,
              }}
            >
              {/* Marcador amarelo de 6px: decorativo, quem informa é o texto. */}
              <View aria-hidden style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_YELLOW }} />
              <AppText variant="item" style={{ flex: 1, color: colors.text }}>
                {label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        {futureNote ? (
          <AppText variant="caption" testID="own-bible-future-note">
            {futureNote}
          </AppText>
        ) : null}
        {saveFailed ? <SaveErrorNotice testID="own-bible-save-error" /> : null}

        {done ? (
          <>
            <AppText variant="captionStrong" testID="own-bible-done">
              Leitura concluída.
            </AppText>
            <Button title="Voltar" variant="outline" onPress={onBack} testID="reader-complete" />
          </>
        ) : completable ? (
          <Button
            title="Concluir leitura"
            icon="check"
            onPress={onComplete}
            loading={busy}
            testID="reader-complete"
          />
        ) : (
          <Button title="Voltar" variant="outline" onPress={onBack} testID="reader-complete" />
        )}

        {onReadInApp ? (
          <Button
            title="Ler aqui no app"
            variant="underline"
            onPress={onReadInApp}
            disabled={busy}
            testID="own-bible-read-in-app"
          />
        ) : null}
      </View>
    </View>
  );
}
