import { validateReference } from '@/bible/references';

import { TOTAL_DAYS, type JourneyDataset } from './types';

/**
 * Validação determinística do dataset da Jornada (spec §29, §32, HANDOFF/Validation).
 * Roda tanto sobre fixtures DEV quanto sobre o dataset oficial autorizado.
 */
export type ValidationIssue = { severity: 'error' | 'warning'; code: string; message: string };
export type ValidationResult = { valid: boolean; issues: ValidationIssue[] };

const err = (code: string, message: string): ValidationIssue => ({ severity: 'error', code, message });
const warn = (code: string, message: string): ValidationIssue => ({ severity: 'warning', code, message });

export function validateDataset(dataset: JourneyDataset): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { campaign, days, provenance } = dataset;

  // --- campanha ---
  if (!campaign.id) issues.push(err('campaign.id', 'campaign.id ausente.'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campaign.start_date)) {
    issues.push(err('campaign.start_date', `start_date deve ser YYYY-MM-DD, recebido "${campaign.start_date}".`));
  }
  if (!campaign.timezone) issues.push(err('campaign.timezone', 'timezone ausente.'));
  if (!Number.isInteger(campaign.utc_offset_minutes)) {
    issues.push(err('campaign.utc_offset_minutes', 'utc_offset_minutes deve ser inteiro.'));
  }
  if (campaign.total_days !== TOTAL_DAYS) {
    issues.push(err('campaign.total_days', `total_days deve ser ${TOTAL_DAYS}, recebido ${campaign.total_days}.`));
  }

  // --- dias: exatamente 100, 1..100, sem duplicatas ---
  if (days.length !== TOTAL_DAYS) {
    issues.push(err('days.count', `Dataset deve ter exatamente ${TOTAL_DAYS} dias, recebido ${days.length}.`));
  }
  const seen = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.day_number) || day.day_number < 1 || day.day_number > TOTAL_DAYS) {
      issues.push(err('day.number', `day_number fora de 1..${TOTAL_DAYS}: ${day.day_number}.`));
      continue;
    }
    if (seen.has(day.day_number)) {
      issues.push(err('day.duplicate', `day_number duplicado: ${day.day_number}.`));
    }
    seen.add(day.day_number);

    if (day.campaign_id !== campaign.id) {
      issues.push(err('day.campaign_id', `Dia ${day.day_number} aponta para outra campanha.`));
    }
    if (day.publish_status !== 'published' && day.publish_status !== 'draft') {
      issues.push(err('day.publish_status', `Dia ${day.day_number}: publish_status inválido.`));
    }

    // --- leituras ---
    if (!Array.isArray(day.readings) || day.readings.length === 0) {
      issues.push(err('day.readings', `Dia ${day.day_number} não tem leituras.`));
    } else {
      const orders = day.readings.map((r) => r.sort_order);
      if (new Set(orders).size !== orders.length) {
        issues.push(err('reading.sort_order', `Dia ${day.day_number}: sort_order duplicado.`));
      }
      for (const reading of day.readings) {
        const problem = validateReference(reading.canonical_reference);
        if (problem) issues.push(err('reading.reference', `Dia ${day.day_number}: ${problem}`));
      }
    }

    if (day.key_verse_reference) {
      const problem = validateReference(day.key_verse_reference);
      if (problem) issues.push(err('day.key_verse', `Dia ${day.day_number} (versículo-chave): ${problem}`));
    }

    // Campos editoriais podem ser nulos conforme autorização parcial (spec §21, §29).
    if (!day.title) issues.push(warn('day.title', `Dia ${day.day_number} sem título.`));
  }

  for (let n = 1; n <= TOTAL_DAYS; n++) {
    if (!seen.has(n)) issues.push(err('day.missing', `Dia ${n} ausente.`));
  }

  // --- proveniência e direitos ---
  if (!provenance.source_name) issues.push(err('provenance.source_name', 'source_name ausente.'));
  if (!provenance.content_version) issues.push(err('provenance.content_version', 'content_version ausente.'));
  if (!provenance.rights_status) issues.push(err('provenance.rights_status', 'rights_status ausente.'));
  if (provenance.rights_status === 'authorized' && !provenance.rights_reference) {
    issues.push(err('provenance.rights_reference', 'Dataset autorizado exige rights_reference (documentação da autorização).'));
  }
  if (provenance.source_type === 'external_plan' && !provenance.source_external_id) {
    issues.push(warn('provenance.source_external_id', 'Plano externo sem source_external_id.'));
  }
  if (dataset.DEV_ONLY && provenance.rights_status !== 'dev_fixture') {
    issues.push(err('provenance.dev_mismatch', 'Fixture DEV deve ter rights_status = "dev_fixture".'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

/** Portão de produção: só passa dataset autorizado e sem marcação DEV. */
export function assertProductionReady(dataset: JourneyDataset): ValidationResult {
  const result = validateDataset(dataset);
  const issues = [...result.issues];
  if (dataset.DEV_ONLY || dataset.NOT_PRODUCTION_CONTENT) {
    issues.push(err('production.dev_fixture', 'Fixture DEV não pode ir para produção (Launch Gate 2).'));
  }
  if (dataset.provenance.rights_status !== 'authorized') {
    issues.push(
      err('production.rights', `rights_status é "${dataset.provenance.rights_status}"; produção exige "authorized".`),
    );
  }
  if (dataset.days.some((d) => d.publish_status !== 'published')) {
    issues.push(err('production.publish_status', 'Todos os dias devem estar "published" em produção.'));
  }
  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}
