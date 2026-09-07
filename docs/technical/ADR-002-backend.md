# ADR-002 — Backend, dados, auth, offline, push e observabilidade

- **Status:** PROPOSTA (aguarda aprovação do fundador e do Product Brain)
- **Data:** 2026-09-07
- **Decisores:** Davi (fundador), Product Brain (ChatGPT), Principal Mobile Engineer (Claude)
- **Pesquisa de base:** `../research/BACKEND_RESEARCH.md` (≈100 fontes, acessadas em 2026-09-07)
- **Depende de:** ADR-001 (stack mobile). As escolhas abaixo assumem React Native + Expo; a seção "O que mudaria a decisão" cobre o cenário Flutter.

## Contexto

V1 precisa de: auth; perfil; catálogo de planos versionado; inscrição em plano; progresso de leitura por dia/leitura que
funcione **offline** e sincronize depois; notas/destaques privados; lembrete diário; push remoto ocasional; analytics de produto;
crash reporting; exclusão de conta e exportação de dados. Escala alvo: 3.000 usuários (confortável até 10–20 mil).
Sem pagamentos. Grupos/social/IA não aprovados — apenas preservar opcionalidade barata.

Restrição regulatória (FATO): pela LGPD, **convicção religiosa é dado pessoal sensível** (art. 5º, II); tratamento exige base do
art. 11 — em V1, consentimento específico e destacado. Transferência internacional exige mecanismo da Resolução CD/ANPD 19/2024
(cláusulas-padrão), salvo destino adequado; a **Resolução CD/ANPD 32/2026 (26/01/2026) reconheceu a União Europeia/EEE como adequada**;
**não há adequação para os EUA**. Consequência: dados primários no Brasil; serviços satélite preferencialmente na UE.

Restrição de loja (FATO): Apple 5.1.1(v) exige exclusão de conta iniciada no app e, se houver Sign in with Apple, revogação dos tokens;
Google Play exige exclusão no app e por link web. Apple 4.8 exige Sign in with Apple (ou equivalente) quando existe login de terceiros (ex.: Google).

## Opções consideradas (estado em 2026-09-07)

| Candidato | Região Brasil | Offline nativo | Auth | Lock-in | Veredito |
|---|---|---|---|---|---|
| **Supabase** (Postgres, Auth, RLS, Storage, Edge Functions) | **Sim** — `sa-east-1` (São Paulo) para DB/Auth/Storage | Não (construir sync ou PowerSync) | Nativo: e-mail OTP, Apple/Google por ID token, anônimo→vinculado, MFA | Baixo (Postgres, `pg_dump`) | **Recomendado** |
| **Firebase** (Firestore, Auth, Functions, FCM, Crashlytics) | Firestore/Functions/Storage em `southamerica-east1`; **Auth e Analytics globais, sem seleção** | Sim em Android/iOS/Flutter e via `@react-native-firebase`; **não** no SDK JS em React Native (issue #7947 aberta desde 2024-01) | Nativo; `accounts.revokeToken` para Apple | Alto (NoSQL, regras, export proprietário) | **Segundo colocado** |
| Convex | Não (US/EU) | Otimista | Terceiros | Alto | Não (dado sensível fora do BR) |
| Appwrite Cloud | Não | Não | Nativo | Médio | Não |
| Nhost (Postgres + Hasura) | Não verificado | Não | Nativo | Médio | Reserva |
| PocketBase (self-host, SQLite) | Onde hospedarmos | Não | Básico | Baixo | Não — transfere operação/segurança ao time pequeno |
| InstantDB | — | Sim | — | — | **Eliminado** (encerra em 31/08/2027; time foi para a OpenAI) |
| AWS Amplify Gen 2 | Parcial | DataStore incerto | Cognito | Alto | Não (overhead desproporcional) |
| Neon/Turso + backend próprio (Hono/Workers) | Neon tem São Paulo | Construir | Construir/integrar | Baixo | **Não agora** — é a rota de saída do Supabase (schema Postgres migra 1:1) |

## Decisão (proposta)

1. **Supabase, plano Pro (US$ 25/mês), região `sa-east-1` (São Paulo)** como único backend de V1: Postgres + Auth + RLS + Storage + Edge Functions (+ `pg_cron` para limpezas). Free plan não serve para produção (pausa após 1 semana de inatividade; sem backups; logs de 1 hora).
2. **Auth = Supabase Auth**: e-mail **OTP de 6 dígitos** como método principal (magic link sofre com deep link e scanners de e-mail);
   **Sign in with Apple** e **Google** via ID token nativo; sessão anônima **criada sob demanda** (só na primeira ação que exige nuvem) e
   vinculada depois sem trocar o `user_id`. SMTP próprio obrigatório (o embutido limita a 2 e-mails/hora) — Resend ou equivalente com domínio da entidade.
   Sem SMS/WhatsApp em V1 (custo ≈ US$ 0,11/verificação; revisar se a base não tiver e-mail).
3. **Offline/sync = protocolo próprio e simples** ("outbox + last-write-wins + pull incremental"), não PowerSync nem Realtime em V1:
   IDs UUID gerados no cliente; `updated_at` (servidor), `client_updated_at`, `deleted_at` (tombstone); `upsert` idempotente por `id`;
   pull por `updated_at > cursor`. Progresso como eventos/estado idempotente por `(enrollment, day, reading)`. PowerSync (região BR, Pro US$ 49/mês)
   fica como upgrade natural se grupos/realtime forem aprovados — barato de adotar porque o esquema já é "sync-ready".
4. **Lembrete diário = notificação local** (`expo-notifications`, gatilho diário, **modo inexato**; não declarar `USE_EXACT_ALARM`).
   **Push remoto ocasional = Expo Push Service** (grátis, 600/s, sem SLA) guardando também o token nativo em tabela `devices` para migrar a FCM/APNs direto se necessário. OneSignal descartado (plano gratuito cai para <1.000 MAU em set/out 2026).
5. **Observabilidade mínima = Sentry (org na região UE) + PostHog (host UE, eventos agregados, sem session replay) + logs do Supabase.**
   Sem Google Analytics/Firebase Analytics (sem seleção de localização, fora do DPST) e sem SDKs de anúncios/atribuição.
6. **Storage = Supabase Storage** (bucket privado, políticas por `user_id`), imagens redimensionadas no device (sem transformações pagas).
7. **Backups**: diários do Pro (7 dias) + dump semanal cifrado off-site + teste de restore trimestral. PITR (US$ 100/mês) não é proporcional em V1.
8. **Realtime**: não em V1. Adicionar depois é mudança só de cliente (Pro inclui 500 conexões / 5 M mensagens).
9. **Exclusão de conta** implementada em Edge Function com `service_role`: revogar token Apple (REST API da Apple, usando refresh token guardado
   cifrado no Vault desde o cadastro) → apagar objetos de Storage → `auth.admin.deleteUser` com cascata → registrar `deletion_requests` sem PII.
   O Supabase **não** faz a revogação Apple automaticamente (issue #1308 fechada como "not planned"); é código nosso e deve ser testado fim-a-fim.
10. **Exportação de dados** (LGPD art. 18) em Edge Function que gera JSON do usuário.

Modelo de dados V0, exemplos de RLS e armadilhas: ver `ARCHITECTURE_V0.md` e a seção 9 da pesquisa.

## Por quê

1. **Residência de dados no Brasil para DB, Auth e Storage** (FATO: região São Paulo disponível). No Firebase, Auth e Analytics são globais.
   Para dado sensível sob LGPD isso reduz a superfície de "transferência internacional" ao mínimo.
2. **Relacional + RLS encaixa em "dados pessoais hoje, grupos depois"**: `group_id` nulo e uma tabela de membership ampliam políticas sem mover linhas.
   No Firestore a árvore de coleções precisa ser decidida cedo e regras têm limite de `get()` por avaliação.
3. **Portabilidade**: SQL padrão; a rota de saída (Neon + backend mínimo) é barata. Firestore exporta em formato próprio e cobra por documento.
4. **Compatível com Expo sem código nativo**: SDK JS puro funciona em development builds e até no Expo Go. Firebase em RN exige `@react-native-firebase`
   (dev build) e, mesmo assim, o cache offline do Firestore só existe no caminho nativo.
5. **Custo proporcional**: Pro inclui backups, 100 mil MAU, 8 GB. Firebase sairia ~US$ 20–30/mês mais barato — irrelevante frente ao risco de reversão.

Custo mensal estimado (3 mil MAU / ~1 mil DAU): **≈ US$ 45–95/mês** (Supabase Pro 25 + SMTP ~20 no lançamento + Sentry/PostHog free + EAS Starter 19 se necessário + Apple ~8).
Cenário Firebase: ≈ US$ 25–70/mês. A diferença não decide.

## Evidência contrária (registrada de propósito)

1. **Firestore entrega offline "de graça"** em Android/iOS/Flutter e via RNFirebase; no Supabase o sync é código nosso (~1–2 semanas, ~300–500 linhas, disciplina de IDs/tombstones/cursor). Se o outbox for mal feito, o bug aparece na função mais visível do app.
2. **RLS é o ponto de falha sistêmico do Supabase.** CVE-2025-48757: 170 projetos gerados por IA expostos por RLS ausente (EVIDÊNCIA secundária). O Security Advisor existe, mas é opt-in. Mitigação obrigatória: RLS em toda tabela, lint/advisor com zero ERROR no CI, testes automatizados de autorização (A não lê B; anon não escreve).
3. **Exclusão de conta com Apple é manual e frágil** (issues #1308 e #2049). Requisito de loja, não "nice to have" — testar ciclo criar → excluir → recriar.
4. **Confiabilidade**: incidente plataforma-wide em 24/11/2025 (~30 min) e série de incidentes em jul/2026 (FATO via status page); quedas multi-dia citadas por agregadores não verificadas.
5. **DPA do Supabase não menciona LGPD** (só GDPR/Suíça/EUA); relatórios SOC 2 só a partir do plano Team (US$ 599). Perguntar ao jurídico se as cláusulas-padrão da ANPD precisam ser anexadas e se o Supabase aceita.
6. **SMTP embutido inutilizável em produção** (2 e-mails/hora) → mais um fornecedor desde o dia 1.

## O que mudaria a decisão

- **ADR-001 virar Flutter e o time querer zero código de sync** → Firebase (Firestore offline + FCM + Crashlytics) passa a primeiro, com Analytics desligado e Auth global documentado no relatório de impacto (RIPD).
- **Jurídico exigir operador com cláusulas-padrão da ANPD assinadas e o Supabase recusar** → Google Cloud (verificar apêndice LGPD do DPA) ou self-host no Brasil (custo operacional).
- **Grupos/feed aprovados para V1** → PowerSync (Pro, região BR) sobre o mesmo Postgres; Realtime entra.
- **Base sem e-mail** → SMS/WhatsApp OTP (custo) — não muda o BaaS.
- **Novo incidente grave antes do lançamento** → migrar para Neon (São Paulo) + Edge/Workers com Better Auth mantendo o schema.

## Consequências

Positivas: um fornecedor para dados/auth/storage/funções; Postgres portável; RLS auditável; residência BR; custo previsível.
Negativas: sync é responsabilidade nossa; revogação Apple é código nosso; disciplina de RLS obrigatória (CI); SMTP externo; DPA sem LGPD (pendência jurídica).

## Pré-requisitos antes do primeiro usuário real (resumo; checklist completo em `SECURITY_V0.md`)

MFA no dashboard; RLS em todas as tabelas + advisor zero ERROR + testes de autorização; `service_role` só em Edge Functions; SMTP próprio com SPF/DKIM;
sessão em `LargeSecureStore`; exclusão e exportação testadas; `consents` gravado antes de sincronizar nota/progresso; backups + restore testado;
Sentry/PostHog na UE sem PII; DPA aceito; encarregado nomeado; runbook de incidente (3 dias úteis).

## Spikes descartáveis recomendados para o Sprint 1

1. Protótipo do outbox/LWW/pull com `expo-sqlite` + PostgREST (2 devices, modo avião, conflito de nota).
2. Ciclo Sign in with Apple: cadastro → guardar refresh token → excluir conta com revogação → recriar conta (issue #2049).
3. Harness de testes de RLS (usuário A vs B, anon, anônimo) rodando no CI com `supabase db lint`.
4. E-mail OTP com Resend em domínio da entidade (SPF/DKIM) medindo tempo de entrega.
5. Notificação local diária inexata em Android 14/16 físico (sem `SCHEDULE_EXACT_ALARM`).

## Confiança

**70%**. O risco não está na capacidade do Supabase para 3 mil usuários, e sim em três coisas que dependem de disciplina nossa: RLS, sync offline e exclusão de conta com Apple.
