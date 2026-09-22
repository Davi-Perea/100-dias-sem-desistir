/**
 * Metas da pessoa para os 100 dias (feedback E4/V1, 2026-09-22).
 *
 * São escolhidas na entrada e editadas em Você. Ficam SÓ no aparelho, dentro de
 * `settings.profile.goals`: "jejuar" e "orar todo dia" são prática religiosa,
 * dado sensível pela LGPD art. 5º, II. Nunca entram em analytics nem em servidor.
 *
 * Os ids são contrato entre telas e com o que já foi gravado no aparelho: um id
 * novo pode entrar, mas um id existente não muda de nome (a normalização descarta
 * o que não reconhece, e a meta sumiria em silêncio).
 */

export type GoalId =
  | 'biblia-inteira'
  | 'orar-todo-dia'
  | 'jejuar'
  | 'nao-desistir'
  | 'ler-em-familia'
  | 'conhecer-mais';

export type Goal = { id: GoalId; label: string };

/** Na ordem em que aparecem na tela. */
export const GOALS: readonly Goal[] = [
  { id: 'biblia-inteira', label: 'Ler a Bíblia inteira' },
  { id: 'orar-todo-dia', label: 'Orar todos os dias' },
  { id: 'jejuar', label: 'Participar do jejum' },
  { id: 'nao-desistir', label: 'Não desistir no meio do caminho' },
  { id: 'ler-em-familia', label: 'Ler junto com a minha família' },
  { id: 'conhecer-mais', label: 'Conhecer mais a Deus' },
];

export const GOAL_IDS: readonly GoalId[] = GOALS.map((goal) => goal.id);

export function isGoalId(value: unknown): value is GoalId {
  return typeof value === 'string' && (GOAL_IDS as readonly string[]).includes(value);
}

export function goalLabel(id: GoalId): string {
  return GOALS.find((goal) => goal.id === id)?.label ?? id;
}
