import type { SupabaseClient } from '@supabase/supabase-js';

import { requireSupabase } from './client';
import { classifyError } from './errors';
import type { EffectiveRole, Group, GroupMembership, MembershipView, MyProfile, Profile } from './types';

/**
 * Serviço de grupos e papéis.
 *
 * Nenhuma função aqui aceita `role` vindo da interface. Entrar num grupo cria
 * sempre uma membership de membro comum; promover é ação administrativa que
 * passa pela função protegida no banco.
 */

/**
 * Id do usuário da sessão, conferido pelo servidor (getUser).
 *
 * SEC-06: sem internet o auth-js NÃO lança; devolve { user: null, error }. Ler só
 * `data.user` transformava "sem rede" em "sem conta": papel 'none', membership
 * null, e o estado degradado do useCloudSession nunca ligava. Agora qualquer erro
 * que não seja "não há sessão" é lançado, já classificado (offline, sessão
 * expirada...), e cai no ramo degradado de quem chama.
 */
async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if ((error as { name?: string }).name === 'AuthSessionMissingError') return null;
    throw classifyError(error);
  }
  return data.user?.id ?? null;
}

/** Igual a currentUserId, mas sem sessão é erro (ação que exige conta). */
async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const id = await currentUserId(supabase);
  if (!id) throw classifyError({ status: 401 });
  return id;
}

export async function listActiveGroups(): Promise<Group[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, status, created_at')
    .eq('status', 'active')
    .order('name');
  if (error) throw classifyError(error);
  return (data ?? []) as Group[];
}

/**
 * O próprio perfil inteiro. Pela tabela o cliente só lê user_id e display_name
 * (grant por coluna); age_band e account_status do dono vêm de public.my_profile().
 */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = requireSupabase();
  const userId = await currentUserId(supabase);
  if (!userId) return null;
  const { data, error } = await supabase.rpc('my_profile').maybeSingle();
  if (error) throw classifyError(error);
  return (data as MyProfile | null) ?? null;
}

/** O usuário edita o próprio nome. Qualquer outro campo é decisão do servidor. */
export async function updateDisplayName(displayName: string): Promise<void> {
  const supabase = requireSupabase();
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('user_id', userId);
  if (error) throw classifyError(error);
}

/** Grupo atual do usuário (V1 tem um grupo principal na experiência). */
export async function getMyMembership(): Promise<MembershipView | null> {
  const supabase = requireSupabase();
  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const { data, error } = await supabase
    .from('group_memberships')
    .select('group_id, user_id, role, status, joined_at, groups!inner(id, name, description, status, created_at)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw classifyError(error);
  if (!data) return null;

  const row = data as unknown as GroupMembership & { groups: Group };
  return {
    group: row.groups,
    membership: { ...row, groups: undefined } as unknown as GroupMembership,
    role: row.role,
  };
}

/** O papel efetivo vem SEMPRE do servidor: membership + tabela de admins. */
export async function getEffectiveRole(): Promise<EffectiveRole> {
  const supabase = requireSupabase();
  const userId = await currentUserId(supabase);
  if (!userId) return 'none';

  const { data: adminRow, error: adminError } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (adminError) throw classifyError(adminError);
  if (adminRow) return 'admin';

  const membership = await getMyMembership();
  if (!membership) return 'none';
  return membership.role === 'leader' ? 'leader' : 'member';
}

/**
 * Entrar num grupo. `role` e `status` são fixados aqui e reconferidos pelo
 * trigger no banco: mesmo um cliente adulterado não cria líder.
 *
 * ATENÇÃO (2026-09-21): com as migrations corrigidas (D1) NÃO existe policy de
 * INSERT do cliente em group_memberships. Contra o banco real esta chamada sempre
 * volta "não autorizado"; quem põe pessoas em grupo é o admin até existir
 * convite/código validado no servidor (decisão de produto, comunidade/03 §3.1).
 * Por isso também some o caso SEC-08 (voltar depois de sair/ser removido e ler
 * "Você já faz parte deste grupo"): não há reentrada pelo cliente.
 */
export async function joinGroup(groupId: string): Promise<void> {
  const supabase = requireSupabase();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('group_memberships')
    .insert({ group_id: groupId, user_id: userId, role: 'member', status: 'active' });
  if (error) throw classifyError(error);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const supabase = requireSupabase();
  const userId = await requireUserId(supabase);

  const { error } = await supabase
    .from('group_memberships')
    .update({ status: 'left' })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw classifyError(error);
}

/**
 * Membros ativos do grupo, como a RLS os entrega:
 *   - líder do grupo ou admin: todas as linhas;
 *   - membro comum: SÓ A PRÓPRIA LINHA (não zero). Quem chama não pode usar o
 *     tamanho da lista como contagem do grupo nesse caso (SEC-12).
 *
 * Os nomes vêm numa segunda consulta. O embed `profiles(...)` não resolve:
 * group_memberships.user_id aponta para auth.users, não para profiles, então o
 * PostgREST não acha a relação (PGRST200). E de outra pessoa só se lê
 * user_id e display_name (grant por coluna).
 */
export async function listGroupMembers(groupId: string): Promise<(GroupMembership & { profile?: Profile })[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('group_memberships')
    .select('group_id, user_id, role, status, joined_at')
    .eq('group_id', groupId)
    .eq('status', 'active');
  if (error) throw classifyError(error);
  const rows = (data ?? []) as GroupMembership[];
  if (rows.length === 0) return [];

  const { data: names, error: namesError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in(
      'user_id',
      rows.map((row) => row.user_id),
    );
  if (namesError) throw classifyError(namesError);
  const byId = new Map(((names ?? []) as Profile[]).map((profile) => [profile.user_id, profile]));
  return rows.map((row) => ({ ...row, profile: byId.get(row.user_id) }));
}

/**
 * Promoção/rebaixamento. Passa pela função protegida do banco, que confere se o
 * chamador é administrador e grava auditoria. Não existe caminho de tabela.
 */
export async function adminSetGroupRole(
  targetUserId: string,
  groupId: string,
  role: 'member' | 'leader',
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('admin_set_group_role', {
    target_user: targetUserId,
    target_group: groupId,
    new_role: role,
  });
  if (error) throw classifyError(error);
}

/** Remoção de membro: líder do próprio grupo ou administrador. */
export async function removeGroupMember(targetUserId: string, groupId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('remove_group_member', {
    target_user: targetUserId,
    target_group: groupId,
  });
  if (error) throw classifyError(error);
}
