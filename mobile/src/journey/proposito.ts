import propositoJson from '../../content/100-dias-2026/proposito.json';

/**
 * Texto da orientação da igreja sobre o propósito, extraído do .docx pelo
 * conversor (`scripts/convert-100-dias.mjs`). Nada aqui é reescrito: são os
 * parágrafos da igreja, na ordem da igreja.
 *
 * `public` marca as seções que fazem sentido para qualquer participante; as
 * demais são instruções a líderes e ficam fora da página "Sobre o propósito".
 */
export type PropositoBlock = { kind: 'paragraph' | 'bullet' | 'step'; text: string };

export type PropositoSection = { heading: string; public: boolean; blocks: PropositoBlock[] };

/** Um passo do fluxo da reunião das 12h30, na ordem da orientação. */
export type FlowStep = { step: number; title: string; description: string };

export type PropositoContent = {
  title: string;
  subtitle: string;
  intro: string[];
  sections: PropositoSection[];
  flow: FlowStep[];
  source: { file: string; sha256: string };
};

export const PROPOSITO: PropositoContent = propositoJson as unknown as PropositoContent;

export function publicSections(): PropositoSection[] {
  return PROPOSITO.sections.filter((s) => s.public);
}

/** Os cinco passos da reunião. O app usa a MESMA ordem em casa e no modo altar. */
export function flowSteps(): FlowStep[] {
  return PROPOSITO.flow;
}
