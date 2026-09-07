import { router } from 'expo-router';

import { track } from '@/analytics/analytics';
import { updateSettings, useSettings, type ReadingMode } from '@/settings/settingsStore';
import { AppText, Button, ChoiceRow } from '@/ui/components';
import { OnboardingStep } from '@/ui/OnboardingStep';

const OPTIONS: { mode: ReadingMode; title: string; subtitle: string }[] = [
  { mode: 'in_app', title: 'Ler aqui no app', subtitle: 'O texto aparece direto na tela de hoje' },
  { mode: 'own_bible', title: 'Usar minha Bíblia', subtitle: 'Você lê onde preferir e marca o dia como concluído' },
  { mode: 'both', title: 'Eu vou alternar', subtitle: 'Depende do dia' },
];

export default function ReadingModeScreen() {
  const settings = useSettings();
  const selected = settings?.readingMode ?? null;

  return (
    <OnboardingStep
      step={2}
      title="Como você pretende ler na maioria dos dias?"
      subtitle="Isso muda só o destaque dos botões. As duas formas continuam disponíveis, sempre."
      footer={
        <Button
          title="Continuar"
          size="lg"
          disabled={!selected}
          onPress={() => {
            if (selected) track({ name: 'reading_mode_selected', mode: selected });
            router.push('/onboarding/jejum');
          }}
          testID="reading-continue"
        />
      }>
      {OPTIONS.map((option) => (
        <ChoiceRow
          key={option.mode}
          title={option.title}
          subtitle={option.subtitle}
          selected={selected === option.mode}
          onPress={() => updateSettings((s) => ({ ...s, readingMode: option.mode, lastUsedReadingMode: option.mode }))}
          testID={`onboarding-mode-${option.mode}`}
        />
      ))}
      <AppText variant="muted">
        Ler na Bíblia impressa ou em outro aplicativo não é uma experiência inferior. Aqui organizamos a jornada.
      </AppText>
    </OnboardingStep>
  );
}
