# Gate 1 — o que o leitor mostra na V1 (decisão até sexta, 25/09/2026)

- **Status:** **DECIDIDO em 2026-09-21 pelo fundador: opção (b1), Bíblia Livre empacotada** (ver
  `DECISOES_DO_FUNDADOR.md`, D-2026-09-21-1). A recomendação (a) do §5 fica como histórico, **superada**. Escrito em
  2026-09-21 como PROPOSTA.

> **Nota de 2026-09-21 (decisão):** o fundador escolheu **b1**: a Bíblia Livre (eBible `porbr2018`, USFM, CC BY 4.0)
> entra dentro do app numa aba **Bíblia**, na V1 se ficar pronta e testada, senão na primeira atualização. O download
> de `https://ebible.org/Scriptures/porbr2018_usfm.zip` (1,4 MB) foi autorizado por ele. Continuam valendo: atribuição
> completa (§2.1) citando a licença **do arquivo empacotado** (a do eBible, CC BY 4.0) e a data da versão; indicar
> alterações se a conversão mudar algo além da formatação; texto **sem cifragem**; tela de licenças. O Gate 2 segue
> independente. A pergunta à igreja "a Bíblia Livre serve para vocês?" (§2.2) continua aberta, mas não bloqueia.
> A leitura livre na aba Bíblia não conclui dias nem revela conteúdo da igreja de dias futuros.
- **Referências:** `PLANO_DE_LANCAMENTO.md` §0 item 6, D7 e §5 item 8; `../research/BIBLE_CONTENT_OPTIONS.md`;
  `../research/OPEN_PT_BIBLE_TEXTS.md`; leitor atual `mobile/src/app/reader/[day].tsx` (lido, não alterado).
- **Classificação:** FATO (fonte primária + data de acesso) · INFERÊNCIA · HIPÓTESE · RECOMENDAÇÃO.
- **Reverificação:** todas as licenças abaixo foram relidas **hoje (2026-09-21)** na página primária. Nenhum arquivo
  foi baixado. Nenhum texto bíblico foi copiado para este documento.
- **Regra:** "gratuito na internet" não é "livre para copiar". Nada da lista de bloqueio de `BIBLE_CONTENT_OPTIONS.md` §9
  entra no app. Nunca scraping do YouVersion.

---

## 1. PROBLEMA

O leitor do app já existe e já sabe mostrar texto de um provedor licenciado (`BibleTextProvider`, com número de
versículo e linha de atribuição no fim do capítulo). Hoje ele não tem texto: mostra o livro, o numeral do capítulo e a
caixa **"Texto ainda não liberado"**, mais o botão "Ler na minha Bíblia" (que marca o dia como lido).

A campanha começa em **23/09/2026**. Precisamos decidir **o que esse leitor mostra na V1**:

- **(a)** só as referências do dia + "Li na minha Bíblia" + um link para ler o capítulo fora do app;
- **(b)** um texto aberto empacotado no app (Bíblia Livre ou Nova Bíblia Viva da Biblica Open);
- **(c)** uma tradução protegida (NVI, NAA, ARA, NTLH) por contrato.

O Gate 1 é **independente** do Gate 2 (autorização escrita da igreja para o guia e a escala). Nenhuma opção do Gate 1
resolve o Gate 2; sem o Gate 2 a versão de loja não abre, qualquer que seja a escolha aqui.

---

## 2. EVIDÊNCIA

### 2.1 Textos abertos completos em pt-BR — licença reverificada hoje

| Texto | Licença exata (hoje) | Obrigações | Arquivo oficial para empacotar | Classificação |
|---|---|---|---|---|
| **Bíblia Livre (BLIVRE)** | eBible: o texto em português diz "CC BY 4.0 Brasil" e o em inglês "CC BY 4.0"; o link `/by/4.0/br/` **redireciona (HTTP 302) para o deed "Attribution 4.0 International"**. A CC não fez versões nacionais da 4.0, então na prática é **CC BY 4.0 Internacional** (correção do verificador, 2026-09-21). Repositório oficial no GitHub: **CC BY 3.0 Brasil** (esta sim é uma versão nacional). As duas são CC BY, **sem share-alike**. | Atribuição: "Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles" + URL + data da versão; em espaço curto, "BLIVRE" basta. Se alterar, indicar que alterou. **Não há proibição de alterar.** | eBible `porbr2018`: USFM, USFX, VPL, SWORD, ePub, HTML. GitHub: USFM, VPL, SWORD, ePub. O README diz que é **"trabalho em andamento"**: fixar a versão e a data. | FATO |
| **Biblica® Open Nova Bíblia Viva 2007 (ONBV)** | **CC BY-SA 4.0 Internacional**. © 2007, 2010 Biblica, Inc. | Atribuição com o copyright na página de título/copyright; nota de marca ("Biblica" é marca registrada no USPTO, "Used with permission"); informar que a obra original está grátis em biblica.com e open.bible; cópia permitida "desde que não a altere e mantenha o título"; alterar gera obra derivada, que exige listar as mudanças publicamente e sair sob CC BY-SA. Ou seja: **alterar não é proibido de forma absoluta, mas obriga share-alike e lista pública de mudanças** (precisão do verificador). O nome "Biblica®" no título é marca: manter o título não autoriza usar a marca em outro lugar do app. | eBible `poronbv`: **USFM**, USFX, VPL, SWORD, ePub, texto por capítulo, HTML. Fontes de 20/05/2025. Também listada no open.bible (Biblica) como "Full Bible", CC BY-SA. | FATO |
| **NVA / pt-br ULB (Door43)** | **CC BY-SA 4.0**; v6.9; emitida e modificada em 25/10/2019; 66 livros (39 AT + 27 NT); USFM. O título no manifesto é "Brazilian Portuguese Unlocked Literal Bible" (o nome "NVA" não aparece no manifesto). | Atribuição + mesma licença; LICENSE exige "Original work available at door43.org". | Door43 `pt-br_ulb`, USFM. **Sem manutenção desde 2019.** | FATO (licença); INFERÊNCIA (manutenção parada, pela data) |
| **Bíblia Portuguesa Mundial** | **Domínio público**, mas a própria página diz que é **rascunho "ainda em revisão"**. Fontes de 19/08/2026. | Nenhuma legal. | eBible `porbrbsl`. Muda com frequência, sem tradutor creditado. | FATO |
| **Bíblia Livre Para Todos (BLT)** | **CC BY-SA 4.0**. No eBible, **só o Novo Testamento**; o open.bible lista como "Full Bible", mas o arquivo aberto do AT não foi localizado. | — | Só NT confirmado. | FATO (eBible); não serve para a V1 (a leitura do dia inclui AT) |
| Tradução Brasileira 1917 | Domínio público pela idade; **só existe transcrição de 2ª mão** (Wikisource, 2009); a edição SBB 2010 é protegida. | — | Sem arquivo oficial. | Não reverificado hoje; já descartada para a V1 em `OPEN_PT_BIBLE_TEXTS.md` |

Divergências a registrar (FATO): a Bíblia Livre declara **3.0 BR no GitHub e 4.0 no eBible** (o "4.0 BR" do eBible não existe como versão nacional e aponta para a 4.0 Internacional); a página de detalhes do
eBible mostra "atualizado em 08/03/2022" enquanto a página de copyright diz fontes de 12/12/2025. Ambas as versões da
licença permitem empacotar e uso comercial; a diferença não bloqueia, mas a atribuição deve citar a licença **do
arquivo que for empacotado**.

Obrigação comum às licenças CC (FATO, já em `BIBLE_CONTENT_OPTIONS.md` §5): empacotar sem alterar não torna o app
obra derivada (o app **não** precisa ser open source); é proibido aplicar medida técnica que impeça o usuário de
exercer a licença, então **o texto aberto não pode ir cifrado**; tela de licenças obrigatória.

### 2.2 Aceitabilidade para uma igreja evangélica (INFERÊNCIA)

- **Bíblia Livre:** fraseado Almeida (base 1819 + Textus Receptus). Soa familiar para quem cresceu com ARC/ACF; soa
  datada para quem lê NVI/NVT. Sem títulos de seção. Não é uma tradução que o público reconheça pelo nome.
- **ONBV:** a mais fluida das abertas, mas de linhagem "Bíblia Viva" (paráfrase / equivalência dinâmica forte). Para
  leitura corrida de ~12 capítulos por dia é agradável; para estudo e citação no púlpito, pastores tendem a não usar
  paráfrase. O nome lembra a NVI, o que pode confundir.
- **Nenhuma** das duas é o que a Lagoinha usa no altar (HIPÓTESE forte: NVI ou NAA). O leitor mostraria um texto
  diferente do que o pastor lê no domingo. Isso é pergunta para a igreja, não para a engenharia.

### 2.3 Link para ler fora do app

- **FATO (observado hoje):** o site bible.com (YouVersion) abre capítulos por URL estável, com versão, livro (código
  USFM) e capítulo: `https://www.bible.com/pt/bible/1608/GEN.1.ARA` (ARA © 1993 SBB), `.../129/GEN.1.NVI` (NVI ©
  Biblica), `.../1840/GEN.1.NAA` (NAA © 2017 SBB), `.../211/GEN.1.NTLH` (NTLH © 2000 SBB).
- **FATO:** os Termos de Uso do bible.com (última atualização 02/04/2020) **não têm cláusula sobre links ou deep
  links**; proíbem robôs/spiders para acessar ou copiar material. Um link que o usuário toca não é acesso automatizado.
- **FATO (omitido na primeira versão, acrescentado pelo verificador):** os mesmos Termos limitam o uso do serviço a
  "personal and non-commercial use" ou "internal use of your non-profit religious organization", e proíbem usar as
  marcas YouVersion/Life.Church sem permissão escrita. INFERÊNCIA: quem usa o bible.com é o próprio usuário, para uso
  pessoal, então o link não conflita com essa cláusula; mas o botão deve dizer só "Abrir capítulo" (ou citar o domínio),
  sem nome ou logo YouVersion, e o app não pode monetizar esse fluxo.
- **FATO:** o esquema `youversion://bible?reference=JHN.1.1` existe, mas é **não documentado** e pode mudar
  (fonte secundária). Não usar; o link https serve para navegador e, quando instalado, para o app (INFERÊNCIA).
- **INFERÊNCIA (jurídica, sem parecer):** um hiperlink para a página pública do titular/distribuidor não é
  reprodução nem distribuição do texto (Lei 9.610/98, art. 29) — o texto é exibido pelo site licenciado. Não copiar,
  não emoldurar em WebView (seria exibir o texto dentro do app e contraria a regra "WebView não é produto"), não usar a
  marca/logo YouVersion no botão.
- **Não verificado hoje:** `biblia.sbb.org.br` (certificado HTTPS expirado no acesso) e a EULA da SBB (HTTP 403). O
  texto da EULA citado em `BIBLE_CONTENT_OPTIONS.md` é de 2026-09-07. Não usar a SBB como destino até o site responder
  normalmente.

### 2.4 Tradução protegida por contrato

- **FATO (2026-09-07, `BIBLE_CONTENT_OPTIONS.md` §2 e §4; não reverificado hoje — a página da SBB deu 403):** SBB (NAA,
  ARA, NTLH, ARC) só com autorização escrita; Biblica (NVI) acima de 500 versículos só com permissão, e a política da
  Biblica veda uso offline em apps; nenhum detentor publica preço ou tem autoatendimento.
- **INFERÊNCIA:** prazo de 2 a 6 meses e custo desconhecido (pode ser zero para ministério sem fins lucrativos, ou
  royalty). Via YouVersion Platform ou API.Bible (online, revogável, cláusula "replicate or compete", telemetria)
  exige conta para ver o catálogo pt-BR e parecer jurídico. **Nenhum desses caminhos fecha antes de 23/09 nem nas
  primeiras semanas da campanha.**

---

## 3. IMPACTO

| | (a) Referências + "Li na minha Bíblia" + link | (b) Texto aberto empacotado | (c) Tradução protegida por contrato |
|---|---|---|---|
| **Engenharia** | ~0,5–1 dia: montar o link a partir do código USFM (a tabela de livros já existe em `src/bible/books.ts`), trocar a caixa "Texto ainda não liberado" por "Leia em [capítulo]" + botão "Abrir capítulo" (`Linking` do React Native, sem dependência nova), escolha da versão do link em Aparência, testes. | 3–5 dias: conversor USFM → dado por livro no build (mesmo padrão do `content:check`), provedor real atrás do `BibleTextProvider`, tela de licenças e atribuição, testes de versificação, +4–5 MB no app, sem cifragem. | Não é trabalho de V1. Integração online (YouVersion/API.Bible) 5–10 dias **depois** do contrato/parecer; offline por contrato direto é V2. |
| **Prazo da V1** | Não atrasa. | Atrasa 3–5 dias de engenharia **e** depende de a igreja aceitar a tradução. | Não cabe na V1 (meses). |
| **Risco legal** | Mínimo (INFERÊNCIA; só linkamos). | Mínimo, se cumprir atribuição e não cifrar. | Baixo depois do contrato; alto se pular o contrato. |
| **Experiência** | Sai do app para ler; volta para marcar. Funciona com a Bíblia de papel. Online para ler. | Lê dentro do app, offline. Tradução que ninguém usa no altar. | A melhor, quando existir. |
| **Risco de produto** | Usuário pode não voltar ao app depois de ler fora (INFERÊNCIA). | Rejeição pastoral ou confusão ("não é a minha Bíblia"). | Dependência de terceiros; revogação (via plataformas). |
| **Reversibilidade** | Total: (b) ou (c) entram depois no mesmo leitor sem refazer nada. | Alta: dá para trocar ou manter como "leitura fácil". | — |

---

## 4. ALTERNATIVAS

1. **(a) Só referências + "Li na minha Bíblia" + link para o bible.com**, na versão que o usuário escolher (padrão =
   a que a igreja disser que usa no altar). Sem texto no app.
2. **(b1) Empacotar a Bíblia Livre** (CC BY; permite correção futura; fraseado Almeida).
3. **(b2) Empacotar a ONBV** (CC BY-SA; mais legível; qualquer correção vira obra derivada sob CC BY-SA com lista pública de mudanças; paráfrase).
4. **(a + b) Link como padrão e texto aberto como opção** "ler aqui mesmo (Bíblia Livre)". Custa a soma: ~4–6 dias.
5. **(c) Iniciar agora a carta à SBB/Biblica**, sem prometer data, em paralelo a qualquer opção acima.

Descartadas para a V1: NVA (parada desde 2019), Bíblia Portuguesa Mundial (rascunho), BLT (só NT confirmado),
TB 1917 (sem arquivo oficial), qualquer fonte da lista de bloqueio.

---

## 5. RECOMENDAÇÃO

> **SUPERADA em 2026-09-21:** o fundador decidiu **(b1)**. O texto abaixo fica como registro do que foi recomendado.

**RECOMENDAÇÃO: opção (a) na V1, e mandar a carta da opção (c) esta semana, em paralelo.**

- É a única que não mexe no prazo com a campanha já começando; o leitor fica pronto para receber texto depois.
- O link aponta para o bible.com na versão que a igreja usa (URL por capítulo, sem robô, sem WebView, sem logo);
  o app continua sendo o lugar de marcar o dia, a intercessão e as reflexões.
- **Não recomendo (b) agora:** 3–5 dias para mostrar uma tradução que o altar não usa, com risco de ouvir "não é a
  minha Bíblia". Se a igreja disser que Bíblia Livre ou ONBV servem, (b) entra numa atualização em uma semana, sem
  refazer nada.
- Se o fundador quiser leitura dentro do app mesmo assim, escolher **Bíblia Livre** (CC BY, sem share-alike, pode
  corrigir) em vez da ONBV (paráfrase; alterar obriga share-alike e lista pública de mudanças).
- Antes de publicar (a): um advogado confirma em uma frase que só linkar é aceitável (INFERÊNCIA hoje, não parecer).

---

**Respondido em 2026-09-21: (b1).** Pergunta original — **O que o fundador responde:** "(a), (b1), (b2) ou (a+b)?" — e, da igreja: "qual tradução o altar usa?" e "posso mandar
a carta à SBB/Biblica em nome da igreja?".

---

## Fontes (todas acessadas em 2026-09-21)

- https://ebible.org/porbr2018/copr.htm — Bíblia Livre: "CC BY 4.0 Brasil" (link `/by/4.0/br/` redireciona para 4.0 Internacional), © 2018, atribuição, fontes 12/12/2025.
- https://creativecommons.org/licenses/by/4.0/br/ — HTTP 302 para o deed "Attribution 4.0 International" (verificador, 2026-09-21).
- https://ebible.org/find/details.php?id=porbr2018 — Bíblia Livre: formatos (USFM, USFX, SWORD, ePub…).
- https://github.com/blivre/BibliaLivre — Bíblia Livre: CC BY 3.0 BR, formatos, "trabalho em andamento".
- https://ebible.org/poronbv/copr.htm — ONBV: CC BY-SA 4.0, © 2007, 2010 Biblica, não alterar, manter título, marca.
- https://ebible.org/find/details.php?id=poronbv — ONBV: USFM, USFX etc.; atualizado 20/05/2025.
- https://preview.open.bible/bibles?search=Portuguese — open.bible: ONBV e BLT "Full Bible", T4T NT, todos CC BY-SA.
- https://git.door43.org/Door43-Catalog/pt-br_ulb/raw/branch/master/manifest.yaml — NVA/ULB: CC BY-SA 4.0, v6.9, 2019.
- https://ebible.org/porbrbsl/copr.htm — Bíblia Portuguesa Mundial: domínio público, rascunho em revisão.
- https://ebible.org/find/details.php?id=porblt — BLT: só NT no eBible, CC BY-SA 4.0.
- https://www.bible.com/terms — Termos YouVersion (02/04/2020): sem cláusula de link; proíbe robôs; uso pessoal/não comercial ou interno de organização religiosa sem fins lucrativos; marcas só com permissão escrita.
- https://www.bible.com/pt/bible/1608/GEN.1.ARA, https://www.bible.com/pt/bible/129/GEN.1.NVI,
  https://www.bible.com/pt/bible/1840/GEN.1.NAA, https://www.bible.com/pt/bible/211/GEN.1.NTLH — URLs por capítulo e
  linhas de copyright.
- https://bentsai.org/posts/youversion-bible-url-scheme — esquema `youversion://` não documentado (secundária).
- https://www.sbb.org.br/acordo-de-licenca-de-usuario-final-eula — **HTTP 403 hoje**; conteúdo citado é de 2026-09-07.
- https://biblia.sbb.org.br/ — **certificado expirado hoje**; não verificado.
