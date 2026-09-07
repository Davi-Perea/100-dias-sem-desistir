# Frente E — Decisões caras de reverter

Data: 2026-09-07 · Status: PROPOSTA (aguarda aprovação do Product Brain e do fundador)

Regra: **preservar opcionalidade barata, sem construir antecipadamente features futuras.**
Cada decisão abaixo é classificada em:

- **DECIDIR AGORA** — mudar depois custa migração de dados, republicação nas lojas ou reescrita. Decidir antes da primeira
  linha de código de produto (ou, quando indicado, antes do primeiro upload às lojas).
- **PODE ESPERAR** — reversível com custo baixo/moderado; decidir no Sprint 1–2 com mais informação.
- **NÃO DECIDIR AINDA** — depende de hipóteses de produto não aprovadas; só garantir que a arquitetura não feche a porta.

Para cada item: por que é caro reverter · recomendação/default · o que precisa vir do Product Brain (PB) ou do fundador.

---

## A. DECIDIR AGORA

### A1. Stack mobile
- **Por que é caro reverter:** trocar de framework = reescrever o app inteiro; afeta contratação, CI, testes, libs nativas.
- **Recomendação:** ver `ADR-001-mobile-stack.md` (recomendação: React Native + Expo; segunda: Flutter).
- **Depende de:** aprovação do ADR-001.

### A2. Backend/BaaS e paradigma de dados (relacional vs documento)
- **Por que é caro reverter:** migrar de Firestore (documentos) para Postgres (ou vice-versa) exige remodelagem, reescrita de
  regras de autorização e migração de dados de usuários reais. Auth também migra com atrito (senhas/hashes, identidades sociais).
- **Recomendação:** ver `ADR-002-backend.md` (recomendação: Supabase/Postgres; segunda: Firebase).
- **Depende de:** aprovação do ADR-002.

### A3. Região / residência de dados
- **Por que é caro reverter:** a região de um projeto Supabase e a *location* de um banco Firestore são fixas; mudar = migrar projeto inteiro.
- **Recomendação:** hospedar no Brasil (região São Paulo) se disponível no provedor escolhido; caso contrário, EUA com
  cláusulas-padrão da ANPD (Resolução CD/ANPD nº 19/2024). Detalhe em `SECURITY_V0.md`.
- **Depende de:** ADR-002 (disponibilidade de região) — sem decisão do PB.

### A4. Identidade do usuário e "conta pertence ao app, não à igreja"
- **Por que é caro reverter:** se o usuário for modelado como "membro da Lagoinha" (ID de membro, CPF, vínculo de célula), qualquer
  segunda igreja, ministério ou uso pessoal exige remodelar identidade e autorização. Se for modelado como "pessoa com conta no app",
  vínculos organizacionais podem ser adicionados depois como relação opcional.
- **Recomendação:** identidade = conta do provedor de auth (UUID), sem dados da igreja no núcleo. Vínculo com organização/campus/célula
  fica como tabela relacional opcional futura. **Não coletar CPF, endereço ou dados de membresia.**
- **Depende de:** nada — é opcionalidade barata.

### A5. Modo convidado (leitura sem login) e mesclagem posterior
- **Por que é caro reverter:** as lojas exigem (Apple 5.1.1(v)) que apps sem "features baseadas em conta significativas" funcionem sem login.
  Se o app nascer "login obrigatório", desfazer isso depois exige repensar navegação, sincronização e onboarding. E se o progresso
  offline de convidado não usar IDs geráveis no cliente, não dá para mesclar na conta depois.
- **Recomendação:** leitura da Bíblia e início de um plano funcionam sem conta; conta é pedida para sincronizar/receber lembretes
  em outro aparelho. Todos os registros de usuário usam **UUID gerado no cliente** (v4 ou v7) para permitir upload/mesclagem posterior.
- **Depende de:** PB confirma que "ler sem conta" é aceitável para o produto (é a recomendação técnica e regulatória).

### A6. Esquema canônico de referência bíblica
- **Por que é caro reverter:** planos, progresso, destaques e notas apontam para versículos. Se a referência for texto livre ("Jo 3:16")
  ou offset de caracteres em uma tradução, trocar de tradução ou corrigir versificação quebra tudo.
- **Recomendação:** referência = (`book` código USFM de 3 letras: GEN…REV; `chapter` int; `verse_start` int; `verse_end` int),
  mais um inteiro ordenável derivado (ex.: `BBBCCCVVV`) para índices e ranges. Versificação canônica única para o cânon protestante de
  66 livros; traduções com versificação divergente carregam tabela de mapeamento (mesmo que V1 não use). Destaques/notas referenciam
  versículos canônicos, **nunca** offsets de texto.
- **Depende de:** nada.

### A7. Estratégia de texto bíblico: múltiplas fontes atrás de uma interface
- **Por que é caro reverter:** a tela de leitura, a busca, os destaques e o compartilhamento dependem de "de onde vem o texto".
  Se o leitor for acoplado a um SDK de terceiros (ex.: leitor embutido do YouVersion) ou a um único JSON empacotado, trocar de
  fonte/tradução vira reescrita da experiência central.
- **Recomendação:** contrato interno `BibleTextProvider` (obter capítulo/versículos, metadados, busca, licença/atribuição) com duas
  implementações previstas: (1) **empacotado offline** (tradução com licença aberta, SQLite no app), (2) **remoto licenciado** (API/SDK)
  com cache conforme a licença. UI de leitura é nossa em qualquer caso. Detalhe em `../research/BIBLE_CONTENT_OPTIONS.md`.
- **Depende de:** PB decide quais traduções importam (afeta qual fonte entra primeiro), não a arquitetura.

### A8. Progresso como log de eventos (append-only), não apenas "flag concluído"
- **Por que é caro reverter:** se V1 gravar só `day_completed = true`, não há como calcular depois sequências (streak), ritmo,
  horário de leitura, recaídas — hipóteses de produto (gamificação, personalização) ficariam sem dados históricos.
- **Recomendação:** tabela de eventos de progresso imutáveis (`reading_completed`, `reading_uncompleted`, com `occurred_at`, `device_id`,
  `client_event_id` idempotente) + estado derivado. Custa quase nada agora.
- **Depende de:** nada (não implementa gamificação; só não destrói informação).

### A9. Convenções de sincronização offline no esquema
- **Por que é caro reverter:** adicionar sync a tabelas sem `updated_at`, sem tombstones (`deleted_at`) e sem IDs de cliente exige migração
  e lógica de reconciliação retroativa.
- **Recomendação:** desde a primeira migração: `id uuid` (cliente), `user_id`, `created_at`, `updated_at` (servidor), `deleted_at`
  (soft delete), `client_updated_at`, `device_id`. Regra V1: **last-write-wins por registro** para notas/destaques; eventos para progresso.
  Adoção de motor de sync (PowerSync etc.) PODE ESPERAR (ver B4) — as convenções não.
- **Depende de:** nada.

### A10. Planos como conteúdo versionado e imutável após publicação
- **Por que é caro reverter:** se dias/leituras de um plano mudarem enquanto pessoas estão inscritas, o progresso deixa de bater.
  (O próprio YouVersion proíbe alterações estruturais após publicação.)
- **Recomendação:** `plan` (identidade, slug) → `plan_version` (imutável quando publicada) → `plan_day` → `reading` (referências
  canônicas). Inscrição aponta para uma `plan_version`. Correções de texto devocional geram nova versão menor sem alterar estrutura.
- **Depende de:** nada.

### A11. Semântica de "dia do plano", fuso horário e datas
- **Por que é caro reverter:** lembretes diários, "atrasado/em dia" e relatórios dependem de como se define "hoje" para um usuário.
  Mudar de "data absoluta" para "índice de dia + data de início" depois exige recomputar todas as inscrições.
- **Recomendação:** inscrição guarda `start_date` (data local) + `timezone` (IANA) + `schedule` (ex.: todos os dias / pular domingos);
  o "dia atual" é derivado. Timestamps em UTC; datas de calendário como `date` local. Permitir "pausar/recalcular" sem perder eventos.
- **Depende de:** PB decide se planos têm dias fixos (calendário) ou ritmo pessoal — a modelagem acima suporta ambos.

### A12. Consentimento LGPD para dado sensível e trilha de exclusão desde a primeira migração
- **Por que é caro reverter:** consentimento específico e destacado para dado sensível (LGPD art. 11) precisa de registro (versão do
  texto, data, meio). Exclusão de conta (Apple 5.1.1(v), Google Play) exige cascata completa (auth, dados, storage, tokens push,
  analytics). Esquemas sem `ON DELETE CASCADE`/ownership claro viram limpeza manual.
- **Recomendação:** tabela `consents` (user_id, purpose, policy_version, granted_at, revoked_at, source) e tabela `deletion_requests`
  desde o início; todas as tabelas de usuário com FK para o usuário e cascata; job de exclusão com prazo definido. Ver `SECURITY_V0.md`.
- **Depende de:** texto de consentimento e política de privacidade (PB + jurídico).

### A13. Contas de desenvolvedor: entidade jurídica dona, e identificadores de app
- **Por que é caro reverter:** *bundle ID* (iOS) e *package name* (Android) são imutáveis após publicação; transferir apps entre contas
  é possível mas burocrático; a inscrição como Organização (Apple: D-U-N-S, US$ 99/ano; Google: conta de organização, D-U-N-S) leva semanas.
  Nomes de exibição e marca **podem** mudar depois; identificadores não.
- **Recomendação:** decidir agora **qual entidade jurídica** será dona das contas (igreja, associação, empresa do fundador) e
  iniciar o cadastro (D-U-N-S) já, por causa do prazo. Derivar identificadores de um domínio controlado por essa entidade
  (ex.: `br.org.<entidade>.biblia`), **sem** embutir a marca "Lagoinha" no identificador, para não amarrar o app à marca.
  Restrições verificadas (FATO, 2026-09-07): Apple 5.1.1(ix) exige que apps com informação sensível sejam submetidos por pessoa jurídica;
  Apple 4.2.6/4.1(c) e a política de IP do Play exigem publicar na conta da titular do conteúdo/marca com autorização; o Google Play
  exibe publicamente nome legal, endereço, e-mail e telefone da organização; a **Android Developer Verification** passa a bloquear
  instalações de apps não verificados no Brasil a partir de **30/09/2026** (o Play Console registra automaticamente ~99% dos apps).
- **Depende de:** fundador + PB (entidade e marca). Detalhe regulatório em `MOBILE_STORE_REQUIREMENTS.md`.

### A18. Política de idade da conta e países de distribuição
- **Por que é caro reverter:** o ECA Digital (em vigor desde 17/03/2026) impõe defaults protetivos, canal de denúncia, avaliação de impacto e,
  possivelmente, vínculo de contas de menores de até 16 anos a um responsável; leis estaduais dos EUA (Texas, Utah, Louisiana) impõem
  verificação/consentimento parental para apps distribuídos lá. Lançar com contas de menores ou distribuição global e "desfazer" depois
  significa apagar contas ou implementar age assurance às pressas.
- **Recomendação:** V1 com **conta apenas para ≥ 18** (ou ≥ 16/17 se o jurídico aceitar), uso completo sem conta para os demais,
  sinais de idade das lojas integrados, **distribuição restrita ao Brasil**. Ampliar depois é barato; restringir depois não é.
- **Depende de:** PB (público adolescente) + jurídico (alcance do art. 24).

### A14. Domínio para deep links (Universal Links / App Links)
- **Por que é caro reverter:** links compartilhados (ex.: convite para plano) apontam para um domínio; trocar domínio quebra links
  antigos e exige republicar `apple-app-site-association` e `assetlinks.json`.
- **Recomendação:** escolher um domínio próprio da entidade dona (ex.: `app.<dominio>`) desde já; esquema de URL
  `/plan/{slug}`, `/read/{book}/{chapter}`; nunca usar apenas *custom scheme*.
- **Depende de:** A13.

### A15. Princípios de privacidade em analytics (sem rastreamento entre apps, sem SDKs de anúncios)
- **Por que é caro reverter:** adicionar um SDK de anúncios/atribuição depois obriga prompt ATT (iOS), muda rótulos de privacidade,
  Data safety e política; remover depois exige nova revisão. Um app religioso com "tracking" é reputacionalmente frágil.
- **Recomendação:** analytics de produto *first-party* (eventos sem PII, IDs pseudonimizados), crash reporting, sem ATT, sem
  fingerprinting; cada SDK listado como suboperador na política de privacidade.
- **Depende de:** nada.

### A16. Acessibilidade e escala de fonte como requisito não funcional
- **Por que é caro reverter:** app de leitura para público amplo (inclui idosos) sem suporte a escala de fonte dinâmica, contraste e
  leitores de tela vira retrabalho de todas as telas.
- **Recomendação:** metas WCAG 2.2 AA adaptadas a mobile (ABNT NBR 17060 como referência), Dynamic Type / fontScale, VoiceOver/TalkBack
  nas telas de leitura e navegação desde o primeiro componente.
- **Depende de:** nada.

### A17. Lembrete diário via notificação local (não via push remoto)
- **Por que é caro reverter:** não é tão caro, mas define a arquitetura de notificações: um lembrete diário via push remoto exige
  backend agendando por fuso e mantendo tokens; via notificação local não exige backend nem token e funciona offline.
- **Recomendação:** lembrete diário = notificação local agendada no aparelho; push remoto apenas para comunicados (e no futuro,
  social). Detalhe em `ARCHITECTURE_V0.md`.
- **Depende de:** nada.

---

## B. PODE ESPERAR (Sprint 1–2)

### B1. Provedor de push remoto (Expo Push / FCM direto / OneSignal)
- Tokens são re-registráveis; se guardarmos tokens em tabela própria, trocar de provedor é barato. Decidir no Sprint 1 junto com a stack.

### B2. OTA / code push (EAS Update / Shorebird)
- Pode ser adicionado em qualquer release; sem migração de dados. Decidir quando houver processo de release. Regras das lojas em `MOBILE_STORE_REQUIREMENTS.md`.

### B3. Ferramenta de analytics/crash específica (PostHog vs Firebase Analytics; Sentry vs Crashlytics)
- Eventos são *fire-and-forget*; trocar ferramenta perde histórico, mas não afeta o produto. Princípios (A15) já decididos.

### B4. Motor de sincronização (PowerSync / Electric / próprio)
- Com as convenções de A9, começar com sync simples (outbox + pull incremental) e migrar para um motor só se houver necessidade
  (grupos, realtime). Reversível porque o esquema já é "sync-ready".

### B5. Versões mínimas de OS e suporte a tablet
- Depende dos defaults da stack e do parque de aparelhos real da congregação (Android de entrada é comum no Brasil).
  Decidir no Sprint 1 com dados; tratar layout responsivo desde o início (Android 16 impede travar orientação em telas grandes).

### B6. Criptografia ponta-a-ponta (E2E) de notas
- Default V1: **sem E2E** (criptografia em repouso do provedor + RLS estrita + minimização). E2E impediria busca no servidor,
  recuperação de conta e qualquer feature social. Migrar notas para E2E depois é possível (cliente recriptografa), mas raro de precisar.
  Decidir com o PB apenas se "reflexões" virarem produto sensível de fato.

### B7. Estrutura de repositório, CI, estratégia de testes, ambientes (dev/staging/prod)
- Definir no Sprint 1. Regra já conhecida: projetos/instâncias separados para produção desde antes dos primeiros usuários reais.

### B8. Feature flags / remote config
- Adicionável a qualquer momento (PostHog/Remote Config). Não construir sistema próprio.

### B9. Backups/PITR
- Ativar antes do primeiro usuário real; custo mensal; sem impacto arquitetural.

### B10. Busca full-text local (FTS5) vs busca remota
- Depende da fonte de texto (A7) e da licença; com texto empacotado, FTS5 local é a escolha natural — decidir no Sprint 1.

---

## C. NÃO DECIDIR AINDA (dependem do Product Brain)

| Hipótese | O que NÃO fazer agora | Opcionalidade barata que já fica garantida |
|---|---|---|
| Grupos / comunidade / feed / comentários / reações | Nenhuma tabela, tela ou regra social | Dados pessoais com `user_id` claro; notas com campo `visibility` (default `private`) pode ser adicionado depois por migração trivial; push remoto previsto |
| Amigos / ranking | Nada | Eventos de progresso (A8) permitem derivar métricas depois |
| Streak / badges / gamificação | Nada. Atenção: o ECA Digital (Decreto 12.880/2026, art. 9º) veda, por padrão para menores, "recompensas pelo tempo de uso" e "notificações excessivas" — qualquer streak/ranking futuro precisa de desenho compatível (ver `MOBILE_STORE_REQUIREMENTS.md`) | A8 + A11 |
| Diagnóstico / personalização | Nada | Eventos + consentimento (A12) |
| Diário / reflexões públicas | Nada além de notas privadas | Notas por versículo já cobrem "reflexão privada" |
| IA (resumos, perguntas ao texto) | Nada; nenhum SDK | Texto canônico (A6/A7) é pré-requisito natural |
| Ministérios / multi-igreja / SaaS | Nenhum `org_id`, nenhuma multi-tenancy | A4 (conta pertence ao app) mantém a porta aberta |
| Áudio da Bíblia | Nada | A7 permite fonte de áudio como provedor adicional |
| Monetização / doações | Nada (fora de escopo) | — |
| Marca final (Lagoinha vs neutra) | Não embutir marca em identificadores (A13) | Nome de exibição e assets são trocáveis |

---

## D. Opcionalidade barata — convenções que custam ~zero agora

1. UUIDs gerados no cliente para registros de usuário (A5, A9).
2. Colunas `created_at`, `updated_at`, `deleted_at`, `device_id`, `client_updated_at` em tabelas de usuário (A9).
3. Referência bíblica canônica (A6) e interface de provedor de texto (A7).
4. Log de eventos de progresso (A8).
5. Planos versionados e imutáveis após publicação (A10).
6. Strings de UI externalizadas (i18n-ready) mesmo com conteúdo só em pt-BR.
7. Registro de consentimento e cascata de exclusão (A12).
8. Identificadores de app sem marca e domínio próprio (A13, A14).
9. Tokens de push em tabela própria, desacoplados do provedor (B1).
10. Nenhum SDK de anúncios/atribuição (A15).

## E. O que explicitamente NÃO construir agora

App completo, dezenas de telas, schema gigantesco, rede social, painel admin, branding/logo, monetização, multi-tenancy, IA,
design system completo, deployment de produção, motor de sync próprio sofisticado, backend próprio, E2E de notas, sistema
próprio de push, sistema próprio de feature flags, CMS próprio para planos (usar tabelas + seed/JSON versionado em V1).
