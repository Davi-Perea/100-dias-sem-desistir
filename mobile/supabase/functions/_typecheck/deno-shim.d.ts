/**
 * SÓ PARA CONFERÊNCIA DE TIPOS no Windows sem Deno (tsconfig.check.json).
 * Nunca é importado pelas funções; no Supabase o Deno tem os tipos de verdade.
 * Declara apenas o pedaço da API do Deno que as funções usam.
 */
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
