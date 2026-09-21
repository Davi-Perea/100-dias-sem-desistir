import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dove } from '@/ui/brand';
import { AppText, Button, Highlight, Screen } from '@/ui/components';
import { fonts, spacing, useGutter, useTheme } from '@/ui/theme';

/** 01a Boas-vindas. */
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: inset, paddingTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Dove width={34} role="signature" />
          <AppText style={{ fontFamily: fonts.label, fontSize: 15, color: colors.text }}>Lagoinha</AppText>
        </View>

        {/* Em fonte grande o título de 56px e o parágrafo não cabem na coluna;
            sem rolagem, era o TEXTO que sumia. Mesmo padrão de OnboardingStep. */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="display" accessibilityRole="header">
            <Highlight>100 dias.</Highlight>
            {'\n'}Uma igreja.{'\n'}Uma jornada.
          </AppText>
          <AppText variant="body">
            A igreja inteira lê a mesma coisa, no mesmo dia. Você acompanha o seu ritmo sem competir com
            ninguém, e o que você escreve é só seu.
          </AppText>
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + 44 }}>
          <Button
            title="Começar"
            onPress={() => router.push('/onboarding/leitura')}
            testID="onboarding-start"
          />
          <Button title="Já tenho conta" variant="underline" onPress={() => router.push('/conta')} />
        </View>
      </View>
    </Screen>
  );
}
