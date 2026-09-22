import { communityError } from './errors';
import type { CommunityProfile } from './types';
import { charLength, cleanText, LIMITS } from './validation';

/**
 * Regras puras do perfil da comunidade (C1, C4 e N3 do feedback de 2026-09-22).
 * O servidor confere de novo (private.community_profile_complete, CM007).
 */

/** O que falta para publicar, na ordem dos passos do perfil. */
export type ProfileGap = 'foto' | 'nome' | 'idade' | 'ministerio';

export const EMPTY_PROFILE: CommunityProfile = {
  displayName: null,
  ministry: null,
  ministryAnswered: false,
  bio: null,
  avatarPath: null,
  avatarStatus: 'none',
  ageConfirmed: false,
  contactEmail: null,
  newsOptIn: false,
};

export function profileGaps(profile: CommunityProfile): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  const photoOk = profile.avatarPath !== null && (profile.avatarStatus === 'in_review' || profile.avatarStatus === 'approved');
  if (!photoOk) gaps.push('foto');
  if (!cleanText(profile.displayName)) gaps.push('nome');
  if (!profile.ageConfirmed) gaps.push('idade');
  if (!profile.ministryAnswered) gaps.push('ministerio');
  return gaps;
}

export function isProfileComplete(profile: CommunityProfile): boolean {
  return profileGaps(profile).length === 0;
}

const GAP_LABEL: Record<ProfileGap, string> = {
  foto: 'foto de perfil',
  nome: 'nome',
  idade: 'a confirmação de 16 anos ou mais',
  ministerio: 'ministério (pode ser "Nenhum")',
};

/** "Para publicar, falta: foto de perfil e nome." */
export function gapsSentence(gaps: ProfileGap[]): string | null {
  if (gaps.length === 0) return null;
  const labels = gaps.map((gap) => GAP_LABEL[gap]);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
  return `Para publicar, falta: ${list}.`;
}

/**
 * "Ministério Comunicação". Nomes da escala que já começam com "Min." ou
 * "Ministério" ficam como estão (sem "Ministério Min. de Pais").
 */
export function ministryLabel(ministry: string | null): string | null {
  const name = cleanText(ministry);
  if (!name) return null;
  return /^min(\.|istério\b)/i.test(name) ? name : `Ministério ${name}`;
}

/** "Davi · Ministério Comunicação", ou só "Davi" com "Nenhum" (C4). */
export function authorLine(name: string, ministry: string | null): string {
  const label = ministryLabel(ministry);
  return label ? `${name} · ${label}` : name;
}

/** Nome com até 40 caracteres, ou vazio (o passo pode ser pulado). */
export function isValidOptionalName(name: string): boolean {
  const cleaned = cleanText(name);
  return cleaned === null || charLength(cleaned) <= LIMITS.displayName;
}

export function isValidBio(bio: string): boolean {
  const cleaned = cleanText(bio);
  return cleaned === null || charLength(cleaned) <= LIMITS.bio;
}

/** A mesma forma que o servidor aceita (algo@algo.dominio, sem espaço). */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidContactEmail(email: string): boolean {
  const cleaned = cleanText(email);
  return cleaned === null || (charLength(cleaned) <= LIMITS.email && EMAIL.test(cleaned));
}


/** Passos do perfil (C4). Campo ausente = não mexe. */
export type ProfileUpdate = {
  name?: string | null;
  ministry?: string | null;
  noMinistry?: boolean;
  bio?: string | null;
  clearBio?: boolean;
  confirms16?: boolean;
};

/** Confere e traduz para os argumentos de set_community_profile. */
export function profileArgs(input: ProfileUpdate): Record<string, unknown> {
  const name = cleanText(input.name);
  const ministry = cleanText(input.ministry);
  const bio = cleanText(input.bio);
  if (name && !isValidOptionalName(name)) throw communityError('invalid_input');
  if (ministry && (charLength(ministry) > LIMITS.ministry || input.noMinistry)) throw communityError('invalid_input');
  if (bio && (!isValidBio(bio) || input.clearBio)) throw communityError('invalid_input');
  return {
    new_name: name,
    new_ministry: ministry,
    no_ministry: input.noMinistry === true,
    new_bio: bio,
    clear_bio: input.clearBio === true,
    confirms_16: input.confirms16 === true,
  };
}
