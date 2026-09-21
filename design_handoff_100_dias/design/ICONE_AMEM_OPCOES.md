# Ícone do Amém — opções em vetor com licença para app de loja

Pesquisa feita em 2026-09-21. Nada foi baixado nem adicionado ao repositório.

## O problema

O ícone atual do Amém (`design/assets/icone-oracao.png`, 636×636) veio de busca de imagens. Sem origem e sem
licença conhecidas, **não pode ir para o app**. Além disso é PNG: não muda de cor com o tema e fica borrado em
alguns tamanhos.

O que precisamos:

1. **Vetor** (SVG), para desenhar com `react-native-svg`, que o app já usa em `mobile/src/ui/icons.tsx`.
2. **Duas versões do mesmo desenho**: contorno (Amém não marcado) e cheio (Amém marcado).
3. **Cor controlada pelo app** (`currentColor`), para ficar branco no tema escuro sem outro arquivo.
4. **Licença que permita empacotar em app gratuito publicado na App Store e no Google Play.**

## Candidatos

Legenda: FATO = conferido na fonte citada em 2026-09-21. INFERÊNCIA = conclusão a partir de fatos, não conferida
diretamente.

| Conjunto | Nome exato | Contorno | Cheio | Licença | Atribuição exigida | Serve para app de loja? |
|---|---|---|---|---|---|---|
| **Phosphor** (v2.1.1) | `hands-praying` (regular), `hands-praying-bold`, `hands-praying-fill` (também thin, light, duotone) | Sim | Sim | MIT — "Copyright (c) 2023 Phosphor Icons" | Sim, no sentido da MIT: o aviso de copyright e o texto da licença precisam acompanhar o app (tela de licenças ou arquivo de avisos). Não precisa aparecer ao lado do ícone. | **Sim** |
| **MingCute** | `pray-line`, `pray-fill` | Sim | Sim | Apache-2.0 | Sim: manter cópia da licença e o arquivo NOTICE, se houver, junto do app. | Sim |
| **TDesign** (Tencent) | `gesture-pray`, `gesture-pray-filled` | Sim | Sim | MIT | Aviso MIT junto do app. | Sim (desenho não conferido visualmente) |
| **Font Awesome Free** (7.3.1) | `hands-praying` (alias `praying-hands`) | **Não** — o estilo "regular" desse ícone só existe no plano pago (Pro) | Sim (solid) | Ícones: CC BY 4.0 | Sim: crédito à Font Awesome. O SVG já traz um comentário de atribuição, que precisa ser mantido. | Licença permite, mas **não tem o par contorno/cheio** |
| **Material Design Icons** (Pictogrammers) | `hands-pray` | Não | Sim (só uma versão) | Apache-2.0 | Cópia da licença junto do app. | Licença permite, mas **não tem o par** |
| **Streamline** (conjunto gratuito) | `praying-hand` (linha), `praying-hand-solid` | Sim | Sim | CC BY 4.0 | Sim: crédito visível à Streamline. | Sim, com crédito mais pesado que MIT |
| **Tabler** | `pray` | Sim | — | MIT | Aviso MIT | **Não serve**: é uma pessoa rezando (cabeça + corpo), não mãos |
| **Material Symbols** (Google) | não há "mãos em oração"; só `prayer_times` | — | — | Apache-2.0 | — | **Não serve** |
| **Lucide / Iconoir** | não há ícone de mãos em oração | — | — | ISC / MIT | — | **Não serve** |

### Fontes (acessadas em 2026-09-21)

- Phosphor, arquivos no repositório oficial: <https://github.com/phosphor-icons/core/blob/main/assets/regular/hands-praying.svg>
  e <https://github.com/phosphor-icons/core/blob/main/assets/fill/hands-praying-fill.svg> — FATO: ambos existem,
  caixa `0 0 256 256`, `fill="currentColor"`.
- Phosphor, licença: <https://github.com/phosphor-icons/core/blob/main/LICENSE> — FATO: MIT, "Copyright (c) 2023 Phosphor Icons".
- Font Awesome, SVG solid: <https://github.com/FortAwesome/Font-Awesome/blob/7.x/svgs/solid/hands-praying.svg> — FATO:
  existe, com comentário "Font Awesome Free 7.3.1 … Icons: CC BY 4.0".
- Font Awesome, versão regular: <https://github.com/FortAwesome/Font-Awesome/blob/7.x/svgs/regular/hands-praying.svg> —
  FATO: 404 (não existe no Free).
- Font Awesome, licença: <https://github.com/FortAwesome/Font-Awesome/blob/7.x/LICENSE.txt> e <https://fontawesome.com/license/free>.
- Busca em todos os conjuntos abertos via Iconify: <https://api.iconify.design/search?query=praying> e
  <https://api.iconify.design/search?query=pray> — FATO: lista de nomes e licenças da tabela.
- Licenças por conjunto: <https://api.iconify.design/collections?prefixes=mingcute,tdesign,hugeicons,mdi,ph,streamline>;
  MingCute: <https://github.com/Richard9394/MingCute/blob/main/LICENSE>; TDesign:
  <https://github.com/Tencent/tdesign-icons/blob/main/LICENSE>; MDI: <https://github.com/Templarian/MaterialDesign/blob/master/LICENSE>.
- Tabler `pray`: <https://github.com/tabler/tabler-icons/blob/main/icons/outline/pray.svg>.
- Conferido no próprio projeto (só leitura): `@expo/vector-icons` 15.1.1, já instalado, traz `hands-praying`
  (FontAwesome6 Free, só solid) e `hands-pray` (MaterialCommunityIcons). Nenhum dos dois tem o par contorno/cheio.

### O que a licença permite, em português simples

- **MIT (Phosphor, TDesign)**: pode usar, modificar e distribuir em app gratuito ou pago. A única obrigação é
  incluir o aviso de copyright e o texto da licença em algum lugar do app (uma tela "Licenças de terceiros"
  resolve). INFERÊNCIA: é o mesmo tratamento que o app já precisa dar às bibliotecas MIT que usa, então não
  cria trabalho novo.
- **Apache-2.0 (MingCute, MDI)**: igual à MIT na prática, mais a regra de manter o arquivo NOTICE se o projeto
  tiver um e de indicar se o arquivo foi modificado.
- **CC BY 4.0 (Font Awesome, Streamline)**: pode usar comercialmente, mas o crédito ao autor precisa ser
  "razoável ao meio". INFERÊNCIA: uma linha na tela de licenças costuma bastar, mas o texto é menos preciso
  que o da MIT.
- Nenhuma dessas licenças tem restrição de loja. INFERÊNCIA: Apple e Google não proíbem ícones MIT/Apache/CC BY;
  o que eles exigem é que você tenha o direito de usar — e essas licenças dão.

## Recomendação

**Phosphor `hands-praying` + `hands-praying-fill`, licença MIT.**

Por quê:

1. É o único candidato conferido na fonte que tem **o mesmo desenho** em contorno e em cheio, feito pelo mesmo
   autor para ser trocado um pelo outro. Isso é exatamente o comportamento marcado/desmarcado do Amém.
2. `fill="currentColor"`: a cor vem do tema do app. No escuro fica branco sem arquivo extra.
3. MIT é a licença mais simples de cumprir: um aviso na tela de licenças.
4. Não exige instalar pacote: basta copiar o `path` do SVG para um componente em `mobile/src/ui/icons.tsx`,
   como os outros ícones do app (quem fizer isso deve colar também o aviso MIT no cabeçalho do componente e na
   tela de licenças).

Cuidados na hora de implementar (para quem for editar `mobile/src`, não feito aqui):

- **Caixa diferente**: o Phosphor desenha em 256×256; os ícones do app são 24×24. Use `viewBox="0 0 256 256"` e
  `width/height` 24 — o SVG escala sozinho.
- **Peso do traço**: os ícones do app têm traço de 2px em 24px. O `regular` do Phosphor equivale a ~1,5px e o
  `bold` a ~2,25px nesse tamanho (INFERÊNCIA a partir das medidas publicadas do Phosphor: traço de 16 e 24
  unidades em 256). **Sugestão: `hands-praying-bold` para o contorno**, que fica mais perto dos outros ícones, e
  `hands-praying-fill` para o marcado. Confirmar olhando lado a lado.
- **Acessibilidade**: o ícone não pode carregar o significado sozinho (regra do próprio `icons.tsx`). O botão
  precisa de rótulo "Amém" e de estado marcado/não marcado anunciado ao leitor de tela
  (`accessibilityState={{ selected }}`).

Segunda opção, se o desenho do Phosphor não agradar ao designer: **MingCute `pray-line` / `pray-fill`**
(Apache-2.0, já desenhado em 24×24). Conferir o desenho antes de escolher.

Descartados: Font Awesome Free (não tem contorno de graça), MDI (uma versão só), Tabler (pessoa, não mãos),
Material Symbols, Lucide e Iconoir (não têm o ícone). O PNG atual deve ser removido do pacote de design quando o
substituto entrar.
