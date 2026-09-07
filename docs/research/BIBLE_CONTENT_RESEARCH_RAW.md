<!-- Pesquisa bruta da Frente C (Sprint 0), produzida por agente de pesquisa em 2026-09-07 e revisada por amostragem: termos do API.Bible (cache ≤ 30 dias, remoção em 72 h, Starter estritamente não comercial, Pro US$ 29+/mês, US$ 10/mês por tradução comercial) e a licença da ONBV (CC BY-SA 4.0) foram reverificados nas páginas oficiais; os Termos do YouVersion Platform (17/08/2026) foram lidos no navegador. A síntese consolidada está em BIBLE_CONTENT_OPTIONS.md. -->

# Frente C — Conteúdo Bíblico e Licenciamento (Sprint 0)

**Data da pesquisa:** 2026-09-07 (todas as URLs foram acessadas nesta data, salvo indicação)
**Produto:** app mobile (iOS/Android) de leitura + estudo bíblico, pt-BR, primeiro ambiente ~3.000 pessoas ligadas à Igreja Batista da Lagoinha (cânon protestante, 66 livros). Jornadas "Bíblia em 100 dias" e "Bíblia em 1 ano". Sem monetização agora, mas distribuído em loja por uma organização — tratado aqui como potencialmente "comercial" aos olhos dos licenciadores.
**Necessidades técnicas centrais:** leitura offline, busca local, highlights por versículo, compartilhamento de versículos.

**Convenções de verificação usadas neste relatório**
- **[V]** = verificado em fonte primária (página oficial de termos/licença, catálogo oficial, texto da lei, PDF de página de copyright da própria editora).
- **[S]** = obtido de trecho indexado por busca ou de reprodução por terceiro (a página oficial bloqueou o acesso automatizado ou não existe página pública); tratar como forte indício, confirmar antes de decisão contratual.
- **NÃO VERIFICADO** = não foi possível confirmar; nunca inferimos termos de licença.

Observação de escopo: existe um agente paralelo (Frente C2) fazendo verificação profunda dos textos abertos/domínio público (eBible.org, open.bible, unfoldingWord/Door43, CrossWire, Wikisource). Aqui esses textos estão no nível de levantamento (seção 4); o foco é plataformas/APIs, detentores de direitos no Brasil, planos, estudo, áudio e base legal.

---

## 1. Resumo executivo

### Estratégia recomendada em 3 camadas

**Camada A — texto aberto empacotado offline (base do app, risco legal mínimo)**
Empacotar no app (SQLite/JSON gerado a partir de USFM) traduções com licença aberta ou em domínio público, com atribuição correta:
1. **Biblica® Open Nova Bíblia Viva (ONBV)** — texto moderno, dinâmico, © 2007, 2010 Biblica, Inc., liberado sob **CC BY-SA 4.0** [V — eBible.org, id `poronbv`]. É a única tradução brasileira contemporânea de uma editora "grande" com licença aberta. Estilo tipo "Bíblia Viva" (equivalência dinâmica/paráfrase moderada) — ótima para leitura devocional e jornadas de 100 dias; menos aceita para púlpito/estudo em igreja batista (inferência, ver 4.3).
2. **Bíblia Livre (BLIVRE)** — família Almeida (atualização da Almeida 1819 + ARC 1911, NT Textus Receptus), **CC BY** (3.0 BR no GitHub; eBible lista como CC BY 4.0) [V]. Soa "Almeida" (familiar ao público evangélico), mas é "trabalho em andamento" com revisões pendentes [V].
3. **Tradução Brasileira (TB, 1917)** — domínio público; texto respeitado ("Bíblia Tira-Teima"), porém arcaico. Atenção: a **edição SBB 2010** (atualização ortográfica) é reivindicada pela SBB — usar somente texto da edição de 1917 (ver 4.4 e 8.3).
4. Opcionais: **NVA – Nova Versão de Acesso Livre** (literal, CC BY-SA 4.0, baseada na ULB/unfoldingWord) [V — CrossWire]; **Almeida 1911** (DP, arcaica).

**Camada B — traduções protegidas via plataforma/API (online, sem redistribuição)**
- **YouVersion Platform** (lançado 31/03/2026; gratuito; SDKs Swift/Kotlin/React/React Native-Expo/JS; API REST; "Fast-track Licensing" com as editoras parceiras; termos de 17/08/2026) [V]. É hoje o caminho mais barato para exibir NVI/NAA/ARA/NTLH/NVT/A21 **se** as respectivas editoras tiverem aderido para pt-BR (NÃO VERIFICADO — a lista de versões disponíveis a desenvolvedores só aparece com chave de app). Os termos da YouVersion **não concedem direitos sobre o texto bíblico** ("We are not providing You rights in biblical works…") — cada versão tem um contrato de licença próprio aceito no portal; a editora pode **revogar** ou **reportar** um app a qualquer momento [V]. O SDK mantém cache local "para desempenho" [V — README Swift], mas nenhum documento acessível autoriza empacotamento offline; a política pública da Biblica diz expressamente que o conteúdo "não é licenciado para uso offline/download em apps móveis" [S].
- **API.Bible (American Bible Society)** — plano Starter gratuito estritamente não comercial (3 Bíblias protegidas, 5.000 chamadas/mês); Pro US$ 29+/mês (150.000 chamadas) + licenças comerciais por tradução a partir de US$ 10/mês; **cache permitido com atualização a cada 30 dias** (FAQ: ≤ 500 versículos consecutivos e refresh ≤ 14 dias); FUMS obrigatório em webapps (tracker JS não cobre apps nativos — há endpoint manual); remoção em 72 h ao encerrar [V]. Catálogo pt-BR exige login: NÃO VERIFICADO quais SBB/Biblica estão lá.
- **Bible Brain (FCBH)** — chave gratuita; **uso pessoal não comercial**, streaming; download offline só para filesets marcados no endpoint `/download`; app deve ser gratuito ao usuário [V]. Tem NTLH em áudio (bible.is `PORNLH`) [V].

**Camada C — negociação direta para offline (necessária para NAA/ARA/NTLH/ARC, NVI, NVT, A21, KJA, ACF)**
Os detentores brasileiros não têm "autoatendimento" para apps: SBB exige autorização por escrito (direitos@sbb.org.br) [V]; Biblica/NVI concede apenas 500 versículos sem permissão e a política pública veda offline em apps [V/S]; Mundo Cristão/NVT 500 versículos [V]; Vida Nova/A21 só "citações breves" [V]; SBTB/ACF 1.100 versículos [V]; Abba Press/KJA autoriza app a app [S]. Um app de leitura integral offline **sempre** excede esses limites → contrato.

### Confiança
- Alta: termos YouVersion Platform, API.Bible, Bible Brain, BibleProject, políticas de citação (SBB via reprodução, Biblica/NVI, NVT, A21, ACF), licenças dos textos abertos, texto da Lei 9.610/98.
- Média: quais versões pt-BR cada plataforma efetivamente libera para desenvolvedores; custos de negociação direta (nenhum valor público encontrado).
- Baixa: status jurídico fino da TB 2010 e da "Almeida Recebida".

### Riscos principais
1. **Usar fontes "abertas" na internet que hospedam NVI/ARA/ACF sem licença** (abibliadigital, thiagobodruk/bible, bolls.life etc.) — violação de direito autoral (Lei 9.610, arts. 29, 102-104) e risco reputacional para a igreja. **Não usar.**
2. **Dependência de plataforma**: YouVersion pode encerrar/alterar ferramentas "a qualquer momento, com ou sem aviso"; editoras podem revogar licença; exige mecanismos de relatório de uso e compartilha PII do desenvolvedor com editoras [V].
3. **Offline ≠ cache**: nenhuma plataforma consultada autoriza empacotar texto protegido no binário; API.Bible permite cache renovável (30 dias) — modelo "offline temporário" viável apenas ali, com FUMS.
4. **Aceitação pastoral**: as traduções abertas (ONBV, BLIVRE, TB) não são as usadas no púlpito da Lagoinha (hipótese: NVI/NAA/ARA). Decisão de produto necessária (seção 9).
5. **AI/TTS**: YouVersion proíbe uso do texto para treinar IA e chat aberto; API.Bible proíbe treino de IA e limita TTS a textos PD/CC; TTS de texto protegido continua exigindo licença do texto [V].

---

## 2. Tabela mestre de opções

| Produto/Provedor | Conteúdo pt-BR | Licença | Uso comercial? | Redistribuição/offline? | Caching? | API/SDK? | Atribuição exigida? | Limites | Custo | Riscos | Fonte + data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **YouVersion Platform** (YouVersion/Life.Church) | Consumer app tem ARA, ARC, NAA, NTLH, TB (SBB), NVI (Biblica), NBV-P, NVT (Tyndale/Mundo Cristão), A21 (Vida Nova), BLT, VFL, AVM etc. [V]; quais estão liberadas a devs: NÃO VERIFICADO | Termos YVP (17/08/2026) cobrem só as ferramentas; texto bíblico = licença por versão aceita no portal (endpoint `/v1/licenses`) | Não proibido pelos YVP Terms (há cláusula para apps pagos); cada editora filtra "for-profit/non-profit" e pode revogar por "commercial use violation" [V] | Não documentado; SDK faz cache local "para desempenho" [V]; política Biblica: sem offline em apps [S] | Sim (SDK), "best practice: cache responses" (quick reference) [V] | REST `https://api.youversion.com/v1` + SDKs Swift/Kotlin/JS/TS/React/RN-Expo (Apache-2.0); sem Flutter [V] | Sim — guia "Copyright & Attribution"; `copyright_short` por versão [S]; não usar marcas YouVersion sem permissão [V] | Rate limit 429 + `Retry-After` (valores não publicados) [V] | Gratuito [V] | Encerramento a qualquer momento; revogação por editora; relatório de uso obrigatório; PII do dev compartilhada com editoras; lei de Oklahoma [V] | platform.youversion.com/terms; developers.youversion.com/quick-reference; github.com/youversion — 2026-09-07 |
| **API.Bible** (ABS) | Catálogo pt-BR exige login (NÃO VERIFICADO); indícios: TB 2010 hospedada pela ABS (`por-TB10`) [S] | T&C (ToS 03/09/2026; Non-Commercial 12/09/2025; Commercial 21/11/2025) | Starter: "Strictly non-commercial"; Pro/Commercial: sim, por tradução | Sem sublicenciar/distribuir; cache sim, atualização ≤ 30 dias; remover em 72 h ao encerrar [V] | Sim (≤ 30 dias; FAQ: < 500 versículos consecutivos, refresh ≤ 14 dias) [V] | REST (`rest.api.bible`), SDK TypeScript [V] | Sim — formato de citação fixo + link para página de copyright; Starter deve linkar api.bible [V] | Starter 5.000 chamadas/mês; Pro 150.000; US$ 1/1.000 extra; NKJV 5.000 usuários/mês [V] | US$ 0 / US$ 29+/mês / +US$ 10/mês por tradução comercial [V] | FUMS em apps nativos = implementação manual; proibição IA/LLM; TTS só PD/CC e sem gravar [V] | api.bible; api.bible/terms-and-conditions; docs.api.bible — 2026-09-07 |
| **Bible Brain / DBP** (FCBH) | Texto: NTLH, NAA, ARA, NVT, A21, ACF, TB, ARC etc. listados em find.bible (IDs PORNLH, PORBBS, PORBAR, PORNVT, PORBAS, PORFIE, PORTB1, PORARC…) [V]; áudio NTLH em bible.is [V]; filesets de áudio: NÃO VERIFICADO | T&C e License de 15/04/2021 | **Não** ("personal, non-commercial use"; app "completely free of charge") [V] | Streaming; offline só conteúdo marcado em `/download`, e "must remain within the application" [V] | Não (exceto `/download`) | REST `https://4.dbt.io` (chave por formulário) [V] | Manter avisos de copyright/marcas FCBH [V] | Não publicados | Gratuito ("No license fees") [V] | Terminação a qualquer momento; "Faith Guidelines" | faithcomesbyhearing.com/bible-brain/license; /terms-conditions — 2026-09-07 |
| **DBL / Library.Bible** (UBS) | Repositório mundial (SBB provavelmente deposita lá — NÃO VERIFICADO) | Licença negociada com cada detentor ("Controlled access") [V] | Depende do detentor | Sim — download de arquivos (USX) para uso offline, mediante licença [V] | n/a | Integração com API.Bible via DBL API key [V] | Depende | Depende | Depende | Processo institucional; exige organização cadastrada | care.library.bible/article/196-api-bible; get.bible — 2026-09-07 |
| **SBB** (ARC, ARA, NAA, NTLH, TB 2010) | Todas as principais versões Almeida do Brasil | Proprietária; EULA da Plataforma SBB: uso pessoal, não comercial; cópia/distribuição vedadas [V] | Só com autorização escrita (direitos@sbb.org.br) [V] | Só por contrato | n/a | **Nenhuma API pública encontrada** (NÃO VERIFICADO); app oficial Bíblia SBB+ (26/05/2026) desenvolvido pela BibleBooster [V] | Citação gratuita até 500 versículos (≤ 50% de um livro; ≤ 25% da publicação) com crédito [S] | 500 versículos | Não público (contratos existem — caso 2015) [S] | Histórico de negar licenças a projetos livres (SWORD) [S]; litígio sobre ARA [S] | sbb.org.br/acordo-de-licenca-de-usuario-final-eula; tuapalavra.com/pt-BR/copyright — 2026-09-07 |
| **Biblica — NVI pt-BR** | NVI (© 1993, 2000, 2011; revisão 2023) | Proprietária | Uso comercial > 500 versículos: permissão escrita (Editora Vida); não comercial: Biblica Brasil [V] | Política Biblica: "not licensed for offline / downloadable use as part of mobile applications" [S] | — | Via YouVersion Platform (Biblica é parceira de lançamento) [V] ou API.Bible (NÃO VERIFICADO) | Crédito fixo; "NVI" ao fim de cada citação em meios sem fins lucrativos [V] | 500 versículos | Não público | Marca "NVI" registrada; uso só com permissão [V] | Página de copyright da Bíblia Comparativa ARC•NVI (PDF Geográfica); rodrgoncalves.wordpress.com — 2026-09-07 |
| **Biblica — ONBV (Open Nova Bíblia Viva)** | Bíblia completa, © 2007, 2010 Biblica | **CC BY-SA 4.0** [V] | **Sim** | **Sim** (com atribuição; derivados sob mesma licença) | Sim | Download USFM/USFX/SWORD/ePub em eBible.org [V]; também no YouVersion (id 4272) | Sim (BY) + indicar alterações | Nenhum além da licença | Gratuito | ShareAlike sobre o texto (não sobre o app); estilo paráfrase | ebible.org/find/details.php?id=poronbv; open.bible — 2026-09-07 |
| **Mundo Cristão — NVT** | NVT (© 2016 Mundo Cristão; copyright atribuído à Tyndale House Foundation 2021) | Proprietária | > 500 versículos: permissão escrita [V] | Só por contrato | — | Via YouVersion (consumer) [V]; FCBH texto PORNVT [V] | Sim | 500 versículos (≤ 25% da obra; não um livro inteiro) | Não público | Titular agora é Tyndale (EUA) — negociação pode ser internacional | PDF NVT Letra Grande (mundocristao.com.br); bible.com/versions/1930 — 2026-09-07 |
| **Vida Nova — A21** | Almeida Século 21 (© 2008; ed. 2010, 2013) | Proprietária; deriva da "Revisada… Melhores Textos" (JUERP/IBB) [V] | Só com autorização | "Proibida a reprodução por quaisquer meios (…) a não ser em citações breves" [V] | — | Via YouVersion (consumer, id 2645) [V]; FCBH texto PORBAS | Sim | **Apenas citações breves** (sem regra de 500) | Não público | Cadeia de direitos envolve JUERP | PDF a21_letra_normal_trecho (institucional.vidanova.com.br) — 2026-09-07 |
| **Abba Press — KJA** | King James Atualizada (© 2001 Sociedade Bíblica Ibero-Americana & Abba Press) | Proprietária | Só com autorização | Autorizações app a app ("exclusivamente para este app sem fins lucrativos") [S] | — | Nenhuma API; não consta na lista pt-BR do YouVersion obtida | Sim | NÃO VERIFICADO | Não público | Sem página pública de licenciamento | apps.apple.com (avisos), abbapress.com.br/contato — 2026-09-07 |
| **SBTB — ACF** | Almeida Corrigida Fiel (© 1994, 1995, 2007, 2011) | Proprietária | > 1.100 versículos: autorização escrita [V] | Só por contrato | — | Nenhuma API; FCBH texto PORFIE | Crédito fixo; "(ACF)" em meios internos [V] | 1.100 versículos (≠ livro inteiro; ≤ 50% da obra) | Não público | — | biblias.com.br/direitos-autorais — 2026-09-07 |
| **Bíblia Livre (BLIVRE)** | Bíblia completa (Almeida 1819/1911 atualizada; NT TR e Nestle 1904) | **CC BY 3.0 BR** (GitHub) / "CC BY 4.0" (eBible) [V] | Sim | Sim | Sim | USFM, SWORD, ePub, VPL, mySword no GitHub/eBible [V] | Sim (BY) | — | Gratuito | "Trabalho em andamento"; revisões pendentes | github.com/blivre/BibliaLivre; ebible.org porbr2018 — 2026-09-07 |
| **Tradução Brasileira 1917** | Bíblia completa | Domínio público (obra de 1917) — ver análise 8.3 | Sim | Sim | Sim | Wikisource (transcrição; fonte "Bíblia Online [200-]"); find.bible PORTB1 "Public Domain (OPEN)" [V] | Não obrigatória (recomendada) | — | Gratuito | Edição SBB 2010 reivindicada; identificar proveniência do texto digital | pt.wikisource.org; sbb.org.br (TB); find.bible — 2026-09-07 |
| **NVA – Nova Versão de Acesso Livre** | Bíblia completa (literal; base ULB/unfoldingWord; MAST) | CC BY-SA 4.0 (módulo CrossWire) [V]; site fala em "direitos autorais abertos" [V] | Sim | Sim | Sim | SWORD (CrossWire PorNVA v1.0, 2024) | Sim | — | Gratuito | Tradução recente, pouco conhecida | crosswire.org ModInfo PorNVA; biblianva.com.br/timeline — 2026-09-07 |
| **Almeida 1911 (1900/1911)** | Bíblia completa | Domínio público (Gutenberg #62383 "Public domain in the USA"; DP digitalizou ed. 1911) [V/S] | Sim | Sim | Sim | SWORD PorAlmeida1911 (pacote "GPL") | — | — | Gratuito | Linguagem de 1900 | crosswire.org; gutenberg.org/ebooks/62383 — 2026-09-07 |
| **Almeida Recebida** | Bíblia completa | Site: "domínio público" [V]; comunidade: derivada da JUERP 1967 e licença ambígua (PD + CC BY-NC-SA) [V] | Duvidoso | **Evitar** | — | MySQL/PDF no site | — | — | — | Alto risco (derivação de texto protegido) | almeidarecebida.org; groups.google.com/g/biblia-livre-comunidade — 2026-09-07 |
| **OpenBible.info** (refs. cruzadas, geodata) | ~340.000 referências cruzadas (base TSK) + atlas | **CC BY 4.0** / CC BY [V] | Sim | Sim | Sim | ZIP/CSV/KML | Sim | — | Gratuito | Referências em inglês (só IDs de versículo — neutras) | openbible.info/labs/cross-references; /geo — 2026-09-07 |
| **BibleProject (vídeos pt-BR)** | Séries traduzidas (bibleproject.com/portugues) | Licença própria, gratuita, não comercial [V] | **Não** (sem paywall, sem lucro) | **Não armazenar**: só embed/links do YouTube/site [V] | Não | Embed | Crédito obrigatório com texto fixo [V] | — | Gratuito | Dependência do YouTube | help.bibleproject.com (artigo apps); bibleproject.com/terms — 2026-09-07 |

---

## 3. Detalhe por provedor

### 3.1 YouVersion Platform (YouVersion / Life.Church)

**O que é e o que oferece hoje [V]**
- Endereços oficiais: `https://platform.youversion.com` (portal/cadastro/termos) e `https://developers.youversion.com` (documentação). Anúncio oficial em 31/03/2026: "Embedded Bible reader with 1,487 Bibles from 36 publishers in 1,283 languages", analytics, sign-in para sincronizar highlights/preferências; beta público desde dez/2025; parceiros iniciais BibleProject, Come and See (The Chosen), Biblica e Gloo; custo: gratuito. Post do blog (21/04/2026, atualizado 03/06/2026): "Nearly 1,500 Bibles and 36 publishers in 1,283 languages are available through YouVersion Platform".
- Produtos listados no portal: **Bible SDK** ("Embed YouVersion's Bible reader into your apps"), **User Insights**, **Sign in with YouVersion**, **Fast-track Bible Licensing** ("Access Bible versions instantly from any of YouVersion's approved Partners through our Fast-track Licensing service. No extra negotiation needed."), **Multi-Platform Support** (TypeScript, React, React Native, Swift, Kotlin), **Developer Dashboard**.
- SDKs (docs `/sdks/introduction` + GitHub, todos Apache-2.0): Swift (iOS/iPadOS 17+), Kotlin (Android), JavaScript, TypeScript types, React, React Native (Expo). **Não há SDK Flutter.** Componentes: `BibleTextView`, `BibleCardView`, `BibleReaderView`, `VerseOfTheDay`, `SignInWithYouVersionButton`. README Swift: "The SDK automatically fetches Scripture from YouVersion servers and maintains a local cache for improved performance."
- API HTTP (quick reference): base `https://api.youversion.com/v1`; header `X-YVP-App-Key`; endpoints `GET /bibles` (parâmetro `language_ranges` — ISO 639-3, ex. `por`), `/bibles/{version_id}`, `/books`, `/books/{book_usfm}` (códigos USFM de 3 letras), `/chapters`, `/verses`; paginação `next_page_token`; 429 com `Retry-After`. Endpoint de passagens (`/bibles/{id}/passages/{ref}`, `format=text`) e versículo do dia documentados por terceiro [S — dev.to]. **Não há endpoints de planos de leitura, áudio ou busca na referência rápida** (NÃO VERIFICADO se existem em outra seção).
- Licenças: `GET /v1/licenses` (parâmetros `bible_id`, `developer_id`, `all_available`) "Provides data about licenses… used by developers to get access to various types of content, e.g. Bibles"; retorna o **HTML do contrato**, IDs de Bíblias e timestamp de aceite [V]. Página "API Usage": "Once you've accepted the appropriate license agreements, get a Bible collection to list the Bible versions available to you." [V]

**Termos de Uso da Plataforma (última modificação 17/08/2026) — cláusulas relevantes, verbatim [V]**
- Natureza: licença "limited, revocable, non-transferable, non-exclusive, worldwide" para usar as **ferramentas** (SDKs/API) e "distribute Your Application to Users".
- **Nenhum direito sobre o texto bíblico é concedido pelos Termos:** "This Agreement is limited to the YV IP. We are not providing You rights in biblical works or works other than YV IP, which You must obtain from their respective owners and licensors." E: "Third-party content for Your Application may also be provided under Creative Commons licenses, which govern Your use of such content."
- **Relatório de uso obrigatório:** "You shall enable and maintain any usage reporting mechanisms built into YV IP, which may provide us with Aggregate Data".
- **YVP Terms por ferramenta** podem incluir "geographic restrictions, branding requirements, security requirements, technological requirements"; prevalecem sobre os Termos gerais.
- **Marcas:** proibido usar "YouVersion", "YVP", "Life.Church", "The Bible App" salvo permissão expressa por ferramenta; proibido insinuar patrocínio/parceria.
- **Concorrência:** proibido "use or exploit the YV IP to create or provide services that replicate or compete with YouVersion, the YouVersion Bible App, or YVP".
- **Apps pagos:** "if You charge money or a fee for any Application with which You use any YV IP, You will conspicuously and explicitly advise Users that the YouVersion Bible App is provided at no cost to the User." (ou seja, apps comerciais não são vedados pelos Termos gerais — mas cada editora decide, ver abaixo).
- **PII do desenvolvedor compartilhada com editoras:** "to provide You with certain biblical texts… those third parties require that we collect from You and share with them certain personally identifiable information ('Developer PII') to ensure that You meet and maintain the standards by the third-party license".
- **IA:** permitido usar IA para escrever código e "to generate content"; proibido usar as ferramentas "with any AI Technology to engage in open-ended chat with a User" (exceto para exibir texto bíblico verbatim, 100% fiel) e "to train, develop, refine or improve any AI Technology".
- **Vigência:** qualquer parte encerra com 30 dias de aviso; YouVersion pode "temporarily or permanently cease offering any or all YV IP… at any time, with or without notice" e suspender imediatamente por violação.
- **Sem garantias; indenização pelo desenvolvedor; lei de Oklahoma; foro Oklahoma County; sem ação coletiva.**
- Caching/offline: os Termos gerais **não mencionam** cache ou armazenamento do texto; a regra estará no contrato de cada versão (HTML em `/licenses`) e/ou nos YVP Terms do SDK — NÃO VERIFICADO (exige conta de desenvolvedor).

**Controle das editoras sobre apps (YouVersion Connect — suporte a parceiros) [V]**
- Status de licenciados: **Approved** ("Once a developer accepts their fast track license they will be automatically approved"), **Pending** (quando a editora abre um "report"), **Revoked** (temporário, pode ser revertido), **Reported** ("they will permanently lose access to the IP").
- Motivos de revogação citados: "commercial use violation, faith misalignment, misuse, agreement violation, etc."
- A editora vê: tipo de entidade legal, link do app, site, e-mail, endereço; filtra por "for-profit/non-profit"; pode "Revoke" e "regrant" (razões: "commercial status change, faith issues resolved…").

**Versões em português**
- No app consumidor (bible.com/languages/por) a listagem obtida traz 17 versões pt-BR: ARA, ARC (SBB), ARC (SB Portugal), A21 (Vida Nova), BLT, AVM (Ave-Maria), NVT (Tyndale House Publishers Inc.), VFL (Bible League), NTLH CE, NAA, NBV-P (Biblica), NTLH, NVI (2 entradas, Biblica), mzNVI, NTVDP, TB (SBB); áudio em 8 delas (ARA, ARC, ARC-PT, NVT, NAA, NTLH, NVI ×2) [V]. **KJA e ACF não apareceram nessa listagem.**
- Quais dessas as editoras liberaram para o **Platform** (fast-track) é NÃO VERIFICADO — só se vê com `all_available=true` autenticado. Biblica é parceira de lançamento (NVI provável). SBB, Mundo Cristão/Tyndale e Vida Nova: desconhecido. YouVersion afirma "mais de 100 parceiros brasileiros" e um hub regional em Belo Horizonte [S — press; página não carregou].

**Riscos específicos**
- Dependência total (online) para as versões licenciadas; encerramento unilateral; revogação por editora; obrigação de telemetria; compartilhamento de PII; possíveis exigências de branding por ferramenta; sem Flutter (se a stack for Flutter, usar API REST diretamente ou bridging nativo).
- **Exigência de login YouVersion:** não é obrigatória ("Sign in" é produto opcional; o SDK Swift permite `isSignInEnabled = false`) [V].

### 3.2 API.Bible (American Bible Society)

**Endereços [V]:** `https://api.bible` (novo portal; `scripture.api.bible` redireciona para lá desde a migração de 02/06/2026; base REST nova `rest.api.bible`, antiga auto-roteada), docs `https://docs.api.bible`, suporte `https://care.api.bible`, e-mail support@api.bible.

**Planos e preços (api.bible, home) [V]**
- **Starter — US$ 0/mês:** "Pick 3 of your favorite copyrighted Bibles"; "Includes 5,000 API calls per month"; "Strictly non-commercial use. No ads, fees, freemium models or upsells allowed"; sem overage.
- **Pro — US$ 29+/mês:** "Includes 150,000 API calls per month"; overage "US$ 1 per 1,000 additional API calls".
- **Licenças comerciais por tradução:** "Other popular copyrighted Bible translations can be licensed individually for commercial use, starting at $10/mon per translation."
- **Custom/Enterprise:** "Scaling beyond 100K monthly users? Contact us".
- Definição de comercial: "any use… as part of a product or service that is monetized, including… website advertising, licensing fees, in-app promotions, sponsorships, freemium models, and/or paid access"; exceção revogável para link discreto de doação/dízimo [V].
- Contas gratuitas antigas migraram para um "Legacy Plan" sem data de upgrade obrigatório [V].

**Termos e Condições (api.bible/terms-and-conditions) — datas: Statement of Orthodoxy 02/02/2026; Acceptable Use 25/02/2026; Non-Commercial 12/09/2025; Commercial 21/11/2025; Terms of Service 03/09/2026 [V]**
- **Cache/offline:** "All cached content from API.Bible must be updated at least once every 30 days"; ao encerrar a conta, "content must be removed within 72 hours". FAQ (docs): "You can cache data, but we request that you limit it to fewer than 500 consecutive verses" e refresh a cada 14 dias ou menos. → Modelo viável: **cache renovável**, não empacotamento permanente.
- **Sublicenciamento/redistribuição:** "You are not authorized to sublicense or distribute all or part of the API Content or Third Party IP Content to any third party without approval in writing".
- **Formato:** "Copyrighted content provided in text format is only for use as text, and copyrighted audio content is only for use as audio"; "Creating text to audio, or audio to text, may constitute a derivative work".
- **TTS:** só para conteúdo PD ou CC-BY/CC-BY-SA; "No recording, storage, download, or distribution of resulting audio outside your application"; máximo um capítulo por sessão.
- **IA:** "The use of any copyright content, including Creative Commons licensed content… for training generative Artificial Intelligence (AI) or Large Language Models (LLMs), is strictly prohibited" sem consentimento escrito.
- **Atribuição:** formato obrigatório "Scriptures quotations marked [abbreviation] © are taken from [name] © [year] [organization]… Used by permission. All rights reserved"; cada página com citação deve linkar a página completa de copyright; Starter deve exibir "a visible citation and hyperlink to https://api.bible" (Pro: encorajado).
- **FUMS:** "Any webapp must implement FUMs in order to use API.Bible, unless otherwise prohibited by law". Guia técnico: tracker `https://pkg.api.bible/fumsV3.min.js` (`fums("trackView", token)`, `trackListen` para áudio); coleta token, device ID anônimo, session ID, user ID opcional (hash SHA-256). "Currently, our client-side tracker is only available for browser-based JavaScript environments. This doesn't cover… most native applications." → em apps nativos: GET manual para `https://fums.api.bible/f3`. A obrigação para apps **móveis nativos** não é explícita — confirmar com support@api.bible.
- Uma única conta gratuita por pessoa/entidade; proibido criar múltiplas contas; suspensão por uso excessivo; NKJV limitado a 5.000 usuários finais/mês no não comercial.
- **Encerramento:** "For any reason, at API.Bible's sole discretion"; sem reembolso proporcional em violação; apagar todo conteúdo em 72 h.

**Catálogo pt-BR:** a página `/bibles` é um app JS que só mostra a tabela logado; o endpoint `GET /v1/bibles?language=por` retornou **401** sem chave. → NÃO VERIFICADO. Indícios: find.bible aponta a TB (2010) hospedada pela ABS em `bibles.org/versions/por-TB10` [S]; ABS/API.Bible integra com a DBL (UBS), onde a SBB provavelmente deposita textos — mas "Controlled access content is only available with active agreements" [V]. Assumir: PD/CC em português (TB, BLIVRE?, ONBV?) possíveis no Starter; SBB/Biblica só se houver "Standard/Unique License" ativa.

**Áudio/busca/planos:** há áudio (com `trackListen`) e busca por referência/palavra-chave [V]; **não há planos de leitura** [V — FAQ não trata; catálogo é de Bíblias].

### 3.3 Bible Brain / Digital Bible Platform (Faith Comes By Hearing)

- Endereços [V]: docs `https://www.faithcomesbyhearing.com/bible-brain/developer-documentation`; API `https://4.dbt.io`; chave via formulário `https://4.dbt.io/api_key/request` (nome, e-mail, uso pretendido); suporte support@digitalbibleplatform.com. Chamada sem chave retornou HTTP 422.
- **Terms & Conditions (15/04/2021) [V]:** direito "limited, non-exclusive, revocable, non-transferable… for personal, non-commercial use"; "you may not… copy, download, stream, capture, reproduce, duplicate, archive, upload, modify, translate, publish, broadcast, transmit, retransmit, distribute"; acesso "solely through DBP (and not separately through offline download)".
- **API License (15/04/2021) [V]:** "No DBP Content may be downloaded or made available for offline use by any person or outside of DBP except for DBP Content that is accessible via the /download endpoint"; desenvolvedor deve "enable your End Users to access DBP Content completely free of charge"; "No license fees or other payments will be due"; manter avisos de propriedade; FCBH pode encerrar "at any time and for any reason"; desenvolvedor encerra com 30 dias.
- **Core Concepts [V]:** filesets `LLLVVV[CDMM-xxxxx]`; áudio MP3 64 kbps constante, Opus, AAC, HLS; texto plain e formatado; timestamps por versículo; "The license allows for certain content to be downloaded for offline personal use within the application if the content is specifically marked as permitted" (`/download/list`), "must remain within the application".
- **Conteúdo pt-BR:** find.bible (FCBH) lista para `por`: PORNLH/PORTLH (NTLH 2000), PORBBS (NAA 2017), PORBAR (ARA 1993), PORNVT (NVT 2016), PORBAS (A21 2008), PORFIE (ACF 1994), PORARC (1898), PORTB1 (TB 1917 — "Public Domain (OPEN)"), PORBNV, PORB09, PORWBT (VFL), PORTFT, PORBRB, PORABT (2010), PORERV, POREUR, PORCER, PORBARR (1848), PORFIGU (1821), PORBAP (1681) [V]. bible.is exibe **NTLH com player de áudio** em `live.bible.is/bible/PORNLH` [V]. IDs de filesets de áudio (ex. `PORNLHN2DA`) e existência de áudio ARA/NVI no DBP: NÃO VERIFICADO (exige chave). Nota: a ABS/YouVersion listam áudio NVI via DBL/YouVersion [S].
- **Uso para nós:** viável para **áudio em streaming** (NTLH) num app gratuito, com cláusula de não comercialidade; inadequado para texto offline.

### 3.4 Digital Bible Library (UBS) e Library.Bible

- "The Digital Bible Library (DBL) is an online digital asset and licensing management platform developed and maintained by the United Bible Societies" [V — tools.bible]. Conteúdo "Open access… available to all DBL members"; "Controlled access content is only available with active agreements"; integração com API.Bible por DBL API key gerada pelo "DBL Account Manager of your organization" [V].
- get.bible (comparativo): Library.Bible permite "download the entire Bible file to store on a device so it works without an internet connection", mas exige negociar "licensing directly with rights holders" [V].
- Implicação: se a Lagoinha negociar com a SBB, a entrega técnica pode vir via DBL (USX) ou via API.Bible com licença ativa. Participação da SBB na DBL: NÃO VERIFICADO diretamente (a SBB é membro das Sociedades Bíblicas Unidas [V — sbb.org.br]).

### 3.5 Sociedade Bíblica do Brasil (SBB)

- **Traduções e datas [V/S]:** Almeida Revista e Corrigida (edição de Lisboa/Londres 1898 → revisões SBB 1949?, 1969, 1995, 2009 — pt.wikipedia cita "1949, 1969, 1995 e 2009"); Almeida Revista e Atualizada (1959; 2ª ed. 1993); Nova Almeida Atualizada (2017); NTLH (2000; "Bíblia na Linguagem de Hoje" 1988); Tradução Brasileira (1917; relançada em 2010 com "completa atualização ortográfica; grafia dos nomes próprios segundo o modelo da Almeida Revista e Atualizada…; pequenas alterações gramaticais" [V — sbb.org.br]).
- **EULA da Plataforma SBB (site + app Bíblia SBB) [V — verbatim]:** "Permitido apenas para uso pessoal e não comercial, como leituras, cultos, estudos bíblicos, e atividades educacionais sem fins lucrativos." / "É proibido usar o conteúdo da SBB com fins comerciais sem autorização prévia por escrito. Solicitações devem ser enviadas para direitos@sbb.org.br." / "Todo o conteúdo da Plataforma SBB é protegido por direitos autorais. É vedada a cópia, distribuição ou modificação sem permissão." CNPJ 33.579.376/0001-51; Av. Ceci, 706, Tamboré, Barueri/SP.
- **Política de citação gratuita (reproduzida por terceiros a partir da página de copyright das Bíblias SBB) [S]:** "A Sociedade Bíblica do Brasil cede a autores e editores o direito de usarem até 500 versículos de um texto bíblico, em publicações eclesiásticas, religiosas ou outras publicações, sem a necessidade de buscar uma autorização formal, desde que a extensão da citação não exceda a 50% de um livro completo da Bíblia, nem seja maior do que 25% do total da publicação." (tuapalavra.com; pesquisa.biblia.com.br). Não localizamos página oficial no sbb.org.br com esse texto.
- **App oficial "Bíblia SBB+" (notícia SBB de 26/05/2026) [V]:** gratuito, Android/iOS; traduções ARC69, ARC 2009, ARA 1993, NAA 2017, NTLH 2000; "Bíblia em áudio, com narração humana"; "acesso off-line"; planos de leitura, versículo do dia, busca, highlights, notas; níveis Anônimo / Conta Gratuita / Doador SBB (premium com Bíblias de Estudo); "desenvolvido pela BibleBooster, uma iniciativa de Sociedades Bíblicas". Leitura web em `biblia.sbb.org.br`.
- **API própria:** nenhuma API pública/documentação para terceiros encontrada (NÃO VERIFICADO — pode existir parceria privada via BibleBooster/UBS).
- **Planos de leitura oficiais [V]:** "Plano de leitura da Bíblia em 1 ano" ("Este plano de leitura foi criado pela Sociedade Bíblica do Brasil"; 5 capítulos aos domingos e 3 nos demais dias) e "#100diasnaPalavra" (100 dias), ambos com "episódios" diários no site; no YouVersion o plano 17593 é "fornecido pela Sociedade Bíblica do Brasil".
- **Comportamento de licenciamento (evidências) [S]:** o projeto Bíblia Livre relata que o projeto SWORD pediu permissão para distribuir traduções da SBB e "A SBB não permitiu (mesmo tendo a possibilidade de os módulos das traduções serem postos à venda…)"; relato de que interessados são convidados a pagar taxa para uso em sites; em 2015 a SBB assinou (e depois rompeu) um "contrato de cessão de direitos autorais de texto bíblico" para uma Bíblia comentada (PDF escaneado, termos ilegíveis → valores NÃO VERIFICADOS); há ação da SBB + Rudi Zimmer contra "O Rei das Pastas" sobre reprodução da ARA 2ª ed. ("Bíblia das Promessas"), com pedidos julgados improcedentes segundo o trecho indexado — inteiro teor bloqueado (NÃO VERIFICADO).
- **Custos e prazos:** nenhum valor público. Contato oficial para licenciamento: **direitos@sbb.org.br** [V]. Caminho recomendado: carta institucional da Lagoinha (pessoa jurídica, sem fins lucrativos), pedindo licença de uso digital offline de NAA (+NTLH) para app fechado de ~3.000 usuários, com relatórios de uso e prazo definido.

### 3.6 Biblica (NVI pt-BR, ONBV, open.bible)

- **NVI pt-BR — NÃO é aberta.** Copyright "© 1993, 2000, 2011 by Biblica, Inc.®" (find.bible) [V]; pt.wikipedia: NT 1991, Bíblia completa 2001, revisão 2023 [S]; publicada pela Editora Vida (hoje Geográfica). Marcas: "'NVI' e 'Nova Versão Internacional' são marcas registradas pela Biblica, Inc. nos Estados Unidos e no Brasil. O uso destas marcas só é permitido com permissão da Biblica" [V — página de copyright da Bíblia Comparativa ARC•NVI, Geográfica].
- **Política de citação (verbatim da página de copyright, PDF Geográfica) [V]:** "Somente poderão ser citados ou reimpressos até quinhentos (500) versículos sem permissão por escrito dos editores, desde que não formem um livro completo da Bíblia nem totalizem cinqüenta por cento da obra que os esteja citando. A permissão para citar ou reimprimir textos que excedam quinhentos (500) versículos, para uso comercial, deve ser solicitada por escrito à Editora Vida. Para uso não-comercial, a permissão deve ser solicitada por escrito à Bíblia Brasil. Quando as citações da NVI forem feitas em meios informativos sem fins lucrativos… páginas na internet e mensagens eletrônicas, apenas as iniciais NVI ao final de cada citação deverão ser incluídas". Versão anterior (© 1993, 2000 IBS) traz a regra dos 25% e o crédito "Citações das escrituras retiradas da Biblia Sagrada, Nova Versão Internacional, Copyright © 1993, 2000 pela International Bible Society" [S — reprodução].
- **Apps/offline:** a política pública da Biblica (Biblica Europe/permissions; página bloqueou fetch) diz: "Bible content is not licensed for offline / downloadable use as part of mobile applications. Streaming is permitted only through websites or mobile apps" [S]. Coerente com a exigência de licença específica para apps.
- **open.bible [V]:** "Open.Bible is your online hub for free Bible texts, audio Bibles, and maps — all freely released for use under Creative Commons licensing"; "Open.Bible is managed and maintained by Biblica"; "The recommended Creative Commons licenses are CC BY and CC BY-SA because they place no restrictions on commercial use or the creation of derivatives". Entradas em português localizadas: "A Bíblia Sagrada, Tradução para Tradutores (NT)" (25/07/2023) [S] e a ONBV (distribuída via eBible.org/YouVersion).
- **ONBV — decisivo [V]:** eBible.org `poronbv`: "Biblica® Open Nova Bíblia Viva 2007", "Copyright © 2007, 2010 by Biblica, Inc.", licença **Creative Commons Attribution-ShareAlike 4.0 International** (link creativecommons.org/licenses/by-sa/4.0); downloads: `poronbv_html.zip`, `poronbv.epub`, `.mobi`, PDF, SWORD `poronbv2007eb.zip`, Word XML (o eBible também disponibiliza USFM/USFX para seus textos — confirmar o pacote exato na Frente C2). No YouVersion aparece como ONBV (id 4272). Trata-se do texto da "Nova Bíblia Viva" (impressa pela Mundo Cristão em 2010, estilo Living Bible) — **não é a NVI**.
- **Implicações do CC BY-SA 4.0:** atribuição obrigatória (título, © Biblica, link da licença, indicação de alterações); qualquer **adaptação do texto** (correções, modernizações) deve ser redistribuída sob a mesma licença; o app em si (código) não é "adaptação" — o texto inserido em uma coleção mantém sua licença; proibido sugerir endosso da Biblica; a marca "Biblica®" é registrada — usar apenas na atribuição.

### 3.7 Mundo Cristão — NVT (Nova Versão Transformadora)

- Página de copyright (PDF oficial "Bíblia NVT Letra Grande", mundocristao.com.br) — verbatim [V]: "Bíblia Sagrada, Nova Versão Transformadora Copyright © 2016 por Editora Mundo Cristão. Todos os direitos reservados." / "utiliza a metodologia de tradução das línguas originais… da New Living Translation, copyright © 1996, 2004, 2007, 2013 por Tyndale House Foundation… Publicada sob permissão da Tyndale House Publishers, Inc." / "Nova Versão Transformadora, NVT, A verdade com clareza e o logotipo NVT são marcas registradas da Tyndale House Publishers, Inc." / **"É permitida a citação de até 500 (quinhentos) versículos por qualquer meio — impresso, visual, eletrônico ou áudio — sem a permissão por escrito da editora, desde que os versículos citados não constituam um livro inteiro da Bíblia nem sejam equivalentes a 25% (vinte e cinco por cento) ou mais do texto total da obra em que se inserem."**
- No YouVersion o aviso é "© 2016 por Editora Mundo Cristão. Copyright atribuído a Tyndale House Foundation, 2021" e a editora listada é Tyndale House Publishers Inc. [V] → a titularidade migrou para a Tyndale (EUA); negociação de app pode envolver Tyndale.
- Canal de licenciamento digital: não há página pública; contato geral (11) 2127-4147 / www.mundocristao.com.br [V]. NÃO VERIFICADO se a NVT está no YouVersion Platform ou API.Bible.

### 3.8 Vida Nova — A21 (Almeida Século 21)

- Página de copyright (PDF oficial `a21_letra_normal_trecho.pdf`) — verbatim [V]: "Bíblia Almeida Século 21 Copyright © 2008 Edições Vida Nova. 1.a edição: 2008 2.a edição revisada: 2010 3.a edição: 2013. Os direitos relativos à versão Bíblia Almeida Século 21 pertencem exclusivamente à Sociedade Religiosa Edições Vida Nova. Considerada criação intelectual nova, a versão Bíblia Almeida Século 21 é uma revisão e atualização da versão Bíblia Revisada de Acordo com os Melhores Textos no Hebraico e no Grego, cujos direitos pertencem exclusivamente à JUERP, detentora da marca IBB." / **"Proibida a reprodução por quaisquer meios (mecânicos, eletrônicos, xerográficos, fotográficos, gravação, estocagem em banco de dados, etc.), a não ser em citações breves com indicação de fonte."** Contato: vidanova@vidanova.com.br.
- Ou seja: **não há regra de 500 versículos** — qualquer uso além de citações breves exige autorização. Está no YouVersion (A21, id 2645) e na FCBH (texto PORBAS) [V].

### 3.9 Abba Press — KJA (King James Atualizada)

- Titularidade: "Sociedade Bíblica Ibero-Americana do Brasil & Abba Press © 2001" [S — avisos em apps na App Store]. Vários apps de terceiros exibem "sob autorização… exclusivamente para este app sem fins lucrativos" → a Abba Press concede autorizações **app a app** [S].
- Site abbapress.com.br não tem página de direitos/licenciamento; contato: webmaster@abbapress.com.br, (11) 5686-7046, Rua Domingos da Rocha Meira, 54, Santo Amaro/SP [V]. Não consta na listagem pt-BR do YouVersion obtida.

### 3.10 Sociedade Bíblica Trinitariana do Brasil — ACF

- Política oficial (biblias.com.br/direitos-autorais) [V]: citações de "até 1.100 (mil e cem) versículos sem a permissão da Sociedade Bíblica Trinitariana do Brasil", desde que não formem um livro completo nem 50% da obra; crédito: "Citações bíblicas extraidas de A Bíblia Sagrada - Almeida Corrigida Fiel (ACF), © 1994, 1995, 2007, 2011"; em boletins/cartazes basta "(ACF)"; acima disso, pedido por escrito a **sbtb@biblias.com.br**; (11) 2693-5663.
- Não está na listagem pt-BR do YouVersion obtida; FCBH tem texto PORFIE (1994) [V]. Site sbtb.org.br não respondeu (timeout).

### 3.11 Editoras católicas (fora do escopo — só registro)

Ave-Maria (AVM no YouVersion, Editora Ave-Maria), Paulus, Loyola, CNBB: proprietárias; CrossWire tem módulo PorCap (Capuchinhos). Não avaliadas.

---

## 4. Textos abertos / domínio público em pt-BR (levantamento)

### 4.1 Inventário (licença aparente)

| Texto | Fonte/ID | Licença / status | Base textual | Escopo | Observações |
|---|---|---|---|---|---|
| Biblica® Open Nova Bíblia Viva (ONBV) | eBible `poronbv`; YouVersion 4272; open.bible | **CC BY-SA 4.0**; © 2007, 2010 Biblica [V] | Nova Bíblia Viva (família Living Bible) | AT+NT | Único texto contemporâneo de grande editora com licença aberta |
| Bíblia Livre (BLIVRE) | github.com/blivre/BibliaLivre; eBible `porbr2018`; Door43 `Door43-Catalog/pt-br_blv`; CrossWire PorBLivre/PorBLivreTR | **CC BY** ("Creative Commons Attribution 3.0 Brazil" no GitHub/CrossWire; eBible diz "4.0") [V]; © 2018 Diego Santos, Mario Sérgio e Marco Teles | Almeida 1819 + ARC 1911; NT em duas versões (Textus Receptus Scrivener 1894 e Nestle 1904); AT Westminster Leningrad Codex | AT+NT completos, "ainda é necessário fazer revisões" [V] | Formatos: USFM, SWORD, ePub, mobi, VPL, mySword, theWord |
| Tradução Brasileira 1917 | pt.wikisource (transcrição; fonte "Bíblia Online [200-]"); find.bible PORTB1 ("Public Domain (OPEN)") | Domínio público (ver 8.3) | Letteris (AT) / Nestle (NT) | AT+NT | Arcaica; "Bíblia Tira-Teima"; verificar proveniência do texto digital (não usar a ed. SBB 2010) |
| NVA – Nova Versão de Acesso Livre | biblianva.com.br; CrossWire PorNVA v1.0 (2024-06-10) | **CC BY-SA 4.0** (CrossWire) [V]; site: "primeira versão bíblica literal em português com direitos autorais abertos" [V] | Unlocked Literal Bible (unfoldingWord); MAST (2016–2020), 600+ colaboradores | AT+NT | Literal; pouco conhecida do público |
| Bíblia Livre Para Todos (BLT) | eBible `porblt`; YouVersion BLT | CC BY-SA 4.0; © 2022 Free Bible Ministry [V] | Tradução da Free Bible Version (inglês) | **Só NT** | — |
| Tradução para Tradutores (TFT) | eBible `portft`; open.bible | CC BY-SA 4.0; © 2018 Ellis W. Deibler, Jr. [V] | Texto "para tradutores" (explicativo) | AT+NT (open.bible lista NT) | Não é tradução para leitura devocional |
| Bíblia Portuguesa Mundial | eBible `porbrbsl` | Domínio público; "rascunho… ainda em revisão" (2026-08-19) [V] | — | AT+NT | Rascunho; não usar em produção |
| Almeida 1911 (reimpressão 1911 da ed. 1900) | CrossWire PorAlmeida1911 v0.2.1 (2019); Project Gutenberg #62383 ("Public domain in the USA", 2020) | Domínio público [V/S]; módulo empacotado como "GPL" | Almeida (TR) | AT+NT | Ortografia de 1900 |
| Almeida Revista e Corrigida 1898 | FCBH PORARC (1898); ed. Lisboa/Londres | Domínio público por idade | Almeida (TR) | AT+NT | Texto digital fiel à ed. 1898 é raro; as revisões SBB (1969/1995/2009) são protegidas |
| Almeida Recebida | almeidarecebida.org (2017) | Site: "A Almeida Recebida é de domínio público"; comunidade Bíblia Livre: "essencialmente a Almeida Revisada Segundo os Melhores Textos" (JUERP 1967) e licença ambígua (PD + CC BY-NC-SA) [V] | Contestada | AT+NT | **Evitar** |
| Versão Fácil de Ler (VFL/WBTC) | eBible `por-WBTC` (© 1999 WBTC/Bible League); YouVersion VFL | Sem licença aberta declarada [V] | — | NT (eBible) / Bíblia (YouVersion) | Proprietária (Bible League) |
| unfoldingWord/Door43 pt-br | `Door43-Catalog/pt-br_blv` (Bíblia Livre), repositórios ULB pt-br por livro (parciais), tn/tq/tw por livro | CC BY-SA 4.0 (DCS) [V] | ULB | Parcial (NT ULB; livros avulsos) | Útil para notas de tradução (parcial) |
| CrossWire SWORD (pt) | PorAlmeida1911, PorBLivre, PorBLivreTR, PorCap (católica), PorNVA | Ver acima [V] | — | — | Sem NVI/ARA/NTLH (SBB negou) |

### 4.2 Qualidade/legibilidade (evidência + inferência)
- **ONBV:** português contemporâneo, frases curtas; a NBV impressa teve tiragem inicial de 500 mil exemplares (Gazeta do Povo) [S] — há mercado. É paráfrase moderada; para "leitura em 100 dias" é a mais fluida.
- **BLIVRE:** vocabulário Almeida (o que o público batista reconhece como "a Bíblia"), mas com inconsistências de revisão declaradas pelos próprios autores; base TR como a ARC/ACF (ponto positivo para leitores da ARC).
- **TB 1917:** fidelidade elogiada pela própria SBB ("copiamos-lhe as frases") [V], mas nomes próprios transliterados e sintaxe de 1917; público jovem estranhará.
- **NVA:** literal, moderna, mas desconhecida; útil como segunda coluna de estudo.
- **Aceitação pastoral (inferência):** nenhuma dessas é tradução de púlpito da Lagoinha; a apresentação no app deve nomear claramente a tradução e explicar a escolha. Recomenda-se validar com a liderança antes de tornar uma delas a "padrão".

### 4.3 O que a Frente C2 deve fechar
Pacotes USFM exatos e checksums (ONBV, BLIVRE, NVA, TB), diferenças BLIVRE TR × N4, proveniência do TB digital (edição 1917 vs. 2010), texto de atribuição por tradução, e teste de versificação contra org.vrs.

---

## 5. Planos de leitura

### 5.1 Base legal
- Lei 9.610/98, art. 8º [V — verbatim]: "Não são objeto de proteção como direitos autorais de que trata esta Lei: I - as idéias, procedimentos normativos, sistemas, métodos, projetos ou conceitos matemáticos como tais; II - os esquemas, planos ou regras para realizar atos mentais, jogos ou negócios; (…) V - as informações de uso comum tais como calendários, agendas, cadastros ou legendas".
- Art. 7º, XIII [V]: são protegidas "as coletâneas ou compilações, antologias, enciclopédias, dicionários, bases de dados e outras obras, que, por sua seleção, organização ou disposição de seu conteúdo, constituam uma criação intelectual".
- Leitura: um **cronograma de capítulos** (ex.: "3 capítulos/dia; 5 aos domingos") é sistema/esquema não protegido; a **compilação específica com textos devocionais, títulos, reflexões, perguntas** de um plano concreto (SBB, YouVersion, BibleProject) é obra protegida. Copiar dia a dia o plano da SBB/YouVersion = risco; gerar o próprio cronograma = seguro.

### 5.2 Planos existentes em português (evidência)
- **SBB "Bíblia em 1 ano"** [V]: criado pela SBB; regra pública (5 capítulos aos domingos, 3 nos outros dias; 20–30 min/dia); 365 "episódios" no site.
- **SBB "#100diasnaPalavra"** [V]: plano de 100 dias da SBB, também no YouVersion ("Gostaríamos de agradecer à Sociedade Bíblica do Brasil por fornecer esse plano").
- **Lagoinha "100 dias":** só encontramos um post de Instagram de uma Lagoinha local ("100 DIAS DE…") — NÃO VERIFICADO se existe material próprio da igreja; perguntar internamente (é a rota ideal: conteúdo da própria igreja).
- **M'Cheyne (1842)** [S]: domínio público (calendário em mcheyne.info); 4 leituras/dia; Bíblia 1×, NT e Salmos 2× ao ano. Pode ser reproduzido livremente.
- **YouVersion (bible.com) planos:** Termos (02/04/2020): uso "personal and non-commercial… or for the internal use of your non-profit religious organization"; proibido copiar por meios automáticos [V]; a API do Platform não expõe planos (quick reference) → **não exportáveis**.
- **BibleProject / Read Scripture:** licença própria não comercial; conteúdo não pode ser armazenado no app, só embed/links; crédito obrigatório [V].

### 5.3 Recomendação
Gerar os cronogramas por algoritmo (1.189 capítulos: 100 dias ≈ 12 cap/dia; 365 dias ≈ 3,3 cap/dia; variantes canônica, cronológica, AT/NT intercalados, "5 aos domingos") e escrever **conteúdo devocional original** (equipe pastoral da Lagoinha) — ou usar M'Cheyne. Não copiar episódios da SBB nem planos do YouVersion.

---

## 6. Conteúdo de estudo e áudio

### 6.1 Conteúdo de estudo — o que é seguro para o V1

| Recurso | Licença/status | Idioma | Uso recomendado |
|---|---|---|---|
| Referências cruzadas OpenBible.info (~340.000; base TSK) | CC BY 4.0 [V] | Neutro (pares de referências) | Sim — mapear para códigos USFM; atribuir "OpenBible.info" |
| Treasury of Scripture Knowledge (c. 1880) | Domínio público (CrossWire TSK "Public Domain") [V] | Inglês (só referências) | Sim (via OpenBible) |
| Geodata/atlas OpenBible.info | CC BY (créditos OpenBible + OSM) [V] | Inglês (nomes) | Sim, mapas simples |
| Strong's (1890) | Domínio público (CrossWire StrongsGreek) [V] | Inglês | Sim, mas pouco útil sem glossas em pt-BR |
| Dicionário Bíblico Strong (SBB, © 2002) | Protegido [S] | pt-BR | **Não** sem licença |
| Comentário Matthew Henry (CPAD, © 2002, trad. Degmar Ribas) | Protegido [S] | pt-BR | **Não** (o original inglês do séc. XVIII é PD, a tradução não) |
| Easton's Bible Dictionary (1897) | Domínio público (idade; não verificado em fonte primária nesta pesquisa) | Inglês | Opcional (tradução própria seria obra derivada nossa) |
| unfoldingWord/Door43 pt-br translationNotes/Words/Questions | CC BY-SA 4.0 (parcial) [V] | pt-BR | Sim, onde existir; ShareAlike |
| BibleProject vídeos pt-BR | Licença própria: embed/links, sem armazenar, sem paywall, crédito fixo [V] | pt-BR | Sim, apenas embed do YouTube com o crédito exigido |
| "Bíblias de Estudo" (SBB, Mundo Cristão etc.) | Sempre licenciadas (SBB+ reserva a doadores) [V] | pt-BR | Fora do V1 |
| Léxico Strong pt-BR aberto | Não encontrado (NÃO VERIFICADO) | — | Considerar glossário próprio |

Recomendação proporcional para V1: referências cruzadas (OpenBible), notas/introduções de livros **escritas pela equipe** (ou Door43 onde houver), embed de BibleProject, sem dicionário/comentário licenciado.

### 6.2 Áudio

- **Bible Brain (FCBH):** NTLH com áudio em bible.is [V]; uso pessoal não comercial, streaming, download só se marcado; app deve ser gratuito [V]. Melhor opção legítima para áudio de tradução protegida sem contrato (confirmar filesets com chave).
- **YouVersion:** áudio para ARA, ARC, NAA, NTLH, NVI, NVT no app consumidor [V]; exposição via Platform: NÃO VERIFICADO (a referência rápida não lista áudio).
- **SBB:** áudio com "narração humana" no app SBB+ [V]; não há canal público para terceiros.
- **ONBV em áudio:** open.bible anuncia "Free Audio Bibles" [V]; existe URL de "Bíblia em Áudio ONBV" indexada no YouVersion, mas a página retornou 404 → NÃO VERIFICADO.
- **TTS (síntese) — preços atuais [V]:** Azure Speech: Neural US$ 15 por 1 M caracteres (0,5 M grátis/mês; HD "N/A" na tabela); Google Cloud TTS: Standard/WaveNet US$ 4/1 M (4 M grátis/mês), Neural2 US$ 16/1 M (1 M grátis), Chirp 3 HD US$ 30/1 M (1 M grátis), Studio US$ 160/1 M; ElevenLabs: Free US$ 0 (10 k créditos, **sem uso comercial**), Starter US$ 6 (30 k), Creator US$ 11 no 1º mês (121 k), Pro US$ 99 (600 k), Scale US$ 299 (1,8 M), Business US$ 990 (6 M créditos).
- **Estimativa de custo** (Bíblia completa em português ≈ 4,3–4,6 milhões de caracteres — ordem de grandeza, NÃO VERIFICADO com precisão): Azure Neural ≈ US$ 65–70; Google Neural2 ≈ US$ 70; Chirp 3 HD ≈ US$ 135; Studio ≈ US$ 700; ElevenLabs ≈ 1 mês Business (US$ 990) ou 3 meses Scale. Custo único, gerado offline e empacotado (~40–70 h de áudio; MP3 64 kbps ≈ 1,2–2 GB → distribuir por download sob demanda).
- **Regra de ouro:** TTS de texto protegido continua exigindo licença do texto (API.Bible só permite TTS de PD/CC, sem gravar; YouVersion proíbe derivar/alterar; SBB veda "modificação") [V]. Para ONBV/BLIVRE/TB o TTS é permitido pela licença do texto — verificar ainda os termos de uso comercial do provedor de TTS (ex.: ElevenLabs só a partir do Starter).

---

## 7. Formatos e pipeline técnico

- **USFM 3.0** (ubsicap.github.io/usfm) [V]: marcadores `\id`, `\h`, `\toc1-3`, `\c`, `\v`, `\p`, `\q1/\q2`, `\s1`, `\f…\f*` (notas), `\x…\x*` (referências), `\w` (atributos de palavra), `\wj`. Códigos de livro (3 letras) do cânon protestante, em ordem: GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL | MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV (numeração 01–39, pula 40, 41–67) [V]. O YouVersion Platform usa exatamente esses códigos (`book_usfm`) [V].
- **USX 3.0** (XML do USFM; UBS) [V]; **Scripture Burrito 1.0.0** (ABS, Clear.Bible, Eldarion, Bridge Connectivity Solutions, SIL, unfoldingWord, UBS; patrocínio illumiNations) — pacote texto+metadados+licença [V]; **versificação**: especificação da Copenhagen Alliance com esquemas `org.vrs` (original), `eng.vrs`, `lxx.vrs`, `vul.vrs`, `rso.vrs`, `rsc.vrs` e mapeamentos JSON derivados do VRS do Paratext [V]. Traduções pt-BR seguem majoritariamente a versificação "inglesa/protestante"; validar Salmos (títulos) e Malaquias/Joel (divergências AT).
- **Parsers open source [V]:** JS/TS — `usfm-grammar` (Bridgeconn; tree-sitter; USFM ⇄ USJ/JSON; bindings Python/Node/Web), `usfm-js` (unfoldingWord), `proskomma`; Dart/Flutter — `scripture` (layout USFM, CC0-1.0), `bible_io` / `bible_io_references` (**AGPL-3.0 — copyleft forte, evitar em app fechado**), `biblebox_k` (MIT). Não há parser USFM Dart maduro: fazer o parsing em build-time (Node) e embarcar JSON/SQLite.
- **Pipeline sugerido (só para textos com direito de redistribuição):**
  1. Baixar pacote USFM/USFX oficial (eBible.org: ONBV, BLIVRE, TFT; GitHub blivre; CrossWire/NVA) + arquivo de licença/atribuição; registrar hash e URL.
  2. `usfm-grammar` → USJ → normalização (versificação org.vrs/eng.vrs; notas e títulos separados do texto corrido; preservar `\wj`, poesia).
  3. Gerar `SQLite` (FTS5 para busca local com `unicode61` + remoção de acentos) com tabelas `books`, `verses(book, chapter, verse, text_plain, text_rich)`, `footnotes`, `headings`, `xrefs` (OpenBible), e um `manifest.json` com licença/atribuição por tradução.
  4. Empacotar como asset (ou download sob demanda por tradução, ~4–6 MB comprimido cada); assinar e versionar.
  5. Camada de leitura: renderizar do `text_rich`; highlights/notas por `(bible_id, book, chapter, verse)`; compartilhamento gera imagem/texto com a **atribuição obrigatória** (CC BY/BY-SA: título, © e link da licença; para APIs: string `copyright_short`).
  6. Para traduções via API (YouVersion/API.Bible): módulo separado, sem persistência além do cache permitido (API.Bible ≤ 30 dias; YouVersion conforme licença da versão), com FUMS/telemetria exigidos.

---

## 8. Base legal brasileira e riscos

### 8.1 Lei 9.610/1998 — dispositivos (verbatim, fonte: Câmara dos Deputados, texto atualizado) [V]
- **Art. 7º, XI:** protegidas "as adaptações, traduções e outras transformações de obras originais, apresentadas como criação intelectual nova"; **XIII:** compilações/bases de dados "que, por sua seleção, organização ou disposição de seu conteúdo, constituam uma criação intelectual".
- **Art. 8º:** não protegidos ideias, "sistemas, métodos", "esquemas, planos", "informações de uso comum tais como calendários", "nomes e títulos isolados" (ver §5.1).
- **Art. 14:** "É titular de direitos de autor quem adapta, traduz, arranja ou orquestra obra caída no domínio público, não podendo opor-se a outra adaptação, arranjo, orquestração ou tradução, salvo se for cópia da sua".
- **Art. 5º, VIII, h (obra coletiva):** "a criada por iniciativa, organização e responsabilidade de uma pessoa física ou jurídica, que a publica sob seu nome ou marca e que é constituída pela participação de diferentes autores, cujas contribuições se fundem numa criação autônoma".
- **Art. 24, IV (direito moral):** "assegurar a integridade da obra, opondo-se a quaisquer modificações" — relevante para "corrigir"/modernizar textos protegidos e para TTS/edição.
- **Art. 28/29:** direito exclusivo de utilizar; dependem de autorização prévia e expressa "a reprodução parcial ou integral" (I), "a distribuição" (VI), disponibilização por sistema em que o usuário escolhe tempo/lugar (VII) e "a inclusão em base de dados, o armazenamento em computador… e as demais formas de arquivamento" (IX). → **Empacotar texto em SQLite no app é ato de reprodução + armazenamento + distribuição (art. 29, I, VI, VII, IX): exige licença.**
- **Art. 41:** "Os direitos patrimoniais do autor perduram por setenta anos contados de 1° de janeiro do ano subseqüente ao de seu falecimento"; **art. 42:** coautoria indivisível → conta da morte do último coautor; **art. 43:** obras anônimas/pseudônimas → 70 anos de 1º de janeiro seguinte à 1ª publicação; **art. 45:** domínio público também para autores sem sucessores e autor desconhecido.
- **Art. 46, II:** cópia única de "pequenos trechos" para uso privado do copista; **III:** "a citação… de passagens de qualquer obra, para fins de estudo, crítica ou polêmica, na medida justificada para o fim a atingir, indicando-se o nome do autor e a origem da obra"; **VIII:** reprodução de "pequenos trechos… sempre que a reprodução em si não seja o objetivo principal da obra nova e que não prejudique a exploração normal da obra reproduzida". → Um app cujo objetivo principal é exibir a Bíblia inteira **não** se enquadra em citação.
- **Sanções civis — arts. 102–104:** apreensão/suspensão da divulgação (102); "Quem editar obra… sem autorização do titular, perderá para este os exemplares que se apreenderem e pagar-lhe-á o preço dos que tiver vendido"; se desconhecido o número, "três mil exemplares" (103, par. único); responsabilidade solidária de quem distribui com intuito de lucro (104); suspensão de transmissão com multa diária (105). Há ainda tipo penal (art. 184 do Código Penal — não verificado em fonte primária nesta pesquisa).

### 8.2 O que é protegido no Brasil (aplicação)
- **Traduções são obras derivadas protegidas (art. 7º, XI)**; cada **revisão** com criação intelectual nova gera nova camada de proteção (art. 14). Assim: ARC 1898 (e reimpressões 1911) → DP; **ARC 1969/1995/2009 (SBB)** → protegidas; ARA 1959/1993, NAA 2017, NTLH 2000 → protegidas; NVI, NVT, A21, KJA, ACF → protegidas (todas pós-1990).
- **Prazo:** as Bíblias modernas são obras coletivas publicadas sob o nome/marca da sociedade/editora (art. 5º, VIII, h) → 70 anos da publicação; nenhuma das acima cai em DP antes de 2040.

### 8.3 Casos-limite: TB 1917 × 2010 e ARC 1898 × revisões
- **TB 1917:** publicada em 1917 pelas Sociedades Bíblicas (Americana/Britânica) "sem declaração de autoria ou direitos" [S — Wikisource]; como obra coletiva/anônima, o prazo (70 anos de 1918) expirou em 1988; mesmo sob a lei anterior (50 anos) já estava em DP. Único cenário adverso: tratá-la como coautoria com autores identificados — o coordenador H. C. Tucker morreu em 1956 [V — archive.org: "1857-1956"], o que levaria a proteção até 01/01/2027 (art. 41/42). Consideramos esse cenário improvável (obra publicada institucionalmente, sem autoria declarada), mas **vale parecer jurídico de 1 página**. Curiosamente, se prevalecesse, a partir de 2027 a questão some.
- **TB 2010 (SBB):** as alterações declaradas são "atualização ortográfica, grafia de nomes próprios, pequenas alterações gramaticais/pontuação" [V]. Sob o art. 7º, XI, uma revisão só é protegida se for "criação intelectual nova" — atualizações ortográficas mecânicas dificilmente atingem esse patamar, **mas a SBB reivindica copyright** (Wikipédia: "Current copyright is held by the Sociedade Bíblica do Brasil") e a ABS hospeda "por-TB10". Recomendação: usar apenas texto comprovadamente derivado da edição de 1917 (scans) e **não** o arquivo SBB 2010; se o produto quiser a ortografia moderna, a equipe pode fazer sua própria atualização ortográfica a partir do 1917 (art. 14: não se pode opor a outra adaptação, "salvo se for cópia da sua").
- **Wikisource TB:** a transcrição declara fonte "Bíblia Online [200-]" — pode ser a versão digital SBB de 2001 (CD-ROM). A Frente C2 deve validar amostras contra scans de 1917 (ex.: nomes "Habakkuk" na ed. 1917 vs "Habacuque" na 2010) antes de empacotar.
- **Almeida Recebida:** derivação apontada da "Revisada Segundo os Melhores Textos" (JUERP 1967) → protegida. **Não usar.**

### 8.4 Fontes a EVITAR (e por quê)

| Fonte | O que oferece | Por que não usar |
|---|---|---|
| `abibliadigital.com.br` (API) | NVI, RA (ARA), ACF, KJV… | Desativada em 01/08/2026 [V]; código BSD-2, mas **sem licença dos detentores** (texto derivado do repo abaixo); uso seria violação dos arts. 29/103 |
| `github.com/thiagobodruk/bible` (JSON/XML) | pt_aa, pt_acf, pt_nvi | O próprio README: "All the Bible versions are property of their respective owners. All rights reserved to the owners." — a licença CC BY-NC do repositório **não pode licenciar** o que o autor não possui [V]; gerado por crawler |
| `bolls.life` (API/site) | Dezenas de traduções, incl. pt-BR | Sem qualquer declaração de licença/permissão; operador pessoa física; pede para não "raspar" [V] |
| `github.com/damarals/biblias` e similares (Zefania/SQLite/JSON) | "18 Bíblias em português" | Compilações sem licença dos detentores (SBB/Biblica/SBTB) [S] |
| PDFs de Bíblias em pdfcoffee/yausha/blogs | NVT, NVI, Strong SBB, Matthew Henry CPAD | Cópias piratas de obras protegidas [S] |
| `almeidarecebida.org` | "Almeida Recebida" | Derivação de texto JUERP 1967; licença contraditória [V] |
| Wikisource "Ferreira de Almeida Atualizada" | Texto "Atualizada" via Unbound Bible | Discussão de violação; origem duvidosa (JUERP/IBB) [V] |
| Módulos "NVI/ARA/NTLH" em MySword/e-Sword/theWord de fóruns | Textos SBB/Biblica | Não licenciados (a SBB negou ao SWORD) [S] |
| Raspagem de bible.com / biblia.sbb.org.br / api YouVersion não oficial (`tushortz/youversion-bible-client`) | Qualquer versão | Viola termos (robôs proibidos) e direitos das editoras [V] |

Classificação de risco: **alto** (jurídico + reputacional para a igreja; possibilidade de notificação/remoção das lojas; indenização calculada por "exemplares" — art. 103). Não há hipótese de "uso ministerial" que legalize a reprodução integral sem licença.

---

## 9. Recomendação final e decisões para o Product Brain

### 9.1 Plano recomendado (V1 → V2)
1. **V1 (offline, zero licenciamento):** empacotar **ONBV (CC BY-SA 4.0)** como tradução de leitura contínua para as jornadas de 100 dias/1 ano, **Bíblia Livre (CC BY)** como "Almeida" familiar, e **TB 1917** (DP; após validação de proveniência) como terceira opção; NVA opcional. Busca local, highlights, compartilhamento com atribuição automática. Referências cruzadas OpenBible (CC BY). Planos gerados internamente + devocionais da equipe da Lagoinha. Áudio: TTS (Azure/Google) apenas das traduções abertas, empacotado/baixável, ou streaming NTLH via Bible Brain (não comercial).
2. **V1.5 (online, licenciado por plataforma):** cadastrar-se no **YouVersion Platform** (gratuito) e verificar com `all_available=true` quais versões pt-BR (NVI/NAA/ARA/NTLH/NVT/A21) estão em fast-track e o texto de cada licença (cache/offline/atribuição/branding). Se houver NVI (Biblica é parceira), oferecer NVI **online** com o SDK/API, aceitando telemetria e possibilidade de revogação. Em paralelo, abrir conta **API.Bible Starter** só para inventariar o catálogo pt-BR (a conta gratuita é "strictly non-commercial" — se o app for tratado como comercial, usar Pro US$ 29+/mês + US$ 10/mês por tradução).
3. **V2 (offline, licenciado por contrato):** negociação direta com **SBB (direitos@sbb.org.br)** para NAA (+NTLH) offline; com **Biblica Brasil** para NVI; e, se a liderança pedir, Mundo Cristão/Tyndale (NVT) e Vida Nova (A21). Levar proposta clara: app fechado, ~3.000 usuários, sem monetização, relatórios de uso, DRM leve (base criptografada, sem exportação), prazo de 2–3 anos, atribuição conforme política. Prever custo (desconhecido publicamente) e 2–6 meses de prazo.

### 9.2 O que o Product Brain precisa decidir
1. **Tradução(ões) prioritária(s) para o público** (hipótese: NVI e NAA/ARA no púlpito da Lagoinha) e se o V1 pode lançar **sem elas**.
2. **Aceitação de tradução aberta como padrão** (ONBV — estilo dinâmico; BLIVRE — Almeida em revisão): validar com a liderança pastoral; definir rotulagem no app.
3. **Disposição de negociar e orçamento** com SBB/Biblica (e eventualmente Tyndale/Vida Nova) e quem assina (igreja como PJ).
4. **Posicionamento "comercial" vs. "ministerial"**: sem anúncios/assinaturas/upsell, com eventual link de doação discreto (API.Bible tolera), para caber nos planos não comerciais. Qualquer monetização futura muda todos os enquadramentos.
5. **Online-only para versões licenciadas é aceitável?** (YouVersion/API.Bible não autorizam empacotamento; API.Bible permite cache ≤ 30 dias.) Se "offline sempre" for requisito inegociável, só a Camada C resolve.
6. **Telemetria/privacidade:** aceitar usage reporting da YouVersion e FUMS da API.Bible (dados anônimos) e o compartilhamento da PII do desenvolvedor com editoras; alinhar com LGPD.
7. **"Sign in with YouVersion"**: opcional; decidir se vale a sincronização de highlights com o app da Bíblia (vantagem para usuários que já usam YouVersion; dependência adicional).
8. **Stack mobile:** se Flutter, não há SDK oficial YouVersion (usar REST); se React Native/Expo, Swift ou Kotlin, há SDKs Apache-2.0.

---

## 10. Perguntas abertas / NÃO VERIFICADO

1. Quais versões pt-BR estão liberadas no **YouVersion Platform** para desenvolvedores (fast-track) e o **texto das licenças por versão** (cache/offline/branding) — exige conta de desenvolvedor.
2. Catálogo pt-BR do **API.Bible** (quais SBB/Biblica/CC estão lá; se TB 2010 consta como PD) — exige login.
3. Filesets de **áudio pt-BR no Bible Brain** (NTLH confirmada em bible.is; ARA/NVI?) e flags de download — exige chave.
4. Custos e prazos de licenciamento direto da **SBB**, **Biblica Brasil**, **Mundo Cristão/Tyndale**, **Vida Nova**, **Abba Press** — nenhum valor público; o contrato SBB de 2015 é PDF escaneado ilegível.
5. Inteiro teor do processo **SBB & Rudi Zimmer × O Rei das Pastas** (TJSP) — site bloqueou; relevante para entender a força do © da ARA 2ª ed. no Judiciário.
6. **Biblica Europe/permissions** ("not licensed for offline… in mobile applications") — página bloqueou fetch; texto obtido por índice de busca.
7. **Existência de material próprio da Lagoinha** para "Bíblia em 100 dias".
8. Proveniência exata do texto digital da **TB no Wikisource** (1917 × 2001/2010) e status jurídico fino da TB (parecer).
9. Licença da **NVA** no próprio site (o CrossWire diz CC BY-SA 4.0; o site fala apenas em "direitos autorais abertos").
10. Discrepância de versão da licença da **Bíblia Livre** (CC BY 3.0 BR × 4.0) — confirmar no LICENSE do repositório.
11. **Áudio ONBV** (existência de gravação CC) — URL indexada retornou 404.
12. **Léxico/dicionário bíblico aberto em pt-BR** — não encontrado.
13. **SBB na DBL / API própria (BibleBooster)** — não verificado.
14. Rate limits numéricos do YouVersion Platform — não publicados.

---

## 11. Fontes (todas acessadas em 2026-09-07)

**YouVersion Platform**
- https://platform.youversion.com/ — "YouVersion Platform · Free Bible APIs and YouVersion login" (produtos, fast-track, SDKs).
- https://platform.youversion.com/terms — "YouVersion Platform Terms of Use", last modified August 17, 2026.
- https://developers.youversion.com/sdks/introduction — lista de SDKs.
- https://developers.youversion.com/quick-reference — base URL, header, endpoints, 429/Retry-After.
- https://developers.youversion.com/api-usage — "Once you've accepted the appropriate license agreements…".
- https://developers.youversion.com/api/licenses — Licenses API (`bible_id`, `developer_id`, `all_available`).
- https://developers.youversion.com/sdks/swift/quick-start — componentes; menção ao guia "Copyright & Attribution".
- https://github.com/youversion — repositórios platform-sdk-swift/kotlin/react/reactnative-expo (Apache-2.0), usfm-references, platform-skills.
- https://github.com/youversion/platform-sdk-swift — README ("maintains a local cache for improved performance").
- https://github.com/youversion/platform-sdk-react — README (Apache 2.0; licenciamento de versões no site do Platform).
- https://www.youversion.com/news/introducing-youversion-platform — anúncio 31/03/2026 (1.487 Bíblias, 36 editoras, 1.283 idiomas; parceiros).
- https://blog.youversion.com/2026/04/introducing-the-youversion-platform/ — post 21/04/2026 (atualizado 03/06/2026).
- https://partner-support.youversion.com/l/en/article/1fpxhlriq1-platform-publish-statuses — Approved/Pending/Revoked/Reported.
- https://partner-support.youversion.com/l/en/article/v9jc7p1ttb-license-management — dados vistos pelas editoras; revogação.
- https://partner-support.youversion.com/l/en/category/t1wszxwgt3-platform — categoria Platform.
- https://help.youversion.com/l/en/article/o8t2xmy9q2-copyright — Copyright FAQ.
- https://www.bible.com/terms — Terms of Use (02/04/2020).
- https://www.bible.com/languages/por — versões pt-BR no app.
- https://www.bible.com/versions/1930 (NVT), /versions/2645 (A21), /versions/211 (NTLH), /versions/1840 (NAA), /versions/129 (NVI), /versions/277 (TB).
- https://www.bible.com/pt/reading-plans/17593-100diasnapalavra-lendo-a-biblia-toda-em-100-dias — plano fornecido pela SBB.
- https://dev.to/arvavit/4-footguns-integrating-youversions-new-platform-api-and-a-clean-verse-of-the-day-2087 — [S] endpoints passages/VOTD.

**API.Bible / ABS / DBL**
- https://api.bible/ — planos e preços; definição de uso comercial.
- https://api.bible/terms-and-conditions — T&C (datas por seção; cache 30 dias; 72 h; FUMS; IA; TTS; atribuição).
- https://docs.api.bible/common-questions/ — FAQ (cache < 500 versículos; 14 dias; planos).
- https://docs.api.bible/guides/fair-use/ — FUMS (tracker JS; apps nativos).
- https://docs.api.bible/resources/legacy-users-faq — migração 02/06/2026; rest.api.bible.
- https://care.api.bible/article/369-understanding-api-bible-licensing — open-access / Standard / Unique.
- https://api.bible/bibles — catálogo (JS; exige login).
- https://api.scripture.api.bible/v1/bibles?language=por — HTTP 401 sem chave.
- https://care.library.bible/article/196-api-bible — DBL ↔ API.Bible (Open vs Controlled access).
- https://care.library.bible/category/112-developers — DBL Developers.
- https://www.tools.bible/tools/digital-bible-library-dbl — descrição da DBL.
- https://get.bible/should-my-app-use-api-bible-or-library-bible/ — comparativo (offline via Library.Bible).

**Bible Brain / FCBH**
- https://www.faithcomesbyhearing.com/bible-brain/developer-documentation — chave, formatos, links de termos.
- https://www.faithcomesbyhearing.com/bible-brain/terms-conditions — T&C (15/04/2021).
- https://www.faithcomesbyhearing.com/bible-brain/license — API License (15/04/2021).
- https://www.faithcomesbyhearing.com/bible-brain/core-concepts — filesets; `/download`.
- https://4.dbt.io/api/bibles?language_code=POR&v=4 — HTTP 422 sem chave.
- https://find.bible/languages/por/ — inventário pt (IDs PORNLH, PORBAR, PORBBS, PORNVT, PORBAS, PORFIE, PORARC, PORTB1…).
- https://find.bible/bibles/PORNLH/ , /PORBAR/ , /PORNVT/ , /PORTB1/ , /PORBNV/ — detalhes (TB "Public Domain (OPEN)"; NVI © 1993, 2000, 2011 Biblica).
- https://live.bible.is/bible/PORNLH/MAT/1 — NTLH com player de áudio.

**SBB**
- https://www.sbb.org.br/acordo-de-licenca-de-usuario-final-eula — EULA (direitos@sbb.org.br).
- https://www.sbb.org.br/artigos/sbb-lanca-novo-aplicativo-biblia-sbb — Bíblia SBB+ (26/05/2026).
- https://www.sbb.org.br/planos-de-leitura/plano-de-leitura-da-biblia-em-1-ano — plano 1 ano.
- https://www.sbb.org.br/planos-de-leitura/plano-de-leitura-da-biblia-em-100-dias — #100diasnaPalavra.
- https://www.sbb.org.br/historia-da-biblia-sagrada/a-biblia-em-portugues/traducao-brasileira — TB 1917/2010.
- https://www.sbb.com.br/faq — FAQ da loja (sem entradas sobre direitos).
- https://www.tuapalavra.com/pt-BR/copyright e https://pesquisa.biblia.com.br/pt-BR/copyright — [S] reprodução da política SBB (500 versículos) e da nota Biblica.
- https://sites.google.com/site/biblialivre/perguntas-e-respostas/direitos-autorais-s%C3%A3o-importantes — [S] relato sobre SWORD/SBB.
- https://noticias.gospelmais.com.br/pastor-apresenta-contrato-sbb-biblia-inclusiva-77870.html e https://media.gospelmais.com/noticias/files/2015/07/CONTRATO-SBB-1.pdf — [S] contrato de cessão 2015 (PDF escaneado).
- https://www.jusbrasil.com.br/jurisprudencia/tj-sp/1499575857/inteiro-teor-1499575859 — [S] SBB & Rudi Zimmer × O Rei das Pastas (bloqueado).

**Biblica / open.bible**
- https://open.bible/ e https://open.bible/bibles/ — hub CC; licenças recomendadas CC BY / CC BY-SA.
- https://preview.open.bible/about — "managed and maintained by Biblica".
- https://open.bible/bibles/portuguese-ebible-text-nt/ — [S] Tradução para Tradutores (NT), 25/07/2023.
- https://ebible.org/find/details.php?id=poronbv — ONBV: © 2007, 2010 Biblica; CC BY-SA 4.0; downloads.
- https://www.bible.com/pt/versions/4272-onbv-biblica-open-nova-b%C3%ADblia-viva — [S] ONBV no YouVersion.
- https://konektacommerce.nyc3.cdn.digitaloceanspaces.com/TEXT_SAMPLE_CONTENT/biblia-comparativa-extra-grande-rc-nvi-degrade-173624-2.pdf — página de copyright ARC (IBB 1944/1978) e NVI (Biblica; política 500 versículos; marcas).
- https://rodrgoncalves.wordpress.com/direitos-autorais-biblia-nvi/ — [S] página de copyright NVI (© 1993, 2000 IBS; crédito; endereço).
- https://www.biblicaeurope.com/permissions/ e https://www.biblica.com/permissions/ — [S] política de permissões (offline em apps não licenciado) — páginas bloquearam fetch.
- https://pt.wikipedia.org/wiki/Nova_Vers%C3%A3o_Internacional — [S] datas (NT 1991, 2001, revisão 2023).

**Mundo Cristão / Vida Nova / Abba Press / SBTB**
- https://www.mundocristao.com.br/wp-content/uploads/2022/04/Bi%CC%81blia-NVT-Letra-Grande.pdf — página de copyright NVT (500 versículos).
- https://institucional.vidanova.com.br/wp-content/uploads/a21_letra_normal_trecho.pdf — página de copyright A21 (citações breves; JUERP/IBB).
- https://abbapress.com.br/contato/ — contato Abba Press; https://apps.apple.com/us/app/king-james-atualizada/id1239469210 — [S] aviso de autorização KJA.
- https://www.biblias.com.br/direitos-autorais — política ACF (1.100 versículos; sbtb@biblias.com.br).

**Textos abertos / DP**
- https://ebible.org/Scriptures/ — IDs por*: porblt, poronbv, por-WBTC, porbr2018, portft, porbrbsl.
- https://ebible.org/find/details.php?id=porbr2018 (Bíblia Livre), =porblt, =portft, =por-WBTC, =porbrbsl.
- https://github.com/blivre/BibliaLivre — formatos; "Creative Commons Attribution License 3.0 Brazil".
- https://sites.google.com/site/biblialivre/ e /perguntas-e-respostas/textos-base — textos-base (1819, ARC 1911, TR Scrivener 1894, Nestle 1904, WLC).
- https://crosswire.org/sword/modules/ModDisp.jsp?modType=Bibles e ModInfo.jsp?modName=PorBLivre / PorAlmeida1911 / PorNVA — módulos e licenças.
- https://www.biblianva.com.br/ e /timeline — NVA ("direitos autorais abertos"; MAST; 2016–2020).
- https://git.door43.org/api/v1/repos/search?q=pt-br&limit=50 — Door43-Catalog/pt-br_blv; ULB/tn/tq pt-br por livro.
- https://www.almeidarecebida.org/ — "domínio público" (2017); https://groups.google.com/g/biblia-livre-comunidade/c/nQhZAex_7JI — "Bíblias não tão livres assim".
- https://pt.wikisource.org/wiki/Tradu%C3%A7%C3%A3o_Brasileira_da_B%C3%ADblia e /Discuss%C3%A3o:Tradu%C3%A7%C3%A3o_Brasileira_da_B%C3%ADblia — transcrição e debate de prazo.
- https://pt.wikisource.org/wiki/Discuss%C3%A3o:Ferreira_de_Almeida_Atualizada — debate ARA/ARC (1911 DP; 1967/1993 protegidas).
- https://pt.wikipedia.org/wiki/Tradu%C3%A7%C3%A3o_Brasileira ; https://pt.wikipedia.org/wiki/Almeida_Revista_e_Corrigida ; https://pt.wikipedia.org/wiki/Almeida_Revista_e_Atualizada — [S] histórico/datas.
- https://www.gutenberg.org/ebooks/62383 — "A Biblia Sagrada… (Portuguese)", Almeida; "Public domain in the USA".
- https://archive.org/details/bibleinbrazilcol00tuck — [S] Tucker, Hugh C. (1857–1956).

**Planos / estudo / áudio / TTS**
- https://www.openbible.info/labs/cross-references/ — CC BY 4.0; ~340.000 refs; base TSK.
- https://www.openbible.info/geo/ — CC BY (crédito OpenBible.info; OSM).
- https://crosswire.org/sword/modules/ModInfo.jsp?modName=TSK (Public Domain) e ?modName=StrongsGreek (Public Domain, 1890).
- https://help.bibleproject.com/hc/en-us/articles/22547623073687-I-m-building-an-app-Can-I-use-your-content-in-it — regras para apps (não armazenar; sem paywall; crédito).
- https://bibleproject.com/terms/ — Terms (May 2024).
- https://www.mcheyne.info/calendar.pdf — [S] M'Cheyne 1842 (DP).
- https://www.cpad.com.br/comentario-biblico-matthew-henry--10658/p — [S] Matthew Henry © 2002 CPAD; Dicionário Strong © 2002 SBB [S].
- https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/ — TTS Neural US$ 15/1 M; 0,5 M grátis.
- https://cloud.google.com/text-to-speech/pricing — Standard/WaveNet US$ 4, Neural2 US$ 16, Chirp 3 HD US$ 30, Studio US$ 160 por 1 M.
- https://elevenlabs.io/pricing — planos e restrição comercial no Free.

**Formatos**
- https://ubsicap.github.io/usfm/ e https://ubsicap.github.io/usfm/identification/books.html — USFM 3.0; códigos de livros.
- https://ubsicap.github.io/usx/ — USX 3.0.
- https://docs.burrito.bible/ — Scripture Burrito 1.0.0.
- https://github.com/Copenhagen-Alliance/versification-specification — versificação (org/eng/lxx/vul/rso/rsc).
- https://www.npmjs.com/package/usfm-grammar ; https://github.com/Bridgeconn/usfm-grammar ; https://www.npmjs.com/package/proskomma — parsers JS.
- https://pub.dev/packages?q=usfm — pacotes Dart (`scripture` CC0; `bible_io` AGPL-3.0; `biblebox_k` MIT).

**Legal**
- https://www2.camara.leg.br/legin/fed/lei/1998/lei-9610-19-fevereiro-1998-365399-normaatualizada-pl.html — Lei 9.610/98 (texto atualizado; arts. 5º, 7º, 8º, 14, 24, 28–30, 41–47, 102–108). (planalto.gov.br não respondeu.)

**Fontes a evitar (verificadas para classificação de risco)**
- https://github.com/omarciovsena/abibliadigital — desativada 01/08/2026; BSD-2.
- https://github.com/thiagobodruk/bible — CC BY-NC no repo; "property of their respective owners".
- https://github.com/Bolls-Bible/bain/blob/master/docs/API.md — sem licença de conteúdo.
- https://github.com/damarals/biblias — [S] 18 Bíblias sem licença dos detentores.
