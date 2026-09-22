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

/**
 * "Outra meta" (feedback do fundador, 2026-09-22): a meta que a pessoa escreve
 * com as palavras dela. Não tem id — é texto livre em `profile.customGoal`, ao
 * lado das outras e com o mesmo cuidado: SÓ no aparelho, nunca em analytics nem
 * em servidor (a meta de alguém pode ser jejum, cura, um filho — dado sensível
 * pela LGPD art. 5º, II).
 *
 * 60 caracteres é o pedido do fundador: cabe uma frase curta e cabe na linha da
 * tela em fonte grande sem virar parágrafo.
 */
export const CUSTOM_GOAL_MAX = 60;

/** Rótulo da linha, igual na entrada e em Minhas metas. */
export const CUSTOM_GOAL_LABEL = 'Outra meta';

/** Dica do campo. Não é rótulo (o rótulo é `CUSTOM_GOAL_LABEL`, e placeholder some ao digitar). */
export const CUSTOM_GOAL_PLACEHOLDER = 'Escreva a sua meta';

/**
 * Mesma regra do nome do perfil: espaços das pontas e repetidos saem, vazio vira
 * null, corta no limite contando CARACTERES visíveis (`Array.from`, para não
 * partir emoji ao meio). Roda na tela e de novo na gravação.
 */
export function normalizeCustomGoal(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 0 ? Array.from(clean).slice(0, CUSTOM_GOAL_MAX).join('').trim() : null;
}

/**
 * Quantas metas a pessoa tem. "Outra meta" escrita CONTA: sem isto, quem só
 * escreveu a dela veria "Escolher" em Você e o cartão "Comece por aqui" nunca
 * fecharia, como se ela não tivesse escolhido nada.
 */
export function countGoals(goals: readonly GoalId[], customGoal: string | null): number {
  return goals.length + (customGoal !== null ? 1 : 0);
}

/** Tem alguma meta? (Uma meta própria já basta.) */
export function hasAnyGoal(goals: readonly GoalId[], customGoal: string | null): boolean {
  return countGoals(goals, customGoal) > 0;
}

export function isGoalId(value: unknown): value is GoalId {
  return typeof value === 'string' && (GOAL_IDS as readonly string[]).includes(value);
}

export function goalLabel(id: GoalId): string {
  return GOALS.find((goal) => goal.id === id)?.label ?? id;
}
