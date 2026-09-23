# Veredito das lojas: "está pronto para publicar na Apple e no Google, sem dar problema?"

- **Data:** 2026-09-22 · **Autor:** Claude (agente "Auditor de lojas"). **Não é parecer jurídico.**
- **Pergunta do fundador:** "está pronto para publicar na Apple e no Google, sem dar problema?"
- **O que eu fiz:** reabri as políticas hoje (lista de fontes no fim, todas com acesso em **2026-09-22**) e li o código
  dos **dois** diretórios como ele está agora — `C:\Users\Administrator\Bible Study App` (V1, branch `main`) e
  `C:\Users\Administrator\Bible Study App - comunidade` (branch `comunidade-v2`), **inclusive as mudanças desta rodada**:
  aceite no ato de publicar, foto direto, feed da igreja inteira, sem ministério.
- **Não alterei nenhuma linha de código.** Este documento lê e julga; quem implementa é outro agente.
- **Etiquetas:** **FATO** (fonte oficial com URL, ou linha de código lida hoje) · **INFERÊNCIA** (conclusão minha) ·
  **HIPÓTESE** · **NÃO CONFIRMADO** (procurei fonte primária hoje e não achei).
- **Antecessor:** `docs/product/CONFORMIDADE_LOJAS.md` (hoje, mais cedo). Este documento **não o substitui**: aquele é a
  tabela de exigências; este é o **veredito por versão**, com o que mudou nesta rodada e **quatro achados novos** que
  aquele não tinha (§5).
- Políticas de loja mudam. **Reverificar no dia do envio.**

---

## 0. A resposta curta

| | **(A) V1 sem Juntos** | **(B) V1 com Juntos ligado** |
|---|---|---|
| **Veredito** | **Pode enviar assim que 4 itens de fora do código existirem.** Nenhum bloqueio é de engenharia. | **Não. Reprova hoje, e não por um detalhe.** Há 7 reprovações, 3 delas dentro do código. |
| Quem destrava | fundador + igreja | engenharia + igreja + fundador + advogado |
| Prazo realista | esta semana (iPhone); Android depende da conta do Play | **não é esta semana** |
| Classificação | 4+ / Livre — e é verdade | **13+ global e A16 no Brasil**, com o selo *Social Media* |

**INFERÊNCIA (alta confiança):** o app do Dia 23 é o (A). Tentar levar o Juntos junto troca "no ar no dia 23" por
"em revisão por tempo indeterminado" — e, pior, por **remoção** depois, que é o que acontece quando o questionário
etário ou o formulário de privacidade não batem com o binário (Apple 2.3.6 fala nisso com essas palavras).

---

## 1. Veredito (A): V1 sem Juntos — pode enviar?

**Sim, e o código não é o obstáculo.** A V1 é exatamente o app que as duas lojas aceitam com menos atrito: sem conta,
sem rede, sem conteúdo de usuário distribuído.

**FATO (código, hoje):**
- `mobile/src/config/features.ts:11` → `COMMUNITY_ENABLED = false` (literal, não variável de ambiente): a aba Juntos
  sai da barra (`mobile/src/app/(tabs)/_layout.tsx`, `href: COMMUNITY_ENABLED ? undefined : null`).
- `mobile/src/cloud/config.ts` (portão de release) mantém a nuvem desligada à força em build de release.
- `mobile/package.json` não tem `expo-image-picker` nem `expo-camera` no `main`: nenhuma permissão de foto no binário.
- A Bíblia Livre está empacotada (5,4 MB em `mobile/content/biblia-livre/`) e a aba só aparece com texto real
  (`mobile/src/ui/biblia/visibility.ts`) — não há aba vazia (Apple 2.1/4.2).

### O que falta, item por item

| # | Exigência (fonte) | O que o app faz hoje (arquivo/linha) | Falta | Quem resolve | Peso |
|---|---|---|---|---|---|
| A1 | **Contato publicado e alcançável no app** — Apple 1.2 ("Published contact information so users can easily reach you") e 1.5 [A1] | `mobile/src/config/contato.ts:28` → `SUPPORT_EMAIL = null`; `mobile/src/app/ajuda.tsx:45` então intitula a tela só "Ajuda" e esconde a linha | um e-mail **atendido**, colado em `contato.ts` e na ficha | fundador | **BLOQUEIA** — `mobile/app.config.ts:114` (`assertContactForStore`) recusa gerar o build de produção |
| A2 | **Política de privacidade acessível de dentro do app** e na ficha — Apple 5.1.1(i) [A1]; Play | `contato.ts:31` → `PRIVACY_URL = null`; `site/politica-de-privacidade.html` existe com **8** marcas `[PREENCHER]` | publicar em https e colar a URL | fundador | **BLOQUEIA** (mesma trava) |
| A3 | **Ficha sem lacuna** — Apple 2.1 [A1] | `mobile/store.config.json` tem **9** ocorrências de `[PREENCHER: …]` (copyright, supportUrl, privacyPolicyUrl, contato do revisor, link do vídeo) | preencher antes do `metadata:push` | fundador | **BLOQUEIA** |
| A4 | **Direitos do conteúdo** — Apple 5.2.1 [A1] | `mobile/content/100-dias-2026/rights.json:4` → `rights_status = "pending_authorization"`; `app.config.ts:186` (`assertRightsForStore`) recusa a variante production | autorização escrita da igreja | igreja + fundador | **BLOQUEIA** |
| A5 | **Metadados exatos** — Apple 2.3.1 [A1] ("your app's functionality should be clear to end users and App Review… All new features… must be described with specificity in the Notes for Review") | **A ficha ficou velha nesta rodada.** `store.config.json` promete "Cada dia abre à meia-noite (horário de Brasília), na data dele" e as notas ao revisor dizem "Each campaign day unlocks at 00:00 São Paulo time on its date" — mas `mobile/src/config/features.ts:30` → `FUTURE_DAYS_OPEN = true`: **todos** os dias abrem | reescrever a linha da descrição e as notas ao revisor (e conferir "Meu ministério", que **continua** existindo na V1, logo está correto) | **RESOLVIDO em 23/09** (commit da auditoria): a descrição e as notas ao revisor passaram a dizer que os 100 dias abrem a partir do Dia 1, que ler adiantado não empurra o progresso e que concluir só vale para hoje e para trás. A chave `FUTURE_DAYS_OPEN` **não** foi mexida. | ~~RECOMENDAÇÃO FORTE~~ feito |
| A6 | **Classificação etária honesta** — Apple 2.3.6 [A1] | `store.config.json` responde `userGeneratedContent: false`, `messagingAndChat: false` — **é verdade**: a reflexão e a nova "Outra meta" ficam no aparelho e não são distribuídas para ninguém | responder **Não** também à pergunta nova de *social media* (não existe no schema do EAS; é clique no App Store Connect) | fundador | **BLOQUEIA se respondido errado** |
| A7 | **Rótulos de privacidade / Data safety** — Apple [A9] · Play [G6] | V1 não transmite nada; `app.config.ts` grava `NSPrivacyCollectedDataTypes: []` e `NSPrivacyTracking: false` | marcar "Dados não coletados" nos dois formulários | fundador | **BLOQUEIA** |
| A8 | **Exclusão de conta** — Apple 5.1.1(v) [A1][A5] | **Não se aplica**: a V1 não cria conta (a nuvem está desligada à força em release, `src/cloud/config.ts:39`) | nada, enquanto não houver conta | — | — |
| A9 | **Verificação de desenvolvedor Android** [G10] | não começou (a conta do Play ainda não existe) | criar a conta, verificar identidade com documento **e aparelho** [G12], registrar o pacote | fundador | **BLOQUEIA O ANDROID** — o Brasil está entre os quatro países com prazo **30/09/2026**: faltam **8 dias** |
| A10 | **Página web de exclusão** [G3] | `site/excluir-conta.html` existe e diz, com honestidade, que esta versão não tem conta | publicar junto com as outras (não bloqueia enquanto não houver conta) | fundador | RECOMENDAÇÃO |
| A11 | **Guideline 4.2 (funcionalidade mínima)** [A1] | jornada de 100 dias, leitor, Bíblia inteira offline, modo altar, reflexão, lembretes locais, metas | nada. **Não há risco de 4.2 aqui**: não é site empacotado nem coleção de links | — | — |
| A12 | **1.1.5 (comentário religioso inflamatório / citação adulterada)** [A1] | o texto é o da igreja, versionado, e o app não permite editá-lo; o texto bíblico é a Bíblia Livre empacotada | nada | — | — |

**Veredito (A), em uma frase:** **nada de engenharia impede o envio.** Faltam: e-mail de suporte, política publicada,
ficha preenchida, autorização da igreja — e, para o Android, a conta do Play antes de 30/09. A única coisa que eu
mudaria no código antes de enviar é a **descrição/notas ao revisor** (A5), que envelheceram quando todos os dias
passaram a abrir.

---

## 2. Veredito (B): V1 com o Juntos ligado — o que reprova hoje?

**Reprova. Sete coisas, e três delas estão no código.** O que foi construído nesta rodada é bom — denúncia, bloqueio,
desbloqueio, fila de moderação, aceite registrado no toque, foto sem EXIF, avatar só visível depois de aprovado. O
problema não é a falta de recursos: é que **o servidor nunca subiu**, o **texto legal não existe em versão aprovada** e
**o build de loja não consegue nascer com o Juntos ligado**.

### 2.1 Apple 1.2 — conteúdo gerado por usuário

**FATO [A1], texto vigente hoje, na íntegra dos quatro itens:** "A method for filtering objectionable material from
being posted to the app · A mechanism to report offensive content and timely responses to concerns · The ability to
block abusive users from the service · Published contact information so users can easily reach you".

| Item da 1.2 | O que o app faz hoje (arquivo/linha) | Falta | Quem resolve | Peso |
|---|---|---|---|---|
| **Filtro ANTES de publicar (texto)** | `private.community_text_verdict` (`mobile/supabase/migrations/20260921130100_comunidade_funcoes.sql:201`) segura link, e-mail, telefone e termos da lista; sem veredito, o post sai **publicado na hora** | **a lista de termos começa VAZIA no banco.** Ela só existe depois de rodar `moderate-text` com `sync_terms` (a lista está em `mobile/supabase/functions/_shared/terms-pt-br.ts`, e o segredo `COMMUNITY_CRON_SECRET`). Sem esse passo de deploy, uma ofensa sem link publica **instantaneamente** | engenharia (deploy) | **BLOQUEIA** |
| **Filtro ANTES de publicar (foto)** | `create_community_post` (`20260923060000_comunidade_igreja_inteira.sql:112`) marca **toda** foto como `in_review`, `hold_reason='foto'`; a Edge Function `submit-post` + `_shared/image-moderation.ts:209` usa AWS Rekognition **se** `MODERATION_PROVIDER=aws-rekognition` e as chaves existirem, e **sem segredo devolve `null`** → a foto espera uma pessoa | escolher: (a) contratar o filtro e pôr os segredos, ou (b) aceitar que **toda** foto espera aprovação humana. As duas cumprem a 1.2; a (b) é um gargalo com ~3.000 pessoas | produto + fundador | **BLOQUEIA** (a escolha, não o código) |
| **Filtro de nome e bio** | `set_community_profile` (`20260922120000_comunidade_perfil_v2.sql:277`) valida **tamanho** (nome 40, bio 160) e **não chama** `community_text_verdict` | passar nome e bio pelo mesmo veredito: os dois aparecem para a igreja inteira ao lado de cada post | engenharia | **BLOQUEIA** |
| **Foto de perfil** | só aparece para os outros quando `avatar_status = 'approved'` (`20260923060000…sql:173`); a fila própria existe (`community_avatar_queue`, `20260922120000…sql:655`) | ninguém operando a fila ⇒ na prática nenhuma foto de perfil aparece | igreja | RECOMENDAÇÃO (o comportamento é o seguro) |
| **Denunciar conteúdo** | **feito nesta rodada:** `mobile/src/ui/comunidade/sheets/ReportSheet.tsx:168`, alcançável do feed (`feed/FeedScreen.tsx:526`), dos comentários (`feed/CommentsScreen.tsx:146`) e da folha de comentários (`sheets/CommentsSheet.tsx:225`); 9 motivos em `sheets/motivos.ts`, recibo com protocolo, e dois motivos tiram do ar **na hora** | nada no app | — | OK |
| **Denunciar a pessoa** (exigência do Play) | `ReportSheet.tsx:173` ("Denunciar {nome}") | nada | — | OK |
| **Bloquear / desbloquear** | `ReportSheet.tsx:180` + confirmação; lista "Pessoas que bloqueei" com desbloqueio em `mobile/src/app/comunidade/conta-e-privacidade.tsx:191` | nada no app | — | OK |
| **"Timely responses to concerns"** | o servidor trabalha com `report_due_hours = 24` (`20260921130000_comunidade_tabelas.sql:64`) e 4 h para os urgentes; a tela **não promete prazo** porque `REVIEW_HOURS = null` (`sheets/motivos.ts:60`) — diz só "Uma pessoa da equipe da igreja vai olhar" | **gente**: moderador nomeado, com escala que cubra sábado e domingo. Não existe código que resolva | igreja + fundador | **BLOQUEIA** |
| **Contato publicado** | o mesmo `SUPPORT_EMAIL = null` de A1; com ele nulo, `appealCopy()` (`ui/comunidade/perfil/copy.ts:72`) cai num texto genérico "procure a equipe de cuidado" — **sem endereço** | e-mail atendido | fundador | **BLOQUEIA** |

**Correção importante, e é boa notícia (FATO, [A1], lido hoje):** a página vigente das App Review Guidelines **não
contém a expressão "24 horas"**. Procurei o termo nas 1.2, 1.2.1, 2.3.1 e 1.1.5: o que se exige é *"timely responses"*.
O "agir em 24 h" que circula em blogs e em resumos de terceiros é **wording antigo e de cartas de rejeição**, não do
texto atual — **NÃO CONFIRMADO em fonte primária hoje**. Consequência prática: **não prometa 24 h na tela**. O código
já está do lado certo (`REVIEW_HOURS = null`), e a igreja deve escolher um prazo que a escala cumpra.

### 2.2 Apple 5.1.1(v) — exclusão de conta

**FATO [A5]** (Apple, exigência desde 30/06/2022): apagar **a conta inteira** e os dados associados, não desativar;
fácil de achar; "includes user-generated content that's shared with others, such as photos, video, text posts".

- **Existe:** `AccountDeletionSection` (`mobile/src/ui/comunidade/perfil/AccountDeletionSection.tsx`) com confirmação
  por digitação de "EXCLUIR"; Edge Function `mobile/supabase/functions/delete-account/index.ts` que apaga Storage e
  chama `auth.admin.deleteUser`; `api.purgeMyContent` e `api.leaveCommunity` para os casos menores.
- **Não é exigida a revogação de token da Apple** aqui, porque o login **não** usa Sign in with Apple:
  `mobile/src/cloud/auth.ts:11` ("sem senha, sem Google, sem Apple") e `signInWithOtp` por e-mail.
- **Falta 1 (código):** `ACCOUNT_DELETION_AVAILABLE = false` (`mobile/src/cloud/config.ts:39`) ⇒ o botão não aparece e,
  pior, **a nuvem fica desligada à força em qualquer build de release**. Ver 2.5.
- **Falta 2 (Play, e é mais difícil do que parece):** a entrada na comunidade é **sessão anônima ligada ao aparelho**
  (`mobile/src/community/deviceSession.ts:42`, `signInAnonymously`), sem e-mail obrigatório. A política [G3] exige um
  **link web** onde a pessoa **peça** a exclusão, e a página tem de "reference the app or developer name". Hoje
  `site/excluir-conta.html` ainda está escrita para "esta versão não tem conta" — e, sem e-mail, **não existe como
  identificar quem pede pela web**. Não é só reescrever a página: é decidir o mecanismo (por exemplo, um **código da
  conta** visível no app para a pessoa colar no formulário). **Quem resolve:** engenharia + produto. **Peso: BLOQUEIA (Play).**

### 2.3 Apple 5.1.2 — uso e compartilhamento de dados

**FATO [A1], 5.1.2(i):** "you may not use, transmit, or share someone's personal data without first obtaining their
permission… You must provide access to information about how and where the data will be used."

- **O caminho do consentimento existe e é bom:** o toque em Publicar registra, antes de criar conteúdo, finalidade +
  versão + **sha256 do texto exato que a tela mostrou** + versão do app + data/hora em `consent_records`
  (`mobile/src/ui/comunidade/publicar/aceite.ts:130`; migração `20260923070000_comunidade_aceite_no_ato.sql`). Isso é o
  que a LGPD art. 8º, §6º pede, e o texto de convicção religiosa fica destacado (art. 11, I) na tela de regras
  (`mobile/src/app/comunidade/regras.tsx`).
- **Falta (e é o bloqueio mais silencioso):** **os textos não existem em versão aprovada.**
  `mobile/src/ui/comunidade/publicar/textos.ts:30` → **todos** os 19 campos de `CAMPOS` são `null` (nome da igreja,
  CNPJ, encarregado, prazos, links), e `PENDING_VERSION = 'PENDENTE'` no servidor
  (`20260921130000_comunidade_tabelas.sql:58-61`). `termsAvailability()` devolve `'pending'` ⇒ **no app real ninguém
  aceita e ninguém publica.** O Juntos ligado hoje é uma aba onde o Publicar não publica.
  **Quem resolve:** produto + fundador + advogado. **Peso: BLOQUEIA** (e é também o bloqueio do Play, §2.6).

### 2.4 Apple 4.2 — funcionalidade mínima

Sem risco. O Juntos **acrescenta** a um app que já é completo. **INFERÊNCIA:** 4.2 não é o problema aqui; 2.1
(completude) é — ver 2.5.

### 2.5 Apple 2.1 — completude do app: **o achado mais grave do código**

**FATO (código, hoje, no worktree da comunidade):**
1. `mobile/src/cloud/config.ts:39` → `ACCOUNT_DELETION_AVAILABLE = false`, e `cloudAllowedInThisBuild()` devolve
   `isDev || ACCOUNT_DELETION_AVAILABLE`. Em release, `getCloudConfig()` devolve `null` **mesmo com as variáveis
   `EXPO_PUBLIC_SUPABASE_*` embutidas**.
2. `mobile/src/community/api.ts:736-741` → sem cliente Supabase, `getCommunityApi` devolve `null` (e o modo de
   demonstração é sempre `null` em release).
3. Logo: **um build de loja com `EXPO_PUBLIC_COMMUNITY_ENABLED=true` mostra a aba "Juntos" e ela não funciona.**
   É exatamente o cenário que a 2.1 rejeita.
4. Existe uma trava escrita para isso — `assertCommunityForStore` (`mobile/app.config.ts:156`), que exige
   `ACCOUNT_DELETION_AVAILABLE = true`, `ACCOUNT_DELETION_URL` https e `NSPrivacyCollectedDataTypes` preenchido — **mas
   ela nunca é chamada**: o `export default` só chama `assertRightsForStore` e `assertContactForStore`
   (`mobile/app.config.ts:185-187`). Ela é testada em `mobile/src/__tests__/nuvem-correcoes.test.ts:481-490` e não
   está ligada no caminho real.

**Falta:** ligar a trava (uma linha) **e** cumprir o que ela exige. **Quem resolve:** engenharia.
**Peso: BLOQUEIA** — e, enquanto a trava estiver desligada, o erro sai **silencioso**, que é o pior jeito de errar.

### 2.6 Google Play — UGC

**FATO [G1]** (política *User Generated Content*, reaberta hoje): a moderação do app tem de "require users accept the
app's terms of use and/or user policy **before users can create or upload UGC**"; "define objectionable content and
behaviors… and prohibit them in the app's terms of use"; "provide an **in-app system for reporting and blocking**
objectionable UGC **and users**"; e apps com interação direta "must provide an in-app functionality for blocking users".

| Exigência | Hoje | Falta | Peso |
|---|---|---|---|
| Aceite **antes** de criar UGC, sem pular | **a decisão do fundador continua conforme.** A linha `ACEITE_LINE` (`textos.ts:357`: "Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do Juntos.") fica embaixo do botão, e o toque registra o aceite **antes** da criação — no Publicar (`mobile/src/app/comunidade/publicar.tsx:352-360`), no comentário e no primeiro Amém (`feed/FeedScreen.tsx:498-502`). O servidor recusa publicar sem consentimento vigente (`assert_consents`, `CM002`) e recusa o aceite sem `confirms_16: true` (erro 22023) | **o texto das regras** (§2.3). Sem versão aprovada não há aceite — nem UGC | **BLOQUEIA** |
| "Define objectionable content" nos termos | o rascunho existe (`docs/legal/COMUNIDADE_REGRAS_E_CONSENTIMENTO_rascunho.md`, só no worktree da comunidade) | aprovar, versionar, preencher os 19 campos | **BLOQUEIA** |
| Denúncia e bloqueio no app, de conteúdo **e** de pessoa | feito (§2.1) | nada | OK |
| Moderação "as is reasonable and consistent with the type of UGC" | fila + histórico + ações no SQL e a tela `ModerationQueueScreen` (907 linhas), com o papel conferido no servidor (`private.is_community_moderator()`, `20260921130100…sql:57`) e no cliente (`ui/comunidade/moderacao/acesso.ts`) | **pessoa e processo** | **BLOQUEIA** |
| Salvaguardas de monetização | não há monetização | nada | OK |

### 2.7 Google Play — Segurança dos dados, exclusão pela web, verificação, Famílias

| Exigência | Fonte | Hoje | Falta | Peso |
|---|---|---|---|---|
| **Data safety** verdadeiro | [G6] + [G13] (crenças religiosas é tipo próprio de "Informações pessoais") | formulário atual diz "não coleta" — verdade só sem o Juntos | declarar Nome, IDs, **Fotos**, **Outro conteúdo do usuário**, **Crenças religiosas**, interações (Amém, denúncia), tudo vinculado ao usuário, **sem rastreamento**, e "sim" para exclusão de dados | **BLOQUEIA** |
| **App Privacy** (Apple) e `PrivacyInfo.xcprivacy` | [A9] | `COLLECTED_DATA_TYPES = []` (`mobile/app.config.ts:146`) | preencher junto com o rótulo do App Store Connect — nunca um sem o outro | **BLOQUEIA** |
| **Exclusão de conta pela web** | [G3] | ver §2.2 | mecanismo de identificação + página reescrita, citando o nome do app como está na loja | **BLOQUEIA** |
| **Verificação de desenvolvedor** | [G10][G12] | conta do Play inexistente | criar já: identidade por documento **e** verificação por aparelho; **prazo 30/09/2026 no Brasil** | **BLOQUEIA o Android** |
| **Famílias / público-alvo** | [G5] | não declarado | declarar **13+**. Se o público declarado incluir menores de 13, entra a política Famílias inteira (aviso de segurança online antes de troca livre de mídia, ação de adulto, controle parental do recurso social) | **BLOQUEIA se declarado errado** |
| **CSAE (segurança infantil)** | [G4], reaberta hoje | fora de escopo formal: a política se aplica a **Social**, **Namoro** e chat anônimo/aleatório — a categoria é Referência + Estilo de vida (`store.config.json`) | **RECOMENDO cumprir de qualquer jeito**: um parágrafo nas regras, o canal de denúncia (já existe) e um ponto de contato nomeado. Com foto livre numa igreja, é proteção da igreja, não burocracia | RECOMENDAÇÃO forte |
| **Permissão de fotos** | [G11] | `expo-image-picker` com o **seletor do sistema** e textos de finalidade no iOS (`app.config.ts:302`, plugin `expo-image-picker`); sem `READ_MEDIA_IMAGES` amplo | nada, se continuar com o seletor do sistema | OK |

### 2.8 Classificação etária e A16 no Brasil

**FATO [A3]** (Apple, 09/07/2026): o questionário passou a perguntar sobre *social media capabilities*, definidas como
"the ability to redistribute, amplify, or interact with user-generated content through a social feed or similar
discovery method"; **desde setembro de 2026 as respostas são obrigatórias** em apps novos e atualizações; quem tem a
capacidade ganha o descritor **Social Media** na página da loja.

**FATO [A4]** (App Store Connect Help, reaberto hoje):

| Capability | Mínimo global | Brasil |
|---|---|---|
| User-Generated Content | 4+ | A6 |
| Messaging and Chat | 4+ | A12 |
| **Social Media** | **13+** | **A16** |
| Social Media Disabled for Users Under 13 | 13+ | **A16** |

**INFERÊNCIA (alta confiança):** o desenho desta rodada torna a resposta inevitável. Feed **da igreja inteira**
(`20260923060000_comunidade_igreja_inteira.sql`: o público por ministério acabou) + **Amém com nome de quem deu**
(`amen_faces_for`, `20260922180000_comunidade_diario.sql:539`; desde `20260923050000…sql` dar Amém exige o mesmo que publicar) + comentários = "views, likes, comments" na definição literal da Apple.
Resultado esperado: **13+ no mundo, A16 na App Store do Brasil, com o selo Social Media**. Marcar "desligado para
menores de 13" **não** derruba a faixa brasileira: essa opção também está em A16.

**O que isso custa em produto:** numa campanha "de criança a idoso", o app sai de "Livre" para **16 anos**. As saídas
honestas são duas: aceitar o A16, ou reduzir o alcance do feed. Responder "sem social media" com este feed é o caso que
a própria 2.3.6 chama de app mal classificado, "com risco de inquérito de regulador". **Não vamos fazer isso.**

**Idade mínima 16 (decisão do fundador):** nenhuma loja exige 18 nem 16 — exige honestidade no questionário. A
confirmação existe e é registrada (`adult_attested_at`; `PerfilCampos.tsx:244`, "Tenho 16 anos ou mais"), e é **o
próprio toque de publicar** que a registra. **RECOMENDAÇÃO:** avaliar a *Declared Age Range API* (iOS) e a *Play Age
Signals* (Android) — desde 24/02/2026 a Apple diz que a obrigação de confirmar idade pode ser **do desenvolvedor**
[A10][A11]; no Brasil o assunto é o ECA Digital, não a loja.

---

## 3. O que está **melhor** do que estava (para não sumir no meio dos blocos)

1. **Denúncia, bloqueio e desbloqueio existem como tela**, nos três lugares onde há conteúdo de outra pessoa. Era o
   buraco mais citado no documento de mais cedo; está fechado no app.
2. **O aceite no ato** (decisão do fundador) é **conforme**, e a prova de consentimento não piorou: finalidade, versão,
   sha256 do texto exibido, versão do app e data/hora. O que o Play e a 1.2 exigem é aceite **antes** do conteúdo —
   e isso é garantido pelo servidor, não pela tela.
3. **A foto é tratada com cuidado real:** reencode, sem EXIF/XMP/IPTC (GPS não sobe), e nenhuma foto de post fica
   visível sem filtro automático ou aprovação humana.
4. **Avatar só aparece depois de aprovado** — o lado seguro.
5. **A prévia começa vazia**, sem conteúdo de exemplo passando por real. Isso também é 2.3.1.

---

## 4. Riscos que ninguém pediu para eu olhar, e que eu olharia antes de ligar o Juntos

- **Sessão anônima + "Allow anonymous sign-ins" no Supabase** é porta de abuso (criação de contas em massa). O código
  registra o pedido de CAPTCHA/limite de taxa no Auth (`deviceSession.ts:14-17`), mas isso é configuração de projeto,
  não código. Sem isso, a primeira onda de spam vem de fora da igreja. **HIPÓTESE** de risco, **não medida**.
- **`buildInlineAccept` não tem chamador nas telas** (grep em `mobile/src`): o contrato atômico do servidor existe, mas
  o Publicar faz aceite e post em chamadas separadas (`publicar.tsx:358` e `:373`). **Não é problema de loja** (o
  aceite precede o conteúdo de qualquer forma), mas se o post falhar, sobra um registro de consentimento de um toque
  que não publicou nada — o contrário do que a migração promete no comentário dela. Vale alinhar.
- **A palavra "Ao publicar"** cobre também o Amém e o comentário. Funciona, mas um revisor exigente pode achar estranho
  ler "Ao publicar" embaixo de um coração. **RECOMENDAÇÃO de produto**, não bloqueio.
- **Nada disso rodou num Supabase real.** Todas as migrações trazem no cabeçalho "Ainda NÃO EXECUTADO no Supabase real".
  Enquanto isso for verdade, **não existe conta de demonstração para o revisor** (Apple 2.1 exige backend ligado), e
  qualquer prazo que eu dê aqui é estimativa.

---

## 5. Os quatro achados novos desta auditoria

1. **`assertCommunityForStore` nunca é chamada** (`mobile/app.config.ts:156` definida, `:185-187` não a chama). A trava
   que deveria impedir um build de loja com Juntos sem exclusão de conta está desligada. **Uma linha.**
2. **A ficha da loja envelheceu nesta rodada:** a descrição e as notas ao revisor prometem que cada dia abre na data
   dele, e `FUTURE_DAYS_OPEN = true` (`features.ts:30`) abre todos. Apple 2.3.1.
3. **A lista de termos do filtro começa vazia no banco.** Sem o passo de deploy `sync_terms`, ofensa sem link publica
   na hora — e o filtro "antes de publicar" da 1.2 fica valendo só para links, e-mails e telefones. Além disso,
   **nome de exibição e bio não passam por filtro nenhum**.
4. **A exclusão pela web é impossível como o app está desenhado:** conta anônima por aparelho, sem e-mail, e uma página
   que precisa receber pedidos identificáveis. Não é redação de página — é mecanismo.

E uma **correção de fato**: a 1.2 vigente **não** diz "24 horas". Diz "timely responses". Não prometam 24 h.

---

## 6. O que impede o envio hoje (máximo 10 linhas)

1. **(A e B)** E-mail de suporte atendido em `src/config/contato.ts` — sem ele o build de produção nem é gerado.
2. **(A e B)** Política de privacidade publicada em https + URL no app e na ficha.
3. **(A e B)** Autorização escrita da igreja (`rights.json` está `pending_authorization`).
4. **(A e B)** `store.config.json` sem os 9 `[PREENCHER]`; e corrigir a descrição/notas (todos os dias abrem agora).
5. **(Android, A e B)** Conta do Google Play criada e identidade verificada — prazo **30/09/2026**, faltam 8 dias.
6. **(B)** Servidor no ar: nenhuma migração rodou num Supabase real; sem isso não há conta de demonstração.
7. **(B)** Regras e consentimento aprovados e versionados — hoje `PENDENTE`, e por isso **ninguém publica**.
8. **(B)** Moderador humano nomeado, com escala de fim de semana, e o filtro de termos sincronizado; nome e bio filtrados.
9. **(B)** Exclusão de conta ligada no app (`ACCOUNT_DELETION_AVAILABLE`), **trava `assertCommunityForStore` chamada**, e um caminho web que identifique quem pede.
10. **(B)** Questionário etário refeito (**Social Media = sim ⇒ 13+ / A16**) e os dois formulários de privacidade refeitos no mesmo envio.

**Veredito final:** **(A) sim, pode enviar** — os cinco primeiros itens são do fundador e da igreja, não da engenharia.
**(B) não**, e nenhum dos dez pontos acima é opinião: cada um tem arquivo, linha ou política citada.

---

## Fontes (todas reabertas e lidas em 2026-09-22)

**Apple**
- [A1] App Review Guidelines — 1.1.5, 1.2, 1.2.1, 2.1, 2.3.1, 2.3.6, 2.3.8, 4.2, 5.1.1(i), 5.1.1(v), 5.1.2, 5.2.1 —
  https://developer.apple.com/app-store/review/guidelines/ (a página não exibe data de atualização; **verifiquei hoje
  que o texto vigente não contém "24 hours"**)
- [A3] "Age rating questionnaire now includes social media questions" — **09/07/2026**; respostas obrigatórias a partir
  de setembro de 2026 — https://developer.apple.com/news/?id=tlur8uvi
- [A4] App Store Connect Help — "Age ratings values and definitions" (Social Media = 13+ global e **A16 no Brasil**;
  UGC = A6; Messaging and Chat = A12) —
  https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- [A5] "Offering account deletion in your app" (conta **inteira**, não desativação; inclui UGC compartilhado; desde
  30/06/2022) — https://developer.apple.com/support/offering-account-deletion-in-your-app/
- [A9] App Privacy Details — https://developer.apple.com/app-store/app-privacy-details/ (**não reaberta hoje**;
  acesso 2026-09-21)
- [A10] "Age requirements for apps distributed in Brazil…" (24/02/2026) — https://developer.apple.com/news/?id=f5zj08ey
  (**não reaberta hoje**; acesso 2026-09-22 no documento antecessor)
- [A11] Age assurance developer Q&A — https://developer.apple.com/support/age-assurance (**idem**)

**Google**
- [G1] User Generated Content — https://support.google.com/googleplay/android-developer/answer/9876937
- [G3] App account deletion requirements (caminho no app + **link web** funcional, com a exclusão em destaque e citando
  o nome do app/desenvolvedor; perguntas de exclusão no Data safety) —
  https://support.google.com/googleplay/android-developer/answer/13327111
- [G4] Child Safety Standards (CSAE) — aplica-se a **Social**, **Namoro** e chat anônimo/aleatório; exige padrões
  publicados, denúncia no app, protocolo de remoção e **ponto de contato nomeado** —
  https://support.google.com/googleplay/android-developer/answer/14747720
- [G5] Families policies — https://support.google.com/googleplay/android-developer/answer/9893335
- [G6] Data safety — https://support.google.com/googleplay/android-developer/answer/10787469
- [G10] Android developer verification — Brasil, Indonésia, Singapura e Tailândia, prazo **30/09/2026**; registro de
  cada package name no Play Console — https://developer.android.com/developer-verification ·
  https://support.google.com/android-developer-console/answer/16561738
- [G11] Photo and Video Permissions policy — https://support.google.com/googleplay/android-developer/answer/14115180
- [G12] Verificação de identidade e de aparelho para conta nova —
  https://support.google.com/googleplay/android-developer/answer/10841920 ·
  https://support.google.com/googleplay/android-developer/answer/14316361
- [G13] "Declare your app's data use" (tipos de dados; crenças religiosas em Informações pessoais) —
  https://developer.android.com/privacy-and-security/declare-data-use

**Código lido hoje (FATO)** — `main`: `mobile/src/config/features.ts`, `src/config/contato.ts`, `src/cloud/config.ts`,
`src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/juntos.tsx`, `src/app/ajuda.tsx`, `src/ui/biblia/visibility.ts`,
`src/reader/provider.ts`, `mobile/app.config.ts`, `mobile/store.config.json`, `mobile/package.json`,
`mobile/content/100-dias-2026/rights.json`, `site/*.html`.
`comunidade-v2`: `mobile/app.config.ts`, `src/community/{api,deviceSession,validation,photos}.ts`,
`src/ui/comunidade/sheets/{ReportSheet.tsx,motivos.ts}`, `src/ui/comunidade/feed/{FeedScreen,CommentsScreen}.tsx`,
`src/ui/comunidade/publicar/{aceite.ts,textos.ts,foto.ts}`, `src/ui/comunidade/perfil/{AccountDeletionSection.tsx,copy.ts}`,
`src/ui/comunidade/moderacao/acesso.ts`, `src/app/comunidade/{publicar,regras,conta-e-privacidade,perfil}.tsx`,
`mobile/supabase/migrations/*.sql` (12 arquivos), `mobile/supabase/functions/{submit-post,moderate-text,delete-account}/`
e `functions/_shared/image-moderation.ts`.

**Documentos internos:** `docs/product/CONFORMIDADE_LOJAS.md`, `docs/product/PRIVACIDADE_NAS_LOJAS_rascunho.md`,
`docs/product/LANCAMENTO_EXPRESSO_IOS.md`, `docs/product/FICHA_DE_LOJA_rascunho.md`,
`docs/technical/ANDROID_VERIFICACAO_30_09.md`, `docs/technical/MOBILE_STORE_REQUIREMENTS.md`,
e (no worktree da comunidade) `docs/legal/COMUNIDADE_REGRAS_E_CONSENTIMENTO_rascunho.md`,
`docs/technical/COMUNIDADE_V2_{ARQUITETURA,DEPLOY,CARGA}.md`.
