# EXECUTION 04 — revisão adversarial e correções

- **Data:** 2026-09-20 · **Estado:** cinco frentes corrigidas; as três primeiras commitadas em `99eb57b`, os grupos A e H **não commitados**
- **Método:** cinco lentes independentes (design, conteúdo, acessibilidade, correção, completude) produziram
  64 achados; cada achado foi submetido a três refutadores com ângulos distintos (reprodução no código,
  regra escrita que viola, impacto real). Sobrevive o que dois dos três não conseguiram refutar.
- **Resultado:** 48 confirmados (1 alto, 19 médios, 28 baixos), 16 refutados, 0 sem verificação.

Na primeira execução 117 dos 197 agentes morreram por limite de modelo, e a apuração tratava agente morto
como achado refutado — 39 achados foram descartados sem terem sido checados. A apuração foi corrigida
(agente morto vira "não verificado", nunca "refutado") e a execução retomada do ponto em que parou.

---

## 1. O que foi corrigido

### 1.1 Texto bíblico em tradução protegida dentro do conteúdo (ALTO)

A orientação da igreja fecha citando Levítico 6:13. O texto entrava no conteúdo como parágrafo comum e era
exibido em "Sobre o propósito" — o único texto de tradução do aplicativo, que por decisão de projeto não
mostra nenhuma enquanto o Gate 1 não fechar. Não havia guarda: mais versículos no `.docx` entrariam sozinhos.

| Onde | O que mudou |
|---|---|
| `scripts/convert-100-dias.mjs` | Reconhece citação (trecho entre aspas + referência), separa num bloco `scripture` com a referência canônica e **recusa a geração acima de três citações** |
| `content/100-dias-2026/proposito.json` | Ganhou `scripture_quotes` para auditoria; a citação virou bloco próprio |
| `src/journey/proposito.ts` | Tipo do bloco e `scriptureQuotes()` |
| `src/app/proposito.tsx` | Citação renderizada identificada como citação, com a referência ao lado |
| `content/source/README.md` | Regra e base legal registradas |

**Base:** citação avulsa e atribuída é lícita (Lei 9.610/98, art. 46, III), e a SBB admite até 500 versículos
sem autorização escrita. Isso **não** libera o Gate 1: o leitor continua sem exibir tradução nenhuma.
**Pendente:** a igreja precisa informar **qual tradução** é essa para a atribuição ficar completa.

### 1.2 Marco misturava contagem pessoal com dia da igreja (MÉDIO, efeito alto)

A tela de marco é disparada pela **contagem de leituras** da pessoa, mas descrevia o **dia de calendário**
homônimo: data, monte e ênfase. Quem entrasse atrasado e completasse a 25ª leitura com a igreja no dia 40 via
"17/10/2026 · Governo · Coração sábio para governar" — conteúdo de um dia que talvez nem tivesse lido.

- O rótulo passou a ser "Marco · 25 de 100 dias lidos", sem data.
- Saiu a linha com o monte e a ênfase do dia homônimo.
- **Terceira manifestação, não apontada pela revisão:** a régua ignorava os dias realmente lidos nas telas de
  marco e pintava de 1 até N como concluídos. Agora usa sempre o que a pessoa leu (`HundredDayRuler`).
- A **chegada do Dia 100 ficou intacta** (data e Ap 21:5): só se completa cem leituras tendo lido o dia 100.

### 1.3 Nomes de pessoas reais embarcados no binário (MÉDIO, tratado como grave)

O conversor gravava `leaders_label` (37 rótulos distintos com nomes de pessoas) no `dataset.json`, importado
estaticamente e embarcado inteiro no pacote. `altarForDisplay` só escondia **na tela**: bastava descompactar o
APK para ler os nomes. Com a igreja autorizando guia e escala mas não os nomes, o portão de produção passava e
um build de loja sairia com dado pessoal de terceiros sem consentimento.

- O conversor **não gera** o rótulo sem `leader_names_authorized`; a fonte `.docx` com hash continua guardando o original.
- `source_provider` deixou de embutir o nome da autora do arquivo (metadado do Word).
- `assertProductionReady` ganhou `production.leader_names`: recusa dataset com nomes sem autorização.
- Testes: o conteúdo embarcado não casa `/\bPrs?\.|\bPra\./`; o portão recusa contrabando; com autorização o rótulo volta a ser exibível.

### 1.4 Grupo A — a marca invertida sumia no tema escuro (2 médios + 2 baixos)

O idioma do handoff para "marcado" é tinta com conteúdo amarelo. O código escrevia o fundo como
`colors.text`, que no tema escuro é #FFFFFF: o conteúdo amarelo caía para 1,46:1. Onde o fundo era
`#111111` fixo, era o inverso — o círculo sumia sobre a página escura.

Par de tokens novo, `markSurface`/`onMark`, que faz o que o §2.2 deste projeto já descrevia para o tema
escuro: tinta e amarelo trocam de papel com a superfície. Claro é tinta com amarelo, escuro é amarelo com
tinta, 12,9:1 nos dois sentidos. Aplicado no check de concluído (Início e Dia), caixa de marcação, opção
selecionada, pílula ativa, avatar e nos números dos passos da intercessão e do propósito.

### 1.5 Grupo H — o rodapé de "Sobre o propósito" afirmava algo falso (1 médio)

Dizia "reproduzido sem alterações", mas a página mostrava 8 das 10 seções.

A auditoria mostrou que o problema era a SELEÇÃO, não só a frase: "Participação e responsabilidade dos
ministérios" não é instrução a líderes — diz "não é somente o líder que está sendo escalado" e fala a todo
integrante de ministério. Escondê-la de quem não é líder contraria o que ela mesma pede. Ela passou a ser
pública; fica de fora só o passo a passo de preparação de quem conduz o altar, e aí a frase ficou verdadeira.

### 1.6 O que a verificação adversarial dos grupos A e H encontrou

Quatro auditorias independentes sobre a própria correção, cada achado refutado por dois ângulos:
15 sobreviveram, 19 caíram. Os que sobreviveram foram corrigidos no mesmo passo.

| Achado | Severidade | O que era |
|---|---|---|
| **A própria pomba não foi convertida** | alto | `Dove` tinha `tone='black'` por padrão e seis telas aceitavam o padrão sobre fundo que segue o tema: no escuro, pomba preta sobre página #111111. A marca do produto, invisível. O tom agora acompanha o tema; as telas de fundo fixo continuam passando o tom |
| **Faixa de alerta ficou de fora** | médio | A faixa "sem internet" era `#111111` fixo e sumia sobre a página escura. Ganhou par próprio (`alertSurface`/`onAlert`): no escuro clareia o bastante para continuar sendo faixa (3,5:1 contra a página, 5,4:1 no texto, 3,7:1 no ponto amarelo). Usar `markSurface` ali estaria errado — daria texto branco sobre amarelo |
| **Comentários descreviam o código anterior** | médio | Três docstrings afirmavam o oposto do que o código passou a fazer. Uma delas era o argumento pronto para alguém reintroduzir o defeito ("o círculo é sempre #111111, também no tema escuro") |
| **O guarda de código era estreito demais** | alto | Casava só a forma literal do bug já corrigido; nove de onze variantes realistas passavam. Reescrito para descrever a regra: fundo de tinta (do tema, literal ou por apelido local) com conteúdo da marca, poupando as superfícies que se declaram fixas. Reporta caminho relativo, porque há cinco `[day].tsx` no projeto |

O guarda agora se autotesta com onze casos sintéticos, seis que devem ser pegos e cinco que devem passar,
e declara no próprio comentário o que não alcança: cor vinda de outro módulo ou com duas indireções.

### 1.7 Grupo C — a permissão de notificação era pedida sem gesto (3 achados)

`useReminderSync` roda na abertura do app e a cada volta do segundo plano, e chamava
`ensureNotificationPermission`. O iOS mostra esse diálogo **uma vez na vida do aplicativo**: gastá-lo na
abertura, antes de a pessoa saber para quê, é perder o lembrete para sempre. E marcar o aviso do altar
disparava dois pedidos — o da tela e o do hook, acordado pela mesma mudança de preferência.

A permissão agora é um parâmetro da chamada, não um efeito colateral dela: `syncMinistryReminders` e
`syncAltarReminders` recebem `{ requestPermission }`. Só as duas telas onde existe gesto — escolher o
ministério, marcar o aviso do altar — pedem; o hook lê com `hasNotificationPermission` e agenda apenas o
que já está permitido. Uma recusa deixou de ser exceção solta e virou `{ ok: false, reason }`, porque quem
chamou precisa desfazer a preferência em vez de prometer um aviso que não vem.

### 1.8 Grupo D — conteúdo de dia futuro chegava por rota (2 achados)

A Jornada, a tela do Dia e a Intercessão checavam `isDayUnlocked`; o leitor, não. `/reader/40` no Dia 17
abria as leituras do Dia 40, e o efeito ainda pedia a passagem ao provedor — com uma tradução licenciada
seria uma requisição de conteúdo que não deveria existir. A tela de reflexão mostrava a referência daquele
dia no rodapé.

As duas rotas passaram a checar o mesmo bloqueio, no mesmo desenho da tela do Dia. Rota é rota: link
direto, histórico e deep link chegam ali igual ao toque, e uma regra que só existe no botão é decoração.

### 1.9 O que os testes dos grupos C e D garantem

Nenhum dos dois grupos podia ficar só no código: os dois defeitos são invisíveis na tela onde nascem.

- Permissão: sincronização de fundo não abre o diálogo nem quando a permissão ainda não existe, e o padrão
  sem opção nenhuma também não; o gesto abre e agenda; recusa e falha do sistema devolvem motivo. Um guarda
  lê a fonte do hook, porque o defeito original era exatamente uma chamada ali e nenhum teste de
  comportamento pegaria alguém reintroduzindo-a por outro caminho.
- Dia futuro: o leitor mostra a data em que abre, não pede a passagem ao provedor e não revela a
  referência; a reflexão esconde o rótulo da leitura. Dois casos de controle no dia de hoje impedem que a
  correção tranque o app inteiro.

Os cinco testes de dia futuro e os três de permissão foram conferidos com o defeito reintroduzido: falham
sem a correção, passam com ela, e os casos de controle passam nos dois estados.

---

## 2. Verificação

| Checagem | Resultado |
|---|---|
| `tsc --noEmit` · `expo lint` | limpos |
| `jest` | **323 testes, 19 suítes** |
| `content:check` | dataset e propósito conferem com as fontes |
| Navegador, tema claro | citação atribuída; marco por leituras com a régua real; Dia 100 intacto; sem nomes; marca e marcas de seleção no desenho do handoff |
| Navegador, tema escuro | check, caixa, opção, números de passo e a pomba visíveis; nenhuma superfície invertida perdida |
| Navegador, rotas diretas | `/reader/40` e `/reflexao/40` mostram o bloqueio sem revelar a leitura; `/reader/17` e `/reflexao/17` intactos; nenhum erro no console |
| Navegador, aviso do altar | marcar a caixa na web devolve o motivo na própria linha e a caixa volta a desligada |

---

## 3. Os achados confirmados que continuam abertos

Os grupos A, H, C e D saíram desta tabela: foram corrigidos (seções 1.4 a 1.9). Restam 34.

Agrupados por trabalho, não por arquivo.

| # | Tema | Achados | Severidade | Por que importa |
|---|---|---|---|---|
| B | **Dynamic Type quebra caixas de altura fixa** (`Button`, `SpherePill`, estatísticas do Dia 100, `getItemLayout` da Jornada) | 6 | 3 médios | Texto transborda ou é cortado a partir de ~1,4× de fonte; no iOS a escala chega a 3,12× |
| E | **Leitor de tela** (estado "concluído" não anunciado, rótulos com "~" e "·", cabeçalhos não marcados, anúncio triplicado no modo altar) | 7 | 1 médio | |
| F | **Cópia e consistência** (altar descrito de três jeitos; "hoje" em dia que não é hoje; "Tema" onde a igreja diz "Ênfase"; enum `pending_authorization` exposto) | 6 | 2 médios | |
| G | **Jejum** (continua como "propósito" da campanha e ganhou superfície nova, sem a confirmação da igreja) | 2 | 1 médio | Depende de resposta da igreja, não de código |
| I | **Tokens e higiene** (cores literais fora de `theme.ts`, `gutter.block` sem uso, código sem consumidor, teste tautológico, marco gravado duas vezes) | 14 | baixos | |

**Recomendação de ordem:** B antes de qualquer teste em aparelho; E e F como um passe único de cópia e
acessibilidade; G quando a igreja responder; I por último.

---

## 4. Os 16 refutados

Vale registrar dois, porque parecem problemas e não são: o modo altar e a tela de marco **têm** o aviso de
conteúdo (vem da tela que os abre), e `campaign.id` com a marca no nome não é identificador de loja, é chave
local. Os outros catorze caíram por não se reproduzirem no código ou por citarem regra inexistente.

Dois achados aparecem nas duas listas — "texto bíblico" e "marco ancorado no dia" — porque as correções foram
aplicadas durante a verificação: quem leu antes confirmou, quem leu depois refutou. Ambos estão corrigidos.
