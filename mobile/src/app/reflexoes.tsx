import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { useJourney } from '@/journey/useJourney';
import { getReflection, reflectionDays, useReflections } from '@/reflections/reflectionsStore';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, Cap, Screen, ScreenScroll } from '@/ui/components';
import { ListSkeleton } from '@/ui/entrada/ListSkeleton';
import { EmptyState } from '@/ui/entrada/States';
import { LockCircle } from '@/ui/LockSheet';
import { faces, spacing, useGutter } from '@/ui/theme';

/**
 * Minhas reflexões. Local, sem nuvem, sem compartilhamento.
 *
 * O grupo F é dono do estado vazio (F6) e do carregando (F3). A lista com itens
 * não foi desenhada (LACUNAS: D1 "Minhas reflexões"): ela segue como era, com
 * os componentes novos.
 */
export default function ReflectionsScreen() {
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);
  const inset = useGutter();
  const days = reflections ? reflectionDays(reflections) : [];

  // "Escrever a de hoje" só existe com a campanha em curso: antes dela nenhum dia
  // abre, e depois dela não há "hoje".
  const canWriteToday = journey.phase === 'running';
  const writeToday = () =>
    router.push({ pathname: '/reflexao/[day]', params: { day: String(journey.officialDay) } });

  return (
    <Screen>
      {/* Barra própria em vez do cabeçalho nativo: o título nativo não cresce
          com a fonte do sistema. */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingHorizontal: inset }}>
        {/* PROVISÓRIO (pergunta 18 ao designer / LACUNAS C60): o F6 não diz como
            se volta. Fica o "‹ Voltar" das outras telas contextuais. */}
        <BackBar label="Voltar" onBack={goBackOrHome} testID="reflections-back-bar" />
      </View>
      <ScreenScroll gap={spacing.md}>
        {/* F6 pede Schibsted 800 32/36, fora da escala do TOKENS (screenTitle é
            700 30/34, LACUNAS C60): vale a tela. Tracking não especificado: o do
            screenTitle. */}
        <AppText
          variant="screenTitle"
          accessibilityRole="header"
          style={{ fontFamily: faces.sg800, fontSize: 32, lineHeight: 36 }}
          testID="reflections-title"
        >
          Minhas reflexões
        </AppText>

        {!reflections ? (
          <ListSkeleton />
        ) : days.length === 0 ? (
          <EmptyState
            // O cadeado do desenho (A4/TOKENS §5), o mesmo da folha do dia
            // fechado, e não o "lock" genérico do conjunto de ícones (R4-9).
            glyph={<LockCircle />}
            title="Nada escrito ainda"
            message="Suas reflexões aparecem aqui depois que você escrever a primeira. Só você vê."
            action={
              canWriteToday ? (
                <Button title="Escrever a de hoje" variant="outline" onPress={writeToday} testID="reflections-write-today" />
              ) : (
                // PROVISÓRIO (pergunta 18 ao designer): o F6 não diz o que
                // "Escrever a de hoje" faz antes ou depois da campanha. Fica a
                // ação que a tela já tinha.
                <Button title="Voltar" variant="outline" onPress={goBackOrHome} testID="reflections-empty-back" />
              )
            }
          />
        ) : (
          <>
            {/* PROVISÓRIO (decisão do engenheiro, 2026-09-21: a lista com itens não
                foi desenhada, LACUNAS D1): o aviso de privacidade que a tela já
                tinha, sem repetir o título. */}
            <Cap>Só você vê</Cap>
            {days.map((day) => (
              <Block
                key={day}
                tone="warm"
                onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
                accessibilityLabel={`Reflexão do dia ${day}`}
                testID={`reflection-${day}`}
              >
                <AppText variant="action">Dia {day}</AppText>
                <AppText variant="quote" numberOfLines={2} style={{ marginTop: spacing.xs }}>
                  {getReflection(reflections, day)}
                </AppText>
              </Block>
            ))}
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
