import fs from 'fs';
import path from 'path';

/**
 * AUDITORIA ESTÁTICA das migrations da Comunidade (V2).
 *
 * PROVA: que as regras que decidimos estão ESCRITAS no SQL (RLS em tudo, nada de
 * tabela para o app, Amém sem contagem, foto só com aprovação, padrão private +
 * invólucro invoker, exclusão em cascata, bucket privado).
 * NÃO PROVA: que o Postgres aplica. Isso é dos pgTAP 07–10 em supabase/tests/,
 * NÃO EXECUTADOS (não há banco nesta máquina).
 */
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');
const TESTS_DIR = path.join(__dirname, '..', '..', 'supabase', 'tests');
const allFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
const communityFiles = allFiles.filter((f) => f.includes('comunidade'));
const sql = communityFiles.map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

const COMMUNITY_TABLES = [
  'community_profiles',
  'community_moderators',
  'consent_records',
  'community_posts',
  'community_comments',
  'community_amens',
  'community_blocks',
  'community_reports',
  'community_moderation_actions',
];

type FnDef = { name: string; header: string; body: string };
const functions: FnDef[] = [...sql.matchAll(/create or replace function ([\w.]+)\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)].map(
  (m) => ({ name: m[1], header: m[2], body: m[3] }),
);
function fn(name: string): FnDef {
  const found = functions.find((f) => f.name === name);
  if (!found) throw new Error(`função ${name} não encontrada`);
  return found;
}
const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);

describe('arquivos', () => {
  test('quatro migrations novas, depois da fundação, e quatro pgTAP novos', () => {
    expect(communityFiles).toEqual([
      '20260921130000_comunidade_tabelas.sql',
      '20260921130100_comunidade_funcoes.sql',
      '20260921130200_comunidade_storage.sql',
      '20260921140000_comunidade_edge_functions.sql',
    ]);
    const foundation = allFiles.filter((f) => !f.includes('comunidade'));
    expect(foundation.every((f) => f < communityFiles[0])).toBe(true);
    const tests = fs.readdirSync(TESTS_DIR).filter((f) => /^(07|08|09|10)_comunidade/.test(f));
    expect(tests).toHaveLength(4);
  });

  test('todo arquivo está marcado NÃO EXECUTADO', () => {
    for (const f of communityFiles) {
      expect(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).toMatch(/NÃO EXECUTADO/);
    }
  });

  test('nenhum delimitador $ isolado (o erro D10 que impedia a fundação de rodar)', () => {
    const withoutRegexAnchors = sql.replace(/\$'/g, "'");
    expect(withoutRegexAnchors).not.toMatch(/(^|[^$])\$(?!\$)/m);
  });
});

describe('tabelas fechadas para o app', () => {
  test.each(COMMUNITY_TABLES)('%s tem RLS ligada e privilégios revogados de anon e authenticated', (table) => {
    expect(sql).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`));
    const revoke = sql.match(/revoke all on public\.community_profiles[\s\S]*?from anon, authenticated;/)?.[0] ?? '';
    expect(revoke).toContain(`public.${table}`);
  });

  test('só existem duas policies nas tabelas da comunidade, ambas de leitura da própria linha', () => {
    const onCommunity = policies.filter((p) => /on public\.(community_|consent_records)/.test(p));
    expect(onCommunity).toHaveLength(2);
    for (const policy of onCommunity) {
      expect(policy).toMatch(/for select to authenticated/);
      expect(policy).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    }
  });

  test('o app só recebe GRANT de leitura em Amém (sem user_id) e nos próprios consentimentos', () => {
    const grants = [...sql.matchAll(/grant ([^;]*?) on public\.(\w+) to authenticated;/g)].map((m) => ({
      what: m[1],
      table: m[2],
    }));
    expect(grants.map((g) => g.table).sort()).toEqual(['community_amens', 'consent_records']);
    const amen = grants.find((g) => g.table === 'community_amens');
    expect(amen?.what).toBe('select (post_id, created_at)');
    for (const g of grants) expect(g.what).toMatch(/^select \(/);
  });

  test('nenhuma policy fala com anon nem é aberta', () => {
    for (const policy of policies) {
      expect(policy).toMatch(/\bto authenticated\b/);
      expect(policy).not.toMatch(/\bto\s+[^;]*\banon\b/);
      expect(policy).not.toMatch(/using\s*\(\s*true\s*\)/);
    }
  });
});

describe('Amém sem contagem', () => {
  test('nenhuma tabela nem RPC tem contagem de Amém', () => {
    expect(sql).not.toMatch(/amen_count|amens_count|count_amen/i);
    const feed = fn('public.community_feed').header;
    expect(feed).toMatch(/i_said_amen boolean/);
    expect(feed).not.toMatch(/count/);
  });

  test('o feed só consulta o Amém de quem pergunta', () => {
    expect(fn('private.community_feed').body).toMatch(/am\.post_id = p\.id and am\.user_id = \(select auth\.uid\(\)\)/);
  });
});

describe('padrão private + invólucro invoker (D3/D5)', () => {
  const publicFns = functions.filter((f) => f.name.startsWith('public.'));
  const privateFns = functions.filter((f) => f.name.startsWith('private.'));

  test('nenhuma SECURITY DEFINER em public; todo invólucro chama a função de mesmo nome em private', () => {
    expect(publicFns.length).toBeGreaterThan(15);
    for (const f of publicFns) {
      expect(f.header).toMatch(/security invoker set search_path = ''/);
      expect(f.header).not.toMatch(/security definer/);
      const short = f.name.slice('public.'.length);
      expect(f.body).toMatch(new RegExp(`private\\.${short}\\(`));
    }
  });

  test('toda SECURITY DEFINER de private fixa search_path vazio', () => {
    for (const f of privateFns.filter((p) => /security definer/.test(p.header))) {
      expect(f.header).toMatch(/set search_path = ''/);
    }
  });

  test('toda função nova tem revoke explícito de PUBLIC e anon', () => {
    for (const f of functions) {
      const [schema, name] = f.name.split('.');
      expect(sql).toMatch(new RegExp(`revoke all on function ${schema}\\.${name}\\([^)]*\\)\\s+from public, anon`));
    }
  });

  test('funções da fila do Storage só para a chave de serviço', () => {
    for (const name of ['claim_storage_deletions', 'confirm_storage_deletion']) {
      for (const schema of ['public', 'private']) {
        expect(sql).toMatch(new RegExp(`revoke all on function ${schema}\\.${name}\\([^)]*\\)\\s+from public, anon, authenticated;`));
        expect(sql).toMatch(new RegExp(`grant execute on function ${schema}\\.${name}\\([^)]*\\) to service_role;`));
        expect(sql).not.toMatch(new RegExp(`grant execute on function ${schema}\\.${name}\\([^)]*\\) to authenticated`));
      }
    }
  });
});

describe('regras de conteúdo', () => {
  test('foto vai SEMPRE para análise humana; texto só aparece na hora se o filtro deixar', () => {
    const body = fn('private.create_community_post').body;
    expect(body).toMatch(/v_hold := 'foto';/);
    expect(body).toMatch(/case when v_hold is null then 'published'/);
    expect(body).toMatch(/o\.owner_id = v_uid::text/);
  });

  test('publicar e comentar exigem consentimento vigente (assert_can_publish)', () => {
    expect(fn('private.create_community_post').body).toMatch(/private\.assert_can_publish\(\)/);
    expect(fn('private.create_community_comment').body).toMatch(/private\.assert_can_publish\(\)/);
    expect(fn('private.has_current_consents').body).toMatch(/<> 'PENDENTE'/);
  });

  test('bloqueio vale nos dois sentidos', () => {
    const blocked = fn('private.blocked_between').body;
    expect(blocked).toMatch(/bl\.blocker_id = a and bl\.blocked_id = b/);
    expect(blocked).toMatch(/bl\.blocker_id = b and bl\.blocked_id = a/);
    expect(fn('private.can_view_post').body).toMatch(/not private\.blocked_between\(viewer, p\.author_id\)/);
  });

  test('denúncia de criança ou rosto de terceiro tira do ar na hora', () => {
    const body = fn('private.report_community_content').body;
    expect(body).toMatch(/v_reason in \('crianca_exposta', 'rosto_de_terceiro'\)/);
    expect(body).toMatch(/set status = 'in_review', hold_reason = 'denuncia'/);
  });

  test('feed com fim: janela de dias e teto fixo de 20', () => {
    const body = fn('private.community_feed').body;
    expect(body).toMatch(/feed_window_days/);
    expect(body).toMatch(/limit 20;/);
  });

  test('moderação exige papel, motivo para remover, e ninguém modera o próprio conteúdo', () => {
    const body = fn('private.moderate_community_post').body;
    expect(body).toMatch(/private\.is_community_moderator\(\)/);
    expect(body).toMatch(/recusar ou remover exige motivo/);
    expect(body).toMatch(/v_author = v_uid/);
  });

  test('marcar Amém exige consentimento vigente no servidor; desmarcar continua livre', () => {
    const body = fn('private.set_amen').body;
    const [unmark, mark] = body.split(/return false;\s*end if;/);
    expect(unmark).toMatch(/private\.assert_member\(\)/);
    expect(unmark).not.toMatch(/perform private\.assert_can_publish/);
    expect(mark).toMatch(/perform private\.assert_can_publish\(\);/);
    expect(mark.indexOf('perform private.assert_can_publish')).toBeLessThan(
      mark.indexOf('insert into public.community_amens'),
    );
    expect(fn('private.assert_can_publish').body).toMatch(/private\.has_current_consents\(v_uid\)/);
  });

  test('prazo da denúncia comum é 24 h (Apple 1.2) e o urgente, 4 h', () => {
    expect(sql).toMatch(/\('report_due_hours',\s*'24'\)/);
    expect(sql).toMatch(/\('urgent_report_due_hours',\s*'4'\)/);
  });

  test('nem a moderação recebe o user_id de outra pessoa', () => {
    for (const name of ['community_moderation_queue', 'community_open_reports']) {
      for (const schema of ['private', 'public']) {
        const header = fn(`${schema}.${name}`).header;
        expect(header).not.toMatch(/author_id|reported_user_id/);
      }
    }
    // A função que recebe user_id não é alcançável pela API; suspender vai pelo conteúdo.
    expect(functions.some((f) => f.name === 'public.set_community_member_status')).toBe(false);
    expect(sql).toMatch(
      /revoke all on function private\.set_community_member_status\(uuid, text, text, text\) from public, anon, authenticated;/,
    );
    expect(sql).not.toMatch(/grant execute on function private\.set_community_member_status/);
    const suspend = fn('private.suspend_community_author').body;
    expect(suspend).toMatch(/private\.is_community_moderator\(\)/);
    expect(suspend).toMatch(/num_nonnulls\(target_post, target_comment, target_report\) <> 1/);
  });
});

describe('exclusão de conta e LGPD', () => {
  test('revogar o consentimento NÃO desfaz os bloqueios; só sair da comunidade ou apagar a conta desfaz', () => {
    const body = fn('private.purge_community_member').body;
    const [beforeDrop, insideDrop] = body.split(/if drop_profile then/);
    expect(beforeDrop).not.toMatch(/community_blocks/);
    expect(insideDrop).toMatch(/delete from public.community_blocks bl where bl.blocker_id = target/);
  });

  test('toda referência a auth.users é cascade ou set null (nada trava a exclusão)', () => {
    const refs = [...sql.matchAll(/references auth\.users\(id\)([^,\n]*)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(10);
    for (const r of refs) expect(r).toMatch(/on delete (cascade|set null)/);
  });

  test('foto de post apagado (inclusive em cascata) vai para a fila do Storage', () => {
    expect(sql).toMatch(/create trigger community_posts_enqueue_photo\s+after delete or update of photo_path/);
    expect(fn('private.enqueue_post_photo').header).toMatch(/security definer set search_path = ''/);
  });

  test('bucket privado, só JPEG, com limite de tamanho', () => {
    expect(sql).toMatch(/values \('community-photos', 'community-photos', false, 1572864, array\['image\/jpeg'\]\)/);
    expect(sql).toMatch(/set public = false/);
  });

  test('código de entrada guardado só como hash', () => {
    expect(sql).toMatch(/code_sha256 text not null unique/);
    expect(sql).not.toMatch(/create table [\w.]*invite_codes[\s\S]*?\bcode\s+text/);
  });
});
