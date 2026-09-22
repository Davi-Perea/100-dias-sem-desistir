import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';

import { getCommunityApi, type CommunityApi } from '@/community/api';
import { communityError, toCommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { useCommunitySession } from '@/community/useCommunitySession';

/**
 * Estado da Comunidade para as telas de publicar, regras e consentimento.
 *
 * Nunca inventa dado: sem a Comunidade ligada nesta build, sem nuvem, sem conta
 * ou sem resposta do servidor, a tela recebe um estado honesto para mostrar.
 */
export type CommunityStatusState =
  /** COMMUNITY_ENABLED desligado ou nuvem não configurada: o cliente não existe. */
  | { kind: 'unavailable'; message: string }
  | { kind: 'loading' }
  /** Sem sessão (nem a conta ligada ao aparelho): a tela oferece "Entrar na comunidade". */
  | { kind: 'signed_out' }
  | { kind: 'error'; message: string; code: string }
  | { kind: 'ready'; status: CommunityStatus; api: CommunityApi };

export function useCommunityStatus(): CommunityStatusState & { reload: () => void } {
  const api = useMemo(() => getCommunityApi(), []);
  const session = useCommunitySession();
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<
    { key: string; status: CommunityStatus } | { key: string; error: { message: string; code: string } } | null
  >(null);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  /** Pergunta de novo sem voltar a "carregando" (a tela continua como está até a resposta). */
  const [silent, setSilent] = useState(0);
  const userId = session.userId;

  // C6: ao voltar (da entrada, do perfil), pergunta de novo. Sem isto, quem entrava
  // pela tela de publicar voltava para "Entre na comunidade" mesmo já estando dentro.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) setSilent((value) => value + 1);
      focusedOnce.current = true;
    }, []),
  );
  const key = `${userId ?? 'anon'}#${tick}`;

  useEffect(() => {
    if (!api || !userId) return;
    let alive = true;
    api.getStatus().then(
      (status) => {
        if (alive) setResult({ key, status });
      },
      (error: unknown) => {
        const failure = toCommunityError(error);
        if (alive) setResult({ key, error: { message: failure.message, code: failure.code } });
      },
    );
    return () => {
      alive = false;
    };
  }, [api, userId, key, silent]);

  if (!api) return { kind: 'unavailable', message: communityError('feature_disabled').message, reload };
  if (session.loading) return { kind: 'loading', reload };
  if (!session.signedIn) return { kind: 'signed_out', reload };
  if (!result || result.key !== key) return { kind: 'loading', reload };
  if ('error' in result) return { kind: 'error', ...result.error, reload };
  return { kind: 'ready', status: result.status, api, reload };
}

/** Versão do app registrada junto com o aceite (recibo do consentimento). */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? 'desconhecida';
}
