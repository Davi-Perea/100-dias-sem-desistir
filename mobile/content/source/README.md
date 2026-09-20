# Fontes do conteúdo dos 100 Dias

Material **próprio da igreja**, recebido de Davi em 2026-09-19. Os três arquivos são cópias byte a byte dos
originais; só o nome foi trocado para ASCII, porque nomes com travessão e acento quebram ferramentas no Windows.

| Arquivo aqui | Nome original | SHA-256 | Autor no arquivo | Criado |
|---|---|---|---|---|
| `2026-08-28_guia-diario-de-intercessao.docx` | `100 Dias — Guia Diário de Intercessão.docx` | `3e1dca0a0fff0e435def732f20127afe58acb4b1f6630fb2135f8a209845b199` | Leandra Pedroso | 2026-08-28 |
| `2026-08-28_escala-100-dias.docx` | `ESCALA - 100 Dias — Guia Diário de Intercessão.docx` | `8a6ce977a8c1e90d9b1344ea665249ce3ecc28e50c481855e1e25251625db6b6` | Leandra Pedroso | 2026-08-28 |
| `2026-08-28_orientacao-aos-lideres.docx` | `ORIENTAÇÃO AOS LÍDERES DE MINISTÉRIOS.docx` | `2fd53fc72f661e8b9ba90817af20e9e26115a1ccec6b94bcfa730edaaceac15a` | Leandra Pedroso | 2026-08-28 |

## Regras

1. **Não editar estes arquivos.** Se a igreja revisar o material, entra um arquivo novo com data nova e o
   `content_version` do dataset sobe. O hash de cada fonte fica gravado em `provenance.source_files`.
2. **O dataset é derivado, nunca escrito à mão.** `node scripts/convert-100-dias.mjs` regenera
   `content/100-dias-2026/dataset.json`; `--check` falha se o JSON estiver desatualizado. A conversão é
   determinística e recusa qualquer inconsistência (dia faltando, capítulo repetido, guia ≠ escala).
3. **Direitos.** O material é original da igreja, mas a publicação no app exige autorização escrita
   (Launch Gate 2, agora interno). Até ela existir, `rights_status = pending_authorization` e o portão de
   produção bloqueia builds de loja. A autorização entra em `provenance.rights_reference`.
4. **Nomes de líderes.** A escala traz nomes de pessoas. Eles ficam no dataset, mas só aparecem na interface
   quando `provenance.leader_names_authorized` for `true`, o que também depende de autorização explícita.
5. **A orientação aos líderes** não vira dataset: é comunicação (WhatsApp/PDF). Fica aqui como parte do
   pacote recebido e como fonte da futura página "Sobre o propósito", que também depende do item 3.
6. Nada de texto bíblico está nestes arquivos, só referências. A licença da tradução (Gate 1) é independente.
