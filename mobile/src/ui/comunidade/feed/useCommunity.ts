import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { getCommunityApi, type CommunityApi } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { useAutoEnter, useCommunitySession } from '@/community/useCommunitySession';
import { needsAceite } from '@/ui/comunidade/publicar/fluxo';

/**
 * Em que pé a pessoa está no Juntos, do ponto de vista das telas de feed e de
 * conversa. Tudo vem do servidor (`my_community_status`); nada é guardado no
 * aparelho como se fosse verdade.
 *
 * Desde 2026-09-22 (pedido do fundador) não existe "entrar": quem abre a aba
 * já está dentro. A sessão do aparelho e o `join_community` acontecem sozinhos
 * (`useAutoEnter`), e enquanto isso a tela mostra o esqueleto do feed.
 *
 * - `no_server`: a build tem o Juntos ligado mas não tem nuvem. Estado
 *   honesto, nunca feed falso.
 * - `loading`: perguntando o estado ou entrando sozinho.
 * - `suspended`: suspensa ou removida pela moderação.
 * - `error`: não deu para entrar ou para perguntar o estado (com "Tentar de novo").
 * - `ready`: pode ler. Publicar, comentar e dar Amém ainda pedem a tela única
 *   de aceite (`needsConsent`).
 */
export type CommunityGate =
  | { kind: 'no_server' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'suspended' }
  | { kind: 'ready'; api: CommunityApi; status: CommunityStatus };

export const GENERIC_ERROR = 'Não foi possível falar com o Juntos agora. Tente de novo.';

/** Mensagem humana de um erro qualquer: nunca o texto cru do servidor. */
export function humanError(error: unknown): string {
  return error instanceof CommunityError ? error.message : GENERIC_ERROR;
}

/**
 * Antes da primeira publicação, comentário ou Amém: a tela única de aceite
 * (16+, regras, consentimento destacado e o nome, se faltar).
 */
export function needsConsent(status: CommunityStatus): boolean {
  return needsAceite(status);
}

function isOut(status: CommunityStatus): boolean {
  return status.memberStatus === 'suspended' || status.memberStatus === 'removed';
}

export function useCommunity(): { gate: CommunityGate; reload: () => void } {
  const session = useCommunitySession();
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

  // Na montagem e a cada volta (aceite, perfil, conta): o estado pode ter mudado.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const current = status.state === 'ok' ? status.value : null;
  const { error: entryError, retry: retryEntry } = useAutoEnter({
    api,
    session,
    needsJoin: current !== null && !current.isMember && !isOut(current),
    isMember: current?.isMember === true,
    onJoined: load,
  });

  const retry = useCallback(() => {
    retryEntry();
    load();
  }, [retryEntry, load]);

  let gate: CommunityGate;
  if (!api) gate = { kind: 'no_server' };
  else if (entryError?.code === 'blocked_from_community') gate = { kind: 'suspended' };
  else if (entryError) gate = { kind: 'error', message: entryError.message };
  else if (session.loading || !signedIn) gate = { kind: 'loading' };
  else if (status.state === 'error') gate = { kind: 'error', message: status.message };
  else if (!current) gate = { kind: 'loading' };
  else if (isOut(current)) gate = { kind: 'suspended' };
  else if (!current.isMember) gate = { kind: 'loading' };
  else gate = { kind: 'ready', api, status: current };

  return { gate, reload: retry };
}
