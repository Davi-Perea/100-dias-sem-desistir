import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { track } from '@/analytics/analytics';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import {
  AppText,
  Button,
  Cap,
  Checkbox,
  ChoiceRow,
  Rule,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { fonts, spacing, useReducedMotion, useTheme } from '@/ui/theme';

const MIN_FONT = 14;
const MAX_FONT = 30;

const MODES: { mode: ReadingMode; label: string; description: string }[] = [
  { mode: 'in_app', label: 'Ler aqui no app', description: 'O texto aparece direto na tela de hoje' },
  { mode: 'own_bible', label: 'Usar minha Bíblia', description: 'Você lê onde preferir e marca o dia' },
  { mode: 'both', label: 'Vou alternar', description: 'Depende do dia' },
];

/** Aparência e acessibilidade: leitura, tamanho do texto e uso de dados. */
export default function AppearanceScreen() {
  const { colors, isDark } = useTheme();
  const settings = useSettings();
  const reducedMotion = useReducedMotion();

  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const fontSize = settings.readerFontSize;
  const changeFont = (delta: number) =>
    updateSettings((s) => ({
      ...s,
      readerFontSize: Math.max(MIN_FONT, Math.min(MAX_FONT, s.readerFontSize + delta)),
    }));

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Aparência e acessibilidade' }} />
      <ScreenScroll gap={spacing.xl}>
        <View style={{ gap: spacing.md }}>
          <Cap>Como eu leio</Cap>
          {MODES.map((option) => (
            <ChoiceRow
              key={option.mode}
              label={option.label}
              description={option.description}
              selected={settings.readingMode === option.mode}
              onPress={() => {
                track({ name: 'reading_mode_selected', mode: option.mode });
                updateSettings((s) => ({ ...s, readingMode: option.mode }));
              }}
              testID={`mode-${option.mode}`}
            />
          ))}
        </View>

        <View style={{ gap: spacing.md }}>
          <Cap>Tamanho do texto de leitura</Cap>
          <Text style={{ fontFamily: fonts.read, fontSize, lineHeight: fontSize * 1.7, color: colors.text }}>
            Exemplo do tamanho atual do texto de leitura.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Diminuir" variant="outline" onPress={() => changeFont(-2)} style={{ flex: 1 }} testID="font-smaller" />
            <Button title="Aumentar" variant="outline" onPress={() => changeFont(2)} style={{ flex: 1 }} testID="font-bigger" />
          </View>
          <AppText variant="caption">
            O texto também acompanha o tamanho de fonte definido no seu aparelho.
          </AppText>
        </View>

        <Rule />

        <View style={{ gap: spacing.sm }}>
          <Cap>Do seu aparelho</Cap>
          <AppText variant="caption">
            Tema {isDark ? 'escuro' : 'claro'}, seguindo o sistema. Reduzir movimento{' '}
            {reducedMotion ? 'está ligado — as animações estão desligadas.' : 'está desligado.'}
          </AppText>
        </View>

        <Rule />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="item">Enviar dados de uso anônimos</AppText>
            <AppText variant="caption">
              Desligado por padrão. Nunca inclui reflexões, jejum ou textos que você escreve.
            </AppText>
          </View>
          <Checkbox
            checked={settings.analyticsEnabled}
            onToggle={() => updateSettings((s) => ({ ...s, analyticsEnabled: !s.analyticsEnabled }))}
            label="Enviar dados de uso anônimos"
            testID="analytics-toggle"
          />
        </View>
      </ScreenScroll>
    </Screen>
  );
}
