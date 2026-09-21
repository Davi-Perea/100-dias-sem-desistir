/**
 * Tamanho do numeral de marco (E3 e E4), que "cede tamanho para caber na
 * largura e com fonte grande" (TELAS E3).
 *
 * O desenho pede Schibsted 800 180/160 −10 nos marcos e 150/136 −8 no Dia 100.
 * Entrelinha e tracking acompanham o tamanho na mesma proporção.
 *
 * As larguras de dígito foram MEDIDAS na tabela `hmtx` de
 * SchibstedGrotesk_800ExtraBold.ttf (unitsPerEm 2048), não estimadas: a conta
 * antiga usava 0,72em da Archivo Black, que nem está mais empacotada. Os dígitos
 * são proporcionais — o "1" tem 0,429em e o "0" 0,640em —, então a largura soma
 * dígito a dígito.
 *
 * Exceção declarada à regra 25 (o tamanho do desenho é piso): o numeral de
 * exibição é o ÚNICO texto que encolhe, porque quebrar "100" em duas linhas
 * destruiria o dado. O número continua dito por inteiro no rótulo acessível e na
 * cap acima dele, que crescem sem teto.
 */
const DIGIT_EM: Record<string, number> = {
  '0': 0.64,
  '1': 0.429,
  '2': 0.606,
  '3': 0.614,
  '4': 0.645,
  '5': 0.631,
  '6': 0.624,
  '7': 0.583,
  '8': 0.626,
  '9': 0.626,
};

/** Teto de escala do numeral: acompanha a fonte do sistema até 1,2×, como já fazia. */
export const NUMERAL_MAX_SCALE = 1.2;

export type NumeralSpec = { size: number; lineHeight: number; letterSpacing: number };

/** E3: 180 / 160 / −10. E4: 150 / 136 / −8. */
export const MILESTONE_NUMERAL: NumeralSpec = { size: 180, lineHeight: 160, letterSpacing: -10 };
export const ARRIVAL_NUMERAL: NumeralSpec = { size: 150, lineHeight: 136, letterSpacing: -8 };

/** Largura prevista do numeral, em pt, para um tamanho de fonte dado. */
export function numeralWidth(text: string, size: number, spec: NumeralSpec): number {
  const advance = [...text].reduce((sum, ch) => sum + (DIGIT_EM[ch] ?? 0.65), 0);
  // Tracking negativo: contar n−1 intervalos (e não n) dá a estimativa mais larga,
  // isto é, a segura.
  const tracking = (spec.letterSpacing / spec.size) * Math.max(0, text.length - 1);
  return size * (advance + tracking);
}

/**
 * Tamanho BASE do numeral (antes do multiplicador de fonte do sistema). Com
 * fonte padrão num telefone de 390pt, é exatamente o do desenho.
 */
export function numeralSize(
  text: string,
  spec: NumeralSpec,
  { width, gutter, fontScale }: { width: number; gutter: number; fontScale: number },
): NumeralSpec {
  const textScale = Math.min(Math.max(fontScale, 1), NUMERAL_MAX_SCALE);
  const available = Math.max(200, width - gutter * 2) / textScale;
  const perPoint = numeralWidth(text, 1, spec);
  const size = Math.floor(Math.min(spec.size, available / perPoint));
  const ratio = size / spec.size;
  return {
    size,
    lineHeight: Math.round(spec.lineHeight * ratio),
    letterSpacing: Math.round(spec.letterSpacing * ratio * 10) / 10,
  };
}
