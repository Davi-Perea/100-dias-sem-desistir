import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, Screen } from '@/ui/components';
import { TermsBody } from '@/ui/comunidade/publicar/partes';
import { aceiteDocument, rulesDocument } from '@/ui/comunidade/publicar/textos';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Regras do Juntos, para LER. É esta a tela que o link "regras do Juntos" abre,
 * na linha embaixo do botão de publicar e do enviar comentário.
 *
 * Aceitar não é mais uma tela (decisão do fundador, 2026-09-22): o toque em
 * Publicar registra o aceite. Como o que é registrado são DOIS textos — as regras
 * (Google Play) e o consentimento destacado da LGPD art. 11, I —, os dois estão
 * aqui, um a seguir do outro, e são exatamente os textos cujo sha256 vai ao
 * servidor (`rulesDocument` e `aceiteDocument`). Sem isto, a pessoa aceitaria um
 * texto que não teria onde ler.
 *
 * Nada é aceito nem enviado por esta tela, e ela funciona sem a Comunidade ligada:
 * é só leitura. O parâmetro `ler=1` dos links antigos é aceito e ignorado.
 */
export default function RulesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const [docs] = useState(() => ({ rules: rulesDocument(), consent: aceiteDocument() }));

  return (
    <Screen>
      <View style={{ paddingHorizontal: inset - spacing.sm }}>
        <BackBar label="Voltar" />
      </View>
      <ScrollView
        testID="rules-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: inset,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.xl,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + inset * 2,
          alignSelf: 'center',
        }}
      >
        <AppText variant="blockTitleLg" accessibilityRole="header" testID="rules-title">
          {docs.rules.title}
        </AppText>
        <TermsBody doc={docs.rules} colors={colors} marker={colors.text} />

        {/* O consentimento destacado, num bloco próprio (LGPD art. 11, I). */}
        <View style={{ gap: spacing.md }} testID="rules-consent">
          <AppText variant="blockTitleLg" accessibilityRole="header" testID="rules-consent-title">
            {docs.consent.title}
          </AppText>
          <Block tone="warm" testID="rules-consent-block">
            <TermsBody doc={docs.consent} colors={colors} marker={colors.text} />
          </Block>
        </View>

        <View style={{ paddingTop: spacing.md }}>
          <Button title="Voltar" variant="outline" onPress={goBackOrHome} testID="rules-back" />
        </View>
      </ScrollView>
    </Screen>
  );
}
