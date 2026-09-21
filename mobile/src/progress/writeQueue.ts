/**
 * Fila de gravação de uma store local (PER-02).
 *
 * As stores gravam no disco ANTES de atualizar o cache em memória: se o
 * AsyncStorage falhar, o cache continua igual ao disco e o erro sobe para a tela
 * (que deve avisar "não foi possível salvar"). Sem a fila, duas gravações
 * seguidas leriam o mesmo estado de partida durante o `await` do disco e a
 * segunda apagaria a primeira; com ela, cada gravação parte do resultado da
 * anterior. Uma gravação que falha não trava as seguintes.
 */
export function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
