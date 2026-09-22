import { useSyncExternalStore } from 'react';

/**
 * J5 · a tela "Dia N concluído" (/concluido/[day]) vem ANTES do marco.
 *
 * O marco (useMilestoneTrigger) dispara assim que a contagem alcança um marco
 * com uma aba em primeiro plano. Concluir pelo painel de hoje acontece COM a aba
 * em primeiro plano: sem esta trava, o marco podia abrir no mesmo instante e a
 * tela de conclusão empilhar por cima dele (e o "Continuar" cairia no marco, ou
 * o fecharia sem ele ser visto).
 *
 * Quem vai concluir segura a trava antes de gravar; a tela de conclusão solta ao
 * sair (pelo "Continuar" ou pelo voltar do sistema). Uma falha de gravação
 * também solta. Estado só de memória: nada é gravado.
 */
let holding = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function holdMilestones() {
  if (holding) return;
  holding = true;
  emit();
}

export function releaseMilestones() {
  if (!holding) return;
  holding = false;
  emit();
}

export function isHoldingMilestones(): boolean {
  return holding;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Verdadeiro enquanto a tela de conclusão está (ou está para ficar) na frente. */
export function useMilestonesHeld(): boolean {
  return useSyncExternalStore(subscribe, isHoldingMilestones, isHoldingMilestones);
}
