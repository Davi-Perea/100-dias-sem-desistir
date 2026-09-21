# EXECUTION 04 — revisão adversarial e correções

- **Data:** 2026-09-20 · **Estado:** oito frentes corrigidas — as três primeiras em `99eb57b`, os grupos A e H em `f4b60f5`, os grupos C e D em `1fa80e4`; o grupo B está na árvore de trabalho
- **Método:** cinco lentes independentes (design, conteúdo, acessibilidade, correção, completude) produziram
  64 achados; cada achado foi submetido a três refutadores com ângulos distintos (reprodução no código,
  regra escrita que viola, impacto real). Sobrevive o que dois dos três não conseguiram refutar.
- **Resultado:** 48 confirmados (1 alto, 19 médios, 28 baixos), 16 refutados, 0 sem verificação.

Na primeira execução 117 dos 197 agentes morreram por limite de modelo, e a apuração tratava agente morto
como achado refutado — 39 achados foram descartados sem terem sido checados. A apuração foi corrigida
(agente morto vira "não verificado", nunca "refutado") e a execução retomada do ponto em que parou.

---

## 1. O que foi corrigido

### 1.1 Texto bíblico em tradução protegida dentro do conteúdo (ALTO)

A orientação da igreja fecha citando Levítico 6:13. O texto entrava no conteúdo como parágrafo comum e era
exibido em "Sobre o propósito" — o único texto de tradução do aplicativo, que por decisão de projeto não
mostra nenhuma enquanto o Gate 1 não fechar. Não havia guarda: mais versículos no `.docx` entrariam sozinhos.

| Onde | O que mudou |
|---|---|
| `scripts/convert-100-dias.mjs` | Reconhece citação (trecho entre aspas + referência), separa num bloco `scripture` com a referência canônica e **recusa a geração acima de três citações** |
| `content/100-dias-2026/proposito.json` | Ganhou `scripture_quotes` para auditoria; a citação virou bloco próprio |
| `src/journey/proposito.ts` | Tipo do bloco e `scriptureQuotes()` |
| `src/app/proposito.tsx` | Citação renderizada identificada como citação, com a referência ao lado |
| `content/source/README.md` | Regra e base legal registradas |

**Base:** citação avulsa e atribuída é lícita (Lei 9.610/98, art. 46, III), e a SBB admite até 500 versículos
sem autorização escrita. Isso **não** libera o Gate 1: o leitor continua sem exibir tradução nenhuma.
**Pendente:** a igreja precisa informar **qual tradução** é essa para a atribuição ficar completa.

### 1.2 Marco misturava contagem pessoal com dia da igreja (MÉDIO, efeito alto)

A tela de marco é disparada pela **contagem de leituras** da pessoa, mas descrevia o **dia de calendário**
homônimo: data, monte e ênfase. Quem entrasse atrasado e completasse a 25ª leitura com a igreja no dia 40 via
"17/10/2026 · Governo · Coração sábio para governar" — conteúdo de um dia que talvez nem tivesse lido.

- O rótulo passou a ser "Marco · 25 de 100 dias lidos", sem data.
- Saiu a linha com o monte e a ênfase do dia homônimo.
- **Terceira manifestação, não apontada pela revisão:** a régua ignorava os dias realmente lidos nas telas de
  marco e pintava de 1 até N como concluídos. Agora usa sempre o que a pessoa leu (`HundredDayRuler`).
- A **chegada do Dia 100 ficou intacta** (data e Ap 21:5): só se completa cem leituras tendo lido o dia 100.

### 1.3 Nomes de pessoas reais embarcados no binário (MÉDIO, tratado como grave)

O conversor gravava `leaders_label` (37 rótulos distintos com nomes de pessoas) no `dataset.json`, importado
estaticamente e embarcado inteiro no pacote. `altarForDisplay` só escondia **na tela**: bastava descompactar o
APK para ler os nomes. Com a igreja autorizando guia e escala mas não os nomes, o portão de produção passava e
um build de loja sairia com dado pessoal de terceiros sem consentimento.

- O conversor **não gera** o rótulo sem `leader_names_authorized`; a fonte `.docx` com hash continua guardando o original.
- `source_provider` deixou de embutir o nome da autora do arquivo (metadado do Word).
- `assertProductionReady` ganhou `production.leader_names`: recusa dataset com nomes sem autorização.
- Testes: o conteúdo embarcado não casa `/\bPrs?\.|\bPra\./`; o portão recusa contrabando; com autorização o rótulo volta a ser exibível.

### 1.4 Grupo A — a marca invertida sumia no tema escuro (2 médios + 2 baixos)

O idioma do handoff para "marcado" é tinta com conteúdo amarelo. O código escrevia o fundo como
`colors.text`, que no tema escuro é #FFFFFF: o conteúdo amarelo caía para 1,46:1. Onde o fundo era
`#111111` fixo, era o inverso — o círculo sumia sobre a página escura.

Par de tokens novo, `markSurface`/`onMark`, que faz o que o §2.2 deste projeto já descrevia para o tema
escuro: tinta e amarelo trocam de papel com a superfície. Claro é tinta com amarelo, escuro é amarelo com
tinta, 12,9:1 nos dois sentidos. Aplicado no check de concluído (Início e Dia), caixa de marcação, opção
selecionada, pílula ativa, avatar e nos números dos passos da intercessão e do propósito.

### 1.5 Grupo H — o rodapé de "Sobre o propósito" afirmava algo falso (1 médio)

Dizia "reproduzido sem alterações", mas a página mostrava 8 das 10 seções.

A auditoria mostrou que o problema era a SELEÇÃO, não só a frase: "Participação e responsabilidade dos
ministérios" não é instrução a líderes — diz "não é somente o líder que está sendo escalado" e fala a todo
integrante de ministério. Escondê-la de quem não é líder contraria o que ela mesma pede. Ela passou a ser
pública; fica de fora só o passo a passo de preparação de quem conduz o altar, e aí a frase ficou verdadeira.

### 1.6 O que a verificação adversarial dos grupos A e H encontrou

Quatro auditorias independentes sobre a própria correção, cada achado refutado por dois ângulos:
15 sobreviveram, 19 caíram. Os que sobreviveram foram corrigidos no mesmo passo.

| Achado | Severidade | O que era |
|---|---|---|
| **A própria pomba não foi convertida** | alto | `Dove` tinha `tone='black'` por padrão e seis telas aceitavam o padrão sobre fundo que segue o tema: no escuro, pomba preta sobre página #111111. A marca do produto, invisível. O tom agora acompanha o tema; as telas de fundo fixo continuam passando o tom |
| **Faixa de alerta ficou de fora** | médio | A faixa "sem internet" era `#111111` fixo e sumia sobre a página escura. Ganhou par próprio (`alertSurface`/`onAlert`): no escuro clareia o bastante para continuar sendo faixa (3,5:1 contra a página, 5,4:1 no texto, 3,7:1 no ponto amarelo). Usar `markSurface` ali estaria errado — daria texto branco sobre amarelo |
| **Comentários descreviam o código anterior** | médio | Três docstrings afirmavam o oposto do que o código passou a fazer. Uma delas era o argumento pronto para alguém reintroduzir o defeito ("o círculo é sempre #111111, também no tema escuro") |
| **O guarda de código era estreito demais** | alto | Casava só a forma literal do bug já corrigido; nove de onze variantes realistas passavam. Reescrito para descrever a regra: fundo de tinta (do tema, literal ou por apelido local) com conteúdo da marca, poupando as superfícies que se declaram fixas. Reporta caminho relativo, porque há cinco `[day].tsx` no projeto |

O guarda agora se autotesta com onze casos sintéticos, seis que devem ser pegos e cinco que devem passar,
e declara no próprio comentário o que não alcança: cor vinda de outro módulo ou com duas indireções.

### 1.7 Grupo C — a permissão de notificação era pedida sem gesto (3 achados)

`useReminderSync` roda na abertura do app e a cada volta do segundo plano, e chamava
`ensureNotificationPermission`. O iOS mostra esse diálogo **uma vez na vida do aplicativo**: gastá-lo na
abertura, antes de a pessoa saber para quê, é perder o lembrete para sempre. E marcar o aviso do altar
disparava dois pedidos — o da tela e o do hook, acordado pela mesma mudança de preferência.

A permissão agora é um parâmetro da chamada, não um efeito colateral dela: `syncMinistryReminders` e
`syncAltarReminders` recebem `{ requestPermission }`. Só as duas telas onde existe gesto — escolher o
ministério, marcar o aviso do altar — pedem; o hook lê com `hasNotificationPermission` e agenda apenas o
que já está permitido. Uma recusa deixou de ser exceção solta e virou `{ ok: false, reason }`, porque quem
chamou precisa desfazer a preferência em vez de prometer um aviso que não vem.

### 1.8 Grupo D — conteúdo de dia futuro chegava por rota (2 achados)

A Jornada, a tela do Dia e a Intercessão checavam `isDayUnlocked`; o leitor, não. `/reader/40` no Dia 17
abria as leituras do Dia 40, e o efeito ainda pedia a passagem ao provedor — com uma tradução licenciada
seria uma requisição de conteúdo que não deveria existir. A tela de reflexão mostrava a referência daquele
dia no rodapé.

As duas rotas passaram a checar o mesmo bloqueio, no mesmo desenho da tela do Dia. Rota é rota: link
direto, histórico e deep link chegam ali igual ao toque, e uma regra que só existe no botão é decoração.

### 1.9 O que os testes dos grupos C e D garantem

Nenhum dos dois grupos podia ficar só no código: os dois defeitos são invisíveis na tela onde nascem.

- Permissão: sincronização de fundo não abre o diálogo nem quando a permissão ainda não existe, e o padrão
  sem opção nenhuma também não; o gesto abre e agenda; recusa e falha do sistema devolvem motivo. Um guarda
  lê a fonte do hook, porque o defeito original era exatamente uma chamada ali e nenhum teste de
  comportamento pegaria alguém reintroduzindo-a por outro caminho.
- Dia futuro: o leitor mostra a data em que abre, não pede a passagem ao provedor e não revela a
  referência; a reflexão esconde o rótulo da leitura. Dois casos de controle no dia de hoje impedem que a
  correção tranque o app inteiro.

Os cinco testes de dia futuro e os três de permissão foram conferidos com o defeito reintroduzido: falham
sem a correção, passam com ela, e os casos de controle passam nos dois estados.

### 1.10 Grupo B — caixa de altura fixa com texto dentro (5 achados + varredura)

Antes de corrigir, seis lentes independentes auditaram o app inteiro em Dynamic Type, com uma sétima
checando o que as seis não olharam. Elas confirmaram os cinco achados, **derrubaram seis suposições** e
acharam o mesmo defeito em sete lugares que a revisão não tinha listado.

**A regra que saiu disso, agora escrita nos tokens:** o tamanho do handoff é **piso, nunca teto**. Toda caixa
com texto cede ao texto (`minHeight: Math.max(altura, MIN_TOUCH)` com `paddingVertical`, nunca `height`), e
todo número que reserva espaço para uma dessas caixas é **medido** com `onLayout` — nunca uma constante.

| Onde | O que era |
|---|---|
| `ui/components.tsx` — Button | As cinco variantes travavam altura (56/56/52/48/44) com ~70 call sites. Em fonte grande o rótulo quebrava e atravessava a borda — e no `primary`/`yellow` a cor do rótulo **é** a cor da superfície, então o pedaço que saía do preenchimento media 1,00:1. O texto não ficava feio: sumia |
| `ui/components.tsx` — SettingRow | O valor não tinha `flexShrink`, então quem colapsava era o **rótulo**: sumia a palavra que diz o que a linha faz, e o e-mail ficava inteiro |
| `ui/SpherePill.tsx` | `height: 28` com rótulo da igreja dentro. "ARTES E ENTRETENIMENTO" quebra em duas linhas em tela estreita e a borda cortava o rótulo no meio |
| `app/reader/[day].tsx` | **Acoplado ao Button:** a rolagem reservava 180px fixos para um rodapé que passou a crescer. Corrigir o botão sozinho trocaria texto cortado por conteúdo inalcançável — o fim do capítulo e o aviso de direitos atrás do rodapé. Agora a reserva é medida, e o quadrado de "capítulo anterior" estica junto com o botão |
| `ui/TabBar.tsx` + `app/(tabs)/_layout.tsx` | **Acoplado:** a cena reservava `TAB_BAR_HEIGHT` enquanto a barra real mede isso **mais** `insets.bottom`. O fim da Jornada ficava atrás do vidro em qualquer tamanho de fonte. A barra agora se mede e a cena reserva o que ela devolve |
| `journey/journeyRowHeight.ts` (novo) + Jornada | A reticência declarava `48 × escala` ao `getItemLayout` e desenhava 48: em fonte 1,5× a lista errava 24px por reticência e abria longe do dia da igreja. A altura virou função pura — assim tela e teste comparam dois números calculados de forma independente |
| `app/marco/[day].tsx` | Duas defesas que se anulavam a 33 linhas de distância: a conta do numeral só conhecia a largura, e o Text era multiplicado por até 1,2 depois. No Dia 100 a largura prevista já ocupava 337 de 338px. E a linha de estatísticas não quebrava: em 1,5× "dias de jejum" saía pela direita numa tela que só rola na vertical |
| `app/onboarding/index.tsx` e `pronto.tsx` | As duas únicas telas do app sem rolagem — a primeira e a última do onboarding. Em fonte grande, o texto é que era cortado |
| `app/dia/[day].tsx` | `subtitleLines={1}` num subtítulo "{monte} · {título do dia}": com fonte **padrão**, montes longos já comiam a linha e o título do dia sumia |

### 1.11 Duas armadilhas que a auditoria achou e que são piores que o grupo B

Não são caixa com texto; são gente presa:

- **A folha (`Sheet`) não rolava.** Em fonte 2× a folha de ferramentas de líder pede ~1118px numa tela de
  844: o botão "Fechar" ficava 274px fora da tela, o scrim ia a 0px e a rota não tem header nativo — no iOS,
  nenhum controle de fechamento alcançável. Agora a folha para em 88% da tela e o conteúdo rola por dentro.
- **A reflexão com o teclado aberto.** A partir de ~1,65× o rodapé e a barra excediam a coluna e o
  `ScrollView` ia a zero: a pessoa digitava num campo de altura nenhuma, e `autoFocus` abre o teclado sozinho
  numa reflexão nova. O caminho social desceu para o fim da rolagem, junto do texto que o explica; o rodapé
  fixo ficou só com o que precisa estar à mão enquanto se escreve.

### 1.12 O que a auditoria derrubou

Seis suposições não se reproduzem, e registrá-las evita que voltem como "correção":

- **`lineHeight` fixo não é defeito de Dynamic Type.** O RN multiplica `lineHeight` pelo fator de fonte
  (`RCTTextAttributes.mm`). O que quebra são as caixas.
- **O `height: 24` do "Desfazer" nunca teve efeito** — mas não pelo motivo que eu disse antes: ele vence o
  `height: 44` da variante; quem o anula é o `minHeight: 48` da base, aplicado como piso pelo Yoga. O botão
  já media 48. Apagar o override é higiene: ele mentia sobre o que acontecia.
- **O `height: 44` do underline nunca rebaixou alvo de toque nenhum**, pelo mesmo piso. O perigo era ele
  **virar** real depois do refactor: `container` entra depois da base no array, então um `minHeight: 44` ali
  apagaria o piso de 48 em todo botão de texto do app. É por isso que cada variante usa `Math.max`.
- **Checkbox e ChoiceRow não são caixas com texto** — o filho é um ícone SVG, sem fontScale no caminho.
- **Pares de botões lado a lado não desalinham** com `minHeight`: os pais são `row` sem `alignItems`, e o
  stretch do Yoga iguala as alturas. O único par com requisito real era o do rodapé do leitor.
- **O teto de escala deste build não é 3,12×, é 3,571×** (tabela do `RCTAccessibilityManager`). O 3,12 é a
  razão de corpo do iOS; o RN é mais agressivo. As contas e os testes usam 3,571.

### 1.13 O que os testes do grupo B garantem — e o que eles não podem garantir

O achado mais desconfortável da auditoria não é um defeito de tela: **o viewport padrão de todo teste deste
repositório é 750×1334 com fontScale 2**. A suíte inteira já rodava na meta de 200% e passava, porque nenhum
teste olhava geometria. "Os testes passam" nunca foi evidência de que a meta do `ARCHITECTURE_V0` §12 estava
cumprida — e isso vale para tudo o que foi verificado antes desta rodada.

O novo `support/viewport.ts` fixa telefone e escala, e o meta-teste afirma o padrão do harness para que esse
fato pare de ser invisível. Sobre ele, 14 testes: o Button não declara altura e nunca desce do alvo de toque
em 1×, 2× e 3,571×; com fonte padrão os pisos são exatamente os do handoff; a pílula idem; a reticência da
Jornada renderiza o mesmo número que o `getItemLayout` declara; a linha de hoje cresce com a fonte e para no
teto; o numeral do Dia 100 é idêntico ao de hoje em fonte padrão e menor em fonte grande. Conferidos com os
defeitos reintroduzidos: 10 dos 14 falham sem a correção.

**Limite honesto:** nenhum teste deste repositório pode afirmar que um texto coube. O
`react-test-renderer` não roda Yoga, `onLayout` nunca dispara e não há métrica de glifo. Os números de
transbordo da auditoria são aritmética sobre os TTFs do projeto; os testes são **contrato de estilo**, e a
prova de layout é aparelho real com AX5 ligado — que ainda não foi feita.

### 1.14 Dívidas assumidas no grupo B

- **O teto de 2× da Jornada fica.** Acima dele as linhas param de crescer enquanto o texto continua. Subir o
  teto sozinho não resolve: a altura multiplica constantes em vez de contar linhas, então o desvio troca de
  sinal em vez de sumir. Com a reticência fixa, todo desvio restante é negativo — a lista rola de menos e o
  dia da igreja fica abaixo da dobra, nunca acima. Erro de sinal único é corrigível; de sinal misto, não.
- **O rodapé do leitor é a caixa mais apertada do app.** Acima de ~2,9× a palavra "Concluir" não cabe nem
  sozinha: é transbordo horizontal, que nenhum `minHeight` resolve. Empilhar o rodapé é decisão de desenho.
- **Três itens são de produto, não de código:** encurtar os rótulos de `index.tsx` (que já quebram em duas
  linhas com fonte padrão), empilhar ou não as estatísticas do Dia 100 acima de um limiar, e a frase "texto
  segue o tamanho do sistema" no leitor — que é falsa enquanto o texto estiver capado em 1,8×.

---

## 2. Verificação

| Checagem | Resultado |
|---|---|
| `tsc --noEmit` · `expo lint` | limpos |
| `jest` | **337 testes, 20 suítes** |
| `content:check` | dataset e propósito conferem com as fontes |
| Navegador, tema claro | citação atribuída; marco por leituras com a régua real; Dia 100 intacto; sem nomes; marca e marcas de seleção no desenho do handoff |
| Navegador, tema escuro | check, caixa, opção, números de passo e a pomba visíveis; nenhuma superfície invertida perdida |
| Navegador, rotas diretas | `/reader/40` e `/reflexao/40` mostram o bloqueio sem revelar a leitura; `/reader/17` e `/reflexao/17` intactos; nenhum erro no console |
| Navegador, aviso do altar | marcar a caixa na web devolve o motivo na própria linha e a caixa volta a desligada |
| Navegador, folha em tela curta | em 375×300 a folha para em 88% da altura e rola por dentro: o botão de fechar continua alcançável |
| Navegador, telas estreitas | em 300px as três estatísticas do Dia 100 continuam inteiras e o numeral cede; nenhum erro no console |
| Navegador, onboarding curto | em 375×480 a primeira tela rola e o parágrafo inteiro é alcançável, com os botões fixos |

---

## 3. Os achados confirmados que continuam abertos

Os grupos A, H, C, D e B saíram desta tabela: foram corrigidos (seções 1.4 a 1.14). Restam 28.

Agrupados por trabalho, não por arquivo.

| # | Tema | Achados | Severidade | Por que importa |
|---|---|---|---|---|
| E | **Leitor de tela** (estado "concluído" não anunciado, rótulos com "~" e "·", cabeçalhos não marcados, anúncio triplicado no modo altar) | 7 | 1 médio | |
| F | **Cópia e consistência** (altar descrito de três jeitos; "hoje" em dia que não é hoje; "Tema" onde a igreja diz "Ênfase"; enum `pending_authorization` exposto) | 6 | 2 médios | |
| G | **Jejum** (continua como "propósito" da campanha e ganhou superfície nova, sem a confirmação da igreja) | 2 | 1 médio | Depende de resposta da igreja, não de código |
| I | **Tokens e higiene** (cores literais fora de `theme.ts`, `gutter.block` sem uso, código sem consumidor, teste tautológico, marco gravado duas vezes) | 14 | baixos | |

**Recomendação de ordem:** E e F como um passe único de cópia e acessibilidade; G quando a igreja responder;
I por último. Antes de qualquer um deles, o passe de acessibilidade que a auditoria do grupo B abriu e que
ainda não foi feito: suporte a Texto em Negrito do sistema (hoje zero), título nativo do header congelado em
17px, `StateView` com `flex: 1` dentro de rolagem, prévia de tamanho que mente na tela de Aparência, botão
sem nome acessível enquanto carrega, e o contraste real dos estados com `opacity` — que o `contrast.test.ts`
não enxerga.

---

## 4. Os 16 refutados

Vale registrar dois, porque parecem problemas e não são: o modo altar e a tela de marco **têm** o aviso de
conteúdo (vem da tela que os abre), e `campaign.id` com a marca no nome não é identificador de loja, é chave
local. Os outros catorze caíram por não se reproduzirem no código ou por citarem regra inexistente.

Dois achados aparecem nas duas listas — "texto bíblico" e "marco ancorado no dia" — porque as correções foram
aplicadas durante a verificação: quem leu antes confirmou, quem leu depois refutou. Ambos estão corrigidos.
