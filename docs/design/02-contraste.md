# Contraste medido

> Parte do pacote de design. Índice em [README.md](README.md).
> Levantado do código em 2026-09-20; a fonte da verdade continua sendo o repositório.

---

# FRENTE 2 — Contraste medido (app "100 Dias", pt-BR)

**Data da medição:** 2026-09-20
**Método:** fórmula de luminância relativa da WCAG 2.1 aplicada aos hex lidos do código-fonte. Recalculei tudo do zero; nenhum número abaixo foi copiado de comentário do repositório.
**Estado do teste do projeto (FATO, rodado hoje):** `npx jest src/__tests__/contrast.test.ts` → **70 testes, 70 passando**.

**Mínimos aplicados:**

| Critério | Exige |
|---|---|
| WCAG 2.1 SC 1.4.3 — texto normal | 4,5:1 |
| WCAG 2.1 SC 1.4.3 — texto grande (≥24px normal, ≥18,66px negrito) | 3:1 |
| WCAG 2.1 SC 1.4.11 — não-texto (componentes de interface e objetos gráficos informativos) | 3:1 |
| Isento pela norma | componentes **inativos/desabilitados**, texto puramente decorativo, logotipos |

O teste do projeto aplica **4,5:1 a todo texto**, sem usar a concessão de texto grande. É mais severo que a norma, e nada falha por causa disso.

---

## 1. Os tokens, com valores exatos

O designer não tem o repositório: esta é a paleta inteira. Arquivo de origem: `mobile/src/ui/theme.ts`.

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `background` | `#FFFFFF` | `#111111` | fundo de tela |
| `surface` | `#FFFFFF` | `#1A1A19` | cartão/bloco |
| `surfaceWarm` | `#F7F5F0` | `#1A1917` | áreas humanas (Juntos, tela do Dia) |
| `surfaceMuted` | `#F1EFE9` | `#232220` | círculo de ícone, avatar neutro |
| `surfaceSunken` | `#EDEBE5` | `#0B0B0B` | trilha de progresso |
| `border` | `#E6E3DC` | `#2E2C29` | filete divisor 1px (decorativo) |
| `borderStrong` | `#D9D6CF` | `#3D3A36` | dia futuro, alça de folha |
| `controlBorder` | `#8A877F` | `#8A857C` | limite de controle (checkbox, pílula) |
| `text` | `#111111` | `#FFFFFF` | tinta principal |
| `textSecondary` | `#3F3D38` | `#C7C4BD` | parágrafo de apoio |
| `textMuted` | `#5C5A54` | `#A6A29A` | legenda, rótulo secundário |
| `navInactive` | `#55534E` | `#A6A29A` | aba inativa |
| `accent` | `#FFD100` | `#FFD100` | amarelo da marca (idêntico nos dois temas) |
| `accentSoft` | `#FFF3C4` | `#3A3100` | declarado, **não usado em nenhum arquivo** |
| `onAccent` | `#111111` | `#111111` | tinta que vai sobre o amarelo |
| `nodeDone` | `#3F3D38` | `#C7C4BD` | nó de dia concluído na Jornada |
| `markSurface` | `#111111` | `#FFD100` | superfície invertida da marca (papéis trocam) |
| `onMark` | `#FFD100` | `#111111` | conteúdo dentro dela |
| `alertSurface` | `#111111` | `#6B6A63` | faixa sem internet |
| `onAlert` | `#FFFFFF` | `#FFFFFF` | texto da faixa |
| `success` | `#2F6B4F` | `#6BBF92` | — |
| `warning` | `#7E601B` | `#D6AC5A` | — |
| `danger` | `#9E3B33` | `#E0817A` | — |
| `onDanger` | `#FFFFFF` | `#111111` | — |
| `readerBackground` | `#FFFFFF` | `#111111` | leitor bíblico |
| `devBanner` | `#7E601B` | `#D6AC5A` | aviso de conteúdo DEV |
| `devBannerSurface` | `#F6ECD4` | `#2A2313` | fundo do aviso |

Superfícies **fixas**, que não mudam com o tema (nas duas telas de tinta e na tela de marco):
`#111111` (tinta) e `#FFD100` (amarelo). Sobre tinta o conteúdo é `#FFFFFF`, `rgba(255,255,255,0.78)` e `#FFD100`. Sobre amarelo o conteúdo é `#111111` e `#3F3D38`.

Camada de vidro (não faz parte da paleta e **não é coberta por nenhum teste**):
`light rgba(255,255,255,0.82)` · `warm rgba(247,245,240,0.84)` · `reader rgba(255,255,255,0.86)` · `darkLight rgba(17,17,17,0.82)` · `darkWarm rgba(26,25,23,0.84)` · `hairline rgba(17,17,17,0.08)` · `hairlineDark rgba(255,255,255,0.12)` · `scrim rgba(17,17,17,0.5)` · `blockBorder rgba(17,17,17,0.06)` · `blockBorderDark rgba(255,255,255,0.10)`.

---

## 2. Razões medidas

### 2.1 Texto sobre fundo e sobre superfícies de bloco — mínimo 4,5:1

| Par | Claro | Escuro | Veredito |
|---|---|---|---|
| `text` / `background` | **18,88** (`#111111` sobre `#FFFFFF`) | **18,88** (`#FFFFFF` sobre `#111111`) | passa nos dois |
| `text` / `surface` | **18,88** | **17,42** (`#FFFFFF` sobre `#1A1A19`) | passa |
| `text` / `surfaceWarm` | **17,33** | **17,57** | passa |
| `text` / `surfaceMuted` | **16,42** | **15,90** | passa |
| `text` / `surfaceSunken` | **15,84** | **19,68** | passa |
| `text` / `readerBackground` | **18,88** | **18,88** | passa |
| `textSecondary` / `background` | **10,85** | **10,84** | passa |
| `textSecondary` / `surface` | **10,85** | **10,00** | passa |
| `textSecondary` / `surfaceWarm` | **9,96** | **10,09** | passa |
| `textSecondary` / `surfaceMuted` | **9,43** | **9,13** | passa |
| `textSecondary` / `surfaceSunken` | **9,10** | **11,30** | passa |
| `textMuted` / `background` | **6,90** | **7,42** | passa |
| `textMuted` / `surface` | **6,90** | **6,85** | passa |
| `textMuted` / `surfaceWarm` | **6,33** | **6,91** | passa |
| `textMuted` / `surfaceMuted` | **6,00** | **6,25** | passa |
| `textMuted` / `surfaceSunken` | **5,78** | **7,74** | passa |
| `danger` / `background` | **6,72** | **6,83** | passa |
| `danger` / `surface` | **6,72** | **6,30** | passa |
| `danger` / `surfaceWarm` | **6,16** | **6,35** | passa |
| `onDanger` / `danger` | **6,72** (`#FFFFFF` sobre `#9E3B33`) | **6,83** (`#111111` sobre `#E0817A`) | passa |
| `success` / `background` | **6,29** | **8,54** | passa |
| `warning` / `background` | **5,87** | **8,91** | passa |
| `warning` / `surfaceWarm` | **5,39** | **8,29** | passa |
| `devBanner` / `devBannerSurface` | **5,00** | **7,35** | passa |

O par mais apertado de todo o sistema de texto é `devBanner` / `devBannerSurface` no tema claro: **5,00:1**. Folga de 0,5 sobre o mínimo. Qualquer clareamento do `#F6ECD4` ou do `#7E601B` derruba esse par primeiro.

### 2.2 Conteúdo sobre `markSurface`, `alertSurface` e o amarelo da marca

| Par | Claro | Escuro | Mínimo | Veredito |
|---|---|---|---|---|
| `onMark` / `markSurface` | **12,92** (`#FFD100` sobre `#111111`) | **12,92** (`#111111` sobre `#FFD100`) | 4,5 | passa; os dois sentidos medem igual |
| `markSurface` / `background` (a marca se destacar da página) | **18,88** | **12,92** | 3 | passa |
| `markSurface` / `surface` | **18,88** | **11,92** | 3 | passa |
| `markSurface` / `surfaceWarm` | **17,33** | **12,02** | 3 | passa |
| `onAlert` / `alertSurface` | **18,88** (`#FFFFFF` sobre `#111111`) | **5,43** (`#FFFFFF` sobre `#6B6A63`) | 4,5 | passa |
| `alertSurface` / `background` (a faixa existir como faixa) | **18,88** | **3,48** | 3 | passa, com 0,48 de folga |
| ponto amarelo da faixa / `alertSurface` | **12,92** | **3,72** | 3 | passa |
| `onAccent` / `accent` (tinta sobre amarelo: pílula de aba ativa, botão amarelo, realce) | **12,92** | **12,92** | 4,5 | passa |
| `text` / `accent` — **amarelo como superfície, tinta vinda do tema** | **12,92** | **1,46** | 4,5 | **FALHA no escuro** (ver §4.1) |

O par invertido é simétrico por construção: `#111111` e `#FFD100` medem **12,92:1** em qualquer ordem. É por isso que trocar os papéis entre os temas funciona.

### 2.3 Telas de tinta fixa (modo altar, Dia 100) e tela de marco (amarelo fixo)

Fundo `#111111` em **ambos** os temas:

| Elemento | Cor | Razão sobre `#111111` | Mínimo | Veredito |
|---|---|---|---|---|
| Corpo, título, passo (`WHITE`) | `#FFFFFF` | **18,88** | 4,5 | passa |
| Texto de apoio (`WHITE_SOFT`) | `rgba(255,255,255,0.78)` → composto `#CBCBCB` | **11,64** | 4,5 | passa |
| Rótulo caixa-alta, numeral do Dia 100, marcador de lista, "Passo X de N" | `#FFD100` | **12,92** | 4,5 | passa |
| Pontos de passo inativos (`WHITE_DIM`) | `rgba(255,255,255,0.3)` → `#585858` | **2,65** | — | isento: são `aria-hidden`, puramente decorativos; o passo é dito em texto a 12,92:1 |
| Ponto ativo × ponto inativo | `#FFD100` × `#585858` | **4,87** | — | a distinção entre os pontos, se contasse, passaria |
| Régua, traço de dia concluído | `#FFD100` | **12,92** | 3 | passa |
| Régua, traço de dia futuro | `rgba(255,209,0,0.30)` → `#584B0C` | **2,18** | 3 | **abaixo** (ver §4.3) |

Fundo `#FFD100` em ambos os temas (tela de marco de 25/50/75 dias):

| Elemento | Claro | Escuro | Mínimo | Veredito |
|---|---|---|---|---|
| Título e numeral (`#111111` fixo) | **12,92** | **12,92** | 3 (texto grande: 34px / 236px) | passa |
| Texto de celebração (`#3F3D38` fixo) | **7,42** | **7,42** | 4,5 | passa |
| Rótulo caixa-alta (`#111111` fixo) | **12,92** | **12,92** | 4,5 | passa |
| Botão primário — caixa vem do tema | **12,92** (`#111111`) | **1,46** (`#FFFFFF`) | 3 | **FALHA no escuro** |
| Botão sublinhado — rótulo vem do tema | **12,92** | **1,46** | 4,5 | **FALHA no escuro** |
| Régua, traço de dia concluído — vem do tema | **12,92** | **1,46** | 3 | **FALHA no escuro** |
| Régua, traço de dia futuro — vem do tema | **1,01** (`#D9D6CF`) | **7,74** (`#3D3A36`) | 3 | **FALHA no claro** |
| Régua, miolo do círculo de dia em aberto | **1,46** | **11,92** | — | não ocorre: círculo só existe na variante padrão |

### 2.4 Rótulos de aba (tab bar de vidro)

No Android a barra é opaca (`surface`). No iOS é um BlurView `intensity={40}` com tint rgba por cima — o número exato depende do que está rolando atrás. Dei os extremos.

| Situação | Aba inativa (`navInactive`) | Aba ativa (`text`) | Pílula amarela | Mínimo |
|---|---|---|---|---|
| Android claro, barra opaca `#FFFFFF` | **7,68** | **18,88** | **1,46** | 4,5 / 4,5 / 3 |
| Android escuro, barra opaca `#1A1A19` | **6,85** | **17,42** | **11,92** | idem |
| iOS claro, página branca atrás → composto `#FFFFFF` | **7,68** | **18,88** | **1,46** | idem |
| iOS escuro, página `#111111` atrás → composto `#111111` | **7,42** | **18,88** | **12,92** | idem |
| **Pior caso** iOS claro, bloco de tinta rolando atrás → `#D4D4D4` | **5,18** | **12,74** | — | passa |
| **Pior caso** iOS escuro, amarelo rolando atrás → `#3C340E` | **4,89** | **12,43** | — | passa |

Texto de aba: **passa em todos os cenários**, inclusive o pior. A folga mínima é 4,89 contra 4,5.
**A pílula amarela da aba ativa mede 1,46:1 contra o vidro claro** — muito abaixo de 3:1. Isso é aceito porque a pílula não é o único indicador do estado selecionado: o ícone muda, a tinta do ícone muda para `#111111`, o peso do rótulo muda de Archivo 600 para Archivo 700, e o item anuncia `selected` ao leitor de tela.

Filete superior da barra: `rgba(17,17,17,0.08)` → **1,18:1** no claro; `rgba(255,255,255,0.12)` → **1,39:1** no escuro. É decorativo e nunca é o único separador.

### 2.5 Bordas e elementos não-textuais — mínimo 3:1

| Par | Claro | Escuro | Veredito |
|---|---|---|---|
| `controlBorder` / `background` | **3,59** | **5,15** | passa |
| `controlBorder` / `surface` | **3,59** | **4,75** | passa |
| `controlBorder` / `surfaceWarm` | **3,29** | **4,79** | passa |
| `controlBorder` / `surfaceMuted` | **3,12** | **4,33** | passa, com 0,12 de folga |
| `controlBorder` / `surfaceSunken` | **3,01** | **5,37** | passa, com 0,01 de folga — **este é o par mais frágil do sistema inteiro** |
| `nodeDone` / `surface` | **10,85** | **10,00** | passa |
| `surface` / `nodeDone` (check dentro do nó) | **10,85** | **10,00** | passa |
| `success` / `surface` (ícone de concluído) | **6,29** | **7,87** | passa |
| `border` / `surface` (filete divisor) | **1,28** | **1,25** | abaixo de 3, **por decisão**: o filete é decorativo, nunca o único indicador de um controle |
| `borderStrong` / `surface` (dia futuro, alça de folha) | **1,45** | **1,54** | abaixo de 3, mesma decisão |
| `accent` / `surfaceSunken` (preenchimento de progresso) | **1,23** | **13,47** | abaixo de 3 no claro — **exceção registrada**, ver §3 |
| `blockBorder` / `surface` (borda de bloco, 6% de tinta) | **1,13** | **1,34** | decorativa |
| `scrim` / página (folha modal) | escurece a página para **3,54:1** de diferença | **1,00** | no escuro o scrim quase não escurece nada |
| `surfaceWarm` / `background` (separação de superfícies) | **1,09** | **1,07** | separação por cor não existe; o layout precisa de outra pista |
| `surfaceMuted` / `background` | **1,15** | **1,19** | idem |
| `surfaceSunken` / `background` | **1,19** | **1,04** | idem |

### 2.6 Resumo: o que falha, o que é exceção aceita

**Falha e não está registrado como exceção** (4 itens, todos na tela de marco ou na régua sobre tinta — §4.1 e §4.3).

**Abaixo do mínimo e aceito por decisão documentada**: preenchimento amarelo de progresso (1,23:1), pílula da aba ativa (1,46:1), filetes `border` e `borderStrong`, pontos decorativos do modo altar, rastro da pomba.

**Abaixo do mínimo mas isento pela norma**: todos os estados desabilitados com `opacity` (§4.2).

---

## 3. As exceções de contraste registradas no projeto

Fonte: `docs/technical/DESIGN_IMPLEMENTATION.md`, seção 3 ("Exceção de contraste registrada"), mais os desvios da seção 2. Reproduzo o teor e confirmo cada medição.

### 3.1 Exceção formal única — preenchimento amarelo de progresso

**O que é:** o amarelo `#FFD100` que preenche a régua dos 100 dias e as barras de progresso, contra a trilha `surfaceSunken`.
**Medição (minha, confere com a do projeto):** **1,23:1** no tema claro (`#FFD100` sobre `#EDEBE5`). No escuro são 13,47:1 e o problema não existe.
**Por que foi aceita:** o amarelo **nunca carrega o dado sozinho**. Três garantias, todas verificadas no código:
1. a régua distingue os dias pela **altura e pela forma do traço** — hoje é o traço mais alto (y 2→38, 3px); concluído é médio (11→29, 2px); em aberto ganha um círculo no topo; futuro é curto e baixo (15→25, 1,6px);
2. toda barra de progresso vem com rótulo em texto e `accessibilityValue` (`accessibilityRole="progressbar"`, min/max/now preenchidos);
3. a aba ativa muda ícone, tinta do ícone, peso do rótulo e anuncia `selected` — a pílula amarela é reforço, não sinal.

O teste **mede e trava** essa exceção em vez de ignorá-la: exige que o valor fique `< 3` **e** `> 1`. Se alguém "consertar" o amarelo escurecendo-o, o teste quebra e obriga a discussão. Se alguém apagar o preenchimento, também quebra.

### 3.2 Desvio de cor assumido — borda de controle `#A9A69E` → `#8A877F`

**O handoff pedia** `#A9A69E` no contorno do círculo não selecionado (telas 01b e 01c do handoff).
**Medição:** `#A9A69E` sobre `#FFFFFF` = **2,43:1** — abaixo do mínimo de 3:1 da SC 1.4.11 para limite de controle, e o próprio handoff exige contraste acessível.
**O que foi feito:** escurecido para `#8A877F`, o tom mais próximo que passa sobre branco **e** sobre os off-whites quentes, mantendo o mesmo cinza quente. Medido hoje: **3,59:1** sobre branco, **3,29:1** sobre `#F7F5F0`, **3,12:1** sobre `#F1EFE9`, **3,01:1** sobre `#EDEBE5`.
**Consequência para o designer:** esse token está a 0,01 do limite sobre `surfaceSunken`. Ele não tem folga. Clarear `#8A877F` em um passo, ou escurecer `surfaceSunken`, reprova.

### 3.3 Desvio estrutural assumido — tema escuro

O handoff especifica **aparência clara**. O app já oferecia tema escuro e removê-lo seria regressão para quem depende dele. O tema escuro foi derivado da **própria tela 11 do handoff** (Dia 100: fundo `#111`, amarelo e branco), então as relações de marca são as mesmas: tinta e amarelo apenas trocam de papel com a superfície. É daí que vem o par `markSurface`/`onMark`, que mede 12,92:1 nos dois sentidos.

### 3.4 Regra que o teste protege explicitamente

O teste registra duas medições como **regra do sistema**, não como exceção:
- `#FFD100` sobre `#FFFFFF` = **1,46:1** — o amarelo é ilegível como texto sobre superfície clara. Essa medição é a razão de existir a proibição.
- `#FFD100` sobre `#111111` (tema escuro) = **12,92:1** — sobre superfície de tinta o mesmo amarelo passa folgado, e é assim que o handoff o usa no Dia 100.

Ou seja: a proibição não é estética, é condicional à luminância da superfície, e o teste diz exatamente onde ela vale.

---

## 4. O que o teste NÃO enxerga

O teste tem duas metades e as duas têm limite conhecido.
**Metade 1 — lista de pares:** 22 pares de texto e 10 de não-texto, escritos à mão, comparando **tokens do tema entre si**. Qualquer par fora dessa lista é invisível ao teste. Qualquer cor que não seja token (rgba inline, hex fixo, composto de opacidade) também.
**Metade 2 — scanner de superfícies invertidas:** varre `mobile/src` procurando um defeito específico (fundo de tinta com conteúdo da marca). Ele lê **texto**, não o programa. O próprio arquivo declara isso em `mobile/src/__tests__/contrast.test.ts:152-157` — "é rede de proteção contra reincidência, não prova de ausência".

Abaixo, o que escapa, com arquivo e linha.

### 4.1 Superfície fixa amarela com tinta vinda do tema — três falhas reais

`mobile/src/app/marco/[day].tsx:104` declara `<Screen tone={isArrival ? 'ink' : 'yellow'}>`. A variante `'yellow'` resolve para `#FFD100` **fixo nos dois temas** (`mobile/src/ui/components.tsx:44`). Nas telas de marco de 25/50/75 dias, o conteúdo hardcoded está correto (§2.3), mas **três elementos pegam a cor do tema** e no tema escuro `colors.text` é `#FFFFFF`:

| Arquivo:linha | Elemento | Medição no escuro | Mínimo | Efeito |
|---|---|---|---|---|
| `mobile/src/app/marco/[day].tsx:210-217` | `<Button variant="underline">` sem `onInk` → rótulo = `colors.text` | `#FFFFFF` sobre `#FFD100` = **1,46:1** | 4,5 | texto praticamente invisível |
| `mobile/src/app/marco/[day].tsx:199-203` | `<Button>` primário sem `onInk` → caixa = `colors.text` | `#FFFFFF` sobre `#FFD100` = **1,46:1** | 3 | a caixa branca perde o contorno contra a página amarela; o rótulo dentro dela continua legível (17,42:1) |
| `mobile/src/ui/HundredDayRuler.tsx:58` | `inkTick` na variante `onYellow` = `colors.text` | `#FFFFFF` sobre `#FFD100` = **1,46:1** | 3 | os traços de dias concluídos desaparecem |

**Por que o scanner não pega:** ele procura `backgroundColor:` com `colors.text` ou `'#111111'` (regex em `contrast.test.ts:146-147`). Aqui a superfície é `#FFD100` — o inverso exato do defeito que ele conhece — e a tinta do tema é **primeiro plano**, não fundo. Nenhum dos dois padrões casa.
**Por que a lista de pares não pega:** não existe par `text` / `accent` em `TEXT_PAIRS`. O comentário no topo do teste (`contrast.test.ts:10-12`) explica a ausência: "o amarelo é PREENCHIMENTO, nunca tinta de texto. Por isso não existe par 'accent como texto' aqui — existe o par inverso, tinta sobre amarelo". A lógica é correta para a regra, mas cria o ponto cego: o amarelo **como superfície** recebendo tinta **do tema** não é medido em lugar nenhum.

### 4.2 Estados com `opacity` — cobertura zero

`opacity` em React Native compõe a subárvore inteira sobre o que está atrás. Os dois lados do par mudam, e a razão entre tokens deixa de valer. **Nenhum teste toca nisso.** Compostos calculados por mim (mistura alpha simples):

**Botão desabilitado / carregando — `mobile/src/ui/components.tsx:451` (`inactive && { opacity: 0.45 }`)**

| Variante e tema | Caixa composta | Rótulo composto | Rótulo × caixa |
|---|---|---|---|
| `primary`, claro, página branca | `#949494` | `#FFFFFF` | **3,03** |
| `primary`, claro, página `#F7F5F0` | `#908E8C` | `#FBFAF7` | **3,13** |
| `primary`, escuro, página `#111111` | `#7C7C7C` | `#151515` | **4,37** |
| `yellow`, claro, página branca | `#FFEA8C` | `#949494` | **2,51** |
| `yellow`, escuro / sobre tinta | `#7C6709` | `#111111` | **3,42** |
| `outline`, claro: borda e rótulo compostos sobre branco | `#949494` | — | **3,03** |
| `danger` (texto), claro | — | `#D3A7A3` | **2,14** |
| `danger` (texto), escuro | — | `#6E4340` | **2,28** |

**Outros sítios de opacidade**

| Arquivo:linha | O que é | Composto | Razão | Mínimo se não fosse isento |
|---|---|---|---|---|
| `mobile/src/app/grupo/[id].tsx:289` | ferramentas de líder desativadas, `opacity: 0.5` — item | claro `#848381` sobre `#F7F5F0` | **3,48** | 4,5 |
| idem | mesma lista — legenda (`caption`/`textMuted`) | claro `#AAA8A2` sobre `#F7F5F0` | **2,18** | 4,5 |
| idem, tema escuro | legenda | `#605E59` sobre `#1A1917` | **2,71** | 4,5 |
| `mobile/src/app/reflexao/[day].tsx:125` | "Excluir" desabilitado, `opacity: 0.4` | claro `#D3ABA4` | **1,90** | 4,5 |
| idem, escuro | idem | `#69433F` | **2,07** | 4,5 |
| `mobile/src/app/reader/[day].tsx:355` | capítulo anterior desabilitado, `opacity: 0.35` — borda 2px + ícone | claro `#ACACAC` | **2,27** | 3 |
| idem, escuro | idem | `#646464` | **3,19** | 3 |
| `mobile/src/ui/FlyingDove.tsx:132` | rastro da pomba, `opacity` 0,34 / 0,22 / 0,12 | claro **2,22** / **1,62** / **1,30** | escuro **3,10** / **1,97** / **1,39** | isento: `aria-hidden`, decorativo |

**Estado `pressed`, `opacity: 0.72`** — 14 ocorrências: `mobile/src/ui/components.tsx:272, 452, 546, 580, 652, 707`; `mobile/src/app/(tabs)/jornada.tsx:126, 192`; `mobile/src/app/(tabs)/juntos.tsx:92, 304`; `mobile/src/app/grupo/[id].tsx:164`; `mobile/src/app/reader/[day].tsx:195, 217, 357`; `mobile/src/app/reflexao/[day].tsx:110, 126`; `mobile/src/ui/Lockup.tsx:44, 97, 137`. Medido: corpo de texto cai para **7,57** no claro e **9,94** no escuro; `textMuted` cai para **3,54** no claro e **4,36** no escuro. É transitório e a norma não impõe mínimo a estado de pressão, mas `textMuted` pressionado fica abaixo de 4,5.

**Nota da norma:** a WCAG 2.1 isenta componentes **inativos** de 1.4.3 e 1.4.11. Logo nenhum valor acima é violação formal. São números para uma decisão editorial, não um laudo de defeito.

### 4.3 Superfícies e traços translúcidos

| Arquivo:linha | Cor declarada | Composto | Razão | Mínimo | Situação |
|---|---|---|---|---|---|
| `mobile/src/ui/HundredDayRuler.tsx:59` | `rgba(255,209,0,0.30)` (dia futuro sobre tinta) | `#584B0C` sobre `#111111` | **2,18** | 3 | **abaixo**; futuro × concluído mede 5,92, então a distinção entre estados sobrevive — mas o traço sozinho contra a página não |
| `mobile/src/ui/AltarMode.tsx:14` | `WHITE_SOFT rgba(255,255,255,0.78)` | `#CBCBCB` sobre `#111111` | **11,64** | 4,5 | passa, nunca testado |
| `mobile/src/ui/AltarMode.tsx:15` | `WHITE_DIM rgba(255,255,255,0.3)` | `#585858` sobre `#111111` | **2,65** | — | isento (decorativo, `aria-hidden` em `AltarMode.tsx:96`) |
| `mobile/src/app/marco/[day].tsx:76, 147, 180` | `rgba(255,255,255,0.78)` | `#CBCBCB` sobre `#111111` | **11,64** | 4,5 | passa, nunca testado |
| `mobile/src/ui/theme.ts:189-199` | bloco `glass` inteiro | — | — | — | **`glass` não é parte de `palettes`**, então nem o teste de "todo token é hex de 6 dígitos" (`contrast.test.ts:84-88`) nem nenhum par o alcança |
| `mobile/src/ui/TabBar.tsx:47, 100` | `glass.darkLight`/`glass.light` + BlurView `intensity={40}` | ver §2.4 | 4,89–7,68 | 4,5 | passa nos extremos; o valor real do iOS não é calculável por matemática de alpha |
| `mobile/src/app/reader/[day].tsx:184` | `glass.reader` / `glass.darkLight` na barra de topo | pior caso `#DEDEDE` | **14,04** | 4,5 | passa com folga grande |
| `mobile/src/ui/components.tsx:249` | `glass.blockBorder` / `blockBorderDark` | `#F1F1F1` / `#313130` | **1,13** / **1,34** | — | decorativa |
| `mobile/src/ui/components.tsx:896` | `glass.scrim rgba(17,17,17,0.5)` | sobre branco `#888888`; sobre `#111111` → `#111111` | **3,54** / **1,00** | — | no tema escuro o scrim praticamente não separa a folha da página |

**O que a matemática de alpha não modela:** o `BlurView` do `expo-blur` desfoca **e** clareia/escurece conforme a plataforma, antes de o tint rgba entrar. Nenhum número estático é autoritativo no iOS. Só medição em tela real resolve.

### 4.4 Pares de token que simplesmente não estão na lista

Medi todos; **todos passam**, mas nenhum está protegido contra regressão:

`onAlert`/`alertSurface` (18,88 / 5,43) · `accent`/`alertSurface`, o ponto amarelo (12,92 / 3,72) · `alertSurface`/`background` (18,88 / 3,48) · `text`/`surfaceSunken` (15,84 / 19,68) · `textSecondary`/`surfaceMuted` (9,43 / 9,13) · `textSecondary`/`surfaceSunken` (9,10 / 11,30) · `textMuted`/`surfaceSunken` (5,78 / 7,74) · `navInactive`/`background` (7,68 / 7,42) · `danger`/`surface` (6,72 / 6,30) · `danger`/`surfaceWarm` (6,16 / 6,35) · `success`/`background` (6,29 / 8,54) · `warning` em qualquer superfície (5,39 a 8,91) · `devBanner`/`surface` (5,87 / 8,22) · `nodeDone`/`background` (10,85 / 10,84) · `nodeDone`/`surfaceWarm` (9,96 / 10,09) · `controlBorder`/`surfaceSunken` (3,01 / 5,37 — **o par mais frágil do sistema e não está testado**) · `text`/`accentSoft` (16,97 / 12,97) · `textSecondary`/`accentSoft` (9,75 / 7,45) · `textMuted`/`accentSoft` (6,20 / 5,10).

`accentSoft` (`theme.ts:52` e `:105`) não aparece em nenhum par testado **nem em nenhum arquivo do app** — é um token declarado e não usado.

### 4.5 Limites mecânicos do scanner

Todos em `mobile/src/__tests__/contrast.test.ts`:

| Linha | Limite | Consequência concreta |
|---|---|---|
| `146` | `INK_BACKGROUND` exige `backgroundColor:` e `colors.text` **na mesma linha** | um objeto de estilo quebrado em duas linhas pelo formatador escapa |
| `147` | `FIXED_INK_BACKGROUND` só reconhece `'#111111'` e `'#111'` | `'#111112'`, `rgb(17,17,17)` ou `'#111111FF'` escapam |
| `148` | `FIXED_SURFACE_GATE` libera qualquer linha com `onInk`, `tone ===`, `variant ===`, `isArrival` ou `tone ?` | uma superfície fixa **errada** que mencione qualquer um desses nomes passa sem análise |
| `149` | `BRAND_CONTENT` é sensível a maiúsculas no literal `'#FFD100'` | `'#ffd100'` minúsculo escapa |
| `159-190` | resolve **um** nível de apelido local (`const bg = '#111111'`) | cor vinda de outro módulo, de dentro de um objeto, ou com duas indireções passa — o próprio teste declara isso em `152-157` |
| `181` | janela de 20 linhas abaixo do fundo | conteúdo da marca mais distante que isso não é associado ao fundo |
| `186` | `if (/^\s*<\//.test(lines[k])) return;` — para na **primeira** linha que começa com `</` | se houver um elemento aninhado antes, o scanner encerra no fechamento **dele** e não vê o resto dos filhos |
| `221` | raiz da varredura é `mobile/src`; `230` filtra `.ts`/`.tsx`; `225` pula `__tests__` | cores fora de `src` (splash, ícone adaptativo, configuração nativa) não são varridas |
| — | o scanner só entende `backgroundColor:` de estilo React Native | **superfícies em SVG são invisíveis**: `HundredDayRuler.tsx:61` define `openFill = variant === 'onInk' ? '#111111' : colors.surface`, uma superfície de tinta dentro de `<Circle fill=...>`, que nenhum padrão do scanner alcança |

### 4.6 Superfície fixa de tinta que perde a forma na página escura

`mobile/src/app/(tabs)/juntos.tsx:275` usa `<Block tone="ink">` para o recado da liderança. `mobile/src/ui/components.tsx:238-239` resolve isso para `#111111` fixo, e `components.tsx:248` remove a borda quando `tone === 'ink'` (`borderWidth: 0`).

| Tema | Bloco × página | Conteúdo dentro do bloco |
|---|---|---|
| Claro (`surfaceWarm #F7F5F0`) | **17,33:1** — o bloco é um retângulo preto nítido | amarelo 12,92 / branco 18,88 |
| Escuro (`surfaceWarm #1A1917`) | **1,07:1** — o bloco **deixa de ter forma**; sem borda, some na página | amarelo 12,92 / branco 18,88 |

O texto continua perfeitamente legível; o que desaparece é o cartão. O scanner não flagra porque a expressão em `components.tsx:238` contém `tone ===`, que o `FIXED_SURFACE_GATE` (`contrast.test.ts:148`) trata como declaração legítima de superfície fixa — e ela é legítima; o que o gate não verifica é se a superfície fixa ainda **se distingue da página** no outro tema. Compare com `markSurface`, que tem exatamente esse teste (`markSurface`/`background` ≥ 3:1, `contrast.test.ts:67`). `tone="ink"` não tem o equivalente.

---

## 5. A regra da marca, em uma frase

> **O amarelo `#FFD100` é preenchimento, contorno e realce — nunca tinta de texto sobre superfície clara** (mede 1,46:1 sobre branco, ilegível); ele só vira cor de letra sobre superfície de tinta `#111111`, onde mede 12,92:1, e sobre ele só entra `#111111`.

Corolário prático para o designer: onde o amarelo é fundo, a tinta é `#111111` (12,92:1); onde a tinta é fundo, o amarelo é o conteúdo (12,92:1). Os dois sentidos medem igual — é isso que permite ao par `markSurface`/`onMark` trocar de papel entre os temas sem perder contraste. O que **não** pode acontecer em nenhum dos dois é um terceiro valor entrar no par: branco sobre amarelo mede 1,46:1 e amarelo sobre branco mede 1,46:1.


---

## O que ficou em aberto neste levantamento

- Grande texto: a norma WCAG 2.1 permite 3:1 para texto grande (>=24px regular ou >=18,66px em negrito). O teste do projeto aplica 4,5:1 a TODO texto, sem exceção. Não sei se essa severidade extra foi decisão deliberada ou simples simplificação do teste — não muda nenhum resultado (tudo que é grande já passa 4,5), mas muda o que o designer pode propor.
- Tab bar de vidro no iOS: o valor real não é calculável. A barra é um `expo-blur` BlurView com `intensity={40}` E um tint rgba por cima; o desfoque muda a cor efetiva de um jeito que a matemática de alpha não modela. Dei os dois extremos (página uniforme e pior caso com bloco de tinta/amarelo rolando por baixo). O número exato só sai de medição em tela real, que não fiz.
- Tela de marco (fundo amarelo fixo) no tema escuro: medi três falhas reais (botão sublinhado 1,46:1, caixa do botão primário 1,46:1, traços da régua 1,46:1). NÃO sei se a intenção do projeto é que essa tela tenha tema escuro — o tema escuro é um desvio declarado do handoff, e a tela 11 (Dia 100) é a única que o handoff desenha invertida. Pode ser que a correção certa seja forçar tinta fixa na tela de marco em vez de mexer em cor. Isso é decisão de produto, não minha.
- Bloco `tone="ink"` sobre página escura mede 1,07:1 de borda. A WCAG não exige 3:1 para o limite de um contêiner decorativo (só para componentes de interface e objetos gráficos que carregam informação). Se o bloco preto do recado de liderança é 'só um cartão' ou 'um elemento de marca que precisa ser reconhecido', é chamada de design — não decidi.
- Estados desabilitados com `opacity`: a WCAG 2.1 isenta explicitamente componentes de interface inativos de 1.4.3 e 1.4.11. Logo, nenhum dos valores que medi abaixo de 4,5 nesses estados é violação formal. Se a igreja quer legibilidade acima do mínimo legal nesses estados é escolha editorial; registrei os números para que a escolha seja informada, não para acusar defeito.
- `accentSoft` (#FFF3C4 claro / #3A3100 escuro) está declarado no tema mas NÃO é usado em nenhum arquivo do app. Medi os pares por completude. Não sei se é resíduo ou reserva intencional.
- O scanner de superfícies invertidas cobre apenas `mobile/src` e apenas arquivos .ts/.tsx. Cores fora de src (splash, ícone adaptativo, configuração nativa) não foram verificadas por mim nesta frente — fora do escopo pedido, mas o designer precisa saber que esse canto está em branco.
- Não medi o efeito do desfoque do BlurView nem a gama real de tela de dispositivo. Todos os números vêm da fórmula de luminância relativa da WCAG 2.1 aplicada aos hex do código, que é exatamente o que o teste do projeto faz.
