# Prompt para o Claude Code — 100 dias sem desistir

Cole este arquivo inteiro como primeira mensagem, com a pasta `design_handoff_100_dias/` no repositório.

---

## O que você vai fazer

Implementar, no meu aplicativo React Native / Expo já existente, um redesenho completo que **já está desenhado**. O desenho está em `design/telas-100-dias.dc.html` — 32 telas, tema claro, tamanho de letra padrão.

Seu trabalho tem duas partes:

1. **Reproduzir o desenho com fidelidade máxima.** Não é referência solta, não é inspiração, não é ponto de partida. É especificação.
2. **Fazer funcionar.** Ligar navegação, botões, estados, persistência local — o desenho é estático, o app não pode ser.

---

## REGRA NÚMERO UM: não reinterprete

Isto já aconteceu antes e foi o motivo deste arquivo existir. Num projeto anterior o desenho foi entregue, o Claude Code "modelou" em vez de reproduzir, e o resultado ficou parecido mas pior. Não faça isso.

O que isso significa na prática:

- **Use os valores exatos de `TOKENS.md`.** Cada hexadecimal, cada tamanho de fonte, cada entrelinha, cada raio, cada espaçamento. Se `TOKENS.md` diz `font-size: 23px; line-height: 28px; letter-spacing: -0.5px`, é isso — não 24/28, não "text-xl", não o token mais próximo do sistema existente.
- **Não substitua por uma biblioteca de componentes.** Se o repositório tem um `Button` que não bate com a especificação, ajuste o `Button` ou crie a variante. Não aceite o botão errado porque já existe.
- **Não "melhore" nada.** Sem sombra nova, sem gradiente, sem animação que não está especificada, sem arredondar valores, sem trocar peso de fonte, sem reordenar blocos.
- **Não invente conteúdo.** Onde o desenho tem barra listrada com a legenda `texto do guia da igreja`, ali entra o campo real do `dataset.json`. Não escreva texto devocional por conta própria.
- **Não mude a hierarquia da tela.** A ordem dos blocos de cima para baixo é decisão de desenho.
- **Se algo não estiver especificado, PERGUNTE em vez de decidir.** Uma pergunta custa uma mensagem; uma invenção custa uma rodada de retrabalho.

Ao terminar cada tela, compare lado a lado com o HTML aberto no navegador. Se estiver diferente, está errado.

---

## Como abrir o desenho

Abra **`design/DESENHO-telas-100-dias.html`** com dois cliques. É um arquivo único, funciona offline, não precisa de servidor.

(Se preferir a versão fonte, `design/telas-100-dias.dc.html` precisa de servidor local: `cd design_handoff_100_dias/design && python3 -m http.server 8080`.)

A página é larga (2360px por seção) — use zoom out do navegador. Cada tela tem um nome visível em cima (A1, B3, C5…) e um atributo `data-screen-label` no elemento raiz, que é como eu vou me referir a ela.

Os celulares são molduras de iPhone de 402×874. A área útil de cada tela começa a 58px do topo (barra de status) e a barra flutuante de navegação fica a 26px do fundo.

---

## Ordem de implementação

Faça nesta ordem e **pare para eu revisar ao fim de cada etapa**:

1. **Tokens e primitivos** — escreva o tema (`TOKENS.md`) e os componentes-base: botão nas 4 variantes, bloco, linha de lista, pílula, caixa de marcação, barra flutuante de navegação, folha modal, nó da jornada.
2. **Grupo A — Jornada e o dia** (A1 a A5). É a casa do app.
3. **Grupo B — Ler** (B1 a B5).
4. **Grupo C — Comunidade** (C1 a C6). É a parte nova, não existe no app hoje.
5. **Grupo D — Você, perfil e grupo** (D1 a D5).
6. **Grupo E — Intercessão, altar e marcos** (E1 a E5).
7. **Grupo F — Entrada e estados** (F1 a F6).
8. **Tema escuro** — os valores estão em `TOKENS.md`. As telas escuras ainda não foram desenhadas; aplique a regra de mapeamento e me mostre antes de seguir.

---

## O que NÃO fazer sem me perguntar

Leia `REGRAS.md` antes de começar. São regras de produto, de lei brasileira e de revisão de loja, não preferências. As quatro que mais atrapalham quem está implementando:

1. **Nenhum texto de tradução bíblica na tela.** O app mostra a referência ("Josué 6–17"), nunca o versículo. A licença não está resolvida.
2. **Nenhum nome de líder.** A escala do altar mostra o ministério, nunca a pessoa.
3. **Nenhum número coletivo inventado.** Se o dado não existe, a tela diz que não existe.
4. **Alvo de toque nunca abaixo de 48.** Nunca `height` fixo numa caixa com texto — sempre `minHeight` com `paddingVertical`.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `TOKENS.md` | Todos os valores. Cores nos dois temas com contraste medido, tipografia, espaço, raio, alvos. **Fonte da verdade.** |
| `TELAS.md` | As 32 telas, uma por uma: o que faz, ordem dos blocos, medidas, cópia exata, estados e para onde cada botão vai. |
| `REGRAS.md` | O que o desenho não pode quebrar, e as decisões que ainda voltam para mim. |
| `design/telas-100-dias.dc.html` | O desenho. Abra no navegador. |
| `design/exploracao-arquitetura.dc.html` | Como cheguei aqui (4 rodadas de alternativas). Contexto, não especificação. |
| `design/assets/icone-oracao.png` | Ícone de Amém, 636×636, preto sobre transparente. **Licença pendente** — ver `REGRAS.md`. |
| `contexto/invariantes-do-produto.md` | Levantamento original das regras do produto. Cuidado: os tokens citados ali são do sistema ANTIGO, substituídos por `TOKENS.md`. |
| `contexto/inventario-de-telas-atual.md` | O que cada rota do app faz hoje, antes do redesenho. Use para saber o que a tela já precisa fazer. |

Comece lendo `TOKENS.md` e `REGRAS.md` inteiros, depois me diga o que entendeu e o que ficou faltando antes de escrever a primeira linha.
