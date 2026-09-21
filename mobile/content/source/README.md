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
   `content/100-dias-2026/dataset.json` e `content/100-dias-2026/proposito.json`; `--check` falha se algum
   dos dois estiver desatualizado. A conversão é determinística e recusa qualquer inconsistência (dia faltando,
   capítulo repetido, guia ≠ escala). O `mobile/.gitattributes` fixa fim de linha LF nesses JSON, para o
   `--check` não acusar "DESATUALIZADO" num clone novo no Windows.
3. **Direitos.** O material é original da igreja, mas a publicação no app exige autorização escrita
   (Launch Gate 2, agora interno). Até ela existir, `rights_status = pending_authorization`. O que isso
   bloqueia **de verdade** hoje:
   - **App de release (preview ou loja) fecha na abertura.** O portão de produção
     (`src/journey/datasetSource.ts` → `assertProductionReady`) roda quando `__DEV__` é falso e recusa o dataset.
     Isso é em tempo de execução: o build compila e empacota normalmente, e só falha quando alguém abre o app.
   - **Configuração da variante `production` recusa ser gerada** (`app.config.ts`) enquanto o `dataset.json`
     não estiver com `rights_status = "authorized"`. É isso que impede um build de loja de ser gerado.
   - `node scripts/convert-100-dias.mjs --check --require-authorized` falha sem autorização. Ele **não** está
     ligado a nenhum script do `package.json` nem a hook de build: é para rodar à mão ou num CI futuro.
   - A variante `preview` (APK de teste interno) **não** é barrada na geração; ela só fecha na abertura.
   A autorização entra em `provenance.rights_reference` como identificador neutro (ver "Autorizações").
4. **Nomes de líderes.** A escala traz nomes de pessoas. Sem `leader_names_authorized = true` o conversor
   **não os gera**: `altar.leaders_label` sai `null` nos 100 dias, e os nomes não entram no `dataset.json` nem no
   binário (esconder só na tela não bastaria, porque qualquer um descompacta o pacote). Só a fonte `.docx` guarda
   os nomes. O validador de produção recusa um dataset com nomes sem a autorização. Com a autorização explícita,
   o conversor passa a gerar `leaders_label`.
5. **A orientação aos líderes é convertida e vai para o app.** O conversor gera
   `content/100-dias-2026/proposito.json` (determinístico, conferido pelo `--check`), e
   `src/journey/proposito.ts` importa o arquivo **inteiro** para o bundle, inclusive seções marcadas
   `public: false` (ex.: a responsabilidade do líder). Só as seções `public: true` aparecem na interface, na
   página "Sobre o propósito" e em trechos de Juntos, Você, Ajuda, Dia e Intercessão. Ela depende da mesma
   autorização do item 3: auditar direitos é auditar os **dois** documentos derivados.
6. **Texto bíblico.** O guia e a escala só trazem referências. A orientação aos líderes, porém, **cita um
   versículo** no fecho (Levítico 6:13). O conversor reconhece citações (trecho entre aspas seguido de referência),
   separa-as num bloco `scripture` com a referência canônica e **recusa a geração acima de três citações**: além
   disso deixa de ser citação e vira reprodução de tradução, que exige licença. Hoje há exatamente uma, exibida na
   página "Sobre o propósito" identificada como citação e atribuída.
   - Base: uma citação avulsa e atribuída é lícita (Lei 9.610/98, art. 46, III), e a SBB admite até 500 versículos
     sem autorização escrita. Isso **não** libera o Gate 1: o leitor continua sem exibir tradução nenhuma.
   - **Pendente:** a igreja precisa informar **qual tradução** é essa, para a atribuição ficar completa.

## Autorizações

Registro de **quem** autorizou, **quando** e **por qual canal**. Este arquivo não é embarcado no app; o
`dataset.json` é. Por isso o nome de quem autorizou fica **só aqui**, e em `rights.json` vai apenas um
identificador neutro (ex.: `autorizacao-2026-09-25`), que é o que o app carrega em `provenance.rights_reference`.
O conversor recusa `rights_reference` com espaço, maiúscula, tratamento (Pr., Pra., pastor...) ou qualquer palavra
que apareça nos nomes da escala.

| Identificador (`rights_reference`) | O que foi autorizado | Quem, quando, canal | Onde está a cópia |
|---|---|---|---|
| — | Nada ainda (`pending_authorization`) | — | — |
