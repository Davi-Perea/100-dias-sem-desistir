import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/cloud/client';

import { demoSignIn, isCommunityDemo } from './demoApi';
import { communityError, toCommunityError } from './errors';
import { cleanText, isValidDisplayName } from './validation';

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

/* --------------------------------------------------- entrada automática */

/**
 * "Juntos" (pedido do fundador, 2026-09-22): quem abre a aba JÁ ESTÁ dentro.
 * Sem tela de entrar, sem código, sem e-mail, sem perfil para montar. As telas
 * chamam estas duas funções sozinhas:
 *
 *   1. `ensureDeviceSession`: a conta ligada ao aparelho (acima).
 *   2. `ensureJoined`: `join_community` com o nome que a pessoa deu na entrada
 *      do app (settings.profile.name), ou sem nome, se ela pulou.
 *
 * Ler não expõe ninguém: entrar só dá acesso ao feed. O que expõe (publicar,
 * comentar, Amém) passa antes pela tela única de aceite (16+, regras,
 * consentimento destacado e o nome, se faltar).
 *
 * Várias telas podem pedir ao mesmo tempo (a aba, a tela de publicar): cada
 * função tem uma só chamada em andamento, compartilhada.
 */
let sessionInFlight: Promise<void> | null = null;
let joinInFlight: Promise<void> | null = null;

export function ensureDeviceSession(): Promise<void> {
  sessionInFlight ??= startDeviceSession().finally(() => {
    sessionInFlight = null;
  });
  return sessionInFlight;
}

export function ensureJoined(
  api: { joinCommunity(input?: { displayName?: string | null }): Promise<void> },
  name: string | null,
): Promise<void> {
  joinInFlight ??= api.joinCommunity({ displayName: entryName(name) }).finally(() => {
    joinInFlight = null;
  });
  return joinInFlight;
}

/** O nome da entrada do app, só se o servidor aceitaria (até 40, sem vazio). Senão, sem nome. */
export function entryName(raw: string | null | undefined): string | null {
  const name = cleanText(raw);
  return name && isValidDisplayName(name) ? name : null;
}
