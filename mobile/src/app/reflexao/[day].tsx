import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJourney } from '@/journey/useJourney';
import { deleteReflection, getReflection, saveReflection, useReflections } from '@/reflections/reflectionsStore';
import { AppText, Button, Card, Screen, StateView } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

/**
 * Reflexão PRIVADA (spec §11): local, opcional, editável, excluível.
 * Não existe caminho daqui para grupo, backend ou analytics — compartilhar um
 * insight é outra ação, com outro campo, que começa vazio.
 */
export default function ReflectionScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);

  // O rascunho começa nulo e só existe quando o usuário digita; até lá o campo
  // mostra o que está gravado. Assim não é preciso sincronizar estado num efeito.
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!Number.isInteger(dayNumber) || !reflections) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const existing = getReflection(reflections, dayNumber);
  const text = draft ?? existing;
  const setText = (value: string) => setDraft(value);

  return (
    <Screen>
      <Stack.Screen options={{ title: `Reflexão · Dia ${dayNumber}` }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">Minha reflexão</AppText>
            <AppText variant="title">O que ficou com você hoje?</AppText>
            <AppText variant="secondary">
              Opcional e privada. Fica guardada só neste aparelho e não é enviada para ninguém.
            </AppText>
          </View>

          <TextInput
            value={text}
            onChangeText={(value) => {
              setText(value);
              setSaved(false);
            }}
            multiline
            textAlignVertical="top"
            placeholder="Escreva o que quiser guardar deste dia…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Texto da sua reflexão privada"
            maxFontSizeMultiplier={1.8}
            style={{
              minHeight: 200,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.lg,
              fontSize: 16,
              lineHeight: 24,
              color: colors.text,
            }}
          />

          <Button
            title="Salvar para mim"
            onPress={async () => {
              await saveReflection(journey.campaign.id, dayNumber, text);
              setSaved(true);
            }}
            testID="save-reflection"
          />

          {saved ? (
            <AppText variant="muted" accessibilityLiveRegion="polite" style={{ color: colors.success }}>
              Guardado neste aparelho.
            </AppText>
          ) : null}

          {existing ? (
            <Button
              title="Excluir reflexão"
              variant="quiet"
              onPress={async () => {
                await deleteReflection(journey.campaign.id, dayNumber);
                setText('');
                setSaved(false);
              }}
            />
          ) : null}

          <Card tone="muted">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow">Compartilhar um insight</AppText>
              <AppText variant="muted">
                Compartilhar com o grupo é uma ação separada, com um campo próprio que começa vazio. Nada do que você
                escreve aqui vira público automaticamente. Disponível quando o backend estiver conectado.
              </AppText>
            </View>
          </Card>

          <Button title="Fechar" variant="quiet" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
