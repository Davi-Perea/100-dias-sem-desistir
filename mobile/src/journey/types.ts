/**
 * Contrato do dataset da Jornada (MASTER PRODUCT SPEC v1.1 §17, §21).
 * As fixtures DEV e o dataset oficial autorizado usam EXATAMENTE este shape,
 * para que a troca não exija refatorar Hoje, Jornada, progresso ou Reader.
 */

export const TOTAL_DAYS = 100;

/** Status de direitos do dataset. Produção só aceita 'authorized'. */
export type RightsStatus = 'dev_fixture' | 'pending_authorization' | 'partially_authorized' | 'authorized';

export type DatasetProvenance = {
  /** 'dev_fixture' enquanto não houver autorização; 'external_plan' para o dataset licenciado. */
  source_type: 'dev_fixture' | 'external_plan' | 'original_church_content';
  source_name: string;
  source_external_id: string | null;
  source_provider: string | null;
  rights_status: RightsStatus;
  /** Referência à documentação da autorização (contrato, e-mail, protocolo). */
  rights_reference: string | null;
  content_version: string;
};

export type DayReading = {
  sort_order: number;
  /** Referência canônica portável, ex.: "GEN 1-3". Independente de tradução. */
  canonical_reference: string;
};

export type JourneyDay = {
  campaign_id: string;
  day_number: number;
  title: string | null;
  theme: string | null;
  key_verse_reference: string | null;
  official_direction: string | null;
  prayer_focus: string | null;
  milestone: string | null;
  next_day_teaser: string | null;
  publish_status: 'draft' | 'published';
  readings: DayReading[];
};

export type Campaign = {
  id: string;
  title: string;
  /** Data local de início no fuso da campanha, "YYYY-MM-DD". */
  start_date: string;
  timezone: string;
  /**
   * Offset fixo do fuso da campanha em minutos. America/Sao_Paulo = -180 (o Brasil
   * não observa horário de verão desde 2019), o que torna o Dia oficial determinístico
   * sem depender de base de fusos no dispositivo.
   */
  utc_offset_minutes: number;
  total_days: number;
  status: 'draft' | 'active' | 'archived';
};

export type JourneyDataset = {
  campaign: Campaign;
  days: JourneyDay[];
  provenance: DatasetProvenance;
  /** Verdadeiro apenas para fixtures de desenvolvimento. Bloqueia produção. */
  DEV_ONLY: boolean;
  NOT_PRODUCTION_CONTENT: boolean;
};

export function isDevDataset(dataset: JourneyDataset): boolean {
  return dataset.DEV_ONLY || dataset.provenance.rights_status !== 'authorized';
}
