import { createContext, useContext } from 'react';

/**
 * Contrato da transição da pomba (E5), separado do voo em si
 * (`src/ui/motion/DoveTransition.tsx`): as telas só precisam pedir "voe e troque
 * o passo", sem carregar a biblioteca de animação. Assim uma tela aberta sozinha
 * (teste, deep link fora do layout) não depende do Reanimated.
 */

export type DoveTone = 'black' | 'white';

export type DoveFlightOptions = {
  /**
   * Tom da pomba antes da troca. Sem valor, acompanha o tema. As boas-vindas são
   * amarelo FIXO e pedem 'black' (branca sobre o amarelo sumiria no tema escuro).
   */
  toneBefore?: DoveTone;
  /** Tom depois da troca. Sem valor, acompanha o tema. */
  toneAfter?: DoveTone;
};

/**
 * Voa e roda `action` UMA vez, quando a pomba passa pelo meio da tela. Devolve
 * `false` se já há uma transição em curso: o toque é ignorado e `action` não roda.
 */
export type DoveFly = (action: () => void, options?: DoveFlightOptions) => boolean;

export const DoveContext = createContext<DoveFly | null>(null);

/**
 * `true` enquanto a pomba voa. A pilha da entrada lê isto para a tela nova entrar
 * sem deslize: a troca já acontece por baixo da pomba, e um deslize brigaria com o
 * voo. Quando o voo termina volta a `false`, e o "voltar" desliza de novo.
 */
export const DoveInFlightContext = createContext(false);

const runNow: DoveFly = (action) => {
  action();
  return true;
};

/**
 * Devolve a função que voa e troca. Fora do provedor a ação roda na hora, sem
 * voo. Com "Reduzir movimento" quem decide é o provedor (esmaece e troca).
 */
export function useDoveTransition(): DoveFly {
  return useContext(DoveContext) ?? runNow;
}

/** A pomba está voando agora? Fora do provedor, nunca. */
export function useDoveInFlight(): boolean {
  return useContext(DoveInFlightContext);
}
