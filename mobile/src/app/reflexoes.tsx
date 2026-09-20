import { router, Stack } from 'expo-router';

import { useJourney } from '@/journey/useJourney';
import { reflectionDays, useReflections, getReflection } from '@/reflections/reflectionsStore';
import { AppText, Block, Button, Cap, Screen, ScreenScroll, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';

/** Lista das reflexões privadas. Local, sem nuvem, sem compartilhamento. */
export default function ReflectionsScreen() {
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);

  if (!reflections) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const days = reflectionDays(reflections);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Minhas reflexões' }} />
      <ScreenScroll gap={spacing.md}>
        <Cap>Minhas reflexões · só você vê</Cap>
        {days.length === 0 ? (
          <StateView
            kind="empty"
            title="Nada escrito ainda"
            message="Suas reflexões aparecem aqui depois que você escrever a primeira."
            action={<Button title="Voltar" variant="outline" onPress={() => router.back()} />}
          />
        ) : (
          days.map((day) => (
            <Block
              key={day}
              onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
              accessibilityLabel={`Reflexão do dia ${day}`}
              testID={`reflection-${day}`}
            >
              <AppText variant="action">Dia {day}</AppText>
              <AppText variant="quote" numberOfLines={2} style={{ marginTop: spacing.xs }}>
                {getReflection(reflections, day)}
              </AppText>
            </Block>
          ))
        )}
      </ScreenScroll>
    </Screen>
  );
}
