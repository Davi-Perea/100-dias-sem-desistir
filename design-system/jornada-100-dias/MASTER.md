> **SUPERSEDIDO (2026-09-07).** A aparência do produto passou a ser a do handoff
> "100 Dias — Lagoinha". Este arquivo fica como registro da exploração anterior.
> O sistema em vigor está em `docs/technical/DESIGN_IMPLEMENTATION.md`.

# Design System — Jornada 100 Dias (MASTER)

- **Fonte de verdade global.** Regras de página em `pages/<pagina>.md` sobrescrevem este arquivo.
- **Produto:** app mobile (iOS + Android) de leitura bíblica em jornada de 100 dias · pt-BR · React Native + Expo.
- **Data:** 2026-09-07 · Governado pelo MASTER PRODUCT SPEC v1.1 (§28 direção visual).

> **Nota sobre a geração.** A saída bruta de `--design-system` foi descartada porque veio enviesada para
> *landing page web*: recomendou "Community/Forum Landing" e "App Store Style Landing", tipografia
> `clamp(3rem, 10vw, 12rem)`, `cursor-pointer`, hover states e paleta "streak amber" — nada disso existe
> num app RN, e streak é **proibido** pelo spec §10. O que vale são as consultas por domínio, listadas
> abaixo, sintetizadas com o spec. Onde skill e spec divergiram, o spec venceu.

## Consultas que sustentam este documento

| Domínio | Consulta | O que foi aproveitado |
|---|---|---|
| `product` | "reading app content consumption daily habit" | **Book & Reading Tracker** → "warm paper white + ink + reading progress green" |
| `style` | "editorial calm warm paper reading minimal" | **E-Ink / Paper** (WCAG AAA, serif para leitura, sem distração) e **Bold Typography (Mobile)** (escala e disciplina de toque, RN 10/10) |
| `color` | "warm paper ink reading calm neutral" | **Notes & Writing App** / **Diary & Journal** → tinta quente sobre creme |
| `ux` | motion, dark mode, navegação | 150–300ms, ≤2 elementos animados por tela, reduced-motion, contraste 4.5:1, back previsível |
| `web` | "safe areas accessibilityLabel touch native app" | SafeArea, alvo 44pt, espaçamento 8dp, easing nativo |
| `react-native` (stack) | "safe area touch target accessibility performance list" | Pressable, accessibilityRole/Label, android_ripple, hitSlop |
| `references/pro-rules.md` | checklist canônico | Tokens de ícone, disciplina outline/filled, paridade de estados nos dois temas |

## 1. Princípios

1. **Calma acima de energia.** O produto acompanha alguém por 100 dias. Nada pisca, nada compete.
2. **O texto é a interface.** Serif para leitura, sans para UI. Cromo mínimo e removível no Reader.
3. **Sem culpa, sem competição.** Sem streak, XP, ranking ou vermelho de falha. "Pendente" nunca é "falhou".
4. **Honestidade visual.** Conteúdo de desenvolvimento tem banner permanente. Nada de número inventado.
5. **Toda cor é token medido.** Nenhum hex solto em tela.

## 2. Cor (verificada com WCAG 2.1 nos dois temas)

Fonte: `mobile/src/ui/theme.ts`. Regressão automática: `mobile/src/__tests__/contrast.test.ts` (45 asserções).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F6F3EE` | `#121110` | Papel de fundo |
| `surface` | `#FFFFFF` | `#1C1A18` | Cards |
| `surfaceMuted` | `#EDE8E0` | `#26231F` | Cards secundários, botão secundário |
| `surfaceSunken` | `#E4DDD2` | `#0E0D0C` | Trilho de progresso |
| `border` | `#E0D9CD` | `#302C27` | Divisores decorativos |
| `controlBorder` | `#8A8073` | `#7A7065` | **Contorno de controle interativo** (radio, checkbox, marcador) — ≥3:1 |
| `text` | `#1B1815` | `#F2EDE5` | Corpo e títulos (≥13:1) |
| `textSecondary` | `#5C544A` | `#B5ADA1` | Apoio (≥6.7:1) |
| `textMuted` | `#635B50` | `#9D9488` | Auxiliar (≥4.6:1) |
| `accent` | `#1F5F5B` | `#6FB3AC` | Ação primária, links, progresso |
| `accentSoft` | `#DDE9E7` | `#1E2E2C` | Card de destaque |
| `success` | `#2F6B4F` | `#6BBF92` | Concluído |
| `danger` | `#9E3B33` | `#E0817A` | Destrutivo |
| `onDanger` | `#FFFFFF` | `#1B1815` | Texto sobre destrutivo (branco no escuro daria 2,77:1) |
| `readerBackground` | `#FBF8F3` | `#17150F` | Fundo do Reader |
| `devBanner` / `devBannerSurface` | `#7E601B` / `#F6ECD4` | `#D6AC5A` / `#2A2313` | Aviso de conteúdo DEV |

**Correções aplicadas após auditoria** (8 reprovações reais encontradas): `textMuted` claro `#8A8073 → #635B50`
(era 3,18:1 sobre card mudo), `textMuted` escuro `#8B8377 → #9D9488`, `devBanner` claro `#8A6A1F → #7E601B`,
criação de `controlBorder` porque `borderStrong` (1,54:1) era o único indicador do radio não selecionado,
e criação de `onDanger` porque o botão destrutivo usava branco fixo (2,77:1 no tema escuro).

**Cor nunca é o único indicador:** dia concluído tem check, dia de hoje tem selo "HOJE", pendente tem rótulo "Pendente".

## 3. Tipografia

| Papel | Fonte | Tamanho / Entrelinha | Cap. de escala |
|---|---|---|---|
| `display` | sistema | 34 / 40, tracking −0.8 | 1.5× |
| `title` | sistema | 26 / 32, tracking −0.4 | 1.6× |
| `heading` | sistema | 19 / 25 | 2× |
| `body` | sistema | 16 / 23 | 2× |
| `secondary` | sistema | 15 / 22 | 2× |
| `muted` | sistema | 14 / 20 | 2× |
| `eyebrow` | sistema | 12, caixa alta, tracking 1.1 | 2× |
| **Leitor** | **serif** (Georgia / serif) | 14–30 ajustável, entrelinha 1.62× | 1.8× |

Corpo nunca abaixo de 14; texto de leitura nunca abaixo de 16. Fonte do sistema para UI (sem custo de carregamento,
respeita Dynamic Type); serif apenas no Reader, onde o objetivo é ler por minutos, não escanear.

## 4. Espaçamento, forma e ícone

- **Ritmo 4/8dp:** `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`.
- **Raio:** `sm 10 · md 14 · lg 20 · xl 28`. Cards `lg`, botões `md`.
- **Alvo de toque:** `MIN_TOUCH = 48` (maior entre 44pt iOS e 48dp Android); `hitSlop` onde o glifo é menor.
- **Ícones:** família única (Ionicons), tokens `sm 18 · md 24 · lg 28`. **Outline** para navegação e ação;
  **filled** apenas para estado de conclusão. Nunca emoji como ícone.
- **Medida de leitura:** `MAX_CONTENT_WIDTH = 640` com calha adaptativa (16 / 32 / 48 conforme largura).

## 5. Movimento

- Micro-interações 150–300ms (`MOTION_MS = 200`), easing nativo.
- Feedback de toque: opacidade + ripple no Android. A escala de 0,994 no card **não desloca layout** e é
  desligada quando "Reduzir movimento" está ativo (`useReducedMotion`).
- Sem animação decorativa, sem parallax, sem autoplay. Haptics apenas em conclusão e marco.

## 6. Navegação

Quatro abas — Hoje, Jornada, Juntos, Você. O **Reader é rota contextual**, nunca aba. Modais para reflexão,
lembrete e painel DEV. Voltar sempre previsível; sem gesto aninhado concorrente.

## 7. Anti-padrões proibidos neste produto

Streak, XP, ranking, leaderboard, comparação entre pessoas · vermelho ou linguagem de falha para dia não lido ·
número de comunidade fabricado · emoji como ícone · hex solto em componente · texto cinza sobre cinza ·
animação decorativa · conteúdo de desenvolvimento sem banner.

## 8. Verificação obrigatória antes de entregar UI

- [x] Contraste medido nos dois temas (teste automatizado)
- [x] Alvos ≥48dp, espaçamento ≥8dp entre toques
- [x] `accessibilityRole` / `accessibilityLabel` / `accessibilityState` em todo controle
- [x] Reduced-motion respeitado
- [x] Dynamic Type sem quebra (altura de linha da Jornada escala com `fontScale`)
- [x] Safe areas em cabeçalhos, barra de abas e barra fixa do Reader
- [x] Medida de leitura contida em tablet e paisagem
- [ ] **Teste em aparelho físico iOS e Android** — pendente, sem Mac nem Android SDK nesta máquina
