# Autorização da igreja para publicar o material dos 100 Dias — RASCUNHO

> **RASCUNHO PARA REVISÃO DE ADVOGADO. NÃO É PARECER JURÍDICO.**
> Este texto foi escrito pela equipe técnica do app para a igreja adaptar. Nada aqui foi revisado por advogado.
> Antes de assinar, um advogado da igreja (ou de confiança dela) precisa conferir o texto, os artigos de lei citados
> e quem tem poderes para assinar. Tudo entre `[COLCHETES]` é para preencher. Não preenchemos nenhum dado da igreja
> (nome da entidade, CNPJ, endereço, nomes de quem assina) porque não temos esses dados confirmados.
>
> Este é um **modelo interno**. Não imita documento oficial de nenhuma outra organização.

Versão do rascunho: 1 · Preparado em 2026-09-21 · Arquivo: `docs/legal/AUTORIZACAO_DA_IGREJA_rascunho.md`

---

## Parte A — Para o fundador (leia antes de mandar para a igreja)

### A.1 O que este documento destrava

O app já está pronto para mostrar o guia, a escala e a orientação da campanha. O que falta é **a igreja dizer, por
escrito, que permite**. Sem isso:

- a versão de desenvolvimento mostra o aviso "aguardando autorização";
- **a versão de loja (App Store e Google Play) não é gerada**: o conversor para com a mensagem
  `BLOQUEADO: rights_status é "pending_authorization"`.

Isso é o **Gate 2**. Ele não tem nada a ver com o **Gate 1** (licença de tradução bíblica), que continua aberto: o app
não mostra texto de tradução nenhuma, só as referências ("Gênesis 1–3"). Assinar este documento **não** libera texto
bíblico.

### A.2 O que muda no app quando a igreja assinar

Só um arquivo é editado à mão: `mobile/content/100-dias-2026/rights.json`. Hoje ele está assim:

```json
"rights_status": "pending_authorization",
"rights_reference": null,
"leader_names_authorized": false
```

**Depois da assinatura da Parte B (material):**

1. `rights_status` passa a `"authorized"`.
2. `rights_reference` recebe uma frase que identifica o documento, por exemplo:
   `"Autorização assinada por [NOME], [CARGO], em [DATA]; cópia arquivada em [LOCAL]"`.
   O conversor **recusa** `"authorized"` sem essa referência.
3. Rodar `npm run content:convert` (dentro de `mobile/`). O conversor regenera `dataset.json` e `proposito.json`
   com o novo estado. `npm run content:check` confirma que está tudo coerente.
4. O aviso "aguardando autorização" some e o build de loja deixa de ser bloqueado por esse motivo.

**Só se a igreja assinar também a Parte C (nomes de líderes) e cada líder tiver consentido (Anexo 2):**

5. `leader_names_authorized` passa a `true`. O conversor **recusa** isso se `rights_status` não for `"authorized"`.
6. Rodar de novo `npm run content:convert`. Os nomes da escala passam a aparecer no dia de cada ministério.

Nenhuma dessas mudanças deve ser feita antes de o documento assinado existir e estar guardado.

### A.3 Três pontos que você precisa saber (e levar ao advogado)

**PROBLEMA 1 — Quem é dono do texto pode não ser "a igreja".**
- EVIDÊNCIA: os metadados dos três arquivos indicam como autora **Leandra Pedroso** e data de criação 2026-08-28
  (`mobile/content/source/README.md`). Isso diz quem criou o arquivo no computador, não quem é dona dos direitos.
- INFERÊNCIA (a confirmar com advogado): na lei brasileira de direitos autorais não há regra geral de que o texto
  escrito por uma pessoa pertença automaticamente à instituição para a qual ela escreveu. Se o texto foi escrito por
  uma pessoa (pastora, funcionária, voluntária), a instituição pode não ter os direitos patrimoniais sozinha.
- RECOMENDAÇÃO: a Parte B tem um campo de **anuência da autora ou autores**. É barato colher essa assinatura agora e
  caro descobrir o problema depois. O advogado decide se ela é necessária.

**PROBLEMA 2 — A igreja não pode consentir pelos líderes.**
- EVIDÊNCIA: a escala traz o nome de pessoas ligadas a ministérios da igreja. Nome + ministério de igreja revela
  convicção religiosa, que a LGPD trata como **dado pessoal sensível** (art. 5º, II; ver `docs/technical/SECURITY_V0.md`).
- INFERÊNCIA: para dado sensível, a base mais segura é o consentimento **da própria pessoa**, específico e destacado.
  A assinatura da igreja autoriza o uso do material; não substitui o "sim" de cada líder.
- RECOMENDAÇÃO: a Parte C só vale junto com o **Anexo 2** assinado por cada líder listado. Se faltar alguém, o nome
  dessa pessoa não pode aparecer.
- IMPACTO TÉCNICO (honesto): hoje `leader_names_authorized` liga ou desliga **todos** os nomes de uma vez. Se um único
  líder não consentir ou pedir retirada depois, o app atual só consegue esconder todos. Mostrar uns e esconder outros
  exige uma mudança pequena no conversor (lista de nomes autorizados), que **não está feita** e precisa da aprovação
  do Product Brain. Até lá, a regra prática é: ou todos os listados consentiram, ou nenhum nome aparece.

**PROBLEMA 3 — Retirar algo do app não é instantâneo.**
- EVIDÊNCIA: o conteúdo vai empacotado dentro do app para funcionar offline.
- IMPACTO: se a igreja revogar a autorização ou um líder pedir retirada, a remoção chega aos celulares só com uma
  atualização do app (loja ou atualização remota de correção). Quem não atualizar continua com a cópia antiga.
- RECOMENDAÇÃO: o documento já diz isso à igreja (cláusula B.6) e fixa um prazo de retirada realista. Não prometa
  "remoção imediata".

### A.4 Onde guardar

Guardar o PDF assinado (ou o e-mail com o documento anexado) fora do repositório público, numa pasta de licenças da
entidade dona do app. As lojas podem pedir prova de direitos:

- FATO (Apple, App Store Review Guidelines 5.2 e 5.2.1, acesso em 2026-09-21,
  https://developer.apple.com/app-store/review/guidelines/): o app só pode incluir conteúdo que você criou ou que tem
  licença para usar, e deve ser enviado pela pessoa ou entidade que é dona ou licenciada dos direitos.
- EVIDÊNCIA (Google Play, registrado em `docs/technical/MOBILE_STORE_REQUIREMENTS.md`): evidência de direitos pode ser
  pedida. Reverificar a política antes de submeter.

No repositório, registrar só a referência em `rights_reference` (quem, quando, onde está arquivado). **Não** colocar
no repositório CPF, RG, assinatura escaneada ou o Anexo 2 dos líderes.

### A.5 Sobre os artigos de lei citados

Tentei conferir o texto da Lei 9.610/98 no site do Planalto em 2026-09-21 e a conexão falhou. Os artigos citados na
Parte B vêm do conhecimento geral da lei e do que já está registrado no repositório (`mobile/content/source/README.md`,
art. 46, III). Estão marcados **"conferir"**: o advogado deve checar a redação vigente em
https://www.planalto.gov.br/ccivil_03/leis/l9610.htm antes da assinatura.

---

## Parte B — Termo de autorização de uso do material "100 Dias"

> Texto para a igreja assinar. Linguagem simples de propósito; o advogado pode formalizar.

### Quem autoriza

**[NOME COMPLETO DA ENTIDADE DA IGREJA]**, pessoa jurídica inscrita no CNPJ sob o nº **[CNPJ]**, com sede em
**[ENDEREÇO COMPLETO]**, aqui chamada **IGREJA**, representada por quem assina ao final.

### Quem recebe a autorização

**[NOME COMPLETO DA ENTIDADE QUE PUBLICA O APP NAS LOJAS]**, CNPJ **[CNPJ]**, com sede em **[ENDEREÇO]**, aqui chamada
**RESPONSÁVEL PELO APP**.

> Nota para o advogado: se a IGREJA e o RESPONSÁVEL PELO APP forem a mesma entidade, este termo vira uma
> autorização interna (ata ou declaração da diretoria) e a anuência dos autores (B.8) ganha ainda mais peso. Se forem
> entidades diferentes, é uma licença entre elas.

### B.1 O que é autorizado

O material próprio da IGREJA da campanha "100 Dias — Guia Diário de Intercessão" (23/09/2026 a 31/12/2026),
composto **exatamente** pelos três arquivos abaixo. O código SHA-256 é uma "impressão digital" de cada arquivo: se um
único caractere mudar, o código muda. Assim fica claro, sem margem para dúvida, qual versão foi autorizada.

| # | Nome do arquivo original | Criado em | SHA-256 |
|---|---|---|---|
| 1 | `100 Dias — Guia Diário de Intercessão.docx` | 2026-08-28 | `3e1dca0a0fff0e435def732f20127afe58acb4b1f6630fb2135f8a209845b199` |
| 2 | `ESCALA - 100 Dias — Guia Diário de Intercessão.docx` | 2026-08-28 | `8a6ce977a8c1e90d9b1344ea665249ce3ecc28e50c481855e1e25251625db6b6` |
| 3 | `ORIENTAÇÃO AOS LÍDERES DE MINISTÉRIOS.docx` | 2026-08-28 | `2fd53fc72f661e8b9ba90817af20e9e26115a1ccec6b94bcfa730edaaceac15a` |

A IGREJA declara que esses são os arquivos que ela produziu para a campanha e que entregou ao RESPONSÁVEL PELO APP.

Revisões futuras do material (novos arquivos, com nova data) ficam cobertas por este termo **somente** se a IGREJA as
enviar por escrito pelo canal indicado em B.9, identificando o arquivo. [OPÇÃO A MARCAR: ( ) sim, revisões enviadas
assim ficam cobertas ( ) não, cada revisão exige nova autorização]

### B.2 O que o RESPONSÁVEL PELO APP pode fazer

1. **Exibir** o conteúdo dos três arquivos dentro do aplicativo **[NOME DO APP]** para celulares (iPhone e Android):
   - o **guia**: tema, orientação e pedidos de oração de cada dia, e as referências de leitura bíblica;
   - a **escala**: a data de cada dia, o ministério responsável e a esfera de oração (os **nomes das pessoas** da escala
     dependem da Parte C);
   - a **orientação aos líderes**: numa página do app sobre o propósito da campanha.
2. **Adaptar a forma, sem alterar o texto.** Pode dividir o material por dia, colocar títulos, ícones, cores, botões,
   separar a referência bíblica em destaque, ajustar tamanho de letra e modo escuro, e ler em voz alta pelos recursos
   de acessibilidade do próprio celular. **Não pode** mudar palavras, cortar trechos de modo a mudar o sentido, corrigir
   ou "melhorar" o texto por conta própria. Erro de digitação só é corrigido se a IGREJA mandar a correção (B.1).
3. **Distribuir** o app gratuitamente na App Store (Apple) e no Google Play, e publicar atualizações dele.
4. **Mostrar trechos curtos** do material nas páginas das lojas e em imagens de divulgação do app (capturas de tela),
   para que as pessoas saibam o que vão baixar. [OPÇÃO: ( ) autorizado ( ) não autorizado]
5. **Guardar cópia** dos arquivos para gerar o app e comprovar a origem do conteúdo, inclusive perante as lojas.

**Prazo:** de **[DATA DA ASSINATURA]** até **[DATA FINAL]**.
> Sugestão técnica: não encerrar em 31/12/2026. O app aceita entrada tardia e há quem termine a leitura depois do fim
> oficial. Uma data como [30/06/2027] evita que o app tenha de ser retirado no meio da leitura de alguém.

**Território:** Brasil, que é onde o app será distribuído nas lojas. [OPÇÃO: ( ) também pessoas no exterior que
baixem o app, se a distribuição for ampliada]

**Gratuidade e natureza:** a autorização é **gratuita** e **não exclusiva** (a IGREJA continua livre para usar e
distribuir o próprio material por WhatsApp, PDF, cultos ou qualquer outro meio).

### B.3 O que NÃO é autorizado

1. Cobrar pelo app, pelo conteúdo ou por acesso a ele; colocar anúncios junto do material.
2. Vender, licenciar ou entregar o material a terceiros, ou usá-lo em outro app, site, livro ou produto.
3. Alterar o texto (ver B.2, item 2), misturar com textos de outras fontes como se fossem da IGREJA, ou atribuir à
   IGREJA palavras que ela não escreveu.
4. Usar o nome, o logotipo ou a marca da IGREJA além do necessário para identificar a origem do material, sem
   autorização separada. [Nota para o advogado: o uso de marca da igreja no nome, ícone e página do app nas lojas
   precisa de autorização própria; este termo não cobre marca.]
5. Exibir nomes de pessoas da escala sem a Parte C **e** sem o consentimento individual (Anexo 2).
6. Usar o material para treinar sistemas de inteligência artificial ou gerar conteúdo novo a partir dele.
7. Usar o material depois do prazo, fora do território, ou depois de revogado (B.6).

### B.4 Texto bíblico e a citação de Levítico 6:13

O guia e a escala trazem **só referências** bíblicas (por exemplo, "Gênesis 1–3"), não o texto dos versículos. Este
termo não autoriza nem pede autorização para nenhuma tradução da Bíblia: isso é assunto separado.

A orientação aos líderes termina citando um versículo (Levítico 6:13, "O fogo arderá continuamente sobre o altar…").
O app mostra essa citação como citação, com a referência ao lado. Para que ela fique corretamente atribuída, a IGREJA
informa qual tradução da Bíblia foi usada:

> Tradução usada na citação de Levítico 6:13: **[NOME DA TRADUÇÃO E EDITORA, ex.: "ARA — Sociedade Bíblica do Brasil"]**
> ( ) Não sabemos. Neste caso, a IGREJA indica a tradução de que a citação foi copiada até **[DATA]**, e até lá o app
> mostra a citação apenas com a referência.

> Base registrada pela equipe técnica (conferir): uma citação curta, avulsa e com indicação da fonte é permitida pela
> Lei 9.610/98, art. 46, III. Isso vale para esta citação isolada; **não** vale para exibir a Bíblia no leitor.

### B.5 O que a IGREJA declara

1. O material foi produzido pela IGREJA ou por pessoas que escreveram para ela, e a IGREJA tem direito de autorizar
   o uso descrito aqui (ver também B.8).
2. Pelo que a IGREJA sabe, o material não copia texto de terceiros sem permissão, com exceção da citação bíblica de B.4.
3. Os nomes de pessoas na escala só serão exibidos nos termos da Parte C.

### B.6 Revogação e retirada

1. A IGREJA pode revogar esta autorização a qualquer momento, por escrito, pelo canal de B.9.
2. O RESPONSÁVEL PELO APP se compromete a enviar, em até **[PRAZO — sugestão: 10 dias úteis]** do recebimento, uma
   atualização que retira o material do app, e a não gerar novas versões com ele.
3. A IGREJA entende que o conteúdo fica gravado no celular para funcionar sem internet. Por isso, a retirada chega a
   cada aparelho quando a pessoa atualiza o app; cópias em aparelhos não atualizados não podem ser apagadas à força.
4. O mesmo vale para correções de texto que a IGREJA pedir.

### B.7 Crédito

O app identifica a origem do material como: **"[TEXTO DE CRÉDITO, ex.: 'Material da [NOME DA IGREJA]. Usado com
autorização.']"**. [OPÇÃO: ( ) incluir o nome da autora/autores no crédito ( ) não incluir]

### B.8 Anuência de quem escreveu o material

> Recomendado pela equipe técnica; o advogado decide se é necessário (ver A.3, Problema 1).

Eu(s), abaixo identificado(s), autor(es) do material listado em B.1, concordo(amos) com a autorização dada pela
IGREJA nos termos deste documento.

| Nome completo | Documento [a critério do advogado] | Assinatura | Data |
|---|---|---|---|
| [NOME DA AUTORA / AUTOR] | [ ] | | [ ] |
| [NOME] | [ ] | | [ ] |

### B.9 Canal oficial

Comunicações sobre este termo (revisões, correções, revogação, retirada de nomes):
- pela IGREJA: **[NOME, CARGO, E-MAIL]**
- pelo RESPONSÁVEL PELO APP: **[NOME, CARGO, E-MAIL]**

### B.10 Assinaturas

Assina pela IGREJA quem tem poderes para isso pelo estatuto (ou por procuração).

> Nota para o advogado: conferir no estatuto social / ata de eleição quem representa a entidade e se a assinatura
> precisa ser conjunta (por exemplo, presidente e secretário). Anexar cópia do documento que dá os poderes.

| | IGREJA | RESPONSÁVEL PELO APP |
|---|---|---|
| Nome | [NOME COMPLETO] | [NOME COMPLETO] |
| Cargo | [CARGO — ex.: Presidente / Pastor(a) presidente] | [CARGO] |
| Base dos poderes | [ESTATUTO, ART. __ / ATA DE __/__/____ / PROCURAÇÃO] | [ ] |
| Assinatura | | |
| Data e local | [ ] | [ ] |

Forma de assinatura: [ ( ) física ( ) eletrônica com certificado ICP-Brasil ( ) plataforma de assinatura eletrônica —
a critério do advogado]

Testemunhas [se o advogado exigir]: [NOME / ASSINATURA] · [NOME / ASSINATURA]

---

## Parte C — Autorização SEPARADA e OPCIONAL: nomes de líderes na escala

> Assinar a Parte B **não** obriga a assinar a Parte C. Sem a Parte C, o app mostra o ministério de cada dia
> sem nome de pessoa, e funciona normalmente.

### C.1 O que é pedido

A escala indica, para cada dia, o ministério e o nome de líderes. A IGREJA autoriza o RESPONSÁVEL PELO APP a exibir,
no dia correspondente, **somente o nome** das pessoas abaixo, **tal como aparece na escala**, junto do ministério.
Nada além do nome: sem foto, telefone, e-mail ou qualquer outro dado.

| Dia(s) | Ministério | Nome como aparece na escala | Consentimento individual (Anexo 2) recebido? |
|---|---|---|---|
| [ ] | [ ] | [ ] | ( ) sim ( ) não |
| [ ] | [ ] | [ ] | ( ) sim ( ) não |
| [ ] | [ ] | [ ] | ( ) sim ( ) não |

[Acrescentar linhas conforme a escala.]

### C.2 Condições

1. Só aparece o nome de quem **assinou o Anexo 2**. A IGREJA colhe e guarda esses consentimentos.
2. **Cada pessoa pode pedir a retirada do próprio nome a qualquer momento**, diretamente à IGREJA ou ao RESPONSÁVEL
   PELO APP, sem precisar explicar o motivo. O pedido é atendido no prazo e do modo descritos em B.6 (itens 2 e 3).
3. Enquanto o app não tiver meio de esconder um nome só, a retirada de um nome implica esconder todos os nomes na
   atualização seguinte (ver A.3, Problema 2).
4. Os nomes são usados só para mostrar a escala dentro do app. Não entram em divulgação, lojas ou imagens do app.
5. Pessoas com menos de 18 anos: [OPÇÃO: ( ) não há menores na lista ( ) há — nesse caso o Anexo 2 é assinado também
   pelo responsável legal, a critério do advogado].

### C.3 Assinatura

| | Nome | Cargo | Assinatura | Data |
|---|---|---|---|---|
| Pela IGREJA | [ ] | [ ] | | [ ] |

---

## Anexo 1 — Como conferir o SHA-256 (para quem quiser verificar)

Qualquer pessoa pode conferir se o arquivo que tem em mãos é o mesmo autorizado. No Windows, abrir o PowerShell na
pasta do arquivo e digitar:

```
Get-FileHash ".\100 Dias — Guia Diário de Intercessão.docx" -Algorithm SHA256
```

O resultado precisa ser igual ao código da tabela de B.1 (letras maiúsculas ou minúsculas não importam).

## Anexo 2 — Consentimento individual do líder (um por pessoa)

> Rascunho para revisão de advogado. Consentimento de dado sensível precisa ser livre, informado, específico e
> destacado; o advogado deve ajustar este texto à LGPD e guardar a via assinada fora do repositório.

Eu, **[NOME COMPLETO]**, líder do ministério **[MINISTÉRIO]**, **concordo** que meu nome, exatamente como
**"[NOME COMO APARECE NA ESCALA]"**, seja exibido no aplicativo **[NOME DO APP]**, no(s) dia(s) **[DIAS]** da
campanha "100 Dias", junto do nome do ministério.

Entendo que:
- quem usa o app verá meu nome ligado a um ministério da igreja, o que mostra minha participação religiosa;
- nenhum outro dado meu será exibido;
- **posso retirar este consentimento a qualquer momento**, sem dar motivo, pelo contato **[E-MAIL / TELEFONE]**, e meu
  nome sairá na próxima atualização do app, em até **[PRAZO]**;
- quem não atualizar o app pode continuar vendo a versão anterior até atualizar;
- não concordar não muda nada na minha participação na campanha ou no ministério.

( ) Concordo  ( ) Não concordo

Assinatura: ______________________  Data: ___/___/______

---

## Checklist antes de mudar `rights.json`

- [ ] Advogado revisou e ajustou este texto.
- [ ] Parte B assinada por quem tem poderes (B.10), com o documento de poderes anexado.
- [ ] Anuência dos autores (B.8), se o advogado exigir.
- [ ] Tradução de Levítico 6:13 informada (B.4) — não bloqueia a Parte B, mas completa a atribuição.
- [ ] Documento guardado fora do repositório; `rights_reference` preenchido.
- [ ] `rights_status = "authorized"` → `npm run content:convert` → `npm run content:check`.
- [ ] Nomes de líderes: só com Parte C **e** Anexo 2 de **todos** os listados → `leader_names_authorized = true` →
      `npm run content:convert`.
