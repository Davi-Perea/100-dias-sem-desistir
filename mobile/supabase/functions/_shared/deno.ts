/**
 * A ÚNICA parte que conhece Deno e o supabase-js: lê o ambiente, cria os
 * clientes e liga os handlers puros (testados no Jest) ao Deno.serve.
 *
 * Variáveis que o Supabase injeta sozinho em toda Edge Function:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 * NÃO CONFIRMADO (2026-09-21): se o projeto desligar as chaves antigas (anon e
 * service_role) em favor das novas (publishable e secret), essas duas podem
 * deixar de existir. Para esse caso, os segredos COMMUNITY_SECRET_KEY e
 * COMMUNITY_PUBLISHABLE_KEY entram no lugar (COMUNIDADE_V2_DEPLOY.md §4).
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { corsHeaders, parseAllowedOrigins } from './http.ts';
import type { EdgeRequest, EdgeResponse } from './http.ts';

export function env(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function required(value: string | null, what: string): string {
  if (!value) throw new Error(`configuração ausente: ${what}`);
  return value;
}

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Cliente com a chave de serviço (ignora RLS). Só existe dentro da função. */
export function serviceClient(): SupabaseClient {
  return createClient(
    required(env('SUPABASE_URL'), 'SUPABASE_URL'),
    required(env('COMMUNITY_SECRET_KEY') ?? env('SUPABASE_SERVICE_ROLE_KEY'), 'chave de serviço'),
    NO_SESSION,
  );
}

/** Cliente que age COMO a pessoa (o token dela vai junto; a RLS vale). */
export function userClient(token: string): SupabaseClient {
  return createClient(
    required(env('SUPABASE_URL'), 'SUPABASE_URL'),
    required(env('COMMUNITY_PUBLISHABLE_KEY') ?? env('SUPABASE_ANON_KEY'), 'chave publicável'),
    { ...NO_SESSION, global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

/** Log sem dado pessoal: só o nome do evento e números. */
export function log(event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...data }));
}

export async function rpcOrThrow<T>(client: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`rpc ${fn} falhou: ${error.code ?? 'sem código'}`);
  return data as T;
}

function toEdgeRequest(req: Request): EdgeRequest {
  return {
    method: req.method,
    header: (name) => req.headers.get(name),
    json: async () => {
      try {
        return await req.json();
      } catch {
        return null;
      }
    },
  };
}

/** Liga um handler puro ao Deno.serve, com CORS só para as origens configuradas. */
export function serve(handler: (req: EdgeRequest) => Promise<EdgeResponse>, options: { cors?: boolean } = {}): void {
  const allowed = options.cors ? parseAllowedOrigins(env('ALLOWED_ORIGINS')) : [];
  Deno.serve(async (req: Request) => {
    const cors = corsHeaders(req.headers.get('origin'), allowed);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let result: EdgeResponse;
    try {
      result = await handler(toEdgeRequest(req));
    } catch {
      log('unhandled_error');
      result = { status: 500, body: { error: 'internal' } };
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  });
}
