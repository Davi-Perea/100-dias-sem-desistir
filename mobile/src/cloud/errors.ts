/**
 * Erros da nuvem traduzidos para mensagens seguras (spec §15: "erros não vazam dados").
 * A mensagem crua do servidor nunca vai para a tela: ela pode revelar existência de
 * conta, nome de tabela, política violada ou detalhe de schema.
 */
export type CloudErrorCode =
  | 'not_configured'
  | 'offline'
  | 'invalid_email'
  | 'rate_limited'
  | 'invalid_or_expired_code'
  | 'session_expired'
  | 'not_authorized'
  | 'not_found'
  | 'already_member'
  | 'unknown';

export class CloudError extends Error {
  readonly code: CloudErrorCode;
  constructor(code: CloudErrorCode, message: string) {
    super(message);
    this.name = 'CloudError';
    this.code = code;
  }
}

const MESSAGES: Record<CloudErrorCode, string> = {
  not_configured: 'Conta indisponível nesta versão do app.',
  offline: 'Sem conexão. Sua jornada pessoal continua funcionando normalmente.',
  invalid_email: 'Confira o endereço de e-mail.',
  rate_limited: 'Muitas tentativas seguidas. Aguarde um instante e tente de novo.',
  invalid_or_expired_code: 'Código inválido ou expirado. Peça um novo código.',
  // PROVISÓRIO (decisão do engenheiro, 2026-09-21: SEC-07 — JWT vencido numa consulta de dados não é "código inválido")
  session_expired: 'Sua sessão terminou. Entre de novo na sua conta.',
  not_authorized: 'Você não tem permissão para esta ação.',
  not_found: 'Não encontramos o que você procura.',
  already_member: 'Você já faz parte deste grupo.',
  unknown: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export function cloudError(code: CloudErrorCode): CloudError {
  return new CloudError(code, MESSAGES[code]);
}

/**
 * De onde veio o erro. Só o fluxo de código por e-mail (`auth`) pode virar
 * "código inválido ou expirado"; num erro de dados (`data`) a mesma palavra
 * "invalid" é, por exemplo, um uuid malformado (22P02) vindo de um deep link.
 */
export type ErrorContext = 'auth' | 'data';

/** Classifica o erro do Supabase sem repassar o texto original. */
export function classifyError(error: unknown, context: ErrorContext = 'data'): CloudError {
  if (error instanceof CloudError) return error;

  const raw = error as { message?: string; status?: number; code?: string; name?: string } | null;
  const message = (raw?.message ?? '').toLowerCase();
  const status = raw?.status;
  const code = raw?.code;

  // 1. Rede. O auth-js embrulha a falha de fetch em AuthRetryableFetchError.
  if (
    raw?.name === 'AuthRetryableFetchError' ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('timeout')
  ) {
    return cloudError('offline');
  }
  if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many')
  ) {
    return cloudError('rate_limited');
  }

  // 2. Códigos do Postgres/PostgREST, antes de qualquer palavra da mensagem.
  // 42501 = insufficient_privilege; violação de RLS chega como 403/42501.
  if (code === '42501' || status === 403 || message.includes('row-level security')) {
    return cloudError('not_authorized');
  }
  if (code === '23505' || message.includes('duplicate key')) {
    return cloudError('already_member');
  }
  // P0002 = no_data_found; 22P02 = texto que não é uuid (id de deep link malformado).
  if (code === 'P0002' || code === '22P02' || code === 'PGRST116' || status === 404) {
    return cloudError('not_found');
  }

  // 3. Só agora a palavra "invalid/expired" — e só no fluxo de código por e-mail.
  if (context === 'auth') {
    if (
      code === 'otp_expired' ||
      code === 'invalid_credentials' ||
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('otp') ||
      status === 401
    ) {
      return cloudError('invalid_or_expired_code');
    }
    return cloudError('unknown');
  }

  // Consulta de dados com JWT vencido ou revogado (PGRST301/PGRST303, 401).
  if (code === 'PGRST301' || code === 'PGRST303' || status === 401 || message.includes('jwt')) {
    return cloudError('session_expired');
  }
  return cloudError('unknown');
}
