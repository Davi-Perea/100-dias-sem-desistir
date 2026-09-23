/**
 * O TEXTO QUE A VOZ RECEBE — nunca o que a tela mostra.
 *
 * A tela continua exibindo o texto da Bíblia Livre exatamente como ele é. Isto
 * aqui é uma representação PARALELA, só para a síntese de voz, porque o que se
 * lê bem com os olhos nem sempre se lê bem em voz alta.
 *
 * REGRA INVIOLÁVEL: nada de reescrever Escritura. Nenhuma palavra é trocada,
 * acrescentada, removida ou reordenada. O que muda é só PONTUAÇÃO e ESPAÇO —
 * sinais que o motor de voz usa para decidir entonação e pausa. Se algum dia
 * alguém precisar mexer aqui, a pergunta é: "isto muda o que está escrito?".
 * Se a resposta for sim, não entra.
 *
 * Por que isto importa (achado da auditoria de 23/09/2026): a maior parte do som
 * "robótico" do primeiro teste NÃO vinha da voz. Vinha de pontuação que o motor
 * interpreta mal e de fragmentação artificial do texto.
 */

/**
 * Ponto e vírgula é o pior sinal para uma voz sintética em português: os motores
 * o tratam como vírgula curta, e o texto de Almeida o usa onde a fala pediria
 * uma parada de frase. "Haja luz; e houve luz" sai emendado, sem o peso.
 *
 * Vira ponto final. A frase não muda; o fôlego, sim.
 */
function pontoEVirgulaViraParada(texto: string): string {
  return texto.replace(/;\s*/g, '. ');
}

/**
 * Dois-pontos antes de fala direta ("E disse Deus: Haja luz") também é lido
 * corrido. Vira ponto final pelo mesmo motivo: separa quem fala do que é dito.
 *
 * Dois-pontos em outras funções (listas, números) são raros no corpo bíblico e
 * se beneficiam da mesma parada.
 */
function doisPontosViramParada(texto: string): string {
  return texto.replace(/:\s*/g, '. ');
}

/**
 * Aspas e travessões viram espaço. O motor não muda de voz para citações — ele
 * só tropeça nos sinais, e alguns chegam a soletrar ("aspas"). Tirar os sinais
 * não tira a citação: ela continua no texto falado, com a mesma pontuação
 * interna de frase.
 */
function tiraSinaisQueTropecam(texto: string): string {
  return texto
    .replace(/[“”"«»]/g, ' ')
    .replace(/[—–]/g, ', ')
    // Apóstrofo tipográfico vira o reto: alguns motores leem o tipográfico como
    // caractere desconhecido.
    .replace(/[’]/g, "'");
}

/**
 * SENHOR em versalete é o Tetragrama. Em maiúsculas o motor pode soletrar
 * (S-E-N-H-O-R) ou mudar a ênfase. Vira "Senhor", que é como se lê em voz alta.
 * A palavra é a mesma.
 */
function versaleteViraPalavra(texto: string): string {
  return texto.replace(/\bSENHOR\b/g, 'Senhor').replace(/\bDEUS\b/g, 'Deus');
}

/** Espaço repetido e espaço antes de pontuação confundem a prosódia. */
function arruma(texto: string): string {
  return texto
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.{2,}/g, '.')
    .trim();
}

/** Garante que o trecho termine com parada: sem isso o motor emenda no seguinte. */
function terminaEmParada(texto: string): string {
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

/**
 * O texto de UM versículo, pronto para falar.
 *
 * O número do versículo NÃO é falado. Ouvir "um", "dois", "três" a cada frase
 * quebra a leitura — o número é ajuda visual, e na tela ele continua lá.
 */
export function versiculoParaFala(texto: string): string {
  let t = texto;
  t = tiraSinaisQueTropecam(t);
  t = versaleteViraPalavra(t);
  t = pontoEVirgulaViraParada(t);
  t = doisPontosViramParada(t);
  t = arruma(t);
  return terminaEmParada(t);
}

/* ------------------------------------------------------------ agrupamento */

export type Trecho = {
  /** O que a voz vai dizer. */
  texto: string;
  /** Índice (base 0) do PRIMEIRO versículo deste trecho — é o que o botão "Continuar" usa. */
  primeiroVersiculo: number;
};

/**
 * Como os versículos viram trechos de fala.
 *
 * O primeiro teste falava UM VERSÍCULO POR VEZ, e essa foi a maior causa do som
 * ruim: cada fala nova começa com o motor "do zero", com entonação de início de
 * frase e um silêncio de borda que não dá para desligar. Versículo curto vira
 * frase solta, e o capítulo inteiro soa picado.
 *
 * Agrupar resolve a prosódia, mas um trecho grande demais estraga o "Continuar"
 * (voltaria muito atrás) e esbarra no limite de tamanho dos motores.
 *
 * O compromisso: juntar versículos até chegar perto de `alvoDeCaracteres`, sem
 * nunca partir um versículo ao meio. Assim a frase flui, e o "Continuar" volta
 * no máximo ao começo do grupo — poucos segundos, não um capítulo.
 */
export function agrupar(versiculos: readonly string[], alvoDeCaracteres = 320): Trecho[] {
  const trechos: Trecho[] = [];
  let atual: string[] = [];
  let inicio = 0;

  const fechar = () => {
    if (atual.length === 0) return;
    trechos.push({ texto: atual.join(' '), primeiroVersiculo: inicio });
    atual = [];
  };

  versiculos.forEach((bruto, i) => {
    const falado = versiculoParaFala(bruto);
    if (falado.length === 0) return;
    if (atual.length === 0) inicio = i;
    atual.push(falado);
    // Fecha ao ALCANÇAR o alvo, nunca no meio de um versículo.
    if (atual.join(' ').length >= alvoDeCaracteres) fechar();
  });
  fechar();
  return trechos;
}

/**
 * Um trecho por FRASE. Alternativa testada na comparação: dá a prosódia mais
 * natural de todas, mas multiplica o número de falas — e cada borda de fala
 * custa um silêncio. Fica aqui porque a medição pediu, e porque em capítulos de
 * versículos muito longos (profetas, epístolas) ela é a melhor opção.
 */
export function porFrase(versiculos: readonly string[]): Trecho[] {
  const trechos: Trecho[] = [];
  versiculos.forEach((bruto, i) => {
    const falado = versiculoParaFala(bruto);
    for (const frase of falado.split(/(?<=[.!?])\s+/)) {
      const limpa = frase.trim();
      if (limpa.length > 0) trechos.push({ texto: limpa, primeiroVersiculo: i });
    }
  });
  return trechos;
}
