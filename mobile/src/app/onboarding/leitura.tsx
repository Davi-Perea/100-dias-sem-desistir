import { router } from 'expo-router';

import { track } from '@/analytics/analytics';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { Button, ChoiceRow } from '@/ui/components';
import { ONBOARDING_STEP, OnboardingStep } from '@/ui/OnboardingStep';

/**
 * Rótulos do F2. As descrições de antes saíram com o desenho. "Seguir o guia no
 * app" (sem texto licenciado) voltou a ser "Ler no app" em 2026-09-21: a Bíblia
 * Livre está empacotada e o leitor mostra o texto.
 */
const OPTIONS: { mode: ReadingMode; label: string }[] = [
  { mode: 'in_app', label: 'Ler no app' },
  { mode: 'own_bible', label: 'Usar a minha Bíblia' },
  { mode: 'both', label: 'Vou alternar' },
];

/**
 * F2 · Como você vai ler — passo 3 de 4. "Continuar" fica desabilitado até
 * escolher. A frase de apoio de baixo saiu a pedido do fundador (feedback E2).
 */
export default function ReadingModeScreen() {
  const settings = useSettings();
  const selected = settings?.readingMode ?? null;

  return (
    <OnboardingStep
      step={ONBOARDING_STEP.leitura}
      title="Como você pretende ler na maioria dos dias?"
      footer={
        <Button
          title="Continuar"
          disabled={!selected}
          onPress={() => {
            if (selected) track({ name: 'reading_mode_selected', mode: selected });
            router.push('/onboarding/lembrete');
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
