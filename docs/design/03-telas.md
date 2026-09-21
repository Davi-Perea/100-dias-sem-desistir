# Inventário de telas

> Parte do pacote de design. Índice em [README.md](README.md).
> Levantado do código em 2026-09-20; a fonte da verdade continua sendo o repositório.

---

## FRENTE 3 — Inventário de telas

Levantado lendo `mobile/src/app/**` (25 rotas + 3 layouts) e `docs/technical/DESIGN_IMPLEMENTATION.md` §1.
Tudo abaixo é o que o código faz hoje. Nenhum arquivo foi alterado.

**Aviso sobre a fonte documental:** `DESIGN_IMPLEMENTATION.md` é de 2026-09-07 e mapeia só as telas do handoff original. Sete rotas foram criadas depois dele e **não têm nome de handoff**: `/intercessao/[day]`, `/proposito`, `/ministerio`, `/lembrete`, `/conta`, `/admin`, `/dev`. Além disso o §6.3 daquele documento afirma que "tudo continua rodando sobre fixtures DEV" — **isso está desatualizado**: o app hoje embarca o material real da igreja (ver seção B).

---

### 0. Como a navegação é montada

| Peça | Arquivo | O que faz |
|---|---|---|
| Stack raiz | `mobile/src/app/_layout.tsx` | Registra todas as rotas contextuais, define header nativo (fundo = `colors.background`, sem sombra, botão "Voltar"), segura a primeira pintura até as fontes carregarem (`return null`), e aplica o **portão de onboarding** |
| Abas | `mobile/src/app/(tabs)/_layout.tsx` | Quatro abas com `GlassTabBar`; nenhuma aba tem header — cada tela desenha o próprio cabeçalho |
| Onboarding | `mobile/src/app/onboarding/_layout.tsx` | Stack sem header, animação `slide_from_right` |

**Portão de onboarding** (`useOnboardingGate`): se `settings.onboardingCompleted === false` e a pessoa não está em `/onboarding`, o app faz `router.replace('/onboarding')`. Se já completou e está no onboarding, `replace('/')`. Ou seja: na primeira abertura **não existe** caminho para o app sem passar pelas 5 telas de onboarding.

**Abas (4):** Início (ícone `home`), Jornada (`flag`), Juntos (`users`), Você (`person`). Ícone **e** rótulo sempre visíveis; a barra é de vidro, flutua sobre o conteúdo e tem a altura **medida** (cresce com fonte grande) — a cena reserva esse espaço embaixo.

**Apresentação das rotas contextuais:**

| Apresentação | Rotas |
|---|---|
| Sem header, tela cheia | `/dia/[day]`, `/intercessao/[day]`, `/reader/[day]`, `/grupo/[id]` (usam `TopBar` próprio) |
| Modal | `/reflexao/[day]`, `/lembrete` ("Lembrete de leitura"), `/conta` ("Conta"), `/dev` ("Painel de desenvolvimento") |
| Modal de tela cheia | `/marco/[day]` |
| Header nativo com título | `/ministerio` "Meu ministério", `/proposito` "Sobre o propósito", `/reflexoes` "Minhas reflexões", `/jejum` "Meu jejum", `/aparencia` "Aparência e acessibilidade", `/ajuda` "Ajuda", `/admin` "Administração" |

**Tons de fundo de tela** (`Screen tone=`): `default` (fundo padrão) · `warm` (`surfaceWarm`) em Juntos, Dia, Intercessão, Grupo · `reader` em `/reader` · `ink` (`#111111`) no Marco do Dia 100 e no Modo altar · `yellow` (amarelo da marca) nos marcos 7/25/50/75.

---

### 1. Mapa de rotas

| # | Rota | Arquivo (`mobile/src/app/…`) | Tipo | Nome no handoff |
|---|---|---|---|---|
| 1 | `/` | `(tabs)/index.tsx` | **aba** (Início) | 02 Início (antes de ler) · 03 (concluído) · e1 · e2 |
| 2 | `/jornada` | `(tabs)/jornada.tsx` | **aba** | 05 Jornada · e3 |
| 3 | `/juntos` | `(tabs)/juntos.tsx` | **aba** | 06 Juntos |
| 4 | `/voce` | `(tabs)/voce.tsx` | **aba** | 08 Você |
| 5 | `/onboarding` | `onboarding/index.tsx` | contextual | 01a Boas-vindas |
| 6 | `/onboarding/leitura` | `onboarding/leitura.tsx` | contextual | 01b Como você vai ler |
| 7 | `/onboarding/jejum` | `onboarding/jejum.tsx` | contextual | 01c Jejum |
| 8 | `/onboarding/lembrete` | `onboarding/lembrete.tsx` | contextual | 01d Lembrete |
| 9 | `/onboarding/pronto` | `onboarding/pronto.tsx` | contextual | 01e Tudo pronto |
| 10 | `/reader/[day]` | `reader/[day].tsx` | contextual | 04 Leitor |
| 11 | `/dia/[day]` | `dia/[day].tsx` | contextual | 05b Tela do Dia |
| 12 | `/intercessao/[day]` | `intercessao/[day].tsx` | contextual | — (posterior ao handoff) |
| 13 | `/reflexao/[day]` | `reflexao/[day].tsx` | contextual (modal) | 09 Minha reflexão |
| 14 | `/marco/[day]` | `marco/[day].tsx` | contextual (modal cheio) | 10 Marco Dia 25 · 11 Dia 100 |
| 15 | `/grupo/[id]` | `grupo/[id].tsx` | contextual | 07 Grupo + folha de líder |
| 16 | `/proposito` | `proposito.tsx` | contextual | — |
| 17 | `/ministerio` | `ministerio.tsx` | contextual | — |
| 18 | `/reflexoes` | `reflexoes.tsx` | contextual | apoio (citada em Você) |
| 19 | `/jejum` | `jejum.tsx` | contextual | apoio (citada em Você) |
| 20 | `/aparencia` | `aparencia.tsx` | contextual | apoio (citada em Você) |
| 21 | `/ajuda` | `ajuda.tsx` | contextual | apoio (citada em Você) |
| 22 | `/lembrete` | `lembrete.tsx` | contextual (modal) | — |
| 23 | `/conta` | `conta.tsx` | contextual (modal) | — |
| 24 | `/admin` | `admin.tsx` | contextual | — |
| 25 | `/dev` | `dev.tsx` | contextual (modal) | — (não é produto) |

Fases da campanha usadas nos estados: `before_start` (antes de 23/09/2026), `running`, `finished` (depois do Dia 100). Datas aparecem sempre como **dd/mm/aaaa**.

---

### 2. Rota por rota

#### 1. `/` — Início (aba)
`(tabs)/index.tsx` · handoff 02 / 03 / e1 / e2 · tom `default`

Tela do dia oficial da igreja: diz em que dia a igreja está, qual é o tema, o que se lê hoje, e oferece concluir a leitura. É também o lugar onde entram o jejum privado, o altar das 12h30 e a linha de progresso coletivo.

**Blocos, na ordem (fase `running` / `finished`):**
1. `BrandHeader`: pomba + "100 dias na Palavra" + botão de conta à direita (avatar com iniciais se houver e-mail; círculo neutro com ícone de pessoa se não)
2. `DevContentBanner` (aviso de conteúdo — ver seção B)
3. `OfflineBanner` — **só** se `session.degraded`
4. Módulo de retomada (e2), só se `gapDays >= 3`: "Que bom ter você de volta." + "N dias ficaram para trás e continuam abertos. Você pode retomar por onde quiser."
5. `DayHeadline`: "Dia N" em 84px + "de 100" alinhado pela base
6. `HundredDayRuler` (régua dos 100 dias)
7. Linha de status: à esquerda "X concluídos · Y em aberto"; à direita "Igreja no Dia N" ou, encerrada, "Jornada encerrada · 100 dias"
8. Filete (`Rule`)
9. Cap "Tema de hoje" (encerrada: "Tema do dia 100") → `SpherePill` do monte → título do tema com realce amarelo na palavra que **vem do dado** (`theme_highlight`)
10. Resumo da leitura: rótulo 22px ("Gênesis 1–12") + detalhe ("12 capítulos · ~36 min"). Sem leitura: "Nenhuma leitura definida para este dia."
11. Cap "Versículo-base" + referência (só a referência, nunca o texto)
12. Cap "Motivos de oração" + lista com marcadores (uma linha por motivo do guia)
13. **Bloco de ação**, em dois estados:
    - *aberto*: botão primário "Ler agora" (ou "Concluir leitura" se a pessoa lê na própria Bíblia) · sublinhado "Vou ler na minha Bíblia" (ou "Ler aqui no app") · contornado "Intercessão do dia"
    - *concluído*: círculo com check + "Leitura de hoje concluída" · legenda "… · lido aqui no app / lido na sua Bíblia ·" + "Desfazer" · Cap "Minha reflexão · só você vê" + botão "Escrever/Editar minha reflexão" · contornado "Intercessão do dia"
14. Linha "Meu jejum" com caixa "Cumpri meu propósito hoje" — só se `fastingEnabled`
15. Linha "Altar das 12h30": "Hoje conduz: {ministério} · {nomes, se autorizados}" (encerrada: "Conduziu no Dia 100: …") + "Monte do dia · {monte}"
16. Linha de progresso coletivo: "Progresso da igreja" + motivo da indisponibilidade

**Ações:** abrir leitor · concluir/desfazer o dia · trocar o modo de leitura · abrir reflexão · abrir intercessão · marcar jejum · abrir conta.
**Efeito automático:** ao atingir um marco não visto, empurra `/marco/[day]`.

**Estados:** carregando (`StateView` "Carregando…") · **antes da campanha** (tela própria, ver abaixo) · em curso · encerrada (mesmo layout, rótulos mudam) · dia aberto vs concluído · retomada após 3+ dias · sem conta (avatar neutro) · sem internet/degradado (faixa preta) · progresso coletivo indisponível.
**Não tem:** estado de erro nem de vazio — o dataset é embarcado e lido de forma síncrona.

**Antes da campanha (e1), tela separada:** BrandHeader → banner → "Faltam **N dias**" (52px, realce amarelo) + "A igreja começa em 23/09/2026" → régua inativa → "Dia 1 · 23/09/2026" / "Dia 100 · 31/12/2026" → dois botões contornados lado a lado: "Ajustar lembrete" e "Entrar no grupo". **Nenhum conteúdo do Dia 1 é revelado.**

---

#### 2. `/jornada` — Jornada (aba)
`(tabs)/jornada.tsx` · handoff 05 · tom `default`

Trilho vertical dos 100 dias, com data e monte à esquerda, o trilho no centro e o rótulo do dia à direita. Abre onde a igreja está, não no Dia 1.

**Blocos:** BrandHeader → `DevContentBanner` compacto → "Dia N" 72px + "de 100" → lista virtualizada de linhas → rodapé "Comprimir a linha" (só quando expandida).

**Linha de dia:** esquerda = data + monte; centro = segmento + nó; direita = "Dia N" (hoje em 22px), rótulo de estado ou nome do marco, e — quando é dia do ministério escolhido — ponto amarelo + "Seu ministério conduz o altar".
**Nós têm forma própria, não só cor:** hoje = pomba de 78px; Dia 100 = círculo com bandeira; marco não concluído = círculo com o número; concluído = círculo cheio com check; em aberto = círculo vazado de traço 2,5; futuro = ponto cinza.
**Compressão:** ficam visíveis hoje ±3 dias, todos os marcos (7/25/50/75/100), as duas pontas, **todo dia em aberto** e todo dia do seu ministério. O resto vira uma linha de reticência com "N dias", clicável, que expande a lista inteira.

**Rótulos de estado:** "Concluído" · "Hoje" · "Em aberto" · "Em breve".
**Ações:** abrir `/dia/[day]` (dia liberado) · abrir a folha de dia trancado · expandir/comprimir.

**Estados:** carregando · comprimida vs expandida · **dia trancado (e3)**: folha modal com ícone de cadeado, "Abre em dd/mm/aaaa.", "A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado." e botão "Voltar para a Jornada".
**Antes da campanha:** o cabeçalho lê "Dia 1 de 100", nenhum nó é "hoje" (a pomba não aparece) e todos os dias mostram "Em breve". **Não há** estado de erro nem vazio; não há tratamento visual próprio para campanha encerrada além dos rótulos "Em aberto".

---

#### 3. `/juntos` — Juntos (aba)
`(tabs)/juntos.tsx` · handoff 06 · tom `warm`

A parte coletiva: o altar das 12h30, a orientação da igreja, o grupo e — quando existir fonte — o progresso da igreja. É a tela que hoje mais explicitamente diz o que ainda não existe.

**Cabeçalho comum a todos os estados:** "Juntos" (título de tela) + "100 Dias · Dia N" → banner compacto → **bloco Altar das 12h30** (Cap + "Hoje conduz: {ministério} · {nomes}" + `SpherePill` + "Dia N · dd/mm/aaaa") → **linha "Sobre o propósito"** com legenda "Orientação da igreja para os 100 dias" e chevron.

**Três estados de conteúdo, mutuamente exclusivos:**

| Condição | O que a tela mostra |
|---|---|
| Sem nuvem configurada **ou** sem sessão | Bloco "A parte coletiva pede uma conta" + explicação de que leitura, progresso, jejum e reflexões funcionam sem conta. Com nuvem configurada: botão "Entrar com meu e-mail". **Sem** nuvem: legenda "Esta versão do aplicativo ainda não está ligada ao servidor da igreja." (é o caso deste checkout) |
| Com conta, sem grupo | Cap "Escolha seu grupo" + lista de grupos (nome, descrição, botão "Entrar neste grupo"). Vazio: "Nenhum grupo disponível no momento." Erro: linha em vermelho |
| Com conta e grupo | (a) número coletivo: hoje cai no bloco "Progresso da igreja" + motivo (o número de 52px do handoff só apareceria com fonte real); (b) **recado fixado** — bloco preto com pomba branca, cap amarelo "Recado da liderança" e texto "Ainda não há recado publicado. Quando a liderança do seu grupo publicar, ele aparece aqui."; (c) linha do grupo (nome + "Seu grupo" / "Você lidera este grupo"); (d) Cap "Insights de hoje" + "Os insights da igreja ainda não estão disponíveis nesta versão. Sua reflexão continua privada de qualquer forma." |

**Estados do bloco do altar:** antes da campanha "O altar começa em 23/09/2026" + "Dia 1 conduz: …" (sem abrir leitura); em curso "Hoje conduz: …"; encerrada "Dia 100 conduziu: …"; escala ausente "A escala deste dia ainda não foi informada."
**Estados gerais:** carregando (sessão) · sem conta · com conta sem grupo (lista carregando / vazia / com erro) · com conta e grupo · progresso coletivo indisponível.

---

#### 4. `/voce` — Você (aba)
`(tabs)/voce.tsx` · handoff 08 · tom `default`

Progresso pessoal e todas as preferências, agrupadas por cap. É a porta de entrada das telas de apoio.

**Blocos:** identidade (avatar ou círculo vazio + nome derivado do e-mail ou "Sua jornada" + "{grupo} · líder" ou "Sem conta conectada") → bloco "Meu progresso" com "X de 100 dias" e a pomba voando (`FlyingDove`) → grupos de linhas:

| Grupo | Linhas (rótulo → valor) |
|---|---|
| Minha jornada | "Minhas reflexões" → contagem · "Meu jejum" → "N dias" ou "Desligado" |
| Comunidade | "Meu ministério" → nome ou "Escolher" · "Altar de hoje" → ministério de hoje ou "—" |
| Preferências | "Lembretes" → "07:00"/"Sem lembrete" · **caixa** "Aviso do altar das 12h30" (+ legenda "Um aviso local por dia com quem conduz o altar. Só neste aparelho.") · "Leitura" → "Aqui no app"/"Minha Bíblia"/"Vou alternar" · "Aparência e acessibilidade" |
| Liderança (só líder/admin, cap com realce) | "Ferramentas de líder" → nome do grupo · "Administração" (só admin) |
| Conta | "Conta e privacidade" → e-mail ou "Sem conta" · "Ajuda" |
| — | Botão sublinhado "Painel de desenvolvimento" — **só** em build de desenvolvimento |

**Estados:** carregando · com conta vs sem conta · com/sem ministério · líder vs membro vs admin · "Altar de hoje" = "—" fora da campanha · aviso quando a permissão de notificação é negada (ou na web): a caixa **volta para desligada** e o motivo aparece abaixo.

---

#### 5–9. Onboarding (5 telas)

| Rota | Handoff | Conteúdo e ações | Estados |
|---|---|---|---|
| `/onboarding` | 01a | Pomba + "Lagoinha" · título de display "**100 dias.** / Uma igreja. / Uma jornada." · parágrafo "A igreja inteira lê a mesma coisa, no mesmo dia…" · botões "Começar" e "Já tenho conta" | Único. O texto rola em fonte grande |
| `/onboarding/leitura` | 01b | Casca `OnboardingStep` (barra de passos + "Passo 1 de 3") · "Como você pretende ler na maioria dos dias?" · 3 opções (Ler aqui no app / Usar minha Bíblia / Vou alternar) · legenda "Ler na Bíblia impressa ou em outro aplicativo não é uma experiência inferior…" · rodapé fixo "Continuar" | "Continuar" **desabilitado** até escolher |
| `/onboarding/jejum` | 01c | "Passo 2 de 3" · "Você vai participar do propósito de jejum?" · subtítulo "Não perguntamos do que você jejua. Isso é entre você e Deus…" · 2 opções (Sim, vou participar / Ainda não) · legenda de privacidade | Nenhuma escolha é obrigatória |
| `/onboarding/lembrete` | 01d | "Passo 3 de 3" · "Quando você quer ser lembrado da sua leitura?" · 4 escolhas de horário + "Sem lembrete" · rodapé "Continuar" | Permissão negada / web: mostra o motivo, desliga o lembrete e o botão passa a **"Continuar sem lembrete"** — nunca prende ninguém |
| `/onboarding/pronto` | 01e | Pomba de 96px · "Tudo pronto." · "Hoje é o **Dia N** de 100" ou "A jornada da igreja começa em breve" · 3 linhas de confirmação com check · botão "Começar o Dia N" / "Ir para o Início" | Antes da campanha vs em curso |

O onboarding **não mostra** o aviso de conteúdo em nenhuma das 5 telas.

---

#### 10. `/reader/[day]` — Leitor
`reader/[day].tsx` · handoff 04 · tom `reader`

Leitura bíblica do dia, um capítulo por página. O texto fica sempre em superfície opaca; vidro só na barra de topo.

**Blocos:** barra de topo de vidro (fechar · "{Livro} {Cap}" + "Dia N · capítulo X de Y" · botão de tamanho de texto) + filete de progresso de 3px com preenchimento amarelo → cabeça do capítulo (nome do livro em cap + "DEV · texto segue o tamanho do sistema") → numeral do capítulo em 44px → **caixa DEV FIXTURE** → versículos (número pequeno + texto) → aviso de direitos → rodapé fixo: quadrado "capítulo anterior" + botão primário ("Próximo capítulo" / "Concluir leitura" / "Voltar") + sublinhado "Prefiro ler na minha Bíblia".

**Ações:** paginar capítulos · aumentar/diminuir a fonte (folha "Tamanho do texto", 14–30px) · concluir o dia · marcar como lido na própria Bíblia · voltar.
**Estados:** **dia trancado** (cadeado, "Abre em dd/mm/aaaa.", botão "Voltar") · **vazio** ("Leitura não encontrada" / "Este dia não tem leituras definidas.") · **carregando** a passagem · **erro** ("Não foi possível carregar" + mensagem + "Tentar de novo") · aviso de fixture DEV · último capítulo · dia já concluído.
Detalhe de implementação que afeta layout: a altura do rodapé é medida e devolvida à rolagem — em fonte grande o rodapé cresce e o fim do capítulo continua alcançável.

---

#### 11. `/dia/[day]` — Tela do Dia
`dia/[day].tsx` · handoff 05b · tom `warm`

Página de um dia específico da jornada, alcançada pela Jornada. Reúne os quatro caminhos do dia em blocos grandes com ícone.

**Blocos:** `TopBar` (voltar + botão "mais" à direita) → banner compacto → cabeça: Cap "Jornada da Bíblia" + "Dia N" 68px + "de 100" + `SpherePill`, e à direita a **mini-régua vertical de 96px** (dia anterior → pomba → dia seguinte) → legenda "Altar das 12h30 · conduz: {ministério} · {nomes}" → quatro blocos: **Leitura bíblica** ("Gênesis 1–12 · 12 capítulos · ~36 min", check quando concluído), **Intercessão do dia** ("{Monte} · {ênfase do dia}"), **Reflexão de hoje** ("Escrita · só você vê" / "Só você vê"), **Meu jejum** (só se ativado; alterna ali mesmo) → botão "Ler agora" / "Reler este dia" → sublinhado "Marcar como concluído" (só se aberto).

**Estados:** carregando · **dia inválido** ("Dia não encontrado" / "Este dia não faz parte da jornada." + "Voltar para a Jornada") · **dia trancado** (mesma copy do cadeado) · aberto vs concluído · com/sem jejum.
**Nota:** o botão "mais" da barra tem rótulo "Mais opções deste dia" mas abre direto a **reflexão** — não existe menu.

---

#### 12. `/intercessao/[day]` — Intercessão do dia
`intercessao/[day].tsx` · **sem nome de handoff** · tom `warm` (Modo altar: `ink`)

Roteiro da reunião das 12h30 para quem intercede em casa, com os cinco passos da orientação da igreja. Tem um segundo modo, "Modo altar", para quem conduz a reunião com o telefone apoiado.

**Blocos (modo normal):** `TopBar` → banner compacto → Cap "Intercessão do dia · Dia N · dd/mm/aaaa" + `SpherePill` + ênfase do dia (título) + legenda "Altar das 12h30 · conduz: …" → **cinco blocos de passo** (círculo com o numeral + título + descrição, texto da igreja). No passo 3 entram Cap "Versículo-base" + referência + sublinhado "Abrir no leitor"; no passo 4 entram o monte, a ênfase e a lista de motivos de oração → botão primário "Modo altar".

**Modo altar (estado, não rota):** fundo tinta, "Passo N de 5" em amarelo, pontos de progresso, título 34px, texto 19px, tela mantida acesa, gesto de voltar do iOS desativado, voltar do Android sai do modo em vez da tela, cada passo anunciado para leitor de tela.

**Estados:** carregando · **dia não encontrado** · **dia trancado** ("A intercessão de cada dia abre no dia oficial da igreja…") · normal · Modo altar · sem passos (o botão "Modo altar" não aparece).
A rota tem fallback para ser aberta sem pilha atrás (voltar cai no Início) — pensada para lembrete/deep link, **que hoje não mandam destino** (ver seção A).

---

#### 13. `/reflexao/[day]` — Minha reflexão (modal)
`reflexao/[day].tsx` · handoff 09 · tom `default`

Editor da reflexão privada do dia, guardada só no aparelho. Regra de produto aplicada literalmente: a reflexão privada **nunca** pré-preenche um texto público.

**Blocos:** barra própria ("Cancelar" · "Dia N" · "Excluir" em vermelho) → cadeado + Cap "Minha reflexão · só você vê" → "O que ficou com você hoje?" → campo de texto multilinha (mín. 220px, 19px/30,4, placeholder "Escreva à vontade.") → filete → legenda "Um insight começa em branco e sua reflexão continua privada. Compartilhar abre quando a área da comunidade estiver conectada." → botão contornado **"Compartilhar um insight" desabilitado** → rodapé fixo: Cap "{leitura do dia} · salva neste aparelho" + botão "Salvar para mim".

**Ações:** escrever · salvar · excluir (com alerta de confirmação "Esta reflexão será apagada deste aparelho.") · cancelar.
**Estados:** dia inválido ("Dia não encontrado") · carregando · vazio (foco automático no campo) · com texto (botão Excluir habilitado) · salvando · dia ainda trancado (a referência da leitura não aparece) · compartilhar sempre desabilitado.

---

#### 14. `/marco/[day]` — Marco (modal de tela cheia)
`marco/[day].tsx` · handoff 10 (Dia 25) e 11 (Dia 100)

Tela de celebração de um marco pessoal (7/25/50/75/100). Sem confete, sem pontos, sem XP: é um momento de leitura, não recompensa de jogo.

**Blocos:** Cap ("Marco · N de 100 dias lidos" ou, na chegada, "Chegada · Dia 100 · 31/12/2026") + pomba de 46px → **numeral gigante** (236px nos marcos, 190px na chegada; cede tamanho para caber na largura e com fonte grande) → título (rótulo do marco; na chegada, a ênfase do Dia 100 e o rótulo sobe para cap) → frase de celebração → **só na chegada**: referência do versículo-base em itálico → régua dos 100 dias → **só na chegada**: três números reais e locais (dias lidos · reflexões · dias de jejum) → botões: marco = "Continuar a jornada" + "Guardar este marco" (vira "Marco guardado em Você"); chegada = "Guardar minha jornada" (amarelo) + "Ver minhas reflexões".

**Duas aparências:** marcos intermediários = fundo **amarelo**, tinta `#111111`; chegada (Dia 100) = fundo **tinta** `#111111`, numeral amarelo, textos brancos (`#FFFFFF` / `rgba(255,255,255,0.78)`).
**Estados:** "Marco não encontrado" (dia fora de 7/25/50/75/100) · marco · chegada · marco já guardado.
**Atenção:** esta tela mostra a ênfase e o versículo do material da igreja e **não** exibe aviso de conteúdo.

---

#### 15. `/grupo/[id]` — Grupo
`grupo/[id].tsx` · handoff 07 · tom `warm`

Página do grupo com três abas internas e a folha de ferramentas de líder. A lista de membros é real e filtrada pelo servidor (RLS): quem não lidera recebe zero linhas.

**Blocos:** `TopBar` (com botão "mais" = Ferramentas de líder, só para líder/admin) → botão contornado "Ferramentas de líder" (idem) → nome do grupo + "N membros · você lidera este grupo" → faixa de progresso do grupo (hoje: só o motivo da indisponibilidade) → **abas internas** "Direção · Insights · Membros" (sublinhado amarelo de 3px na ativa) → conteúdo da aba:
- **Direção**: Cap "Direção de hoje · Dia N" + "A direção do dia ainda não está disponível nesta versão. Quando a liderança publicar, ela aparece aqui."
- **Insights**: "Os insights ainda não estão disponíveis nesta versão. Sua reflexão continua privada de qualquer forma."
- **Membros**: linhas com avatar, nome, "Líder"/"Membro" e "Remover" (só líder/admin); vazio = "Você só vê a lista de membros dos grupos que lidera. Esta restrição é aplicada pelo servidor."; nota final sobre promoção de papel ser ação administrativa auditada.

**Folha de líder (modal):** aviso de visibilidade + "Estas ferramentas ainda não foram construídas…" + **quatro linhas desabilitadas a 50% de opacidade**: "Publicar aviso", "Publicar direção do dia" (valor "Dia N+1"), "Enviar lembrete ao grupo" ("no máximo 2 por semana"), "Moderar insights" (pílula "em breve") + "Fechar".
**Estados:** carregando · **sem conta** ("Conta necessária" / "Entre na sua conta para ver esta página.") · erro (linha vermelha) · membro vs líder/admin · membros carregando/vazio/lista · folha aberta.

---

#### 16. `/proposito` — Sobre o propósito
`proposito.tsx` · **sem nome de handoff** · header nativo "Sobre o propósito"

Reproduz a orientação da igreja sobre os 100 dias, palavra por palavra, só com as seções públicas. Nenhum texto desta tela é escrito pelo app — a página só decide a forma.

**Blocos:** banner de conteúdo → Cap "Sobre o propósito" + subtítulo da igreja (24px) → parágrafos de introdução → seções públicas, cada uma com filete + cap de título + blocos tipados: parágrafo, marcador, **passo** (círculo com numeral + título + descrição) e **citação bíblica** (barra à esquerda, itálico, "…referência · citação da orientação da igreja") → legenda final: "Orientação da igreja, palavra por palavra. Fica de fora só o passo a passo de preparação pedido a quem conduz o altar."

**Ações:** apenas rolar e voltar. **Estados:** um só (conteúdo embarcado, síncrono) + o banner de conteúdo.

---

#### 17. `/ministerio` — Meu ministério
`ministerio.tsx` · **sem nome de handoff** · header "Meu ministério"

Escolha local do ministério da pessoa, sem conta e sem papel. Serve para destacar na Jornada os dias em que aquele ministério conduz o altar e avisar na véspera, às 19h.

**Blocos:** banner compacto → Cap "Meu ministério" + explicação → bloco "Seus dias no altar" (linhas "Dia N · dd/mm/aaaa · {Monte}"), só se já houver escolha → aviso de permissão, se houver → lista de escolha: "Não faço parte de um ministério" + um item por ministério da escala, com descrição derivada do dado ("Dias 3 e 47 · 25/09 e 08/11", "23 dias · a cada 4 a 5 dias, a partir de 23/09").

**Ações:** escolher/limpar ministério (agenda os avisos de véspera na hora).
**Estados:** carregando · sem escolha · com escolha · aviso quando a permissão é negada ou na web (a escolha permanece — destacar dias não depende de aviso).
Nomes de pessoas da escala **nunca** aparecem aqui; só o nome do ministério.

---

#### 18. `/reflexoes` — Minhas reflexões
`reflexoes.tsx` · apoio · header "Minhas reflexões"

Lista das reflexões privadas já escritas. Local, sem nuvem e sem compartilhamento.

**Blocos:** Cap "Minhas reflexões · só você vê" → um bloco por dia ("Dia N" + duas linhas do texto).
**Ações:** abrir a reflexão de um dia.
**Estados:** carregando · **vazio** ("Nada escrito ainda" / "Suas reflexões aparecem aqui depois que você escrever a primeira." + "Voltar") · lista.

---

#### 19. `/jejum` — Meu jejum
`jejum.tsx` · apoio · header "Meu jejum"

Participação no propósito de jejum e o histórico de dias cumpridos. O app nunca pergunta do que a pessoa jejua, por quanto tempo ou por quê.

**Blocos:** Cap "Meu jejum · só você vê" → linha "Participar do propósito de jejum" + legenda + caixa → filete → "N dias cumpridos" (24px) → lista "Dia N → dd/mm/aaaa".
**Ações:** ligar/desligar a participação.
**Estados:** carregando · ligado/desligado · **vazio** ("Nada registrado ainda.") · com histórico.

---

#### 20. `/aparencia` — Aparência e acessibilidade
`aparencia.tsx` · apoio · header "Aparência e acessibilidade"

Modo de leitura, tamanho do texto e uso de dados. É também onde o app relata (sem controlar) o que vem do aparelho.

**Blocos:** Cap "Como eu leio" + 3 opções → Cap "Tamanho do texto de leitura" + amostra real + botões "Diminuir"/"Aumentar" (14–30px) + legenda sobre a fonte do sistema → filete → Cap "Do seu aparelho" + "Tema claro/escuro, seguindo o sistema. Reduzir movimento está ligado/desligado…" → filete → linha "Enviar dados de uso anônimos" + "Desligado por padrão. Nunca inclui reflexões, jejum ou textos que você escreve." + caixa.
**Estados:** carregando · resto é sempre visível. Tema **não é escolhível** no app: segue o sistema.

---

#### 21. `/ajuda` — Ajuda
`ajuda.tsx` · apoio · header "Ajuda"

Explica a regra do dia oficial, o que fica privado e de onde vem o conteúdo. É a única tela de produto que imprime a proveniência do dataset.

**Blocos:** banner de conteúdo → Cap "Como funciona" + parágrafo sobre o dia oficial não retroceder + linha "Sobre o propósito" → filete → Cap "O que fica só com você" + parágrafo de privacidade → filete → Cap "Conteúdo e direitos": "Fonte editorial: {source_name}. Situação dos direitos: {rights_status}." + o aviso de copyright do provider de texto.
**Estados:** um só. **Atenção de redação:** `rights_status` é impresso **cru**, como no dado — hoje sai literalmente "pending_authorization".

---

#### 22. `/lembrete` — Lembrete de leitura (modal)
`lembrete.tsx` · **sem nome de handoff** · header "Lembrete de leitura"

Escolhe o horário do lembrete diário local. Não depende de conta nem de conexão.

**Blocos:** "Quando você quer ser lembrado?" + explicação → cartões de aviso condicionais → três opções (manhã/tarde/noite) + "Sem lembrete" → "Escolher horário" com seis botões de horário (05:30, 06:00, 12:00, 18:30, 21:30, 22:00) → linha de status → cartão "N agendamento(s) ativo(s) no sistema" + "Testar agora (5 s)".
**Estados:** carregando · **web** ("Notificações locais não são suportadas na web. Teste em um aparelho iOS ou Android.") · **emulador** ("Emuladores podem não exibir notificações. Prefira um aparelho físico.") · permissão negada (o slot volta para "Sem lembrete" e o motivo aparece) · confirmação ("Lembrete diário às 07:00.").
**Nota:** esta tela tem cara de painel técnico ("agendamento(s) ativo(s)", "Testar agora (5 s)") — é a mais provável de precisar de revisão de produto.

---

#### 23. `/conta` — Conta (modal)
`conta.tsx` · **sem nome de handoff** · header "Conta" → "Criar ou entrar na conta" / "Confirmar código"

Entrada por e-mail + código de 6 dígitos, sem senha. Só aparece quando a pessoa pede algo que exige servidor; nunca na abertura do app.

**Blocos, passo 1:** "Sua conta" + motivo (texto muda se `reason=group`) → cartão "Continua sem conta" ("Leitura, progresso, jejum, reflexão privada e lembrete seguem funcionando neste aparelho, inclusive sem internet.") → campo de e-mail → "Enviamos um código de 6 dígitos. Sem senha." → botão "Enviar código".
**Passo 2:** "Digite o código" + campo de 6 dígitos (28px, espaçamento 8) → "Confirmar" → "Reenviar em Ns"/"Reenviar código" → "Usar outro e-mail".
**Estados:** **não configurada** ("Conta indisponível nesta versão" / "Esta build não está conectada ao servidor. Sua jornada pessoal continua funcionando por completo.") — é o estado deste checkout · e-mail · código · erro (linha vermelha) · botão desabilitado até o e-mail/código serem válidos · contagem de reenvio.

---

#### 24. `/admin` — Administração
`admin.tsx` · **sem nome de handoff** · header "Administração"

Superfície administrativa mínima: promover/rebaixar liderança de grupo. Não é painel; quem valida é o servidor.

**Blocos:** lista de grupos (cartões) → ao escolher: nome do grupo + "Toda alteração de papel é registrada na auditoria." + lista de membros com botão "Tornar líder"/"Remover liderança" + "Voltar aos grupos".
**Estados:** carregando · **não é admin** ("Área restrita" / "Esta área é de administradores. O servidor recusa qualquer ação administrativa de quem não é.") · lista de grupos · grupo aberto (membros carregando/lista) · erro · alerta de confirmação.
Esta tela usa componentes mais antigos (`Card`, `Divider`, `fontWeight: '600'`) e **não** segue o sistema visual do handoff como as demais.

---

#### 25. `/dev` — Painel de desenvolvimento (modal)
`dev.tsx` · **não é produto** · header "Painel de desenvolvimento"

Ferramentas internas: trocar o dataset ativo, simular o dia oficial, validar o conteúdo, apagar dados locais e inspecionar o armazenamento. O botão de entrada só existe em build de desenvolvimento, mas **a rota está registrada sempre**.

**Blocos:** cartão do dataset ativo (nome, `rights_status`, versão, estado, `DEV_ONLY`, nº de dias, data de início, origem, "nomes de líderes: ocultos até autorização") + botões "Conteúdo real (guia)" / "Fixtures fictícias" → "Validar dataset" (imprime desenvolvimento vs produção) → "Simular o dia oficial" (1, 7, 17, 25, 50, 75, 100, "Data real") → "Simular estados" (duas caixas) → "Dados locais" (apagar progresso · apagar jejum e reflexões · refazer onboarding · apagar tudo) → eventos de analytics registrados → dump do AsyncStorage.
**Estados:** carregando · painéis sempre visíveis.

---

### A. Telas que ainda são fixture/DEV ou dependem de dado que o produto não tem

| Onde | O que é hoje |
|---|---|
| **`/reader/[day]` — todo o texto bíblico** | Provider de desenvolvimento (`devBibleProvider`): nome "Texto de exemplo (desenvolvimento)", sigla **"DEV"**, `isDevPlaceholder: true`. **Nenhum versículo na tela é texto bíblico** — é texto neutro gerado para o projeto. Por isso a tela mostra a caixa "DEV FIXTURE — NOT PRODUCTION CONTENT". Bloqueado pelo **Launch Gate 1** (licença de tradução) |
| **Números coletivos** (Início: linha da igreja · Juntos: número de 52px e faixa · Grupo: barra de progresso) | `community/communityState.ts` devolve **sempre** `offline` (sem nuvem) ou `unavailable`. Nenhum número coletivo jamais aparece. O handoff mostrava "1.812 pessoas já leram hoje" e "64% da igreja"; o app troca por um motivo escrito |
| **Juntos — recado fixado** | Bloco preto com a marca e copy de estado vazio fixa no código. Não existe publicação de recado |
| **Juntos e Grupo — insights** | Só o parágrafo de indisponibilidade. Sem feed, sem reação "Amém", sem moderação |
| **Grupo — aba Direção** | Só o parágrafo de indisponibilidade |
| **Grupo — folha de líder** | As quatro linhas do handoff existem **desabilitadas** (opacidade 0,5) com o motivo à vista |
| **Reflexão — "Compartilhar um insight"** | Botão contornado permanentemente desabilitado |
| **Toda a área com conta** (`/conta`, lista de grupos em Juntos, `/grupo/[id]`, lista de membros, `/admin`) | Depende de `EXPO_PUBLIC_SUPABASE_URL` + `ANON_KEY`. **Este checkout tem só `.env.example`** → `isCloudConfigured() === false`. Consequência prática: `/conta` sempre mostra "Conta indisponível nesta versão"; Juntos para no bloco "A parte coletiva pede uma conta" **sem botão**; `/grupo/[id]` mostra "Conta necessária" e `/admin` mostra "Área restrita". Essas telas **nunca foram vistas com dado real** |
| **`/dev` inteiro** | Ferramenta interna. As duas caixas "Carregamento lento" e "Falha ao carregar" são **gravadas mas nunca lidas** por nenhuma tela — não produzem efeito. Ou seja: **não há como simular carregamento lento ou erro pelo painel** |
| **Estado "sem internet"** | **Não existe detecção de rede** (nenhum NetInfo no projeto). A faixa preta `OfflineBanner` aparece em **um único lugar** — o Início — e só quando a consulta de papel/grupo falha (`session.degraded`). Sem nuvem configurada, ela nunca aparece |
| **Lembretes → destino** | As notificações locais têm título e corpo, mas **nenhum dado de rota**. Tocar num lembrete só abre o app; não leva à Intercessão do dia, apesar de a tela ter fallback para isso |
| **Marca** | Os arquivos em `mobile/assets/brand/*.png` são PNGs extraídos do arquivo do cliente; o vetor oficial ainda não chegou |

**Distinção importante:** o **dataset dos 100 dias NÃO é fixture.** `mobile/content/100-dias-2026/dataset.json` tem `DEV_ONLY: false`, 100 dias, `source_type: original_church_content`, gerado por `scripts/convert-100-dias.mjs` a partir dos três `.docx` da igreja (com hashes SHA-256 registrados). As fixtures fictícias vivem em `src/journey/fixtures/devCampaign.ts` e só são carregadas por teste ou pelo painel DEV.

---

### B. Onde o app mostra aviso de conteúdo, e por quê

**Por quê:** `dataset.json` traz `rights_status: "pending_authorization"` e `leader_names_authorized: false`. Esse é o **Launch Gate 2**: falta a autorização escrita da igreja para publicar o guia e a escala no app. Em build de release o app **falha na abertura** se o conteúdo embarcado não passar no portão de produção; em build de desenvolvimento ele roda e avisa.

**Componente:** `DevContentBanner` (faixa com ícone de alerta, `accessibilityRole="alert"`). Três estados e dois tamanhos, com texto **exato**:

| Estado | Texto completo | Texto compacto |
|---|---|---|
| `pending` (situação de hoje) | "Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja para publicação. Não distribuir esta versão." | "Aguardando autorização da igreja." |
| `fixture` (painel DEV / testes) | "Conteúdo de desenvolvimento. Textos e cronograma são fictícios e não representam o plano da igreja." | "Conteúdo de desenvolvimento." |
| `authorized` | o componente não renderiza nada | — |

**Onde aparece:**

| Rota | Tamanho | Posição |
|---|---|---|
| `/` (Início) | completo | logo abaixo do BrandHeader — nos **dois** ramos (antes da campanha e em curso) |
| `/jornada` | compacto | abaixo do BrandHeader, antes do "Dia N" |
| `/juntos` | compacto | dentro do cabeçalho comum, antes do bloco do altar |
| `/dia/[day]` | compacto | abaixo da `TopBar` |
| `/intercessao/[day]` | compacto | abaixo da `TopBar` |
| `/ministerio` | compacto | primeiro elemento |
| `/proposito` | completo | primeiro elemento |
| `/ajuda` | completo | primeiro elemento |

**Dois avisos independentes, não confundir:**
1. **Conteúdo da igreja** (`DevContentBanner`, Gate 2) — as 8 rotas acima.
2. **Tradução bíblica** (Gate 1) — caixa própria, com borda, dentro do `/reader/[day]`: título "DEV FIXTURE — NOT PRODUCTION CONTENT" + "Texto de exemplo. Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida." Mais o aviso de copyright do provider no fim do capítulo. O leitor **não** mostra o banner de conteúdo da igreja.

**Onde o aviso NÃO aparece, apesar de haver conteúdo da igreja na tela:**
- `/marco/[day]` — mostra a ênfase e o versículo-base do Dia 100.
- `/reflexao/[day]` e `/reflexoes` — mostram a referência da leitura do dia.
- As 5 telas de onboarding.
- `/voce`, `/grupo/[id]`, `/jejum`, `/aparencia`, `/lembrete`, `/conta`, `/admin`.
(`/dev` tem sua própria prestação de contas, mais detalhada.)

**Efeito colateral de `leader_names_authorized: false`:** `altarForDisplay()` apaga `leaders_label` na fonte. Nas telas isso significa que "Hoje conduz: Intercessão/Bálsamo" aparece **sem** nomes de pessoas, em Início, Juntos, Dia e Intercessão. Quando a igreja autorizar, o mesmo componente passa a mostrar "· {nomes}" sem mudança de layout — o designer precisa prever a linha mais longa.

---

### C. Texto da igreja (não pode ser reescrito) vs texto do app (pode ser revisto)

#### C.1 Conteúdo da igreja — intocável

| Fonte | Campos | Telas que mostram |
|---|---|---|
| `content/100-dias-2026/dataset.json` (gerado do guia) | `title` (ênfase do dia), `theme` + `theme_highlight`, `sphere`, `key_verse_reference` (só a referência), `prayer_points`, `prayer_focus`, `readings[].canonical_reference`, `altar.ministry`, `altar.leaders_label` | Início, Jornada, Dia, Intercessão, Marco, Reader (referências), Ministério |
| idem, bloco `campaign` | título "100 Dias", subtítulo "Palavra • Consagração • Adoração • Intercessão", `start_date` 2026-09-23, 100 dias, fuso America/Sao_Paulo | Juntos (cabeçalho), todas as contagens de dia e datas |
| `content/100-dias-2026/proposito.json` (orientação) | subtítulo, parágrafos de introdução, seções públicas (parágrafos, marcadores, passos), os **cinco passos do fluxo** (título + descrição), citações bíblicas com referência | `/proposito` e `/intercessao/[day]` (os mesmos cinco passos, inclusive no Modo altar) |
| `src/journey/spheres.ts` | rótulos dos sete montes: Igreja, Família, Educação, Governo, Economia, Mídia e Comunicação, Artes e Entretenimento — o código declara que são "exatamente como o material da igreja escreve" | Início, Jornada, Dia, Intercessão, Ministério, Juntos |
| Escala (dentro do dataset) | nomes dos ministérios (39 no total, derivados do dado — nada digitado à mão) | `/ministerio`, e as linhas de altar |

**Caso único:** a **citação bíblica** dentro de `/proposito` é o único texto de tradução que o app exibe hoje. Ela aparece identificada como citação, com barra à esquerda e a referência ao lado. A tradução usada **ainda não foi informada pela igreja**, então a atribuição está incompleta.

#### C.2 Texto escrito pelo app — revisável

| Categoria | Exemplos exatos | Onde |
|---|---|---|
| Nomes de navegação | "Início", "Jornada", "Juntos", "Você"; "100 dias na Palavra" (lockup); títulos de header ("Meu jejum", "Aparência e acessibilidade", "Lembrete de leitura"…) | tab bar, cabeçalhos |
| Onboarding inteiro | "100 dias. / Uma igreja. / Uma jornada.", "A igreja inteira lê a mesma coisa, no mesmo dia…", "Não perguntamos do que você jejua. Isso é entre você e Deus.", "Tudo pronto." | 5 telas |
| **Marcos** | rótulos "Primeira semana", "Um quarto da jornada", "Metade do caminho", "Reta final", "Jornada completa" e as frases "Uma semana caminhando. O começo é a parte mais difícil.", "Cem dias. Você atravessou a jornada inteira." — tudo em `src/journey/milestones.ts`, **escrito pelo app** | `/marco/[day]`, rótulos na Jornada |
| Rótulos de estado do dia | "Concluído", "Hoje", "Em aberto", "Em breve" (nunca "falhou", nunca "perdeu a sequência") | Jornada, Dia |
| Dia trancado | "Abre em dd/mm/aaaa." + "A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado." (variante "A intercessão de cada dia…") | Jornada, Dia, Reader, Intercessão |
| Retomada | "Que bom ter você de volta." + "N dias ficaram para trás e continuam abertos. Você pode retomar por onde quiser." | Início |
| Indisponibilidade coletiva | "O progresso da igreja ainda não está disponível nesta versão." / "O progresso da igreja aparece quando sua conta estiver conectada." / "Ainda não há recado publicado…" / "Os insights… continuam privada de qualquer forma." | Início, Juntos, Grupo |
| Privacidade | "Minha reflexão · só você vê", "Meu jejum · só você vê", "Registro privado. Fica só neste aparelho.", "Suas reflexões, seu jejum e seu progresso ficam neste aparelho…" | Início, Reflexão, Jejum, Ajuda, Você |
| Avisos técnicos | o texto dos dois banners de conteúdo, "Sem internet. Sua leitura, progresso e reflexões continuam salvos.", "Carregando…", todos os títulos de vazio/erro | vários |
| Notificações | "Sua leitura de hoje" / "Um dia de cada vez. Vamos continuar a jornada."; "Amanhã é o dia do seu ministério"; "Altar das 12h30 · Dia N" / "Hoje conduz: …" | fora da tela |
| **Números derivados** | "~36 min" — estimativa do app (`MINUTES_PER_CHAPTER = 3`, ~200 palavras/min), sempre com "~". A contagem de capítulos é exata; o tempo **não é dado editorial** | Início, Dia |
| Formatos | datas "dd/mm/aaaa"; "Dia N de 100"; "Passo N de 5"; "Passo N de 3" | vários |
| Rótulo "Altar das 12h30" | a frase é escrita no app; o horário vem do material (ver incertezas) | Início, Juntos, Dia, Intercessão, Você |

**Regra estrutural que o designer precisa respeitar:** o realce amarelo do tema no Início vem do campo `theme_highlight` **do dado**. Se a palavra não estiver no tema, o app mostra o tema **inteiro sem realce** — ele nunca escolhe uma palavra por conta própria. O mesmo princípio vale para o resto: onde falta dado, o app diz que falta, em vez de preencher.


---

## O que ficou em aberto neste levantamento

- O handoff original (`Waiting on design decisions.zip` → `100 Dias Lagoinha.dc.html`) não foi aberto nesta passagem. Os nomes de tela do handoff vêm todos da tabela §1 de docs/technical/DESIGN_IMPLEMENTATION.md, que é de 2026-09-07. Sete rotas criadas depois (/intercessao/[day], /proposito, /ministerio, /lembrete, /conta, /admin, /dev) simplesmente não têm nome de handoff — não é que eu não tenha achado.
- DESIGN_IMPLEMENTATION.md §6.3 está desatualizado: afirma que 'tudo continua rodando sobre fixtures DEV' e chama o Gate 2 de 'autorização do plano 42360'. O código de hoje embarca o material real da igreja com rights_status = pending_authorization, e o plano 42360 está superado. Se o designer receber aquele documento, esse parágrafo vai confundir.
- Jornada antes da campanha: o cabeçalho lê 'Dia 1 de 100', nenhum nó é 'hoje' (a pomba não aparece em lugar nenhum) e, ao mesmo tempo, o segmento superior do trilho do Dia 1 já está amarelo. Não consegui determinar se essa combinação é intencional ou um efeito colateral do clamp do dia oficial.
- 'Altar das 12h30': o dataset não tem campo de horário — o '12h30' está escrito no código da interface. Não abri os .docx originais da igreja, então não posso afirmar se o horário (e a forma de escrevê-lo) vem do material ou foi redigido pelo app.
- SPHERE_LABEL e os cinco passos do fluxo estão declarados em comentário como 'exatamente como o material da igreja escreve' / 'na ordem da orientação'. Confirmei que os passos vêm de proposito.json (dado), mas os rótulos dos montes estão digitados em src/journey/spheres.ts — a fidelidade ao material é uma afirmação do comentário, que não verifiquei contra o .docx.
- Não há detecção de conectividade no projeto (nenhum NetInfo). Logo, o estado 'sem internet' pedido no levantamento não existe como estado real: a faixa OfflineBanner é acionada por falha de consulta de papel/grupo, só no Início. Se o designer precisa desse estado, ele é uma decisão de produto a tomar, não algo a redesenhar.
- Não existe tela dedicada de 'campanha encerrada'. A fase finished reaproveita o layout em curso com rótulos trocados ('Jornada encerrada · 100 dias', 'Tema do dia 100', 'Conduziu no Dia 100'). Jornada e Juntos não têm tratamento próprio para o fim. Se o handoff previa algo, não está implementado.
- /admin não segue o sistema visual do handoff (usa Card, Divider, fontWeight 600 dos componentes anteriores). Não sei se isso é intencional (superfície interna) ou dívida.
- mobile/app.config.ts declara o scheme por variante: 'bibliaapp-dev', 'bibliaapp-preview' e 'bibliaapp' (o 'biblespike' do spike saiu).
- A rota /dev está registrada no stack raiz em qualquer build; só o botão de entrada em /voce é protegido por __DEV__. Não encontrei decisão sobre remover a rota em release.
- Os hexes que citei (#111111, #FFFFFF, rgba(255,255,255,0.78)) são literais que li dentro das próprias telas (marco, altar mode, recado fixado). Os tokens de cor do sistema (BRAND_YELLOW e a paleta de src/ui/theme.ts) não foram levantados nesta frente — se o pacote precisa dos valores, eles vêm de outra frente.
