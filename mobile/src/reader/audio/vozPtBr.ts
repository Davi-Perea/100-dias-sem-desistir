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
 * VOZ MASCULINA — decisão do fundador, 24/09/2026.
 *
 * Motivo dele, e é de produto: as vozes femininas disponíveis ficam
 * inutilizáveis nas velocidades altas, e o app oferece até 2x. A masculina
 * aguenta. Não havendo masculina, é melhor uma feminina do que recurso nenhum
 * (a regra 3 do pedido) — por isso isto é PONTUAÇÃO, e não filtro.
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
 * O que não se encaixa em nada disso fica DESCONHECIDO — e desconhecido vale
 * mais que feminino conhecido, porque pode muito bem ser masculino. Chutar
 * "feminino" por não saber tiraria vozes boas da disputa sem motivo.
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
 * Nota da voz. A ordem das parcelas É a ordem das prioridades:
 *
 *   idioma (100) > sexo (60) > camada de qualidade (40/30/20) > gosto (10)
 *
 * O sexo vale MAIS que a camada de propósito: uma masculina simples é melhor
 * para este produto que uma feminina neural, porque é a que sobrevive ao 2x.
 * Foi a decisão do fundador, e a pontuação tem de dizer a mesma coisa.
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
  const sexo = sexoDaVoz(nome);
  if (sexo === 'masculina') pontos += 60;
  // Desconhecida fica no meio: pode ser masculina, e não há por que descartá-la.
  else if (sexo === 'desconhecida') pontos += 20;
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
 * As vozes em português que rodam NO APARELHO, da melhor para a pior.
 *
 * Lista vazia significa uma coisa só, e é a que interessa: esta POC não pode
 * falar aqui.
 */
export function vozesLocaisPt(): VozLocal[] {
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

/** Diagnóstico da POC: o que este aparelho tem, local ou não. Só para o relatório. */
export function diagnosticoDeVozes(): { total: number; pt: number; ptLocais: number; naoLocais: string[] } {
  if (!sinteseDisponivel()) return { total: 0, pt: 0, ptLocais: 0, naoLocais: [] };
  const todas = globalThis.speechSynthesis.getVoices() ?? [];
  const pt = todas.filter((v) => PT.test(v.lang));
  return {
    total: todas.length,
    pt: pt.length,
    ptLocais: pt.filter(ehLocal).length,
    naoLocais: pt.filter((v) => !ehLocal(v)).map((v) => `${v.name} (${v.lang})`),
  };
}
