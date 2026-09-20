/**
 * As sete áreas de influência ("montes") pelas quais a igreja intercede,
 * na ordem de rotação do guia: dia 1 = Igreja, dia 7 = Artes e Entretenimento,
 * dia 8 = Igreja de novo. A ordem é DADO do material, não regra do app: cada dia
 * traz o próprio `sphere`, e o validador só confere que a rotação não quebrou.
 */
export type Sphere =
  | 'igreja'
  | 'familia'
  | 'educacao'
  | 'governo'
  | 'economia'
  | 'midia_comunicacao'
  | 'artes_entretenimento';

export const SPHERE_ORDER: readonly Sphere[] = [
  'igreja',
  'familia',
  'educacao',
  'governo',
  'economia',
  'midia_comunicacao',
  'artes_entretenimento',
] as const;

/** Rótulos exatamente como o material da igreja escreve. */
export const SPHERE_LABEL: Record<Sphere, string> = {
  igreja: 'Igreja',
  familia: 'Família',
  educacao: 'Educação',
  governo: 'Governo',
  economia: 'Economia',
  midia_comunicacao: 'Mídia e Comunicação',
  artes_entretenimento: 'Artes e Entretenimento',
};

export function isSphere(value: unknown): value is Sphere {
  return typeof value === 'string' && (SPHERE_ORDER as readonly string[]).includes(value);
}
