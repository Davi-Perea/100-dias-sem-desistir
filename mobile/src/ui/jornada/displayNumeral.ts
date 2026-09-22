import { useState } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';

import { NUMERAL_MAX_SCALE, numeralWidth, type NumeralSpec } from '../altar/milestoneNumeral';

/**
 * Numerais de exibição da casa — "Dia 17" (A1 58/54, A3 50/48), "Faltam 2 dias"
 * (A5 52/52) e o "83" do E5 (54/52) — com a MESMA política do numeral do marco
 * (`ui/altar/milestoneNumeral`, commit ba686a2): acompanham a fonte do sistema
 * até 1,2× (`maxFontSizeMultiplier`) e cedem tamanho pela largura MEDIDA, para
 * que "Dia" ou "Faltam" nunca quebrem no meio da palavra.
 *
 * Exceção declarada à regra 25, igual à do marco: só o numeral encolhe. O dado
 * inteiro continua no rótulo acessível e no texto ao redor, que crescem sem teto.
 *
 * As letras não estão na tabela de dígitos medidos e entram com a largura de
 * reserva de `numeralWidth` (0,65em), maior que a real da Schibsted 800: a conta
 * erra para o lado seguro (numeral um pouco menor, nunca cortado).
 */
export const PANEL_NUMERAL: NumeralSpec = { size: 58, lineHeight: 54, letterSpacing: -2.6 };
export const SCREEN_NUMERAL: NumeralSpec = { size: 50, lineHeight: 48, letterSpacing: -2.2 };
export const COUNTDOWN_NUMERAL: NumeralSpec = { size: 52, lineHeight: 52, letterSpacing: -2.4 };
export const FINISHED_NUMERAL: NumeralSpec = { size: 54, lineHeight: 52, letterSpacing: -2.6 };

export { NUMERAL_MAX_SCALE };

/**
 * J1 (feedback 2026-09-22, "Dia 3 de 100" cortado): a entrelinha do desenho
 * (58/54, 50/48, 52/52, 54/52) é MENOR que a altura natural da Schibsted 800.
 * Medido na tabela `hhea` de SchibstedGrotesk_800ExtraBold.ttf: ascent 2000,
 * descent 528, unitsPerEm 2048, isto é, 1,234em. Com entrelinha menor que isso,
 * o Android tira a diferença do topo da linha (CustomLineHeightSpan) e o iOS
 * também recorta a caixa: o alto do "D" e o pingo do "i" somem.
 *
 * CORREÇÃO TÉCNICA: o numeral de exibição tem uma linha só, então a entrelinha
 * do desenho não aproxima linha nenhuma; ela só encolhe a caixa. A caixa passa a
 * ter no mínimo a altura natural da fonte (o desenho continua valendo quando
 * for maior). Vale para qualquer largura e qualquer escala de fonte, porque o
 * sistema multiplica tamanho e entrelinha pelo mesmo fator.
 */
export const SCHIBSTED_800_LINE_EM = (2000 + 528) / 2048;

/** Entrelinha que nunca recorta o numeral: a do desenho ou a natural da fonte, a maior. */
export function safeNumeralLineHeight(spec: NumeralSpec): number {
  return Math.max(spec.lineHeight, Math.ceil(spec.size * SCHIBSTED_800_LINE_EM));
}

/**
 * Tamanho base (antes do multiplicador do sistema) para que `word`, a maior
 * palavra que não pode quebrar, caiba em `available` pt com a fonte do sistema
 * em `fontScale` (limitada a 1,2×). Nunca passa do tamanho do desenho.
 */
export function fitDisplayNumeral(word: string, spec: NumeralSpec, available: number, fontScale: number): NumeralSpec {
  const textScale = Math.min(Math.max(fontScale, 1), NUMERAL_MAX_SCALE);
  const perPoint = numeralWidth(word, 1, spec);
  if (!(available > 0) || !(perPoint > 0)) return spec;
  const size = Math.max(1, Math.floor(Math.min(spec.size, available / textScale / perPoint)));
  const ratio = size / spec.size;
  return {
    size,
    lineHeight: Math.round(spec.lineHeight * ratio),
    letterSpacing: Math.round(spec.letterSpacing * ratio * 10) / 10,
  };
}

/**
 * Mede a largura do contêiner e devolve o estilo do numeral. Antes da primeira
 * medida, usa o tamanho do desenho (é o que cabe com fonte padrão).
 */
export function useDisplayNumeral(word: string, spec: NumeralSpec) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);
  const fitted = width === null ? spec : fitDisplayNumeral(word, spec, width, fontScale);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (current !== null && Math.abs(current - next) < 0.5 ? current : next));
  };
  return {
    onLayout,
    style: {
      fontSize: fitted.size,
      lineHeight: safeNumeralLineHeight(fitted),
      letterSpacing: fitted.letterSpacing,
      // O tracking negativo come o fim do último glifo em algumas plataformas;
      // devolver essa folga à direita não muda a medida do encaixe (que já é
      // pela largura de reserva, maior que a real).
      paddingRight: Math.ceil(Math.abs(fitted.letterSpacing)),
    },
    maxFontSizeMultiplier: NUMERAL_MAX_SCALE,
  };
}
