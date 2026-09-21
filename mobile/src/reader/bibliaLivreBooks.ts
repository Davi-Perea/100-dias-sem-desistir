/**
 * Carregadores PREGUIÇOSOS dos livros da Bíblia Livre, um por livro.
 *
 * Cada entrada é uma função com um `require` literal: o Metro precisa do caminho
 * estático para empacotar o JSON, mas o módulo só é AVALIADO quando a função é
 * chamada. Abrir o app não lê nenhum livro; abrir Gênesis 1 lê só Gênesis.
 *
 * Os JSON são gerados por `scripts/convert-biblia-livre.mjs` (nunca à mão);
 * `npm run bible:check` confere que batem com a fonte.
 */

/** Formato de content/biblia-livre/livros/<CÓDIGO>.json. */
export type BibliaLivreBook = {
  livro: string;
  nome: string;
  capitulos: {
    capitulo: number;
    /** Título do salmo (\d) ou de seção; null quando a fonte não traz. */
    titulo: string | null;
    /** Versículo n = índice n - 1 (o conversor exige numeração contígua). */
    versiculos: string[];
  }[];
};

export const BIBLIA_LIVRE_LOADERS: Record<string, () => BibliaLivreBook> = {
  GEN: () => require('../../content/biblia-livre/livros/GEN.json'),
  EXO: () => require('../../content/biblia-livre/livros/EXO.json'),
  LEV: () => require('../../content/biblia-livre/livros/LEV.json'),
  NUM: () => require('../../content/biblia-livre/livros/NUM.json'),
  DEU: () => require('../../content/biblia-livre/livros/DEU.json'),
  JOS: () => require('../../content/biblia-livre/livros/JOS.json'),
  JDG: () => require('../../content/biblia-livre/livros/JDG.json'),
  RUT: () => require('../../content/biblia-livre/livros/RUT.json'),
  '1SA': () => require('../../content/biblia-livre/livros/1SA.json'),
  '2SA': () => require('../../content/biblia-livre/livros/2SA.json'),
  '1KI': () => require('../../content/biblia-livre/livros/1KI.json'),
  '2KI': () => require('../../content/biblia-livre/livros/2KI.json'),
  '1CH': () => require('../../content/biblia-livre/livros/1CH.json'),
  '2CH': () => require('../../content/biblia-livre/livros/2CH.json'),
  EZR: () => require('../../content/biblia-livre/livros/EZR.json'),
  NEH: () => require('../../content/biblia-livre/livros/NEH.json'),
  EST: () => require('../../content/biblia-livre/livros/EST.json'),
  JOB: () => require('../../content/biblia-livre/livros/JOB.json'),
  PSA: () => require('../../content/biblia-livre/livros/PSA.json'),
  PRO: () => require('../../content/biblia-livre/livros/PRO.json'),
  ECC: () => require('../../content/biblia-livre/livros/ECC.json'),
  SNG: () => require('../../content/biblia-livre/livros/SNG.json'),
  ISA: () => require('../../content/biblia-livre/livros/ISA.json'),
  JER: () => require('../../content/biblia-livre/livros/JER.json'),
  LAM: () => require('../../content/biblia-livre/livros/LAM.json'),
  EZK: () => require('../../content/biblia-livre/livros/EZK.json'),
  DAN: () => require('../../content/biblia-livre/livros/DAN.json'),
  HOS: () => require('../../content/biblia-livre/livros/HOS.json'),
  JOL: () => require('../../content/biblia-livre/livros/JOL.json'),
  AMO: () => require('../../content/biblia-livre/livros/AMO.json'),
  OBA: () => require('../../content/biblia-livre/livros/OBA.json'),
  JON: () => require('../../content/biblia-livre/livros/JON.json'),
  MIC: () => require('../../content/biblia-livre/livros/MIC.json'),
  NAM: () => require('../../content/biblia-livre/livros/NAM.json'),
  HAB: () => require('../../content/biblia-livre/livros/HAB.json'),
  ZEP: () => require('../../content/biblia-livre/livros/ZEP.json'),
  HAG: () => require('../../content/biblia-livre/livros/HAG.json'),
  ZEC: () => require('../../content/biblia-livre/livros/ZEC.json'),
  MAL: () => require('../../content/biblia-livre/livros/MAL.json'),
  MAT: () => require('../../content/biblia-livre/livros/MAT.json'),
  MRK: () => require('../../content/biblia-livre/livros/MRK.json'),
  LUK: () => require('../../content/biblia-livre/livros/LUK.json'),
  JHN: () => require('../../content/biblia-livre/livros/JHN.json'),
  ACT: () => require('../../content/biblia-livre/livros/ACT.json'),
  ROM: () => require('../../content/biblia-livre/livros/ROM.json'),
  '1CO': () => require('../../content/biblia-livre/livros/1CO.json'),
  '2CO': () => require('../../content/biblia-livre/livros/2CO.json'),
  GAL: () => require('../../content/biblia-livre/livros/GAL.json'),
  EPH: () => require('../../content/biblia-livre/livros/EPH.json'),
  PHP: () => require('../../content/biblia-livre/livros/PHP.json'),
  COL: () => require('../../content/biblia-livre/livros/COL.json'),
  '1TH': () => require('../../content/biblia-livre/livros/1TH.json'),
  '2TH': () => require('../../content/biblia-livre/livros/2TH.json'),
  '1TI': () => require('../../content/biblia-livre/livros/1TI.json'),
  '2TI': () => require('../../content/biblia-livre/livros/2TI.json'),
  TIT: () => require('../../content/biblia-livre/livros/TIT.json'),
  PHM: () => require('../../content/biblia-livre/livros/PHM.json'),
  HEB: () => require('../../content/biblia-livre/livros/HEB.json'),
  JAS: () => require('../../content/biblia-livre/livros/JAS.json'),
  '1PE': () => require('../../content/biblia-livre/livros/1PE.json'),
  '2PE': () => require('../../content/biblia-livre/livros/2PE.json'),
  '1JN': () => require('../../content/biblia-livre/livros/1JN.json'),
  '2JN': () => require('../../content/biblia-livre/livros/2JN.json'),
  '3JN': () => require('../../content/biblia-livre/livros/3JN.json'),
  JUD: () => require('../../content/biblia-livre/livros/JUD.json'),
  REV: () => require('../../content/biblia-livre/livros/REV.json'),
};
