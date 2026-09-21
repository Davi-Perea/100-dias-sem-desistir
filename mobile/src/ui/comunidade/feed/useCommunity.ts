import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { getCommunityApi, type CommunityApi } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { useCloudSession } from '@/cloud/useSession';

/**
 * Em que pé a pessoa está na Comunidade, do ponto de vista das telas de feed e
 * de conversa. Tudo vem do servidor (`my_community_status`); nada é guardado
 * no aparelho como se fosse verdade.
 *
 * - `no_server`: a build tem a Comunidade ligada mas não tem nuvem. Estado
 *   honesto, nunca feed falso.
 * - `signed_out`: sem conta de e-mail. A leitura continua sem conta.
 * - `not_member`: tem conta, ainda não entrou com o código da igreja.
 * - `suspended`: suspensa ou removida pela moderação.
 * - `ready`: pode ler. Publicar, comentar e dar Amém ainda pedem o aceite das
 *   regras e o consentimento (`needsConsent`).
 */
export type CommunityGate =
  | { kind: 'no_server' }
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'error'; message: string }
  | { kind: 'not_member' }
  | { kind: 'suspended' }
  | { kind: 'ready'; api: CommunityApi; status: CommunityStatus };

export const GENERIC_ERROR = 'Não foi possível falar com a comunidade agora. Tente de novo.';

/** Mensagem humana de um erro qualquer: nunca o texto cru do servidor. */
export function humanError(error: unknown): string {
  return error instanceof CommunityError ? error.message : GENERIC_ERROR;
}

/** Regras e consentimento vêm antes da primeira publicação, comentário ou Amém. */
export function needsConsent(status: CommunityStatus): boolean {
  return status.needsRules || status.needsPublishConsent;
}

export function useCommunity(): { gate: CommunityGate; reload: () => void } {
  const session = useCloudSession();
  // Um cliente por montagem: getCommunityApi() cria um objeto novo a cada chamada.
  const api = useMemo(() => getCommunityApi(), []);
  const [status, setStatus] = useState<
    { state: 'idle' } | { state: 'loading' } | { state: 'error'; message: string } | { state: 'ok'; value: CommunityStatus }
  >({ state: 'idle' });
  const request = useRef(0);

  const signedIn = session.signedIn;
  const load = useCallback(() => {
    if (!api || !signedIn) return;
    const id = ++request.current;
    setStatus((prev) => (prev.state === 'ok' ? prev : { state: 'loading' }));
    api.getStatus().then(
      (value) => {
        if (request.current === id) setStatus({ state: 'ok', value });
      },
      (error: unknown) => {
        if (request.current === id) setStatus({ state: 'error', message: humanError(error) });
      },
    );
  }, [api, signedIn]);

  // Na montagem e a cada volta (consentimento, código, conta): o estado pode ter mudado.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  let gate: CommunityGate;
  if (!api) gate = { kind: 'no_server' };
  else if (session.loading) gate = { kind: 'loading' };
  else if (!signedIn) gate = { kind: 'signed_out' };
  else if (status.state === 'error') gate = { kind: 'error', message: status.message };
  else if (status.state !== 'ok') gate = { kind: 'loading' };
  else if (!status.value.isMember) gate = { kind: 'not_member' };
  else if (status.value.memberStatus === 'suspended' || status.value.memberStatus === 'removed') {
    gate = { kind: 'suspended' };
  }
  else gate = { kind: 'ready', api, status: status.value };

  return { gate, reload: load };
}
