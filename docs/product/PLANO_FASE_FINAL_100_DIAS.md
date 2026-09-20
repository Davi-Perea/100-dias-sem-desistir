# Plano da fase final — "100 Dias" (23/09 a 31/12/2026)

- **Data:** 2026-09-19 (sábado). **Dia 1 da campanha: quarta-feira, 23/09/2026 — em 4 dias.**
- **Natureza deste documento:** PLANEJAMENTO, aprovado por Davi em 2026-09-19 ("vamos por etapas").
  **Execução 03 (conteúdo real) construída no mesmo dia** — ver `docs/technical/EXECUTION_03_CONTEUDO_REAL.md`.
  As demais execuções continuam por fazer.
- **Autor:** Claude (Principal Mobile Engineer). **Revisão esperada:** Davi (fundador) e Product Brain.
- **Material de entrada:** três `.docx` recebidos em 19/09, todos criados por "LEANDRA PEDROSO" em 28/08/2026
  (metadados do Word). O texto integral está no scratchpad desta sessão; nada foi copiado para o repositório.

---

## 0. Resumo em dez linhas

1. O material é **o conteúdo real do app**: um guia diário de 100 dias, próprio da igreja, com leitura da Bíblia
   inteira (1.189 capítulos, 11–12 por dia) mais uma direção de intercessão por dia. Ele **substitui** o plano 42360
   do YouVersion como fonte canônica. O Gate 2 muda de natureza: deixa de ser "autorização de terceiro" e vira
   "autorização escrita da própria igreja".
2. A auditoria automática do material passou em tudo: 100 dias, datas contínuas, cobertura exata da Bíblia sem
   lacuna nem repetição, rotação dos 7 montes sem quebra, guia e escala idênticos, todo versículo-base dentro da
   leitura do dia. **Está pronto para virar dataset.**
3. Dos três documentos, **só o guia entra no app como conteúdo**. A escala entra como **dado** (quem conduz o altar
   de hoje; "meu ministério"). A orientação aos líderes é **comunicação** (WhatsApp/PDF) e serve de fonte para a
   página "Sobre o propósito" e para a estrutura da tela de intercessão.
4. **Não existe app para líderes.** O que o líder precisa (conduzir o altar das 12h30 com a direção do dia; saber os
   dias do seu ministério) cabe em duas funções pequenas do mesmo app: "Modo altar" e "Meu ministério".
5. **O app não estará nas lojas em 23/09.** Isso não é uma escolha: contas de desenvolvedor (D-U-N-S), entidade
   jurídica, política de privacidade e revisão das lojas levam semanas e nada disso começou. A campanha começa
   com o material em papel/WhatsApp e o **app entra em andamento**, exatamente o cenário de "entrada tardia" para
   o qual o produto já foi construído. Janela realista de loja: **Dia 15 a Dia 30 (7 a 22/10)**, condicionada ao que
   está na seção 4.
6. **Recomendação forte: primeira versão sem conta.** Tudo o que a pessoa precisa nos 100 dias (leitura, direção,
   progresso, reflexão, lembretes, altar de hoje, meu ministério) funciona local. Conta, grupos e progresso
   coletivo entram numa segunda atualização, depois de provar a RLS num banco real. Isso encurta o caminho até a
   loja em semanas e tira dado sensível do servidor no lançamento.
7. **Texto bíblico:** o guia só traz referências, nunca o texto. O leitor sai com uma tradução aberta empacotada
   (ONBV ou Bíblia Livre) + link "Abrir no YouVersion" para quem lê NVI/NAA + "Li na minha Bíblia". Nenhuma NVI
   embarcada sem licença.
8. **Risco de produto número um: 12 capítulos por dia.** São ~30–40 minutos de leitura diária. O app precisa ser
   honesto com esse número e oferecer saídas: leitura em partes, retomada por capítulo e, se aprovado, áudio.
9. O spec assumiu um "propósito de jejum". O material da igreja fala em consagração, oração, Palavra e adoração,
   **não em jejum**. Confirmar antes de manter o passo no onboarding.
10. Para os líderes, entregar quatro coisas: uma página "o que o app é e quando chega", prints das telas, o
    cronograma com o que depende deles, e um grupo beta de 20–50 líderes que instala antes de todo mundo.

---

## 1. Os três documentos: qual é para quê

| Documento | O que é | Para quem | Destino | Entra no app? |
|---|---|---|---|---|
| **100 Dias — Guia Diário de Intercessão** (23/09–31/12/2026; "Palavra • Consagração • Adoração • Intercessão") | Tabela de 100 linhas: Dia/Data · Monte · Leitura · Versículo-base · Ênfase · Motivos de oração. Quatro blocos de 25 dias. | Toda a igreja (uso individual diário) e o ministério que conduz o altar | **É o conteúdo do app.** Vira o dataset da jornada. | **Sim — integral.** É a fonte editorial canônica. |
| **ESCALA — 100 Dias** | Tabela de 100 linhas: Dia · Data · Ministério · Líderes · Monte · Leitura. 39 ministérios; Intercessão/Bálsamo conduz 24 dias (a cada ~4), os outros 38 conduzem 2 dias cada. | Coordenação e líderes | **WhatsApp/PDF** para gestão. | **Sim — como dado**, não como tela de gestão: "Altar das 12h30 hoje: Kids" no Início e "Meu ministério" em Você. Nomes de líderes só com autorização (seção 5). |
| **ORIENTAÇÃO AOS LÍDERES DE MINISTÉRIOS** | Carta: propósito, altar presencial diário às 12h30 com Sala de Adoração e Sala de Intercessão, leitura individual em casa, 7 áreas de influência em rotação, toda reunião começa pelo arrependimento, fluxo em 5 passos, responsabilidades do líder, "cultura de altar". | Líderes de ministério | **WhatsApp/PDF.** É comunicação, não software. | **Indiretamente.** Dá (a) a estrutura da tela de intercessão do dia (os 5 passos), (b) o texto da página "Sobre o propósito", (c) princípios de cópia ("a escala define quem conduz; o altar pertence a todos"). |

### 1.1 O que o guia é, em números (FATO — medido no arquivo)

| Medida | Valor |
|---|---|
| Dias | 100, de 23/09 a 31/12/2026, datas contínuas |
| Capítulos cobertos | **1.189 de 1.189**, cada um exatamente uma vez, de Gênesis 1 a Apocalipse 22, em ordem canônica |
| Capítulos por dia | 11 em 11 dias, 12 em 89 dias (média 11,9) |
| Montes | 7, em rotação fixa: Igreja → Família → Educação → Governo → Economia → Mídia e Comunicação → Artes e Entretenimento (dia 1 = Igreja; dia 100 = Família) |
| Versículo-base | sempre dentro da leitura do próprio dia (100/100) |
| Texto editorial por dia | ênfase + motivos: 85 a 165 caracteres. Curto, estruturado, sem devocional longo |
| Guia × Escala | 0 divergências de monte ou leitura |

Consequências:
- O dataset já existente (`JourneyDay`: `theme`, `key_verse_reference`, `readings`, `prayer_focus`) recebe o guia
  quase sem mudança de contrato. Faltam dois campos: **`monte`** e **`escala`** (ministério e líderes do dia).
- Não há texto bíblico no material — só referências. Portanto o material **não cria** problema de licença de
  tradução; a licença continua sendo o Gate 1, independente.
- O cronograma de capítulos é esquema não protegido (Lei 9.610/98, art. 8º) e, de todo modo, o material é da
  própria igreja. A ênfase e os motivos são texto original da igreja: **precisam de autorização escrita**, que é
  trivial de obter, mas precisa existir (uma mensagem da liderança do ministério basta como `rights_reference`).

### 1.2 O que o material muda no que já está construído

| Suposição anterior | Realidade do material | Efeito |
|---|---|---|
| Fonte canônica = plano 42360 (YouVersion, Alcance Curitiba) | Fonte = guia próprio da igreja | `CANONICAL_SOURCE_TARGET` fica superado; `provenance.source_type = 'original_church_content'`. Gate 2 vira autorização interna. Atualizar CLAUDE.md e V1_BUILD_STATUS. |
| "7 capítulos · ~18 min" (handoff) | 11–12 capítulos · ~30–40 min | Cópia e expectativa precisam ser honestas; ver seção 3.4. |
| "Propósito de jejum" (spec §5) | Não aparece no material | Confirmar. Se não existe, o passo sai do onboarding e a linha some do Início. |
| Comunidade = grupos genéricos | Comunidade real = 39 ministérios com dias no altar | "Meu ministério" é seleção local, sem conta; grupos com conta ficam para depois. |
| Data de início desconhecida | 23/09/2026 | Fase `before_start` dura 4 dias; o app chega em `running`. |

---

## 2. O que o app se torna

**Frase para os líderes:** o app é o lugar onde cada pessoa faz a parte individual dos 100 dias — a leitura do dia e a
direção de intercessão — e enxerga a igreja inteira caminhando junto: qual monte é hoje, qual ministério conduz o altar
das 12h30, e onde ela está no caminho de Gênesis a Apocalipse.

**O que ele não é:** não substitui o altar presencial; não é rede social; não tem ranking, sequência ou culpa; não
publica o que a pessoa escreve; não exige conta.

### 2.1 A unidade do produto: o Dia

Cada dia tem exatamente estas peças, todas vindas do guia:

1. **Dia N de 100** e a data.
2. **Monte** (uma das 7 áreas) — o "assunto" do dia para a igreja inteira.
3. **Leitura** — 11–12 capítulos, com contagem e tempo honestos.
4. **Versículo-base** — sempre de dentro da leitura.
5. **Ênfase** — a frase-tema (é o título com realce amarelo do handoff).
6. **Motivos de oração** — lista curta.
7. **Altar das 12h30** — qual ministério conduz hoje (da escala).

### 2.2 Telas, mapeadas no design já implementado

| Tela (handoff) | O que muda com o material real |
|---|---|
| **Início** | Cabeça igual. Entra a pílula do **Monte** sobre o título; o título passa a ser a **Ênfase**; a leitura mostra "Gênesis 37–48 · 12 capítulos · ~40 min"; entra o **Versículo-base** e os **Motivos** (lista curta, não cartão); entra a linha "Altar das 12h30 · hoje conduz: Kids". A linha "1.812 pessoas já leram" continua sem número até existir agregação. |
| **Dia (05b)** | Os três blocos viram: **Leitura bíblica** · **Intercessão do dia** (novo) · **Reflexão**. Jejum só se confirmado. |
| **Intercessão do dia** (nova, deriva da 05b) | O guia do dia no **fluxo dos 5 passos** da orientação: arrependimento pessoal → arrependimento congregacional → Palavra-base → intercessão pelo monte (motivos) → adoração e entrega. Com **"Modo altar"**: tela cheia, tipo grande, passo a passo, tela não apaga. Serve em casa e serve ao ministério que conduz o altar. |
| **Leitor** | Texto de uma tradução aberta (seção 3.3) + "Abrir no YouVersion" + "Li na minha Bíblia". Progresso por capítulo dentro do dia ("faltam 5 capítulos"). |
| **Jornada** | Igual, com o monte de cada dia na nota e os dias do meu ministério destacados. |
| **Juntos** | Sem conta na V1: "Altar de hoje" (ministério + líderes autorizados), "Sobre o propósito" (texto da orientação), e a explicação honesta de que progresso coletivo e insights vêm na próxima atualização. |
| **Você** | Entra **Meu ministério** (seleção local entre os 39) com "seus dias no altar" e lembrete no dia anterior. Jejum só se confirmado. |
| **Marcos** | Mantidos (7/25/50/75/100). O Dia 100 cai em **31/12**: a tela de chegada usa o versículo-base do próprio dia, Ap 21:5 ("Eis que faço novas todas as coisas"), que é literalmente o encerramento do guia. |
| **Sobre o propósito** (nova, em Ajuda) | Trechos da orientação: 12h30, duas salas, por que o versículo muda, por que o monte repete, "o altar pertence a todos". Com autorização da igreja. |

### 2.3 Líderes: sem app separado

Concordo com a direção do Davi, com razão técnica além da preferência: o líder não precisa de outra tela, precisa
de **duas funções no mesmo app**:

- **Modo altar** — o guia do dia em formato de condução (5 passos, tipo grande, tela acesa). Quem conduz o altar às
  12h30 abre o mesmo dia que todo mundo abre.
- **Meu ministério** — escolha local; mostra os dois (ou 24) dias do ministério, destaca na Jornada e lembra no dia
  anterior. Zero backend, zero conta, zero papel privilegiado.

O resto (mobilizar equipe, escala, orientação) é WhatsApp e PDF, como o Davi disse. A escala e a orientação já
existem em formato pronto para isso.

---

## 3. Problemas que afetam produto (formato obrigatório)

### 3.1 PROBLEMA: o app não estará nas lojas no Dia 1

**EVIDÊNCIA**
- Dia 1 = 23/09/2026; hoje é 19/09 (FATO, material + calendário).
- Não existem contas de desenvolvedor, `eas.json`, identificadores de app nem entidade decidida: `app.json` ainda é o
  do spike ("Leitura Bíblica (spike)", scheme `biblespike`, sem bundle id) (FATO, repositório).
- Apple Developer Program como Organização exige D-U-N-S, site e e-mail corporativo; nossa própria pesquisa planeja
  2–6 semanas (`MOBILE_STORE_REQUIREMENTS.md`, verificado 2026-09-07). TestFlight exige a mesma conta (FATO).
- Google Play: conta de Organização também exige D-U-N-S; **Android Developer Verification passa a bloquear no
  Brasil em 30/09/2026** apps de desenvolvedores não verificados (FATO, doc verificado 2026-09-07). Pelo anúncio do
  Google, a regra vale para instalação em aparelhos certificados independentemente do canal, o que fecha também a
  saída "manda o APK no WhatsApp" a partir de 30/09 (EVIDÊNCIA; reverificar antes de contar com APK).
- Apple declara revisar a maioria das submissões em menos de 24 h (EVIDÊNCIA — página pública da Apple; primeira
  submissão costuma receber ao menos uma rejeição). Play sem SLA público; contas novas levam dias (INFERÊNCIA).
- Política de privacidade, página "Para pais", exclusão de conta por web e contato de suporte são obrigatórios nas
  duas lojas e não existem (FATO).

**IMPACTO**
Se a liderança anunciar "baixem o app" no dia 23, a igreja procura algo que não existe. Isso queima a confiança no
próprio Dia 1, o momento de maior atenção. Por outro lado, o produto **já foi construído para entrada tardia**: dias
passados ficam abertos, sem culpa, com a tela "Que bom ter você de volta".

**ALTERNATIVAS**
- (a) Tentar entregar tudo até 23/09 — inviável pelas contas, não por código.
- (b) Começar a campanha com o guia em papel/WhatsApp e o altar das 12h30; o app entra em andamento, com data
  realista anunciada como "em outubro", e cada pessoa entra no dia em que a igreja estiver.
- (c) Ponte web nas primeiras semanas (o mesmo código já exporta para web). Contra: progresso preso no navegador
  sem conta para migrar; foge da regra "mobile real"; cria um segundo produto para sustentar. Só faria sentido como
  página estática do "guia do dia", sem progresso.
- (d) Publicar o plano também no YouVersion Connect — 14 dias de revisão, recomendam 4 semanas; não chega no dia 23
  e compete com a adoção do nosso app.

**RECOMENDAÇÃO**
(b), com (c) apenas na forma estática se a liderança quiser um link no WhatsApp. Anunciar no dia 23 que o app chega
em outubro e que ninguém "perde" nada: a jornada é a mesma. Janela realista de loja, **condicionada à seção 4**:

| Se a entidade e o D-U-N-S estiverem resolvidos até | Submissão até | Loja (estimativa) | Dia da campanha |
|---|---|---|---|
| 28/09 | 06/10 | 08–10/10 | Dia 16–18 |
| 05/10 | 13/10 | 15–17/10 | Dia 23–25 |
| 12/10 | 20/10 | 22–24/10 | Dia 30–32 |

Isso é INFERÊNCIA a partir dos prazos documentados; cada rejeição da Apple custa 1–3 dias. Android costuma sair
antes que iOS.

### 3.2 PROBLEMA: conta e nuvem no lançamento aumentam risco e prazo sem servir ao Dia 1

**EVIDÊNCIA**
- A Execution 02 construiu identidade e papéis, mas a RLS **nunca foi provada num Postgres real** (sem Docker, sem
  projeto Supabase). O brief exigiu que teste com mock não conte como prova.
- Dado de convicção religiosa é sensível (LGPD art. 5º, II). Conta no servidor = tratamento de dado sensível,
  consentimento destacado, encarregado, incidente em 3 dias úteis, exclusão por web.
- Contas para menores de 16 exigem vínculo a responsável (ECA Digital art. 24); sem conta, o problema some.
- Nada do que a pessoa faz nos 100 dias exige conta: leitura, direção, progresso, reflexão, lembretes, meu ministério
  e altar de hoje são locais ou vêm do dataset.

**IMPACTO**
Lançar com conta empurra a loja para depois de: criar o projeto Supabase (ação com custo), provar RLS, escrever
consentimento, página de exclusão, DPO/canal, e resolver menores. Semanas, no momento em que cada semana é um dia
a mais sem app.

**ALTERNATIVAS**
- (a) Lançar com conta opcional já na V1.
- (b) Lançar **sem conta**; conta, ministérios com papel, progresso coletivo e insights numa segunda atualização.
- (c) Lançar sem conta e com um contador anônimo de conclusões do dia (sem identificador) para o "N pessoas
  concluíram hoje" — HIPÓTESE, depende do Product Brain e de um endpoint simples.

**RECOMENDAÇÃO**
(b). Com (c) avaliada para a segunda atualização. A declaração de Data safety/privacidade fica "nenhum dado
coletado", o que também acelera a revisão.

### 3.3 PROBLEMA: 12 capítulos por dia sem texto bíblico licenciado

**EVIDÊNCIA**
- A NVI em português não é aberta; a Biblica veda uso offline em apps; SBB só por contrato (FATO, `BIBLE_CONTENT_OPTIONS.md`).
- Textos abertos completos existem: **Bíblia Livre** (CC BY) e **Biblica® Open Nova Bíblia Viva 2007 (ONBV)** (CC BY-SA 4.0), com arquivos USFM (FATO).
- Linkar para um capítulo no YouVersion não reproduz texto (FATO); o formato público de URL do bible.com aceita
  código USFM + capítulo (id da versão NVI pt-BR: NÃO VERIFICADO).
- Áudio: Bible Brain oferece NTLH em streaming para app gratuito e não comercial (FATO, doc). Download offline só
  em filesets marcados.
- A Bíblia inteira tem ~780 mil palavras; a 200–250 palavras/min dá 52–65 h, ou **31–39 min por dia** de leitura
  silenciosa; em áudio, ~45 min/dia (INFERÊNCIA a partir da contagem do KJV; o português tende a ser um pouco maior).

**IMPACTO**
A carga é a maior ameaça à conclusão dos 100 dias. Um leitor que só mostra texto e um botão "Concluir" vai perder
gente a partir da segunda semana. E qualquer atalho com NVI sem licença expõe a igreja.

**ALTERNATIVAS**
- (a) Leitor com ONBV (mais legível, "Nova Bíblia Viva") ou Bíblia Livre (Almeida atualizada) empacotada, offline.
- (b) Sem texto no app: só "Abrir no YouVersion" e "Li na minha Bíblia".
- (c) (a) + link para YouVersion por capítulo + retomada por capítulo + leitura em partes + áudio em streaming (Bible
  Brain, se os termos fecharem) ou link para áudio do YouVersion.

**RECOMENDAÇÃO**
(c), em duas etapas: texto aberto + links + partes na primeira versão; áudio na segunda, após verificar os termos
do Bible Brain para este uso. A igreja precisa dizer qual tradução lê no altar (define o link padrão).

### 3.4 Perguntas que só a igreja responde (bloqueiam partes do plano)

★ = bloqueia a loja.

1. ★ **Entidade jurídica** que publica (CNPJ), quem assina política de privacidade e termos, e quem é o contato de
   suporte público (a Play mostra nome legal, endereço, e-mail e telefone).
2. ★ **Nome do app e identificadores.** Sugestão: nome "100 Dias" (com ou sem "Lagoinha" — marca precisa de
   autorização escrita; ver litígio de 2024 na pesquisa) e identificadores sem a marca (`br.org.<entidade>.cemdias`),
   porque identificador não muda depois.
3. ★ **Autorização escrita do material** (guia e escala) para publicação no app, e se os **nomes dos líderes** podem
   aparecer (senão, só o nome do ministério).
4. ★ **Tradução** usada no altar (NVI? NAA?) e aceite de ONBV/Bíblia Livre no leitor.
5. **Jejum**: existe propósito de jejum nesta campanha? Se não, o passo sai.
6. **Áudio**: aprovar a investigação Bible Brain/NTLH.
7. **Beta**: lista de 20–50 líderes testadores (Android primeiro, porque sai antes).
8. **Supabase**: só na segunda atualização; autorizar o custo quando chegar a hora.
9. **Domínio** para política de privacidade, "Para pais", exclusão de conta e deep links.

---

## 4. Plano de execução

Duas trilhas paralelas. A trilha A é da igreja e do Davi; a trilha B é minha. A loja depende das duas.

### Trilha A — o que só a igreja pode fazer (começar segunda, 21/09)

| # | Ação | Prazo típico | Bloqueia |
|---|---|---|---|
| A1 | Decidir a entidade; obter/confirmar D-U-N-S do CNPJ; inscrever Apple Developer Program (Organização) e Google Play Console (Organização); concluir Android Developer Verification | 1–4 semanas | Build iOS, TestFlight, submissões |
| A2 | Autorização escrita do guia e da escala; decisão sobre nomes de líderes | 1 dia | Retirar o banner DEV; `rights_status = authorized` |
| A3 | Domínio + política de privacidade + termos + página "Para pais e responsáveis" + página de suporte (eu redijo os rascunhos; revisão jurídica recomendada) | 1–2 semanas | Submissões |
| A4 | Nome do app, marca, ícone final (o SVG oficial da pomba) | 1 semana | Builds de produção |
| A5 | Respostas 4–7 da seção 3.4 | dias | Escopo do leitor, onboarding, beta |
| A6 | Autorizar EAS (plano pago se a fila do gratuito atrapalhar a janela) | 1 dia | Builds |

### Trilha B — o que eu construo (começa agora, em paralelo)

| Execução | Entrega | Depende de | Estimativa |
|---|---|---|---|
| **03 — Conteúdo real** | Conversor determinístico `.docx → JSON` do guia e da escala (os dois arquivos originais entram em `content/source/` com hash); campos novos `monte`, `escala`; `provenance.source_type = 'original_church_content'`, `rights_status = pending_authorization` até A2; validador ganha as sete checagens da auditoria (100 dias, datas, 1.189 capítulos únicos, rotação dos montes, guia = escala, versículo dentro da leitura) como testes; `CANONICAL_SOURCE_TARGET` superado; CLAUDE.md e V1_BUILD_STATUS atualizados | nada | 1–2 dias |
| **04 — Telas do dia real** | Início com monte, ênfase, leitura honesta, versículo, motivos, altar de hoje; tela **Intercessão do dia** com os 5 passos e **Modo altar**; Jornada com montes e dias do meu ministério; **Meu ministério** em Você com lembrete local; página **Sobre o propósito**; jejum condicionado à resposta 5; Dia 100 com Ap 21:5 | 03; A5 (jejum, nomes) | 3–5 dias |
| **05 — Texto bíblico** | Empacotar ONBV ou Bíblia Livre (USFM → base local, atribuição, contêiner aberto sem cifra por exigência CC); "Abrir no YouVersion" por capítulo; progresso por capítulo dentro do dia; leitura em partes; desempenho com 12 capítulos | A5 (tradução) | 3–5 dias |
| **06 — Identidade e lojas** | `app.json` definitivo (nome, bundle id, package, scheme, ícone, splash na paleta do handoff), `eas.json` (development/preview/production), privacy manifest, API 36, 16 KB, edge-to-edge; builds; TestFlight + teste fechado do Play com o grupo beta; fichas das lojas (prints, textos, questionário etário, Data safety "nenhum dado coletado", URLs); submissões | A1, A3, A4 | 2–3 dias de trabalho + espera |
| **07 — QA em aparelho** | Builds de desenvolvimento para Android (não depende da Play) e iOS (depende de A1); roteiro da seção 5 do V1_BUILD_STATUS executado por Davi e pelo beta; correções | 04, 05; aparelhos do Davi/beta | contínuo |
| **08 — Segunda atualização** | Projeto Supabase em São Paulo; prova real da RLS; conta por OTP; ministérios com papel; progresso coletivo (contador anônimo ou por conta, conforme PB); insights se aprovados | A8, PB | depois da loja |

Ordem real: 03 → 04 → 05 podem andar já; 06 espera A1/A3/A4 mas seus artefatos (fichas, prints, textos) começam
antes; 07 corre desde que exista build Android. **Caminho crítico é a trilha A**, não o código.

### Estimativa honesta

Com A1 resolvido até 05/10 e sem rejeição dupla nas lojas, o app público sai por volta do **Dia 23–25 (15–17/10)**.
Se A1 escorregar para meados de outubro, Dia 30+. Anunciar para a igreja "em outubro", nunca uma data fechada
antes de as contas existirem.

---

## 5. Ideias (todas HIPÓTESE; nenhuma entra sem aprovação do Product Brain)

Ordenadas por valor ÷ custo, com minha opinião direta.

| # | Ideia | Por que vale | Custo | Opinião |
|---|---|---|---|---|
| 1 | **Modo altar** (guia do dia em 5 passos, tela cheia, tipo grande, tela acesa) | Faz o mesmo app servir ao altar das 12h30 e ao lar. Une individual e coletivo sem feature social. Vem direto da orientação. | baixo | Fazer na V1. |
| 2 | **Meu ministério** (seleção local; dias no altar; lembrete na véspera; destaque na Jornada) | Serve 39 ministérios e suas equipes sem conta nem backend. | baixo | Fazer na V1. |
| 3 | **Leitura em partes** + retomada por capítulo ("faltam 5 capítulos") | Ataca o risco número um (12 capítulos/dia). | baixo | Fazer na V1. |
| 4 | **Áudio da leitura** (Bible Brain NTLH em streaming, ou link para áudio no YouVersion) | Maior alavanca de conclusão para Bíblia inteira em 100 dias. | médio (player, áudio em segundo plano, licença) | Verificar termos; entrar na segunda atualização se fechar. |
| 5 | **Cartão do dia** para compartilhar (Dia N · Monte · versículo · ênfase; imagem para WhatsApp/Stories) | Líderes postam todo dia; alcance orgânico; zero dado pessoal. | baixo-médio | Fazer na V1 se sobrar um dia; senão, segunda. |
| 6 | **Lembrete opcional do altar** (12h30: "hoje conduz Kids") | Cola o app ao movimento presencial. | baixo | Fazer na V1. |
| 7 | **Contador anônimo de conclusões** ("N pessoas concluíram hoje") | Dá o "juntos" sem conta. | médio (endpoint + abuso) | Segunda atualização, com PB. |
| 8 | **Widget** (iOS/Android: "Dia 17 · Governo · Gn 37–48") | Presença na tela inicial. | médio | Depois. |
| 9 | **Carta para 2027** no Dia 100 (31/12) | O guia termina em "faço novas todas as coisas" na véspera do ano novo. Reflexão privada com prompt especial. | baixo | Segunda atualização; decisão de produto. |
| 10 | **Publicar o plano no YouVersion Connect** também | Alcança quem não vai baixar o app. | baixo, 4 semanas de fila | Decisão da igreja; compete com adoção. |

Ideias que **rejeito** e por quê: app de líder (redundante; seção 2.3); números coletivos simulados (inventar dado);
NVI embarcada sem licença (exposição jurídica da igreja); ranking, sequência ou pontos (spec §10 e ECA Digital,
mecânica de uso compulsivo); conta obrigatória (Apple 5.1.1(v) e LGPD).

---

## 6. O que entregar aos líderes

Quatro peças, todas prontas para WhatsApp.

### 6.1 Página única "O que é o app dos 100 Dias" (rascunho abaixo, Anexo A)
Uma tela: o que a pessoa recebe, o que não é, quando chega, como entra no dia certo, o que os líderes dizem no dia 23.

### 6.2 Prints das telas
Início, Dia com a intercessão, Modo altar, Leitor, Jornada, Você/Meu ministério, Marco. Os atuais estão no
navegador com conteúdo fictício; os definitivos saem da Execução 04 com o conteúdo real.

### 6.3 Cronograma com o que depende deles
A tabela da seção 4, trilha A, em linguagem de igreja: "precisamos de X até Y para que Z aconteça".

### 6.4 Grupo beta
20–50 líderes recebem o app 1–2 semanas antes de todo mundo (Android primeiro), rodam o roteiro de uma hora e
viram os primeiros a explicar o app nos seus ministérios.

### Anexo A — rascunho da página para líderes

> **O app dos 100 Dias**
>
> **O que é.** O lugar onde cada pessoa faz a parte individual do propósito: a leitura do dia (de Gênesis a
> Apocalipse, 11 a 12 capítulos) e a direção de intercessão daquele dia — o monte, o versículo-base, a ênfase e os
> motivos de oração — do mesmo jeito que está no guia. Mostra em que dia a igreja está, qual ministério conduz o
> altar das 12h30 hoje, e o caminho já percorrido.
>
> **O que não é.** Não substitui o altar das 12h30. Não é rede social. Não tem ranking nem sequência. Não pede
> conta. O que a pessoa escreve fica só com ela, no aparelho dela.
>
> **Para o líder.** Abra o dia de hoje no "Modo altar": os cinco passos da reunião, em letra grande, na ordem da
> orientação. Em "Meu ministério", veja os dias do seu ministério e receba um aviso na véspera.
>
> **Quando chega.** A campanha começa dia 23/09 com o guia que vocês já têm. O app chega em outubro, nas lojas
> da Apple e do Google. Quem entrar no dia 20 vê o dia 20 e os anteriores ficam abertos — ninguém perde nada.
>
> **O que dizer no dia 23.** "Começamos hoje com o guia. O app vem em outubro, e todo mundo entra no dia em que a
> igreja estiver."

### Anexo B — perguntas que os líderes vão fazer

1. Precisa de conta? Não. 2. Meus dados vão para algum lugar? Não; ficam no aparelho. 3. Adolescentes podem usar?
Sim, sem conta. 4. Entrei no dia 30, e agora? Os 29 dias ficam abertos, no seu ritmo. 5. Qual Bíblia? Uma tradução
aberta no app, ou abra o capítulo no YouVersion na sua tradução, ou leia na sua Bíblia e marque. 6. Posso usar
para conduzir o altar? Sim, Modo altar. 7. E se eu faltar? Nada de culpa; continue de onde quiser. 8. Tem jejum?
(depende da resposta da igreja). 9. Funciona sem internet? Sim, tudo o que é seu. 10. Como ajudo? Entre no beta.

---

## 7. Atualizações de governança que este plano implica

- **CLAUDE.md**: a fonte canônica passa a ser o guia próprio da igreja; Gate 2 = autorização escrita interna; manter
  as proibições de scraping e de fabricação; adicionar "sem conta na V1" como decisão se o Product Brain ratificar.
- **MASTER PRODUCT SPEC v1.1**: pedir ao Product Brain a ratificação de (a) fonte canônica, (b) V1 sem conta,
  (c) jejum condicional, (d) Modo altar e Meu ministério como escopo da V1, (e) tradução aberta + links no leitor.
- **ADR-002 (backend)**: continua PROPOSTA; a criação do projeto Supabase fica para a segunda atualização.
- **V1_BUILD_STATUS**: seção 6 ("como trocar as fixtures") passa a descrever o conversor do guia, não o plano 42360.
