import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCloudSession } from '@/cloud/useSession';
import { getCommunityApi, type CommunityApi } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { COMMUNITY_ENABLED } from '@/config/features';

/**
 * Estado da pessoa diante da Comunidade, para as telas de conta e perfil.
 *
 * Cada estado tem uma tela honesta. Nenhum deles inventa dado:
 *   unavailable · a Comunidade está desligada nesta build ou não há servidor
 *   loading     · restaurando a sessão ou perguntando ao servidor
 *   signed_out  · sem conta de e-mail (sessão anônima não conta: o servidor recusa, CM006)
 *   error       · o servidor não respondeu; a mensagem é a humana do cliente, nunca a crua
 *   ready       · temos o estado real vindo de `my_community_status`
 */
export type CommunityAccount =
  | { kind: 'unavailable' }
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'error'; message: string; retry: () => void }
  | { kind: 'ready'; api: CommunityApi; status: CommunityStatus; email: string; reload: () => void };

export const GENERIC_ERROR = 'Não foi possível falar com a comunidade agora. Tente de novo em instantes.';

/** Mensagem segura para a tela: a do cliente (já traduzida) ou a genérica. */
export function communityMessage(error: unknown, fallback = GENERIC_ERROR): string {
  return error instanceof CommunityError ? error.message : fallback;
}

type Loaded =
  | { key: string; status: CommunityStatus; error: null }
  | { key: string; status: null; error: string };

export function useCommunityAccount(): CommunityAccount {
  const cloud = useCloudSession();
  const api = useMemo(() => (COMMUNITY_ENABLED && cloud.configured ? getCommunityApi() : null), [cloud.configured]);
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const reload = useCallback(() => setTick((value) => value + 1), []);

  const user = cloud.session?.user as { id?: string; email?: string | null; is_anonymous?: boolean } | undefined;
  const email = user && user.is_anonymous !== true && user.email ? user.email : null;
  const key = `${user?.id ?? email ?? 'none'}#${tick}`;

  useEffect(() => {
    if (!api || !email) return;
    let alive = true;
    api.getStatus().then(
      (status) => {
        if (alive) setLoaded({ key, status, error: null });
      },
      (error: unknown) => {
        if (alive) setLoaded({ key, status: null, error: communityMessage(error) });
      },
    );
    return () => {
      alive = false;
    };
  }, [api, email, key]);

  if (!api) return { kind: 'unavailable' };
  if (cloud.loading) return { kind: 'loading' };
  if (!email) return { kind: 'signed_out' };
  // Enquanto a resposta não for DESTA sessão e deste pedido, é carregando.
  if (!loaded || loaded.key !== key) return { kind: 'loading' };
  if (loaded.error !== null) return { kind: 'error', message: loaded.error, retry: reload };
  return { kind: 'ready', api, status: loaded.status, email, reload };
}
