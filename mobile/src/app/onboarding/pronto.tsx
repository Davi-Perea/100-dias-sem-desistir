import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { useJourney } from '@/journey/useJourney';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Button, Screen } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function ReadyScreen() {
  const insets = useSafeAreaInsets();
  const journey = useJourney();
  const settings = useSettings();

  const start = async () => {
    if (settings) {
      track({
        name: 'onboarding_completed',
        readingMode: settings.readingMode ?? 'unset',
        fasting: settings.fastingEnabled,
        reminder: settings.reminder.slot,
      });
    }
    await updateSettings((s) => ({ ...s, onboardingCompleted: true }));
    router.replace('/');
  };

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
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
          <AppText variant="eyebrow">Tudo pronto</AppText>
          <AppText variant="display" style={{ fontSize: 38, lineHeight: 44 }}>
            Hoje é o Dia {journey.officialDay} de {journey.campaign.total_days}.
          </AppText>
          <AppText variant="secondary" style={{ fontSize: 17 }}>
            {journey.officialDay > 1
              ? 'A igreja já começou, e você entra exatamente onde ela está. Os dias anteriores continuam disponíveis, sem pressa.'
              : 'Sua jornada começa agora. Um dia de cada vez.'}
          </AppText>
        </View>

        <Button title="Começar o dia" size="lg" onPress={start} testID="onboarding-finish" />
      </View>
    </Screen>
  );
}
