import { router, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { updateSettings, useSettings } from '@/settings/settingsStore';

import { reachedMilestones } from './milestones';
import { useJourney } from './useJourney';

/**
 * Qual marco mostrar em tela cheia agora, ou `null`.
 *
 * Regra: o MAIOR marco alcançado pela contagem pessoal, se ainda não foi visto.
 * Não é igualdade exata com a contagem (o gatilho antigo era
 * `milestoneForDay(completedCount)`): quem concluiu dois dias de uma vez e pulou
 * de 6 para 8 nunca veria a "Primeira semana". E não volta para trás: quem já
 * viu o 25 não recebe o 7 atrasado depois.
 */
export function milestoneToShow(completedCount: number, seen: readonly number[] | null): number | null {
  if (seen === null) return null;
  const reached = reachedMilestones(completedCount);
  const top = reached[reached.length - 1];
  if (!top || seen.includes(top.day)) return null;
  return top.day;
}

/**
 * Dispara a tela de marco (E3/E4). Montado no layout das abas, porque a aba
 * Início, onde ele morava, deixou de existir.
 *
 * - Só dispara com uma aba em primeiro plano. Se o leitor está por cima e a
 *   conclusão acontece lá, o marco espera a volta para a casa — senão o
 *   `router.back()` do leitor fecharia o marco em vez do leitor.
 *   PROVISÓRIO (pergunta 4 ao designer): a ordem entre "Depois de concluir" (B4)
 *   e o marco não foi definida; hoje o marco aparece ao voltar para as abas.
 * - Marca o marco como visto ao abrir. "Aparece uma vez por marco" (TELAS E3)
 *   não pode depender de a pessoa sair pelo botão da tela: o voltar do Android
 *   fecharia sem registrar e o marco reapareceria a cada abertura.
 */
export function useMilestoneTrigger() {
  const journey = useJourney();
  const settings = useSettings();
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';

  const target =
    journey.ready && settings && inTabs ? milestoneToShow(journey.completedCount, settings.milestonesSeen) : null;

  useEffect(() => {
    if (target === null) return;
    updateSettings((s) =>
      s.milestonesSeen.includes(target) ? s : { ...s, milestonesSeen: [...s.milestonesSeen, target] },
    ).catch(() => {});
    router.push({ pathname: '/marco/[day]', params: { day: String(target) } });
  }, [target]);
}
