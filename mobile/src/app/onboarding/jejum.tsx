import { router } from 'expo-router';

import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Button, ChoiceRow } from '@/ui/components';
import { OnboardingStep } from '@/ui/OnboardingStep';

/**
 * Só a decisão de participar (spec §5, tela 3). Nada de tipo, alimento, duração,
 * motivo, condição médica, horário ou método — o app apenas acompanha, em privado.
 */
export default function FastingScreen() {
  const settings = useSettings();

  return (
    <OnboardingStep
      step={2}
      title="Você vai participar do propósito de jejum?"
      subtitle="Não perguntamos do que você jejua. Isso é entre você e Deus. Se participar, aparece só uma marcação privada no seu Início."
      footer={
        <Button title="Continuar" onPress={() => router.push('/onboarding/lembrete')} testID="fasting-continue" />
      }>
      <ChoiceRow
        label="Sim, vou participar"
        description="Quero acompanhar meu propósito"
        selected={settings?.fastingEnabled === true}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: true }))}
        testID="fasting-yes"
      />
      <ChoiceRow
        label="Ainda não"
        description="Você pode ativar depois em Você"
        selected={settings?.fastingEnabled === false}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: false }))}
        testID="fasting-no"
      />
      <AppText variant="caption">
        O registro de jejum fica apenas neste aparelho. Não vai para grupo, líder, relatório ou servidor.
      </AppText>
    </OnboardingStep>
  );
}
