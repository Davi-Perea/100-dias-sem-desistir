import type { Session } from '@supabase/supabase-js';

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
 * Exclusão de conta — ARQUITETURA PREPARADA, ainda não implementada.
 *
 * Exige uma Edge Function com service_role, porque o cliente não pode (e não deve)
 * apagar `auth.users`. O caminho definido em SECURITY_V0.md é:
 *   reautenticação recente → apagar objetos de Storage → auth.admin.deleteUser
 *   (cascata nas tabelas com FK) → registrar o pedido → e-mail de confirmação.
 * Também precisa existir uma página web equivalente (exigência do Google Play).
 *
 * Fica explícito em vez de silencioso: a loja exige o fluxo antes do lançamento.
 */
export async function requestAccountDeletion(): Promise<never> {
  throw new CloudError(
    'unknown',
    'Exclusão de conta ainda não está disponível: depende da Edge Function de exclusão.',
  );
}
