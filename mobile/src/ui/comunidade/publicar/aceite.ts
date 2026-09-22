import { useRef, useState } from 'react';

import { termsSha256 } from '@/community/api';
import { isDemoCommunityApi } from '@/community/demoApi';
import { toCommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { charLength, cleanText, LIMITS } from '@/community/validation';

import {
  aceiteDocument,
  MISMATCH_NOTICE,
  PENDING_NOTICE,
  rulesDocument,
  termsAvailability,
  termsDocumentText,
  type TermsAvailability,
  type TermsDocument,
} from './textos';
import { appVersion, type CommunityStatusState } from './useCommunityStatus';

/**
 * O ACEITE, sem tela (DECISÃO DO FUNDADOR, 2026-09-22): a tela de aceite antes de
 * participar saiu. A linha embaixo do botão diz o que o toque significa —
 * "Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do
 * Juntos." — e o próprio toque em Publicar (ou em Enviar comentário, ou no
 * primeiro Amém) registra o aceite ANTES de criar o conteúdo, como o Google Play
 * e o Apple 1.2 pedem.
 *
 * O servidor recebe o que sempre recebeu, cada coisa no seu registro:
 *   1. `set_community_profile` (nome, se faltava; 16+),
 *   2. `accept_community_terms` das regras (versão + sha256 do texto COMPLETO),
 *   3. `accept_community_terms` do consentimento destacado (versão + sha256).
 * O que já foi registrado não é enviado de novo numa segunda tentativa.
 *
 * Os dois textos cujo hash vai ao servidor continuam LEGÍVEIS a um toque: o link
 * "regras do Juntos" da linha abre a tela de regras, que mostra as regras e o
 * consentimento destacado (LGPD art. 11, I).
 */

/** Os dois documentos do aceite, montados uma vez por tela. */
export function aceiteDocs(): { rules: TermsDocument; consent: TermsDocument } {
  return { rules: rulesDocument(), consent: aceiteDocument() };
}
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

/* ----------------------------------------------------------------- o aceite

   "Como a pessoa saiu da tela de aceite" (`AceiteOutcome`, `markAceite`,
   `takeAceiteOutcome`) SAIU em 2026-09-22 junto com a própria tela: publicar,
   comentar e dizer Amém registram o aceite no toque, e nenhuma tela precisa
   contar a outra o que aconteceu. */

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

/**
 * O aceite de uma tela que publica: `availability` (o portão do texto aprovado),
 * `accept({ name })` para registrar no toque, e `busy`/`error` para o botão. A
 * tela de publicar chama `accept` dentro do "Publicar" e segue para o post; quem
 * comenta ou dá o primeiro Amém faz igual, com o mesmo `state` de
 * `useCommunityStatus` ou com `{ kind: 'ready', status, api }`.
 */
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
