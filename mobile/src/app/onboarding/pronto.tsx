import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { useJourney } from '@/journey/useJourney';
import { formatTime, SLOT_LABELS } from '@/reminders/reminders';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { Dove } from '@/ui/brand';
import { AppText, Button, Highlight, Screen } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { spacing, useGutter, useTheme } from '@/ui/theme';

const READING_LABEL: Record<string, string> = {
  in_app: 'Você vai ler aqui no app',
  own_bible: 'Você vai ler na sua Bíblia',
  both: 'Você vai alternar entre as duas',
};

/** 01e Tudo pronto. */
export default function ReadyScreen() {
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const { colors } = useTheme();
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

  const reminder = settings?.reminder;
  const confirmations = [
    settings?.readingMode ? READING_LABEL[settings.readingMode] : 'Você escolhe como ler a cada dia',
    settings?.fastingEnabled ? 'Seu jejum fica privado neste aparelho' : 'Sem propósito de jejum por enquanto',
    reminder && reminder.slot !== 'none'
      ? `Lembrete às ${formatTime(reminder.hour, reminder.minute)}`
      : SLOT_LABELS.none,
  ];

  const started = journey.phase !== 'before_start';

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingTop: spacing.xxl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: inset,
          gap: spacing.xl,
        }}
      >
        <Dove width={96} role="signature" />

        <View style={{ flex: 1, gap: spacing.lg }}>
          <AppText variant="display" accessibilityRole="header">
            Tudo pronto.
          </AppText>
          {started ? (
            <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 30 }}>
              Hoje é o <Highlight>Dia {journey.officialDay}</Highlight> de {journey.campaign.total_days}
            </AppText>
          ) : (
            <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 30 }}>
              A jornada da igreja começa em breve
            </AppText>
          )}

          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            {confirmations.map((line) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Icon name="check" size={18} color={colors.text} strokeWidth={2.4} />
                <AppText variant="item" style={{ flex: 1 }}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <Button
          title={started ? `Começar o Dia ${journey.officialDay}` : 'Ir para o Início'}
          onPress={start}
          testID="onboarding-finish"
        />
      </View>
    </Screen>
  );
}
