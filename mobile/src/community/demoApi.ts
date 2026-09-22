import { isCloudConfigured } from '@/cloud/config';
import { COMMUNITY_ENABLED } from '@/config/features';
import { isDevBuild } from '@/journey/devBuild';

import type { CommunityApi } from './api';
import { communityError } from './errors';
import { assertPhotoSafeToUpload } from './photos';
import { EMPTY_PROFILE, isProfileComplete, isValidContactEmail, profileArgs, type ProfileUpdate } from './profile';
import type {
  ActivityItem,
  AmenFace,
  AvatarStatus,
  CommunityProfile,
  CommunityStatus,
  ContentStatus,
  DiaryFields,
  FeedCursor,
  FeedPage,
  FeedPost,
  FeedScope,
  HoldReason,
  MyBlock,
  MyPost,
  NewPost,
  PostComment,
  PostKind,
  PublishResult,
  ReportReason,
  ReportTarget,
  TermsPurpose,
  VerseAttachment,
} from './types';
import { MAX_AMEN_FACES, REPORT_REASONS } from './types';
import {
  charLength,
  cleanText,
  isUuid,
  isValidCommentBody,
  isValidDisplayName,
  LIMITS,
  normalizeNewPost,
} from './validation';

/**
 * Comunidade de DEMONSTRAÇÃO, inteira em memória (pedido do fundador,
 * 2026-09-21: "ver a versão final, como se já estivéssemos usando").
 *
 * Só liga com TODAS as condições:
 *   - build de desenvolvimento (`__DEV__`); em release nunca, com qualquer env;
 *   - `EXPO_PUBLIC_DEMO_MODE=true` e `EXPO_PUBLIC_COMMUNITY_ENABLED=true`;
 *   - nuvem NÃO configurada (com Supabase, o app fala com o servidor de verdade).
 *
 * Nada sai do aparelho e nada é gravado: fechar o app zera tudo.
 *
 * TUDO AQUI É FICTÍCIO (marcação no código, não na tela). Pedido do fundador,
 * 2026-09-23 (madrugada): ver "como seria se um desconhecido instalasse no dia
 * 23", sem cara de demonstração. Por isso, desde então:
 *   - os nomes de exemplo são primeiros nomes comuns, INVENTADOS, sem sobrenome
 *     e nunca de pessoas da igreja; não levam mais o sufixo "(exemplo)";
 *   - o selo "Demonstração · nada é enviado" e os avisos de rascunho (PENDENTE)
 *     das telas de aceite não aparecem mais (`DEMO_LABELS_ON_SCREEN = false`);
 *     as constantes continuam aqui para o código e os testes saberem o que é;
 *   - os textos de exemplo foram escritos para a demonstração: sem citação
 *     bíblica (só referência), sem texto da igreja, sem foto.
 * Continua valendo: só em `__DEV__` + EXPO_PUBLIC_DEMO_MODE, nunca em release.
 *
 * Implementa a MESMA interface de `createCommunityApi` (tipo `CommunityApi`),
 * então as telas não sabem a diferença, a não ser onde perguntam
 * `isDemoCommunityApi` (aceite do rascunho PENDENTE).
 *
 * Desde 2026-09-22 (C2) não há passo de e-mail: a entrada é direta, como a
 * conta ligada ao aparelho do app real. A foto de perfil fica só na memória
 * (o arquivo preparado no aparelho), em análise, como no real.
 *
 * Diário compartilhado (2026-09-22, F1, F3, F5, F8): as publicações de
 * exemplo têm tipos variados (leitura, oração, jejum, versículo — só a
 * REFERÊNCIA, nunca o texto bíblico — e livre) e números de Amém FICTÍCIOS
 * (DEMO_AMEN_NOTE) com rostinhos só dos nomes de exemplo. Desde 2026-09-22 não
 * há público por ministério: TODA publicação vai para a igreja inteira. Fotos
 * de post aparecem na hora, como com o filtro automático configurado (F5,
 * simulado: nada sai do aparelho). Ao publicar, "Marina" (exemplo) diz Amém e o
 * sino (F8) acende.
 *
 * Conteúdo por dia: no Dia 1 (23/09, EXPO_PUBLIC_DEMO_DAY=1) o feed é o da
 * primeira manhã da campanha — poucas publicações, sobre começar Gênesis, orar e
 * a expectativa; nenhuma da própria pessoa. Em outros dias, um feed "em
 * andamento".
 */

/** Caminho fictício da foto de perfil na demonstração (o arquivo fica no aparelho). */
export const DEMO_AVATAR_PATH = 'demo-foto-de-perfil.jpg';

/**
 * As etiquetas de demonstração NÃO aparecem na tela (pedido do fundador,
 * 2026-09-23: "não quero nem coisa de demonstração"). As telas que ainda as
 * mostram devem perguntar isto antes. O modo continua marcado no código.
 */
export const DEMO_LABELS_ON_SCREEN = false;
/** Só código/testes (DEMO_LABELS_ON_SCREEN = false). */
export const DEMO_BADGE = 'Demonstração · nada é enviado';
/** Só código/testes: o texto das regras e do consentimento é rascunho (PENDENTE). */
export const DEMO_TERMS_NOTICE =
  'Rascunho em revisão (PENDENTE). No app de verdade este texto ainda não pode ser aceito; na demonstração, dá para seguir.';

/** Só código/testes: os números de Amém dos exemplos são fictícios. */
export const DEMO_AMEN_NOTE = 'Números de Amém de demonstração';

/** Nome de quem diz Amém na publicação nova da pessoa (F8). Fictício. */
export const DEMO_FIRST_AMEN_NAME = 'Marina';

const DEMO_DAY_DEFAULT = 3;

/** Liga a demonstração? Lido a cada chamada, para os testes trocarem __DEV__ e o ambiente. */
export function isCommunityDemo(): boolean {
  if (!isDevBuild()) return false;
  // O Metro só embute `process.env.EXPO_PUBLIC_*` escrito por extenso.
  if (process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') return false;
  if (!COMMUNITY_ENABLED) return false;
  return !isCloudConfigured();
}

function demoDay(): number {
  const raw = process.env.EXPO_PUBLIC_DEMO_DAY;
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : DEMO_DAY_DEFAULT;
}

/* ------------------------------------------------------------------ sessão */

/** Sessão da demonstração: conta ligada ao aparelho, sem e-mail (C2). */
export type DemoSession = { userId: string };

let session: DemoSession | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeDemoSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoSession(): DemoSession | null {
  return session;
}

/** Entrar sem e-mail (C2): na demonstração, direto. */
export function demoSignIn(): void {
  if (!isCommunityDemo()) return;
  if (!session) session = { userId: ME };
  emit();
}

export function demoSignOut(): void {
  if (!session) return;
  session = null;
  emit();
}

/* ------------------------------------------------------------------ dados */

const ME = 'd0000000-0000-4000-8000-000000000001';

type Author = { key: string; name: string; ministry?: string | null };
type DemoPost = {
  postId: string;
  author: Author;
  body: string | null;
  /** Fotos (só na memória, como data URI), na ordem do carrossel. */
  photoPaths: string[];
  dayNumber: number | null;
  kind: PostKind | null;
  verse: VerseAttachment | null;
  audience: FeedScope;
  /** Com audience 'ministerio': null = "o ministério de quem está vendo" (exemplo). */
  audienceMinistry: string | null;
  createdAt: string;
  publishedAt: string | null;
  status: ContentStatus;
  holdReason: HoldReason | null;
  amen: boolean;
  /** Amém de outras pessoas (demonstração): o número e os rostinhos. */
  otherAmens: number;
  otherFaces: AmenFace[];
};
type DemoActivity = { activityId: string; postId: string; kind: 'amen' | 'comment'; actorName: string; at: string; preview: string | null; unread: boolean };
type DemoComment = {
  commentId: string;
  postId: string;
  author: Author;
  body: string;
  createdAt: string;
  status: ContentStatus;
  /** Meu Amém neste comentário. */
  amen: boolean;
  /** Amém de outras pessoas (exemplo): só o número. */
  otherAmens: number;
};
type DemoBlock = { blockId: string; authorKey: string; displayName: string; createdAt: string };

type State = {
  member: boolean;
  profile: CommunityProfile;
  /** URI local da foto de perfil preparada (nada é enviado). */
  avatarUri: string | null;
  rulesAccepted: boolean;
  consentAccepted: boolean;
  posts: DemoPost[];
  comments: DemoComment[];
  blocks: DemoBlock[];
  activity: DemoActivity[];
  reports: number;
  nextId: number;
  /** Relógio da demonstração: o "agora" do seed mais o tempo real passado desde então. */
  seededAt: number;
  realAtSeed: number;
  lastStamp: number;
};

let state: State | null = null;

function uuid(n: number): string {
  return `d0000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

function newId(s: State): string {
  s.nextId += 1;
  return uuid(s.nextId);
}

/** Momento de algo novo: sempre depois de tudo o que já existe. */
function stamp(s: State): string {
  const t = Math.max(s.seededAt + (Date.now() - s.realAtSeed), s.lastStamp + 1);
  s.lastStamp = t;
  return new Date(t).toISOString();
}

function minutesAgo(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

type SeedContent = { posts: DemoPost[]; comments: DemoComment[] };

/** Pessoas de exemplo: primeiros nomes comuns, INVENTADOS, sem sobrenome; nunca da igreja. */
const PEOPLE = {
  marina: { key: 'marina', name: 'Marina' },
  tiago: { key: 'tiago', name: 'Tiago' },
  leticia: { key: 'leticia', name: 'Letícia' },
  felipe: { key: 'felipe', name: 'Felipe' },
  bruna: { key: 'bruna', name: 'Bruna' },
  rodrigo: { key: 'rodrigo', name: 'Rodrigo' },
  camila: { key: 'camila', name: 'Camila' },
} satisfies Record<string, Author>;

type Person = keyof typeof PEOPLE;

function seedHelpers(now: number) {
  const face = (who: Person): AmenFace => ({ name: PEOPLE[who].name, avatarPath: null, isMine: false });
  const post = (
    n: number,
    who: Person,
    body: string,
    dayNumber: number | null,
    minutes: number,
    extra: Partial<DemoPost> = {},
  ): DemoPost => ({
    postId: uuid(n),
    author: PEOPLE[who],
    body,
    photoPaths: [],
    dayNumber,
    kind: null,
    verse: null,
    audience: 'igreja',
    audienceMinistry: null,
    createdAt: minutesAgo(now, minutes),
    publishedAt: minutesAgo(now, minutes),
    status: 'published',
    holdReason: null,
    amen: false,
    otherAmens: 0,
    otherFaces: [],
    ...extra,
  });
  const comment = (n: number, postN: number, who: Person, body: string, minutes: number): DemoComment => ({
    commentId: uuid(n),
    postId: uuid(postN),
    author: PEOPLE[who],
    body,
    createdAt: minutesAgo(now, minutes),
    status: 'published',
    // Amém de outras pessoas no comentário (exemplo): 1 a 3, fixo por comentário.
    amen: false,
    otherAmens: (n % 3) + 1,
  });
  return { face, post, comment };
}

/**
 * Dia 1 (23/09, primeira manhã da campanha): poucas publicações, de agora há
 * pouco, sobre começar a leitura (Gênesis), orar e a expectativa. Escritas para
 * a demonstração: sem citação bíblica (o versículo é só REFERÊNCIA, o app mostra
 * a tradução aberta), sem texto da igreja. Uma ainda sem Amém. Nenhuma da
 * própria pessoa.
 */
function dayOneContent(now: number): SeedContent {
  const { face, post, comment } = seedHelpers(now);
  const posts: DemoPost[] = [
    post(
      101,
      'marina',
      'Primeiro dia! Acordei um pouco mais cedo, passei um café e comecei Gênesis. Que bom começar junto com tanta gente.',
      1,
      9,
      { kind: 'leitura', otherAmens: 14, otherFaces: [face('tiago'), face('bruna'), face('felipe')] },
    ),
    post(
      102,
      'tiago',
      'Antes de abrir a leitura, orei pela nossa igreja e pelas famílias que começam hoje. Quem quiser, ore comigo.',
      1,
      26,
      { kind: 'oracao', otherAmens: 21, otherFaces: [face('leticia'), face('marina'), face('rodrigo')] },
    ),
    // Versículo: só a REFERÊNCIA (Gênesis 1:1). O texto é o da tradução aberta do aparelho.
    post(
      103,
      'leticia',
      'Reler o começo de tudo logo no primeiro dia teve um peso diferente. Quero começar estes 100 dias com Deus.',
      1,
      47,
      {
        kind: 'versiculo',
        verse: { book: 'GEN', chapter: 1, verseStart: 1, verseEnd: null },
        otherAmens: 8,
        otherFaces: [face('camila'), face('tiago')],
      },
    ),
    post(
      104,
      'felipe',
      'Nunca li a Bíblia inteira. Desta vez vou com calma, um dia de cada vez. Se eu atrasar, volto e continuo.',
      1,
      68,
      { otherAmens: 11, otherFaces: [face('marina'), face('bruna'), face('camila')] },
    ),
    post(
      105,
      'rodrigo',
      'Separei um caderno só para anotar os pedidos de oração destes 100 dias. Quero ver como ele vai estar em dezembro.',
      1,
      94,
      { kind: 'oracao' },
    ),
    // Desde 2026-09-22 não há público por ministério: tudo vai para a igreja inteira.
    post(107, 'camila', 'Hoje à noite vamos orar juntos, cada um da sua casa, às 21h. Quem quiser, entra.', 1, 35, {
      kind: 'oracao',
      otherAmens: 5,
      otherFaces: [face('rodrigo'), face('felipe')],
    }),
  ];
  const comments: DemoComment[] = [
    comment(201, 101, 'bruna', 'Também comecei hoje cedo. Vamos juntas até o fim!', 5),
    comment(202, 102, 'rodrigo', 'Orando com você.', 20),
    comment(203, 104, 'camila', 'Um dia de cada vez. Estamos juntos nessa.', 60),
  ];
  return { posts, comments };
}

/** Outros dias: um feed "em andamento" (o dia N e os dois anteriores). */
function runningContent(now: number, day: number): SeedContent {
  const { face, post, comment } = seedHelpers(now);
  const d = (back: number) => Math.max(1, day - back);
  const posts: DemoPost[] = [
    post(
      101,
      'marina',
      'Hoje separei quinze minutos antes do trabalho para ler. Parece pouco, mas mudou o tom do meu dia.',
      d(0),
      12,
      { kind: 'leitura', otherAmens: 12, otherFaces: [face('camila'), face('tiago'), face('rodrigo')] },
    ),
    post(
      102,
      'tiago',
      'Estou orando pela minha família todos os dias desta semana. Quem quiser, ore comigo também.',
      d(0),
      55,
      { kind: 'oracao', otherAmens: 23, otherFaces: [face('rodrigo'), face('leticia'), face('marina')] },
    ),
    // Versículo: só a REFERÊNCIA (Salmos 119:105). O app mostra o texto da tradução aberta do aparelho.
    post(
      103,
      'leticia',
      'Confesso que atrasei um dia, mas voltei. Ler junto com a igreja me ajuda a não desistir.',
      d(1),
      60 * 20,
      {
        kind: 'versiculo',
        verse: { book: 'PSA', chapter: 119, verseStart: 105, verseEnd: null },
        otherAmens: 7,
        otherFaces: [face('felipe'), face('bruna')],
      },
    ),
    post(104, 'felipe', 'O jejum de ontem foi mais difícil do que eu esperava. Terminei o dia grato e em paz.', d(1), 60 * 26, {
      kind: 'jejum',
      otherAmens: 4,
      otherFaces: [face('marina')],
    }),
    post(
      105,
      'bruna',
      'Comecei a ler com meu filho à noite. Ele faz perguntas em que eu nunca tinha pensado.',
      d(2),
      60 * 45,
      { otherAmens: 9, otherFaces: [face('leticia'), face('camila'), face('tiago')] },
    ),
    // Desde 2026-09-22 não há público por ministério: tudo vai para a igreja inteira.
    post(107, 'camila', 'Vamos orar juntos hoje às 21h, cada um da sua casa.', null, 90, {
      kind: 'oracao',
      otherAmens: 5,
      otherFaces: [face('rodrigo'), face('felipe')],
    }),
  ];
  // A própria pessoa: um exemplo de publicação que ficou "em análise" (só ela vê).
  // Some no modo "pessoa nova" (EXPO_PUBLIC_DEMO_SEED=false): quem acabou de entrar não publicou nada.
  if (process.env.EXPO_PUBLIC_DEMO_SEED !== 'false') {
    posts.push(
      post(
        106,
        'marina',
        'Exemplo de publicação em análise: é assim que aparece um texto que a equipe da igreja ainda vai olhar.',
        d(1),
        60 * 3,
        { author: { key: 'me', name: '' }, publishedAt: null, status: 'in_review', holdReason: 'termo' },
      ),
    );
  }
  const comments: DemoComment[] = [
    comment(201, 101, 'camila', 'Que bom! Vou tentar fazer o mesmo amanhã cedo.', 8),
    comment(202, 102, 'rodrigo', 'Estou orando também. Força para vocês.', 40),
  ];
  return { posts, comments };
}

function seed(now = Date.now()): State {
  const day = demoDay();
  const { posts, comments } = day === 1 ? dayOneContent(now) : runningContent(now, day);

  return {
    member: false,
    profile: { ...EMPTY_PROFILE },
    avatarUri: null,
    rulesAccepted: false,
    consentAccepted: false,
    posts,
    comments,
    blocks: [],
    activity: [],
    reports: 0,
    nextId: 1000,
    seededAt: now,
    realAtSeed: Date.now(),
    lastStamp: now,
  };
}

function current(): State {
  if (!state) state = seed();
  return state;
}

/** Só para testes: volta ao estado inicial (sem sessão, dados de exemplo de novo). */
export function _resetDemoForTests(now?: number): void {
  state = seed(now);
  demoPhotos.clear();
  session = null;
  emit();
}

/* ------------------------------------------------------------- regras locais */

const URGENT: readonly ReportReason[] = ['crianca_exposta', 'rosto_de_terceiro'];
/** O filtro de verdade segura link e contato; a demonstração imita isso. */
const LINK = /(https?:\/\/|www\.|\.com\b|\.br\b)/i;
const CONTACT = /(\d[\d\s().-]{7,}\d|@[a-z0-9_.]{3,})/i;

function holdFor(body: string | null): HoldReason | null {
  if (!body) return null;
  if (LINK.test(body)) return 'link';
  if (CONTACT.test(body)) return 'contato';
  return null;
}

function isMe(author: Author): boolean {
  return author.key === 'me';
}

function blockedKeys(s: State): Set<string> {
  return new Set(s.blocks.map((b) => b.authorKey));
}

function requireMember(s: State) {
  if (!session) throw communityError('session_expired');
  if (!s.member) throw communityError('needs_join');
}

function requireConsent(s: State) {
  requireMember(s);
  if (!s.rulesAccepted || !s.consentAccepted) throw communityError('needs_consent');
}

function requireId(value: string | undefined): string {
  if (!value || !isUuid(value)) throw communityError('invalid_input');
  return value;
}

function authorName(s: State, author: Author): string {
  return isMe(author) ? (s.profile.displayName ?? 'Você') : author.name;
}

function authorMinistry(s: State, author: Author): string | null {
  return isMe(author) ? s.profile.ministry : (author.ministry ?? null);
}

function requireProfile(s: State) {
  if (!isProfileComplete(s.profile)) throw communityError('needs_profile');
}

function findTargetAuthor(s: State, target: ReportTarget): Author {
  if (target.postId) {
    const post = s.posts.find((p) => p.postId === requireId(target.postId));
    if (!post) throw communityError('invalid_input');
    return post.author;
  }
  const comment = s.comments.find((c) => c.commentId === requireId(target.commentId));
  if (!comment) throw communityError('invalid_input');
  return comment.author;
}

function toStatus(s: State): CommunityStatus {
  const profile = s.member ? { ...s.profile } : { ...EMPTY_PROFILE };
  const complete = s.member && isProfileComplete(profile);
  return {
    isMember: s.member,
    memberStatus: s.member ? 'active' : null,
    displayName: profile.displayName,
    profile,
    profileComplete: complete,
    canPublish: s.member && s.rulesAccepted && s.consentAccepted && complete,
    needsPublishConsent: !s.consentAccepted,
    needsRules: !s.rulesAccepted,
    publishConsentVersion: 'PENDENTE',
    rulesVersion: 'PENDENTE',
    isModerator: false,
    hasNewActivity: s.member && visibleActivity(s).some((a) => a.unread),
  };
}

/**
 * Público do post. Desde 2026-09-22 todo post vai para a igreja inteira: nada
 * de exemplo é restrito. A função continua existindo (e devolvendo true) para o
 * caminho da demonstração ser o mesmo do real, onde uma linha ANTIGA de
 * ministério ainda pode ser restrita.
 */
function audienceAllows(s: State, p: DemoPost): boolean {
  if (p.audience === 'igreja' || isMe(p.author)) return true;
  const mine = s.profile.ministry;
  return mine !== null && (p.audienceMinistry === null || p.audienceMinistry === mine);
}

function myFace(s: State): AmenFace {
  return {
    name: s.profile.displayName ?? 'Você',
    avatarPath: s.profile.avatarPath,
    isMine: true,
  };
}

/** Os campos do diário (F1, F3) como o servidor devolve para quem está vendo. */
function diaryOf(s: State, p: DemoPost): DiaryFields {
  const blocked = blockedKeys(s);
  const others = p.otherFaces.filter((f) => !blocked.has(faceKey(f.name)));
  const faces = (p.amen ? [myFace(s), ...others] : others).slice(0, MAX_AMEN_FACES);
  return {
    kind: p.kind,
    verse: p.verse,
    photoPaths: [...p.photoPaths],
    audience: p.audience,
    audienceMinistry: p.audience === 'ministerio' ? p.audienceMinistry : null,
    amenCount: Math.max(p.otherAmens - (p.otherFaces.length - others.length), 0) + (p.amen ? 1 : 0),
    amenFaces: faces,
    commentCount: s.comments.filter((c) => c.postId === p.postId && c.status === 'published' && !blocked.has(c.author.key))
      .length,
  };
}

/** "Letícia" → "leticia" (a chave da pessoa de exemplo): o rostinho some quando ela está bloqueada. */
function faceKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function visibleActivity(s: State): DemoActivity[] {
  const blocked = blockedKeys(s);
  return s.activity.filter((a) => !blocked.has(faceKey(a.actorName)));
}

/**
 * Fotos de post na demonstração (C6, 2026-09-22): antes eram recusadas ("fotos
 * não são enviadas"), o que parecia defeito. Agora a foto preparada fica só na
 * memória, como data URI, e o post vai "em análise" como no app real (toda foto
 * passa por uma pessoa). Nada sai do aparelho.
 */
const demoPhotos = new Map<string, string>();
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

export const _bytesToBase64ForTests = bytesToBase64;

/* ----------------------------------------------------------------- a API */

function createDemoCommunityApi(): CommunityApi {
  return {
    async getStatus() {
      const s = current();
      if (!session) throw communityError('session_expired');
      return toStatus(s);
    },

    async acceptTerms(input: { purpose: TermsPurpose; version: string; sha256: string; appVersion: string }) {
      const s = current();
      requireMember(s);
      if (!/^[0-9a-f]{64}$/i.test(input.sha256)) throw communityError('invalid_input');
      if (input.purpose === 'community_rules') s.rulesAccepted = true;
      else s.consentAccepted = true;
    },

    /** C3: sem código. Na demonstração, entra direto. */
    async joinCommunity(input: { displayName?: string | null } = {}) {
      const s = current();
      if (!session) throw communityError('session_expired');
      const name = cleanText(input.displayName);
      if (name && !isValidDisplayName(name)) throw communityError('invalid_input');
      if (!s.member) {
        s.member = true;
        s.profile = { ...EMPTY_PROFILE, displayName: name };
      }
    },

    async setDisplayName(name: string) {
      const s = current();
      requireMember(s);
      if (!isValidDisplayName(name)) throw communityError('invalid_input');
      s.profile.displayName = name.trim();
    },

    async updateProfile(input: ProfileUpdate) {
      const s = current();
      requireMember(s);
      const args = profileArgs(input);
      const p = s.profile;
      if (typeof args.new_name === 'string') p.displayName = args.new_name;
      if (args.no_ministry === true) {
        p.ministry = null;
        p.ministryAnswered = true;
      } else if (typeof args.new_ministry === 'string') {
        p.ministry = args.new_ministry;
        p.ministryAnswered = true;
      }
      if (args.clear_bio === true) p.bio = null;
      else if (typeof args.new_bio === 'string') p.bio = args.new_bio;
      if (args.confirms_16 === true) p.ageConfirmed = true;
    },

    async setAvatar(photo: { bytes: Uint8Array; uri: string }): Promise<AvatarStatus> {
      const s = current();
      requireMember(s);
      assertPhotoSafeToUpload(photo.bytes);
      s.avatarUri = photo.uri;
      s.profile.avatarPath = DEMO_AVATAR_PATH;
      s.profile.avatarStatus = 'in_review';
      return 'in_review';
    },

    async removeAvatar() {
      const s = current();
      requireMember(s);
      s.avatarUri = null;
      s.profile.avatarPath = null;
      s.profile.avatarStatus = 'none';
    },

    async setContact(input: { email: string | null; wantsNews: boolean }) {
      const s = current();
      requireMember(s);
      const email = cleanText(input.email);
      if (email && !isValidContactEmail(email)) throw communityError('invalid_input');
      if (!email && input.wantsNews) throw communityError('invalid_input');
      s.profile.contactEmail = email ? email.toLowerCase() : null;
      s.profile.newsOptIn = input.wantsNews;
    },

    /** Um feed só, da igreja inteira (2026-09-22). O segundo argumento é ignorado. */
    async feedPage(cursor?: FeedCursor | null, _legacyOptions?: { scope?: FeedScope }): Promise<FeedPage> {
      const s = current();
      requireMember(s);
      const blocked = blockedKeys(s);
      const visible = s.posts
        .filter((p) => p.status === 'published' && p.publishedAt && !blocked.has(p.author.key))
        .filter((p) => audienceAllows(s, p))
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.postId.localeCompare(a.postId));
      const start = cursor
        ? visible.findIndex(
            (p) =>
              (p.publishedAt ?? '') < cursor.beforePublishedAt ||
              ((p.publishedAt ?? '') === cursor.beforePublishedAt && p.postId < cursor.beforePost),
          )
        : 0;
      const slice = start < 0 ? [] : visible.slice(start, start + LIMITS.feedPage);
      const posts: (FeedPost & DiaryFields)[] = slice.map((p) => ({
        ...diaryOf(s, p),
        postId: p.postId,
        body: p.body,
        photoPath: p.photoPaths[0] ?? null,
        dayNumber: p.dayNumber,
        publishedAt: p.publishedAt ?? '',
        authorName: authorName(s, p.author),
        authorMinistry: authorMinistry(s, p.author),
        authorAvatarPath: isMe(p.author) ? s.profile.avatarPath : null,
        isMine: isMe(p.author),
        iSaidAmen: p.amen,
      }));
      const ended = posts.length < LIMITS.feedPage;
      const last = posts[posts.length - 1];
      return {
        posts,
        ended,
        nextCursor: ended || !last ? null : { beforePublishedAt: last.publishedAt, beforePost: last.postId },
      };
    },

    async postComments(postId: string): Promise<PostComment[]> {
      const s = current();
      requireMember(s);
      const id = requireId(postId);
      const blocked = blockedKeys(s);
      return s.comments
        .filter(
          (c) =>
            c.postId === id &&
            !blocked.has(c.author.key) &&
            (c.status === 'published' || (isMe(c.author) && c.status === 'in_review')),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((c) => ({
          commentId: c.commentId,
          body: c.body,
          status: c.status,
          createdAt: c.createdAt,
          authorName: authorName(s, c.author),
          isMine: isMe(c.author),
          amenCount: c.status === 'published' ? c.otherAmens + (c.amen ? 1 : 0) : 0,
          iSaidAmen: c.amen,
        }));
    },

    async myPosts(): Promise<MyPost[]> {
      const s = current();
      requireMember(s);
      return s.posts
        .filter((p) => isMe(p.author))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => ({
          ...diaryOf(s, p),
          postId: p.postId,
          body: p.body,
          photoPath: p.photoPaths[0] ?? null,
          dayNumber: p.dayNumber,
          status: p.status,
          holdReason: p.holdReason,
          createdAt: p.createdAt,
          publishedAt: p.publishedAt,
          decidedBy: p.holdReason || p.photoPaths.length > 0 ? ('automatico' as const) : null,
          reason: null,
          noteForAuthor: null,
        }));
    },

    async createPost(input: NewPost): Promise<PublishResult> {
      const s = current();
      requireConsent(s);
      requireProfile(s);
      const post = normalizeNewPost(input, (path) => demoPhotos.has(path));
      if (!post) throw communityError('invalid_input');
      // Como no servidor com o filtro automático configurado (F5, aqui SIMULADO):
      // foto aparece na hora; texto que o filtro de texto segura vai para análise.
      const hold: HoldReason | null = holdFor(post.body);
      const now = stamp(s);
      const created: DemoPost = {
        postId: newId(s),
        author: { key: 'me', name: '' },
        body: post.body,
        photoPaths: post.photoPaths,
        dayNumber: post.day,
        kind: post.kind,
        verse: post.verse,
        // Igreja inteira, sempre (normalizeNewPost já força 'igreja').
        audience: post.audience,
        audienceMinistry: null,
        createdAt: now,
        publishedAt: hold ? null : now,
        status: hold ? 'in_review' : 'published',
        holdReason: hold,
        amen: false,
        otherAmens: 0,
        otherFaces: [],
      };
      s.posts.push(created);
      if (!hold) {
        // Para mostrar o sino (F8): alguém de exemplo diz Amém no que acabou de sair.
        created.otherAmens = 1;
        created.otherFaces = [{ name: DEMO_FIRST_AMEN_NAME, avatarPath: null, isMine: false }];
        s.activity.unshift({
          activityId: newId(s),
          postId: created.postId,
          kind: 'amen',
          actorName: DEMO_FIRST_AMEN_NAME,
          at: stamp(s),
          preview: null,
          unread: true,
        });
      }
      return { id: created.postId, status: created.status };
    },

    async myActivity(): Promise<ActivityItem[]> {
      const s = current();
      requireMember(s);
      return visibleActivity(s).map((a) => ({ ...a, actorAvatarPath: null }));
    },

    async markActivitySeen() {
      const s = current();
      requireMember(s);
      for (const item of s.activity) item.unread = false;
    },

    async deletePost(postId: string) {
      const s = current();
      requireMember(s);
      const id = requireId(postId);
      const post = s.posts.find((p) => p.postId === id);
      if (!post || !isMe(post.author)) throw communityError('invalid_input');
      s.posts = s.posts.filter((p) => p.postId !== id);
      s.comments = s.comments.filter((c) => c.postId !== id);
      s.activity = s.activity.filter((a) => a.postId !== id);
    },

    async createComment(postId: string, body: string): Promise<PublishResult> {
      const s = current();
      requireConsent(s);
      requireProfile(s);
      const id = requireId(postId);
      const cleaned = cleanText(body);
      if (!isValidCommentBody(cleaned) || !cleaned) throw communityError('invalid_input');
      if (!s.posts.some((p) => p.postId === id && p.status === 'published' && audienceAllows(s, p))) {
        throw communityError('invalid_input');
      }
      const comment: DemoComment = {
        commentId: newId(s),
        postId: id,
        author: { key: 'me', name: '' },
        body: cleaned,
        createdAt: stamp(s),
        status: holdFor(cleaned) ? 'in_review' : 'published',
        amen: false,
        otherAmens: 0,
      };
      s.comments.push(comment);
      return { id: comment.commentId, status: comment.status };
    },

    async deleteComment(commentId: string) {
      const s = current();
      requireMember(s);
      const id = requireId(commentId);
      const comment = s.comments.find((c) => c.commentId === id);
      if (!comment || !isMe(comment.author)) throw communityError('invalid_input');
      s.comments = s.comments.filter((c) => c.commentId !== id);
    },

    /** Liga/desliga o MEU Amém; o número e o meu rostinho (F3) saem de diaryOf. */
    async setAmen(postId: string, amen: boolean) {
      const s = current();
      requireConsent(s);
      const post = s.posts.find((p) => p.postId === requireId(postId));
      if (!post || (amen && (post.status !== 'published' || !audienceAllows(s, post)))) {
        throw communityError('invalid_input');
      }
      // O número e o meu rostinho (F3) saem de diaryOf: marcar soma 1 e põe o meu rosto na frente.
      post.amen = amen;
      return post.amen;
    },

    /** Amém no comentário: as mesmas regras do servidor (marcar pede consentimento; desmarcar é livre). */
    async setCommentAmen(commentId: string, amen: boolean) {
      const s = current();
      requireMember(s);
      const comment = s.comments.find((c) => c.commentId === requireId(commentId));
      if (!amen) {
        if (comment) comment.amen = false;
        return false;
      }
      requireConsent(s);
      const post = comment ? s.posts.find((p) => p.postId === comment.postId) : undefined;
      if (
        !comment ||
        comment.status !== 'published' ||
        blockedKeys(s).has(comment.author.key) ||
        !post ||
        post.status !== 'published' ||
        !audienceAllows(s, post)
      ) {
        throw communityError('invalid_input');
      }
      comment.amen = true;
      return true;
    },

    async report(input: ReportTarget & { person?: boolean; reason: ReportReason; details?: string | null }) {
      const s = current();
      requireMember(s);
      if (!REPORT_REASONS.includes(input.reason)) throw communityError('invalid_input');
      const details = cleanText(input.details);
      if (details && charLength(details) > LIMITS.reportDetails) throw communityError('invalid_input');
      findTargetAuthor(s, input);
      // Urgente tira do ar na hora (como no servidor) até a equipe olhar.
      if (input.person !== true && URGENT.includes(input.reason)) {
        if (input.postId) {
          const post = s.posts.find((p) => p.postId === input.postId);
          if (post) post.status = 'in_review';
        } else {
          const comment = s.comments.find((c) => c.commentId === input.commentId);
          if (comment) comment.status = 'in_review';
        }
      }
      s.reports += 1;
      return newId(s);
    },

    async blockAuthor(target: ReportTarget) {
      const s = current();
      requireMember(s);
      const author = findTargetAuthor(s, target);
      if (isMe(author)) throw communityError('invalid_input');
      if (s.blocks.some((b) => b.authorKey === author.key)) return;
      s.blocks.push({
        blockId: newId(s),
        authorKey: author.key,
        displayName: author.name,
        createdAt: stamp(s),
      });
    },

    async unblock(blockId: string) {
      const s = current();
      requireMember(s);
      const id = requireId(blockId);
      s.blocks = s.blocks.filter((b) => b.blockId !== id);
    },

    async myBlocks(): Promise<MyBlock[]> {
      const s = current();
      requireMember(s);
      return s.blocks.map((b) => ({ blockId: b.blockId, displayName: b.displayName, createdAt: b.createdAt }));
    },

    async revokePublishConsent() {
      const s = current();
      requireMember(s);
      s.consentAccepted = false;
      s.posts = s.posts.filter((p) => !isMe(p.author));
      s.comments = s.comments.filter((c) => !isMe(c.author));
      for (const p of s.posts) p.amen = false;
      for (const c of s.comments) c.amen = false;
      s.activity = [];
    },

    async leaveCommunity() {
      const s = current();
      requireMember(s);
      s.member = false;
      s.profile = { ...EMPTY_PROFILE };
      s.avatarUri = null;
      s.rulesAccepted = false;
      s.consentAccepted = false;
      s.posts = s.posts.filter((p) => !isMe(p.author));
      s.comments = s.comments.filter((c) => !isMe(c.author));
      for (const p of s.posts) p.amen = false;
      for (const c of s.comments) c.amen = false;
      s.activity = [];
      s.blocks = [];
    },

    /** Guarda a foto JÁ PREPARADA na memória (a mesma barreira de metadados do real). */
    async uploadPhoto(bytes: Uint8Array): Promise<string> {
      const s = current();
      requireConsent(s);
      assertPhotoSafeToUpload(bytes);
      const path = `demo-foto-${newId(s).slice(-6)}.jpg`;
      demoPhotos.set(path, `data:image/jpeg;base64,${bytesToBase64(bytes)}`);
      return path;
    },

    async discardPhoto(path: string) {
      demoPhotos.delete(path);
    },

    /** A foto de perfil e as fotos de post da própria pessoa, que estão no aparelho. */
    async signPhotoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
      const s = current();
      const urls = new Map<string, string>();
      if (s.avatarUri && paths.includes(DEMO_AVATAR_PATH)) urls.set(DEMO_AVATAR_PATH, s.avatarUri);
      for (const path of paths) {
        const uri = path ? demoPhotos.get(path) : undefined;
        if (path && uri) urls.set(path, uri);
      }
      return urls;
    },
  };
}

let instance: CommunityApi | null = null;

/** null fora da demonstração (e sempre em release). */
export function getDemoCommunityApi(): CommunityApi | null {
  if (!isCommunityDemo()) return null;
  if (!instance) instance = createDemoCommunityApi();
  return instance;
}

export function isDemoCommunityApi(api: unknown): boolean {
  return api !== null && api !== undefined && api === instance;
}
