# Prompt para o redesenho — "100 dias sem desistir"

> Copie tudo abaixo da linha e envie para a IA de design, junto com os arquivos do pacote:
> `00-DECISAO-FEED.md`, `README.md`, `sistema-visual.html` e os cinco capítulos numerados.
>
> Versão 2 — reescrita depois de três revisões adversariais que acharam, na versão 1, uma contradição
> com o próprio pacote e sete erros factuais sobre o app.

---

Você vai redesenhar um aplicativo que já existe e já funciona. Não é para inventar um produto novo: é
para dar a ele o desenho que ele merece.

Anexei um pacote com o estado real do app hoje — cada tela e o que ela faz, o sistema de cores e
tipografia atual, os contrastes medidos e as regras que não podem ser quebradas. **Leia
`00-DECISAO-FEED.md` primeiro, depois o `README.md`**, e abra o `sistema-visual.html` no navegador.

## Antes de tudo: o feed é uma exceção autorizada

O pacote proíbe feed em quatro regras marcadas BLOQUEANTE. **Isso não é descuido e você não está lendo
errado:** eu autorizei o feed em 20/09/2026, por cima dessas quatro regras, e o documento
`00-DECISAO-FEED.md` registra exatamente quais caíram. **Nenhuma outra caiu.**

Se qualquer outro pedido meu colidir com um invariante do capítulo 04, **não escolha sozinho**. Me
devolva assim: o problema, a evidência, o impacto, as alternativas e a sua recomendação.

## O que é o app

**100 dias sem desistir.** Cem dias em que a igreja inteira caminha junta — de 23 de setembro a 31 de
dezembro de 2026.

A igreja chama a campanha de **Palavra, consagração, adoração e intercessão**. Na prática, a pessoa pode
ler, pode orar, pode jejuar, pode fazer tudo, pode fazer um dia e voltar três dias depois. **Ela não é
obrigada a nada.** A promessa está no nome e é sobre não desistir, não sobre cumprir tudo: quem entra no
dia 20 vê o dia 20 — sem dívida de 19 dias, sem tela de culpa, sem nada vermelho dizendo que falhou.

É da Lagoinha, uma igreja. O conteúdo de cada dia é material escrito pela própria igreja. Cada dia tem:

- **a leitura** — só a referência ("Josué 6–17"), nunca o texto;
- **a ênfase** — a frase daquele dia ("Uma geração de coragem");
- **o monte** — um de sete: Igreja, Família, Educação, Governo, Economia, Mídia e Comunicação, Artes e
  Entretenimento;
- **o versículo-base** — também só a referência;
- **os motivos de oração** — uma lista curta;
- **o altar das 12h30** — todo dia um ministério diferente conduz.

**Duas advertências sobre esse conteúdo, para você não desenhar campo vazio:**

1. Existe no código um campo "tema" com uma palavra realçada em amarelo. Ele está **vazio nos 100 dias**
   do material real — o bloco hoje rotulado "Tema de hoje" mostra, na verdade, a ênfase. Resolva o rótulo
   e o realce sabendo disso.
2. **A palavra "jejum" não aparece uma única vez no material da igreja.** Ela está no app em quatro
   lugares (passo do onboarding, linha no Início, tela própria, terceiro número do Dia 100) e a igreja
   ainda não confirmou se há jejum nesta campanha. Desenhe esses quatro lugares de modo que possam
   **sair sem refazer a tela**.

## Quem usa

A igreja inteira: criança, adolescente, adulto e idoso. **A maioria é adulta**, mas o desenho tem que
servir ao idoso que aperta devagar e à criança que ainda lê pouco.

**É um app de celular, de uma mão só.** Não é site, não é tela de computador encolhida. O que importa
fica ao alcance do polegar, com alvo grande o bastante para o dedo errar e ainda acertar. Se o desenho
só funciona com duas mãos ou com o telefone apoiado, ele está errado.

## O princípio: simples de entender, não simples de menos

A referência é a **clareza do Duolingo** — um app completo que uma criança abre e entende sozinha, sem
tutorial, sem manual, sem menu escondido. A pessoa olha a tela e sabe o que fazer agora.

Copie só a clareza. **A mecânica de cobrança está fora deste app:** sequência que se perde, medalha,
ranking e recompensa por tempo de uso são regra do produto. E parte disso é lei: o Decreto 12.880/2026 (que
regulamenta o ECA Digital) proíbe esconder o ponto de parada, disparar conteúdo sem pedido (autoplay), dar
recompensa por tempo de uso e mandar notificação excessiva. *(Corrigido em 2026-09-21: a primeira versão
deste prompt dizia que streak, medalha e ranking são "proibidos por lei" — é exagero; eles são regra de
produto alinhada à lei.)* Vale para o feed também: **nada de rolagem infinita, nada de vídeo que começa
sozinho, nada de aviso que só existe para trazer a pessoa de volta. O feed tem que ter fim** — desenhe
esse fim como um estado de verdade ("você viu tudo de hoje").

Simples, completo e bonito. As três coisas juntas.

## Problema difícil nº 1: o feed é a porta, mas o dia é o produto

**Hoje o app abre numa tela do dia. Eu quero que ele abra no feed.**

Só que a home de hoje não é só o dia. Ela também é:

- o **módulo de retomada** — "Que bom ter você de volta. N dias ficaram para trás e continuam abertos".
  É o único lugar do app onde a promessa anti-culpa vira tela;
- o **gatilho dos marcos** — é daqui que sai a tela de 7, 25, 50, 75 e 100 dias;
- a **única tela com a faixa de "sem internet"**;
- um **ramo próprio para antes de 23/09** ("Faltam N dias"), que não revela nada do Dia 1;
- a linha "Igreja no Dia N", a linha do jejum, a linha do altar de hoje, o progresso da igreja e o acesso
  à conta.

**Diga, item por item, para onde cada uma dessas nove coisas vai quando o feed virar a porta.** Três
delas não são conteúdo do dia e não cabem numa aba "dia".

E me dê um critério, não uma intenção. O dia hoje está a **zero toque e zero rolagem**. Se o feed vira a
home, o dia passa a estar a pelo menos um toque — então diga qual é o novo contrato: quantos toques no
máximo, se o acesso ao dia fica visível **sem rolar o feed**, se ele fica na mesma posição em todas as
telas, e o que você aceita perder em troca. Sem isso não há como saber se o desenho acertou.

Decida também onde o feed mora na navegação. Hoje as abas são **Início · Jornada · Juntos · Você**, e a
comunidade vive em "Juntos" — que também guarda o altar do dia, o link para "Sobre o propósito", o grupo
e o recado da liderança. Me entregue o mapa de abas alvo e o destino dessas peças.

## Problema difícil nº 2: a leitura real é o dobro do que o desenho atual previa

O desenho de hoje foi feito para **7 capítulos, ~18 minutos**. O material real da igreja pede **11 a 12
capítulos por dia, 30 a 40 minutos** — o dia 17, por exemplo, é Josué 6 a 17.

Sem uma resposta de desenho para isso, a promessa "sem desistir" morre na segunda semana. Como a pessoa
lê isso em pedaços, sai e volta no capítulo certo, e vê quanto falta **sem se sentir devendo**?

## O que já existe e continua existindo

Não invente funcionalidade nova **além do feed e do que o feed obriga** (a lista está em
`00-DECISAO-FEED.md`). Fora isso, o que existe hoje é o que o app tem que continuar fazendo — só que
melhor desenhado. O detalhe de cada uma está em `03-telas.md`:

- **O Início** — a home de hoje, com tudo que está listado no problema nº 1.
- **A tela de um dia específico** — outra tela, alcançada pela Jornada, com blocos grandes e uma
  mini-régua vertical. Não confunda as duas.
- **O leitor** — a estrutura de leitura capítulo a capítulo: "capítulo X de Y", paginar, controle de
  tamanho do texto, concluir o dia, e o aviso de direitos no fim do capítulo, que não pode ser removido.
  **Atenção: hoje o corpo do texto é um marcador de desenvolvimento com selo "DEV FIXTURE".** Nenhuma
  tradução bíblica pode aparecer enquanto a licença não estiver resolvida. Desenhe a tela que funciona
  **sem** o texto sagrado e a mesma tela **com** ele.
- **A intercessão do dia** — um roteiro de cinco passos, com um modo para quem conduz o altar com o
  telefone apoiado na mesa.
- **A jornada** — os cem dias em linha: onde a pessoa está, onde a igreja está.
- **A reflexão privada** — o que a pessoa escreve só para ela, guardado no aparelho dela.
- **O jejum** — opcional, privado, nunca assumido (e veja a advertência lá em cima).
- **Juntos** — a comunidade, onde o feed passa a viver.
- **O grupo** — página própria com Direção, Insights e Membros, mais a folha de ferramentas de líder
  (quatro ações que ainda não existem, hoje visíveis e desativadas com o motivo à vista).
- **Meu ministério** — escolher o ministério e ver em que dias ele conduz o altar.
- **Sobre o propósito** — o texto da igreja explicando a campanha.
- **Minhas reflexões** — a lista do que já foi escrito.
- **Marcos** — 7, 25, 50, 75 dias e a chegada do Dia 100.
- **Você** — progresso pessoal, lembretes, aparência, conta.
- **Ajuda** — como funciona o dia oficial, o que é privado, de onde vem o conteúdo.
- **Onboarding** — cinco telas de entrada.

A tela de administração interna está fora do escopo de desenho.

## O feed, que é novo

Como é a primeira coisa que a pessoa vê, ele decide o que o app parece ser.

**O essencial:**

- Publicar: foto e texto. Curto e óbvio. Mas veja o item "filtragem" abaixo antes de assumir que o post
  aparece na hora.
- Ver e reagir de alguma forma simples e generosa. **Regra dura: nenhum sinal por post que possa ser
  comparado entre dois posts — inclusive a ausência do sinal.** Tirar o contador e deixar a reação
  visível não resolve; deixa a comparação intacta e mais cruel, porque agora é entre pessoas que se
  conhecem pelo nome.
- **Me mostre os piores casos, não o caso feliz:** o post em que ninguém reagiu, a pessoa que nunca
  publica, e um post de luto ("minha mãe faleceu hoje") imediatamente acima de uma foto de festa. Se o
  desenho fizer qualquer um desses três parecer errado, o desenho está errado.
- O estado vazio: como é o feed no primeiro dia, quando ninguém publicou nada.
- **Alcance:** decida e justifique — feed da igreja inteira (~3.000 pessoas) ou só do meu grupo? Hoje o
  app **esconde de propósito** a lista de membros de quem não lidera; um feed da igreja inteira desfaz
  essa proteção. E mostre como a pessoa sabe, olhando a tela de publicar, **quem exatamente vai ver** —
  em número concreto, não "a igreja vê".
- **O post e o dia:** o post é sempre do dia de hoje? Mostra de que dia é? E o que acontece quando
  alguém escreve sobre o dia 47 e quem está lendo ainda está no dia 40 — o app bloqueia conteúdo de dia
  futuro por regra, e o feed não pode ser a porta dos fundos disso.
- **Versículo colado no post:** o app não pode exibir texto de tradução bíblica, **nem vindo de usuário**.
  Desenhe o que acontece quando alguém cola um.

**O que o feed obriga a existir** (detalhe e base legal em `00-DECISAO-FEED.md` — não é opcional, é o que
a Apple, o Google e a lei brasileira exigem):

- **Filtragem antes de aparecer.** Existe um estado entre "enviei" e "está no ar": desenhe "post em
  análise" (o que o autor vê), "post recusado" com motivo e caminho para contestar, e a fila de quem
  revisa. *Se o seu desenho depender de publicação instantânea, diga isso em voz alta, porque ela pode
  não ser possível.*
- **Denunciar, bloquear e apagar o próprio post** — visíveis e fáceis, e separados entre si.
- **O ciclo da denúncia:** recibo com prazo declarado, estado dela, aviso ao autor quando algo dele sai
  do ar com o motivo, e como contestar.
- **Regras da comunidade**, curtas, alcançáveis do feed e da tela de publicar, com aceite antes da
  primeira publicação.
- **Consentimento específico e destacado** para publicar sobre fé — convicção religiosa é dado sensível
  por lei. Não pode ser caixinha dentro de Termos. Desenhe também onde se revoga e o que a revogação faz
  com o que já está publicado.
- **Idade:** publicar exige conta, e conta é só para maiores de 18. Criança e adolescente usam o app
  inteiro mas não publicam — desenhe isso **sem humilhar e sem parecer punição**, e nada de botão que dá
  em beco.
- **Foto com outras pessoas:** aviso curto e sem sermão no momento de publicar, um motivo de denúncia
  "apareço nesta foto e não autorizei", e um caminho de retirada para quem **não tem o app**.
- **Exclusão:** a tela de excluir conta dizendo em texto o que acontece com os posts, mais uma ação
  separada "apagar tudo o que eu publiquei" — quem sai da igreja não necessariamente quer apagar a
  própria jornada. E seja honesto: o app não controla o que alguém já salvou em foto de tela.
- **Contato da igreja/desenvolvedor** alcançável de dentro do feed. A tela de Ajuda já existe.

## Direção visual

As cores da Lagoinha: **amarelo, azul e preto**. Fora isso, **você tem liberdade** — tipografia, forma,
ritmo, ilustração, movimento. Não se prenda ao que está lá hoje. Quero o melhor desenho possível para
este produto, nestas cores.

O que não é gosto:

- **O amarelo da marca (#FFD100) sobre branco mede 1,46:1.** É quase invisível. Por isso ele é
  preenchimento e realce, **nunca cor de texto** e nunca o único sinal de alguma coisa. Se propuser outro
  amarelo, meça de novo.
- **O azul é novo** — não existe no app hoje. Proponha o valor exato, nos dois temas, com o contraste
  medido contra cada superfície onde ele aparecer.
- **"Marcado" inverte com a superfície:** no tema claro é caixa preta com conteúdo amarelo; no escuro é
  caixa amarela com conteúdo preto. Nunca amarelo sobre branco. Se algum bloco for sempre preto ou sempre
  amarelo nos dois temas, diga isso explicitamente e diga qual cor o conteúdo dentro dele assume — porque
  ali o tema não vale.
- **Branco significa leitura; off-white quente significa gente.** É distinção de sentido, não de gosto.
  Se inverter, diga.
- **Tipografia:** em React Native o peso vem da **família**, não de um valor de peso. Hoje estão
  empacotadas Archivo (500, 600, 700, 800, 900) e Literata (400, 400 itálico, 600), ambas com licença
  aberta. Se trocar, diga exatamente quais famílias e **quais pesos**, com licença livre para empacotar —
  só existe o que for empacotado, e o app inteiro tem orçamento de 60 MB.
- **Movimento:** todo movimento tem que poder ser desligado sem perda de informação, porque o app
  respeita "Reduzir movimento" do sistema.
- **A pomba da Lagoinha existe** e é a marca. Ela acompanha o tema (preta no claro, branca no escuro),
  nunca é deformada, e hoje é um PNG — se o seu desenho a tingir por cor, eu preciso do vetor antes.
- **Os dois temas.** O app segue o tema do sistema. O escuro nunca foi desenhado de verdade, só deduzido
  — e da última vez que alguém deduziu, a marca sumiu. Se entregar só o claro, alguém vai deduzir de novo.

## Regras que o desenho não pode quebrar

A lista inteira, com o porquê de cada uma, está em `04-invariantes.md`. As que mais mandam no desenho:

1. **Nenhum texto de tradução bíblica na tela.** Nem no leitor, nem no feed, nem vindo de usuário.
2. **Nenhum nome de líder** enquanto a igreja não autorizar por escrito. A escala mostra o ministério.
3. **O texto da igreja não se reescreve.** Ênfase, motivos de oração, nomes dos montes e a orientação vêm
   como vieram. O que o **app** escreve (botões, rótulos, avisos) é seu para revisar.
4. **A faixa de aviso de conteúdo.** Enquanto a igreja não autorizar a publicação do material, toda tela
   de conteúdo carrega uma faixa: *"Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja
   para publicação. Não distribuir esta versão."* (versão compacta: *"Aguardando autorização da
   igreja."*). Ela é um **alerta** para leitor de tela, não decoração, cresce com a fonte e precisa de
   lugar no layout de oito telas — inclusive na home nova. Quando a autorização vier, ela some: o layout
   tem que funcionar **com e sem** ela.
5. **Funciona sem conta.** Abrir, ler, concluir, refletir, ver a jornada e o altar de hoje funcionam sem
   login e sem internet. **Muro de login na abertura é rejeição da Apple** (5.1.1(v)). Desenhe a nova
   home para três pessoas: sem conta e sem intenção de criar, com conta, e num build em que o servidor
   nem está configurado. *Se a sua resposta para a primeira for uma tela de login, a resposta está errada.*
6. **Offline.** Leitura, progresso, reflexão e jejum funcionam 100% sem internet; o feed **nunca**
   funciona offline, e o app **não detecta rede** hoje. Desenhe a primeira tela de modo que a parte que
   funciona offline apareça sem depender de rede, e diga o que a pessoa vê quando o feed não carrega mas
   o dia está lá.
7. **Alvo de toque nunca menor que 48pt**, com espaço entre eles. Este app é para dedo de idoso também.
8. **Toda caixa com texto cresce com a fonte do sistema.** O tamanho que você desenhar é piso, nunca
   teto. **Mas decida uma coisa e me diga:** o app promete acompanhar o tamanho do sistema sem limite
   (até 3,5×), ou admite um limite próprio e oferece o controle de tamanho que o leitor já tem? Hoje
   existem cinco tetos no código (leitor 1,8×, numeral do marco 1,2×, conta 1,8× e 1,6×, linhas da
   Jornada 2×) e o leitor diz na tela "texto segue o tamanho do sistema" mesmo assim — ou o texto muda,
   ou o teto muda.
9. **Permissão de notificação só sob gesto.** Nada de pedir numa tela de boas-vindas ou na abertura: o
   iOS só deixa pedir **uma vez na vida do app**. O pedido sai de um gesto da pessoa (escolher o horário,
   marcar o aviso do altar), e a recusa desliga a preferência em vez de prometer um aviso que não vem —
   desenhe esse estado.
10. **Números honestos.** Se o dado não existe, o app diz que não existe. Não desenhe um painel de
    participação da igreja que precise de número inventado para ficar bonito.
11. **O que é privado continua privado.** Reflexão, jejum e progresso são da pessoa. Nada vai para o feed
    sem ela mandar, e **a reflexão privada nunca vira rascunho de post**.

## O que eu quero receber

**Primeiro estas seis respostas.** Elas são o que já se sabe que está quebrado, e amplitude sem elas é
entrega bonita e inútil:

1. **O rodapé do leitor.** Acima de ~2,9× de fonte a palavra "Concluir" não cabe nem sozinha. Como ele se
   empilha, e a partir de que limiar exato?
2. **O tema escuro**, assumido de verdade, com os valores.
3. **Os sete blocos "ainda não disponível"** — os lugares onde o app não tem o dado da igreja e hoje
   mostra um vazio. Cada um do mesmo tamanho do bloco que teria número.
4. **Rótulos curtos o bastante** para o par de botões do Início (hoje "Ajustar lembrete" já quebra em
   duas linhas com fonte padrão) e para as três estatísticas do Dia 100.
5. **Uma palavra só para o altar e uma só para a Ênfase** — hoje o app usa três nomes para a mesma coisa.
6. **A marca em vetor**, se o seu desenho depender de tingi-la.

**Depois, o resto:**

7. **As telas**, com o feed e o dia resolvidos como um sistema, não como duas ideias soltas.
8. **Cada tela nos dois temas.**
9. **Cada tela em três tamanhos de letra**: padrão, 200% e 3,5×. É aí que o desenho mostra se sobrevive.
10. **Os estados, não só o caso feliz:** vazio, carregando, erro, sem internet, dia que ainda não abriu,
    antes da campanha começar, campanha encerrada, sem conta, post em análise, post recusado.
11. **Os valores, não só a imagem:** cores em hexadecimal nos dois temas, tamanhos de texto,
    espaçamentos, raios. Isso vira código direto.
12. **O que você mudou de propósito e por quê** — principalmente se contrariar alguma regra da lista
    acima. Aí a decisão volta para mim antes de virar código.

## Uma última coisa

Este app vai ser usado por gente que está passando por coisa séria — doença, luto, casamento em crise,
filho perdido. Alguém vai abrir ele às três da manhã sem conseguir dormir. O desenho pode ser alegre, mas
não pode ser fofo a ponto de soar leviano, e não pode fazer a pessoa se sentir pior por ter faltado três
dias.

Simples, bonito, e do lado de quem abre.
