import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { hasAnyGoal } from '@/config/goals';
import type { Marks } from '@/marks/marksStore';
import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';
import type { Settings } from '@/settings/settingsStore';

import { AppText, Block, Button, IconCircle } from '../components';
import type { IconName } from '../icons';
import { spacing, useGutter, useReducedMotion } from '../theme';

/**
 * F7 · "Complete seu perfil N/6" (substitui o "Comece por aqui"): cartões num
 * carrossel horizontal — nome, ministério, metas, lembrete, primeira leitura
 * concluída e primeira anotação. Cada um tem ícone, título, frase e UMA ação; o
 * cartão some quando o passo está feito e o carrossel some quando todos estão.
 * São cinco no navegador, onde não há lembrete.
 *
 * Tudo sai de dados locais (`settings`, dias lidos, marcas): nada vai ao
 * servidor. O número é de passos feitos, nunca uma cobrança.
 *
 * Movimento: cartão entra e sai com fade curto; com "Reduzir movimento", troca
 * na hora.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) Blocos quentes
 * de largura ~3/4 da tela, com o próximo cartão aparecendo na borda para dizer
 * que há mais para o lado. Com fonte grande o cartão cresce para baixo.
 */
export type ProfileStepId = 'name' | 'ministry' | 'goals' | 'reminder' | 'firstReading' | 'firstNote';

export type ProfileStep = {
  id: ProfileStepId;
  icon: IconName;
  title: string;
  phrase: string;
  action: string;
  done: boolean;
};

export function hasFirstNote(marks: Marks | null): boolean {
  if (!marks) return false;
  return Object.values(marks.byVerse).some((mark) => mark.note.trim().length > 0);
}

export function profileSteps({
  settings,
  readCount,
  marks,
}: {
  settings: Settings;
  readCount: number;
  marks: Marks | null;
}): ProfileStep[] {
  return [
    {
      id: 'name',
      icon: 'person',
      title: 'Seu nome',
      phrase: 'Como podemos te chamar?',
      action: 'Adicionar nome',
      done: settings.profile.name !== null,
    },
    {
      id: 'ministry',
      icon: 'users',
      title: 'Seu ministério',
      phrase: 'Em qual ministério você serve?',
      action: 'Escolher ministério',
      done: (settings.ministry ?? null) !== null,
    },
    {
      id: 'goals',
      icon: 'flag',
      title: 'Suas metas',
      phrase: 'O que você quer viver nestes 100 dias?',
      action: 'Escolher metas',
      // Uma meta escrita pela pessoa fecha o passo igual a uma pronta.
      done: hasAnyGoal(settings.profile.goals, settings.profile.customGoal),
    },
    // O lembrete só entra onde ele existe. No navegador, "Escolher horário"
    // seria um passo impossível de concluir — nada é agendado —, e o cartão
    // ficaria em aberto para sempre, cobrando algo que o produto não faz
    // (23/09/2026). Com ele fora, a contagem vira N/5 sozinha.
    ...(REMINDERS_AVAILABLE
      ? [
          {
            id: 'reminder' as const,
            icon: 'bell' as const,
            title: 'Um lembrete',
            phrase: 'Um aviso por dia, na hora que você escolher.',
            action: 'Escolher horário',
            done: settings.reminder.slot !== 'none',
          },
        ]
      : []),
    {
      id: 'firstReading',
      icon: 'book',
      title: 'Primeira leitura',
      phrase: 'Leia um dia e marque como lido.',
      action: 'Ler um dia',
      done: readCount > 0,
    },
    {
      id: 'firstNote',
      icon: 'note',
      title: 'Primeira anotação',
      phrase: 'Toque num versículo na Bíblia e escreva uma anotação.',
      action: 'Abrir a Bíblia',
      done: hasFirstNote(marks),
    },
  ];
}

export function CompleteProfile({
  steps,
  onOpen,
}: {
  steps: ProfileStep[];
  onOpen: (step: ProfileStepId) => void;
}) {
  const reduced = useReducedMotion();
  const inset = useGutter();
  const { width } = useWindowDimensions();
  const pending = steps.filter((step) => !step.done);
  if (pending.length === 0) return null;
  const doneCount = steps.length - pending.length;
  // ~3/4 da tela, entre 240 e 300: o próximo cartão aparece na borda.
  const cardWidth = Math.max(240, Math.min(300, Math.round((width - inset) * 0.78)));

  return (
    <Animated.View exiting={reduced ? undefined : FadeOut.duration(240)} style={{ gap: spacing.sm }} testID="complete-profile">
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Complete seu perfil, ${doneCount} de ${steps.length} feitos`}
        style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.sm }}
      >
        <AppText variant="blockTitle">Complete seu perfil</AppText>
        <AppText variant="captionStrong" testID="complete-profile-count">
          {doneCount}/{steps.length}
        </AppText>
      </View>
      <AppText variant="caption">Fica só neste aparelho.</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + spacing.md}
        snapToAlignment="start"
        // O carrossel vai de borda a borda; o primeiro cartão alinha com a calha.
        style={{ marginHorizontal: -inset }}
        contentContainerStyle={{ paddingHorizontal: inset, gap: spacing.md }}
        testID="complete-profile-carousel"
      >
        {pending.map((step) => (
          <Animated.View
            key={step.id}
            entering={reduced ? undefined : FadeIn.duration(200)}
            exiting={reduced ? undefined : FadeOut.duration(200)}
            style={{ width: cardWidth }}
            testID={`profile-step-${step.id}`}
          >
            <StepCard step={step} onPress={() => onOpen(step.id)} />
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function StepCard({ step, onPress }: { step: ProfileStep; onPress: () => void }) {
  return (
    <Block tone="warm" style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <IconCircle name={step.icon} size={48} />
        <AppText variant="rowLabel">{step.title}</AppText>
        <AppText variant="caption" style={{ flex: 1 }}>
          {step.phrase}
        </AppText>
        <Button
          title={step.action}
          variant="outline"
          onPress={onPress}
          accessibilityHint={step.phrase}
          testID={`profile-step-${step.id}-action`}
        />
      </View>
    </Block>
  );
}
