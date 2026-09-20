import { Stack } from 'expo-router';
import { View } from 'react-native';

import { fastingKeptCount, fastingKeptDays, useFasting } from '@/fasting/fastingStore';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Cap, Checkbox, Rule, Screen, ScreenScroll, SettingRow, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';

/**
 * Meu jejum. Registro privado, guardado só neste aparelho.
 *
 * O app nunca pergunta do que a pessoa jejua, por quanto tempo ou por quê. Só
 * existe a marcação de ter cumprido o próprio propósito no dia.
 */
export default function FastingScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const fasting = useFasting(journey.campaign.id);

  if (!settings || !fasting) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const days = fastingKeptDays(fasting);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Meu jejum' }} />
      <ScreenScroll gap={spacing.lg}>
        <Cap>Meu jejum · só você vê</Cap>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="item">Participar do propósito de jejum</AppText>
            <AppText variant="caption">
              Não perguntamos do que você jejua. O registro fica neste aparelho.
            </AppText>
          </View>
          <Checkbox
            checked={settings.fastingEnabled}
            onToggle={() => updateSettings((s) => ({ ...s, fastingEnabled: !s.fastingEnabled }))}
            label="Participar do propósito de jejum"
            testID="fasting-enabled"
          />
        </View>

        <Rule />

        <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 28 }}>
          {fastingKeptCount(fasting)} {fastingKeptCount(fasting) === 1 ? 'dia cumprido' : 'dias cumpridos'}
        </AppText>

        {days.length === 0 ? (
          <AppText variant="secondary">Nada registrado ainda.</AppText>
        ) : (
          <View>
            {days.map((day, index) => (
              <SettingRow
                key={day}
                label={`Dia ${day}`}
                value={formatDayDate(day, journey.campaign)}
                first={index === 0}
              />
            ))}
          </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}
