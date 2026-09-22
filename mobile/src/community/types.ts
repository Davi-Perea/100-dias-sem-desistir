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

/** Foto de perfil: none = sem foto · in_review = só o dono vê · approved = todos veem · rejected = recusada (escolher outra). */
export type AvatarStatus = 'none' | 'in_review' | 'approved' | 'rejected';

/**
 * Perfil na comunidade (C4, 2026-09-22). Tudo opcional para ENTRAR; para
 * PUBLICAR o servidor exige nome, foto, ministério respondido e 16+ (CM007).
 */
export type CommunityProfile = {
  displayName: string | null;
  /** null com ministryAnswered = "Nenhum". */
  ministry: string | null;
  ministryAnswered: boolean;
  bio: string | null;
  avatarPath: string | null;
  avatarStatus: AvatarStatus;
  /** "Tenho 16 anos ou mais" (C1). */
  ageConfirmed: boolean;
  /** E-mail opcional (N3). Ninguém na comunidade vê. */
  contactEmail: string | null;
  /** Aceite separado de novidades, desmarcado por padrão. */
  newsOptIn: boolean;
};

export type CommunityStatus = {
  isMember: boolean;
  memberStatus: MemberStatus | null;
  displayName: string | null;
  profile: CommunityProfile;
  /** Nome, foto, ministério e 16+: o que publicar exige. */
  profileComplete: boolean;
  canPublish: boolean;
  needsPublishConsent: boolean;
  needsRules: boolean;
  /** Versão vigente do texto de consentimento ('PENDENTE' = ainda não aprovado). */
  publishConsentVersion: string;
  rulesVersion: string;
  isModerator: boolean;
  /** Ponto no sino (F8): há Amém ou comentário novo nos meus posts. */
  hasNewActivity?: boolean;
};

/**
 * Tipo da atividade do post (F1). O servidor tem também 'livre' (post sem tipo),
 * que o app lê como null.
 */
export type PostKind = 'leitura' | 'oracao' | 'jejum' | 'versiculo';
export const POST_KINDS: readonly PostKind[] = ['leitura', 'oracao', 'jejum', 'versiculo'];

/** Feed da igreja inteira ou do meu ministério; público do post (F6, sem seguidores). */
export type FeedScope = 'igreja' | 'ministerio';

/**
 * Versículo anexado ao post: SÓ a referência (código USFM do livro, como em
 * src/bible/books.ts). O texto bíblico nunca vai ao servidor.
 */
export type VerseAttachment = { book: string; chapter: number; verseStart: number; verseEnd: number | null };

/** Rostinho de quem disse Amém (F3). Nunca carrega id de pessoa. */
export type AmenFace = { name: string; avatarPath: string | null; isMine?: boolean };

/** Até 4 fotos por post (F1). Igual ao check de community_post_photos.sort_order. */
export const MAX_POST_PHOTOS = 4;
/** Até 3 rostinhos por post (F3). Igual ao limit de private.amen_faces_for. */
export const MAX_AMEN_FACES = 3;

/**
 * Campos do diário compartilhado, comuns ao feed e a "Minhas publicações".
 * createCommunityApi e a demonstração SEMPRE preenchem todos (o Required abaixo
 * é o que elas devolvem); em FeedPost/MyPost eles são opcionais só para as telas
 * continuarem aceitando objetos montados à mão (testes, cliente antigo).
 */
export type DiaryFields = {
  /** null = post sem tipo ('livre' no servidor). */
  kind: PostKind | null;
  verse: VerseAttachment | null;
  /** Até 4 fotos, na ordem do carrossel. photoPath continua sendo a primeira. */
  photoPaths: string[];
  audience: FeedScope;
  /** Nome do ministério quando audience = 'ministerio'. */
  audienceMinistry: string | null;
  /** Quantas pessoas disseram Amém (sem quem tem bloqueio comigo). */
  amenCount: number;
  /** Até 3: o meu primeiro, depois os mais recentes. */
  amenFaces: AmenFace[];
  commentCount: number;
};

export type FeedPost = Partial<DiaryFields> & {
  postId: string;
  body: string | null;
  photoPath: string | null;
  dayNumber: number | null;
  publishedAt: string;
  authorName: string;
  /** Ministério do autor (null = "Nenhum" ou não respondeu): aparece "Nome · Ministério X". */
  authorMinistry: string | null;
  /** Foto de perfil aprovada (a própria aparece sempre). */
  authorAvatarPath: string | null;
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

export type MyPost = Partial<DiaryFields> & {
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

/** Atividade dentro do app (F8): Amém e comentário de OUTRAS pessoas nos meus posts. Sem push. */
export type ActivityItem = {
  activityId: string;
  kind: 'amen' | 'comment';
  postId: string;
  /** Quem ainda não escolheu nome aparece como "Alguém da comunidade". */
  actorName: string;
  /** Foto de perfil aprovada, ou null (iniciais). */
  actorAvatarPath: string | null;
  at: string;
  /** Começo do comentário (só em 'comment'). */
  preview: string | null;
  unread: boolean;
};

/** Entrada de createPost (F1, F5, F6). */
export type NewPost = {
  body?: string | null;
  /** Compatível com a versão de uma foto só. */
  photoPath?: string | null;
  /** Até 4 caminhos devolvidos por uploadPhoto, na ordem do carrossel. */
  photoPaths?: string[] | null;
  day?: number | null;
  kind?: PostKind | null;
  verse?: VerseAttachment | null;
  audience?: FeedScope;
};
