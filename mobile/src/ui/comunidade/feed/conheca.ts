import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * "Conheça o Juntos" (pedido do fundador, 2026-09-22): na PRIMEIRA vez que a
 * pessoa abre a aba, um aviso por cima explica o que é o lugar. Fechar no X
 * guarda a dispensa; ele não volta mais.
 *
 * Mesmo desenho do aviso do versículo do dia (`ui/jornada/dailyNotice.ts`):
 * memória (sobrevive à troca de aba) + AsyncStorage (sobrevive a fechar o app),
 * sempre em try/catch. Se ler falhar, o aviso aparece; se gravar falhar, ele some
 * até fechar o app. Nada quebra.
 *
 * Diferença: aqui a marca não tem dia — é uma vez na vida do aparelho. A marca
 * não diz nada sobre a fé da pessoa (só que ela já leu a apresentação da aba).
 */
export const JUNTOS_INTRO_KEY = 'juntos:conheca-dispensado:v1';
const MARK = '1';

let memory: string | null | undefined;

export type JuntosIntro = { loaded: boolean; dismissed: boolean; dismiss: () => void };

export function useJuntosIntro(): JuntosIntro {
  const [stored, setStored] = useState<string | null | undefined>(memory);

  useEffect(() => {
    if (stored !== undefined) return;
    let alive = true;
    (async () => {
      let value: string | null = null;
      try {
        value = await AsyncStorage.getItem(JUNTOS_INTRO_KEY);
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
    memory = MARK;
    setStored(MARK);
    AsyncStorage.setItem(JUNTOS_INTRO_KEY, MARK).catch(() => undefined);
  }, []);

  return { loaded: stored !== undefined, dismissed: stored === MARK, dismiss };
}

export function _resetJuntosIntroForTests() {
  memory = undefined;
}
