import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { onAuthStateChange, restoreSession } from './auth';
import { isCloudConfigured } from './config';
import { getEffectiveRole, getMyMembership } from './groups';
import type { EffectiveRole, MembershipView } from './types';

/**
 * Estado de identidade do app. Tudo aqui é OPCIONAL: sem nuvem configurada ou
 * sem sessão, o restante do produto continua funcionando (spec §4, §14).
 *
 * `role` é sempre buscado do servidor. Guardar papel em estado local seria
 * confiar no cliente, que é exatamente o que a spec proíbe (§8).
 */
export type CloudSessionState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  signedIn: boolean;
  role: EffectiveRole;
  membership: MembershipView | null;
  /** Erro ao consultar papel/grupo; não impede o app de funcionar. */
  degraded: boolean;
  refresh: () => void;
};

type IdentityState = {
  key: string;
  role: EffectiveRole;
  membership: MembershipView | null;
  degraded: boolean;
};

export function useCloudSession(): CloudSessionState {
  const configured = isCloudConfigured();
  // Sem nuvem já nasce resolvido: nada a restaurar, nada a esperar.
  const [restored, setRestored] = useState<{ done: boolean; session: Session | null }>(() => ({
    done: !configured,
    session: null,
  }));
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    restoreSession().then((session) => {
      if (alive) setRestored({ done: true, session });
    });
    const unsubscribe = onAuthStateChange((session) => {
      if (!alive) return;
      setRestored({ done: true, session });
      setTick((value) => value + 1);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [configured]);

  const session = restored.session;
  // Chave do resultado: enquanto ela não bate, o papel exibido é o neutro.
  const key = `${session?.user?.id ?? 'anon'}#${tick}`;

  useEffect(() => {
    if (!configured || !session) return;
    let alive = true;
    Promise.all([getEffectiveRole(), getMyMembership()]).then(
      ([role, membership]) => {
        if (alive) setIdentity({ key, role, membership, degraded: false });
      },
      () => {
        // Rede fora ou consulta recusada: sem papel elevado e sem quebrar a tela.
        if (alive) setIdentity({ key, role: 'none', membership: null, degraded: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [configured, session, key]);

  const fresh = identity?.key === key ? identity : null;

  return {
    configured,
    loading: !restored.done,
    session,
    signedIn: session !== null,
    role: session ? fresh?.role ?? 'none' : 'none',
    membership: session ? fresh?.membership ?? null : null,
    degraded: session ? fresh?.degraded ?? false : false,
    refresh,
  };
}
