# Conteúdo bíblico e licenciamento — opções, restrições e estratégia

- **Status:** PROPOSTA (Sprint 0, 2026-09-07). Consolida as frentes C (plataformas, detentores, legal) e C2 (textos abertos).
- **Pesquisa bruta com todas as URLs e datas:** `BIBLE_CONTENT_RESEARCH_RAW.md` (≈130 fontes) e `OPEN_PT_BIBLE_TEXTS.md` (≈90 fontes).
- **Revisão:** os termos do YouVersion Platform, do API.Bible, a EULA da SBB e as licenças da Bíblia Livre e da ONBV foram reverificados nas páginas oficiais em 2026-09-07.
- Classificação: FATO (fonte primária) · EVIDÊNCIA (fonte secundária/reprodução) · INFERÊNCIA · HIPÓTESE · RECOMENDAÇÃO · NÃO VERIFICADO.

**Regra que governa este documento:** "gratuito na internet" ≠ "livre para copiar". Empacotar uma Bíblia inteira em um app é reprodução + armazenamento em base de dados + distribuição (Lei 9.610/98, art. 29, I, VI, VII e IX) e exige licença; a exceção de citação (art. 46, III/VIII) não cobre um app cujo objetivo principal é exibir a Bíblia.

---

## 1. Resumo executivo

**Estratégia recomendada em 3 camadas (RECOMENDAÇÃO):**

| Camada | O quê | Quando | Risco legal |
|---|---|---|---|
| **A — aberto, offline** | Empacotar traduções com licença aberta/domínio público: **Bíblia Livre** (CC BY), **Biblica® Open Nova Bíblia Viva 2007** (CC BY-SA 4.0); opcionais NVA (CC BY-SA 4.0) e Tradução Brasileira 1917 (domínio público, após validar proveniência). Referências cruzadas OpenBible.info (CC BY). Planos com cronograma próprio + devocional original. | V1 | Mínimo |
| **B — licenciado, online** | Traduções protegidas (NVI, NAA, ARA, NTLH, NVT, A21…) via **YouVersion Platform** (grátis; licença por versão, revogável; sem offline documentado) e/ou **API.Bible** (Starter grátis e estritamente não comercial; cache renovável ≤ 30 dias; Pro US$ 29+/mês). | V1.5, após análise jurídica e inventário do catálogo pt-BR | Médio (dependência contratual) |
| **C — licenciado, offline** | Contrato direto com **SBB** (NAA/ARA/NTLH/ARC), **Biblica Brasil** (NVI), Mundo Cristão/Tyndale (NVT), Vida Nova (A21), Abba Press (KJA), SBTB (ACF). Nenhum tem autoatendimento; nenhum preço público. | V2 | Baixo após contrato; prazo 2–6 meses (INFERÊNCIA) |

**Fatos decisivos (verificados em 2026-09-07):**
1. **A NVI em português NÃO é aberta.** © 1993, 2000, 2011 (revisão 2023) Biblica; até 500 versículos sem permissão; política pública da Biblica veda uso offline em apps (EVIDÊNCIA). O que a Biblica abriu em pt-BR foi a **ONBV** (Nova Bíblia Viva 2007) sob CC BY-SA 4.0 — texto de estilo "Bíblia Viva" (equivalência dinâmica/paráfrase), não a NVI.
2. **Os Termos do YouVersion Platform (17/08/2026) não concedem direitos sobre o texto bíblico:** "We are not providing You rights in biblical works or works other than YV IP, which You must obtain from their respective owners and licensors." Cada versão tem licença própria aceita no portal; a editora pode revogar ou "reportar" o app; telemetria obrigatória; PII do desenvolvedor compartilhada com editoras; YouVersion pode cessar ferramentas "at any time, with or without notice"; proibido "replicate or compete with YouVersion". Nenhuma cláusula sobre cache/offline nos termos gerais.
3. **API.Bible:** "All cached content from API.Bible must be updated at least every 30 days"; remoção em 72 h ao encerrar; sublicenciar/distribuir proibido; Starter (US$ 0) "Strictly non-commercial use. No ads, fees, freemium models or upsells allowed", 5.000 chamadas/mês, 3 Bíblias protegidas; Pro US$ 29+/mês (150.000 chamadas); traduções comerciais "starting at $10/mon per translation"; FUMS obrigatório em webapps (tracker JS não cobre apps nativos — endpoint manual); IA/LLM proibido; TTS só para PD/CC.
4. **SBB:** EULA — "Permitido apenas para uso pessoal e não comercial"; "É proibido usar o conteúdo da SBB com fins comerciais sem autorização prévia por escrito. Solicitações devem ser enviadas para direitos@sbb.org.br"; "É vedada a cópia, distribuição ou modificação sem permissão". Sem API pública. App oficial "Bíblia SBB+" (26/05/2026) com offline, áudio e planos.
5. **Textos abertos completos em pt-BR existem** (frente C2, licenças lidas na fonte): Bíblia Livre (CC BY), ONBV (CC BY-SA 4.0), NVA/ULB pt-br (CC BY-SA 4.0), Bíblia Portuguesa Mundial (PD, rascunho), TB 1917 (PD). Nenhum reúne legibilidade NVI/NAA + tradição Almeida + aparato (títulos/notas).

**Riscos principais:** usar fontes "abertas" que hospedam texto protegido (abibliadigital, thiagobodruk/bible, bolls.life…) — violação com risco reputacional para a igreja; dependência de plataforma (revogação/encerramento); "offline ≠ cache"; aceitação pastoral das traduções abertas; TTS/IA sobre texto protegido continua exigindo licença.

---

## 2. Tabela mestre

| Produto/Provedor | Conteúdo pt-BR | Licença | Uso comercial? | Redistribuição/offline? | Caching? | API/SDK? | Atribuição? | Limites | Custo | Riscos | Fonte (2026-09-07) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **YouVersion Platform** | App consumidor tem ARA, ARC, NAA, NTLH, TB, NVI, NBV-P, NVT, A21, BLT, VFL…; quais estão liberadas a devs: NÃO VERIFICADO (exige conta) | Termos YVP 17/08/2026 (ferramentas) + licença por versão no portal | Não vedado pelos termos gerais (apps pagos devem avisar que o Bible App é grátis); cada editora filtra for-profit e pode revogar | Não documentado; SDK faz cache local "for improved performance"; Biblica: sem offline em apps (EVIDÊNCIA) | Sim (SDK) | REST `api.youversion.com/v1` + SDKs Swift/Kotlin/JS/TS/React/**React Native-Expo** (Apache-2.0); sem Flutter | Sim (`copyright_short`; guia de atribuição); marcas YouVersion proibidas | 429 + `Retry-After` (valores não publicados) | Grátis | Encerramento unilateral; revogação por editora; telemetria; PII do dev; cláusula anticompetição; foro Oklahoma | platform.youversion.com/terms; developers.youversion.com |
| **API.Bible (ABS)** | Catálogo pt-BR exige login (NÃO VERIFICADO); indício de TB 2010 (`por-TB10`) | T&C (ToS 03/09/2026; Non-Commercial 12/09/2025; Commercial 21/11/2025) | Starter: não; Pro/Commercial: sim por tradução | Não (sem sublicenciar); cache renovável ≤ 30 dias; remover em 72 h | Sim (≤ 30 dias; FAQ: < 500 versículos consecutivos, refresh ≤ 14 dias) | REST `rest.api.bible`; SDK TS | Sim, formato fixo + link à página de copyright; Starter deve linkar api.bible | 5.000 chamadas/mês (Starter); 150.000 (Pro); US$ 1/1.000 extra | US$ 0 / US$ 29+ / +US$ 10 por tradução | FUMS manual em apps nativos; proibição IA; TTS só PD/CC | api.bible; api.bible/terms-and-conditions; docs.api.bible |
| **Bible Brain / DBP (FCBH)** | Texto: NTLH, NAA, ARA, NVT, A21, ACF, TB, ARC… (find.bible); áudio NTLH em bible.is; filesets de áudio: NÃO VERIFICADO | T&C e License 15/04/2021 | **Não** ("personal, non-commercial use"; app "completely free of charge") | Streaming; offline só filesets marcados em `/download`, "must remain within the application" | Não (exceto `/download`) | REST `4.dbt.io` (chave por formulário) | Sim (avisos FCBH) | Não publicados | Grátis | Terminação a qualquer momento; "Faith Guidelines" | faithcomesbyhearing.com/bible-brain/license |
| **DBL / Library.Bible (UBS)** | Repositório mundial; "Controlled access" por acordo | Negociada com cada detentor | Depende | Sim (USX para offline) mediante licença | n/a | Integração com API.Bible | Depende | Depende | Depende | Processo institucional | care.library.bible |
| **SBB** (ARC, ARA, NAA, NTLH, TB 2010) | Principais Almeidas do Brasil | Proprietária; EULA: pessoal/não comercial | Só com autorização escrita (direitos@sbb.org.br) | Só por contrato | n/a | Nenhuma API pública (NÃO VERIFICADO parceria privada) | Citação até 500 versículos (≤ 50% de um livro; ≤ 25% da publicação) — EVIDÊNCIA (reproduzida por terceiros) | 500 versículos | Não público | Histórico de negar licença a projetos livres (EVIDÊNCIA) | sbb.org.br/acordo-de-licenca-de-usuario-final-eula |
| **Biblica — NVI pt-BR** | NVI (© 1993, 2000, 2011; rev. 2023) | Proprietária | > 500 versículos: permissão escrita (comercial: Editora Vida; não comercial: Biblica Brasil) | Política Biblica: "not licensed for offline / downloadable use as part of mobile applications" (EVIDÊNCIA) | — | Via YouVersion Platform (Biblica é parceira de lançamento) ou API.Bible (NÃO VERIFICADO) | Crédito fixo; "NVI" ao fim das citações | 500 versículos | Não público | Marca "NVI" registrada | Página de copyright (PDF Geográfica) |
| **Biblica — ONBV** | Bíblia completa (66) | **CC BY-SA 4.0**; © 2007, 2010 Biblica | Sim | **Sim** (não alterar; manter título; marca Biblica® só na atribuição) | Sim | USFM/USFX/SWORD/ePub no eBible.org (`poronbv`) | Sim | — | Grátis | Estilo paráfrase; share-alike sobre o texto (não sobre o app) | ebible.org/find/details.php?id=poronbv |
| **Mundo Cristão / Tyndale — NVT** | NVT (© 2016; direitos atribuídos à Tyndale House Foundation em 2021) | Proprietária | > 500 versículos: permissão escrita | Só por contrato | — | Via YouVersion (consumidor); FCBH texto | Sim | 500 versículos (≤ 25% da obra) | Não público | Titular nos EUA | PDF NVT (mundocristao.com.br) |
| **Vida Nova — A21** | Almeida Século 21 | Proprietária (deriva da "Melhores Textos", JUERP/IBB) | Só com autorização | "Proibida a reprodução… a não ser em citações breves" | — | Via YouVersion (consumidor); FCHB texto | Sim | Apenas citações breves | Não público | Cadeia de direitos com JUERP | PDF A21 (vidanova.com.br) |
| **Abba Press — KJA** | King James Atualizada (© 2001) | Proprietária | Só com autorização | Autorizações app a app (EVIDÊNCIA) | — | Nenhuma | Sim | NÃO VERIFICADO | Não público | Sem página de licenciamento | abbapress.com.br/contato |
| **SBTB — ACF** | Almeida Corrigida Fiel (© 1994–2011) | Proprietária | > 1.100 versículos: autorização escrita (sbtb@biblias.com.br) | Só por contrato | — | Nenhuma | Crédito fixo | 1.100 versículos | Não público | — | biblias.com.br/direitos-autorais |
| **Bíblia Livre (BLIVRE)** | Bíblia completa (66); Almeida 1819/1911 atualizada; NT TR (Scrivener 1894) ou Nestle 1904; AT WLC | **CC BY** (3.0 BR no repositório oficial; eBible diz "4.0") | Sim | **Sim** | Sim | USFM, OSIS, VPL, SWORD, ePub (GitHub `blivre/BibliaLivre`; eBible `porbr2018`) | Sim ("Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles") | — | Grátis | "Trabalho em andamento"; divergência de versão da licença; sem títulos/notas | github.com/blivre/BibliaLivre; ebible.org porbr2018 |
| **NVA / pt-br ULB (Door43)** | Bíblia completa (66), literal | **CC BY-SA 4.0** | Sim | Sim | Sim | USFM (git.door43.org `pt-br_ulb` v6.9); SWORD PorNVA | Sim ("Door43 World Missions Community"; "Original work available at https://door43.org/") | — | Grátis | Manutenção parada (2019); maiúsculas reverenciais; sem títulos/notas | git.door43.org/Door43-Catalog/pt-br_ulb |
| **Bíblia Portuguesa Mundial** | 66 + deuterocanônicos (filtrar) | Domínio público; "rascunho… ainda em revisão" | Sim | Sim | Sim | eBible `porbrbsl` | Recomendada | — | Grátis | Sem tradutor creditado; muda semanalmente | ebible.org/find/details.php?id=porbrbsl |
| **Tradução Brasileira 1917** | Bíblia completa | Domínio público (obra de 1917); **edição SBB 2010 é reivindicada** | Sim | Sim | Sim | Wikisource (transcrição de 2ª mão, 2009); sem USFM oficial | Recomendada | — | Grátis | Linguagem datada ("Jeová"); proveniência da transcrição a validar; cenário remoto de coautoria até 01/01/2027 (parecer) | pt.wikisource.org |
| **OpenBible.info** | ~340.000 referências cruzadas; geodata | **CC BY 4.0** / CC BY | Sim | Sim | Sim | ZIP/CSV/KML | Sim | — | Grátis | Referências neutras (IDs de versículo) | openbible.info/labs/cross-references |
| **BibleProject (vídeos pt-BR)** | Séries em português | Licença própria, não comercial | Não | **Não armazenar**; só embed/links | Não | Embed | Crédito fixo | — | Grátis | Dependência do YouTube | help.bibleproject.com |

---

## 3. Plataformas e APIs — detalhes que importam para a arquitetura

### 3.1 YouVersion Platform (lançado 31/03/2026; termos de 17/08/2026) — FATO
- Produtos: Bible SDK (leitor embutido), API REST (`/bibles`, `/books`, `/chapters`, `/verses`, `/passages`; códigos USFM), Sign in with YouVersion (opcional), User Insights, Fast-track Licensing (`GET /v1/licenses` devolve o HTML do contrato por versão). SDKs Apache-2.0 para Swift, Kotlin, JS/TS, React e **React Native (Expo)**; **não há SDK Flutter**.
- Cláusulas verificadas: nenhum direito sobre o texto bíblico; "You shall enable and maintain any usage reporting mechanisms"; PII do desenvolvedor compartilhada com editoras "to ensure that You meet and maintain the standards by the third-party license"; YouVersion pode cessar "any or all YV IP… at any time, with or without notice"; proibido "create or provide services that replicate or compete with YouVersion"; marcas só com permissão; IA: proibido chat aberto e treino.
- Controle das editoras (suporte a parceiros): status Approved/Pending/**Revoked**/**Reported** ("permanently lose access"); motivos citados: "commercial use violation, faith misalignment, misuse, agreement violation".
- Implicação (INFERÊNCIA): viável como **fonte online complementar** para NVI/NAA etc. se as editoras tiverem aderido para pt-BR (NÃO VERIFICADO até criar conta). Não serve como base offline. A cláusula "replicate or compete" exige parecer jurídico antes de depender do SDK para a experiência central de leitura.

### 3.2 API.Bible (American Bible Society) — FATO
- Planos: Starter US$ 0 (5.000 chamadas/mês, 3 Bíblias protegidas, estritamente não comercial — "No ads, fees, freemium models or upsells"); Pro US$ 29+/mês (150.000 chamadas; US$ 1/1.000 extra); traduções comerciais desde US$ 10/mês cada; Enterprise > 100 mil usuários/mês.
- Cache: renovar a cada 30 dias (FAQ: < 500 versículos consecutivos, ≤ 14 dias); remover em 72 h ao encerrar; sem sublicenciar/distribuir; TTS só PD/CC e efêmero (um capítulo por vez); IA/LLM proibido; atribuição em formato fixo; FUMS obrigatório em webapps (em apps nativos: chamada manual ao endpoint — confirmar com support@api.bible).
- Implicação: modelo "offline temporário" (cache renovável) é possível só aqui; catálogo pt-BR exige login (NÃO VERIFICADO quais SBB/Biblica constam).

### 3.3 Bible Brain (Faith Comes By Hearing) — FATO
- Uso pessoal e não comercial; app deve ser gratuito; streaming; download só de filesets marcados. NTLH com áudio em bible.is. Opção legítima para **áudio em streaming** num app gratuito; inadequado para texto offline.

---

## 4. Detentores de direitos no Brasil — como licenciar

| Detentor | Traduções | Canal | Cota gratuita | Observações |
|---|---|---|---|---|
| SBB | ARC (1969/1995/2009), ARA (1959/1993), NAA (2017), NTLH (2000), TB 2010 | direitos@sbb.org.br (autorização por escrito) | 500 versículos (EVIDÊNCIA) | Sem API; app próprio SBB+; membro das Sociedades Bíblicas Unidas (DBL provável, NÃO VERIFICADO) |
| Biblica | NVI pt-BR | Biblica Brasil (não comercial) / Editora Vida (comercial) | 500 versículos | Parceira de lançamento do YouVersion Platform; ONBV é aberta |
| Mundo Cristão / Tyndale | NVT | Contato geral; titular nos EUA | 500 versículos | Negociação pode ser internacional |
| Vida Nova | A21 | vidanova@vidanova.com.br | Só citações breves | Direitos derivados da JUERP/IBB |
| Abba Press | KJA | webmaster@abbapress.com.br | NÃO VERIFICADO | Autoriza app a app (EVIDÊNCIA) |
| SBTB | ACF | sbtb@biblias.com.br | 1.100 versículos | Política vigente desde 25/11/2025 |

Proposta recomendada para a carta institucional (RECOMENDAÇÃO): app fechado de uma igreja (pessoa jurídica sem fins lucrativos), ~3.000 usuários, sem monetização, uso offline, relatórios de uso, prazo de 2–3 anos, atribuição conforme política, contêiner cifrado só para textos licenciados (os abertos não podem ter DRM).

---

## 5. Textos abertos / domínio público — o que pode ir para o app hoje

| Texto | Licença exata | Atribuição (texto sugerido) | Aptidão | Cuidados |
|---|---|---|---|---|
| **Bíblia Livre** | CC BY 3.0 BR (LICENCA.md do repositório); eBible: CC BY 4.0 | "Todas as Escrituras citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles. Licença Creative Commons Atribuição (creativecommons.org/licenses/by/3.0/br/). Versão/fonte: [data]." | **Padrão provisório** (fraseado Almeida) | Confirmar versão canônica (GitHub 2018.2.0 vs fontes eBible 2025-12-12) e a versão da licença; sem títulos de seção/notas |
| **ONBV** | CC BY-SA 4.0; não alterar; manter título | "Biblica® Open Nova Bíblia Viva™. Copyright © 2007, 2010 by Biblica, Inc. Usada sob licença CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0). 'Biblica' é marca registrada de Biblica, Inc. Obra original disponível gratuitamente em www.biblica.com e open.bible. Texto não modificado." | **"Leitura fácil"** (paráfrase/dinâmica) | Nunca editar o texto; notas de rodapé presentes (parser `\f`) |
| **NVA / ULB pt-br** | CC BY-SA 4.0 | "Bíblia NVA – Nova Versão de Acesso Livre (Brazilian Portuguese Unlocked Literal Bible v6.9, 2019), Door43 World Missions Community. CC BY-SA 4.0. Original work available at https://door43.org/." | Fallback (literal) | Só o texto (não as notas); versificação "ufw" |
| **Bíblia Portuguesa Mundial** | Domínio público | "eBible.org — Bíblia Portuguesa Mundial (rascunho)" | Fallback com reserva | Fixar snapshot; filtrar deuterocanônicos; pedir método ao eBible |
| **Tradução Brasileira 1917** | Domínio público | "Tradução Brasileira (1917), domínio público; transcrição: Wikisource" | Fallback | Cotejo amostral com fac-símile de 1917; **nunca** o arquivo SBB 2010; parecer de 1 página sobre coautoria (Tucker † 1956) |
| BLT (NT), T4T (NT), Almeida 1819/1911 | CC BY-SA 4.0 / PD | — | Não usar como leitura (incompletos, arcaicos ou ferramenta de tradutor) | — |

**Implicações das licenças CC para o app (FATO — textos legais CC):**
- Empacotar sem alterar **não** cria obra derivada ("Simply including an SA work unmodified… does not produce an adaptation") → o app não precisa ser open source; o texto continua CC BY-SA; tela de licenças obrigatória; usuário pode extrair o texto.
- Cláusula anti-medidas tecnológicas (CC BY-SA 4.0 §2(a)(5)(C); CC BY 3.0 BR §4(a)): **não cifrar** o banco de textos abertos de forma que impeça extração. Textos licenciados por contrato podem ficar em contêiner separado.
- Alterar o texto (corrigir, modernizar) → derivado sob a mesma licença; no caso da ONBV, perde-se o título/marca. Títulos de seção e planos ficam em tabelas separadas ligadas por referência — não alteram o texto.
- CC BY e CC BY-SA permitem uso comercial; só **NC** seria problema (nenhum dos textos utilizáveis é NC).

---

## 6. Planos de leitura

- **Base legal (FATO, Lei 9.610/98 art. 8º):** não são protegidos "esquemas, planos ou regras para realizar atos mentais" nem "calendários, agendas". Um **cronograma de capítulos** (ex.: 12 capítulos/dia por 100 dias) é esquema não protegido; a **compilação concreta com devocionais, títulos e reflexões** de um plano (SBB, YouVersion, BibleProject) é obra protegida (art. 7º, XIII).
- **Existentes:** SBB "Bíblia em 1 ano" (5 capítulos aos domingos, 3 nos demais) e "#100diasnaPalavra" — protegidos como compilação; planos do YouVersion — termos permitem só uso pessoal/interno e a API do Platform não expõe planos (não exportáveis); M'Cheyne (1842) — domínio público; material próprio da Lagoinha — NÃO VERIFICADO (perguntar internamente).
- **RECOMENDAÇÃO:** gerar cronogramas por algoritmo (1.189 capítulos; variantes canônica/cronológica/AT+NT intercalados/"pular domingos") e usar **devocional original** da equipe pastoral. Não copiar episódios da SBB nem planos do YouVersion.

## 7. Conteúdo de estudo e áudio

- **Seguro para V1:** referências cruzadas OpenBible.info (CC BY 4.0; ~340 mil, base Treasury of Scripture Knowledge, domínio público); geodata OpenBible (CC BY); Strong's (PD, inglês); notas/introduções escritas pela equipe; Door43 pt-br translationNotes onde existir (CC BY-SA, parcial); vídeos BibleProject só por embed com crédito (não armazenar; sem paywall).
- **Não usar sem licença:** Dicionário Bíblico Strong (SBB © 2002), Comentário Matthew Henry em português (CPAD © 2002 — a tradução é protegida), Bíblias de Estudo.
- **Áudio:** Bible Brain (NTLH em streaming, não comercial, app gratuito); YouVersion (áudio no app consumidor; via Platform NÃO VERIFICADO); SBB (só no app próprio); ONBV em áudio (NÃO VERIFICADO). **TTS** (Azure Neural US$ 15/1 M caracteres; Google Neural2 US$ 16/1 M; Bíblia ≈ 4,3–4,6 M caracteres → ≈ US$ 65–135 uma vez, INFERÊNCIA) é permitido **apenas** para textos abertos (ONBV/BLIVRE/TB); TTS de texto protegido continua exigindo licença do texto; API.Bible limita TTS a PD/CC e efêmero.

## 8. Formatos e pipeline (resumo; detalhe em `../technical/ARCHITECTURE_V0.md` §4.4)

USFM 3.0 (códigos de livro de 3 letras GEN…REV; `\c`, `\v`, `\p`, `\q`, `\s`, `\f`), USX 3.0, Scripture Burrito; versificação Copenhagen Alliance (`org.vrs`, `eng.vrs`…). Parsers JS: `usfm-grammar` (Bridgeconn), `usfm-js` (unfoldingWord), `proskomma`. Pipeline em build time: USFM → USJ → normalização → SQLite (FTS5 `unicode61 remove_diacritics 2`) + `manifest.json` com licença/atribuição/hash → asset ou download sob demanda. Testes de versificação em Sl 3–9, Jl 3, Ml 4, 3Jo 15, Ap 12:18.

---

## 9. Base legal brasileira e fontes a evitar

**Lei 9.610/98 (FATO, texto atualizado na Câmara):** art. 7º XI (traduções/adaptações são obras protegidas) e XIII (compilações); art. 8º (ideias, esquemas, calendários não protegidos); art. 14 (quem adapta obra em domínio público é titular da adaptação, mas não pode se opor a outra adaptação "salvo se for cópia da sua"); art. 24 IV (integridade da obra); art. 29 I/VI/VII/IX (reprodução, distribuição, disponibilização e **inclusão em base de dados/armazenamento** dependem de autorização); art. 41–43 (70 anos; obras coletivas/anônimas: 70 anos da publicação); art. 46 III/VIII (citação e pequenos trechos — não cobre Bíblia integral); arts. 102–105 (apreensão, indenização — "três mil exemplares" quando desconhecido o número, multa diária).

**Aplicação:** ARC 1898/1911 → domínio público; ARC 1969/1995/2009, ARA, NAA, NTLH, TB 2010 (SBB), NVI, NVT, A21, KJA, ACF → protegidas (nenhuma cai em domínio público antes de 2040). "Almeida Recebida" e "Ferreira de Almeida Atualizada" (Wikisource/Unbound) → derivação apontada da "Revisada Segundo os Melhores Textos" (JUERP 1967) → **não usar**.

**Lista de bloqueio do pipeline (nunca ingerir):**

| Fonte | Por quê |
|---|---|
| abibliadigital.com.br (API) | Desativada em 01/08/2026; texto sem licença dos detentores |
| github.com/thiagobodruk/bible (NVI/ACF/AA) | README: "property of their respective owners"; CC BY-NC do repositório não licencia o que o autor não possui |
| bolls.life | Sem declaração de licença de conteúdo |
| github.com/damarals/biblias e compilações Zefania/SQLite similares | Textos SBB/Biblica/SBTB sem licença |
| PDFs de NVT/NVI/Strong/Matthew Henry em sites de compartilhamento | Cópias piratas |
| almeidarecebida.org; Wikisource "Ferreira de Almeida Atualizada" | Derivação de texto JUERP 1967 |
| Módulos MySword/e-Sword/theWord não oficiais com NVI/ARA/NTLH | Não licenciados (a SBB negou ao projeto SWORD) |
| Raspagem de bible.com / biblia.sbb.org.br / clientes não oficiais do YouVersion | Viola termos e direitos |

Classificação de risco: **alto** (jurídico + reputacional + remoção das lojas por reclamação de titular).

---

## 10. Recomendação final e decisões do Product Brain

**Plano (RECOMENDAÇÃO):**
1. **V1:** Bíblia Livre (padrão provisório) + ONBV ("leitura fácil"), opcionalmente NVA/TB 1917 após validação; tela de licenças com atribuições exatas; referências cruzadas OpenBible; cronogramas próprios + devocional original; sem DRM nos textos abertos. Contatar mantenedores da Bíblia Livre para confirmar versão/licença.
2. **V1.5:** criar conta no YouVersion Platform e no API.Bible Starter só para **inventariar** o catálogo pt-BR e ler as licenças por versão; decidir com parecer jurídico se a cláusula "replicate or compete" e a revogabilidade são aceitáveis; se sim, oferecer NVI/NAA **online** como provedor adicional atrás do `BibleTextProvider`.
3. **V2:** carta institucional à SBB (NAA + NTLH) e à Biblica Brasil (NVI) para uso offline; prever 2–6 meses e custo desconhecido.

**Decisões que só o Product Brain pode tomar:**
1. Quais traduções o público exige e se V1 pode lançar sem elas (rotuladas como provisórias).
2. Aceitação pastoral de Bíblia Livre/ONBV como padrão (validar com a liderança).
3. Disposição, orçamento e entidade signatária para licenciar SBB/Biblica.
4. Posicionamento "ministerial" sem monetização (mantém elegibilidade a planos não comerciais); qualquer monetização futura muda todos os enquadramentos.
5. Se "online-only" para traduções licenciadas é aceitável.
6. Aceitação de telemetria/FUMS e do compartilhamento de PII do desenvolvedor com editoras (alinhar com LGPD).
7. Se "Sign in with YouVersion" agrega valor (sincronizar destaques com o Bible App) ou só dependência.

**NÃO VERIFICADO (exige conta ou contato):** versões pt-BR liberadas no YouVersion Platform e texto das licenças por versão; catálogo pt-BR do API.Bible; filesets de áudio pt-BR no Bible Brain; custos/prazos de SBB, Biblica, Tyndale, Vida Nova, Abba Press; proveniência do texto digital da TB (1917 vs 2001/2010); versão canônica atual da Bíblia Livre; existência de material próprio da Lagoinha para "100 dias".
