/**
 * C2 (feedback do fundador de 2026-09-22): entrar na comunidade SEM e-mail.
 * No app real, a conta fica ligada ao aparelho pela sessão anônima do Supabase
 * (`signInAnonymously`). Prova só o cliente: não cria outra sessão se já existe
 * uma, e traduz o erro sem repassar o texto cru.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { startDeviceSession } from '@/community/deviceSession';

jest.mock('@/cloud/client', () => ({ getSupabase: () => null }));

function fakeSupabase(opts: { session?: unknown; error?: unknown } = {}) {
  const getSession = jest.fn(async () => ({ data: { session: opts.session ?? null }, error: null }));
  const signInAnonymously = jest.fn(async () => ({ data: {}, error: opts.error ?? null }));
  const supabase = { auth: { getSession, signInAnonymously } } as unknown as SupabaseClient;
  return { supabase, getSession, signInAnonymously };
}

test('sem sessão: cria a conta ligada ao aparelho (sessão anônima)', async () => {
  const { supabase, signInAnonymously } = fakeSupabase();
  await startDeviceSession({ supabase });
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
});

test('já tem sessão (de e-mail ou do aparelho): não cria outra', async () => {
  const { supabase, signInAnonymously } = fakeSupabase({ session: { user: { id: 'eu' } } });
  await startDeviceSession({ supabase });
  expect(signInAnonymously).not.toHaveBeenCalled();
});

test('erro do Auth vira mensagem humana, sem o texto cru', async () => {
  const { supabase } = fakeSupabase({ error: { message: 'Anonymous sign-ins are disabled', status: 422 } });
  const failure = startDeviceSession({ supabase });
  await expect(failure).rejects.toMatchObject({ name: 'CommunityError' });
  await expect(failure).rejects.not.toMatchObject({ message: expect.stringMatching(/Anonymous/) });
});

test('sem nuvem configurada: a comunidade não está disponível', async () => {
  await expect(startDeviceSession({ supabase: null })).rejects.toMatchObject({ code: 'feature_disabled' });
});
