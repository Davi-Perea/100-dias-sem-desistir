# Tokens — fonte da verdade

Todo valor aqui foi medido, não arredondado. Contraste calculado pela fórmula da WCAG 2.1.
Mínimos: **4,5:1 para texto** (sem concessão de texto grande) e **3:1 para limite de controle**.

---

## 1. Cores — tema claro

| Token | Hex | Papel | Contraste |
|---|---|---|---|
| `background` | `#FFFFFF` | fundo de tela | — |
| `surface` | `#FFFFFF` | cartão / bloco | — |
| `surfaceWarm` | `#F7F5F0` | off-white quente: blocos de conteúdo, tela do Dia | — |
| `surfaceMuted` | `#F1EFE9` | círculo de ícone, avatar neutro | — |
| `surfaceSunken` | `#EDEBE5` | trilha de barra de progresso | — |
| `border` | `#E6E3DC` | filete divisor de 1px (decorativo) | — |
| `borderStrong` | `#D9D6CF` | dia futuro, alça de folha, linha pontilhada | — |
| `controlBorder` | `#8A877F` | limite de controle. **NUNCA cor de texto** | 3,59 / branco · 3,29 / quente |
| `text` | `#111111` | tinta principal | 18,88 / branco |
| `textSecondary` | `#3F3D38` | parágrafo de apoio | 10,85 / branco |
| `textMuted` | `#5C5A54` | legenda, rótulo secundário, placeholder | 6,90 / branco · 6,33 / quente |
| `navInactive` | `#55534E` | item inativo da barra de navegação | 7,44 / branco |
| `accent` | `#FFD100` | amarelo da marca. **NUNCA cor de texto** | 1,46 / branco |
| `accentSoft` | `#FFF3C4` | faixa amarela rebaixada | — |
| `onAccent` | `#111111` | tinta sobre o amarelo | 12,92 |
| `onAccentMuted` | `#4F430D` | texto secundário sobre amarelo (hex plano, nunca opacidade) | 6,71 / amarelo |
| `markSurface` | `#111111` | superfície de "marcado" | 18,88 / branco |
| `onMark` | `#FFD100` | conteúdo dentro do "marcado" | 12,92 |
| `blue` | `#2A4C86` | **NOVO.** A comunidade. Pode ser texto | 8,48 / branco · 7,78 / quente · 7,37 / mudo |
| `onBlue` | `#FFFFFF` | conteúdo sobre azul | 8,48 |
| `blueSoft` | `#E6EDF7` | faixa azul pálida | tinta 16,02 · azul 7,46 |
| `blueSoftBorder` | `#CFDCEE` | borda da faixa azul | — |
| `onBlueSoft` | `#1F2A3D` | texto sobre a faixa azul pálida | 14,05 |
| `alertSurface` | `#111111` | faixa "sem internet" | — |
| `onAlert` | `#FFFFFF` | texto da faixa | 18,88 |
| `danger` | `#9E3B33` | rótulo destrutivo | 6,72 / branco |
| `warning` | `#7E601B` | aviso | 5,87 / branco |
| `warningSurface` | `#F6ECD4` | fundo do aviso | par mede 5,00 |

## 2. Cores — tema escuro

O amarelo **não muda de valor**: muda de papel. No claro a tinta é o fundo do "marcado"; no escuro o amarelo é o fundo e a tinta é o conteúdo.

| Token | Hex | Contraste |
|---|---|---|
| `background` | `#111111` | — |
| `surface` | `#1A1A19` | — |
| `surfaceWarm` | `#1A1917` | — |
| `surfaceMuted` | `#232220` | — |
| `surfaceSunken` | `#0B0B0B` | — |
| `border` | `#2E2C29` | — |
| `borderStrong` | `#3D3A36` | — |
| `controlBorder` | `#8A857C` | 5,15 / fundo · 4,75 / surface |
| `text` | `#FFFFFF` | 18,88 / fundo |
| `textSecondary` | `#C7C4BD` | 10,84 |
| `textMuted` | `#A6A29A` | 7,42 |
| `navInactive` | `#A6A29A` | 7,42 |
| `accent` | `#FFD100` | 12,92 / tinta |
| `accentSoft` | `#3A3100` | — |
| `onAccent` | `#111111` | 12,92 |
| `onAccentMuted` | `#4F430D` | 6,71 / amarelo |
| `markSurface` | `#FFD100` | 12,92 / fundo |
| `onMark` | `#111111` | 12,92 |
| `blue` | `#A9C2E8` | 10,40 / fundo · 9,60 / surface · 9,68 / warm · 8,76 / mudo |
| `onBlue` | `#111111` | 10,40 |
| `blueSoft` | `#1A2231` | branco 15,94 · azul 8,78 |
| `blueSoftBorder` | `#2C3A52` | — |
| `onBlueSoft` | `#FFFFFF` | 15,94 |
| `alertSurface` | `#6B6A63` | 3,48 contra a página |
| `onAlert` | `#FFFFFF` | 5,43 |
| `danger` | `#E0817A` | 6,83 / fundo |
| `onDanger` | `#111111` | 6,83 (**inverte** no escuro: branco daria 2,77) |
| `warning` | `#D6AC5A` | 8,91 |
| `warningSurface` | `#2A2313` | — |

### Regra de inversão (a que já quebrou o app uma vez)

O fundo de uma superfície invertida **nunca** pode ser escrito como "a cor do texto", e o conteúdo **nunca** como "a cor da superfície". Use sempre o par `markSurface` / `onMark`.

Dois erros já cometidos e proibidos:
1. fundo declarado como `text` (que no escuro é `#FFFFFF`) com conteúdo amarelo → 1,46:1, **invisível**;
2. fundo fixo em `#111111` numa tela cujo fundo segue o tema → 1:1, **a superfície deixa de existir**.

Fundo fixo só é legítimo quando a tela **declara** que a superfície é fixa: F1 boas-vindas (amarelo), C4 consentimento (tinta), E2 modo altar (tinta), E3 marco (amarelo), E4 dia 100 (tinta). Nessas cinco, as cores não mudam com o tema.

### Camada de vidro

| Token | Claro | Escuro |
|---|---|---|
| barra de navegação flutuante | `rgba(255,255,255,0.86)` | `rgba(26,25,23,0.88)` |
| barra de topo do leitor | `rgba(255,255,255,0.92)` | `rgba(17,17,17,0.9)` |
| filete do vidro | `rgba(17,17,17,0.08)` | `rgba(255,255,255,0.12)` |
| borda de bloco | `rgba(17,17,17,0.06)` | `rgba(255,255,255,0.10)` |
| scrim atrás da folha | `rgba(17,17,17,0.5)` | `rgba(0,0,0,0.6)` |
| sombra da barra flutuante | `0 10px 28px rgba(17,17,17,0.14)` | `0 10px 28px rgba(0,0,0,0.5)` |
| sombra da folha modal | `0 12px 30px rgba(17,17,17,0.4)` | igual |

Desfoque: `blur(20px)` na barra de navegação, `blur(18px)` na barra do leitor. No Android, se o desfoque sair caro, use superfície sólida (`surface`) com elevação 8 — não imite vidro com opacidade chapada.

---

## 3. Tipografia

Duas famílias, **empacotadas localmente** (licença OFL, nada buscado pela rede em runtime):

- **Schibsted Grotesk** — interface e display. Pesos: **400, 500, 600, 700, 800**.
- **Source Serif 4** — leitura, citação, texto humano. Pesos: **400, 600, e 400 itálico**.

Oito faces no total, o mesmo número do app atual.

**Em React Native o peso vem da FAMÍLIA, não de `fontWeight`.** Nomeie a face (`SchibstedGrotesk_700Bold`) e **não declare `fontWeight`** — combinar os dois faz o Android sintetizar negrito sobre uma face que já é negra.

| Variante | Família / peso | Size / LineHeight | LetterSpacing | Onde |
|---|---|---|---|---|
| `dayNumeral` | Schibsted 800 | 58 / 54 | −2,6 | "Dia 17" no painel de hoje |
| `dayNumeralLg` | Schibsted 800 | 76 / 72 | −3,4 | numeral de tela cheia |
| `display` | Schibsted 800 | 38 / 40 | −1,6 | título de tela de entrada e de passo |
| `displayXl` | Schibsted 800 | 50 / 50 | −2,4 | boas-vindas, "Faltam N dias" |
| `milestone` | Schibsted 800 | 180 / 160 | −10 | numeral do marco (150 / 136 / −8 no dia 100) |
| `screenTitle` | Schibsted 700 | 30 / 34 | −0,9 | "Comunidade", "Minhas reflexões" |
| `blockTitleLg` | Schibsted 700 | 27 / 32 | −0,8 | pergunta de tela |
| `blockTitle` | Schibsted 700 | 23 / 28 | −0,5 | ênfase do dia, título de bloco |
| `readingRef` | Schibsted 700 | 21 / 25 | −0,5 | "Josué 6–17" |
| `action` | Schibsted 700 | 17 / 22 | — | rótulo de botão |
| `item` | Schibsted 500 | 16 / 21 | — | item de lista |
| `rowLabel` | Schibsted 600 | 15 / 20 | — | rótulo de linha, voltar, cancelar |
| `caption` | Schibsted 500 | 13 / 18 | — | legenda |
| `captionStrong` | Schibsted 700 | 12,5 / 17 | — | estado ("Em aberto") |
| `cap` | Schibsted 600 | 11 / 14 | +1,2 · CAIXA ALTA | rótulo de seção |
| `tabLabel` | Schibsted 700 ativo / 500 inativo | 11 / 13 | — | rótulo da barra de navegação |
| `read` | Source Serif 400 | 19 / 32 | — | leitura bíblica. **O usuário escolhe: 14 a 30, passo ±2, padrão 19. Entrelinha sempre 1,7 ×** |
| `body` | Source Serif 400 | 17 / 27 | — | parágrafo humano, texto de post |
| `bodySm` | Source Serif 400 | 15 / 24 | — | parágrafo de apoio |
| `quote` | Source Serif 400 itálico | 17 / 27 | — | citação da orientação da igreja |
| `chapterNumeral` | Source Serif 600 | 44 / 48 | — | numeral de capítulo no leitor |

Fontes monoespaçadas aparecem **só nas legendas de espaço reservado** do desenho (`foto de quem publicou`, `texto do guia da igreja`). **Não existem no app** — são marcações minhas para você saber onde entra o dado real.

---

## 4. Espaço, raio, alvo

```
spacing  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
radius   = { sm: 10, button: 16, block: 22, sheet: 28, pill: 999 }
gutter   = { screen: 24, sheet: 26 }      // 40 a partir de 600px de largura, 64 a partir de 900px
MIN_TOUCH         = 48                    // piso absoluto, iOS 44pt / Android 48dp — usamos o maior
BUTTON_MIN_HEIGHT = 56                    // PISO, nunca height
TABBAR_MIN_HEIGHT = 64                    // a barra flutua: 20 de margem lateral, 26 do fundo
MAX_CONTENT_WIDTH = 640
```

**Contrato de piso, e é o defeito mais caro já corrigido neste app:** todo valor de altura acima é `minHeight` com `paddingVertical`, **nunca `height`**. Quem precisa reservar espaço para uma dessas caixas mede a altura real com `onLayout`, nunca repete a constante. O texto cresce até 3,571× com o Dynamic Type do sistema; caixa travada não acompanha, o rótulo atravessa a borda e, num botão preenchido, sai na cor da própria superfície — isto é, some (1,00:1).

---

## 5. Componentes-base

### Botão — quatro variantes, um primário por tela
| Variante | Piso | Raio | Fundo | Borda | Rótulo |
|---|---|---|---|---|---|
| `primary` | 56 | 16 | `text` | — | `surface`, Schibsted 700 17 |
| `blue` | 56 | 16 | `blue` | — | `onBlue`, Schibsted 700 17 |
| `outline` | 56 | 16 | transparente | 2px `text` | `text`, Schibsted 700 17 |
| `yellow` | 56 | 16 | `accent` | — | `onAccent`, Schibsted 700 17 |
| `underline` | 48 | — | — | — | `text`, Schibsted 600 15, sublinhado, offset 3 |
| `danger` | 48 | — | — | — | `danger`, Schibsted 600 15 |

Comum a todas: `minHeight`, `paddingVertical: 12`, `paddingHorizontal: 20`, conteúdo centralizado, `textAlign: center`. Pressionado `opacity 0.72`; desabilitado `opacity 0.45` — e se usar opacidade para desabilitado, **declare o contraste resultante**, porque auditoria de token não enxerga opacidade.

### Bloco de conteúdo
`borderRadius: 22`, fundo `surfaceWarm` (ou `surface`), borda de 1px em `rgba(17,17,17,0.06)`, `padding: 16` a `22`, `minHeight: 48`.

### Barra de navegação flutuante
Pílula solta sobre o conteúdo: `left/right: 20`, `bottom: 26`, `minHeight: 64`, `borderRadius: 999`, vidro, filete de 1px, sombra, `padding: 8`. Três destinos, cada um `flex: 1` com `minHeight: 48`, ícone de 18–22px em cima e rótulo de 11px embaixo, `gap: 3`.
Ativo: pílula `borderRadius: 999` em `markSurface`, ícone e rótulo em `onMark`, rótulo em peso 700.
Inativo: sem fundo, ícone e rótulo em `navInactive`, rótulo em peso 500.
**O rótulo de texto é obrigatório** — nenhum ícone carrega significado sozinho neste app.

### Ícones
Todos desenháveis com formas simples: traço, círculo, retângulo arredondado, quadrado girado. Traço de **2px** (2,5 em nó e cadeado). Três da navegação:
- **Jornada** — quatro traços verticais de 2,5px de largura, alturas 9 / 16 / 12 / 6, `gap: 3`, alinhados pela base, raio 1,5. É a régua dos cem dias reduzida.
- **Comunidade** — dois círculos vazados de 12 e 14px, traço 2px, sobrepostos; o da direita tem o fundo da barra para recortar o outro.
- **Você** — círculo vazado de 9px (cabeça) sobre retângulo de 18×8 com raio `9px 9px 0 0` e sem borda inferior (ombros).

Do feed: **Amém** é o PNG em `assets/icone-oracao.png`, 27px (22px em comentário). **Comentar** é retângulo arredondado de 24×17 raio 7 traço 2px, com um quadrado de 7px girado −45° na base esquerda formando a ponta.

### Nó da jornada — quatro formas, nunca só cor
| Estado | Forma |
|---|---|
| lido | círculo cheio de 13px em `text` |
| em aberto | anel de 14px, traço 3px em `blue` |
| hoje | círculo de 20px em `accent` com anel de 3px em `text` |
| futuro | ponto de 7px em `borderStrong` |

A linha do trilho tem 2px: **cheia em `text` acima de hoje**, **pontilhada em `borderStrong` abaixo** (traço 4px, intervalo 5px). É a linha que carrega o progresso.

### Régua dos cem dias
Cem traços verticais. No desenho é um `repeating-linear-gradient` de passo 3,54px; em React Native use SVG: `viewBox 0 0 W 36`, `x(i) = 3 + (i−1) × ((W−6)/99)`. Traço lido 2,2px em `accent` altura 16; traço futuro 1,6px em `borderStrong` altura 10; marcador de hoje 3px em `text` altura cheia, raio 2.
O amarelo mede ~1,4:1 contra a trilha — **aceito só porque o amarelo nunca carrega o dado sozinho**: a altura e a forma do traço diferenciam, e sempre existe rótulo em texto ao lado. Se em algum lugar o amarelo virar o único sinal, isso deixa de ser aceitável.

### Folha modal
`borderRadius: 28` só no topo, fundo `surface`, `paddingHorizontal: 26`, `paddingTop: 12`, `paddingBottom: 40 + safe area`, `gap: 16`, **`maxHeight: 88%` da tela e rola por dentro** — sem isso, em fonte grande ela cresce para fora da tela levando o botão de fechar junto. Alça de 40×5 raio 3 em `borderStrong`, centralizada. Scrim clicável rotulado "Fechar".

### Movimento
Transição de navegação **220ms ease-out**. A pomba voando: ciclo de 3200ms, `translateY 0 → −4`, `rotate −4deg → −1deg`, `Easing.inOut`, loop infinito, `useNativeDriver`.
**Todo movimento respeita "Reduzir movimento" do sistema** e desliga inteiro — a posição e o texto carregam o dado, a animação nunca.
