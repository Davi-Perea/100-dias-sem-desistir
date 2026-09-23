import { router } from 'expo-router';

import { track } from '@/analytics/analytics';
import { updateSettings, type Settings } from '@/settings/settingsStore';

/**
 * Fim da entrada do app: grava `onboardingCompleted`, registra o evento e abre a
 * casa.
 *
 * Mora aqui, e não dentro de uma tela, porque o último passo MUDA de plataforma:
 * no celular é o lembrete; no navegador, onde não há lembrete
 * (`REMINDERS_AVAILABLE`), é a escolha de como ler. Duas cópias desta função
 * seriam duas chances de uma delas esquecer de gravar o `onboardingCompleted` e
 * devolver a pessoa às boas-vindas para sempre.
 *
 * Devolve `false` quando o disco falhou: quem chamou mostra o aviso de salvar e
 * NÃO navega — sem a gravação, o portão do layout traria a pessoa de volta.
 */
export async function concluirEntrada(settings: Settings | null): Promise<boolean> {
  if (settings) {
    // Jejum, nome e metas nunca entram em analytics (PER-06): prática religiosa
    // é dado sensível pela LGPD art. 5º, II, e o nome é pessoal.
    track({
      name: 'onboarding_completed',
      readingMode: settings.readingMode ?? 'unset',
      reminder: settings.reminder.slot,
    });
  }
  try {
    await updateSettings((s) => ({ ...s, onboardingCompleted: true }));
  } catch {
    return false;
  }
  router.replace('/');
  return true;
}
