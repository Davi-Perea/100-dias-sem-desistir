# Comunidade: regras, consentimento e avisos (RASCUNHO)

> **RASCUNHO PARA REVISÃO DE ADVOGADO. NÃO É PARECER JURÍDICO.**
> Foi escrito por Claude (engenharia do app), que não é advogado. Serve de ponto de partida para a igreja e o advogado
> adaptarem. Nenhum texto daqui pode ir para o app antes dessa revisão.
> É um **modelo interno**, sem marca nem formato de documento oficial de terceiros.

- **Data:** 2026-09-21
- **Vale para qual decisão:** a opção **recomendada** no memorando `docs/product/comunidade/00-DECISOES.md`:
  comunidade da **igreja inteira com código de entrada**, e conta **só para maiores de 18 anos** (para ler e publicar).
  **Essa opção ainda não foi decidida.** Se a decisão for outra (só o grupo, ou qualquer pessoa com o app), as partes
  2 e 3 deste arquivo precisam ser reescritas, porque o texto sobre quem vê muda.
- **Nada foi implementado.** Este arquivo não altera o app nem o desenho. Ele diz o que o desenho precisa trocar.
- **O que está entre colchetes** (`[ASSIM]`) é informação que só a igreja pode dar. Não inventei nome, CNPJ, endereço,
  e-mail nem prazo que dependa da escala de moderação.

## O que tem aqui

1. Regras da comunidade (a pessoa aceita antes de publicar pela primeira vez)
2. Texto do consentimento destacado (tela C4), reescrito para dizer a verdade sobre quem vê
3. A frase única sobre quem vê (igual em C3, C4 e B4)
4. Aviso ao autor quando uma publicação sai do ar
5. Campos para preencher
6. Perguntas para o advogado
7. Fontes

---

## Por que estes textos existem (resumo para quem não é técnico)

- **Fé é "dado sensível" pela lei.** A LGPD protege mais a convicção religiosa (art. 5º, II). Para publicar sobre fé, a
  única base legal que serve é o **consentimento específico e destacado** (art. 11, I). Por isso existe uma tela só
  para ele (C4). (FATO; fonte 1)
- **Se o texto enganar, o consentimento não vale.** A LGPD diz que o consentimento é nulo se a informação for enganosa
  ou pouco clara (art. 9º, §1º). (FATO; fonte 1)
- **O desenho atual diz duas coisas diferentes.** A tela de publicar (C3) diz "Vai aparecer para **toda a igreja**".
  A tela de consentimento (C4) diz "**Qualquer pessoa que baixar o app** vê a sua publicação". A tela de depois da
  leitura (B4) diz "qualquer pessoa com o app pode ler". Só uma delas pode ser verdade. Com a opção recomendada, a
  verdade é: **quem vê são as pessoas que entraram na comunidade com um código da igreja**. Não é "toda a igreja"
  (nem todo membro vai entrar, e um código pode vazar), e não é "qualquer pessoa que baixar o app" (sem código, não
  entra). (INFERÊNCIA; `00-DECISOES.md` §1)
- **O Google Play exige que a pessoa aceite as regras antes de publicar.** A política de conteúdo gerado por usuários
  pede que o app "exija que os usuários aceitem os termos de uso e/ou a política do usuário antes de poderem criar ou
  enviar conteúdo". (FATO; fonte 4, acesso 2026-09-21, tradução livre)
- **Quando algo sai do ar, a lei manda avisar o autor.** O ECA Digital (Lei 15.211/2025, art. 30) pede: avisar o autor,
  dizer o motivo, dizer se a análise foi feita por pessoa ou por programa, e permitir recurso com prazo. O art. 29 pede
  retirada imediata quando a vítima avisa que o conteúdo viola direito de criança ou adolescente. (FATO conforme
  `02-lei.md` §4 e §5, fontes 2 e 3, acesso 2026-09-21. **Nesta sessão o site do Planalto não respondeu**, então não
  reli o texto literal desses artigos hoje. O advogado deve conferir na fonte.)

---

## 1. Regras da comunidade

**Onde aparece:** numa tela própria, **antes da primeira publicação, comentário ou Amém**, logo antes do consentimento
(C4). A pessoa rola até o fim e toca em "Li e aceito as regras". Não tem botão de pular. As regras também ficam
disponíveis a qualquer momento pelo feed (C1) e pela tela de publicar (C3), num link "Regras da comunidade".

**Registrar:** versão das regras aceita, data e hora, por conta. Regras novas pedem novo aceite.

**Tom:** pastoral, curto, sem juridiquês. Abaixo, o texto proposto para o app.

---

### Regras da comunidade — versão [VERSÃO, ex. 1.0], de [DATA]

**Um lugar para a igreja ler junto.**
Aqui a gente conta o que Deus falou durante a leitura, ora uns pelos outros e se anima a não desistir. Tudo o que
você escreve aparece com o seu nome e a sua foto de perfil para as pessoas da igreja que entraram na comunidade com
um código. Algumas você não conhece. Escreva como escreveria para um irmão na porta do templo.

**O que cabe aqui**
- O que você aprendeu na leitura do dia.
- Pedidos de oração e agradecimentos.
- Palavras de ânimo para quem está lendo junto.
- Fotos suas, da sua Bíblia, do seu caderno, de um lugar. Com cuidado com quem aparece nelas (veja abaixo).

**Fotos de outras pessoas**
- Só publique o rosto de outra pessoa se ela concordou. Quem aparece numa foto da igreja tem a fé revelada para todos
  que veem, e ela pode não querer isso.
- Na dúvida, não publique, ou escolha uma foto sem rostos.

**Fotos de crianças e adolescentes**
- **Não publique foto em que dê para reconhecer uma criança ou um adolescente**, nem se for seu filho ou sua filha.
  `[DECISÃO PENDENTE: o memorando recomenda proibir toda criança identificável; se o fundador e o advogado decidirem
  permitir filho ou filha de quem publica, trocar esta frase.]`
- Também não escreva nome, escola, endereço ou rotina de uma criança.

**O que é tirado do ar**
- Ofensa, humilhação, deboche, ameaça ou perseguição a qualquer pessoa, inclusive de outra igreja ou outra fé.
- Discriminação por raça, cor, origem, sexo, deficiência, idade ou qualquer outra condição.
- Conteúdo sexual, nudez ou violência.
- Qualquer coisa que exponha, ameace ou prejudique uma criança ou um adolescente.
- Foto com rosto de alguém que não autorizou, quando essa pessoa pedir.
- Dados pessoais de outras pessoas (telefone, endereço, documentos, situação de saúde) sem autorização delas.
- Propaganda, venda, pedido de dinheiro, doação, rifa ou corrente.
- Campanha política ou partidária.
- Notícia falsa, golpe ou link suspeito.
- Texto, foto ou música de outra pessoa ou empresa sem permissão (inclusive textos de traduções da Bíblia protegidas
  por direitos autorais). `[ADVOGADO: confirmar se citar versículo curto de tradução protegida cabe aqui.]`
- Qualquer coisa que seja crime.

**Como funciona o cuidado com o que é publicado**
- **Fotos:** antes de aparecer, uma pessoa da equipe da igreja olha. Enquanto isso, a sua publicação fica "em análise"
  e só você a vê.
- **Textos e comentários:** um programa confere palavras ofensivas antes de aparecer. Se ele segurar o seu texto, uma
  pessoa da equipe olha em seguida.
- A equipe é formada por voluntários da igreja, treinados e com compromisso de sigilo.

**Se você vir algo errado**
- Toque em "···" na publicação ou no comentário e escolha **Denunciar**. Diga o motivo.
- Se for sobre **uma criança** ou se **você aparece numa foto sem ter autorizado**, escolha esse motivo: a publicação
  sai do ar na hora e depois alguém analisa.
- Você também pode **bloquear** uma pessoa. Você não vê mais o que ela publica, e ela não vê o que você publica.
- Quem não tem o app pode pedir a retirada pela página `[ENDEREÇO DA PÁGINA "RETIRAR CONTEÚDO"]` ou pelo e-mail
  `[E-MAIL PUBLICADO]`.
- A equipe responde às denúncias em até `[PRAZO QUE A ESCALA CUMPRE, ex. 24 h]`.
- Denunciar para prejudicar alguém de propósito também é contra as regras.

**Se tirarem o que você publicou**
- Você recebe um aviso no app dizendo o motivo, se foi uma pessoa ou o programa que decidiu, e como pedir revisão.
- Se achar que foi um engano, toque em **Pedir revisão** em até `[PRAZO PARA PEDIR, ex. 30 dias]`. Outra pessoa da
  equipe, diferente de quem decidiu, olha de novo e responde em até `[PRAZO DE RESPOSTA, ex. 72 h]`.
- Quem quebra as regras várias vezes, ou de forma grave, pode ter a participação na comunidade suspensa. Você é
  avisado e também pode pedir revisão.

**O que é seu continua seu**
- Você pode apagar qualquer publicação ou comentário seu, quando quiser.
- Você pode desistir de participar da comunidade em "Conta e privacidade". Aí tudo o que você publicou sai do ar.
- Você pode apagar a sua conta inteira pelo app ou pela página `[ENDEREÇO DA PÁGINA DE EXCLUSÃO]`.
- Sua leitura, seu jejum e a sua reflexão privada ficam no seu aparelho e nunca viram publicação.
- A comunidade fica aberta para publicar até `[DATA, ex. 31/12/2026]`, depois fica só para leitura e é apagada em
  `[DATA ANUNCIADA, ex. 31/01/2027]`. `[DECISÃO PENDENTE: memorando §4, item "Depois de 31/12".]`

**Em momentos difíceis**
Se você ou alguém está pensando em se machucar, procure ajuda agora: ligue **188** (CVV, gratuito, 24 horas). A equipe
da comunidade não substitui atendimento de emergência. `[CONFERIR: número e horário do CVV antes de publicar.]`

**Quem cuida desta comunidade**
`[RAZÃO SOCIAL DA ENTIDADE]`, CNPJ `[CNPJ]`. Contato: `[E-MAIL PUBLICADO]`. Encarregado de dados: `[NOME OU CANAL DO
ENCARREGADO]`. Estas regras seguem os Termos de Uso e a Política de Privacidade: `[LINKS]`.

Botão: **Li e aceito as regras**
Link secundário: **Agora não** (volta sem publicar; a pessoa pode guardar a reflexão só para ela)

---

### Notas para a igreja e o advogado sobre as regras

- As regras são **da igreja**. O texto acima é modelo; o memorando pede que a igreja as escreva e nomeie quem responde
  por elas (`00-DECISOES.md`, "O que a igreja precisa fornecer", item 6).
- O ECA Digital pede termos em português e com a classificação indicativa (Decreto 12.880, art. 12, §4º, segundo
  `02-lei.md` §4). Se isso vale também para as regras ou só para os Termos de Uso é pergunta para o advogado.
- Como a comunidade é só 18+, as regras não falam com crianças. A frase para quem tem menos de 18 anos continua a do
  memorando: "Aqui você acompanha a Jornada. A comunidade é para quem tem 18 anos ou mais."
- As regras **não substituem** o consentimento. São duas telas: aceitar as regras (o que pode e o que não pode) e
  consentir (autorizar o uso de um dado sensível). A LGPD não aceita consentimento genérico dentro de termos
  (art. 8º, §4º; fonte 1).

---

## 2. Consentimento destacado (tela C4, reescrita)

### O que muda em relação ao desenho atual

| No desenho (`TELAS.md` C4) | Problema | No rascunho |
|---|---|---|
| "Qualquer pessoa que baixar o app vê a sua publicação" | Contradiz C3 ("toda a igreja"); na opção recomendada é falso (sem código não entra) | Frase única de audiência (parte 3) |
| "Uma vez na vida, e depois nunca mais" | Texto novo exige novo pedido (LGPD art. 8º, §6º) | Com versão; pede de novo se o texto mudar |
| Não fala de nome e foto de perfil, comentário, Amém | Autorização precisa enumerar finalidades (art. 8º, §4º; art. 11, I) | Lista o que vai junto |
| Não diz que alguém da igreja olha as fotos | A pessoa precisa saber como funciona | Diz |
| Não diz o que acontece se desistir | Revogar deve ser fácil e o efeito, claro | Desistir = sai do ar |
| Não diz até quando fica visível | Faltava | Diz a data (campo) |
| Não fala de capturas de tela | Limite técnico real | Diz |
| Um botão para aceitar | Correto, desde que nada venha marcado | Botão explícito, nada pré-marcado |

### Texto proposto — versão [VERSÃO, ex. C4-1.0], de [DATA]

**Superfície:** a mesma do desenho (fixa, fundo tinta, texto branco). Não aparece junto com as regras; vem depois
delas, numa tela só sua.

**Título:** Antes da sua primeira publicação

**Abertura:**
O que você escrever aqui fala da sua fé. A lei brasileira trata isso como dado sensível e pede que a gente pergunte com
todas as letras, numa tela só para isso.

**Quem vê (frase única, parte 3):**
> Sua publicação aparece, com o seu nome e a sua foto de perfil, para as pessoas que entraram na comunidade da
> `[NOME DA IGREJA]` com um código da igreja — hoje cerca de `[N]` pessoas maiores de 18 anos. Algumas você não
> conhece.

**O que você autoriza** (itens com o marcador amarelo do desenho):
1. Mostrar o que você publicar (texto e foto), com o seu nome e a sua foto de perfil, para essas pessoas.
2. Mostrar os seus comentários do mesmo jeito. O seu Amém fica guardado, mas ninguém vê quem deu Amém nem quantos
   foram.
3. Uma pessoa da equipe da igreja olhar as suas fotos antes de aparecerem, e um programa conferir seus textos. A equipe
   também olha o que for denunciado.
4. Guardar tudo isso num servidor no Brasil, sob a responsabilidade de `[RAZÃO SOCIAL DA ENTIDADE]`.
   `[ENGENHARIA: confirmar a região do servidor quando ele existir; ADR-002 prevê São Paulo, ainda em PROPOSTA.]`

**O que não vai junto:**
Sua leitura, seu jejum e a sua reflexão privada continuam só no seu aparelho. Nada disso vira publicação.

**Até quando:**
Sua publicação fica visível até você apagar, ou até `[DATA EM QUE A COMUNIDADE É APAGADA, ex. 31/01/2027]`, o que vier
primeiro.

**Você pode mudar de ideia:**
- Apague qualquer publicação quando quiser.
- Em "Conta e privacidade", toque em "Deixar de participar da comunidade". Tudo o que você publicou sai do ar.
- Você pode apagar a sua conta inteira quando quiser.
- Uma coisa a gente não controla: alguém pode ter tirado uma captura de tela antes de você apagar.

**Mais detalhes:** Regras da comunidade · Política de Privacidade `[LINK]` · Contato: `[E-MAIL PUBLICADO]`

**Botão principal:** Concordo e quero publicar
**Link secundário:** Guardar só para mim (→ B5, nada é enviado)

### Regras de funcionamento que o texto pressupõe (para engenharia e desenho)

Estes pontos são condição para o texto acima ser verdade. Se algum não valer, o texto precisa mudar.

- Nada começa marcado. Sem tocar no botão, nada é publicado. (LGPD art. 8º; `02-lei.md` §1)
- Guardar no servidor: conta, versão do texto aceito, data e hora. (Ônus da prova é do controlador, art. 8º, §2º.)
- Texto novo de C4 → pedir de novo na próxima publicação. Tirar do desenho a frase "uma vez na vida, e depois nunca
  mais".
- "Deixar de participar da comunidade" existe em "Conta e privacidade", é tão fácil quanto aceitar e **realmente tira do
  ar** posts, comentários e Amém. (`02-lei.md` §6)
- Nome público escolhido pela pessoa, nunca derivado do e-mail. (`02-lei.md` §1, item 5)
- O servidor não entrega a ninguém quem deu Amém nem a contagem. (`02-lei.md` §1, tabela)
- Ler e publicar exigem conta 18+ e código válido. Se isso não for construído assim, a frase de audiência é falsa.
- A tela D4 ("4 de 7 já leram") sai da V1; se ficasse, o item "o que não vai junto" seria falso. (`00-DECISOES.md` §5)

---

## 3. A frase única sobre quem vê

**Esta frase precisa aparecer idêntica, palavra por palavra, em C3, C4 e B4.** Se uma tela disser uma coisa e outra
tela disser outra, o consentimento corre o risco de ser nulo (LGPD art. 9º, §1º).

> **Sua publicação aparece, com o seu nome e a sua foto de perfil, para as pessoas que entraram na comunidade da
> `[NOME DA IGREJA]` com um código da igreja — hoje cerca de `[N]` pessoas maiores de 18 anos. Algumas você não
> conhece.**

### Onde entra e o que sai

| Tela | Hoje no desenho | Trocar por |
|---|---|---|
| **C3** (Publicar), aviso permanente | "Vai aparecer para **toda a igreja**, com o seu nome e a sua foto." | A frase única |
| **C4** (Consentimento), item 1 | "Qualquer pessoa que baixar o app vê a sua publicação — inclusive quem você não conhece." | A frase única (em "Quem vê") |
| **B4** (Depois de concluir), texto abaixo do filete | "O que você escreve **para a igreja** qualquer pessoa com o app pode ler, inclusive quem você não conhece. O que você guarda **só para você** fica neste aparelho e nunca vira publicação." | A frase única + a segunda frase mantida: "O que você guarda **só para você** fica neste aparelho e nunca vira publicação." |

### Cuidados com a frase

- **Por que não "toda a igreja":** nem todo membro vai entrar, e um código vazado pode deixar entrar quem não é da
  igreja até ser cancelado. "Toda a igreja" promete um controle que o app não tem.
- **Por que não "qualquer pessoa com o app":** na opção recomendada, quem só baixou o app não lê o feed. Dizer que sim
  seria falso para o outro lado e assustaria sem motivo.
- **O número `[N]`:** o memorando pede número concreto ou definição exata. Sugestão: mostrar um número arredondado
  (ex. "cerca de 1.500") atualizado pelo servidor. Se o número mudar muito (por exemplo, dobrar), o advogado deve dizer
  se isso conta como mudança de informação que exige pedir o consentimento de novo (art. 8º, §6º). Alternativa mais
  simples: tirar o número e deixar só a definição ("as pessoas que entraram com um código da igreja"), que é exata.
- **O botão "Escrever para a igreja" em B4** também promete demais. Sugestão: "Escrever para a comunidade".
- **Se a opção de alcance mudar**, a frase muda junto (versões para "só o grupo" e "qualquer pessoa" estão em
  `00-DECISOES.md` §1).
- **Códigos vazados:** a igreja precisa de um procedimento escrito para cancelar códigos (`00-DECISOES.md` §1). É ele
  que mantém a frase verdadeira.

---

## 4. Aviso ao autor quando a publicação sai do ar

### O que a lei pede (resumo)

ECA Digital, art. 30 (conforme `02-lei.md` §4 e `04-moderacao.md`, acesso 2026-09-21; texto literal não relido hoje):
avisar o autor, informar o **motivo**, dizer se a análise foi **humana ou automatizada**, e permitir **recurso** de
fácil acesso, **com prazos definidos**. O art. 29 pede retirada imediata quando a vítima ou seus representantes
avisarem de violação a direito de criança ou adolescente, sem precisar de ordem judicial. O Marco Civil (art. 20) e o
Tema 987 do STF apontam na mesma direção (motivo, contestação, registro). **Advogado confirma a leitura.**

### Onde aparece

- Notificação dentro do app (sem push que chame de volta ao app com pressa; basta aparecer na aba Comunidade e em
  "Conta e privacidade" → "Minhas publicações").
- A própria publicação continua visível **só para o autor**, com a faixa "Fora do ar", até o fim do prazo de recurso.
- Cópia por e-mail para o endereço da conta. `[DECIDIR: e-mail é opcional; confirmar com o advogado se é exigido.]`

### Modelo 1 — saiu do ar por decisão de uma pessoa da equipe

**Título:** Sua publicação saiu do ar

Sua publicação de `[DATA]` (dia `[N]` da leitura) foi tirada da comunidade.

**Motivo:** `[MOTIVO, uma frase das regras, ex. "Aparece o rosto de uma criança". Nunca o nome de quem denunciou.]`
**Quem decidiu:** uma pessoa da equipe de cuidado da comunidade, depois de olhar a publicação.
**Quando:** `[DATA E HORA]`

Se você acha que foi um engano, pode pedir revisão até `[DATA LIMITE = data da remoção + PRAZO PARA PEDIR]`. Outra
pessoa da equipe, que não participou desta decisão, vai olhar de novo e responder em até `[PRAZO DE RESPOSTA, ex. 72
horas]`.

A sua publicação continua guardada, visível só para você, até a revisão terminar. Se você preferir, pode apagá-la
agora.

[Pedir revisão]   [Apagar publicação]   [Ler as regras]

Protocolo: `[NÚMERO]`

### Modelo 2 — foi segurada pelo programa (não chegou a aparecer)

**Título:** Sua publicação não foi publicada

O programa que confere as publicações segurou o seu texto de `[DATA]`.

**Motivo:** `[ex. "Tem palavras que as regras não permitem"]`
**Quem decidiu:** um programa automático. Ainda não foi uma pessoa.

Uma pessoa da equipe vai olhar em até `[PRAZO, ex. 24 h]`. Se ela liberar, a publicação aparece e você é avisado. Se
você acha que o programa errou, pode também pedir revisão agora.

[Pedir revisão]   [Editar e tentar de novo]   [Apagar]

Protocolo: `[NÚMERO]`

### Modelo 3 — saiu do ar na hora por denúncia prioritária (criança ou "apareço nesta foto")

**Título:** Sua publicação está fora do ar enquanto é analisada

Alguém avisou que a sua publicação de `[DATA]` `[mostra uma criança | mostra uma pessoa que não autorizou aparecer]`.
Nesses casos, por cuidado com quem aparece, a publicação sai do ar primeiro e depois uma pessoa da equipe analisa.

**Quem decidiu, até agora:** o sistema, automaticamente, por causa do tipo de denúncia. Ninguém ainda concluiu que você
errou.

Uma pessoa da equipe vai analisar em até `[PRAZO, ex. 12 h]` e você recebe o resultado aqui. Se você tem a
autorização da pessoa que aparece, ou se ela é você, conte ao pedir revisão.

[Pedir revisão]   [Apagar publicação]

Protocolo: `[NÚMERO]`

### Modelo 4 — resultado da revisão

**Voltou:** "Revisamos a sua publicação e ela voltou para a comunidade. Obrigado pela paciência." Quem revisou: uma
pessoa da equipe.

**Não voltou:** "Revisamos a sua publicação e ela continua fora do ar. Motivo: `[MOTIVO]`. Quem revisou: uma pessoa da
equipe, diferente de quem decidiu da primeira vez. Esta foi a revisão final dentro do app. Se ainda tiver dúvida, fale
com `[E-MAIL PUBLICADO]`." `[ADVOGADO: confirmar se precisa informar outros caminhos, ex. ANPD, e em que casos.]`

### Regras para quem escreve o motivo (equipe de moderação)

- Uma frase, tirada das regras. Sem julgamento da pessoa ("você é..."), sem versículo como repreensão.
- **Nunca** revelar quem denunciou (a lei veda denúncia anônima para o art. 29, mas isso é para a equipe saber quem
  avisou, não para contar ao autor). `[ADVOGADO: confirmar.]`
- Em caso de **abuso sexual infantil**, não usar estes modelos: seguir o protocolo escrito pelo advogado (remover,
  preservar, comunicar à Polícia Federal — ECA Digital art. 27, conforme `02-lei.md`). O aviso ao autor, nesse caso,
  é decisão jurídica.
- Registrar sempre: o que saiu, por quê, quem ou o que decidiu, quando, o aviso enviado, o recurso e o resultado.

### Prazos sugeridos (RECOMENDAÇÃO de `04-moderacao.md` §6.1; a igreja confirma com base na escala real)

| Situação | Prazo-alvo | Prazo máximo |
|---|---|---|
| Denúncia de criança ou "apareço nesta foto" | Sai do ar na hora; análise na próxima janela | 12 h |
| Texto segurado pelo filtro | ≤ 8 h | 24 h |
| Denúncia comum | ≤ 12 h | 24 h |
| Resposta ao pedido de revisão | ≤ 48 h | 72 h |
| Prazo para o autor pedir revisão | — | `[DEFINIR COM O ADVOGADO, ex. 30 dias]` |

Prometer só o que a escala cumpre. Prometer 24 h e cumprir 72 h é pior do que prometer 48 h e cumprir 12 h.

---

## 5. Campos para preencher

| Campo | Quem fornece |
|---|---|
| `[NOME DA IGREJA]` como vai aparecer para as pessoas | Igreja |
| `[RAZÃO SOCIAL DA ENTIDADE]` e `[CNPJ]` (controladora) | Igreja |
| `[NOME OU CANAL DO ENCARREGADO]` | Igreja |
| `[E-MAIL PUBLICADO]` lido todo dia | Igreja |
| `[ENDEREÇO DA PÁGINA "RETIRAR CONTEÚDO"]` e `[ENDEREÇO DA PÁGINA DE EXCLUSÃO]` | Igreja + engenharia |
| `[LINKS]` dos Termos de Uso e da Política de Privacidade | Advogado |
| `[N]` pessoas na comunidade (ou decisão de não mostrar número) | Fundador + advogado |
| `[PRAZO QUE A ESCALA CUMPRE]` (denúncia), `[PRAZO DE RESPOSTA]` (revisão), `[PRAZO PARA PEDIR]` revisão | Igreja + advogado |
| `[DATA]` de fim da publicação e `[DATA ANUNCIADA]` de apagamento | Fundador |
| Decisão sobre foto de filho ou filha de quem publica | Fundador + advogado |
| `[VERSÃO]` e `[DATA]` das regras e do consentimento | Engenharia, depois da revisão |
| Confirmação do CVV (188) | Igreja |

---

## 6. Perguntas para o advogado

1. O texto de C4 cumpre "específico e destacado" (LGPD art. 11, I) e evita a nulidade do art. 9º, §1º?
2. A frase de audiência com número aproximado é suficiente? Mudança grande no número exige novo consentimento?
3. Revogar o consentimento deve despublicar tudo (nossa leitura)? Por quanto tempo guardar o registro do consentimento e
   do conteúdo removido sob recurso?
4. Os modelos de aviso cumprem o art. 30 do ECA Digital? Qual prazo para pedir revisão é razoável?
5. Foto de filho ou filha de quem publica: proibir sempre ou permitir? Com que cuidado?
6. As regras devem ter a classificação indicativa (Decreto 12.880, art. 12, §4º) ou isso fica só nos Termos?
7. Suspensão por abuso de denúncia e por reincidência: que devido processo mínimo (ECA Digital arts. 32–33)?
8. Protocolo de abuso sexual infantil: redação e responsável.
9. Precisa informar outros caminhos (ANPD, Justiça) no aviso final da revisão?

---

## 7. Fontes

Acesso em 2026-09-21, salvo indicação.

1. LGPD — Lei 13.709/2018 (arts. 5º, II; 8º; 9º; 11; 18; 19): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
   (via `docs/product/comunidade/02-lei.md`)
2. ECA Digital — Lei 15.211/2025 (arts. 27, 29, 30, 32–33): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm
   (via `02-lei.md`; **tentativa de releitura nesta sessão falhou por erro de conexão**)
3. Decreto 12.880/2026 (art. 12, §4º): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm (via `02-lei.md`)
4. Google Play — Política de conteúdo gerado pelo usuário (aceite dos termos antes de criar ou enviar conteúdo):
   https://support.google.com/googleplay/android-developer/answer/9876937 (consultada diretamente nesta sessão)
5. Apple — App Store Review Guidelines, 1.2 (filtro, denúncia, bloqueio, contato): https://developer.apple.com/app-store/review/guidelines/ (via `00-DECISOES.md`)
6. Marco Civil da Internet — Lei 12.965/2014 (art. 20) e STF Tema 987: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm ·
   https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=987 (via `02-lei.md`)
7. Documentos internos: `docs/product/comunidade/00-DECISOES.md`, `02-lei.md`, `04-moderacao.md` §6.1,
   `design_handoff_100_dias/TELAS.md` (B4, C3, C4, C5), `docs/technical/MOBILE_STORE_REQUIREMENTS.md` §6.

**Não confirmado neste rascunho:** o texto literal dos arts. 29 e 30 do ECA Digital (não relido hoje); o número e o
horário do CVV; a região final do servidor; se as regras precisam trazer a classificação indicativa.
