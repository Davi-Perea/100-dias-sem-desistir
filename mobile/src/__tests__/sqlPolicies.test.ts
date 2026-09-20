import fs from 'fs';
import path from 'path';

/**
 * AUDITORIA ESTÁTICA das migrations.
 *
 * O QUE ESTE ARQUIVO PROVA: que as invariantes de segurança que decidimos estão
 * escritas no SQL — RLS ligada em toda tabela, nenhuma concessão a `anon`,
 * `app_admins` sem policy de escrita, entrada em grupo restrita a "member",
 * trigger de imutabilidade de papel, funções administrativas SECURITY DEFINER
 * com verificação de admin e search_path fixo.
 *
 * O QUE NÃO PROVA: que o Postgres aceita e aplica essas políticas. Isso só se
 * prova executando as migrations num banco real e tentando violar cada regra
 * com sessões de member, leader e admin. Sem Docker nesta máquina não há banco
 * local, e não há projeto remoto autorizado: no relatório isso está como
 * NOT TESTED, e teste com mock não vira prova de RLS.
 */
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');
const SEED_PATH = path.join(__dirname, '..', '..', 'supabase', 'seed.dev.sql');

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
const sql = migrationFiles.map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

const FOUNDATION_TABLES = ['profiles', 'groups', 'group_memberships', 'app_admins', 'admin_audit_log'];

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
    const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy).not.toMatch(/\bto\s+[^;]*\banon\b/);
    }
  });

  test('privilégios são revogados de anon explicitamente', () => {
    expect(sql).toMatch(/revoke all on[\s\S]*?from anon/);
  });

  test('toda policy declara o papel a que se aplica', () => {
    const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);
    for (const policy of policies) {
      expect(policy).toMatch(/\bto\s+authenticated\b/);
    }
  });
});

describe('membro não vira líder nem admin', () => {
  test('entrar em grupo exige role "member" na própria policy', () => {
    const insertPolicy = sql.match(/create policy "entro em grupo ativo como membro"[\s\S]*?;/)?.[0] ?? '';
    expect(insertPolicy).toMatch(/with check/);
    expect(insertPolicy).toMatch(/role = 'member'/);
    expect(insertPolicy).toMatch(/auth\.uid\(\)\) = user_id/);
  });

  test('existe trigger que torna o papel imutável para o cliente', () => {
    expect(sql).toMatch(/create trigger group_memberships_guard_role/);
    expect(sql).toMatch(/function public\.guard_membership_role/);
    expect(sql).toMatch(/role só muda por ação administrativa autorizada/);
  });

  test('o trigger também impede trocar o dono da membership', () => {
    const guard = sql.match(/function public\.guard_membership_role[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(guard).toMatch(/new\.user_id is distinct from old\.user_id/);
  });

  test('app_admins não tem nenhuma policy de escrita', () => {
    const adminPolicies = [...sql.matchAll(/create policy[^;]*on public\.app_admins[\s\S]*?;/g)].map((m) => m[0]);
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

describe('líder tem poder apenas no próprio grupo', () => {
  test('as policies de líder passam por is_group_leader(group_id)', () => {
    expect(sql).toMatch(/function public\.is_group_leader/);
    const leaderUsages = [...sql.matchAll(/is_group_leader\((\w+)\)/g)].map((m) => m[1]);
    expect(leaderUsages.length).toBeGreaterThan(0);
    // Sempre amarrado ao grupo da linha, nunca a um valor vindo do cliente.
    for (const argument of leaderUsages) {
      expect(['group_id', 'target_group']).toContain(argument);
    }
  });

  test('remover membro exige líder do grupo ou admin, e não permite auto-remoção', () => {
    const fn = sql.match(/function public\.remove_group_member[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(fn).toMatch(/security definer/);
    expect(fn).toMatch(/is_app_admin\(\) or public\.is_group_leader\(target_group\)/);
    expect(fn).toMatch(/target_user = actor/);
  });
});

describe('ação administrativa protegida e auditada', () => {
  const fn = sql.match(/function public\.admin_set_group_role[\s\S]*?\$\$;/)?.[0] ?? '';

  test('a função existe e é SECURITY DEFINER com search_path fixo', () => {
    expect(fn).toMatch(/security definer/);
    expect(fn).toMatch(/set search_path = public/);
  });

  test('verifica que o chamador é administrador antes de qualquer escrita', () => {
    const adminCheckIndex = fn.indexOf('is_app_admin()');
    const updateIndex = fn.indexOf('update public.group_memberships');
    expect(adminCheckIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(adminCheckIndex);
  });

  test('exige sessão e recusa quem não é admin', () => {
    expect(fn).toMatch(/sessão obrigatória/);
    expect(fn).toMatch(/apenas administradores podem alterar papéis/);
  });

  test('grava auditoria da mudança', () => {
    expect(fn).toMatch(/insert into public\.admin_audit_log/);
    expect(fn).toMatch(/'set_group_role'/);
  });

  test('a janela de autorização é aberta e fechada dentro da transação', () => {
    expect(fn).toMatch(/set_config\('app\.role_change_authorized', 'on', true\)/);
    expect(fn).toMatch(/set_config\('app\.role_change_authorized', 'off', true\)/);
  });

  test('o cliente não pode ligar a janela de autorização', () => {
    expect(sql).toMatch(/revoke execute on function public\.role_change_is_authorized\(\) from anon, authenticated/);
  });

  test('funções auxiliares fixam search_path (evita sequestro por schema)', () => {
    const definers = [...sql.matchAll(/create or replace function public\.\w+[\s\S]*?security definer[\s\S]*?\$\$/g)];
    expect(definers.length).toBeGreaterThan(0);
    for (const [body] of definers) {
      expect(body).toMatch(/set search_path = public/);
    }
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

  test('a função de seed não tem GRANT para o aplicativo', () => {
    expect(seed).toMatch(/revoke execute on function public\.dev_seed_roles\(text, text, text\) from anon, authenticated/);
    expect(seed).not.toMatch(/grant execute on function public\.dev_seed_roles/);
  });

  test('cria os papéis de teste pedidos: 1 membro, 1 líder, 1 admin e 2 grupos', () => {
    expect(seed).toMatch(/'member'/);
    expect(seed).toMatch(/'leader'/);
    expect(seed).toMatch(/insert into public\.app_admins/);
    const groupInserts = seed.match(/'(Intercessão|Louvor)'/g) ?? [];
    expect(new Set(groupInserts).size).toBe(2);
  });
});
