import { Dimensions } from 'react-native';

/**
 * Viewport dos testes de Dynamic Type.
 *
 * O padrão do harness deste repositório é 750×1334 com `fontScale: 2`
 * (`@react-native/jest-preset`), o que tem duas consequências desagradáveis: a
 * suíte inteira já roda na meta de 200% e passa — porque nenhum teste olhava
 * geometria — e os ramos de telefone de `useGutter()` (26pt abaixo de 600) nunca
 * são exercitados. Quem quiser afirmar algo sobre layout precisa fixar os dois.
 *
 * Regra de uso, medida e não suposta: chame `setFontScale` ANTES do `render`.
 * Trocar a escala com a árvore montada só propaga dentro de
 * `await act(async () => ...)`; um `act` síncrono não propaga E envenena os
 * testes seguintes do mesmo arquivo.
 */

/** iPhone 13/14/15 — o aparelho de referência do handoff. */
export const PHONE = { width: 390, height: 844, scale: 3 } as const;

/**
 * Maior escala que o React Native entrega neste build: AX5 na tabela de
 * `RCTAccessibilityManager` é 3,571 (o 3,12 que se vê por aí é a razão de corpo
 * do iOS, 53/17, que o RN não usa).
 */
export const AX5 = 3.571;

export function setViewport(fontScale: number, size: { width: number; height: number } = PHONE) {
  const window = { ...PHONE, ...size, fontScale };
  Dimensions.set({ window, screen: window });
}

/** Volta ao tamanho de referência com fonte padrão. */
export function resetViewport() {
  setViewport(1);
}
