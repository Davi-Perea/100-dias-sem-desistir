import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useCloudSession } from '@/cloud/useSession';
import { useSettings } from '@/settings/settingsStore';

import { getDemoSession, isCommunityDemo, subscribeDemoSession } from './demoApi';
import { ensureDeviceSession, ensureJoined } from './deviceSession';
import { type CommunityError, toCommunityError } from './errors';

/**
 * A sessão que a Comunidade enxerga: a da nuvem ou, só na demonstração
 * (demoApi.ts), a sessão simulada em memória. Fora da demonstração é
 * exatamente a sessão da nuvem.
 */
export type CommunitySession = {
  configured: boolean;
  loading: boolean;
  signedIn: boolean;
  userId: string | null;
  /** E-mail de uma conta de e-mail de verdade. Conta ligada ao aparelho (sessão anônima, C2) não tem. */
  email: string | null;
  /** Conta ligada ao aparelho (sessão anônima do Supabase, ou a demonstração). */
  deviceAccount: boolean;
  demo: boolean;
};

export function useCommunitySession(): CommunitySession {
  const cloud = useCloudSession();
  const demoSession = useSyncExternalStore(subscribeDemoSession, getDemoSession, getDemoSession);

  if (isCommunityDemo()) {
    return {
      configured: true,
      loading: false,
      signedIn: demoSession !== null,
      userId: demoSession?.userId ?? null,
      email: null,
      deviceAccount: demoSession !== null,
      demo: true,
    };
  }

  const user = cloud.session?.user as { id?: string; email?: string | null; is_anonymous?: boolean } | undefined;
  return {
    configured: cloud.configured,
    loading: cloud.loading,
    signedIn: cloud.signedIn,
    userId: user?.id ?? null,
    email: user && user.is_anonymous !== true && user.email ? user.email : null,
    deviceAccount: user?.is_anonymous === true,
    demo: false,
  };
}

/**
 * Entrada automática na comunidade (aba "Juntos", 2026-09-22): sem sessão,
 * cria a do aparelho; com sessão e sem ser membro, entra com o nome da entrada
 * do app. Nenhum toque, nenhuma tela. Quem foi suspenso ou removido não entra
 * de novo (o servidor responde `blocked_from_community`).
 *
 * `needsJoin`: o status do servidor já respondeu e diz "não é membro" (nem
 * suspenso, nem removido). `onJoined`: pergunte o status de novo.
 */
export function useAutoEnter(input: {
  api: { joinCommunity(input?: { displayName?: string | null }): Promise<void> } | null;
  session: CommunitySession;
  needsJoin: boolean;
  /** O status do servidor já disse "é membro" (para uma saída depois ser uma entrada nova). */
  isMember?: boolean;
  onJoined: () => void;
}): { error: CommunityError | null; retry: () => void } {
  const { api, session, needsJoin, isMember = false } = input;
  const settings = useSettings();
  const [error, setError] = useState<CommunityError | null>(null);
  const onJoined = useRef(input.onJoined);
  const name = settings?.profile.name ?? null;
  const nameRef = useRef<string | null>(name);
  useEffect(() => {
    onJoined.current = input.onJoined;
    nameRef.current = name;
  });

  const needsSession = api !== null && session.configured && !session.loading && !session.signedIn;
  useEffect(() => {
    if (!needsSession || error) return;
    let alive = true;
    ensureDeviceSession().catch((failure: unknown) => {
      if (alive) setError(toCommunityError(failure));
    });
    return () => {
      alive = false;
    };
  }, [needsSession, error]);

  // Espera a entrada do app carregar do disco, para não entrar sem o nome que a pessoa já deu.
  const settingsLoaded = settings !== null;
  const shouldJoin = api !== null && session.signedIn && needsJoin && settingsLoaded;
  // Uma entrada por tentativa: se o servidor ainda disser "não é membro" depois
  // do join, não fica pedindo em laço (só de novo em "Tentar de novo").
  const joined = useRef(false);
  // O servidor confirmou "é membro": a próxima vez que precisar entrar (saiu da
  // comunidade pela conta e voltou ao Juntos) é uma tentativa nova, não um laço.
  useEffect(() => {
    if (isMember) joined.current = false;
  }, [isMember]);
  useEffect(() => {
    if (!shouldJoin || !api || error || joined.current) return;
    joined.current = true;
    // Sem "alive": a tentativa é uma só, e a resposta dela sempre precisa chegar
    // (numa tela já desmontada, o setState não faz nada).
    ensureJoined(api, nameRef.current).then(
      () => onJoined.current(),
      (failure: unknown) => setError(toCommunityError(failure)),
    );
  }, [api, shouldJoin, error]);

  const retry = useCallback(() => {
    joined.current = false;
    setError(null);
  }, []);
  return { error, retry };
}
