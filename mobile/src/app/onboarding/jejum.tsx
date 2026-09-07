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
      step={3}
      title="Você vai participar do propósito de jejum?"
      subtitle="Se sim, um cartão privado aparece no Hoje para você marcar. Ninguém mais vê."
      footer={
        <Button title="Continuar" size="lg" onPress={() => router.push('/onboarding/lembrete')} testID="fasting-continue" />
      }>
      <ChoiceRow
        title="Sim"
        subtitle="Quero acompanhar meu propósito"
        selected={settings?.fastingEnabled === true}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: true }))}
        testID="fasting-yes"
      />
      <ChoiceRow
        title="Ainda não"
        subtitle="Você pode ativar depois em Você"
        selected={settings?.fastingEnabled === false}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: false }))}
        testID="fasting-no"
      />
      <AppText variant="muted">
        O registro de jejum fica apenas neste aparelho. Não vai para grupo, líder, relatório ou servidor.
      </AppText>
    </OnboardingStep>
  );
}
