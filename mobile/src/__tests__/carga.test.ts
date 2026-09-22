import fs from 'fs';
import path from 'path';

import { PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION, SIGNED_URL_TTL_SECONDS } from '@/community/photos';
import { LIMITS } from '@/community/validation';

/**
 * GUARDA DO TESTE DE CARGA (pergunta do fundador em 2026-09-22: "se muita gente
 * publicar, dá problema?").
 *
 * O teste de carga de verdade roda num Postgres local e leva ~25 s:
 *   node scripts/sql/carga-comunidade.mjs --log carga.md
 * Ele precisa de PGlite instalado à mão (não é dependência do projeto) e por isso
 * NÃO roda no Jest. O que este arquivo faz é impedir que o resultado dele seja
 * desfeito sem ninguém perceber:
 *
 *   - as três funções de contagem do feed NÃO podem voltar a juntar
 *     community_profiles (era isto que varria os 3.000 membros 60 vezes por
 *     página, -40% do tempo do feed quando saiu);
 *   - a semântica que elas precisam manter (perfil ativo, bloqueio nos dois
 *     sentidos, no máximo 3 rostos) continua escrita no SQL;
 *   - o relatório existe, registra os números medidos e os limites do plano.
 *
 * PROVA: que a correção continua no SQL e que o relatório não virou ficção.
 * NÃO PROVA: desempenho. Isso é do script, contra um banco.
 */
const ROOT = path.join(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const SCRIPT = path.join(ROOT, 'scripts', 'sql', 'carga-comunidade.mjs');
const RELATORIO = path.join(ROOT, '..', 'docs', 'technical', 'COMUNIDADE_V2_CARGA.md');

const sql = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n');

/** A definição que vale é a ÚLTIMA (migrations posteriores fazem `create or replace`). */
function corpo(nome: string): string {
  const todas = [...sql.matchAll(new RegExp(`create or replace function ${nome}\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`, 'g'))];
  if (todas.length === 0) throw new Error(`função ${nome} não encontrada`);
  return todas[todas.length - 1][1];
}

const CONTADORES = ['private.amen_count_for', 'private.amen_faces_for', 'private.comment_count_for'] as const;

describe('a correção que o teste de carga trouxe continua de pé', () => {
  test.each(CONTADORES)(
    '%s consulta o perfil por subconsulta escalar (pela PK), nunca por junção com community_profiles',
    (nome) => {
      const body = corpo(nome);
      // A junção era o problema: com 3.000 membros o planejador varria a tabela toda,
      // 20 posts × 3 funções = 60 varreduras por página do feed.
      expect(body).not.toMatch(/join\s+public\.community_profiles/);
      // A subconsulta escalar tira do planejador a opção de varrer.
      expect(body).toMatch(/\(select\s+\w+\.(status|display_name|avatar_path)[\s\S]*?from public\.community_profiles/);
    },
  );

  test('nada mudou na regra: só perfil ATIVO conta, e bloqueio vale nos dois sentidos', () => {
    for (const nome of CONTADORES) {
      expect(corpo(nome)).toMatch(/\.status\b/);
      expect(corpo(nome)).toMatch(/'active'/);
      expect(corpo(nome)).toMatch(/not private\.blocked_between\(viewer,/);
    }
    const blocked = corpo('private.blocked_between');
    expect(blocked).toMatch(/bl\.blocker_id = a and bl\.blocked_id = b/);
    expect(blocked).toMatch(/bl\.blocker_id = b and bl\.blocked_id = a/);
  });

  test('os rostinhos continuam no máximo 3, com foto só se aprovada (a minha sempre), sem id de pessoa', () => {
    const faces = corpo('private.amen_faces_for');
    expect(faces).toMatch(/limit 3/);
    expect(faces).toMatch(/avatar_status = 'approved' or ap\.user_id = viewer/);
    expect(faces).not.toMatch(/'user_id'|'id'/);
    // Sem nome, a pessoa conta no número mas não tem rosto: o filtro vem antes do limite.
    expect(faces.indexOf('display_name is not null')).toBeLessThan(faces.indexOf('limit 3'));
  });

  test('o feed continua com fim: 20 por página e janela de dias', () => {
    const feed = corpo('private.community_feed');
    expect(feed).toMatch(/limit 20/);
    expect(feed).toMatch(/feed_window_days/);
  });

  test('nenhuma tabela passou a guardar contagem (a contagem respeita o bloqueio de quem lê)', () => {
    const tabelas = [...sql.matchAll(/(create table|alter table)[\s\S]*?;/g)].map((m) => m[0]);
    for (const bloco of tabelas) expect(bloco).not.toMatch(/amen_count|amens_count|count_amen/i);
  });

  test('o teste de carga não criou índice nenhum: a correção foi de consulta', () => {
    const aceite = fs.readFileSync(path.join(MIGRATIONS_DIR, '20260923070000_comunidade_aceite_no_ato.sql'), 'utf8');
    expect(aceite).not.toMatch(/^create (unique )?index/m);
  });
});

describe('o script e o relatório', () => {
  test('o script existe, semeia o tamanho real (3.000 pessoas, 1.000 posts) e sai com erro se voltar a varrer', () => {
    const script = fs.readFileSync(SCRIPT, 'utf8');
    expect(script).toMatch(/arg\('pessoas', 3000\)/);
    expect(script).toMatch(/arg\('posts', 1000\)/);
    // EXPLAIN do corpo REAL da função (lido do pg_proc), não de uma consulta parecida.
    expect(script).toMatch(/pg_catalog\.pg_proc/);
    expect(script).toMatch(/explain \(analyze, buffers/);
    expect(script).toMatch(/process\.exitCode = faltando\.length === 0 \? 0 : 1/);
  });

  test('o relatório registra os números medidos, o que quebra primeiro e os limites do plano', () => {
    const doc = fs.readFileSync(RELATORIO, 'utf8');
    // A ressalva do motor não pode desaparecer: o tempo absoluto do WebAssembly não vale.
    expect(doc).toMatch(/WebAssembly/);
    expect(doc).toMatch(/TEMPOS ABSOLUTOS NÃO valem/);
    // Cenário e medidas.
    expect(doc).toMatch(/3\.000 pessoas/);
    expect(doc).toMatch(/1\.000 (publicações|posts)/);
    expect(doc).toMatch(/community_feed\(\)/);
    expect(doc).toMatch(/-40%/);
    // O que quebra primeiro.
    expect(doc).toMatch(/viraliza/);
    expect(doc).toMatch(/[Ee]gress/);
    // Limites do plano, com os dois planos e as três grandezas pedidas.
    expect(doc).toMatch(/500 MB/);
    expect(doc).toMatch(/8 GB/);
    expect(doc).toMatch(/100 GB/);
    expect(doc).toMatch(/250 GB/);
    // Quantas fotos por dia cabem.
    expect(doc).toMatch(/por dia/);
    expect(doc).toMatch(/1,5 MB|1\.5 MB/);
    // Datar o que é volátil (regra 6 do CLAUDE.md).
    expect(doc).toMatch(/verificado em 2026-09-07/);
    expect(doc).toMatch(/REVERIFICAR/);
  });

  test('os limites que o relatório cita são os do código', () => {
    expect(PHOTO_MAX_BYTES).toBe(1_572_864);
    expect(PHOTO_MAX_DIMENSION).toBe(1600);
    expect(SIGNED_URL_TTL_SECONDS).toBe(3600);
    expect(LIMITS.feedPage).toBe(20);
    expect(LIMITS.postPhotos).toBe(4);
    // O bucket recusa o mesmo teto que o aparelho.
    expect(sql).toMatch(/'community-photos', false, 1572864/);
    // E o limite diário é de POSTS, não de fotos nem de bytes (está no relatório).
    expect(sql).toMatch(/\('max_posts_per_day',\s*'10'\)/);
  });
});
