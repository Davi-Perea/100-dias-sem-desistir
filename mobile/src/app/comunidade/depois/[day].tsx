import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { getDay } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { COMMUNITY_ENABLED } from '@/config/features';
import { isDayCompleted } from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';
import { goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, Rule, Screen, ScreenScroll } from '@/ui/components';
import { parseDay, ROUTES } from '@/ui/comunidade/publicar/fluxo';
import { audienceSentence } from '@/ui/comunidade/publicar/textos';
import { spacing, useTheme } from '@/ui/theme';

/**
 * B4 · Depois de concluir. A ponte da leitura para a comunidade (TELAS B4).
 *
 * Só existe com COMMUNITY_ENABLED: o leitor só manda para cá quando a flag está
 * ligada; sem ela a rota volta para a casa e a V1 continua fechando o leitor.
 *
 * Duas portas do MESMO tamanho, com a diferença dita em palavra: "Escrever para
 * a igreja" (C3, que cuida de regras e consentimento na primeira vez) e "Guardar
 * só para mim" (B5, reflexão privada). A reflexão NUNCA pré-preenche publicação:
 * nenhuma das portas leva texto adiante, só o número do dia.
 *
 * A frase de quem vê é `audienceSentence()`, a mesma de publicar e do
 * consentimento, sozinha (feedback de 2026-09-22, C5: saiu a frase do "guardar
 * só para você"), nunca uma cópia.
 */
export default function AfterReadingScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = parseDay(params.day);
  const journey = useJourney();
  const settings = useSettings();
  const { colors } = useTheme();

  if (!COMMUNITY_ENABLED || day === null) return <Redirect href="/" />;
  // Enquanto o disco não respondeu, não decide: nada de piscar "concluído".
  if (journey.completions == null) return <Screen />;
  // O convite para publicar não existe antes de concluir (TELAS B4: ordem de tela).
  if (!isDayCompleted(journey.completions, day)) return <Redirect href="/" />;

  const summary = readingSummary(getDay(day) ?? null);
  const onBlueSoft = { color: colors.onBlueSoft };
  // Onde a pessoa leu (B3, modo de leitura): quem escolheu a própria Bíblia
  // conclui pela tela enxuta, e dizer "lido aqui no app" seria mentira sobre o
  // que ela acabou de fazer. Sem preferência lida ainda, só a referência.
  const whereRead =
    settings == null
      ? null
      : (settings.lastUsedReadingMode ?? settings.readingMode) === 'own_bible'
        ? 'lido na sua Bíblia'
        : 'lido aqui no app';

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={spacing.lg}>
        <Block tone="warm" testID="after-done">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.markSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.onMark }} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="action" accessibilityRole="header" style={{ fontSize: 19, lineHeight: 24 }}>
                {`Dia ${day} concluído`}
              </AppText>
              {summary ? (
                <AppText variant="caption">{whereRead ? `${summary.label} · ${whereRead}` : summary.label}</AppText>
              ) : null}
            </View>
          </View>
        </Block>

        <Block tone="blueSoft" style={{ padding: 20, gap: spacing.md }} testID="after-bridge">
          <AppText variant="blockTitleLg" accessibilityRole="header" style={[{ fontSize: 26, lineHeight: 31 }, onBlueSoft]}>
            Quer dizer alguma coisa?
          </AppText>
          <AppText variant="body" style={onBlueSoft}>
            Você não é obrigado. Mas tem gente lendo o mesmo capítulo hoje.
          </AppText>
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Escrever para a igreja"
              variant="blue"
              onPress={() => router.replace({ pathname: ROUTES.publicar, params: { day: String(day) } })}
              testID="after-write"
            />
            <Button
              title="Guardar só para mim"
              variant="outline"
              onPress={() => router.replace({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
              testID="after-keep"
            />
          </View>
          <Rule />
          <AppText variant="caption" style={onBlueSoft} testID="after-audience">
            {audienceSentence()}
          </AppText>
        </Block>

        <Button title="Agora não" variant="underline" onPress={goBackOrHome} testID="after-not-now" />
      </ScreenScroll>
    </Screen>
  );
}
