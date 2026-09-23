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

/**
 * PORTÃO DE RELEASE DA NUVEM (D-6, SEC-04). Enquanto o app não tiver "Excluir conta"
 * no próprio app E numa página web (Apple 5.1.1(v); política de exclusão do Google
 * Play; LGPD art. 18), nenhuma build de release pode criar conta no servidor.
 * Por isso, com `__DEV__ === false`, a nuvem fica DESLIGADA à força mesmo que as
 * variáveis EXPO_PUBLIC_SUPABASE_* tenham sido embutidas por engano.
 *
 * Só vira `true` no mesmo commit que entregar: Edge Function de exclusão + tela
 * "Sair"/"Excluir conta" em conta.tsx + página web de exclusão (SECURITY_V0.md).
 */
/*
 * LIBERADO EM 23/09/2026, com as três condições cumpridas e verificadas:
 *
 *   1. Edge Function `delete-account` publicada no projeto real
 *      (cjsynanolcgzadfinavh) e respondendo — 401 a chamada sem sessão, que é
 *      o esperado; 404 seria "não existe".
 *   2. Tela no app: AccountDeletionSection, em /conta e em
 *      /comunidade/conta-e-privacidade, chamando requestServerAccountDeletion.
 *   3. Página web de exclusão no ar, no domínio de produção:
 *      https://100diassemdesistir.com.br/excluir-conta (HTTP 200, sem campos
 *      em aberto).
 *
 * Isto vale na branch comunidade-v2. A V1 em `main` segue com a nuvem
 * desligada, porque ela vai para a loja SEM o Juntos e sem conta nenhuma.
 */
export const ACCOUNT_DELETION_AVAILABLE = true;

/** A nuvem pode existir nesta build? Desenvolvimento sim; release só com exclusão de conta pronta. */
export function cloudAllowedInThisBuild(isDev: boolean = typeof __DEV__ === 'undefined' ? false : __DEV__): boolean {
  return isDev || ACCOUNT_DELETION_AVAILABLE;
}

/** Usado apenas por testes para simular uma build configurada. */
export function _setCloudConfigForTests(config: CloudConfig | null) {
  override = config;
}

export function getCloudConfig(): CloudConfig | null {
  // O portão vem antes de tudo, inclusive do override de teste: release nunca liga a nuvem.
  if (!cloudAllowedInThisBuild()) return null;
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
