/** Tipos espelhando o schema da fundação (supabase/migrations). */

export type GroupRole = 'member' | 'leader';
export type MembershipStatus = 'active' | 'left' | 'removed';
export type GroupStatus = 'active' | 'archived';
export type AccountStatus = 'active' | 'suspended' | 'deletion_requested';

/**
 * O que se vê do perfil de OUTRA pessoa (líder vendo membros, admin): só isto.
 * O banco concede SELECT apenas nestas duas colunas (grant por coluna, D2 em
 * docs/technical/SEGURANCA_MIGRATIONS_CORRECOES.md).
 */
export type Profile = {
  user_id: string;
  display_name: string;
};

/** A própria linha inteira, lida por public.my_profile(). */
export type MyProfile = Profile & {
  age_band: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  status: GroupStatus;
  created_at: string;
};

export type GroupMembership = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  status: MembershipStatus;
  joined_at: string;
};

/** Papel efetivo do usuário, sempre derivado do servidor — nunca do cliente. */
export type EffectiveRole = 'none' | 'member' | 'leader' | 'admin';

export type MembershipView = {
  group: Group;
  membership: GroupMembership;
  role: GroupRole;
};
