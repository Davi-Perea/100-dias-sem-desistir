import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * "Ir para hoje" dispensa a mensagem de entrada até o dia seguinte da campanha.
 *
 * Guarda a marca `campanha:dia` em memória (sobrevive à troca de aba, que
 * desmonta a casa) e no AsyncStorage (sobrevive a fechar o app). Preferência de
 * conveniência: se ler ou gravar falhar, a mensagem só volta a aparecer — nada
 * quebra. Chave própria, fora das configurações.
 */
export const ENTRY_DISMISS_KEY = 'jornada:entry-dismissed:v1';

let memory: string | null | undefined;

export function entryDismissMark(campaignId: string, day: number): string {
  return `${campaignId}:${day}`;
}

/** `loaded`: já se sabe se está dispensada (antes disso a casa mostra o esqueleto). */
export type EntryDismissal = { loaded: boolean; dismissed: boolean; dismiss: () => void };

export function useEntryDismissal(mark: string): EntryDismissal {
  const [stored, setStored] = useState<string | null | undefined>(memory);

  useEffect(() => {
    if (stored !== undefined) return;
    let alive = true;
    (async () => {
      let value: string | null = null;
      try {
        value = await AsyncStorage.getItem(ENTRY_DISMISS_KEY);
      } catch {
        value = null;
      }
      if (memory === undefined) memory = value;
      if (alive) setStored(memory);
    })();
    return () => {
      alive = false;
    };
  }, [stored]);

  const dismiss = useCallback(() => {
    memory = mark;
    setStored(mark);
    AsyncStorage.setItem(ENTRY_DISMISS_KEY, mark).catch(() => undefined);
  }, [mark]);

  return { loaded: stored !== undefined, dismissed: stored === mark, dismiss };
}

export function _resetEntryDismissalForTests() {
  memory = undefined;
}
