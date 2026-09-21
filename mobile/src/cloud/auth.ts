import type { Session } from '@supabase/supabase-js';

import { accountDeletionFrom, requestServerAccountDeletion } from '@/community/api';

import { getSupabase } from './client';
import { isCloudConfigured } from './config';
import { classifyError, cloudError, CloudError } from './errors';

/**
 * Autenticação V1: e-mail + código de uso único (OTP).
 * Sem senha, sem Google, sem Apple, sem telefone (spec desta execução, §3).
 */

export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** Cooldown de reenvio guardado em memória: some ao reiniciar, e tudo bem. */
const lastRequestAt = new Map<string, number>();

export function _resetOtpCooldownForTests() {
  lastRequestAt.clear();
}

export function secondsUntilResendAllowed(email: string, now = Date.now()): number {
  const previous = lastRequestAt.get(email.trim().toLowerCase());
  if (!previous) return 0;
  const elapsed = Math.floor((now - previous) / 1000);
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - elapsed);
}

/** Envia o código de acesso. Não revela se o e-mail já tem conta. */
export async function requestOtp(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!isCloudConfigured()) throw cloudError('not_configured');
  if (!isValidEmail(email)) throw cloudError('invalid_email');
  if (secondsUntilResendAllowed(email) > 0) throw cloudError('rate_limited');

  const supabase = getSupabase();
  if (!supabase) throw cloudError('not_configured');

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw classifyError(error);

  lastRequestAt.set(email, Date.now());
}

/** Verifica o código e abre a sessão. */
export async function verifyOtp(rawEmail: string, rawToken: string): Promise<Session> {
  const email = rawEmail.trim().toLowerCase();
  const token = rawToken.replace(/\D/g, '');
  if (!isCloudConfigured()) throw cloudError('not_configured');
  if (token.length !== OTP_LENGTH) throw cloudError('invalid_or_expired_code');

  const supabase = getSupabase();
  if (!supabase) throw cloudError('not_configured');

  // try: um erro que não é AuthError (ex.: do armazenamento da sessão) é relançado
  // pelo SDK; ele também vira mensagem segura em vez de texto cru na tela.
  let result: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
  try {
    result = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  } catch (thrown) {
    throw classifyError(thrown, 'auth');
  }
  const { data, error } = result;
  if (error) throw classifyError(error, 'auth');
  if (!data.session) throw cloudError('invalid_or_expired_code');

  lastRequestAt.delete(email);
  return data.session;
}

/** Restaura a sessão guardada. Nunca lança: sem sessão é um estado normal. */
export async function restoreSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

/** Encerra a sessão e limpa as credenciais do aparelho (spec §15). */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (error) {
    // Falha de rede não pode deixar o usuário preso logado na interface;
    // o storage local já foi limpo pelo próprio signOut do SDK.
    if (classifyError(error).code !== 'offline') throw classifyError(error);
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Exclusão de conta pela Edge Function `delete-account` (service_role no
 * servidor; o cliente nunca apaga `auth.users`). O servidor apaga tudo o que a
 * pessoa fez na Comunidade, as fotos dela e a conta, e só aceita login recente
 * (até 10 min). A jornada local fica no aparelho (o texto da tela diz isso).
 *
 * Só é oferecida na tela com ACCOUNT_DELETION_AVAILABLE (src/cloud/config.ts),
 * que continua false até a função estar no ar e existir a página web
 * equivalente (exigência do Google Play).
 *
 * - "deleted": encerra a sessão só neste aparelho (a conta já não existe).
 * - "needs_recent_login": nada foi apagado; a pessoa entra de novo com um código
 *   por e-mail e repete. PROVISÓRIO: o pedido de código novo dentro da própria
 *   folha ainda não existe; a mensagem orienta sair e entrar de novo.
 */
export const DELETION_NEEDS_RECENT_LOGIN_MESSAGE =
  'Por segurança, excluir a conta pede um acesso recente. Saia da conta, entre de novo com o código do e-mail e tente outra vez.';

export async function requestAccountDeletion(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw cloudError('not_configured');
  const result = await requestServerAccountDeletion(accountDeletionFrom(supabase));
  if (result === 'needs_recent_login') {
    throw new CloudError('session_expired', DELETION_NEEDS_RECENT_LOGIN_MESSAGE);
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // A conta já foi apagada no servidor; a sessão local sai de qualquer jeito.
  }
}
