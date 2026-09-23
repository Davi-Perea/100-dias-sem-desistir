import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { POC_OUVIR_CAPITULO, POC_OUVIR_ENABLED, POC_OUVIR_LIVRO } from '@/config/features';
import { ALTURA, VELOCIDADE } from '@/reader/audio/ajustes';
import { agrupar, versiculoParaFala } from '@/reader/audio/textoParaFala';
import { ehLocal, sinteseDisponivel } from '@/reader/audio/vozPtBr';

/**
 * POC "Ouvir capítulo" (23/09/2026).
 *
 * O que estes testes defendem não é a funcionalidade — é o CERCO dela:
 * a POC não pode escapar para produção, e nenhuma voz remota pode receber texto
 * sem decisão consciente. O resto (a fala em si) só se prova em aparelho, e é o
 * que o fundador vai fazer.
 */

const SRC = join(__dirname, '..');
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

describe('a POC não escapa para produção', () => {
  test('nasce desligada: sem a variável de ambiente, não existe', () => {
    // Nos testes (e no build de produção) EXPO_PUBLIC_POC_OUVIR não está definida.
    expect(process.env.EXPO_PUBLIC_POC_OUVIR).not.toBe('true');
    expect(POC_OUVIR_ENABLED).toBe(false);
  });

  test('a chave é comparação estrita com "true"', () => {
    // Nada de valor "solto" ligando a POC por acidente (um "1", um "yes").
    expect(ler('config', 'features.ts')).toContain("process.env.EXPO_PUBLIC_POC_OUVIR === 'true'");
  });

  test('o escopo é Gênesis 1, e está declarado como dado', () => {
    expect(POC_OUVIR_LIVRO).toBe('GEN');
    expect(POC_OUVIR_CAPITULO).toBe(1);
  });

  test('a tela exige a chave E o capítulo certo', () => {
    const tela = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    expect(tela).toContain('POC_OUVIR_ENABLED &&');
    expect(tela).toContain('POC_OUVIR_LIVRO');
    expect(tela).toContain('POC_OUVIR_CAPITULO');
  });

  test('nenhuma outra tela ganhou o botão', () => {
    for (const tela of [['app', 'reader', '[day].tsx'], ['ui', 'biblia', 'ChapterText.tsx']]) {
      expect(ler(...tela)).not.toContain('OuvirCapitulo');
    }
  });
});

describe('só voz local', () => {
  /**
   * `localService` é a resposta do próprio navegador sobre onde a síntese roda.
   * Tratar `undefined` como local seria mandar texto para um servidor sem saber.
   */
  test('local é só quando o navegador afirma que é', () => {
    const voz = (localService: unknown) => ({ localService } as unknown as SpeechSynthesisVoice);
    expect(ehLocal(voz(true))).toBe(true);
    expect(ehLocal(voz(false))).toBe(false);
    // Navegador que não informa NÃO é navegador que garante.
    expect(ehLocal(voz(undefined))).toBe(false);
    expect(ehLocal(voz(null))).toBe(false);
    expect(ehLocal(voz('true'))).toBe(false);
  });

  test('a seleção filtra por localService, não pelo nome da voz', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    expect(fonte).toContain('ehLocal');
    expect(fonte).toContain('voz.localService === true');
    // Nome de fornecedor não diz onde a síntese acontece.
    expect(fonte).not.toMatch(/name.*includes.*(Google|Microsoft|Apple)/);
  });

  /** Nenhuma voz específica de aparelho fica escrita no código (pedido do fundador). */
  test('nenhuma voz é fixada pelo nome', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    for (const nome of ['Luciana', 'Joana', 'Maria', 'Daniel', 'Francisca', 'Fernanda']) {
      expect(fonte).not.toContain(nome);
    }
  });

  test('a nota de qualidade usa marcadores de tier, que valem em qualquer aparelho', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    for (const marcador of ['neural|natural', 'enhanced|premium', 'compact']) {
      expect(fonte).toContain(marcador);
    }
  });

  test('sem voz local, o recurso fica indisponível — não há caminho para voz remota', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain("setEstado(encontradas.length > 0 ? 'parado' : 'indisponivel')");
    // O portão mora na TELA: sem voz local, `ouvir` é null, o player não é
    // desenhado e o rodapé normal do leitor fica. Nem botão desligado, nem aviso.
    const tela = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    expect(tela).toContain("leitura.estado !== 'indisponivel'");
    expect(tela).toContain('{ouvir ? (');
    expect(tela).toContain('<ReaderFooter');
  });

  test('em plataforma sem Web Speech API a síntese é declarada indisponível', () => {
    // A suíte roda como app nativo, onde esta POC (que é só web) não existe.
    expect(sinteseDisponivel()).toBe(false);
  });
});

describe('só o texto da Bíblia é falado', () => {
  test('o controle recebe string[] e nada mais', () => {
    const controle = ler('ui', 'biblia', 'OuvirCapitulo.tsx');
    expect(controle).toContain('versiculos: readonly string[]');
    // Nada do que a pessoa escreve tem como chegar aqui.
    for (const proibido of ['reflex', 'jejum', 'fasting', 'marks', 'anota', 'note']) {
      expect(controle.toLowerCase()).not.toContain(proibido);
    }
  });

  test('a tela passa só o texto dos versículos', () => {
    const tela = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    // O texto falado é derivado dos versículos, e de mais nada.
    expect(tela).toContain('passage?.verses.map((v) => v.text)');
    expect(tela).toContain('useOuvirCapitulo(versiculosFalados');
  });

  test('o motor da fala não importa nenhuma store de conteúdo do usuário', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    for (const store of ['reflectionsStore', 'fastingStore', 'marksStore', 'completionsStore', 'settingsStore']) {
      expect(hook).not.toContain(store);
    }
  });
});

describe('o desenho da leitura', () => {
  /**
   * A MEDIÇÃO MUDOU ESTA DECISÃO. O primeiro desenho falava um versículo por vez
   * e soava picado. Eu supus silêncio entre falas; medi e a borda custa só
   * ~98 ms. A causa é o REINÍCIO DE ENTONAÇÃO a cada fala nova — um versículo
   * que continua a ideia soava como afirmação encerrada.
   *
   * Agora fala em GRUPOS de ~320 caracteres, sem nunca partir um versículo, e o
   * "Continuar" volta ao começo do grupo (poucos segundos, não um capítulo).
   */
  test('fala em grupos, sem partir versículo', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('agrupar(versiculos, ALVO_DE_CARACTERES)');
    expect(hook).toContain('new SpeechSynthesisUtterance(trecho.texto)');
    const versos = ['No princípio criou Deus os céus e a terra.', 'E disse Deus: Haja luz; e houve luz.'];
    const grupos = agrupar(versos, 320);
    // Os dois cabem num grupo só, e nenhum versículo foi partido.
    expect(grupos).toHaveLength(1);
    expect(grupos[0].primeiroVersiculo).toBe(0);
    // Um versículo sozinho maior que o alvo continua inteiro: nunca se corta ao meio.
    const gigante = agrupar(['a'.repeat(900) + '.'], 320);
    expect(gigante).toHaveLength(1);
  });

  test('velocidade e altura saem das constantes medidas', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('fala.rate = VELOCIDADE');
    expect(hook).toContain('fala.pitch = ALTURA');
    expect(VELOCIDADE).toBe(0.9);
    expect(ALTURA).toBe(1.0);
  });

  test('a normalização mexe em pontuação, nunca em palavra', () => {
    const antes = 'E disse Deus: Haja luz; e houve luz.';
    const depois = versiculoParaFala(antes);
    // As palavras continuam todas lá, na mesma ordem.
    const palavras = (t: string) => t.toLowerCase().replace(/[^a-zà-ús]/g, ' ').split(/s+/).filter(Boolean);
    expect(palavras(depois)).toEqual(palavras(antes));
    // O que mudou foi o sinal: ponto e vírgula e dois-pontos viraram parada.
    expect(depois).not.toContain(';');
    expect(depois).not.toContain(':');
  });

  test('o número do versículo não é falado', () => {
    const grupos = agrupar(['No princípio criou Deus os céus e a terra.'], 320);
    expect(grupos[0].texto).not.toMatch(/^s*1/);
  });

  test('pausar é parar-e-lembrar, igual em toda plataforma', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    // Nada de pause()/resume() da Web Speech API: são inertes no Chrome do Android.
    expect(hook).not.toContain('speechSynthesis.pause()');
    expect(hook).not.toContain('speechSynthesis.resume()');
    // Continuar retoma do índice guardado.
    expect(hook).toContain('falarDe(indice.current)');
  });

  test('parar volta ao começo', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    const parar = hook.slice(hook.indexOf('const parar ='), hook.indexOf('const parar =') + 300);
    expect(parar).toContain('indice.current = 0');
  });

  test('trocar de capítulo ou sair cala a fala', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    // A limpeza do efeito depende da chave do capítulo: roda na troca e ao sair.
    expect(hook).toContain('}, [chaveDoCapitulo]);');
    expect(hook).toContain('speechSynthesis?.cancel()');
  });

  /**
   * O cancelamento ainda dispara onend/onerror da fala em curso, e eles chegam
   * atrasados. Com trava por booleano + setTimeout isso perdia a corrida: ao
   * pausar, o evento atrasado derrubava o estado para "parado" e o botão perdia
   * o lugar (defeito real, visto no rascunho em 23/09/2026).
   */
  test('callback de fala velha não mexe no estado novo', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('const minhaGeracao = ++geracao.current');
    expect(hook).toContain('geracao.current === minhaGeracao');
    expect(hook).toContain('if (!atual()) return;');
    // Nada de trava por tempo: era ela que perdia a corrida.
    expect(hook).not.toContain('cancelandoDeProposito');
  });

  test('cancelar aposenta o pendente sem mexer no estado', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    const cancelar = hook.slice(hook.indexOf('const cancelar ='), hook.indexOf('const cancelar =') + 320);
    expect(cancelar).toContain('geracao.current += 1');
    // Quem decide o estado é quem chamou (pausar, parar, tocar) — não o cancelar.
    expect(cancelar).not.toContain('setEstado');
  });
});
