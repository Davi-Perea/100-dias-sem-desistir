import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { termsSha256 } from '@/community/api';
import { isDemoCommunityApi } from '@/community/demoApi';
import { toCommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { goBackOrHome } from '@/ui/BackBar';

import { flowParams } from './fluxo';
import {
  MISMATCH_NOTICE,
  PENDING_NOTICE,
  termsAvailability,
  termsDocumentText,
  type TermsAvailability,
  type TermsDocument,
} from './textos';
import { appVersion, type CommunityStatusState } from './useCommunityStatus';

/**
 * Tela única de aceite (aba "Juntos", 2026-09-22): antes da primeira
 * publicação, comentário ou Amém, a pessoa confirma 16+, aceita as regras e dá
 * o consentimento destacado, com UM botão ("Concordo e continuar"). Se ela
 * ainda não tem nome, dá ali mesmo.
 *
 * O servidor recebe o que sempre recebeu, cada coisa no seu registro:
 *   1. `set_community_profile` (nome, se faltava; 16+),
 *   2. `accept_community_terms` das regras (versão + sha256 do texto COMPLETO,
 *      aberto pelo link da tela),
 *   3. `accept_community_terms` do consentimento (versão + sha256 do texto
 *      exato que a tela mostrou).
 * O que já foi registrado não é enviado de novo numa segunda tentativa.
 */
export function serverVersionFor(doc: TermsDocument, status: CommunityStatus): string {
  return doc.purpose === 'community_rules' ? status.rulesVersion : status.publishConsentVersion;
}

export function availabilityNotice(availability: TermsAvailability): string | null {
  if (availability === 'pending') return PENDING_NOTICE;
  if (availability === 'mismatch') return MISMATCH_NOTICE;
  return null;
}

/** O pior dos dois: basta um texto pendente ou desatualizado para ninguém aceitar. */
export function combinedAvailability(a: TermsAvailability, b: TermsAvailability): TermsAvailability {
  if (a === 'mismatch' || b === 'mismatch') return 'mismatch';
  if (a === 'pending' || b === 'pending') return 'pending';
  return 'ready';
}

/* ------------------------------------------------ o que aconteceu no aceite */

/**
 * Como a pessoa saiu da tela de aceite. Quem pediu (o feed com um Amém, a tela
 * de publicar com o post pronto) lê isto ao voltar: "aceitou" = faça a ação que
 * ela queria; "saiu" = esqueça a ação pendente. Lido uma vez só.
 */
export type AceiteOutcome = 'accepted' | 'declined';
let lastOutcome: AceiteOutcome | null = null;

export function markAceite(outcome: AceiteOutcome): void {
  lastOutcome = outcome;
}

export function takeAceiteOutcome(): AceiteOutcome | null {
  const outcome = lastOutcome;
  lastOutcome = null;
  return outcome;
}

/** Depois do aceite: para a rota pedida (`next`) ou de volta para quem chamou. */
export function continueAfterAceite(input: { next: string | null; day: number | null }) {
  markAceite('accepted');
  if (input.next) {
    router.replace({ pathname: input.next, params: flowParams(null, input.day) } as never);
    return;
  }
  goBackOrHome();
}

/* ----------------------------------------------------------------- o aceite */

export type AceiteNeeds = { name: boolean; age: boolean; rules: boolean; consent: boolean };

export function aceiteNeeds(status: CommunityStatus): AceiteNeeds {
  return {
    name: !cleanText(status.displayName ?? status.profile.displayName),
    age: !status.profile.ageConfirmed,
    rules: status.needsRules,
    consent: status.needsPublishConsent,
  };
}

/** O nome digitado serve? (obrigatório só quando falta, até 40.) */
export function nameOk(name: string): boolean {
  const cleaned = cleanText(name);
  return cleaned !== null && charLength(cleaned) <= LIMITS.displayName;
}

export function useAceite(docs: { rules: TermsDocument; consent: TermsDocument }, state: CommunityStatusState) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outdated, setOutdated] = useState(false);
  // O que já foi registrado nesta tela (uma segunda tentativa não reenvia).
  const done = useRef<Set<'profile' | 'rules' | 'consent'>>(new Set());

  const ready = state.kind === 'ready' ? state : null;
  // Demonstração (demoApi.ts): o texto continua o rascunho PENDENTE, com aviso na tela, mas dá para seguir.
  const demo = ready !== null && isDemoCommunityApi(ready.api);
  let computed: TermsAvailability | null = null;
  if (ready) {
    computed = demo
      ? 'ready'
      : combinedAvailability(
          ready.status.needsRules ? termsAvailability(docs.rules, ready.status.rulesVersion) : 'ready',
          ready.status.needsPublishConsent ? termsAvailability(docs.consent, ready.status.publishConsentVersion) : 'ready',
        );
  }
  const availability: TermsAvailability | null = outdated ? 'mismatch' : computed;

  /** true = tudo registrado no servidor. */
  const accept = async (input: { name: string }): Promise<boolean> => {
    if (!ready || availability !== 'ready' || busy) return false;
    const needs = aceiteNeeds(ready.status);
    if (needs.name && !nameOk(input.name)) return false;
    setBusy(true);
    setError(null);
    try {
      const api = ready.api;
      if ((needs.name || needs.age) && !done.current.has('profile')) {
        await api.updateProfile({ name: needs.name ? cleanText(input.name) : undefined, confirms16: true });
        done.current.add('profile');
      }
      if (needs.rules && !done.current.has('rules')) {
        const sha256 = await termsSha256(termsDocumentText(docs.rules));
        await api.acceptTerms({
          purpose: 'community_rules',
          version: ready.status.rulesVersion,
          sha256,
          appVersion: appVersion(),
        });
        done.current.add('rules');
      }
      if (needs.consent && !done.current.has('consent')) {
        const sha256 = await termsSha256(termsDocumentText(docs.consent));
        await api.acceptTerms({
          purpose: 'community_publish',
          version: ready.status.publishConsentVersion,
          sha256,
          appVersion: appVersion(),
        });
        done.current.add('consent');
      }
      return true;
    } catch (failure) {
      const known = toCommunityError(failure);
      if (known.code === 'terms_outdated') setOutdated(true);
      else setError(known.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { availability, accept, busy, error, demo };
}
