import { useCallback, useEffect, useRef, useState } from 'react';

import { aguardarVozes, sinteseDisponivel, type VozLocal } from './vozPtBr';

/**
 * OUVIR O CAPÍTULO — prova de conceito (23/09/2026).
 *
 * Fala o texto da Bíblia Livre que JÁ está na tela, versículo por versículo, com
 * a voz do próprio aparelho. Nada é gerado, gravado, armazenado ou enviado.
 *
 * POR QUE VERSÍCULO A VERSÍCULO, e não o capítulo inteiro numa string:
 *
 *  1. `maxSpeechInputLength` existe: capítulo inteiro estoura em muitos motores;
 *  2. o Chrome interrompe falas longas por conta própria depois de alguns
 *     segundos. Frases curtas passam longe desse defeito;
 *  3. é o que dá o índice do versículo atual — sem timestamp nenhum. É ele que
 *     faz "Continuar" voltar ao lugar certo, e é o que um dia permitirá destacar
 *     o versículo que está sendo lido (fora do escopo desta POC).
 *
 * POR QUE "PAUSAR" É SEMPRE PARAR-E-LEMBRAR:
 *
 * `pause()`/`resume()` da Web Speech API existem no iOS e no desktop, mas no
 * Chrome do Android são notoriamente inertes — chamar `pause()` e continuar
 * ouvindo a frase é o comportamento mais comum. Em vez de ramificar por
 * plataforma (e entregar um botão que funciona num celular e mente no outro),
 * a POC usa UM caminho só: pausar cancela a fala e guarda o índice; continuar
 * recomeça DAQUELE versículo.
 *
 * O preço é honesto e pequeno: continuar repete o versículo em curso desde o
 * começo, em vez de retomar no meio da frase. O ganho é comportamento idêntico
 * em todo lugar — que foi o que o fundador pediu.
 *
 * O QUE NUNCA É FALADO: só entra aqui o texto bíblico que a tela recebeu. Nem
 * reflexão, nem jejum, nem anotação, nem marcação, nem nada escrito pela pessoa.
 * A função recebe `string[]` de versículos e não tem acesso a mais nada.
 */

export type EstadoDaLeitura = 'indisponivel' | 'carregando' | 'parado' | 'tocando' | 'pausado';

export type Leitura = {
  estado: EstadoDaLeitura;
  /** Índice (base 0) do versículo em curso ou onde a leitura parou. */
  versiculoAtual: number;
  /** Vozes locais em português encontradas neste aparelho, da melhor para a pior. */
  vozes: VozLocal[];
  vozEscolhida: VozLocal | null;
  escolherVoz: (nome: string) => void;
  tocar: () => void;
  pausar: () => void;
  continuar: () => void;
  parar: () => void;
};

export function useOuvirCapitulo(versiculos: readonly string[], chaveDoCapitulo: string): Leitura {
  const [estado, setEstado] = useState<EstadoDaLeitura>(sinteseDisponivel() ? 'carregando' : 'indisponivel');
  const [vozes, setVozes] = useState<VozLocal[]>([]);
  const [nomeEscolhido, setNomeEscolhido] = useState<string | null>(null);
  const [versiculoAtual, setVersiculoAtual] = useState(0);

  /**
   * O índice também vive numa ref porque quem avança a leitura é a callback
   * `onend` de uma fala já em curso: ela não enxerga o estado do React daquele
   * render, e leria um número velho.
   */
  const indice = useRef(0);
  /**
   * GERAÇÃO DA LEITURA — o que impede uma fala velha de mexer no estado novo.
   *
   * `speechSynthesis.cancel()` ainda dispara `onend`/`onerror` da fala que estava
   * em curso, e esses eventos chegam DEPOIS, num momento que não controlamos. A
   * primeira versão usava um booleano solto com `setTimeout` para ignorá-los, e
   * ele perdia a corrida: ao pausar, o `onerror` atrasado do cancelamento
   * derrubava o estado para "parado" e o botão voltava a "Ouvir capítulo",
   * perdendo o lugar (defeito observado no rascunho, 23/09/2026).
   *
   * Agora cada corrida de leitura tem um número. Toda callback guarda o número
   * da sua corrida e só age se ele ainda for o atual. Cancelar é incrementar:
   * tudo o que estava pendente vira passado, sem depender de tempo nenhum.
   */
  const geracao = useRef(0);
  const versiculosRef = useRef(versiculos);
  const vozRef = useRef<SpeechSynthesisVoice | null>(null);

  /* ------------------------------------------------------------ as vozes */

  useEffect(() => {
    // Sem a API, o estado inicial já nasceu 'indisponivel': nada a fazer.
    if (!sinteseDisponivel()) return;
    let vivo = true;
    aguardarVozes().then((encontradas) => {
      if (!vivo) return;
      setVozes(encontradas);
      // Sem voz LOCAL em português, o recurso simplesmente não existe aqui.
      // Não há caminho alternativo para voz remota, de propósito.
      setEstado(encontradas.length > 0 ? 'parado' : 'indisponivel');
    });
    return () => {
      vivo = false;
    };
  }, []);

  const vozEscolhida = vozes.find((v) => v.nome === nomeEscolhido) ?? vozes[0] ?? null;

  /**
   * As duas refs acompanham o que veio por props/estado. Ficam em efeito, e não
   * no corpo do render, porque escrever ref durante o render é justamente o que
   * quebra quando o React repete a renderização.
   *
   * Quem lê estas refs é a callback `onend` de uma fala já em curso: ela não
   * enxerga o render atual, então precisa deste espelho.
   */
  useEffect(() => {
    versiculosRef.current = versiculos;
  }, [versiculos]);

  useEffect(() => {
    vozRef.current = vozEscolhida?.voz ?? null;
  }, [vozEscolhida]);

  /* -------------------------------------------------------------- falar */

  /** Cala a fala e aposenta tudo o que estava pendente. Não mexe no estado. */
  const cancelar = useCallback(() => {
    geracao.current += 1;
    try {
      globalThis.speechSynthesis?.cancel();
    } catch {
      // Navegador sem síntese ou já descarregado: não há o que cancelar.
    }
  }, []);

  const falarDe = useCallback(
    (inicio: number) => {
      const lista = versiculosRef.current;
      const voz = vozRef.current;
      if (!voz || inicio >= lista.length) {
        setEstado('parado');
        indice.current = 0;
        setVersiculoAtual(0);
        return;
      }

      // Esta corrida. Qualquer cancelamento posterior torna o número obsoleto, e
      // as callbacks abaixo passam a não fazer nada.
      const minhaGeracao = ++geracao.current;
      const atual = () => geracao.current === minhaGeracao;

      const dizer = (i: number) => {
        const texto = lista[i];
        if (typeof texto !== 'string' || texto.trim().length === 0) {
          // Versículo vazio não trava a fila: pula para o próximo.
          seguir(i);
          return;
        }
        const fala = new SpeechSynthesisUtterance(texto);
        fala.voice = voz;
        fala.lang = voz.lang;
        fala.onend = () => seguir(i);
        fala.onerror = () => {
          // Um erro de motor não pode deixar o botão preso em "tocando" — mas o
          // "erro" que o cancelamento gera pertence a uma corrida já encerrada.
          if (atual()) setEstado('parado');
        };
        globalThis.speechSynthesis.speak(fala);
      };

      const seguir = (i: number) => {
        if (!atual()) return;
        const proximo = i + 1;
        if (proximo >= lista.length) {
          indice.current = 0;
          setVersiculoAtual(0);
          setEstado('parado');
          return;
        }
        indice.current = proximo;
        setVersiculoAtual(proximo);
        dizer(proximo);
      };

      indice.current = inicio;
      setVersiculoAtual(inicio);
      setEstado('tocando');
      dizer(inicio);
    },
    [],
  );

  /* ------------------------------------------------------------ comandos */

  const tocar = useCallback(() => {
    if (!vozRef.current) return;
    cancelar();
    // O cancel() do Chrome e o speak() seguinte no MESMO tique se atropelam e a
    // fala não sai. Um tique de folga resolve, e é imperceptível.
    setTimeout(() => falarDe(0), 0);
  }, [cancelar, falarDe]);

  const pausar = useCallback(() => {
    cancelar();
    setEstado('pausado');
    // `indice.current` fica onde está: é ele que "Continuar" vai usar.
  }, [cancelar]);

  const continuar = useCallback(() => {
    if (!vozRef.current) return;
    cancelar();
    setTimeout(() => falarDe(indice.current), 0);
  }, [cancelar, falarDe]);

  const parar = useCallback(() => {
    cancelar();
    indice.current = 0;
    setVersiculoAtual(0);
    setEstado((atual) => (atual === 'indisponivel' || atual === 'carregando' ? atual : 'parado'));
  }, [cancelar]);

  /* --------------------------------------------- silêncio ao sair ou trocar */

  /**
   * Trocar de capítulo ou sair do leitor CALA a fala. Sem isto, a voz seguiria
   * lendo Gênesis 1 por cima de outra tela — que é o defeito mais óbvio que uma
   * leitura em voz alta pode ter.
   *
   * Depende de `chaveDoCapitulo` de propósito: ela muda quando o capítulo muda,
   * e a limpeza do efeito roda tanto na troca quanto ao desmontar.
   */
  useEffect(() => {
    return () => {
      geracao.current += 1;
      try {
        globalThis.speechSynthesis?.cancel();
      } catch {
        // Nada a cancelar.
      }
    };
  }, [chaveDoCapitulo]);

  const escolherVoz = useCallback(
    (nome: string) => {
      // Trocar de voz no meio da leitura interrompe: o motor é outro.
      cancelar();
      indice.current = 0;
      setVersiculoAtual(0);
      setNomeEscolhido(nome);
      setEstado((atual) => (atual === 'indisponivel' || atual === 'carregando' ? atual : 'parado'));
    },
    [cancelar],
  );

  return {
    estado,
    versiculoAtual,
    vozes,
    vozEscolhida,
    escolherVoz,
    tocar,
    pausar,
    continuar,
    parar,
  };
}
