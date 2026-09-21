# Para o Product Brain: ratificar o feed e a comunidade

- **Data:** 2026-09-21. **De:** Davi (fundador), com material preparado por Claude (engenharia). Não é parecer jurídico.
- **Pedido:** o `CLAUDE.md` põe feed, comunidade, comentários e reações como hipóteses **não aprovadas** sem você.
  O fundador decidiu por elas em 20/09. Preciso que você ratifique, ajuste ou recuse, respondendo às perguntas do fim.
- **Base completa, se quiser conferir:** `docs/product/comunidade/00-DECISOES.md` (memorando com as fontes),
  `docs/product/PLANO_DE_LANCAMENTO.md`, `docs/design/00-DECISAO-FEED.md`, `design_handoff_100_dias/TELAS.md` e `LACUNAS.md`.

---

## 1. Contexto em 5 linhas

1. App "100 dias sem desistir" (iPhone e Android), da campanha da Lagoinha, de 23/09 a 31/12/2026, para cerca de 3.000 pessoas.
2. Hoje ele funciona inteiro no celular, sem conta e sem internet. **Não existe servidor** (o computador na internet que guardaria as publicações).
3. O app **não estará nas lojas em 23/09**. Faltam a entidade jurídica dona do app, o D-U-N-S (cadastro exigido pela Apple e pelo Google), as contas nas lojas e a autorização escrita da igreja. A data honesta da V1 é a **segunda quinzena de outubro** (`PLANO_DE_LANCAMENTO.md` §0).
4. Todos os estudos recomendam lançar a V1 **sem comunidade** e trazer a comunidade como **segunda versão** (`PLANO_DE_LANCAMENTO.md` §4).
5. A comunidade exige servidor, cerca de 17 pessoas da igreja moderando, advogado, e muda a classificação etária do app na App Store Brasil (`00-DECISOES.md`, "Em uma frase").

## 2. A decisão de 20/09 e o que o desenho fez com ela

- **O que o fundador decidiu** (`00-DECISAO-FEED.md`): o app ganha um feed da comunidade, em que a pessoa publica foto e texto sobre o que Deus falou com ela, e esse feed passa a ser **a primeira tela**, "como no Instagram".
- **O que o designer entregou** (`TELAS.md`): três abas, **Jornada (casa) · Comunidade · Você**. O feed virou a **segunda aba**. O convite para publicar aparece na tela **B4 "Depois de concluir"**, só depois de a pessoa terminar a leitura do dia, com duas portas do mesmo tamanho: "Escrever para a igreja" e "Guardar só para mim". Como diz o próprio `TELAS.md`: o convite para publicar "não existe antes de concluir".
- **Por que isso é melhor** (`00-DECISOES.md` §2; `01-lojas.md`): o app deixa de abrir num lugar em que a maioria não pode participar sem conta, que a Apple trata como "muro de login" e rejeita (regra 5.1.1(v)). Também não abre com erro para quem está sem internet, e pesa menos para o app ser lido juridicamente como "rede social" (ECA Digital, a lei de proteção de crianças no digital, Lei 15.211, art. 2º, III).
- **O que falta:** ninguém confirmou por escrito que o desenho substitui a decisão de 20/09 (`LACUNAS.md` P12). **Recomendação: ratificar o feed na forma do desenho, e não na forma de 20/09.**

## 3. O que a ratificação precisa decidir

### 3.1 Alcance: quem vê os posts
- **PROBLEMA:** o desenho promete dois públicos diferentes. C3 (a tela de escrever) diz "toda a igreja". C4 (a tela de consentimento) e B4 dizem "qualquer pessoa com o app".
- **EVIDÊNCIA:** o consentimento para dado de fé precisa ser "específico e destacado" e é **nulo** se o texto enganar (LGPD, a lei de proteção de dados, art. 11, I e art. 9º §1º). Qualquer pessoa pode baixar o app, então "toda a igreja" só é verdade se houver uma porta de entrada (`00-DECISOES.md` §1).
- **IMPACTO:** a escolha define o texto do consentimento, o risco legal, o trabalho de moderação e a classificação etária.
- **ALTERNATIVAS:** (a) a igreja inteira, com código de entrada entregue por líder ou ministério; (b) só o meu grupo, mas os grupos ainda não existem de verdade no app; (c) qualquer pessoa, e aí a fé de quem publica fica pública e pode ser copiada em massa.
- **RECOMENDAÇÃO:** **(a)**, com código que tem validade, limite de usos e pode ser cancelado, e a mesma frase em C3, C4 e B4.

### 3.2 Conta e idade
- **PROBLEMA:** a campanha é "de criança a idoso", e a comunidade é o primeiro lugar do app em que se fala com desconhecidos. O desenho não diz se **ler** o feed exige conta.
- **EVIDÊNCIA:** o ECA Digital (art. 24) manda vincular à conta de um responsável as contas de menores de 16 anos. Se um adolescente de 16 ou 17 anos pode consentir sozinho está em aberto e depende de advogado (`00-DECISOES.md` §3; `02-lei.md` §3–4). A regra do projeto já é conta só para maiores de 18 (invariante S-11).
- **IMPACTO:** um feed legível sem conta põe criança lendo adultos desconhecidos e permite cópia em massa.
- **ALTERNATIVAS:** 18+ para ler, publicar, comentar e dar Amém; 16+ com parecer jurídico; menores de 16 com responsável, o que é um produto inteiro fora da V1.
- **RECOMENDAÇÃO:** **ler e participar exige conta de adulto (18+) e código.** Criança e adolescente usam o resto do app e veem uma frase que não humilha ninguém.

### 3.3 Moderação
- **PROBLEMA:** C5 promete "Alguém da igreja vai olhar em até 24 h", mas não há ninguém nomeado, nem fila, nem ferramenta.
- **EVIDÊNCIA:** a Apple exige um filtro **antes** de o post aparecer, bloqueio de usuário e contato publicado (regra 1.2). O Google exige que a pessoa aceite as regras antes de publicar. O ECA Digital exige retirada imediata quando envolve criança, e aviso com motivo e direito de recurso a quem teve o post removido (`01-lojas.md`; `04-moderacao.md`). Nenhum filtro automático pega o risco mais provável: foto do culto com o rosto de outra pessoa ou de uma criança.
- **IMPACTO:** sem moderação real, a Apple rejeita o app ou o retira depois, e a igreja responde pelo que ficar no ar.
- **ALTERNATIVAS:** híbrido; tudo aprovado por uma pessoa; tudo por filtro automático, sem ninguém aprovando antes.
- **RECOMENDAÇÃO:** **híbrido.** Texto passa por filtro automático e aparece na hora. **Foto só aparece depois que uma pessoa aprova.** A igreja fornece 14 moderadores, 2 pessoas de apoio pastoral e 1 responsável legal, com a escala do Natal fechada até 30/11. Depois de 31/12, o feed fica só para leitura e é apagado numa data anunciada desde o começo (`00-DECISOES.md` §4).

### 3.4 Tela D4: o grupo vê quem leu hoje
- **PROBLEMA:** D4 mostra "4 de 7 já leram" e, ao lado de cada nome, quem leu e quem não leu.
- **EVIDÊNCIA:** o próprio consentimento (C4) promete que leitura, jejum e reflexão privada "continuam só suas", e a regra de não gerar culpa (REGRAS 9) também bate de frente com isso. Progresso de leitura ligado a um nome revela prática religiosa (`00-DECISOES.md` §5).
- **IMPACTO:** como está desenhada, D4 torna falso o consentimento da comunidade inteira.
- **ALTERNATIVAS:** tirar D4 da V1; um interruptor por pessoa, desligado por padrão, com consentimento próprio; manter como está, o que não é possível.
- **RECOMENDAÇÃO:** **D4 fora da V1**, junto com o Amém com nome dentro do grupo.

### 3.5 Data de entrada da comunidade
- **PROBLEMA:** a campanha começa em 23/09, e a comunidade depende de coisas que não são programação.
- **EVIDÊNCIA:** são 17 a 27 dias de trabalho de servidor, mais 4 a 6 da página de moderação, mais advogado, pessoas treinadas e a revisão das lojas (`00-DECISOES.md` §7). Cenários: otimista ~13–15/11, realista ~25/11 a 02/12, pessimista dezembro (`PLANO_DE_LANCAMENTO.md` §4.2).
- **IMPACTO:** lançar tudo junto empurra o app inteiro para o fim de novembro e põe a classificação A16 desde o primeiro dia.
- **ALTERNATIVAS:** V1 agora e comunidade como segunda versão; tudo junto; comunidade só depois da campanha.
- **RECOMENDAÇÃO:** **V1 sem comunidade, e comunidade como segunda versão com data-limite em 15/11.** Se os portões não fecharem até lá, ela fica para depois da campanha, para não estrear no Natal, o mês mais difícil de moderar.

### 3.6 Classificação A16 na App Store Brasil
- **PROBLEMA:** desde setembro de 2026, a Apple pergunta se o app tem "social media", isto é, um feed que espalha posts para muitos usuários, com curtidas ou comentários.
- **EVIDÊNCIA:** se a resposta for sim, a classificação fica em 13+ no mundo e **A16 no Brasil**, e marcar "desligado para menores de 13" não baixa a faixa. Se um feed só de grupo escapa disso não está confirmado (`01-lojas.md` §1.5).
- **IMPACTO:** a faixa vale para o **app inteiro**. Famílias que usam o controle parental do iPhone podem não conseguir instalar nem a leitura. Como isso funciona na prática também não está confirmado.
- **ALTERNATIVAS:** (i) aceitar A16 conscientemente; (ii) trocar para feed de grupo, confirmando antes no App Store Connect; (iii) adiar a comunidade. Responder "não tem social media" com o feed da igreja inteira é declaração falsa à Apple e não é opção.
- **RECOMENDAÇÃO:** **(i), se a igreja aceitar esse custo.** Se não aceitar, a (iii) é mais honesta do que uma (ii) feita às pressas.

## 4. Onde o CLAUDE.md envelheceu

O arquivo `docs/technical/SUGESTOES_CLAUDE_MD.md` não existe. Os pontos abaixo vêm da comparação entre o `CLAUDE.md` e o repositório. É inferência minha, e nada foi alterado.

1. **Lista de "hipóteses não aprovadas"**: ela ainda inclui feed, comunidade, comentários e reações, e ainda não registra a decisão de 20/09. Também inclui grupos, reflexões e ministérios, que **já existem no app** porque vieram do handoff e do MASTER SPEC (`docs/design/04-invariantes.md`, incerteza I-3). Precisa separar o que foi aprovado, o que está em ratificação e o que continua proibido. Ranking, streak e badges continuam fora.
2. **"Nenhum projeto deve ser inicializado"**: o `mobile/` existe e é a V1 em construção, então essa frase contradiz o "Estado atual" do próprio arquivo.
3. **"Um commit (Execution 01)"**: hoje são 8 commits.
4. **Lojas e lei**: faltam a pergunta de "social media" da Apple e a faixa A16, o ECA Digital (Lei 15.211) e o Decreto 12.880. Segundo `02-lei.md` §4, a lei só sustenta com segurança a proibição de feed sem fim e de tocar conteúdo sem pedido. Streak e badges ficam fora por decisão de produto, não por lei.
5. **Data**: "o app entra em andamento" precisa dizer que a V1 chega às lojas na segunda quinzena de outubro, e não em 23/09.
6. **Mapa de documentos**: faltam `docs/product/comunidade/`, `docs/legal/`, `docs/design/` e `design_handoff_100_dias/`.

## 5. Perguntas que o Product Brain deve responder

1. Você ratifica o feed da comunidade **na forma do desenho**, com a Jornada como casa, a Comunidade como segunda aba e o convite só em B4, depois de concluir, em vez de "feed como primeira tela"? Sim, não, ou com quais mudanças?
2. Alcance: a igreja inteira com código de entrada, só o grupo, ou qualquer pessoa com o app?
3. Ler o feed exige conta de adulto e código? E a idade mínima para ler, publicar, comentar e dar Amém é 18, ou 16 com parecer jurídico?
4. Você aprova comentários e a reação "Amém" como parte da comunidade, com o Amém **sem contador** (marca e desmarca; ninguém vê quantos foram, nem quem publicou — `REGRAS.md` 19)?
5. Moderação: você aprova o modelo híbrido, com foto aprovada por uma pessoa antes de aparecer? Qual prazo C5 deve prometer, 24 h ou 48 h?
6. Depois de 31/12: o feed fica só para leitura e é apagado numa data anunciada, continua com escala permanente, ou é arquivado em 01/01?
7. A tela D4 sai da V1, junto com o Amém com nome no grupo?
8. Você aprova lançar a V1 sem comunidade, com a comunidade como segunda versão e data-limite em 15/11, e depois disso só após a campanha?
9. Você aceita a classificação A16 na App Store Brasil para o app inteiro? Se não, prefere feed de grupo (confirmado antes com a Apple) ou adiar a comunidade?
10. Grupos, reflexões e ministérios, que já existem no app, estão aprovados? O Davi deve atualizar o `CLAUDE.md` com os seis pontos da seção 4?
