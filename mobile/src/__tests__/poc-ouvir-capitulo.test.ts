import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { POC_OUVIR_CAPITULO, POC_OUVIR_ENABLED, POC_OUVIR_LIVRO } from '@/config/features';
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
    const controle = ler('ui', 'biblia', 'OuvirCapitulo.tsx');
    // Indisponível não desenha nada: nem botão desligado, nem aviso técnico.
    expect(controle).toContain("leitura.estado === 'indisponivel'");
    expect(controle).toContain('return null');
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
    expect(tela).toContain('passage.verses.map((v) => v.text)');
  });

  test('o motor da fala não importa nenhuma store de conteúdo do usuário', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    for (const store of ['reflectionsStore', 'fastingStore', 'marksStore', 'completionsStore', 'settingsStore']) {
      expect(hook).not.toContain(store);
    }
  });
});

describe('o desenho da leitura', () => {
  test('fala versículo a versículo, não o capítulo inteiro', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('new SpeechSynthesisUtterance(texto)');
    // Uma fala por versículo: o texto vem de um índice da lista.
    expect(hook).toContain('const texto = lista[i]');
    expect(hook).not.toContain(".join(' ')");
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
