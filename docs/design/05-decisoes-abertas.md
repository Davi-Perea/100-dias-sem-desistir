# Decisões de desenho em aberto

> Parte do pacote de design. Índice em [README.md](README.md).
> Levantado do código em 2026-09-20; a fonte da verdade continua sendo o repositório.

---

> Preparado em 2026-09-20 para um designer externo que **não** tem acesso ao repositório. Tudo o que é
> necessário para entender cada item está escrito aqui; nenhum item foi inventado — cada um traz a seção do
> documento de onde saiu. Onde o documento é vago, está escrito que é vago.
>
> **Nada neste documento está aprovado.** As decisões de produto/estética pertencem ao Product Brain
> (ChatGPT) e ao fundador (Davi); as decisões que dependem da igreja estão marcadas como tal.

---

## 0. Contexto mínimo para decidir qualquer coisa abaixo

| # | Fato | Fonte |
|---|---|---|
| 0.1 | A aparência do produto vem de um handoff chamado **"100 Dias — Lagoinha"**, que especifica **somente o tema claro**. O aplicativo tem tema claro **e** escuro; o escuro foi derivado por engenharia da tela 11 do próprio handoff (Dia 100: fundo `#111111`, amarelo e branco). | DESIGN_IMPLEMENTATION §2.2 |
| 0.2 | A meta de acessibilidade é texto até **200%** do tamanho do sistema. O teto real de escala de fonte deste build não é 3,12× (razão de corpo do iOS) e sim **3,571×** (tabela do `RCTAccessibilityManager` do React Native). As contas e os testes usam 3,571×. | EXECUTION_04 §1.12, §1.13 |
| 0.3 | Regra de tokens já escrita no código depois da última rodada: **o tamanho do handoff é piso, nunca teto.** Toda caixa com texto cede ao texto (altura mínima + respiro vertical, nunca altura fixa) e todo número que reserva espaço para uma dessas caixas é **medido** em tempo de execução, nunca uma constante. | EXECUTION_04 §1.10 |
| 0.4 | **Nenhum teste deste projeto pode afirmar que um texto caber.** O ambiente de teste não roda o motor de layout nem mede glifos: os números de transbordo são aritmética sobre as fontes empacotadas. A prova de layout é aparelho real com o maior tamanho de acessibilidade ligado (AX5) — **e ela ainda não foi feita**. Também não há Mac nem SDK Android nesta máquina: vidro da barra de abas (iOS) e superfície elevada (Android) só foram vistos no navegador. | EXECUTION_04 §1.13; DESIGN_IMPLEMENTATION §6.2 |
| 0.5 | O conteúdo real da campanha impõe **11 a 12 capítulos por dia** (~30–40 min de leitura). O documento chama isso de "risco de produto número um". O handoff foi desenhado para "7 capítulos · ~18 min". | PLANO §0.8, §1.1, §1.2, §3.3 |

**Constantes exatas, lidas do código, que os itens abaixo citam** (`mobile/src/ui/theme.ts`):
`spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }` ·
`radius = { sm: 8, button: 14, buttonLg: 16, block: 20, blockLg: 22, card: 24, sheet: 28, pill: 999 }` ·
`gutter = { screen: 26, block: 20, sheet: 14 }` · `MIN_TOUCH = 48` · `BUTTON_HEIGHT = 56` ·
`TAB_BAR_HEIGHT = 86` · `MAX_CONTENT_WIDTH = 640` · amarelo da marca `#FFD100`.

---

# A) DECISÕES DE DESENHO EM ABERTO

Quatro famílias. A coluna "quem decide" separa o que é estética/produto do que é resposta da igreja.

| ID | Item | Família | Quem decide | Fonte |
|---|---|---|---|---|
| A1 | Rodapé do leitor acima de ~2,9× de fonte | caixa que estoura | desenho | EXECUTION_04 §1.14 |
| A2 | Rótulos do Início que já quebram em duas linhas com fonte padrão | caixa que estoura | desenho/cópia | EXECUTION_04 §1.14 |
| A3 | Empilhar ou não as três estatísticas do Dia 100 | caixa que estoura | desenho | EXECUTION_04 §1.14 |
| A4 | A frase "texto segue o tamanho do sistema" × o teto de 1,8× do leitor | promessa falsa | desenho/produto | EXECUTION_04 §1.14 |
| A5 | O teto de 2× da lista da Jornada | dívida assumida | desenho + código | EXECUTION_04 §1.14 |
| A6 | Tema escuro que o handoff nunca desenhou | lacuna do handoff | desenho | DESIGN_IMPLEMENTATION §2.2 |
| A7 | Borda do círculo não marcado: `#A9A69E` → `#8A877F` | desvio do handoff | desenho | DESIGN_IMPLEMENTATION §2.1 |
| A8 | Regra de compressão da linha da Jornada (reticências) | lacuna do handoff | desenho | DESIGN_IMPLEMENTATION §2.3 |
| A9 | Oito lugares onde o handoff mostra número coletivo que não existe | tela sem dado | desenho + produto | DESIGN_IMPLEMENTATION §4; PLANO §3.2, §5 #7 |
| A10 | SVG oficial da marca e ícone final | ativo faltando | desenho | DESIGN_IMPLEMENTATION §6.1; PLANO §4 (A4) |
| A11 | Jejum existe nesta campanha? | escopo | **igreja** | PLANO §0.9, §1.2, §3.4 (5); EXECUTION_04 §3 (grupo G) |
| A12 | Qual tradução bíblica | escopo do leitor | **igreja** | PLANO §3.3, §3.4 (4); EXECUTION_04 §1.1 |
| A13 | Nomes de líderes aparecem ou só o ministério | conteúdo na tela | **igreja** | PLANO §1, §3.4 (3); EXECUTION_04 §1.3 |
| A14 | Nome do app, uso da marca "Lagoinha", ícone, splash | identidade | **igreja** | PLANO §3.4 (2), §4 (A4) |
| A15 | Seis ideias com superfície visual, todas HIPÓTESE pendentes do Product Brain | escopo | Product Brain | PLANO §5 |
| A16 | V1 sem conta (ratificação pendente) | escopo | Product Brain | PLANO §0.6, §3.2, §7 |

---

## Família 1 — caixas que só se resolvem com desenho (dívidas assumidas na última rodada)

Contexto: a rodada anterior corrigiu, em todo o app, caixas de altura fixa com texto dentro. Quatro pontas
ficaram de fora **de propósito**, porque a correção deles é escolha de forma, não de código.

### A1. Rodapé do leitor acima de ~2,9× de fonte
**Problema.** O rodapé do leitor é a caixa mais apertada do aplicativo: acima de ~2,9× do tamanho de fonte,
a palavra do botão principal não cabe nem sozinha. Isso é transbordo **horizontal**, e nenhuma altura mínima
resolve transbordo horizontal.
**Por que é desenho.** O documento diz literalmente: "Empilhar o rodapé é decisão de desenho"
(EXECUTION_04 §1.14). O código só pode obedecer a uma forma; escolher qual forma o rodapé assume quando o
texto não cabe na largura é composição.
**Como o rodapé é hoje** (lido do código, `mobile/src/app/reader/[day].tsx`): rodapé fixo no rodapé da tela,
com filete no topo, respiro lateral de 24 e respiro inferior = área segura + 12. Dentro dele, duas linhas:
1. uma linha horizontal com **um quadrado de 56 de largura** (seta "capítulo anterior", borda de 2, raio 14,
   e opacidade 0,35 quando desabilitado no primeiro capítulo) + respiro de 12 + **um botão que ocupa o resto
   da largura**, rotulado **"Próximo capítulo"** (com seta) ou, no último capítulo, **"Concluir leitura"**
   (com ícone de check) ou **"Voltar"** quando o dia já está concluído;
2. abaixo, um botão de texto sublinhado: **"Prefiro ler na minha Bíblia"**.
**Opções conhecidas.** (i) empilhar o rodapé acima de um limiar de escala — o documento nomeia esta como a
decisão pendente; (ii) encurtar o rótulo; (iii) manter como está e aceitar o transbordo acima de ~2,9×.
Nenhuma foi escolhida. O limiar, se existir, precisa ser dito em número.

### A2. Rótulos do Início que já quebram em duas linhas com **fonte padrão**
**Problema.** A revisão registra, como item de produto e não de código, "encurtar os rótulos de `index.tsx`
(que já quebram em duas linhas com fonte padrão)" — isto é, a quebra não espera acessibilidade, acontece no
tamanho normal. O documento **não diz quais** rótulos são.
**Por que é desenho.** Encurtar um rótulo é reescrever o produto para o leitor; o código não pode escolher
palavra.
**Candidatos lidos do código** (tela Início, `mobile/src/app/(tabs)/index.tsx`) — **AMBÍGUO**, o documento não
confirma quais: o par lado a lado **"Ajustar lembrete"** + **"Entrar no grupo"** (dois botões contornados
dividindo a largura, um respiro de 12 entre eles) e o botão **"Intercessão do dia"**.
**Opções conhecidas.** Encurtar os rótulos; ou trocar o par lado a lado por uma pilha; ou aceitar duas linhas
como forma legítima (a caixa hoje cresce com o texto, então duas linhas não cortam nada — é estética).

### A3. As três estatísticas do Dia 100
**Problema.** A tela de chegada (Dia 100) mostra três números em linha: **"dias lidos"**, **"reflexões"** e
**"dias de jejum"** (rótulos exatos, lidos do código). A rodada anterior fez a linha quebrar para não jogar
"dias de jejum" fora da tela; o que ficou em aberto é "empilhar ou não as estatísticas do Dia 100 acima de um
limiar".
**Por que é desenho.** Existem duas formas honestas (três colunas que quebram, ou uma pilha); qual delas é a
tela de chegada da campanha é escolha de composição, e envolve o numeral grande "100" que divide espaço com
elas.
**Opções conhecidas.** (i) empilhar acima de um limiar de escala — e então o limiar precisa ser dito;
(ii) manter a quebra atual em todos os tamanhos. Observação: o terceiro número depende de A11 (se não houver
jejum na campanha, sobram dois).

### A4. "texto segue o tamanho do sistema" — uma frase que hoje é falsa
**Problema.** O corpo de texto do leitor está **capado em 1,8×** do tamanho do sistema (confirmado no código:
`maxFontSizeMultiplier={1.8}` no parágrafo do leitor), e o próprio leitor exibe a linha
**"{sigla da tradução} · texto segue o tamanho do sistema"**. Acima de 1,8× a frase mente.
**Por que é desenho/produto.** São duas saídas mutuamente exclusivas e as duas mudam a experiência: subir/
remover o teto (o texto passa a crescer sem limite, e aí o leitor precisa aguentar) ou mudar a frase (o
produto passa a admitir que tem um limite próprio de tamanho). O código não escolhe qual promessa o produto faz.
**Confirmado no código, além do que o documento cita:** a mesma promessa aparece em dois outros lugares —
na folha "Tamanho do texto" do leitor ("O texto também acompanha o tamanho de fonte do seu aparelho.") e na
tela Aparência e acessibilidade ("O texto também acompanha o tamanho de fonte definido no seu aparelho.").
A decisão precisa valer para os três.
**Opções conhecidas.** (i) subir ou remover o teto de 1,8×; (ii) reescrever as frases; (iii) manter o teto e
oferecer, em vez da promessa, o controle próprio de tamanho que o leitor já tem (botões Diminuir/Aumentar,
faixa de 14 a 30).

### A5. O teto de 2× da lista da Jornada — dívida assumida
**Problema.** As linhas da lista da Jornada param de crescer em 2× de fonte, enquanto o texto continua
crescendo acima disso. A revisão explica por que não basta subir o teto: a altura da linha multiplica
constantes em vez de contar linhas, então subir o teto troca o sinal do erro em vez de eliminá-lo — e, com o
desvio sempre negativo, a lista rola **de menos** e o dia da igreja fica **abaixo** da dobra, nunca acima
("erro de sinal único é corrigível; de sinal misto, não").
**Por que entra aqui.** **AMBÍGUO:** a revisão registra isto como dívida técnica assumida e **não** o manda
ao desenho. Está nesta lista porque a consequência é visual (acima de 2×, o texto cresce e a linha não) e
porque qualquer conserto passa por decidir o que a linha mostra quando não cabe — quantas linhas, o que é
truncado. Se o designer não quiser opinar, o item volta a ser só dívida técnica.
**Opções conhecidas.** As que o documento descreve: manter o teto de 2× (situação atual) ou reescrever a
altura para **contar linhas** em vez de multiplicar constantes, o que exige dizer quantas linhas cada tipo
de linha da Jornada pode ter.

---

## Família 2 — o handoff não decidiu (ou foi contrariado por acessibilidade)

### A6. Tema escuro
**Problema.** O handoff especifica uma aparência clara. O aplicativo já oferecia tema escuro e removê-lo
seria regressão para quem depende dele, então engenharia **derivou** o escuro da tela 11 do próprio handoff:
tinta e amarelo trocam de papel com a superfície, mantendo as relações de marca.
**Por que é desenho.** Metade da aparência do produto hoje não passou por designer nenhum. Cada decisão
tomada no escuro foi feita por dedução a partir de uma única tela.
**O que existe hoje, exato** (`theme.ts`): marca `#FFD100`; par de "marcado" — claro `markSurface #111111`
com conteúdo `#FFD100`, escuro `markSurface #FFD100` com conteúdo `#111111` (12,9:1 nos dois sentidos);
par de alerta — claro `#111111`/`#FFFFFF`, escuro `#6B6A63`/`#FFFFFF` (3,5:1 da faixa contra a página, 5,4:1
no texto, 3,7:1 no ponto amarelo); fundo do leitor `#FFFFFF` no claro e `#111111` no escuro.
**Opções conhecidas.** (i) o designer assume e especifica o tema escuro; (ii) ratifica o derivado como está;
(iii) remover o tema escuro — descartado no documento como regressão.

### A7. Borda do círculo não marcado — desvio já aplicado, sem ratificação
**Problema.** O handoff pede `#A9A69E` no contorno da opção não marcada (telas 01b e 01c). Medido pela
fórmula da WCAG 2.1, isso dá **2,43:1** sobre branco, abaixo do mínimo de **3:1** para limite de controle
(WCAG 1.4.11) — e o próprio handoff exige contraste acessível.
**Por que é desenho.** Engenharia escolheu um substituto (`#8A877F`, o tom mais próximo que passa sobre
branco **e** sobre os off-whites quentes: 3,6:1 e 3,1:1, mantendo o mesmo cinza quente; no tema escuro o
token equivalente é `#8A857C`). Escolher o cinza do produto é do designer, não de quem calculou o contraste.
**Opções conhecidas.** Ratificar `#8A877F`; indicar outro tom que passe de 3:1 nas duas superfícies;
ou mudar a forma do controle para não depender só da borda.

### A8. Regra de compressão da linha da Jornada
**Problema.** O handoff comprime "trechos longos entre marcos" com reticências, **sem definir a regra**.
A regra em uso foi escrita por engenharia: ficam visíveis o dia de hoje e três dias para cada lado, todos os
marcos, as duas pontas e **todo dia em aberto**; o resto vira uma reticência clicável que expande a linha
inteira.
**Por que é desenho.** É a densidade de uma lista de 100 itens — quantos dias a pessoa vê de uma vez, e o
que o app considera digno de nunca ser escondido. Qualquer regra funciona tecnicamente.
**Opções conhecidas.** Ratificar a regra atual; mudar a janela (hoje ±3); mudar o que é inescondível;
ou trocar a reticência por outro mecanismo. Observação de acoplamento: a altura da reticência é fixa e é ela
que garante o sinal único do erro descrito em A5.

### A10. SVG oficial da marca e ícone final
**Problema.** A marca no app são **PNGs** extraídos do arquivo do cliente pelo próprio time de design, que
pede explicitamente a substituição pelo vetor. Em produção a marca precisa ser nítida em qualquer escala e
**tingível por código** (ela troca de cor entre os temas — ver A6).
**Por que é desenho.** É entrega de ativo, e vem junto com decisões de identidade: ícone final da loja e
splash na paleta do handoff.
**Opções conhecidas.** Nenhuma alternativa registrada — o documento trata como pendência a cumprir
("trocar é mudança de asset, não de layout"). Depende de A14 (nome e marca).

---

## Família 3 — telas que mostram o que o produto não tem

### A9. Os números coletivos do handoff não têm fonte
**Problema.** As telas 02 (Início), 06 (Juntos), 07 (Grupo), 10 e 11 (Marcos) do handoff trazem números
coletivos concretos: "1.812 pessoas já leram hoje", "64% da igreja", insights, reações "Amém", ferramentas de
publicação do líder. **Nenhum desses dados tem fonte hoje** — feed, insights, reações e progresso coletivo
estão fora de escopo, e a recomendação vigente é lançar **sem conta** na V1.
**Por que é desenho.** A decisão tomada por engenharia foi "manter a estrutura da tela e substituir o número
por um estado honesto de indisponível", porque mostrar o número do protótipo seria apresentar dado inventado
como real. Isso deixa oito lugares com um estado que nenhum designer desenhou — e a alternativa legítima
(remover o módulo da tela em vez de mostrá-lo vazio) é escolha de composição.
**Onde está hoje, exato** (DESIGN_IMPLEMENTATION §4):

| Onde | O que aparece hoje |
|---|---|
| Início, linha coletiva | "Progresso da igreja" + o motivo da indisponibilidade |
| Juntos, número de 52px | Bloco de progresso da igreja com o mesmo motivo |
| Juntos, recado fixado | Bloco preto com a marca, dizendo que ainda não há recado publicado |
| Juntos e Grupo, insights | Explicação de que insights ainda não estão disponíveis |
| Grupo, barra de progresso | Contagem real de membros; sem "41 de 64 hoje" |
| Grupo, folha de líder | As quatro linhas do handoff, **desativadas**, com o motivo à vista |
| Reflexão, "Compartilhar um insight" | Botão contornado **desativado**, com a regra de privacidade ao lado |
| Dia 100, três números | Dados **reais** e locais: dias lidos, reflexões, dias de jejum (ver A3) |

**Opções conhecidas.** (i) desenhar o estado "indisponível" para os sete primeiros; (ii) remover os módulos
da V1 e reintroduzi-los quando houver agregação; (iii) a hipótese registrada de um **contador anônimo de
conclusões do dia** ("N pessoas concluíram hoje", sem identificador), que o plano coloca na segunda
atualização e sujeita ao Product Brain (PLANO §3.2 alternativa (c) e §5 #7). O plano rejeita explicitamente
"números coletivos simulados".

### A15. Seis ideias com superfície visual, todas HIPÓTESE
**Problema.** O plano lista dez ideias ordenadas por valor ÷ custo e diz, no cabeçalho da seção, que são
**todas HIPÓTESE e nenhuma entra sem aprovação do Product Brain**. Seis delas criam ou mudam tela.
**Por que é desenho.** São escopo de produto: cada uma é uma superfície nova para desenhar (ou não).
| # | Ideia | Opinião registrada no plano |
|---|---|---|
| 3 | **Leitura em partes** + retomada por capítulo ("faltam 5 capítulos") — ataca o risco dos 12 capítulos/dia | "Fazer na V1" |
| 4 | **Áudio da leitura** (streaming; player, áudio em segundo plano, licença) | "Verificar termos; segunda atualização se fechar" |
| 5 | **Cartão do dia** para compartilhar (Dia N · Monte · versículo · ênfase; imagem para WhatsApp/Stories) | "V1 se sobrar um dia; senão, segunda" |
| 7 | **Contador anônimo de conclusões** | "Segunda atualização, com o Product Brain" (ver A9) |
| 8 | **Widget** de tela inicial ("Dia 17 · Governo · Gn 37–48") | "Depois" |
| 9 | **Carta para 2027** no Dia 100 (31/12), reflexão privada com prompt especial | "Segunda atualização; decisão de produto" |
**AMBÍGUO:** o leitor **já** navega capítulo a capítulo e mostra "Dia N · capítulo X de Y" com barra de
progresso (lido do código), mas os documentos não dizem se a ideia #3 foi aprovada nem o que "leitura em
partes" deveria ser além disso.
As duas ideias que o plano manda fazer na V1 e que já existem no app — **Modo altar** (o guia do dia em cinco
passos, tela cheia, tipo grande, tela acesa) e **Meu ministério** — continuam, formalmente, pendentes de
ratificação do Product Brain (PLANO §7(d)).

### A16. V1 sem conta — ratificação pendente
**Problema.** A recomendação do plano é lançar **sem conta**: tudo o que a pessoa precisa nos 100 dias
(leitura, direção, progresso, reflexão, lembretes, altar de hoje, meu ministério) funciona local, e conta/
grupos/progresso coletivo entram numa segunda atualização. A ratificação está pedida ao Product Brain e não
veio.
**Por que é desenho.** Se a V1 não tem conta, telas inteiras do handoff mudam de natureza: Juntos e Grupo
perdem o eixo social (ver A9), e o produto não tem entrada de login, perfil nem convite. Desenhar as duas
versões é retrabalho garantido.
**Opções conhecidas** (PLANO §3.2): (a) conta opcional já na V1; (b) sem conta, conta depois — recomendada;
(c) sem conta + contador anônimo.

---

## Família 4 — decisões da igreja que mudam o que aparece na tela

Não são estéticas, mas nenhuma pode ser resolvida no código e todas mudam tela. O plano marca as três
primeiras como bloqueadoras da loja.

### A11. Jejum existe nesta campanha?
**Problema.** O spec assumiu um "propósito de jejum", mas o material real da igreja fala em consagração,
oração, Palavra e adoração e **não menciona jejum**. Se não existe, "o passo sai do onboarding e a linha some
do Início" — e a terceira estatística do Dia 100 também (ver A3).
**Por que não é técnica.** É a existência ou não de uma prática na campanha; só a igreja responde. Enquanto
não responde, o app afirma na tela algo que o material não sustenta (ver defeito **G** na parte B).
**Opções conhecidas.** Confirmar e manter (onboarding 01c, linha no Início, tela `/jejum`, contagem no Dia
100); ou remover essas quatro superfícies; ou renomear para o vocabulário do material (consagração).

### A12. Qual tradução bíblica
**Problema.** O material da igreja só traz **referências**, nunca texto bíblico, e o app hoje não exibe
tradução nenhuma. Duas perguntas em aberto: qual tradução a igreja lê no altar (define o link padrão para
fora) e se ela aceita uma das traduções abertas no leitor (Bíblia Livre, CC BY; ou Nova Bíblia Viva 2007
"ONBV", CC BY-SA 4.0). Há ainda uma citação única e atribuída de Levítico 6:13 na página "Sobre o propósito",
vinda da carta da igreja, cuja **tradução é desconhecida** — a igreja precisa informar qual é para a
atribuição ficar completa.
**Por que não é técnica.** É licença e é a Bíblia que a comunidade usa; nenhum código decide.
**Opções conhecidas** (PLANO §3.3): (a) tradução aberta empacotada, offline; (b) sem texto no app, só
"Abrir no YouVersion" + "Li na minha Bíblia"; (c) (a) + link por capítulo + retomada por capítulo + leitura em
partes + áudio — recomendada, em duas etapas. Efeito de tela: a linha de atribuição do leitor (a sigla que
aparece antes de "texto segue o tamanho do sistema", ver A4) e o rótulo do link externo.

### A13. Nomes de líderes na tela
**Problema.** A escala do altar tem ministério **e** nomes de líderes. Hoje os nomes **não** são embarcados no
pacote nem exibidos: a autorização da igreja cobre (ou cobrirá) guia e escala, e os nomes precisam de
autorização separada.
**Por que não é técnica.** É consentimento de terceiros sobre dado pessoal; a decisão é da igreja.
**Efeito de tela, exato** (lido do código): três lugares mostram a linha do altar e acrescentam
"· {nomes}" **só** quando autorizado — Início ("Altar das 12h30"), Juntos (bloco "Altar das 12h30", com
"Hoje conduz: {ministério}") e a tela do Dia ("Altar das 12h30 · conduz: {ministério}").
**Opções conhecidas.** Só o nome do ministério (situação atual) ou ministério + nomes.

### A14. Nome do app, marca e identidade da loja
**Problema.** Não existe nome definitivo, identificador nem ícone final. A sugestão registrada é o nome
"100 Dias" (com ou sem "Lagoinha" — o uso da marca precisa de autorização escrita) e identificadores sem a
marca, porque identificador não muda depois.
**Por que não é técnica.** É marca e é jurídico. Só com isso fechado é que A10 (SVG, ícone, splash) pode
existir.
**Opções conhecidas.** As duas do plano: com marca (depende de autorização) ou sem.

---

# B) DEFEITOS ABERTOS QUE AFETAM A INTERFACE

Do total de 48 achados confirmados na revisão adversarial, os grupos A, H, C, D e B foram corrigidos.
Continuam abertos os grupos **E, F, G, I** e, antes deles, o **passe de acessibilidade** que a auditoria de
Dynamic Type abriu e que ainda não foi feito (EXECUTION_04 §3).

**Ordem recomendada pela própria revisão:** primeiro o passe de acessibilidade; depois **E + F como um único
passe de cópia e acessibilidade**; **G** quando a igreja responder; **I** por último.

## B0. Passe de acessibilidade ainda não feito (aberto pela auditoria do grupo B, §3)

Seis itens. Todos foram conferidos no código durante este levantamento; o documento não atribui severidade a eles.

| # | O que está errado na tela hoje |
|---|---|
| B0.1 | **Texto em Negrito do sistema: suporte zero.** Quem liga "Texto em negrito" nas configurações do aparelho não vê diferença nenhuma no app. Não há nenhuma leitura desse ajuste no código. |
| B0.2 | **O título da barra de navegação está congelado em 17px.** Todos os cabeçalhos nativos de tela interna (Aparência, Ajuda, folhas, etc.) ignoram o tamanho de fonte do sistema: o corpo da tela cresce e o título não. |
| B0.3 | **Os estados de carregando/vazio/erro ocupam altura inteira dentro de rolagem.** O componente que desenha esses três estados pede "ocupar todo o espaço disponível"; dentro de uma tela que rola, isso colapsa ou empurra o conteúdo, em vez de ocupar a área central da tela. |
| B0.4 | **A prévia de tamanho na tela Aparência mente.** A frase de exemplo ("Exemplo do tamanho atual do texto de leitura.") cresce sem limite com o tamanho do sistema, enquanto o leitor de verdade está capado em 1,8× — a pessoa ajusta o tamanho olhando uma amostra que não corresponde ao leitor. Liga direto em A4. |
| B0.5 | **Botão sem nome acessível enquanto carrega.** Quando um botão entra em estado de carregando, o rótulo é substituído por um indicador de atividade e nenhum nome é exposto: o leitor de tela anuncia "botão", sem dizer qual. Acontece no botão principal do leitor ("Concluir leitura"). |
| B0.6 | **O contraste real dos estados desativado/pressionado não é medido por ninguém.** Desativado usa opacidade 0,45 e pressionado 0,72 sobre a cor final; o teste de contraste do projeto mede tokens, não o resultado composto — então o estado desativado pode estar abaixo do mínimo sem que nada acuse. O quadrado "capítulo anterior" do leitor usa 0,35, ainda mais baixo. |

## B1. Grupo E — leitor de tela (7 achados, 1 médio)

O documento nomeia quatro dos sete; os outros três não estão descritos (ver Incertezas).

| O que está errado na tela hoje |
|---|
| **O estado "concluído" não é anunciado.** Quem usa leitor de tela não recebe a informação de que o dia já está concluído — visualmente há um check, mas nada no anúncio. |
| **Rótulos com "~" e "·" são lidos em voz alta.** As linhas de leitura têm a forma "Gênesis 37–48 · 12 capítulos · ~36 min" (formato exato, lido do código); o til e o ponto médio entram na fala. |
| **Cabeçalhos não estão marcados como cabeçalho.** As legendas de seção — "Altar das 12h30", "Tema de hoje", "Como eu leio", "Tamanho do texto de leitura" e as demais — são texto comum: o leitor de tela não consegue navegar por cabeçalhos. Confirmado no código: o componente de legenda não declara papel de cabeçalho, e só dez pontos do app inteiro o declaram. |
| **Anúncio triplicado no Modo altar.** A troca de passo é anunciada três vezes. |

## B2. Grupo F — cópia e consistência (6 achados, 2 médios)

O documento nomeia quatro dos seis. Textos exatos abaixo confirmados no código.

| O que está errado na tela hoje |
|---|
| **O altar é descrito de três jeitos.** Início: legenda "Altar das 12h30" + linha "Altar das 12h30 · conduz: {ministério}". Juntos: bloco "Altar das 12h30" com a linha "Hoje conduz: {ministério}" (e, fora da campanha, "Dia N conduz"/"Dia N conduziu"/"O altar começa em {data}"). Você: linha "Altar de hoje" e, logo abaixo, "Aviso do altar das 12h30". A mesma coisa, três vocabulários. |
| **"hoje" aparece em dia que não é hoje.** A legenda do bloco de tema no Início é fixa em **"Tema de hoje"** sempre que a campanha não terminou — inclusive nos dias anteriores ao início, em que a tela mostra o conteúdo do Dia 1 e a tela Juntos, na mesma situação, já diz corretamente "O altar começa em {data}". |
| **"Tema" onde a igreja diz "Ênfase".** A legenda do Início é "Tema de hoje" / "Tema do dia 100"; o material da igreja chama esse campo de **Ênfase** (é a frase-tema com realce amarelo). Vocabulário do app divergindo do vocabulário do guia que a pessoa tem na mão. |
| **Um valor interno vaza para a tela.** A tela de Ajuda imprime o estado de direitos do conteúdo em forma de identificador de programa — o texto **`pending_authorization`** aparece literalmente para quem lê a Ajuda. |

## B3. Grupo G — jejum (2 achados, 1 médio)

| O que está errado na tela hoje |
|---|
| O jejum continua sendo apresentado como **"propósito" da campanha** e **ganhou superfície nova** no app, sem que a igreja tenha confirmado que existe jejum nesta campanha. A revisão diz explicitamente que este grupo "depende de resposta da igreja, não de código". É o mesmo assunto de **A11**: resolver A11 fecha B3. |

## B4. Grupo I — tokens e higiene (14 achados, todos de severidade baixa)

Não mudam o que a pessoa vê hoje, mas mudam a confiabilidade do sistema visual para quem for desenhar em cima
dele. O documento nomeia cinco dos catorze.

| O que está errado |
|---|
| **Cores literais escritas fora do arquivo de tokens.** Há valores de cor em telas e componentes em vez de no tema — o que significa que trocar uma cor no tema não troca em todo lugar, e que o tema escuro pode ser furado por um literal. |
| **Um token de margem existe e nunca é usado.** A escala de margens laterais é `{ screen: 26, block: 20, sheet: 14 }` e o valor **`block: 20`** não tem nenhum consumidor: o "20 em blocos de largura cheia" que o comentário promete não acontece em nenhum lugar. |
| **Código sem consumidor** (peças que existem e nada usa). |
| **Um teste tautológico** (afirma o que ele mesmo construiu, não prova nada). |
| **O marco é gravado duas vezes** (a marca de "marco já visto" é escrita em dois caminhos). |

---

## C) Resumo do que o designer precisa entregar, em ordem de bloqueio

1. **Forma do rodapé do leitor em fonte grande** (A1) — é o único lugar onde o texto ainda desaparece.
2. **Tema escuro assumido ou ratificado** (A6, A7) — metade da aparência do produto não passou por designer.
3. **Os sete estados "sem dado" das telas coletivas** (A9) — ou a decisão de removê-las da V1 (A16).
4. **Rótulos do Início e das estatísticas do Dia 100** (A2, A3) — cópia curta o bastante para caber.
5. **Uma única palavra para o altar e uma única palavra para a Ênfase** (B2) — o passe de cópia depende disso.
6. **SVG da marca e ícone** (A10), assim que A14 existir.
7. As demais dependem de resposta da igreja (A11–A14) e do Product Brain (A15, A16).


---

## O que ficou em aberto neste levantamento

- A conta dos achados abertos não fecha: a tabela da seção 3 do EXECUTION_04_REVISAO diz "Restam 28", mas os grupos somam 29 (E=7, F=6, G=2, I=14). Não sei qual dos dois números está certo.
- A seção 3 nomeia só parte dos achados de cada grupo: 4 dos 7 do grupo E, 4 dos 6 do grupo F, 5 dos 14 do grupo I, e descreve o grupo G como um assunto só (2 achados). Os achados não nomeados não estão descritos em nenhum lugar que eu tenha lido — o designer está vendo uma amostra, não a lista inteira.
- A seção 1.14 manda encurtar "os rótulos de index.tsx" mas não diz quais. Os candidatos que apontei (o par "Ajustar lembrete" + "Entrar no grupo" e "Intercessão do dia") saíram de leitura do código, não do documento.
- Os limiares de escala citados (~2,9× no rodapé do leitor, 2× na Jornada, 3,571× como teto do build) são aritmética da auditoria sobre as fontes empacotadas, não medição em aparelho. A própria seção 1.13 diz que nenhum teste do projeto pode afirmar que um texto caber e que a prova em aparelho real com AX5 ainda não foi feita.
- O DESIGN_IMPLEMENTATION.md é de 2026-09-07, anterior ao material real da igreja (19/09), e a pendência 3 da sua seção 6 está vencida: ela chama o Launch Gate 2 de "autorização do plano 42360" (YouVersion), quando o plano 42360 foi superado e o Gate 2 passou a ser autorização escrita da própria igreja. Outras afirmações dessa seção 6 podem ter envelhecido do mesmo jeito.
- Não sei se as telas descritas na seção 4 do DESIGN_IMPLEMENTATION (os oito lugares com número coletivo indisponível) continuam idênticas depois da Execution 04, que reformou Início, Dia, Jornada, Juntos e Você com o conteúdo real. Conferi alguns pontos no código, não todos.
- A ideia 3 do plano ("leitura em partes" + retomada por capítulo) está marcada como "fazer na V1", e o leitor já navega capítulo a capítulo com "capítulo X de Y"; os documentos não dizem se a ideia foi aprovada nem o que faltaria para ela estar completa.
- Classifiquei o teto de 2× da Jornada (A5) como decisão de desenho, mas a revisão o registra como dívida técnica assumida e não o encaminha ao desenho. A parte de desenho (quantas linhas cada linha da lista pode ter) é leitura minha da consequência, não texto do documento.
- A tradução da citação de Levítico 6:13 que aparece em "Sobre o propósito" é desconhecida — a seção 1.1 diz que a igreja precisa informar qual é. Sem isso, a atribuição na tela fica incompleta.
- As correções do grupo B (seções 1.10 a 1.14) estavam na árvore de trabalho, sem commit, na data do documento; esta sessão foi instruída a não editar arquivos, então não confirmei o estado do commit. Tratei o código lido como o estado atual, e ele já contém as correções do grupo B.
- O documento não atribui severidade aos seis itens do passe de acessibilidade (B0), só diz que o passe está aberto e deve vir antes dos grupos E, F, G e I.
