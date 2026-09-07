/** Milestones da jornada (spec §10). Sem streak, sem XP, sem ranking. */
export const MILESTONE_DAYS = [7, 25, 50, 75, 100] as const;

export type Milestone = { day: number; label: string; celebration: string };

export const MILESTONES: Milestone[] = [
  { day: 7, label: 'Primeira semana', celebration: 'Uma semana caminhando. O começo é a parte mais difícil.' },
  { day: 25, label: 'Um quarto da jornada', celebration: 'Vinte e cinco dias. Você já construiu um ritmo.' },
  { day: 50, label: 'Metade do caminho', celebration: 'Metade da jornada. Continue no mesmo passo.' },
  { day: 75, label: 'Reta final', celebration: 'Setenta e cinco dias. A reta final começou.' },
  { day: 100, label: 'Jornada completa', celebration: 'Cem dias. Você atravessou a jornada inteira.' },
];

export function milestoneForDay(dayNumber: number): Milestone | null {
  return MILESTONES.find((m) => m.day === dayNumber) ?? null;
}

export function nextMilestoneAfter(completedCount: number): Milestone | null {
  return MILESTONES.find((m) => m.day > completedCount) ?? null;
}

/** Milestones alcançados por contagem de dias concluídos (não por dia oficial). */
export function reachedMilestones(completedCount: number): Milestone[] {
  return MILESTONES.filter((m) => completedCount >= m.day);
}
