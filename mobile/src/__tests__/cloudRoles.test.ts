import type { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import { _setSupabaseClientForTests } from '@/cloud/client';
import { _setCloudConfigForTests } from '@/cloud/config';
import {
  adminSetGroupRole,
  getEffectiveRole,
  getMyMembership,
  joinGroup,
  leaveGroup,
  listActiveGroups,
  removeGroupMember,
  updateDisplayName,
} from '@/cloud/groups';
import { createFakeSupabase, type FakeSupabase } from '@/testing/fakeSupabase';

let fake: FakeSupabase;

const GROUP = { id: 'g-1', name: 'Intercessão', description: null, status: 'active', created_at: '' };

beforeEach(() => {
  fake = createFakeSupabase();
  _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
  _setSupabaseClientForTests(fake.client as unknown as SupabaseClient);
});

afterAll(() => {
  _setCloudConfigForTests(null);
  _setSupabaseClientForTests(null);
});

describe('entrar em grupo', () => {
  test('o cliente sempre envia role "member" e status "active"', async () => {
    await joinGroup('g-1');
    const insert = fake.calls.find((c) => c.table === 'group_memberships' && c.op === 'insert');
    expect(insert?.payload).toEqual({
      group_id: 'g-1',
      user_id: 'user-1',
      role: 'member',
      status: 'active',
    });
  });

  test('a assinatura de joinGroup não aceita papel: não há como pedir "leader"', () => {
    // Um argumento a mais é ignorado; a função só conhece o id do grupo.
    expect(joinGroup.length).toBe(1);
  });

  test('violação de policy vira "não autorizado" sem vazar detalhe', async () => {
    fake.setTableResult('group_memberships', {
      error: { code: '42501', message: 'new row violates row-level security policy for table "group_memberships"' },
    });
    const error = await joinGroup('g-1').catch((e) => e);
    expect(error).toMatchObject({ code: 'not_authorized' });
    expect(error.message).not.toMatch(/row-level|policy|group_memberships/);
  });

  test('entrar duas vezes vira "já é membro"', async () => {
    fake.setTableResult('group_memberships', { error: { code: '23505', message: 'duplicate key' } });
    await expect(joinGroup('g-1')).rejects.toMatchObject({ code: 'already_member' });
  });
});

describe('sair do grupo', () => {
  test('só altera o status, nunca o papel', async () => {
    await leaveGroup('g-1');
    const update = fake.calls.find((c) => c.table === 'group_memberships' && c.op === 'update');
    expect(update?.payload).toEqual({ status: 'left' });
    expect(JSON.stringify(update?.payload)).not.toMatch(/role/);
  });

  test('filtra pela própria linha', async () => {
    await leaveGroup('g-1');
    const update = fake.calls.find((c) => c.op === 'update');
    expect(update?.filters).toEqual([
      { column: 'group_id', value: 'g-1' },
      { column: 'user_id', value: 'user-1' },
    ]);
  });
});

describe('perfil', () => {
  test('atualizar nome não toca em account_status nem em user_id', async () => {
    await updateDisplayName('  Maria  ');
    const update = fake.calls.find((c) => c.table === 'profiles' && c.op === 'update');
    expect(update?.payload).toEqual({ display_name: 'Maria' });
    expect(Object.keys(update?.payload as object)).toEqual(['display_name']);
  });
});

describe('papel efetivo vem do servidor', () => {
  test('admin quando existe linha em app_admins', async () => {
    fake.setTableResult('app_admins', { data: { user_id: 'user-1' } });
    await expect(getEffectiveRole()).resolves.toBe('admin');
  });

  test('leader quando a membership do servidor diz leader', async () => {
    fake.setTableResult('app_admins', { data: null });
    fake.setTableResult('group_memberships', {
      data: { group_id: 'g-1', user_id: 'user-1', role: 'leader', status: 'active', joined_at: '', groups: GROUP },
    });
    await expect(getEffectiveRole()).resolves.toBe('leader');
  });

  test('member quando a membership diz member', async () => {
    fake.setTableResult('app_admins', { data: null });
    fake.setTableResult('group_memberships', {
      data: { group_id: 'g-1', user_id: 'user-1', role: 'member', status: 'active', joined_at: '', groups: GROUP },
    });
    await expect(getEffectiveRole()).resolves.toBe('member');
  });

  test('sem membership o papel é "none"', async () => {
    fake.setTableResult('app_admins', { data: null });
    fake.setTableResult('group_memberships', { data: null });
    await expect(getEffectiveRole()).resolves.toBe('none');
  });

  test('sem sessão o papel é "none"', async () => {
    fake.setUser(null);
    await expect(getEffectiveRole()).resolves.toBe('none');
  });

  test('a consulta de membership filtra por status ativo', async () => {
    fake.setTableResult('group_memberships', { data: null });
    await getMyMembership();
    const call = fake.calls.find((c) => c.table === 'group_memberships');
    expect(call?.filters).toEqual(
      expect.arrayContaining([{ column: 'status', value: 'active' }, { column: 'user_id', value: 'user-1' }]),
    );
  });
});

describe('mudança de papel', () => {
  test('promover passa por função protegida do banco, não por UPDATE de tabela', async () => {
    await adminSetGroupRole('user-2', 'g-1', 'leader');
    expect(fake.rpcCalls).toEqual([
      { fn: 'admin_set_group_role', args: { target_user: 'user-2', target_group: 'g-1', new_role: 'leader' } },
    ]);
    // Nenhum caminho de tabela foi usado para mexer em papel.
    expect(fake.calls.filter((c) => c.table === 'group_memberships' && c.op === 'update')).toHaveLength(0);
  });

  test('quem não é admin recebe "não autorizado" do servidor', async () => {
    fake.setTableResult('rpc:admin_set_group_role', {
      error: { code: '42501', message: 'apenas administradores podem alterar papéis' },
    });
    await expect(adminSetGroupRole('user-2', 'g-1', 'leader')).rejects.toMatchObject({ code: 'not_authorized' });
  });

  test('remover membro também passa por função protegida', async () => {
    await removeGroupMember('user-2', 'g-1');
    expect(fake.rpcCalls[0].fn).toBe('remove_group_member');
  });

  test('membership inexistente vira "não encontrado"', async () => {
    fake.setTableResult('rpc:admin_set_group_role', { error: { code: 'P0002', message: 'não encontrada' } });
    await expect(adminSetGroupRole('user-9', 'g-1', 'leader')).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('catálogo de grupos', () => {
  test('lista apenas grupos ativos', async () => {
    fake.setTableResult('groups', { data: [GROUP] });
    await listActiveGroups();
    const call = fake.calls.find((c) => c.table === 'groups');
    expect(call?.filters).toEqual([{ column: 'status', value: 'active' }]);
  });
});

/**
 * Garantia estrutural: nenhum caminho do aplicativo escreve `role` numa tabela.
 * Se alguém acrescentar um, este teste quebra antes do code review.
 */
describe('nenhuma escrita de papel no cliente', () => {
  test('nenhum update de tabela carrega role, e todo insert fixa "member"', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'cloud', 'groups.ts'), 'utf8');

    // Nenhum UPDATE de tabela pode carregar papel.
    expect(source).not.toMatch(/\.update\(\s*\{[^}]*\brole\b/);

    // Todo payload de INSERT que menciona papel fixa 'member'.
    const insertPayloads = [...source.matchAll(/\.insert\(\s*(\{[^}]*\})/g)].map((m) => m[1]);
    expect(insertPayloads.length).toBeGreaterThan(0);
    for (const payload of insertPayloads) {
      if (payload.includes('role')) expect(payload).toMatch(/role:\s*'member'/);
    }
  });

  test('nenhuma tela envia role para o servidor', () => {
    const appDir = path.join(__dirname, '..', 'app');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.tsx')) files.push(full);
      }
    };
    walk(appDir);
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/\.from\(['"]group_memberships['"]\)/);
      expect(source).not.toMatch(/\.from\(['"]app_admins['"]\)/);
    }
  });
});
