import type { Settings } from '@/settings/settingsStore';

/**
 * Interruptor "Avisar se eu ficar sem abrir" (feedback N2, 2026-09-22).
 *
 * Mora nas preferências (`settings.absenceReminder`), para ser apagado junto com
 * elas. `null` = a pessoa nunca mexeu: vale ligado. `true`/`false` = escolha
 * explícita. Ligado não quer dizer agendado: a sincronização de fundo não pede
 * permissão (sem permissão, nada sai) e só agenda com o lembrete diário
 * desligado, porque ele já avisa todo dia; dois avisos no mesmo dia seriam o
 * excesso que o N2 quer evitar. Ver `absenceScheduled`.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22): o campo ainda não está no tipo
 * `Settings`, que pertence a outra frente. A normalização das preferências
 * preserva campos que não conhece, então o valor já persiste; este arquivo é o
 * único lugar que o lê e escreve. Quando o campo entrar em `Settings`, só as
 * duas funções abaixo mudam.
 */
export type AbsencePreference = boolean | null;

export function absencePreference(settings: Settings): AbsencePreference {
  const value = (settings as Settings & { absenceReminder?: unknown }).absenceReminder;
  return typeof value === 'boolean' ? value : null;
}

/** Estado do interruptor: a escolha explícita; sem escolha, ligado. */
export function absenceEnabled(settings: Settings): boolean {
  return absencePreference(settings) ?? true;
}

/** O que de fato vai para o agendador: ligado E sem lembrete diário. */
export function absenceScheduled(absenceOn: boolean, dailyOn: boolean): boolean {
  return absenceOn && !dailyOn;
}

export function withAbsencePreference(settings: Settings, value: AbsencePreference): Settings {
  return { ...settings, absenceReminder: value } as Settings;
}
