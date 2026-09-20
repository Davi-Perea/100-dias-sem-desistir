import type { Sphere } from './spheres';

/**
 * Contrato do dataset da Jornada (MASTER PRODUCT SPEC v1.1 §17, §21).
 * As fixtures DEV e o dataset oficial usam EXATAMENTE este shape, para que a
 * troca de conteúdo seja uma troca de DADOS, nunca de arquitetura.
 *
 * Desde 2026-09-19 a fonte canônica é o material próprio da igreja
 * ("100 Dias — Guia Diário de Intercessão"), convertido por
 * `scripts/convert-100-dias.mjs` a partir dos arquivos em `content/source/`.
 */

export const TOTAL_DAYS = 100;

/** Status de direitos do dataset. Produção só aceita 'authorized'. */
export type RightsStatus = 'dev_fixture' | 'pending_authorization' | 'partially_authorized' | 'authorized';

export type SourceFile = { file: string; sha256: string };

export type DatasetProvenance = {
  /** 'dev_fixture' para fixtures; 'original_church_content' para o guia da igreja; 'external_plan' para plano licenciado de terceiro. */
  source_type: 'dev_fixture' | 'external_plan' | 'original_church_content';
  source_name: string;
  source_external_id: string | null;
  source_provider: string | null;
  rights_status: RightsStatus;
  /** Referência à documentação da autorização (contrato, e-mail, protocolo). */
  rights_reference: string | null;
  content_version: string;
  /**
   * A escala traz nomes de pessoas. Eles só aparecem na interface quando a
   * igreja autorizar explicitamente; até lá a UI mostra só o ministério.
   */
  leader_names_authorized?: boolean;
  /** Arquivos-fonte e seus hashes, para rastrear de qual revisão o dataset saiu. */
  source_files?: SourceFile[];
  generated_by?: string;
};

export type DayReading = {
  sort_order: number;
  /** Referência canônica portável, ex.: "GEN 1-3". Independente de tradução. */
  canonical_reference: string;
};

/** Quem conduz o altar presencial das 12h30 naquele dia (vem da escala). */
export type DayAltar = {
  ministry: string;
  /** Rótulo como está na escala ("Prs. Leandra e Daniel"). Exibição depende de autorização. */
  leaders_label: string | null;
};

export type JourneyDay = {
  campaign_id: string;
  day_number: number;
  /** No guia da igreja: a "Ênfase" do dia ("Sabedoria para governar"). */
  title: string | null;
  theme: string | null;
  /**
   * Palavra do tema que recebe o realce amarelo no Início (tela 02 do handoff).
   * Vem do DADO, não de heurística: escolher a ênfase por algoritmo seria o app
   * inventando destaque editorial. Ausente => o tema aparece sem realce.
   */
  theme_highlight?: string | null;
  /** Área de influência ("monte") pela qual a igreja intercede neste dia. */
  sphere: Sphere | null;
  key_verse_reference: string | null;
  official_direction: string | null;
  /** Motivos de oração como a igreja escreveu, em uma linha. */
  prayer_focus: string | null;
  /** Os mesmos motivos, um por item, para listas e para o modo altar. */
  prayer_points: string[];
  altar: DayAltar | null;
  milestone: string | null;
  next_day_teaser: string | null;
  publish_status: 'draft' | 'published';
  readings: DayReading[];
};

export type Campaign = {
  id: string;
  title: string;
  /** Linha de apoio do material ("Palavra • Consagração • Adoração • Intercessão"). */
  subtitle?: string | null;
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
