import { requireSupabase } from './client';
import { classifyError } from './errors';
import type { EffectiveRole, Group, GroupMembership, MembershipView, Profile } from './types';

/**
 * Serviço de grupos e papéis.
 *
 * Nenhuma função aqui aceita `role` vindo da interface. Entrar num grupo cria
 * sempre uma membership de membro comum; promover é ação administrativa que
 * passa pela função protegida no banco.
 */

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

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, age_band, account_status, created_at, updated_at')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw classifyError(error);
  return (data as Profile) ?? null;
}

/** O usuário edita o próprio nome. Qualquer outro campo é decisão do servidor. */
export async function updateDisplayName(displayName: string): Promise<void> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw classifyError({ status: 401 });
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('user_id', auth.user.id);
  if (error) throw classifyError(error);
}

/** Grupo atual do usuário (V1 tem um grupo principal na experiência). */
export async function getMyMembership(): Promise<MembershipView | null> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('group_memberships')
    .select('group_id, user_id, role, status, joined_at, groups!inner(id, name, description, status, created_at)')
    .eq('user_id', auth.user.id)
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
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'none';

  const { data: adminRow, error: adminError } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (adminError) throw classifyError(adminError);
  if (adminRow) return 'admin';

  const membership = await getMyMembership();
  if (!membership) return 'none';
  return membership.role === 'leader' ? 'leader' : 'member';
}

/**
 * Entrar num grupo. `role` e `status` são fixados aqui e reconferidos pela policy
 * e pelo trigger no banco: mesmo um cliente adulterado não cria líder.
 */
export async function joinGroup(groupId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw classifyError({ status: 401 });

  const { error } = await supabase
    .from('group_memberships')
    .insert({ group_id: groupId, user_id: auth.user.id, role: 'member', status: 'active' });
  if (error) throw classifyError(error);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw classifyError({ status: 401 });

  const { error } = await supabase
    .from('group_memberships')
    .update({ status: 'left' })
    .eq('group_id', groupId)
    .eq('user_id', auth.user.id);
  if (error) throw classifyError(error);
}

/** Membros do grupo. A RLS só devolve linhas para líder do grupo ou admin. */
export async function listGroupMembers(groupId: string): Promise<(GroupMembership & { profile?: Profile })[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('group_memberships')
    .select('group_id, user_id, role, status, joined_at, profiles(user_id, display_name, age_band, account_status, created_at, updated_at)')
    .eq('group_id', groupId)
    .eq('status', 'active');
  if (error) throw classifyError(error);
  return (data ?? []).map((row) => {
    const typed = row as unknown as GroupMembership & { profiles?: Profile };
    return { ...typed, profile: typed.profiles };
  });
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
