/**
 * Mock mínimo do react-native-reanimated para os testes de Você.
 *
 * O `react-native-reanimated/mock` da versão 4 importa o índice real, que chama
 * o módulo nativo do react-native-worklets e quebra no Jest. Aqui ficam só os
 * pedaços que as telas de Você usam: `Animated.View` vira `View` e as animações
 * de entrada/saída viram objetos encadeáveis que não fazem nada.
 */
import { View } from 'react-native';

type Chain = { duration: () => Chain; delay: () => Chain; springify: () => Chain };
const chain = (): Chain => {
  const self: Chain = { duration: () => self, delay: () => self, springify: () => self };
  return self;
};

export const FadeIn = chain();
export const FadeOut = chain();
export const FadeInDown = chain();
export const ZoomIn = chain();
export const ZoomOut = chain();

const Animated = { View };
export default Animated;
