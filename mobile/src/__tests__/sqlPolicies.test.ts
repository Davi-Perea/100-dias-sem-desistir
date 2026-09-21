import fs from 'fs';
import path from 'path';

/**
 * AUDITORIA ESTÁTICA das migrations.
 *
 * O QUE ESTE ARQUIVO PROVA: que as invariantes de segurança que decidimos estão
 * escritas no SQL — RLS ligada em toda tabela, nenhuma concessão a `anon`,
 * `app_admins` sem policy de escrita, nenhuma entrada em grupo pelo próprio
 * cliente (D1), saída só de 'active' para 'left' (D4), privilégio por coluna em
 * profiles (D2), trigger de imutabilidade de papel, funções SECURITY DEFINER no
 * schema `private` com search_path vazio e EXECUTE revogado de PUBLIC (D3/D5),
 * e invólucros SECURITY INVOKER em `public` com o mesmo nome.
 *
 * Desenho atualizado em 2026-09-21 para as migrations endurecidas
 * (docs/technical/SEGURANCA_MIGRATIONS_CORRECOES.md).
 *
 * O QUE NÃO PROVA: que o Postgres aceita e aplica essas políticas. Isso só se
 * prova executando as migrations num banco real e tentando violar cada regra
 * com sessões de member, leader e admin — é o papel dos arquivos pgTAP em
 * supabase/tests/, que também estão NÃO EXECUTADOS (sem banco nesta máquina).
 * Teste com mock ou com regex não vira prova de RLS.
 */
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');
const SEED_PATH = path.join(__dirname, '..', '..', 'supabase', 'seed.dev.sql');

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
const sql = migrationFiles.map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

const FOUNDATION_TABLES = ['profiles', 'groups', 'group_memberships', 'app_admins', 'admin_audit_log'];

type FnDef = { name: string; header: string; body: string; full: string };

/** Todas as funções criadas, separando o cabeçalho (antes do primeiro $$) do corpo. */
const functions: FnDef[] = [...sql.matchAll(/create or replace function ([\w.]+)\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)].map(
  (m) => ({ name: m[1], header: m[2], body: m[3], full: m[0] }),
);

function fn(name: string): FnDef {
  const found = functions.find((f) => f.name === name);
  if (!found) throw new Error(`função ${name} não encontrada nas migrations`);
  return found;
}

const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);
const membershipPolicies = policies.filter((p) => /on public\.group_memberships/.test(p));

describe('escopo do schema', () => {
  test('as migrations existem e estão ordenadas', () => {
    expect(migrationFiles.length).toBeGreaterThanOrEqual(2);
    expect(migrationFiles).toEqual([...migrationFiles].sort());
  });

  test('só a fundação foi criada: nada de feed, reações, denúncias ou push', () => {
    const created = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort();
    expect(created).toEqual([...FOUNDATION_TABLES].sort());
  });

  test('não existem tabelas de conteúdo local-only no servidor', () => {
    for (const forbidden of ['fasting', 'reflection', 'reader_position', 'preferences']) {
      expect(sql).not.toMatch(new RegExp(`create table public\\.\\w*${forbidden}`, 'i'));
    }
  });
});

describe('RLS ligada e fechada por padrão', () => {
  test.each(FOUNDATION_TABLES)('%s tem row level security habilitada', (table) => {
    expect(sql).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`));
  });

  test('nenhuma policy concede acesso a anon', () => {
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy).not.toMatch(/\bto\s+[^;]*\banon\b/);
    }
  });

  test('privilégios são revogados de anon explicitamente', () => {
    expect(sql).toMatch(/revoke all on[\s\S]*?from anon/);
  });

  test('toda policy declara o papel a que se aplica', () => {
    for (const policy of policies) {
      expect(policy).toMatch(/\bto\s+authenticated\b/);
    }
  });

  test('nenhuma policy é aberta com using (true)', () => {
    for (const policy of policies) {
      expect(policy).not.toMatch(/using\s*\(\s*true\s*\)/);
    }
  });
});

describe('membro não vira líder nem admin', () => {
  test('D1/SEC-03: não existe policy de INSERT do próprio cliente em group_memberships', () => {
    // A única policy que escreve em memberships é a do admin (for all + is_app_admin).
    const writers = membershipPolicies.filter((p) => /\bfor (insert|all)\b/.test(p));
    expect(writers).toHaveLength(1);
    expect(writers[0]).toMatch(/"admin gerencia memberships"/);
    expect(writers[0]).toMatch(/private\.is_app_admin\(\)/);
    expect(sql).not.toMatch(/create policy "entro em grupo ativo como membro"/);
  });

  test('D4/SEC-02: sair do grupo só vai de active para left, nunca de volta', () => {
    const leave = membershipPolicies.find((p) => /"saio do meu grupo"/.test(p)) ?? '';
    expect(leave).toMatch(/for update to authenticated/);
    expect(leave).toMatch(/using \(\(select auth\.uid\(\)\) = user_id and status = 'active'\)/);
    expect(leave).toMatch(/with check \(\(select auth\.uid\(\)\) = user_id and status = 'left'\)/);
    expect(leave).not.toMatch(/in \('active', 'left'\)/);
  });

  test('D4: o cliente só atualiza a coluna status de memberships', () => {
    expect(sql).toMatch(/revoke update on public\.group_memberships from authenticated;/);
    expect(sql).toMatch(/grant\s+update \(status\) on public\.group_memberships to authenticated;/);
  });

  test('existe trigger que torna o papel imutável para o cliente', () => {
    expect(sql).toMatch(/create trigger group_memberships_guard_role/);
    expect(fn('public.guard_membership_role').body).toMatch(/role só muda por ação administrativa autorizada/);
  });

  test('o trigger também impede trocar o dono da membership', () => {
    expect(fn('public.guard_membership_role').body).toMatch(/new\.user_id is distinct from old\.user_id/);
  });

  test('app_admins não tem nenhuma policy de escrita', () => {
    const adminPolicies = policies.filter((p) => /on public\.app_admins/.test(p));
    expect(adminPolicies.length).toBeGreaterThan(0);
    for (const policy of adminPolicies) {
      expect(policy).toMatch(/\bfor select\b/);
      expect(policy).not.toMatch(/\bfor (insert|update|delete|all)\b/);
    }
  });

  test('o cliente não pode alterar account_status do próprio perfil', () => {
    expect(sql).toMatch(/create trigger profiles_guard_protected_columns/);
    expect(sql).toMatch(/account_status não pode ser alterado pelo cliente/);
  });
});

describe('perfil: privilégio por coluna (D2, SEC-10)', () => {
  test('de outra pessoa só se lê user_id e display_name', () => {
    expect(sql).toMatch(/revoke select, insert, update, delete on public\.profiles from authenticated;/);
    expect(sql).toMatch(/grant\s+select \(user_id, display_name\) on public\.profiles to authenticated;/);
  });

  test('o cliente só edita display_name (nem age_band nem created_at)', () => {
    expect(sql).toMatch(/grant\s+update \(display_name\)\s+on public\.profiles to authenticated;/);
    expect(sql).not.toMatch(/grant\s+update \([^)]*(age_band|created_at|account_status)/);
  });

  test('o dono lê a própria linha inteira por my_profile(), com invólucro security invoker', () => {
    expect(fn('private.my_profile').header).toMatch(/security definer set search_path = ''/);
    expect(fn('public.my_profile').header).toMatch(/security invoker set search_path = ''/);
    expect(fn('public.my_profile').body).toMatch(/private\.my_profile\(\)/);
  });

  test('D6/SEC-03: o nome padrão não sai do e-mail', () => {
    const handler = fn('private.handle_new_user').body;
    expect(handler).not.toMatch(/email/);
    expect(handler).toMatch(/'Participante'/);
  });
});

describe('líder tem poder apenas no próprio grupo', () => {
  test('as policies de líder passam por private.is_group_leader(group_id)', () => {
    expect(functions.some((f) => f.name === 'private.is_group_leader')).toBe(true);
    expect(functions.some((f) => f.name === 'public.is_group_leader')).toBe(false);
    // Chamadas reais (fora as assinaturas de revoke/grant, que citam o tipo uuid).
    const leaderUsages = [...sql.matchAll(/is_group_leader\((\w+)\)/g)].map((m) => m[1]).filter((a) => a !== 'uuid');
    expect(leaderUsages.length).toBeGreaterThan(0);
    // Sempre amarrado ao grupo da linha, nunca a um valor vindo do cliente.
    for (const argument of leaderUsages) {
      expect(['group_id', 'target_group']).toContain(argument);
    }
  });

  test('remover membro exige líder do grupo ou admin, e não permite auto-remoção', () => {
    const remove = fn('private.remove_group_member');
    expect(remove.header).toMatch(/security definer/);
    expect(remove.header).toMatch(/set search_path = ''/);
    expect(remove.body).toMatch(/private\.is_app_admin\(\) or private\.is_group_leader\(target_group\)/);
    expect(remove.body).toMatch(/target_user = actor/);
  });

  test('SEC-05/D11: sem membership ativa, a remoção falha antes de gravar auditoria', () => {
    const body = fn('private.remove_group_member').body;
    const notFound = body.indexOf('if not found then');
    const audit = body.indexOf('insert into public.admin_audit_log');
    expect(notFound).toBeGreaterThan(-1);
    expect(audit).toBeGreaterThan(notFound);
    expect(body.slice(notFound, audit)).toMatch(/errcode = 'P0002'/);
  });

  test('o invólucro público de remove_group_member é security invoker', () => {
    const wrapper = fn('public.remove_group_member');
    expect(wrapper.header).toMatch(/security invoker set search_path = ''/);
    expect(wrapper.header).not.toMatch(/security definer/);
    expect(wrapper.body).toMatch(/private\.remove_group_member\(target_user, target_group\)/);
  });
});

describe('ação administrativa protegida e auditada', () => {
  const admin = fn('private.admin_set_group_role');

  test('a função existe em private e é SECURITY DEFINER com search_path vazio', () => {
    expect(admin.header).toMatch(/security definer/);
    expect(admin.header).toMatch(/set search_path = ''/);
  });

  test('em public só existe o invólucro security invoker, com o mesmo nome', () => {
    const wrapper = fn('public.admin_set_group_role');
    expect(wrapper.header).toMatch(/security invoker set search_path = ''/);
    expect(wrapper.header).not.toMatch(/security definer/);
    expect(wrapper.body).toMatch(/private\.admin_set_group_role\(target_user, target_group, new_role\)/);
  });

  test('verifica que o chamador é administrador antes de qualquer escrita', () => {
    const adminCheckIndex = admin.body.indexOf('is_app_admin()');
    const updateIndex = admin.body.indexOf('update public.group_memberships');
    expect(adminCheckIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(adminCheckIndex);
  });

  test('exige sessão e recusa quem não é admin', () => {
    expect(admin.body).toMatch(/sessão obrigatória/);
    expect(admin.body).toMatch(/apenas administradores podem alterar papéis/);
  });

  test('grava auditoria da mudança', () => {
    expect(admin.body).toMatch(/insert into public\.admin_audit_log/);
    expect(admin.body).toMatch(/'set_group_role'/);
  });

  test('a janela de autorização é aberta e fechada dentro da transação', () => {
    expect(admin.body).toMatch(/set_config\('app\.role_change_authorized', 'on', true\)/);
    expect(admin.body).toMatch(/set_config\('app\.role_change_authorized', 'off', true\)/);
  });

  test('a janela só é lida (nunca ligada) pela função chamável; sem EXECUTE para PUBLIC/anon', () => {
    const check = fn('private.role_change_is_authorized');
    expect(check.body).toMatch(/current_setting\('app\.role_change_authorized', true\)/);
    expect(check.body).not.toMatch(/set_config/);
    expect(sql).toMatch(/revoke all on function private\.role_change_is_authorized\(\) from public, anon;/);
    // Os triggers rodam como quem escreve: authenticated e service_role PRECISAM de EXECUTE (D5, D9).
    expect(sql).toMatch(/grant execute on function private\.role_change_is_authorized\(\) to authenticated;/);
    expect(sql).toMatch(/grant execute on function private\.role_change_is_authorized\(\) to service_role;/);
  });

  test('D3: nenhuma função SECURITY DEFINER mora em public', () => {
    const publicDefiners = functions
      .filter((f) => f.name.startsWith('public.') && /security definer/.test(f.header))
      .map((f) => f.name);
    expect(publicDefiners).toEqual([]);
  });

  test('D3: toda SECURITY DEFINER de private fixa search_path vazio', () => {
    const definers = functions.filter((f) => f.name.startsWith('private.') && /security definer/.test(f.header));
    expect(definers.length).toBeGreaterThan(0);
    for (const definer of definers) {
      expect(definer.header).toMatch(/set search_path = ''/);
    }
  });

  test('D5: toda função de private tem revoke explícito de public e anon', () => {
    const names = new Set(functions.filter((f) => f.name.startsWith('private.')).map((f) => f.name.slice(8)));
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(sql).toMatch(new RegExp(`revoke all on function private\\.${name}\\([^)]*\\)\\s+from public, anon`));
    }
  });

  test('o schema private fica fora do alcance de anon', () => {
    expect(sql).toMatch(/create schema if not exists private;/);
    expect(sql).toMatch(/revoke all on schema private from public;/);
    expect(sql).not.toMatch(/grant usage on schema private to anon/);
  });
});

describe('exclusão de conta não trava por chave estrangeira (SEC-05/D7)', () => {
  test('auditoria e concessão de admin usam on delete set null', () => {
    expect(sql).toMatch(/actor_id\s+uuid references auth\.users\(id\) on delete set null/);
    expect(sql).toMatch(/target_user_id\s+uuid references auth\.users\(id\) on delete set null/);
    expect(sql).toMatch(/granted_by uuid references auth\.users\(id\) on delete set null/);
  });

  test('perfil e memberships saem em cascata com a conta', () => {
    expect(sql).toMatch(/user_id\s+uuid primary key references auth\.users\(id\) on delete cascade/);
    expect(sql).toMatch(/user_id\s+uuid not null references auth\.users\(id\) on delete cascade/);
  });
});

describe('seed de desenvolvimento não alcança produção', () => {
  const seed = fs.readFileSync(SEED_PATH, 'utf8');

  test('vive fora de migrations, então `supabase db push` nunca o aplica', () => {
    expect(migrationFiles.some((f) => f.includes('seed'))).toBe(false);
    expect(fs.existsSync(SEED_PATH)).toBe(true);
  });

  test('recusa rodar sem a chave explícita de autorização', () => {
    expect(seed).toMatch(/app\.allow_dev_seed/);
    expect(seed).toMatch(/SEED DE DESENVOLVIMENTO BLOQUEADO/);
  });

  test('a função de seed mora em private e não tem EXECUTE para ninguém do aplicativo', () => {
    expect(seed).toMatch(/create or replace function private\.dev_seed_roles/);
    expect(seed).toMatch(/revoke all on function private\.dev_seed_roles\(text, text, text\) from public, anon, authenticated/);
    expect(seed).not.toMatch(/grant execute on function (public|private)\.dev_seed_roles/);
  });

  test('cria os papéis de teste pedidos: 1 membro, 1 líder, 1 admin e 2 grupos', () => {
    expect(seed).toMatch(/'member'/);
    expect(seed).toMatch(/'leader'/);
    expect(seed).toMatch(/insert into public\.app_admins/);
    const groupInserts = seed.match(/'(Intercessão|Louvor)'/g) ?? [];
    expect(new Set(groupInserts).size).toBe(2);
  });
});
