/**
 * Número por extenso em pt-BR (0 a 999), masculino — "dias" e "passos" são
 * masculinos. Existe porque o desenho escreve contagens por extenso ("Três dias
 * ficaram para trás", "Oitenta e três dias na Palavra", "Cinco passos") e o
 * número tem de ser o real, nunca o do mock.
 */
const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

export function extenso(value: number): string {
  const n = Math.trunc(value);
  if (n < 0 || n > 999) return String(n);
  if (n < 20) return UNITS[n];
  if (n === 100) return 'cem';
  if (n < 100) {
    const unit = n % 10;
    return unit === 0 ? TENS[Math.floor(n / 10)] : `${TENS[Math.floor(n / 10)]} e ${UNITS[unit]}`;
  }
  const rest = n % 100;
  const head = HUNDREDS[Math.floor(n / 100)];
  return rest === 0 ? (n === 100 ? 'cem' : head) : `${head} e ${extenso(rest)}`;
}

/** Primeira letra em maiúscula: "Oitenta e três". */
export function extensoCap(value: number): string {
  const text = extenso(value);
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}
