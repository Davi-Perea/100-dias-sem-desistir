/**
 * DEV FIXTURE — NOT PRODUCTION CONTENT.
 * Frases neutras escritas para este projeto, só para avaliar tipografia, rolagem e
 * conforto de leitura. Nenhuma tradução bíblica é reproduzida.
 */
export type PlaceholderVerse = { verse: number; text: string };

const SENTENCES = [
  'Este é um texto de exemplo usado durante o desenvolvimento do aplicativo.',
  'Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida.',
  'O objetivo aqui é avaliar tipografia, espaçamento e conforto de leitura no celular.',
  'Cada parágrafo simula um versículo, com o número em destaque à esquerda.',
  'O tamanho da fonte pode ser ajustado pelo leitor e é lembrado entre sessões.',
  'Parágrafos mais longos ajudam a testar a quebra de linha em telas estreitas e largas.',
  'A leitura funciona sem conexão, porque este conteúdo de exemplo vive no aparelho.',
  'Concluir o dia grava o progresso localmente, sem depender de servidor.',
  'Quando a tradução licenciada chegar, apenas o provider muda; a tela permanece.',
  'Este aviso existe para que ninguém confunda o exemplo com conteúdo real.',
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function devPlaceholderVerses(book: string, chapter: number): PlaceholderVerse[] {
  const seed = hash(`${book}-${chapter}`);
  const count = 8 + (seed % 12);
  return Array.from({ length: count }, (_, i) => {
    const a = SENTENCES[(i + chapter) % SENTENCES.length];
    const b = SENTENCES[(i * 3 + seed) % SENTENCES.length];
    return { verse: i + 1, text: `${a} ${b}` };
  });
}
