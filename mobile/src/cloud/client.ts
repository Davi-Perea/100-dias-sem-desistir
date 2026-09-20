import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { assertNotServiceRoleKey, getCloudConfig } from './config';
import { secureSessionStorage } from './secureStorage';

/**
 * Cliente Supabase criado sob demanda. Nada acontece no import: se a build não
 * tem configuração de nuvem, `getSupabase()` devolve null e o app segue inteiro
 * em modo local (spec §14: falha de nuvem não pode quebrar o core).
 */
let client: SupabaseClient | null = null;
let injected: SupabaseClient | null = null;
let appStateHooked = false;

/** Injeta um cliente falso nos testes. */
export function _setSupabaseClientForTests(fake: SupabaseClient | null) {
  injected = fake;
  client = null;
}

export function getSupabase(): SupabaseClient | null {
  if (injected) return injected;
  if (client) return client;

  const config = getCloudConfig();
  if (!config) return null;

  assertNotServiceRoleKey(config.anonKey);

  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Sem fluxo OAuth por URL nesta execução (só e-mail + código).
      detectSessionInUrl: false,
    },
  });

  // O refresh automático só deve rodar com o app em primeiro plano.
  if (!appStateHooked) {
    appStateHooked = true;
    AppState.addEventListener('change', (state) => {
      const active = getSupabase();
      if (!active) return;
      if (state === 'active') active.auth.startAutoRefresh();
      else active.auth.stopAutoRefresh();
    });
  }

  return client;
}

/** Igual a getSupabase(), mas explode com erro tratável em vez de devolver null. */
export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw Object.assign(new Error('cloud não configurada'), { code: 'not_configured' });
  }
  return supabase;
}
