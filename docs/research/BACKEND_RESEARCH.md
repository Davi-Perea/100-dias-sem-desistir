<!-- Pesquisa bruta da Frente B (Sprint 0), produzida por agente de pesquisa em 2026-09-07 e revisada por amostragem: preços/limites do Supabase (Free 50k MAU e 500 MB; Pro US$ 25 com backups diários de 7 dias, PITR US$ 100/7 dias, logs 7 dias), região sa-east-1, issue firebase-js-sdk#7947 (persistência offline do Firestore em RN, aberta desde 2024-01-13), preços do PowerSync (Free 50 clientes simultâneos; Pro desde US$ 49), issue supabase/auth#1308 (revogação de token Apple, fechada como "not planned"), Resolução CD/ANPD 32/2026 (adequação UE) e encerramento do InstantDB (31/08/2027) foram reverificados. A decisão consolidada está em ../technical/ADR-002-backend.md. -->

# Sprint 0 — Frente B: Backend / Data — Relatório de Pesquisa

**Data:** 2026-09-07 · **Autor:** Frente B (Technical Architect, pesquisa) · **Status:** rascunho para decisão, não é decisão
**Convenções de rotulagem:** `[FATO]` = verificado em fonte primária (URL + acessado em 2026-09-07) · `[EVID]` = evidência secundária (blog, agregador, issue) · `[INF]` = inferência minha a partir de fatos · `[HIP]` = hipótese não testada · `[REC]` = recomendação · `NÃO VERIFICADO` = não consegui confirmar em fonte primária.
Referências `[S1]`, `[S2]`… apontam para a seção 14 (Fontes). Preços em USD, sem impostos (IOF/ISS não considerados).

---

## 1. Resumo executivo

**Recomendação principal:** **Supabase (plano Pro, região `sa-east-1` São Paulo)** como BaaS único de V1: Postgres + Auth + RLS + Storage + Edge Functions, com **sync offline "simples e nosso"** (SQLite local + outbox + last-write-wins + pull incremental por `updated_at`) e **sem PowerSync/Realtime em V1**. `[REC]`

**Segundo colocado:** **Firebase (Blaze; Firestore + Auth + Functions em `southamerica-east1`, FCM, Crashlytics)** — vence se a Frente A escolher **Flutter** *e* o time quiser cache offline "de graça" sem escrever protocolo de sync, aceitando lock-in NoSQL e o fato de que Auth/Analytics não têm residência selecionável. `[REC]`

**Confiança: 70%.** Não é 85%+ porque (a) o cache offline do Firestore é objetivamente mais "pronto" que qualquer coisa no ecossistema Supabase, (b) a epidemia de RLS mal configurado em apps "vibe-coded" (CVE-2025-48757, 170 apps) é exatamente o risco de um time pequeno com dev assistido por IA, e (c) o Supabase não revoga tokens do Sign in with Apple ao excluir conta — tem que ser feito à mão.

**Razões da escolha (resumo):**
1. **Residência de dados no Brasil para DB, Auth e Storage** `[FATO S2, S4]` — o Supabase hospeda "Database, Auth, and Storage" na região AWS escolhida, e São Paulo (`sa-east-1`) existe. No Firebase, Firestore/Functions/Storage podem ir para São Paulo `[FATO S34, S35, S36]`, mas **Authentication e Google Analytics são serviços globais sem seleção de localização** `[EVID S51, S102]`. Para um app cujo dado é sensível (convicção religiosa, LGPD art. 5º, II), isso pesa.
2. **Modelo relacional + RLS** se encaixa em "dados pessoais hoje, grupos depois sem migração" (FK `group_id` nullable + tabela de membership; ver §9). Firestore exige decidir a árvore de coleções cedo, e regras de segurança têm limite de 10 `get()/exists()` por avaliação `[FATO S48]`.
3. **Portabilidade**: `pg_dump` e SQL padrão; Firestore exporta em formato próprio para GCS, cobrando 1 leitura por documento `[FATO S49]`.
4. **Compatível com Expo Go e Flutter sem código nativo** (SDK JS/Dart puro; `supabase_flutter` 2.17.x) `[FATO S20, S32]`. Firebase no Expo exige `@react-native-firebase` + development build (não roda no Expo Go) `[FATO S41]`, e o SDK JS do Firebase **não persiste Firestore offline em React Native** (cai para cache em memória; issue aberta desde jan/2024) `[FATO S39, S40]`.
5. **Custo proporcional**: Supabase Pro US$ 25/mês já inclui backups diários (7 dias), 100 k MAU, 8 GB disco `[FATO S1]`. Firebase sairia mais barato em dólares (~US$ 5–15/mês) `[INF]`, mas a diferença é irrelevante frente ao risco de reversão.

**Custo mensal estimado (3 k MAU, ~1 k DAU):** Arquitetura A (Supabase) ≈ **US$ 45–95/mês** (US$ 25 Supabase Pro + SMTP + crash/analytics em free tiers + EAS Starter US$ 19 se Expo) · Arquitetura B (Firebase) ≈ **US$ 25–70/mês**. Detalhe em §10.

---

## 2. Requisitos derivados do produto + LGPD

### 2.1 Requisitos funcionais/técnicos (V1)
| # | Requisito | Implicação para backend |
|---|---|---|
| R1 | Leitura funciona **sem login** (loja: Apple 5.1.1(v) "let people use it without a login" `[FATO S88]`) | Conteúdo dos planos e texto bíblico devem ser lidos por `anon` ou empacotados no app; progresso local antes de login; **guest → link account** sem perder dados. |
| R2 | Progresso por dia/leitura **offline** e sincronizado depois | Chave idempotente (`user_id, plan_version_id, day_no, reading_no`), LWW, IDs gerados no cliente (UUID v4/v7), tombstones. |
| R3 | Notas/highlights privados | Mesma mecânica; texto curto; referência canônica USFM (livro 3 letras + capítulo + faixa de versículos). |
| R4 | Catálogo de planos versionado | `plans` + `plan_versions` imutáveis após publicação; inscrição aponta para a versão. |
| R5 | Lembrete diário local + push remoto ocasional | Notificação local agendada (sem backend); push remoto: tokens por dispositivo + função de envio. |
| R6 | Exclusão de conta completa (Apple 5.1.1(v), Google Play) `[FATO S88, S91]` | Fluxo server-side: revogar token Apple → apagar storage → apagar `auth.users` (cascade) → registrar `deletion_requests`. |
| R7 | Exportação de dados (LGPD art. 18, V — portabilidade) `[FATO S96]` | Endpoint/Edge Function que gera JSON do usuário. |
| R8 | Escala: 3 k → 10–20 k usuários | Qualquer candidato aguenta; o gargalo é operação, não throughput. |

### 2.2 LGPD — dado sensível
- `[FATO S96]` LGPD art. 5º, II: "dado pessoal sobre origem racial ou étnica, **convicção religiosa**, opinião política…" é dado pessoal sensível. Art. 11, I: tratamento com "consentimento específico e destacado, para finalidades específicas"; art. 11, II lista hipóteses sem consentimento (obrigação legal, exercício regular de direitos, proteção da vida, tutela da saúde etc.).
- `[INF]` Um app bíblico de uma igreja específica, com notas/reflexões e progresso de leitura por pessoa identificada, **trata dado que revela convicção religiosa**. A base legal mais defensável em V1 é **consentimento específico e destacado** (art. 11, I) — registrado com versão de política, timestamp e texto (tabela `consents`, §9). `[HIP]` "Execução de contrato" (art. 7º, V) é discutível para dado sensível; **validar com jurídico**.
- `[FATO S96]` Art. 18: direitos de confirmação, acesso, correção, anonimização/bloqueio/eliminação, **portabilidade**, informação sobre compartilhamento, revogação do consentimento. Art. 46: medidas técnicas e administrativas de segurança. Art. 48: comunicação de incidente à ANPD e ao titular.
- `[FATO S98]` Resolução CD/ANPD nº 15/2024: comunicação de incidente em **3 dias úteis** a partir do conhecimento; dados sensíveis são critério de "risco relevante".
- **Transferência internacional** `[FATO S97]`: Resolução CD/ANPD nº 19/2024 (23/08/2024) regulamenta os mecanismos: decisão de adequação, **cláusulas-padrão contratuais (CPC) da ANPD**, cláusulas-padrão equivalentes, cláusulas específicas e normas corporativas globais. O período de adaptação das CPC **terminou em 23/08/2025** `[FATO S97-MB]`. Escritório Mayer Brown lista explicitamente "armazenamento em nuvem com servidores localizados no exterior" como exemplo de transferência `[EVID S97-MB]`.
- `[FATO S97-gov]` **Resolução CD/ANPD nº 32/2026 (26/01/2026): a União Europeia (+ EEE) foi reconhecida como adequada** — transferências Brasil↔UE dispensam CPC. **Não há decisão de adequação para os EUA** `[FATO S97-gov]`.
- `[INF]` Consequência prática: (1) hospedar DB/Auth/Storage em **São Paulo** elimina a transferência do dado primário; (2) serviços satélite (analytics, crash, e-mail, push) devem preferir **região UE** (adequação) a EUA; (3) mesmo com dados em São Paulo, um operador estrangeiro (Supabase Inc., Google) com acesso remoto pode caracterizar transferência — **NÃO VERIFICADO** se a ANPD trata acesso remoto de suporte como transferência; `[REC]` assinar DPA + anexar CPC-ANPD se o jurídico exigir; **o DPA do Supabase não menciona Brasil/LGPD** (só GDPR, Suíça, EUA) `[FATO S5]`; o DPA do Google Cloud remete a "Specific Privacy Laws" em apêndice não lido `[FATO S44]` — NÃO VERIFICADO se LGPD está listada.
- Outras obrigações mapeadas: criptografia em repouso/trânsito (Supabase AES-256 + TLS `[FATO S4]`; Google idem, padrão GCP — NÃO VERIFICADO nesta pesquisa), controle de acesso (RLS/Rules), logs de auditoria (Supabase: logs 7 dias no Pro `[FATO S1]` — insuficiente para trilha de auditoria de acesso a dado sensível; `[REC]` tabela `audit_log` própria para ações administrativas), retenção (política: apagar contas anônimas > 30 dias; excluir tudo em ≤ 30 dias após pedido), exportação (R7).

---

## 3. Comparativo BaaS

### 3.1 Tabela (todos os valores `[FATO]` salvo indicação; acessado em 2026-09-07)
| Critério | Supabase `[S1,S2,S3,S4]` | Firebase `[S33–S38]` | Convex `[S74]` | Appwrite Cloud `[S75]` | Nhost `[S76]` | PocketBase `[S78]` | InstantDB `[S77]` | Amplify Gen2 `[S73]` | Neon/Turso + backend próprio `[S79–S81]` |
|---|---|---|---|---|---|---|---|---|---|
| Região Brasil | **Sim** (`sa-east-1`) para DB, Auth, Storage; Edge Functions podem ser fixadas em `sa-east-1` `[S16]` | Firestore/Functions/Storage: **sim** (`southamerica-east1`, regional, Tier 2 p/ Functions); **Auth e Analytics: globais, sem seleção** `[EVID S51]` | **Não** (US East, EU West; EU +30% no pago) | **Não** (FRA, NYC, SYD, SFO, SGP, TOR) | NÃO VERIFICADO | Onde você hospedar (VPS no Brasil) | — | AWS `sa-east-1` (Cognito/AppSync) — NÃO VERIFICADO disponibilidade de todos os serviços | Neon: **sim** (`aws-sa-east-1`); Turso: NÃO VERIFICADO; Workers: edge global |
| Preço base | Free US$ 0 (pausa após 1 semana inativo, 2 projetos); **Pro US$ 25/mês**; Team US$ 599 | Spark US$ 0; **Blaze pay-as-you-go** (free tiers embutidos) | Free; Pro US$ 25/dev/mês | Free; Pro desde US$ 25/mês | Starter US$ 0; Pro desde US$ 25/mês | US$ 0 + VPS | **Encerrando** (serviço até 31/08/2027, time foi para OpenAI) | Pay-as-you-go | Neon Free/Launch (US$ 0.106/CU-h + US$ 0.35/GB-mês); Workers US$ 5/mês |
| Auth | Nativo (e-mail OTP/magic link, Apple/Google por ID token, anônimo, phone/WhatsApp via Twilio, MFA TOTP; MFA phone add-on US$ 75/mês `[EVID S31]`) | Auth 50 k MAU grátis; SMS cobrado por envio (BR ≈ US$ 0,05 `[EVID S53]`); anônimo + link; cleanup automático (Identity Platform) | Terceiros (Clerk etc.) | Nativo | Nativo (Hasura Auth) | Nativo (básico) | — | Cognito (10 k MAU grátis; Lite US$ 0,0055/MAU) | Construir/integrar (Better Auth, Clerk) |
| DB | Postgres (500 MB free; 8 GB no Pro + US$ 0,125/GB) | Firestore NoSQL (1 GiB, 50 k leituras/dia, 20 k escritas/dia grátis; depois US$ 0,03/100 k leituras, US$ 0,09/100 k escritas em `us-central1`; **São Paulo NÃO VERIFICADO**) `[S52]`; SQL Connect (Postgres via Cloud SQL, desde US$ 9,37/mês; SDKs Kotlin/iOS/Flutter/web — **sem RN**) `[S42]` | Doc store proprietário | MariaDB-like (docs) | Postgres + Hasura | SQLite embutido | — | DynamoDB via AppSync (US$ 4/M ops) | Postgres (Neon) / libSQL (Turso) |
| Offline nativo | Não (SDK não tem cache offline; construir ou PowerSync/Legend/Watermelon) | **Sim** (Android/iOS/Flutter e RNFirebase nativo); **não** no SDK JS em RN `[S39,S40]` | Otimista, não offline-first real (NÃO VERIFICADO em detalhe) | Não | Não | Não | Sim (era o forte) | DataStore (status em Gen 2 NÃO VERIFICADO) | Construir |
| Backups | Pro: diário, 7 dias; PITR US$ 100/mês (7 d) `[S3]`; **Storage não incluso** | Agendados (diário/semanal, até 14 semanas) + PITR 7 dias (por GiB-mês, desligado por padrão) `[S37,S38]` | Pro: diário | Pro: diário 7 dias | Pro: 7 dias; PITR desde US$ 100 | Copiar `pb_data` | — | Serviços AWS | Neon: restore 6 h (free) / 7 d (Launch) |
| Compliance | SOC 2 Type 2, ISO 27001, HIPAA (relatórios só Team/Enterprise); DPA self-serve c/ SCCs UE; **sem LGPD no DPA** `[S4,S5]` | Cloud DPA do Google; Firebase DPST cobre serviços core (Crashlytics incluso; **Analytics excluído**) `[S43,S44]` | NÃO VERIFICADO | NÃO VERIFICADO | NÃO VERIFICADO | Você | — | AWS DPA | Neon/Cloudflare DPAs — NÃO VERIFICADO |
| Expo Go | **Sim** (SDK JS puro) | Não (RNFirebase exige dev build) `[S41]` | Sim | Sim | Sim | Sim | — | Sim (Amplify JS) | Sim |
| Flutter | `supabase_flutter` 2.17.2 `[S32]` | FlutterFire (1ª classe) | Beta/comunidade (NÃO VERIFICADO) | SDK oficial | SDK oficial | Comunidade | — | Amplify Flutter | Você |
| Lock-in | Baixo (Postgres) | **Alto** (NoSQL + Rules + export proprietário) | Alto | Médio | Médio (Hasura) | Baixo (SQLite) | — | Alto | Baixo |

### 3.2 Análise por candidato (curta)
- **Supabase** — único com residência BR para DB+Auth+Storage e Postgres portável. Fraquezas verificadas: SMTP embutido limitado a **2 e-mails/hora** (custom SMTP obrigatório) `[FATO S6]`; sem revogação Apple automática (issue #1308 "closed as not planned") `[FATO S27]`; free plan pausa projetos inativos `[FATO S1]`; relatórios SOC 2 só a partir do Team `[FATO S4]`; incidentes 2025–2026 (§12).
- **Firebase** — melhor "offline grátis" (nativo/Flutter), FCM e Crashlytics grátis, revogação Apple via API (`accounts.revokeToken`, só Apple) `[FATO S46]`. Fraquezas: Auth/Analytics globais `[EVID S51]`; lock-in; SDK JS sem persistência em RN `[FATO S40]`; Remote Config passará a cobrar fetches a partir de set/2026 no Blaze (segundo a página de preços) `[FATO S33]`; Firestore São Paulo é regional (sem multi-região SA) `[FATO S34]`.
- **Convex** — ótimo DX, mas sem região BR, EU +30%, região imutável `[FATO S74]`; offline-first não é o foco. Descartado para dado sensível BR.
- **Appwrite Cloud** — sem região SA `[FATO S75]`. Descartado.
- **Nhost** — Postgres+Hasura+Auth por US$ 25; regiões NÃO VERIFICADO; ecossistema menor; GraphQL/Hasura é camada extra a aprender. Reserva.
- **PocketBase** — binário único + SQLite, backup = copiar `pb_data`, sem HA `[FATO S78]`. Dá residência BR barata (VPS), mas transfere para o time pequeno backups, patching, uptime e segurança — contra "reuse first".
- **InstantDB** — **encerrando** (serviço até 31/08/2027) `[FATO S77]`. Eliminado.
- **AWS Amplify Gen 2** — Cognito barato (10 k MAU grátis, permanente) `[FATO S73]`, mas AppSync/DynamoDB/IAM/CDK é overhead desproporcional para 3 k usuários e um time pequeno. Eliminado.
- **Neon/Turso + backend próprio (Hono/Workers)** — Neon tem São Paulo `[FATO S79]`, Workers custam US$ 5/mês `[FATO S81]`. **Por que NÃO agora:** teríamos de construir/integrar auth (sessões, OTP, Apple/Google, anônimo→link, exclusão), autorização por linha, storage assinado, admin, rate limiting, CAPTCHA, backups de storage, logs — tudo que o Supabase entrega pronto e testado; para um time pequeno com IA, isso é superfície de segurança e semanas de trabalho sem valor de produto. Fica como **rota de saída** (o schema Postgres migra 1:1 para Neon).

### 3.3 As 10 perguntas anti-overengineering — BaaS
| Pergunta | Supabase | Firebase |
|---|---|---|
| Precisamos? | Sim (auth, dados, storage, funções) | Sim |
| Existe pronto? | Sim | Sim |
| Integrar em vez de construir? | Sim — não construir backend próprio | Sim |
| Mobile-adequado? | Sim (JS/Dart puro; Expo Go OK) | Sim, mas RN exige dev build |
| Dívida técnica? | Baixa (Postgres) | Média/alta (modelo NoSQL) |
| Escala p/ 3 k? | Sim (Micro: 1 GB RAM, 200 conexões pooler `[S17]`) | Sim |
| Overengineering? | Não, se ficarmos sem Realtime/PowerSync em V1 | Não |
| Risco lojas? | Exclusão de conta + revogação Apple: **manual** | API de revogação existe |
| Risco privacidade? | Baixo (BR); DPA sem LGPD | Médio (Auth/Analytics globais) |
| Caro mudar depois? | Baixo (pg_dump) | Alto |

---

## 4. Auth

### 4.1 Comparativo
| Opção | Fatos verificados | Encaixe |
|---|---|---|
| **Supabase Auth nativo** | E-mail OTP (6 dígitos via `{{ .Token }}` no template; `verifyOtp type:'email'`; 1 pedido/60 s; expira em 1 h) `[FATO S21]`; Apple/Google por `signInWithIdToken` `[FATO S8,S9]`; anônimo + `updateUser`/`linkIdentity` mantendo o mesmo `user_id`; claim `is_anonymous` p/ RLS; 30 req/h/IP `[FATO S7,S6]`; MFA TOTP/phone com `aal` em RLS `[FATO S11]`; CAPTCHA hCaptcha/Turnstile só em sign-in/sign-up/reset, **sem guia mobile** `[FATO S12]`; MAU cobrado por login/refresh (US$ 0,00325 acima de 100 k) `[FATO S13]` | **Recomendado** — zero serviço extra; RLS usa `auth.uid()` direto |
| **Firebase Auth** | 50 k MAU grátis; anônimo + `linkWithCredential`; cleanup automático de anônimos (>30 dias) não conta em billing `[FATO S45]`; revogação Apple via `accounts.revokeToken` (aceita `authorization_code`) `[FATO S46]`; SMS BR ≈ US$ 0,05 `[EVID S53]` | Bom se Firebase for o BaaS |
| **Firebase Auth como 3rd-party no Supabase** | Suportado (também Clerk, Auth0, Cognito, WorkOS); exige JWT assimétrico com `kid`; US$ 0,00325/MAU third-party acima da cota; "não é possível desabilitar o Supabase Auth" `[FATO S14]` | Só faz sentido para reaproveitar base existente. Não é o caso. |
| **Clerk** | Free 50 k MRU; Pro US$ 25/mês; `@clerk/expo` com `expo-secure-store`; componentes nativos (`AuthView`, Apple/Google) em **beta** e exigem dev build `[FATO S71]` | Custo/complexidade extra sem ganho para V1 |
| **Better Auth** | Exige **servidor próprio Node/Bun** (ou Expo API Routes); `expoClient` guarda cookies em SecureStore; idToken nativo só google/apple/facebook `[FATO S72]` | Contradiz "não construir backend" |

### 4.2 Fluxos (mobile)
- **E-mail OTP vs magic link** `[INF]`: em mobile, magic link exige deep link (`scheme://`) e sofre com scanners corporativos de e-mail que "clicam" no link; OTP de 6 dígitos não depende de deep link e permite autofill. O Supabase documenta os dois sem preferir `[FATO S21,S22]`. `[REC]` **OTP por e-mail** como método principal, com SMTP próprio (Resend: 3 000/mês e 100/dia grátis; Pro US$ 20/50 k `[FATO S99]`). Atenção: o limite de 100/dia do Resend free estoura num dia de lançamento para uma igreja de 3 k pessoas — orçar Pro (US$ 20) no mês de lançamento.
- **Sign in with Apple** (obrigatório se houver Google Sign-In: guideline 4.8 `[FATO S88]`): nativo via `expo-apple-authentication` / `sign_in_with_apple` → `signInWithIdToken` com nonce; para fluxo **só nativo**, o Supabase exige apenas o Bundle ID em "Client IDs" — a rotação semestral da secret key só se aplica ao fluxo OAuth web `[FATO S8-RN]`. **Porém**, para revogar tokens na exclusão (abaixo) você precisa do `.p8` de qualquer jeito `[INF]`.
- **Google**: `@react-native-google-signin/google-signin` com **webClientId** (mesmo em nativo) → `signInWithIdToken` `[FATO S9]`; Flutter: `google_sign_in` `[FATO S32]`.
- **Telefone/WhatsApp OTP no Brasil**: Supabase suporta Twilio, Twilio Verify, MessageBird, Vonage, Textlocal; WhatsApp só via Twilio/Twilio Verify `[FATO S15]`. Custo: Twilio Verify US$ 0,05 por verificação bem-sucedida + canal; SMS para Brasil US$ 0,0599/msg `[FATO S94]`; WhatsApp: template de autenticação para BR entre US$ 0,0068 e US$ 0,0225 conforme fonte secundária — **conflitante, NÃO VERIFICADO** (a tabela oficial da Meta é CSV/PDF) `[EVID S95]`. Estimativa: 3 k cadastros × (0,05 + 0,06) ≈ **US$ 330 uma vez** + re-logins. `[REC]` **Não usar SMS em V1**; e-mail OTP + Apple/Google cobrem o público; SMS/WhatsApp só se a igreja tiver base majoritária sem e-mail (validar com Frente de produto).
- **Guest → link account** `[REC]`: iniciar sessão anônima **apenas quando o usuário fizer a 1ª ação que precisa de nuvem** (inscrever-se em plano, criar nota); antes disso, tudo local. Ao vincular e-mail/Apple/Google, o `user_id` é mantido `[FATO S7]` → nenhuma migração de dados. Habilitar CAPTCHA no anônimo é recomendado pelo Supabase `[FATO S7]`, mas em RN/Flutter exige WebView com Turnstile/hCaptcha (sem guia oficial) `[FATO S12]` → `[REC]` em V1, mitigar com rate limit + só criar anônimo sob demanda + limpeza de anônimos > 30 dias via `pg_cron`; revisitar CAPTCHA se houver abuso.
- **Sessão no device**: SecureStore rejeita valores > ~2 048 bytes historicamente `[FATO S63]`; o Supabase documenta `LargeSecureStore` (chave AES-256 no SecureStore, payload cifrado no AsyncStorage) + `autoRefreshToken`, `persistSession`, `detectSessionInUrl:false` + listener de `AppState` para start/stop do refresh `[FATO S20]`. iOS: Keychain persiste após reinstalar com o mesmo bundle ID `[FATO S63]` — cuidado com "conta fantasma" após desinstalar; `[REC]` limpar sessão no primeiro launch pós-instalação.
- **Refresh offline** `[INF]`: o JWT expira (default 1 h) mas o cliente local não precisa de rede para ler o cache; o outbox só envia quando houver rede e sessão válida; refresh token do Supabase não expira por tempo (rotação a cada uso) — NÃO VERIFICADO o TTL configurável; testar cenário "7 dias offline".
- **MFA**: TOTP disponível; phone MFA é add-on de US$ 75/mês `[EVID S31]`. `[REC]` sem MFA para usuários em V1 (app de leitura, sem pagamento); **MFA obrigatório na conta do dashboard Supabase** `[FATO S19]`.

### 4.3 Exclusão de conta — fluxo técnico completo `[REC]`
1. **Requisito**: Apple 5.1.1(v) exige exclusão iniciada no app; "If your app offers Sign in with Apple, you'll need to use the Sign in with Apple REST API to revoke user tokens when deleting an account" `[FATO S89]`. Google Play exige caminho no app **e** link web `[FATO S91]`.
2. **No cadastro Apple**: além do `identityToken`, capturar o `authorizationCode` e enviá-lo a uma Edge Function que troca em `/auth/token` (precisa de `client_secret` JWT assinado com o `.p8`) e guarda o **refresh token** cifrado (Supabase Vault) — orientação de engenheiro da Apple: "Securely transmit the identity token and authorization code to your app server… store the token response — including… refresh token" `[FATO S90]`. Se não tiver token, ainda assim excluir e orientar o usuário a revogar manualmente em Ajustes `[FATO S90]`.
3. **Na exclusão** (Edge Function com `service_role`, nunca no cliente `[FATO S24]`): re-autenticação recente → `POST https://appleid.apple.com/auth/revoke` com o refresh token → apagar objetos no Storage (não cascateiam) → `auth.admin.deleteUser(id)` (cascata via FK `on delete cascade` nas tabelas de domínio) → inserir `deletion_requests` (hash do e-mail, timestamp, motivo) para prova de cumprimento → e-mail de confirmação.
4. **Riscos verificados**: Supabase não faz revogação automática (issue #1308 fechada "not planned") `[FATO S27]`; houve relato de erro 500 ao re-logar com Apple após `deleteUser` (issue #2049, fechada sem correção documentada) `[FATO S28]` → **testar** o ciclo criar→excluir→recriar com Apple antes do lançamento. No Firebase, `revokeToken` existe, mas há bug reportado no RNFirebase (#7273) `[EVID S47]`.

---

## 5. Offline / sync

### 5.1 Comparativo
| Opção | Fatos | Custo/complexidade | Veredito p/ "progresso + notas, 3 k usuários" |
|---|---|---|---|
| **(a) Nosso: SQLite/MMKV + outbox + LWW + pull por `updated_at`** | Sem dependência; Expo (`expo-sqlite`) e Flutter (`drift`/`sqflite`) | ~1–2 semanas; ~300–500 linhas; precisa de disciplina (IDs no cliente, tombstones, cursor) | **Proporcional** `[REC]` |
| **(b) PowerSync + Supabase** | Free: 2 GB sync/mês, 500 MB hospedado, **50 clientes simultâneos de pico**, desativa após 1 semana inativo; Pro **desde US$ 49/mês** (1 000 clientes, 30 GB); regiões US/EU/JP/AU/**BR** `[FATO S54,S56]`; SDKs RN&Expo (op-sqlite ≥ 1.17, **não roda no Expo Go**), Flutter, Web, Kotlin, Swift `[FATO S55,S57]`; replicação lógica via WAL + JWT do Supabase; uploads via cliente Supabase com RLS; aviso de crescimento de WAL em instâncias ociosas `[FATO S58]`; self-host sob FSL-1.1-ALv2 (SDKs Apache-2.0), sem dashboard `[FATO S59,S58]` | +US$ 49/mês, sync rules, conexão direta ao Postgres (IPv6 ou add-on IPv4 no Pro `[EVID S30]`) | Melhor engine, **desproporcional em V1**; candidata natural quando grupos/feed chegarem |
| **(c) ElectricSQL / TanStack DB** | Electric faz **só read-path**; escritas por sua API `[FATO S82]`; Cloud PAYG US$ 1/1 M writes; TanStack DB tem coleções Electric/PowerSync/RxDB e exige polyfill de UUID em RN `[FATO S83]` | Ainda precisamos escrever o write-path (= opção a) | Não agora |
| **(d) Firestore offline** | Nativo (Android/iOS/Flutter, ligado por padrão) `[FATO S39]`; SDK JS em RN cai para memória (IndexedDB ausente; issue #7947 aberta) `[FATO S40]`; cache 100 MB com GC | Zero código de sync | **Forte** se Firebase+Flutter/RNFirebase; irrelevante com Supabase |
| **(e) WatermelonDB** | "Bring your own backend": 2 endpoints (pull/push) `[FATO S86]`; Expo via plugin da comunidade (fork para SDK 52+) `[EVID S86]`; JSI | ORM reativo pesado para 3 tabelas | Não |
| **(f) Legend-State + Supabase** | `syncedSupabase` **beta**; exige `created_at/updated_at` + trigger, opcional `deleted`; persist MMKV/AsyncStorage; `changesSince:'last-sync'` `[FATO S87]` | Pouco código, mas beta e só RN/JS | Alternativa a (a) se RN; observar maturidade |
| **(g) Replicache/Zero** | Zero 1.0 (jun/2026); RN/Expo com `expo-sqlite` como kvStore; exige `zero-cache` + Postgres; Hobby US$ 30/mês `[EVID S84]` | Serviço extra | Não |
| **(h) RxDB** | Core grátis; **storage SQLite p/ RN é premium** (Pro US$ 99/mês, anual) `[FATO S85]` | Caro | Não |
| **(i) InstantDB** | Encerrando `[FATO S77]` | — | Eliminado |

### 5.2 Recomendação e protocolo (a) `[REC]`
- **Modelo**: cada entidade sincronizável tem `id uuid` (gerado no cliente), `user_id`, `updated_at timestamptz` (servidor, via trigger), `client_updated_at timestamptz` (relógio do device), `version int`, `deleted_at timestamptz` (tombstone).
- **Push** (outbox local, FIFO): `upsert` via PostgREST (`on_conflict=id`, `Prefer: resolution=merge-duplicates`); regra LWW no servidor por trigger: aceita se `new.client_updated_at >= old.client_updated_at`, senão mantém e devolve a linha atual. Idempotente por natureza (mesmo `id`).
- **Pull** incremental: `?updated_at=gt.<cursor>&order=updated_at.asc,id.asc&limit=500`, cursor = maior `updated_at` recebido; tombstones aplicados localmente; `reading_progress` é chaveado por `(enrollment_id, day_no, reading_no)` → "30 eventos/dia" viram poucas linhas upsertadas, não 30 linhas.
- **Conflitos**: único usuário, poucos devices; LWW basta. Notas: se `version` divergir, manter a mais recente e guardar a perdedora em `notes_conflicts` (opcional) — barato e evita perda silenciosa.
- **Volume**: 1 k DAU × ~10 upserts reais/dia ≈ 300 k requisições/mês — dentro de qualquer plano; egress irrisório.

### 5.3 O que é caro reverter aqui
1. **Formato de ID** (UUID gerado no cliente): mudar depois quebra offline e chaves. Decidir no dia 1.
2. **BaaS/modelo de dados** (Postgres ↔ Firestore): migração de esquema + reescrita de autorização. Caro.
3. **Semântica de conflito exposta na UX** (ex.: "sua nota foi sobrescrita"): moderado.
4. **Camada local** (expo-sqlite vs Watermelon vs MMKV): moderado, encapsular atrás de um repositório.
5. **Adotar PowerSync depois**: barato se o schema já tiver `updated_at`/tombstones e replicação lógica; ele substitui o outbox, não o modelo.

---

## 6. Push e notificações locais

### 6.1 Lembrete diário (sem backend) `[REC]`
- Expo: `expo-notifications` com `DailyTriggerInput` (`hour`, `minute`) `[FATO S62]`; Android 13+ exige `POST_NOTIFICATIONS`, e o prompt só aparece depois de criar um **canal** `[FATO S62]`. Flutter: `flutter_local_notifications` com `zonedSchedule` + `matchDateTimeComponents: time`, `requestNotificationsPermission()` `[FATO S93]`.
- **Alarmes exatos**: Android 14 nega `SCHEDULE_EXACT_ALARM` por padrão para apps que visam Android 13+; `setExact*` sem permissão lança `SecurityException`; `USE_EXACT_ALARM` só para despertador/timer/calendário (política Play) `[FATO S92]`. Alarmes inexatos entregam "dentro de ~1 h" no Android 12+ e `setWindow` tem janela mínima de 10 min `[FATO S92]`. `[REC]` **Usar modo inexato** (`AndroidScheduleMode.inexactAllowWhileIdle` no Flutter; no Expo, verificar se a versão do SDK usa alarme exato por padrão e se o `SCHEDULE_EXACT_ALARM` é injetado no manifesto — a doc do Expo menciona a permissão para "exact time" `[FATO S62]`; comportamento por versão **NÃO VERIFICADO**). Não declarar `USE_EXACT_ALARM` (risco de rejeição na Play). Um lembrete devocional tolera ±30 min; se produto exigir precisão, oferecer opt-in "Alarmes e lembretes" nas configurações do sistema.
- Reagendar após reboot e após abrir o app (o SO pode descartar agendamentos).

### 6.2 Push remoto ocasional (comunicados)
| Opção | Fatos | Veredito |
|---|---|---|
| **Expo Push Service** | Grátis; 600 notificações/s/projeto; 100 por request; "at-least-once" até FCM/APNs, "may be delivered… more than once or not at all, although these cases are rare"; receipts em 15 min; `DeviceNotRegistered`; **não é obrigatório** (`getDevicePushTokenAsync` p/ FCM/APNs direto) `[FATO S60,S61]`; **sem SLA** `[EVID S65]`; incidentes: 23/02/2026 "Degraded Android and iOS push notification delivery", 04/08/2026 "iOS Push Notifications partial outage" (1 h 23) `[EVID S65]`; Expo Go SDK 53+ sem push remoto no Android `[FATO S62]` | **OK para comunicados** (baixa criticidade); guardar também o token nativo para migrar |
| **FCM direto** | Grátis `[FATO S33]`; `@react-native-firebase/messaging` (dev build) ou `firebase_messaging` (Flutter); iOS via APNs configurado no FCM | **Recomendado se Flutter**; se Expo, adotar quando houver 2º motivo para RNFirebase |
| **OneSignal** | Free limitado a **< 1 000 MAU mobile** (novos: 01/09/2026; existentes: 01/10/2026), contagem por device; Growth US$ 19 + US$ 0,012/MAU `[FATO S66]` → 3 k MAU ≈ US$ 55/mês | Não vale para "ocasional" |
| Knock/Courier/Novu | Orquestração multicanal — NÃO VERIFICADO preços 2026 | Overengineering |
- Backend de envio `[REC]`: tabela `devices` (token Expo + token nativo + plataforma + `last_seen`), Edge Function `send-broadcast` (batched em 100, checa receipts, apaga `DeviceNotRegistered`), disparo manual por admin (tabela `broadcasts` com aprovação) e `pg_cron` para lembretes server-side só se um dia forem necessários.

---

## 7. Analytics / crash / observabilidade — conjunto mínimo

| Ferramenta | Fatos | Recomendação |
|---|---|---|
| **Sentry** (crash + erros) | Developer free: 5 k erros, 50 replays, 5 M spans, **1 usuário**, 1 monitor de uptime; Team US$ 26/mês (anual), 50 k erros `[FATO S69]`; regiões **US (Iowa) ou EU (Frankfurt)**, escolhida na criação e **imutável** `[FATO S69-ds]`; Expo: `@sentry/react-native` com config plugin (SDK 50+), `sentry-expo` deprecado `[FATO S69-expo]`; Flutter: `sentry_flutter` (não verificado nesta pesquisa) | **Sim**, org na **UE** (adequação ANPD). Free até o time precisar de 2+ logins |
| **Crashlytics** | Grátis; coberto pelo Firebase DPST `[FATO S43]`; no Expo exige RNFirebase (dev build) e não reporta com `expo-dev-client` em dev `[FATO S41]` | Se Flutter/Firebase, alternativa grátis ao Sentry |
| **PostHog** (produto) | Free/mês: 1 M eventos, 5 k replays, 1 M flag requests, 100 k exceções `[FATO S67]`; depois ≈ US$ 0,00005/evento; replay mobile 2× o web `[EVID S68]`; **US ou EU (Frankfurt)**; replay mobile GA para RN e Flutter (modo screenshot) `[FATO S67]`; RN SDK precisa de `expo-file-system/application/device/localization`; replay exige `@posthog/react-native-plugin` nativo `[FATO S67-rn]` | **Sim, host EU**. Atenção: 1 k DAU × 30 eventos × 30 dias = 900 k ≈ limite free → **não enviar cada tick de progresso como evento**; agregar (ex.: `day_completed`). Sem session replay em V1 (dado sensível na tela) |
| Aptabase | Free 20 k eventos; US$ 10/200 k; EU/US; AGPL; SDKs RN/Expo e Flutter `[FATO S70]` | Alternativa minimalista; free tier pequeno |
| GA4/Firebase Analytics | Grátis; **sem seleção de localização**, fora do DPST `[EVID S51,S102]` | Evitar para dado sensível |
| Amplitude/Mixpanel | NÃO VERIFICADO em 2026 | Não necessário |
| Logs backend / alertas / uptime | Supabase: logs 1 dia (Free) / 7 dias (Pro) `[FATO S1]`; Firebase: budget alerts + spend cap `[FATO S50]` | Sentry uptime (1 grátis) + alertas de uso do Supabase; `audit_log` próprio para ações admin |

`[REC]` Mínimo V1: **Sentry (EU) + PostHog (EU, eventos agregados) + logs do Supabase**. Nada mais.

---

## 8. Storage, backup/DR, realtime

### 8.1 Storage (avatares)
- Supabase Storage: Free 1 GB; Pro 100 GB (+US$ 0,0213/GB), egress 250 GB (+US$ 0,09/GB) `[FATO S1]`; transformação de imagem **só Pro**, 100 inclusas e US$ 5/1 000 imagens de origem `[FATO S23]` → `[REC]` redimensionar **no device** (≤ 256 px, WebP) e não usar transformações. RLS em `storage.objects` (bucket `avatars`, caminho `user_id/…`).
- Firebase Storage: buckets legados 5 GB + 1 GB/dia grátis; novos buckets seguem GCS (Always Free só em regiões US) `[FATO S33,S36]`; São Paulo disponível `[FATO S36]`.
- Cloudflare R2: 10 GB + egress zero `[FATO S81]` — sem necessidade em V1; opção se houver mídia pesada (áudio de planos).

### 8.2 Backup / DR `[REC]`
- Supabase Pro: backups diários 7 dias, físicos (PG ≥ 15.8), **não incluem objetos do Storage**; PITR 7/14/28 dias ≈ US$ 100–400/mês, RPO 2 min; PITR substitui os diários `[FATO S3]`. PITR **não é proporcional** em V1 (DB < 1 GB, sugerido pelo Supabase só > 4 GB `[FATO S19]`).
- Plano: (1) diários do Pro; (2) `supabase db dump` semanal automatizado (GitHub Actions/Windows Task) cifrado para R2/Backblaze; (3) espelho semanal do bucket `avatars`; (4) **teste de restore trimestral** em projeto descartável (branch/projeto novo); (5) export de portabilidade = mesmo dump + JSON por usuário.
- Firebase: agendar backup diário (retenção 14 semanas) + PITR 7 dias (barato por GiB) `[FATO S37,S38]`; restore cria **novo** banco `[FATO S37]`.

### 8.3 Realtime
- V1: **não** `[REC]`. Sinais para adotar: grupos com progresso compartilhado, feed, reações. Custo de adicionar depois: Supabase Pro inclui 500 conexões e 5 M mensagens/mês (+US$ 10/1 000 conexões) `[FATO S1]`, Broadcast/Postgres Changes com RLS — mudança só no cliente; Firestore listeners já são nativos. Em ambos, adicionar depois é barato.

---

## 9. Modelo de dados V0 (esboço)

### 9.1 Entidades (Postgres; ownership em negrito)
```sql
-- perfis (1:1 com auth.users)
profiles(id uuid pk references auth.users on delete cascade, display_name, avatar_path, locale default 'pt-BR',
         reminder_time time, tz text, created_at, updated_at, deleted_at)

-- catálogo (conteúdo gerenciado; leitura pública)
plans(id uuid pk, slug unique, title, description, status enum('draft','published','archived'), created_at)
plan_versions(id uuid pk, plan_id fk, version int, published_at, is_current bool, checksum text,
              unique(plan_id, version))                    -- imutável após publicar
plan_days(id uuid pk, plan_version_id fk, day_no int, title, unique(plan_version_id, day_no))
plan_readings(id uuid pk, plan_day_id fk, reading_no int, book char(3) /*USFM: GEN, EXO, MAT…*/,
              chapter int, verse_start int null, verse_end int null, unique(plan_day_id, reading_no))

-- pessoais (owner = user_id; sincronizáveis: id gerado no cliente)
enrollments(id uuid pk, **user_id** uuid fk auth.users on delete cascade, plan_version_id fk,
            started_on date, status enum('active','paused','completed','abandoned'),
            group_id uuid null,  -- futuro
            client_updated_at, updated_at, deleted_at, unique(user_id, plan_version_id, started_on))
reading_progress(id uuid pk, **user_id**, enrollment_id fk on delete cascade, day_no int, reading_no int,
            status enum('pending','done','skipped'), done_at timestamptz null,
            client_updated_at, updated_at, deleted_at, unique(enrollment_id, day_no, reading_no))
notes(id uuid pk, **user_id**, book char(3), chapter int, verse_start int null, verse_end int null,
      body text, visibility enum('private') default 'private', group_id uuid null,
      client_updated_at, updated_at, deleted_at)
highlights(id uuid pk, **user_id**, book, chapter, verse_start, verse_end, color smallint,
      client_updated_at, updated_at, deleted_at, unique(user_id, book, chapter, verse_start, verse_end))

-- dispositivos e push
devices(id uuid pk, **user_id**, platform enum('ios','android'), expo_push_token text null,
        native_push_token text null, app_version, last_seen_at, created_at, unique(user_id, native_push_token))

-- LGPD
consents(id uuid pk, **user_id**, purpose enum('sensitive_religious_data','analytics','push_marketing'),
         policy_version text, granted bool, granted_at timestamptz, revoked_at null,
         ip_hash text null, user_agent text null)           -- append-only; art. 8º/11 LGPD
deletion_requests(id uuid pk, user_id_hash text, requested_at, completed_at null, method enum('in_app','web','support'),
         apple_revoked bool null, notes text)               -- sobrevive à exclusão (sem PII)
audit_log(id bigserial, actor uuid null, action text, target text, at timestamptz, meta jsonb) -- ações admin
```
- **Índices**: `(user_id)` em toda tabela pessoal; `(user_id, updated_at)` para pull incremental; `(enrollment_id)`; `(plan_version_id, day_no)`.
- **Triggers**: `set_updated_at()`; `lww_guard()` (rejeita `client_updated_at` mais antigo); `profiles` criado por trigger em `auth.users` insert.
- **Grupos depois** `[REC]`: adicionar `groups(id, name, owner_id, church_unit)`, `group_members(group_id, user_id, role)` e **usar o `group_id` nullable já existente** em `enrollments`/`notes` para "compartilhar com o grupo". Dados pessoais não mudam de lugar; novas policies apenas *ampliam* o SELECT via função `is_group_member(group_id)` (security definer, estável). Nenhuma migração de linhas.

### 9.2 RLS (Supabase) — 3 exemplos
```sql
alter table reading_progress enable row level security;

-- 1) dono lê/escreve o seu (rápido: (select auth.uid()) vira initPlan, avaliado 1x por query)
create policy "own progress" on reading_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2) catálogo público só publicado; anon e authenticated
create policy "read published plans" on plan_versions
  for select to anon, authenticated
  using (is_current and exists (select 1 from plans p where p.id = plan_id and p.status = 'published'));

-- 3) usuário anônimo não pode criar nota (evita lixo de guests); só permanente
create policy "notes insert permanent users only" on notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false);

-- futuro (grupos): amplia leitura sem tocar nos dados
-- create policy "group read" on notes for select to authenticated
--   using (group_id is not null and is_group_member(group_id));
```

### 9.3 Equivalente em Firestore Security Rules
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /plans/{planId} {                       // catálogo publicado
      allow read: if resource.data.status == 'published';
      match /versions/{v}/{document=**} { allow read: if get(/databases/$(db)/documents/plans/$(planId)).data.status == 'published'; }
    }
    match /users/{uid}/{document=**} {            // tudo pessoal sob /users/{uid}
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid}/notes/{noteId} {           // anônimo não cria nota
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.auth.token.firebase.sign_in_provider != 'anonymous'
                    && request.resource.data.body.size() <= 5000;
    }
    // grupos depois: exigiria duplicar/denormalizar notas em /groups/{g}/notes ou get() de membership
    // (limite: 10 get()/exists() por avaliação em requests de doc único) [S48]
  }
}
```
`[INF]` Complexidade comparável em V1; a divergência aparece em **grupos**: no Postgres é uma policy com `exists`; no Firestore, cada leitura de grupo custa `get()` de membership (limite 10/20 por avaliação `[FATO S48]`) ou denormalização com Cloud Functions.

### 9.4 Armadilhas (verificadas nos advisors/docs do Supabase)
- `auth.uid()` "cru" na policy é avaliado por linha → usar `(select auth.uid())` (lint `0003_auth_rls_initplan`) `[FATO S10,S18]`.
- Policy sem `to authenticated` também roda para `anon` → nomear o role sempre `[FATO S18]`.
- Múltiplas policies permissivas ampliam acesso e custam (lint `0006`) `[FATO S10]`.
- Views no schema `public` ignoram RLS a menos que `security_invoker = true` (PG15+) (lint `0010`) `[FATO S10,S18]`.
- **Nunca** referenciar `user_metadata` em policy — usuário edita livremente (lint `0015`, ERROR) `[FATO S10]`.
- Tabela em `public` sem RLS = "Anyone with your project URL can read, edit, and delete all data" (lint `0013`, ERROR) `[FATO S10]`; `create table` via SQL nasce **sem** RLS (padrão Postgres) `[INF]`.
- Views expondo `auth.users` (lint `0002`) `[FATO S10]`; funções sem `search_path` fixo (lint `0011`).
- Soft-delete: filtrar `deleted_at is null` nas policies de SELECT do app ou o cliente verá tombstones (exceto no pull, que precisa deles) → usar view `*_active` com `security_invoker`.
- Índice em toda coluna filtrada por policy (senão seq scan) `[FATO S18]`.
- Conexões: Micro = 60 diretas / 200 pooler `[FATO S17]` — usar sempre os SDKs (pooler), nunca conexão direta do app.
- `service_role` só em Edge Functions; a chave `anon` pode vazar (é pública) — RLS é a única barreira `[FATO S19]`.

---

## 10. Custos estimados (3 k MAU, ~1 k DAU, ~30 eventos de progresso/usuário/dia, notas curtas)

Premissas `[INF]`: 30 "eventos" viram ~10 upserts reais/usuário/dia; leituras ≈ 3× escritas; catálogo cacheado no app; DB < 1 GB; avatares 3 k × 50 KB = 150 MB; 1 push/semana para 3 k devices.

| Item | **Arquitetura A — Supabase Pro (sa-east-1)** | **Arquitetura B — Firebase Blaze (southamerica-east1)** |
|---|---|---|
| BaaS base | US$ 25 (Pro; inclui Micro US$ 10 de crédito, 100 k MAU, 8 GB, backups 7 d) `[S1]` | US$ 0 base |
| DB ops | Inclusos | Escritas: 10 k/dia × 30 ≈ 300 k/mês, ~acima dos 20 k/dia grátis em ~10 k/dia → ≈ US$ 0,30–0,50; leituras ≈ 900 k/mês, parte acima de 50 k/dia → ≈ US$ 0,10–0,40 (base `us-central1`; **São Paulo NÃO VERIFICADO**, provável +30–50%) `[S52]` |
| Compute/functions | Incluso (2 M invocações) | Incluso (2 M invocações, Tier 2 mais caro — imaterial) `[S33,S35]` |
| Auth | Incluso; sem SMS | Incluso (50 k MAU); sem SMS |
| E-mail OTP | Resend Free (3 k/mês, 100/dia) → **US$ 20 no mês de lançamento** `[S99]` | Firebase envia e-mails de auth próprios (limites NÃO VERIFICADOS); ou Resend idem |
| Storage | Incluso | ≈ US$ 0–1 |
| Backups | Diários inclusos; PITR **não** (US$ 100) | Backup agendado + PITR ≈ US$ 0,1–1 |
| Push | Expo Push US$ 0 / FCM US$ 0 | FCM US$ 0 |
| Crash | Sentry Free (EU) US$ 0 → Team US$ 26 quando houver 2 pessoas | Crashlytics US$ 0 (ou Sentry) |
| Analytics | PostHog EU Free (agregar eventos) US$ 0 | PostHog EU Free (evitar GA4 p/ sensível) |
| CI/CD mobile (cita-se; decisão da Frente A) | EAS Free (15+15 builds) ou Starter US$ 19 `[S64]`; Codemagic 500 min M2 grátis `[S100]` | idem |
| Apple/Google | Apple Developer US$ 99/ano (≈ US$ 8/mês); Play US$ 25 uma vez | idem |
| **Total típico** | **≈ US$ 45–95/mês** (US$ 25–33 sem CI/lançamento; +19 EAS; +20 SMTP no lançamento; +26 Sentry Team) | **≈ US$ 25–70/mês** (US$ 2–10 Firebase; +19 EAS; +26 Sentry Team opcional) |
| Cenário 20 k MAU / 6 k DAU | Supabase Pro + Small compute (+US$ 5) ≈ US$ 30–40 + SMTP Pro US$ 20 ≈ **US$ 60–110** | Firestore ≈ US$ 5–20; total ≈ **US$ 40–90** |
| Custos ocultos | PITR US$ 100 se exigido; IPv4 add-on se PowerSync (≈ US$ 4, NÃO VERIFICADO); MFA phone US$ 75 | Sem teto por padrão (spend cap via função) `[S50]`; Remote Config passa a cobrar (set/2026) `[S33]`; Tier 2 |

`[INF]` A diferença de ~US$ 20–30/mês não deve decidir a arquitetura; decidem residência de dados, lock-in e esforço de sync.

---

## 11. Segurança — checklist concreto (Supabase; itens Firebase equivalentes entre parênteses)

**Antes do primeiro usuário real**
- [ ] Projeto Pro em `sa-east-1`; **MFA na conta do dashboard**; SSL enforcement; network restrictions no DB `[S19]`.
- [ ] RLS **habilitado em todas as tabelas de `public`** + policies com `to authenticated/anon` e `(select auth.uid())`; Security Advisor com **zero ERROR** e CI que roda `supabase db lint`/advisor antes do deploy `[S10,S19]`. (Firebase: Rules em modo produção, `firebase emulators` + testes de rules.)
- [ ] Testes automatizados de autorização: usuário A não lê/escreve dados de B; anon não escreve; anônimo não cria nota.
- [ ] `service_role` só em Edge Functions/secrets; nunca em app; rotação se vazar. (Firebase: restringir API keys `[S50]`; App Check enforce.)
- [ ] Custom SMTP (Resend) com domínio da igreja + SPF/DKIM; OTP expiry ≤ 1 h (padrão); rate limits revisados (`[S6,S19]`).
- [ ] Anônimos: criação sob demanda, limpeza > 30 dias por `pg_cron`; CAPTCHA se houver abuso `[S7]`.
- [ ] Sessão em `LargeSecureStore` (AES-256 + SecureStore) `[S20]`; `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; limpar sessão no 1º launch pós-instalação (Keychain persiste) `[S63]`.
- [ ] Storage: bucket privado, policies por `user_id`, tamanho máximo 1 MB, MIME allowlist.
- [ ] Edge Functions fixadas em `sa-east-1` quando tocarem no DB `[S16]`; validar JWT; CORS fechado.
- [ ] Exclusão de conta fim-a-fim testada (Apple revoke → storage → `deleteUser` → `deletion_requests`) e re-login pós-exclusão (issue #2049) `[S27,S28,S89]`.
- [ ] Exportação de dados (JSON) funcional (LGPD art. 18) `[S96]`.
- [ ] `consents` gravado antes de qualquer sync de nota/progresso; texto de consentimento "específico e destacado" (art. 11, I) `[S96]`; política de privacidade publicada (Play Data safety; Apple nutrition labels).
- [ ] Backups: confirmar diários; dump semanal off-site; **restore testado** `[S3]`.
- [ ] Observabilidade: Sentry EU, PostHog EU sem PII/sem replay; alertas de uso/gasto (Supabase spend cap ON `[S1]`; Firebase budget + spend cap `[S50]`).
- [ ] DPA aceito (Supabase self-serve `[S5]`); anexar CPC-ANPD se o jurídico exigir (Res. 19/2024) `[S97]`; registrar subprocessadores; DPO/encarregado nomeado; runbook de incidente (3 dias úteis, Res. 15/2024) `[S98]`.
- [ ] Logs: reter `audit_log` próprio ≥ 12 meses (logs da plataforma duram 7 dias no Pro `[S1]`).

---

## 12. Evidência contrária + o que mudaria a recomendação

### 12.1 Evidência contrária (contra Supabase como recomendação principal)
1. **Offline "de graça" no Firebase.** Firestore mantém cache persistente por padrão em Android/iOS/Flutter e com RNFirebase `[FATO S39,S41]`; no Supabase teremos de escrever e manter o protocolo de sync (§5.2) ou pagar PowerSync (US$ 49/mês, dev build) `[FATO S54,S57]`. Se o time subestimar o outbox (cursor, tombstones, relógio do device), o custo de bugs recai sobre a funcionalidade mais visível do app.
2. **RLS é o ponto de falha sistêmico do Supabase.** CVE-2025-48757: 303 endpoints em 170 projetos Lovable (10,3% de 1 645) expostos por RLS ausente; "83% das exposições Supabase envolvem RLS" `[EVID S29]`. O advisor existe `[FATO S10]`, mas é opt-in. Um time pequeno com IA gerando SQL é exatamente o perfil da amostra. (Contraponto: Firestore em "test mode" também abre tudo; a diferença é que o Supabase expõe REST automático de cada tabela.)
3. **Exclusão de conta com Apple é manual e frágil no Supabase.** Issue #1308 fechada "not planned" `[FATO S27]`; issue #2049 (500 ao re-logar após `deleteUser`) `[FATO S28]`. Firebase tem `accounts.revokeToken` `[FATO S46]`. É requisito de loja, não "nice to have".
4. **Confiabilidade.** Incidente plataforma-wide em 24/11/2025 (90% das requisições com 556/500 por ~30 min) `[FATO S26]`; bloqueio DNS nos EAU (set/2025) `[EVID S26]`; série de incidentes 28–31/07/2026 (SSO us-east-1, deploy de Edge Functions, Management API, logs) `[FATO S26-atom]`; agregadores citam quedas multi-dia em abril/2026 e 8–10/07/2026 — **NÃO VERIFICADO** em fonte primária. O Free plan pausa projetos após 1 semana `[FATO S1]`.
5. **Operação de e-mail.** 2 e-mails/hora no SMTP embutido `[FATO S6]` obriga um provedor externo desde o dia 1 — mais um fornecedor (e mais uma transferência internacional se for EUA).
6. **DPA sem LGPD** `[FATO S5]` e relatórios SOC 2 só a partir de US$ 599/mês `[FATO S4]`; Google entrega Cloud DPA e certificações no plano gratuito.
7. **Custo**: Firebase seria ~US$ 20–30/mês mais barato em 3 k e semelhante em 20 k `[INF]`.
8. **Anônimos contam como MAU** `[INF a partir de S13]` — irrelevante em 3 k, mas some com 50 k anônimos de "leitura sem login" se criarmos sessão cedo demais (mitigado pela criação sob demanda).

### 12.2 O que mudaria a recomendação
- **Frente A escolhe Flutter e quer zero código de sync** → Firebase (Firestore offline + FCM + Crashlytics) passa a primeiro lugar, **com** Analytics desligado, Auth documentado como global no RIPD e schema de coleções desenhado desde já para grupos.
- **Jurídico exige operador com CPC-ANPD assinadas e o Supabase não assina** → Firebase/Google (verificar apêndice LGPD do Cloud DPA — NÃO VERIFICADO) ou auto-hospedar (Supabase self-host / PocketBase) em VPS no Brasil, aceitando o ônus operacional.
- **Grupos/feed aprovados para V1** → PowerSync (Pro, região BR) sobre Supabase ou Firestore listeners; Realtime entra.
- **Base sem e-mail (SMS/WhatsApp obrigatório)** → revisar custos (≈ US$ 0,11/verificação SMS) e considerar Firebase Phone Auth (US$ 0,05/SMS `[EVID S53]`) — não muda o BaaS sozinho.
- **Novo incidente plataforma-wide multi-hora no Supabase antes do lançamento** → manter schema, migrar para Neon (São Paulo) + Edge/Workers com Better Auth — rota de saída barata graças ao Postgres.
- **Time já domina Firebase/GCP ou a igreja tem Google Workspace/créditos** → peso de familiaridade legítimo (não é o caso declarado).
- **> 20 k usuários com sync intenso** → PowerSync em vez do outbox próprio.

---

## 13. Perguntas abertas / NÃO VERIFICADO
1. Preço regional exato do Firestore em `southamerica-east1` (leituras/escritas/armazenamento) — página é renderizada por JS; usar calculadora GCP.
2. Preço Tier 2 exato de Cloud Run functions em São Paulo (Tier 1 = US$ 0,000024/vCPU-s).
3. Localização de dados do Firebase Authentication (Identity Platform) — evidência indica "global", sem seleção; confirmar em `firebase.google.com/docs/projects/locations`.
4. Se o Cloud DPA do Google lista a LGPD em "Specific Privacy Laws" (Apêndice 3).
5. Se a ANPD considera acesso remoto de suporte por operador estrangeiro (dados em `sa-east-1`) como transferência internacional; se CPC-UE são aceitas como "cláusulas equivalentes" após a Res. 32/2026.
6. Se anônimos contam como MAU no Supabase (docs falam em "distinct count of all user ids"; não explícito).
7. Comportamento do `expo-notifications` quanto a alarme exato/inexato por versão de SDK (52/53/54) e se injeta `SCHEDULE_EXACT_ALARM` no manifesto.
8. Tarifa oficial Meta para template de autenticação no Brasil (fontes secundárias divergem: US$ 0,0068 vs 0,0225).
9. Incidentes do Supabase em abril/2026 e 8–10/07/2026 relatados por agregadores (StatusGator) — não constam do feed Atom recente.
10. Status do Amplify DataStore em Gen 2; regiões do Nhost e do Turso; `sentry_flutter` (não pesquisado).
11. TTL/rotação do refresh token do Supabase para cenário "7 dias offline".
12. Se o Supabase aceita anexar CPC-ANPD ao DPA (perguntar ao suporte/legal).

---

## 14. Fontes (todas acessadas em 2026-09-07)

**Supabase**
- [S1] Pricing — https://supabase.com/pricing
- [S2] Available regions — https://supabase.com/docs/guides/platform/regions
- [S3] Database backups — https://supabase.com/docs/guides/platform/backups
- [S4] Security & compliance — https://supabase.com/security
- [S5] Data Processing Addendum — https://supabase.com/legal/dpa
- [S6] Auth rate limits — https://supabase.com/docs/guides/auth/rate-limits
- [S7] Anonymous sign-ins — https://supabase.com/docs/guides/auth/auth-anonymous ; blog https://supabase.com/blog/anonymous-sign-ins
- [S8] Sign in with Apple — https://supabase.com/docs/guides/auth/social-login/auth-apple ; [S8-RN] …?platform=react-native
- [S9] Google (React Native) — https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native
- [S10] Database advisors (Security/Performance lints) — https://supabase.com/docs/guides/database/database-advisors
- [S11] MFA — https://supabase.com/docs/guides/auth/auth-mfa
- [S12] CAPTCHA — https://supabase.com/docs/guides/auth/auth-captcha
- [S13] MAU usage — https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users ; troubleshooting MAU — https://supabase.com/docs/guides/troubleshooting/check-usage-for-monthly-active-users-mau-MwZaBs
- [S14] Third-party auth — https://supabase.com/docs/guides/auth/third-party/overview
- [S15] Phone login — https://supabase.com/docs/guides/auth/phone-login
- [S16] Edge Functions regional invocation — https://supabase.com/docs/guides/functions/regional-invocation
- [S17] Compute and disk — https://supabase.com/docs/guides/platform/compute-and-disk
- [S18] Row Level Security (performance) — https://supabase.com/docs/guides/database/postgres/row-level-security
- [S19] Production checklist — https://supabase.com/docs/guides/platform/going-into-prod
- [S20] Expo tutorial (LargeSecureStore, AppState) — https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- [S21] Passwordless e-mail (OTP vs magic link) — https://supabase.com/docs/guides/auth/auth-email-passwordless
- [S22] Native mobile deep linking — https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- [S23] Image transformations — https://supabase.com/docs/guides/storage/serving/image-transformations
- [S24] auth.admin.deleteUser — https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- [S25] Queues (pgmq) — https://supabase.com/docs/guides/queues
- [S26] Status — https://status.supabase.com/ ; [S26-atom] https://status.supabase.com/history.atom (incidentes jul–set/2026); incidente 24/11/2025 citado via busca (agregadores StatusGator/apistatuscheck — secundários)
- [S27] Issue "Revoke Sign in with Apple tokens" #1308 — https://github.com/supabase/auth/issues/1308
- [S28] Issue "500 error when signing in with Apple after deleteUser" #2049 — https://github.com/supabase/auth/issues/2049
- [S29] CVE-2025-48757 / RLS (secundárias) — https://vibeappscanner.com/supabase-row-level-security ; https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/
- [S30] IPv4 add-on / IPv6 (via busca) — https://supabase.com/docs/guides/platform/ipv4-address
- [S31] Advanced MFA Phone usage (via busca; US$ 75/mês) — https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone
- [S32] supabase_flutter 2.17.2 — https://pub.dev/packages/supabase_flutter

**Firebase / Google Cloud**
- [S33] Firebase pricing — https://firebase.google.com/pricing
- [S34] Firestore locations — https://firebase.google.com/docs/firestore/locations
- [S35] Cloud Functions locations — https://firebase.google.com/docs/functions/locations
- [S36] Cloud Storage locations — https://docs.cloud.google.com/storage/docs/locations ; Storage for Firebase locations — https://firebase.google.com/docs/storage/locations
- [S37] Firestore backups — https://firebase.google.com/docs/firestore/backups
- [S38] Firestore PITR — https://firebase.google.com/docs/firestore/pitr
- [S39] Enable offline data — https://firebase.google.com/docs/firestore/manage-data/enable-offline
- [S40] Issue "FR: Firestore Persistence Support for Expo / React Native" #7947 (aberta, 13/01/2024) — https://github.com/firebase/firebase-js-sdk/issues/7947
- [S41] React Native Firebase (Expo) — https://rnfirebase.io/
- [S42] SQL Connect (ex-Data Connect) — https://firebase.google.com/docs/data-connect ; pricing — https://firebase.google.com/docs/sql-connect/pricing
- [S43] Firebase Data Processing and Security Terms — https://firebase.google.com/terms/data-processing-terms
- [S44] Google Cloud Data Processing Addendum — https://cloud.google.com/terms/data-processing-addendum
- [S45] Anonymous auth (web) — https://firebase.google.com/docs/auth/web/anonymous-auth
- [S46] Identity Platform accounts.revokeToken — https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/accounts/revokeToken
- [S47] RNFirebase issue "revokeToken API does not work" #7273 (via busca) — https://github.com/invertase/react-native-firebase/issues/7273
- [S48] Firestore rules conditions — https://firebase.google.com/docs/firestore/security/rules-conditions
- [S49] Firestore export/import — https://firebase.google.com/docs/firestore/manage-data/export-import
- [S50] Firebase launch checklist — https://firebase.google.com/support/guides/launch-checklist
- [S51] Locations for products (via busca) — https://firebase.google.com/docs/projects/locations
- [S52] Firestore billing (via busca) — https://firebase.google.com/docs/firestore/pricing ; https://cloud.google.com/firestore/pricing
- [S53] Identity Platform SMS BR ≈ US$ 0,05 (secundária) — https://www.metacto.com/blogs/the-complete-guide-to-firebase-auth-costs-setup-integration-and-maintenance ; primária (JS) https://cloud.google.com/identity-platform/pricing
- [S101] Firebase iOS Apple (revokeToken(withAuthorizationCode:), via busca) — https://firebase.google.com/docs/auth/ios/apple
- [S102] Firebase privacy / Analytics data location (via busca) — https://firebase.google.com/support/privacy

**Offline/sync**
- [S54] PowerSync pricing — https://www.powersync.com/pricing
- [S55] PowerSync overview — https://docs.powersync.com/intro/powersync-overview
- [S56] PowerSync dashboard (regiões US/EU/JP/AU/BR) — https://docs.powersync.com/usage/tools/powersync-dashboard
- [S57] PowerSync React Native & Expo SDK — https://docs.powersync.com/client-sdk-references/react-native-and-expo
- [S58] PowerSync + Supabase — https://docs.powersync.com/integrations/supabase/guide ; self-hosting — https://docs.powersync.com/self-hosting/getting-started
- [S59] PowerSync FSL — https://powersync.com/legal/fsl ; https://github.com/powersync-ja/powersync-service
- [S82] Electric pricing — https://electric.ax/pricing ; writes guide — https://electric.ax/docs/guides/writes
- [S83] TanStack DB — https://tanstack.com/db/latest/docs/overview
- [S84] Zero — https://zero.rocicorp.dev/ ; RN docs — https://zero.rocicorp.dev/docs/react-native ; InfoQ "Zero Reaches 1.0" (jun/2026) — https://www.infoq.com/news/2026/06/zero-version-1/
- [S85] RxDB premium — https://rxdb.info/premium/
- [S86] WatermelonDB sync — https://watermelondb.dev/docs/Sync/Intro ; Expo plugin (fork SDK 52+) — https://github.com/LovesWorking/watermelondb-expo-plugin-sdk-52-plus
- [S87] Legend-State Supabase plugin — https://legendapp.com/open-source/state/v3/sync/supabase/

**Push / notificações**
- [S60] Expo push FAQ — https://docs.expo.dev/push-notifications/faq/
- [S61] Expo sending notifications — https://docs.expo.dev/push-notifications/sending-notifications/
- [S62] expo-notifications SDK — https://docs.expo.dev/versions/latest/sdk/notifications/
- [S63] expo-secure-store — https://docs.expo.dev/versions/latest/sdk/securestore/
- [S64] EAS pricing — https://expo.dev/pricing
- [S65] Expo status (agregadores StatusGator/IsDown; primária https://status.expo.dev/history não renderizou)
- [S66] OneSignal pricing — https://onesignal.com/pricing ; billing FAQ — https://documentation.onesignal.com/docs/en/billing-faq
- [S92] Android alarms — https://developer.android.com/develop/background-work/services/alarms/schedule ; Android 14 exact alarms — https://developer.android.com/about/versions/14/changes/schedule-exact-alarms ; Play policy — https://support.google.com/googleplay/android-developer/answer/16558241
- [S93] flutter_local_notifications — https://pub.dev/packages/flutter_local_notifications

**Analytics / crash**
- [S67] PostHog pricing — https://posthog.com/pricing ; data storage — https://posthog.com/docs/privacy/data-storage ; mobile replay — https://posthog.com/docs/session-replay/mobile ; [S67-rn] RN SDK — https://posthog.com/docs/libraries/react-native
- [S68] PostHog per-unit (secundárias) — https://flexprice.io/blog/posthog-pricing-guide ; https://dev.to/beton/posthog-pricing-teardown-2026-57oo
- [S69] Sentry pricing — https://sentry.io/pricing/ ; [S69-ds] data storage location — https://docs.sentry.io/organization/data-storage-location/ ; [S69-expo] Expo setup — https://docs.sentry.io/platforms/react-native/manual-setup/expo/
- [S70] Aptabase — https://aptabase.com/

**Auth de terceiros / outros BaaS**
- [S71] Clerk pricing — https://clerk.com/pricing ; Expo quickstart — https://clerk.com/docs/expo/getting-started/quickstart
- [S72] Better Auth Expo — https://www.better-auth.com/docs/integrations/expo
- [S73] Cognito pricing — https://aws.amazon.com/cognito/pricing/ ; AppSync pricing — https://aws.amazon.com/appsync/pricing/
- [S74] Convex pricing — https://www.convex.dev/pricing ; regions — https://docs.convex.dev/production/regions
- [S75] Appwrite pricing — https://appwrite.io/pricing ; regions — https://appwrite.io/docs/products/network/regions
- [S76] Nhost pricing — https://nhost.io/pricing
- [S77] InstantDB (sunset 31/08/2027) — https://www.instantdb.com/ ; https://www.instantdb.com/pricing
- [S78] PocketBase going to production — https://pocketbase.io/docs/going-to-production/
- [S79] Neon pricing — https://neon.com/pricing ; regions — https://neon.com/docs/introduction/regions
- [S80] Turso pricing — https://turso.tech/pricing
- [S81] Cloudflare Workers pricing — https://developers.cloudflare.com/workers/platform/pricing/ ; R2 pricing — https://developers.cloudflare.com/r2/pricing/

**Lojas / plataformas**
- [S88] App Store Review Guidelines (4.8, 5.1.1) — https://developer.apple.com/app-store/review/guidelines/
- [S89] Apple news "account deletion… revoke user tokens" — https://developer.apple.com/news/?id=12m75xbj
- [S90] Apple Developer Forums (engenheiro Apple, tokens/revogação) — https://developer.apple.com/forums/thread/708415 ; TN3194 — https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple ; Revoke tokens — https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens
- [S91] Google Play account deletion — https://support.google.com/googleplay/android-developer/answer/13327111

**Mensageria / e-mail / CI**
- [S94] Twilio Verify pricing — https://www.twilio.com/en-us/verify/pricing ; SMS Brasil — https://www.twilio.com/en-us/sms/pricing/br
- [S95] WhatsApp pricing (Meta) — https://developers.facebook.com/docs/whatsapp/pricing ; secundárias — https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil ; https://ominiflow.com/whatsapp-api-pricing/brazil
- [S99] Resend pricing — https://resend.com/pricing
- [S100] Codemagic pricing — https://codemagic.io/pricing/

**LGPD / ANPD**
- [S96] Lei 13.709/2018 (espelho Câmara; planalto.gov.br indisponível no acesso) — https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html
- [S97-gov] ANPD — Transferência internacional (Res. 19/2024; menção à Res. 32/2026) — https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados ; texto da Res. 19/2024 — https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- [S97-MB] Mayer Brown, "Fim do período de graça da Res. 19/2024" (ago/2025) — https://www.mayerbrown.com/pt/insights/publications/2025/08/end-of-grace-period-implementation-of-brazils-standard-contractual-clauses-in-international-transfers-of-personal-data
- [S97-32] Res. CD/ANPD nº 32/2026 (adequação UE, 26/01/2026; secundárias) — https://cesconbarrieu.com.br/decisao-de-adequacao-reciproca-entre-brasil-e-uniao-europeia-implicacoes-para-fluxos-transfronteiricos-de-dados/ ; https://gsga.com.br/en/newsletter/anpd-reconhece-adequacao-da-protecao-de-dados-pessoais-pela-uniao-europeia
- [S98] Res. CD/ANPD nº 15/2024 (incidentes, 3 dias úteis) — https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca ; https://www.legisweb.com.br/legislacao/?id=458235
