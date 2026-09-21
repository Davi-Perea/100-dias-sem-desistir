# Comunidade: memorando de decisão para o fundador

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer + Technical Architect). Não sou advogado, e nada aqui é parecer jurídico.
- **Para:** Davi, que decide. Depois vai para o Product Brain, que ainda precisa ratificar a decisão do feed
  (`docs/design/00-DECISAO-FEED.md`, 2026-09-20).
- **O que é:** o resumo de quatro estudos feitos hoje, com recomendação em cada ponto. Os estudos completos, com
  todas as fontes, estão ao lado:
  `01-lojas.md` (Apple e Google) · `02-lei.md` (lei brasileira) · `03-dados-e-seguranca.md` (banco de dados e
  segurança) · `04-moderacao.md` (quem cuida do que é publicado).
- **Nada foi implementado.** Nenhum arquivo do app foi alterado.
- **Como ler as etiquetas:** **FATO** = está escrito numa fonte oficial (link e data no fim) · **INFERÊNCIA** = é
  conclusão minha a partir dos fatos · **HIPÓTESE** = é um palpite que ninguém mediu · **NÃO CONFIRMADO** = procurei e
  não achei confirmação.

---

## Em uma frase

A comunidade **é possível**, mas não é "uma aba a mais": ela exige um servidor que ainda não existe, uma equipe de
cerca de 17 pessoas da igreja cuidando do que é publicado todos os dias (inclusive no Natal), uma pessoa jurídica
nomeada que responda por ela, e muda a classificação do app na App Store do Brasil para **16 anos**. **Ela não fica
pronta para o dia 23/09.** Com decisões tomadas esta semana e a igreja entregando o que precisa entregar, a data
honesta mais cedo fica **entre o fim de outubro e meados de novembro** (seção 7).

## Palavras que aparecem no texto

- **Feed:** a lista de publicações das pessoas, uma embaixo da outra.
- **Servidor (ou backend):** o computador na internet que guarda as publicações e as entrega para os outros. Hoje o
  app funciona todo no próprio celular e **não tem servidor**.
- **Supabase:** o serviço que escolhemos para ser esse servidor (ADR-002). Fica em São Paulo.
- **Moderação:** alguém olhar o que foi publicado e tirar do ar o que fere as regras.
- **Pré-moderação:** a publicação só aparece depois que alguém aprova. **Pós-moderação:** aparece na hora e alguém
  olha depois, quando há denúncia.
- **Filtro automático:** um programa que segura publicações com palavrões ou ofensas antes de aparecerem.
- **Consentimento:** a tela em que a pessoa diz "sim, eu quero publicar sabendo disso". Para assunto de fé, a lei exige
  que seja uma tela própria e verdadeira.
- **Dado sensível:** tipo de dado que a lei protege mais. Convicção religiosa é um deles (LGPD art. 5º, II).
- **Controlador:** a pessoa jurídica (com CNPJ) que responde pelos dados perante a lei.
- **Encarregado (DPO):** a pessoa que atende os pedidos sobre dados pessoais em nome do controlador.
- **Classificação etária:** a idade indicada na página do app na loja (Livre, 12, 16...).

---

## 1. Quem vê os posts

**PROBLEMA.** O desenho diz duas coisas diferentes. A tela de publicar (C3) diz "Vai aparecer para **toda a igreja**".
A tela de consentimento (C4) diz "**Qualquer pessoa que baixar o app** vê a sua publicação". As duas não podem ser
verdade ao mesmo tempo. Qual delas é verdade depende de uma decisão que ainda não foi tomada.

**EVIDÊNCIA.**
- FATO: pela LGPD, o consentimento para dado sensível precisa ser "específico e destacado" (art. 11, I), e é **nulo** se
  o texto enganar (art. 9º §1º). Não existe outra base legal para publicar sobre fé: o "legítimo interesse" não vale
  para dado sensível. (`02-lei.md` §1)
- INFERÊNCIA: o app pode ser baixado por qualquer pessoa na loja. Sem uma porta de entrada, "toda a igreja" é falso,
  e com o texto falso o consentimento não vale. (`02-lei.md` §7; `03-dados-e-seguranca.md` §0)
- INFERÊNCIA: se qualquer pessoa pode ver, qualquer pessoa também consegue **copiar tudo por programa**, porque a
  chave de acesso do app fica dentro dele e é pública por definição (FATO, Supabase [S1]). Na prática, alguém de fora
  montaria uma lista com nome, foto e fé declarada dos membros da igreja. (`03-dados-e-seguranca.md` §3.3)
- INFERÊNCIA: a opção "só o grupo" tem um furo no banco de dados já escrito: hoje qualquer pessoa com conta
  consegue entrar em qualquer grupo sozinha. E os grupos ainda não existem de verdade no app. (`03-dados-e-seguranca.md`
  §3.2; `LACUNAS.md` B13)
- FATO: a Apple passou a perguntar, desde setembro de 2026, se o app tem "social media", ou seja, um feed que espalha
  publicações para muitos usuários, com curtidas ou comentários. Se tem, a classificação no Brasil vira **A16**
  (seção 3). Um feed só do grupo *talvez* não conte, mas isso é **NÃO CONFIRMADO**: a Apple não define quantos são
  "muitos". (`01-lojas.md` §1.5)

**IMPACTO.** Essa escolha decide o texto do consentimento, o risco legal, o trabalho de moderação e se o app passa a
ser classificado para 16 anos. O custo de computador é o mesmo nas três opções (cerca de US$ 25/mês). O esforço de
programação também é parecido: 17 a 27 dias de trabalho de servidor. O que muda é o risco e o trabalho de gente.

**ALTERNATIVAS.**

| | (a) A igreja inteira, com código de entrada | (b) Só o meu grupo | (c) Qualquer pessoa com o app |
|---|---|---|---|
| Como entra | Um código entregue por líder ou ministério (no culto, no grupo), com validade, limite de usos e que pode ser cancelado | Código ou convite do grupo | Basta baixar |
| Quantos veem | ~3.000 pessoas da igreja | 5 a 12 pessoas que se conhecem | Ilimitado, inclusive gente de fora |
| Risco pela lei (INFERÊNCIA) | Médio | Baixo | Alto |
| Cópia em massa por gente de fora | Difícil (precisa de conta e código) | Muito difícil | Fácil |
| Classificação na App Store Brasil | A16 (INFERÊNCIA de alta confiança) | Talvez Livre/4+ (NÃO CONFIRMADO) | A16 |
| Moderação | Central, ~3.000 pessoas | Menor por grupo, mas cairia nas mãos de líderes sem treino | Imprevisível |
| Pontos fracos | Código vazado no Instagram vira opção (c) até ser cancelado | Grupos ainda não existem; quem não tem grupo fica sem comunidade; precisa fechar o furo no banco | A fé de quem publica fica pública na internet |

**O texto de consentimento que sai de cada escolha** (rascunho; o texto final passa por advogado):

- **(a)** "Sua publicação aparece para **as pessoas da igreja que entraram na comunidade com um código, hoje cerca de
  3.000**, com o seu nome e a sua foto. Algumas delas você não conhece."
- **(b)** "Sua publicação aparece **só para as pessoas do seu grupo, [nome do grupo], hoje [N] pessoas**, com o seu nome
  e a sua foto."
- **(c)** "Sua publicação fica visível para **qualquer pessoa que tiver o app, inclusive quem não é da igreja**, com o
  seu nome e a sua foto. Não temos como controlar quem copia o que você publica."

Nos três casos, a **mesma frase** precisa aparecer em C3, em C4 e na tela de nome e foto (B4). O consentimento também
precisa dizer: que um moderador da igreja olha antes (seção 4), até quando o post fica visível (seção 4) e que revogar
o consentimento tira do ar o que foi publicado (`02-lei.md` §6).

**RECOMENDAÇÃO: (a), a igreja inteira com código de entrada.** É a única que bate com a intenção declarada ("a igreja
lendo junto"), que permite um texto verdadeiro e que não depende de grupos que ainda não existem. Descarto a (c): ela
transforma declaração de fé em dado público. Condições: um código por líder ou ministério, com validade e cancelamento,
e um procedimento escrito para quando um código vazar. Em troca, a (a) quase certamente leva o app para A16 no Brasil
(seção 3). Se o preço da A16 for alto demais, a saída é a (b), e antes de desenhar em cima dela é preciso confirmar no
App Store Connect se um feed de grupo escapa da classificação.

---

## 2. Ver o feed exige conta?

**PROBLEMA.** O app funciona inteiro sem conta e sem internet, e isso é uma promessa do produto. Publicar exige conta,
mas o desenho não decide se **ler** o feed também exige. A decisão de 20/09 põe o feed como **primeira tela**, e o
`TELAS.md` põe a **Jornada** como primeira tela.

**EVIDÊNCIA.**
- FATO: a Apple exige que o app funcione sem login quando a função principal não depende de conta (5.1.1(v)). Nada
  obriga que o feed seja legível sem conta. O que dá rejeição é o app **abrir num muro de login**. (`01-lojas.md` §1.3)
- INFERÊNCIA: feed sem conta = criança lendo publicações de adultos desconhecidos. Isso puxa o app para as regras do
  ECA Digital sobre serviço "de acesso provável" por menores (Lei 15.211, art. 1º) e, no Google Play, para a política
  de apps para crianças (Families). (`02-lei.md` §4; `01-lojas.md` §2.3)
- INFERÊNCIA: feed sem conta também é feed copiável por programa (seção 1).
- INFERÊNCIA: com a opção (a), ler já exige um código, e o código precisa ficar guardado numa conta. Uma "sessão
  anônima" com código até existe, mas perde a entrada quando a pessoa reinstala o app. (`03-dados-e-seguranca.md` §3.1)
- INFERÊNCIA: feed como primeira tela reforça a leitura jurídica de que o app é uma **rede social** (ECA Digital
  art. 2º, III). E quem abre o app sem internet recebe primeiro um erro, antes da parte que funciona. (`02-lei.md` §4;
  `00-DECISAO-FEED.md`)

**IMPACTO.** Exigir conta para ler faz a maioria da igreja nunca ver a comunidade sem se cadastrar. Não exigir abre o
feed para crianças e para cópia em massa.

**ALTERNATIVAS.**
1. **Ler exige conta de adulto + código.** Quem não entrou vê, na aba Comunidade, um convite ("Para ler e publicar na
   comunidade, crie sua conta e use o código da sua igreja"), nunca um erro.
2. Ler sem conta, publicar com conta. Cai nos problemas de criança lendo e de cópia em massa descritos acima.
3. Ler com sessão anônima + código. É um meio-termo frágil: perde a entrada ao reinstalar e continua deixando menor ler.

**RECOMENDAÇÃO: alternativa 1, com a Jornada como primeira tela** e a Comunidade como aba. Isso resolve de uma vez o
muro de login da Apple, o problema de criança lendo, a cópia em massa e o "erro no metrô". **Isso reverte a parte da
decisão de 20/09 que põe o feed como primeira tela.** Se você quiser manter o feed na porta, ele precisa ser legível sem
conta, e aí caímos na alternativa 2 com todos os custos dela. Não vejo como sustentar as duas coisas ao mesmo tempo.

---

## 3. Idade: quem pode ter conta e publicar, e o que criança e adolescente veem

**PROBLEMA.** A campanha é "de criança a idoso". A comunidade é o primeiro lugar do app em que uma pessoa fala com
desconhecidos.

**EVIDÊNCIA.**
- FATO: a lei não fixa idade mínima para rede social. Mas o ECA Digital (art. 24) manda que contas de menores de 16
  anos, em serviço de acesso provável por eles, sejam **vinculadas à conta de um responsável**. O FAQ da ANPD de
  30/07/2026 lê a regra assim. Se ela vale para todo app ou só para rede social é **NÃO CONFIRMADO** (precisa de
  advogado). (`02-lei.md` §4)
- FATO: adolescente de 16 ou 17 anos é "relativamente incapaz" (Código Civil art. 4º). Se ele pode dar sozinho o
  consentimento para dado sensível é uma pergunta aberta para advogado. (`02-lei.md` §3)
- FATO: com "social media", a classificação da Apple fica em **13+ no mundo e A16 no Brasil**. **No Brasil, marcar
  "desligado para menores de 13" não baixa a faixa**, porque a própria tabela da Apple põe essa opção também em A16. A
  Apple pede ainda, no mínimo, que o app consulte a faixa de idade informada pelo aparelho (Declared Age Range) antes
  de liberar o feed. (`01-lojas.md` §1.5 [A3][A4])
- INFERÊNCIA: com A16, pais que usam o controle parental do iPhone para filhos de menos de 16 podem **não conseguir
  instalar o app inteiro**, e não só a comunidade. Isso inclui a leitura da Bíblia, que é o motivo do app existir.
  Como o iPhone aplica a faixa A16 a contas de criança é **NÃO CONFIRMADO**; precisa ser testado.
- NÃO CONFIRMADO: o efeito do feed na classificação do Google Play (o questionário só aparece dentro do Play Console).
  (`01-lojas.md` §2.6)

**IMPACTO.** Esta é a maior consequência de produto de todo o estudo. O feed da igreja inteira muda a idade indicada do
app todo, e não só a da aba.

**ALTERNATIVAS para quem publica, comenta e dá Amém.**

| | O que exige | Risco |
|---|---|---|
| **A. Só 18+** | Faixa de idade declarada no cadastro + sinal de idade da loja. Se os dois divergirem, não libera | Baixo |
| B. 16+ | O mesmo, mais parecer jurídico sobre 16–17 consentirem sozinhos | Médio |
| C. Menores de 16 com responsável | Conta do responsável, vínculo verificado, painel de supervisão. É um produto dentro do produto | Alto, fora do alcance da V1 |

**RECOMENDAÇÃO.**
- **Conta, leitura do feed, publicação, comentário e Amém: só 18+ na V1** (A). Isso já é a regra vigente do projeto para
  ter conta (S-11). Com ela somem as perguntas do adolescente consentir sozinho e do vínculo com responsável.
- **Criança e adolescente usam o app inteiro, exceto a comunidade**, e veem uma frase que não humilha ninguém: "Aqui
  você acompanha a Jornada. A comunidade é para quem tem 18 anos ou mais."
- **Sobre a A16, a decisão é sua, e as opções são só estas:** (i) aceitar A16 conscientemente, sabendo que parte das
  famílias com controle parental pode não conseguir instalar o app para os filhos; (ii) trocar para feed de grupo (1b) e
  confirmar antes, no App Store Connect, se ele escapa da classificação; (iii) adiar a comunidade para depois da
  campanha. **Responder "não tem social media" com o feed da igreja inteira não é opção**: é declaração falsa à Apple,
  e a própria guideline 2.3.6 fala em consequências. Minha recomendação é **(i) se você aceitar esse custo**. Se não
  aceitar, a (iii) é mais honesta que uma (ii) montada às pressas.

---

## 4. Quem modera, como e com que escala até 31/12

**PROBLEMA.** A tela C5 promete "Alguém da igreja vai olhar em até 24 h". Hoje não existe ninguém nomeado, nem fila,
nem ferramenta.

**EVIDÊNCIA.**
- FATO: a Apple exige um **filtro antes de a publicação aparecer**, e não só denúncia depois; exige também resposta
  rápida às denúncias, bloqueio de usuário e contato publicado (guideline 1.2). O Google exige que a pessoa **aceite as
  regras antes de publicar**, sem poder pular, e que dê para denunciar tanto a publicação quanto a pessoa. (`01-lojas.md`
  §1.1, §2.1)
- FATO: o ECA Digital (arts. 29–30) exige tirar do ar "assim que" a vítima avisar, quando o conteúdo envolve criança, e,
  a cada remoção, avisar o autor com o motivo, dizer se quem decidiu foi pessoa ou máquina, e aceitar recurso.
  Depois do Tema 987 do STF, a entidade pode responder na Justiça se receber um aviso de conteúdo ilegal e não agir.
  (`02-lei.md` §4, §5)
- INFERÊNCIA: nenhum filtro automático detecta o risco mais provável deste feed, que é **foto do culto com rosto de
  outra pessoa ou de criança**. Essa foto revela a fé de quem aparece nela, e essa pessoa nem usa o app. (`04-moderacao.md`
  §3.2)
- HIPÓTESE (ninguém mediu adesão): no cenário central, cerca de 16 minutos de trabalho por dia; no pico otimista, cerca
  de 3 horas por dia. O difícil não são as horas, é ter **alguém disponível todo dia**, inclusive em 24, 25 e 31/12 e
  01/01. (`04-moderacao.md` §3.4)
- FATO: o painel do Supabase não serve para voluntários. No plano Pro, qualquer acesso ao painel enxerga todas as
  tabelas; acesso só de leitura existe apenas no plano Team, a US$ 599/mês. (`04-moderacao.md` §5.2)
- INFERÊNCIA: a obrigação de moderar **não acaba em 31/12**. Ela dura enquanto houver post visível.

**IMPACTO.** Sem moderação real, a Apple rejeita o app na revisão ou o tira da loja depois, e a igreja responde
legalmente pelo que ficar no ar.

**ALTERNATIVAS.**
1. **Híbrido (recomendado):** texto e comentário passam por um filtro automático de palavras no servidor em São Paulo
   (ToxiBR, gratuito, mais uma lista da própria igreja) e aparecem na hora; o que o filtro segurar vai para uma pessoa.
   **Foto só aparece depois que uma pessoa da igreja aprova.** Denúncia de criança ou de "apareço nesta foto" tira o
   post do ar na hora, antes da análise.
2. Tudo aprovado por pessoa, inclusive texto. É o mais seguro, mas o post das 23h só aparece de manhã.
3. Filtro automático em tudo, inclusive foto, e ninguém aprovando antes. Passa na Apple (INFERÊNCIA), mas aceita que
   foto de criança fique no ar até alguém denunciar. Não recomendo. Se escolhida, precisa de um nome de quem aceitou o
   risco.

**RECOMENDAÇÃO.**
- **Modelo:** alternativa 1. **Não mandar foto de membro para serviço de inteligência artificial de fora** na V1: a
  pessoa que modera é o filtro da foto.
- **Pessoas (a igreja fornece):** **14 moderadores** treinados, em 5 janelas de 30 minutos por dia (7h, 11h, 15h, 19h e
  23h), cada um com cerca de 1 a 2 horas por semana; **2 pessoas de apoio pastoral** para casos difíceis, crises e
  recursos; **1 responsável legal**. Ninguém modera sozinho a campanha inteira.
- **Treino:** um encontro de 2 horas, um manual curto, uma simulação com cerca de 20 casos e um termo de sigilo. Precisa
  de protocolo de crise (ideação suicida: acolher e indicar o CVV 188) e de protocolo de abuso infantil escrito por
  advogado.
- **Ferramenta:** uma página web interna simples (fila e botões), com o mesmo login do app. São 4 a 6 dias de trabalho.
  O painel do Supabase fica só para 1 ou 2 administradores técnicos.
- **Natal e Ano-Novo:** escala de 20/12 a 03/01 **fechada com nomes até 30/11**. Em 24, 25 e 31/12 e 01/01, duas janelas
  (10h e 20h) e uma pessoa pastoral de sobreaviso.
- **Quem não tem o app** (a pessoa que aparece na foto): uma página web "Retirar conteúdo" e um e-mail publicado. Na
  dúvida, o post sai do ar antes de terminar a verificação.
- **Depois de 31/12:** recomendo que o feed **fique só para leitura a partir de 01/01 e seja apagado numa data anunciada
  desde o começo** (por exemplo, 31/01/2027). Isso põe fim à obrigação de moderar. Se a igreja quiser o feed contínuo,
  precisa se comprometer com a escala sem data para acabar. De qualquer jeito, a data precisa estar no consentimento.
- **Trocar a promessa de C5** para um prazo que a escala consegue cumprir. As 24 h não vêm de lei nem de loja: são
  escolha do desenho. Prometer 24 h e cumprir 72 é pior do que prometer 48 e cumprir 12.

---

## 5. O grupo mostrar quem leu hoje (tela D4)

**PROBLEMA.** A tela D4 mostra "4 de 7 já leram o dia 17" e, ao lado do nome e da foto de cada pessoa, se ela leu hoje
(bolinha cheia) ou não (anel cinza). Ela também dá nome ao Amém dentro do grupo.

**EVIDÊNCIA.**
- FATO: o próprio texto do consentimento (C4, item 2) diz "Sua leitura, seu jejum e a sua reflexão privada continuam só
  suas. Nada disso vai junto". O app hoje promete na Ajuda "Nada disso vai para o grupo", e o REGRAS 14 diz que o
  progresso fica no aparelho. (`LACUNAS.md` D4)
- INFERÊNCIA: progresso de leitura bíblica ligado a um nome revela prática religiosa. É dado sensível pelo art. 11 §1º
  da LGPD, e o consentimento de C4 diz **o contrário** do que D4 faria. (`02-lei.md` §1)
- INFERÊNCIA: o anel cinza mostra aos amigos quem **não** leu. Isso contraria a regra do produto de não gerar culpa
  (REGRAS 9) e cria pressão social, justamente o que o ECA Digital pede para evitar (Decreto 12.880, art. 10).
- FATO: nenhum desses dados existe no servidor, e o grupo de até 12 amigos que D4 desenha não é o grupo que existe hoje
  no código. O Amém com nome contraria a regra 19. (`LACUNAS.md` D4; `03-dados-e-seguranca.md` §3.2 item 7)
- INFERÊNCIA: num grupo de 7, até o número "4 de 7" sem nomes permite adivinhar quem não leu.

**IMPACTO.** Como está, D4 torna falso o texto do consentimento, e com texto falso o consentimento da comunidade inteira
fica nulo.

**ALTERNATIVAS.**
1. **Tirar D4 da V1**: o grupo fica sem painel de leitura. Não custa nada e não conflita com nada.
2. Um interruptor por pessoa, **desligado por padrão**, com consentimento próprio: "Mostrar ao meu grupo quando eu li o
   dia". O consentimento de C4 é corrigido. Só aparece quem ligou, e nunca aparece "quem não leu". Custa servidor e
   telas novas.
3. Manter como está. Não é possível sem mudar o consentimento e sem contrariar três regras do produto.

**RECOMENDAÇÃO: alternativa 1 na V1.** O grupo ainda nem existe no servidor; se um dia existir e o Product Brain aprovar,
a alternativa 2 é o caminho. O Amém com nome no grupo sai junto.

---

## 6. O servidor: o que você precisa criar, contratar e quanto custa

**PROBLEMA.** Não existe servidor. Há dois arquivos de banco de dados escritos, mas nunca aplicados, e eles ainda não
têm nada da comunidade. Nada da comunidade funciona sem isso, e a Apple exige servidor ligado e conta de demonstração
para revisar (guideline 2.1).

**EVIDÊNCIA (preços consultados em 2026-09-21; sem impostos nem IOF).**

| Item | Para quê | Custo | Fonte |
|---|---|---|---|
| **Supabase Pro**, região São Paulo | Banco, login, fotos e funções de servidor | **US$ 25/mês**, com 100 mil usuários ativos, 8 GB de banco, 100 GB de arquivos e 250 GB de tráfego incluídos (tráfego extra a US$ 0,09/GB) | FATO [P1] |
| Estimativa de uso da comunidade | Cabe no Pro | HIPÓTESE: ~6 GB de fotos na campanha e ~120 GB/mês de tráfego | `03-dados-e-seguranca.md` §5.1 |
| **Resend** (envio do código de login por e-mail) | O e-mail de 6 dígitos para entrar na conta | Grátis até 100/dia. No lançamento isso estoura, então: **US$ 20/mês** (50 mil e-mails) nos meses de pico | FATO [P2] |
| **Apple Developer Program**, como Organização | Publicar na App Store | **US$ 99/ano** (≈ US$ 8/mês). Exige D-U-N-S, site em domínio próprio e e-mail do domínio. Existe isenção para entidades sem fins lucrativos; se vale para o Brasil é NÃO CONFIRMADO | FATO [P3] |
| **Google Play**, conta de desenvolvedor | Publicar no Google Play | **US$ 25, uma vez** | FATO [P4] |
| **EAS (Expo)** | Gerar as versões do app na nuvem, já que não temos Mac | Grátis (15 versões iOS + 15 Android/mês) ou **US$ 19/mês** se a fila grátis atrasar | FATO [P5] |
| **Domínio** .org.br ou .com.br | Política de privacidade, página de exclusão de conta, página "Retirar conteúdo", ferramenta de moderação | **~R$ 40/ano** | Fonte secundária [P6]; NÃO CONFIRMADO no Registro.br |
| E-mail institucional no domínio | Contato publicado (exigência da Apple) e cadastro Apple Organização | Não pesquisei preço; muitas igrejas já têm | NÃO CONFIRMADO |
| Hospedagem das páginas web | As páginas acima | Provavelmente gratuita ou quase (páginas simples) | HIPÓTESE |
| Filtro de texto ToxiBR | Filtro antes de publicar | Grátis (licença MIT) | `04-moderacao.md` §4.1 |
| Supabase Team | Só seria preciso se voluntários usassem o painel | US$ 599/mês. **Não recomendo; evitamos com a página interna** | FATO [P1] |

**IMPACTO.** O custo de computador é pequeno: **cerca de US$ 50 a 75 por mês** (Supabase 25 + e-mail 20 + Apple ≈ 8 +
EAS 0 a 19), mais US$ 25 do Google uma vez e ~R$ 40/ano de domínio. Isso vale para as três opções de alcance. **Os
custos que pesam de verdade não são de computador:**
- **Advogado**: consentimento, regras da comunidade, termos, política de privacidade, página para pais, protocolo de
  abuso infantil, prazos de guarda de dados e as perguntas abertas de `02-lei.md` §8. Não orcei.
- **Gente**: ~17 voluntários (seção 4).
- **Engenharia**: 17 a 27 dias de servidor + 4 a 6 da página de moderação + as telas novas no app.

**O que você precisa criar ou contratar, em ordem:**
1. **Decidir qual pessoa jurídica (CNPJ) é a dona do app**: é o "controlador" da lei. Tudo abaixo fica no nome dela.
2. **D-U-N-S** dessa entidade: é gratuito, mas o prazo não é publicado (a pesquisa do Sprint 0 estima de 2 a 6 semanas).
   É o item mais lento. **Comece já.**
3. Domínio próprio e e-mail institucional.
4. Contas Apple (Organização) e Google Play no nome da entidade.
5. Organização no Supabase, **no nome da entidade**, com você como dono, verificação em duas etapas obrigatória e
   projeto em São Paulo.
6. Conta no Resend e no Expo.
7. Um advogado.

**RECOMENDAÇÃO.** Contratar o Supabase Pro em São Paulo como já previsto no ADR-002. Não contratar o Team nem serviço de
inteligência artificial para fotos. Tratar o dinheiro como a parte fácil: o que atrasa é a entidade, o D-U-N-S, o
advogado e as pessoas.

---

## 7. Quando a comunidade pode entrar no ar, de forma honesta

**PROBLEMA.** A campanha começa em **23/09/2026, depois de amanhã**. A comunidade tem pré-requisitos que não dependem de
programação.

**EVIDÊNCIA.**
- FATO (estado do repositório): não há servidor, as regras de acesso ao banco nunca rodaram num banco real e a exclusão
  de conta não existe. (`LACUNAS.md` B3, B12)
- FATO: o próprio app ainda depende da **autorização escrita da igreja** para publicar o guia e a escala (Launch Gate 2),
  e sem ela a versão de loja não abre. Isso vale com ou sem comunidade. (`CLAUDE.md`)
- INFERÊNCIA a partir das estimativas das frentes: servidor da comunidade (17 a 27 dias) + página de moderação (4 a 6)
  + telas novas pedidas ao designer (estado "em análise", regras com aceite, denunciar pessoa, apagar o próprio post,
  "Conta e privacidade", ajuda e contato, faixa de idade) + testes de segurança + revisão das lojas. Em paralelo:
  D-U-N-S (2 a 6 semanas), advogado, regras escritas pela igreja, escala treinada.
- FATO: a Apple precisa de uma conta de demonstração e de um feed **com conteúdo** para o revisor testar denúncia e
  bloqueio. (`01-lojas.md` §1.6)

**IMPACTO.** Qualquer data antes de todos esses itens seria uma comunidade que ou é rejeitada pela loja, ou vai ao ar
sem ninguém cuidando.

**ALTERNATIVAS.**
1. **Lançar o app em 23/09 sem a comunidade** (como está planejado) e a comunidade numa **segunda versão**, assim que
   todos os portões abaixo fecharem.
2. Tentar a comunidade para o início da campanha. **Não é possível** de forma honesta.
3. Deixar a comunidade para depois da campanha (próxima jornada, 2027).

**RECOMENDAÇÃO: alternativa 1, com uma data-limite.**
- **Data honesta mais cedo: entre o fim de outubro e meados de novembro de 2026**, se as decisões desta página saírem
  **esta semana** e a igreja entregar a entidade, o advogado e as pessoas até meados de outubro. Isso é INFERÊNCIA, não
  promessa.
- **Portões para ligar a comunidade**, e todos precisam estar fechados: entidade e encarregado nomeados · textos
  revisados por advogado · regras da comunidade escritas pela igreja · 14 + 2 + 1 pessoas nomeadas e treinadas ·
  servidor no ar com testes de segurança passando · filtro antes de publicar · página de moderação · exclusão de conta
  no app e na web · página "Retirar conteúdo" · e-mail de contato atendido · classificação etária respondida com
  verdade.
- **Data-limite: 15/11/2026.** Se os portões não estiverem fechados até lá, recomendo **deixar para depois da
  campanha**. Entrar em dezembro significa estrear no mês mais difícil de moderar (Natal), para ter só cerca de 6 semanas
  de uso, e a obrigação continua depois de 31/12.
- **Uma correção nos documentos, independente da decisão:** `00-DECISAO-FEED.md` item 10 diz que streak, badge e
  notificação de atividade alheia são "proibidos por lei". O Decreto 12.880 (art. 9º) só sustenta com segurança a
  proibição de **esconder o ponto de parada** (feed sem fim) e de **tocar conteúdo sem pedido**. O resto é decisão de
  produto alinhada à lei, e decisão de produto pode ser revista. O feed continua precisando ter fim. (`02-lei.md` §4)

---

## O que eu preciso que você decida

1. **Alcance:** igreja inteira com código (recomendado), só o grupo, ou qualquer pessoa. Com isso fica definido o texto
   único de C3, C4 e B4.
2. **Primeira tela:** Jornada (recomendado) ou feed. A escolha pelo feed obriga a feed legível sem conta.
3. **Ler o feed exige conta de adulto + código?** Recomendo que sim.
4. **Idade:** conta, leitura, publicação, comentário e Amém só com 18+ (recomendado), ou 16+ com parecer jurídico.
5. **A16 na App Store Brasil:** aceitar, trocar para feed de grupo (confirmando antes), ou adiar a comunidade.
6. **Moderação:** foto aprovada por pessoa antes de aparecer (recomendado), ou foto instantânea com risco aceito por
   escrito e com nome de quem aceitou.
7. **Foto com rosto de outra pessoa:** proibida na V1 (mais simples de explicar e de moderar) ou permitida com aviso.
   Criança identificável: recomendo proibir.
8. **Prazo prometido em C5:** o que a escala consegue cumprir (24 h ou 48 h).
9. **Depois de 31/12:** só leitura e apagado numa data anunciada (recomendado), contínuo com escala permanente, ou
   arquivado em 01/01.
10. **Tela D4:** fora da V1 (recomendado), junto com o Amém com nome no grupo.
11. **Data-limite de 15/11** para ligar a comunidade, ou deixar para depois da campanha.
12. **Levar ao Product Brain** a decisão do feed com este memorando: a ratificação continua pendente.

## O que a igreja precisa fornecer

1. **A pessoa jurídica dona do app:** razão social, CNPJ e quem assina por ela. Ela é a controladora dos dados e a
   Organização nas lojas.
2. **O encarregado de dados** (nome e contato), que responde a pedidos em até 15 dias (LGPD art. 19).
3. **O pedido de D-U-N-S**, iniciado já.
4. **Domínio e e-mail institucional**, que alguém leia todo dia.
5. **Um advogado** para: consentimento, regras da comunidade, termos com classificação indicativa, política de
   privacidade, página para pais, protocolo de abuso infantil, prazos de guarda de dados e as dúvidas sobre o art. 24
   do ECA Digital e o Tema 987.
6. **As regras da comunidade**, escritas pela igreja, e uma lista de termos que ela não quer ver no feed, com uma pessoa
   responsável por elas.
7. **Pessoas nomeadas:** 14 moderadores, 2 de apoio pastoral e 1 responsável legal, com treinamento, simulação e termo
   de sigilo. **A escala de 20/12 a 03/01 precisa estar fechada até 30/11.**
8. **Os líderes e ministérios que vão distribuir os códigos de entrada** (se a opção for a igreja inteira), e quem os
   cancela quando vazarem.
9. **Um telefone interno** de plantão para casos de criança e de crise (não publicado).
10. **A autorização escrita para o guia e a escala (Launch Gate 2)**, que já bloqueia o app com ou sem comunidade.

---

## Fontes

As fontes de cada afirmação estão nos quatro estudos ao lado, com link e data de acesso (2026-09-21): `01-lojas.md`
(19 fontes), `02-lei.md` (20), `03-dados-e-seguranca.md` (19) e `04-moderacao.md` (33). As principais usadas aqui:

- Apple — App Store Review Guidelines (1.2, 2.1, 2.3.6, 5.1.1): https://developer.apple.com/app-store/review/guidelines/ (acesso 2026-09-21)
- Apple — "Age rating questionnaire now includes social media questions" (09/07/2026): https://developer.apple.com/news/?id=tlur8uvi (acesso 2026-09-21)
- Apple — Age ratings values and definitions (Social Media 13+; Brasil A16): https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/ (acesso 2026-09-21)
- Google Play — User Generated Content: https://support.google.com/googleplay/android-developer/answer/9876937 (acesso 2026-09-21)
- LGPD (Lei 13.709/2018): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (acesso 2026-09-21, via `02-lei.md`)
- ECA Digital (Lei 15.211/2025): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm (acesso 2026-09-21, via `02-lei.md`)
- Decreto 12.880/2026: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm (acesso 2026-09-21, via `02-lei.md`)
- ANPD — Perguntas e respostas sobre o ECA Digital (30/07/2026): https://www.gov.br/anpd/pt-br/assuntos/eca-digital/perguntas_respostas_eca_digital_30072026.pdf (acesso 2026-09-21, via `02-lei.md`)
- [S1] Supabase — API keys: https://supabase.com/docs/guides/api/api-keys (acesso 2026-09-21, via `03-dados-e-seguranca.md`)

Consultadas diretamente para este memorando (acesso em 2026-09-21):

- [P1] Supabase — Pricing (Pro US$ 25/mês; 100 mil MAU; 8 GB; 100 GB de arquivos; 250 GB de tráfego, depois US$ 0,09/GB; Team US$ 599/mês): https://supabase.com/pricing
- [P2] Resend — Pricing (grátis: 3.000/mês e 100/dia; Pro a partir de US$ 20/mês com 50 mil): https://resend.com/pricing
- [P3] Apple — Enrollment (US$ 99/ano; D-U-N-S, site em domínio próprio, e-mail do domínio; isenção para sem fins lucrativos): https://developer.apple.com/programs/enroll/
- [P4] Google Play Console Help — taxa única de US$ 25: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en
- [P5] Expo — Pricing (Free 15+15 versões/mês; Starter US$ 19/mês; Production US$ 199/mês): https://expo.dev/pricing
- [P6] Preço de domínio .br (~R$ 40/ano), **fonte secundária**; a página de valores do Registro.br não carregou: https://www.hostgator.com.br/blog/quanto-custa-um-dominio/ · https://www.homehost.com.br/blog/dominio/registro-de-dominio-br/

**Não confirmado neste memorando:** o preço do domínio direto no Registro.br; o preço do e-mail institucional; se a
isenção de taxa da Apple para entidades sem fins lucrativos vale no Brasil; se um feed de grupo escapa da classificação
"social media"; como o iPhone aplica a faixa A16 a contas de criança; o efeito do feed na classificação do Google Play;
todos os pontos "NÃO CONFIRMADO" listados nos quatro estudos.
