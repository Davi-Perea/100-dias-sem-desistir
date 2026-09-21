import { isCloudConfigured } from '@/cloud/config';
import { COMMUNITY_ENABLED } from '@/config/features';
import { isDevBuild } from '@/journey/devBuild';

import type { CommunityApi } from './api';
import { CommunityError, communityError } from './errors';
import type {
  CommunityStatus,
  ContentStatus,
  FeedCursor,
  FeedPage,
  FeedPost,
  HoldReason,
  MyBlock,
  MyPost,
  PostComment,
  PublishResult,
  ReportReason,
  ReportTarget,
  TermsPurpose,
} from './types';
import { REPORT_REASONS } from './types';
import {
  charLength,
  cleanText,
  isUuid,
  isValidCommentBody,
  isValidDisplayName,
  isValidPostBody,
  LIMITS,
  normalizeInviteCode,
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
 * Nada sai do aparelho e nada é gravado: fechar o app zera tudo. As publicações
 * de exemplo são de nomes claramente fictícios, marcados "(exemplo)", com textos
 * escritos para a demonstração (sem citação bíblica, sem texto da igreja, sem
 * foto). A tela do feed mostra o selo "Demonstração · nada é enviado".
 *
 * Implementa a MESMA interface de `createCommunityApi` (tipo `CommunityApi`),
 * então as telas não sabem a diferença, a não ser onde perguntam
 * `isDemoCommunityApi` (selo, passo de e-mail simulado, textos PENDENTE).
 */

/** Código de entrada aceito na demonstração (formato real: 10 letras/números sem 0, O, 1, I). */
export const DEMO_INVITE_CODE = 'DEMAX23456';
export const DEMO_EMAIL_LABEL = 'modo demonstração (sem e-mail)';
export const DEMO_BADGE = 'Demonstração · nada é enviado';
/** Aviso nas regras e no consentimento enquanto o texto é rascunho (PENDENTE). */
export const DEMO_TERMS_NOTICE =
  'Rascunho em revisão (PENDENTE). No app de verdade este texto ainda não pode ser aceito; na demonstração, dá para seguir.';

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

export type DemoSession = { userId: string; email: string };

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

/** O passo de e-mail, simulado: nenhum e-mail é enviado, nenhum código é pedido. */
export function demoSignIn(): void {
  if (!isCommunityDemo()) return;
  if (!session) session = { userId: ME, email: DEMO_EMAIL_LABEL };
  emit();
}

export function demoSignOut(): void {
  if (!session) return;
  session = null;
  emit();
}

/* ------------------------------------------------------------------ dados */

const ME = 'd0000000-0000-4000-8000-000000000001';

type Author = { key: string; name: string };
type DemoPost = {
  postId: string;
  author: Author;
  body: string;
  dayNumber: number | null;
  createdAt: string;
  publishedAt: string | null;
  status: ContentStatus;
  holdReason: HoldReason | null;
  amen: boolean;
};
type DemoComment = {
  commentId: string;
  postId: string;
  author: Author;
  body: string;
  createdAt: string;
  status: ContentStatus;
};
type DemoBlock = { blockId: string; authorKey: string; displayName: string; createdAt: string };

type State = {
  member: boolean;
  displayName: string | null;
  rulesAccepted: boolean;
  consentAccepted: boolean;
  posts: DemoPost[];
  comments: DemoComment[];
  blocks: DemoBlock[];
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

function seed(now = Date.now()): State {
  const day = demoDay();
  const d = (back: number) => Math.max(1, day - back);
  const maria: Author = { key: 'maria', name: 'Maria (exemplo)' };
  const joao: Author = { key: 'joao', name: 'João (exemplo)' };
  const ana: Author = { key: 'ana', name: 'Ana (exemplo)' };
  const pedro: Author = { key: 'pedro', name: 'Pedro (exemplo)' };
  const lucas: Author = { key: 'lucas', name: 'Lucas (exemplo)' };
  const carla: Author = { key: 'carla', name: 'Carla (exemplo)' };
  const rafael: Author = { key: 'rafael', name: 'Rafael (exemplo)' };

  const post = (n: number, author: Author, body: string, dayNumber: number, minutes: number): DemoPost => ({
    postId: uuid(n),
    author,
    body,
    dayNumber,
    createdAt: minutesAgo(now, minutes),
    publishedAt: minutesAgo(now, minutes),
    status: 'published',
    holdReason: null,
    amen: false,
  });

  const posts: DemoPost[] = [
    post(101, maria, 'Hoje separei quinze minutos antes do trabalho para ler. Parece pouco, mas mudou o tom do meu dia.', d(0), 12),
    post(102, joao, 'Estou orando pela minha família todos os dias desta semana. Quem quiser, ore comigo também.', d(0), 55),
    post(103, ana, 'Confesso que atrasei um dia, mas voltei. Ler junto com a igreja me ajuda a não desistir.', d(1), 60 * 20),
    post(104, pedro, 'O jejum de ontem foi mais difícil do que eu esperava. Terminei o dia grato e em paz.', d(1), 60 * 26),
    post(105, lucas, 'Comecei a ler com meu filho à noite. Ele faz perguntas em que eu nunca tinha pensado.', d(2), 60 * 45),
    // A própria pessoa: um exemplo de publicação que ficou "em análise" (só ela vê).
    {
      postId: uuid(106),
      author: { key: 'me', name: '' },
      body: 'Exemplo de publicação em análise: é assim que aparece um texto que a equipe da igreja ainda vai olhar.',
      dayNumber: d(1),
      createdAt: minutesAgo(now, 60 * 3),
      publishedAt: null,
      status: 'in_review',
      holdReason: 'termo',
      amen: false,
    },
  ];

  const comments: DemoComment[] = [
    {
      commentId: uuid(201),
      postId: uuid(101),
      author: carla,
      body: 'Que bom! Vou tentar fazer o mesmo amanhã cedo.',
      createdAt: minutesAgo(now, 8),
      status: 'published',
    },
    {
      commentId: uuid(202),
      postId: uuid(102),
      author: rafael,
      body: 'Estou orando também. Força para vocês.',
      createdAt: minutesAgo(now, 40),
      status: 'published',
    },
  ];

  return {
    member: false,
    displayName: null,
    rulesAccepted: false,
    consentAccepted: false,
    posts,
    comments,
    blocks: [],
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
  if (!s.member) throw communityError('needs_invite');
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
  return isMe(author) ? (s.displayName ?? 'Você') : author.name;
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
  return {
    isMember: s.member,
    memberStatus: s.member ? 'active' : null,
    displayName: s.member ? s.displayName : null,
    canPublish: s.member && s.rulesAccepted && s.consentAccepted,
    needsPublishConsent: !s.consentAccepted,
    needsRules: !s.rulesAccepted,
    publishConsentVersion: 'PENDENTE',
    rulesVersion: 'PENDENTE',
    isModerator: false,
  };
}

function photosOff(): never {
  throw new CommunityError('feature_disabled', 'Na demonstração, fotos não são enviadas. Publique só o texto.');
}

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

    async redeemInviteCode(input: { code: string; displayName: string; confirmsAdult: boolean }) {
      const s = current();
      if (!session) throw communityError('session_expired');
      const code = normalizeInviteCode(input.code);
      if (!code) return 'invalid_code' as const;
      if (!isValidDisplayName(input.displayName)) throw communityError('invalid_input');
      if (!input.confirmsAdult) throw communityError('needs_adult_account');
      if (code !== DEMO_INVITE_CODE) return 'invalid_code' as const;
      s.member = true;
      s.displayName = input.displayName.trim();
      return 'joined' as const;
    },

    async setDisplayName(name: string) {
      const s = current();
      requireMember(s);
      if (!isValidDisplayName(name)) throw communityError('invalid_input');
      s.displayName = name.trim();
    },

    async feedPage(cursor?: FeedCursor | null): Promise<FeedPage> {
      const s = current();
      requireMember(s);
      const blocked = blockedKeys(s);
      const visible = s.posts
        .filter((p) => p.status === 'published' && p.publishedAt && !blocked.has(p.author.key))
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.postId.localeCompare(a.postId));
      const start = cursor
        ? visible.findIndex(
            (p) =>
              (p.publishedAt ?? '') < cursor.beforePublishedAt ||
              ((p.publishedAt ?? '') === cursor.beforePublishedAt && p.postId < cursor.beforePost),
          )
        : 0;
      const slice = start < 0 ? [] : visible.slice(start, start + LIMITS.feedPage);
      const posts: FeedPost[] = slice.map((p) => ({
        postId: p.postId,
        body: p.body,
        photoPath: null,
        dayNumber: p.dayNumber,
        publishedAt: p.publishedAt ?? '',
        authorName: authorName(s, p.author),
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
        }));
    },

    async myPosts(): Promise<MyPost[]> {
      const s = current();
      requireMember(s);
      return s.posts
        .filter((p) => isMe(p.author))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => ({
          postId: p.postId,
          body: p.body,
          photoPath: null,
          dayNumber: p.dayNumber,
          status: p.status,
          holdReason: p.holdReason,
          createdAt: p.createdAt,
          publishedAt: p.publishedAt,
          decidedBy: p.holdReason ? ('automatico' as const) : null,
          reason: null,
          noteForAuthor: null,
        }));
    },

    async createPost(input: { body?: string | null; photoPath?: string | null; day?: number | null }): Promise<PublishResult> {
      const s = current();
      requireConsent(s);
      if (input.photoPath) photosOff();
      const body = cleanText(input.body);
      if (!body || !isValidPostBody(body)) throw communityError('invalid_input');
      const day = input.day ?? null;
      if (day !== null && (!Number.isInteger(day) || day < 1 || day > 100)) throw communityError('invalid_input');
      const hold = holdFor(body);
      const now = stamp(s);
      const post: DemoPost = {
        postId: newId(s),
        author: { key: 'me', name: '' },
        body,
        dayNumber: day,
        createdAt: now,
        publishedAt: hold ? null : now,
        status: hold ? 'in_review' : 'published',
        holdReason: hold,
        amen: false,
      };
      s.posts.push(post);
      return { id: post.postId, status: post.status };
    },

    async deletePost(postId: string) {
      const s = current();
      requireMember(s);
      const id = requireId(postId);
      const post = s.posts.find((p) => p.postId === id);
      if (!post || !isMe(post.author)) throw communityError('invalid_input');
      s.posts = s.posts.filter((p) => p.postId !== id);
      s.comments = s.comments.filter((c) => c.postId !== id);
    },

    async createComment(postId: string, body: string): Promise<PublishResult> {
      const s = current();
      requireConsent(s);
      const id = requireId(postId);
      const cleaned = cleanText(body);
      if (!isValidCommentBody(cleaned) || !cleaned) throw communityError('invalid_input');
      if (!s.posts.some((p) => p.postId === id && p.status === 'published')) throw communityError('invalid_input');
      const comment: DemoComment = {
        commentId: newId(s),
        postId: id,
        author: { key: 'me', name: '' },
        body: cleaned,
        createdAt: stamp(s),
        status: holdFor(cleaned) ? 'in_review' : 'published',
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

    /** Só o MEU Amém; não existe contador. */
    async setAmen(postId: string, amen: boolean) {
      const s = current();
      requireConsent(s);
      const post = s.posts.find((p) => p.postId === requireId(postId));
      if (!post) throw communityError('invalid_input');
      post.amen = amen;
      return post.amen;
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
    },

    async leaveCommunity() {
      const s = current();
      requireMember(s);
      s.member = false;
      s.displayName = null;
      s.rulesAccepted = false;
      s.consentAccepted = false;
      s.posts = s.posts.filter((p) => !isMe(p.author));
      s.comments = s.comments.filter((c) => !isMe(c.author));
      s.blocks = [];
    },

    async uploadPhoto(): Promise<string> {
      return photosOff();
    },

    async discardPhoto() {
      // Nada foi enviado na demonstração.
    },

    async signPhotoUrls(): Promise<Map<string, string>> {
      return new Map();
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
