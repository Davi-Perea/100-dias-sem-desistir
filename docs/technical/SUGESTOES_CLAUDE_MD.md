# Sugestões de atualização do CLAUDE.md

- **Data:** 2026-09-21. **Autor:** Claude (engenharia). **Para:** Davi, que é o dono do `CLAUDE.md` e decide.
- **O que este arquivo é:** uma lista de frases do `CLAUDE.md` que deixaram de bater com o repositório, cada uma com a
  frase atual, uma sugestão e a evidência. **O `CLAUDE.md` não foi alterado.**
- **Por que importa:** o `CLAUDE.md` é lido por todo agente no começo de toda sessão. Uma frase envelhecida vira ordem.
  Exemplo concreto: "nenhum projeto deve ser inicializado" e "Hipóteses NÃO aprovadas: … reflexões, ministérios"
  proíbem, ao pé da letra, trabalhar no app que existe.
- **Onde há decisão de produto no meio** (itens 5 e 6), a sugestão só registra o estado; quem decide é o fundador com
  o Product Brain (`docs/product/PARA_O_PRODUCT_BRAIN.md`, pergunta 10).

---

## 1. Seção "Estado atual" — o app e as Fases 5–8

**Atual:**
> `mobile/` é o app V1: Fases 1–4 construídas e testadas com **fixtures DEV**; Fases 5–8 existem como schema SQL não aplicado.

**Sugerida:**
> `mobile/` é o app V1. Embarca o **material real** dos 100 Dias com `rights_status = pending_authorization` (as
> fixtures DEV ficaram só para testes e painel DEV). Funciona inteiro sem conta e offline. A parte com conta
> (e-mail + código, grupos, papéis — Execution 02) existe em código e em duas migrations **não aplicadas**; não há
> servidor. Social, feed e moderação não existem. Estado detalhado: `docs/technical/V1_BUILD_STATUS.md`.

**Evidência:** `mobile/src/journey/datasetSource.ts:1` importa `content/100-dias-2026/dataset.json`; o schema
"completo" (`0001_schema.sql`, `0002_rls.sql`) foi apagado no commit `bc74dae` (20/09); o que existe são
`supabase/migrations/20260907120000_foundation.sql` e `20260907120100_rls.sql` (5 tabelas); `isCloudConfigured()`
é falso em toda build.

## 2. Seção "Estado atual" — o git

**Atual:**
> Repositório git em `main` com um commit (Execution 01). **Nunca fazer commit sem autorização explícita.**

**Sugerida:**
> Repositório git em `main`, sem remoto. O histórico é a fonte de verdade de quantos commits existem
> (`git log --oneline`). **Nunca fazer commit sem autorização explícita.**

**Evidência:** `git log` tem 8 commits em 21/09 (de `657cda8` a `bd4fe5d`). Não colocar o número no arquivo evita que
ele envelheça de novo no próximo commit.

## 3. Seção "Estado atual" — data de chegada às lojas

**Atual:**
> A campanha começa em **23/09/2026** e o app entra em andamento (entrada tardia é comportamento de produto).

**Sugerida:**
> A campanha começa em **23/09/2026**. O app **não** estará nas lojas no Dia 1: faltam entidade jurídica, D-U-N-S,
> contas Apple/Google e a autorização escrita da igreja. Projeção da V1: segunda quinzena de outubro
> (`docs/product/PLANO_DE_LANCAMENTO.md`). O app entra com a campanha em andamento, e entrada tardia é
> comportamento de produto.

**Evidência:** `PLANO_DE_LANCAMENTO.md` §0, itens 1 e 3.

## 4. Seção "Estado atual" — o redesenho

**Atual:** o `CLAUDE.md` não menciona o redesenho.

**Sugerida (linha nova):**
> Redesenho em implementação a partir de `design_handoff_100_dias/` (PROMPT, TOKENS, TELAS, REGRAS). Etapa 1
> (tokens e primitivos) pronta; telas locais (grupos A, B, D, E, F) em implementação; grupo C (Comunidade)
> aguardando ratificação e servidor. Lacunas em `design_handoff_100_dias/LACUNAS.md`. Erro técnico do desenho
> (contraste, token, acessibilidade) se corrige na implementação; mudança visual ou de produto volta ao dono.

**Evidência:** `design_handoff_100_dias/PROMPT.md` ("Ordem de implementação"); a regra de correção técnica já está na
memória do agente (`feedback-design-vs-engineering.md`), mas não no arquivo que todo agente lê.

## 5. Seção "Contexto do produto" — hipóteses não aprovadas

**Atual:**
> **Hipóteses NÃO aprovadas** (não implementar sem aprovação do Product Brain): feed, grupos, amigos, comunidade,
> comentários, reações, streak, badges, gamificação, diagnóstico, personalização, diário, reflexões, IA, ministérios, ranking.

**Problema:** três itens da lista **existem no app hoje** e vieram do próprio MASTER SPEC ou do handoff, e outros
quatro foram decididos pelo fundador em 20/09, sem ratificação ainda:

| Item | No app hoje | Origem |
|---|---|---|
| reflexões | Reflexão privada por dia, local (`src/reflections/reflectionsStore.ts`, `app/reflexao/[day].tsx`) | MASTER SPEC §11 |
| ministérios | "Meu ministério" local e escala do altar (`src/journey/ministries.ts`, `app/ministerio.tsx`) | material da igreja (escala) |
| grupos | Grupos com líder e admin no servidor, em código (`src/cloud/groups.ts`, `app/grupo/[id].tsx`) | Execution 02 |
| feed, comunidade, comentários, reações | Não existem; decisão do fundador de 20/09 pendente de ratificação | `docs/design/00-DECISAO-FEED.md` |

`docs/design/04-invariantes.md` já registra esse conflito como incerteza **I-3**.

**Sugerida (três listas em vez de uma):**
> - **Aprovado e no app:** reflexão privada por dia (local), "meu ministério" e escala do altar (local), jejum
>   privado (local), grupos com líder e admin (em código, sem servidor).
> - **Decidido pelo fundador em 20/09, aguardando ratificação do Product Brain:** feed/comunidade, comentários,
>   reação "Amém" sem contador (`docs/product/PARA_O_PRODUCT_BRAIN.md`). Não implementar antes da ratificação.
> - **Continua NÃO aprovado:** amigos, streak, badges, gamificação, ranking, diagnóstico, personalização além de
>   preferências de leitura e lembrete, diário além da reflexão por dia, IA.

## 6. Seção "Decisões vigentes" — ADRs em PROPOSTA e "nenhum projeto deve ser inicializado"

**Atual:**
> Enquanto os ADRs estiverem em PROPOSTA, nenhuma stack está decidida e nenhum projeto deve ser inicializado.

**Problema:** o projeto foi inicializado em 07/09 com a stack do ADR-001 e é a V1 em construção; a frase contradiz o
"Estado atual" do mesmo arquivo. Os dois ADRs continuam com "Status: PROPOSTA" no cabeçalho.

**Sugerida (o fundador escolhe uma):**
> (a) ADR-001 e ADR-002 **aprovados na prática** em 2026-09-07, quando o MASTER SPEC foi aprovado para build e o
> app foi iniciado sobre eles; mudar o status dos dois para APROVADA. Mudar de stack agora exige ADR novo.
>
> (b) Se o fundador não quer aprová-los formalmente: "A stack do ADR-001 está em uso no `mobile/`. Trocar de stack ou
> de backend exige ADR novo e aprovação; não iniciar outro projeto."

## 7. Seção "Decisões vigentes" — o que os ADRs dizem e o código não faz

**Atual (trechos):**
> ADR-001: React Native + Expo (SDK 57 / RN 0.86), EAS Build/Submit na nuvem (Windows sem Mac), development builds, expo-sqlite (FTS5), EAS Update só para correções.
>
> ADR-002: … Auth = e-mail OTP + Sign in with Apple + Google, sessão anônima sob demanda; sync offline próprio (outbox + LWW + pull incremental); lembrete diário local; push remoto via Expo Push; Sentry + PostHog na UE.

**Sugerida:** manter como decisão, mas acrescentar o estado real ao lado, para ninguém supor que existe:
> **Implementado hoje:** Expo SDK 57 / RN 0.86, Expo Router, AsyncStorage (não expo-sqlite), e-mail OTP, lembretes
> locais. **Não implementado:** expo-sqlite/FTS5, EAS Update, Sign in with Apple/Google, sessão anônima, sync,
> push remoto, Sentry, PostHog. **Nenhum build EAS feito** (`EAS_PROJECT_ID = null`; `expo-dev-client` não instalado).

**Evidência:** `mobile/package.json` (sem `expo-sqlite`, `expo-updates`, Sentry ou PostHog);
`src/cloud/auth.ts:8-9` ("Sem senha, sem Google, sem Apple"); `app.config.ts:45`.

## 8. Seção "Decisões vigentes" — conteúdo bíblico

**Atual:**
> Conteúdo: V1 com textos abertos empacotados (Bíblia Livre CC BY como padrão provisório; Biblica Open Nova Bíblia Viva 2007 CC BY-SA 4.0 como "leitura fácil") …

**Sugerida:**
> Conteúdo bíblico: o leitor **não mostra texto** hoje (provedor de desenvolvimento, "texto ainda não liberado").
> Gate 1 em decisão até 25/09 (`docs/product/GATE_1_DECISAO.md`): a recomendação é a V1 só com referências + "Li na
> minha Bíblia" + link externo, com texto aberto (Bíblia Livre de preferência à ONBV) ou tradução por contrato depois.
> Traduções protegidas só por contrato. Nunca ingerir fontes da lista de bloqueio.

**Evidência:** `src/app/_layout.tsx:16` (`setBibleProvider(devBibleProvider)`); `GATE_1_DECISAO.md` §5.

## 9. Seção "Regras invioláveis do conteúdo" — nomes de líderes

**Atual:**
> Nomes de líderes só aparecem com `leader_names_authorized`.

**Sugerida:**
> Nomes de líderes **nem entram no dataset** sem `leader_names_authorized` (o conversor não os gera e o portão de
> produção recusa dataset que os traga): esconder na tela não basta, porque o JSON vai inteiro para o binário.
> `content/100-dias-2026/rights.json` é o único arquivo de conteúdo editado à mão.

**Evidência:** `scripts/convert-100-dias.mjs` (campo `altar.leaders_label`); `src/journey/validator.ts:186-196`;
Execution 04 §1.3.

## 10. Seção "Lojas/legal" — o que mudou em setembro

**Atual:**
> Lojas/legal: uso sem login; exclusão de conta no app e por web; contas de desenvolvedor como Organização em nome da entidade dona; conta só ≥ 18 (ou ≥ 16/17) na V1; distribuição só Brasil; analytics off por padrão; sem mecânicas de uso compulsivo.

**Sugerida (acrescentar ao fim):**
> ECA Digital (Lei 15.211/2025) e Decreto 12.880/2026: feed tem de ter fim e nada toca sozinho; streak e badges ficam
> fora por decisão de produto, não por proibição legal (`docs/product/comunidade/02-lei.md`). Apple pergunta desde
> setembro de 2026 se o app tem "social media": com feed amplo, a faixa no Brasil é **A16 para o app inteiro**
> (`comunidade/01-lojas.md` §1.5). Android: a partir de **30/09/2026** apps de desenvolvedor não verificado deixam
> de instalar em aparelhos certificados no Brasil (`docs/technical/ANDROID_VERIFICACAO_30_09.md`). Fatos de loja
> mudam: reverificar antes de submeter.

## 11. Seção "Ambiente de desenvolvimento"

**Atual:**
> Windows 10 Pro. Node v24.18.0, npm 11.16.0, git 2.55. Sem Xcode/Mac, sem Flutter/Dart, sem Java, sem Python.

**Sugerida (acrescentar):**
> Sem Android SDK, sem Docker e sem Supabase CLI: nenhum SQL e nenhum teste pgTAP (`mobile/supabase/tests/`) foi
> executado. **Nada foi testado em aparelho real**; o navegador é o único proxy visual. Reverificado em 2026-09-21.

**Evidência:** `EXECUTION_02_CLOUD_FOUNDATION.md` ("sem Docker"); `SEGURANCA_MIGRATIONS_CORRECOES.md` ("não há banco
nem Supabase CLI"); `V1_BUILD_STATUS.md` §7.

## 12. Seção "Mapa de documentos"

**Atual:** lista só ADRs, arquitetura, segurança, lojas, decisões difíceis e a pesquisa do Sprint 0.

**Sugerida (acrescentar):**
> - `docs/technical/V1_BUILD_STATUS.md` — estado real do build, portões, o que nunca foi testado em aparelho.
> - `docs/technical/EXECUTION_02_CLOUD_FOUNDATION.md`, `EXECUTION_03_CONTEUDO_REAL.md`, `EXECUTION_04_REVISAO.md` —
>   identidade e grupos; conversão do material da igreja; revisão adversarial e achados em aberto.
> - `docs/technical/BUILD_E_IDENTIFICADORES.md`, `ANDROID_VERIFICACAO_30_09.md`, `EXPO_GO_TESTE_RAPIDO.md` — como
>   gerar o primeiro build e instalar no celular.
> - `docs/technical/SEGURANCA_MIGRATIONS_CORRECOES.md` — passada de segurança nas migrations (21/09).
> - `docs/product/` — plano da fase final, plano de lançamento, Gate 1, pedido ao Product Brain, conversa com a igreja,
>   rascunhos de ficha de loja e recado aos líderes; `docs/product/comunidade/` — decisões, lojas, lei, dados e moderação
>   da Comunidade.
> - `docs/legal/` — rascunhos (não pareceres) de autorização da igreja, política de privacidade, regras da comunidade,
>   pais e proteção.
> - `docs/design/` — pacote de design autocontido e decisão do feed; `design_handoff_100_dias/` — o redesenho em
>   implementação, com LACUNAS e PERGUNTAS_AO_DESIGNER.

---

## O que **não** sugiro mudar

- "Nunca fazer commit sem autorização explícita", os papéis (Product Brain, Claude, Davi) e o formato
  `PROBLEMA → EVIDÊNCIA → IMPACTO → ALTERNATIVAS → RECOMENDAÇÃO`.
- Todas as "Regras invioláveis do conteúdo" além do ajuste do item 9: continuam exatas.
- As regras de engenharia 1 a 7.

---

## 13. Decisões do fundador de 2026-09-21 (acrescentado em 2026-09-21)

Registro completo em `docs/product/DECISOES_DO_FUNDADOR.md`. O `CLAUDE.md` **não foi alterado**; abaixo, o que o
fundador pode colar.

**13.1 "Hipóteses NÃO aprovadas"** — tirar feed, comunidade, comentários e reações da lista e acrescentar:
> **Decidido pelo fundador em 2026-09-21, no lugar da ratificação do Product Brain:** Comunidade (feed da igreja,
> comentário no post, "Amém" sem contador), como **atualização depois da V1**. **Sem mensagem privada** na primeira
> Comunidade. As regras de loja e lei da Comunidade (`design_handoff_100_dias/REGRAS.md` §3) continuam bloqueantes.

Isso substitui, para esses itens, a sugestão do §5 acima ("aguardando ratificação").

**13.2 "Regras invioláveis do conteúdo" — Gate 1** (substitui "Licença da tradução bíblica (Gate 1) continua um
problema independente: o material só traz referências, nunca texto"):
> **Gate 1 decidido em 2026-09-21 (opção b1):** a **Bíblia Livre** (eBible `porbr2018`, CC BY 4.0) vai empacotada numa
> aba Bíblia, com atribuição, aviso de alteração quando houver e sem cifragem. O material da igreja continua só com
> referências. Ler na aba Bíblia **não conclui dias** nem revela conteúdo da igreja de dias futuros. Outras traduções
> só por contrato. Gate 1 segue independente do Gate 2.

Isso substitui a sugestão do §8 acima.

**13.3 "Decisões vigentes" — Conteúdo:** trocar "Bíblia Livre CC BY como padrão provisório; … ONBV como 'leitura
fácil'" por "Bíblia Livre empacotada (decidido 2026-09-21); ONBV não entra na V1".

**13.4 "Estado atual":** acrescentar
> V1 vai à App Store (conta pessoal do fundador, caminho expresso) **sem Comunidade**; Comunidade vem como atualização
> (`docs/product/LANCAMENTO_EXPRESSO_IOS.md`, `docs/product/DECISOES_DO_FUNDADOR.md`).
