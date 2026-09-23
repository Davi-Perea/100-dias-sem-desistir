import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Platform } from 'react-native';

import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';
import { _resetSettingsCacheForTests, loadSettings, updateSettings } from '@/settings/settingsStore';
import { ONBOARDING_STEPS } from '@/ui/OnboardingStep';
import { ChapterText } from '@/ui/biblia/ChapterText';
import { VERSE_HINT_TEXT } from '@/ui/biblia/VerseHint';

/**
 * TESTE COM USUÁRIO REAL, ANDROID — 23/09/2026.
 *
 * Três achados, três defesas. Nenhuma delas é sobre "ficar bonito": cada uma
 * corresponde a alguém que não conseguiu usar o produto.
 *
 *   P0. a leitura da Bíblia rolava mal no Android e a barra de "Concluir
 *       leitura" saía do alcance;
 *   P1. a entrada perguntava o horário do lembrete no navegador, onde lembrete
 *       nenhum é agendado;
 *   P1. marcar versículo e anotar existiam, e ninguém descobria.
 */

const SRC = join(__dirname, '..');
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), 'utf8');

/* ------------------------------------------------------- P0 · rolagem */

describe('P0 · a régua de texto não vira rolagem da página', () => {
  /**
   * A sonda mede rótulos num embrulho de 100.000px para o texto nunca quebrar.
   * Na web isso ia parar em `document.scrollWidth`: 100.026px numa tela de
   * 412px. O Chrome do Android passa a tratar a página como arrastável de lado,
   * e o gesto de rolar para baixo briga com o de arrastar — era o "difícil de
   * rolar" do relato.
   */
  test('a régua de 100.000px está dentro de um recorte de 0×0', () => {
    const probe = ler('ui', 'leitor', 'LabelProbe.tsx');
    const recorte = probe.indexOf("overflow: 'hidden'");
    const regua = probe.indexOf('width: 100000');
    expect(recorte).toBeGreaterThan(-1);
    expect(regua).toBeGreaterThan(-1);
    // O recorte tem de vir ANTES: ele é o pai que impede o transbordo.
    expect(recorte).toBeLessThan(regua);
    expect(probe).toContain('width: 0, height: 0');
  });
});

describe('P0 · a altura do app segue a janela realmente visível', () => {
  /**
   * `height: 100%` resolve contra a janela GRANDE (barra de endereço escondida).
   * Com `overflow: hidden` no body, o documento nunca rola, então o Chrome nunca
   * esconde a barra — e a faixa de baixo, onde mora o rodapé do leitor, ficava
   * permanentemente fora da tela.
   */
  // Com `web.output: 'single'` o Expo usa `public/index.html`, e não `+html.tsx`.
  const html = readFileSync(join(SRC, '..', 'public', 'index.html'), 'utf8');
  // A marcação, sem os comentários: eles explicam o conserto CITANDO as etiquetas
  // que o Expo injeta, e uma busca por texto no arquivo inteiro acharia a
  // explicação em vez da marcação.
  const marcacao = html
    .split('<!--')
    .map((parte, i) => (i === 0 ? parte : parte.split('-->').slice(1).join('-->')))
    .join('');

  test('html, body e #root usam dvh', () => {
    expect(html).toContain('height: 100dvh');
    expect(html).toMatch(/html,\s*body,\s*#root/);
  });

  test('vh fica como reserva para navegador antigo, ANTES do dvh', () => {
    expect(html.indexOf('height: 100vh')).toBeLessThan(html.indexOf('height: 100dvh'));
  });

  test('o reset do Expo continua, e a regra de altura vem depois dele', () => {
    // Corrigir o reset exige vir depois dele; antes, a regra seria sobrescrita.
    expect(html).toContain('id="expo-reset"');
    expect(html.indexOf('id="expo-reset"')).toBeLessThan(html.indexOf('id="altura-visivel"'));
  });

  test('o título não diz "(dev)" para quem é da igreja', () => {
    expect(marcacao).toContain('<title>100 dias sem desistir</title>');
    expect(marcacao).not.toContain('(dev)');
  });

  /** O Expo injeta os dois no export: escrevê-los aqui os duplicaria. */
  test('o modelo não traz o script do bundle nem o ícone', () => {
    expect(marcacao).not.toContain('<script src=');
    expect(marcacao).not.toContain('<link rel="icon"');
  });

  test('o idioma da página é pt-BR', () => {
    expect(html).toContain('lang="pt-BR"');
  });

  /** Mexer no viewport mudaria o iPhone, que já estava certo. */
  test('o viewport não ganhou viewport-fit nem escala travada', () => {
    expect(html).toContain('width=device-width, initial-scale=1, shrink-to-fit=no');
    expect(html).not.toContain('viewport-fit');
    expect(html).not.toContain('maximum-scale');
    expect(html).not.toContain('user-scalable=no');
  });
});

/* ---------------------------------------------------- P1 · lembretes */

describe('P1 · lembrete sai da web e continua no celular', () => {
  /**
   * A chave é UMA: `Platform.OS !== 'web'`. O comportamento de cada tela com a
   * chave desligada é provado em `lembretes-fora-da-web.test.tsx`, que roda com
   * o módulo trocado — aqui só se afirma de onde o valor vem.
   */
  test('a chave é a plataforma, e nada mais', () => {
    const fonte = ler('reminders', 'disponibilidade.ts');
    expect(fonte).toContain("Platform.OS !== 'web'");
    // Esta suíte roda como app nativo: lá o lembrete existe.
    expect(Platform.OS).not.toBe('web');
    expect(REMINDERS_AVAILABLE).toBe(true);
    expect(ONBOARDING_STEPS).toBe(4);
  });

  test('o passo da leitura conclui a entrada quando é o último', () => {
    const leitura = ler('app', 'onboarding', 'leitura.tsx');
    expect(leitura).toContain('REMINDERS_AVAILABLE');
    expect(leitura).toContain('concluirEntrada');
  });

  /** Uma função só grava `onboardingCompleted`: duas seriam duas chances de esquecer. */
  test('quem conclui a entrada é a mesma função nos dois caminhos', () => {
    expect(ler('app', 'onboarding', 'lembrete.tsx')).toContain('concluirEntrada');
    expect(ler('ui', 'entrada', 'concluirEntrada.ts')).toContain('onboardingCompleted: true');
  });

  test('as telas de lembrete devolvem quem chega por link direto', () => {
    for (const arquivo of [['app', 'lembrete.tsx'], ['app', 'onboarding', 'lembrete.tsx']]) {
      const fonte = ler(...arquivo);
      expect(fonte).toContain('REMINDERS_AVAILABLE');
      expect(fonte).toContain('<Redirect href="/" />');
    }
  });

  test('nenhuma superfície do app leva ao lembrete sem antes checar a plataforma', () => {
    for (const arquivo of [
      ['ui', 'voce', 'SettingsList.tsx'],
      ['ui', 'voce', 'CompleteProfile.tsx'],
      ['ui', 'jornada', 'BeforeCampaign.tsx'],
    ]) {
      expect(ler(...arquivo)).toContain('REMINDERS_AVAILABLE');
    }
  });

  test('a lista de ajustes não perde a primeira linha do grupo quando o lembrete sai', () => {
    // Sem `first` na linha seguinte, o grupo ficaria sem a borda de cima.
    expect(ler('ui', 'voce', 'SettingsList.tsx')).toContain('first={!REMINDERS_AVAILABLE}');
  });
});

/* ------------------------------------------------ P1 · dica do versículo */

describe('P1 · a dica de tocar no versículo', () => {
  const VERSOS = [
    { verse: 1, text: 'No princípio criou Deus os céus e a terra.' },
    { verse: 2, text: 'E a terra estava desordenada e vazia.' },
  ];

  /**
   * Tocar num versículo abre a folha de marca-texto, que usa as margens seguras
   * do aparelho. Fora do app não existe provedor delas, então o teste monta um —
   * é andaime de teste, não comportamento do produto.
   */
  const capitulo = (props: { book?: string; chapter?: number } = {}) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ChapterText verses={VERSOS} fontSize={19} {...props} />
    </SafeAreaProvider>
  );

  beforeEach(async () => {
    _resetSettingsCacheForTests();
    await AsyncStorage.clear();
    // Estado de partida explícito, e não "o que sobrou do teste anterior": a
    // gravação do teste de dispensar pode terminar depois do clear.
    await updateSettings((s) => ({ ...s, verseHintSeen: false }));
  });

  /**
   * Sempre via `waitFor`, nunca `findBy*` logo depois do render: a dica só
   * aparece quando as preferências chegam do disco, e o `screen` do RNTL também
   * só fica pronto depois de um ciclo. `findBy*` colado no render pega os dois
   * antes da hora e falha por motivo errado.
   */
  const esperarDica = () =>
    waitFor(() => expect(screen.getByTestId('verse-hint')).toBeTruthy());
  const esperarTexto = () =>
    waitFor(() => expect(screen.getByTestId('chapter-text')).toBeTruthy());

  test('aparece na primeira leitura, com o texto pedido', async () => {
    render(capitulo({ book: 'GEN', chapter: 1 }));
    await esperarDica();
    expect(screen.getByText(VERSE_HINT_TEXT)).toBeTruthy();
  });

  test('não aparece onde o versículo não é tocável', async () => {
    render(capitulo());
    await esperarTexto();
    expect(screen.queryByText(VERSE_HINT_TEXT)).toBeNull();
  });

  test('dispensar guarda a escolha e ela não volta', async () => {
    render(capitulo({ book: 'GEN', chapter: 1 }));
    await esperarDica();
    fireEvent.press(screen.getByTestId('verse-hint-dismiss'));
    await waitFor(() => expect(screen.queryByText(VERSE_HINT_TEXT)).toBeNull());
    // Gravado, e não só escondido na tela: é isto que faz a dica não voltar na
    // próxima abertura. O teste "quem já dispensou nunca mais vê" fecha o ciclo.
    expect((await loadSettings()).verseHintSeen).toBe(true);
  });

  /** Quem tocou já descobriu: insistir viraria ruído. */
  test('tocar num versículo também encerra a dica', async () => {
    render(capitulo({ book: 'GEN', chapter: 1 }));
    await esperarDica();
    fireEvent.press(screen.getByTestId('verse-1'));
    await waitFor(async () => expect((await loadSettings()).verseHintSeen).toBe(true));
  });

  test('quem já dispensou nunca mais vê', async () => {
    await updateSettings((s) => ({ ...s, verseHintSeen: true }));
    render(capitulo({ book: 'GEN', chapter: 1 }));
    await esperarTexto();
    expect(screen.queryByText(VERSE_HINT_TEXT)).toBeNull();
  });

  test('a dica fica no fluxo do texto, e não por cima dele', () => {
    // Elemento posicionado de forma absoluta sobre o leitor foi exatamente o que
    // quebrou a rolagem no Android. A dica não repete isso.
    expect(ler('ui', 'biblia', 'VerseHint.tsx')).not.toContain("position: 'absolute'");
  });

  test('o botão de dispensar tem alvo de toque de 44', () => {
    const fonte = ler('ui', 'biblia', 'VerseHint.tsx');
    expect(fonte).toContain('minWidth: MIN_TOUCH');
    expect(fonte).toContain('minHeight: MIN_TOUCH');
  });
});
