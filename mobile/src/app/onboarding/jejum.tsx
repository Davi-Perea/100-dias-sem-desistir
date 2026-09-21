import { router } from 'expo-router';

import { updateSettings, useSettings } from '@/settings/settingsStore';
import { Button, ChoiceRow } from '@/ui/components';
import { OnboardingStep, StepSupport } from '@/ui/OnboardingStep';

/**
 * Passo 2 de 3 · jejum, no molde do F2.
 *
 * Só a decisão de participar. Nada de tipo, alimento, duração, motivo, condição
 * médica, horário ou método — o app apenas acompanha, em privado. O jejum fica
 * como está por decisão do dono (REGRAS §5 item 4: se a igreja disser que não
 * há jejum oficial, este passo sai sem refazer o molde).
 *
 * PROVISÓRIO (pergunta 18 ao designer): o TELAS só diz "no mesmo molde", sem
 * cópia. Ficam o título, as opções e os avisos que o passo já tinha.
 */
export default function FastingScreen() {
  const settings = useSettings();

  return (
    <OnboardingStep
      step={2}
      title="Você vai participar do propósito de jejum?"
      support={
        <>
          <StepSupport testID="fasting-support">
            Não perguntamos do que você jejua. Isso é entre você e Deus.
          </StepSupport>
          <StepSupport testID="fasting-privacy">
            O registro de jejum fica apenas neste aparelho. Não vai para grupo, líder, relatório ou servidor.
          </StepSupport>
        </>
      }
      footer={
        <Button title="Continuar" onPress={() => router.push('/onboarding/lembrete')} testID="fasting-continue" />
      }
    >
      <ChoiceRow
        label="Sim, vou participar"
        description="Quero acompanhar meu propósito"
        selected={settings?.fastingEnabled === true}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: true })).catch(() => undefined)}
        testID="fasting-yes"
      />
      <ChoiceRow
        label="Ainda não"
        description="Você pode ativar depois em Você"
        selected={settings?.fastingEnabled === false}
        onPress={() => updateSettings((s) => ({ ...s, fastingEnabled: false })).catch(() => undefined)}
        testID="fasting-no"
      />
    </OnboardingStep>
  );
}
