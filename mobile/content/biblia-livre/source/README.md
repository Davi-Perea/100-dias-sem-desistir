# Fonte da Bíblia Livre (BLIVRE)

Texto bíblico empacotado no app a partir de 2026-09-21 (decisão do fundador). Tradução aberta, **não** é
material da igreja nem tradução protegida.

## Origem

| Campo | Valor |
|---|---|
| Arquivo aqui | `porbr2018_usfm.zip` (cópia byte a byte do download, nunca editar) |
| URL | https://ebible.org/Scriptures/porbr2018_usfm.zip |
| Baixado em | 2026-09-21 (curl) |
| Tamanho | 1.448.161 bytes |
| SHA-256 | `f8b806c312e07c283baadb2394fe9fdc2d9a2fbe48410fd5298358511af8ae57` |
| Página de copyright | https://ebible.org/porbr2018/copr.htm (conferida em 2026-09-21; página datada 2022-03-08, "HTML generated ... from source files dated 12 Dec 2025") |
| Conteúdo | 66 livros USFM (cânon protestante), `\id <CÓDIGO> Bíblia Livre - Textus Receptus` |

Descrição na página de copyright (FATO, copr.htm, 2026-09-21): Bíblia Sagrada em português do Brasil, atualizada
a partir da tradução de 1819 de João Ferreira de Almeida, edição Textus Receptus. "copyright © 2018 Diego Santos,
Mario Sérgio, e Marco Teles".

## Licença (exata)

**Creative Commons Atribuição 4.0 Brasil (CC BY 4.0 BR)** — http://creativecommons.org/licenses/by/4.0/br/.
A página do eBible.org apresenta também como "Creative Commons Attribution license 4.0" e resume as condições:

1. incluir as informações de copyright e fonte;
2. se o texto for alterado, indicar isso de modo que fique claro que o licenciante original não endossa
   necessariamente as alterações.

Os autores pedem ainda: "sempre indique a data correta da versão" (a Bíblia Livre é trabalho em andamento).

## Texto de atribuição usado no app

Sugestão de crédito dos autores (copr.htm), adaptada com a edição e a indicação de alteração. É o
`copyrightNotice` de `src/reader/bibliaLivreProvider.ts`, mostrado no fim de cada capítulo do leitor e em Ajuda:

> Bíblia Livre (BLIVRE), Copyright © 2018 Diego Santos, Mario Sérgio, e Marco Teles,
> http://sites.google.com/site/biblialivre/. Texto da edição porbr2018 de eBible.org (arquivos de 12/12/2025).
> Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução
> permitida desde que devidamente mencionados fonte e autores. Texto adaptado para este app: notas de rodapé e
> referências cruzadas não são exibidas e as palavras acrescentadas pelos tradutores aparecem sem itálico. Os autores
> não endossam necessariamente estas alterações.

## Alterações feitas na conversão (indicadas no app)

`scripts/convert-biblia-livre.mjs` gera `content/biblia-livre/livros/<CÓDIGO>.json` e `content/biblia-livre/manifest.json`:

- notas de rodapé (`\f … \f*`, 1.290 na fonte) **removidas**;
- referências de citação embutidas (`\rq … \rq*`, 166, ex.: "Isaías 7:14" em Mateus 1:23) **removidas** — são
  referências cruzadas; a fonte não tem `\x`;
- marcadores de palavra acrescentada (`\add … \add*`) removidos **mantendo as palavras** (perde-se só o itálico);
- títulos de salmo (`\d`, 115) guardados em `titulo` do capítulo;
- espaços repetidos colapsados. Nenhuma palavra do texto é corrigida, trocada ou reordenada.

## Regras

1. **Não editar o zip nem os JSON.** Fonte nova = arquivo novo, hash novo no conversor e aqui.
2. `npm run bible:convert` regenera; `npm run bible:check` falha se algo divergir da fonte (ou sobrar arquivo).
3. O conversor recusa: livro faltando, capítulo ou versículo fora de sequência, contagem ≠ 66 / 1.189 / 31.102,
   código que não bata com `src/bible/books.ts`, marcador USFM desconhecido.
