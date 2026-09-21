# Comunidade — o que as lojas exigem de um app com conteúdo de usuário

- **Frente:** 01 · Lojas (Apple App Store e Google Play)
- **Data:** 2026-09-21 · **Autor:** Claude (Principal Mobile Engineer / Technical Architect)
- **Para:** Davi (decisão do feed, `docs/design/00-DECISAO-FEED.md`) e Product Brain (ratificação)
- **Natureza:** insumo para decisão. Nada foi implementado e nenhum arquivo do app ou documento existente foi alterado.
- **Classificação:** **FATO** (fonte oficial + URL + data de acesso) · **INFERÊNCIA** (conclusão minha a partir de fatos) ·
  **HIPÓTESE** (plausível, não confirmada) · **NÃO CONFIRMADO** (procurei e não achei fonte primária).
- **Data de acesso de todas as fontes:** 2026-09-21, salvo indicação. Políticas de loja mudam: reverificar antes de submeter.

---

## 0. Resumo em dez linhas

1. **FATO:** a Apple exige quatro coisas de qualquer app com UGC: filtro **antes** de o conteúdo ir ao ar, denúncia com resposta rápida, bloqueio de usuário e contato publicado [A1].
2. **FATO:** o Google exige aceite de termos/regras **antes** de publicar, denúncia **e** bloqueio dentro do app, e moderação "robusta, efetiva e contínua" [G1][G2].
3. **FATO, e é a novidade mais pesada:** desde setembro de 2026 a Apple exige responder se o app tem **"social media capability"**
   (feed que espalha UGC para muitos usuários, com curtidas/comentários). Com isso a classificação mínima vira **13+**
   no mundo e **A16** no Brasil, **mesmo que o recurso esteja desligado para menores de 13** [A3][A4].
4. **INFERÊNCIA:** o feed da igreja inteira com Amém e comentários se encaixa na definição. Um app que hoje sairia "Livre/4+" passa a
   ser **A16 na App Store Brasil**. Para uma campanha "de criança a idoso", isso é uma consequência de produto, não detalhe técnico.
5. **FATO:** exclusão de conta dentro do app nas duas lojas; no Google, **também por link web**. A Apple diz que a exclusão
   apaga **também o que a pessoa publicou para outros** (fotos, textos) [A5][G3].
6. **INFERÊNCIA:** o desenho (C1–C6) cobre bem **denunciar/bloquear no post e no comentário** e o **aviso de visibilidade**. Não cobre:
   filtro antes de publicar, estado "em análise/recusado", regras da comunidade com aceite, contato do desenvolvedor, apagar o
   próprio post, denunciar uma pessoa, idade, e a tela "Conta e privacidade" (que não existe entre as 32).
7. **FATO:** a Apple exige conta de demonstração e backend ligado na revisão [A1 §2.1]. **Não existe servidor.** Sem ele, a Comunidade não passa em revisão nenhuma.
8. **INFERÊNCIA:** nenhum dos requisitos proíbe o feed. Todos exigem **operação real** (fila de moderação com gente, e-mail de contato atendido, página web de exclusão) antes do envio.
9. A lista final do que falta está na §6.
10. Os pontos que voltam para decisão do fundador estão na §7.

---

## 1. Apple — App Store Review Guidelines

### 1.1 Guideline 1.2 — User-Generated Content

**FATO** [A1] — texto vigente (a página não mostra data de atualização; é "documento vivo"): apps com conteúdo gerado por usuário
ou serviços de rede social devem incluir:

| # | Requisito (tradução minha, fiel) | Original curto |
|---|---|---|
| 1 | Um método para **filtrar material objetável antes de ser publicado** no app | "filtering objectionable material from being posted" |
| 2 | Um mecanismo para **denunciar** conteúdo ofensivo e **resposta tempestiva** às denúncias | "report offensive content and timely responses" |
| 3 | A capacidade de **bloquear usuários abusivos** | "block abusive users" |
| 4 | **Informação de contato publicada** para que o usuário alcance o desenvolvedor facilmente | "Published contact information" |

**FATO** [A1]: a responsabilidade de remover conteúdo que viole a 1.2, os termos ou as regras da comunidade é do desenvolvedor.
Se a Apple achar conteúdo assim, pede a remoção e **um plano de melhoria**; pode tirar o app da loja até a correção, e
reincidência grave é motivo de remoção imediata do app e do Developer Program.

**FATO** [A1 §1.1.5]: "comentário religioso inflamatório" e citação imprecisa ou enganosa de texto religioso são conteúdo objetável.
**INFERÊNCIA:** num feed de fé isso é o risco mais provável de moderação, e o filtro precisa pensar nele (discussão doutrinária
agressiva, versículo adulterado), não só em palavrão e nudez.

#### O ponto 1, em detalhe: filtrar **antes**

- **FATO:** o texto diz "from being posted". A Apple **não especifica o método** e **não fixa prazo** para a "resposta tempestiva" [A1].
- **INFERÊNCIA:** denúncia depois do fato não satisfaz o ponto 1 sozinha; ela é o ponto 2. Precisa existir **alguma barreira entre
  "enviei" e "apareceu para os outros"**. Duas formas atendem ao texto:
  - **(a) Filtro automático no servidor antes de o post ficar visível:** lista de termos em pt-BR (inclusive variações) +
    classificador de imagem (nudez, violência). Aprovado → aparece em segundos. Suspeito → vai para fila humana, não aparece.
  - **(b) Pré-moderação humana de tudo:** nada aparece sem alguém da igreja aprovar. Mais seguro, mas com ~3.000 pessoas e
    publicação diária, é uma fila grande e cria horas de espera.
- **HIPÓTESE:** a opção (a) com fila humana para os casos suspeitos é o padrão aceito na prática. **NÃO CONFIRMADO** em fonte da
  Apple; é leitura do texto e prática de mercado.
- **O que a interface precisa ter, nas duas opções:** um **estado intermediário** do próprio post ("Em análise" — visível só para
  o autor), um estado **"não publicado"** com motivo e caminho de contestação, e texto honesto em C3 sobre isso.
  O filtro precisa valer também para **comentário (C6)** e para **foto de perfil e nome** (que aparecem para todos).
- **Cobertura no desenho:** **não cobre.** C3 → "Publicar" → post visível. LACUNAS C6 já registrou isso.

#### O ponto 2: denúncia + resposta

- **FATO** [A1]: exige mecanismo de denúncia e "timely responses". Sem prazo numérico.
- C5 promete "Alguém da igreja vai olhar em até 24 h". **INFERÊNCIA:** o prazo é escolha do produto; a Apple não o exige,
  mas uma vez prometido na tela vira promessa que o revisor e o usuário podem cobrar. (O prazo de 24–48 h citado em
  `00-DECISAO-FEED.md` vem da lei brasileira, não da Apple; esta frente não o reverificou.)
- **O que a interface precisa ter:** denunciar a partir do post **e** do comentário (C5 tem), com **motivo** (lista curta, incluindo
  "apareço nesta foto e não autorizei"), **recibo** ("recebemos, alguém vai olhar"), e o que acontece depois (aviso ao autor quando
  algo sai do ar). Por trás: fila, responsável humano e registro de ações.
- **Cobertura no desenho:** **parcial.** C5 tem o gesto; faltam motivo, recibo, estado e aviso de remoção (LACUNAS C8).

#### O ponto 3: bloquear

- **FATO** [A1]: "block abusive users from the service".
- **Cobertura no desenho:** **cobre** no post e no comentário (C5: "Bloquear Cláudia R. — você não vê mais nada dela, e ela não
  vê você"). **INFERÊNCIA:** falta o lugar para **ver e desfazer bloqueios** (normalmente em "Conta e privacidade"); não é exigência
  textual, mas o revisor costuma testar o ciclo. E C5 aplicado ao **próprio post** ofereceria "Bloquear [você mesmo]" (LACUNAS C9).

#### O ponto 4: contato publicado

- **FATO** [A1 §1.2 e §1.5]: contato publicado para o usuário alcançar o desenvolvedor; §1.5 pede que o app **e** a Support URL tenham
  um jeito fácil de contato. **FATO** [A1 §5.1.1(i)]: link para a política de privacidade **dentro do app**, de forma fácil de achar, e
  no App Store Connect.
- **O que a interface precisa ter:** uma linha alcançável (ex.: D1 → "Ajuda e contato") com e-mail/form atendido, link da política
  de privacidade, termos e regras da comunidade. **INFERÊNCIA:** o ideal é esse caminho existir também a partir do feed (C1) e da
  folha C5.
- **Cobertura no desenho:** **não cobre.** D1 não tem "Ajuda" nem contato (LACUNAS C16).

### 1.2 Guideline 1.2.1 — Creator Content

- **FATO** [A1][A2]: 1.2.1 trata de apps com uma comunidade de "creators" que criam, compartilham e **monetizam** experiências.
  A 1.2.1(a), nova em **13/11/2025**, exige que "creator apps" permitam identificar conteúdo acima da classificação etária do app
  e restrinjam acesso por idade verificada ou declarada.
- **INFERÊNCIA:** o feed da igreja **não** é "creator app" (não há criadores profissionais, ferramentas de criação nem monetização).
  Não se aplica. Mas vale a lógica: se um dia entrarem devocionais de líderes como "conteúdo de criador", revisitar.

### 1.3 Guideline 5.1.1(v) — uso sem conta. O feed pode ser lido sem conta?

- **FATO** [A1]: "se o app não tem recursos significativos baseados em conta, deixe as pessoas usarem sem login"; e "se a função
  principal do app não está ligada a uma rede social específica (Facebook, X…), você deve dar acesso sem login".
  Se o app permite criar conta, **precisa oferecer exclusão de conta dentro do app**.
- **INFERÊNCIA:** a regra protege a **função principal** (ler, marcar, refletir), que já funciona sem conta. Publicar, reagir e comentar
  são recursos baseados em conta e **podem** exigir login. **Ler o feed** não é exigido pela Apple sem conta: nenhum trecho obriga
  isso. O que seria rejeitado é o app **abrir num muro de login**.
- **INFERÊNCIA:** `TELAS.md` põe a **Jornada como casa** (linha 7) e a Comunidade como aba. Isso resolve o risco do muro, e
  contradiz `00-DECISAO-FEED.md`, que diz que o feed "passa a ser a primeira tela". **Precisa de decisão** (§7, item 1).
- **Leitura sem conta tem custo em outra frente:** ver §1.5 (classificação etária) — se criança lê o feed sem conta, o app está
  entregando "social media" a menor de 13.
- **O que a interface precisa ter:** com a Comunidade exigindo conta, um estado de C1 para quem não tem conta que **não seja
  erro nem muro** ("Para ler e publicar na comunidade, crie sua conta"), com saída clara para a Jornada.
- **Cobertura no desenho:** **não cobre.** Nenhuma das 32 telas mostra C1 sem conta. REGRAS 12 diz que conta serve para "publicar
  e reagir", o que sugere leitura aberta — e C4 item 1 ("Qualquer pessoa que baixar o app vê") também. LACUNAS B5 mostra que a
  RLS atual nega tudo ao papel `anon`.

### 1.4 Exclusão de conta dentro do app

- **FATO** [A5]: a opção deve ser **fácil de achar**, normalmente nas configurações da conta. Link para site só se a conclusão exigir
  web, e o link deve ir **direto** à página. **Desativar temporariamente não basta.** Fora de setores altamente regulados, **não
  pode** exigir telefonema, e-mail ou outro fluxo de suporte.
- **FATO** [A5]: "as pessoas esperam que todos os dados associados à conta sejam apagados… **inclusive conteúdo gerado por usuário
  compartilhado com outros, como fotos, vídeos, posts de texto e avaliações**".
- **FATO** [A5]: com Sign in with Apple, usar a REST API da Apple para **revogar os tokens**.
- **FATO** [A1 §4.8]: se usar Google Sign-In, é obrigatório oferecer também um login equivalente que limite dados a nome e e-mail e
  permita esconder o e-mail (Sign in with Apple atende). O plano do ADR-002 (OTP + Apple + Google) está alinhado.
- **O que a interface precisa ter:** em "Conta e privacidade": **Excluir conta** (com o que acontece com posts, comentários, fotos e
  Améns dito na tela, confirmação, e conclusão dentro do app), **sair da conta**, e — pedido da decisão do feed, não da loja —
  **"apagar tudo o que publiquei"** sem apagar a jornada.
- **Cobertura no desenho:** **não cobre.** D1 tem só a linha "Conta e privacidade"; a tela não está entre as 32 (LACUNAS B14).
  No código, `requestAccountDeletion` sempre lança erro e não há Edge Function (LACUNAS B12).

### 1.5 Classificação etária — o que mudou em 2025–2026 com UGC/social

Sim, mudou duas vezes, e a segunda muda o resultado deste app.

- **FATO** [A6] — 24/07/2025: novas faixas **4+, 9+, 13+, 16+, 18+**; perguntas novas sobre controles no app, **capabilities**,
  temas médicos e violência; respostas obrigatórias até **31/01/2026** para continuar enviando atualizações.
- **FATO** [A7] — 08/06/2026: "Time Allowances" no iOS 27 permite aos pais limitar tempo por categoria, incluindo **Social Media**.
- **FATO** [A3] — 09/07/2026: o questionário passa a perguntar sobre **social media capabilities**, definidas como "a capacidade
  de redistribuir, amplificar ou interagir com UGC por um feed social ou método de descoberta semelhante". Apps com isso exibem o
  descritor **Social Media** na página da loja. **Respostas obrigatórias a partir de setembro de 2026** para apps novos e updates.
- **FATO** [A4] — definições e efeito (App Store Connect Help):

| Capability | Definição (resumo fiel) | Efeito na classificação |
|---|---|---|
| User-Generated Content | distribuição ampla de conteúdo criado por usuários (fotos, texto…) | mínimo **4+** |
| Messaging and Chat | usuários se comunicam dentro do app, **inclusive "public posting"** | mínimo **4+** |
| **Social Media** | redistribuição/amplificação/interação com UGC num feed que **espalha visivelmente o conteúdo para muitos usuários**; inclui feeds com "views, likes, comments" | mínimo **13+** |
| Social Media Disabled for Users Under 13 | menores de 13 não acessam; **no mínimo** chamar a **Declared Age Range API** antes de liberar; só UGC adequado à idade | aparece em **13+**; na Austrália em 16+ |
| **Brasil (autoclassificação)** | a faixa **A16** lista como capabilities: "Social media" **e** "Social media disabled for users under 13" | **A16** |

- **INFERÊNCIA (alta confiança):** um feed da igreja inteira (~3.000 pessoas) com Amém e comentários é "Social Media" pela definição
  ("likes, comments", "muitos usuários"). O fato de o Amém não ter contagem **não muda** o enquadramento: continua sendo interação.
- **INFERÊNCIA:** resultado provável: **13+ global** e **A16 na App Store do Brasil**, e isso **não cai** marcando "desligado para
  menores de 13", porque no Brasil essa opção também está na A16 [A4].
- **FATO** [A8] — 24/02/2026: a Apple bloqueia no Brasil download de apps **18+** sem confirmação de adulto. **INFERÊNCIA:** A16 não
  é 18+, então esse bloqueio automático não atinge o app; mas contas de criança/adolescente com restrição de conteúdo por idade
  (Compartilhamento Familiar / Tempo de Uso) configurada abaixo de 16 **podem não conseguir baixar ou abrir** o app.
  **NÃO CONFIRMADO** como o iOS aplica a faixa brasileira A16 a contas infantis; testar.
- **HIPÓTESE:** um feed **só do grupo** (até 12 pessoas que se conhecem) talvez não "espalhe visivelmente para muitos usuários" e
  ficasse em UGC/Messaging (4+). **NÃO CONFIRMADO**: a Apple não define "muitos". Confirmar no próprio App Store Connect e, se
  preciso, perguntar à App Review antes de desenhar em cima disso.
- **O que a interface precisa ter:** se a opção for "desligado para menores de 13": chamada à **Declared Age Range API** antes de
  mostrar o feed, e um estado para menor que **não humilhe** ("Aqui você lê a Jornada; a comunidade é para quem tem 18 anos ou
  mais"). Com a regra já vigente de "conta só ≥ 18" (S-11), o gate por conta já faz o grosso — mas a Apple pede a API "no mínimo".
- **Cobertura no desenho:** **não cobre.** Idade não aparece em nenhuma tela (LACUNAS C7).

### 1.6 Revisão da Apple — o que o revisor precisa para aprovar

- **FATO** [A1 §2.1(a)]: se o app tem login, incluir **conta de demonstração** e **ligar o backend**; URLs funcionais; nada de conteúdo
  provisório.
- **INFERÊNCIA:** o revisor vai abrir a Comunidade, publicar, denunciar e bloquear. Isso exige: servidor no ar, conta demo ≥ 18 com
  consentimento já dado ou dando na hora, um feed com conteúdo real (feed vazio impede testar denúncia/bloqueio), e, se houver
  pré-moderação humana, alguém para aprovar o post do revisor durante a revisão. Nas notas de revisão, **explicar o filtro e a
  moderação** evita a pergunta "onde está o filtro?".

### 1.7 Rótulos de privacidade (App Privacy)

- **FATO** [A9]: "Sensitive Info" inclui **crenças religiosas ou filosóficas**; há tipos próprios para **Photos or Videos**, **Other User
  Content**, **Name** e **User ID**; dado pessoal conta como "linked to the user". A página não traz exceção para dado exibido publicamente.
- **INFERÊNCIA:** com a Comunidade, declarar ao menos: Name, User ID, Photos, Other User Content e, por prudência, **Sensitive Info**
  (posts sobre fé), todos vinculados ao usuário, nenhum para tracking. Isso é metadado de loja, não tela; mas precisa ser verdade.

---

## 2. Google Play

### 2.1 Política de User Generated Content

- **FATO** [G1]: UGC é "conteúdo que usuários contribuem para um app e que é visível ou acessível a pelo menos um subconjunto
  dos usuários". Apps com UGC devem:
  1. exigir que o usuário **aceite os termos de uso e/ou a política de usuário do app antes de criar ou enviar UGC**;
  2. fazer **moderação robusta, efetiva e contínua**;
  3. oferecer um **sistema no app para denunciar e bloquear** UGC e usuários objetáveis;
  4. em recursos com interação 1:1, bloqueio de usuário no app.
- **FATO** [G2] (página de orientação sobre moderação): termos "claros e acessíveis" e **o usuário não pode pular** o aceite das regras;
  o app "deve oferecer denunciar **e** bloquear **usuários e conteúdo**"; ações "em tempo hábil"; as funções devem ser fáceis de
  achar. O formato é livre.
- **O que a interface precisa ter:** tela de **regras da comunidade com aceite obrigatório e registrado** antes da primeira
  publicação (pode ser junto de C4, mas é outra coisa que o consentimento LGPD); link permanente para as regras a partir de C1/C3;
  **denunciar pessoa** além de denunciar post.
- **Cobertura no desenho:** C5 cobre denunciar conteúdo e bloquear pessoa. **Não cobre:** aceite dos termos/regras (C4 só traz o
  consentimento LGPD — LACUNAS C11) e **denunciar usuário** (C5 denuncia a publicação, não a pessoa).

### 2.2 Child Safety Standards (CSAE)

- **FATO** [G4]: a política vale para apps de chat anônimo/aleatório e apps **nas categorias Social e Dating** declaradas no Play Console.
  Exige padrões públicos proibindo abuso sexual infantil, ponto de contato designado, mecanismo de denúncia no app e autodeclaração.
- **INFERÊNCIA:** se o app ficar em categoria como "Livros e referências" ou "Estilo de vida", **não entra** no escopo formal. Mesmo
  assim, incluir a proibição de CSAE nas regras da comunidade custa uma frase e protege. **Não** escolher a categoria Social para
  fugir de nada; escolher pela função principal (leitura).

### 2.3 Families (se o público-alvo incluir menores de 13)

- **FATO** [G5]: app com crianças no público-alvo **e** recursos sociais deve mostrar **lembrete de segurança online** antes de a criança
  trocar mídia/informação livre, exigir **ação de adulto** antes de liberar troca de dados pessoais, e dar aos adultos um jeito de
  **gerenciar** o recurso social (ligar/desligar).
- **INFERÊNCIA:** a campanha é "de criança a idoso". Se o público-alvo declarado no Play Console incluir < 13, a política Families
  inteira entra (inclusive regras de SDK e dados). Com conta só ≥ 18 para publicar e comentar, a criança não troca informação; mas
  se ela **lê** o feed, o Google pode considerar exposição a UGC. **Decisão:** declarar público 13+ (e a criança usa o app sem ser
  público-alvo declarado) ou incluir < 13 e cumprir Families. Isso é escolha de produto com consequência de loja.

### 2.4 Termos de uso no app

- **FATO** [G1][G2]: aceite antes de criar UGC, sem pular.
- **FATO** (fora da loja, não reverificado aqui): o ECA Digital exige termos em pt-BR com a classificação indicativa
  (`docs/research/STORES_LEGAL_RESEARCH.md`, Decreto 12.880/2026 art. 12 §4º).
- **Cobertura:** **não cobre** (ver 2.1).

### 2.5 Data safety

- **FATO** [G6]: tipos relevantes: **Name**, **Political or religious beliefs**, **Photos**, **Other user-generated content**, e perguntas sobre
  **exclusão de dados**. "Coleta" = transmitir dados para fora do aparelho.
- **INFERÊNCIA:** com a Comunidade, declarar Name, Photos, Other UGC, e **Religious beliefs**; marcar que há exclusão de conta e dados.
  Atualizar o formulário **no mesmo envio** em que a Comunidade entrar. Não é tela, mas se o formulário não bater com o app o Play
  rejeita ou remove.

### 2.6 Classificação IARC com UGC

- **FATO** [G7]: o questionário IARC no Play Console pergunta sobre conteúdo e sobre recursos interativos; a IARC considera se o app
  permite interação entre usuários e compartilhamento de UGC. **FATO** [G8]: no Brasil, a IARC emite a classificação **ClassInd**;
  pode ser preciso reenviar o questionário para obter a nova classificação. **FATO** [G8]: o Play bloqueia/filtra apps **18+** para
  menores identificados no Brasil.
- **NÃO CONFIRMADO:** o texto exato das perguntas de UGC do questionário IARC e se elas elevam a faixa ClassInd. As páginas públicas
  do Google não listam as perguntas; só o formulário no Play Console mostra. **INFERÊNCIA:** o mais provável é a faixa continuar baixa
  e aparecer o elemento interativo "Usuários interagem"; mas isso precisa ser visto no formulário real antes de prometer "Livre".
- **FATO** [G8][G9]: a **Play Age Signals API** devolve faixa etária de usuários no Brasil desde 17/03/2026 para fins do ECA Digital.
  Equivalente Android da Declared Age Range.

### 2.7 Exclusão de conta: no app e por link web

- **FATO** [G3]: caminho **no app**, visível (ex.: configurações da conta) para excluir conta e dados; **e** um **link web** onde a pessoa
  pede exclusão da conta e dos dados **sem precisar reinstalar o app**. A página precisa: carregar sem erro, ter o caminho de exclusão em
  destaque, **citar o nome do app ou do desenvolvedor como na loja**, descrever os passos e dizer **quais dados são apagados, quais são
  mantidos e por quanto tempo**. Retenção só por motivo legítimo (segurança, fraude, obrigação legal) e informada na política.
  O link vai no formulário Data safety.
- **O que a interface precisa ter:** a mesma tela "Conta e privacidade" (1.4) + uma **página web pública** com domínio próprio.
- **Cobertura:** **não cobre** (não há tela nem domínio; LACUNAS B14).

---

## 3. Uma tabela só: exigência × interface × desenho atual

Legenda: ✔ cobre · ◐ parcial · ✘ não cobre.

| # | Exigência | Loja | O que a interface precisa ter | Desenho | Onde está a falha |
|---|---|---|---|---|---|
| 1 | Filtro **antes** de publicar | Apple 1.2 | estado "Em análise" (só o autor vê) e "Não publicado" com motivo e contestação; filtro também em comentário, nome e foto | ✘ | C3 publica direto (LACUNAS C6) |
| 2 | Denunciar conteúdo | Apple 1.2 · Play UGC | a partir do post **e** do comentário | ✔ | C5, "a mesma folha vale no comentário" |
| 3 | Resposta à denúncia | Apple 1.2 · Play UGC | motivo, recibo, estado, aviso ao autor | ◐ | C5 é toque único (LACUNAS C8) |
| 4 | Denunciar **usuário** | Play UGC | "Denunciar [pessoa]" | ✘ | C5 só denuncia a publicação |
| 5 | Bloquear usuário | Apple 1.2 · Play UGC | bloquear no post e no comentário; ver/desfazer bloqueios | ◐ | falta lista de bloqueados; C5 no próprio post oferece bloquear a si mesmo (LACUNAS C9) |
| 6 | Contato publicado | Apple 1.2, 1.5 | "Ajuda e contato" alcançável no app, e-mail atendido; Support URL | ✘ | D1 não tem Ajuda (LACUNAS C16) |
| 7 | Política de privacidade no app | Apple 5.1.1(i) | link fácil de achar | ✘ | idem |
| 8 | Termos/regras com aceite antes de publicar | Play UGC | tela de regras + aceite obrigatório e registrado; link em C1/C3 | ✘ | C4 é só LGPD (LACUNAS C11) |
| 9 | App utilizável sem conta | Apple 5.1.1(v) | Jornada como casa; C1 sem conta como convite, não erro | ◐ | TELAS põe a Jornada como casa ✔; falta o estado "C1 sem conta"; conflito com 00-DECISAO |
| 10 | Excluir conta no app, apagando também o que foi publicado | Apple 5.1.1(v) · Play | "Conta e privacidade": excluir, sair, apagar publicações, exportar | ✘ | tela não existe (LACUNAS B14) |
| 11 | Excluir conta por link web | Play | página pública com nome do app, passos, dados apagados/mantidos | ✘ | sem domínio |
| 12 | Revogar token Sign in with Apple | Apple | invisível; faz parte da exclusão | ✘ | sem Edge Function (LACUNAS B12) |
| 13 | Apagar o próprio post/comentário | (não é texto de loja; C4 promete) | variante de C5 para conteúdo próprio | ✘ | LACUNAS C9 |
| 14 | Classificação etária honesta com "Social Media" | Apple 2.3.6, questionário set/2026 | Declared Age Range antes do feed se escolher "desligado < 13"; estado para menor | ✘ | idade não aparece (LACUNAS C7) |
| 15 | Público-alvo e Families | Play Families | lembrete de segurança e controle de adulto **se** < 13 no público | ✘ | decisão não tomada |
| 16 | Rótulos de privacidade / Data safety | Apple · Play | nenhuma tela; formulário verdadeiro | — | preencher no envio |
| 17 | Backend ligado + conta demo | Apple 2.1 | servidor, conta demo, feed com conteúdo | ✘ | não existe servidor (LACUNAS B3) |
| 18 | Aviso de quem vê a publicação | (LGPD/produto, não loja) | aviso permanente acima do campo | ✔ | C3 |
| 19 | Moderação humana contínua | Apple 1.2 · Play UGC | fila, papel de moderador, registro | ✘ | LACUNAS B11 |

---

## 4. O que já está certo no desenho (para não refazer)

- **C5** põe denunciar e bloquear a **um toque** do post e do comentário, com cópia honesta. É o que as duas lojas pedem, e a terceira
  linha ("Não quero ver este assunto") reduz denúncia por desconforto.
- **C3** tem aviso permanente de visibilidade; **C4** é consentimento destacado, fora dos termos. Não é exigência de loja, mas o revisor vê.
- **Jornada como casa** (TELAS linha 7) evita o muro de login da 5.1.1(v).
- **Sem contador** e **sem rolagem infinita** não são exigências de loja, mas não criam problema com nenhuma delas.

---

## 5. Riscos de rejeição mais prováveis, em ordem

1. **INFERÊNCIA:** envio sem servidor/conta demo ou com feed vazio → rejeição por 2.1 (incompleto). Certeza prática.
2. **INFERÊNCIA:** post que vai ao ar sem nenhum filtro → rejeição por 1.2 ("where is the filtering mechanism?").
3. **INFERÊNCIA:** falta de contato no app → 1.2/1.5.
4. **INFERÊNCIA:** exclusão de conta que não apaga posts, que manda e-mail, ou que só existe na web → 5.1.1(v).
5. **INFERÊNCIA:** questionário etário respondido "sem social media" com feed da igreja inteira → 2.3.6 (e depois "inquérito de regulador",
   nas palavras da própria guideline). Responder honestamente e aceitar 13+/A16, ou mudar o alcance.
6. **INFERÊNCIA:** no Play, publicar sem aceite de termos → violação de UGC (normalmente aviso e prazo, pode virar remoção).

---

## 6. O que falta para passar na revisão (checklist)

**Desenho (pedir ao designer):**
- [ ] Estados do post do autor: **"Em análise"** e **"Não publicado"** (motivo + contestar), em C1/C3; o mesmo para comentário.
- [ ] Tela de **regras da comunidade** com aceite obrigatório e registrado antes da primeira publicação; link a partir de C1 e C3.
- [ ] Folha de denúncia com **motivos** (incluindo "apareço nesta foto e não autorizei"), **recibo** e estado; aviso ao autor de remoção.
- [ ] **"Denunciar [pessoa]"** em C5.
- [ ] **Variante de C5 para conteúdo próprio**: apagar post/comentário, sem "bloquear a si mesmo".
- [ ] Tela **"Conta e privacidade"**: sair, excluir conta (dizendo que posts, comentários, fotos e Améns somem), apagar tudo o que
      publiquei, exportar JSON, revogar consentimento, bloqueados.
- [ ] Linha **"Ajuda e contato"** em D1 com contato, política de privacidade, termos, regras e "Para pais e responsáveis".
- [ ] **C1 sem conta** e **C1 para menor**: convite/explicação, nunca muro nem erro.
- [ ] Passo de **faixa etária** no fluxo de conta.

**Backend e operação (Claude + dono):**
- [ ] Projeto Supabase, schema de posts/comentários/reações/denúncias/bloqueios/consentimentos/ações de moderação com RLS testada.
- [ ] **Filtro no servidor antes da visibilidade** (termos pt-BR + imagem) e fila para suspeitos.
- [ ] **Moderador humano nomeado** com ferramenta mínima e cobertura real do prazo prometido (24 h, inclusive fim de semana).
- [ ] E-mail/canal de contato **atendido**; Support URL; política de privacidade publicada.
- [ ] Edge Function de exclusão (revoga Apple → apaga Storage → apaga usuário, em cascata sobre o conteúdo publicado).
- [ ] **Página web de exclusão** em domínio próprio, com nome do app, passos e dados apagados/mantidos.
- [ ] Declared Age Range (iOS) e Play Age Signals (Android) antes de liberar o feed, se a opção for "desligado para < 13".
- [ ] Conta demo ≥ 18 e feed semeado com conteúdo real para a revisão; notas de revisão explicando filtro e moderação.

**Metadados (no envio):**
- [ ] Questionário etário da Apple com **Social Media = sim** (se feed da igreja inteira) → aceitar 13+/A16.
- [ ] Questionário IARC no Play (ver no formulário real as perguntas de UGC).
- [ ] App Privacy (Apple) e Data safety (Google) com nome, foto, UGC e crença religiosa; link de exclusão.
- [ ] Público-alvo no Play Console (decidir se inclui < 13).

---

## 7. O que volta para decisão (não é do código)

1. **Feed como primeira tela ou Jornada como casa?** `00-DECISAO-FEED.md` diz feed; `TELAS.md` diz Jornada. Pela 5.1.1(v), feed na
   porta só é seguro se for legível sem conta — e aí cai no item 2.
2. **Alcance: igreja inteira ou grupo?** Igreja inteira ⇒ "Social Media" ⇒ **13+ global e A16 no Brasil**, confirmado pelas definições
   da Apple. Grupo pequeno *talvez* não seja "Social Media" (**não confirmado**). Isso pesa mais que qualquer detalhe de tela.
3. **Leitura do feed sem conta?** Abre o feed a crianças (entrega "social media" a < 13, Families no Play) e torna o conteúdo raspável
   pela chave pública. Exigir conta ≥ 18 para ler resolve os dois, ao custo de a maioria da igreja não ver a Comunidade sem cadastro.
4. **Filtro automático + fila, ou pré-moderação humana de tudo?** Muda C3 e muda quantas pessoas a igreja precisa escalar.
5. **Quem modera, com que prazo real?** "Até 24 h" em C5 é promessa escrita na tela.

---

## Fontes (acesso em 2026-09-21)

**Apple**
- [A1] App Store Review Guidelines — 1.1, 1.2, 1.2.1, 1.5, 2.1, 2.3.6, 4.8, 5.1.1(i), 5.1.1(v), 5.1.1(ix) — https://developer.apple.com/app-store/review/guidelines/
- [A2] "Updated App Review Guidelines now available" (13/11/2025; cria 1.2.1(a)) — https://developer.apple.com/news/?id=ey6d8onl
- [A3] "Age rating questionnaire now includes social media questions" (09/07/2026; obrigatório desde set/2026) — https://developer.apple.com/news/?id=tlur8uvi
- [A4] App Store Connect Help — "Age ratings values and definitions" (capabilities, 13+, A16 Brasil) — https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
- [A5] "Offering account deletion in your app" — https://developer.apple.com/support/offering-account-deletion-in-your-app/
- [A6] "Updated age ratings in App Store Connect" (24/07/2025; prazo 31/01/2026) — https://developer.apple.com/news/?id=ks775ehf
- [A7] "Introducing Time Allowances" (08/06/2026) — https://developer.apple.com/news/?id=0d2gpmml
- [A8] "Age requirements for apps distributed in Brazil, Australia, Singapore, Utah, and Louisiana" (24/02/2026) — https://developer.apple.com/news/?id=f5zj08ey
- [A9] App Privacy Details — https://developer.apple.com/app-store/app-privacy-details/
- Secundária, só para conferência: PPC Land, "Apple forces 13+ rating on apps with social feeds from September" — https://ppc.land/apple-forces-13-rating-on-apps-with-social-feeds-from-september/

**Google**
- [G1] Política "User Generated Content" — https://support.google.com/googleplay/android-developer/answer/9876937
- [G2] "Understanding moderation requirements and incidental sexual content in UGC apps" — https://support.google.com/googleplay/android-developer/answer/12923286?hl=en
- [G3] "Understanding Google Play's app account deletion requirements" — https://support.google.com/googleplay/android-developer/answer/13327111
- [G4] "Learning more about our Child Safety Standards policy" — https://support.google.com/googleplay/android-developer/answer/14747720?hl=en
- [G5] "Google Play Families Policies" — https://support.google.com/googleplay/android-developer/answer/9893335?hl=en
- [G6] Data safety — tipos de dados e definições — https://support.google.com/googleplay/android-developer/answer/10787469
- [G7] "Content ratings" (Play Console Help) — https://support.google.com/googleplay/android-developer/answer/9898843?hl=en · "Apps & Games content ratings on Google Play" — https://support.google.com/googleplay/answer/6209544?hl=en
- [G8] "Requirements for distributing apps in specific countries/regions" (Brasil: ECA Digital, Age Signals, 18+, ClassInd) — https://support.google.com/googleplay/android-developer/answer/6223646?hl=en
- [G9] Play Age Signals — https://developer.android.com/google/play/age-signals/use-age-signals-api

**Internas (contexto, não fonte de fato temporal):** `docs/design/00-DECISAO-FEED.md`, `design_handoff_100_dias/TELAS.md` (C1–C6, D1),
`design_handoff_100_dias/REGRAS.md` §3, `design_handoff_100_dias/LACUNAS.md` (B3–B14, B21, C6–C16), `docs/technical/MOBILE_STORE_REQUIREMENTS.md`,
`docs/research/STORES_LEGAL_RESEARCH.md`, `docs/technical/ADR-002-backend.md`.
