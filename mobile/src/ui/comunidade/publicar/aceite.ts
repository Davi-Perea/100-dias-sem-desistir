import { router } from 'expo-router';
import { useState } from 'react';

import { termsSha256 } from '@/community/api';
import { isDemoCommunityApi } from '@/community/demoApi';
import { toCommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { goBackOrHome } from '@/ui/BackBar';

import { flowParams, ROUTES } from './fluxo';
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
 * Aceite de um texto (regras ou consentimento): calcula se pode aceitar, envia
 * versão + sha256 do texto EXATO que a tela mostrou e segue o fluxo.
 */
export function serverVersionFor(doc: TermsDocument, status: CommunityStatus): string {
  return doc.purpose === 'community_rules' ? status.rulesVersion : status.publishConsentVersion;
}

export function availabilityNotice(availability: TermsAvailability): string | null {
  if (availability === 'pending') return PENDING_NOTICE;
  if (availability === 'mismatch') return MISMATCH_NOTICE;
  return null;
}

/** Depois das regras vem o consentimento (se faltar); depois, a ação que pediu. */
export function continueFlow(input: {
  after: 'rules' | 'consent';
  needsPublishConsent: boolean;
  next: string | null;
  day: number | null;
}) {
  if (input.after === 'rules' && input.needsPublishConsent) {
    router.replace({ pathname: ROUTES.consentimento, params: flowParams(input.next, input.day) });
    return;
  }
  if (input.next) {
    router.replace({ pathname: input.next, params: flowParams(null, input.day) } as never);
    return;
  }
  goBackOrHome();
}

export function useTermsAcceptance(doc: TermsDocument, state: CommunityStatusState) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outdated, setOutdated] = useState(false);

  const ready = state.kind === 'ready' ? state : null;
  const serverVersion = ready ? serverVersionFor(doc, ready.status) : null;
  // Demonstração (demoApi.ts): o texto continua o rascunho PENDENTE, com aviso na tela, mas dá para seguir.
  const demo = ready !== null && isDemoCommunityApi(ready.api);
  const computed: TermsAvailability | null = ready ? (demo ? 'ready' : termsAvailability(doc, serverVersion)) : null;
  const availability: TermsAvailability | null = outdated ? 'mismatch' : computed;

  /** true = aceito e registrado no servidor. */
  const accept = async (): Promise<boolean> => {
    if (!ready || availability !== 'ready' || !serverVersion || busy) return false;
    setBusy(true);
    setError(null);
    try {
      const sha256 = await termsSha256(termsDocumentText(doc));
      await ready.api.acceptTerms({ purpose: doc.purpose, version: serverVersion, sha256, appVersion: appVersion() });
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
