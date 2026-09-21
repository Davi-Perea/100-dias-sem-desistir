import type { SupabaseClient } from '@supabase/supabase-js';

import {
  _resetOtpCooldownForTests,
  isValidEmail,
  OTP_RESEND_COOLDOWN_SECONDS,
  requestAccountDeletion,
  requestOtp,
  restoreSession,
  secondsUntilResendAllowed,
  signOut,
  verifyOtp,
} from '@/cloud/auth';
import { _setSupabaseClientForTests } from '@/cloud/client';
import { _setCloudConfigForTests } from '@/cloud/config';
import { CloudError } from '@/cloud/errors';
import { createFakeSupabase, type FakeSupabase } from '@/testing/fakeSupabase';

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
  _setSupabaseClientForTests(fake.client as unknown as SupabaseClient);
  _resetOtpCooldownForTests();
});

afterAll(() => {
  _setCloudConfigForTests(null);
  _setSupabaseClientForTests(null);
});

describe('validação de e-mail', () => {
  test.each([['pessoa@exemplo.com'], ['a.b+c@sub.dominio.org']])('aceita %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  test.each([[''], ['sem-arroba'], ['a@b'], ['a@@b.com'], ['espaço @b.com']])('recusa "%s"', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('pedido de código (OTP)', () => {
  test('envia o código e normaliza o e-mail', async () => {
    await requestOtp('  Pessoa@Exemplo.COM ');
    expect(fake.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'pessoa@exemplo.com',
      options: { shouldCreateUser: true },
    });
  });

  test('recusa e-mail inválido antes de tocar na rede', async () => {
    await expect(requestOtp('invalido')).rejects.toMatchObject({ code: 'invalid_email' });
    expect(fake.client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('aplica cooldown de reenvio', async () => {
    await requestOtp('pessoa@exemplo.com');
    expect(secondsUntilResendAllowed('pessoa@exemplo.com')).toBeGreaterThan(0);
    expect(secondsUntilResendAllowed('pessoa@exemplo.com')).toBeLessThanOrEqual(OTP_RESEND_COOLDOWN_SECONDS);

    await expect(requestOtp('pessoa@exemplo.com')).rejects.toMatchObject({ code: 'rate_limited' });
    expect(fake.client.auth.signInWithOtp).toHaveBeenCalledTimes(1);

    // Passado o cooldown, o reenvio é liberado.
    const later = Date.now() + (OTP_RESEND_COOLDOWN_SECONDS + 1) * 1000;
    expect(secondsUntilResendAllowed('pessoa@exemplo.com', later)).toBe(0);
  });

  test('erro de rede vira mensagem de offline, sem vazar o texto do servidor', async () => {
    fake.client.auth.signInWithOtp.mockResolvedValueOnce({
      data: {},
      error: { message: 'TypeError: Network request failed at supabase-js internals' },
    });
    const error = await requestOtp('pessoa@exemplo.com').catch((e) => e as CloudError);
    expect(error).toBeInstanceOf(CloudError);
    expect((error as CloudError).code).toBe('offline');
    expect((error as CloudError).message).not.toMatch(/supabase-js|TypeError/);
  });

  test('sem nuvem configurada não há chamada de rede', async () => {
    _setCloudConfigForTests(null);
    await expect(requestOtp('pessoa@exemplo.com')).rejects.toMatchObject({ code: 'not_configured' });
    expect(fake.client.auth.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe('verificação do código', () => {
  test('abre a sessão com o código correto', async () => {
    const session = await verifyOtp('pessoa@exemplo.com', '123456');
    expect(fake.client.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'pessoa@exemplo.com',
      token: '123456',
      type: 'email',
    });
    expect(session).toBeTruthy();
  });

  test('recusa código com tamanho errado sem chamar o servidor', async () => {
    await expect(verifyOtp('pessoa@exemplo.com', '123')).rejects.toMatchObject({
      code: 'invalid_or_expired_code',
    });
    expect(fake.client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  test('código expirado devolve mensagem própria', async () => {
    fake.client.auth.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Token has expired or is invalid', status: 401 },
    });
    await expect(verifyOtp('pessoa@exemplo.com', '000000')).rejects.toMatchObject({
      code: 'invalid_or_expired_code',
    });
  });

  test('resposta sem sessão é tratada como código inválido', async () => {
    fake.client.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(verifyOtp('pessoa@exemplo.com', '123456')).rejects.toMatchObject({
      code: 'invalid_or_expired_code',
    });
  });

  test('libera o cooldown após entrar', async () => {
    await requestOtp('pessoa@exemplo.com');
    await verifyOtp('pessoa@exemplo.com', '123456');
    expect(secondsUntilResendAllowed('pessoa@exemplo.com')).toBe(0);
  });
});

describe('sessão', () => {
  test('restaura a sessão guardada', async () => {
    const session = await restoreSession();
    expect(session).not.toBeNull();
  });

  test('sem sessão devolve null em vez de lançar', async () => {
    fake.client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(restoreSession()).resolves.toBeNull();
  });

  test('falha ao restaurar não quebra o app', async () => {
    fake.client.auth.getSession.mockRejectedValueOnce(new Error('boom'));
    await expect(restoreSession()).resolves.toBeNull();
  });

  test('sem nuvem configurada não há sessão', async () => {
    _setCloudConfigForTests(null);
    _setSupabaseClientForTests(null);
    await expect(restoreSession()).resolves.toBeNull();
  });

  test('logout chama signOut do SDK, que limpa o storage', async () => {
    await signOut();
    expect(fake.client.auth.signOut).toHaveBeenCalled();
  });

  test('logout offline não deixa o usuário preso', async () => {
    fake.client.auth.signOut.mockRejectedValueOnce({ message: 'Network request failed' });
    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe('exclusão de conta', () => {
  function withFunctions(response: { data: unknown; error: unknown }) {
    const invoke = jest.fn(async () => response);
    (fake.client as unknown as { functions: unknown }).functions = { invoke };
    return invoke;
  }

  test('sem nuvem configurada falha alto, sem atalho no cliente', async () => {
    _setSupabaseClientForTests(null);
    _setCloudConfigForTests(null);
    await expect(requestAccountDeletion()).rejects.toBeInstanceOf(CloudError);
  });

  test('chama só a Edge Function delete-account e encerra a sessão local', async () => {
    const invoke = withFunctions({ data: { deleted: true }, error: null });
    await requestAccountDeletion();
    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { confirm: true } });
    expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('login antigo: nada é apagado, a sessão continua e a mensagem pede um acesso recente', async () => {
    withFunctions({
      data: null,
      error: { name: 'FunctionsHttpError', context: { json: async () => ({ error: 'reauth_required' }) } },
    });
    await expect(requestAccountDeletion()).rejects.toThrow(/acesso recente/);
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
  });
});
