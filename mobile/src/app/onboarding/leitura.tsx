import { router } from 'expo-router';

import { track } from '@/analytics/analytics';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { Button, ChoiceRow } from '@/ui/components';
import { useDoveTransition } from '@/ui/entrada/doveContext';
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
 * Daqui para o lembrete a troca é com a pomba (E5).
 */
export default function ReadingModeScreen() {
  const settings = useSettings();
  const selected = settings?.readingMode ?? null;
  const flyDove = useDoveTransition();

  return (
    <OnboardingStep
      step={ONBOARDING_STEP.leitura}
      title="Como você pretende ler na maioria dos dias?"
      footer={
        <Button
          title="Continuar"
          disabled={!selected}
          onPress={() => {
            // Toque durante o voo é ignorado: nem troca nem evento repetido.
            const accepted = flyDove(() => router.push('/onboarding/lembrete'));
            if (accepted && selected) track({ name: 'reading_mode_selected', mode: selected });
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
