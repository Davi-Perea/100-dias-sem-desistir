import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { useJourney } from '@/journey/useJourney';
import { AppText, Button, DevContentBanner, Screen } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const journey = useJourney();

  useEffect(() => {
    track({ name: 'onboarding_started' });
  }, []);

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.xl,
          justifyContent: 'space-between',
          gap: spacing.xl,
        }}>
        <View style={{ gap: spacing.lg, flex: 1, justifyContent: 'center' }}>
          {journey.isDevContent ? <DevContentBanner compact /> : null}
          <AppText variant="eyebrow">Jornada da igreja</AppText>
          <AppText variant="display" style={{ fontSize: 40, lineHeight: 46 }}>
            100 dias.{'\n'}Uma igreja.{'\n'}Uma jornada.
          </AppText>
          <AppText variant="secondary" style={{ fontSize: 17, lineHeight: 25 }}>
            Leia, acompanhe seu progresso e caminhe junto com sua comunidade.
          </AppText>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <AppText variant="muted">
            Leia aqui ou na Bíblia que você já ama. Nós organizamos a jornada.
          </AppText>
        </View>

        <Button title="Começar" size="lg" onPress={() => router.push('/onboarding/leitura')} testID="onboarding-start" />
      </View>
    </Screen>
  );
}
