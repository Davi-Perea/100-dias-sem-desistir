import { isCloudConfigured } from '@/cloud/config';

/**
 * Progresso coletivo da igreja e do grupo.
 *
 * O handoff mostra números concretos ("1.812 pessoas já leram hoje", "64% da
 * igreja"). Esses números dependem de uma agregação no servidor que ainda não
 * existe: a Execution 02 construiu identidade, grupos e papéis, e feed, insights
 * e progresso coletivo ficaram explicitamente fora de escopo.
 *
 * Enquanto a fonte não existir, este módulo devolve `null`. As telas mantêm o
 * layout do handoff e dizem que o dado ainda não está disponível. Preencher com
 * o número do mock seria mostrar dado inventado como se fosse real.
 *
 * Quando a agregação existir, só este arquivo muda.
 */
export type CollectiveProgress = {
  /** Quantas pessoas já concluíram a leitura de hoje. */
  readersToday: number;
  /** Total de participantes considerados. */
  total: number;
  /** 0 a 1. */
  ratio: number;
  /** Momento da agregação. */
  updatedAt: string;
};

export type CollectiveState =
  | { status: 'available'; data: CollectiveProgress }
  /** Não há conta/nuvem configurada: o app segue inteiro em modo local. */
  | { status: 'offline' }
  /** A agregação coletiva ainda não foi construída no servidor. */
  | { status: 'unavailable' };

export function getChurchProgress(): CollectiveState {
  if (!isCloudConfigured()) return { status: 'offline' };
  return { status: 'unavailable' };
}

export function getGroupProgress(_groupId: string): CollectiveState {
  if (!isCloudConfigured()) return { status: 'offline' };
  return { status: 'unavailable' };
}

/** Frase curta para as linhas que mostrariam o número coletivo. */
export function collectiveNotice(state: CollectiveState): string | null {
  if (state.status === 'available') return null;
  if (state.status === 'offline') {
    return 'O progresso da igreja aparece quando sua conta estiver conectada.';
  }
  return 'O progresso da igreja ainda não está disponível nesta versão.';
}
