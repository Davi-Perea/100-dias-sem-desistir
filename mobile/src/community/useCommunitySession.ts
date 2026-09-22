import { useSyncExternalStore } from 'react';

import { useCloudSession } from '@/cloud/useSession';

import { getDemoSession, isCommunityDemo, subscribeDemoSession } from './demoApi';

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
