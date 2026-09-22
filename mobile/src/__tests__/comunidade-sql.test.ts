import fs from 'fs';
import path from 'path';

/**
 * AUDITORIA ESTÁTICA das migrations da Comunidade (V2).
 *
 * PROVA: que as regras que decidimos estão ESCRITAS no SQL (RLS em tudo, nada de
 * tabela para o app, Amém visível sem user_id (F3, decisão do fundador de
 * 2026-09-22; antes era "sem contagem"), foto só com aprovação humana ou do filtro
 * automático, padrão private + invólucro invoker, exclusão em cascata, bucket privado).
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
  // Diário compartilhado (2026-09-22): fotos do post (F1) e atividade no app (F8).
  'community_post_photos',
  'community_activity',
  // Amém em comentário (2026-09-23).
  'community_comment_amens',
];

type FnDef = { name: string; header: string; body: string };
const functions: FnDef[] = [...sql.matchAll(/create or replace function ([\w.]+)\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)].map(
  (m) => ({ name: m[1], header: m[2], body: m[3] }),
);
/** A definição que vale: a ÚLTIMA (migrations posteriores fazem `create or replace`). */
function fn(name: string): FnDef {
  const found = [...functions].reverse().find((f) => f.name === name);
  if (!found) throw new Error(`função ${name} não encontrada`);
  return found;
}
const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);

describe('arquivos', () => {
  test('migrations da comunidade depois da fundação (5ª perfil v2, 6ª diário compartilhado, 7ª Amém em comentário, 8ª perfil leve do Juntos, 9ª igreja inteira) e os pgTAP', () => {
    expect(communityFiles).toEqual([
      '20260921130000_comunidade_tabelas.sql',
      '20260921130100_comunidade_funcoes.sql',
      '20260921130200_comunidade_storage.sql',
      '20260921140000_comunidade_edge_functions.sql',
      '20260922120000_comunidade_perfil_v2.sql',
      '20260922180000_comunidade_diario.sql',
      '20260923040000_comunidade_amem_comentario.sql',
      '20260923050000_comunidade_juntos_perfil_leve.sql',
      '20260923060000_comunidade_igreja_inteira.sql',
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
    const revokes = [...sql.matchAll(/revoke all on (public\.[\s\S]*?) from anon, authenticated;/g)].map((m) => m[1]);
    expect(revokes.some((list) => list.split(/,\s*/).map((t) => t.trim()).includes(`public.${table}`))).toBe(true);
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

describe('Amém visível (F3, decisão do fundador de 2026-09-22)', () => {
  test('nenhuma TABELA guarda contagem: o número é calculado na leitura', () => {
    const tableBlocks = [...sql.matchAll(/(create table|alter table)[\s\S]*?;/g)].map((m) => m[0]);
    for (const block of tableBlocks) expect(block).not.toMatch(/amen_count|amens_count|count_amen/i);
  });

  test('o feed devolve número, rostinhos e o MEU Amém, e nenhum id de pessoa', () => {
    const feed = fn('public.community_feed').header;
    expect(feed).toMatch(/i_said_amen boolean/);
    expect(feed).toMatch(/amen_count int/);
    expect(feed).toMatch(/amen_faces jsonb/);
    expect(feed).not.toMatch(/user_id|author_id|actor_id/);
    expect(fn('private.community_feed').body).toMatch(/am\.post_id = pg\.id and am\.user_id = me\.uid/);
  });

  test('rostinho = nome, foto APROVADA (a minha sempre) e se é o meu; no máximo 3; bloqueio nos dois sentidos', () => {
    const faces = fn('private.amen_faces_for').body;
    expect(faces).toMatch(/jsonb_build_object\('name', f\.display_name, 'avatar_path', f\.avatar, 'is_mine', f\.mine\)/);
    expect(faces).not.toMatch(/'user_id'|'id'/);
    expect(faces).toMatch(/case when ap\.avatar_status = 'approved' or ap\.user_id = viewer then ap\.avatar_path end/);
    expect(faces).toMatch(/limit 3/);
    expect(faces).toMatch(/not private\.blocked_between\(viewer, am\.user_id\)/);
    expect(fn('private.amen_count_for').body).toMatch(/not private\.blocked_between\(viewer, am\.user_id\)/);
  });

  test('a tabela de Amém continua fechada: cada um lê só a própria linha, sem user_id', () => {
    expect(sql).toMatch(/grant select \(post_id, created_at\) on public\.community_amens to authenticated;/);
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
    expect(body).toMatch(/limit 20\s*\)/);
  });

  test('moderação exige papel, motivo para remover, e ninguém modera o próprio conteúdo', () => {
    const body = fn('private.moderate_community_post').body;
    expect(body).toMatch(/private\.is_community_moderator\(\)/);
    expect(body).toMatch(/recusar ou remover exige motivo/);
    expect(body).toMatch(/v_author = v_uid/);
  });

  test('marcar Amém exige consentimento, nome e 16+ no servidor; desmarcar continua livre', () => {
    const body = fn('private.set_amen').body;
    const [unmark, mark] = body.split(/return false;\s*end if;/);
    expect(unmark).toMatch(/private\.assert_member\(\)/);
    expect(unmark).not.toMatch(/perform private\.assert_(can_publish|consents)/);
    // O rostinho do Amém mostra o NOME de quem deu (private.amen_faces_for): marcar exige
    // o mesmo que publicar (consentimento + regras + nome + 16+), como a tela única pede.
    expect(mark).toMatch(/perform private\.assert_can_publish\(\);/);
    expect(mark.indexOf('perform private.assert_can_publish')).toBeLessThan(mark.indexOf('insert into public.community_amens'));
    expect(fn('private.assert_consents').body).toMatch(/private\.has_current_consents\(v_uid\)/);
    // Publicar = consentimentos + perfil completo (C4).
    expect(fn('private.assert_can_publish').body).toMatch(/private\.assert_consents\(\)/);
    expect(fn('private.assert_can_publish').body).toMatch(/private\.community_profile_complete\(v_uid\)/);
  });

  test('C2: a comunidade não barra mais a conta ligada ao aparelho (sessão anônima)', () => {
    for (const name of [
      'private.assert_member',
      'private.assert_consents',
      'private.assert_can_publish',
      'private.can_publish',
      'private.accept_community_terms',
      'private.join_community',
    ]) {
      expect(fn(name).body).not.toMatch(/is_anonymous_session/);
    }
  });

  test('C3: entrar não pede código; redeem_invite_code sai e CM001 não fala em código', () => {
    expect(fn('private.join_community').body).not.toMatch(/invite_code/);
    expect(fn('private.join_community').body).toMatch(/errcode = 'CM004'/);
    expect(sql).toContain('drop function public.redeem_invite_code(text, text, boolean);');
    expect(sql).toContain('grant execute on function public.join_community(text) to authenticated;');
    expect(sql).toContain('revoke all on function public.join_community(text) from public, anon;');
    expect(fn('private.assert_member').body).toMatch(/'crie seu perfil para entrar na comunidade' using errcode = 'CM001'/);
    expect(fn('private.assert_member').body).not.toMatch(/código/);
  });

  test('C4: foto de perfil só aparece para os outros aprovada; a moderação decide pelo ticket, sem user_id', () => {
    expect(fn('private.community_feed').body).toMatch(
      /case when a\.avatar_status = 'approved' or p\.author_id = me\.uid then a\.avatar_path end/,
    );
    expect(fn('private.can_view_community_photo').body).toMatch(/cp\.avatar_status = 'approved'/);
    expect(fn('public.community_avatar_queue').header).not.toMatch(/user_id/);
    expect(fn('private.moderate_community_avatar').body).toMatch(/ninguém modera a própria foto/);
    expect(fn('private.service_enqueue_orphan_photos').body).toMatch(/cp\.avatar_path = o\.name/);
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

describe('Amém em comentário (2026-09-23)', () => {
  test('mesmas regras do post: marcar pede consentimento, nome e 16+, desmarcar é livre, só comentário que eu posso ver', () => {
    const body = fn('private.set_comment_amen').body;
    const [unmark, mark] = body.split(/return false;\s*end if;/);
    expect(unmark).toMatch(/private\.assert_member\(\)/);
    expect(unmark).not.toMatch(/perform private\.assert_(can_publish|consents)/);
    expect(mark.indexOf('perform private.assert_can_publish')).toBeGreaterThanOrEqual(0);
    expect(mark.indexOf('perform private.assert_can_publish')).toBeLessThan(mark.indexOf('insert into public.community_comment_amens'));
    expect(mark).toContain('private.can_amen_comment(target_comment, v_uid)');
    const can = fn('private.can_amen_comment').body;
    expect(can).toContain("c.status = 'published'");
    expect(can).toContain('not private.blocked_between(viewer, c.author_id)');
    expect(can).toContain('private.can_view_post(c.post_id, viewer)');
  });

  test('o número vem sem id de pessoa e sem quem tem bloqueio com quem lê', () => {
    expect(fn('public.community_comment_amens').header).not.toMatch(/user_id|author_id|actor_id/);
    expect(fn('private.community_comment_amens').body).toContain('not private.blocked_between((select auth.uid()), ca.user_id)');
  });

  test('sair, revogar e apagar a conta levam os Amém em comentário', () => {
    const [beforeDrop] = fn('private.purge_community_member').body.split(/if drop_profile then/);
    expect(beforeDrop).toContain('delete from public.community_comment_amens ca where ca.user_id = target');
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
    // Desde 2026-09-22 as fotos moram em community_post_photos (até 4 por post).
    expect(sql).toMatch(/create trigger community_post_photos_enqueue\s+after delete on public\.community_post_photos/);
    expect(fn('private.enqueue_post_photo_row').header).toMatch(/security definer set search_path = ''/);
    expect(fn('private.enqueue_post_photo_row').body).toMatch(/insert into private\.storage_deletion_queue/);
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

describe('diário compartilhado (F1, F5, F6, F8 — 2026-09-22)', () => {
  test('F1: até 4 fotos por post, em ordem; versículo só como referência (nunca texto)', () => {
    expect(sql).toMatch(/sort_order\s+smallint not null check \(sort_order between 0 and 3\)/);
    expect(fn('private.create_community_post').body).toMatch(/if v_count > 4 then/);
    const posts = sql.match(/alter table public\.community_posts\s+add column activity[\s\S]*?;/)?.[0] ?? '';
    expect(posts).toMatch(/verse_book text/);
    expect(posts).not.toMatch(/verse_text|texto/);
  });

  test('F5: foto espera o filtro ou uma pessoa; texto segurado nunca é publicado pelo filtro de imagem', () => {
    const record = fn('private.service_record_photo_checks').body;
    expect(record).toMatch(/v_status = 'in_review' and v_hold = 'foto' and v_decided is null and v_open = 0/);
    expect(record).toMatch(/values \('automatico', 'approve', target_post, v_author\)/);
    for (const name of ['service_record_photo_checks', 'service_post_photos_for_check', 'service_pending_photo_posts']) {
      for (const schema of ['public', 'private']) {
        expect(sql).toMatch(new RegExp(`revoke all on function ${schema}\\.${name}\\([^)]*\\)\\s+from public, anon, authenticated;`));
        expect(sql).toMatch(new RegExp(`grant execute on function ${schema}\\.${name}\\([^)]*\\) to service_role;`));
        expect(sql).not.toMatch(new RegExp(`grant execute on function ${schema}\\.${name}\\([^)]*\\) to authenticated`));
      }
    }
  });

  // F6 SUPERADO em 2026-09-22: acabou o público por ministério.
  test('igreja inteira: publicar recusa qualquer público que não seja "igreja" e grava sempre "igreja"', () => {
    const body = fn('private.create_community_post').body;
    expect(body).toMatch(/if v_audience <> 'igreja' then/);
    expect(body).toMatch(/using errcode = '22023'/);
    expect(body).not.toMatch(/into v_ministry/);
    // A coluna continua na tabela, e a linha ANTIGA de ministério continua restrita.
    expect(fn('private.can_view_post').body).toMatch(
      /private\.audience_allows\(p\.audience, p\.audience_ministry, p\.author_id, viewer\)/,
    );
    expect(sql).not.toMatch(/drop column audience/);
  });

  test('igreja inteira: o feed é um só (sem feed_scope)', () => {
    expect(fn('public.community_feed').header).not.toMatch(/feed_scope/);
    expect(fn('private.community_feed').body).not.toMatch(/feed_scope/);
    expect(sql).toContain('drop function public.community_feed(timestamptz, uuid, text);');
    expect(sql).toMatch(/grant execute on function public\.community_feed\(timestamptz, uuid\) to authenticated;/);
  });

  test('F8: a atividade não devolve id de pessoa e respeita o bloqueio; sem push', () => {
    expect(fn('public.my_community_activity').header).not.toMatch(/actor_id|user_id|recipient_id/);
    expect(fn('private.my_visible_activity').body).toMatch(/not private\.blocked_between\(\(select auth\.uid\(\)\), ac\.actor_id\)/);
    expect(sql).toMatch(/revoke all on function private\.my_visible_activity\(\) from public, anon, authenticated;/);
    expect(sql).not.toMatch(/expo_push|push_token/i);
  });
});
