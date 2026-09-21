import { router } from 'expo-router';

import { track } from '@/analytics/analytics';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { Button, ChoiceRow } from '@/ui/components';
import { OnboardingStep, StepSupport } from '@/ui/OnboardingStep';

/**
 * Rótulos do F2. As descrições de antes saíram com o desenho. "Ler aqui no app"
 * virou "Seguir o guia no app" (2026-09-21): sem tradução licenciada (Gate 1) o
 * app não mostra o texto bíblico, e o rótulo prometia isso.
 */
const OPTIONS: { mode: ReadingMode; label: string }[] = [
  { mode: 'in_app', label: 'Seguir o guia no app' },
  { mode: 'own_bible', label: 'Usar a minha Bíblia' },
  { mode: 'both', label: 'Vou alternar' },
];

/** F2 · Como você vai ler — passo 1 de 3. "Continuar" fica desabilitado até escolher. */
export default function ReadingModeScreen() {
  const settings = useSettings();
  const selected = settings?.readingMode ?? null;

  return (
    <OnboardingStep
      step={1}
      title="Como você pretende ler na maioria dos dias?"
      support={
        <StepSupport testID="reading-support">
          Ler na Bíblia impressa não é pior. Dá para mudar depois quando quiser.
        </StepSupport>
      }
      footer={
        <Button
          title="Continuar"
          disabled={!selected}
          onPress={() => {
            if (selected) track({ name: 'reading_mode_selected', mode: selected });
            router.push('/onboarding/jejum');
          }}
          testID="reading-continue"
        />
      }
    >
      {OPTIONS.map((option) => (
        <ChoiceRow
          key={option.mode}
          label={option.label}
          selected={selected === option.mode}
          // PER-02: se não gravar, a opção não fica marcada e a pessoa toca de novo.
          onPress={() =>
            updateSettings((s) => ({ ...s, readingMode: option.mode, lastUsedReadingMode: option.mode })).catch(() => undefined)
          }
          testID={`onboarding-mode-${option.mode}`}
        />
      ))}
    </OnboardingStep>
  );
}
