import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useEffect, useState } from 'react';

/**
 * Estado da rede do APARELHO (expo-network, incluído no Expo Go), não da nuvem.
 *
 * A faixa F4 ("Sem internet…") dependia de `session.degraded`, que só liga com
 * nuvem configurada, sessão aberta e falha de consulta — por qualquer motivo,
 * inclusive recusa de RLS com a rede no ar. Quem usa sem conta nunca a via, e
 * quem tinha internet podia ver "Sem internet". Aqui a pergunta é outra: o
 * aparelho está fora da rede?
 *
 * Só afirma "sem internet" com evidência: `isConnected === false` ou
 * `isInternetReachable === false`. Estado desconhecido (antes da primeira
 * leitura, módulo indisponível, web) conta como online — a faixa nunca pisca
 * na abertura nem aparece por falta de dado.
 */
export function isOffline(state: NetworkState | null | undefined): boolean {
  if (!state) return false;
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * Mesma leitura do `useNetworkState` do expo-network, com duas defesas que ele
 * não tem: o estado nunca vira `undefined` (o módulo pode responder vazio) e a
 * assinatura é removida só se existir. Sem isso, uma falha do módulo nativo
 * derrubaria a casa inteira por causa de uma faixa informativa.
 */
export function useOnline(): boolean {
  const [state, setState] = useState<NetworkState | null>(null);

  useEffect(() => {
    let alive = true;
    let subscription: { remove?: () => void } | undefined;
    try {
      getNetworkStateAsync()
        .then((next) => {
          if (alive) setState(next ?? null);
        })
        .catch(() => {});
      subscription = addNetworkStateListener((next) => {
        if (alive) setState(next ?? null);
      });
    } catch {
      // Módulo indisponível: fica o estado desconhecido (online).
    }
    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  return !isOffline(state);
}
