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
  not_authorized: 'Você não tem permissão para esta ação.',
  not_found: 'Não encontramos o que você procura.',
  already_member: 'Você já faz parte deste grupo.',
  unknown: 'Não foi possível concluir agora. Tente de novo em instantes.',
};

export function cloudError(code: CloudErrorCode): CloudError {
  return new CloudError(code, MESSAGES[code]);
}

/** Classifica o erro do Supabase sem repassar o texto original. */
export function classifyError(error: unknown): CloudError {
  if (error instanceof CloudError) return error;

  const raw = error as { message?: string; status?: number; code?: string } | null;
  const message = (raw?.message ?? '').toLowerCase();
  const status = raw?.status;
  const pgCode = raw?.code;

  if (message.includes('network') || message.includes('fetch failed') || message.includes('timeout')) {
    return cloudError('offline');
  }
  if (status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return cloudError('rate_limited');
  }
  if (message.includes('expired') || message.includes('invalid') || message.includes('otp') || status === 401) {
    return cloudError('invalid_or_expired_code');
  }
  // 42501 = insufficient_privilege; violação de RLS chega como 403/42501.
  if (pgCode === '42501' || status === 403 || message.includes('row-level security')) {
    return cloudError('not_authorized');
  }
  if (pgCode === '23505' || message.includes('duplicate key')) {
    return cloudError('already_member');
  }
  if (pgCode === 'P0002' || status === 404) {
    return cloudError('not_found');
  }
  return cloudError('unknown');
}
