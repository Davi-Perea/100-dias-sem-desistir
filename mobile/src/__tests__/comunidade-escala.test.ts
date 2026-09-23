import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMMENTS_SERVER_LIMIT } from '@/community/types';

/**
 * AUDITORIA EXTERNA 2026-09-23 · escala da conversa.
 *
 * A tela avisa "esta conversa passou de N comentários" usando um número escrito
 * no app. Esse número só vale se for o MESMO que o servidor aplica. Se alguém
 * mexer no `limit` do SQL e esquecer do app, o aviso passa a mentir — e um aviso
 * que mente é pior do que nenhum. Este teste lê o SQL de verdade.
 */
const SQL = join(__dirname, '..', '..', 'supabase', 'migrations', '20260921130100_comunidade_funcoes.sql');

describe('o teto de comentários do app é o teto do servidor', () => {
  const fonte = readFileSync(SQL, 'utf8');
  const funcao = fonte.slice(fonte.indexOf('function private.community_post_comments('));

  test('o SQL de community_post_comments realmente tem um limite fixo', () => {
    const limite = funcao.match(/limit\s+(\d+)\s*;/);
    expect(limite).not.toBeNull();
    expect(Number(limite?.[1])).toBe(COMMENTS_SERVER_LIMIT);
  });

  test('e continua sem cursor: é por isso que existe o aviso na tela', () => {
    const corpo = funcao.slice(0, funcao.indexOf('$$;'));
    // Se um dia aparecer paginação de verdade aqui, este teste cai e manda
    // trocar o aviso pela busca da próxima página (ver
    // docs/technical/COMUNIDADE_V2_COMENTARIOS_PAGINACAO.md).
    expect(corpo).not.toMatch(/after_created|after_comment|before_comment/);
  });

  test('a ordem é a que um cursor futuro vai precisar: created_at, depois id', () => {
    expect(funcao).toMatch(/order by c\.created_at asc, c\.id asc/);
  });
});

/**
 * AUDITORIA EXTERNA 2026-09-23 · P2, por leitura da fonte.
 *
 * Estes dois defeitos são de ciclo de vida: só aparecem depois de a URL assinada
 * vencer, ou depois de muitas páginas. Um teste de comportamento precisaria
 * simular o tempo passar e a memória crescer. A garantia aqui é a forma do
 * código — que é exatamente onde o defeito morava.
 */
const fonte = (...caminho: string[]) => readFileSync(join(__dirname, '..', ...caminho), 'utf8');

describe('URL assinada que vence pode ser tentada de novo', () => {
  const carrossel = fonte('ui', 'comunidade', 'feed', 'PhotoCarousel.tsx');

  test('a falha é guardada por URL, não como um "falhou" que nunca volta atrás', () => {
    // O defeito era `const [failed, setFailed] = useState(false)`: uma vez true,
    // nem uma URL nova tirava o componente da tela de erro.
    expect(carrossel).toMatch(/const \[failedUrl, setFailedUrl\] = useState<string \| null>\(null\)/);
    expect(carrossel).toMatch(/const failed = url !== undefined && failedUrl === url/);
    expect(carrossel).not.toMatch(/useState\(false\)[^\n]*\n[^\n]*failed/);
  });

  test('e o quadro de carregamento não é mais mudo para o leitor de tela', () => {
    expect(carrossel).toMatch(/Carregando a foto/);
    expect(carrossel).toMatch(/accessibilityLiveRegion="polite"/);
  });
});

describe('o mapa de URLs assinadas não cresce para sempre', () => {
  const feed = fonte('ui', 'comunidade', 'feed', 'useFeed.ts');

  test('o que a tela recebe é derivado dos cartões que a lista ainda guarda', () => {
    // Bruto (`signed`) acumula; o que sai (`photos`) é filtrado pelos cartões vivos.
    expect(feed).toMatch(/const \[signed, setSigned\]/);
    expect(feed).toMatch(/const photos = useMemo\(/);
    expect(feed).toMatch(/if \(!sobra\) return signed;/);
  });

  test('a poda não dispara busca nova de URL', () => {
    const bloco = feed.slice(feed.indexOf('const photos = useMemo('), feed.indexOf('const load = useCallback('));
    expect(bloco).not.toMatch(/signPhotoUrls|await|fetch/);
  });
});
