/**
 * Tipos da Comunidade (V2), espelhando as RPCs de
 * supabase/migrations/20260921130100_comunidade_funcoes.sql.
 *
 * O app nunca recebe o user_id de outra pessoa: bloquear e denunciar partem do id
 * do post ou do comentário. E nunca recebe contagem de Amém: só se ELE deu Amém.
 */

/** in_review = em análise · published = publicado · not_published = não publicado · removed = tirado do ar. */
export type ContentStatus = 'in_review' | 'published' | 'not_published' | 'removed';

/** Por que está em análise. */
export type HoldReason = 'foto' | 'termo' | 'link' | 'contato' | 'denuncia';

export type MemberStatus = 'active' | 'suspended' | 'removed';

export type ReportReason =
  | 'ofensivo'
  | 'assedio'
  | 'spam'
  | 'rosto_de_terceiro'
  | 'crianca_exposta'
  | 'dado_pessoal'
  | 'falso_ou_enganoso'
  | 'risco_a_vida'
  | 'outro';

export const REPORT_REASONS: readonly ReportReason[] = [
  'ofensivo',
  'assedio',
  'spam',
  'rosto_de_terceiro',
  'crianca_exposta',
  'dado_pessoal',
  'falso_ou_enganoso',
  'risco_a_vida',
  'outro',
];

export type TermsPurpose = 'community_publish' | 'community_rules';

export type CommunityStatus = {
  isMember: boolean;
  memberStatus: MemberStatus | null;
  displayName: string | null;
  canPublish: boolean;
  needsPublishConsent: boolean;
  needsRules: boolean;
  /** Versão vigente do texto de consentimento ('PENDENTE' = ainda não aprovado). */
  publishConsentVersion: string;
  rulesVersion: string;
  isModerator: boolean;
};

export type FeedPost = {
  postId: string;
  body: string | null;
  photoPath: string | null;
  dayNumber: number | null;
  publishedAt: string;
  authorName: string;
  isMine: boolean;
  iSaidAmen: boolean;
};

export type FeedCursor = { beforePublishedAt: string; beforePost: string };

export type FeedPage = {
  posts: FeedPost[];
  /** null quando acabou: o feed tem fim (sem rolagem infinita). */
  nextCursor: FeedCursor | null;
  ended: boolean;
};

export type PostComment = {
  commentId: string;
  body: string;
  status: ContentStatus;
  createdAt: string;
  authorName: string;
  isMine: boolean;
};

export type MyPost = {
  postId: string;
  body: string | null;
  photoPath: string | null;
  dayNumber: number | null;
  status: ContentStatus;
  holdReason: HoldReason | null;
  createdAt: string;
  publishedAt: string | null;
  /** Quem decidiu: pessoa ou filtro automático (nunca QUAL pessoa). */
  decidedBy: 'pessoa' | 'automatico' | null;
  reason: ReportReason | null;
  noteForAuthor: string | null;
};

export type MyBlock = { blockId: string; displayName: string; createdAt: string };

export type PublishResult = { id: string; status: ContentStatus };

export type ReportTarget = { postId: string; commentId?: undefined } | { commentId: string; postId?: undefined };
