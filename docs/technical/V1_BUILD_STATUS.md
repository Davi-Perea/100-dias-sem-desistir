# V1 — Estado do build

- **Data desta versão:** 2026-09-21, 03h (horário de Brasília). Reescrita do zero; a versão de 2026-09-07 estava
  desatualizada em pontos que enganavam (ver §11).
- **Método:** leitura do código em `mobile/`, do `git log`, de `EXECUTION_04_REVISAO.md`, de
  `design_handoff_100_dias/*.md` e de `docs/design/*`. Rodei `jest`, `tsc --noEmit` e `content:check` nesta data.
  `expo lint` e `expo-doctor` **não** foram rodados nesta auditoria.
- **Spec:** MASTER PRODUCT SPEC v1.1 (aprovado para build em 2026-09-07) + redesenho `design_handoff_100_dias/`.
- **Campanha:** 23/09/2026 a 31/12/2026 (Dia 1 é depois de amanhã). O app **não** estará nas lojas no Dia 1:
  a data honesta da V1 é a segunda quinzena de outubro (`docs/product/PLANO_DE_LANCAMENTO.md` §0, projeção, não fato).

> **Atenção ao ler:** um redesenho está sendo implementado **agora** por outros agentes em `mobile/src/app/**` e
> `mobile/src/ui/**`. Tudo o que este arquivo diz sobre telas vale para o estado de 21/09 às 03h e muda a cada hora.
> O que ele diz sobre **lógica** (dia oficial, conteúdo, portões, armazenamento local, lembretes) é estável.

---

## 0. Em dez linhas

1. O app funciona inteiro **sem conta e sem internet**: jornada de 100 dias, dia oficial da igreja, conclusão,
   reflexão, jejum, intercessão com modo altar, marcos, lembretes locais.
2. Ele embarca o **material real da igreja** (não fixtures), com `rights_status = pending_authorization`.
3. Build de desenvolvimento mostra "aguardando autorização"; build de release **fecha na abertura** de propósito.
4. O leitor **não mostra texto bíblico** (Gate 1 aberto): mostra livro, capítulo e "texto ainda não liberado".
5. A parte com conta (e-mail + código, grupos, papéis) existe em código, mas **nenhum servidor existe**.
6. O redesenho está no meio: etapa 1 (tokens e primitivos) pronta; telas locais em implementação; Comunidade parada.
7. **Nada foi instalado num celular real.** Nenhum build EAS foi feito (`EAS_PROJECT_ID` é `null`).
8. Testes: **525 no total, 514 passando, 11 falhando**, todos em `sqlPolicies.test.ts`, desde a edição de hoje das migrations.
9. A migration `20260907120000_foundation.sql` está hoje com **SQL inválido** (§8, achado A1).
10. 8 commits em `main`; 97 arquivos alterados ou novos fora de commit (redesenho, docs, `app.config.ts`, `eas.json`).

---

## 1. O que existe e funciona

"Funciona" aqui quer dizer: coberto por teste automatizado e/ou visto no navegador. **Não** quer dizer visto em
aparelho (§7).

### 1.1 Núcleo da jornada (lógica estável)

| O quê | Onde | Observação |
|---|---|---|
| Dia oficial igual para toda a igreja, pelo fuso da campanha (offset fixo −180), independente do fuso do aparelho | `src/journey/officialDay.ts` | O Brasil não tem horário de verão desde 2019; o offset fixo é deliberado |
| Fases `before_start` / `running` / `finished`; nenhum dia abre antes de 23/09, nem o Dia 1 | `src/journey/useJourney.ts:74` | O clamp do dia oficial é para exibição, nunca para permissão |
| Entrada tardia sem dívida: quem chega no Dia 20 vê o Dia 20, os anteriores ficam "em aberto", nunca "falhou" | `useJourney.ts:76-92`, `progress/completionsStore.ts` | |
| Bloqueio de dia futuro **na rota**, não no botão: `/dia`, `/reader`, `/reflexao`, `/intercessao` | as quatro rotas `[day].tsx` | Deep link para dia futuro cai no cadeado sem revelar conteúdo nem pedir passagem ao provedor |
| Marcos 7/25/50/75/100 pela **contagem pessoal** de leituras, uma vez por marco, sem streak | `journey/milestones.ts`, `journey/useMilestoneTrigger.ts` (montado em `(tabs)/_layout.tsx`) | Rota `/marco/[day]` recusa marco não alcançado |
| Estimativa de leitura (capítulos exatos, minutos com "~") | `journey/readingSummary.ts` | |
| "Meu ministério" local, derivado da escala | `journey/ministries.ts`, `app/ministerio.tsx` | Fica no aparelho |

### 1.2 Conteúdo real e portão de direitos

| O quê | Onde |
|---|---|
| Fontes da igreja versionadas, nunca editadas (três `.docx` de 2026-08-28) | `mobile/content/source/` |
| Conversor determinístico: 100 dias, 1.189 capítulos exatamente uma vez, 11–12 por dia, sete montes em rotação, versículo-base dentro da leitura, 39 ministérios; qualquer divergência guia × escala é erro | `mobile/scripts/convert-100-dias.mjs` |
| `dataset.json` e `proposito.json` gerados; `npm run content:check` **OK em 21/09** | `mobile/content/100-dias-2026/` |
| Direitos no único arquivo editado à mão: `pending_authorization`, `rights_reference: null`, `leader_names_authorized: false` | `content/100-dias-2026/rights.json` |
| Nomes de líderes **nem são gerados** no dataset sem autorização (não só escondidos na tela); o portão recusa dataset que os traga | conversor + `validator.ts:186-196` |
| Citações bíblicas do material viram bloco `scripture` auditável, com teto de 3 (hoje 1: Levítico 6:13) | conversor, `journey/proposito.ts` |
| Portão de produção: release sem `authorized` lança erro na abertura; `--require-authorized` falha antes do build | `journey/datasetSource.ts:33-50` |
| Fixtures `DEV_ONLY` continuam para testes e painel DEV, com banner | `journey/fixtures/devCampaign.ts` |

### 1.3 Dados pessoais (tudo local, AsyncStorage)

| Dado | Chave | Observação |
|---|---|---|
| Conclusões por dia | `completions:v1:<campanha>` | Fonte de verdade do progresso; sem sync |
| Jejum | `fasting:v1:<campanha>` | Nenhuma função tem caminho de rede, por regra |
| Reflexões | `reflections:v1:<campanha>` | Excluir pede confirmação |
| Preferências, marcos vistos, ministério, lembretes | `settings:v2` | |
| Posição do leitor | `reader-position:v1` | **Gravada e nunca lida** (§8, achado A6) |

Analytics: vocabulário de eventos num buffer em memória, **desligado por padrão**, nenhum fornecedor conectado
(`src/analytics/analytics.ts`). Os tipos não têm campo para reflexão, jejum, e-mail ou nome.

### 1.4 Lembretes locais

| Família | Quando | Onde |
|---|---|---|
| Leitura diária | horário escolhido, repetição diária | `reminders.ts:117-137` |
| Véspera do dia do meu ministério | 19h da véspera | `ministryReminderPlan` |
| Altar de hoje | 12h, janela rolante de 14 dias refeita a cada abertura | `altarReminderPlan` |

A permissão do sistema só é pedida num **gesto** (escolher horário, escolher ministério, marcar o aviso do altar).
O hook de fundo (`useReminderSync`) só lê a permissão. Android sem alarme exato, de propósito.

**2026-09-21 (decisão do fundador):** o horário da leitura diária é escolhido num seletor único
(`ui/lembrete/ReminderTimePicker.tsx`: 6:00, 7:00, 12:00, 19:00, 21:00, "Outro horário" pelo seletor do sistema,
"Sem lembrete"). O título da leitura diária saiu da D-5: agora é "Hora de ler a Bíblia", com "Leitura de hoje:
<referência do dia>" no corpo; fora da campanha nada é agendado. Véspera e altar continuam neutros.
O plugin de config do `@react-native-community/datetimepicker` (só tema do Android) não foi adicionado ao `app.config.ts`.

**Modo demonstração** (`config/demo.ts`, só development build): `EXPO_PUBLIC_DEMO_MODE=true` em `mobile/.env.local`
simula o Dia `EXPO_PUBLIC_DEMO_DAY` (padrão 3), marca os dias 1..(dia − 2) como concluídos na primeira abertura sem
progresso (ficam gravados; limpar com "Apagar progresso") e esconde o painel DEV do Você.

### 1.5 Telas que existem hoje (antes do fim do redesenho)

Abas: **Jornada** (`/`, `(tabs)/index.tsx`, que absorveu o antigo Início) · **Comunidade** (`(tabs)/juntos.tsx`,
conteúdo provisório do antigo "Juntos") · **Você**. Rotas: `dia`, `reader`, `reflexao`, `intercessao` (com modo
altar), `marco`, `proposito`, `ministerio`, `jejum`, `reflexoes`, `lembrete`, `aparencia`, `ajuda`, `conta`,
`grupo/[id]`, `admin`, `dev`, `componentes`, e onboarding em quatro passos (`index`, `leitura`, `jejum`, `lembrete`).
Saíram nesta rodada, fora de commit: `(tabs)/jornada.tsx`, `onboarding/pronto.tsx`, `app.json` (virou `app.config.ts`).

---

## 2. O que é provisório

| Item | Estado |
|---|---|
| **Texto bíblico** | Provedor de desenvolvimento (`reader/devProvider.ts`) com a caixa "TEXTO AINDA NÃO LIBERADO". Nenhuma tradução |
| **Tradução da citação de Levítico 6:13** em "Sobre o propósito" | A igreja ainda não disse qual é; a atribuição está incompleta |
| **Ícone, splash, ícone de notificação** | Do template Expo / PNG transparente. Ícone de notificação Android não existe |
| **Marca** | Pomba em PNG 224×144; SVG oficial pendente |
| **Identificador de loja** | `PRODUCTION_IDENTIFIER = null`: a variante `production` recusa gerar config de propósito (`app.config.ts:34`). Dev e preview usam `br.provisorio.bibliaapp.*` |
| **Projeto EAS** | `EAS_PROJECT_ID = null`. `expo-dev-client` **não está instalado**, e o perfil `development` do `eas.json` depende dele (`BUILD_E_IDENTIFICADORES.md` passo 1) |
| **Aba Comunidade** | Mostra altar, "Sobre o propósito", grupo e avisos de "ainda não disponível". Não existe feed |
| **Progresso coletivo** | `community/communityState.ts` devolve sempre "indisponível"; nenhum número inventado |
| **Tema escuro** | Derivado por engenharia de uma tela; ninguém desenhou. Proposta para a etapa 8 em `docs/design/TEMA_ESCURO_PROPOSTA.md` |
| **Várias decisões de tela** | Marcadas no código como `PROVISÓRIO (pergunta N ao designer)` ou `LACUNAS Pxx`. Lista em `design_handoff_100_dias/PERGUNTAS_AO_DESIGNER.md` |
| **Painel DEV e catálogo** | Ferramentas internas; o catálogo se tranca em release, o painel **não** (§8, achado A2) |

---

## 3. O redesenho em andamento

Fonte: `design_handoff_100_dias/` (PROMPT, TOKENS, TELAS, REGRAS, LACUNAS com 193 achados, PERGUNTAS_AO_DESIGNER).
Ordem do PROMPT: 1 tokens e primitivos → 2 Grupo A (Jornada e dia) → 3 B (Ler) → 4 C (Comunidade) → 5 D (Você)
→ 6 E (intercessão, altar, marcos) → 7 F (entrada e estados) → 8 tema escuro.

| Etapa | Estado em 21/09 |
|---|---|
| **1 · Tokens e primitivos** | **Pronta.** `ui/theme.ts` reescrito, primitivos novos (`BackBar`, `LockSheet`, `Skeleton`, `TextField`), catálogo em `/componentes` (só em `__DEV__`), `componentesBase.test.tsx` |
| **A, B, D, E, F · telas locais** | **Em implementação agora.** Pastas novas `ui/jornada`, `ui/leitor`, `ui/voce`, `ui/altar`, `ui/entrada`; testes novos `jornadaDia`, `leitor`, `voce`, `entrada`, `fundacao`, `milestoneTrigger`. Nada disso está commitado |
| **C · Comunidade** | **Parada, aguardando decisões e servidor.** A decisão do fundador de 20/09 (feed) está **pendente de ratificação** do Product Brain (`docs/product/PARA_O_PRODUCT_BRAIN.md`, 10 perguntas: alcance, idade, moderação, D4, data, classificação A16). Recomendação escrita: V1 sem Comunidade; Comunidade como segunda versão com data-limite 15/11. Exige servidor, consentimento versionado, moderação humana, denúncia e bloqueio — nada disso existe |
| **8 · Tema escuro** | Proposta escrita, não implementada como etapa |

O redesenho **não troca** a lógica do §1.1–1.4. Onde o desenho contradiz uma regra (texto bíblico, nome de líder,
dia futuro, contagem de falta), o código registra `CORREÇÃO TÉCNICA` e a pergunta volta ao designer ou ao dono.

---

## 4. Os portões

| Portão | O que é | Estado | O que acontece enquanto estiver fechado |
|---|---|---|---|
| **Gate 1 — tradução bíblica** | Qual texto o leitor mostra | **Aberto.** Decisão pedida até 25/09 (`docs/product/GATE_1_DECISAO.md`). Recomendação: V1 só com referências + "Li na minha Bíblia" + link externo, e carta à editora em paralelo | O leitor mostra referência e a caixa "texto ainda não liberado". Não trava a V1 |
| **Gate 2 — autorização escrita da igreja** | Publicar o guia e a escala no app; decisão separada sobre nomes de líderes | **Aberto.** Rascunho em `docs/legal/AUTORIZACAO_DA_IGREJA_rascunho.md` | Build de desenvolvimento avisa "aguardando autorização"; **build de release fecha na abertura**. Nomes de líderes não entram nem no binário |
| Gate 3 — regras de menores | ECA Digital (Lei 15.211/2025), idade mínima de conta | Aberto, depende de advogado | Conta só ≥ 18 no desenho; nenhuma conta real existe |
| Gate 4 — lojas | Entidade jurídica → D-U-N-S → contas Apple/Google (Organização), domínio, política de privacidade | Nada iniciado (`PLANO_DE_LANCAMENTO.md` §1) | Nenhum envio possível. Prazo escondido: **30/09**, verificação de desenvolvedor Android no Brasil (`ANDROID_VERIFICACAO_30_09.md`) |

---

## 5. Nuvem e servidor

A antiga afirmação "schema completo do spec §21 com RLS" **não vale mais**: `0001_schema.sql` e `0002_rls.sql`
foram **apagados** no commit `bc74dae` (20/09). O que existe é a fundação da Execution 02:

| Peça | Estado |
|---|---|
| `supabase/migrations/20260907120000_foundation.sql` | 5 tabelas: `profiles`, `groups`, `group_memberships`, `app_admins`, `admin_audit_log`; guardas de escalada de papel. **Editada hoje** pela passada de segurança (`SEGURANCA_MIGRATIONS_CORRECOES.md`) e, neste momento, **com SQL inválido** (§8, A1) |
| `supabase/migrations/20260907120100_rls.sql` | RLS, grants por coluna, funções administrativas em schema `private`. Editada hoje |
| `supabase/seed.dev.sql`, `supabase/tests/*.test.sql` (pgTAP) | Nunca rodados: não há banco, nem Supabase CLI, nem Docker nesta máquina |
| Cliente (`src/cloud/`) | E-mail + código (OTP), sessão cifrada (chave no Keychain/Keystore), grupos, papéis vindos do servidor, telas `conta`, `grupo/[id]`, `admin` |
| Configuração | `isCloudConfigured() === false` em toda build: não há `EXPO_PUBLIC_SUPABASE_URL`. O app segue inteiro em modo local |

**Não existe:** Sign in with Apple/Google, sessão anônima, sync de progresso, push remoto, Sentry, PostHog,
exclusão de conta (a função lança erro explícito, `cloud/auth.ts:116`), exportação de dados, feed, posts,
reações, denúncia, bloqueio, moderação, consentimento versionado.

**Sobre "Fases 5–8":** no vocabulário do MASTER SPEC, a Fase 5 (backend e auth) e a 6 (grupos) existem
**parcialmente, só em código e SQL não aplicado**; a 7 (social) e a 8 (moderação) **não existem em forma
nenhuma**. A Fase 10 (analytics) existe só como contrato local.

---

## 6. Validação executada em 21/09 (Windows, sem Android SDK, sem Mac)

| Verificação | Resultado |
|---|---|
| `jest` | **27 suítes, 525 testes: 514 passam, 11 falham.** As 11 falhas são todas em `src/__tests__/sqlPolicies.test.ts`, que ainda descreve as migrations de antes da passada de segurança de hoje (ex.: procura `public.dev_seed_roles`, que foi para `private`) |
| `tsc --noEmit` | limpo |
| `node scripts/convert-100-dias.mjs --check` | OK: `dataset.json` e `proposito.json` batem com as fontes |
| `expo lint`, `expo-doctor`, `expo export` | não rodados nesta data |

**Limite que vale para todo teste de tela deste repositório** (`EXECUTION_04_REVISAO.md` §1.13): o
`react-test-renderer` não roda Yoga, `onLayout` nunca dispara e não há métrica de glifo. Os testes de layout são
contrato de estilo, não prova de que o texto coube. O viewport padrão do harness é 750×1334 com fontScale 2.

---

## 7. O que nunca foi testado em aparelho real

**Tudo.** Nenhum build foi instalado em iPhone ou Android. O navegador (`expo start --web`) foi o único proxy
visual. `EXPO_GO_TESTE_RAPIDO.md` diz que o Expo Go "deve funcionar", mas não registra um teste feito, e o Expo Go da
loja deixa de abrir SDK 57 quando o SDK 58 sair.

Em particular, nunca foram vistos num telefone:

- entrega de notificação local (diária, véspera, altar), o diálogo de permissão do iOS e o comportamento com recusa;
- o portão de release fechando o app (sintoma real: erro, tela branca ou fechamento?);
- Dynamic Type/fonte do sistema em AX5 e 3,571×, Texto em Negrito, VoiceOver e TalkBack;
- modo altar: tela acesa (`useKeepAwake`), gesto de voltar do iOS desligado, voltar do Android;
- teclado na reflexão, edge-to-edge do Android (RN 0.86), barras de sistema, safe areas;
- haptics, fontes empacotadas, splash, tema escuro com a marca;
- Keychain/Keystore da sessão (nenhuma sessão real existiu);
- virada de meia-noite com o app aberto (ver §8, A5).

Roteiro mínimo quando houver aparelho: §10.

---

## 8. Achados desta auditoria de lógica (21/09)

Só entra o que tem cenário reproduzível. Severidade relativa a este app.

| # | Sev. | Onde | Defeito | Cenário |
|---|---|---|---|---|
| **A1** | alta (bloqueia servidor) | `supabase/migrations/20260907120000_foundation.sql:146,155,179,181` | Delimitador de função com **um** `$` (`as $` … `end $;`) em vez de `$$`. Postgres não aceita `$` sozinho como dollar-quote | `supabase db reset`/`db push` para em `syntax error at or near "$"` na criação de `private.handle_new_user`; nenhuma tabela depois dela é criada. Introduzido na edição de hoje; as outras funções do mesmo arquivo usam `$$`. O `SEGURANCA_MIGRATIONS_CORRECOES.md` declara o SQL "NÃO TESTADO", e é |
| **A2** | média | `app/dev.tsx:18` (sem guarda) + `journey/useJourney.ts:61-66` + `settings/settingsStore.ts:33` | O painel DEV não se tranca em release (o catálogo sim, `componentes.tsx:73`), e o `dayOverride` que ele grava é aplicado sem checar `__DEV__` | Build de loja já autorizado, depois do onboarding: abrir `bibliaapp://dev` → "Dia 100" → os 100 dias abrem no Dia 1, contra a regra do dia oficial. A mesma tela lista **todo o AsyncStorage na tela** (reflexões incluídas), troca o conteúdo para as fixtures fictícias e apaga dados. O override fica gravado em `settings:v2` |
| **A3** | média | `reminders/reminders.ts:129-134` | O lembrete diário é `DAILY` sem fim e nada o cancela quando a campanha termina (nem o suspende antes de ela começar) | Quem escolhe "Manhã" no onboarding hoje recebe "Sua leitura de hoje" às 07h de 22/09, com o app dizendo que a campanha começa em 23/09. E continua recebendo em 2027, todo dia, com a campanha encerrada |
| **A4** | baixa | `progress/completionsStore.ts:81-85`, usado em `(tabs)/index.tsx:152` | "Dias desde a última conclusão" é calculado pelo **número do dia** concluído mais alto, não pela data da conclusão (que está guardada) | Entrou no Dia 30 e lê um dia atrasado por dia: no Dia 31 conclui o Dia 2 às 8h; ao abrir a Jornada, `gap = 31 − 2 = 29` e aparece "Que bom ter você de volta" a quem leu ontem, com `return_after_gap` de 29 dias. Relacionado a LACUNAS A2, com causa nova: os timestamps existem e são ignorados |
| **A5** | baixa | `journey/useJourney.ts:43-52` | O relógio do dia oficial só avança quando o app volta do segundo plano; o comentário diz que a virada de meia-noite "não deve exigir reinício", e com o app aberto exige | Noite de 22 para 23/09 com a contagem regressiva aberta: à 00h01 a tela continua "antes da campanha" até a pessoa sair e voltar ao app. Cada `useJourney` tem o próprio relógio, então uma tela aberta depois da meia-noite e a Jornada embaixo dela discordam do dia |
| **A6** | baixa | `reader/readerPosition.ts:12` (sem chamador) e `app/reader/[day].tsx:61,107` | A posição de leitura é gravada a cada capítulo e **nunca lida**: o leitor sempre abre no capítulo 1 | Dia 17, ler até o capítulo 8 de 12, sair, voltar: capítulo 1. É dado classificado como sensível no `SECURITY_V0.md` guardado sem uso nenhum, contra a minimização da LGPD |
| **A7** | baixa (latente) | `cloud/secureStorage.ts:301-315` | AES-CTR com a **mesma chave e o mesmo contador** (`Counter(1)`) em toda gravação da sessão. O exemplo de referência do Supabase gera chave nova a cada `setItem` | Duas gravações da sessão (login e refresh) produzem cifrados com o mesmo fluxo de chave: `C1 ⊕ C2 = P1 ⊕ P2`. Só vale quando houver nuvem configurada, e hoje não há nenhuma |

Não entram como achado, por já estarem registrados: lembrete com dia num fuso e hora noutro (EXECUTION_04 §3, I),
"Dia 1" antes da campanha (F), marco gravado duas vezes (I), ausência de exclusão de conta e exportação (LACUNAS B14),
backup automático do sistema copiando dados locais (pendência aberta em `docs/legal/POLITICA_DE_PRIVACIDADE_rascunho.md` §3).

---

## 9. Pendências herdadas

- **24 achados confirmados em aberto** da Execution 04 (`EXECUTION_04_REVISAO.md` §3): leitor de tela (E),
  cópia e consistência (F), jejum aguardando a igreja (G), tokens e higiene (I). Mais o passe de acessibilidade
  aberto pela auditoria do grupo B (Texto em Negrito, título nativo congelado em 17px, contraste com `opacity`).
- **193 lacunas do redesenho** (`design_handoff_100_dias/LACUNAS.md`), com 18 perguntas ao designer (`PERGUNTAS_AO_DESIGNER.md`).
- **Nenhuma forma de apagar os dados locais** a não ser item por item ou desinstalando. O `CLAUDE.md` pede
  "exclusão completa" para dado sensível.
- `sqlPolicies.test.ts` precisa ser alinhado com as migrations novas (ou o contrário) antes do próximo commit.
- `PLANO_DE_LANCAMENTO.md` §0 ainda diz que não há `eas.json` e que o `app.json` se chama "Leitura Bíblica
  (spike)"; hoje existem `eas.json` e `app.config.ts` (fora de commit).

---

## 10. Roteiro de teste em aparelho (~1 hora)

Pré-requisitos: `npx expo install expo-dev-client`, `eas init`, `eas build --profile development --platform android`
(`BUILD_E_IDENTIFICADORES.md`). Ou Expo Go enquanto a loja ainda tiver o SDK 57.

1. Onboarding completo, recusando a permissão de notificação (não pode travar).
2. Jornada: concluir hoje, desfazer, abrir um dia passado, tocar num dia futuro (folha do cadeado, sem conteúdo).
3. Deep link direto para `/reader/<dia futuro>` e `/reflexao/<dia futuro>`: cadeado, sem referência.
4. Reflexão com teclado aberto em fonte grande; salvar; excluir.
5. Matar o app e reabrir: progresso, jejum e reflexão intactos.
6. Modo altar: tela acesa, voltar do Android sai do modo, gesto do iOS não fecha a tela.
7. Lembretes: agendar, "testar em 5 s", marcar aviso do altar, escolher ministério; conferir entrega.
8. Fonte do sistema no máximo + Texto em Negrito + VoiceOver/TalkBack nas telas A, B e E.
9. Painel DEV: simular Dia 1, 50, 100 e "Depois da campanha"; validar dataset (produção deve ficar BLOQUEADO).
10. Um build `preview`: confirmar e registrar o que a pessoa vê quando o portão fecha o app.
11. Deixar o app aberto na virada de meia-noite (ou mudar a hora do aparelho) e ver se o dia avança.

---

## 11. O que mudou em relação à versão de 2026-09-07 deste arquivo

| A versão anterior dizia | A verdade de hoje |
|---|---|
| "Nada commitado. `git status` continua com tudo não rastreado" | 8 commits em `main` (último `bd4fe5d`, 20/09 22h48); 97 caminhos fora de commit |
| Fases 1–4 "verificadas" sobre fixtures DEV; "Conteúdo real: Launch Gate 2, plano 42360 sem autorização" | O app embarca o guia real da igreja; o plano 42360 foi superado em 19/09 |
| Fases 5–8: "`0001_schema.sql` e `0002_rls.sql`: schema completo do spec §21 com RLS" | Esses arquivos foram apagados em `bc74dae`. Há só a fundação da Execution 02 (5 tabelas), não aplicada, e hoje sintaticamente quebrada |
| Jornada em `(tabs)/jornada.tsx`; Hoje em `(tabs)/index.tsx`; onboarding com "pronto" | Jornada virou a casa em `/`; `jornada.tsx` e `onboarding/pronto.tsx` foram apagados no redesenho |
| 64 testes / 239 testes | 525 testes, 11 falhando em `sqlPolicies` |
| Tamanho de fonte persistido, padrão 18 | Escala nova 14–30, padrão 19, com migração do 18 |
| "Permissão de notificação pedida só após a escolha" | Pedida só num gesto; o hook de fundo nunca pede (Execution 04, grupo C) |
