import { createContext, useContext } from 'react';

/**
 * Contrato da transição da pomba (E5), separado do voo em si
 * (`src/ui/motion/DoveTransition.tsx`): as telas só precisam pedir "voe e depois
 * faça isto", sem carregar a biblioteca de animação. Assim uma tela aberta
 * sozinha (teste, deep link fora do layout) não depende do Reanimated.
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

export type DoveFly = (action: () => void, options?: DoveFlightOptions) => void;

export const DoveContext = createContext<DoveFly | null>(null);

const runNow: DoveFly = (action) => action();

/**
 * Devolve a função que voa e depois executa `action`. Fora do provedor, ou com
 * "Reduzir movimento" (o provedor decide), a ação roda na hora, sem voo.
 */
export function useDoveTransition(): DoveFly {
  return useContext(DoveContext) ?? runNow;
}
