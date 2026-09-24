import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALTURA, taxaDe, VELOCIDADE, VELOCIDADE_PADRAO, VELOCIDADES } from '@/reader/audio/ajustes';
import { agrupar, versiculoParaFala } from '@/reader/audio/textoParaFala';
import { ehLocal, sexoDaVoz, sinteseDisponivel } from '@/reader/audio/vozPtBr';

/**
 * OUVIR A BÍBLIA — aprovado para produção em 23/09/2026.
 *
 * Estes testes defendem as três promessas que não podem quebrar sem alguém
 * perceber: nenhuma voz remota recebe texto, nada além da Escritura é falado, e
 * o desenho de narração que a comparação cega aprovou continua de pé.
 *
 * A qualidade da fala em si só se prova em aparelho — isso é do fundador.
 */

const SRC = join(__dirname, '..');
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

describe('o recurso vale em toda a Bíblia', () => {
  test('nenhuma chave de POC sobrou', () => {
    const features = ler('config', 'features.ts');
    expect(features).not.toContain('POC_OUVIR');
    const tela = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    expect(tela).not.toContain('POC_OUVIR');
  });

  test('o comparador de vozes do experimento não existe mais', () => {
    // Exigência do fundador: "the experimental voice comparison UI must NOT ship".
    expect(existsSync(join(SRC, 'ui', 'biblia', 'OuvirCapitulo.tsx'))).toBe(false);
    // Sem o '<': 'useOuvirCapitulo' (o hook, legítimo) casaria também.
    expect(ler('app', 'biblia', '[livro]', '[capitulo].tsx')).not.toContain('<OuvirCapitulo');
  });

  test('nenhum capítulo é privilegiado: o player só depende de haver voz', () => {
    const tela = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    expect(tela).toContain("const ouvir = leitura.estado !== 'indisponivel'");
    expect(tela).not.toMatch(/position.book === '[A-Z]{3}'/);
  });

  test('o leitor do dia TEM o mesmo player', () => {
    // Defeito real: o fundador abriu /reader/1, que é por onde a jornada passa
    // todo dia, e não havia áudio nenhum (24/09/2026).
    const tela = ler('app', 'reader', '[day].tsx');
    expect(tela).toContain('MiniPlayer');
    expect(tela).toContain('useOuvirCapitulo');
  });

  test('existe UM motor de áudio, e as duas telas chamam ele', () => {
    const dia = ler('app', 'reader', '[day].tsx');
    const biblia = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    for (const tela of [dia, biblia]) {
      expect(tela).toContain("from '@/reader/audio/useOuvirCapitulo'");
      expect(tela).toContain("from '@/ui/biblia/MiniPlayer'");
      // Nenhuma tela fala por conta própria: quem toca é só o motor.
      expect(tela).not.toContain('SpeechSynthesisUtterance');
      expect(tela).not.toContain('speechSynthesis');
    }
  });

  test('lá o player EMPILHA com o rodapé em vez de substituí-lo', () => {
    // "Concluir leitura" e "Prefiro ler na minha Bíblia" não têm equivalente no
    // player: ligar o áudio não pode custar a conclusão do dia.
    const tela = ler('app', 'reader', '[day].tsx');
    expect(tela).toContain('<ReaderFooter');
    expect(tela).toContain('bottom: footerHeight');
    // E o fim do capítulo tem de passar dos dois.
    expect(tela).toContain('+ playerHeight');
  });

  test('a fala atravessa os capítulos do dia, e para no último', () => {
    const tela = ler('app', 'reader', '[day].tsx');
    expect(tela).toContain('aoTerminarCapitulo');
    expect(tela).toContain('if (proximo >= totalRef.current) return;');
    expect(tela).toContain('tocarAoTrocarDeTexto()');
    // O áudio nunca conclui o dia por conta própria.
    const fim = tela.slice(tela.indexOf('const aoTerminarCapitulo'), tela.indexOf('const leitura ='));
    expect(fim).not.toContain('setDayCompleted');
    expect(fim).not.toContain('completeDay');
  });

  test('a continuação é decidida no motor, não copiada nas telas', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    // O fim natural do capítulo é o ÚNICO ponto que avisa a tela: parar, pausar e
    // trocar de capítulo passam por cancelar(), que invalida a corrida antes.
    expect(hook).toContain('aoTerminarRef.current?.()');
    expect(hook).toContain('autoTocar.current = false');
    const seguir = hook.slice(hook.indexOf('const seguir ='), hook.indexOf('indice.current = inicio'));
    expect(seguir).toContain('if (!atual()) return;');
  });

  test('parar cancela uma continuação pendente', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    const parar = hook.slice(hook.indexOf('const parar ='), hook.indexOf('const parar =') + 400);
    expect(parar).toContain('autoTocar.current = false');
  });

  test('⏮/⏭ e o rodapé andam pelo mesmo caminho', () => {
    const tela = ler('app', 'reader', '[day].tsx');
    // Um caminho só: senão o rodapé mudaria de capítulo calando a voz e o ⏭ não.
    expect(tela).not.toContain('setChapterIndex((i) => Math.min');
    expect(tela).not.toContain('setChapterIndex((i) => Math.max');
    expect(tela).toContain('irParaCapitulo(chapterIndex + 1)');
    expect(tela).toContain('irParaCapitulo(chapterIndex - 1)');
  });

  test('na aba Bíblia andar de capítulo também segue tocando', () => {
    const biblia = ler('app', 'biblia', '[livro]', '[capitulo].tsx');
    const goTo = biblia.slice(biblia.indexOf('const goTo ='), biblia.indexOf('const goTo =') + 320);
    expect(goTo).toContain("leitura.estado === 'tocando'");
    expect(goTo).toContain('tocarAoTrocarDeTexto()');
  });

  test('sem texto na tela, o player do dia não aparece', () => {
    // Guia (sem tradução licenciada) e tela enxuta da própria Bíblia não têm
    // versículo nenhum: um player ali seria um controle morto.
    const tela = ler('app', 'reader', '[day].tsx');
    expect(tela).toContain('hasLicensedText && passage && leitura.estado');
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

  /**
   * O filtro usa idioma, localService e SEXO — e o sexo vem de classificação por
   * nome, porque a Web Speech API não tem esse campo. O que continua proibido é
   * o app EXIGIR uma voz específica: Daniel é preferência na nota, não porta.
   */
  test('nenhuma voz específica é exigida para o recurso existir', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    for (const linha of fonte.split('\n').filter((l) => l.includes('.filter('))) {
      expect(linha).not.toContain('APROVADAS');
      expect(linha.toLowerCase()).not.toContain('daniel');
    }
    // Daniel só soma pontos entre as vozes que já passaram pelo filtro.
    expect(fonte).toContain('APROVADAS.test(nome)) pontos += 10');
  });

  test('a escolha funciona num aparelho sem nenhuma voz conhecida', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    // A ordenação é por pontos, e a pontuação existe sem depender de nome algum:
    // idioma, camada de qualidade e o padrão do sistema já ordenam sozinhos.
    expect(fonte).toContain('PT_BR.test(voz.lang)) pontos += 100');
    expect(fonte).toContain('voz.default) pontos += 5');
    expect(fonte).toContain('.sort((a, b) => b.pontos - a.pontos');
  });

  test('a nota de qualidade usa marcadores de tier, que valem em qualquer aparelho', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    for (const marcador of ['neural|natural', 'enhanced|premium', 'compact']) {
      expect(fonte).toContain(marcador);
    }
  });

  test('sem voz local, o recurso fica indisponível — não há caminho para voz remota', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain("setEstado((atual) => (atual === 'carregando' ? 'indisponivel' : atual))");
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

describe('a procura por vozes não desiste cedo', () => {
  /**
   * O DEFEITO de 24/09/2026: o player não aparecia no aparelho do fundador. A
   * versão anterior perguntava as vozes UMA vez — resolvia no primeiro
   * `voiceschanged` ou desistia em 3 s — e concluía "não há voz" para sempre.
   * Mas o evento dispara mais de uma vez, e a primeira lista pode vir vazia.
   */
  test('a assinatura de voiceschanged não é removida depois do primeiro aviso', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    expect(fonte).toContain("addEventListener?.('voiceschanged', avisar)");
    // Nada de promessa de tiro único.
    expect(fonte).not.toContain('aguardarVozes');
    expect(fonte).not.toContain('new Promise');
  });

  test('consulta de novo várias vezes, para o navegador que nunca dispara o evento', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    expect(fonte).toContain('RETENTATIVAS_MS');
    // Várias janelas, não uma só.
    const inicio = fonte.indexOf('RETENTATIVAS_MS = [');
    const dentro = fonte.slice(inicio + 'RETENTATIVAS_MS = ['.length, fonte.indexOf(']', inicio));
    expect(dentro.split(',').length).toBeGreaterThanOrEqual(5);
    // E a última é bem depois da abertura, para o motor lento ter chance.
    const ultima = Number(dentro.split(',').pop());
    expect(ultima).toBeGreaterThanOrEqual(5000);
  });

  test('enquanto procura, o estado é "carregando" e nunca "indisponivel"', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    // Só vira indisponível DEPOIS do prazo, e só se ainda estiver carregando.
    expect(hook).toContain('ESPERA_MAXIMA_MS');
    expect(hook).toContain("setEstado((atual) => (atual === 'carregando' ? 'indisponivel' : atual))");
  });

  test('voz que chega tarde ainda acende o recurso', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain("atual === 'carregando' || atual === 'indisponivel' ? 'parado' : atual");
  });

  /**
   * NENHUMA ferramenta de depuração de voz vai para a produção.
   *
   * Duas já existiram: a faixa de diagnóstico (`DiagnosticoVoz`) e a tela de
   * identificação (`TesteDeVozes`, 24/09/2026, criada porque a Web Speech API
   * não informa o sexo da voz e alguém precisava OUVIR). As duas cumpriram o
   * papel e saíram. Este teste existe para que a terceira não fique.
   */
  test('o diagnóstico de voz nasce desligado', () => {
    // Sem a variável no ambiente do build, o empacotador tira tudo do bundle.
    expect(ler('config', 'features.ts')).toContain("process.env.EXPO_PUBLIC_DIAG_VOZ === 'true'");
    expect(ler('ui', 'biblia', 'DiagnosticoDeVozes.tsx')).toContain('if (!DIAG_VOZ) return null;');
    // As duas gerações anteriores saíram e não voltaram.
    expect(existsSync(join(SRC, 'ui', 'biblia', 'TesteDeVozes.tsx'))).toBe(false);
    expect(existsSync(join(SRC, 'ui', 'biblia', 'DiagnosticoVoz.tsx'))).toBe(false);
  });

  test('o diagnóstico fica onde o fundador está: no leitor do dia', () => {
    // As duas versões anteriores viviam em /biblia. Ele usa /reader/<dia>.
    expect(ler('app', 'reader', '[day].tsx')).toContain('<DiagnosticoDeVozes />');
    expect(ler('app', 'biblia', '[livro]', '[capitulo].tsx')).not.toContain('DiagnosticoDeVozes');
  });

  test('o diagnóstico mostra tudo, mas só deixa FALAR voz local', () => {
    const diag = ler('ui', 'biblia', 'DiagnosticoDeVozes.tsx');
    // Lista também a voz de servidor: distinguir "não há voz" de "há, mas é
    // remota" é metade do diagnóstico.
    expect(diag).toContain('localService: ${v.local');
    // E ela não fala. Guarda dupla: botão não desenhado + recusa na função.
    expect(diag).toContain('if (!linha.local) return;');
    expect(diag).toContain('{v.local ? (');
  });

  test('o diagnóstico não mexe no player nem no filtro do produto', () => {
    const diag = ler('ui', 'biblia', 'DiagnosticoDeVozes.tsx');
    expect(diag).not.toContain('MiniPlayer');
    expect(diag).not.toContain('useOuvirCapitulo');
    // O produto continua usando a lista filtrada por sexo.
    expect(ler('reader', 'audio', 'vozPtBr.ts')).toContain(
      "sexoDaVoz(v.nome.toLowerCase()) === 'masculina'",
    );
  });

  test('a regra de privacidade continua no lugar sem ela', () => {
    // Era ela que relaxava o filtro de SEXO — e só ele. O de LOCAL nunca saiu.
    expect(ler('reader', 'audio', 'vozPtBr.ts')).toContain('.filter((v) => PT.test(v.lang) && ehLocal(v))');
  });
});

describe('só o texto da Bíblia é falado', () => {
  test('o motor recebe string[] de versículos e nada mais', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('versiculos: readonly string[]');
  });

  test('o player não conhece conteúdo do usuário', () => {
    const player = ler('ui', 'biblia', 'MiniPlayer.tsx');
    for (const proibido of ['reflex', 'jejum', 'fasting', 'marks', 'anota']) {
      expect(player.toLowerCase()).not.toContain(proibido);
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
    // settingsStore entra: é de lá que vem a velocidade escolhida. As outras,
    // que guardam o que a pessoa ESCREVE, não têm o que fazer aqui.
    for (const store of ['reflectionsStore', 'fastingStore', 'marksStore', 'completionsStore']) {
      expect(hook).not.toContain(store);
    }
  });
});

describe('a velocidade que a pessoa escolhe', () => {
  test('"1x" é a baseline do app, não 100% do motor', () => {
    // Quem nunca tocou no controle não pode passar a ouvir mais rápido.
    expect(taxaDe('1x')).toBe(VELOCIDADE);
    expect(VELOCIDADE_PADRAO).toBe('1x');
  });

  /**
   * As taxas NÃO são proporcionais aos rótulos, e é medição. O motor comprime a
   * faixa: pedir de 0,7 a 1,3 rendia só 1,22× de diferença real, e o fundador
   * disse — com razão — que a velocidade "não muda mesmo" (24/09/2026).
   */
  test('os degraus são afastados o bastante para serem audíveis', () => {
    expect(VELOCIDADES.map((v) => v.rotulo)).toEqual(['0,75x', '1x', '1,25x', '1,5x', '1,75x', '2x']);
    const taxas = VELOCIDADES.map((v) => v.taxa);
    // Crescentes: a única garantia que vale em todo motor.
    expect([...taxas].sort((a, b) => a - b)).toEqual(taxas);
    // E bem afastados: pelo menos 5× entre a ponta lenta e a rápida, porque o
    // motor come boa parte da diferença pedida.
    expect(taxas[taxas.length - 1] / taxas[0]).toBeGreaterThanOrEqual(5);
  });

  test('rótulo desconhecido volta ao padrão em vez de quebrar', () => {
    expect(taxaDe('9x')).toBe(VELOCIDADE);
    expect(taxaDe('')).toBe(VELOCIDADE);
  });

  test('a escolha é guardada pelo RÓTULO, não pela taxa', () => {
    // Guardar 1,10 congelaria a decisão de hoje; o rótulo acompanha a baseline.
    const store = ler('settings', 'settingsStore.ts');
    expect(store).toContain('audioVelocidade: string');
    expect(store).toContain('audioVelocidade: VELOCIDADE_PADRAO');
    expect(store).toContain('VELOCIDADES.some((v) => v.rotulo === r.audioVelocidade)');
  });

  /**
   * A troca recomeça o TRECHO em curso, não o capítulo. Antes ela só valia no
   * trecho seguinte — uns 30 segundos depois —, e por isso parecia não funcionar.
   */
  test('a troca responde na hora, recomeçando só o trecho em curso', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).toContain('fala.rate = taxaRef.current');
    const i = hook.indexOf('const escolherVelocidade');
    const escolher = hook.slice(i, i + 700);
    expect(escolher).toContain('taxaRef.current = taxaDe(rotulo)');
    // Recomeça do índice ATUAL, e não do zero: o capítulo não reinicia.
    expect(escolher).toContain('falarDe(indice.current)');
    expect(escolher).not.toContain('falarDe(0)');
    // E só se estiver tocando: parado ou pausado não começa a falar sozinho.
    expect(escolher).toContain("estadoRef.current !== 'tocando'");
  });

  test('o player abre as opções sem modal', () => {
    const player = ler('ui', 'biblia', 'MiniPlayer.tsx');
    expect(player).toContain('mini-player-velocidades');
    expect(player).not.toContain('Modal');
    expect(player).not.toContain('Sheet');
  });
});

describe('voz masculina', () => {
  /**
   * Decisão do fundador (24/09/2026): as vozes femininas ficam inutilizáveis nas
   * velocidades altas, e o app vai até 2x.
   *
   * A Web Speech API NÃO informa o sexo da voz — não existe campo. Só dá para
   * ler os sinais que os sistemas deixam no nome.
   */
  test('lê o marcador que o próprio motor do Android deixa', () => {
    expect(sexoDaVoz('pt-br-x-afs#male_1-local')).toBe('masculina');
    expect(sexoDaVoz('pt-br-x-afs#female_2-local')).toBe('feminina');
  });

  test('lê a palavra, quando o sistema a escreve', () => {
    expect(sexoDaVoz('português (brasil) male')).toBe('masculina');
    expect(sexoDaVoz('voz feminina brasileira')).toBe('feminina');
  });

  test('conhece os nomes próprios que já vimos', () => {
    expect(sexoDaVoz('microsoft daniel - portuguese (brazil)')).toBe('masculina');
    expect(sexoDaVoz('microsoft maria - portuguese (brazil)')).toBe('feminina');
    expect(sexoDaVoz('luciana')).toBe('feminina');
  });

  /** Chutar "feminina" por não saber tiraria vozes boas da disputa sem motivo. */
  test('o que não se reconhece fica DESCONHECIDO, não feminino', () => {
    expect(sexoDaVoz('google português do brasil')).toBe('desconhecida');
    expect(sexoDaVoz('voz 3')).toBe('desconhecida');
  });

  /**
   * CORREÇÃO do fundador, no mesmo dia: a primeira versão pontuava o sexo e caía
   * para a feminina quando não havia masculina. Ele inverteu — "se o áudio
   * aparecer, que seja voz masculina" vale mais que "que apareça".
   */
  test('é FILTRO, não pontuação: só voz masculina entra na lista do produto', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    expect(fonte).toContain(
      "vozesPtLocaisTodas().filter((v) => sexoDaVoz(v.nome.toLowerCase()) === 'masculina')",
    );
    // O sexo não pontua mais: quem chega à nota já passou pelo filtro.
    expect(fonte).not.toContain("sexo === 'masculina') pontos");
  });

  /**
   * Regra 3 do pedido: sem masculina, é melhor uma feminina do que recurso
   * nenhum. Por isso é pontuação e não filtro.
   */
  test('sem voz masculina, a feminina ainda é usada', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    // Feminina não perde pontos nem é excluída: só não ganha o bônus.
    expect(fonte).not.toContain("sexo === 'feminina') pontos -=");
    expect(fonte).not.toContain("sexo !== 'feminina'");
  });
});

describe('sem seletor de voz', () => {
  test('o hook não expõe troca de voz', () => {
    const hook = ler('reader', 'audio', 'useOuvirCapitulo.ts');
    expect(hook).not.toContain('escolherVoz');
    // Nem a lista, que só serviria para montar um seletor.
    expect(hook).not.toContain('vozes: VozLocal[];');
    expect(hook).toContain('const vozEscolhida = vozes[0] ?? null;');
  });

  test('o player não tem controle de voz nenhum', () => {
    const player = ler('ui', 'biblia', 'MiniPlayer.tsx');
    // O que importa é a API e os controles, não a palavra "voz" nos comentários.
    expect(player).not.toContain('escolherVoz');
    expect(player).not.toContain('vozes');
    expect(player).not.toContain('onVoz');
  });
});

describe('a preferência de voz do fundador', () => {
  test('Daniel é desempate, nunca exigência', () => {
    const fonte = ler('reader', 'audio', 'vozPtBr.ts');
    // Vale menos que qualquer camada de qualidade: 10 contra 40, 30 e 20.
    expect(fonte).toContain('APROVADAS.test(nome)) pontos += 10');
    expect(fonte).toContain('/neural|natural/.test(nome)) pontos += 40');
    // E não é filtro: a lista de vozes nunca é restrita por nome.
    expect(fonte).not.toContain('filter((v) => APROVADAS');
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
    expect(hook).toContain('fala.rate = taxaRef.current');
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

describe('empilhar o player não cria dois botões com o mesmo nome', () => {
  const ler2 = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

  test('o ⏮/⏭ do player diz que é de ÁUDIO', () => {
    // No leitor do dia o rodapé logo abaixo tem o seu próprio "Capítulo
    // anterior". Dois botões com o mesmo nome deixam quem usa leitor de tela
    // sem saber em qual está.
    const player = ler2('ui', 'biblia', 'MiniPlayer.tsx');
    expect(player).toContain('rotulo="Ouvir o capítulo anterior"');
    expect(player).toContain('rotulo="Ouvir o próximo capítulo"');
    expect(player).not.toContain('rotulo="Capítulo anterior"');
    expect(player).not.toContain('rotulo="Próximo capítulo"');
  });
});

describe('o player cabe numa faixa só', () => {
  const player = () => readFileSync(join(__dirname, '..', 'ui', 'biblia', 'MiniPlayer.tsx'), 'utf8');

  /**
   * Feedback do fundador em 24/09/2026, vendo no celular: com o player ACIMA do
   * rodapé no leitor do dia, duas barras comiam um terço da tela.
   */
  test('o nome do capítulo não ocupa uma linha: a barra de topo já o diz', () => {
    expect(player()).not.toContain('mini-player-capitulo');
  });

  test('mas quem não vê continua sabendo qual capítulo é', () => {
    // Sai da tela, não da acessibilidade.
    expect(player()).toContain('accessibilityLabel={`Ouvindo ${capitulo}`}');
    expect(player()).toContain('`Ouvir ${capitulo}`');
  });

  test('nenhum botão puxa a altura da faixa para cima do alvo mínimo', () => {
    const fonte = player();
    expect(fonte).toContain('const lado = MIN_TOUCH;');
    // 56 era o botão de tocar da versão de duas linhas.
    expect(fonte).not.toContain('grande ? 56');
  });
});
