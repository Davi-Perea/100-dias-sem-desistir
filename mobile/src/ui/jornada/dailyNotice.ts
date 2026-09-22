import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * J4 · o aviso do dia aparece UMA vez por dia da campanha, ao abrir a Jornada.
 * Fechar no X guarda a marca `campanha:dia`: no mesmo dia não volta, no dia
 * seguinte (dia oficial novo) volta.
 *
 * Mesmo desenho de `entryDismissal`: memória (sobrevive à troca de aba) +
 * AsyncStorage (sobrevive a fechar o app), sempre em try/catch. Se ler falhar, o
 * aviso aparece; se gravar falhar, ele some até fechar o app. Nada quebra.
 * A marca não diz nada sobre a fé da pessoa (só que o aviso de um dia foi fechado).
 */
export const DAILY_NOTICE_KEY = 'jornada:daily-notice-dismissed:v1';

let memory: string | null | undefined;

export function dailyNoticeMark(campaignId: string, day: number): string {
  return `${campaignId}:${day}`;
}

export type DailyNotice = { loaded: boolean; dismissed: boolean; dismiss: () => void };

export function useDailyNotice(mark: string): DailyNotice {
  const [stored, setStored] = useState<string | null | undefined>(memory);

  useEffect(() => {
    if (stored !== undefined) return;
    let alive = true;
    (async () => {
      let value: string | null = null;
      try {
        value = await AsyncStorage.getItem(DAILY_NOTICE_KEY);
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
    AsyncStorage.setItem(DAILY_NOTICE_KEY, mark).catch(() => undefined);
  }, [mark]);

  return { loaded: stored !== undefined, dismissed: stored === mark, dismiss };
}

export function _resetDailyNoticeForTests() {
  memory = undefined;
}
