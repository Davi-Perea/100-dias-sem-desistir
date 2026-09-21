# Plano de lançamento: de hoje até o app estar nas lojas

- **Data:** 2026-09-21 (segunda-feira). **Dia 1 da campanha: quarta, 23/09/2026.** Dia 100: 31/12/2026.
- **Autor:** Claude (Principal Mobile Engineer). **Para:** Davi (fundador), que decide. Depois, Product Brain.
- **Natureza:** PLANEJAMENTO. Nada aqui foi implementado, contratado ou enviado a ninguém.
- **Aviso jurídico:** este documento **não é parecer jurídico**. Onde ele fala de lei, política de privacidade, termos,
  consentimento ou autorização, é um **RASCUNHO para revisão de advogado**. Nenhum texto aqui deve ser publicado
  como documento legal da igreja sem essa revisão.
- **Campos a preencher** aparecem assim: `[ENTIDADE]`, `[CNPJ]`, `[DOMÍNIO]`... Não inventei nenhum dado da igreja.
- **Etiquetas:** **FATO** (fonte oficial, com data de acesso no fim) · **INFERÊNCIA** (conclusão minha a partir dos
  fatos) · **HIPÓTESE** (palpite que ninguém mediu).
- **Base:** `PLANO_FASE_FINAL_100_DIAS.md` (19/09), `V1_BUILD_STATUS.md`, `MOBILE_STORE_REQUIREMENTS.md`,
  `HARD_TO_REVERSE_DECISIONS.md`, `comunidade/00-DECISOES.md` (21/09), `design_handoff_100_dias/LACUNAS.md` e
  `PERGUNTAS_AO_DESIGNER.md`.

---

## 0. A verdade em oito linhas

1. **O app não estará nas lojas na quarta, 23/09.** O motivo não é código: é que **ainda não existe** a pessoa jurídica
   dona do app, o D-U-N-S, as contas Apple e Google, o domínio, a política de privacidade nem a autorização escrita da
   igreja. Cada uma dessas coisas tem prazo próprio, e nenhuma começou (FATO, estado do repositório: não há `eas.json`,
   e o `app.json` ainda se chama "Leitura Bíblica (spike)").
2. **O caminho crítico é: entidade → D-U-N-S → contas Apple e Google.** É o item mais lento e o único que ninguém
   consegue acelerar trabalhando mais. Tudo o que eu faço cabe dentro da espera dele.
3. **V1 sem Comunidade, data honesta:** **segunda quinzena de outubro** (entre o Dia 22 e o Dia 38), se a entidade e o
   pedido de D-U-N-S saírem **esta semana**. Otimista: ~14/10. Realista: ~23 a 30/10. Se o D-U-N-S levar os 30 dias
   que o Google avisa, início de novembro.
4. **Comunidade: nunca no mesmo lançamento da V1.** Ela entra como **segunda versão**, e a data honesta mais cedo é
   **meados de novembro**, com data-limite de **15/11** proposta no memorando. Minha leitura franca: 15/11 é o caso
   **otimista**; o caso realista passa dele (seção 4).
5. **Segurar a V1 para lançar junto com a Comunidade é a pior opção**: empurra o app inteiro para o fim de novembro,
   com a campanha passando da metade, para ganhar uma função que tem os portões mais difíceis.
6. **O Gate 1 (licença de tradução) não precisa travar a V1.** A V1 pode sair só com as referências ("Gênesis 1–12"),
   "Li na minha Bíblia" e um link para abrir o capítulo fora do app. Embutir um texto aberto (Bíblia Livre ou ONBV) é
   uma escolha, não uma obrigação, e custa 3 a 5 dias meus.
7. **O Gate 2 (autorização escrita da igreja) trava tudo**: sem ela, a versão de loja **não abre**, de propósito. É o
   item mais barato da lista (uma mensagem escrita da liderança) e precisa sair esta semana.
8. **Existe um prazo escondido em 30/09:** a partir dessa data o Google passa a bloquear, em celulares Android
   certificados no Brasil, a instalação de apps de desenvolvedores não verificados (FATO [G3][G4]). Por isso o primeiro
   teste em aparelho Android precisa acontecer **antes** de 30/09, ou depois dele só pelos caminhos técnicos de exceção.

---

## 1. Dependências, com dono e com o que cada uma destrava

Donos: **Fundador** (Davi) · **Igreja** (liderança, jurídico interno, secretaria) · **Designer** · **Advogado** ·
**Claude** (eu). "Prazo típico" é o tempo depois que o dono começa.

### 1.1 Tabela geral

| # | Dependência | Dono | Prazo típico | Destrava | Trava a V1? | Trava a Comunidade? |
|---|---|---|---|---|---|---|
| D1 | **Entidade jurídica dona do app**: razão social `[ENTIDADE]`, `[CNPJ]`, quem assina `[REPRESENTANTE LEGAL]` | Igreja (Fundador cobra) | 1–3 dias para decidir | D-U-N-S, contas, política de privacidade, "controlador" da LGPD | **Sim** | Sim |
| D2 | **D-U-N-S** da entidade (gratuito) | Igreja | Apple: até 5 dias úteis para emitir + até 2 dias úteis para a Apple receber (FATO [A1]). Google: "pode levar até 30 dias" (FATO [G1]) | Contas Apple e Google como Organização | **Sim (caminho crítico)** | Sim |
| D3 | **Domínio + e-mail institucional + site público simples** (`[DOMÍNIO]`) | Igreja / Fundador | 1–3 dias | Apple exige e-mail do domínio e site funcionando (FATO [A2]); URLs de privacidade e suporte | **Sim** | Sim |
| D4 | **Conta Apple Developer (Organização)**, US$ 99/ano | Fundador (com o representante legal da entidade) | Verificação sem prazo publicado (FATO [A2]); planejar 3–10 dias úteis (INFERÊNCIA) | Build de iPhone, TestFlight, envio à App Store | **Sim (iOS)** | Sim |
| D5 | **Conta Google Play Console (Organização)**, US$ 25 uma vez, + Android Developer Verification | Fundador | Verificação de identidade: dias (INFERÊNCIA); o Play Console registra a maioria dos apps automaticamente (FATO, `MOBILE_STORE_REQUIREMENTS.md` §3.2) | Teste fechado, envio ao Google Play, instalação em Android após 30/09 | **Sim (Android)** | Sim |
| D6 | **Gate 2 — autorização escrita** do guia e da escala para publicação no app; decisão à parte sobre **nomes de líderes** | Igreja | 1 dia | `rights_status = authorized`; a versão de loja passa a abrir; some o aviso "aguardando autorização" | **Sim** | Sim |
| D7 | **Gate 1 — tradução bíblica** (qual texto o leitor mostra) | Fundador + Igreja decidem; Advogado só se for tradução protegida | Decidir: 1 dia. Tradução protegida (NVI, NAA...): semanas a meses, contrato | Texto dentro do leitor | **Não**, se a V1 sair só com referências | Não |
| D8 | **Nome de loja, identificador do app e ícone** | Fundador (nome), Igreja (marca), Designer (ícone), Claude (identificadores) | 2–5 dias | `app.json` definitivo, builds de produção, fichas das lojas | **Sim** | — |
| D9 | **Autorização de marca**, se o nome usar "Lagoinha" | Igreja (titular da marca) | 1–7 dias | Apple 4.1(c) e Google (propriedade intelectual) | Só se usar a marca | — |
| D10 | **Política de privacidade, página de suporte, página "Para pais e responsáveis"** | Claude redige rascunho → Advogado revisa → Igreja publica no `[DOMÍNIO]` | 3–10 dias | Envio às duas lojas (obrigatório nas duas) | **Sim** | Sim (versão maior) |
| D11 | **Conta Expo (EAS)** e login no terminal | Fundador (senha é dele; eu não digito senha) | 30 min | Builds na nuvem, primeiro teste em aparelho | **Sim** | Sim |
| D12 | **Primeiro teste em aparelho real** (roteiro de 1 hora, `V1_BUILD_STATUS.md` §5) | Claude gera o build; Fundador instala e testa | Android: 1 dia depois de D11. iPhone: só depois de D4 | Descobrir o que o navegador não mostra (notificação, fonte do sistema, barras) | **Sim** | — |
| D13 | **Respostas do designer** às perguntas 1–6, 11 e 12 de `PERGUNTAS_AO_DESIGNER.md` | Designer (Fundador envia e cobra) | 3–7 dias | Etapas 2, 3, 6 e 7 do redesenho | **Sim**, se a V1 sair com o redesenho | Perguntas 7–10 travam |
| D14 | **Etapas do redesenho** (seção 1.4) | Claude | ~10–14 dias úteis para a parte da V1 | Telas definitivas, prints das lojas | Ver seção 1.4 | Etapas 4 e 5 |
| D15 | **Decisões de conteúdo**: existe jejum nesta campanha? qual tradução o altar usa? | Igreja | 1 dia | Onboarding final, link padrão do leitor | Parcial | — |
| D16 | **Grupo beta** de 20–50 líderes (Android primeiro) | Igreja / Fundador | 2–3 dias para montar a lista | Teste fechado do Play e TestFlight | Recomendado | Recomendado |
| D17 | **Comunidade: as 12 decisões** do memorando (`comunidade/00-DECISOES.md`) | Fundador; ratificação do Product Brain | 1–3 dias | Início do servidor e das telas da Comunidade | Não | **Sim** |
| D18 | **Advogado contratado** | Igreja | 1–2 semanas para começar | Consentimento, regras, termos, protocolo de abuso infantil (Comunidade); revisão da política (V1) | Só a revisão da política | **Sim** |
| D19 | **Pessoas de moderação**: 14 moderadores + 2 pastorais + 1 responsável legal, treinadas; escala de 20/12 a 03/01 fechada até 30/11 | Igreja | 2–4 semanas | Ligar a Comunidade | Não | **Sim** |
| D20 | **Servidor (Supabase em São Paulo)** criado no nome da entidade, com custo autorizado | Fundador cria; Claude configura | 1 dia para criar; 17–27 dias de trabalho de servidor + 4–6 da página de moderação | Conta, feed, moderação, exclusão de conta | Não | **Sim** |
| D21 | **Classificação etária respondida com verdade** (com feed da igreja inteira: A16 no Brasil) | Fundador decide; Claude preenche | 1 dia | Envio da versão com Comunidade | Não | **Sim** |

### 1.2 Contas de desenvolvedor como organização: o passo a passo

Esta é a corrente que define a data. Cada elo só começa quando o anterior termina.

| Passo | O que é | Quem | Prazo | Fonte |
|---|---|---|---|---|
| 1 | Decidir **qual CNPJ** é o dono do app (a igreja local, uma associação, outra entidade) | Igreja | 1–3 dias | — |
| 2 | Conferir se esse CNPJ **já tem D-U-N-S** (a Apple tem uma ferramenta de consulta na página de D-U-N-S). Se tiver, pula o passo 3 | Fundador + secretaria | minutos | FATO [A1] |
| 3 | Pedir o D-U-N-S à Dun & Bradstreet, com o nome **exatamente** como está no CNPJ | Igreja | Até 5 dias úteis para emitir, mais até 2 dias úteis até a Apple enxergar o número. "Acelerar não encurta esse prazo." Se passar de duas semanas, escrever para a D&B | FATO [A1] |
| 3b | O Google avisa que obter o D-U-N-S "pode levar até 30 dias" | — | até 30 dias | FATO [G1] |
| 4 | Domínio próprio, e-mail no domínio e site público "funcional" (a Apple recusa site vazio ou página de registrador) | Igreja | 1–3 dias, **em paralelo** ao passo 3 | FATO [A2] |
| 5 | Inscrição na Apple como Organização, feita por quem tem **poder legal para assinar** pela entidade, com Apple ID com verificação em duas etapas; US$ 99/ano. Usar apelido no nome atrasa a aprovação | Representante legal (ou pessoa com procuração) | Prazo de verificação **não publicado** (FATO [A2]); planejar 3–10 dias úteis (INFERÊNCIA) | FATO [A2] |
| 6 | Conta Google Play Console como Organização, com D-U-N-S, e-mail e telefone verificados; US$ 25. **Nome legal, endereço, e-mail e telefone da entidade ficam públicos na loja** | Fundador, com os dados da entidade | dias (INFERÊNCIA) | FATO [G1]; `MOBILE_STORE_REQUIREMENTS.md` §3 |
| 7 | Conferir no Play Console o "status de registro" do Android Developer Verification | Fundador + Claude | minutos | FATO [G3] |

**Soma honesta do caminho crítico** (INFERÊNCIA): se o CNPJ for decidido até quarta (23/09) e já tiver D-U-N-S,
as contas podem existir por volta de **02 a 07/10**. Se precisar pedir o D-U-N-S, **06 a 16/10** no caso normal da
Apple e **até ~26/10** se cair no prazo de 30 dias do Google.

**Isenção da taxa Apple para entidades sem fins lucrativos:** existe, mas se vale no Brasil está **não confirmado**
(`comunidade/00-DECISOES.md` [P3]). Não vale atrasar a inscrição por isso: US$ 99 é menor que uma semana de atraso.

### 1.3 Primeiro teste em aparelho (EAS)

- **Android, esta semana.** Com a conta Expo criada e o login feito pelo Fundador (`npx eas login`, a senha é dele),
  eu gero um build de desenvolvimento para Android na nuvem. Ele se instala por arquivo, sem Google Play. **Fazer antes
  de 30/09**: a partir dessa data, celulares Android certificados no Brasil bloqueiam a instalação normal de apps de
  desenvolvedores não verificados, inclusive por arquivo (FATO [G3][G4]). Depois disso ainda há caminhos técnicos
  (cabo com `adb`, fluxo avançado), mas são piores para um teste com líderes (EVIDÊNCIA [G4]; reverificar).
- **iPhone, só depois da conta Apple.** Build de desenvolvimento e TestFlight exigem o Apple Developer Program (FATO,
  `PLANO_FASE_FINAL_100_DIAS.md` §3.1). Não há atalho honesto.
- **Custo:** o plano gratuito do Expo dá 15 builds iOS + 15 Android por mês; se a fila atrasar a janela, US$ 19/mês
  (FATO, `comunidade/00-DECISOES.md` [P5]).
- **O que o teste precisa provar:** o roteiro de 1 hora de `V1_BUILD_STATUS.md` §5 (recusar notificação sem travar,
  matar e reabrir o app sem perder progresso, fonte grande do sistema, barras do Android 16).

### 1.4 Etapas do redesenho: o que entra na V1

O `PROMPT.md` do designer define 8 etapas, com revisão do Fundador ao fim de cada uma. O `LACUNAS.md` achou 193
pontos, e 12 perguntas travam telas inteiras. Proposta de corte:

| Etapa | Conteúdo | Entra na V1? | Depende de | Estimativa (Claude) |
|---|---|---|---|---|
| 1 | Tokens e componentes-base | Sim | nada (já começou) | 1–2 dias |
| 2 | Grupo A — Jornada e o dia | Sim | perguntas 1, 2, 3, 5 | 2–3 dias |
| 3 | Grupo B — Ler | Sim | perguntas 2, 4, 6 | 2 dias |
| 6 | Grupo E — Intercessão, altar e marcos | Sim | pergunta 4 | 1–2 dias |
| 7 | Grupo F — Entrada e estados | Sim | capturas do grupo F (pergunta 18) | 1–2 dias |
| 8 | Tema escuro | Sim (o app já tem tema escuro hoje) | etapas anteriores | 1 dia |
| 5 | Grupo D — Você | **Só a parte sem conta** (lembrete, ministério, modo de leitura, estatísticas, ajuda) | pergunta 11 | 1 dia |
| 4 | Grupo C — Comunidade | **Não.** Vai com a segunda versão | perguntas 7–10, 12 e as decisões D17 | junto com o servidor |

Total da parte da V1: **~10 a 14 dias úteis de implementação**, mais o tempo de revisão do Fundador em cada etapa e
das respostas do designer. **Plano B honesto:** o app atual já funciona e passou em 239 testes. Se o redesenho não
estiver pronto quando as contas estiverem, a V1 pode sair com as etapas que estiverem prontas e o resto chega numa
atualização. **O redesenho não deve virar o novo caminho crítico.**

### 1.5 Nome e ícone de loja

- **Identificador do app** (`br.org.[entidade].cemdias` ou parecido) **não muda depois de publicado** (FATO,
  `HARD_TO_REVERSE_DECISIONS.md` A13). Recomendo derivar do `[DOMÍNIO]` da entidade e **sem a palavra "Lagoinha"**,
  porque identificador não se troca e marca pode mudar.
- **Nome de loja:** sugestão de trabalho "100 Dias" (com ou sem complemento). Usar "Lagoinha" exige autorização escrita
  da titular da marca (Apple 4.1(c)) e, pela pesquisa, a situação no INPI não foi verificada (`MOBILE_STORE_REQUIREMENTS.md` §4).
- **Ícone:** o SVG oficial da pomba, entregue pelo designer em versão final (fundo, versão monocromática do Android).
  Sem "kids/infantil" em nome, ícone ou descrição (Apple 2.3.8).

---

## 2. O caminho crítico

```
Entidade (CNPJ) ──► D-U-N-S ──► Contas Apple + Google ──► builds de produção ──► TestFlight + teste fechado ──► envio ──► revisão ──► LOJA
      │                                   ▲                        ▲
      └──► Domínio + e-mail + site ───────┘                        │
Gate 2 (autorização escrita) ──────────────────────────────────────┤
Nome + identificador + ícone ──────────────────────────────────────┤
Política de privacidade + suporte + "Para pais" (advogado revisa) ─┤
Redesenho V1 (etapas 1,2,3,5-parcial,6,7,8) ── não pode virar crítico ┘
```

- **Crítico de verdade:** Entidade → D-U-N-S → contas. Só a igreja anda nele.
- **Quase crítico:** Gate 2 e a política de privacidade revisada. São rápidos, mas a loja não aceita o envio sem eles,
  e o app não abre sem o Gate 2.
- **Fora do caminho crítico, se ninguém esquecer:** nome/ícone, redesenho, primeiro teste Android, fichas das lojas,
  prints. Tudo isso eu adianto enquanto o D-U-N-S corre.
- **Revisão das lojas:** a Apple informa que revisa a maioria dos envios em menos de 24 h (EVIDÊNCIA,
  `PLANO_FASE_FINAL_100_DIAS.md` §3.1); a primeira submissão costuma ter pelo menos uma rejeição, e **cada rejeição
  custa 1–3 dias** (INFERÊNCIA). O Google não publica prazo; conta nova costuma levar dias (INFERÊNCIA). Android tende a
  sair antes do iPhone.

---

## 3. Trilha 1 — lançar a V1 sem Comunidade (recomendada)

**O que é a V1:** o app de hoje com o conteúdo real da igreja, sem conta, offline, com Jornada, dia, intercessão, Modo
altar, Meu ministério, reflexão local, lembrete e o redesenho das etapas da V1. Declaração de privacidade: "nenhum
dado coletado". Sem conta, a V1 **não precisa** de exclusão de conta, servidor, consentimento de dado sensível nem da
regra de contas de menores (`PLANO_FASE_FINAL_100_DIAS.md` §3.2).

**Requisitos de loja que continuam valendo mesmo sem conta** (FATO, `MOBILE_STORE_REQUIREMENTS.md` §2–3): política
de privacidade com URL pública e dentro do app; URL de suporte com contato real; questionário etário; Data safety;
público-alvo no Google; comprovação de direitos do conteúdo (a autorização do Gate 2 é essa prova); página "Para pais
e responsáveis" (ECA Digital art. 16 — RASCUNHO para advogado confirmar o alcance).

### 3.1 Datas (todas INFERÊNCIA, condicionadas às dependências)

| Cenário | Premissa | Contas prontas | Envio às lojas | Na loja (estimativa) | Dia da campanha |
|---|---|---|---|---|---|
| **Otimista** | CNPJ decidido até 23/09 e **já tem D-U-N-S**; Gate 2 e domínio esta semana; sem rejeição | 02–07/10 | 09/10 | Android ~12/10; iPhone ~14/10 | Dia 20–22 |
| **Realista** | Precisa pedir D-U-N-S nesta semana; uma rejeição da Apple | 09–16/10 | 19/10 | Android ~21/10; iPhone ~23–30/10 | Dia 29–38 |
| **Pessimista** | D-U-N-S no prazo de 30 dias do Google, ou CNPJ decidido só na semana que vem | ~26/10 ou depois | ~29/10 | início de novembro | Dia 42+ |

**O que anunciar à igreja agora:** "o app chega em outubro, e todo mundo entra no dia em que a igreja estiver". **Não
anunciar data fechada antes de as duas contas existirem.** O produto já foi feito para entrada tardia: os dias
passados ficam abertos e ninguém "perde" nada.

### 3.2 Semana a semana (Trilha 1, cenário realista)

| Semana | Fundador / Igreja | Designer | Advogado | Claude |
|---|---|---|---|---|
| 21–27/09 | Entidade, D-U-N-S, domínio, Gate 2, nome, conta Expo, perguntas ao designer | Responde perguntas 1–6 | Contratado (ou contato definido) | Etapa 1; `eas.json` e build Android de desenvolvimento; rascunhos de privacidade/suporte/"Para pais" |
| 28/09–04/10 | Testar no Android **antes de 30/09**; beta montado; decisão de jejum e tradução | Ícone final, perguntas 11, 12, grupo F | Revisa a política | Etapas 2 e 3; correções do teste |
| 05–11/10 | Contas Apple e Google (se o D-U-N-S chegou) | Revisões | Aprova textos | Etapas 5-parcial, 6, 7; `app.json` definitivo; fichas e prints |
| 12–18/10 | TestFlight e teste fechado com o beta | — | — | Etapa 8; correções; envio |
| 19–30/10 | Divulgação na igreja quando aprovado | — | — | Rejeições, correções, lançamento |

---

## 4. Trilha 2 — lançar com Comunidade

**Recomendação:** a Comunidade entra como **segunda versão**, depois da V1 estar na loja. Não recomendo um lançamento
único "V1 + Comunidade" (ver o quadro 4.3).

### 4.1 Portões que precisam estar todos fechados (FATO/INFERÊNCIA, `comunidade/00-DECISOES.md` §7)

Entidade e encarregado nomeados · as 12 decisões tomadas e ratificadas pelo Product Brain · textos revisados por
advogado (consentimento, regras, termos, política, "Para pais", protocolo de abuso infantil) · regras da comunidade
escritas pela igreja · 14 + 2 + 1 pessoas nomeadas e treinadas · servidor no ar com testes de segurança num banco real ·
filtro antes de publicar · página interna de moderação · exclusão de conta no app e na web · página "Retirar conteúdo" ·
e-mail de contato atendido · classificação etária respondida com verdade (A16 no Brasil com feed da igreja inteira) ·
etapas 4 e 5 do redesenho com as perguntas 7–10 e 12 respondidas.

### 4.2 Datas (INFERÊNCIA)

O trabalho de engenharia soma **21 a 33 dias úteis** (servidor 17–27 + moderação 4–6), sem contar as telas da
Comunidade e as correções de segurança. Sou um engenheiro só, e a V1 vem primeiro.

| Cenário | Premissa | Comunidade no ar | Dia da campanha | Semanas de uso até 31/12 |
|---|---|---|---|---|
| **Otimista** | 12 decisões até 25/09; servidor criado até 28/09; advogado e 17 pessoas até meados de outubro; V1 na loja até ~14/10 | ~13–15/11 | Dia 52–54 | ~7 |
| **Realista** | Decisões na semana que vem; advogado começa em outubro; uma rejeição por causa de moderação | ~25/11 a 02/12 | Dia 64–71 | ~4–5 |
| **Pessimista** | Pessoas ou advogado atrasam | dezembro | Dia 72+ | < 4, estreando no Natal |

**Leitura franca:** a data-limite de **15/11** do memorando só é alcançada no cenário otimista. No realista ela passa.
Por isso a regra proposta continua valendo: **se os portões não estiverem fechados em 15/11, a Comunidade fica para
depois da campanha.** Estrear em dezembro significa entrar no mês mais difícil de moderar, para ter poucas semanas de
uso, com uma obrigação de moderar que continua depois de 31/12.

### 4.3 Por que não lançar tudo junto

| | V1 agora + Comunidade depois | Tudo junto |
|---|---|---|
| App na loja | outubro | fim de novembro, na melhor hipótese |
| Classificação na App Store Brasil | Livre na V1; A16 só a partir da versão com Comunidade | A16 desde o primeiro dia; famílias com controle parental podem não conseguir instalar nem a leitura (`comunidade/00-DECISOES.md` §3, não confirmado) |
| Risco de rejeição | baixo na V1 (sem conta, sem conteúdo de usuário) | alto (moderação, conta demo, feed com conteúdo) |
| Dado sensível no servidor | não, na V1 | sim, desde o início |
| Se a Comunidade escorregar | a igreja já tem o app | a igreja fica sem nada |

---

## 5. O que o Fundador precisa fazer ESTA SEMANA, em ordem

1. **Hoje ou amanhã — decidir o dono.** Com a liderança: qual CNPJ publica o app (`[ENTIDADE]`, `[CNPJ]`) e quem assina
   por ele (`[REPRESENTANTE LEGAL]`). Tudo o resto espera isso.
2. **No mesmo dia — D-U-N-S.** Consultar se o CNPJ já tem D-U-N-S (ferramenta na página de D-U-N-S da Apple). Se não
   tiver, pedir já, com o nome **idêntico** ao do CNPJ. Anotar a data do pedido: é ela que define a data de loja.
3. **Até quarta (23/09) — Gate 2.** Pedir à liderança a autorização escrita para publicar o guia e a escala no app, e
   uma resposta separada sobre nomes de líderes (sim ou não). Uma mensagem escrita, com nome, cargo e data, basta como
   prova; eu registro no `rights.json`. Modelo de pedido (RASCUNHO, a igreja ajusta):
   > "Autorizamos a publicação do material '100 Dias — Guia Diário de Intercessão' e da escala do altar no aplicativo
   > `[NOME DO APP]`, publicado por `[ENTIDADE]`, `[CNPJ]`, durante a campanha de 23/09 a 31/12/2026 e enquanto o app
   > estiver disponível. Nomes de líderes: `[AUTORIZADO / NÃO AUTORIZADO]`. `[NOME]`, `[CARGO]`, `[DATA]`."
4. **Até quarta — domínio e e-mail.** Registrar `[DOMÍNIO]` no nome da entidade (ou confirmar um que a igreja já tenha),
   criar um e-mail institucional que alguém leia todo dia e publicar uma página simples no site.
5. **Até quinta (24/09) — conta Expo e primeiro teste Android.** Criar a conta Expo (idealmente no e-mail institucional)
   e fazer o login no terminal. Eu gero o build de desenvolvimento; você instala no seu Android e roda o roteiro de uma
   hora. **Tem que ser antes de 30/09.**
6. **Até quinta — mandar as perguntas ao designer** (`PERGUNTAS_AO_DESIGNER.md`), pedindo prioridade para 1–6, 11, 12,
   o ícone final e as capturas do grupo F.
7. **Até sexta (25/09) — nome e identificador.** Escolher o nome de loja. Se tiver "Lagoinha", pedir autorização de
   marca por escrito. Aprovar o identificador que eu propuser a partir do domínio (não muda depois).
8. **Até sexta — Gate 1 da V1.** Decidir entre (a) V1 só com referências + "Li na minha Bíblia" + link externo
   (recomendado para não atrasar) ou (b) embutir Bíblia Livre ou ONBV (3–5 dias meus). E perguntar à igreja qual
   tradução o altar usa e se existe jejum nesta campanha.
9. **Até sexta — advogado.** Definir quem revisa a política de privacidade e a página "Para pais" da V1
   (`[ADVOGADO]`). Se a Comunidade for adiante, o mesmo advogado pega a lista maior do memorando.
10. **Até sexta — Comunidade: decidir ou adiar.** Responder as 12 perguntas de `comunidade/00-DECISOES.md` ou decidir
    adiar para depois da campanha. Levar ao Product Brain junto com este plano. Se for adiante: pedir à igreja os nomes
    das 17 pessoas e autorizar o custo do Supabase (~US$ 25/mês) no nome da entidade.
11. **Fim da semana — beta e recado aos líderes.** Montar a lista de 20–50 líderes testadores (Android primeiro) e
    alinhar com a liderança o recado do dia 23: "começamos com o guia; o app vem em outubro; todo mundo entra no dia
    em que a igreja estiver". Sem data fechada.
12. **Assim que houver D-U-N-S — inscrever Apple e Google** como Organização, com o representante legal. Eu acompanho
    cada tela, mas senhas, pagamentos e aceites de contrato são seus.

---

## 6. O que eu faço em paralelo (sem esperar ninguém)

- Etapa 1 do redesenho (já começou) e, com as respostas do designer, as etapas 2, 3, 6, 7, 8 e a parte sem conta da 5.
- `eas.json` com perfis de desenvolvimento, teste e produção; build Android de desenvolvimento assim que houver conta Expo.
- Rascunhos (para advogado) da política de privacidade da V1, página de suporte e "Para pais e responsáveis".
- Textos das fichas das lojas, respostas do questionário etário e do Data safety para a V1 sem conta, prints.
- Nada de conta, servidor ou Comunidade até as decisões D17 e o custo D20 estarem aprovados.

---

## Fontes (acesso em 2026-09-21)

- [A1] Apple Developer — D-U-N-S Number ("allow up to 5 business days"; "allow up to 2 business days for Apple";
  acelerar não encurta; e-mail à D&B após duas semanas): https://developer.apple.com/support/D-U-N-S/
- [A2] Apple Developer — Enrollment (Organização: entidade legal, poder de assinatura, D-U-N-S, e-mail no domínio, site
  público funcional; sem prazo de verificação publicado): https://developer.apple.com/programs/enroll/
- [G1] Google Play Console Help — requisitos de conta de organização (D-U-N-S obrigatório; obter "can take up to 30
  days"; sem exceções nem prorrogação): https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
- [G3] Android Developers — Android developer verification: https://developer.android.com/developer-verification
- [G4] The Hacker News — "Google Sets Sept. 30 Deadline for Android Developer Verification in Four Countries" (06/2026;
  fonte secundária, bloqueio vale para Play, lojas de terceiros e arquivo APK em aparelhos certificados):
  https://thehackernews.com/2026/06/google-sets-sept-30-deadline-for.html
- Preços de Supabase, Resend, Apple, Google Play e Expo: `comunidade/00-DECISOES.md` [P1]–[P5] (acesso 2026-09-21).
- Exigências de loja e lei: `docs/technical/MOBILE_STORE_REQUIREMENTS.md` (verificado 2026-09-07) e
  `docs/research/STORES_LEGAL_RESEARCH.md`. **Políticas de loja mudam: reverificar antes de cada envio.**

**Não confirmado:** prazo de verificação das contas Apple e Google como Organização; isenção da taxa Apple para
entidades sem fins lucrativos no Brasil; situação da marca "Lagoinha" no INPI; se o feed de grupo escapa da
classificação "social media"; comportamento exato do bloqueio de 30/09 para builds de desenvolvimento instalados
antes dessa data.
