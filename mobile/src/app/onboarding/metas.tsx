import { router } from 'expo-router';
import { useState } from 'react';

import { GOALS, type GoalId } from '@/config/goals';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { Button, SAVE_ERROR_COPY, SaveErrorNotice } from '@/ui/components';
import { CustomGoalRow } from '@/ui/entrada/CustomGoalRow';
import { GoalRow } from '@/ui/entrada/GoalRow';
import { useDoveTransition } from '@/ui/entrada/doveContext';
import { ONBOARDING_STEP, OnboardingStep, StepSupport } from '@/ui/OnboardingStep';

/**
 * E4 · "Quais são suas metas para estes 100 dias?" — passo 2 de 4. Múltipla
 * escolha, nenhuma obrigatória; "Pular" segue sem mexer no que já está gravado.
 *
 * Cada toque grava na hora (como o F2), então voltar e reabrir mostra as
 * mesmas marcas. Metas ficam SÓ neste aparelho: "jejuar" e "orar todo dia" são
 * prática religiosa, dado sensível (LGPD art. 5º, II). Nunca em analytics.
 *
 * A última linha é "Outra meta" (feedback do fundador, 2026-09-22): a pessoa
 * escreve a dela, até 60 caracteres, guardada junto das outras. Ela sozinha já
 * libera o "Continuar".
 *
 * Daqui para a leitura a troca é com a pomba (E5), como em todo passo da entrada.
 */
export default function GoalsStep() {
  const settings = useSettings();
  const flyDove = useDoveTransition();
  const [error, setError] = useState(false);
  const goals = settings?.profile.goals ?? [];
  const customGoal = settings?.profile.customGoal ?? null;
  /** "Outra meta" escrita conta como meta: com ela, o "Continuar" já vale. */
  const chosen = goals.length > 0 || customGoal !== null;

  const toggle = (id: GoalId) => {
    setError(false);
    updateSettings((s) => {
      const current = s.profile.goals;
      const nextGoals = current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id];
      return { ...s, profile: { ...s.profile, goals: nextGoals } };
    }).catch(() => setError(true));
  };

  const changeCustom = (next: string | null) => {
    setError(false);
    updateSettings((s) => ({ ...s, profile: { ...s.profile, customGoal: next } })).catch(() => setError(true));
  };

  const next = () => flyDove(() => router.push('/onboarding/leitura'));

  return (
    <OnboardingStep
      step={ONBOARDING_STEP.metas}
      title="Quais são suas metas para estes 100 dias?"
      support={
        <>
          {error ? <SaveErrorNotice message={SAVE_ERROR_COPY} testID="goals-save-error" /> : null}
          <StepSupport testID="goals-support">
            Escolha quantas quiser. Ficam só neste aparelho, e você pode mudar depois em Você.
          </StepSupport>
        </>
      }
      footer={
        <>
          <Button title="Continuar" onPress={next} disabled={!chosen} testID="goals-continue" />
          {/* Com meta marcada, "Pular" contradiria as marcas: fica só "Continuar". */}
          {chosen ? null : <Button title="Pular" variant="underline" onPress={next} testID="goals-skip" />}
        </>
      }
    >
      {GOALS.map((goal) => (
        <GoalRow
          key={goal.id}
          label={goal.label}
          checked={goals.includes(goal.id)}
          onToggle={() => toggle(goal.id)}
          testID={`goal-${goal.id}`}
        />
      ))}
      {/* A última linha é a da pessoa: as metas prontas nunca dão conta de todas. */}
      <CustomGoalRow value={customGoal} onChange={changeCustom} />
    </OnboardingStep>
  );
}
