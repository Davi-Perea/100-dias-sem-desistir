# Arquitetura V0 — Bible Study App

- **Status:** PROPOSTA (Sprint 0, 2026-09-07). Depende da aprovação de ADR-001 (React Native + Expo) e ADR-002 (Supabase, São Paulo).
- **Escopo:** arquitetura mínima para V1 (leitura offline, planos de leitura, progresso sincronizado, notas/destaques privados,
  lembrete diário, push ocasional, conta opcional, deep links, exclusão/exportação de dados). **Não** cobre grupos, feed, gamificação,
  IA, monetização ou multi-igreja — apenas mantém as portas abertas (ver `HARD_TO_REVERSE_DECISIONS.md`).
- Classificação: FATO (fonte + data nas pesquisas em `../research/`) · INFERÊNCIA · HIPÓTESE · RECOMENDAÇÃO.

---

## 1. Princípios

1. **Mobile real.** UI nativa (React Native/Expo), navegação mobile, safe areas, teclado, gestos, lifecycle, acessibilidade, estados de loading/erro/vazio.
2. **Reuse first.** Supabase, Expo/EAS, Sentry, PostHog, Resend, Expo Push. Nada de backend próprio, motor de sync próprio sofisticado, CMS próprio, push próprio.
3. **Offline-first onde importa.** Ler a Bíblia e marcar progresso funcionam sem rede; sincronização é *eventual* e idempotente.
4. **Conta opcional.** Leitura e início de plano sem login (Apple 5.1.1(v)); conta serve para sincronizar e para lembretes em outro aparelho.
5. **Dados no Brasil, satélites na UE.** Postgres/Auth/Storage em `sa-east-1`; Sentry e PostHog em região UE (adequação ANPD 32/2026); nenhum SDK de anúncios/atribuição.
6. **Dado sensível por padrão.** Notas, destaques e progresso revelam convicção religiosa (LGPD art. 5º, II): consentimento específico registrado, RLS estrita, minimização, exclusão completa.
7. **Opcionalidade barata, sem antecipação.** UUIDs no cliente, colunas de sync, referência bíblica canônica, eventos de progresso, planos versionados.

## 2. Visão geral

```
┌──────────────────────────── App (React Native + Expo, TypeScript) ────────────────────────────┐
│ UI (Expo Router) · módulos: bible · plans · progress · notes · auth · sync · notifications · links │
│ Camada local: SQLite (expo-sqlite, FTS5) [textos bíblicos empacotados + espelho de dados do usuário │
│               + outbox] · MMKV (preferências, posição de leitura) · SecureStore (sessão)          │
└───────────────┬───────────────────────────────┬───────────────────────────────┬───────────────────┘
                │ HTTPS (PostgREST/Auth/Storage)  │ Edge Functions (delete, export, broadcast, apple-token)
                ▼                               ▼
   ┌──────────────── Supabase (sa-east-1, São Paulo) ────────────────┐   ┌─── Satélites ───────────────┐
   │ Postgres + RLS · Auth (OTP e-mail, Apple, Google, anônimo) ·     │   │ Expo Push Service (push)     │
   │ Storage (avatares) · Edge Functions · pg_cron · Vault            │   │ Sentry EU (crash/erros)      │
   └──────────────────────────────────────────────────────────────────┘   │ PostHog EU (produto, agregado)│
                                                                          │ Resend (SMTP para OTP)        │
   ┌──────────── Conteúdo bíblico ────────────┐                           │ EAS Build/Submit/Update       │
   │ (a) textos abertos empacotados (SQLite)   │                           └──────────────────────────────┘
   │ (b) textos licenciados via API/SDK (cache │
   │     conforme licença — ver frente C)      │
   └───────────────────────────────────────────┘
```

## 3. App mobile — módulos

| Módulo | Responsabilidade | Notas técnicas |
|---|---|---|
| `bible` | `BibleTextProvider` (contrato), leitor de capítulo, navegação livro/capítulo, busca local, seleção de versículos, destaques, compartilhar versículo (texto/imagem) | Capítulo = um `Text` com um span por versículo (`onPress` por span); destaques como estilo de span, referenciados por versículo canônico (nunca offset). Escala de fonte do sistema respeitada (`allowFontScaling`, `maxFontSizeMultiplier`). Temas claro/escuro/sépia por tokens. Spike A1 valida artefatos de highlight no Android. |
| `plans` | Catálogo (cache local do catálogo publicado), inscrição, motor de "dia" (data de início + fuso + regra de agenda), tela "Hoje" | Planos são dados versionados e imutáveis após publicação; inscrição aponta para `plan_version`. |
| `progress` | Marcar leitura/dia como feito (offline), eventos append-only + estado derivado | Idempotente por `(enrollment_id, day_no, reading_no)`; eventos com `client_event_id` UUID. |
| `notes` | Notas e destaques privados por versículo/faixa | LWW por registro; texto curto; sem visibilidade pública em V1 (coluna `visibility` default `private`). |
| `auth` | OTP e-mail, Sign in with Apple, Google, sessão anônima sob demanda, vinculação, exclusão/exportação | `LargeSecureStore` (AES no SecureStore + payload no AsyncStorage/MMKV); limpar sessão no primeiro launch pós-instalação (Keychain persiste). |
| `sync` | Outbox FIFO, push idempotente, pull incremental por cursor, tombstones, reconciliação LWW | Ver §6. Roda ao abrir o app, ao voltar do background e ao recuperar rede. |
| `notifications` | Lembrete diário local (inexato), permissões (iOS prompt contextual; Android 13+ canal + `POST_NOTIFICATIONS`), reagendar após boot/abertura | Sem `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`. |
| `push` | Registro de token (Expo + nativo) em `devices`, tratamento de `DeviceNotRegistered` | Só comunicados; opt-in explícito para conteúdo promocional (Apple 4.5.4). |
| `links` | Universal Links / App Links (`/plan/{slug}`, `/read/{book}/{chapter}`), validação de parâmetros, fallback | Domínio próprio da entidade dona (decisão A14). |
| `settings/consent` | Consentimento LGPD (texto destacado, versão), preferências, tela "Sobre/licenças" com atribuições dos textos | `consents` gravado antes de sincronizar notas/progresso. |
| `observability` | Sentry (erros), PostHog (eventos agregados sem PII), flags de app | Sem session replay em V1 (tela contém dado sensível). |

Navegação (RECOMENDAÇÃO, sujeita ao Product Brain): abas *Hoje* (plano do dia), *Bíblia* (leitor), *Notas*, *Perfil*. Native tabs do Expo Router
quando saírem de alpha; até lá, encapsular a tab bar em componente próprio.

## 4. Referência bíblica canônica e texto

### 4.1 Referência canônica (decisão A6)
- `book`: código USFM de 3 letras (`GEN`…`REV`, cânon protestante de 66 livros); `chapter`, `verse_start`, `verse_end` inteiros.
- `verse_id` inteiro ordenável = `book_index*1_000_000 + chapter*1_000 + verse` (ex.: Jo 3:16 = 43_003_016) para índices, faixas e ordenação.
- Versificação canônica única (padrão eBible/"org"); traduções com versificação divergente carregam tabela `verse_map` (mesmo que V1 não use).
  Testes de fronteira: Sl 3–9 (sobrescritos), Jl 3, Ml 4, 3Jo 15, Ap 12:18.

### 4.2 `BibleTextProvider` (decisão A7)
```ts
interface BibleTextProvider {
  id: string;                     // ex.: "blivre", "onbv", "<licenciada>"
  meta(): TranslationMeta;        // nome, abreviação, licença, texto de atribuição, offline: boolean
  chapter(book: BookCode, chapter: number): Promise<Verse[]>;
  search(query: string, opts?): Promise<SearchHit[]>;   // FTS5 local ou remoto
  cachePolicy(): CachePolicy;     // "bundled" | "persistent" | "ttl:<h>" | "none" (definido pela licença)
}
```
- **Implementação 1 — `BundledSqliteProvider`**: textos com licença aberta/PD empacotados no app (SQLite gerado em build time).
- **Implementação 2 — `RemoteLicensedProvider`**: traduções protegidas via API/SDK, sempre online, com política de cache ditada pela licença:
  - **YouVersion Platform** (FATO, termos de 17/08/2026): API REST + SDK React Native/Expo (Apache-2.0); os termos **não concedem direitos sobre o texto** —
    cada versão tem licença própria aceita no portal e a editora pode revogar; telemetria obrigatória; sem cláusula de cache/offline nos termos gerais;
    proibido "replicate or compete with YouVersion" → parecer jurídico antes de usar. Quais versões pt-BR estão liberadas: NÃO VERIFICADO (exige conta).
  - **API.Bible** (FATO): cache renovável a cada ≤ 30 dias (FAQ: < 500 versículos consecutivos), remoção em 72 h ao encerrar, sem redistribuição;
    Starter grátis e estritamente não comercial (5.000 chamadas/mês); Pro US$ 29+/mês + US$ 10/mês por tradução comercial; FUMS (chamada manual em apps nativos).
  - Detalhes, riscos e decisões em `../research/BIBLE_CONTENT_OPTIONS.md`.
- A UI de leitura é nossa em ambos os casos; um SDK de leitor embutido de terceiros só seria aceito se a licença exigir e o Product Brain aprovar (perde-se destaques/notas próprios).

### 4.3 Textos empacotáveis hoje (FATO, frente C2, licenças lidas na fonte em 2026-09-07)
| Texto | Licença | Aptidão | Atribuição (resumo) |
|---|---|---|---|
| **Bíblia Livre (BLIVRE)** — eBible `porbr2018` / GitHub `blivre/BibliaLivre` | CC BY (3.0 BR no repositório; "4.0" no eBible — confirmar com mantenedores) | **padrão provisório** (fraseado Almeida familiar) | "Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, CC BY" |
| **Biblica® Open Nova Bíblia Viva 2007 (ONBV)** — eBible `poronbv` | CC BY-SA 4.0; não alterar o texto; manter o título; marca Biblica® | **"leitura fácil"** (equivalência dinâmica/paráfrase) | "© 2007, 2010 Biblica, Inc. CC BY-SA 4.0; original em biblica.com e open.bible" |
| NVA / pt-br ULB — Door43 `pt-br_ulb` v6.9 | CC BY-SA 4.0 | fallback (literal; sem manutenção) | "Door43 World Missions Community, CC BY-SA 4.0" |
| Bíblia Portuguesa Mundial — eBible `porbrbsl` | Domínio público (rascunho em revisão) | fallback com reserva | crédito recomendado à fonte |
| Tradução Brasileira 1917 — Wikisource | Domínio público (edição 2010 da SBB é protegida) | fallback | crédito à transcrição |

**NVI, NAA, ARA, ARC, NTLH, NVT, A21, KJA, ACF: não empacotar sem contrato.** Nenhuma está em licença aberta (a NVI pt-BR **não** está no open.bible da Biblica).
Repositórios/APIs "abertos" que hospedam essas traduções (ex.: `thiagobodruk/biblia`, abibliadigital, bolls.life) ficam em **lista de bloqueio** no pipeline.

### 4.4 Pipeline de conteúdo (build time, repositório `content-pipeline/`, script descartável em Sprint 1)
USFM → normalização (versificação, títulos separados do texto, notas de rodapé para ONBV) → validação (66 livros, contagem de capítulos/versículos, sem DC) →
SQLite (`translations`, `books`, `verses(verse_id, translation_id, text)`, `verses_fts` com tokenizer `unicode61 remove_diacritics 2`, `attributions`) →
empacotado como asset (≈4–6 MB por tradução, INFERÊNCIA) ou baixado sob demanda do Storage com checksum. Cláusula anti-DRM das licenças CC: **não cifrar** o banco de textos abertos.

## 5. Dados — esquema servidor V0 (Postgres/Supabase)

Convenções (decisão A9): `id uuid` gerado no cliente (v4/v7), `user_id`, `created_at`, `updated_at` (trigger servidor), `client_updated_at`, `deleted_at`, `device_id`;
RLS em **todas** as tabelas; políticas sempre `to authenticated`/`anon` explícitos e `(select auth.uid())`; índices em toda coluna filtrada por política.

```sql
-- perfil (1:1 com auth.users; criado por trigger)
profiles(id uuid pk references auth.users on delete cascade, display_name text, avatar_path text,
         locale text default 'pt-BR', tz text, reminder_time time, created_at, updated_at, deleted_at)

-- catálogo (conteúdo gerenciado; leitura pública do publicado)
plans(id uuid pk, slug text unique, title, description, status text check (status in ('draft','published','archived')), created_at)
plan_versions(id uuid pk, plan_id fk, version int, published_at, is_current bool, schedule_rule jsonb, unique(plan_id, version))
plan_days(id uuid pk, plan_version_id fk, day_no int, title text, devotional_md text null, unique(plan_version_id, day_no))
plan_readings(id uuid pk, plan_day_id fk, reading_no int, book char(3), chapter int, verse_start int null, verse_end int null,
              unique(plan_day_id, reading_no))

-- pessoais (owner = user_id; sincronizáveis)
enrollments(id uuid pk, user_id fk on delete cascade, plan_version_id fk, started_on date, tz text,
            status text, group_id uuid null /* futuro */, client_updated_at, updated_at, deleted_at, device_id)
progress_events(id uuid pk /* client_event_id */, user_id, enrollment_id fk on delete cascade, day_no int, reading_no int,
            type text check (type in ('completed','uncompleted')), occurred_at timestamptz, device_id, created_at)  -- append-only
reading_progress(id uuid pk, user_id, enrollment_id fk on delete cascade, day_no int, reading_no int,
            status text check (status in ('pending','done','skipped')), done_at timestamptz null,
            client_updated_at, updated_at, deleted_at, unique(enrollment_id, day_no, reading_no))    -- estado derivado, LWW
notes(id uuid pk, user_id, book char(3), chapter int, verse_start int null, verse_end int null, body text,
      visibility text default 'private', group_id uuid null /* futuro */, client_updated_at, updated_at, deleted_at, device_id)
highlights(id uuid pk, user_id, book char(3), chapter int, verse_start int, verse_end int, color smallint,
      client_updated_at, updated_at, deleted_at, unique(user_id, book, chapter, verse_start, verse_end))
reading_positions(id uuid pk, user_id, translation_id text, book char(3), chapter int, client_updated_at, updated_at)

-- dispositivos, consentimento, exclusão, auditoria
devices(id uuid pk, user_id, platform text, expo_push_token text null, native_push_token text null,
        app_version text, last_seen_at, created_at, unique(user_id, native_push_token))
consents(id uuid pk, user_id, purpose text check (purpose in ('sensitive_religious_data','analytics','push_marketing')),
         policy_version text, granted bool, granted_at, revoked_at null, source text)            -- append-only
deletion_requests(id uuid pk, user_id_hash text, requested_at, completed_at null, method text, apple_revoked bool null) -- sem PII
audit_log(id bigserial, actor uuid null, action text, target text, at timestamptz, meta jsonb)   -- ações administrativas
```

Exemplos de RLS (Supabase):
```sql
create policy "own progress" on reading_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "read published plans" on plan_versions for select to anon, authenticated
  using (is_current and exists (select 1 from plans p where p.id = plan_id and p.status = 'published'));

create policy "notes only for permanent users" on notes for insert to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false);
-- futuro (grupos): amplia leitura sem mover dados
-- create policy "group read" on notes for select to authenticated using (group_id is not null and is_group_member(group_id));
```

Armadilhas conhecidas (FATO, advisors do Supabase): `auth.uid()` sem `select` é avaliado por linha; políticas sem `to` valem para `anon`; views em `public`
ignoram RLS sem `security_invoker`; nunca usar `user_metadata` em política; tabela criada por SQL nasce **sem** RLS; `service_role` só em Edge Functions.

## 6. Offline e sincronização (protocolo V1, decisão A9 / ADR-002)

- **Local:** espelho das tabelas pessoais em SQLite + tabela `outbox(seq, table, op, row_json, attempts, last_error)`.
- **Escrita:** toda mutação grava local + enfileira no outbox; UI reage ao local (otimista).
- **Push:** FIFO; `upsert` via PostgREST (`on_conflict=id`, `Prefer: resolution=merge-duplicates`); trigger `lww_guard()` no servidor aceita só se
  `new.client_updated_at >= old.client_updated_at`; eventos de progresso são `insert ... on conflict do nothing` (idempotentes por `id`).
- **Pull:** por tabela, `?updated_at=gt.<cursor>&order=updated_at.asc,id.asc&limit=500`; aplica tombstones; cursor = maior `updated_at` recebido.
- **Conflitos:** único usuário, poucos aparelhos → LWW por registro. Notas: guardar cópia perdedora localmente em `notes_conflicts` (opcional, evita perda silenciosa).
- **Convidado → conta:** enquanto não há sessão, tudo fica local com IDs de cliente; ao criar/vincular conta, o outbox sobe os registros com o novo `user_id` (sem migração).
- **Rede/sessão:** sync ao abrir, ao voltar do background e ao recuperar conectividade; refresh de token só com rede; leitura e progresso nunca dependem de token válido.
- **Volume (INFERÊNCIA):** 1 mil DAU × ~10 upserts/dia ≈ 300 mil requisições/mês — irrisório para o Pro.
- **Evolução:** se grupos/realtime forem aprovados, PowerSync substitui o outbox sem mudar o modelo (schema já é sync-ready).

## 7. Auth e sessão

1. **OTP por e-mail (6 dígitos)** como método principal; SMTP próprio (Resend, domínio da entidade, SPF/DKIM). Limite: 1 pedido/60 s, expira em 1 h.
2. **Sign in with Apple** (nativo, `expo-apple-authentication` → `signInWithIdToken` com nonce) e **Google** (`@react-native-google-signin`, `webClientId`).
   Regra Apple 4.8: se Google existir, Apple é obrigatório. Guardar `authorizationCode` da Apple no cadastro → Edge Function troca por refresh token → Vault (para revogar na exclusão).
3. **Sessão anônima sob demanda** (primeira ação que exige nuvem), vinculada depois mantendo o `user_id`; limpeza de anônimos > 30 dias via `pg_cron`.
4. **Exclusão de conta** (Edge Function, `service_role`): reautenticação recente → revogar token Apple → apagar Storage → `auth.admin.deleteUser` (cascata) → `deletion_requests` → e-mail de confirmação. Também acessível por link web (Google Play).
5. **Exportação** (LGPD art. 18): Edge Function gera JSON com perfil, inscrições, progresso, notas, destaques, consentimentos.
6. **MFA:** não para usuários em V1; obrigatório no dashboard do Supabase.

## 8. Planos, "dia" e lembretes

- `plan_version.schedule_rule` (jsonb): `{"cadence":"daily"}` ou `{"cadence":"daily","skip_weekdays":[0]}` (pular domingos) etc.
- Inscrição guarda `started_on` (data local) + `tz` (IANA). "Dia atual" = função pura `(started_on, tz, schedule_rule, hoje_local)`; suporta pausar/recalcular sem perder eventos.
- Lembrete diário: notificação local com gatilho diário no horário escolhido, **inexato**; reagendar após reboot e a cada abertura; texto sem dado sensível.
- Push remoto: tabela `broadcasts` (aprovação manual) → Edge Function `send-broadcast` (lotes de 100, receipts em 15 min, remove `DeviceNotRegistered`).

## 9. Deep links

- Domínio próprio (decisão A14): `https://app.<dominio>/plan/{slug}`, `/plan/{slug}/day/{n}`, `/read/{book}/{chapter}[.{verse}]`.
- iOS: `associatedDomains` + AASA em `/.well-known/` (EAS registra o entitlement); Android: `assetlinks.json` + intent filters `autoVerify`.
- Hospedagem estática mínima para AASA/assetlinks e página de fallback ("abra no app / baixe") — pode ser Cloudflare Pages ou similar; sem backend.
- Validar parâmetros (livro ∈ 66 códigos, capítulo dentro do limite); nunca confiar em IDs internos vindos de link.

## 10. Observabilidade

- **Sentry (região UE)**: erros/crashes, source maps via EAS; sem PII (scrub de e-mail/nome).
- **PostHog (host UE)**: eventos agregados de produto (`plan_enrolled`, `day_completed`, `reader_opened`, `note_created` — sem conteúdo), IDs pseudonimizados; sem session replay; flags de app se necessário.
  Limite free 1 M eventos/mês → **não** enviar cada tick de progresso.
- **Supabase**: logs (7 dias no Pro), alertas de uso e *spend cap*; `audit_log` próprio para ações administrativas (retenção ≥ 12 meses).
- Uptime: monitor gratuito do Sentry no endpoint público do catálogo.

## 11. Ambientes, build e release

- **Supabase**: projetos separados `dev` e `prod` (staging opcional via Branching); migrações versionadas no repositório (`supabase/migrations`); `supabase db lint` + testes de RLS no CI.
- **EAS**: perfis `development` (dev client, distribuição interna, UDIDs registrados), `preview` (TestFlight/internal testing), `production`.
  Builds iOS e Android na nuvem (Windows sem Mac); `eas submit` para as lojas.
- **EAS Update**: canais por ambiente; `runtimeVersion` por política de `appVersion`; OTA só para correções/textos/planos — nunca features novas nem permissões (Apple 2.5.2 / DPLA 3.3.1(B); Play "interpreter" exception).
- **CI (GitHub Actions)**: typecheck, lint, testes unitários (Jest + RNTL), testes de RLS contra Supabase local, `expo-doctor`; E2E com Maestro em nuvem quando houver telas estáveis.
- **Versionamento**: semver do app; `plan_version` para conteúdo; changelog de migrações.
- **Segredos**: chaves só em EAS Secrets/Supabase Vault; o app contém apenas a `anon key` (pública por definição — RLS é a barreira).

## 12. Metas não funcionais (RECOMENDAÇÃO)

| Meta | Valor alvo | Como medir |
|---|---|---|
| Início a frio (Android de entrada, 3 GB RAM) | < 2,5 s até tela "Hoje" | Sentry app start / medição manual |
| Abrir capítulo (incl. Sl 119) | < 150 ms após toque | spike A1 + tracing |
| Uso de memória em leitura | < 200 MB | Android Studio profiler no dev build |
| Tamanho do app | < 60 MB (com 2 traduções empacotadas) | EAS build artifacts |
| Acessibilidade | Dynamic Type/fontScale até 200% sem quebra; VoiceOver/TalkBack navegável; contraste AA | checklist por tela (WCAG 2.2 AA / NBR 17060) |
| Plataformas mínimas | iOS 16.4+ (mínimo do Expo SDK 56+), Android 7+ (minSdk 24 do RN) — revisar com o parque real | Expo/RN docs |
| Disponibilidade offline | Leitura + progresso 100% offline; sync em ≤ 30 s após reconexão | testes de modo avião |

## 13. Riscos técnicos e mitigação (top 8)

| Risco | Mitigação |
|---|---|
| RLS mal configurada expõe dados sensíveis | RLS em tudo + advisor zero ERROR no CI + testes A/B/anon; revisão humana de toda migração |
| Sync offline com bugs (perda/duplicação) | Protocolo simples; IDs de cliente; testes de modo avião em 2 aparelhos; `notes_conflicts` |
| Exclusão de conta com Apple falha | Spike no Sprint 1 (criar → excluir → recriar); fallback documentado (orientar revogação manual) |
| UIScene/Xcode 27 no RN/Expo | Checkpoint fev/2027; fixar imagem EAS em Xcode 26 até resolver |
| Hermes V1 (memória) em Android de entrada | Ficar em patch estável; teste de memória por release |
| Highlights em spans no Android com artefatos | Spike A1; fallback com overlay |
| Licença de texto mal aplicada | Tela de atribuição obrigatória; lista de bloqueio no pipeline; textos licenciados só com contrato |
| Dependência do Expo Push (sem SLA) | Guardar token nativo; migrar a FCM/APNs se necessário; push só para comunicados |

## 14. O que esta arquitetura NÃO decide (Product Brain)

Traduções prioritárias e aceitação de tradução aberta como padrão; se leitura sem conta é aceitável; se planos têm dias fixos no calendário ou ritmo pessoal;
se "reflexões" existem além de notas privadas; se haverá áudio; marca e entidade dona (afeta domínio e identificadores); texto do consentimento; política de retenção.
Lista completa em `../research/OPEN_QUESTIONS_FOR_PRODUCT_BRAIN.md`.

## 15. Fontes

Pesquisas por frente com URLs e datas: `../research/MOBILE_STACK_RESEARCH.md`, `../research/BACKEND_RESEARCH.md`, `../research/OPEN_PT_BIBLE_TEXTS.md`,
`../research/BIBLE_CONTENT_OPTIONS.md`, `../research/STORES_LEGAL_RESEARCH.md`.
