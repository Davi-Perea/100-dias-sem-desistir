# Comunidade — 04 · Operação de moderação

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer), a pedido do fundador
- **Status:** INSUMO PARA DECISÃO. Nada aqui foi implementado nem aprovado. A decisão do feed
  (`docs/design/00-DECISAO-FEED.md`, 2026-09-20) continua **pendente de ratificação do Product Brain**.
- **Escopo:** como a igreja cumpre, na prática, a promessa "alguém da igreja vai olhar em até 24 h" (C5,
  REGRAS §3 regra 16): que modelo de moderação usar, que filtro automático, que ferramenta dar a quem
  modera, quantas pessoas pôr na escala até 31/12 (e depois) e o que fazer quando quem reclama nem tem o app.
- **Fora de escopo:** schema, RLS e telas (ver `design_handoff_100_dias/LACUNAS.md` B3–B12, C5–C11, C33–C35).
- **Legenda:** **FATO** (fonte numerada + data de acesso, lista no fim) · **INFERÊNCIA** (conclusão minha a
  partir de fatos) · **HIPÓTESE** (número ou comportamento que ninguém mediu) · **RECOMENDAÇÃO**.
  Todas as fontes foram acessadas em **2026-09-21**.

---

## 0. O que mais pesa, em dez linhas

1. **A Apple não exige pré-moderação humana, mas exige filtro antes de aparecer.** O texto da 1.2 fala em
   "a method for filtering objectionable material from being posted" [1]. Pós-moderação pura (só denúncia)
   não atende à letra. Filtro automático + pós-moderação atende; é o que o mercado usa (INFERÊNCIA, [1][3]).
2. **Nenhum filtro automático resolve o risco que mais importa aqui:** foto do culto com rosto de terceiro,
   criança, pessoa que não autorizou. Isso é dado sensível (convicção religiosa) de quem não é usuário. Filtro
   de nudez e palavrão não vê isso (INFERÊNCIA).
3. **Recomendação:** texto e comentário saem depois do filtro automático, com pós-moderação; **foto só aparece
   depois que uma pessoa da igreja aprova**. No volume provável, isso cabe em poucos minutos por janela (§3.4).
4. **A ferramenta de quem modera não pode ser o Supabase Studio para voluntários.** No plano Pro o Studio só
   tem papéis com acesso ao conteúdo de todas as tabelas; papel somente leitura e papel por projeto só existem
   no plano Team, a US$ 599/mês [15]. Recomendo uma página web interna mínima sobre RPCs auditadas (§5).
5. **Escala:** 10 a 14 moderadores treinados, mais 2 pessoas de escalonamento e 1 responsável legal, em três a
   cinco janelas por dia, inclusive 24, 25 e 31/12 e 01/01 (§6). **A obrigação não acaba em 31/12:** ela dura
   enquanto houver post visível (§6.5).
6. **Quem não tem o app** precisa de um canal na web ou por e-mail. Na dúvida, a foto sai do ar antes de a
   verificação terminar. O caminho barato de errar é tirar do ar, não deixar (§7).
7. **Achado que vai além da moderação:** com o feed, a classificação do app na App Store do Brasil vira
   **A16** [17]. Um app "de criança a idoso" passa a ser classificado para 16 anos. Isso volta para o fundador (§2.3).

---

## 1. De onde vem a promessa das 24 h

| Onde | O que diz | Tipo |
|---|---|---|
| C5 (TELAS.md) | "Denunciar esta publicação / Alguém da igreja vai olhar em até 24 h" | promessa de produto |
| REGRAS §3 regra 16 | "isso precisa existir de verdade, com fila e responsável" | invariante do pacote |
| 00-DECISAO-FEED item 2 | "Moderação humana com prazo (24–48h)" | decisão arrastada |
| Apple 1.2 | "timely responses to concerns" [1] | FATO: exige resposta **tempestiva**, sem número de horas |
| Google Play UGC | "robust, effective, and ongoing UGC moderation" [2] | FATO: sem número de horas |
| ECA Digital art. 29 | retirada "assim que forem comunicados" pela vítima ou pelo representante [5] | FATO: sem número, e "assim que" é mais duro que 24 h |

**INFERÊNCIA:** as 24 h não saem de lei nem de loja; são uma escolha do desenho. Mas, uma vez escrita na tela,
passam a ser a régua pela qual a igreja será cobrada, pela Apple num teste de revisão, por um membro e por um juiz.
Prometer 24 h e cumprir 72 h é pior do que prometer 48 h e cumprir 12. Para o caso de criança (ECA art. 29), a lei pede mais do que 24 h: retirada imediata.

---

## 2. O que a lei e as lojas exigem da operação (não do código)

### 2.1 Lojas

| Exigência | Fonte | Tipo | Consequência operacional |
|---|---|---|---|
| Filtrar material objetável **antes** de ser publicado | Apple 1.2 [1] | FATO | Existe um passo entre "enviei" e "apareceu", automático ou humano |
| Mecanismo de denúncia **com resposta tempestiva** | Apple 1.2 [1] | FATO | Fila com dono e prazo; a denúncia precisa receber resposta |
| Bloquear usuário abusivo | Apple 1.2 [1] | FATO | Ação do usuário (C5) e ação do moderador (suspender conta) |
| Contato publicado | Apple 1.2 [1] | FATO | Um e-mail ou página real, que alguém leia |
| "É sua responsabilidade remover conteúdo que viole…"; a Apple pode pedir um **plano de melhoria** e remover o app | Apple 1.2 [1] | FATO | A moderação é auditável pela loja depois do lançamento, não só na revisão |
| Aceite de termos antes de criar UGC; termos definem conteúdo proibido | Google Play UGC [2] | FATO | Regras da comunidade escritas pela igreja (LACUNAS C11) |
| Denúncia e bloqueio dentro do app, "and taking action" | Google Play UGC [2] | FATO | Moderador precisa conseguir agir, não só ver |
| Pré-filtragem | Google Play UGC [2] | FATO: a política **não** exige filtrar antes de publicar | A exigência mais dura é a da Apple |

### 2.2 Brasil

| Exigência | Fonte | Tipo | Consequência operacional |
|---|---|---|---|
| Mecanismos de notificação sobre violação de direitos de criança e adolescente | ECA Digital art. 28 [5] | FATO | Canal de denúncia com motivo específico |
| Retirada **assim que comunicada** pela vítima, pelo representante, pelo MP ou por entidade, independentemente de ordem judicial | ECA Digital art. 29 [5] | FATO | Denúncia envolvendo criança vai para o topo da fila, sem esperar a janela seguinte |
| Notificação precisa identificar o conteúdo e o notificante; **denúncia anônima é vedada** | ECA Digital art. 29 §2º [7] | FATO (fonte secundária; o Planalto recusou conexão, ver nota) | O canal pede nome e contato de quem denuncia para acionar a retirada obrigatória |
| Mecanismo de notificação exposto publicamente | ECA Digital art. 29 §3º [7] | FATO (fonte secundária) | Link para o canal fora do app (site) |
| Ao retirar: avisar o autor, dar motivo, dizer se foi análise **humana ou automatizada**, permitir recurso com fácil acesso e prazos definidos | ECA Digital art. 30 [5] | FATO | A ferramenta registra quem decidiu e como; o autor recebe o aviso; existe fila de recurso |
| Relatório semestral | ECA Digital art. 31 [6] | FATO: só para mais de 1.000.000 de usuários crianças e adolescentes | Não se aplica (INFERÊNCIA: ~3.000 pessoas) |
| Retirada imediata, com tratamento prioritário, de conteúdo que viole direitos de criança | Decreto 12.880/2026 art. 43 [8] | FATO (resumo da página da Câmara) | Mesmo efeito do art. 29 |
| Comunicar ao Centro Nacional de Triagem de Notificações (Polícia Federal) casos de exploração, abuso, sequestro e aliciamento | Decreto 12.880/2026 arts. 36–39 [8] | FATO | Protocolo de abuso sexual infantil (§6.4) com responsável nomeado |
| Provedor responde civilmente pelo conteúdo de terceiro a partir da **notificação extrajudicial**, sem precisar de ordem judicial (exceto crimes contra a honra) | STF Tema 987 (tese de 26/06/2025) [9] | FATO | Denúncia recebida e ignorada vira responsabilidade da entidade dona do app |
| Julgamento concluído em 17/06/2026; defesa passa a ser "analisei com critério e documentei"; sem isenção automática por porte | Tema 987 [10] | FATO segundo escritório de advocacia; **não confirmei no portal do STF** | Toda decisão de moderação precisa de registro com motivo, inclusive a de **manter** o post |
| Resposta completa ao titular em até 15 dias | LGPD art. 19 [18] | FATO | Prazo externo máximo para pedido de "tirem meus dados/minha imagem" (§7) |
| Imagem de pessoa pode ter a publicação proibida a pedido dela | Código Civil art. 20 [19] | FATO | Base do pedido de quem aparece na foto |

**Nota sobre a fonte:** `planalto.gov.br` recusou a conexão três vezes (ECONNRESET) em 2026-09-21. Os arts. 24 e
28–31 da Lei 15.211 foram lidos na publicação original da Câmara [5][6]. Os §§ do art. 29 vêm de site secundário [7].
O Decreto veio da página da Câmara [8], resumido pela ferramenta, não literal. **Um advogado precisa ler os textos
oficiais antes de a política de moderação ser publicada.**

### 2.3 Achado colateral: a classificação etária muda

- **FATO [16][17]:** desde 09/07/2026 o questionário etário da App Store tem perguntas de "social media", obrigatórias
  em envios a partir de setembro de 2026. "Social Media" é definido como redistribuição ou interação com conteúdo de
  usuário "through a social feed", e cita curtidas e comentários como exemplos. Resultado global: **13+**. Resultado no
  **Brasil: A16**, inclusive na variante "social media desativada para menores de 13".
- **FATO [17]:** a variante "desativada para menores de 13" exige, no mínimo, chamar a Declared Age Range API antes de
  liberar o recurso, e "only age-appropriate UGC is delivered".
- **INFERÊNCIA:** o feed muda a classificação do app inteiro, não só a da aba Comunidade. Pais com controle parental
  podem deixar de conseguir instalar o app para filhos de 12 a 15 anos, justamente o público que a regra de idade
  queria manter lendo sem publicar. E a frase "only age-appropriate UGC" transforma a moderação num requisito de
  classificação: tudo o que fica visível precisa ser adequado a quem está lendo.
- **Não é tema desta frente decidir.** Registro aqui porque muda o custo do feed. Provavelmente outra frente
  (`01-lojas.md`) trata disso. A decisão volta ao fundador e ao Product Brain.

---

## 3. Pré-moderação, pós-moderação ou filtro automático + pós

### 3.1 As três opções

| | Pré-moderação humana | Pós-moderação pura | Filtro automático + pós-moderação |
|---|---|---|---|
| Como funciona | Nada aparece antes de uma pessoa aprovar | Aparece na hora; só sai se alguém denunciar | Um filtro no servidor segura ou recusa o que casar com regras; o resto aparece na hora; denúncia vai para humano |
| Apple 1.2, "filtering… from being posted" | Atende com folga (FATO: é literalmente filtrar antes [1]) | **Não atende à letra** (INFERÊNCIA: denúncia é o 2º item da 1.2, não o 1º) | Atende. É o padrão citado em guias de rejeição [3][4] (INFERÊNCIA: a Apple não publica o que aceita; guias de terceiros e relatos não são garantia) |
| Experiência de quem publica | Espera; precisa de estado "em análise" e "recusado" (LACUNAS C6) | Instantânea | Quase instantânea; ainda precisa do estado "recusado pelo filtro" |
| Carga humana | Todo item passa por alguém | Só denúncias | Denúncias + o que o filtro segurou |
| Cobre foto de terceiro, criança no culto | Sim, se o moderador for treinado | Só depois do dano, e só se alguém denunciar | Não (INFERÊNCIA: nenhum filtro de mercado julga consentimento; §4.2) |
| Cobre crise (ideação suicida, relato de abuso) | Sim, e pode acionar cuidado pastoral antes de expor a pessoa | Tarde | Parcialmente (filtros detectam autolesão em texto [12], mas a resposta certa é cuidar, não só bloquear) |
| Risco de atraso à noite e no feriado | Alto: post das 23h só aparece de manhã | Nenhum | Baixo |

### 3.2 O que o filtro automático não pega, e por que isso decide o modelo

**INFERÊNCIA**, a partir do que os filtros declaram detectar [12][13][14][20]:

- **Foto com rosto de terceiro ou criança.** Nenhum filtro de moderação comercial citado aqui classifica
  "pessoa que não autorizou". O Rekognition até detecta rostos, mas não sabe quem consentiu. E usar detecção
  facial em foto de culto para esse fim abre outra discussão de dado biométrico, que não recomendo abrir.
- **Dado pessoal no texto:** "orem pela Maria da Silva, que está com câncer no hospital X" é inofensivo para
  qualquer filtro e é dado de saúde de terceira pessoa, publicado para toda a igreja.
- **Conteúdo pastoral sensível:** confissão, conflito conjugal, relato de abuso. O filtro não vê problema, e o
  post expõe a pessoa.
- **Doutrina e polêmica interna:** o filtro não sabe o que a igreja considera fora das regras.

**Consequência:** o risco jurídico e pastoral mais provável deste feed é o da **foto**, não o do palavrão. É
por isso que a recomendação abaixo separa foto de texto.

### 3.3 RECOMENDAÇÃO: híbrido por tipo de conteúdo

| Conteúdo | Regra | Por quê |
|---|---|---|
| **Texto do post** | Filtro automático de termos no servidor. Passou → aparece. Casou → fica "em análise" para humano (não recusa sozinho). Pós-moderação por denúncia | Atende à Apple 1.2, mantém o fluxo quase instantâneo e evita falso positivo virar recusa automática sem humano (ECA art. 30 II exige dizer se a análise foi humana ou automatizada) |
| **Foto** | **Pré-moderação humana.** O post com foto fica "em análise" até alguém aprovar. Filtro automático de imagem só **ordena a fila** (suspeito primeiro), se for adotado (§4.3) | Terceiro, criança e contexto não são detectáveis por máquina; o dano (dado sensível de não usuário) é caro e irreversível depois de visto |
| **Comentário** | Mesmo filtro de termos + pós-moderação | Volume maior, risco menor (sem imagem), e pré-moderar comentário mata a conversa |
| **Nome e foto de perfil** | Filtro de termos no nome; foto de perfil em pré-moderação **ou** fora da V1 | Foto de perfil é a mesma superfície de risco da foto de post |
| **Denúncia envolvendo criança ou "apareço nesta foto"** | O item sai do ar **na hora da denúncia** (ocultação cautelar automática), antes da análise humana | ECA art. 29 ("assim que comunicados"); o custo de ocultar indevidamente por algumas horas é baixo |

**Alternativa, se o fundador quiser o post com foto instantâneo:** filtro de imagem automático + pós-moderação
em tudo. É defensável perante a Apple (INFERÊNCIA), mas aceita conscientemente que foto de criança ou de
terceiro fique no ar até alguém denunciar. **Não recomendo.** Se for escolhida, precisa ficar registrada como
risco aceito, com nome de quem aceitou.

**Alternativa mais conservadora:** pré-moderação humana de tudo, inclusive texto. Cabe no volume provável
(§3.4), mas o post das 23h só aparece de manhã, e o C2/C3 foi desenhado como publicação imediata.

### 3.4 Volume provável: tudo aqui é HIPÓTESE

Ninguém mediu adesão. Os números abaixo servem para dimensionar a escala, não para prometer nada.

| Variável | Pessimista (pouco uso) | Central | Otimista (muito uso) |
|---|---|---|---|
| Pessoas no ambiente | 3.000 | 3.000 | 3.000 |
| Criam conta para publicar/reagir | 10% = 300 | 25% = 750 | 50% = 1.500 |
| Publicam num dia qualquer (dos com conta) | 3% = 9 | 5% = 38 | 8% = 120 |
| Posts com foto | 50% = 5 | 50% = 19 | 60% = 72 |
| Comentários por dia | 10 | 60 | 300 |
| Denúncias por dia (1–2% dos itens) | < 1 | 1–2 | 4–8 |
| Pico (dia 1, domingos, dia 100) | 3× | 3× | 3× |

**Tempo humano estimado (HIPÓTESE: ~30 s por foto, ~3 min por denúncia com registro de motivo):**

- Cenário central: 19 fotos ≈ 10 min + 2 denúncias ≈ 6 min → **~16 min/dia**, espalhados pelas janelas.
- Cenário otimista em pico: 216 fotos ≈ 1 h 50 min + 24 denúncias ≈ 1 h 10 min → **~3 h/dia**. Ainda cabe
  numa equipe de voluntários, mas não em uma pessoa só.

**INFERÊNCIA:** no porte desta igreja, pré-moderar foto não é inviável. O que torna o feed caro é a
**disponibilidade** (alguém de plantão todo dia, inclusive no Natal), não as horas de trabalho.

---

## 4. Filtros automáticos disponíveis

### 4.1 Texto em pt-BR

| Opção | O que é | Licença / custo | Onde roda | Observação |
|---|---|---|---|---|
| **ToxiBR** [21] | Biblioteca pt-BR, "880+" termos e frases (xingamento, sexual, violência, racismo, nazismo, bullying, assédio), com normalização anti-burla (leetspeak, acentos, homóglifos, repetição) e janela de contexto de 5 palavras | MIT, grátis | Node/Deno (FATO segundo o README) → roda numa Edge Function do Supabase (INFERÊNCIA: Edge Functions são Deno) | Projeto pequeno (54 estrelas, 22 issues abertas na data de acesso). Fixar versão e revisar a lista antes de usar. **Melhor ponto de partida.** |
| **LDNOOBW `pt`** [11] | Lista de 97 entradas, português brasileiro, maioria de termos sexuais e ofensas | CC BY 4.0 (exige atribuição na tela de créditos) | Qualquer lugar | Pequena demais para ser o filtro principal; serve de complemento |
| **palavrao (kyriosdata)** [22] | Lista de termos "evitáveis", de origem DATASUS | Apache-2.0 | npm | Pensada para nome de usuário e cadastro; útil para filtrar **nome de perfil** |
| **OpenAI `omni-moderation-latest`** [12] | Classificador de texto e imagem (assédio, ódio, ilícito, autolesão, sexual, sexual/menores, violência) | **Grátis** [12] | API nos EUA | A página não declara suporte a português (FATO: "not specified"); o endpoint `/v1/moderations` não guarda log e é elegível a retenção zero [13]. Detecta **autolesão** em texto, útil para o protocolo de crise (§6.4) |
| **Perspective API (Google Jigsaw)** [23] | Toxicidade, com português | Grátis | EUA | **Descartar:** "service is officially ending after 2026", ativo só até 31/12/2026 [23], ou seja, morre no último dia da campanha |
| **Lista própria da igreja** | Termos que a igreja não quer (nomes de pessoas em disciplina, polêmicas internas) | — | — | Só a igreja pode escrever; precisa de dono |

**RECOMENDAÇÃO (texto):** ToxiBR + lista própria da igreja, rodando numa Edge Function no Supabase (`sa-east-1`),
sem mandar texto sobre fé para fora do Brasil. Quem casar com o filtro fica "em análise" para humano, não é
recusado automaticamente. Avaliar o OpenAI Moderation só para a categoria autolesão, e só depois de decidir a
transferência internacional (§4.4).

### 4.2 Imagem

| Opção | Preço (FATO na data de acesso) | Região | Privacidade | Observação |
|---|---|---|---|---|
| **Amazon Rekognition `DetectModerationLabels`** | US$ 0,001 por imagem no 1º milhão/mês; 1.000 grátis/mês no free tier de 12 meses [24] | **`sa-east-1` (São Paulo) disponível**, com cota de 5 TPS para essa operação [25] | "may store and use image … inputs … unless you opt out" para melhorar a IA da Amazon [26]: **exige política de opt-out via AWS Organizations** | Única opção que mantém a foto no Brasil. Um post de fórum de 2020 dizia que não havia Rekognition em São Paulo; a tabela oficial atual mostra que há [25] |
| **Google Cloud Vision SafeSearch** | 1.000 unidades grátis/mês; depois US$ 1,50 por 1.000 (grátis se combinado com Label Detection) [27] | Global, `eu` ou `us`; sem endpoint na América do Sul (FATO segundo resumo de busca da documentação; **não abri a página de regiões**) | Imagem "processed in memory and not persisted to disk"; não usada para treino [28] | Boa política de dados, mas a foto sai do Brasil |
| **OpenAI `omni-moderation-latest`** | Grátis [12] | EUA | `/v1/moderations`: sem log de abuso nem estado; elegível a retenção zero [13]; API não treina com dados por padrão [13] | Para imagem, as categorias assédio, ódio e ilícito não funcionam (só texto) [12]. A própria OpenAI diz que **não é ferramenta para detectar abuso sexual infantil** [12] |
| **Azure AI Content Safety** | F0: 5.000 imagens/mês grátis, com corte duro no limite; preço do S0 não exibido na página [29] | Não verifiquei a região Brasil | Não verifiquei | Sem vantagem clara sobre as outras |
| **NSFWJS (no aparelho)** [20] | MIT, grátis | Roda no aparelho (React Native) | A foto não sai do telefone para classificar | 5 classes (neutro, desenho, sexy, pornô, hentai), ~90–93% de acerto declarado [20]. **Filtro no cliente é contornável**, então não conta como filtro da Apple; serve só como aviso gentil antes de enviar |

**Custo real (INFERÊNCIA):** no cenário otimista (§3.4), 72 fotos/dia × 100 dias ≈ 7.200 fotos. No Rekognition,
isso dá **~US$ 7 na campanha inteira**; no Google Vision, cabe quase todo nas 1.000 grátis/mês. **Dinheiro não
é o critério. O critério é para onde vai a foto de um membro da igreja.**

### 4.3 Mandar foto de membro para terceiro: o que isso implica

- **FATO:** convicção religiosa é dado pessoal sensível (LGPD art. 5º, II, citado em `docs/technical/SECURITY_V0.md`).
  Uma foto publicada num feed de igreja, com legenda sobre "o que Deus falou comigo", revela convicção religiosa
  de quem publicou e de quem aparece.
- **INFERÊNCIA:** mandar a foto para um classificador torna esse fornecedor **operador** (LGPD) de dado sensível.
  Ele entra na lista de suboperadores da política de privacidade e precisa aparecer no consentimento de C4
  ("sua foto é analisada automaticamente por [fornecedor] antes de aparecer").
- **FATO [30]:** se a foto sai do Brasil (Google Vision, OpenAI), é transferência internacional; o mecanismo usual
  são as cláusulas-padrão da ANPD (Resolução CD/ANPD 19/2024), com prazo de adequação encerrado em 23/08/2025.
  **Não verifiquei** se OpenAI ou Google oferecem as cláusulas da ANPD nos contratos deles.
- **FATO [26]:** no Rekognition, sem a política de opt-out, a Amazon pode usar a foto para melhorar os modelos dela.
  Com o opt-out, esse uso deixa de acontecer, mas a configuração é na conta AWS da entidade. É mais uma conta,
  mais um contrato, mais um suboperador.

**RECOMENDAÇÃO (imagem):** como a foto já vai passar por pré-moderação humana (§3.3), **não adotar classificador
de imagem de terceiro na V1**. O humano é o filtro. Se o volume real passar de ~100 fotos/dia, reabrir a
questão com o **Rekognition em `sa-east-1` com opt-out**, a única opção que mantém a foto no Brasil. NSFWJS no
aparelho é opcional, como aviso ao usuário, nunca como filtro de conformidade.

### 4.4 O que filtro nenhum faz

Abuso sexual infantil. A OpenAI diz expressamente que o endpoint dela não serve para isso [12]. O que protege
aqui é a pré-moderação humana da foto + protocolo (§6.4) + comunicação às autoridades (Decreto arts. 36–39 [8];
SaferNet como canal [31]). Ferramentas de hash (PhotoDNA e similares) existem, mas não pesquisei acesso e
custo para uma entidade deste porte. **Não confirmei.**

---

## 5. Ferramenta de quem modera

### 5.1 O que a ferramenta precisa fazer, qualquer que seja a opção

Mínimo para cumprir a Apple 1.2, o ECA art. 30 e o Tema 987 (INFERÊNCIA a partir de §2):

1. **Fila** com três abas: fotos aguardando aprovação · itens segurados pelo filtro · denúncias abertas. Ordem:
   criança/terceiro primeiro, depois idade do item.
2. **Ações:** aprovar · recusar com motivo (lista fechada + texto) · ocultar · restaurar · suspender conta ·
   encerrar denúncia com resposta.
3. **Registro de cada decisão** em `moderation_actions`: quem, quando, qual ação, motivo, se foi humana ou
   automatizada. Inclui a decisão de **manter** (Tema 987: "analisei e documentei" [10]).
4. **Aviso ao autor** com motivo e link para contestar (ECA art. 30).
5. **Fila de recursos**, decidida por pessoa diferente de quem removeu (RECOMENDAÇÃO).
6. **Busca por autor e data**, porque quem denuncia de fora do app não tem link do post (§7).
7. **Nada além do necessário:** o moderador vê o post, o nome público do autor e o histórico de moderação dele.
   **Não vê** e-mail, reflexão privada, jejum nem progresso. Isso é invariante do pacote (REGRAS regra 14).
8. **Aviso de fila parada:** se um item passa de X horas sem decisão, avisa o escalonamento (e-mail).

### 5.2 As três opções

| | A. Supabase Studio + RPCs auditadas | B. Página web interna mínima | C. Folha "Ferramentas de líder" no app |
|---|---|---|---|
| O que é | O moderador entra no painel do Supabase e chama funções `moderation_*` pelo editor SQL ou pela tabela | Página web simples (fila + botões), login com o mesmo e-mail OTP do app, que só chama RPCs `moderation_*` `SECURITY DEFINER` com checagem de papel | Ativar a linha "Moderar insights", hoje desativada em `grupo/[id].tsx`, e transformar em tela de fila dentro do app |
| Quem pode usar | Só técnicos | Qualquer voluntário com celular ou computador | Qualquer voluntário com o app |
| Controle de acesso | **FATO [15]:** no plano Pro só existem Owner, Admin e Developer; Developer tem "content access to project resources". Somente leitura e papel por projeto **só no Team (US$ 599/mês)** [15]. **INFERÊNCIA:** dar Studio a voluntário = dar acesso a todas as tabelas, inclusive dado sensível de 3.000 pessoas | O papel de moderador é uma linha numa tabela (como `app_admins` já é), e as RPCs checam o papel. O voluntário não tem acesso a nada além da fila | Igual à B no servidor |
| Auditoria | Log de API guardado por **7 dias no Pro** [15]; não serve como registro de moderação. Precisa de `moderation_actions` do mesmo jeito | `moderation_actions` + `admin_audit_log`, que já existe na migration de fundação | Igual à B |
| Esforço de engenharia (INFERÊNCIA) | ~1–2 dias (RPCs + roteiro de uso) | ~4–6 dias sobre as RPCs: página, login, fila, ações, aviso de fila parada. Mais hospedagem estática (novo fornecedor, ou nenhum, se servida de um lugar que a entidade já tenha) | ~5–8 dias, mais um **build novo e revisão da loja**: tela nova não pode ir por OTA (invariante S-15). Mais testes de acessibilidade do app inteiro |
| Onde encaixa | Mal: a folha de líder é **do grupo** ("Só você e os outros líderes de [grupo] veem isto") e o feed é da igreja inteira. Moderador de feed não é líder de grupo | — | Descasa do escopo |
| Risco | Voluntário apaga tabela, lê dado sensível, ou erra SQL | Mais um sistema para manter depois da campanha | Moderação dentro do app de membro mistura papéis. Qualquer bug na tela vira bug no app das 3.000 pessoas. Não chega a tempo |
| Serve para | Os 1–2 administradores técnicos, para emergência e recurso de segunda instância | **Os moderadores** | Fase posterior, se houver |

**RECOMENDAÇÃO:** B para os moderadores; A só para 1–2 administradores técnicos (quem já é Owner/Admin do
projeto). C fica fora da V1. As RPCs são as mesmas nas três, então B não impede C depois.

**Nota de regra do projeto:** a página B é **ferramenta interna**, não produto. Não conflita com a regra
"nada de website empacotado como produto" do `CLAUDE.md`, mas precisa ser dito em voz alta porque é código web
novo. Hospedagem, domínio e quem mantém depois de 31/12 são decisões do fundador.

### 5.3 O que já existe e pode ser reaproveitado

- `app_admins` e `admin_audit_log` (migration `20260907120000_foundation.sql`), com o padrão de função
  `SECURITY DEFINER` que grava auditoria (`admin_set_group_role`). O papel de moderador segue o mesmo padrão:
  uma tabela `app_moderators` sem policy de escrita, preenchida por função auditada. (FATO sobre o código; o
  resto é INFERÊNCIA.)
- **Nenhuma migration foi aplicada** e não existe servidor (LACUNAS B3). Tudo desta seção depende disso.

---

## 6. Escala de cobertura até 31/12, e depois

### 6.1 Definições de prazo (RECOMENDAÇÃO)

| Item | Prazo-alvo | Prazo máximo | Observação |
|---|---|---|---|
| Denúncia envolvendo criança ou "apareço nesta foto" | Ocultação **automática na hora** + análise na próxima janela | 12 h para a análise | ECA art. 29 |
| Foto aguardando aprovação (se pré-moderação) | ≤ 4 h entre 7h e 23h | 12 h (post da madrugada) | É isso que o usuário sente |
| Item segurado pelo filtro de texto | ≤ 8 h | 24 h | |
| Denúncia comum | ≤ 12 h | **24 h** (a promessa de C5) | |
| Recurso do autor | ≤ 48 h | 72 h | Pessoa diferente de quem removeu |
| Pedido de quem não tem o app | Ocultação em ≤ 12 h + resposta | 15 dias (LGPD art. 19 [18]) | Na prática, bem menos |

### 6.2 Janelas e quantidade de pessoas

**Opção 1: sem pré-moderação de foto (só denúncia + filtro).** Três janelas por dia: **manhã (7h–9h),
almoço (12h–14h), noite (20h–22h)**. O intervalo máximo entre janelas é 11 h (das 21h às 8h), o que garante
as 24 h com folga.

- 3 janelas × 7 dias = 21 turnos por semana; cada turno com **1 titular + 1 reserva** = 42 posições.
- Com **10 moderadores**, cada um faz ~2 turnos de titular e ~2 de reserva por semana, de 20 a 30 min cada.

**Opção 2: com pré-moderação de foto (recomendada).** Cinco janelas: **7h, 11h, 15h, 19h, 23h** (30 min cada),
para cumprir as ≤ 4 h de espera da foto.

- 5 × 7 = 35 turnos por semana + reserva = 70 posições.
- Com **14 moderadores**, ~2,5 turnos de titular e ~2,5 de reserva por semana.

**Em ambas:**

- **2 pessoas de escalonamento** (pastoral), com poder de decidir caso difícil, recurso e crise, alcançáveis
  por telefone fora das janelas para caso de criança e de crise.
- **1 responsável legal** pela operação (§8), que não precisa moderar.
- **Ninguém modera sozinho a campanha inteira.** Um único moderador "que dá conta" é o ponto de falha mais
  provável (INFERÊNCIA).
- Evitar que alguém modere post de parente próximo ou de desafeto: a ferramenta deixa passar o item para outro.

### 6.3 Calendário que exige atenção (FATO: dias da semana calculados; feriados nacionais)

| Data | Dia | Por quê |
|---|---|---|
| 23/09 (qua) | Dia 1 | Pico de estreia; C2 promete "pode ser a sua a primeira". Escala dobrada na 1ª semana |
| 12/10 (seg) | Feriado nacional | |
| 02/11 (seg) | Finados | Posts sobre luto: mais crise, mais dado de saúde e de terceiros |
| 15/11 (dom) | Feriado nacional | |
| 20/11 (sex) | Consciência Negra, feriado nacional desde a Lei 14.759/2023 [32] | |
| 24/12 (qui) e 25/12 (sex) | Véspera e Natal | Voluntários viajam; é a data mais provável de ninguém olhar |
| 31/12 (qui) | Dia 100, último dia | Pico de chegada (E4) + véspera de Ano-Novo |
| 01/01/2027 (sex) | Ano-Novo | Denúncias do pico do dia 100 caem aqui |

**RECOMENDAÇÃO para Natal e Ano-Novo:**

1. Fechar a escala de **20/12 a 03/01 até 30/11**, com nomes, não com "a gente vê".
2. Pedir **voluntários específicos** para 24, 25, 31/12 e 01/01, que ficam dispensados de outra semana.
3. Nesses quatro dias, reduzir para **duas janelas** (10h e 20h) e aceitar publicamente que foto pode esperar
   até 10 h. A denúncia continua dentro das 24 h, e caso de criança continua com ocultação automática.
4. Uma pessoa de escalonamento de sobreaviso em cada um desses dias.

### 6.4 Treinamento (RECOMENDAÇÃO)

**Formato:** 1 encontro de ~2 h (presencial ou vídeo) + manual de 4–6 páginas + **simulação com ~20 casos
reais anonimizados ou inventados**. Ninguém entra na escala sem passar pela simulação. Reciclagem de 30 min
depois das duas primeiras semanas, com os casos que de fato apareceram.

**Conteúdo mínimo:**

1. **As regras da comunidade** (escritas pela igreja; LACUNAS C11) e a diferença entre "fere a regra" e "não
   gosto". Discordância teológica educada não é violação, a menos que a regra diga que é. Quem decide isso é a
   igreja, por escrito, não o moderador na hora.
2. **Foto:** rosto de criança, rosto de terceiro identificável, placa de carro, documento, tela com conversa,
   endereço. O que recusar, e como escrever o motivo para quem publicou sem humilhar.
3. **Dado sensível e de terceiro no texto:** nome + doença, nome + problema conjugal, acusação a pessoa
   identificável.
4. **Protocolo de crise:** post com ideação suicida ou autolesão não é "remover e pronto". Ocultar para
   proteger a pessoa, acionar o escalonamento pastoral na hora e indicar o **CVV 188** (ligação gratuita, 24 h,
   todo o território nacional [33]). Relato de violência doméstica ou abuso: ocultar, escalonar, não expor.
5. **Protocolo de abuso sexual infantil:** não baixar, não printar, não encaminhar a ninguém, nem para
   "mostrar ao pastor". Ocultar, acionar o responsável legal, preservar o registro no servidor e comunicar às
   autoridades (Decreto arts. 36–39 [8]; SaferNet [31]). **O jurídico precisa escrever este protocolo**,
   porque a guarda do material tem implicação penal. **Não pesquisei** o procedimento de preservação de prova.
6. **LGPD e sigilo:** o moderador vê conteúdo de fé de pessoas que ele conhece. Assina **termo de
   confidencialidade**. Não comenta caso fora da escala. Não usa a ferramenta para "ver o que fulano escreveu".
7. **Conflito de interesse:** passar adiante post de parente, de pessoa com quem tem conflito, ou de liderança
   acima dele.
8. **Como escrever o aviso de remoção:** motivo, se foi humano ou automático, e como contestar (ECA art. 30).
9. **Autocuidado:** conteúdo de luto, doença e crise pesa. Rodízio existe para isso.

### 6.5 A obrigação não acaba em 31/12

**INFERÊNCIA:** a campanha acaba em 31/12, mas o app, os posts e a responsabilidade continuam. Quem publicou
no dia 100 pode ser denunciado em 05/01. A Apple 1.2 e o Tema 987 valem enquanto houver conteúdo visível.

**Decisão do fundador (três caminhos):**

1. O feed continua depois de 31/12 → a escala continua, com dono e prazo.
2. O feed fica **somente leitura** a partir de 01/01 e é apagado numa data anunciada (ex.: 31/01) → escala
   reduzida (uma janela por dia) até a data de remoção.
3. O feed é arquivado e deixa de ser visível em 01/01 → a moderação cai para o canal de pedidos (§7) e a
   exclusão de dados.

Qualquer que seja a escolha, ela precisa aparecer **antes** da primeira publicação, no consentimento de C4
("até quando isso fica visível").

---

## 7. "Apareço nesta foto e não autorizei", quando quem pede não tem o app

### 7.1 O problema

- A foto do culto mostra pessoas que não são usuárias do app e que não consentiram (00-DECISAO-FEED item 8).
- Quem aparece pode nem saber que o app existe. Fica sabendo por alguém que mostra o celular.
- Não existe link para o post: C1 não tem compartilhamento externo (REGRAS §5 decisão 5: "Enviar para fora
  do app. Cortado de propósito").
- Se o feed for legível sem conta (REGRAS 12; LACUNAS B5), a pessoa **pode** instalar o app para ver e
  denunciar. Mas não se pode exigir que instale um app religioso para retirar a própria imagem.

### 7.2 Fluxo recomendado (RECOMENDAÇÃO)

**Canais de entrada (os dois, desde o dia 1):**

1. **Página web pública** "Retirar conteúdo" no mesmo domínio da política de privacidade, com um formulário
   curto: nome, contato (e-mail ou telefone), relação com a pessoa (eu mesmo / responsável por criança / outro),
   como identificar o post (nome de quem publicou, dia aproximado, descrição da foto), e declaração de que a
   informação é verdadeira. Exigir nome e contato atende o ECA art. 29 §2º (denúncia anônima vedada para
   acionar a retirada obrigatória [7]).
2. **E-mail publicado** (o mesmo "contato publicado" da Apple 1.2 [1]), para quem não usa formulário.
3. **Dentro do app**, na folha C5, o motivo "Apareço nesta foto e não autorizei" (LACUNAS C33). Se a leitura
   sem conta for permitida, **a denúncia também deve ser permitida sem conta**, pedindo contato no mesmo
   formulário da web (RECOMENDAÇÃO; hoje o C5 pressupõe conta).

**Tratamento:**

| Passo | Quem | Prazo | O quê |
|---|---|---|---|
| 1 | Sistema | na hora | Registro do pedido com número de protocolo e resposta automática ao contato informado ("recebemos; protocolo X; prazo Y") |
| 2 | Moderador | próxima janela (≤ 12 h) | Localizar o post pela busca por autor e data. Achou → **ocultar cautelarmente**, sem exigir prova de identidade nesta etapa |
| 3 | Moderador | mesma janela | Avisar o autor: "sua publicação do dia X foi ocultada porque uma pessoa que aparece na foto pediu a retirada"; oferecer **republicar sem a foto** ou com a foto cortada. Motivo e se foi humano (ECA art. 30) |
| 4 | Escalonamento | ≤ 48 h | Se o autor contestar ("é a minha foto, é o meu filho"), decidir. Regra-padrão: **rosto de terceiro identificável sem autorização não volta**. Criança só volta com autorização do responsável, e na V1 a recomendação é não voltar |
| 5 | Moderador | ≤ 15 dias (LGPD art. 19 [18]), na prática em dias | Responder a quem pediu: ocultado / não localizado (pedir mais dados) / mantido, com motivo |
| 6 | Sistema | — | Guardar protocolo, decisão e motivo pelo prazo que o jurídico definir, **sem guardar a foto** além do necessário para eventual recurso |

**Por que ocultar antes de verificar (INFERÊNCIA):** o erro de ocultar indevidamente custa ao autor algumas
horas sem a foto no ar, e ele pode republicar sem ela. O erro de manter custa dado sensível de terceiro
exposto a milhares de pessoas, responsabilidade pós-notificação (Tema 987 [9]) e, se for criança, violação do
ECA art. 29. **A assimetria decide.**

**Abuso do canal:** alguém pode usar o formulário para derrubar posts de desafetos. Com ~3.000 pessoas e
pré-moderação de foto, o risco é pequeno (HIPÓTESE). Mitigação: o autor pode republicar sem a foto, e pedido
repetido do mesmo contato contra várias pessoas vai para o escalonamento.

### 7.3 Prevenir é mais barato que retirar

- Em C3, uma linha curta no momento de escolher a foto: "Tem mais alguém na foto? Só publique se a pessoa
  concordou. Criança, só com o responsável." (LACUNAS C33; o texto final é do designer ou da igreja).
- Na pré-moderação, o moderador recusa rosto identificável de terceiro sem sinal de consentimento. Isso dá
  conservador de propósito: a comunidade é sobre "o que Deus falou com você", não sobre fotografar a multidão.
- **Decisão possível do fundador:** proibir foto com rosto de outra pessoa na V1. Seria a regra mais fácil de
  moderar, de explicar e de defender (INFERÊNCIA).

---

## 8. O que a IGREJA precisa fornecer

Sem estes itens, a moderação não existe, e sem moderação o feed não pode ser publicado (Apple 1.2 [1],
Google Play UGC [2]).

### 8.1 Pessoas

| Papel | Quantos | O quê | Até quando |
|---|---|---|---|
| **Moderadores** | 10 (sem pré-moderação de foto) a 14 (com) | Escala em janelas (§6.2), ~1–2 h por semana cada, treinamento + simulação, termo de confidencialidade | Nomes antes do build de loja; escala de dezembro fechada até 30/11 |
| **Escalonamento pastoral** | 2 | Caso difícil, recurso, crise, contato com a pessoa quando necessário; alcançáveis por telefone | Idem |
| **Responsável pelas regras da comunidade** | 1 (pode acumular) | Escrever e manter as regras (LACUNAS C11) e a lista própria de termos | Antes do build de loja |
| **Administrador técnico** | 1–2 | Acesso ao Supabase como Owner/Admin; recurso de última instância; suspensão de conta | Já no projeto |

### 8.2 Responsável legal

- **A entidade dona do app** (a mesma que será a Organização nas contas de desenvolvedor, conforme
  `CLAUDE.md`) é quem responde pelo conteúdo pós-notificação (Tema 987 [9]) e pelo ECA Digital. Precisa estar
  **nomeada por escrito**: razão social, CNPJ e quem assina por ela.
- **Encarregado de dados (DPO) ou canal equivalente** (já previsto em `MOBILE_STORE_REQUIREMENTS.md`), que recebe
  os pedidos da LGPD, inclusive o "apareço nesta foto".
- **Um advogado** que leia: as regras da comunidade, o protocolo de abuso sexual infantil, o prazo de guarda
  dos registros de moderação e dos itens removidos, e os textos oficiais do ECA Digital e do Decreto (§2.2, nota).
- **Quem aceita o risco residual** (ex.: se o fundador escolher foto sem pré-moderação): nome e data.

### 8.3 Canal de contato

- **Um e-mail institucional** real (não pessoal), lido todo dia, publicado no app (Apple 1.2 "published contact
  information" [1]; LACUNAS C34) e na página web.
- **Um domínio** para hospedar a política de privacidade, a página "Retirar conteúdo" (§7.2), a exclusão de
  conta por web (já exigida) e, se for escolhida a opção B, a ferramenta interna de moderação.
- **Um telefone** de escalonamento para caso de criança e crise, **só para uso interno** da escala, nunca
  publicado.

### 8.4 Decisões que só o fundador (com o Product Brain) toma

1. Pré-moderação de foto (recomendado) ou foto instantânea com risco aceito (§3.3).
2. Foto com rosto de terceiro: permitida com aviso, ou proibida na V1 (§7.3).
3. O que acontece com o feed depois de 31/12 (§6.5).
4. Página web interna de moderação (recomendado) e quem a hospeda e mantém (§5.2).
5. Aceitar a classificação **A16** na App Store Brasil, ou mudar o desenho (§2.3).
6. Mandar ou não foto e texto para classificador fora do Brasil (§4.3). Recomendação: não, na V1.

---

## 9. Bloqueios desta frente

O que impede publicar a comunidade se não for resolvido:

1. **Não existem pessoas nomeadas para moderar.** Sem escala com nomes, a promessa de C5 é falsa, e a Apple
   pode remover o app depois de publicado [1].
2. **Não existe entidade responsável nomeada**, nem encarregado, nem e-mail institucional publicado.
3. **Não existem regras da comunidade** escritas pela igreja (exigência do Google Play [2]).
4. **Não existe servidor** (LACUNAS B3), nem as tabelas de post, denúncia e `moderation_actions` (B4), nem
   papel de moderador ou ferramenta (B11). Toda a ferramenta de §5 depende disso.
5. **Não existe filtro antes da publicação**, exigido pela Apple 1.2 [1], nem estado "em análise"/"recusado"
   no desenho (LACUNAS C6).
6. **Não existe canal para quem não tem o app** (página web + e-mail), exigido na prática pelo ECA art. 29
   §3º [7] e pela LGPD.
7. **Não existe protocolo de abuso sexual infantil** revisado por advogado.
8. **Não existe decisão sobre o feed depois de 31/12.** Sem ela, a obrigação de moderar fica sem fim e sem dono.
9. **A classificação A16** [17] ainda não foi aceita nem contornada por quem decide produto.

---

## 10. Fontes (todas acessadas em 2026-09-21)

1. Apple — App Review Guidelines, 1.2 User-Generated Content. https://developer.apple.com/app-store/review/guidelines/
2. Google Play Console Help — User Generated Content policy. https://support.google.com/googleplay/android-developer/answer/9876937
3. WebPurify — "Filter Objectionable Content Before Apple Rejects Your App" (guia de fornecedor; interesse comercial). https://www.webpurify.com/blog/filter-objectionable-content-before-apple-rejects-your-app/
4. BuddyBoss — "How to Resolve App Store Guideline 1.2" (guia de fornecedor). https://buddyboss.com/docs/app-store-guideline-1-2-safety-user-generated-content/
5. Câmara dos Deputados — Lei 15.211/2025, publicação original (arts. 24, 28, 29 caput, 30). https://www2.camara.leg.br/legin/fed/lei/2025/lei-15211-17-setembro-2025-797997-publicacaooriginal-176498-pl.html
6. Idem, art. 31 (limite de 1.000.000 de usuários) e art. 17 §4º.
7. Modelo Inicial — Lei 15.211/2025, art. 29 e parágrafos (fonte secundária). https://modeloinicial.com.br/lei/L-15211-2025/lei-15211/art-29
8. Câmara dos Deputados — Decreto 12.880/2026, publicação original (arts. 9, 27, 36–39, 43; lido por resumo). https://www2.camara.leg.br/legin/fed/decret/2026/decreto-12880-18-marco-2026-798813-publicacaooriginal-178481-pe.html
9. ConJur — "STF fixa tese sobre responsabilização de plataformas por conteúdo de usuários" (26/06/2025). https://conjur.com.br/2025-jun-26/supremo-fixa-tese-sobre-responsabilizacao-de-plataformas-por-conteudo-de-usuarios/
10. Gomes Altimari Advogados — "STF conclui o julgamento do Tema 987 e fecha os pontos pendentes" (conclusão em 17/06/2026, segundo o texto; não confirmado no portal do STF). https://gomesaltimari.com.br/stf-conclui-o-julgamento-do-tema-987-e-fecha-os-pontos-pendentes-o-que-a-tese-definitiva-muda-para-as-empresas-que-operam-no-ambiente-digital/
11. LDNOOBW — List of Dirty, Naughty, Obscene and Otherwise Bad Words (CC BY 4.0); lista `pt` com 97 entradas. https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
12. OpenAI — Moderation guide (`omni-moderation-latest`, grátis, imagem, aviso sobre abuso sexual infantil). https://developers.openai.com/api/docs/guides/moderation
13. OpenAI — Your data (retenção por endpoint; `/v1/moderations` sem retenção, elegível a ZDR). https://developers.openai.com/api/docs/guides/your-data
14. AWS — Rekognition, operações de moderação (ver 24–26).
15. Supabase — Pricing (Pro US$ 25, Team US$ 599; papéis por plano; retenção de logs) e Access Control. https://supabase.com/pricing · https://supabase.com/docs/guides/platform/access-control
16. Apple Developer News — "Age rating questionnaire now includes social media questions" (09/07/2026). https://developer.apple.com/news/?id=tlur8uvi
17. App Store Connect Help — Age ratings values and definitions (Social Media 13+; Brasil A16). https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/
18. LGPD art. 19 (prazo de 15 dias), via comentário. https://lgpd-brasil.info/capitulo_03/artigo_19
19. Código Civil art. 20 (direito de imagem), via TJDFT "Direito Fácil". https://www.tjdft.jus.br/institucional/imprensa/campanhas-e-produtos/direito-facil/edicao-semanal/direito-de-imagem
20. NSFWJS (MIT; roda em React Native). https://github.com/infinitered/nsfwjs
21. ToxiBR (MIT; pt-BR). https://github.com/Diaum/toxibr
22. palavrao — kyriosdata (Apache-2.0). https://github.com/kyriosdata/palavrao
23. Perspective API — aviso de encerramento ("service will remain active until December 31, 2026"). https://www.perspectiveapi.com/
24. AWS — Amazon Rekognition pricing. https://aws.amazon.com/rekognition/pricing/
25. AWS — Amazon Rekognition endpoints and quotas (sa-east-1 listado; cota de DetectModerationLabels em São Paulo). https://docs.aws.amazon.com/general/latest/gr/rekognition.html
26. AWS — Amazon Rekognition FAQs (uso de imagens para melhorar o serviço; opt-out). https://aws.amazon.com/rekognition/faqs/
27. Google Cloud — Vision API pricing. https://cloud.google.com/vision/pricing
28. Google Cloud — Vision API data usage. https://docs.cloud.google.com/vision/docs/data-usage
29. Microsoft — Azure AI Content Safety pricing. https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/
30. ANPD — Resolução CD/ANPD nº 19/2024 (transferência internacional; cláusulas-padrão) e alerta sobre o fim do prazo em 23/08/2025. https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 · https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/
31. SaferNet Brasil — Denuncie. https://new.safernet.org.br/content/denuncie-n%C3%A3o-ignore
32. Câmara dos Deputados — Lei 14.759/2023 (20 de novembro feriado nacional). https://www2.camara.leg.br/legin/fed/lei/2023/lei-14759-21-dezembro-2023-795091-publicacaooriginal-170522-pl.html
33. CVV — Ligue 188. https://cvv.org.br/ligue-188/

**Não confirmado nesta frente:** texto oficial no Planalto da Lei 15.211 e do Decreto 12.880 (conexão
recusada); conclusão do Tema 987 em 17/06/2026 no portal do STF; suporte a português declarado pelo OpenAI
Moderation; região Brasil e preço S0 do Azure Content Safety; página de regiões do Google Vision (só resumo de
busca); oferta das cláusulas-padrão da ANPD por OpenAI e Google; acesso a PhotoDNA ou hash de abuso sexual
infantil para entidade deste porte; procedimento de preservação de prova em caso de abuso sexual infantil.
