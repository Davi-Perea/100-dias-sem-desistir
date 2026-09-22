import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearRecordedEvents } from '@/analytics/analytics';
import { wipeAllFasting } from '@/fasting/fastingStore';
import { wipeAllMarks } from '@/marks/marksStore';
import { wipeAllCompletions } from '@/progress/completionsStore';
import { wipeAllReflections } from '@/reflections/reflectionsStore';

import { wipeSettings } from './settingsStore';

/**
 * Apaga TODOS os dados locais do aparelho: disco e caches em memória (PER-03).
 *
 * `AsyncStorage.clear()` sozinho não basta: as stores guardam cópia em memória e
 * a primeira gravação seguinte devolvia ao disco tudo o que tinha sido apagado.
 * Aqui cada store apaga as próprias chaves, zera o cache e avisa as telas (as
 * preferências voltam ao padrão, então o onboarding recomeça); depois o que
 * sobrar no AsyncStorage (posição do leitor e qualquer chave sem store) sai também.
 *
 * Não encerra a sessão da nuvem no servidor: a exclusão de conta (D-6) é um
 * fluxo próprio, que deve chamar esta função como último passo local.
 */
export async function wipeLocalData(): Promise<void> {
  await Promise.all([
    wipeAllCompletions(),
    wipeAllReflections(),
    wipeAllFasting(),
    wipeAllMarks(),
    wipeSettings(),
  ]);
  const rest = await AsyncStorage.getAllKeys();
  if (rest.length > 0) await AsyncStorage.multiRemove(rest);
  clearRecordedEvents();
}
