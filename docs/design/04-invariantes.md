# Invariantes — o que um desenho novo não pode quebrar

> Parte do pacote de design. Índice em [README.md](README.md).
> Levantado do código em 2026-09-20; a fonte da verdade continua sendo o repositório.

---

# FRENTE 4 — Invariantes: o que um desenho novo NÃO pode quebrar

Documento autocontido para um designer externo sem acesso ao repositório. Todos os valores foram lidos
do código e dos documentos do projeto em 2026-09-20. Onde o documento é literal, a frase está entre aspas.

Convenções usadas aqui:
- **Fonte** = documento e seção de onde a regra vem (e, quando a regra vive no código, o arquivo).
- **Se quebrar** = consequência concreta (defeito de produto, risco jurídico, rejeição de loja, build barrado).
- Três níveis de força: **BLOQUEANTE** (impede publicar ou cria risco legal), **REGRA** (contraria decisão
  escrita do projeto), **DÍVIDA CONHECIDA** (já está fora do ideal e está registrado; não piorar).

---

## 1. CONTEÚDO E DIREITO

### 1.1 Os dois portões de lançamento

| Portão | O que é | Estado hoje | Fonte |
|---|---|---|---|
| **Gate 1** | Licença da **tradução bíblica**. Problema **independente** do material da igreja. | **Aberto.** Nenhuma tradução pode ser exibida. | `CLAUDE.md` §"Regras invioláveis do conteúdo"; `DESIGN_IMPLEMENTATION.md` §6.3 |
| **Launch Gate 2** | **Autorização escrita da igreja** para publicar o guia e a escala dos 100 Dias no app. | **Aberto.** `rights_status = "pending_authorization"`. | `CLAUDE.md` §"Regras invioláveis do conteúdo" |

Literal, `CLAUDE.md`: "Licença da tradução bíblica (**Gate 1**) continua um problema **independente**: o
material só traz referências, nunca texto."

Literal, `CLAUDE.md`: "**Launch Gate 2 agora é interno:** autorização escrita da igreja para publicar o guia
e a escala no app. Até ela existir, `rights_status = pending_authorization`: builds de desenvolvimento
mostram o aviso 'aguardando autorização' e builds de release falham na abertura pelo portão de produção.
Nomes de líderes só aparecem com `leader_names_authorized`."

> **Atenção de consistência:** `DESIGN_IMPLEMENTATION.md` §6.3 descreve o Gate 2 como "autorização do plano
> 42360". Esse texto é **anterior** à chegada do material próprio da igreja (2026-09-19) e está desatualizado:
> o plano 42360 do YouVersion está declarado **superado** em `CLAUDE.md`. Vale a definição do `CLAUDE.md`.

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| C-01 | **Nenhum texto de tradução bíblica é exibido** enquanto o Gate 1 não fechar. O app mostra só **referências** (ex.: "Gênesis 1–11"). O leitor hoje exibe um bloco de aviso com o texto literal "Texto de exemplo. Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida." e o selo "DEV FIXTURE — NOT PRODUCTION CONTENT". | BLOQUEANTE | `CLAUDE.md` §"Regras invioláveis"; código `mobile/src/app/reader/[day].tsx` | Distribuição de obra protegida sem licença. Um desenho que mostre "o versículo do dia" com texto corrido está desenhando algo que o app não pode ter. |
| C-02 | Citação bíblica só entra como **bloco `scripture` identificado como citação, com a referência canônica ao lado**, e o conversor **recusa gerar acima de três citações**. Base legal registrada: Lei 9.610/98, art. 46, III (citação avulsa e atribuída) e a tolerância da SBB de até 500 versículos sem autorização escrita. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.1 | Citação solta perde o caráter de citação e passa a ser reprodução. Já aconteceu uma vez: Levítico 6:13 entrou como parágrafo comum. Pendência aberta: a igreja ainda não informou **qual tradução** é a da citação, então a atribuição está incompleta. |
| C-03 | "Gratuito na internet" não é "livre para copiar". Traduções protegidas (NVI, NAA, ARA, ARC, NTLH, NVT, A21, KJA, ACF) **não podem ser empacotadas sem contrato**; repositórios/APIs que as hospedam estão em **lista de bloqueio** no pipeline. | BLOQUEANTE | `CLAUDE.md` regra 4; `ARCHITECTURE_V0.md` §4.3 | Infração de direito autoral e risco de remoção nas lojas. |
| C-04 | Quando existir tradução, **a tela de atribuição é obrigatória** (Sobre/licenças) e o leitor carrega o aviso de direitos no fim do capítulo. Textos abertos (CC) **não podem ser cifrados** de modo a impedir extração (cláusula anti-DRM). | REGRA | `ARCHITECTURE_V0.md` §3 (`settings/consent`), §4.4, §13 | Violação dos termos da própria licença aberta. Um desenho que remova o rodapé de direitos do leitor derruba a conformidade. |
| C-05 | **Nomes de líderes só existem com `leader_names_authorized = true`.** Hoje é `false`. Não basta esconder na tela: o rótulo **não é gerado** no dataset, porque "nome de pessoa dentro do dataset vira nome de pessoa dentro do binário" — bastava descompactar o APK para ler os 37 rótulos com nomes. O portão de produção recusa o build (`production.leader_names`). | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.3; `CLAUDE.md`; código `mobile/src/journey/validator.ts` | Dado pessoal de terceiros sem consentimento num app de loja. Desenhar a escala do altar "com o nome do líder" pressupõe autorização que não existe. |
| C-06 | O material da igreja é **fonte canônica e intocável**: proibido inferir ou fabricar dias, corrigir ou reescrever o texto da igreja, editar o dataset à mão ou inventar cronograma próprio. Proibido scraping do YouVersion e cópia de planos de terceiros. | BLOQUEANTE | `CLAUDE.md` §"Regras invioláveis" | Um desenho que precise de um campo que o material não tem (subtítulo, resumo, imagem por dia) está pedindo conteúdo inventado. Se faltar dado, o estado honesto é "não disponível", não preenchimento. |
| C-07 | Enquanto o Gate 2 estiver aberto, **todo build de desenvolvimento mostra o aviso** e nenhuma tela pode apresentar o conteúdo como liberado. Textos exatos em uso: · pendente, longo: "Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja para publicação. Não distribuir esta versão." · pendente, curto: "Aguardando autorização da igreja." · fixture, longo: "Conteúdo de desenvolvimento. Textos e cronograma são fictícios e não representam o plano da igreja." · fixture, curto: "Conteúdo de desenvolvimento." | BLOQUEANTE | `CLAUDE.md`; código `mobile/src/ui/components.tsx` (`DevContentBanner`) | Sem o aviso, alguém confunde tela com conteúdo autorizado. O aviso é `accessibilityRole="alert"` e **precisa de lugar no layout de toda tela de conteúdo** — não é elemento opcional de mockup. |
| C-08 | Fixtures `DEV_ONLY` existem só para teste e painel DEV, **sempre com banner**, e **nunca** são apresentadas como reais. O validador exige coerência: `DEV_ONLY` ⇒ `rights_status = "dev_fixture"`, e o portão de produção recusa fixture. | BLOQUEANTE | `CLAUDE.md`; código `mobile/src/journey/validator.ts` | Build de loja com conteúdo fictício apresentado como plano da igreja. |
| C-09 | **Convicção religiosa é dado pessoal sensível** (LGPD art. 5º, II). Progresso de leitura, notas, destaques e reflexões são tratados como sensíveis: minimização, **consentimento específico e destacado** apresentado **antes da primeira sincronização**, com texto próprio "não escondido nos termos", versão registrada. | BLOQUEANTE | `CLAUDE.md` regra 5; `SECURITY_V0.md` §4.1, §1, §8 | Tratamento de dado sensível sem base legal. Consequência de desenho: a tela de consentimento **não pode** ser um checkbox discreto dentro de "Termos"; precisa ser destacada e específica. |
| C-10 | **Minimização**: não coletar CPF, telefone, endereço, data de nascimento exata, localização, contatos ou fotos além do avatar. Nota limitada a 5.000 caracteres. Texto de lembrete **sem dado sensível**. | REGRA | `SECURITY_V0.md` §1, §3.1; `ARCHITECTURE_V0.md` §8 | Qualquer campo novo de perfil no desenho (aniversário, celular, cidade, "quem te convidou") viola a minimização declarada. |
| C-11 | **Sem session replay** em nenhuma hipótese — "a tela contém dado sensível". Analytics pseudonimizado, sem PII, sem conteúdo de notas; **desligado por padrão**. | BLOQUEANTE | `ARCHITECTURE_V0.md` §3 (`observability`), §10; `CLAUDE.md` | Exfiltração de dado sensível por SDK de terceiro. |
| C-12 | Direitos do titular precisam de superfície na interface: "Meus dados" + exportação JSON, correção, **eliminação (exclusão de conta no app e por link web)**, revogação de consentimento. | BLOQUEANTE | `SECURITY_V0.md` §4.2, §5 | LGPD art. 18 e exigência das duas lojas (ver §5 desta lista). Um desenho de "Você/Perfil" sem esses itens não é publicável. |
| C-13 | "Compartilhar um insight" permanece **desativado**, com a regra de privacidade ao lado. Notas e destaques são **privados** em V1; não há conteúdo de usuário visível a terceiros. | REGRA | `DESIGN_IMPLEMENTATION.md` §4; `SECURITY_V0.md` §6 | Ativar compartilhamento aciona todo o pacote de UGC das lojas (denúncia, bloqueio, moderação humana com prazo, termos de conduta) **antes** do lançamento — trabalho que não existe. |

---

## 2. PRODUTO — o que o app promete e não pode desdizer

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| P-01 | **O dia abre no dia oficial da igreja.** O "dia atual" é derivado de `start_date` + fuso oficial da campanha (offset fixo), **igual para toda a igreja, independente do fuso do aparelho**. Campanha: 23/09/2026 a 31/12/2026, 100 dias. | BLOQUEANTE | Código `mobile/src/journey/officialDay.ts` (spec §8); `CLAUDE.md` | Duas pessoas na mesma igreja veriam dias diferentes. O produto deixa de ser "a igreja lendo junto". |
| P-02 | **Dia futuro é fechado, e o bloqueio é da ROTA, não do botão.** Regra exata: desbloqueado ⇔ a campanha começou **e** `dia ≤ dia oficial`. Link direto, histórico e deep link (`/reader/40`, `/reflexao/40`, `/dia/40`, `/intercessao/40`) mostram o mesmo bloqueio, **sem revelar a leitura** daquele dia. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.8; código `mobile/src/journey/useJourney.ts` | Literal: "Rota é rota: link direto, histórico e deep link chegam ali igual ao toque, e uma regra que só existe no botão é decoração." Com tradução licenciada, abrir o dia futuro ainda dispara uma **requisição de conteúdo que não deveria existir**. |
| P-03 | **Entrada tardia é comportamento de produto, não erro.** A Jornada **abre onde a igreja está**, não no dia 1. O app entra "em andamento". | REGRA | `CLAUDE.md` §"Estado atual"; `DESIGN_IMPLEMENTATION.md` §5 | Quem baixa no dia 40 abriria no dia 1 e se sentiria 39 dias atrasado. Desenho que use "Dia 1" como âncora visual da tela inicial contradiz isso. |
| P-04 | **Marco é contagem pessoal, nunca dia de calendário.** O rótulo é "Marco · 25 de 100 dias lidos", **sem data**, e **sem** a linha com o monte e a ênfase do dia homônimo. A régua, nas telas de marco, pinta **os dias realmente lidos** — não 1 até N. | REGRA | `EXECUTION_04_REVISAO.md` §1.2 | Quem entrou atrasado e completou a 25ª leitura com a igreja no dia 40 via "17/10/2026 · Governo · Coração sábio para governar" — conteúdo de um dia que talvez nem tivesse lido. |
| P-05 | **Exceção:** a chegada do **Dia 100** mantém data e Ap 21:5 — "só se completa cem leituras tendo lido o dia 100". | REGRA | `EXECUTION_04_REVISAO.md` §1.2 | Tirar a data da chegada apaga o único momento em que ela é verdadeira. |
| P-06 | **Número coletivo sem fonte vira estado honesto de indisponível, nunca o número do protótipo.** O handoff traz "1.812 pessoas já leram hoje", "64% da igreja", insights e reações "Amém": **nenhum desses dados tem fonte hoje**. Textos exatos em uso: "O progresso da igreja ainda não está disponível nesta versão." e, sem nuvem configurada, "O progresso da igreja aparece quando sua conta estiver conectada." | BLOQUEANTE | `DESIGN_IMPLEMENTATION.md` §4; código `mobile/src/community/communityState.ts` | Literal: "Exibir o valor do protótipo seria mostrar dado inventado como se fosse real, o que este projeto recusa desde o Sprint 0." **A decisão é manter a estrutura da tela e trocar o número pelo estado honesto** — então o desenho precisa prever o bloco vazio com explicação, do mesmo tamanho do bloco com número (inclusive o numeral de 52px da tela Juntos). |
| P-07 | Onde já existe dado real, ele é usado: **os três números do Dia 100 são reais e locais** (dias lidos, reflexões, dias de jejum). O grupo mostra **contagem real de membros**, sem "41 de 64 hoje". | REGRA | `DESIGN_IMPLEMENTATION.md` §4 | Misturar número real e número decorativo na mesma tela destrói a credibilidade dos dois. |
| P-08 | **Recado fixado e ferramentas de líder aparecem desativados, com o motivo à vista** (bloco preto com a marca dizendo que ainda não há recado publicado; as quatro linhas da folha de líder desativadas). Insights aparecem como "ainda não disponíveis". | REGRA | `DESIGN_IMPLEMENTATION.md` §4 | Botão que parece funcionar e não funciona é pior que botão ausente; e remover a estrutura toda impede plugar a agregação depois sem redesenho. |
| P-09 | **"Vou ler na minha Bíblia" não conclui o dia.** A ação fecha para o Início e passa a mostrar "Concluir leitura" como ação do dia. | REGRA | `DESIGN_IMPLEMENTATION.md` §5 | Literal: "Marcar por conta própria seria decidir no lugar da pessoa." |
| P-10 | **Marco em tela cheia aparece uma vez** por marco alcançado. | REGRA | `DESIGN_IMPLEMENTATION.md` §5 | Repetir vira interrupção; e é o começo de mecânica de uso compulsivo (ver §5). |
| P-11 | **A ênfase editorial vem do dado, não de algoritmo.** O realce amarelo da palavra do tema no Início usa o campo `theme_highlight` do dataset. | REGRA | `DESIGN_IMPLEMENTATION.md` §5 | Literal: "escolher a ênfase por algoritmo seria o app inventando destaque editorial." |
| P-12 | Nomes de navegação e horários já fixados: a aba é **"Início"** (não "Hoje"); o lembrete da tarde é **13:00** (era 14:00). | REGRA | `DESIGN_IMPLEMENTATION.md` §5 | Renomear a aba ou mudar o horário sem passar pelo Product Brain contraria o handoff aprovado. |
| P-13 | **Permissão de notificação só é pedida sob gesto explícito** (escolher o ministério, marcar o aviso do altar). Nunca na abertura, nunca no retorno do segundo plano. Uma recusa **desfaz a preferência** em vez de prometer aviso que não vem. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.7 | O iOS mostra o diálogo **uma vez na vida do aplicativo**: gastá-lo na abertura "é perder o lembrete para sempre". Desenho que peça permissão numa tela de boas-vindas sem ação queima o único pedido. |
| P-14 | **Não é app "só de 100 dias".** Jornadas prováveis: Bíblia em 100 dias e Bíblia em 1 ano. | REGRA | `CLAUDE.md` §"Contexto do produto" | Um desenho que cimente "100" na estrutura (régua de 100 posições como esqueleto da navegação, cópia "dia X de 100" em todo lugar) encarece a segunda jornada. |
| P-15 | **Fora de escopo agora:** SaaS multi-igrejas, pagamentos, ofertas, doações, fundraising, monetização. | BLOQUEANTE | `CLAUDE.md` §"Contexto do produto"; `ARCHITECTURE_V0.md` §Escopo | Botão de dízimo/oferta/doação no desenho cria, além do escopo, problema de regra de pagamento das lojas. |
| P-16 | **Hipóteses NÃO aprovadas** (não implementar sem aprovação do Product Brain): feed, grupos, amigos, comunidade, comentários, reações, streak, badges, gamificação, diagnóstico, personalização, diário, reflexões, IA, ministérios, ranking. A arquitetura só preserva "opcionalidade barata" para elas. | BLOQUEANTE | `CLAUDE.md` §"Contexto do produto"; `ARCHITECTURE_V0.md` §Escopo | Desenhar qualquer uma delas produz trabalho que não pode ser construído. **Ver incerteza I-3**: reflexões, grupos e ministérios **existem** no app hoje, então essa lista está em conflito com o estado real. |
| P-17 | Estados obrigatórios em toda tela: **loading, erro, vazio**, mais offline. A faixa offline diz **o que continua funcionando**, não o que quebrou: "Sem internet. Sua leitura, progresso e reflexões continuam salvos." | REGRA | `CLAUDE.md` regra 1; `ARCHITECTURE_V0.md` §1.1; código `mobile/src/ui/components.tsx` | Leitura e progresso **funcionam 100% offline** por decisão de arquitetura; uma tela que trate ausência de rede como erro mente sobre o produto. |
| P-18 | O app tem **tema escuro** e ele não pode ser removido. O handoff especifica aparência clara; o tema escuro foi derivado da **própria tela 11 do handoff** (Dia 100). | REGRA | `DESIGN_IMPLEMENTATION.md` §2.2 | Literal: "removê-lo seria uma regressão para quem depende dele". Entregar um desenho só-claro deixa o tema escuro para adivinhação — foi exatamente assim que a marca sumiu no escuro (ver §4). |

---

## 3. ACESSIBILIDADE

### 3.1 A regra de ouro do grupo B (a mais recente e a mais caiada)

Literal, `EXECUTION_04_REVISAO.md` §1.10: "o tamanho do handoff é **piso, nunca teto**. Toda caixa com texto
cede ao texto (`minHeight: Math.max(altura, MIN_TOUCH)` com `paddingVertical`, nunca `height`), e todo número
que reserva espaço para uma dessas caixas é **medido** com `onLayout` — nunca uma constante."

Está escrito também nos tokens do app (`mobile/src/ui/theme.ts`): "Alturas do handoff. São PISOS de caixa,
nunca medidas fixas. […] declarar `height` com elas é o defeito."

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| A-01 | **Alvo de toque mínimo = 48** (`MIN_TOUCH = 48`). Comentário literal no código: "iOS 44pt / Android 48dp — usamos o maior dos dois. Piso absoluto de toque." | BLOQUEANTE | `mobile/src/ui/theme.ts` | Controle inalcançável para motricidade reduzida; achado recorrente em revisão de loja. |
| A-02 | Pisos de caixa do handoff, todos aplicados como `minHeight` com `Math.max(valor, 48)`: botão principal **56**, secundário **56**, terceira variante **52**, texto/underline **48**, variante menor **44** (eleva para 48 pelo piso da base). Tab bar **86**. Pílula de esfera: antes `height: 28`, hoje piso que cede ao rótulo. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.10, §1.12; `mobile/src/ui/theme.ts`, `mobile/src/ui/components.tsx` | Em fonte grande o rótulo atravessa a borda e, num botão preenchido, **sai na cor da própria superfície: 1,00:1**. Literal: "O texto não ficava feio: sumia." |
| A-03 | **Dynamic Type: meta declarada é "até 200% sem quebra"**; o teto real que o React Native entrega neste build é **3,571×** (AX5, tabela do `RCTAccessibilityManager`) — e é nele que os testes medem (1×, 2× e 3,571×). O "3,12×" que circula é a razão de corpo do iOS e **não** é o que o RN usa. | BLOQUEANTE | `ARCHITECTURE_V0.md` §12 (meta: "Dynamic Type/fontScale até 200% sem quebra"); `EXECUTION_04_REVISAO.md` §1.12, §1.13 | Desenhar para 100% e "conferir depois" foi a origem de 12 lugares quebrados. Ver incerteza I-4 sobre qual dos dois números é o contrato. |
| A-04 | **Nenhum número de layout pode ser constante se ele reserva espaço para uma caixa de texto.** Casos reais: o leitor reservava 180px fixos para um rodapé que cresce; a cena reservava `TAB_BAR_HEIGHT` (86) quando a barra real mede 86 **mais** `insets.bottom`; a Jornada declarava `48 × escala` ao `getItemLayout` e desenhava 48. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.10 | Texto cortado troca por **conteúdo inalcançável** — o fim do capítulo e o aviso de direitos atrás do rodapé; o fim da Jornada atrás do vidro; a lista abrindo longe do dia da igreja. |
| A-05 | **Nenhuma tela sem rolagem.** As duas exceções (primeira e última do onboarding) foram corrigidas. **A folha modal para em 88% da altura da tela e rola por dentro.** | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.10, §1.11 | Em fonte 2× a folha de ferramentas de líder pede ~1118px numa tela de 844: o "Fechar" ficava 274px fora da tela, o scrim ia a 0px e a rota não tem header nativo — **no iOS, nenhum controle de fechamento alcançável**. Gente presa dentro da tela. |
| A-06 | **Teclado aberto é um estado de layout, não um detalhe.** Na reflexão, a partir de ~1,65× o rodapé e a barra excediam a coluna e o `ScrollView` ia a zero — "a pessoa digitava num campo de altura nenhuma", com `autoFocus` abrindo o teclado sozinho. O rodapé fixo ficou só com o que precisa estar à mão enquanto se escreve. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.11 | Campo de texto inutilizável. Todo desenho com entrada de texto precisa de uma versão "teclado aberto". |
| A-07 | **Rótulo nunca colapsa antes do valor.** Numa linha de ajuste, quem encolhe é o valor; o rótulo é a palavra que diz o que a linha faz. | REGRA | `EXECUTION_04_REVISAO.md` §1.10 | Sumia o rótulo e ficava o e-mail inteiro. |
| A-08 | **Contraste: 4,5:1 para texto e 3:1 para limite de controle interativo** (WCAG 1.4.11), medidos pela fórmula da WCAG 2.1, **nos dois temas**. Meta declarada na arquitetura: "contraste AA" com checklist por tela (WCAG 2.2 AA / NBR 17060). | BLOQUEANTE | `ARCHITECTURE_V0.md` §12; `DESIGN_IMPLEMENTATION.md` §2.1; teste `mobile/src/__tests__/contrast.test.ts` | Alterar **qualquer** cor sem rodar a auditoria de contraste é a forma documentada de reintroduzir o defeito; o próprio arquivo de tokens diz isso. |
| A-09 | **Uma única exceção de contraste está registrada:** o preenchimento amarelo da régua e das barras de progresso mede **~1,4:1** contra a trilha clara. É aceita porque **o amarelo nunca carrega o dado sozinho**: a régua distingue os dias pela **altura e forma** do traço (hoje é o traço mais alto; em aberto ganha círculo no topo; futuro é curto e baixo); **toda** barra de progresso vem com rótulo em texto e `accessibilityValue`; a aba ativa muda ícone, cor de tinta, peso do rótulo e pílula, e anuncia `selected`. | REGRA | `DESIGN_IMPLEMENTATION.md` §3 | Se o desenho novo fizer o amarelo ser o **único** indicador em algum lugar, a exceção deixa de ser justificável e vira falha de acessibilidade. Literal no teste: "o amarelo nunca carrega o dado sozinho". |
| A-10 | **O filete divisor de 1px (`#E6E3DC`) é decorativo — "nunca o único indicador de um controle."** | REGRA | `mobile/src/ui/theme.ts` | Um item de lista que só se distingue por linha fina não existe para quem usa alto contraste. |
| A-11 | **Leitor de tela navegável (VoiceOver/TalkBack)** é meta declarada. Padrões já em uso: faixas de estado com `accessibilityRole="alert"`; barras de progresso com rótulo textual + `accessibilityValue`; aba ativa anuncia `selected`; a pomba tem rótulo por papel — "Você está aqui" (posição na jornada) ou "Lagoinha" (assinatura) — e **desaparece do leitor de tela quando é decorativa**. | BLOQUEANTE | `ARCHITECTURE_V0.md` §12; `DESIGN_IMPLEMENTATION.md` §3; `mobile/src/ui/brand.tsx` | Ilustração sem rótulo poluindo a navegação, ou informação que só existe visualmente. |
| A-12 | **Movimento é sempre dispensável.** O voo da pomba "é puramente decorativo — a posição e o texto 'X de 100' carregam o dado — por isso ele desliga inteiro em 'Reduzir movimento' sem perda de informação." O app respeita "Reduzir movimento" do sistema. Transições de navegação: 200–260ms, ease-out (valor em uso: 220ms); ciclo do voo: 3200ms. | REGRA | `mobile/src/ui/FlyingDove.tsx`, `mobile/src/ui/theme.ts` | Animação que carregue dado quebra para quem desliga movimento — e desligar movimento é ajuste de saúde (enjoo, vertigem), não preferência estética. |
| A-13 | **Em React Native o peso da fonte vem da FAMÍLIA, não de `fontWeight`** — os estilos nomeiam a face e não declaram `fontWeight`. Famílias empacotadas: Archivo (900/800/700/600/500) e Literata (400, 400 itálico, 600), ambas OFL. | REGRA | `mobile/src/ui/theme.ts` | "Combinar os dois faz o Android sintetizar negrito sobre uma face que já é negra." Um desenho que peça "semibold do Archivo" numa face que não foi empacotada não tem como ser implementado fielmente. |
| A-14 | `lineHeight` fixo **não** é defeito de Dynamic Type: o RN multiplica `lineHeight` pelo fator de fonte. "O que quebra são as caixas." | — (esclarecimento) | `EXECUTION_04_REVISAO.md` §1.12 | Registrado para que ninguém "corrija" line-heights achando que resolve transbordo. |

### 3.2 Dívidas de acessibilidade conhecidas — não piorar, e não confundir com padrão

| # | Dívida | Fonte | Consequência para um desenho novo |
|---|---|---|---|
| A-D1 | **Tetos de escala de fonte aplicados no código** (limitam o Dynamic Type): texto do versículo no leitor **1,8×**; numeral da tela de marco **1,2×**; tela de conta **1,8×** e **1,6×**. | Código `mobile/src/app/reader/[day].tsx`, `marco/[day].tsx`, `conta.tsx` | A frase "texto segue o tamanho do sistema" no leitor **é falsa** enquanto o texto estiver capado em 1,8× — item aberto, classificado como decisão **de produto**, não de código. |
| A-D2 | **Teto de 2× nas linhas da Jornada**: acima dele as linhas param de crescer enquanto o texto continua. Dívida consciente; todo desvio restante é **negativo** (a lista rola de menos, o dia da igreja fica abaixo da dobra, nunca acima). | `EXECUTION_04_REVISAO.md` §1.14; `mobile/src/journey/journeyRowHeight.ts` | Literal: "Erro de sinal único é corrigível; de sinal misto, não." Mexer na altura das linhas sem contar linhas de texto reintroduz erro de sinal misto. |
| A-D3 | **O rodapé do leitor é a caixa mais apertada do app**: acima de ~2,9× a palavra "Concluir" não cabe nem sozinha — transbordo **horizontal**, que nenhum `minHeight` resolve. Empilhar o rodapé é **decisão de desenho**. | `EXECUTION_04_REVISAO.md` §1.14 | Este é um pedido explícito ao desenho novo: como o rodapé do leitor se empilha em fonte grande. |
| A-D4 | **Suporte a "Texto em Negrito" do sistema: zero hoje.** Passe de acessibilidade ainda não feito, que inclui: título nativo do header congelado em 17px, `StateView` sem `flex: 1` dentro de rolagem, prévia de tamanho que mente na tela de Aparência, botão sem nome acessível enquanto carrega, e o contraste real dos estados com `opacity` — que a auditoria de contraste **não enxerga**. | `EXECUTION_04_REVISAO.md` §3 | Estados desabilitados desenhados com opacidade têm contraste **não medido**. Se o desenho novo usar opacidade para "desativado", precisa declarar o contraste resultante. |
| A-D5 | **Grupo E (leitor de tela) está ABERTO, 7 achados:** estado "concluído" não anunciado, rótulos com "~" e "·" lidos em voz alta, cabeçalhos não marcados, anúncio triplicado no modo altar. | `EXECUTION_04_REVISAO.md` §3 | O código atual **não é modelo** de rotulagem para leitor de tela. Cópia com "·" e "~" como separador visual precisa de um rótulo acessível separado. |
| A-D6 | **Nenhum teste deste repositório pode afirmar que um texto caberia.** Literal: "O `react-test-renderer` não roda Yoga, `onLayout` nunca dispara e não há métrica de glifo. […] os testes são **contrato de estilo**, e a prova de layout é aparelho real com AX5 ligado — que ainda não foi feita." | `EXECUTION_04_REVISAO.md` §1.13 | "Os testes passam" nunca foi evidência de que a meta de 200% está cumprida. Desenho que dependa de "cabe justo" não tem como ser validado antes do aparelho. |

---

## 4. MARCA — o idioma visual que o handoff fixou

Fonte do sistema: handoff "100 Dias — Lagoinha" (`100 Dias Lagoinha.dc.html`, direção final, 2026-09-07),
implementado em `mobile/src/ui/theme.ts` e documentado em `DESIGN_IMPLEMENTATION.md`.
`design-system/jornada-100-dias/MASTER.md` **está substituído** e não descreve mais o produto
(`DESIGN_IMPLEMENTATION.md`, cabeçalho). O handoff `historico/Jornada 100 Dias.dc.html` **não** foi
implementado, por pedido do próprio handoff.

### 4.1 As duas cores e a regra que as governa

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| M-01 | **O amarelo da marca é `#FFD100`. Ele é preenchimento, progresso, seleção e marco — NUNCA cor de texto.** Literal nos tokens: "Amarelo #FFD100 é preenchimento e realce: NUNCA cor de texto. Tinta é #111111." | BLOQUEANTE | `mobile/src/ui/theme.ts`; `mobile/src/__tests__/contrast.test.ts` | `#FFD100` como texto sobre superfície clara mede **1,46:1**. A proibição vale para superfície clara, "que é onde ela pode ser violada sem querer". |
| M-02 | **A tinta é `#111111`.** Sobre amarelo **só entra tinta** (`onAccent = #111111`, 12,6:1 aproximado — o teste exige ≥ 4,5:1 e nunca a mesma cor). | BLOQUEANTE | `mobile/src/ui/theme.ts` | Texto branco sobre amarelo é ilegível; o teste de contraste barra. |
| M-03 | **Amarelo rebaixado para faixas largas de fundo: `#FFF3C4`** no tema claro, `#3A3100` no escuro (`accentSoft`). | REGRA | `mobile/src/ui/theme.ts` | Amarelo cheio em área grande vira ruído e piora a leitura. |
| M-04 | **Superfícies:** branco puro `#FFFFFF` para leitura (Início, Jornada, leitor); off-whites **quentes** para "áreas humanas" (Juntos, tela do Dia) — `surfaceWarm #F7F5F0`, `surfaceMuted #F1EFE9`, `surfaceSunken #EDEBE5`. Filetes: `border #E6E3DC`, `borderStrong #D9D6CF`. | REGRA | `mobile/src/ui/theme.ts` | A distinção "branco = leitura / quente = gente" é semântica, não decorativa; inverter confunde o mapa do app. |
| M-05 | **Desvio deliberado já registrado:** o contorno do círculo não selecionado (telas 01b/01c) **não** é o `#A9A69E` do handoff, e sim **`#8A877F`**. Motivo medido: `#A9A69E` dá **2,43:1** sobre branco, abaixo do mínimo de 3:1 da WCAG 1.4.11. O substituto passa sobre branco **e** sobre os off-whites quentes (**3,6:1** e **3,1:1**), mantendo o mesmo cinza quente. | REGRA | `DESIGN_IMPLEMENTATION.md` §2.1; `mobile/src/ui/theme.ts` | Voltar ao valor do handoff reintroduz uma falha de contraste que "o próprio handoff exige" que não exista. |

### 4.2 A inversão no tema escuro (o defeito que já custou uma rodada de correção)

Literal, `DESIGN_IMPLEMENTATION.md` §2.2: o tema escuro foi derivado "da **própria tela 11 do handoff**
(Dia 100: fundo `#111`, amarelo e branco), então as relações de marca são as mesmas — **tinta e amarelo só
trocam de papel com a superfície**."

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| M-06 | **"Marcado" = tinta com conteúdo amarelo no tema claro; amarelo com conteúdo de tinta no tema escuro.** Existe um par de tokens para isso: `markSurface`/`onMark` = `#111111`/`#FFD100` no claro e `#FFD100`/`#111111` no escuro. **12,9:1 nos dois sentidos.** Aplica-se ao check de concluído (Início e Dia), caixa de marcação, opção selecionada, pílula ativa, avatar e aos números dos passos da intercessão e do propósito. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.4; `mobile/src/ui/theme.ts` | Dois modos de quebrar, os dois já aconteceram: (1) escrever o fundo como a cor de texto do tema — no escuro isso é `#FFFFFF`, e o conteúdo amarelo cai para **1,46:1**, invisível; (2) fixar o fundo em `#111111` numa tela cujo fundo segue o tema — **1:1 com a página escura, a superfície deixa de existir**. |
| M-07 | **Fundo fixo em tinta continua legítimo só quando a tela DECLARA que a superfície é fixa** (marco, bloco de tinta do Juntos). Nessas telas o tom da marca é passado explicitamente. Existe um scanner automático sobre o código que reporta "fundo fixo em tinta sem declarar superfície fixa" — ele se autotesta com onze casos (seis que devem ser pegos, cinco que devem passar) e declara o que não alcança (cor vinda de outro módulo ou com duas indireções). | REGRA | `EXECUTION_04_REVISAO.md` §1.6; `mobile/src/__tests__/contrast.test.ts` | Um desenho que diga "este bloco é sempre preto" precisa dizer **explicitamente** que a superfície é fixa; senão o guarda barra e, pior, a peça some no tema escuro. |
| M-08 | **A faixa de alerta tem par próprio, e não é o par da marca:** `alertSurface`/`onAlert` = `#111111`/`#FFFFFF` no claro e **`#6B6A63`/`#FFFFFF`** no escuro (3,5:1 contra a página, 5,4:1 no texto, 3,7:1 no ponto amarelo). | REGRA | `EXECUTION_04_REVISAO.md` §1.6; `mobile/src/ui/theme.ts` | Literal: "Usar `markSurface` ali estaria errado — daria texto branco sobre amarelo." A faixa é preta com ponto amarelo `#FFD100` e altura mínima 44. |
| M-09 | **No tema escuro, "branco sobre destrutivo" não vale:** `onDanger` é `#111111` no escuro, porque branco sobre o vermelho claro do escuro (`#E0817A`) daria **2,77:1**. | REGRA | `mobile/src/ui/theme.ts` | Botão destrutivo ilegível exatamente no momento em que a pessoa mais precisa ler. |

### 4.3 A pomba

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
| M-10 | **A pomba acompanha o tema por padrão:** preta sobre página clara, branca sobre página escura. **Só as telas de fundo FIXO passam o tom** explicitamente. | BLOQUEANTE | `EXECUTION_04_REVISAO.md` §1.6; `mobile/src/ui/brand.tsx` | Foi um achado **alto**: a pomba tinha tom preto por padrão e seis telas aceitavam o padrão sobre fundo que segue o tema — no escuro, **pomba preta sobre página `#111111`. A marca do produto, invisível.** |
| M-11 | **A proporção do asset é 224×144 e a marca nunca é deformada** (a altura sai da largura; `resizeMode="contain"`). | REGRA | `mobile/src/ui/brand.tsx` | Marca esticada é dano de identidade e não passa em revisão de marca. |
| M-12 | **A pomba tem três papéis semânticos, e o papel define o rótulo acessível:** `marker` = "Você está aqui" (posição na jornada); `signature` = "Lagoinha" (assinatura de marca); `decorative` = já explicada pelo texto ao lado, **some do leitor de tela**. | REGRA | `mobile/src/ui/brand.tsx` | Pomba decorativa anunciada como "Lagoinha" em cada tela polui a navegação por voz; pomba-marcador sem rótulo esconde a informação de posição. |
| M-13 | **A pomba voando é um dos dois momentos de personalidade do produto** (o outro é a régua dos 100 dias). O voo é decorativo e desliga inteiro em "Reduzir movimento". | REGRA | `mobile/src/ui/FlyingDove.tsx`; `DESIGN_IMPLEMENTATION.md` §3 | Tirar os dois deixa o app correto e sem alma; fazer o voo carregar dado quebra a acessibilidade (A-12). |
| M-14 | **PENDÊNCIA DE PRODUÇÃO:** os arquivos da marca hoje são **PNG** extraídos do arquivo do cliente, e o time de design **pede explicitamente a substituição pelo vetor (SVG)** — "em produção a marca precisa ser nítida em qualquer escala e tingível por código". Trocar é mudança de asset, não de layout. | REGRA | `DESIGN_IMPLEMENTATION.md` §6.1; `mobile/src/ui/brand.tsx` | Sem o SVG, a marca serrilha em telas grandes e não pode ser tingida por token. Se o desenho novo tingir a pomba por cor, o SVG passa de pendência a **bloqueio**. |

### 4.4 O resto do sistema, para não ser reinventado por acidente

| Peça | Valores exatos em uso | Fonte |
|---|---|---|
| Escala de espaçamento | 4 · 8 · 12 · 16 · 24 · 32 | `mobile/src/ui/theme.ts` |
| Raios | botão 14–16, bloco 20–22, cartão 24, **folha 28**, pílula 999 (+ `sm` 8) | idem |
| Calha lateral | **26** em listas e texto, 20 em blocos de largura cheia, 14 em folhas; adaptativa: 40 a partir de 600px, 64 a partir de 900px | idem |
| Ícones | SVG, traço **1,9**; tamanhos 18 · 22 · 26 | `DESIGN_IMPLEMENTATION.md` §1; `mobile/src/ui/theme.ts` |
| Largura máxima de leitura | **640** | `mobile/src/ui/theme.ts` |
| Régua dos 100 dias | W = 342 no telefone de 390px (390 − 2×24); na implementação, largura real menos a calha, piso 240 | idem |
| Vidro | **só** na camada de navegação, barras de topo e folhas — "Nunca atrás de texto bíblico". Claro `rgba(255,255,255,0.82)`, quente `rgba(247,245,240,0.84)`, leitor `rgba(255,255,255,0.86)`; escuro `rgba(17,17,17,0.82)` / `rgba(26,25,23,0.84)`; scrim `rgba(17,17,17,0.5)` | idem |
| Sombra | **só** em folhas flutuantes e no cartão de notificação | idem |
| Alça da folha | 40×5, raio 28 no topo | `mobile/src/ui/components.tsx` |
| Compressão da linha da Jornada | O handoff comprime "trechos longos entre marcos" com reticências **sem definir a regra**. A implementada: ficam visíveis **o dia de hoje e três dias para cada lado, todos os marcos, as duas pontas e todo dia em aberto**; o resto vira reticência **clicável** que expande a linha inteira. A reticência **não escala com a fonte** (renderiza 48px sempre). | `DESIGN_IMPLEMENTATION.md` §2.3; `mobile/src/journey/journeyRowHeight.ts` |

---

## 5. PLATAFORMA — o que as lojas exigem e o que não pode aparecer na interface

| # | Invariante | Força | Fonte | Se quebrar |
|---|---|---|---|---|
S-01 | **Mobile real.** Literal: "Nada de website empacotado, WebView como produto, PWA embrulhada ou UI desktop adaptada." Considerar sempre navegação mobile, safe areas, teclado, gestos, lifecycle, acessibilidade, performance, offline/reconexão, push, permissões, deep links, estados loading/error/empty, privacidade, exclusão de conta, publicação real. | BLOQUEANTE | `CLAUDE.md` regra 1; `ARCHITECTURE_V0.md` §1.1 | Rejeição na App Store por app "de site"; e um desenho pensado em desktop não sobrevive a safe area + teclado + fonte grande. |
| S-02 | **Uso completo sem conta.** Ler e começar o plano funcionam sem login (Apple 5.1.1(v)); a conta serve para sincronizar e para lembretes em outro aparelho. Para menores, é o que garante que "menores usam sem que a igreja trate dados deles". | BLOQUEANTE | `ARCHITECTURE_V0.md` §1.4; `SECURITY_V0.md` §4.4; `CLAUDE.md` | Muro de login na abertura = rejeição da Apple e tratamento de dado sensível de adolescente sem base. Nenhuma tela de onboarding pode exigir conta. |
| S-03 | **Exclusão de conta dentro do app E por link web**, com reautenticação recente; hard delete em cascata; revogação do token Apple; e-mail de confirmação. Exportação JSON (portabilidade). | BLOQUEANTE | `SECURITY_V0.md` §5, §4.2; `CLAUDE.md`; `ARCHITECTURE_V0.md` §7.4 | Exigência explícita de Apple 5.1.1(v) e do Google Play (o **link web** é exigência do Play). Sem isso não passa na revisão. |
| S-04 | **Política de privacidade em pt-BR, com URL pública**, obrigatória nas duas lojas, coerente com os rótulos de privacidade da Apple e o Data safety do Google, e com a lista de suboperadores. | BLOQUEANTE | `SECURITY_V0.md` §4.3, §8 | Rótulo incoerente com os SDKs reais é motivo de rejeição e de notificação da ANPD. |
| S-05 | **Sem mecânicas de uso compulsivo.** Literal: "sem streak/recompensa por tempo, sem autoplay, 1 lembrete/dia configurável — isso condiciona as hipóteses de gamificação/ranking." Base: ECA Digital (Lei 15.211/2025) e Decreto 12.880/2026, art. 9º. | BLOQUEANTE | `SECURITY_V0.md` §4.4 item 4; `CLAUDE.md` | **Streak, badge, ranking e "não perca sua sequência" são proibidos por lei aplicável, não só por escopo.** *(Corrigido em 2026-09-21: o decreto lista quatro mecanismos — esconder o ponto de parada, autoplay, recompensa por tempo de uso e notificação excessiva. Streak, badge e ranking não aparecem no texto legal; estão fora por decisão de produto alinhada à lei. Ver docs/product/comunidade/02-lei.md.)* Sanção prevista: R$ 10 a R$ 1.000 **por usuário cadastrado** (art. 35). |
| S-06 | **Privacidade por padrão no nível mais protetivo:** analytics **off** por padrão, perfil não público, push mínimo. | BLOQUEANTE | `SECURITY_V0.md` §4.4 item 3; `CLAUDE.md`; `ARCHITECTURE_V0.md` §10 | Perfil público por padrão num app que revela convicção religiosa é exposição de dado sensível. |
| S-07 | **Push só para comunicados**; conteúdo promocional exige **opt-in explícito** (Apple 4.5.4). Lembrete diário é **notificação local inexata**, texto **sem dado sensível**, e **sem** `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`. Android 13+ exige canal + `POST_NOTIFICATIONS`. | BLOQUEANTE | `ARCHITECTURE_V0.md` §3 (`push`, `notifications`), §8 | Notificação promocional sem opt-in é rejeição direta da Apple; alarme exato sem justificativa é rejeição do Play. |
| S-08 | **Nenhum SDK de anúncios ou de atribuição.** Satélites permitidos: Sentry (erros) e PostHog (produto, agregado, sem PII, **sem session replay**), ambos em região UE. | BLOQUEANTE | `ARCHITECTURE_V0.md` §1.5, §10; `SECURITY_V0.md` §2 | Anúncio na interface de um app de igreja com dado sensível: problema de loja, de LGPD e de produto ao mesmo tempo. |
| S-09 | **Nada de pagamento, oferta, doação ou monetização na interface.** | BLOQUEANTE | `CLAUDE.md` §"Contexto do produto"; `ARCHITECTURE_V0.md` §Escopo | Fora de escopo declarado + regras de pagamento das lojas (compra digital fora da loja é rejeição). |
| S-10 | **Sem conteúdo de usuário visível a terceiros em V1.** Se qualquer feature social for aprovada, antes do lançamento dela: denúncia in-app, bloqueio de usuário, moderação humana com prazo, remoção, termos de conduta, contato do desenvolvedor. | BLOQUEANTE | `SECURITY_V0.md` §6 | Apple 1.2 e regras de UGC do Google. Desenhar feed/comentário/reação sem esse pacote é desenhar uma rejeição. |
| S-11 | **Conta só ≥ 18** (ou ≥ 16/17 se o jurídico aceitar), com autodeclaração de faixa etária + sinais de idade do SO/loja; em divergência, adotar a alternativa **mais protetiva**. Verificação robusta de idade **não** é exigida. | BLOQUEANTE | `CLAUDE.md`; `SECURITY_V0.md` §4.4 item 2 | Conta de adolescente sem as obrigações do ECA Digital. |
| S-12 | Telas institucionais obrigatórias: **termos em pt-BR com classificação indicativa**, página **"Para pais e responsáveis"**, **canal de denúncia acessível e gratuito**, e resumo público da avaliação de impacto. | BLOQUEANTE | `SECURITY_V0.md` §4.4 itens 5 e 6 | Art. 16 e art. 28 do ECA Digital; fiscalização da ANPD prevista a partir de jan/2027. |
| S-13 | **Distribuição só Brasil**; contas de desenvolvedor como **Organização** em nome da entidade dona; deep links em **domínio próprio da entidade**. | REGRA | `CLAUDE.md`; `ARCHITECTURE_V0.md` §9 | Conta pessoal de desenvolvedor numa marca de igreja é problema de titularidade — e há litígio público sobre a marca "Lagoinha" no INPI (2024), registrado como pendência jurídica. |
| S-14 | **Plataformas mínimas:** iOS 16.4+ e Android 7+ (minSdk 24). Metas de desempenho: início a frio **< 2,5 s** até a primeira tela, abrir capítulo **< 150 ms**, memória em leitura **< 200 MB**, **app < 60 MB** com duas traduções empacotadas, sync ≤ 30 s após reconexão. | REGRA | `ARCHITECTURE_V0.md` §12 | O orçamento de **60 MB** limita quantas imagens de alta resolução o desenho pode embarcar — um plano de fundo fotográfico por dia não cabe. |
| S-15 | **Atualização OTA (EAS Update) só para correções, textos e planos — nunca features novas nem permissões** (Apple 2.5.2 / DPLA 3.3.1(B)). | REGRA | `ARCHITECTURE_V0.md` §11 | Suspensão de conta de desenvolvedor. |
| S-16 | **Sem bloqueio de captura de tela**, sem `FLAG_SECURE` (é app de leitura). | REGRA | `SECURITY_V0.md` §3.1 | Registrado para que ninguém proponha "proteger o texto" com bloqueio de screenshot — não é o controle escolhido. |

### 5.1 O que explicitamente NÃO pode aparecer na interface

| Não pode aparecer | Por quê | Fonte |
|---|---|---|
| Texto de tradução bíblica (qualquer uma) | Gate 1 aberto | `CLAUDE.md`; `EXECUTION_04_REVISAO.md` §1.1 |
| Nome de líder / pessoa real | `leader_names_authorized = false` | `EXECUTION_04_REVISAO.md` §1.3 |
| Número coletivo inventado ("1.812 pessoas", "64% da igreja") | não há fonte de dado | `DESIGN_IMPLEMENTATION.md` §4 |
| Conteúdo de dia futuro (leitura, referência, tema) | bloqueio de rota | `EXECUTION_04_REVISAO.md` §1.8 |
| Conteúdo DEV sem o banner de aviso | Gate 2 | `CLAUDE.md` |
| Streak, badge, ranking, autoplay, recompensa por tempo | Decreto art. 9º + hipóteses não aprovadas | `SECURITY_V0.md` §4.4; `CLAUDE.md` |
| Anúncio, botão de doação/oferta/pagamento | fora de escopo + regras de loja | `CLAUDE.md`; `ARCHITECTURE_V0.md` §1.5 |
| Nome de enum técnico na cópia (ex.: `pending_authorization`) | achado **aberto** do grupo F: "enum `pending_authorization` exposto" | `EXECUTION_04_REVISAO.md` §3 |
| "hoje" num dia que não é hoje; "Tema" onde a igreja diz **"Ênfase"**; o altar descrito de três jeitos diferentes | achados **abertos** do grupo F (2 médios) | `EXECUTION_04_REVISAO.md` §3 |
| Dado sensível no texto de notificação | LGPD + minimização | `ARCHITECTURE_V0.md` §8 |

### 5.2 Uma regra de processo que vale para o desenho também

Literal, `CLAUDE.md`: "Se um problema técnico afetar produto/estratégia, **não mudar silenciosamente**.
Entregar: `PROBLEMA → EVIDÊNCIA → IMPACTO → ALTERNATIVAS → RECOMENDAÇÃO`."

E: "A pendência de autorização é uma Launch Gate, não um convite para mudar o produto. Se ela não vier, a
decisão volta ao Product Brain."

**Consequência para o designer externo:** onde um invariante desta lista atrapalhar o desenho, o caminho é
**expor o conflito** nesse formato, não resolver por conta própria. Nenhum item marcado BLOQUEANTE pode ser
contornado por decisão de desenho.

---

## 6. Resumo de uma linha por grupo

1. **Conteúdo e direito** — nada de texto bíblico, nada de nome de pessoa, nada de dado inventado, banner de
   aviso sempre presente, consentimento destacado antes de qualquer sincronização.
2. **Produto** — o dia é o da igreja (bloqueado na rota, não no botão), entrada tardia é normal, marco é
   contagem pessoal sem data, número sem fonte é estado honesto de indisponível.
3. **Acessibilidade** — 48 de alvo de toque; **toda** medida do handoff é piso e nunca teto; nada reserva
   espaço por constante; contraste 4,5:1 / 3:1 nos dois temas; o amarelo nunca carrega o dado sozinho;
   movimento sempre dispensável.
4. **Marca** — `#FFD100` só preenche, `#111111` é a tinta, "marcado" inverte de papel com a superfície
   (`#111111`+amarelo no claro, amarelo+`#111111` no escuro), a pomba acompanha o tema e nunca deforma.
5. **Plataforma** — uso completo sem conta, exclusão no app e na web, política pública em pt-BR, zero
   mecânica compulsiva, zero anúncio, zero pagamento, sem UGC visível.


---

## O que ficou em aberto neste levantamento

- CONFLITO ENTRE DOCUMENTOS — definição do Launch Gate 2: `DESIGN_IMPLEMENTATION.md` §6.3 (datado de 2026-09-07) diz que o Gate 2 é a "autorização do plano 42360", enquanto `CLAUDE.md` (após 2026-09-19) define o Gate 2 como a autorização escrita da igreja para o material próprio e declara o plano 42360 **superado**. Assumi a definição do `CLAUDE.md` por ser a mais recente, mas o §6.3 do handoff de implementação continua escrito de forma desatualizada — quem revisar o pacote deve confirmar qual texto o Product Brain considera vigente.
- AMBIGUIDADE DE META DE ACESSIBILIDADE — `ARCHITECTURE_V0.md` §12 fixa a meta em "Dynamic Type/fontScale até 200% sem quebra", mas o `EXECUTION_04_REVISAO.md` §1.12–1.13 afirma que o teto real deste build é 3,571× (AX5) e os testes novos medem em 3,571×. Não há documento que diga qual dos dois é o contrato para um desenho novo: projetar para 200% e capar acima, ou garantir 3,571× em toda caixa. Não escolhi por conta própria.
- REFLEXÕES / GRUPOS / MINISTÉRIOS — a lista de "Hipóteses NÃO aprovadas" do `CLAUDE.md` inclui explicitamente "grupos", "reflexões", "diário" e "ministérios", mas o app implementado tem tela de reflexão (`/reflexao/[day]`), grupo (`/grupo/[id]`), escolha de ministério e a tela Juntos, todos vindos do handoff aprovado e do MASTER PRODUCT SPEC v1.1. Ou o `CLAUDE.md` está desatualizado nesse ponto, ou essas features foram aprovadas em documento que não está entre os cinco que li (não tenho acesso ao MASTER PRODUCT SPEC v1.1). Marquei o invariante P-16 com essa ressalva.
- CONTRASTE: NORMA APLICÁVEL — a meta declarada em `ARCHITECTURE_V0.md` §12 é "WCAG 2.2 AA / NBR 17060", mas a implementação e a auditoria medem pela fórmula da WCAG 2.1 e verificam apenas os pares de token. Os requisitos da 2.2 que não são de contraste (ex.: target size, focus appearance) não aparecem em nenhum checklist que eu tenha encontrado nesses documentos.
- TEMA ESCURO NO DESENHO NOVO — o handoff original especifica **apenas** aparência clara; o tema escuro foi derivado por engenharia da tela 11. Não há documento dizendo se o designer externo deve entregar as duas aparências ou apenas a clara. Como foi exatamente essa lacuna que produziu os defeitos do grupo A (marca invertida e pomba invisíveis no escuro), registrei o tema escuro como invariante (P-18), mas o escopo do entregável é ambíguo.
- JEJUM (grupo G, 2 achados, 1 médio) — segue **aberto e dependente de resposta da igreja**, não de código: "continua como 'propósito' da campanha e ganhou superfície nova, sem a confirmação da igreja". Um desenho novo não deveria ampliar a superfície do jejum antes dessa resposta, mas não há decisão escrita sobre o que fazer se a igreja disser não.
- LEITOR DE TELA (grupo E, 7 achados) e o passe de acessibilidade pendente (Texto em Negrito, header de 17px, contraste de estados com `opacity`) estão **abertos**. Isso significa que o código atual não serve de referência de rotulagem acessível, e que o contraste dos estados desabilitados do app **nunca foi medido**.
- TETOS DE FONTE — encontrei `maxFontSizeMultiplier` em quatro pontos (leitor 1,8×; numeral do marco 1,2×; tela de conta 1,8× e 1,6×) e o teto de 2× nas linhas da Jornada. Nenhum documento explica por que 1,6× na tela de conta nem se esses tetos são decisão de desenho ou dívida. O próprio `EXECUTION_04_REVISAO.md` §1.14 classifica o caso do leitor como "de produto, não de código".
- SVG DA MARCA — não existe. Os PNGs (224×144) foram extraídos do arquivo do cliente pelo time de design, que pede a substituição pelo vetor. Se o desenho novo tingir a pomba por token de cor, essa pendência passa de "troca de asset" a bloqueio de implementação.
- ESTADO DO REPOSITÓRIO vs. DOCUMENTO — o cabeçalho do `EXECUTION_04_REVISAO.md` diz que "o grupo B está na árvore de trabalho", mas o histórico do git mostra o grupo B já commitado (`ba686a2`, "fix: make every box with text grow with the system font size") e a árvore limpa. O cabeçalho do documento está desatualizado nesse ponto; o conteúdo técnico das seções 1.10–1.14 continua válido. Não editei nada.
