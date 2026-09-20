/**
 * Configuração da nuvem lida do ambiente (EXPO_PUBLIC_*, embutidas no bundle).
 *
 * Só a chave ANÔNIMA entra aqui. Ela é pública por definição; quem protege os
 * dados é a RLS. A chave service_role nunca aparece no cliente.
 *
 * Sem configuração o app continua inteiro em modo local: é o estado normal
 * desta build, não um erro.
 */
export type CloudConfig = { url: string; anonKey: string };

/**
 * Acesso ESTÁTICO a process.env, obrigatoriamente.
 * O Metro substitui `process.env.EXPO_PUBLIC_X` pelo literal em tempo de bundle;
 * um acesso dinâmico (`process.env[nome]`) não é substituído e chegaria vazio no
 * aplicativo. Este é o motivo de as duas variáveis serem lidas nominalmente.
 */
function readEnv(): { url: string | null; anonKey: string | null } {
  const clean = (value: string | undefined) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  return {
    url: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
    anonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  };
}

let override: CloudConfig | null = null;

/** Usado apenas por testes para simular uma build configurada. */
export function _setCloudConfigForTests(config: CloudConfig | null) {
  override = config;
}

export function getCloudConfig(): CloudConfig | null {
  if (override) return override;
  const { url, anonKey } = readEnv();
  if (!url || !anonKey) return null;
  // Um placeholder do .env.example não conta como configuração.
  if (url.includes('SEU-PROJETO') || anonKey.startsWith('cole-aqui')) return null;
  return { url, anonKey };
}

export function isCloudConfigured(): boolean {
  return getCloudConfig() !== null;
}

/**
 * Guarda de segurança: uma chave service_role é um JWT cujo payload traz
 * `"role":"service_role"`. Se alguém colar isso na variável do cliente, falha alto
 * em vez de embarcar uma credencial de administrador no aplicativo.
 */
export function assertNotServiceRoleKey(key: string): void {
  const segments = key.split('.');
  if (segments.length !== 3) return;
  try {
    const payload = JSON.parse(
      globalThis.atob ? globalThis.atob(segments[1]) : Buffer.from(segments[1], 'base64').toString(),
    ) as { role?: string };
    if (payload.role === 'service_role') {
      throw new Error(
        'EXPO_PUBLIC_SUPABASE_ANON_KEY contém uma chave service_role. ' +
          'Ela nunca pode ir para o cliente. Use a chave anônima (publishable).',
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('service_role')) throw error;
    // Payload ilegível: não é um JWT que possamos julgar, segue o fluxo normal.
  }
}
