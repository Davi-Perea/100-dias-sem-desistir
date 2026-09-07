import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { fastingKeptCount, useFasting } from '@/fasting/fastingStore';
import { useJourney } from '@/journey/useJourney';
import { reflectionCount, useReflections } from '@/reflections/reflectionsStore';
import { formatTime, SLOT_LABELS } from '@/reminders/reminders';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import {
  AppText,
  Button,
  Card,
  ChoiceRow,
  Divider,
  Screen,
  ScreenScroll,
  SettingRow,
  StateView,
} from '@/ui/components';
import { iconSize, spacing, useTheme } from '@/ui/theme';

const READING_MODE_LABELS = {
  in_app: 'Ler aqui no app',
  own_bible: 'Usar minha Bíblia',
  both: 'Vou alternar',
} as const;

export default function YouScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const journey = useJourney();
  const fasting = useFasting(journey.campaign.id);
  const reflections = useReflections(journey.campaign.id);

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const reminderLabel =
    settings.reminder.slot === 'none'
      ? 'Sem lembrete'
      : `${SLOT_LABELS[settings.reminder.slot]} · ${formatTime(settings.reminder.hour, settings.reminder.minute)}`;

  return (
    <Screen>
      <ScreenScroll>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="eyebrow">Sua jornada</AppText>
          <AppText variant="title">
            {journey.completedCount} de {journey.campaign.total_days} dias concluídos
          </AppText>
          {journey.reached.length > 0 ? (
            <AppText variant="secondary">
              Marcos alcançados: {journey.reached.map((m) => m.label).join(', ')}.
            </AppText>
          ) : (
            <AppText variant="secondary">Seu primeiro marco é o dia 7.</AppText>
          )}
        </View>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Jornada e propósito</AppText>
            <SettingRow
              title="Participar do propósito de jejum"
              subtitle="Registro privado, só neste aparelho"
              value={settings.fastingEnabled}
              onValueChange={(v) => updateSettings((s) => ({ ...s, fastingEnabled: v }))}
              testID="fasting-setting"
            />
            {settings.fastingEnabled ? (
              <AppText variant="muted">
                {fastingKeptCount(fasting)} {fastingKeptCount(fasting) === 1 ? 'dia registrado' : 'dias registrados'}.
              </AppText>
            ) : null}
            <Divider />
            <AppText variant="muted">
              {reflectionCount(reflections) === 1
                ? '1 reflexão privada guardada neste aparelho.'
                : `${reflectionCount(reflections)} reflexões privadas guardadas neste aparelho.`}
            </AppText>
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Como você lê</AppText>
            {(Object.keys(READING_MODE_LABELS) as (keyof typeof READING_MODE_LABELS)[]).map((mode) => (
              <ChoiceRow
                key={mode}
                title={READING_MODE_LABELS[mode]}
                selected={settings.readingMode === mode}
                onPress={() => updateSettings((s) => ({ ...s, readingMode: mode }))}
                testID={`reading-mode-${mode}`}
              />
            ))}
            <AppText variant="muted">
              Isso muda apenas o destaque dos botões no Hoje. As duas formas continuam disponíveis.
            </AppText>
          </View>
        </Card>

        <Card onPress={() => router.push('/lembrete')} accessibilityLabel={`Lembrete de leitura: ${reminderLabel}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="notifications-outline" size={iconSize.md} color={colors.textSecondary} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontWeight: '600' }}>Lembrete de leitura</AppText>
              <AppText variant="muted">{reminderLabel}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Privacidade</AppText>
            <SettingRow
              title="Enviar dados de uso anônimos"
              subtitle="Desligado por padrão. Nunca inclui reflexões, jejum ou textos."
              value={settings.analyticsEnabled}
              onValueChange={(v) => updateSettings((s) => ({ ...s, analyticsEnabled: v }))}
              testID="analytics-setting"
            />
            <AppText variant="muted">
              Reflexões, jejum e progresso ficam neste aparelho. Nada é enviado para servidores nesta versão.
            </AppText>
          </View>
        </Card>

        <Button title="Painel de desenvolvimento" variant="quiet" onPress={() => router.push('/dev')} />
      </ScreenScroll>
    </Screen>
  );
}
