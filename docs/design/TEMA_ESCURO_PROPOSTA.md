# Tema escuro: proposta para a etapa 8 do redesenho

**Status: PROPOSTA.** Ainda não foi aprovada. O designer entregou o tema escuro só como tabela de tokens
(`design_handoff_100_dias/TOKENS.md` §2) e pediu, em `REGRAS.md` §5 item 7: *"Aplique a regra e me mostre
antes de seguir."* Este documento faz exatamente isso: aplica a regra a cada uma das 32 telas e mostra o
resultado. **Nada foi alterado no código.** Os hex continuam os do `mobile/src/ui/theme.ts`, que já batem
com o TOKENS.md.

Documentos lidos: `design_handoff_100_dias/TOKENS.md`, `TELAS.md`, `REGRAS.md`, `LACUNAS.md`,
`mobile/src/ui/theme.ts`, `docs/design/02-contraste.md`.

**Como os contrastes foram medidos.** Usei a fórmula de contraste da WCAG 2.1 (luminância relativa,
`(L1 + 0,05) / (L2 + 0,05)`), com um script local. Onde há transparência (vidro, véu escuro atrás da folha,
opacidade de botão desabilitado), primeiro misturei a cor com o que fica atrás dela, depois medi.
Mínimos do projeto: **4,5:1 para texto**, sem a concessão para texto grande, e **3:1 para o limite de um
controle ou para um elemento gráfico que carrega informação**.
Referência da norma: WCAG 2.1, critérios 1.4.3 e 1.4.11 (https://www.w3.org/TR/WCAG21/). É uma norma
publicada em 2018 e estável. Não a reconsultei nesta sessão (21/09/2026).

Nas tabelas, **ABAIXO** marca um par que fica abaixo do mínimo. Para cada um digo se é problema de verdade,
se o mesmo par já existe no tema claro (e portanto não foi o escuro que criou), ou se é decorativo.

---

## 1. A regra, em palavras simples

1. **Fundo e superfícies escurecem.** Página `#FFFFFF` → `#111111`. Cartão `#FFFFFF` → `#1A1A19`.
   Bloco quente `#F7F5F0` → `#1A1917`. Círculo neutro `#F1EFE9` → `#232220`. Trilha `#EDEBE5` → `#0B0B0B`.
2. **O texto clareia.** Tinta `#111111` → `#FFFFFF`. Apoio `#3F3D38` → `#C7C4BD`. Legenda `#5C5A54` → `#A6A29A`.
3. **O amarelo não muda de valor, muda de papel.** O "marcado" (pílula do monte, aba ativa, círculo
   numerado, interruptor) é tinta com conteúdo amarelo no claro. No escuro vira **amarelo com conteúdo
   tinta**. É sempre o par `markSurface` / `onMark`, nunca "cor do texto" com "cor do fundo". Nos dois
   sentidos mede 12,92:1.
4. **O azul clareia.** `#2A4C86` → `#A9C2E8`. O conteúdo sobre o azul inverte: branco → `#111111`.
   A faixa azul pálida escurece: `#E6EDF7` → `#1A2231`, e o texto sobre ela fica branco.
5. **As cinco superfícies fixas não mudam.** F1 boas-vindas e E3 marco continuam amarelas. C4
   consentimento, E2 modo altar e E4 dia 100 continuam em tinta. Por dentro delas vale `fixedPalette`: a
   tinta usa os valores do tema escuro e o amarelo usa os do claro, nos dois temas. Isso já está
   implementado.
6. **O vidro escurece.** Barra de navegação `rgba(255,255,255,0.86)` → `rgba(26,25,23,0.88)`. Barra de
   topo do leitor `rgba(255,255,255,0.92)` → `rgba(17,17,17,0.9)`. Filete `rgba(17,17,17,0.08)` →
   `rgba(255,255,255,0.12)`. Véu atrás da folha `rgba(17,17,17,0.5)` → `rgba(0,0,0,0.6)`.

---

## 2. Os achados que pedem decisão (resumo)

Estão em ordem de importância. O detalhe está nas seções 3 e 4.

| # | Achado | Medição | Minha recomendação |
|---|---|---|---|
| 1 | **Realce amarelo na ênfase do dia.** Se a palavra realçada continuar na cor do texto, no escuro ela fica branca sobre amarelo. | branco / `#FFD100` = **1,46 ABAIXO** | A palavra dentro do realce usa sempre `onAccent` `#111111` (12,92), nos dois temas. Afeta A1, A3, A5 e E1. |
| 2 | **"Bloco branco" sobre fundo quente some.** Em A3, D4 e E1 há um bloco `surface` dentro de uma tela `surfaceWarm`. No escuro os dois quase coincidem. | `#1A1A19` / `#1A1917` = **1,01** (no claro, 1,09) | No escuro, o bloco sobre fundo quente usa `surfaceMuted` `#232220` (1,11, parecido com o claro) e mantém a borda `rgba(255,255,255,0.10)`. O designer decide. |
| 3 | **A folha modal se confunde com o véu.** O véu escurece uma página que já era escura. | folha `#1A1A19` / véu `#070707` = **1,16** (no claro, 3,54) | Nenhum cinza escuro chega a 3:1 sem virar "folha cinza". Proposta: filete de 1px `rgba(255,255,255,0.12)` na borda de cima da folha. A alça e o conteúdo já identificam a folha. O designer decide. |
| 4 | **"Anel cinza = não leu" (D4).** O TELAS não diz qual é o cinza. Se for `borderStrong`, quase some. | `#3D3A36` / `#1A1A19` = **1,54 ABAIXO** (claro `#D9D6CF`/branco = 1,45) | Usar `controlBorder` no anel: 4,75 no escuro. O estado já muda de forma (cheio × anel), mas o anel precisa estar visível. Vale para os dois temas. |
| 5 | **Barra de status nas cinco superfícies fixas.** Hoje ela segue o tema, não a superfície (`_layout.tsx:56`). | ícones brancos / amarelo = **1,46**; ícones pretos / tinta = **1,11** | Fixar por tela: ícones escuros em F1 e E3, claros em C4, E2 e E4. Já aparece em `LACUNAS.md`. |
| 6 | **Pomba em PNG.** Existem `dove-black.png` e `dove-white.png`. A pomba é marca da igreja. | branca / `#111111` = 18,88; preta / `#111111` = **1,00** se alguém errar o tom | Nas telas que seguem o tema, pomba branca no escuro. Nas fixas, tom declarado pela superfície (preta em F1/E3). **Pergunta para o designer e para a igreja:** a versão branca é uma variante aprovada da marca? A resolução (224 px) já é um problema aberto. |
| 7 | **Ícone de Amém em PNG preto.** No escuro sumiria (1,00). | tingido de branco = 18,88 | Tingir com `tintColor` pela cor do token (`text`). Continua pendente: a licença e o segundo estado (contorno × cheio). |
| 8 | **Faixa "sem internet" `#6B6A63`.** Passa, mas é um cinza médio que pode parecer "desabilitado". | faixa / página 3,48 · texto 5,43 · ponto amarelo 3,72 | Manter. Entre os cinzas testados é o único que passa nos três pares (tabela na seção 4.3). Tem uma alternativa azul para o designer avaliar. |
| 9 | **Fotos no feed.** Foto com borda escura se funde à página. | preto / `#111111` = 1,11 | Não mexer na foto: sem filtro, sem escurecer. Filete de 1px acima e abaixo, como no claro. A foto é conteúdo, não controle, e não tem mínimo. |
| 10 | **Nó de "hoje": anel branco em volta do amarelo.** | anel / miolo = 1,46; anel / página 18,88; miolo / página 12,92 | Aceitável: o nó continua maior (20 px) e de forma diferente. Pergunta ao designer: no escuro o anel continua branco ou some? |

Pares abaixo do mínimo que **não** são problema novo estão na seção 4.4.

---

## 3. Tela por tela

Convenção: **Muda** = o que troca de cor aplicando a regra. **Não muda** = o que fica fixo. **Ambíguo** = onde
a regra não responde sozinha. Os contrastes são do tema escuro, salvo quando digo o contrário.

### A · A jornada e o dia

#### A1 · Jornada (a casa)
- **Muda.** Página `#111111`. Cabeçalho: nome em branco (18,88). Círculo de conta `#232220`, borda
  `#2E2C29`. Dias passados: trilho e nó "lido" em branco. "Concluído" em `#A6A29A` (7,42). Linha em aberto:
  faixa `#1A2231`, anel e "Em aberto ›" em `#A9C2E8` (8,78 sobre a faixa), rótulo em branco (15,94). Painel
  de hoje: bloco `#1A1917`. O rótulo "HOJE · A IGREJA ESTÁ AQUI" em azul claro (9,68). "Dia 17" em branco
  (17,57), "de 100" em `#A6A29A` (6,91). Pílula do monte **amarela com rótulo tinta** (12,92). Botão
  primário branco com rótulo `#1A1A19` (17,42). Sublinhado em branco. Dias futuros: rótulo `#A6A29A`
  (7,42), ponto e linha pontilhada `#3D3A36`.
- **Não muda.** Nada. É tela temática.
- **Ambíguo.** (1) A palavra realçada: ver achado 1. (2) O nó de hoje: ver achado 10. (3) A faixa azul em
  aberto mede 1,18 contra a página (no claro, 1,18 também). A forma vem do anel, do chevron e da palavra
  "Em aberto", não da faixa. (4) O ponto futuro e o pontilhado medem **1,67 ABAIXO**, igual ao claro (1,45).
  O dado vem do rótulo "Em breve".

#### A2 · Jornada de quem faltou
- **Muda.** Tudo como A1. Bloco de acolhida em `#1A2231`: título branco (15,94), texto `onBlueSoft`
  branco (15,94).
- **Ambíguo.** No escuro o bloco de acolhida (azul) e o painel de hoje (quente) ficam bem próximos em
  valor (os dois são escuros). A diferença passa a ser só o matiz. Não carrega dado, mas o designer deve
  ver.

#### A3 · O dia completo
- **Muda.** Fundo `#1A1917`. Pílula amarela / tinta. Ênfase em branco com realce (achado 1). O bloco
  "branco" da leitura vira `#1A1A19`: **1,01 contra o fundo** (achado 2). Referências e caps em
  branco/`#A6A29A`. Marcador de oração amarelo de 6 px (12,02). As três linhas: branco / `#A6A29A`.
  Caixa de jejum: borda de 2 px. O TELAS não diz a cor; recomendo `controlBorder` (4,79 sobre o quente).
- **Ambíguo.** A cor da borda da caixa de jejum (não especificada) e o bloco da leitura (achado 2).

#### A4 · Dia que ainda não abriu (folha)
- **Muda.** Folha `#1A1A19`, véu `rgba(0,0,0,0.6)`. Alça `#3D3A36`: **1,54 ABAIXO** (no claro, 1,45). É
  decorativa, porque o véu com o rótulo "Fechar" e o botão fecham a folha. Círculo `#232220`. O cadeado é
  "retângulo em `text`": vira **branco** (15,90). Título branco, texto `#C7C4BD`/branco. Botão primário
  branco.
- **Ambíguo.** A folha se confunde com o véu (achado 3). A "jornada dessaturada" atrás: no escuro
  dessaturar quase não aparece, porque a página já não tem cor. O que resta de cor são o amarelo e o azul.
  Pergunta ao designer: dessaturar esses dois ou só escurecer?

#### A5 · Antes da campanha
- **Muda.** "Faltam 2 dias" em branco, "2 dias" com realce amarelo (achado 1: o texto dentro do realce
  precisa ser `#111111`). Régua inativa: só traços `#3D3A36`, **1,67 ABAIXO** (claro 1,45). É aceitável
  porque a régua inativa não carrega dado; as datas nas pontas estão escritas. Botão primário branco,
  contornado com borda branca.

### B · Ler

#### B1 · Leitor
- **Muda.** Página `#111111`. Barra de vidro `rgba(17,17,17,0.9)`. No pior caso, com algo branco rolando
  por trás, a mistura fica `#292929`: título branco 14,55, legenda `#A6A29A` **5,72**, borda do "Aa"
  `#8A857C` 3,97. Filete de progresso: trilha `#0B0B0B` e preenchimento amarelo (13,47 entre os dois).
  Caixa de aviso: fundo `#1A1917`, borda `#2E2C29`, rótulo "TEXTO AINDA NÃO LIBERADO" em `#D6AC5A`
  (8,29). Numerais dos versículos em `#A6A29A`. Rodapé: filete, primário branco.
- **Ambíguo.** (1) A trilha do progresso (`#0B0B0B`) some contra a página (1,04; no claro, 1,19). O
  preenchimento e o texto "capítulo 4 de 12" carregam o dado. (2) O "‹" desabilitado com opacidade 0,35
  mede **3,19** no escuro e **2,28 ABAIXO** no claro (a medição é do `LACUNAS.md`). A WCAG isenta controle
  inativo, mas a especificação pede que o valor seja declarado. (3) As barras listradas onde o texto
  entrará: a cor não é dada. Sugestão: `#232220` sobre a página.

#### B2 · Rodapé empilhado, fonte grande
- **Muda.** O mesmo que B1. Os dois botões empilhados: primário branco e contornado branco.
- **Nada de novo** a decidir no escuro.

#### B3 · Tamanho do texto (folha)
- **Muda.** Folha como A4. Amostra em bloco `#1A1917` sobre folha `#1A1A19` (1,01: o bloco some, é o mesmo
  caso do achado 2). Botões contornados brancos. Régua: preenchimento amarelo e trilha, provavelmente
  `#0B0B0B` (amarelo sobre ela 13,47). Valor "19 pt" em branco.
- **Ambíguo.** A amostra precisa de forma? Se sim, `#232220` (achado 2).

#### B4 · Depois de concluir
- **Muda.** Bloco quente `#1A1917`: círculo **amarelo** com ponto **tinta** (markSurface/onMark, 12,92).
  Bloco azul `#1A2231`: título e texto brancos (15,94). O botão azul vira `#A9C2E8` com rótulo `#111111`
  (10,40). Contornado branco. Sublinhado branco.
- **Ambíguo.** No claro, o azul (`#2A4C86`) é escuro e se distingue do contornado. No escuro, o azul
  (`#A9C2E8`) e o branco do primário ficam próximos: **1,82** entre eles. Aqui não há primário branco na
  mesma tela (é azul + contornado), então a hierarquia se mantém. Mesmo assim, o designer deve ver.

#### B5 · Reflexão privada
- **Muda.** "Excluir" em `#E0817A` (6,83). Desabilitado com 0,45: **2,28 ABAIXO** (claro 2,14). É inativo e
  isento, mas precisa ser declarado. Campo em `#1A1917` sobre a página, com placeholder `#A6A29A` (6,91).
  Caixa azul com texto branco. Primário branco.
- **Ambíguo.** O campo não tem borda e mede **1,07** contra a página (no claro, 1,09). Os dois temas têm o
  mesmo problema: a WCAG 1.4.11 pede 3:1 para identificar um campo, a não ser que o rótulo e a posição
  bastem. Pergunta ao designer: borda `controlBorder` no campo (5,15 no escuro, 3,29 no claro)?

### C · A comunidade

#### C1 · Feed
- **Muda.** Cabeçalho branco. Pílula "Escrever" `#A9C2E8` com rótulo `#111111` (10,40). Linha "Dia 17 · a
  igreja está lendo…" em azul claro (10,40). Nome branco, "há 2 h" em `#A6A29A`. Legenda em branco. Amém e
  comentar tingidos de branco (achado 7). Barra flutuante escura (seção 4.1).
- **Não muda.** **A foto.** Nada de filtro, escurecimento ou inversão (achado 9).
- **Ambíguo.** (1) Estado "marcado" do Amém: no claro é "contorno × cheio" em tinta. No escuro fica
  "contorno × cheio" em branco? Faz sentido, porque a forma carrega o estado, mas depende do segundo
  estado do ícone, que ainda não existe. (2) Os filetes acima e abaixo da foto (`#2E2C29`, 1,36) separam
  pouco uma foto escura da página. É decorativo e aceitável.

#### C2 · Feed vazio
- **Muda.** Pomba branca (achado 6). Título branco, texto `#C7C4BD`/branco, primário branco.

#### C3 · Publicar
- **Muda.** Pílula "Publicar" azul claro. Desabilitada com 0,45: a pílula fica `#556172` (3,00 contra a
  página) e o rótulo mede **3,00 ABAIXO**. É inativa e isenta, mas precisa ser declarada. Aviso em
  `#1A2231` com texto branco e o ícone de comunidade em `#A9C2E8` (8,78). Área de foto tracejada: a cor não
  é dada; recomendo `controlBorder` (5,15), porque é o limite de um controle. Campo `#1A1917`. Interruptor
  ligado: trilho **amarelo**, botão **tinta** (12,92).
- **Ambíguo.** (1) O interruptor **desligado** não está desenhado em nenhum tema. Proposta: trilho
  `controlBorder` (5,15 contra a página) com botão branco (3,67 sobre o trilho). (2) O campo sem borda,
  como em B5.

#### C4 · Consentimento — **SUPERFÍCIE FIXA (tinta)**
- **Não muda.** Fundo `#111111` nos dois temas. Título `#FFFFFF`, texto `#C7C4BD` (10,84), marcadores
  amarelos, botão amarelo com rótulo tinta, sublinhado branco. Tudo por `fixedPalette('ink')`.
- **Única coisa a corrigir:** a barra de status, com ícones claros fixos (achado 5).

#### C5 · Denunciar e bloquear (folha)
- **Muda.** Folha como A4. Círculos `#232220` com ícones em branco (15,90). Títulos brancos e legendas
  `#A6A29A` (6,25 sobre o círculo, 6,85 sobre a folha). Contornado branco.
- **Ambíguo.** A cor dos ícones (bandeira, bloqueio, traço) não é dada. A regra sugere `text`. Não usar
  `danger`: denunciar não é erro.

#### C6 · Comentários
- **Muda.** Nomes brancos, "há 1 h" em `#A6A29A`, texto branco. Amém de 22 px tingido. Campo pílula: fundo
  `#1A1917` ou borda? Não está especificado. Botão circular de envio `#A9C2E8` com a seta em `#111111`
  (10,40).
- **Ambíguo.** O limite do campo pílula, como em B5.

### D · Você, o perfil e o grupo

#### D1 · Você
- **Muda.** Avatar neutro `#232220`. Nome branco, ministério `#A6A29A`. Bloco "MEU PROGRESSO" `#1A1917`:
  "14" branco. Régua: traço lido amarelo (12,02 sobre o quente), marcador de hoje branco (17,57), traço
  futuro `#3D3A36` (**1,55 ABAIXO**; no claro 1,45). Lido e futuro se distinguem por altura e por cor
  (7,74 entre eles). Filetes `#2E2C29`, caps em `#A6A29A`, valores à direita em `#A6A29A`.
- **Nada de novo** a decidir.

#### D2 · Criar perfil
- **Muda.** Caixas `#1A1917` sobre a página (1,07). Círculos numerados **amarelos com numeral tinta**
  (12,92). Títulos brancos, legendas `#A6A29A`. Primário branco.
- **Ambíguo.** As caixas não têm borda. No claro, 1,09. Se são tocáveis, precisam de limite: borda
  `controlBorder` ou a borda do bloco.

#### D3 · Passo 1, sua foto
- **Muda.** Segmentos: cheio branco, vazio `#3D3A36` (**1,67 ABAIXO**; claro 1,45). O texto "Passo 1 de 5"
  carrega o dado. Círculo tracejado de 168: a cor não é dada; recomendo `controlBorder`. Caixa azul com
  texto branco. Primário branco, contornado branco.

#### D4 · Meu grupo
- **Muda.** Fundo `#1A1917`. Bloco "HOJE NO GRUPO" `#1A1A19` (**1,01**, achado 2). Barra de 10 px: amarelo
  sobre trilha. Nó "leu hoje": branco cheio. Nó "não leu": achado 4.
- **Ambíguo.** Achados 2 e 4.

#### D5 · Sobre o propósito
- **Muda.** Títulos brancos, subtítulo e parágrafos branco/`#C7C4BD`. Barra da citação: amarela
  (12,92). No claro é só decorativa (1,46); no escuro fica bem mais visível. Os círculos dos passos ficam
  amarelos com numeral tinta.
- **Ambíguo.** A barra amarela da citação passa a chamar muito mais atenção no escuro do que no claro. Não
  é problema de contraste; é de peso visual. O designer confirma?

### E · Intercessão, altar e marcos

#### E1 · Intercessão do dia
- **Muda.** Fundo `#1A1917`. Pílula amarela / tinta. Ênfase branca com realce (achado 1). Cinco blocos
  `surface` `#1A1A19` sobre o quente: **1,01** (achado 2). Círculos numerados amarelos com numeral tinta.
  "Abrir no leitor" em `text` sublinhado (branco).
- **Ambíguo.** Achados 1 e 2. Aqui o achado 2 pesa mais: os cinco passos são a estrutura da tela.

#### E2 · Modo altar — **SUPERFÍCIE FIXA (tinta)**
- **Não muda.** Tudo em `fixedPalette('ink')`.
- **Ponto antigo, igual nos dois temas:** o segmento vazio `#3D3A36` sobre a tinta mede **1,67 ABAIXO**. O
  "Passo 3 de 5" escrito carrega o dado, e o segmento atual amarelo se distingue do vazio (7,74). Não é
  coisa do tema escuro. Barra de status: achado 5.

#### E3 · Marco — **SUPERFÍCIE FIXA (amarelo)**
- **Não muda.** Fundo `#FFD100`, numeral `#111111`, frase `#3F3D38` (7,42), régua em tinta sobre trilha
  `rgba(17,17,17,0.22)`, pomba **preta**, primário tinta com rótulo branco. Tudo por
  `fixedPalette('yellow')`.
- **Ambíguo.** (1) Barra de status com ícones escuros fixos (achado 5). (2) **Não é contraste, é
  conforto:** à noite, no tema escuro, a tela cheia de amarelo aparece de uma vez. A regra do TOKENS é
  explícita (fixo) e eu não mudaria sem o designer. Deixo como pergunta: uma transição de 220 ms basta, ou
  ele prefere outra coisa?

#### E4 · Chegada do dia 100 — **SUPERFÍCIE FIXA (tinta)**
- **Não muda.** Numeral amarelo (12,92), título `#FFFFFF`, "Apocalipse 21:5" `#C7C4BD` (10,84), filetes,
  botão amarelo. Barra de status: achado 5.

#### E5 · Campanha encerrada
- **Muda.** "83" branco, régua (como D1), texto branco/`#C7C4BD`, primário branco, contornado branco.
- **Nada de novo** a decidir.

### F · Entrada e estados

#### F1 · Boas-vindas — **SUPERFÍCIE FIXA (amarelo)**
- **Não muda.** Fundo amarelo, pomba **preta** (declarada explicitamente; o código já faz isso), título
  tinta, texto `#3F3D38` (7,42), primário tinta. Barra de status: achado 5. Mesma observação de conforto
  do E3: é a primeira tela que a pessoa vê.

#### F2 · Como você vai ler
- **Muda.** Opção selecionada: borda 2,5 px **branca**, círculo **amarelo** com ponto **tinta**. Não
  selecionada: borda 1,5 px `#8A857C` (5,15) e círculo vazado. O estado continua por forma (borda mais
  grossa + círculo cheio). Primário branco. Desabilitado com 0,45: botão `#7C7C7C` (4,52 contra a página),
  rótulo **4,37 ABAIXO** (no claro, 3,03). É inativo e isento, mas precisa ser declarado.

#### F3 · Carregando
- **Muda.** Esqueleto `#0B0B0B` sobre `#1A1917` (1,12; no claro 1,08). É decorativo, porque o texto
  "Carregando…" diz o estado.
- **Ambíguo.** No escuro o esqueleto fica "mais fundo" que o bloco. No claro ele é um pouco mais escuro
  que o bloco, e no escuro também, então a regra se mantém. Se o designer preferir esqueleto "mais claro",
  a opção é `#232220` (1,11).

#### F4 · Sem internet
- **Muda.** A faixa passa de `#111111` para `#6B6A63`. Faixa/página 3,48, texto branco 5,43, ponto
  amarelo 3,72. **Tudo passa.** Ver achado 8 e a seção 4.3.

#### F5 · Erro
- **Muda.** Círculo `#232220` com "!" branco (15,90). Título branco, texto branco/`#C7C4BD`. Primário
  branco, sublinhado branco.

#### F6 · Lista vazia
- **Muda.** Círculo `#232220` com cadeado branco, título branco, frase `#C7C4BD`, contornado branco.

---

## 4. Peças comuns e medições de apoio

### 4.1 Vidro

A conta abaixo é o pior caso matemático, **sem desfoque**. O desfoque real do iOS mistura as cores e fica
entre esses extremos.

| Barra | O que rola por trás | Cor resultante | Par | Contraste |
|---|---|---|---|---|
| Navegação escura (0,88) | foto branca | `#353533` | item inativo `#A6A29A` | **4,83** |
| idem | amarelo | `#352F14` | item inativo | 5,27 |
| idem | azul claro | `#2B2D30` | item inativo | 5,43 |
| idem | página | `#191816` | item inativo | 6,98 |
| idem | qualquer | — | aba ativa amarela contra o vidro | 8,41 a 12,14 |
| Android sem desfoque | — | `#1A1A19` sólido | item inativo | 6,85 |
| Topo do leitor (0,9) | branco | `#292929` | legenda `#A6A29A` | 5,72 |

Tudo passa. O filete do vidro (`rgba(255,255,255,0.12)`, 1,39) é decorativo. A barra flutuante tem sombra e
forma de pílula.

### 4.2 Botões (tema escuro)

| Variante | Caixa / página | Rótulo / caixa |
|---|---|---|
| primário (branco, rótulo `#1A1A19`) | 18,88 | 17,42 |
| azul (`#A9C2E8`, rótulo `#111111`) | 10,40 | 10,40 |
| amarelo (rótulo `#111111`) | 12,92 | 12,92 |
| contornado (borda branca 2 px) | 18,88 | 18,88 |
| perigo (texto `#E0817A`) | — | 6,83 |
| primário desabilitado (0,45) | 4,52 | **4,37 ABAIXO** (isento: inativo) |
| azul desabilitado (0,45) | 3,00 | **3,00 ABAIXO** (isento) |
| amarelo desabilitado (0,45) | 3,42 | **3,42 ABAIXO** (isento) |
| legenda pressionada (0,72) | — | **4,36 ABAIXO** (dura só enquanto o dedo está em cima; no claro 3,54) |

### 4.3 Faixa "sem internet": alternativas testadas

| Faixa | Faixa / página (≥3) | Texto branco (≥4,5) | Ponto amarelo (≥3) | Resultado |
|---|---|---|---|---|
| **`#6B6A63` (atual)** | **3,48** | **5,43** | **3,72** | passa nos três |
| `#5C5A54` | 2,74 ABAIXO | 6,90 | 4,72 | falha o limite |
| `#55534E` | 2,46 ABAIXO | 7,68 | 5,26 | falha o limite |
| `#3D3A36` | 1,67 ABAIXO | 11,31 | 7,74 | falha o limite |
| `#FFFFFF` com texto `#111111` | 18,88 | 18,88 (tinta) | 1,46 ABAIXO | o ponto precisaria virar tinta; a faixa gritaria no escuro |
| `#1A2231` com borda 1,5 px `#A9C2E8` | a borda dá 10,40 | 15,94 | 10,91 | passa, **mas** usa o azul da comunidade para falar da leitura |

Recomendação: manter `#6B6A63`. A segunda opção é a azul com borda. Quem escolhe é o designer.

### 4.4 Pares abaixo do mínimo que o tema escuro **não** criou

Estes pares já existem no claro com valor parecido. Foram aceitos lá porque não carregam o dado sozinhos:
sempre há forma, altura ou texto junto.

| Elemento | Escuro | Claro |
|---|---|---|
| ponto e pontilhado de dia futuro, traço futuro da régua, segmento vazio (`borderStrong`) | 1,41–1,67 | 1,45 |
| alça da folha | 1,54 | ~1,45 |
| trilha de progresso (`surfaceSunken`) contra a página | 1,04 | 1,19 |
| bloco quente contra a página | 1,07 | 1,09 |
| faixa azul da linha em aberto contra a página | 1,18 | 1,18 |
| borda de bloco e filete | 1,30–1,39 | 1,13–1,18 |
| "Excluir" desabilitado | 2,28 | 2,14 |

Não cobrem limite de controle tocável. As exceções são o campo de texto (B5, C3, C6) e as caixas de D2:
ali pergunto se deve haver borda (seção 3).

### 4.5 Token sem uso

`accentSoft` (`#3A3100` no escuro) não é usado em nenhuma tela. Contra a página mede 1,46 e com texto
branco mede 12,97. Se o designer quiser um realce "rebaixado" no escuro (branco sobre `#3A3100`), a medida
serve. Hoje eu não usaria: o realce do achado 1 resolve com tinta sobre amarelo, igual ao claro.

---

## 5. O que peço ao designer (lista para responder)

1. **Realce:** a palavra dentro do amarelo é sempre `#111111`, nos dois temas? (achado 1)
2. **Bloco sobre fundo quente no escuro:** `surfaceMuted` `#232220` + borda? (achado 2; A3, B3, D4, E1)
3. **Folha modal no escuro:** filete no topo, ou outra solução? (achado 3)
4. **Anel de "não leu" em D4** e **borda da caixa de jejum em A3:** `controlBorder`? (achado 4)
5. **Pomba branca:** é variante aprovada da marca? Resolução @2x/@3x? (achado 6; é a mesma pendência do
   REGRAS §5 item 3)
6. **Amém:** segundo estado e licença (REGRAS §5 item 2). No escuro, tingir de branco.
7. **Faixa "sem internet":** `#6B6A63` ou a variante azul com borda? (seção 4.3)
8. **Nó de hoje:** o anel continua branco no escuro? (achado 10)
9. **Interruptor desligado, área de foto tracejada, círculo tracejado de D3, barras listradas do leitor:**
   as cores não estão especificadas. As propostas estão nas telas C3, D3 e B1.
10. **Campos e caixas sem borda** (B5, C3, C6, D2): ganham limite `controlBorder`? Vale para os dois temas.
11. **Telas amarelas (F1, E3) à noite:** manter fixo como a regra diz? Proposta: sim, com a transição de
    220 ms.
12. **Fotos do feed:** confirmar que não recebem nenhum tratamento no escuro. (achado 9)

Depois das respostas, a implementação entra no teste de contraste
(`mobile/src/__tests__/contrast.test.ts`), com um caso para cada par novo desta página.
