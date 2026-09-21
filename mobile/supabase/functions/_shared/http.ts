/**
 * Pedaços de HTTP das Edge Functions da Comunidade, SEM nada de Deno.
 *
 * Os handlers recebem um EdgeRequest (e não o Request do Deno) e devolvem um
 * EdgeResponse simples. Assim a lógica roda nos testes Jest do app
 * (supabase/functions/_tests) e o adaptador Deno (_shared/deno.ts) fica mínimo.
 *
 * Nenhuma resposta leva texto de erro do banco ou do Auth: só um código curto.
 */

export type EdgeRequest = {
  method: string;
  header(name: string): string | null;
  /** Corpo JSON; null quando vazio ou inválido. */
  json(): Promise<unknown>;
};

export type EdgeResponse = {
  status: number;
  body: Record<string, unknown>;
};

export function reply(status: number, body: Record<string, unknown>): EdgeResponse {
  return { status, body };
}

export type Json = Record<string, unknown>;

export function asObject(value: unknown): Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

/** Comparação de segredo sem atalho por tamanho de prefixo. */
export function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Chamadas de servidor (cron e gatilho do banco) mandam o segredo em
 * `x-cron-secret`. Segredo curto demais ou ausente na função = recusa sempre.
 */
export function hasCronSecret(req: EdgeRequest, configured: string | null | undefined): boolean {
  if (!configured || configured.length < 32) return false;
  const sent = req.header('x-cron-secret');
  return typeof sent === 'string' && timingSafeEqual(sent, configured);
}

export function bearerToken(req: EdgeRequest): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Lê o payload do JWT SEM verificar a assinatura. Só usar DEPOIS de o Auth ter
 * validado o mesmo token (auth.getUser), para ler claims que ele não devolve (amr).
 */
export function decodeJwtPayload(token: string): Json | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return asObject(JSON.parse(base64UrlDecode(parts[1])));
  } catch {
    return null;
  }
}

/**
 * Quando a pessoa provou quem é pela última vez (segundos desde 1970), segundo o
 * claim `amr` do Supabase Auth: [{ method: 'otp', timestamp: 1737… }, …].
 * O refresh do token NÃO renova esse horário; só um login novo renova.
 */
export function lastAuthenticatedAt(payload: Json): number | null {
  const amr = payload.amr;
  if (!Array.isArray(amr)) return null;
  let latest: number | null = null;
  for (const entry of amr) {
    const timestamp = asObject(entry).timestamp;
    if (typeof timestamp === 'number' && Number.isFinite(timestamp) && (latest === null || timestamp > latest)) {
      latest = timestamp;
    }
  }
  return latest;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Origens (página web de exclusão, página de moderação) que podem chamar do navegador. */
export function parseAllowedOrigins(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => /^https:\/\/[^\s/]+$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin));
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
