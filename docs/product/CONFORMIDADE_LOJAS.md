# Conformidade nas lojas: tudo o que a Apple e o Google exigem, e onde estamos

- **Data:** 2026-09-22 · **Autor:** Claude (agente "Políticas das lojas"). **Não é parecer jurídico.**
- **Pedido do fundador (2026-09-22):** "a gente tem que seguir tudo do Google Play e da Apple para publicar e eles
  não darem problema".
- **Data de acesso de todas as fontes: 2026-09-22** (lista no fim). **Políticas de loja mudam: reverificar no dia do envio.**
- **Etiquetas:** **FATO** (fonte oficial com URL, ou linha de código lida hoje) · **INFERÊNCIA** (conclusão minha a
  partir de fatos) · **HIPÓTESE** (plausível, não medido) · **NÃO CONFIRMADO** (procurei e não achei fonte primária).
- **Nada de código foi alterado por este documento.** Ele lê o código e diz o que falta; quem implementa é outro agente.
- Antecessor: `docs/product/comunidade/01-lojas.md` (2026-09-21). Este documento **substitui** aquele como referência
  operacional: reverifiquei as fontes hoje e incorporei o que o feedback de 2026-09-22 mudou (sem código de igreja,
  16 anos, **foto publicada na hora**, Amém com contagem e rostinhos, comentários, perfil com foto obrigatória).

---

## 0. A resposta curta

**Não existe um envio só. Existem dois, e eles têm regras muito diferentes.**

| | **Envio 1 — V1 (a que vai agora)** | **Envio 2 — com a Comunidade** |
|---|---|---|
| O que tem | Jornada, Bíblia, Você. Sem conta, sem nuvem, nada sai do aparelho | Perfil, feed da igreja, foto, Amém, comentários |
| Classificação provável | **4+ / Livre** | **13+ global e A16 no Brasil** (FATO das definições da Apple, §4) |
| O que bloqueia hoje | contato e política de privacidade publicados; autorização da igreja | tudo da §7.B: servidor, moderação humana real, exclusão de conta, filtro de imagem |
| Quando dá para enviar | esta semana | **não esta semana.** Nenhuma loja aceita o que existe hoje |

**INFERÊNCIA (alta confiança):** tentar levar a Comunidade junto no envio de agora troca "app no ar no dia 23" por
"rejeição e semanas de ida e volta". As duas lojas rejeitam por motivos que **não são de desenho**: não há servidor no
ar, não há ninguém nomeado para moderar e não há exclusão de conta.

**O que o feedback de hoje piorou, em termos de loja** (não é motivo para não fazer; é o preço, e está na §3 e §4):

1. **Foto publicada na hora** (F5) é a exigência mais dura da Apple (1.2, "filtrar **antes** de publicar") e é a única
   da lista que **não dá para resolver só com gente**: precisa de filtro automático de imagem **antes** de a foto ficar
   visível, ou de aprovação humana antes.
2. **Sem código de igreja** (C3) tira a única barreira de entrada que existia. Qualquer pessoa que baixar o app entra e
   publica. Isso não viola regra nenhuma, mas muda o volume de moderação e o risco de conteúdo estranho no feed.
3. **Amém com contagem e rostinhos** (F3) + comentários + feed da igreja inteira = "Social Media" na definição literal
   da Apple ⇒ **13+ / A16**. Isso já valia com Amém sem contagem; a contagem só deixa mais óbvio.
4. **16 anos em vez de 18** (C1) não é problema de loja — é problema de lei brasileira (ECA Digital) e de Families no
   Play. A loja só exige que a resposta do questionário seja honesta.

---

## 1. Como ler a tabela mestra

- **Tem hoje:** o que está no código, lido em 2026-09-22 (arquivo e linha).
- **Falta:** o que precisa existir para a exigência estar cumprida.
- **Quem resolve:** `fundador` (conta, contrato, pessoas, páginas publicadas), `engenharia` (código/servidor),
  `igreja` (gente e autorização), `produto` (decisão).
- **Peso:** **BLOQUEIA** = com isso faltando, o envio é rejeitado ou o app é removido. **RECOMENDAÇÃO** = não é texto
  de política, mas reduz risco de rejeição ou de dor de cabeça depois.

**Estado geral do código da Comunidade (FATO, 2026-09-22):** existe o cliente (`mobile/src/community/api.ts`, 425
linhas) e existem as migrações SQL (`mobile/supabase/migrations/20260921130*.sql`), **mas**:
`COMMUNITY_ENABLED = false` (`mobile/src/config/features.ts`), a aba está escondida
(`mobile/src/app/(tabs)/_layout.tsx:48`), **nenhuma tela do app chama `getCommunityApi`** (só os testes), as migrações
**nunca foram executadas** (cabeçalho do arquivo: "NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina") e
**não há dependência de escolher foto** no `mobile/package.json` (sem `expo-image-picker`, sem `expo-camera`).
Ou seja: quase tudo o que a tabela marca como "existe" existe **como função de cliente e como SQL não aplicado**,
não como coisa que uma pessoa consegue tocar na tela.

---

## 2. Tabela mestra — exigência × o que o app tem hoje × o que falta

### 2.A — Vale já para o envio de agora (V1, sem Comunidade)

| # | Exigência | Loja / fonte | O que o app tem hoje (FATO) | O que falta | Quem resolve | Peso |
|---|---|---|---|---|---|---|
| A1 | **Contato publicado** e alcançável no app | Apple 1.2 e 1.5 [A1] | Tela `src/app/ajuda.tsx` pronta; `src/config/contato.ts` tem `SUPPORT_EMAIL = null`, então a tela vira só "Ajuda" e não mostra e-mail | um e-mail de suporte real, **atendido**, colado em `contato.ts` e em `store.config.json` | fundador | **BLOQUEIA** (o próprio `app.config.ts` recusa o build de produção: `assertContactForStore`) |
| A2 | **Link da política de privacidade dentro do app** + no App Store Connect | Apple 5.1.1(i) [A1] · Play | `src/app/privacidade.tsx` existe; `PRIVACY_URL = null` ⇒ sem link | publicar `site/politica-de-privacidade.html` em https e colar a URL | fundador | **BLOQUEIA** (mesma trava) |
| A3 | **Ficha completa, sem `[PREENCHER]`** | Apple 2.1 [A1] | `mobile/store.config.json` com `[PREENCHER: ...]` em supportUrl, privacyPolicyUrl, copyright, contato do revisor | preencher tudo antes do `metadata:push` | fundador | **BLOQUEIA** |
| A4 | **App completo, backend ligado, conta demo** | Apple 2.1 [A1] | V1 não tem login nem backend ⇒ nada a demonstrar | notas ao revisor explicando a data de 23/09 (já escritas em `LANCAMENTO_EXPRESSO_IOS.md` §4.10) | fundador | RECOMENDAÇÃO (vira BLOQUEIO no Envio 2) |
| A5 | **Direitos do conteúdo** (app publicado por quem tem licença) | Apple 5.2.1 [A1] | `app.config.ts` recusa build de produção enquanto `rights_status ≠ authorized` | autorização escrita da igreja | igreja + fundador | **BLOQUEIA** |
| A6 | **Classificação etária honesta** | Apple 2.3.6 [A1] | `store.config.json`: `userGeneratedContent: false` — verdade na V1 | responder **Não** também à pergunta de *social media* (não existe no schema do EAS; é clique no site) | fundador | **BLOQUEIA** se respondido errado |
| A7 | **Rótulos de privacidade / Data safety verdadeiros** | Apple [A9] · Play [G6] | V1 não transmite nada (inventário em `PRIVACIDADE_NAS_LOJAS_rascunho.md` §1) ⇒ "Dados não coletados" | marcar isso no App Store Connect; no Play, o formulário Data safety | fundador | **BLOQUEIA** |
| A8 | **Exclusão de conta** | Apple 5.1.1(v) [A1] · Play [G3] | **Não se aplica na V1**: não há criação de conta | nada, enquanto não houver conta | — | — |
| A9 | **Verificação de desenvolvedor Android** | Android developer verification [G10] | Não começou (a conta do Play ainda não existe) | criar a conta, verificar identidade e **registrar o pacote**; o Brasil é um dos quatro países onde a exigência vale a partir de **30/09/2026** | fundador | **BLOQUEIA o Android** |
| A10 | **Página web de exclusão** | Play [G3] | `site/excluir-conta.html` existe, escrito para "a V1 não tem conta" | publicar junto com as outras; reescrever quando a conta existir | fundador | RECOMENDAÇÃO na V1, **BLOQUEIA** no Envio 2 |

### 2.B — Só com a Comunidade (Envio 2), com o desenho de 2026-09-22

| # | Exigência | Loja / fonte | O que o app tem hoje (FATO) | O que falta | Quem resolve | Peso |
|---|---|---|---|---|---|---|
| B1 | **Filtrar material questionável ANTES de ser publicado** | Apple 1.2, item 1 [A1] | Texto: `private.community_text_verdict` na migração 20260921130100 segura link, e-mail/telefone e lista de termos da igreja ⇒ post vai a `in_review`. Foto: **sempre** `in_review`, `hold_reason = 'foto'` | com F5 (foto na hora), um **filtro automático de imagem** no servidor antes de publicar; e o filtro precisa valer também para **nome de exibição, bio e foto de perfil**, que aparecem para todos | engenharia + produto | **BLOQUEIA** |
| B2 | **Denunciar conteúdo** | Apple 1.2 [A1] · Play UGC [G1][G2] | `api.report(...)` + RPC `report_community_content`, com motivo e detalhe, devolve recibo | **tela**: nenhuma superfície chama isso hoje | engenharia | **BLOQUEIA** |
| B3 | **Denunciar a pessoa** (não só o conteúdo) | Play UGC [G2] ("report and block both users and content") | `api.report({ person: true })` existe | tela | engenharia | **BLOQUEIA** (Play) |
| B4 | **Bloquear quem abusa** | Apple 1.2 [A1] · Play [G2] | `api.blockAuthor`, `api.unblock`, `api.myBlocks`; bloqueio vale nos dois sentidos (`private.blocked_between`) | tela de bloquear no post/comentário **e** lista "Bloqueados" para desfazer | engenharia | **BLOQUEIA** |
| B5 | **Resposta tempestiva à denúncia** | Apple 1.2 [A1] · Play [G2] | fila e registro existem no SQL (`community_moderation_actions`) | **gente**: moderador nomeado, com ferramenta, cobrindo fim de semana; e um prazo que a igreja consiga cumprir. Se a tela prometer "24 h", vira promessa cobrável | igreja + fundador | **BLOQUEIA** |
| B6 | **Apagar a própria publicação / o próprio comentário** | (não é texto de loja; é o que o usuário espera e o que a exclusão de conta exige) | `api.deletePost`, `api.deleteComment` | tela | engenharia | RECOMENDAÇÃO (vira parte de B10) |
| B7 | **Aceitar termos/regras antes de criar UGC, sem pular** | Play UGC [G1] ("requires users accept the app's terms of use... before users can create or upload UGC") [G2] ("cannot skip") | `api.acceptTerms` grava versão + sha256 do texto exato; o servidor recusa publicar enquanto a versão for `PENDENTE` | **os textos**: regras da comunidade e consentimento, escritos, aprovados e versionados; e a tela de aceite | produto + fundador (+ advogado) | **BLOQUEIA** (Play) |
| B8 | **Definir na íntegra o que é conteúdo questionável** nos termos | Play UGC [G1] | não existe | escrever, em pt-BR, incluindo proibição de abuso infantil (CSAE), nudez, violência, discurso de ódio, spam e — pelo 1.1.5 da Apple — "comentário religioso inflamatório" e citação adulterada de texto bíblico | produto | **BLOQUEIA** (Play) |
| B9 | **Contato publicado** (de novo, agora obrigatório de verdade) | Apple 1.2 [A1] | ver A1 | e-mail atendido por gente | fundador | **BLOQUEIA** |
| B10 | **Excluir a conta dentro do app, apagando também o que foi publicado** | Apple 5.1.1(v) [A1] e página de exclusão [A5] · Play [G3] | `requestAccountDeletion` em `src/cloud/auth.ts:124` **sempre lança erro** ("depende da Edge Function"). `api.leaveCommunity` e `api.revokePublishConsent` apagam o que a pessoa publicou, mas **não apagam a conta** | Edge Function de exclusão (revoga token Apple → apaga Storage → apaga `auth.users` em cascata) + a tela | engenharia | **BLOQUEIA** |
| B11 | **Exclusão também por link web**, sem reinstalar o app | Play [G3] | `site/excluir-conta.html` diz que não há conta | reescrever a página (nome do app como está na loja, passos, o que é apagado, o que é guardado e por quanto tempo) e publicar; a URL entra no Data safety | fundador + engenharia | **BLOQUEIA** (Play) |
| B12 | **Backend ligado + conta de demonstração** para o revisor | Apple 2.1 [A1] | não há servidor: as migrações nunca rodaram | projeto Supabase no ar, conta demo, feed com conteúdo real (feed vazio impede testar denúncia e bloqueio), e alguém aprovando o post do revisor se houver fila | engenharia + igreja | **BLOQUEIA** |
| B13 | **Classificação etária com "Social Media"** | Apple 2.3.6 [A1], questionário [A3][A4] | `store.config.json` responde `userGeneratedContent: false` | responder **sim** a UGC e a social media ⇒ **13+ global, A16 no Brasil**; e atualizar o IARC no Play | fundador | **BLOQUEIA** se respondido errado ("pode disparar inquérito de regulador", palavras da própria 2.3.6) |
| B14 | **Idade** | ECA Digital (lei) + Families [G5] + Apple [A10][A11] | SQL exige declaração de maioridade (erro `CM006`, "a comunidade é só 18+"); nenhuma tela pergunta idade | com a decisão de 16 anos (C1): confirmação de idade no perfil; **e** decidir se chama a Declared Age Range API (iOS) e a Play Age Signals (Android) | produto + engenharia | **BLOQUEIA** o enquadramento honesto; a API em si é RECOMENDAÇÃO forte |
| B15 | **Público-alvo no Play** | Families [G5] | não declarado | se o público declarado incluir menores de 13, **toda** a política Families entra (lembrete de segurança online antes de trocar mídia livre, ação de adulto, controle parental do recurso social). Recomendo declarar 13+ | produto + fundador | **BLOQUEIA** se declarado errado |
| B16 | **Data safety / App Privacy com os tipos novos** | Play [G6] · Apple [A9] | formulário atual: "não coleta" | declarar Nome, IDs, **Fotos**, **Outro conteúdo do usuário**, **Crenças religiosas**, interações (Amém, denúncia), e "sim" para exclusão de dados | fundador | **BLOQUEIA** |
| B17 | **Permissão de fotos no Android** | Play Photo & Video Permissions [G11] | nada ainda (sem picker no app) | usar o **seletor do sistema** (Android Photo Picker) em vez de pedir `READ_MEDIA_IMAGES`; se pedir a permissão ampla, é preciso uma **declaração** no Play Console justificando | engenharia | **BLOQUEIA** se pedir a permissão sem declaração |
| B18 | **Moderação "robusta, efetiva e contínua"** | Play UGC [G1] | fila e ações no SQL, ninguém operando | pessoa + processo + registro | igreja | **BLOQUEIA** |
| B19 | **Aviso de quem vê a publicação** | LGPD / produto, não loja | o texto do fundador (C5) está definido no feedback | pôr na tela de criar post | produto | RECOMENDAÇÃO (o revisor gosta; a LGPD cobra) |
| B20 | **Nada de mensagem privada** | decisão do fundador de 21/09 | não existe DM no código | manter: DM elevaria o risco (chat anônimo é o caso que as duas lojas tratam com mais dureza) | produto | RECOMENDAÇÃO |

---

## 3. O que muda com **foto publicada na hora** (F5)

Esta é a parte que o fundador pediu explicitamente, e é a mais séria.

**FATO [A1], guideline 1.2, primeiro item, no original:** *"A method for filtering objectionable material from being
posted to the app"*. "**from being posted**" — antes de ser publicado. A Apple **não diz qual método** e **não dá prazo**
para a "resposta tempestiva" do item 2.

**FATO (código, 2026-09-22):** hoje o servidor faz o contrário do que o F5 pede, e de propósito — em
`private.create_community_post`, **qualquer** post com foto sai como `in_review` com `hold_reason = 'foto'`, com o
comentário "foto só aparece depois de uma pessoa aprovar". Texto limpo publica na hora; foto, nunca.

**INFERÊNCIA:** o F5 já traz a resposta certa dentro dele ("sem filtro configurado, cai para aprovação humana — padrão
seguro"). Isso é exatamente o que a 1.2 admite. As três formas de cumprir, em ordem de custo:

| Caminho | Como fica para quem publica | Cumpre a 1.2? | Custo |
|---|---|---|---|
| **(a) Filtro automático de imagem no servidor, antes de ficar visível** | foto aparece em segundos; suspeita vai para fila humana | **Sim** (INFERÊNCIA, é a leitura literal do texto) | uma Edge Function + um serviço de classificação de imagem |
| **(b) Aprovação humana de toda foto** (o que o código faz hoje) | "Em análise" até alguém aprovar | **Sim**, com folga | fila grande; com ~3.000 pessoas publicando diariamente, é o gargalo |
| **(c) Foto direto no feed, sem nada** | instantâneo | **Não** | rejeição por 1.2 na primeira revisão (INFERÊNCIA, quase certeza) |

**Opções de filtro automático (reuse first, não construir):** Google Cloud Vision *SafeSearch Detection* (categorias
adult, racy, violence, medical, spoof) [R1], Amazon Rekognition *Content Moderation*, e serviços especializados (Hive,
Sightengine). **NÃO CONFIRMADO:** os preços atuais — a página de preços do Vision não abriu no acesso de hoje; medir
antes de escolher. **INFERÊNCIA:** para o volume desta igreja, o custo mensal de qualquer um deles é irrelevante
perto do custo de uma rejeição; o que importa é o tempo de integração.

**O que a interface precisa ter nos caminhos (a) e (b) — e hoje não tem nenhuma tela:**

- estado **"Em análise"**, visível só para quem publicou (o cliente já devolve `status: 'in_review'` e o
  `hold_reason`; `contentStatus()` até trata estado desconhecido como `in_review`, que é o lado seguro);
- estado **"Não publicado"** com motivo em português e um caminho de contestação (o campo `note_for_author` já existe);
- o mesmo para **comentário**, **nome de exibição**, **bio** e **foto de perfil** — tudo isso aparece para os outros;
- na denúncia, um motivo do tipo **"apareço nesta foto e não autorizei"** (imagem de terceiro é problema de LGPD e de
  direito de imagem, além de loja).

**Risco extra que a foto traz, e que não existia antes (INFERÊNCIA):** conteúdo de abuso infantil. Nenhuma das duas
lojas aceita a resposta "não temos como saber". A política CSAE do Google [G4] é formalmente obrigatória para apps
declarados nas categorias **Social** ou **Namoro** — não é o nosso caso se a categoria for Referência/Estilo de vida —
mas a proibição, o canal de denúncia e um ponto de contato designado custam um parágrafo nas regras e protegem a
igreja. **Recomendo incluir de qualquer forma.**

**Fotos de menores.** Com a comunidade aberta a partir de 16 anos (C1) e sem código de entrada (C3), é previsível que
apareçam fotos de crianças da igreja publicadas por adultos. Isso é decisão de produto e de igreja, não de loja, mas
precisa de uma linha nas regras e de um motivo de denúncia próprio.

---

## 4. Idade e classificação: o preço do feed

**FATO [A3]** (Apple, 09/07/2026): o questionário de classificação etária passou a perguntar sobre *social media
capabilities*, definidas como "a capacidade de redistribuir, amplificar ou interagir com conteúdo gerado por usuário
por um feed social ou método de descoberta semelhante". **As respostas são obrigatórias desde setembro de 2026** para
apps novos e para atualizações. Apps com essa capacidade ganham o descritor **Social Media** na página da loja.

**FATO [A4]** (App Store Connect Help, definições):

| Capability | Definição (resumo fiel) | Mínimo |
|---|---|---|
| User-Generated Content | distribuição ampla de conteúdo criado por usuários (vídeo, foto, texto, áudio) | 4+ |
| Messaging and Chat | usuários se comunicam dentro do app, **inclusive "public posting"** | 4+ |
| **Social Media** | redistribuição/amplificação/interação com UGC por um feed que **espalha visivelmente o conteúdo para muitos usuários**; inclui feeds com **views, likes, comments e shares** | **13+** |
| Social Media Disabled for Users Under 13 | menores de 13 não acessam; **no mínimo** chamar a Declared Age Range API antes de liberar | 13+ |

**FATO [A4]**, faixas brasileiras: **social media** e **social media disabled for users under 13** aparecem na faixa
**A16**. "User-generated content" aparece já em A6; "messaging and chat" em A12.

**INFERÊNCIA (alta confiança):** feed da igreja inteira + Amém **com contagem e rostinhos** (F3) + comentários (F4) =
Social Media pela definição literal ("likes, comments"). Resultado esperado: **13+ no mundo e A16 na App Store do
Brasil**. Marcar "desligado para menores de 13" **não derruba** a faixa brasileira, porque no Brasil essa opção também
está listada em A16.

**Consequência prática que o fundador precisa ouvir:** o app deixa de ser "Livre" e passa a aparecer como **16 anos**
na App Store brasileira, com o selo **Social Media**. Numa campanha "de criança a idoso", isso é decisão de produto.
As saídas honestas são duas: (i) aceitar A16; (ii) reduzir o alcance do feed (por exemplo, só o ministério, grupos
pequenos) — **HIPÓTESE, NÃO CONFIRMADO**: a Apple não define "muitos usuários", então um feed pequeno *talvez* fique
em UGC/Messaging. Não desenhar em cima disso sem ver o questionário real.

**O que não é decisão nossa:** responder "sem social media" com um feed destes é o caso que a própria 2.3.6 descreve
como "app mal classificado", com risco de "inquérito de regulador". Não vamos fazer isso.

**Idade mínima (C1, 16 anos).** A loja não exige 18 nem 16: exige honestidade no questionário e, se o público-alvo
declarado no Play incluir menores de 13, a política Families inteira [G5] — lembrete de segurança online **antes** de a
criança trocar mídia ou informação livre, verificação de ação de adulto, e controle parental para ligar/desligar o
recurso social. **Recomendação:** declarar público **13+** no Play e manter a confirmação leve "Tenho 16 anos ou mais"
no perfil, como o feedback já propõe.

**Sinais de idade das plataformas (FATO [A10][A11][G8][G9]):**
- Apple: desde **24/02/2026** o download de apps **18+** no Brasil é bloqueado sem confirmação de adulto; a
  **Declared Age Range API** devolve a faixa etária quando a pessoa (ou o responsável) concorda em compartilhar. A
  Apple diz explicitamente que o desenvolvedor **pode ter obrigação própria** de confirmar a idade [A10].
- Google: a **Play Age Signals API** devolve faixa etária de usuários no Brasil, ligada ao ECA Digital [G8].
- **INFERÊNCIA:** A16 não é 18+, então o bloqueio automático de download não nos atinge; mas contas infantis com
  restrição por idade configurada abaixo de 16 podem não conseguir instalar. **NÃO CONFIRMADO**; testar.

---

## 5. Android: uma data que ninguém pode perder

**FATO [G10]** (Android developer verification): a exigência vale primeiro em **Brasil**, Indonésia, Singapura e
Tailândia, com **prazo de 30/09/2026**; a partir daí, pacote não registrado é removido do Play. Contas do Play Console
são registradas automaticamente em 99% dos casos, mas o app precisa **existir** na conta para isso acontecer.

**FATO [G12]:** conta pessoal nova do Play precisa **verificar identidade com documento oficial** e **verificar acesso
a um aparelho Android real** pelo app Play Console, antes de publicar.

**INFERÊNCIA:** somando isso ao teste fechado com 12 pessoas por 14 dias já registrado em
`docs/technical/ANDROID_VERIFICACAO_30_09.md`, a conta do Play precisa ser criada **agora**, mesmo que o app Android só
saia em outubro. Cada dia de atraso empurra a data do Android, e a verificação de identidade não depende de nós.

---

## 6. Rótulos de privacidade e Data safety, com a Comunidade

**FATO [A9]** (Apple): "Sensitive Info" inclui **crenças religiosas ou filosóficas**; existem tipos próprios para
**Photos or Videos**, **Other User Content**, **Name** e **User ID**. Não há exceção para dado exibido publicamente.

**FATO [G6]** (Google): "coletar" = transmitir para fora do aparelho; a lista tem **Name**, **Photos**,
**Other user-generated content**, **Political or religious beliefs**, e as perguntas de exclusão de dados.

**O que declarar no Envio 2 (INFERÊNCIA, a partir do desenho de hoje):** Nome, ID do usuário, **Fotos** (perfil e
publicações), **Outro conteúdo do usuário** (posts e comentários), **Crenças religiosas**, interações no app (Amém,
denúncias, bloqueios) e faixa etária. Tudo **vinculado ao usuário**, **sem rastreamento**, finalidade
"funcionalidade do app" e "segurança". E-mail **só se** existir (com C2, o e-mail passa a ser opcional — isso reduz o
que se declara como obrigatório, e é bom).

**Cuidado que vale ouro:** o formulário tem de ser atualizado **no mesmo envio** em que a Comunidade entrar. Formulário
que não bate com o app é motivo de remoção nas duas lojas — e é o tipo de erro que ninguém percebe até a remoção.

O detalhamento (manifesto `PrivacyInfo.xcprivacy`, criptografia de exportação, inventário de saídas de rede) continua em
`docs/product/PRIVACIDADE_NAS_LOJAS_rascunho.md`.

---

## 7. O que **bloqueia** o envio, separado do que é recomendação

### 7.A — Bloqueia o envio de agora (V1, esta semana)

1. E-mail de suporte real, atendido, em `src/config/contato.ts` e na ficha (A1).
2. Política de privacidade publicada em https e a URL no mesmo lugar (A2).
3. Autorização escrita da igreja (A5) — sem ela o build de produção nem é gerado.
4. `store.config.json` sem nenhum `[PREENCHER]` (A3).
5. No questionário etário: **UGC = Não**, **social media = Não**, e "Dados não coletados" (A6, A7). **É verdade hoje** —
   e deixa de ser verdade no minuto em que a Comunidade entrar.
6. Android: criar a conta do Play e verificar identidade (A9, §5) — não bloqueia o iPhone, bloqueia o Android.

### 7.B — Bloqueia o envio com a Comunidade (Envio 2)

1. **Servidor no ar** (as migrações nunca rodaram) + conta de demonstração + feed com conteúdo (B12).
2. **Filtro antes de publicar**, incluindo imagem, com estados "Em análise" e "Não publicado" na tela (B1, §3).
3. **Denunciar conteúdo e pessoa, bloquear e desbloquear — com tela** (B2, B3, B4).
4. **Moderador humano nomeado**, com ferramenta e prazo real (B5, B18).
5. **Regras da comunidade + consentimento**: texto escrito, versionado, aceite obrigatório sem pular (B7, B8).
6. **Exclusão de conta no app e por link web**, apagando também o que foi publicado (B10, B11).
7. **Questionário etário refeito**: Social Media = sim ⇒ 13+ / A16; IARC refeito no Play (B13).
8. **Data safety e App Privacy refeitos** (B16).
9. **Seletor de foto do sistema** no Android, ou declaração de permissão no Play Console (B17).
10. Público-alvo declarado no Play (B15).

### 7.C — Recomendações (não bloqueiam, reduzem risco)

- Incluir a proibição de abuso infantil (CSAE) e de "comentário religioso inflamatório" nas regras, mesmo fora da
  categoria Social (§3, [A1] 1.1.5, [G4]).
- Categoria **Referência + Estilo de vida**, nunca "Crianças", nunca "Social" (escolher pela função, não para fugir de
  política).
- Manter **sem mensagem privada**: chat privado/anônimo é o que as duas lojas tratam com mais dureza.
- Página de exclusão publicada desde já (mesmo dizendo "esta versão não tem conta"), para não virar corrida depois.
- Guardar o registro de moderação (quem decidiu, quando, por quê): é o que se mostra quando a loja pede "um plano de
  melhoria" (a 1.2 prevê isso literalmente).
- Testar, num iPhone com conta de menor de 16 e Compartilhamento Familiar, se o app A16 instala (NÃO CONFIRMADO).

---

## 8. A lista curta do fundador, antes de enviar

**Para o envio de agora (V1), nesta ordem:**

1. **E-mail de suporte** que você vá ler todo dia. Me mande o endereço.
2. **Publicar as três páginas de `site/`** (política, suporte, exclusão) em https e me mandar as URLs.
3. **Autorização escrita da igreja** (mensagem com nome, cargo e data já serve) — me avise que eu registro.
4. **Criar a conta do Google Play agora**, mesmo sem enviar nada: identidade com documento e verificação por aparelho
   levam dias, e o Brasil tem prazo de **30/09/2026** na verificação de desenvolvedor.
5. No App Store Connect, responder o questionário etário com **social media = Não** e privacidade **"Dados não
   coletados"** — enquanto a Comunidade não estiver no build, isso é verdade.

**Antes de a Comunidade ir ao ar (não é para esta semana):**

6. **Dizer quem modera**, com nome, e quantas horas por dia — inclusive sábado e domingo. Sem isso, as duas lojas
   rejeitam, e não há código que resolva.
7. **Decidir e aceitar a classificação 16 anos (A16) no Brasil**, com o selo "Social Media" na página da loja — ou
   reduzir o alcance do feed. Não dá para ter feed da igreja inteira com curtida e comentário e continuar "Livre".
8. Aprovar o **texto das regras da comunidade** e o **texto do consentimento** (vale passar pelo advogado).
9. Bancar o **filtro automático de imagem** (ou aceitar que toda foto espere aprovação humana).
10. Confirmar com o pastor a abertura de todos os dias (J6) — libera também o guia de intercessão dos dias futuros.

---

## Fontes (acesso em 2026-09-22)

**Apple**
- [A1] App Store Review Guidelines — 1.1.5, 1.2, 1.2.1(a), 2.1, 2.3.6, 4.8, 5.1.1(i), 5.1.1(v), 5.1.2, 5.2.1 —
  https://developer.apple.com/app-store/review/guidelines/ (a página não exibe data de atualização)
- [A3] "Age rating questionnaire now includes social media questions" (09/07/2026; respostas obrigatórias desde
  setembro de 2026) — https://developer.apple.com/news/?id=tlur8uvi
- [A4] App Store Connect Help — "Age ratings values and definitions" (capabilities, 13+, faixas do Brasil incluindo
  A16) — https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- [A5] "Offering account deletion in your app" — https://developer.apple.com/support/offering-account-deletion-in-your-app/
  (**não reaberto hoje**; citado em `comunidade/01-lojas.md`, acesso 2026-09-21)
- [A9] App Privacy Details — https://developer.apple.com/app-store/app-privacy-details/ (**não reaberto hoje**;
  acesso 2026-09-21)
- [A10] "Age requirements for apps distributed in Brazil, Australia, Singapore, Utah, and Louisiana" (24/02/2026;
  bloqueio de 18+ no Brasil, Declared Age Range API, obrigação própria do desenvolvedor) —
  https://developer.apple.com/news/?id=f5zj08ey
- [A11] "Age assurance developer Q&A" (Declared Age Range API; a Apple diz que a responsabilidade pelas restrições de
  idade é do desenvolvedor) — https://developer.apple.com/support/age-assurance

**Google**
- [G1] Política "User Generated Content" (aceite de termos antes de criar UGC; moderação robusta, efetiva e contínua;
  denúncia no app; bloqueio) — https://support.google.com/googleplay/android-developer/answer/9876937
- [G2] "Understanding moderation requirements... in UGC apps" (denunciar **e** bloquear **usuários e conteúdo**;
  termos que o usuário não pode pular; ação em tempo hábil) —
  https://support.google.com/googleplay/android-developer/answer/12923286?hl=en
- [G3] "Understanding Google Play's app account deletion requirements" (caminho no app + link web; a página precisa
  carregar, destacar a exclusão, citar o nome do app/desenvolvedor e dizer o que é apagado e o que é mantido) —
  https://support.google.com/googleplay/android-developer/answer/13327111
- [G4] "Child Safety Standards (CSAE)" — https://support.google.com/googleplay/android-developer/answer/14747720?hl=en
  (**não reaberto hoje**; acesso 2026-09-21)
- [G5] Google Play Families Policies (público-alvo; lembrete de segurança online antes de troca livre de mídia; ação de
  adulto; controle parental do recurso social) — https://support.google.com/googleplay/android-developer/answer/9893335?hl=en
- [G6] Data safety — tipos de dados e definição de coleta —
  https://support.google.com/googleplay/android-developer/answer/10787469 (**não reaberto hoje**; acesso 2026-09-21)
- [G8] "Requirements for distributing apps in specific countries/regions" (Brasil: ECA Digital, Play Age Signals API,
  ClassInd/IARC, filtragem de 18+ para menores) —
  https://support.google.com/googleplay/android-developer/answer/6223646?hl=en
- [G9] Play Age Signals — https://developer.android.com/google/play/age-signals/use-age-signals-api (**não reaberto
  hoje**; acesso 2026-09-21)
- [G10] Android developer verification (Brasil entre os primeiros países; prazo **30/09/2026**; 99% dos apps do Play
  registrados automaticamente) — https://developer.android.com/developer-verification e
  https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html
- [G11] "Details on Google Play's Photo and Video Permissions policy" (usar o seletor do sistema; declaração
  obrigatória desde 22/01/2025 para quem pede a permissão ampla) —
  https://support.google.com/googleplay/android-developer/answer/14115180?hl=en
- [G12] "Verify your developer identity information" / "Device verification requirements for new developer accounts"
  (documento oficial e aparelho Android real para conta pessoal nova) —
  https://support.google.com/googleplay/android-developer/answer/10841920?hl=en ·
  https://support.google.com/googleplay/android-developer/answer/14316361?hl=en

**Outras**
- [R1] Cloud Vision API — SafeSearch Detection (adult, spoof, medical, violence, racy) —
  https://cloud.google.com/vision/docs/detecting-safe-search · preços: https://cloud.google.com/vision/pricing
  (**a tabela de preços não abriu no acesso de hoje; NÃO CONFIRMADO**)

**Código lido em 2026-09-22 (FATO):** `mobile/src/community/api.ts`, `mobile/src/community/types.ts`,
`mobile/src/config/features.ts`, `mobile/src/config/contato.ts`, `mobile/src/cloud/auth.ts`,
`mobile/src/app/(tabs)/_layout.tsx`, `mobile/src/app/ajuda.tsx`, `mobile/src/app/privacidade.tsx`,
`mobile/app.config.ts`, `mobile/store.config.json`, `mobile/package.json`,
`mobile/supabase/migrations/20260921130100_comunidade_funcoes.sql`, `site/`.

**Documentos internos:** `docs/product/comunidade/01-lojas.md` (antecessor),
`docs/product/PRIVACIDADE_NAS_LOJAS_rascunho.md`, `docs/product/LANCAMENTO_EXPRESSO_IOS.md`,
`docs/product/FICHA_DE_LOJA_rascunho.md`, `docs/product/FEEDBACK_DAVI_2026-09-22.md`,
`docs/technical/ANDROID_VERIFICACAO_30_09.md`, `docs/technical/MOBILE_STORE_REQUIREMENTS.md`.
