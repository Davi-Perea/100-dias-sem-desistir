# Sistema de tokens e primitivos

> Parte do pacote de design. Índice em [README.md](README.md).
> Levantado do código em 2026-09-20; a fonte da verdade continua sendo o repositório.

---

> Levantamento para pacote de handoff a designer externo. Todos os valores abaixo foram lidos do código em
> `C:\Users\Administrator\Bible Study App\mobile\src\ui\` (nenhum arquivo foi editado). Nada aqui é arredondado ou
> inferido: quando o código não diz, está marcado como **ambíguo**.

# 1. Onde o sistema vive

| Arquivo | O que é |
|---|---|
| `mobile/src/ui/theme.ts` | Fonte única de tokens: paleta clara/escura, espaçamento, raios, calhas, tamanhos de ícone, alturas de referência, famílias tipográficas, vidro, sombra, movimento, hooks (`useTheme`, `useReducedMotion`, `useGutter`, `useRulerWidth`). |
| `mobile/src/ui/components.tsx` | Primitivos: layout, escala tipográfica (`AppText`), superfícies, ações, estados, folha modal. |
| `mobile/src/ui/fonts.ts` | Carga local das faces (Archivo + Literata) via `@expo-google-fonts`. Nada é buscado na rede em runtime. |
| `mobile/src/ui/icons.tsx` | Conjunto de 19 ícones desenhados em SVG à mão (não é biblioteca). |
| `mobile/src/ui/brand.tsx` | A pomba da Lagoinha (`Dove`). |
| `mobile/src/ui/TabBar.tsx`, `HundredDayRuler.tsx`, `SpherePill.tsx`, `FlyingDove.tsx`, `AltarMode.tsx`, `Lockup.tsx`, `OnboardingStep.tsx` | Componentes de UI **fora** de `components.tsx` (ver §6 — resumo, porque o designer não deve reinventá-los). |
| `mobile/src/__tests__/contrast.test.ts` | Auditoria de contraste WCAG 2.1 que trava mudanças de cor. É o guarda-corpo do sistema (§1.5). |

**Regra-mestra escrita no topo de `theme.ts`, verbatim:**

> Amarelo #FFD100 é preenchimento e realce: NUNCA cor de texto. Tinta é #111111.
> As superfícies são branco puro (leitura) e off-whites quentes (áreas humanas).
> (…) Alterar qualquer valor daqui exige rodar a auditoria de contraste (`src/__tests__/contrast.test.ts`) de novo.

O amarelo da marca é uma constante exportada fora da paleta:

```
export const BRAND_YELLOW = '#FFD100';
```

Ela é referenciada diretamente **40 vezes** no código do app, contra **1** uso de `colors.accent` — na prática o
amarelo é tratado como constante de marca, não como token temático (o valor é idêntico nos dois temas).

---

## 1.1 Paleta completa — 27 tokens, dois temas

Ordem e comentários são os do arquivo. Toda cor da paleta é hex de 6 dígitos (o teste de contraste exige isso).

| Token | Claro | Escuro | Para que serve |
|---|---|---|---|
| `background` | `#FFFFFF` | `#111111` | Fundo de página em Início, Jornada e leitor: superfície opaca. |
| `surface` | `#FFFFFF` | `#1A1A19` | Superfície de card / bloco de conteúdo. |
| `surfaceWarm` | `#F7F5F0` | `#1A1917` | Off-white quente das áreas humanas: aba Juntos e tela do Dia. |
| `surfaceMuted` | `#F1EFE9` | `#232220` | Círculos de ícone e avatar neutro. |
| `surfaceSunken` | `#EDEBE5` | `#0B0B0B` | Fundo de estado: trilho de barra de progresso, faixa de capítulo. |
| `border` | `#E6E3DC` | `#2E2C29` | Filete divisor de 1px. Decorativo — nunca o único indicador de um controle. |
| `borderStrong` | `#D9D6CF` | `#3D3A36` | Dias futuros, alça da folha, traços cinza, segmento vazio da barra de passos. |
| `controlBorder` | `#8A877F` | `#8A857C` | Limite de controle interativo (borda de pílula inativa, checkbox, círculo não selecionado). **DESVIO** — ver §1.4. |
| `text` | `#111111` | `#FFFFFF` | Tinta principal. Token mais usado do sistema (60 referências). |
| `textSecondary` | `#3F3D38` | `#C7C4BD` | Parágrafos de apoio. |
| `textMuted` | `#5C5A54` | `#A6A29A` | Legendas e rótulos secundários (6,4:1 sobre branco, medido). |
| `navInactive` | `#55534E` | `#A6A29A` | Ícone e rótulo de aba **inativa** na tab bar de vidro. |
| `accent` | `#FFD100` | `#FFD100` | Amarelo da marca como token. Preenchimento, progresso, seleção, marco. Nunca tinta de texto. |
| `accentSoft` | `#FFF3C4` | `#3A3100` | Amarelo rebaixado para faixas de fundo largas. **Sem nenhum consumidor no app hoje.** |
| `onAccent` | `#111111` | `#111111` | A tinta que vai **sobre** o amarelo. Sobre amarelo só entra tinta. **Sem consumidor: o código escreve `'#111111'` literal** (`Button` amarelo, `Highlight`). |
| `nodeDone` | `#3F3D38` | `#C7C4BD` | Ponto/nó de dia concluído na Jornada e na tela do Dia. |
| `markSurface` | `#111111` | `#FFD100` | Superfície da **marca invertida** (§1.2). |
| `onMark` | `#FFD100` | `#111111` | Conteúdo dentro da marca invertida (§1.2). |
| `alertSurface` | `#111111` | `#6B6A63` | Faixa de alerta “sem internet”. **DESVIO no tema escuro** — ver §1.4. |
| `onAlert` | `#FFFFFF` | `#FFFFFF` | Conteúdo da faixa de alerta: branco nos dois temas. |
| `success` | `#2F6B4F` | `#6BBF92` | Estado de sucesso / ícone de concluído. **Sem consumidor no app hoje** (só auditado pelo teste). |
| `warning` | `#7E601B` | `#D6AC5A` | Estado de atenção. **Sem consumidor no app hoje** (o valor reaparece em `devBanner`). |
| `danger` | `#9E3B33` | `#E0817A` | Texto e rótulo destrutivo (variante `danger` do botão). |
| `onDanger` | `#FFFFFF` | `#111111` | Tinta sobre `danger`. No escuro inverte porque *“branco sobre o vermelho claro do tema escuro daria 2,77:1”*. **Sem consumidor no app hoje.** |
| `readerBackground` | `#FFFFFF` | `#111111` | Fundo exclusivo da tela de leitura (tom `reader` do `Screen`). |
| `devBanner` | `#7E601B` | `#D6AC5A` | Tinta e ícone do aviso de conteúdo não autorizado. |
| `devBannerSurface` | `#F6ECD4` | `#2A2313` | Fundo desse aviso. |

**Nota de origem do tema escuro (comentário do arquivo):** ele foi derivado da própria tela 11 do handoff (Dia 100:
fundo `#111`, amarelo e branco). O handoff especifica aparência clara; o tema escuro existia antes e removê-lo seria
regressão para quem depende dele. As relações de marca são as mesmas — tinta e amarelo apenas trocam de papel com a
superfície. O tema segue o sistema operacional (`useColorScheme`), não há seletor manual no app.

### 1.2 Os pares invertidos e a regra de inversão

Uma **“superfície invertida”** é uma mini-superfície pintada com a tinta e preenchida com conteúdo da marca: o círculo
do check, a pílula selecionada, o número do passo, o avatar.

| Par | Claro | Escuro | Medição |
|---|---|---|---|
| `markSurface` / `onMark` | fundo `#111111` + conteúdo `#FFD100` | fundo `#FFD100` + conteúdo `#111111` | 12,9:1 nos dois sentidos |
| `alertSurface` / `onAlert` | fundo `#111111` + conteúdo `#FFFFFF` | fundo `#6B6A63` + conteúdo `#FFFFFF` | escuro: 3,5:1 contra a página, 5,4:1 para o texto branco, 3,7:1 para o ponto amarelo |
| `accent` / `onAccent` | fundo `#FFD100` + tinta `#111111` | igual | ≥ 4,5:1 auditado |

**A regra, que vale para qualquer coisa nova que o designer desenhar:** o fundo de uma superfície invertida **nunca**
pode ser escrito como “a cor do texto”, e o conteúdo **nunca** como “a cor da superfície”. Os dois defeitos que o par
existe para impedir estão documentados no teste de contraste:

1. fundo declarado como `text` (que no escuro é `#FFFFFF`) com conteúdo amarelo → 1,46:1, **invisível**;
2. fundo fixo em `#111111` numa tela cujo fundo segue o tema → 1:1 com a página escura, **a superfície deixa de existir**.

Fundo fixo continua legítimo **quando a tela declara que a superfície é fixa** — é o que fazem as chaves `tone`, `onInk`,
`variant` e `isArrival` (telas de marco e Dia 100, que têm fundo preto ou amarelo por desenho). Existe um *scanner* no
teste que varre o código-fonte procurando reincidência dessas duas formas.

### 1.3 Vidro, scrim, filetes e sombra (fora da paleta temática)

`glass` — **só** na camada de navegação, barras de topo e folhas. **Nunca atrás de texto bíblico.**

| Token | Valor | Onde é usado |
|---|---|---|
| `glass.light` | `rgba(255,255,255,0.82)` | Superfície da tab bar de vidro, tema claro (iOS). |
| `glass.warm` | `rgba(247,245,240,0.84)` | Vidro sobre área quente. **Sem consumidor hoje.** |
| `glass.reader` | `rgba(255,255,255,0.86)` | Barra de topo da tela de leitura, tema claro. |
| `glass.darkLight` | `rgba(17,17,17,0.82)` | Tab bar e barra do leitor no tema escuro. |
| `glass.darkWarm` | `rgba(26,25,23,0.84)` | **Sem consumidor hoje.** |
| `glass.hairline` | `rgba(17,17,17,0.08)` | Filete superior da tab bar, tema claro. |
| `glass.hairlineDark` | `rgba(255,255,255,0.12)` | O mesmo filete, tema escuro. |
| `glass.scrim` | `rgba(17,17,17,0.5)` | Scrim atrás da folha modal (`Sheet`). |
| `glass.blockBorder` | `rgba(17,17,17,0.06)` | Borda de 6% de tinta do bloco de conteúdo, tema claro. |
| `glass.blockBorderDark` | `rgba(255,255,255,0.10)` | A mesma borda, tema escuro. |

`floatShadow` — **só** em folhas flutuantes e no cartão de notificação:

```
shadowColor: '#111111', shadowOpacity: 0.4, shadowRadius: 30,
shadowOffset: { width: 0, height: 12 }, elevation: 12
```

Hoje o único consumidor é o `Sheet`. A tab bar no Android (que não usa vidro) tem sombra própria, mais discreta:
`elevation: 8`, `shadowColor '#111111'`, `shadowOpacity 0.12`, `shadowRadius 12`.

Desfoque real: `expo-blur` `BlurView` com `intensity={40}` e `tint` `light`/`dark`, **apenas no iOS**. No Android a tab bar
recebe superfície sólida (`colors.surface`) com elevação — o comentário diz explicitamente que imitar o material do iOS
ali fica errado.

### 1.4 Os dois desvios deliberados do handoff (ambos por contraste medido)

1. **`controlBorder`** — o handoff pede `#A9A69E` na borda do círculo não selecionado (telas 01b/01c). Medido, dá
   **2,43:1** sobre branco, abaixo do mínimo de **3:1** da WCAG 1.4.11 para limite de controle. Foi escurecido para
   `#8A877F`, o valor mais próximo que passa sobre branco **e** sobre os off-whites quentes (3,6:1 e 3,1:1), mantendo o
   mesmo cinza quente.
2. **`alertSurface` no tema escuro** — o handoff pede uma faixa de tinta que interrompe a página clara; uma faixa de
   tinta sobre página de tinta não existiria, então no escuro ela clareia para `#6B6A63` para continuar sendo uma faixa.

Nenhuma outra cor do handoff foi alterada.

### 1.5 Exceção de contraste registrada (o designer precisa saber disso)

O preenchimento amarelo da régua e das barras de progresso mede **~1,4:1** contra a trilha clara — abaixo de 3:1. Isso é
aceito e documentado porque **o amarelo nunca carrega o dado sozinho**: a régua diferencia os dias pela **altura** e pela
**forma** do traço, e toda barra de progresso vem com rótulo em texto mais `accessibilityValue`. Medição correlata:
amarelo da marca sobre branco = **1,46:1** (daí a proibição de amarelo como texto); no tema escuro o mesmo amarelo passa
folgado sobre a tinta.

Pares auditados automaticamente nos **dois** temas (se o designer mudar qualquer um deles, o teste quebra):

- Texto ≥ 4,5:1 — `text` sobre `background`/`surface`/`surfaceWarm`/`surfaceMuted`/`readerBackground`; `textSecondary`
  sobre `background`/`surface`/`surfaceWarm`; `textMuted` sobre `background`/`surface`/`surfaceWarm`/`surfaceMuted`;
  `navInactive` sobre `surface`/`surfaceWarm`; `onAccent` sobre `accent`; `onMark` sobre `markSurface`; `danger` sobre
  `background`; `onDanger` sobre `danger`; `devBanner` sobre `devBannerSurface`.
- Não-texto ≥ 3:1 — `controlBorder` sobre as quatro superfícies; `nodeDone` sobre `surface` e o inverso; `success` sobre
  `surface`; `markSurface` sobre `background`/`surface`/`surfaceWarm`.
- Invariantes: `onMark ≠ markSurface`; `onAccent ≠ accent`; `accent === BRAND_YELLOW` nos dois temas.

---

# 2. Tipografia

## 2.1 Fontes

Duas famílias, **empacotadas localmente** (`@expo-google-fonts/archivo` e `@expo-google-fonts/literata`, licença OFL) —
nada é buscado na rede em tempo de execução. Oito faces carregadas:

| Chave em `fonts` | Face | Papel declarado |
|---|---|---|
| `display` | `Archivo_900Black` | Display e numerais de marco. |
| `title` | `Archivo_800ExtraBold` | Títulos de tela e de bloco. |
| `label` | `Archivo_700Bold` | Rótulos, ações e caps de seção. |
| `item` | `Archivo_600SemiBold` | Itens de lista e legendas. |
| `body` | `Archivo_500Medium` | Parágrafos de interface. |
| `read` | `Literata_400Regular` | **Leitura bíblica**, reflexões, insights. |
| `readItalic` | `Literata_400Regular_Italic` | Fala da liderança. |
| `readStrong` | `Literata_600SemiBold` | Numeral de capítulo. |

**A fonte de leitura do texto bíblico é Literata 400 Regular (`fonts.read`).** Archivo é exclusivamente interface e display.

**Regra técnica que o designer não pode ignorar (comentário verbatim do arquivo):**

> Em React Native o peso vem da FAMÍLIA, não de `fontWeight`: combinar os dois faz o Android sintetizar negrito sobre uma
> face que já é negra. Por isso os estilos deste app nomeiam a face e não declaram `fontWeight`.

Nenhuma variante declara `fontWeight`. Especificar “Archivo 700” significa trocar a família, não o peso.

Carga: `useAppFonts()` devolve `true` quando as faces estão prontas **ou quando falharam** — falha de fonte não pode travar
o app numa tela branca; o texto cai na face do sistema e a jornada continua. O `_layout` segura a primeira pintura até esse
sinal para evitar salto de tipografia.

## 2.2 Escala do `AppText` — 18 variantes

`letterSpacing` do handoff vinha em `em`; aqui já está convertido para **px sobre o tamanho da variante** (os valores em
`em` originais não estão no código). Onde a coluna está vazia, a propriedade não é declarada.

| Variante | Família | Size | LineHeight | LetterSpacing | Transform | Cor padrão | Onde é usada |
|---|---|---|---|---|---|---|---|
| `displayXl` | Archivo 900 | 84 | 80 | −3.8 | — | `text` | Numeral gigante do dia: Início, Jornada, tela do Dia. |
| `display` | Archivo 900 | 56 | 55 | −2.3 | — | `text` | Início e onboarding (abertura e tela “pronto”). |
| `screenTitle` | Archivo 800 | 34 | 35 | −1 | — | `text` | Título de tela: aba Juntos, tela de grupo. |
| `blockTitleLg` | Archivo 800 | 30 | 34 | −0.6 | — | `text` | Título de bloco grande: Início, Dia, intercessão, propósito, leitor, reflexão, passo de onboarding. |
| `blockTitle` | Archivo 800 | 26 | 30 | −0.5 | — | `text` | Título de bloco: Início, Juntos, admin, conta, intercessão, jejum, lembrete, onboarding; **título do `Sheet`** (lá sobrescrito para 24/28); título do `StateView`. |
| `action` | Archivo 700 | 17 | 20 | — | `text` | Rótulo de ação/linha acionável: Início, Juntos, Dia, intercessão, propósito, reflexões; rótulo do `ChoiceRow`. |
| `item` | Archivo 600 | 15.5 | 20 | — | `text` | Item de lista: 11 telas; rótulo do `SettingRow`. |
| `caption` | Archivo 600 | 12.5 | 16 | — | `textMuted` | Legenda — a variante mais usada do app (17 telas); valor do `SettingRow`, descrição do `ChoiceRow`, “Carregando…”. |
| `cap` | Archivo 700 | 11 | 14 | 1.54 | `uppercase` | `textMuted` | Rótulo de seção em caixa alta (componente `Cap`): Juntos, admin, conta, dev, lembrete, marco, propósito. |
| `tick` | Archivo 600 | 11.5 | 15 | — | `textMuted` | Marcação de escala/eixo: Início, Jornada, Dia, leitor, “Dia 1 / Dia 100” da pomba. |
| `body` | Archivo 500 | 17 | 26 | — | `textSecondary` | Parágrafo de interface: Jornada, ajuda, Dia, intercessão, onboarding, leitor. |
| `secondary` | Archivo 500 | 15 | 22 | — | `textSecondary` | Parágrafo de apoio: 12 telas; mensagem do `StateView`; passo de onboarding. |
| `muted` | Archivo 600 | 13 | 18 | — | `textMuted` | Texto auxiliar: admin, conta, dev, lembrete. |
| `read` | **Literata 400** | 18 | 30.6 | — | `text` | Leitura longa. **Nunca chamada via `variant`** — ver §2.3. |
| `readItalic` | **Literata 400 Itálico** | 17 | 25.5 | — | `text` | Fala da liderança (tela de propósito). |
| `quote` | **Literata 400** | 16.5 | 24 | — | `text` | Citação: grupo, intercessão, propósito, reflexões. |
| `editor` | **Literata 400** | 19 | 30.4 | — | `text` | Campo de escrita (reflexão). **Sem nenhum uso no app hoje.** |
| `verse` | Archivo 600 | 11 | 16 | — | `textMuted` | Referência de versículo. **Sem nenhum uso no app hoje.** |

## 2.3 O tamanho do texto de leitura é do usuário, não da escala

A tela de leitura, a de reflexão, o Modo Altar e a prévia em “Aparência” **não** usam a variante `read`. Elas escrevem
o estilo inline com o tamanho escolhido pela pessoa:

```
fontFamily: fonts.read, fontSize, lineHeight: fontSize * 1.7
```

- `settings.readerFontSize` — **padrão 18**, mínimo **14**, máximo **30**, passo de **±2** (botões “Diminuir”/“Aumentar”).
- A entrelinha é sempre **1,7 ×** o tamanho corrente.
- Além disso o texto acompanha o tamanho de fonte do sistema (Dynamic Type), o que a própria tela avisa ao usuário.

## 2.4 Estilos tipográficos que existem fora da escala (medidos inline)

O designer vai encontrar estes valores nas telas; eles não são variantes:

| Onde | Estilo |
|---|---|
| Rótulo da tab bar | `label` (ativo) / `item` (inativo), **11px** |
| Título de header nativo | `label`, **17px** |
| Rótulo de botão | `label` **17px** (preenchido/contornado) ou `item` **15px** sublinhado (texto/destrutivo) |
| Numeral de capítulo (leitor) | `readStrong` **44 / 48** |
| Título da tela de marco | `title` **32** (Dia 100) ou **34**, lineHeight 36, letterSpacing −1 |
| Versículo da tela de marco | `readItalic` **18 / 26**, cor `rgba(255,255,255,0.78)` |
| Modo Altar | `read` **19/28** (`rgba(255,255,255,0.78)`), **24/32**, **22/31** (branco); `title` **34/38** e **26/30** |
| `SpherePill` (“GOVERNO”) | `label` **11**, letterSpacing **1.54**, uppercase |
| `OfflineBanner` | `item` **13.5 / 19** |
| `DevContentBanner` | `item` **12.5 / 17** |
| Iniciais do `Avatar` | `label`, `fontSize = size × 0.35` (14 no avatar de 40) |

---

# 3. Espaçamento, raios, calhas, ícones e alturas

## 3.1 Escalas

```
spacing  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }        // “Escala do handoff: 4 · 8 · 12 · 16 · 24 · 32”
radius   = { sm: 8, button: 14, buttonLg: 16, block: 20, blockLg: 22,
             card: 24, sheet: 28, pill: 999 }                        // botão 14–16, bloco 20–24, folha 28, pílula 999
gutter   = { screen: 26, block: 20, sheet: 14 }                      // 26 em listas e texto, 20 em blocos de largura cheia, 14 em folhas
iconSize = { sm: 18, md: 22, lg: 26 }
```

Consumo real hoje: `radius.button` (14) é o mais usado; `blockLg` (22) é o raio do bloco; `sheet` (28) é o topo da folha;
`pill` (999). **`radius.block` (20), `radius.card` (24), `gutter.block` (20) e todo o `iconSize` não têm nenhum consumidor
no código** — os tamanhos de ícone aparecem como números literais (18 em chevrons e botões, 22 na tab bar e no padrão do
`Icon`, 16 no check do `ChoiceRow`).

Ícones: `Icon` tem `size` padrão **22**, `strokeWidth` padrão **1.9**, viewBox `0 0 24 24`, `strokeLinecap`/`Linejoin`
`round`, `fill: none`, cor sempre passada pelo chamador. 19 nomes: `home`, `flag`, `users`, `person`, `book`, `note`,
`clock`, `chevron-right`, `chevron-left`, `chevron-down`, `lock`, `check`, `close`, `more`, `text-size`, `bell`, `share`,
`flag-finish`, `alert`. O comentário diz que o handoff permite trocar por Lucide/SF Symbols, mas que manter o mesmo peso
de traço em todos os tamanhos é mais simples desenhando à mão, e que **nenhum ícone carrega significado sozinho: todo
destino tem rótulo em texto**.

## 3.2 Alturas de referência — e o contrato de PISO (transcrição verbatim)

```
MIN_TOUCH         = 48   // iOS 44pt / Android 48dp — usamos o maior dos dois. Piso absoluto de toque.
BUTTON_HEIGHT     = 56   // Botão principal do handoff. Piso: a caixa cresce com o rótulo.
TAB_BAR_HEIGHT    = 86   // Tab bar de 86px, vidro. Piso: quem reserva espaço mede a barra renderizada.
MAX_CONTENT_WIDTH = 640  // Medida de leitura confortável; evita parágrafos de ponta a ponta em tablet.
```

O comentário que governa as quatro, **palavra por palavra**:

> Alturas do handoff. São PISOS de caixa, nunca medidas fixas.
>
> Consuma-as como `minHeight` com `paddingVertical`; declarar `height` com elas é o defeito. O texto cresce com o Dynamic
> Type do sistema — até 3,571× no iOS, segundo a tabela do próprio React Native — e caixa travada não acompanha: o rótulo
> atravessa a borda e, num botão preenchido, sai na cor da própria superfície, isto é, some (1,00:1). Quem precisa reservar
> espaço para uma dessas caixas mede a altura real com `onLayout` em vez de repetir a constante.

Consequências práticas já aplicadas no código, que o designer deve assumir como regra e não como exceção:

- Todo controle usa `minHeight`, nunca `height`. O respiro mora na base do botão (`paddingVertical: 12`), não nas variantes.
- A tab bar informa a altura renderizada para fora via `onHeight` (`onLayout`), para a cena reservar o espaço certo.
- A folha modal para em **88% da altura da tela** e rola por dentro; sem isso, em fonte grande ela cresceria para fora da
  tela levando o botão de fechar junto.
- A `SpherePill` tem piso 28 e não altura, porque “ARTES E ENTRETENIMENTO” quebra em duas linhas em telas estreitas.

## 3.3 Calha adaptativa e largura da régua

```
useGutter():  width ≥ 900 → 64 ;  width ≥ 600 → 40 ;  senão → 26 (gutter.screen)
useRulerWidth(): max(240, min(width, 640) − gutter × 2)
```

O handoff especifica 26px no telefone; telas maiores ganham margem em vez de repetir a calha estreita. A régua dos 100 dias
segue a geometria do handoff (`viewBox 0 0 W 40`, `x(i) = 3 + (i−1)·((W−6)/99)`), mas com W derivado da largura real.

---

# 4. Movimento

| Token / mecanismo | Valor | Onde |
|---|---|---|
| `MOTION_MS` | **220** | Duração das transições de navegação (`animationDuration` do `Stack` do expo-router). Comentário: “Transições de navegação: 200–260ms, ease-out”. |
| `FLY_MS` | **3200** | Ciclo completo do voo da pomba; cada metade dura `FLY_MS / 2` = **1600ms**. |
| Curva do voo | `Easing.inOut(Easing.ease)` | Ida e volta, em loop infinito (`Animated.loop` + `Animated.sequence`), `useNativeDriver: true`. |
| Amplitude do voo | `translateY 0 → −4` px e `rotate −4deg → −1deg` | Único movimento contínuo do app. |
| Folha modal | `Modal animationType="slide"` | Animação do sistema, sem duração declarada. |

**Como o app trata “Reduzir movimento”:**

```
useReducedMotion(): AccessibilityInfo.isReduceMotionEnabled()
                  + listener 'reduceMotionChanged' (reage à mudança em tempo real, iOS e Android)
```

- Na `FlyingDove`, quando reduzido: `fly.setValue(0)` e o loop **nunca é iniciado** — a animação desliga inteira. Isso é
  seguro porque o voo é puramente decorativo: a **posição** da pomba e o texto “X de 100” carregam o dado.
- A tela “Aparência e acessibilidade” informa ao usuário o estado atual: *“Reduzir movimento está ligado — as animações
  estão desligadas.”* / *“está desligado.”*
- Nenhum outro componente de UI (`AltarMode`, `HundredDayRuler`, `SpherePill`, `Lockup`, `OnboardingStep`) contém
  `Animated`, `Easing` ou `LayoutAnimation`. O sistema de movimento do app é, hoje, **duas coisas**: transição de tela e a
  pomba.

**Ambíguo:** a curva das transições de navegação não está no código — só a duração (220ms) é declarada; a curva é a do
stack nativo. O “ease-out” aparece apenas como intenção no comentário.

---

# 5. Primitivos exportados por `components.tsx`

23 exports. Convenções transversais: **pressionado = `opacity 0.72`** em todos os controles; **desabilitado/carregando =
`opacity 0.45`**; todo controle tem papel de acessibilidade explícito; estado nunca depende só de cor.

## 5.1 Layout

| Componente | O que é | Variantes / props | Regras de estilo que impõe |
|---|---|---|---|
| `Screen` | Raiz de tela com safe area. | `tone`: `default` \| `warm` \| `reader` \| `ink` \| `yellow`; `edges` (padrão `['top','left','right']`) | Fundo: `default → background`, `warm → surfaceWarm`, `reader → readerBackground`, `ink → #111111` fixo, `yellow → #FFD100` fixo. `flex: 1`. `ink` e `yellow` são as superfícies **declaradamente fixas**. |
| `ScreenScroll` | Conteúdo rolável com a calha e a medida de leitura. | `gap` (padrão 24), `inset` (padrão = `useGutter()`), `contentStyle` | `paddingHorizontal = inset`, `paddingTop 12`, `paddingBottom 64`, `width 100%`, `maxWidth 640 + inset×2`, `alignSelf center`, `keyboardShouldPersistTaps="handled"`. Comentário: “O mock tem altura fixa de 844px porque é um retrato de iPhone; aqui a tela rola de verdade e sobrevive a texto grande.” |

## 5.2 Tipografia

| Componente | O que é | Regras |
|---|---|---|
| `AppText` | `Text` com a escala aplicada. | `variant` (padrão `body`, 18 opções da §2.2) + `style` por cima. Aceita todas as props de `Text`. |
| `Cap` | Rótulo de seção em caixa alta. | Atalho para `variant="cap"` (Archivo 700, 11px, tracking 1.54, uppercase, `textMuted`). |
| `Highlight` | Realce tipo marca-texto. | `backgroundColor: #FFD100` + `color: #111111` — o amarelo é **fundo**, o par mede 12,9:1. Amarelo nunca vira cor de letra. |

## 5.3 Superfícies

| Componente | O que é | Variantes | Regras de estilo |
|---|---|---|---|
| `Rule` | Filete divisor. | — | `height: StyleSheet.hairlineWidth`, cor `border`. |
| `Divider` | Alias legado de `Rule`. | — | Idêntico. |
| `Block` | Bloco de conteúdo; vira botão com `onPress`. | `tone`: `surface` \| `warm` \| `muted` \| `ink` | `borderRadius 22`, borda hairline em `glass.blockBorder` / `blockBorderDark` (0 no tom `ink`), `padding 16`, `minHeight 48`, `justifyContent center`. Com `onPress`: `accessibilityRole="button"` e pressionado 0.72. Tom `ink` = `#111111` fixo. |
| `Card` | Alias de compatibilidade: mesma aparência do bloco novo. | Mesmas de `Block` | Delega tudo para `Block`. |
| `IconCircle` | Círculo de ícone das linhas da tela do Dia. | `size` (padrão **56**) | `borderRadius = size/2`, fundo `surfaceMuted`, ícone com `round(size × 0.41)` (= 23 em 56) na cor `text`. |
| `Avatar` | Avatar de iniciais na marca invertida. | `size` (padrão **40**) | Fundo `markSurface`, texto `onMark`, `label` font, `fontSize = size × 0.35`; até 2 iniciais; `aria-hidden` (o nome vem do texto ao lado). |

## 5.4 Ações

**`Button`** — hierarquia do handoff, **um primário por tela**:
> 1 primário (56px, tinta) · 2 contornado (borda 2px) · 3 texto sublinhado · 4 amarelo — só sobre preto ou em tela de marco.

| Variante | Piso de altura | Raio | Fundo | Borda | Rótulo | Padding horizontal |
|---|---|---|---|---|---|---|
| `primary` | `max(56, 48)` = 56 | 14 | tinta (`text`, ou `#FFFFFF` com `onInk`) | — | `surface` (ou `#111111` com `onInk`), Archivo 700 17px | 24 |
| `yellow` | 56 | 14 | `#FFD100` | — | `#111111`, Archivo 700 17px | 24 |
| `outline` | `max(52, 48)` = 52 | 14 | transparente | **2px** na tinta | tinta, Archivo 700 17px | 16 |
| `underline` (padrão do `switch`) | `max(44, 48)` = 48 | — | — | — | tinta, Archivo 600 **15px**, `textDecorationLine: underline` | 4 |
| `danger` | 48 | — | — | — | `danger`, Archivo 600 15px, sublinhado | 8 |

Base comum a todas: `minHeight: 48`, `paddingVertical: 12`, `flexDirection row`, `gap 8`, centralizado, `textAlign center`.
Props: `loading` → `ActivityIndicator` na cor do rótulo (substitui o texto); `disabled`/`loading` → `opacity 0.45` e
`accessibilityState { disabled, busy }`; `icon` → `Icon` de **18px** na cor do rótulo, depois do texto; `onInk` inverte
tinta e superfície para as telas de fundo preto (Dia 100); `accessibilityHint`, `testID`, `style`.
Comentário do `paddingVertical`: *“O respiro mora na base, não nas variantes: com fonte padrão a caixa de linha (18,5) mais
24 de respiro cabe nos 56 do handoff, então nada se move; em fonte grande é ele que deixa a caixa crescer com o rótulo.”*

## 5.5 Seleção e estado

| Componente | O que é | Variantes / props | Regras de estilo |
|---|---|---|---|
| `ProgressBar` | Barra de progresso (igreja, grupo, capítulo). | `value` 0–1, `height` (padrão **10**), `label` **obrigatório** | Trilho `surfaceSunken`, preenchimento `#FFD100`, `borderRadius = height/2`, `overflow hidden`. `accessibilityRole="progressbar"` com `accessibilityValue { min 0, max 100, now }` — o rótulo em texto é obrigatório porque o amarelo mede ~1,4:1 contra o trilho. |
| `Pill` | Pílula de filtro/seleção. | `active` (bool), `onPress` opcional | Interior: `minHeight 36`, `paddingVertical 8`, `minWidth 72`, `paddingHorizontal 16`, `borderRadius 999`. Ativa: fundo `markSurface`, sem borda, texto `onMark`. Inativa: fundo transparente, borda **1.5** em `controlBorder`, texto `text`. Rótulo Archivo 700 **14px**. Com `onPress`, um `Pressable` externo garante o alvo de **48**; `accessibilityState { selected }`. |
| `Chip` | Alias legado → `Pill` sem `onPress`. | Aceita `tone` (`default`/`accent`) | **O `tone` é aceito e ignorado** — não muda nada. |
| `Checkbox` | Caixa de marcação (usada no jejum). | `checked`, `onToggle`, `label` obrigatório | Alvo `48 × 48`; caixa **28 × 28**, raio **8**, borda **2px**; marcada: borda e fundo `markSurface` com ícone `check` de 18 e `strokeWidth 2.6` em `onMark`; desmarcada: transparente com borda `controlBorder`. `accessibilityRole="checkbox"`. |
| `SettingRow` | Linha de lista com valor e chevron (tela 08 e preferências). | `value?`, `onPress?`, `first?`, `accessibilityHint?` | Linha `minHeight 48`, row, `gap 12`, `paddingVertical 8`; rótulo `variant="item"` com `flex 1`; valor `variant="caption"` com `flexShrink 1`; chevron 18px em `textMuted` só quando acionável; `Rule` acima, exceto na primeira. Acessibilidade lê “rótulo, valor”. Comentário: a área tocável é estendida para 48dp **sem esticar a linha visual** (42–46px). |
| `ChoiceRow` | Linha de escolha do onboarding (rádio). | `description?`, `compact` (62 em vez de 76) | `minHeight 76` / **62** compacta, raio **16**, borda **2.5** quando selecionada (senão 1.5), cor da borda `text` / `borderStrong`, `paddingHorizontal 16`, `paddingVertical 12`, `gap 16`, fundo `surface`. Círculo **28 × 28** (raio 14): selecionado = `markSurface` sem borda com `check` de 16 e `strokeWidth 2.8` em `onMark`; senão borda 2px `controlBorder`. `accessibilityRole="radio"`. **Regra:** o estado aparece por FORMA e por cor (borda mais grossa + círculo preenchido), não só por tom — quem não distingue cor continua vendo o que está marcado. |
| `StepBar` | Barra de passos do onboarding. | `step`, `total` | Row com `gap 6`; segmentos **28 × 4**, raio **2**; preenchido `text`, vazio `borderStrong`; `aria-hidden` (o progresso é dito em texto). |
| `StateView` | Estados de carregando / vazio / erro. | `kind`: `loading` \| `empty` \| `error`; `title?`, `message?`, `action?` | Centralizado, `padding 24`, `gap 12`. `loading`: `ActivityIndicator` em `text` + `caption` “Carregando…” com `marginTop 12`. `empty`/`error`: título `blockTitle` e mensagem `secondary`, ambos centralizados, mais o nó de ação. |
| `OfflineBanner` | Faixa de estado “sem internet” (estado e4). | `message?` | `minHeight 44`, raio **14**, fundo `alertSurface`, row com `gap 12`, padding 16 / 12; ponto **8 × 8** raio 4 em `#FFD100`; texto Archivo 600 **13.5 / 19** em `onAlert`; `accessibilityRole="alert"`. Texto padrão: “Sem internet. Sua leitura, progresso e reflexões continuam salvos.” **Regra de conteúdo:** diz o que CONTINUA funcionando, não o que quebrou. |
| `DevContentBanner` | Aviso de conteúdo não liberado ao público. | `state`: `fixture` \| `pending` \| `authorized`; `compact?` | `authorized` **não renderiza nada**. Fundo `devBannerSurface`, raio 14, padding 16 / (8 compacto, 12 normal), ícone `alert` 18px em `devBanner`, texto Archivo 600 **12.5 / 17** em `devBanner`, `accessibilityRole="alert"`, `testID="content-banner"`. Não faz parte do handoff: existe para ninguém confundir o que está na tela com o que a igreja autorizou publicar. |
| `Sheet` | Folha modal (dia bloqueado e2/e3, ferramentas de líder 07). | `visible`, `onClose`, `title` | `Modal transparent animationType="slide"`; scrim `glass.scrim` clicável rotulado “Fechar”; painel em `surface` com raio **28** só no topo, `paddingHorizontal 26` (`gutter.sheet 14 + 12`), `paddingTop 12`, `paddingBottom 32 + safe area`, `gap 16`, `maxHeight 88%` da tela, mais `floatShadow`; alça **40 × 5** raio 3 em `borderStrong` centralizada; conteúdo em `ScrollView` com `gap 16`; título `blockTitle` sobrescrito para **24 / 28**. |

Tipos exportados: `ScreenTone`, `TextVariant`, `ButtonVariant`.

---

# 6. O que existe fora de `components.tsx` (para não reinventar)

Fora do escopo desta frente, mas o designer deve saber que **já existem e são gerados por código**:

- **`HundredDayRuler`** — a assinatura do produto. `viewBox 0 0 W 40`, `x(i) = 3 + (i−1)·((W−6)/99)`. Quatro variantes:
  `default` (faixa amarela + tinta), `inactive` (tudo cinza, sem faixa), `onYellow` (traços pretos), `onInk` (traços
  amarelos). A informação está na **forma** do traço: hoje é o traço mais alto (y 2→38, 3px), concluído é 11→29 (2px),
  aberto é 17→29 com círculo no topo (r 2.6), futuro é 15→25 (1.6px) em `borderStrong` ou `rgba(255,209,0,0.30)`.
- **`GlassTabBar`** — 86px, vidro no iOS / sólido com elevação no Android, ícone **e** rótulo sempre visíveis; pílula ativa
  **52 × 30** raio 15 em amarelo, com ícone `#111111`; o estado ativo também muda peso (700/`text`) e tinta contra
  (600/`navInactive`), porque amarelo sobre branco mede 1,46:1 e sozinho não serviria como indicador.
- **`FlyingDove`** — trilha de 46px de altura, trilho de 3px, 11 marcas de dez em dez dias (pontas mais altas: 14px contra
  9px), rastro de três traços (opacidade 0.34 / 0.22 / 0.12) e a pomba de 42px de largura.
- **`SpherePill`** — pílula do monte do dia, três tons (`ink`, `onInk`, `yellow`), piso 28, raio 999, rótulo 11px uppercase.
- **`Dove`** (`brand.tsx`) — proporção fixa **224 × 144**, versão preta e branca, papéis `marker` (“Você está aqui”),
  `signature` (“Lagoinha”) e `decorative` (invisível ao leitor de tela). **PENDENTE DE PRODUÇÃO:** hoje são PNGs extraídos
  do arquivo do cliente; o time de design pede o SVG oficial para substituí-los.
- **`AltarMode`**, **`Lockup`**, **`OnboardingStep`** — composições de tela existentes.

---

# 7. Incertezas e pontos ambíguos (não decididos por conta própria)

1. **Tokens sem consumidor.** `accentSoft`, `onAccent`, `success`, `warning`, `onDanger`, todo o `iconSize`,
   `radius.block`, `radius.card`, `gutter.block`, `glass.warm`, `glass.darkWarm` não são usados por nenhuma tela.
   Não sei dizer se são reserva intencional do sistema ou resíduo — o teste de contraste audita `success` e `onDanger`,
   o que sugere intenção, mas `onAccent` é contornado por um `'#111111'` literal, o que sugere descuido.
2. **`variant="editor"` e `variant="verse"` não têm nenhum uso**, e `variant="read"` nunca é chamada: a leitura usa estilo
   inline com o tamanho do usuário. Se o designer especificar “o estilo de leitura”, precisa dizer se fala da variante
   (18/30.6 fixo) ou do inline (14–30 com entrelinha 1,7×).
3. **A curva de movimento da navegação não existe no código** — só a duração de 220ms. “200–260ms, ease-out” é comentário
   de intenção, não implementação.
4. **Os valores originais de `letterSpacing` em `em`** (do handoff) não estão no código; só os px derivados.
5. **O documento de handoff em si não foi lido nesta frente.** As referências a telas (01b, 01c, 08, 11, e3, e4) vêm de
   comentários no código; não consigo confirmar numeração nem conteúdo do original a partir daqui.
6. **`Chip` aceita `tone` e ignora.** Não sei se é para ser removido ou implementado.
7. **`radius.blockLg` (22) é o raio real do bloco**, embora o comentário do sistema diga “bloco de conteúdo 20–24”. Os três
   valores existem; o código escolheu 22. Se o designer quiser 20 ou 24, é decisão dele, não deduzo.
8. **Sem tema manual.** O app segue estritamente o `useColorScheme` do sistema; não há seletor claro/escuro na UI (a tela
   de Aparência apenas informa o estado). Se o handoff previr um seletor, ele não existe.


---

## O que ficou em aberto neste levantamento

- Tokens sem nenhum consumidor no código: accentSoft, onAccent, success, warning, onDanger, iconSize.{sm,md,lg}, radius.block, radius.card, gutter.block, glass.warm, glass.darkWarm — não é possível saber se são reserva intencional ou resíduo (o teste de contraste audita success e onDanger, mas onAccent é contornado por '#111111' literal)
- As variantes de texto 'editor' e 'verse' não têm nenhum uso no app, e 'read' nunca é chamada via prop variant: a leitura bíblica usa estilo inline com fontSize do usuário (14–30, padrão 18, lineHeight = fontSize × 1.7). Ambíguo qual dos dois é 'o estilo de leitura' oficial
- A curva das transições de navegação não está no código — só a duração MOTION_MS = 220. O 'ease-out' e a faixa '200–260ms' existem apenas como comentário de intenção
- Os valores originais de letterSpacing em 'em' (do handoff) não estão no código, só os px já convertidos
- O documento de handoff original não foi lido nesta frente; as referências a telas (01b, 01c, 08, 11, e3, e4) vêm de comentários no código e não podem ser confirmadas daqui
- O componente Chip aceita a prop tone ('default' | 'accent') e a ignora completamente
- radius oferece block (20), blockLg (22) e card (24) para 'bloco de conteúdo 20–24'; o Block usa 22. Qual é o valor canônico é decisão de produto/design, não dedução
- Não existe seletor manual de tema: o app segue estritamente o useColorScheme do sistema. Se o handoff previr um controle claro/escuro, ele não está implementado
- A pomba da marca é PNG (224×144, versões preta e branca) marcado no código como PENDENTE DE PRODUÇÃO: o time de design pede o SVG oficial para substituir
