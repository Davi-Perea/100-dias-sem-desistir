import { router } from 'expo-router';
import { useState } from 'react';

import { track } from '@/analytics/analytics';
import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { AppText, Button, ChoiceRow, SAVE_ERROR_COPY } from '@/ui/components';
import { concluirEntrada } from '@/ui/entrada/concluirEntrada';
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
 * F2 · Como você vai ler. "Continuar" fica desabilitado até escolher. A frase de
 * apoio de baixo saiu a pedido do fundador (feedback E2).
 *
 * É o passo 3 nos dois caminhos, e o ÚLTIMO no navegador: lá não existe lembrete
 * (`REMINDERS_AVAILABLE`), então daqui já se entra na Jornada. No celular ainda
 * vem o passo do lembrete, e a troca para ele é com a pomba (E5) — a pomba não
 * voa na SAÍDA da entrada, porque o layout onde ela vive desmonta no meio do voo.
 */
export default function ReadingModeScreen() {
  const settings = useSettings();
  const selected = settings?.readingMode ?? null;
  const flyDove = useDoveTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const entrar = async () => {
    if (selected) track({ name: 'reading_mode_selected', mode: selected });
    // PER-02: sem gravar, o portão do layout traria a pessoa de volta; fica aqui
    // com o aviso, em vez de navegar para um estado que não foi salvo.
    if (!(await concluirEntrada(settings))) setNotice(SAVE_ERROR_COPY);
  };

  return (
    <OnboardingStep
      step={ONBOARDING_STEP.leitura}
      title="Como você pretende ler na maioria dos dias?"
      support={
        notice ? (
          <AppText
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="reading-notice"
          >
            {notice}
          </AppText>
        ) : undefined
      }
      footer={
        <Button
          title="Continuar"
          disabled={!selected}
          onPress={() => {
            if (!REMINDERS_AVAILABLE) {
              void entrar();
              return;
            }
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
