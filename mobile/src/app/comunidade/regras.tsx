import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Button, Screen } from '@/ui/components';
import { flowParams, parseDay, ROUTES, safeNext } from '@/ui/comunidade/publicar/fluxo';
import { TermsBody } from '@/ui/comunidade/publicar/partes';
import { rulesDocument } from '@/ui/comunidade/publicar/textos';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Regras do Juntos, completas, para LER (pelo link da tela de aceite, de
 * publicar e do feed).
 *
 * Aceitar não é mais aqui: desde 2026-09-22 o aceite das regras está na tela
 * única de aceite (`consentimento.tsx`), junto com o 16+ e o consentimento.
 * Quem chega sem `ler=1` (um link antigo, o "consentHref" das regras) é levado
 * para lá com os mesmos parâmetros.
 */
export default function RulesScreen() {
  const params = useLocalSearchParams<{ next?: string; day?: string; ler?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const [doc] = useState(() => rulesDocument());

  if (params.ler !== '1') {
    return (
      <Redirect
        href={{ pathname: ROUTES.consentimento, params: flowParams(safeNext(params.next), parseDay(params.day)) } as never}
      />
    );
  }

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
          {doc.title}
        </AppText>
        <TermsBody doc={doc} colors={colors} marker={colors.text} />
        <View style={{ paddingTop: spacing.md }}>
          <Button title="Voltar" variant="outline" onPress={goBackOrHome} testID="rules-back" />
        </View>
      </ScrollView>
    </Screen>
  );
}
