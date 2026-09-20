import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDay } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { deleteReflection, getReflection, saveReflection, useReflections } from '@/reflections/reflectionsStore';
import { AppText, Button, Cap, Rule, Screen, StateView } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, fonts, spacing, useGutter, useTheme } from '@/ui/theme';

/**
 * Minha reflexão (tela 09). Privada por padrão e guardada só neste aparelho.
 *
 * Regra de produto do handoff, aplicada literalmente: a reflexão privada NUNCA
 * pré-preenche o insight público. São dois textos diferentes, escritos em
 * momentos diferentes, com públicos diferentes.
 */
export default function ReflectionScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);

  const day = Number.parseInt(params.day ?? '', 10);
  const stored = getReflection(reflections, day);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // Deriva o rascunho a partir do valor guardado sem setState dentro de efeito.
  const key = `${journey.campaign.id}:${day}:${reflections ? 'ready' : 'loading'}`;
  if (reflections && draftKey !== key) {
    setDraftKey(key);
    setDraft(stored);
  }

  if (!Number.isInteger(day) || day < 1 || day > journey.campaign.total_days) {
    return (
      <Screen>
        <StateView
          kind="empty"
          title="Dia não encontrado"
          action={<Button title="Voltar" variant="outline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  if (!reflections) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  // A referência da leitura é conteúdo do dia: num dia que ainda não abriu ela
  // não aparece, mesmo que a rota seja alcançada por link direto.
  const summary = journey.isDayUnlocked(day) ? readingSummary(getDay(day)) : null;

  const save = async () => {
    setBusy(true);
    try {
      await saveReflection(journey.campaign.id, day, draft.trim());
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    Alert.alert('Excluir reflexão', 'Esta reflexão será apagada deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteReflection(journey.campaign.id, day);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        {/* ------------------------------------------------------------ barra */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: inset - spacing.sm,
            minHeight: MIN_TOUCH,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            testID="reflection-cancel"
            style={({ pressed }) => [{ minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm }, pressed && { opacity: 0.72 }]}
          >
            <AppText variant="item">Cancelar</AppText>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={{ fontFamily: fonts.label, fontSize: 15, color: colors.text }}>Dia {day}</AppText>
          </View>
          <Pressable
            onPress={remove}
            disabled={stored.length === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: stored.length === 0 }}
            testID="reflection-delete"
            style={({ pressed }) => [
              { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
              stored.length === 0 && { opacity: 0.4 },
              pressed && stored.length > 0 && { opacity: 0.72 },
            ]}
          >
            <AppText variant="item" style={{ color: colors.danger }}>
              Excluir
            </AppText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: inset,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.lg,
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH + inset * 2,
            alignSelf: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="lock" size={16} color={colors.textMuted} />
            <Cap>Minha reflexão · só você vê</Cap>
          </View>

          <AppText variant="blockTitleLg">O que ficou com você hoje?</AppText>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus={stored.length === 0}
            textAlignVertical="top"
            placeholder="Escreva à vontade."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Texto da sua reflexão privada"
            testID="reflection-input"
            selectionColor={colors.text}
            style={{
              minHeight: 220,
              fontFamily: fonts.read,
              fontSize: 19,
              lineHeight: 30.4,
              color: colors.text,
            }}
          />
        </ScrollView>

        {/* ----------------------------------------------------------- rodapé */}
        <View
          style={{
            paddingHorizontal: inset,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Cap>
            {summary ? `${summary.label} · ` : ''}salva neste aparelho
          </Cap>
          <Button title="Salvar para mim" onPress={save} loading={busy} testID="reflection-save" />

          <Rule />

          {/*
            Caminho social. O composer de insight começa SEMPRE em branco: a
            reflexão privada não é semente do texto público. Enquanto a área da
            comunidade não estiver conectada, dizemos isso em vez de abrir um
            caminho que não existe.
          */}
          <AppText variant="caption">
            Um insight começa em branco e sua reflexão continua privada. Compartilhar abre quando a área da
            comunidade estiver conectada.
          </AppText>
          <Button
            title="Compartilhar um insight"
            variant="outline"
            disabled
            onPress={() => {}}
            testID="share-insight"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
