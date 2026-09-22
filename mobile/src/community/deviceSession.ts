import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/cloud/client';

import { demoSignIn, isCommunityDemo } from './demoApi';
import { communityError, toCommunityError } from './errors';

/**
 * Entrada na comunidade SEM e-mail (C2, feedback de 2026-09-22): a conta fica
 * ligada a este aparelho.
 *
 * - No app real: sessão anônima do Supabase Auth (`signInAnonymously`). O
 *   projeto precisa de "Allow anonymous sign-ins" ligado e, para não virar porta
 *   de abuso, do CAPTCHA/limite de taxa do Auth (pedido registrado no
 *   COMUNIDADE_V2_DEPLOY). A sessão fica no SecureStore como qualquer outra, e
 *   o `useCloudSession` recebe a mudança pelo onAuthStateChange.
 * - Na demonstração: a sessão simulada em memória, direto (nada sai do aparelho).
 *
 * Trocar de aparelho ou apagar o app perde a conta. O e-mail opcional (N3) é
 * o caminho para recuperar: quem liga o e-mail à conta é `linkEmailToAccount`
 * no src/cloud (pedido registrado; esta parte não mexe no Auth além do login).
 *
 * Se já existe uma sessão (de e-mail ou do aparelho), não cria outra.
 */
export async function startDeviceSession(deps: { supabase?: SupabaseClient | null } = {}): Promise<void> {
  if (deps.supabase === undefined && isCommunityDemo()) {
    demoSignIn();
    return;
  }
  const supabase = deps.supabase === undefined ? getSupabase() : deps.supabase;
  if (!supabase) throw communityError('feature_disabled');
  let current;
  try {
    current = await supabase.auth.getSession();
  } catch (error) {
    throw toCommunityError(error);
  }
  if (current.data.session) return;
  let result;
  try {
    result = await supabase.auth.signInAnonymously();
  } catch (error) {
    throw toCommunityError(error);
  }
  if (result.error) throw toCommunityError(result.error);
}
