import { Platform } from 'react-native';

/**
 * ESCOLHA DA VOZ — e o portão de privacidade da prova de conceito.
 *
 * O app promete que o que a pessoa escreve não sai do aparelho. Falar a Bíblia
 * em voz alta não envia nada do usuário — o texto é Escritura pública, embutida
 * no app —, mas parte das vozes de navegador NÃO é local: elas mandam o texto
 * para o servidor de quem fornece a voz. Mesmo sendo texto público, isso é
 * tráfego de rede que o produto hoje não faz, e não vamos começar a fazer sem
 * decisão consciente.
 *
 * Por isso a regra desta POC é dura: SÓ voz local. Sem voz local em português,
 * o botão não aparece. Nunca "cai" para voz remota em silêncio.
 *
 * COMO SABEMOS QUE A VOZ É LOCAL
 * ------------------------------
 * `SpeechSynthesisVoice.localService`, do padrão Web Speech API: `true` quando a
 * síntese roda no próprio aparelho, `false` quando depende de servidor. É o
 * navegador que responde, não nós que adivinhamos pelo nome.
 *
 * Duas cautelas deliberadas:
 *  - tratamos `undefined` como NÃO-local. Um navegador que não informa não é um
 *    navegador que garante;
 *  - não inferimos nada pelo nome da voz. "Google" ou "Microsoft" no nome não
 *    dizem onde a síntese acontece.
 */

export type VozLocal = {
  /** O nome que o sistema dá. Só para mostrar e para a pessoa escolher. */
  nome: string;
  lang: string;
  /** O objeto que o navegador quer de volta na hora de falar. */
  voz: SpeechSynthesisVoice;
  /** Quanto esta voz promete soar natural (ver `pontuar`). Maior é melhor. */
  pontos: number;
};

/** A API existe nesta plataforma? Só web, nesta POC. */
export function sinteseDisponivel(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { speechSynthesis?: unknown }).speechSynthesis !== 'undefined'
  );
}

/**
 * A voz é local? Esta é a única pergunta que decide se o botão existe.
 *
 * `localService !== true` cobre tanto `false` (voz de servidor, declarada) quanto
 * `undefined` (navegador que não sabe dizer). Nos dois casos, fora.
 */
export function ehLocal(voz: SpeechSynthesisVoice): boolean {
  return voz.localService === true;
}

const PT = /^pt(-|_|$)/i;
const PT_BR = /^pt(-|_)br$/i;

/**
 * Nota de qualidade da voz, por MARCADORES DE TIER, nunca por nome de voz
 * específica: "natural", "neural", "enhanced" e "premium" são como os sistemas
 * rotulam as vozes de síntese nova, e "compact" é como a Apple marca a antiga e
 * mais robótica. Assim a escolha funciona num aparelho que nunca vimos.
 *
 * pt-BR vale mais que pt-PT: o sotaque importa para quem vai ouvir.
 */
/**
 * Vozes que o fundador ouviu e aprovou na comparação de 23/09/2026.
 * Desempate, nunca exigência: o app não depende de nenhuma delas existir.
 */
const APROVADAS = /\bdaniel\b/;

/**
 * VOZ MASCULINA, E SÓ ELA — decisão do fundador, 24/09/2026.
 *
 * Motivo dele, e é de produto: as vozes femininas disponíveis ficam
 * inutilizáveis nas velocidades altas, e o app oferece até 2x. A masculina
 * aguenta.
 *
 * É FILTRO, e não preferência: sem voz masculina reconhecida, o app prefere NÃO
 * TER ÁUDIO a ter um áudio inconsistente. A primeira versão desta regra caía
 * para a feminina quando não havia masculina; o fundador corrigiu no mesmo dia.
 * "Se o áudio aparecer, que seja voz masculina" vale mais que "que apareça".
 *
 * O PROBLEMA: a Web Speech API NÃO informa o sexo da voz. Não existe campo.
 * Então só dá para ler os sinais que os sistemas realmente deixam no nome:
 *
 *  - Android/Chrome: os identificadores trazem "#male_1-local" / "#female_2-local".
 *    É o sinal mais confiável que existe, e vem do próprio motor;
 *  - as palavras "male"/"masculino" e "female"/"feminino", quando aparecem;
 *  - por último, os nomes próprios que já vimos nestes aparelhos. Lista curta e
 *    assumidamente incompleta: existe para não errar no que conhecemos, não
 *    para cobrir o mundo.
 *
 * O que não se encaixa em nada disso fica DESCONHECIDO, e desconhecido FICA DE
 * FORA. Não se supõe masculino por não saber: uma voz genérica de Android pode
 * ser feminina, e aí o app entregaria justamente o que a decisão evita. Voz
 * genérica só entra depois de alguém identificá-la num aparelho de verdade e
 * acrescentar o sinal aqui.
 */
export type Sexo = 'masculina' | 'feminina' | 'desconhecida';

export function sexoDaVoz(nome: string): Sexo {
  // 1. O marcador do próprio motor (Android). Vem antes de qualquer nome.
  if (/#male[_\d]/.test(nome)) return 'masculina';
  if (/#female[_\d]/.test(nome)) return 'feminina';
  // 2. A palavra, quando o sistema a escreve.
  if (/\b(male|masculin[oa])\b/.test(nome)) return 'masculina';
  if (/\b(female|feminin[oa])\b/.test(nome)) return 'feminina';
  // 3. Nomes próprios já observados. Incompleto de propósito.
  if (/\b(daniel|felipe|ricardo|joaquim|duarte|eddy)\b/.test(nome)) return 'masculina';
  if (/\b(maria|luciana|joana|francisca|fernanda|catarina|ines|helena)\b/.test(nome)) return 'feminina';
  return 'desconhecida';
}

/**
 * Nota da voz, entre as que JÁ passaram pelo filtro (local, português,
 * masculina). A ordem das parcelas é a ordem das prioridades:
 *
 *   idioma (100) > camada de qualidade (40/30/20) > gosto aprovado (10)
 *
 * O sexo não pontua aqui porque já não há o que decidir: o que chegou a esta
 * função é masculino.
 *
 * Tier por MARCADOR, nunca por nome: "natural", "neural", "enhanced" e "premium"
 * são como os sistemas rotulam a síntese nova, e "compact" é como a Apple marca
 * a antiga e mais robótica. Assim a escolha funciona num aparelho que nunca vimos.
 *
 * pt-BR vale mais que pt-PT: o sotaque importa para quem vai ouvir.
 */
function pontuar(voz: SpeechSynthesisVoice): number {
  const nome = voz.name.toLowerCase();
  let pontos = 0;
  if (PT_BR.test(voz.lang)) pontos += 100;
  if (/neural|natural/.test(nome)) pontos += 40;
  if (/enhanced|premium|eloquence/.test(nome)) pontos += 30;
  if (/siri/.test(nome)) pontos += 20;
  if (APROVADAS.test(nome)) pontos += 10;
  if (voz.default) pontos += 5;
  // A Apple chama de "Compact" a voz antiga, baixada por padrão: funciona, mas
  // é a mais robótica das disponíveis. Fica por último entre as locais.
  if (/compact/.test(nome)) pontos -= 30;
  return pontos;
}

/**
 * ÚLTIMO RECURSO: as vozes femininas nomeadas, e SÓ elas, na ordem exata.
 *
 * Não é "qualquer feminina". É esta lista, escrita à mão, porque cada nome
 * entrou por um motivo verificado num aparelho de verdade:
 *
 *  - Luciana é a única voz de pt-BR que o Safari do iPhone expõe;
 *  - Joana é pt-PT, sotaque de Portugal, e por isso vem depois.
 *
 * A Maria do Windows NÃO está aqui de propósito: naquele aparelho existe o
 * Daniel, e o recurso nunca precisa cair para ela.
 */
const ULTIMO_RECURSO = [/\bluciana\b/, /\bjoana\b/];

/**
 * As vozes que este app aceita usar, da melhor para a pior.
 *
 * DUAS EXIGÊNCIAS INEGOCIÁVEIS, antes de qualquer preferência:
 *
 *   1. em português;
 *   2. que rodem NO APARELHO. Privacidade: nada de texto indo para servidor,
 *      e não existe caminho para voz remota em lugar nenhum deste arquivo.
 *
 * DEPOIS, a ordem de escolha (decisão do fundador, 24/09/2026, revista em
 * 25/09 diante do resultado no iPhone dele):
 *
 *   a. voz MASCULINA reconhecida, pt-BR ou pt-PT. É a preferência, e continua
 *      valendo em todo aparelho que tenha uma — Daniel no Windows, a voz com
 *      marcador `#male_` no Android;
 *   b. não havendo NENHUMA masculina, as nomeadas em `ULTIMO_RECURSO`, nessa
 *      ordem: Luciana e depois Joana.
 *
 * POR QUE O DEGRAU (b) EXISTE: no iPhone a Apple não tem voz masculina de
 * português — nem pré-instalada, nem para baixar —, e o Safari sequer entrega
 * voz baixada ao Web Speech. A regra "masculina ou nada" deixava o iPhone
 * inteiro sem áudio, e o fundador preferiu a Luciana a não ter o recurso.
 *
 * POR QUE POR NOME, E NÃO POR "É IPHONE": a alternativa era farejar o
 * user-agent, que erra (o iPad se declara Mac) e envelhece mal. Luciana e
 * Joana são vozes da Apple: elas só existem onde a Apple está. Checar o nome
 * dá o mesmo resultado sem adivinhar aparelho — e mantém a promessa de que
 * nenhuma voz entra sem alguém ter dito o nome dela.
 *
 * Lista vazia continua significando o que sempre significou: o app não fala
 * neste aparelho, o player não é desenhado, e o leitor fica como sempre foi.
 */
export function vozesLocaisPt(): VozLocal[] {
  return escolherVozes(vozesPtLocaisTodas());
}

/**
 * A regra de escolha, separada do navegador para poder ser testada com listas
 * de mentira. Recebe as vozes que já passaram por "português + local".
 */
export function escolherVozes(todas: readonly VozLocal[]): VozLocal[] {
  const masculinas = todas.filter((v) => sexoDaVoz(v.nome.toLowerCase()) === 'masculina');
  if (masculinas.length > 0) return masculinas;

  // Sem nenhuma masculina. A ordem aqui é a de `ULTIMO_RECURSO`, e não a da
  // pontuação: quem manda no degrau (b) é a preferência escrita, não a nota.
  const escolhidas: VozLocal[] = [];
  for (const nomeada of ULTIMO_RECURSO) {
    const achada = todas.find((v) => nomeada.test(v.nome.toLowerCase()));
    if (achada) escolhidas.push(achada);
  }
  return escolhidas;
}

/**
 * TODAS as vozes de português que rodam no aparelho, sem olhar o sexo. É a base
 * de `vozesLocaisPt`, e existe separada para as duas exigências ficarem
 * legíveis: primeiro "português e local", depois "masculina".
 *
 * Não é exportada: o produto usa a lista filtrada, e só ela. Já foi pública
 * para alimentar telas de diagnóstico; elas saíram, e a porta fechou junto.
 */
function vozesPtLocaisTodas(): VozLocal[] {
  if (!sinteseDisponivel()) return [];
  let todas: SpeechSynthesisVoice[] = [];
  try {
    todas = globalThis.speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
  return todas
    .filter((v) => PT.test(v.lang) && ehLocal(v))
    .map((voz) => ({ nome: voz.name, lang: voz.lang, voz, pontos: pontuar(voz) }))
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome));
}

/**
 * OBSERVA a lista de vozes enquanto a tela viver, em vez de perguntar uma vez.
 *
 * A primeira versão disto era uma promessa de tiro único: resolvia no primeiro
 * `voiceschanged` ou desistia em 3 s. Ela ESCONDIA O PLAYER PARA SEMPRE em dois
 * casos comuns, e foi o defeito relatado pelo fundador em 24/09/2026:
 *
 *  1. o `voiceschanged` dispara MAIS DE UMA VEZ, e a primeira lista pode vir
 *     vazia ou incompleta. O tiro único acreditava na primeira;
 *  2. em alguns navegadores o evento não dispara nunca — a lista só aparece
 *     depois de `getVoices()` ser chamado algumas vezes —, e aí vencia o
 *     tempo limite, com a lista ainda vazia.
 *
 * Agora: a assinatura fica de pé, e a consulta se repete em intervalos que
 * crescem. Qualquer chegada tardia acende o recurso; nada decide "não tem" para
 * sempre.
 */
/** Momentos de nova tentativa, em ms. Curtos no começo, esparsos depois. */
const RETENTATIVAS_MS = [0, 250, 600, 1200, 2500, 5000, 9000];

export function observarVozes(aoMudar: (vozes: VozLocal[]) => void): () => void {
  if (!sinteseDisponivel()) {
    aoMudar([]);
    return () => {};
  }

  let vivo = true;
  // Sempre a lista do PRODUTO. Houve um parâmetro aqui para as telas de
  // diagnóstico observarem a lista sem filtro de sexo; elas saíram, e ele foi
  // junto — um jeito de observar vozes que o produto não usa é um jeito de
  // acidentalmente falar com uma voz que a regra recusa.
  const avisar = () => {
    if (vivo) aoMudar(vozesLocaisPt());
  };

  // A assinatura NÃO é removida depois do primeiro aviso: o evento dispara mais
  // de uma vez, e a lista boa costuma ser a segunda.
  globalThis.speechSynthesis.addEventListener?.('voiceschanged', avisar);

  // Consultar é o gatilho em alguns navegadores, e a rede de segurança nos que
  // nunca disparam o evento. Por isso a consulta repetida, e não um só timeout.
  const timers = RETENTATIVAS_MS.map((ms) => setTimeout(avisar, ms));

  return () => {
    vivo = false;
    timers.forEach(clearTimeout);
    globalThis.speechSynthesis.removeEventListener?.('voiceschanged', avisar);
  };
}

/** Quanto tempo depois da abertura ainda é cedo para dizer "não há voz". */
export const ESPERA_MAXIMA_MS = RETENTATIVAS_MS[RETENTATIVAS_MS.length - 1] + 1000;

