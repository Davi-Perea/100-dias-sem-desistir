import { classifyError, cloudError, type CloudErrorCode } from '@/cloud/errors';

/**
 * Erros da Comunidade. Os códigos CM00x são levantados pelas RPCs
 * (supabase/migrations/20260921130100_comunidade_funcoes.sql); o resto cai na
 * classificação genérica da nuvem. A mensagem crua do servidor nunca vai para a tela.
 */
type CommunityOnlyCode =
  | 'feature_disabled'
  | 'needs_invite'
  | 'needs_consent'
  | 'blocked_from_community'
  | 'terms_outdated'
  | 'needs_adult_account'
  | 'invalid_input'
  | 'photo_not_jpeg'
  | 'photo_too_large'
  | 'photo_has_metadata';

export type CommunityErrorCode = CloudErrorCode | CommunityOnlyCode;

const MESSAGES: Record<CommunityOnlyCode, string> = {
  feature_disabled: 'A comunidade ainda não está disponível nesta versão do app.',
  needs_invite: 'Para participar, entre com o código da sua igreja.',
  needs_consent: 'Antes de publicar, leia e aceite as regras e o consentimento.',
  blocked_from_community: 'Sua participação na comunidade está suspensa.',
  terms_outdated: 'O texto foi atualizado. Leia a versão nova para continuar.',
  needs_adult_account: 'A comunidade é para quem tem 18 anos ou mais e uma conta com e-mail.',
  invalid_input: 'Confira o que você escreveu e tente de novo.',
  photo_not_jpeg: 'Não foi possível preparar esta foto. Tente outra.',
  photo_too_large: 'A foto ficou grande demais. Tente outra.',
  photo_has_metadata: 'Não foi possível remover os dados de localização da foto. Ela não foi enviada.',
};

/** Na comunidade, o limite é de publicações/tentativas, não de login. */
const CLOUD_OVERRIDES: Partial<Record<CloudErrorCode, string>> = {
  rate_limited: 'Você chegou ao limite por agora. Tente de novo mais tarde.',
};

function isCommunityOnly(code: CommunityErrorCode): code is CommunityOnlyCode {
  return Object.prototype.hasOwnProperty.call(MESSAGES, code);
}

export class CommunityError extends Error {
  readonly code: CommunityErrorCode;
  constructor(code: CommunityErrorCode, message: string) {
    super(message);
    this.name = 'CommunityError';
    this.code = code;
  }
}

export function communityError(code: CommunityErrorCode): CommunityError {
  const message = isCommunityOnly(code) ? MESSAGES[code] : (CLOUD_OVERRIDES[code] ?? cloudError(code).message);
  return new CommunityError(code, message);
}

const SQLSTATE: Record<string, CommunityErrorCode> = {
  CM001: 'needs_invite',
  CM002: 'needs_consent',
  CM003: 'rate_limited',
  CM004: 'blocked_from_community',
  CM005: 'terms_outdated',
  CM006: 'needs_adult_account',
  '22023': 'invalid_input',
};

/** Traduz o erro do Supabase (PostgREST/Storage/rede) sem repassar o texto original. */
export function toCommunityError(error: unknown): CommunityError {
  if (error instanceof CommunityError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && SQLSTATE[code]) return communityError(SQLSTATE[code]);
  return communityError(classifyError(error, 'data').code);
}
