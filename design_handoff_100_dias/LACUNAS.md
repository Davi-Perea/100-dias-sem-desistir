# Lacunas do redesenho — mapeamento das 32 telas contra o código

- **Data:** 2026-09-21
- **Método:** sete auditores independentes, um por grupo de telas (A a F) e um para tokens e
  infraestrutura, confrontaram `TELAS.md`, `TOKENS.md` e `REGRAS.md` com o código real em `mobile/`.
  Nenhum arquivo foi alterado durante o mapeamento.
- **Resultado:** 193 achados. A triagem de quem resolve
  cada um está em `PERGUNTAS_AO_DESIGNER.md` (desenho), no resumo da conversa (dono) e na regra de
  trabalho registrada: erro técnico do spec é corrigido na implementação e listado no relatório da etapa.

---

## Prontidão por tela

| Tela | Hoje | Pronta? | Resumo |
|---|---|---|---|
| A1 | mobile/src/app/(tabs)/jornada.tsx (lista) + mobile/src/app/(tabs)/index.tsx (Início, cujo conteúdo vira o painel de hoje e a aba deixa de existir) | **não** | Os dados do painel existem (dia oficial, monte, ênfase em `title`, leitura, estimativa), mas theme_highlight está vazio em 100 de 100 dias. Faltam na especificação: o estado de hoje já concluído, a conclusão para quem lê na Bíblia impressa, o acesso ao A3 de hoje e o lugar do aviso C-07. A lista virtualizada precisa trocar alturas constantes por alturas medidas. |
| A2 | mobile/src/app/(tabs)/index.tsx:226-238 (return-module, gatilho gapDays >= 3 em :149-150) | **não** | O gatilho novo dispara para quem entra pela primeira vez no meio da campanha e continua disparando para sempre para quem não recupera os dias em aberto. A cópia conta dias de falta, e o próprio parágrafo proíbe isso. |
| A3 | mobile/src/app/dia/[day].tsx | com ressalvas | Todos os dados existem no dataset (monte, ênfase, leituras, versículo-base, 5 a 6 motivos, altar em 100 de 100 dias). Problemas: "Hoje conduz" e "jejum hoje" aparecem em dias passados, a tela não tem estado de concluído nem ação de marcar e não tem aviso C-07. |
| A4 | jornada.tsx:286-302 (Sheet) + telas cheias em dia/[day].tsx:173-188, reader/[day].tsx:124-139 e intercessao/[day].tsx:182-199; reflexao/[day].tsx não trava | com ressalvas | Hoje são quatro implementações diferentes e a rota da reflexão deixa salvar em dia futuro. Falta definir o que fica atrás da folha quando a rota abre a frio por deep link. |
| A5 | mobile/src/app/(tabs)/index.tsx:104-142 (phase before_start) | com ressalvas | A contagem, as datas e a régua inativa já existem. A cópia afirma "jejum", o destino de "Ajustar meu lembrete" contradiz a regra de permissão da própria especificação e "Criar meu perfil" leva a um fluxo (D2) que não existe. |
| B1 | mobile/src/app/reader/[day].tsx (rota /reader/[day]) | com ressalvas | Dá para implementar hoje a barra de topo, o filete de progresso, a paginação, o rodapé medido e os estados vazio e trancado. O corpo não dá: não existe contagem de versículos no repositório, o provedor de texto não tem o estado 'sem tradução', não há lugar para a atribuição da licença e ninguém decidiu se o app lança sem texto. O código atual ainda conclui o dia pelo 'Prefiro ler na minha Bíblia' e prende a releitura no capítulo 1. |
| B2 | mobile/src/app/reader/[day].tsx:319-386 (rodapé; não existe empilhamento) | com ressalvas | O rodapé já é medido com onLayout (linhas 69, 242 e 321). A lógica de empilhar ainda não existe. A regra 'medido, não por constante' não diz qual rótulo medir, se 24/30 é tamanho-base ou tamanho já renderizado, nem como ficam o capítulo 1 e o link 'Prefiro ler'. |
| B3 | Sheet em mobile/src/app/reader/[day].tsx:388-400 (os mesmos controles duplicados em mobile/src/app/aparencia.tsx:19-81) | com ressalvas | Faixa 14–30 e passo ±2 já existem; o padrão hoje é 18, não 19. A frase 'até o máximo que o sistema permite' é falsa hoje, por causa do maxFontSizeMultiplier={1.8} na linha 297. Padrão 19 com passo 2 e limites pares é incoerente, 'amostra real' não pode ser texto bíblico e os dois botões lado a lado transbordam em fonte grande. |
| B4 | nova (hoje a conclusão faz router.back() em reader/[day].tsx:165 e o marco é disparado pela aba Início, index.tsx:81-88) | **não** | O botão principal leva a C3/C4, que não têm backend nem registro de consentimento. O público descrito contradiz o de C3. Não está definida a ordem entre B4 e o marco E3/E4, cujo gatilho mora numa aba que o redesenho remove. A cópia diz 'hoje' mesmo quando o dia concluído é de outro dia. |
| B5 | mobile/src/app/reflexao/[day].tsx (modal, _layout.tsx:74-77) | com ressalvas | Quase tudo existe: barra, cadeado, campo de 220, confirmação de exclusão e rodapé com cap + 'Salvar para mim'. Saem o 'Compartilhar um insight' desabilitado e a legenda social (linhas 176-192). A versão com teclado aberto é exigida mas não está descrita nos .md. A rota não é trancada para dia futuro, e o teste atual confirma esse comportamento. |
| C1 | mobile/src/app/(tabs)/juntos.tsx (aba 'Juntos', (tabs)/_layout.tsx:33). Hoje ela mostra o altar, 'Sobre o propósito', o grupo e marcadores de 'insights ainda não disponíveis' (juntos.tsx:319-327). Não existe feed. | **não** | Não existem servidor, tabelas de post, reação e bloqueio, leitura sem conta, detecção de rede nem o ícone do Amém. Só a linha de cabeçalho 'Dia N · a igreja está lendo X' tem fonte hoje: useJourney + readingSummary (readingSummary.ts:26). A especificação não diz como o feed termina, em que ordem vem, nem o que acontece antes ou depois da campanha e sem conta. |
| C2 | nova | **não** | A tela em si é trivial, mas depende do feed de C1. Só cobre 'primeiro dia', e 'Ler o dia 1' manda para A1, que está trancado antes de 23/09. Pressupõe o feed no ar no dia 1, e isso não é viável: a campanha começa em 23/09, daqui a 2 dias. |
| C3 | nova. O mais próximo é o botão desativado 'Compartilhar um insight' em reflexao/[day].tsx:182-192. | **não** | Não há seletor de foto, upload, storage, remoção de EXIF, tabela de posts nem fila offline. O texto de audiência ('toda a igreja') contradiz o de C4. Publica direto, sem a filtragem prévia da Apple 1.2. Falta dizer qual dia é marcado quando se escreve sobre um dia passado ou fora da campanha. |
| C4 | nova | **não** | A tabela de consentimento versionado não existe (existia só no schema apagado no commit bc74dae). A tela não prevê idade, regras da comunidade nem revogação, e 'uma vez na vida' contradiz um consentimento que tem versão. O fluxo não diz onde a conta é criada, que é pré-requisito para registrar o aceite. |
| C5 | nova. O primitivo Sheet existe em ui/components.tsx:880. | **não** | Não há tabelas de denúncia e bloqueio, nem fila, papel ou tela de quem modera. A denúncia não tem motivo, recibo, estado nem aviso ao autor. Não existe variante para o conteúdo próprio (apagar). 'Não quero ver este assunto' não tem modelo de assunto. O texto usa pronome de gênero, que o app não coleta. |
| C6 | nova | **não** | Não existe nenhum modelo de comentário: o schema antigo dizia 'sem comentários', e a denúncia só tinha como alvo post ou usuário. Faltam na especificação o estado vazio, a exigência de conta, idade e consentimento antes do primeiro comentário, o limite de caracteres e como apagar o próprio comentário. |
| D1 | mobile/src/app/(tabs)/voce.tsx (aba Você) | com ressalvas | Quase todos os números já existem e são locais: progresso (journey.completedCount, voce.tsx:148), reflexões (voce.tsx:158), jejum (voce.tsx:164-168), lembrete (voce.tsx:80-84), ministério (voce.tsx:178). O nome hoje sai do prefixo do e-mail (voce.tsx:76-77); getMyProfile (groups.ts:24) nunca é chamado. Três pontos não têm como ser construídos hoje: a linha 'Meu grupo · 7 pessoas' (não há infraestrutura), 'Conta e privacidade' (a tela não foi desenhada; exclusão e exportação não existem) e seis funções atuais que ficam sem lugar na tela nova. |
| D2 | nova (a casca de passos existe em src/ui/OnboardingStep.tsx, mas o total está fixo em 3 na linha 9) | **não** | Não há passo de criar conta nem de declarar idade, e sem conta foto e nome não têm onde ficar (profiles depende de auth.users). Os passos 3 e 4 podem aproveitar a lógica de /ministerio e /lembrete. O passo 5, grupo de amigos, não tem nenhuma infraestrutura. |
| D3 | nova | **não** | Faltam as bibliotecas de câmera e galeria, o bucket de Storage, um Avatar que mostre imagem (hoje components.tsx:321 só desenha iniciais) e uma policy que deixe o leitor do feed ver o perfil de quem publicou. Só o passo 1 foi desenhado; o conteúdo dos passos 2 a 5 está em aberto. A regra de permissão diz o contrário de REGRAS 13. |
| D4 | mobile/src/app/grupo/[id].tsx, mas é outro conceito: grupo da igreja com líder e admin, lista de membros só para quem lidera | **não** | Mostra de quem é e se leu hoje, o que tira o progresso do aparelho e esbarra em REGRAS 14, no item 2 de C4 e na LGPD. Nenhum desses dados existe no servidor. O modelo de grupo, com até 12 amigos, sem administrador e com convite, não existe e não é o grupo de hoje. O 'Amém com nome' vai contra REGRAS 19. |
| D5 | mobile/src/app/proposito.tsx + content/100-dias-2026/proposito.json | com ressalvas | O texto já existe palavra por palavra e em tipos de bloco: 9 seções públicas, 5 passos e a citação de Levítico 6:13 como bloco scripture. A especificação muda a ordem e o rótulo do texto da igreja, troca a fonte do subtítulo e deixa de fora o banner do Gate 2 e a legenda que avisa do recorte. A tradução da citação ainda não foi informada. |
| E1 | mobile/src/app/intercessao/[day].tsx (/intercessao/[day]) | com ressalvas | Todo dado da tela já existe e vem do conteúdo, não do código. Os cinco passos vêm de proposito.json flow via flowSteps() (proposito.ts:55-57). A ênfase vem de `title` (100 de 100 dias; `theme` e `theme_highlight` estão vazios nos 100). Monte, versículo-base, motivos e altar.ministry também vêm do dataset (intercessao:95-133, 213-218). O desenho em HTML não está no repositório (design/FALTANDO.md), então não dá para conferir se os títulos dos passos no mock batem com os reais. Os títulos reais são: Arrependimento pessoal / Arrependimento congregacional / Palavra-base do dia / Intercessão pelo Monte do dia / Adoração e entrega. Ressalvas: 'hoje conduz' aparece em dia passado, o aviso de conteúdo falta na especificação, e a entrada por lembrete não existe. |
| E2 | estado dentro de intercessao/[day].tsx (linhas 203-210), renderizado por mobile/src/ui/AltarMode.tsx | com ressalvas | Três dos quatro comportamentos já existem. Tela acesa: useKeepAwake em AltarMode.tsx:1,54. Gesto de voltar do iOS desligado: Stack.Screen gestureEnabled:false em intercessao:207, religado em :222. Voltar do Android sai do modo, não da tela: BackHandler em AltarMode.tsx:63-69, testado em intercessao.test.tsx:199-222. Nada disso foi verificado em aparelho. O anúncio único NÃO existe: o anúncio triplicado segue aberto e o novo rodapé tende a piorá-lo. Faltam na especificação o conteúdo do passo 4, o rótulo do último passo e o comportamento do '‹' no passo 1. |
| E3 | mobile/src/app/marco/[day].tsx (/marco/[day], fullScreenModal em _layout.tsx:78) | **não** | O que já bate com a especificação: cap 'Marco · N de 100 dias lidos' sem data, sem monte e sem ênfase (marco:92-108), régua com os dias realmente lidos (marco:155-161) e os quatro rótulos iguais aos de milestones.ts:7-10. O que impede: 'Guardar este marco' é promessa falsa e não tem destino em nenhuma das 32 telas. O gatilho mora na aba Início, que o redesenho elimina, e nenhum teste cobre esse gatilho. A regra 'uma vez por marco' não está garantida hoje. Das quatro frases, só a do 25 foi especificada. |
| E4 | mobile/src/app/marco/[day].tsx com day=100 (isArrival, linha 44) | com ressalvas | A data 31/12/2026 sai de formatDayDate. 'Apocalipse 21:5' deve vir de getDay(100).key_verse_reference (REV 21:5) passado por formatReference, nunca escrito na mão. Os três números reais e locais existem: completedCount, reflectionCount (reflectionsStore.ts:63) e fastingKeptCount (fastingStore.ts:57). O jejum é um item de array e dá para remover, mas não existe bandeira de campanha para isso. Em aberto: o que 'Guardar minha jornada' faz (hoje só marca como visto), a rota sem guarda, e 'dias lidos' que é sempre 100. |
| E5 | nova — hoje a fase 'finished' reaproveita (tabs)/index.tsx trocando só rótulos (index.tsx:148, 163, 247, 256) e juntos.tsx:46-50. Jornada não trata o fim da campanha. | com ressalvas | '83' é journey.completedCount e '42' é reflectionCount; os dias em aberto continuam liberados (useJourney.ts:72, 78). Não está especificado: a fronteira entre E5 e A1, para onde vai 'Ver a jornada inteira', as variantes com 0 e 100 lidos e com 0 ou 1 reflexão, e se a régua é contínua ou pinta os dias lidos. A promessa 'a próxima jornada aparece aqui' não tem infraestrutura. |
| F1 | mobile/src/app/onboarding/index.tsx (01a Boas-vindas) | com ressalvas | O layout dá para fazer hoje: Screen tone='yellow' já existe (components.tsx:44) e a pomba preta PNG (#111111 sobre transparente) tem contraste 12,92:1 sobre #FFD100. Três coisas ainda não fecham. 'Já tenho perfil' não tem destino desenhado, e o botão equivalente de hoje ('Já tenho conta' → /conta) é devolvido para /onboarding pelo portão (_layout.tsx:27-31). A pomba em 112pt fica borrada em tela 3x. E o título quebra no meio da palavra em fonte grande. |
| F2 | onboarding/leitura.tsx (passo 1) + onboarding/jejum.tsx (passo 2) + onboarding/lembrete.tsx (passo 3); onboarding/pronto.tsx (01e) deixa de existir | com ressalvas | O passo 1 já é quase F2: muda o marcador de seleção (ponto de 11px no lugar do check), a borda da opção não marcada passa de borderStrong para controlBorder, entra o '‹ Voltar' e saem as descrições. Os passos 2 e 3 não têm cópia especificada, e o jejum depende de resposta da igreja. O lembrete contradiz a regra de 'único ponto de permissão' de D3. O que pronto.tsx fazia (gravar onboardingCompleted e disparar o evento onboarding_completed, pronto.tsx:28-39) passa para o 'Continuar' do passo 3. |
| F3 | StateView kind='loading' (components.tsx:767-775): ActivityIndicator girando + 'Carregando…', usado em 18 pontos | com ressalvas | Hoje é spinner, não esqueleto. A especificação só desenha o esqueleto de A1, e as outras 17 telas que carregam não têm forma definida. O carregamento real é uma leitura de AsyncStorage de milissegundos (useJourney.ts:97), então o esqueleto aparece como um piscar. Na primeira abertura ele aparece antes de F1. |
| F4 | OfflineBanner (components.tsx:802-824), exibido só em (tabs)/index.tsx:223 quando session.degraded | **não** | Não existe detector de conectividade: nenhum NetInfo nem expo-network no package.json. A faixa atual depende de session.degraded, que só fica verdadeiro com nuvem configurada, sessão aberta e falha na consulta de papel ou grupo, por qualquer motivo. A cópia promete fila de publicação e volta automática da comunidade, e nenhuma das duas coisas existe. |
| F5 | StateView kind='error' só no leitor (reader/[day].tsx:284-289: 'Não foi possível carregar' + error.message cru); não há ErrorBoundary em nenhuma rota | com ressalvas | A tela dá para desenhar, mas quase não há falha real que a dispare: o conteúdo do dia está embarcado e é lido de forma síncrona, e as lojas locais engolem erro de leitura. A cópia 'nada foi perdido' não é verificável pelo app e pode ser falsa. Falta definir quais telas usam F5 e com que texto. |
| F6 | app/reflexoes.tsx:28-34 (StateView kind='empty' dentro de ScreenScroll, ação 'Voltar') | com ressalvas | O dado existe: reflectionDays(reflections) vem do aparelho. O StateView não aceita ícone e usa flex:1 dentro de ScrollView, o defeito conhecido que se repete em outros 4 pontos. A tipografia do título contradiz TOKENS.md, e não está dito o que 'Escrever a de hoje' faz antes ou depois da campanha. |
| TOKENS §1–2 · Cores (claro e escuro) | mobile/src/ui/theme.ts:20-120 (palettes light/dark) | com ressalvas | Os 24 tokens em comum têm hoje exatamente os mesmos hex nos dois temas. Entram onAccentMuted, blue, onBlue, blueSoft, blueSoftBorder, onBlueSoft e warningSurface (mesmo hex de devBannerSurface). Saem nodeDone (jornada.tsx:364, dia/[day].tsx:45), success (só contrast.test.ts:64), readerBackground (reader/[day].tsx:331, components.tsx:42) e devBanner/devBannerSurface (reader/[day].tsx:267-277, components.tsx:851-867), estes últimos com hex idêntico a warning/warningSurface. A ressalva: faltam conjuntos para as superfícies fixas (ver achado). |
| TOKENS §3 · Tipografia e fontes | mobile/src/ui/fonts.ts:1-42; theme.ts:169-186; components.tsx:106-188 (textStyle/AppText) | com ressalvas | Os dois pacotes existem no npm (conferido com npm view em 2026-09-21), com licença MIT AND OFL-1.1: @expo-google-fonts/schibsted-grotesk 0.4.2 (12 faces, entre elas SchibstedGrotesk_400Regular, _500Medium, _600SemiBold, _700Bold, _800ExtraBold e também _900Black) e @expo-google-fonts/source-serif-4 0.4.1 (16 faces, entre elas SourceSerif4_400Regular, SourceSerif4_600SemiBold, SourceSerif4_400Regular_Italic, _700Bold e _600SemiBold_Italic). Nenhum dos dois está instalado. Hoje as fontes são carregadas do pacote local via useFonts (fonts.ts:39-42), e a primeira pintura espera por elas (_layout.tsx:41-52), então trocar a família é mecânico. O difícil são os conflitos da tabela e o suporte a negrito. |
| TOKENS §4 · Espaço, raio, calha e pisos | mobile/src/ui/theme.ts:122-160, 243-258 | com ressalvas | spacing, MIN_TOUCH 48 e MAX_CONTENT_WIDTH 640 não mudam. Raios mudam: sm 8→10, button 14→16, block 20→22; saem buttonLg (ChoiceRow, components.tsx:697), blockLg (Block, components.tsx:247) e card (sem uso). Calha: screen 26→24; gutter.sheet muda de sentido (14→26); block sai (sem uso). Renomeações: TAB_BAR_HEIGHT 86→TABBAR_MIN_HEIGHT 64 ((tabs)/_layout.tsx:96,112; TabBar.tsx:134,178) e BUTTON_HEIGHT→BUTTON_MIN_HEIGHT (components.tsx:22,391,400; reader/[day].tsx:29,349). iconSize está sem uso. |
| §5 · Botão (primary, blue, outline, yellow, underline, danger) | mobile/src/ui/components.tsx:348-476 | com ressalvas | Falta a variante blue. O contornado sobe de 52 para 56 (components.tsx:409). O paddingHorizontal vira 20 em todas (hoje 24/16/4/8). O sublinhado com offset 3 não existe no RN. Nas superfícies fixas é preciso manter onInk e criar um onYellow, que o TOKENS não define. |
| §5 · Bloco de conteúdo | mobile/src/ui/components.tsx:222-299 (Block/Card) | sim | Já usa raio 22, borda rgba(17,17,17,0.06)/0.10, padding 16, minHeight 48 e fundo surface/warm. Só falta trocar o nome radius.blockLg→radius.block. |
| §5 · Barra de navegação flutuante (3 destinos) | mobile/src/ui/TabBar.tsx:1-118; mobile/src/app/(tabs)/_layout.tsx:1-37 | com ressalvas | Hoje é uma barra de largura total, com 86 de piso, colada ao fundo e pílula ativa amarela (TabBar.tsx:178,205,220-234), servindo quatro abas (index, jornada, juntos, voce). expo-blur 57.0.2 já está instalado e em uso (TabBar.tsx:1,109), o Android já cai para superfície sólida com elevação 8 como pede o TOKENS.md:99, e a altura já é medida (_layout.tsx:112,119). Faltam: pílula de 64, left/right 20, bottom 26, ativo em markSurface/onMark, três ícones SVG novos (react-native-svg 15.15.4 instalado) e a remoção de index/juntos, que hoje são alvo de '/' em 5 lugares e de '/(tabs)/juntos' em 3 (typedRoutes ligado, app.json:39). |
| §5 · Ícones | mobile/src/ui/icons.tsx:12-145 (19 ícones SVG, traço 1,9) | **não** | Os ícones de navegação, comentar, bandeira, bloquear, traço e cadeado dá para fazer em SVG já instalado (traço 2/2,5). O Amém depende de um PNG que não está no repositório e cuja licença está pendente, e ainda precisa de um estado cheio que não foi entregue. |
| §5 · Nó da jornada (4 formas) | mobile/src/app/(tabs)/jornada.tsx:340-384 (nó inline, com formas de marco e de dia 100) | sim | Quatro formas simples em View, todas com contraste medido. O nó 'lido' troca nodeDone #3F3D38 com check por um círculo cheio de 13px em text. Os nós numerados de marco e a bandeira do dia 100 (jornada.tsx:340-356) saem. |
| §5 · Régua dos cem dias | mobile/src/ui/HundredDayRuler.tsx:1-108 (viewBox W×40, faixa amarela, traços de tinta) | com ressalvas | A geometria x(i) é a mesma. Mudam a altura do viewBox (36), o traço lido (amarelo 2,2×16), o futuro (1,6×10) e o de hoje (3px, altura cheia). O estado 'em aberto' e as variantes A5/E3/E4/E5 não estão definidos. |
| §5 · Folha modal | mobile/src/ui/components.tsx:880-938 (Sheet) | com ressalvas | Raio 28, alça 40×5, gap 16, maxHeight 88% com rolagem interna e scrim rotulado 'Fechar' já existem. Faltam: paddingBottom 40 + área segura (hoje 32, components.tsx:907), scrim do escuro rgba(0,0,0,0.6), título opcional (hoje obrigatório, :886; C5 não tem título) e animação que respeite 'Reduzir movimento' (hoje sempre slide, :891). |
| §5 · Movimento | mobile/src/ui/theme.ts:157-160, 222-237; mobile/src/app/_layout.tsx:65; mobile/src/ui/FlyingDove.tsx | com ressalvas | O voo da pomba (3200ms, −4→−1deg, desliga com 'Reduzir movimento') já está implementado exatamente. A transição de navegação de 220ms ease-out não se aplica ao native-stack com a animação default, e a navegação não consulta 'Reduzir movimento'. |
| Primitivos sem especificação em TOKENS (pílula, linha de lista, caixa de marcação, campo de texto, interruptor, segmentos de passo, esqueleto, avatar com foto) | Pill components.tsx:507-551; SettingRow :605-661; Checkbox :559-599; StepBar :733-753; SpherePill.tsx:156-201; campo, interruptor e esqueleto não existem em ui/ | **não** | O PROMPT.md:51 manda fazer esses itens na etapa 1, mas o TOKENS §5 só especifica botão, bloco, barra, ícones, nó, régua e folha. O resto está espalhado e incompleto em TELAS (pílula de monte 30, caixa 28 raio 8, interruptor 52×32 sem o estado desligado, campo sem borda). |
| Superfícies fixas (F1, C4, E2, E3, E4) | mobile/src/ui/components.tsx:38-46 (Screen tone 'ink'/'yellow' com hex fixo), :383-384 (Button onInk); AltarMode.tsx:13-15 | **não** | O TOKENS declara que as cinco telas não mudam com o tema, mas o TELAS especifica nelas tokens temáticos. Medido, isso dá pares ilegíveis em um dos dois temas. |
| Aviso obrigatório de conteúdo (C-07, DevContentBanner) | mobile/src/ui/components.tsx:835-874, usado em 8 rotas; portão de release em mobile/src/journey/datasetSource.ts:27-38 | **não** | Nenhuma das 32 telas posiciona a faixa. Só sobreviveram os tokens warning/warningSurface. |
| Cabeçalho nativo vs barra própria | mobile/src/app/_layout.tsx:57-88 (headerTitleStyle fonts.label 17 na linha 61; header nativo em 10 rotas) | com ressalvas | Todas as telas desenhadas que têm voltar usam barra própria (A3, B1, B5, C3, C4, C6, D3, E1, E2, F2). D2, D4, D5 e F6 não dizem qual usam, e os destinos de D1 (conta, aparência, lembrete, ministério, jejum) não foram desenhados. |
| Suporte a 'Texto em Negrito' (REGRAS 31) | não existe (nenhuma chamada a isBoldTextEnabled/boldTextChanged em mobile/src) | **não** | No RN 0.86 a API só existe no iOS. Com faces nomeadas por família, o suporte exige um mapa de promoção de peso e faces extras, o que contradiz as 'oito faces'. |
| Infraestrutura nativa e de servidor | mobile/package.json:5-37; mobile/app.json; mobile/supabase/migrations/20260907120000_foundation.sql | **não** | expo-blur, react-native-svg e expo-keep-awake já estão instalados. Faltam expo-image-picker, detecção de rede, roteamento de toque em notificação e todo o backend da Comunidade, do perfil com foto, do grupo, da exclusão de conta e da exportação. |

---

## Bloqueios — impedem implementar como especificado (37)

### B1 · ALTA · B1

A 'estrutura de versículos' (numeral + barra por versículo) não tem fonte de dado. O repositório só guarda quantos capítulos cada livro tem. Quantos versículos tem cada capítulo não existe em lugar nenhum. O único número de versículos disponível é inventado pelo provedor DEV (8 a 19 por hash), então numerar os versículos de Josué 9 hoje seria mostrar uma estrutura falsa de um capítulo real. REGRAS §1.5 diz que barra listrada = campo real do dataset, mas o dataset só traz referências e não pode trazer texto bíblico (Gate 1).

- **Evidência:** mobile/src/bible/books.ts:5 (Book = {id,name,chapters}); mobile/src/reader/devPlaceholderText.ts:32 (count = 8 + seed % 12); design_handoff_100_dias/REGRAS.md:13; TELAS.md:58
- **Sugestão:** Designer: as barras são marcação do desenho (e o app mostra só cap + numeral + aviso) ou elemento de produto? Se forem de produto, a contagem de versículos por capítulo (dado público) precisa entrar como dado versionado, com fonte, antes da implementação.

### B2 · ALTA · B4

'Escrever para a igreja' → C3, ou C4 na primeira vez: nada disso tem infraestrutura. Não há tabela de publicação, consentimento ou denúncia; as migrações só têm profiles, groups, group_memberships, app_admins e admin_audit_log. A nuvem não está configurada nesta build. Não existe registro local da versão de consentimento aceita, então não dá para decidir entre C3 e C4. Publicar exige conta (REGRAS 12), e B4 não tem estado para quem não tem conta nem para menor, que não publica (00-DECISAO-FEED item 7). A decisão do feed está pendente de ratificação do Product Brain.

- **Evidência:** mobile/supabase/migrations/20260907120000_foundation.sql:25,43,54,69,78; mobile/src/community/communityState.ts:35-38; docs/design/00-DECISAO-FEED.md:5, 78-79; TELAS.md:76
- **Sugestão:** Decidir como B4 se comporta sem comunidade, sem conta e para menor (esconder o bloco azul? mostrar desabilitado com motivo?) antes de construir. Criar um armazenamento da versão e da data do consentimento aceito.

### B3 · ALTA · C1–C6

O servidor não existe. isCloudConfigured() dá false nesta máquina e não há projeto Supabase. As duas migrations nunca foram aplicadas, a RLS nunca rodou num banco real e não há nenhuma Edge Function. V1_BUILD_STATUS está desatualizado: ainda cita um 'schema completo' que foi apagado.

- **Evidência:** mobile/.env.example é o único .env, com placeholder; config.ts:39 rejeita o placeholder. EXECUTION_02_CLOUD_FOUNDATION.md:5-6 diz 'RLS e autenticação reais estão NOT TESTED' e :65 diz 'Criar o projeto é ação com custo e não foi feita'. mobile/supabase/ só tem migrations/ e seed.dev.sql, sem functions/. V1_BUILD_STATUS.md:47-51 cita 0001_schema.sql e 0002_rls.sql, apagados no commit bc74dae.
- **Sugestão:** Antes de qualquer tela C: o dono cria o projeto em sa-east-1 (tem custo); depois aplicar as migrations e provar a RLS com três sessões (A, B e anon). Corrigir V1_BUILD_STATUS.md.

### B4 · ALTA · C1, C3, C4, C5, C6

Nenhuma tabela de conteúdo de usuário existe no disco: posts, comentários, reações, denúncias, bloqueios, consentimento versionado, assuntos ocultos ou ações de moderação. O schema especulativo antigo foi apagado e não serve como base. Nele o post era do grupo (group_id not null, lido só por membros), tinha de 1 a 500 caracteres contra os 5.000 de C3, não tinha foto, excluía comentários de propósito, a denúncia só aceitava alvo post ou user, o bloqueio só filtrava o lado de quem bloqueia e consents usava on delete cascade.

- **Evidência:** 20260907120000_foundation.sql:5-8 diz 'NÃO estão neste schema, de propósito: group_posts, reactions, reports, blocks'. Só 5 tabelas existem (profiles, groups, group_memberships, app_admins, admin_audit_log). Schema antigo: `git show 657cda8:mobile/supabase/migrations/0001_schema.sql`, com 'sem DM, sem comentários', body de 1 a 500 e target_type in ('post','user'); apagado em bc74dae. sqlPolicies.test.ts:33-36 afirma que só a fundação existe.
- **Sugestão:** Schema novo, escrito só depois das respostas do dono sobre alcance e pré-moderação: posts (status pending/visible/rejected/removed, photo_path, day_number validado no servidor), comments, reactions (post e comentário), reports (alvo post, comentário ou usuário, com motivo), blocks bidirecional, consents com versão e política de retenção, moderation_actions com motivo e contestação.

### B5 · ALTA · C1, C6

Hoje é impossível ver o feed sem conta. A RLS revoga tudo do papel anon, e a autenticação é só e-mail com código: a 'sessão anônima sob demanda' do ADR-002 não foi implementada. REGRAS 12 e C4 ('qualquer pessoa que baixar o app vê') pressupõem leitura sem conta.

- **Evidência:** 20260907120100_rls.sql:22-25: 'Nenhuma tabela concede acesso a anon: a camada de nuvem exige sessão'. auth.ts:7-10: 'e-mail + código… Sem Google, sem Apple'. ADR-002-backend.md:42 fala em 'sessão anônima criada sob demanda'. sqlPolicies.test.ts:50 afirma que nenhuma policy concede acesso a anon.
- **Sugestão:** Escolher entre policy SELECT para anon, que torna o conteúdo raspável com a anon key (pública por definição, config.ts:1-9), e signInAnonymously do Supabase. A escolha depende do alcance (ver a pergunta ao dono).

### B6 · ALTA · C1, C5, C6

O post precisa mostrar nome e foto do autor, e isso esbarra em dois pontos. A RLS de perfis só deixa ler o próprio perfil ou o de colega do mesmo grupo, e essa proteção foi deliberada. E profiles não tem coluna de foto.

- **Evidência:** 20260907120100_rls.sql:64-78 (policy 'perfil próprio ou de colega de grupo'). foundation.sql:25-35: profiles só tem display_name, age_band e account_status. 00-DECISAO-FEED.md:80-81: 'Hoje o app esconde de propósito a lista de membros… um feed da igreja inteira desfaz essa proteção'.
- **Sugestão:** Não abrir a tabela profiles. Expor uma view ou RPC mínima (nome e foto) só de autores com post visível, respeitando o bloqueio.

### B7 · ALTA · C3, C1

Da foto, nada existe: nem biblioteca de seleção, câmera ou redimensionamento, nem permissão no app.json, bucket ou chamada de upload. O ADR-002 define o Storage como bucket privado com política por user_id, o que é incompatível com foto de post vista por terceiros. O EXIF com GPS precisa ser removido para cumprir 'Sem localização'. Um módulo nativo novo exige build novo; não entra por OTA.

- **Evidência:** package.json:5-37 não tem expo-image-picker, expo-camera nem expo-image-manipulator; app.json:1-44 não declara NSPhotoLibrary nem NSCamera. Grep em src por storage.from ou .upload( não acha nada. ADR-002-backend.md:53: 'bucket privado, políticas por user_id, imagens redimensionadas no device'. TELAS.md:104 diz 'Sem localização'; REGRAS 21 é a minimização. 04-invariantes S-15 proíbe OTA para feature nova ou permissão.
- **Sugestão:** expo-image-picker com o seletor do sistema, sem acesso amplo à galeria (MOBILE_STORE_REQUIREMENTS.md:47), mais expo-image-manipulator para reencodar, o que tira o EXIF e redimensiona. Bucket com leitura alinhada ao alcance. Moderação de imagem, porque C3 aceita post só com foto.

### B8 · ALTA · C3 (promessa em F4)

F4 promete 'O que você publicar agora fica na fila e sai sozinho depois', mas não existem outbox, expo-sqlite nem detecção de rede. A fila também colide com o resto: o consentimento precisa estar registrado no servidor antes do primeiro post; a filtragem prévia cria um estado 'em análise'; a foto tem de ficar guardada no aparelho até subir; e um post escrito às 23h50 que só sobe no dia seguinte fica com o dia errado.

- **Evidência:** TELAS.md:213. Grep em src por netinfo, outbox e queue acha só a serialização de lembretes (reminders.ts:202-208). ARCHITECTURE_V0.md:52 e :167-174 planejam o outbox, que não foi construído; expo-sqlite não está no package.json.
- **Sugestão:** Tirar a frase de F4, ou pedir ao designer o estado 'na fila' (visível e cancelável) e definir a regra do dia. Construir o outbox só depois do schema.

### B9 · ALTA · C1, C6 (e D4)

O Amém não tem tabela. Além disso, a regra 'ninguém vê quantos, nem quem publicou' só vale de verdade se a RLS negar SELECT das reações alheias; senão qualquer cliente conta pela API REST. O schema antigo deixava qualquer membro ler todas as reações do grupo. D4 pede Amém com nome no grupo, o que dá dois regimes de visibilidade para a mesma entidade. O Amém em comentário (C6) é um segundo alvo.

- **Evidência:** REGRAS.md:33 (regra 19). `git show 657cda8:mobile/supabase/migrations/0002_rls.sql`:167-168, policy 'leio reações do meu grupo'. TELAS.md:159 (D4): 'No grupo o Amém tem nome… No feed geral ele continua sem nome e sem número'.
- **Sugestão:** No feed, SELECT só da própria reação, ou uma RPC que devolva apenas 'eu marquei'. Nenhuma contagem exposta. O Amém nominal do grupo fica em regra separada.

### B10 · ALTA · C6, C5

Comentário não tem nenhum modelo: nem tabela, nem RLS com bloqueio nos dois sentidos, nem reação, denúncia com alvo comentário, remoção ou moderação. REGRAS aceita o custo, mas nada disso existe.

- **Evidência:** REGRAS.md:63 (decisão 6: 'Dentro, com o custo de moderação'). O schema antigo trazia 'Social mínimo (spec §14): sem DM, sem comentários' (657cda8 0001_schema.sql) e reports.target_type in ('post','user').
- **Sugestão:** Incluir comments no schema novo, com a mesma política de status, bloqueio e denúncia dos posts.

### B11 · ALTA · C5 (regra 16)

Não existe fila, papel nem tela de quem modera. A única elevação global é app_admins, preenchida só por service_role; a tela admin atual só troca liderança de grupo. O handoff não desenha a fila de quem revisa, e o briefing se contradiz: ora tira a administração do escopo, ora pede a fila.

- **Evidência:** REGRAS.md:30. foundation.sql:69-73 e rls.sql:134-140 (app_admins sem policy de escrita). admin.tsx:14-20: 'Não é um painel administrativo'. A folha de líder atual mostra 'Moderar insights' desativado (contexto/inventario-de-telas-atual.md:260). PROMPT_REDESIGN.md:144 ('administração interna está fora do escopo') contra :177 ('a fila de quem revisa').
- **Sugestão:** Papel de moderador no servidor, uma ferramenta mínima (página web interna ou Supabase Studio com RPCs auditadas) e registro em moderation_actions. Nada disso substitui a decisão do dono sobre quem modera.

### B12 · ALTA · C4 (item 3), com saída em D1

C4 promete 'Você pode apagar o que publicou, e pode apagar a sua conta inteira', e nada disso existe: nem exclusão em cascata, nem exportação JSON, nem página web de exclusão. Nenhuma tela chama signOut nem updateDisplayName. Foto no Storage não é apagada por FK. A ação separada 'apagar tudo o que publiquei' não está no handoff. A retenção de consentimento por 5 anos após a exclusão contradiz o cascade.

- **Evidência:** auth.ts:105-121: requestAccountDeletion sempre lança erro. Não há mobile/supabase/functions/. Grep: signOut e updateDisplayName só aparecem nas próprias definições (auth.ts:86, groups.ts:38). SECURITY_V0.md §5, passo 2 (apagar objetos do Storage) e §1 (consents retidos 5 anos). 00-DECISAO-FEED.md:58-59 (item 9). cloudAuth.test.ts:163-166.
- **Sugestão:** Edge Function de exclusão (Storage, depois deleteUser, depois deletion_requests), página web, exportação JSON incluindo posts, comentários, fotos e reações, e uma RPC 'apagar tudo o que publiquei'. O jurídico decide a retenção de consents e de conteúdo removido guardado para contestação.

### B13 · ALTA · D4, D1 ('Meu grupo · 7 pessoas')

Nenhum dado de D4 tem fonte. As conclusões ficam só no aparelho, e a sincronização com `user_day_completions` está marcada como futura. A tabela não existe. getGroupProgress devolve sempre offline ou unavailable. O schema só tem 5 tabelas, e um teste garante isso. Neste checkout a nuvem nem está configurada. CLAUDE.md e V1_BUILD_STATUS.md dizem que as 'Fases 5–8 existem como schema SQL' (0001_schema.sql), mas isso está desatualizado: a fundação substituiu esse schema e deixa de fora, de propósito, 'progresso na nuvem'.

- **Evidência:** mobile/src/progress/completionsStore.ts:4-8; mobile/src/community/communityState.ts:35-43; mobile/supabase/migrations/20260907120000_foundation.sql:5-11; mobile/src/__tests__/sqlPolicies.test.ts:33-36; mobile/src/cloud/config.ts:34-44; docs/technical/V1_BUILD_STATUS.md:48; docs/technical/EXECUTION_02_CLOUD_FOUNDATION.md:19-20
- **Sugestão:** Criar um projeto Supabase, uma tabela de conclusões com RLS limitada ao grupo e à pessoa que consentiu, um outbox de sincronização no completionsStore e uma agregação feita no servidor. Até lá D4 precisa de um estado honesto (REGRAS 11). Corrigir a frase sobre as Fases 5–8 em CLAUDE.md e V1_BUILD_STATUS.md.

### B14 · ALTA · D1 ('Conta e privacidade')

A tela 'Conta e privacidade' não está entre as 32, e nada do que ela precisa ter existe. /conta só faz entrada por OTP e, neste checkout, mostra 'Conta indisponível'. requestAccountDeletion só lança erro: 'depende da Edge Function de exclusão'. Não há mobile/supabase/functions, página web de exclusão, domínio nem exportação JSON. signOut existe (auth.ts:86-96), mas nenhuma tela o chama: hoje não há como sair da conta. Revogação de consentimento (SECURITY_V0 §4.2) e 'apagar tudo o que publiquei', exigido separadamente em 00-DECISAO item 9 e no briefing, não aparecem. E há uma contradição: SECURITY_V0 §5.3 manda apagar os dados locais depois da exclusão, e 00-DECISAO diz que quem sai 'não necessariamente quer apagar a própria jornada'.

- **Evidência:** mobile/src/cloud/auth.ts:86-96, 105-121; mobile/src/app/conta.tsx:43-55, 57-84; TELAS.md:136, 139; REGRAS.md:34; docs/technical/SECURITY_V0.md:88-92, 115-123; docs/design/00-DECISAO-FEED.md:58-59; docs/design/PROMPT_REDESIGN.md:192-194; docs/product/PLANO_FASE_FINAL_100_DIAS.md:254
- **Sugestão:** Pedir o desenho da tela (sair, excluir conta com o que acontece aos posts, apagar publicações, exportar, revogar consentimento). Pedir ao dono o domínio e a decisão sobre os dados locais. A Edge Function e a página web são pré-requisito de loja.

### B15 · ALTA · D3, D1 (avatar), D4 (avatares)

Não existe infraestrutura de foto. Sem expo-image-picker, expo-camera nem expo-image-manipulator (package.json:10-36), sem plugin nem texto de uso de câmera ou fotos no app.json. É dependência nativa nova, então precisa de build novo e não vai por OTA (S-15). Não há bucket nem policy de Storage (SECURITY_V0 §3.3 pede bucket privado, 1 MB e lista de MIME permitidos, o que obriga a redimensionar). O Avatar só desenha iniciais. E a policy de SELECT de profiles só libera o próprio perfil, colegas de grupo e admin: quem lê o feed não consegue ler nome e foto de quem publicou.

- **Evidência:** mobile/package.json:10-36; mobile/app.json:26-37; mobile/src/ui/components.tsx:321-333; mobile/supabase/migrations/20260907120100_rls.sql:64-78; docs/technical/SECURITY_V0.md:51, 60; docs/design/04-invariantes.md:202 (S-15)
- **Sugestão:** Planejar antes do grupo D: dependências, build EAS, bucket com URL assinada ou público (decisão), policy ou view de 'perfil público de autor', compressão no cliente.

### B16 · ALTA · E3, E4

O disparo do marco existe só na aba Início, que o redesenho elimina ('Não existe aba Início'). Apagar index.tsx apaga E3 e E4 em silêncio, e os testes continuam verdes: nenhum teste cobre o push. Além disso: (1) usa igualdade exata milestoneForDay(completedCount) em vez de 'maior marco alcançado e não visto'; (2) o efeito roda com a aba em segundo plano e empilha o marco por cima do que estiver na tela, inclusive do leitor, que chama router.back() logo depois de concluir.

- **Evidência:** (tabs)/index.tsx:81-88; TELAS.md:7; marcoScreen.test.tsx renderiza MilestoneScreen direto; todayScreen.test.tsx não testa o push; reader/[day].tsx:159-165; useJourney.ts:93 já calcula `reached`
- **Sugestão:** Tirar o gatilho de dentro de uma tela: hook global no _layout raiz ou no fluxo de conclusão. Usar reached menos milestonesSeen e escrever um teste do gatilho antes de remover index.tsx.

### B17 · ALTA · F4

O app não tem detector de rede. A faixa 'Sem internet' de hoje não é disparada por falta de internet: aparece só quando nuvem configurada + sessão aberta + getEffectiveRole/getMyMembership rejeitam, e pode ser por erro de RLS ou 500. Quem não tem conta (a maioria, uso sem login) e esta build sem nuvem nunca a veem; e um erro de servidor mostra 'Sem internet', o que é falso.

- **Evidência:** package.json sem @react-native-community/netinfo nem expo-network; components.tsx:802-824 (OfflineBanner); (tabs)/index.tsx:223 `{session.degraded ? <OfflineBanner /> : null}`; cloud/useSession.ts:68-80 e :94 (degraded = falha da consulta, só com sessão); docs/design/00-DECISAO-FEED.md: 'o app não tem detecção de rede hoje'. Armadilha de nome: community/communityState.ts:36 usa status 'offline' para 'nuvem não configurada', não para rede.
- **Sugestão:** Adicionar expo-network (first-party; conferir a API na doc v57, como pede mobile/AGENTS.md) ou @react-native-community/netinfo. É módulo nativo, então exige um novo development build no EAS. Tratar como offline só quando a alcançabilidade vier explicitamente falsa (null/indefinido não liga a faixa), para não acusar falta de rede sem certeza. Desligar session.degraded como gatilho da faixa.

### B18 · ALTA · F4

A cópia de F4 promete infraestrutura que não existe: 'O que você publicar agora fica na fila e sai sozinho depois' exige outbox persistente de publicações, com upload de foto e novas tentativas, e 'A comunidade volta quando a internet voltar' exige ouvir a reconexão. Não existe outbox nem publicação de nenhum tipo no código. A única 'fila' do app serializa agendamento de lembretes.

- **Evidência:** TELAS.md:213; grep outbox/queue em mobile/src: só reminders/reminders.ts:202-208; community/communityState.ts:35-43 devolve só 'offline'/'unavailable'; reflexao/[day].tsx:189-195 'Compartilhar um insight' desabilitado; 00-DECISAO-FEED.md 'O que falta' item 2 (fases 5–8 são SQL não aplicado, isCloudConfigured() === false).
- **Sugestão:** Até existir fila de verdade, a frase sobre publicar não pode ir para a tela. Ver a pergunta ao dono sobre fila offline.

### B19 · ALTA · F1

'Já tenho perfil' não leva a nenhuma das 32 telas: não há tela de entrar (e-mail/código, Apple, Google) no desenho, e D2 cria perfil sem passo de autenticação. O equivalente de hoje está quebrado: 'Já tenho conta' faz router.push('/conta'), e o portão de onboarding troca a rota de volta para /onboarding, porque onboardingCompleted é false e o segmento 'conta' não é 'onboarding' (confirmado lendo o código, não rodando o app). Mesmo sem o portão, esta build não tem nuvem, e /conta cai no estado 'Conta indisponível nesta versão'.

- **Evidência:** onboarding/index.tsx:45; app/_layout.tsx:27-31 (useOnboardingGate); conta.tsx:43-55; mobile/ tem só .env.example; supabase/migrations/20260907120000_foundation.sql:25-35 (profiles tem display_name e age_band, não tem foto).
- **Sugestão:** Pedir ao designer a tela de entrar (ou dizer que 'Já tenho perfil' abre /conta). No portão, abrir exceção para /conta durante o onboarding. Até a nuvem existir, esconder o link ou mostrar um estado honesto.

### B20 · ALTA · todas (32) e etapa 1

O desenho não está no repositório: faltam design/telas-100-dias.dc.html, design/DESENHO-telas-100-dias.html, design/exploracao-arquitetura.dc.html e design/assets/icone-oracao.png, e design/assets/ está vazio. A 'regra número um' manda comparar cada tela lado a lado com o HTML. Tudo o que TELAS.md não mede (espaço entre blocos, alinhamentos, tamanhos de ícone dentro de faixas como 18–22) teria de ser adivinhado.

- **Evidência:** design_handoff_100_dias/design/FALTANDO.md:3-12; PROMPT.md:9,31,37; TOKENS.md:176 ('ícone de 18–22px'), TOKENS.md:173 ('padding: 16 a 22')
- **Sugestão:** Receber os quatro arquivos antes de começar a etapa 1 de tokens e primitivos. Até lá, o máximo aceitável é implementar o que TOKENS.md mede com número exato.

### B21 · ALTA · C1–C6, D1 (Conta e privacidade), D2/D3 (foto e nome), D4

O servidor para a Comunidade e o perfil não existe. O schema só cria profiles (display_name e age_band, sem foto e sem ministério), groups, group_memberships, app_admins e admin_audit_log, e nem esse schema está aplicado. Não existem posts, comentários, reações de Amém (sem contagem visível), denúncias com fila e prazo de 24 h, bloqueio, 'não quero ver este assunto', registro de versão do consentimento, Storage para foto de post e avatar, moderação nem filtragem antes de publicar (Apple 1.2). A exclusão de conta lança erro e não há exportação JSON, ambas exigidas pelas lojas e pela LGPD.

- **Evidência:** supabase/migrations/20260907120000_foundation.sql:25-57; cloud/auth.ts:106-119 (requestAccountDeletion lança 'ainda não está disponível'); CLAUDE.md ('Fases 5–8 existem como schema SQL não aplicado'); docs/design/00-DECISAO-FEED.md itens 1–9; TELAS.md:114 (versão do consentimento), 118 (24 h), 139 (exclusão e JSON)
- **Sugestão:** Separar a entrega: A, B, E e F são 100% locais e não dependem de servidor; C e o que é remoto em D precisam de migrações, Storage, Edge Functions (exclusão e exportação) e um responsável humano pela moderação antes de existir uma tela funcional.

### B22 · ALTA · C1, C6, D4 (ícone de Amém)

O ícone de Amém não existe no repositório, tem licença pendente e só foi entregue em um estado. O TELAS exige que ele alterne entre contorno e cheio, e só um PNG está descrito ('preto sobre transparente'). Correção técnica sobre a decisão 2 do REGRAS: no RN, a prop `tintColor` do Image recolore um PNG monocromático com a cor de um token, então o vetor não é pré-requisito do tema escuro. O bloqueio real é a licença e o segundo estado. O mesmo vale para a pomba: dove-white.png já existe (assets/brand) e tintColor serve para ela.

- **Evidência:** TOKENS.md:187; TELAS.md:92-93; REGRAS.md:59-60; design/FALTANDO.md:9; mobile/assets/brand/dove-black.png e dove-white.png (224×144); brand.tsx:150-151
- **Sugestão:** Pedir ao designer o ícone em SVG, nos estados contorno e cheio, de um conjunto com licença escrita (OFL/CC0). A decisão 3 do REGRAS deixa de bloquear o tema escuro.

### B23 · MEDIA · A1, A2

A lista é FlatList com getItemLayout e initialScrollIndex alimentados por constantes (64/96/48/16, teto de 2×). As linhas novas têm piso de 48 e 52, e o painel de hoje tem altura variável: ênfase de até 46 caracteres (dias 75 e 88), rótulo de leitura de até 68 caracteres (dia 93) e dois botões, tudo crescendo até 3,571×. A acolhida de A2 entraria na lista. REGRAS 25-26 proíbem constante para caixa com texto, e o teto de 2× (dívida A-D2) contraria a regra 25. Não existe hoje mecanismo de rolagem inicial por altura medida.

- **Evidência:** journeyRowHeight.ts:14-18 e :33-42; jornada.tsx:100-101 e :268-277; REGRAS.md:25-27; TELAS.md:16-19 e :31; docs/design/04-invariantes.md:118 (A-D2)
- **Sugestão:** Com no máximo 100 linhas mais o painel, dá para trocar por ScrollView sem virtualização e rolar até o y do painel medido com onLayout. Outra saída: FlatList sem getItemLayout, com scrollToIndex e onScrollToIndexFailed. journeyRowHeight.ts fica obsoleto e dynamicType.test.tsx:162-205 precisa ser reescrito.

### B24 · MEDIA · A4

A rota da reflexão não trava dia futuro. Ela só esconde o rótulo da leitura e deixa escrever e salvar uma reflexão do dia 99, e o teste atual garante esse comportamento. A folha única de A4 exige criar a trava nessa rota. As outras rotas travam cada uma do seu jeito: folha na Jornada e telas cheias no dia, no leitor e na intercessão. Nas telas do dia e do leitor, o botão chama router.back() sem canGoBack e fica morto quando a rota abre a frio por deep link.

- **Evidência:** reflexao/[day].tsx:42-64 (sem isDayUnlocked antes de salvar); diasFuturos.test.tsx:144-152 (espera reflection-save em dia futuro); jornada.tsx:286-302; dia/[day].tsx:173-188 (router.back em :184); reader/[day].tsx:124-139 (router.back em :135); intercessao/[day].tsx:30-33 e :182-199 (com fallback); REGRAS.md:18 (regra 7)
- **Sugestão:** Criar um componente LockedDaySheet único com variante de texto, aplicado nas quatro rotas antes de qualquer leitura de dado, com a saída "Voltar para a Jornada" usando replace quando não há pilha.

### B25 · MEDIA · A5

"Criar meu perfil" leva a D2 (foto, nome, ministério, lembrete, grupo), que não existe. Não há perfil local. O Profile da nuvem tem display_name e nenhuma foto, e a nuvem não está configurada neste build. Foto exige storage e backend (as fases 5 a 8 são SQL não aplicado). O botão atual de A5 é "Entrar no grupo".

- **Evidência:** TELAS.md:48; cloud/types.ts:8-10 (Profile sem foto); cloud/groups.ts:24-44; cloud/config.ts (sem env, modo local); settingsStore.ts:8-33 (sem nome nem foto); (tabs)/index.tsx:137
- **Sugestão:** Implementar A5 com o botão ligado a D2 só quando D2 existir. Até lá, decidir com o dono se o botão fica escondido ou mantém o destino atual.

### B26 · MEDIA · B1

A caixa 'TEXTO AINDA NÃO LIBERADO' substitui a 'DEV FIXTURE' de hoje, mas o provedor não sabe dizer 'não há tradução'. Os metadados só têm isDevPlaceholder. A tela mostra a caixa DEV condicionada a esse campo, e o único provedor registrado é o DEV, sem distinção de build, inclusive em release. O provedor DEV gera frases fictícias que já repetem 'Nenhuma tradução bíblica é exibida...'. Se as barras entrarem no lugar do texto, as frases DEV somem da tela, mas B3 fica sem nada para redimensionar.

- **Evidência:** mobile/src/reader/provider.ts:19-32; mobile/src/app/reader/[day].tsx:263-281; mobile/src/app/_layout.tsx:15-16; mobile/src/reader/devProvider.ts:26
- **Sugestão:** Criar um estado explícito de 'sem texto licenciado' no contrato do provedor, separado do placeholder de DEV, e manter o selo DEV onde o texto fictício ainda for exibido.

### B27 · MEDIA · C1

O estado 'sem internet (o feed fica indisponível, a jornada não)' depende de detectar rede, e o app não detecta. A faixa offline atual só aparece quando a consulta de papel falha (session.degraded), que é outra coisa.

- **Evidência:** TELAS.md:96. (tabs)/index.tsx:223 mostra `{session.degraded ? <OfflineBanner /> : null}`; components.tsx:802-820. useSession.ts:236-239 liga degraded quando a consulta de papel falha.
- **Sugestão:** Adicionar @react-native-community/netinfo ou expo-network. É dependência nativa, portanto exige build novo.

### B28 · MEDIA · C1, C6

O ícone do Amém não está no repositório, e um PNG único não faz os dois estados exigidos ('alternando contorno e cheio'). tintColor troca a cor, não o preenchimento. A licença também está pendente.

- **Evidência:** design_handoff_100_dias/design/FALTANDO.md: 'assets/icone-oracao.png' não está nesta máquina; design/assets/ está vazio. TELAS.md:93; TOKENS.md:187; REGRAS.md:59 (decisão 2: licença pendente, precisa virar vetor).
- **Sugestão:** Pedir ao designer dois vetores licenciados (contorno e cheio), ou um só, com regra de preenchimento.

### B29 · MEDIA · E3, E4

A regra 'aparece uma vez por marco' não está garantida hoje. O marco só é gravado como visto quando se toca 'Continuar' ou 'Guardar'. 'Ver minhas reflexões' no E4 faz router.replace sem gravar, então a chegada volta a cada abertura a frio. O voltar do Android fecha o fullScreenModal sem chamar close(), então o marco intermediário também volta. 'Guardar minha jornada' chama keep() e depois close(), que lê um snapshot velho de settings e grava o 100 duas vezes (o achado 'marco gravado duas vezes').

- **Evidência:** marco/[day].tsx:46-52, 54-61, 190-197, 203-209; index.tsx:83-84; 05-decisoes-abertas.md grupo I
- **Sugestão:** Gravar 'visto' ao montar a tela, não no botão.

### B30 · MEDIA · E2

O anúncio único por passo não existe. O código tem um só anúncio explícito, mas a revisão registrou três. A causa não está documentada. Hipóteses que o código sustenta: o título tem accessibilityLabel igual ao anúncio, e o hint do botão focado muda a cada passo. O desenho novo tende a piorar: o rótulo visível do botão focado muda a cada toque ('Passo 4' → 'Passo 5'), e leitores de tela costumam reler isso. Não há Mac nem SDK Android nesta máquina para verificar.

- **Evidência:** AltarMode.tsx:71-74, 113-116, 168-170; EXECUTION_04_REVISAO.md:248; 05-decisoes-abertas.md:0.4; TELAS.md:176-177
- **Sugestão:** accessibilityLabel estável no botão ('Próximo passo') com o texto visual 'Passo N'. Um único mecanismo de anúncio: announceForAccessibility OU foco no título. Verificar em aparelho com VoiceOver e TalkBack.

### B31 · MEDIA · E1

'Rota com retorno para a Jornada quando aberta sem pilha (lembrete, deep link)': a entrada por lembrete não existe. Não há listener de resposta de notificação, e as notificações do altar não carregam rota. O D1 do desenho também não tem o interruptor 'Aviso do altar das 12h30' que existe hoje, então o lembrete que levaria ao E1 fica sem controle. O retorno atual cai em '/' (Início), que precisa passar a ser A1.

- **Evidência:** intercessao/[day].tsx:30-33; reminders.ts:185-192 (sem data/url); nenhum addNotificationResponseReceivedListener em src; voce.tsx:204-210; TELAS.md:136
- **Sugestão:** Dono e designer decidem se o aviso do altar continua. Se continuar, falta a linha em D1 e o roteamento da notificação.

### B32 · MEDIA · F6 (e F3/F5 como molde)

O StateView tem flex:1 na raiz e é usado dentro de ScrollView cujo contentContainer não tem flexGrow, que é o defeito apontado na auditoria anterior. Onde acontece hoje: reflexoes.tsx:29 (o próprio F6, dentro de ScreenScroll), reader/[day].tsx:284 (erro) e :291 (carregando), dentro do ScrollView da linha 236; (tabs)/juntos.tsx:207 e grupo/[id].tsx:210 (carregando, dentro de ScreenScroll). NÃO confirmei que 'não aparece': com altura do pai indefinida, o Yoga mede o conteúdo. O efeito certo, por leitura do código, é que o estado não centraliza nem preenche a tela, e F6 pede 'centralizado'.

- **Evidência:** components.tsx:769 e :779 (flex:1); components.tsx:83-100 (ScreenScroll sem flexGrow); docs/technical/EXECUTION_04_REVISAO.md:256; docs/design/04-invariantes.md:120 (A-D4).
- **Sugestão:** Corrigir no primitivo antes de F6: renderizar o estado vazio fora da rolagem, ou usar contentContainerStyle com flexGrow:1 e justifyContent 'center'. Verificar no aparelho em 1× e 3,571×.

### B33 · MEDIA · D3 (foto), C3 (foto), F4 e C1 (sem internet), E1 (aberta por lembrete)

Faltam três peças de infraestrutura nativa. (1) expo-image-picker não está instalado e o app.json não tem NSCameraUsageDescription nem NSPhotoLibraryUsageDescription, então 'Tirar uma foto agora', 'Escolher do celular' e 'Escolher uma foto' não têm como funcionar. (2) Não há detecção de rede: @react-native-community/netinfo não está instalado, e hoje 'sem internet' só existe como session.degraded depois de uma falha da nuvem, e só com sessão. (3) Tocar numa notificação não leva a nenhuma tela: não há addNotificationResponseReceivedListener. Também não existe a fila de publicação offline que F4 promete. Já estão instalados: expo-blur 57.0.2, react-native-svg 15.15.4 e expo-keep-awake 57.0.2.

- **Evidência:** package.json:5-37; app.json:10-12, 26-37; cloud/useSession.ts:24,77; (tabs)/index.tsx:223; grep sem resultados para NetInfo e NotificationResponse em mobile/src; TELAS.md:154, 103, 213, 172
- **Sugestão:** Instalar e configurar as três peças (com os textos de permissão em pt-BR) numa etapa 0 de infraestrutura, antes dos grupos C, D e F.

### B34 · BAIXA · A1

O estado "sem internet (F4)" listado em A1 depende de detecção de rede, que não existe. Não há @react-native-community/netinfo, e a faixa atual só aparece quando a sessão da nuvem degrada.

- **Evidência:** mobile/package.json (sem netinfo); (tabs)/index.tsx:223; cloud/useSession.ts:77 e :94; docs/design/00-DECISAO-FEED.md ("o app não tem detecção de rede hoje")
- **Sugestão:** Adicionar detecção de rede quando F4 for implementada. A1 continua funcional offline.

### B35 · BAIXA · E5

Não dá para simular a fase 'finished' pelo painel DEV: o dayOverride força 'running'. A verificação manual do E5 só é possível mudando o relógio ou por teste que desloca start_date.

- **Evidência:** useJourney.ts:61-64
- **Sugestão:** Adicionar ao painel DEV a opção 'depois da campanha'.

### B36 · BAIXA · F3, F5

Os interruptores do painel DEV 'Carregamento lento' e 'Falha ao carregar' gravam flags que nada consome. O useAsync.ts citado no SPIKE_001 não existe mais. Hoje não há como exibir F3 nem F5 no aparelho para comparar com o desenho.

- **Evidência:** settingsStore.ts:31 e :47; app/dev.tsx:148-157; grep slowLoad/failLoad: só esses dois arquivos; docs/technical/SPIKE_001_MOBILE_FOUNDATION.md:26.
- **Sugestão:** Religar as flags no caminho real (useJourney/leitor) ou removê-las.

### B37 · BAIXA · F1–F6 (global)

As fontes do TOKENS não estão instaladas. O projeto carrega Archivo e Literata; Schibsted Grotesk e Source Serif 4 não estão no package.json. Não verifiquei se existem os pacotes @expo-google-fonts correspondentes.

- **Evidência:** mobile/package.json (dependências @expo-google-fonts/archivo e /literata); ui/fonts.ts; TOKENS.md:105-112.
- **Sugestão:** Resolver na etapa de tokens e primitivos, antes de qualquer tela F.


---

## Conflitos — a especificação contradiz uma regra, a lei ou a si mesma (65)

### C1 · ALTA · A1, A3, A5 (e todas as telas de conteúdo)

O handoff não prevê a faixa obrigatória de conteúdo não liberado (DevContentBanner, invariante C-07 BLOQUEANTE). TELAS.md e REGRAS.md não têm nenhuma ocorrência de "autoriza", "aguardando" ou "Gate 2", embora REGRAS.md:3 diga que resume o levantamento completo. Com rights_status = pending_authorization e build de release falhando na abertura, todo build que roda hoje exibe essa faixa, e o novo layout não tem lugar para ela.

- **Evidência:** grep sem resultado em TELAS.md/REGRAS.md/PROMPT.md; design_handoff_100_dias/contexto/invariantes-do-produto.md:50 (C-07: "precisa de lugar no layout de toda tela de conteúdo"); código: components.tsx:835-874, (tabs)/index.tsx:112 e :222, jornada.tsx:252, dia/[day].tsx:218, intercessao/[day].tsx:225; datasetSource.ts:33-41 (release falha); dataset.json provenance.rights_status = "pending_authorization"; testes ministerio.test.tsx:120 e intercessao.test.tsx:106 exigem testID content-banner
- **Sugestão:** Pedir ao designer o lugar da faixa (compacta abaixo do cabeçalho em A1/A5 e no topo de A3), nos estados pending e fixture e em fonte grande. Enquanto não vier, manter o DevContentBanner compacto abaixo do cabeçalho.

### C2 · ALTA · A2

O gatilho "três ou mais dias em aberto consecutivos antes de hoje" muda a semântica atual e quebra a regra 9. (a) Quem entra pela primeira vez no dia 20 tem 19 dias em aberto e veria "Que bom ter você de volta", o que é falso. Hoje isso não acontece porque gapDays é null sem nenhuma conclusão. (b) "Três" está fixo na cópia; com qualquer N a frase vira contagem de falta, e o mesmo parágrafo diz "nada de contagem de falta". (c) Quem faltou nos dias 5 a 7 e lê todo dia depois continua com três dias em aberto e veria a acolhida em toda abertura até o dia 100. O gap atual zera ao concluir. (d) A acolhida fica no topo da lista, mas a lista abre rolada até hoje, então com muitos dias passados ela nasce fora da tela.

- **Evidência:** TELAS.md:34-35; REGRAS.md:20 (regra 9, "sem 'você perdeu N dias'"); completionsStore.ts:81-85 (null sem conclusão); useJourney.ts:91; (tabs)/index.tsx:149-150 (gatilho atual: !done && gap >= 3) e :232-235 (a cópia atual já conta openCount, que é o total de dias em aberto e não o gap); journeyPhases.test.tsx:105-114 (quem entra no dia 17 tem 16 pendingDays); contexto/inventario-de-telas-atual.md:87 (o designer recebeu "só se gapDays >= 3")
- **Sugestão:** Manter a semântica atual (dias desde a última conclusão, null para quem nunca leu), usar uma cópia sem número ("Alguns dias ficaram para trás…") e definir quando a acolhida some (ao concluir hoje, ou uma vez por retorno). Decidir se a acolhida fica fixa acima da lista ou dentro dela.

### C3 · ALTA · B1

Hoje, 'Prefiro ler na minha Bíblia' dentro do leitor CONCLUI o dia: grava setDayCompleted(true), registra reading_completed e volta. Isso contradiz o invariante P-09 e a própria especificação de A1 ('marca o modo e fecha; não conclui o dia'). O Início atual faz certo. A especificação de B1 não diz o que o link faz. Nenhum teste cobre esse fluxo, então a mudança não seria pega.

- **Evidência:** mobile/src/app/reader/[day].tsx:171-176 (readOwnBible chama setDayCompleted); mobile/src/app/(tabs)/index.tsx:201-209 (versão correta); docs/design/04-invariantes.md:72 (P-09); TELAS.md:26
- **Sugestão:** Alinhar com P-09: marcar lastUsedReadingMode='own_bible' e fechar, sem concluir. O designer confirma.

### C4 · ALTA · B4 (com C3 e C4)

O público da publicação é descrito de dois jeitos. B4 diz 'qualquer pessoa com o app pode ler, inclusive quem você não conhece' e C4 item 1 diz 'Qualquer pessoa que baixar o app vê'. Já C3, no aviso permanente exigido pela REGRAS 18 ('dizendo quem vai ver'), diz 'toda a igreja'. Como o app é público nas lojas e o feed se lê sem conta, 'toda a igreja' subestima o público justamente no aviso que serve de base ao consentimento (LGPD art. 5º, II). O alcance do feed (igreja inteira ou grupo) também está em aberto.

- **Evidência:** TELAS.md:76 (B4), TELAS.md:103 (C3), TELAS.md:109 (C4); REGRAS.md:32 (regra 18); docs/design/00-DECISAO-FEED.md:80-81
- **Sugestão:** O dono decide quem vê (qualquer pessoa com o app, só contas verificadas ou só o grupo); depois a mesma frase vai para B4, C3 e C4.

### C5 · ALTA · C3, C4 (e B4)

O texto de audiência se contradiz exatamente no aviso legal. C3 diz 'toda a igreja'; C4 diz 'Qualquer pessoa que baixar o app… inclusive quem você não conhece'; B4 diz 'qualquer pessoa com o app'. Pelo modelo, 'toda a igreja' é falso: o app é distribuído publicamente nas lojas, o feed é lido sem conta e o cadastro por código é aberto a qualquer e-mail, sem verificar se a pessoa é da igreja. O briefing pedia 'número concreto'.

- **Evidência:** TELAS.md:103 (C3), :109 (C4, item 1), :76 (B4). REGRAS 12 (ler sem conta). auth.ts:45-48 (`shouldCreateUser: true`), sem convite nem verificação. PROMPT_REDESIGN.md:164-165 ('quem exatamente vai ver — em número concreto, não "a igreja vê"'). LGPD art. 11, I (consentimento específico e destacado).
- **Sugestão:** C3 precisa dizer o mesmo que C4, com a audiência que o dono decidir. Não implementar nenhum dos dois textos antes da decisão de alcance.

### C6 · ALTA · C3

A Apple 1.2 exige 'a method for filtering objectionable material from being posted'. No handoff o post vai direto ao ar: não há estado 'em análise' nem 'recusado com motivo e contestação'. O briefing pedia que o designer dissesse em voz alta se o desenho dependesse de publicação instantânea, e ele não disse.

- **Evidência:** TELAS.md:103 ('Publicar' → post visível). 00-DECISAO-FEED.md:39-41. PROMPT_REDESIGN.md:175-178. MOBILE_STORE_REQUIREMENTS.md:31.
- **Sugestão:** O dono escolhe entre filtro automático no servidor (termos e imagem) antes de o post ficar visível, mantendo o fluxo quase instantâneo, e pré-moderação humana, que exige desenhar o estado 'em análise' e o de recusa.

### C7 · ALTA · C3, C4, C6

Idade não aparece em nenhuma tela. O invariante S-11 (bloqueante) e o item 7 da decisão do feed dizem que publicar exige conta e que conta é só para maiores de 18; criança e adolescente usam o app mas não publicam. O D2 não tem passo de idade, a coluna age_band existe mas nunca é usada, e o app não lê o sinal de idade do sistema.

- **Evidência:** 04-invariantes.md:198 (S-11). 00-DECISAO-FEED.md:51-54. Grep por 'idade', '18' e 'menor' em TELAS.md e REGRAS.md não acha nada. foundation.sql:28-31 (age_band 'só existe para não exigir migração'). SECURITY_V0.md §4.4 (Declared Age Range / Play Age Signals).
- **Sugestão:** O designer desenha a autodeclaração no fluxo de conta e a tela de 'aqui você lê, publicar é para maiores', sem humilhar e sem beco sem saída. O jurídico decide entre 18 e 16/17.

### C8 · ALTA · C5

Falta o ciclo da denúncia. 'Denunciar esta publicação' é um toque único: sem motivo (nem 'apareço nesta foto e não autorizei'), sem recibo com prazo, sem estado, sem aviso ao autor quando algo sai do ar e sem caminho para contestar.

- **Evidência:** TELAS.md:118. 00-DECISAO-FEED.md:42-44 (Tema 987 do STF; ECA Digital arts. 28–33) e :55-57. MOBILE_STORE_REQUIREMENTS.md:142, :145. PROMPT_REDESIGN.md:180-181.
- **Sugestão:** Pedir ao designer: lista de motivos, recibo, estado da denúncia, aviso de remoção com motivo e contestação.

### C9 · ALTA · C5, C6, C4

Nenhuma tela permite apagar o próprio post ou comentário, embora o item 3 de C4 prometa isso. Como C5 é a mesma folha para qualquer post, no próprio post ela ofereceria 'Denunciar' e 'Bloquear [você mesmo]'.

- **Evidência:** TELAS.md:111 (C4, item 3) e :116-123 (C5, sem variante para conteúdo próprio). 00-DECISAO-FEED.md:45 ('Bloquear usuário e apagar o próprio post, separados um do outro').
- **Sugestão:** Variante de C5 para conteúdo próprio: 'Apagar', com confirmação e a mesma cópia honesta sobre captura de tela que o briefing pedia.

### C10 · ALTA · C4

'Uma vez na vida, e depois nunca mais' contradiz um consentimento que tem versão (texto mudou, pede de novo) e que pode ser revogado. Nenhuma tela mostra onde revogar nem o que acontece com o que já foi publicado. Também não diz se o 'uma vez' vale por aparelho ou por conta, o que importa em reinstalação e em segundo aparelho.

- **Evidência:** TELAS.md:107 e :114. LGPD art. 8º §5º e art. 18, IX. SECURITY_V0.md §4.2 ('Revogação do consentimento — Configurações → registra revoked_at'). PROMPT_REDESIGN.md:184-186 pedia o lugar da revogação e o efeito no que já foi publicado.
- **Sugestão:** Consentimento guardado no servidor por conta e versão, com novo pedido quando a versão mudar. O designer desenha a revogação em 'Conta e privacidade' e o dono decide o que ela faz com os posts.

### C11 · ALTA · C4

Faltam as regras da comunidade com aceite registrado antes da primeira publicação, que o Google Play exige para conteúdo de usuário e o ECA Digital exige em pt-BR. C4 só traz o consentimento LGPD.

- **Evidência:** 00-DECISAO-FEED.md:47-48 (item 5). PROMPT_REDESIGN.md:182-183 ('alcançáveis do feed e da tela de publicar'). TELAS.md:106-114 não menciona regras.
- **Sugestão:** O dono ou o jurídico escreve as regras; o designer as põe em C4 e deixa um link alcançável em C1 e C3.

### C12 · ALTA · C3, C1

O nome público sai do e-mail. O trigger do servidor preenche display_name com o trecho antes do @, o cliente faz o mesmo, e nenhuma tela deixa escolher nome. O passo 'Seu nome' do D2 pode ser pulado. Quem publicar sem escolher nome aparece como algo tipo 'joao.silva1985' para 'qualquer pessoa', o que fere a minimização e o S-06 (perfil não público por padrão). E 'com o seu nome e a sua foto' é falso quando a foto foi pulada.

- **Evidência:** foundation.sql:116-126 (`split_part(new.email, '@', 1)`, linha 122). (tabs)/voce.tsx:76-77 (`email.split('@')[0]`). updateDisplayName (groups.ts:38) não é usado por nenhuma tela. TELAS.md:145 e :155 ('cada um tem Pular'). REGRAS.md:35 (regra 21). 04-invariantes.md:193 (S-06).
- **Sugestão:** Tirar o default derivado do e-mail no trigger e exigir um nome escolhido antes da primeira publicação (o designer decide onde). Ajustar o texto de C3 para o caso sem foto.

### C13 · ALTA · D4 (e D3, C4)

D4 mostra '4 de 7 já leram o dia 17' e, para cada nome e foto, se a pessoa leu hoje. Isso tira o progresso de leitura do aparelho, identificado por pessoa, e contradiz: REGRAS 14 ('Reflexão, jejum e progresso ficam no aparelho'); o item 2 de C4 ('Sua leitura... continuam só suas. Nada disso vai junto'), que é justamente o texto do consentimento; a caixa de D3 ('Sua leitura... não têm foto e não têm nome'; 'A foto só aparece no que você publicar', e D4 mostra avatar de 40 em cada linha); a promessa que o app faz hoje em ajuda.tsx:164 ('Nada disso vai para o grupo'). Progresso é dado sensível (LGPD art. 5º, II). O consentimento de C4 não cobre isso, porque diz expressamente o contrário.

- **Evidência:** design_handoff_100_dias/REGRAS.md:25; TELAS.md:110, 154, 159; mobile/src/app/ajuda.tsx:164-166; docs/technical/SECURITY_V0.md:15, 80-81 (consentimento destacado antes da primeira sincronização); docs/design/04-invariantes.md:52 (C-09); docs/product/PLANO_FASE_FINAL_100_DIAS.md:359 (FAQ 'Meus dados vão para algum lugar? Não')
- **Sugestão:** Só o Product Brain pode liberar. Se liberar, é preciso um consentimento próprio do art. 11, I, separado de C4: pedido ao entrar no grupo, desligado por padrão (S-06), individual, revogável a qualquer momento (art. 8º §5º), com versão e data registradas (a tabela consents não existe), só para contas de 18 anos ou mais. Quem não consentiu aparece num estado neutro, diferente de 'não leu', e fica fora do denominador do 'X de Y'. O que sai do aparelho é só 'leu o dia oficial hoje', e não o histórico. Os textos de C4, D3 e Ajuda precisam ser reescritos de acordo.

### C14 · ALTA · D4, D2 passo 5

O grupo do desenho, 'até doze amigos, sem administrador, sem convite por link público', não é o grupo do app de hoje. Hoje o grupo é de catálogo: só admin cria (rls.sql:95-98), todo usuário autenticado vê a lista e entra sozinho (groups.ts:13-22, juntos.tsx:205-227), existem papéis de líder e admin com função protegida e auditoria, não há limite de tamanho, e o seed cria grupos que são ministérios ('Intercessão', 'Louvor'). Além disso, P-16 põe 'grupos, amigos' entre as hipóteses não aprovadas, e 00-DECISAO-FEED supera os invariantes 'para o feed e só para ele'. O briefing pediu para manter o grupo com Direção, Insights e Membros e a folha de líder, e proibiu funcionalidade nova além do feed.

- **Evidência:** mobile/supabase/migrations/20260907120100_rls.sql:91-98, 104-110, 152-226; mobile/supabase/migrations/20260907120000_foundation.sql:18, 43-64; mobile/supabase/seed.dev.sql (grupos 'Intercessão'/'Louvor'); mobile/src/cloud/groups.ts:13-22, 50-71, 96-105; docs/design/00-DECISAO-FEED.md:20; docs/design/04-invariantes.md:79 (P-16); docs/design/PROMPT_REDESIGN.md:116, 134
- **Sugestão:** Levar ao Product Brain: (a) aprovar o grupo de amigos como hipótese nova, com escopo, custo de moderação e schema novo (criação pelo usuário, limite de 12 por trigger, convites, saída e remoção sem admin); ou (b) manter o grupo da igreja e redesenhar D4 em cima dele. Não dá para implementar os dois ao mesmo tempo sem decidir o que acontece com líder, admin e o /admin.

### C15 · ALTA · D4

'No grupo o Amém tem nome — vocês se conhecem' contradiz REGRAS 19 ('ninguém vê quantos foram — nem quem publicou'): com nomes, quem publicou conta. Contradiz também a regra dura do briefing, que diz que tirar o contador e deixar a reação visível é 'mais cruel, porque agora é entre pessoas que se conhecem pelo nome'. E nenhuma das 32 telas mostra um post de grupo ou onde esse Amém com nome aparece.

- **Evidência:** TELAS.md:159; REGRAS.md:33; docs/design/PROMPT_REDESIGN.md:154-158
- **Sugestão:** Tirar a frase e o comportamento, ou mandar para decisão do dono junto com o desenho da superfície de post do grupo, que hoje não existe.

### C16 · ALTA · D1 (fim da Ajuda)

Sem 'Ajuda' e sem nenhuma superfície institucional, faltam requisitos de loja e de lei que valem para app com conteúdo de usuário: contato do desenvolvedor alcançável dentro do app (Apple 1.2, 00-DECISAO item 4); termos em pt-BR, página 'Para pais e responsáveis', canal de denúncia e política de privacidade (S-12); tela de atribuição quando houver tradução (C-04). O briefing dizia 'A tela de Ajuda já existe'. Hoje é também em /ajuda que ficam a proveniência e os direitos.

- **Evidência:** mobile/src/app/ajuda.tsx:150-179; docs/design/00-DECISAO-FEED.md:45-46; docs/design/04-invariantes.md:47, 199; docs/design/PROMPT_REDESIGN.md:195
- **Sugestão:** Manter uma linha 'Ajuda' (ou equivalente) em D1 e desenhar onde ficam o contato, os termos, a política e 'Para pais'.

### C17 · ALTA · D2, D3

D2 não tem passo de conta (e-mail e código) nem de idade. Só que foto e nome só existem no servidor, amarrados a auth.users (profiles é 1:1 com auth.users e é criado por trigger no cadastro). Isso viola S-11 (conta só a partir de 18 anos, com autodeclaração), 00-DECISAO item 7 e o briefing ('desenhe isso sem humilhar'). A coluna profiles.age_band existe e nenhuma tela a usa. Também não se sabe onde é o login de quem já tem conta (F1 'Já tenho perfil'), nem o que um adolescente vê em D2 e no passo 5.

- **Evidência:** TELAS.md:143-150; mobile/supabase/migrations/20260907120000_foundation.sql:25-35, 116-130; docs/design/04-invariantes.md:198 (S-11); docs/design/00-DECISAO-FEED.md:51-53; docs/design/PROMPT_REDESIGN.md:187-189
- **Sugestão:** Pedir ao designer o ponto exato do fluxo onde entram a conta e a faixa etária, e o caminho para menores de 18 (usam tudo, não criam perfil público nem entram em grupo).

### C18 · ALTA · E3

'Guardar este marco' é promessa falsa e continua no desenho novo. O botão só grava milestonesSeen e dispara um evento de analytics, que é desligado por padrão. Depois o rótulo vira 'Marco guardado em Você', mas nada em Você lê isso. O D1 do desenho também não tem linha de marcos. E se criarem uma prateleira de marcos em Você, isso vira coleção de conquistas, que é badge (REGRAS.md regra 10).

- **Evidência:** marco/[day].tsx:54-61 (keep) e :212 ('Marco guardado em Você'); milestonesSeen só é lido em index.tsx:84 e marco:47,57 (settingsStore.ts:19-22); voce.tsx não menciona marco nem milestone; journey.reached (useJourney.ts:93) não tem consumidor; TELAS.md:133-140 (D1 sem marcos); REGRAS.md:10
- **Sugestão:** Dono decide: tirar o botão (recomendado) ou dar a ele um destino que não seja coleção. Não implementar o rótulo 'guardado em Você'.

### C19 · ALTA · E1, E2, E3, E4

O aviso de conteúdo não autorizado (DevContentBanner) não aparece em nenhuma tela do TELAS.md, mas é invariante BLOQUEANTE (C-07) enquanto rights_status = pending_authorization. Hoje o E1 tem o aviso. O modo altar substitui a tela inteira, então o aviso some durante o modo. O marco não tem aviso.

- **Evidência:** 04-invariantes.md:50 (C-07); intercessao/[day].tsx:225 (banner) e :203-210 (modo altar retorna só AltarMode); dataset.json provenance.rights_status = 'pending_authorization'; TELAS.md sem ocorrência
- **Sugestão:** Designer reserva lugar para o aviso em E1 e decide como ele aparece nas telas cheias E2, E3 e E4.

### C20 · ALTA · A1, A2, A3, A5, B1, D5, E1, E2, E3, E4 (toda tela de conteúdo)

A faixa de aviso de conteúdo (invariante C-07, BLOQUEANTE) não aparece em nenhuma das 32 telas. A busca por autoriza/banner/fixture/DEV em TOKENS, TELAS e REGRAS devolve zero resultados; só sobrou o token warning/warningSurface ('aviso'). Hoje o DevContentBanner está em 8 rotas e é guardado por dois testes. A caixa 'TEXTO AINDA NÃO LIBERADO' de B1 trata do Gate 1 (tradução) e não substitui o aviso do Gate 2. Implementar 'com fidelidade' removeria o aviso.

- **Evidência:** docs/design/04-invariantes.md:50 (C-07: 'precisa de lugar no layout de toda tela de conteúdo'); components.tsx:835-874; usos em (tabs)/index.tsx:112,222, (tabs)/jornada.tsx:252, (tabs)/juntos.tsx:163, ajuda.tsx:19, dia/[day].tsx:218, intercessao/[day].tsx:225, ministerio.tsx:81, proposito.tsx:151; testes intercessao.test.tsx:106 e ministerio.test.tsx:120; TOKENS.md:38-39,74-75; TELAS.md:58
- **Sugestão:** Pedir ao designer a posição da faixa, nas versões longa e curta, em cada tela de conteúdo, incluindo a versão sobre tinta (E2/E4). Enquanto isso, manter o componente, os textos exatos da C-07 e os dois testes.

### C21 · ALTA · F1, C4, E2, E3, E4

As superfícies fixas usam tokens cujo valor muda com o tema. O TOKENS diz que F1/C4/E2/E3/E4 não mudam com o tema, mas o TELAS especifica nelas textSecondary, o botão primário (fundo `text`, rótulo `surface`), borderStrong e um 'sublinhado branco' que não existe como variante. Medido pela fórmula WCAG: textSecondary claro #3F3D38 sobre #111111 dá 1,74:1 (E4 'Apocalipse 21:5' ilegível); textSecondary escuro #C7C4BD sobre #FFD100 dá 1,19:1 (frase de E3/F1 ilegível no tema escuro); o primário no escuro vira botão #FFFFFF sobre amarelo, com limite de 1,46:1; em E2, accent contra borderStrong claro dá 1,01:1, e o segmento atual só se distingue pelo matiz (REGRAS 30). Hoje o código resolve com hex fixo e onInk.

- **Evidência:** TOKENS.md:77-85, 163; TELAS.md:113 (sublinhado branco), 176 (segmentos accent/borderStrong), 181 (E3 textSecondary), 187 (E4 textSecondary), 199 (F1 textSecondary); REGRAS.md:47; components.tsx:38-46, 383-384; AltarMode.tsx:13-15
- **Sugestão:** Pedir ao designer dois conjuntos fixos de tokens (sobre tinta: texto #FFFFFF, secundário #C7C4BD, trilha, segmento vazio; sobre amarelo: onAccent, onAccentMuted #4F430D, primário #111111/#FFFFFF), as variantes onInk/onYellow de botão e sublinhado, e uma forma diferente para o segmento atual de E2. Depois, acrescentar esses pares ao contrast.test.ts.

### C22 · ALTA · todas (tipografia) · REGRAS 31

O suporte a 'Texto em Negrito' contradiz as 'oito faces' e não tem infraestrutura. Não há nenhuma chamada a AccessibilityInfo.isBoldTextEnabled ou ao evento boldTextChanged, e no RN 0.86 os dois existem só no iOS. Como o peso vem da face nomeada, negrito significa trocar a face em cada estilo: 800→900 exige SchibstedGrotesk_900Black; Source Serif 600→700 exige SourceSerif4_700Bold; o itálico 400→600 exige SourceSerif4_600SemiBold_Italic. O total vira 11 faces, contra 'Oito faces no total'. Além disso, fonts.* é usado direto em 68 lugares e há 77 fontSize literais em .tsx, então tudo teria de passar por um primitivo único. O título do header nativo também não acompanharia. No Android não há API JS (INFERÊNCIA: exigiria um módulo nativo lendo Configuration.fontWeightAdjustment, API 31+).

- **Evidência:** REGRAS.md:48; TOKENS.md:105-112; node_modules/react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo.d.ts:15,52; grep sem resultados para isBoldTextEnabled em mobile/src; _layout.tsx:61
- **Sugestão:** Decidir com o designer: (a) a tabela de promoção de peso; (b) aceitar 11 faces ou limitar 800 e itálico sem promoção; (c) só iOS nesta etapa ou módulo nativo no Android. Na implementação: um hook useBoldText, um único componente de texto e uma regra de lint contra fontFamily fora do tema.

### C23 · ALTA · D4 (e C4, REGRAS 11/14)

Os números do grupo não podem ser 'reais e locais'. 'Quatro de sete já leram o dia 17' e o nó de cada membro exigem enviar ao servidor o progresso de leitura de cada pessoa. Isso contradiz REGRAS 14 ('progresso fica no aparelho') e o item 2 do consentimento C4 ('Sua leitura… continuam só suas. Nada disso vai junto'). O REGRAS 11 chama esses números de 'reais e locais', o que é impossível para dados de outras pessoas.

- **Evidência:** REGRAS.md:22, 25; TELAS.md:110, 159-160; supabase/migrations/20260907120000_foundation.sql:54-57 (group_memberships sem nenhum dado de leitura)
- **Sugestão:** O dono decide se o progresso é compartilhado com o grupo (exige consentimento específico e mudança no texto de C4) ou se D4 mostra só a lista de membros, sem números de leitura.

### C24 · MEDIA · A3

"Hoje conduz: {ministério}" e "Cumpri meu jejum hoje" aparecem em qualquer dia liberado, inclusive passados ("Dia 5" aberto no dia 17). O pacote registra "'hoje' num dia que não é hoje" como achado aberto que não pode aparecer. A tela de dia atual evita isso ("conduz:"), e o Início usa "Conduziu no Dia 100" depois da campanha.

- **Evidência:** TELAS.md:39; docs/design/04-invariantes.md:217; dia/[day].tsx:192-194 ("Altar das 12h30 · conduz:"); (tabs)/index.tsx:163; dia/[day].tsx:268 (o código atual também escreve "Cumpri meu propósito hoje" em qualquer dia)
- **Sugestão:** Usar "Hoje conduz" e "hoje" só quando day === officialDay e phase === 'running'. Nos outros casos, "Conduz:" ou "Conduziu:" e "Cumpri meu jejum neste dia". Pedir a cópia ao designer.

### C25 · MEDIA · A5, A3

A cópia de A5, "Cem dias de jejum, oração e Palavra", tem a palavra "jejum" fixa, mas REGRAS §5.4 diz que a igreja não confirmou jejum oficial e que as superfícies do jejum precisam poder sair. O material da igreja não usa "jejum" nenhuma vez: o subtítulo é "100 DIAS DE CONSAGRAÇÃO, PALAVRA, ADORAÇÃO E INTERCESSÃO". A3 também volta a usar "jejum", palavra que o código atual evita ("propósito").

- **Evidência:** TELAS.md:48 e :39; REGRAS.md:61 (§5.4); content/100-dias-2026/proposito.json subtitle; ocorrências de "jejum" em dataset.json = 0 e em proposito.json = 0; dia/[day].tsx:268 e (tabs)/index.tsx:394 ("Cumpri meu propósito hoje")
- **Sugestão:** Tirar "jejum" da cópia de A5, por exemplo usando o subtítulo da igreja literalmente, e fazer o rótulo de A3 seguir a decisão pendente §5.4.

### C26 · MEDIA · A1 (navegação)

Remover a aba "Início" contraria P-12 (a aba é "Início"; renomear exige Product Brain). O documento de decisão do fundador de 2026-09-20 diz que o FEED passa a ser a primeira tela, mas TELAS diz que a Jornada é a casa e abre o app. A aba Juntos (altar de hoje, grupo, propósito) também some. Há dependências escondidas: o gatilho do marco em tela cheia vive no Início, e várias rotas fazem replace('/') esperando o Início.

- **Evidência:** TELAS.md:7; docs/design/04-invariantes.md:75 (P-12); docs/design/00-DECISAO-FEED.md:13-15 ("ele passa a ser a primeira tela"); (tabs)/_layout.tsx:31-34; gatilho do marco em (tabs)/index.tsx:82-88; replace('/') em _layout.tsx:31, intercessao/[day].tsx:32, marco/[day].tsx:51, onboarding/pronto.tsx:38 e Lockup.tsx:91; juntos.tsx inteiro
- **Sugestão:** O dono deve confirmar que a casa é a Jornada, e não o feed, e ratificar a remoção de Início e Juntos. Na implementação, a Jornada vira a rota index e o efeito do marco muda para A1.

### C27 · MEDIA · A5

A especificação se contradiz sobre a permissão de notificação. D3 diz que o passo 4 é o ÚNICO ponto onde ela é pedida, mas REGRAS 13 cita lembrete e ministério, F2 tem um passo de lembrete e A5 tem "Ajustar meu lembrete" sem destino definido. Hoje a tela de lembrete, o onboarding, o ministério e o aviso do altar pedem a permissão.

- **Evidência:** TELAS.md:48, :156 e :205; REGRAS.md:24; lembrete.tsx:64 e onboarding/lembrete.tsx:34 (scheduleDailyReminder, que chama ensureNotificationPermission em reminders.ts:117-119); ministerio.tsx:72; (tabs)/voce.tsx:99; destino atual do botão em (tabs)/index.tsx:136 (/lembrete)
- **Sugestão:** Definir para onde vai "Ajustar meu lembrete" (a rota /lembrete ou o passo 4 de D3) e corrigir o "único ponto" para "só sob gesto de escolher horário".

### C28 · MEDIA · B1, B4, B5

O aviso de Gate 2 (DevContentBanner, 'Aguardando autorização da igreja.') não tem lugar em nenhuma tela de TELAS.md. B1 mostra a escala de capítulos do guia, e B4 e B5 mostram a referência do dia, tudo material da igreja. O invariante C-07 (bloqueante) exige o aviso em toda tela de conteúdo nos builds de desenvolvimento. O leitor e a reflexão de hoje já não mostram o aviso: é uma lacuna antiga que o desenho não resolve.

- **Evidência:** docs/design/04-invariantes.md:50 (C-07); design_handoff_100_dias/contexto/inventario-de-telas-atual.md:422-426; mobile/src/ui/components.tsx:835
- **Sugestão:** Designer indica onde o banner compacto entra em B1, B4 e B5 (e no resto do pacote).

### C29 · MEDIA · B1

B1 promete funcionar 'depois, quando o texto puder aparecer, sem refazer a tela' (REGRAS 1.1), mas não tem lugar para a atribuição de direitos no fim do capítulo. Hoje ela existe (metadata.copyrightNotice) e é obrigatória pelo invariante C-04: CC BY exige atribuição.

- **Evidência:** mobile/src/app/reader/[day].tsx:314-316; docs/design/04-invariantes.md:47 (C-04); REGRAS.md:9; TELAS.md:55-60
- **Sugestão:** Designer desenha a linha de atribuição no fim do capítulo, dentro da área rolável e acima do rodapé medido.

### C30 · MEDIA · B3

Faixa 14 a 30, passo ±2 e padrão 19 não fecham. A partir de 19 saem 15…29; o próximo aumento é cortado em 30 e a paridade vira (28…14). Hoje o padrão é 18 e todos os valores são pares. Instalações existentes continuam com 18 salvo, porque o merge preserva o valor. Além disso, TOKENS diz `read` 19/32 e 'entrelinha sempre 1,7×', mas 19×1,7 = 32,3; o código usa fontSize×1,7.

- **Evidência:** mobile/src/settings/settingsStore.ts:42, 54-63; mobile/src/app/reader/[day].tsx:39-40, 113-120, 155, 298; mobile/src/app/aparencia.tsx:19-20, 43-47; TOKENS.md:132; TELAS.md:71
- **Sugestão:** Designer escolhe: padrão 18, passo 1, ou limites 15/29. Diz também qual vence entre 32 e 1,7×, e se quem já tem 18 salvo migra.

### C31 · MEDIA · B4, B5

'Hoje' aparece em dias que não são hoje. Em B4, 'tem gente lendo o mesmo capítulo hoje' é falso para quem conclui um dia em aberto do passado (a recuperação que A1 incentiva) e depois de 31/12. Também é uma afirmação coletiva sem fonte e imprecisa, já que o dia tem até 12 capítulos. Em B5, 'O que ficou com você hoje?' é falso para reflexão de dia passado; o código atual tem a mesma frase. O invariante §5.1 proíbe 'hoje' num dia que não é hoje. O C3 aberto a partir de B4 também diz 'Marcar o dia 17 / leitura de hoje'.

- **Evidência:** TELAS.md:76, 82, 103; mobile/src/app/reflexao/[day].tsx:152; docs/design/04-invariantes.md:217; REGRAS.md:22 (regra 11)
- **Sugestão:** Designer entrega a variante de cópia para dia passado e para depois da campanha, e diz qual dia B4 passa para C3.

### C32 · MEDIA · B5

Hoje a reflexão de dia futuro NÃO é trancada. /reflexao/40 abre o editor e salva; o código só esconde a referência. A4 e REGRAS 7 mandam a mesma folha de cadeado para a rota da reflexão. A especificação está certa e o código diverge, e há um teste que confirma o comportamento atual.

- **Evidência:** mobile/src/app/reflexao/[day].tsx:42-64; mobile/src/__tests__/diasFuturos.test.tsx:144-152; TELAS.md:45; REGRAS.md:18
- **Sugestão:** Trancar a rota como no leitor e reescrever o teste para esperar a folha A4.

### C33 · MEDIA · C3, C5

Foto com terceiros não tem tratamento: nenhum aviso ao publicar, nenhum motivo próprio de denúncia e nenhum canal de retirada para quem não tem o app. A foto do culto revela a convicção religiosa de quem aparece nela.

- **Evidência:** 00-DECISAO-FEED.md:55-57 (LGPD art. 11 §1º; art. 14 para criança). PROMPT_REDESIGN.md:190-191. TELAS.md:103 (C3 só traz 'Escolher uma foto / Opcional').
- **Sugestão:** O designer acrescenta uma linha curta em C3 e o motivo na denúncia de C5. O dono define o canal web ou por e-mail para quem não tem o app.

### C34 · MEDIA · C1

A Apple 1.2 exige contato publicado alcançável de dentro do app. Nenhuma das telas C1 a C6 leva a contato, e a tela Ajuda atual também não tem nenhum.

- **Evidência:** 00-DECISAO-FEED.md:46 (item 4). PROMPT_REDESIGN.md:195. Grep em app/ajuda.tsx por 'contato', 'e-mail' e '@' não acha nada.
- **Sugestão:** Linha de contato no feed ou na folha C5, apontando para a Ajuda, com o contato real da entidade.

### C35 · MEDIA · C1

C1 mostra dado do guia da igreja ('a igreja está lendo Josué 6–17') mas não reserva lugar para a faixa 'aguardando autorização' (C-07, bloqueante). O Juntos atual carrega essa faixa.

- **Evidência:** TELAS.md:91. juntos.tsx:163 (`<DevContentBanner state={journey.contentState} compact />`). 04-invariantes.md:50 (C-07). PROMPT_REDESIGN.md:235-239 ('inclusive na home nova'; o layout tem de funcionar com e sem a faixa).
- **Sugestão:** Perguntar ao designer onde a faixa compacta entra em C1.

### C36 · MEDIA · D4, D1

O nó por pessoa ('anel cinza = não leu') mostra aos amigos quem não leu hoje. Esbarra em REGRAS 9 (nada de culpa; dia não lido é 'Em aberto' em azul, não marca de falha) e no teste de 'piores casos' do briefing (a pessoa que nunca lê). O anel cinza, se for `borderStrong` #D9D6CF, fica em ~1,4:1, abaixo de 3:1 para um gráfico que carrega estado (REGRAS 29). Além disso, REGRAS 11 chama os números de D4 de 'reais e locais' e D1 diz 'Todo número desta tela é real e local', mas '7 pessoas' e '4 de 7' dependem do servidor: a especificação se contradiz.

- **Evidência:** TELAS.md:140, 159; REGRAS.md:20, 22, 46; TOKENS.md:18; docs/design/PROMPT_REDESIGN.md:158-160
- **Sugestão:** Perguntar se o estado por pessoa deve existir. Se existir, sem marca de 'não leu' (só marcar quem leu, ou só o agregado) e com token de contraste medido. Corrigir 'locais' em REGRAS 11 e D1.

### C37 · MEDIA · D3, D2 passo 3

D3 diz que 'o passo 4 (lembrete) é o único ponto onde a permissão de notificação é pedida'. Isso contradiz REGRAS 13, que lista 'escolher o ministério' como gesto válido, e o próprio passo 3 ('Para o app avisar quando é o seu altar'): hoje escolher o ministério já pede a permissão. F2 também tem um passo de lembrete (TELAS.md:205). No onboarding atual a permissão é pedida em 'Continuar', não ao escolher (onboarding/lembrete.tsx:29-46); /lembrete pede ao escolher (lembrete.tsx:56-77). Se a pessoa recusou em F2, o iOS não mostra o diálogo de novo no passo 4, e a especificação não traz o caminho para os Ajustes.

- **Evidência:** TELAS.md:147, 156, 205; REGRAS.md:24; mobile/src/app/ministerio.tsx:67-76; mobile/src/app/onboarding/lembrete.tsx:29-46; mobile/src/app/lembrete.tsx:56-77; mobile/src/reminders/reminders.ts:41, 93-97
- **Sugestão:** Reescrever a regra de D3: 'só sob gesto: ao escolher horário ou ministério'. Definir o estado de 'já negado' (texto e atalho para os Ajustes do sistema).

### C38 · MEDIA · D5

D5 diz reproduzir a orientação 'palavra por palavra' e que 'nenhum texto desta tela é escrito pelo app', mas muda a ordem e o rótulo do texto da igreja. No proposito.json há a introdução e 9 seções públicas com títulos e marcadores; os passos ficam dentro de 'FLUXO DA REUNIÃO' (linha 186) e a citação é o último bloco de 'MAIS DO QUE UMA ESCALA...' (linha 346). D5 lista 'parágrafos · citação · cap OS CINCO PASSOS DO ALTAR + passos': tira os passos da seção, põe depois da citação, troca o título da igreja por um rótulo do app e não fala dos títulos de seção nem dos marcadores. O título 'Sobre o propósito', o cap e 'tradução a informar' são texto do app.

- **Evidência:** TELAS.md:163-164; REGRAS.md:12; mobile/content/100-dias-2026/proposito.json:12-346, 355; mobile/src/app/proposito.tsx:83-104, 171-173
- **Sugestão:** Pedir ao designer que D5 siga a ordem e os títulos do JSON (seções com cap, marcadores e passos no lugar), aplicando só a forma nova. Corrigir a frase 'nenhum texto é do app'.

### C39 · MEDIA · D5

D5 deixa de fora duas coisas que a página atual tem por motivo registrado. (1) O DevContentBanner: C-07 é bloqueante enquanto o Gate 2 estiver aberto (rights_status = pending_authorization). (2) A legenda de recorte, 'Orientação da igreja, palavra por palavra. Fica de fora só o passo a passo...'. Sem ela, 'palavra por palavra' passa a afirmar que a reprodução é integral, e a seção 'QUAL É A RESPONSABILIDADE DO LÍDER?' (public:false) fica de fora, assim como o título do documento.

- **Evidência:** mobile/src/app/proposito.tsx:151, 175-184; mobile/content/100-dias-2026/proposito.json:2, 264-265; docs/design/04-invariantes.md:50 (C-07); mobile/src/__tests__/proposito.test.tsx:94-97
- **Sugestão:** Pedir ao designer a posição do banner e da legenda de recorte em D5 (vale para toda tela com conteúdo da igreja).

### C40 · MEDIA · E4 (e E3)

A rota do marco não tem guarda. O app tem scheme de deep link, então /marco/100 abre a chegada sem 100 leituras e antes de 31/12, mostrando a referência do versículo-base do Dia 100. Hoje mostra também a ênfase do Dia 100. É conteúdo de dia futuro revelado por rota. E /marco/25 afirma '25 de 100 dias lidos' para quem leu 3.

- **Evidência:** app.json:8 (scheme 'biblespike'); marco/[day].tsx:41-44, 98-101 (sem checar completedCount); dataset dia 100 key_verse_reference 'REV 21:5'; REGRAS.md:7
- **Sugestão:** Guardar a rota: marco N só renderiza se completedCount ≥ N; senão redireciona para A1.

### C41 · MEDIA · E2, E3, E4

As telas de superfície fixa usam nomes de token que mudam com o tema (`textSecondary`, `text`, `borderStrong`, botão `primary`), e o TOKENS.md diz que ali 'as cores não mudam com o tema' sem dizer qual paleta fica fixa. O E3 só passa com os valores do claro e o E4 só com os do escuro. Medido: textSecondary no amarelo dá 7,42 com o valor claro e 1,19 com o escuro; na tinta dá 1,74 com o claro e 10,84 com o escuro. borderStrong dos segmentos do E2 na tinta dá 13,01 com o claro e 1,67 com o escuro. O TOKENS ainda define `onAccentMuted` #4F430D justamente para 'texto secundário sobre amarelo', mas o E3 pede textSecondary. Isso já quebrou no código de hoje, no tema escuro: o sublinhado 'Guardar este marco' fica #FFFFFF sobre #FFD100 (1,46:1), 'Continuar a jornada' vira botão branco no amarelo, e a régua onYellow pinta traços brancos.

- **Evidência:** TELAS.md:176, 181, 187; TOKENS.md:23, 72-74; components.tsx:383-391; marco/[day].tsx:200, 211-217 (sem onInk); HundredDayRuler.tsx:57-58
- **Sugestão:** Designer lista o hexadecimal literal de cada elemento nas cinco superfícies fixas, e o teste de contraste passa a cobrir essas superfícies.

### C42 · MEDIA · E1

'Altar das 12h30 · hoje conduz: …' fica errado quando o E1 abre um dia passado. Isso acontece porque o E1 é alcançado a partir do A3, que abre qualquer dia liberado, inclusive os em aberto. O código atual evita o 'hoje' de propósito. O mesmo vale para o A3 ('Hoje conduz: {ministério}') e para a fase encerrada.

- **Evidência:** TELAS.md:38-39, 171; intercessao/[day].tsx:237 ('conduz:' sem 'hoje'); index.tsx:163 ('Conduziu no Dia 100'); juntos.tsx:46-50; achado aberto grupo F em EXECUTION_04_REVISAO.md:249
- **Sugestão:** 'Hoje conduz' só quando day === officialDay e phase === 'running'; nos outros casos 'Dia N conduz' ou 'Dia N conduziu'. Confirmar com o designer.

### C43 · MEDIA · F2, D3, D2, A5, D1

D3 diz que o passo 4 do perfil é 'o único ponto onde a permissão de notificação é pedida', mas F2 tem um passo 3 de lembrete, e o código de hoje pede a permissão ao tocar 'Continuar' nesse passo. REGRAS 13 cita também 'escolher o ministério' como gesto válido, e A5 ('Ajustar meu lembrete') e D1 ('Lembrete de leitura') também agendam. O momento também diverge: D3 fala 'ao escolher um horário' (toque na opção); o código pede no 'Continuar'. E o horário é perguntado duas vezes, em F2 passo 3 e em D2 passo 4.

- **Evidência:** TELAS.md:156 vs TELAS.md:205; REGRAS.md:24; onboarding/lembrete.tsx:29-40 → reminders/reminders.ts:117-120 (ensureNotificationPermission).
- **Sugestão:** Decidir qual é o ponto de pedido. Sugestão: pedir no primeiro gesto de escolher horário, em qualquer tela, e em D2 passo 4 mostrar o horário já escolhido em vez de perguntar de novo.

### C44 · MEDIA · F2, D1

F2 promete 'Dá para mudar depois quando quiser', mas D1 não tem linha para o modo de leitura: PREFERÊNCIAS só lista Lembrete, Meu ministério, Tamanho da letra e Conta e privacidade. Hoje o modo pode ser trocado em Você → 'Leitura' → Aparência.

- **Evidência:** TELAS.md:203 vs TELAS.md:135-137; (tabs)/voce.tsx:225-229; aparencia.tsx:52-66.
- **Sugestão:** Acrescentar a linha em D1 (ou em 'Tamanho da letra'), ou tirar a frase de F2.

### C45 · MEDIA · F5

F5 afirma sem condição 'Sua jornada e as suas reflexões estão salvas, nada foi perdido', e o app não tem como saber isso. As lojas locais engolem erro de leitura (JSON corrompido, falha do AsyncStorage) e devolvem vazio sem avisar. A próxima escrita salva vazio + novo por cima do dado real, e aí ele se perde de fato. Se a falha for nas configurações, onboardingCompleted volta a false e a pessoa é mandada de novo para o onboarding. Vai contra o espírito de REGRAS 11: afirmação sem fonte.

- **Evidência:** progress/completionsStore.ts:26-40 e :49-55; reflections/reflectionsStore.ts:22-38 e :43-50; fasting/fastingStore.ts:34; settingsStore.ts:65-73 e :76-79.
- **Sugestão:** Distinguir 'não existe' de 'não consegui ler'. Com falha de leitura, bloquear escrita e mostrar F5 com uma cópia que não prometa o que o app não sabe.

### C46 · MEDIA · B5, C3 (e C6)

Os campos de texto não têm limite visível. B5 e C3 especificam campo com raio 18 e fundo surfaceWarm, sem borda, sobre página branca: #F7F5F0 contra #FFFFFF mede 1,09:1, e o REGRAS 29 exige 3:1 para limite de controle. O C6 ('campo pílula') não diz nada sobre borda. Também não existe componente de campo em ui/, e o estado de foco não foi especificado.

- **Evidência:** TELAS.md:82, 103, 126; REGRAS.md:46; TOKENS.md:19 (controlBorder 3,59 sobre branco e 3,29 sobre quente)
- **Sugestão:** Pedir ao designer borda de 1,5px em controlBorder (ou outro limite ≥3:1) e o estado de foco.

### C47 · MEDIA · B1, B3, D1 (Tamanho da letra) · TOKENS §3 read

A faixa de tamanho do texto é aritmeticamente impossível. Com 14 a 30, passo ±2 e padrão 19: a partir de 19 os valores são 15…29 (nunca 14 nem 30); a partir de 14 são só pares (nunca 19). A entrelinha 'sempre 1,7×' dá 32,3 em 19, e não os 32 da tabela. O código atual é coerente: 14/30, ±2, padrão 18.

- **Evidência:** TOKENS.md:132; TELAS.md:71; reader/[day].tsx:39-40, 393-394; aparencia.tsx:19-20, 76-77; settingsStore.ts:42
- **Sugestão:** Pedir ao designer: padrão 18 ou 20 com passo 2, ou passo 1. E decidir o que acontece com quem já tem 18 salvo.

### C48 · MEDIA · A3, F4, folhas, B1, listas e feed

A nova escala de raio e calha contradiz o TELAS e muda consumidores existentes sem ninguém perceber. radius.sm vai de 8 para 10, mas A3 pede a caixa de jejum com raio 8, e o Checkbox usa radius.sm. radius.button vai de 14 para 16, mas F4 pede a faixa com raio 14, e OfflineBanner e DevContentBanner usam radius.button. gutter.sheet muda de sentido (14→26) e o Sheet soma gutter.sheet + spacing.md: com o token novo, a folha passaria a 38 de calha. O TELAS usa três calhas (24; 20 'nas telas de lista e feed'; 26 no corpo do leitor), mas o TOKENS só define 24/26 e useGutter devolve um valor só. O TELAS ainda usa raios 3, 4, 7, 13, 14, 18 e 20 fora da escala.

- **Evidência:** TOKENS.md:146-147; TELAS.md:5, 18, 39, 58, 212; components.tsx:586, 809, 852, 905; theme.ts:126, 129, 243-248
- **Sugestão:** Pedir ao designer a lista de quais telas usam calha 20 e se os raios avulsos viram tokens. Na implementação, conferir cada consumidor de radius.* e gutter.* em vez de só trocar os valores.

### C49 · MEDIA · todas (tipografia)

A tabela de tipografia se contradiz e não cobre o TELAS. cap é 600 no TOKENS, mas o TELAS usa cap em 700 (A1 'HOJE · A IGREJA ESTÁ AQUI', B1 'TEXTO AINDA NÃO LIBERADO'). displayXl é 50/50 para 'Faltam N dias', mas A5 pede 52/52. readingRef é 21/25, mas A3 pede 20/25. Cerca de 35 combinações do TELAS não existem na tabela (A1 15/20 −0,2; A3 50/48 −2,2 e 25/30; A4 24/28; B4 19/24 e 26/31; C4 36/40 −1,4; D1 22/27 e 44/44; D4 32/36 e 40/40; E2 36/42; E3 34/38; E4 30/35 e 34/36; E5 54/52; F2 34/38; F5 26/31; F6 24/29; entre outras). Schibsted 400 é empacotado, mas nenhuma variante o usa, e várias entradas dão só o tamanho, sem família nem peso (B1 e C1 '12/16', D1 e D2 '13/18').

- **Evidência:** TOKENS.md:119, 124, 130; TELAS.md:16, 20, 39, 48, 58, 75, 108, 134, 176, 181, 187, 191
- **Sugestão:** Pedir ao designer qual documento vence (TELAS ou TOKENS), se os tamanhos avulsos viram variantes e qual face usar onde só há tamanho.

### C50 · BAIXA · A1, A2, A3, A4, A5

A especificação traz valores tipográficos e de piso que não existem em TOKENS.md, e o PROMPT exige "os valores exatos de TOKENS.md" sem arredondar. Casos: A5 52/52 contra displayXl 50/50, que TOKENS atribui justamente a "Faltam N dias". A3: numeral 50/48 −2,2, ênfase 25/30, leitura 20/25 (token 21/25), versículo Source Serif 19/28 (read 19/32) e botão "Ler" com piso 48 (BUTTON_MIN_HEIGHT 56). A1: cap em peso 700 (token cap 600) e "Concluído" em 500 12,5/17 (captionStrong 700). A2: título 700 19/24. A4: título 700 24/28.

- **Evidência:** TELAS.md:20, :21, :39, :44 e :48; TOKENS.md:116-136 e :149; PROMPT.md:24
- **Sugestão:** Perguntar qual prevalece. Se TELAS vence, criar variantes nomeadas para esses valores em vez de usar o token mais próximo.

### C51 · BAIXA · B5

O botão desabilitado 'Compartilhar um insight' e a legenda 'Um insight começa em branco...' saem de B5; no lugar entra a caixa azul que manda 'escrever de novo... para a igreja'. Isso só é coerente com o C-13 superado pela decisão do feed, que ainda depende de ratificação do Product Brain. Nesta build sem nuvem, a caixa aponta para uma comunidade que não existe. Nenhum teste referencia 'share-insight'.

- **Evidência:** mobile/src/app/reflexao/[day].tsx:176-192; docs/design/04-invariantes.md:56 (C-13); docs/design/00-DECISAO-FEED.md:5, 25
- **Sugestão:** Remover junto com a ratificação do feed; decidir a cópia da caixa azul numa build sem comunidade.

### C52 · BAIXA · B1

'Aa' (e talvez o '✕') é texto num alvo fixo de 48×48 com borda. Se for glifo de texto, cresce com a fonte e sai da caixa, contra REGRAS 25 e o contrato de piso de TOKENS §4. Hoje os dois são ícones SVG que não escalam: 'text-size' e 'chevron-left', este último diferente do '✕' pedido.

- **Evidência:** mobile/src/app/reader/[day].tsx:188-221; TELAS.md:57; REGRAS.md:42; TOKENS.md:154
- **Sugestão:** Designer confirma que 'Aa' e '✕' são ícones (não crescem) ou texto (então a caixa vira minWidth/minHeight).

### C53 · BAIXA · B4, B5

TOKENS declara valores de contraste que não conferem pela fórmula da WCAG 2.1. onBlueSoft sobre blueSoft mede 12,23:1 (declarado 14,05); blue sobre blueSoft mede 7,20:1 (declarado 7,46). Os dois continuam passando, mas o arquivo afirma que 'todo valor aqui foi medido'.

- **Evidência:** design_handoff_100_dias/TOKENS.md:30-34
- **Sugestão:** Corrigir a tabela antes de o contrast.test.ts passar a afirmar esses números.

### C54 · BAIXA · B1

No estado de erro, o leitor mostra error.message cru (por exemplo 'Referência inválida.') sob o título 'Não foi possível carregar'. F5 proíbe texto técnico e usa 'Não deu para carregar'. A especificação está certa e o código diverge. Na tranca, hoje é uma tela inline com 'Voltar' (testID reader-locked-back), não a folha A4.

- **Evidência:** mobile/src/app/reader/[day].tsx:124-139, 283-289; TELAS.md:62, 218
- **Sugestão:** Trocar pela cópia de F5 e pela folha A4 (o teste de dias futuros muda junto).

### C55 · BAIXA · C1, C6

'Sem rótulo nos ícones' (Amém, comentar, '···', enviar) contradiz o TOKENS, que diz 'nenhum ícone carrega significado sozinho neste app'.

- **Evidência:** TELAS.md:93. TOKENS.md:179.
- **Sugestão:** Confirmar que a regra do TOKENS vale só para a barra. Em qualquer caso, accessibilityLabel obrigatório ('Amém' pela regra 33, 'Comentar', 'Mais opções', 'Enviar').

### C56 · BAIXA · D2 passo 3

A promessa 'Para o app avisar quando é o seu altar' usa a notificação de véspera que já existe. O texto dela mostra na tela de bloqueio o ministério da pessoa ('Amanhã é o dia do seu ministério' / '{ministério} conduz o altar das 12h30 no Dia N · Monte: ...'). Isso revela participação religiosa e esbarra em C-10 ('Texto de lembrete sem dado sensível').

- **Evidência:** mobile/src/reminders/reminders.ts:158-171; docs/design/04-invariantes.md:53 (C-10)
- **Sugestão:** Revisar o texto para algo neutro ou decidir que a ressalva é aceitável. É cópia do app, não da igreja.

### C57 · BAIXA · E1, E2, E4, E3

A barra de status segue o tema, não a superfície. Resultado: ícones escuros sobre tinta no E2 e no E4 no tema claro, e ícones claros sobre amarelo no E3 no tema escuro. É o achado aberto do grupo F, e a especificação não trata disso.

- **Evidência:** _layout.tsx:56 (StatusBar style por isDark); EXECUTION_04_REVISAO.md:249
- **Sugestão:** Barra de status fixa por superfície nas cinco telas fixas.

### C58 · BAIXA · E3, E4

'O numeral cede tamanho' contradiz a regra 25 ('o tamanho do desenho é piso, nunca teto') sem declarar a exceção. A conta de caber na largura usa uma constante de largura de dígito da Archivo Black (0,72em); a Schibsted 800 exige recalibrar, e essa fonte nem está instalada. O teste de fonte grande fixa 167 para o Dia 100.

- **Evidência:** TELAS.md:183; REGRAS.md:25; marco/[day].tsx:81-90, 123; fonts.ts:1-12; package.json:6-7; dynamicType.test.tsx:218-222
- **Sugestão:** Declarar a exceção para numerais de exibição (o accessibilityLabel carrega o dado) e recalibrar a constante com a fonte nova.

### C59 · BAIXA · E1, E4

Os dados de exemplo do mock não batem com o dataset nem com o calendário. O Dia 17 é 09/10/2026, não 17/10/2026. O Dia 17 é Educação e quem conduz é Evangelismo, não Governo e Intercessão. Quem implementar não pode copiar esses valores do mock.

- **Evidência:** TELAS.md:171; officialDay.ts:50-57 (start_date 2026-09-23); dataset.json days[16] (sphere 'educacao', altar.ministry 'Evangelismo')
- **Sugestão:** Sempre formatDayDate, getDay e altarOfDay.

### C60 · BAIXA · F6, F2

A tipografia de F6 e F2 sai da escala do TOKENS. F6 pede 'Minhas reflexões' em Schibsted 800 32/36, mas TOKENS define screenTitle como 700 30/34 −0,9 e cita 'Minhas reflexões' como exemplo. O título de F2 (800 34/38) também não tem variante no TOKENS (display é 38/40). Hoje reflexões usa o título nativo do cabeçalho e não diz como se volta (seta? cabeçalho nativo?).

- **Evidência:** TELAS.md:221 vs TOKENS.md:121; TELAS.md:203 vs TOKENS.md:118; reflexoes.tsx:25-27; app/_layout.tsx:79.
- **Sugestão:** O designer escolhe um dos dois valores e define o voltar de F6.

### C61 · BAIXA · F1

A barra de status segue o tema: no escuro vira 'light', o que dá ícones brancos sobre o amarelo fixo de F1 (~1,4:1). Vai contra REGRAS 29, e é o mesmo defeito que a Execution 04 achou nas telas de tinta.

- **Evidência:** app/_layout.tsx:56; TOKENS.md:85; docs/technical/EXECUTION_04_REVISAO.md (grupo F: 'barra de status invisível nas telas de tinta').
- **Sugestão:** Nas cinco superfícies fixas, fixar o estilo da barra de status por tela (escuro em F1/E3, claro em C4/E2/E4).

### C62 · BAIXA · F1

'100 dias sem desistir' como nome do app na tela de entrada vai contra o invariante P-14 ('Não é app só de 100 dias'; a próxima jornada provável é Bíblia em 1 ano). O nome veio do nosso próprio PROMPT_REDESIGN, e REGRAS §5 item 8 marca o nome como pendente.

- **Evidência:** TELAS.md:199; docs/design/04-invariantes.md:77 (P-14); CLAUDE.md 'Contexto do produto'; docs/design/PROMPT_REDESIGN.md:1 e :29; REGRAS.md:65; app.json:3 ('Leitura Bíblica (spike)').
- **Sugestão:** Decisão de nome com o Product Brain antes de gravar o título em F1.

### C63 · BAIXA · F1, D2, D4

F1 diz que 'conta só aparece quando a pessoa quiser publicar', e REGRAS 12 diz 'publicar e reagir'. Mas entrar em grupo (D2 passo 5, D4) também exige conta hoje, e o desenho mantém o grupo.

- **Evidência:** TELAS.md:200; REGRAS.md:23; (tabs)/juntos.tsx:170-195 ('A parte coletiva pede uma conta').
- **Sugestão:** Ajustar a frase de F1 ou definir o grupo sem conta, o que tem implicação de servidor.

### C64 · BAIXA · TOKENS §1

Três contrastes declarados não batem com a medição, embora todos passem. navInactive sobre branco: 7,44 declarado, 7,68 medido; blue sobre blueSoft: 7,46 declarado, 7,20 medido; onBlueSoft sobre blueSoft: 14,05 declarado, 12,23 medido. Ficam no limite: controlBorder sobre blueSoft = 3,04:1 e sobre surfaceMuted = 3,12:1. Para o vidro, medi o pior caso: navInactive sobre vidro claro 0,86 por cima de foto preta = 5,71:1; sobre vidro escuro 0,88 por cima de foto branca = 4,83:1.

- **Evidência:** TOKENS.md:3, 19, 23, 32, 34, 91
- **Sugestão:** Corrigir os números no TOKENS e acrescentar ao contrast.test.ts os pares azuis, os fixos e os do vidro calculados por mistura.

### C65 · BAIXA · lembrete (fora do desenho) · guarda de contraste

O código atual já viola a regra 'amarelo nunca é texto': lembrete.tsx:144 usa colors.accent como cor de texto (1,46:1 sobre branco). O contrast.test.ts só varre superfícies invertidas e não pega esse caso, então o redesenho pode reintroduzir o defeito sem nenhum teste falhar.

- **Evidência:** app/lembrete.tsx:144; contrast.test.ts:146-190; REGRAS.md:46; docs/design/04-invariantes.md:138 (M-01)
- **Sugestão:** Acrescentar ao scanner a busca de color/stroke com accent ou BRAND_YELLOW fora de superfície de tinta declarada.


---

## Decisões do dono — produto, lei ou operação (29)

### P1 · ALTA · B1, B3

B1 trata 'TEXTO AINDA NÃO LIBERADO' como estado de produto, não de DEV. A decisão de tradução (A12) continua aberta: (a) tradução aberta empacotada, (b) sem texto, só link + 'Li na minha Bíblia', ou (c). O CLAUDE.md registra Bíblia Livre CC BY como padrão provisório. Se o app lançar sem texto, o leitor vira um paginador de 12 páginas de aviso e B3 passa a ajustar um texto que não aparece. INFERÊNCIA: risco de reprovação por funcionalidade mínima (Apple 4.2) num app de leitura bíblica sem texto no leitor.

- **Evidência:** docs/design/05-decisoes-abertas.md (A12, ~262-272); CLAUDE.md §Decisões vigentes (Conteúdo); TELAS.md:58
- **Sugestão:** O dono decide se a release pode sair com o leitor sem texto. Se não puder, o aviso de B1 é só de DEV e precisa manter o selo DEV (CLAUDE.md: fixture sempre com banner).

### P2 · ALTA · B3

A frase 'cresce ... até o máximo que o sistema permite' é falsa hoje. O texto bíblico tem maxFontSizeMultiplier={1.8}; o máximo do RN neste build é 3,571×. A amostra da própria folha não tem teto, então ela mostra um tamanho maior do que o texto real terá (dívida B0.4). A mesma promessa aparece em Aparência. A decisão A4 está aberta: remover o teto (a 30pt × 3,571 o texto chega a ~107pt) ou trocar a frase. A especificação reconhece o problema ('se houver teto, a frase muda'), mas não traz a frase alternativa.

- **Evidência:** mobile/src/app/reader/[day].tsx:297 (1.8), 390, 396; mobile/src/app/aparencia.tsx:79-81; docs/design/05-decisoes-abertas.md:107-120 (A4), 312 (B0.4); TELAS.md:70-71
- **Sugestão:** O dono decide sobre o teto; se ele ficar, o designer entrega a frase. De qualquer jeito, a amostra precisa usar o mesmo teto do texto.

### P3 · ALTA · C1–C6

Falta a ratificação do Product Brain. O CLAUDE.md lista feed, comunidade, comentários e reações como hipóteses não aprovadas, e a decisão do fundador está 'pendente de ratificação'. Implementar o grupo C antes disso contraria uma regra do projeto.

- **Evidência:** CLAUDE.md, seção 'Hipóteses NÃO aprovadas'. 00-DECISAO-FEED.md:5 e :77. 04-invariantes.md:79 (P-16).
- **Sugestão:** Obter e registrar a ratificação (ou um ADR) antes de começar a etapa 4 do PROMPT.md.

### P4 · ALTA · C1, C3, C4

Alcance: a igreja inteira, o grupo ou público? Hoje não há como saber quem é 'da igreja'. Se for público, posts com nome, foto e fé ficam legíveis por qualquer pessoa e raspáveis com a anon key, que é pública; isso contraria o 'perfil não público' do S-06 e aumenta o risco LGPD. A resposta define o texto de C3 e C4, a RLS, a política do bucket e a leitura sem conta.

- **Evidência:** 00-DECISAO-FEED.md:80-81. PROMPT_REDESIGN.md:162-165. auth.ts:45-48 (cadastro aberto). config.ts:1-9 (anon key pública). 04-invariantes.md:193 (S-06).
- **Sugestão:** Decidir antes do schema. Se a resposta for 'igreja', é preciso um mecanismo de pertencimento (convite, código), que não existe.

### P5 · ALTA · C5

Quem modera, com que escala e em que ferramenta. 'Alguém da igreja vai olhar em até 24 h' precisa de uma pessoa responsável, com cobertura inclusive no fim de semana e no Natal e Ano-Novo, porque a campanha vai até 31/12. Também é preciso decidir entre pré-moderação e moderação posterior.

- **Evidência:** TELAS.md:118. REGRAS.md:30 (regra 16). 00-DECISAO-FEED.md:42-44 (prazo de 24–48 h).
- **Sugestão:** Nomear responsáveis e escala antes de publicar a promessa de 24 h. Se não houver, o texto muda.

### P6 · ALTA · C1–C6 (C2 em especial)

Prazo. A campanha começa em 23/09/2026, daqui a 2 dias, e o grupo C depende de servidor, schema, storage, moderação, exclusão, idade e revisão de loja para conteúdo de usuário, nada disso existente hoje. C2 ('Hoje começa… o primeiro dia é assim') pressupõe o feed no ar no dia 1. O feed entra no meio da campanha?

- **Evidência:** CLAUDE.md, 'A campanha começa em 23/09/2026'. TELAS.md:98-100. Os bloqueios acima.
- **Sugestão:** Decidir a data de entrada do feed e ajustar C2 para uma entrada no meio da campanha.

### P7 · ALTA · D2, D3

Quando e com que base legal foto e nome sobem para o servidor? D3 pede o rosto no passo 1, antes de qualquer consentimento (C4 só aparece na primeira publicação). Foto e nome num app da igreja revelam convicção religiosa. As alternativas são guardar no aparelho até a primeira publicação ou subir na hora, com base legal a definir. Além disso, REGRAS 21 diz que o perfil tem 'foto, nome e ministério', mas hoje o ministério é só local ('Fica só neste aparelho', 'Não vai para servidor'). Ele passa a ir para o servidor e a aparecer para os outros?

- **Evidência:** TELAS.md:154; REGRAS.md:31, 35; mobile/src/app/ministerio.tsx:85-88; mobile/src/settings/settingsStore.ts:23-27; docs/technical/SECURITY_V0.md:80-82
- **Sugestão:** Decisão do dono com o jurídico. Recomendação: foto e nome só locais até o aceite de C4, e o ministério continua local.

### P8 · ALTA · todas

O tamanho da obra não cabe antes do início da campanha. Hoje é 21/09 e a campanha começa em 23/09/2026. Estimativa honesta: no ui/, reescrever 11 de 12 arquivos (theme, fonts, components, TabBar, icons, HundredDayRuler, SpherePill, Lockup, AltarMode, OnboardingStep, brand) e criar uns 10–12 componentes novos (nó, folha de cadeado, campo, interruptor, segmentos, esqueleto, estado vazio, post, Amém, folha de denúncia, avatar com foto, hook de negrito). Nas rotas: reescrever 17 (root e tabs _layout, jornada, voce, dia, reader, reflexao, intercessao, marco, grupo, proposito, reflexoes e 5 do onboarding), apagar 2–3 ((tabs)/index com 441 linhas, (tabs)/juntos com 331, onboarding/pronto), criar 7–11 (comunidade, depois-de-concluir, publicar, consentimento, comentários, perfil com 5 passos) e reestilizar 6 que não foram desenhadas (conta, aparencia, lembrete, ministerio, jejum, ajuda). Nos testes: 9 dos 20 arquivos quebram (cerca de 60 testes de tela mais a tabela de contraste), 11 sobrevivem intactos, e entram uns 6–8 arquivos novos. O que depende de servidor: toda a Comunidade (C1–C6), foto e nome do perfil, o grupo (D4), exclusão e exportação. Além disso, o app segue o tema do sistema, mas as telas escuras só chegam na etapa 8.

- **Evidência:** CLAUDE.md (campanha 23/09/2026); PROMPT.md:47-58 (8 etapas com revisão a cada uma); app.json:9 (userInterfaceStyle 'automatic'); theme.ts:216-220; linha de base rodada hoje: 20 suítes e 337 testes verdes
- **Sugestão:** O dono decide: qual build vai para a abertura da campanha (o atual, ou A+B+E+F sem Comunidade); se os builds intermediários forçam o tema claro (userInterfaceStyle 'light') até a etapa 8; e se a Comunidade fica atrás de uma flag até o backend e a moderação existirem.

### P9 · ALTA · barra de navegação, A1, C1

A barra 'Jornada (casa) · Comunidade · Você' inverte a decisão registrada do fundador ('o feed passa a ser a primeira tela'), e essa decisão continua 'pendente de ratificação do Product Brain', que pelo CLAUDE.md precisa aprovar feed, comentários e reações. Se ela não for ratificada, a barra perde um dos três destinos e o desenho muda. A escolha de pôr a Jornada como casa resolve os dois conflitos que o próprio documento aponta (uso sem conta e offline), mas o registro formal não diz isso.

- **Evidência:** TELAS.md:7, 236; docs/design/00-DECISAO-FEED.md (status 'pendente de ratificação'; 'passa a ser a primeira tela'; seção 'Os dois conflitos'); CLAUDE.md §Contexto do produto (hipóteses não aprovadas)
- **Sugestão:** Registrar a ratificação do Product Brain e atualizar o 00-DECISAO-FEED.md com 'casa = Jornada' antes de reescrever (tabs)/_layout.tsx.

### P10 · MEDIA · A1

Quem baixa o app no dia 20 vê 19 linhas azuis "Em aberto" com chevron acima de hoje, dias que nunca foram "dele". A regra 9 aceita o azul, mas P-03 diz que quem entra tarde não pode se sentir atrasado. O app não guarda data de entrada, então não consegue separar dias anteriores à instalação de dias realmente pulados.

- **Evidência:** TELAS.md:18; useJourney.ts:90 (pendingDays = todos os dias < oficial não concluídos); settingsStore.ts:8-33 (sem data de primeira abertura); completionsStore.ts:9-13 (só guarda as conclusões); docs/design/04-invariantes.md:66 (P-03); o código atual já lista todos os dias em aberto como âncoras (jornada.tsx:46), mas sem fundo azul
- **Sugestão:** Decidir se os dias anteriores à entrada aparecem como "Em aberto" (azul), como neutros, ou comprimidos. Se forem diferentes, é preciso criar em settings um campo de primeiro dia de uso, que hoje não existe.

### P11 · MEDIA · A1, A3

theme_highlight é null em 100 de 100 dias do dataset real, e theme também é null em 100 de 100. A ênfase está em `title` (100 de 100). O conversor grava null fixo porque o guia da igreja não marca palavra nenhuma. O realce amarelo, peça central do painel nos mocks, nunca aparece com o conteúdo real. Além disso, o código atual só aplica o realce quando `theme` existe, então nem com o campo preenchido realçaria. As fixtures DEV têm theme_highlight 'exemplo', e por isso os testes passam com um realce que a produção não tem.

- **Evidência:** dataset.json: contagem theme_highlight não nulo = 0/100, theme não nulo = 0/100, title não nulo = 100/100; scripts/convert-100-dias.mjs:466-468; (tabs)/index.tsx:152-154 e :258-266; readingSummary.ts:48-60 (splitHighlight nunca escolhe palavra); journey/fixtures/devCampaign.ts:46-49
- **Sugestão:** Perguntar à igreja se ela quer fornecer a palavra de realce por dia. Isso exigiria campo na fonte e no conversor, porque editar o dataset à mão é proibido. A alternativa é aceitar que o realce não existe e avisar o designer que os mocks mostram um estado que não ocorre. A implementação deve aplicar splitHighlight sobre `title`.

### P12 · MEDIA · C1

A decisão do fundador diz que o feed é a primeira tela. O handoff diz que a Jornada é a casa e o feed é a segunda aba.

- **Evidência:** 00-DECISAO-FEED.md:14-16. TELAS.md:7 ('Jornada (casa) · Comunidade · Você').
- **Sugestão:** Confirmar por escrito que o desenho substitui a decisão de 20/09.

### P13 · MEDIA · C1, C3, C6

Versículo colado pelo usuário. A regra 1 ('Nenhum texto de tradução bíblica na tela') e o briefing ('nem vindo de usuário') batem de frente com texto livre em post e comentário. O handoff não diz nada. Filtrar, bloquear ou aceitar como citação do próprio usuário?

- **Evidência:** REGRAS.md:9 (regra 1). PROMPT_REDESIGN.md:169-170 e :231.
- **Sugestão:** Parecer jurídico (Lei 9.610/98 art. 46, III) e decisão do dono. Se for filtrar, isso entra no filtro prévio da Apple 1.2.

### P14 · MEDIA · C1–C6

Com conteúdo de usuário, a classificação nas lojas muda. Os documentos atuais mandam responder 'não' a social e conteúdo de usuário no questionário de idade da Apple e esperam classificação 'Livre' no Play, e o SECURITY_V0 diz que as regras de conteúdo de usuário não se aplicam. Tudo isso deixa de valer e pode afetar o público adolescente.

- **Evidência:** MOBILE_STORE_REQUIREMENTS.md:34 e :99. SECURITY_V0.md §6 (linhas 125-128).
- **Sugestão:** Reverificar o questionário da App Store e o IARC com conteúdo de usuário antes de submeter, e atualizar os dois documentos.

### P15 · MEDIA · D5

A citação de Levítico 6:13 é o único texto de tradução bíblica no app. Estruturalmente está certa: bloco `scripture` com quote e reference, conversor limitado a 3 citações, accessibilityLabel 'Citação bíblica: ...'. Mas a igreja ainda não informou a tradução (A12), então a atribuição exigida pela Lei 9.610 art. 46, III fica incompleta ('tradução a informar'). Também a nova atribuição perde a palavra 'citação' (hoje: '· citação da orientação da igreja'), e a barra amarela sozinha não identifica a citação (A-09).

- **Evidência:** mobile/content/100-dias-2026/proposito.json:346-351; mobile/src/app/proposito.tsx:113-131; TELAS.md:163; REGRAS.md:10; docs/design/04-invariantes.md:45 (C-02); docs/design/05-decisoes-abertas.md:52 (A12)
- **Sugestão:** Pedir à igreja a tradução antes de submeter à loja. Manter no texto de atribuição a palavra que identifica a citação.

### P16 · MEDIA · D4, D1 (telas que somem)

O redesenho tira sem dizer: a folha de ferramentas de líder, as abas Direção e Insights do grupo, o 'Recado da liderança' em Juntos e a entrada de /admin. P-08 mandava manter essas estruturas desativadas, com o motivo à vista, para dar para ligar depois sem redesenhar, e o briefing pedia para mantê-las. Com 'sem administrador' em D4, o papel de líder perde a função. Mas a moderação de C5 (REGRAS 16, 'alguém da igreja... 24 h') precisa de um papel de moderador, e app_admins poderia servir para isso.

- **Evidência:** mobile/src/app/grupo/[id].tsx:187-205, 264-308; mobile/src/app/(tabs)/juntos.tsx:284; mobile/src/app/(tabs)/voce.tsx:238-255; docs/design/04-invariantes.md:71 (P-08); docs/design/PROMPT_REDESIGN.md:134; REGRAS.md:30
- **Sugestão:** Decidir: aposentar líder e admin de grupo (com migração do schema e dos testes) ou manter; e definir quem modera e por qual tela, já que /admin está fora do escopo do desenho.

### P17 · MEDIA · E4

'Guardar minha jornada': o que é guardado? Hoje o botão só marca como visto e dispara analytics (desligado) antes de fechar. É a mesma classe de promessa falsa do E3. Pode ser que a intenção seja a exportação em JSON exigida em D1, mas nada diz isso.

- **Evidência:** marco/[day].tsx:189-197, 54-61; TELAS.md:139, 187
- **Sugestão:** Dono define a ação, ou troca o rótulo por 'Continuar'.

### P18 · MEDIA · E4

Jejum removível: na estrutura, sim. É um item de array alimentado por fastingKeptCount. Mas não existe bandeira de campanha para 'tem jejum': o campaign do dataset não tem esse campo, e settings.fastingEnabled é escolha pessoal. Tirar o jejum hoje exige mudar código. Continua pendente a resposta da igreja sobre jejum ou consagração.

- **Evidência:** marco/[day].tsx:171-175; fastingStore.ts:57-59; settingsStore.ts:14, 40; dataset.json campaign sem campo de jejum; REGRAS.md §5 item 4
- **Sugestão:** Resposta da igreja e, se for configurável, um campo no bloco campaign gerado pelo conversor.

### P19 · MEDIA · E5

'Quando a igreja marcar a próxima jornada, ela aparece aqui' não tem infraestrutura. O dataset é embarcado estaticamente e não há canal remoto de campanhas; o ADR-001 limita EAS Update a correções. Nova jornada hoje significa nova versão de loja. Marcos e rótulos estão presos em 100 (P-14). 'A comunidade continua aberta' depende do grupo C, que não tem backend. O lembrete diário é DAILY sem fim e continua pedindo 'Sua leitura de hoje' depois de 31/12.

- **Evidência:** datasetSource.ts:1, 24; CLAUDE.md (ADR-001: EAS Update só para correções); milestones.ts:2-12; reminders.ts:121-136
- **Sugestão:** Dono decide a cópia ou compromete o canal de distribuição, e decide o que o lembrete faz depois do fim.

### P20 · MEDIA · F2

O passo 2 (jejum/consagração) depende de a igreja confirmar se existe jejum oficial nesta campanha. REGRAS diz que as superfícies do jejum foram feitas para sair sem refazer a tela, mas só lista A3, D1 e E4, não o passo do onboarding. Se a resposta for não, o onboarding vira 'Passo 1 de 2', ou o passo passa a ser de 'consagração' com outra pergunta?

- **Evidência:** REGRAS.md:61 (§5 item 4); TELAS.md:205; ui/OnboardingStep.tsx:9 (ONBOARDING_STEPS = 3).
- **Sugestão:** Levar à igreja pelo Product Brain; não implementar o passo 2 com a palavra 'jejum' antes da resposta.

### P21 · MEDIA · F1

O PNG da pomba serve em cor e não serve em nitidez. dove-black.png tem 224×144, RGBA, pixels opacos #111111 e fundo transparente (decodificado): sobre #FFD100 dá 12,92:1. Mas 112pt numa tela 3x (a moldura de 402pt é de iPhone 3x) pede 336px, e o arquivo tem 224px, sem variantes @2x/@3x: o sistema amplia 1,5× e a borda fica mole. F1 também precisa passar tone='black' explicitamente, porque o Dove fica branco no tema escuro por padrão, o que daria pomba branca sobre amarelo fixo. Sobre REGRAS §5 item 3: tingir não é o bloqueio real, porque o app já tem dove-white.png e o Image do RN aceita tintColor em PNG monocromático. O bloqueio é resolução.

- **Evidência:** mobile/assets/brand/dove-black.png e dove-white.png (224×144, color type 6); ui/brand.tsx:5-9 e :41; REGRAS.md:60; docs/design/04-invariantes.md:161 (M-10) e :165 (M-14).
- **Sugestão:** Pedir ao cliente o SVG oficial ou um PNG de pelo menos 336×216 (de preferência 3× o maior uso: E3/F1).

### P22 · MEDIA · F4, C3

Publicar sem internet deve entrar numa fila e sair sozinho depois? Isso significa publicar sem a pessoa olhando: com foto, com o consentimento de C4 gravado offline, e com possível mudança de bloqueio ou moderação no meio do caminho. A alternativa mais barata é deixar 'Publicar' desabilitado sem rede e dizer isso.

- **Evidência:** TELAS.md:213; REGRAS.md:30 (17, consentimento com versão registrada); 00-DECISAO-FEED.md item 1 (estado entre 'enviei' e 'apareceu').
- **Sugestão:** Recomendação técnica: na V1, sem fila (Publicar desabilitado offline), e trocar a frase de F4 para algo verdadeiro.

### P23 · MEDIA · D1, D2 passo 3

O 'Aviso do altar' não tem lugar no desenho. Hoje existe um aviso local opcional às 12h com quem conduz o altar (settings.altarReminder), ligado no Você e coberto por testes. O PREFERÊNCIAS de D1 lista só lembrete de leitura, ministério, tamanho da letra e conta. D2 fala em 'avisar quando é o seu altar' (que corresponde às vésperas do ministério), mas não no aviso diário. D1 ainda traz de volta 'Meu grupo', que hoje foi substituído de propósito, como diz um teste.

- **Evidência:** settingsStore.ts:28-29; ministerio.test.tsx:184, 214-261; TELAS.md:135-136, 146
- **Sugestão:** O dono confirma se o aviso diário do altar sai do produto ou se ganha uma linha em D1.

### P24 · BAIXA · A1

O cabeçalho usa o nome "100 dias sem desistir", que REGRAS §5.8 marca como pendente. Hoje o app exibe "100 dias na Palavra" e o app.json diz "Leitura Bíblica (spike)". P-14 pede não cimentar "100", porque o produto não é só de 100 dias.

- **Evidência:** TELAS.md:16; REGRAS.md:65; Lockup.tsx:20-22; app.json:3; docs/design/04-invariantes.md:77 (P-14)
- **Sugestão:** Confirmar o nome antes de fixá-lo no cabeçalho, e tirar o total da cópia usando campaign.total_days.

### P25 · BAIXA · A5

A campanha começa em 23/09/2026, daqui a 2 dias, e build de release não abre enquanto o Gate 2 estiver pendente. Nenhum usuário real verá A5 nesta campanha; ela só serve para a próxima jornada. A cópia "Cem dias" também fixa o total.

- **Evidência:** CLAUDE.md (início 23/09/2026); datasetSource.ts:33-41; TELAS.md:48
- **Sugestão:** Priorizar A5 abaixo de A1 a A4 e escrever a cópia sem número fixo.

### P26 · BAIXA · B4, B5

'Fica neste aparelho e nunca vira publicação' é verdade quanto ao servidor, porque a reflexão é local-only. INFERÊNCIA não verificada: o app.json não define android.allowBackup, e o padrão do Expo é permitir o backup automático no Google Drive. O comportamento de backup do AsyncStorage no iOS não foi verificado. 'Neste aparelho' pode ser impreciso.

- **Evidência:** mobile/src/reflections/reflectionsStore.ts:5; mobile/app.json (sem android.allowBackup)
- **Sugestão:** O dono decide entre excluir do backup o dado sensível e ajustar a frase.

### P27 · BAIXA · E1 (e A3)

'12h30' não é campo do dataset. A hora aparece só como texto corrido da orientação da igreja e foi escrita na mão em seis arquivos. O lembrete usa 12:00 fixo. Se a igreja mudar o horário, a mudança precisa ser feita em todos esses pontos.

- **Evidência:** proposito.json:6, 38, 43, 339; index.tsx:406; intercessao/[day].tsx:237; dia/[day].tsx:193; juntos.tsx:56; voce.tsx:204, 210; reminders.ts:27-29, 168, 190
- **Sugestão:** Confirmar que o horário é fixo na campanha e centralizar numa constante (ou num campo gerado pelo conversor).

### P28 · BAIXA · F4

'Sua leitura… continuam salvos' é verdade hoje: só há referência, conteúdo embarcado, progresso local. Mas a estratégia de conteúdo prevê traduções protegidas só por plataforma online, e o provedor aceita cachePolicy 'session' ou 'none'. Quando o Gate 1 for resolvido desse jeito, ler o texto no app offline pode deixar de funcionar.

- **Evidência:** TELAS.md:212-214; reader/provider.ts:67-69; CLAUDE.md 'Decisões vigentes' (traduções protegidas só via plataforma online).
- **Sugestão:** Rever a cópia de F4 quando a licença for decidida; registrar como dependência do Gate 1.

### P29 · BAIXA · A1 (cabeçalho), E3, identidade

Nome do app: o cabeçalho troca '100 dias na Palavra' por '100 dias sem desistir'. A decisão A14 diz que o nome é da igreja, e o app.json ainda está como 'Leitura Bíblica (spike)', com scheme 'biblespike' e splash e ícone de placeholder. 'Sem desistir', junto com E3 'Você não desistiu', pode ser lido como cobrança, em tensão com o REGRAS 9 ('Nada de culpa… entrada tardia e falta são comportamento normal').

- **Evidência:** Lockup.tsx:21; REGRAS.md:65; docs/design/05-decisoes-abertas.md:284-290; app.json:3, 8, 29-33; TELAS.md:16, 181
- **Sugestão:** Confirmar o nome com a igreja (e com o Product Brain, por causa do tom) antes de gravar a marca no cabeçalho.


---

## Perguntas ao designer — comportamento não especificado (62)

### P1 · ALTA · A1

O painel de hoje só especifica o estado aberto ("Ler agora" e "Vou ler na minha Bíblia"). Não existe o estado "hoje já concluído", que é o estado mais comum para quem lê todo dia, e não existe desfazer em lugar nenhum. Em useJourney o estado 'completed' tem precedência sobre 'today', então o painel precisa ser decidido por day === officialDay && phase === 'running', e não por dayState.

- **Evidência:** TELAS.md:19-26; useJourney.ts:75-77; estado atual de concluído com "Desfazer" em (tabs)/index.tsx:311-355 (undo em :185-193 e :336); dia/[day].tsx:282-289 ("Marcar como concluído", que some do A3); todayScreen.test.tsx:100-120 testa concluir e desfazer
- **Sugestão:** Pedir o desenho do painel concluído (o que substitui os dois botões, se aparece reflexão ou intercessão) e onde fica o desfazer. Sem desfazer, um toque acidental em "Concluir leitura" fica irreversível.

### P2 · ALTA · A1, A3

"Vou ler na minha Bíblia marca o modo e fecha; não conclui o dia". Hoje "marcar o modo" grava settings.lastUsedReadingMode = 'own_bible', que é global e não por dia, e dispara analytics. O efeito visível é trocar o botão principal por "Concluir leitura", que conclui com modo own_bible. "Fecha" não tem referente, porque A1 já é a casa. No desenho novo o painel sempre mostra "Ler agora", A3 perdeu "Marcar como concluído", e o leitor atual CONCLUI o dia no "Prefiro ler na minha Bíblia", o contrário de "não conclui". O texto de B1 diz "volte para marcar" sem dizer onde. Resultado: quem lê na Bíblia impressa não tem como concluir o dia. Com o Gate 1 aberto (B1 sem texto), esse é na prática o caminho de todo mundo.

- **Evidência:** TELAS.md:26 e :58; (tabs)/index.tsx:147, :206-209 e :359-367 (troca de botões), :171-183 (complete own_bible); settingsStore.ts:12-13; reader/[day].tsx:171-176 (readOwnBible chama setDayCompleted); dia/[day].tsx:282-289; docs/design/04-invariantes.md:72 (P-09: "passa a mostrar 'Concluir leitura'")
- **Sugestão:** Pedir o estado posterior a "Vou ler na minha Bíblia" (por exemplo, painel com "Concluir leitura" + "Ler aqui no app"), dizer se o modo persiste entre dias e alinhar o comportamento de B1 "Prefiro ler na minha Bíblia" com a mesma regra.

### P3 · ALTA · A1, A3

Não há caminho especificado da casa até o A3 de HOJE. Toque para A3 só está definido em linhas passadas e em aberto; o painel só tem os dois botões de leitura. Com a aba Início removida, a intercessão de hoje, a reflexão antes de concluir, o altar de hoje e o check de jejum de hoje (que só existe em A3) ficam sem acesso a partir da casa.

- **Evidência:** TELAS.md:17-18, :19-26 e mapa em :230-233; o Início atual tem "Intercessão do dia" em (tabs)/index.tsx:370-375, jejum em :380-399, reflexão em :339-347 e altar em :402-411; todayScreen.test.tsx:254-261 (open-intercession)
- **Sugestão:** Definir se o painel inteiro (ou um link "Ver o dia") abre A3 de hoje, ou se A3 é alcançado de outro jeito.

### P4 · ALTA · B1, B4 (efeito em A1/A3)

No redesenho, quem lê na própria Bíblia não tem como concluir o dia. Hoje existem dois caminhos: o Início troca o botão por 'Concluir leitura' (index.tsx:359-360) e o Dia tem 'Marcar como concluído' (dia/[day].tsx:282-289). A1 e A3 novos não têm nenhum dos dois, e o aviso de B1 diz 'Abra na sua Bíblia ... e volte para marcar'. O único caminho que sobra é paginar o leitor até o último capítulo. Também não está definido se essa pessoa vê B4 e o que B4 diz no lugar de 'lido aqui no app'.

- **Evidência:** mobile/src/app/(tabs)/index.tsx:359-360; mobile/src/app/dia/[day].tsx:282-289; TELAS.md:26, 39, 58, 76
- **Sugestão:** Designer define onde fica o 'Concluir' para leitura fora do app, se esse caminho leva a B4 e qual é a cópia.

### P5 · ALTA · B4 (com E3/E4)

A ordem entre B4 e o marco não está definida. Hoje o marco é um efeito dentro da aba Início que reage ao armazenamento: quando milestoneForDay(completedCount) é exatamente 7/25/50/75/100 e o marco ainda não foi visto, ele faz push de /marco/N. O leitor só faz router.back(). O redesenho remove a aba Início, então o gatilho fica sem casa. O marco conta dias lidos, não o número do dia: 'Dia 25 concluído' não é necessariamente marco, e um marco pode cair em qualquer dia. INFERÊNCIA: como o efeito reage ao armazenamento e não à ação, com B4 no meio o E3 pode ser empilhado por cima de B4 em momento imprevisível.

- **Evidência:** mobile/src/app/(tabs)/index.tsx:81-88; mobile/src/app/reader/[day].tsx:159-169; mobile/src/journey/milestones.ts:14-25; mobile/src/app/(tabs)/_layout.tsx:31; TELAS.md:7
- **Sugestão:** Designer decide: B4 e depois E3, E3 e depois B4, ou E3 substitui B4. Na implementação, mover o gatilho para a ação de concluir, não para um efeito de aba.

### P6 · ALTA · B5

A 'versão com teclado aberto' é exigida (TELAS e REGRAS 28), mas os .md não a descrevem, e o HTML não está no repositório. Hoje: KeyboardAvoidingView só tem comportamento no iOS ('padding'); no Android é undefined, o que INFERÊNCIA com edge-to-edge no RN 0.86 não foi verificada em aparelho. O autoFocus com campo vazio abre o teclado sozinho, e a caixa azul de privacidade, que fica abaixo do campo na ordem da especificação, nasce escondida. O rodapé mantém cap + botão, que foi a correção anterior. INFERÊNCIA: a 3,571× o rodapé ocupa ~300pt e o teclado ~336pt.

- **Evidência:** mobile/src/app/reflexao/[day].tsx:92-96, 158, 203-218; design_handoff_100_dias/design/FALTANDO.md:6-9; TELAS.md:84; REGRAS.md:45
- **Sugestão:** Designer descreve o estado com teclado: o que fica no rodapé, se a cap some, se há autoFocus e onde fica a caixa azul. Provar em aparelho com AX5.

### P7 · ALTA · C1

Como o feed termina e em que ordem vem. A lei aplicável proíbe rolagem infinita ('o feed tem que ter fim'), mas C1 não diz o que aparece no fim, quantos posts cabem, se a ordem é cronológica ou por dia, se mostra só hoje ou toda a campanha, nem como pagina. Os piores casos pedidos no briefing (post sem reação, luto logo acima de festa) não foram mostrados.

- **Evidência:** 00-DECISAO-FEED.md:60-62 (item 10; Decreto 12.880/2026 art. 9º). PROMPT_REDESIGN.md:74-75 e :157-160. TELAS.md:90-96 não fala em fim nem em ordem.
- **Sugestão:** Pedir o estado de fim do feed, a regra de ordenação e o recorte de tempo antes de implementar a lista.

### P8 · ALTA · C1, C3, C4, C6

O que acontece sem conta e sem servidor. O mapa leva de 'Escrever' a C4 e depois a C3 sem passo de conta (hoje é a tela conta.tsx, com e-mail e código) e sem idade. Também não está dito o que acontece quando quem não tem conta toca Amém, comentar ou 'Escrever', nem o que C1 mostra num build sem servidor (como este checkout); nesse build, 'Escrever para a igreja' em B4 vira beco sem saída.

- **Evidência:** TELAS.md:237-239 (mapa). REGRAS.md:23 (conta serve para publicar e reagir). juntos.tsx:170-196 trata hoje o caso sem nuvem ou sem sessão. conta.tsx:43-55. PROMPT_REDESIGN.md:188 ('nada de botão que dá em beco') e :240-244 (desenhar também o build sem servidor).
- **Sugestão:** Pedir o fluxo completo: conta, idade, regras, consentimento, publicar. E pedir o estado de C1 e B4 sem servidor configurado.

### P9 · ALTA · C5

'Não quero ver este assunto' não tem definição. Não existe modelo de assunto, tema ou tag: o dataset só tem monte e ênfase por dia, o post não tem tag e C3 não pede assunto. Com o interruptor do dia desligado, o post nem tem dia. O que exatamente fica oculto, onde isso é guardado e onde se desfaz?

- **Evidência:** TELAS.md:120. Chaves de dataset.json por dia: title, theme, theme_highlight, sphere…; nenhuma tag. O schema não tem tabela de assunto oculto.
- **Sugestão:** O designer define o que é 'assunto' (monte do dia? o autor? o post?) ou troca por 'Ocultar esta publicação'. Até lá, não implementar a linha.

### P10 · ALTA · D4, D2 passo 5

'Convidar alguém' sem link público não está especificado, e toda saída tem custo. Um código curto ou QR mostrado pessoalmente funciona, mas o código mandado pelo WhatsApp vira link na prática. Buscar por nome expõe o diretório de ~3.000 pessoas que o app hoje esconde de propósito. Convidar por e-mail ou pela agenda é coletar dado de terceiro, o que REGRAS 21 e C-10 proíbem para contatos. Também faltam: quem cria o grupo e dá o nome ('Os Guerreiros' é conteúdo de usuário, até 80 caracteres, e precisa de moderação); como o convidado aceita; o estado de grupo cheio (12); como sair; quem remove um membro abusivo se não há administrador; o que vê quem não tem conta ou tem menos de 18 anos.

- **Evidência:** TELAS.md:159-160; REGRAS.md:35; mobile/supabase/migrations/20260907120100_rls.sql:95-98 (só admin insere grupos); mobile/src/cloud/groups.ts:96-105 (joinGroup só por id de catálogo); docs/design/PROMPT_REDESIGN.md:162-163
- **Sugestão:** Pedir ao designer o fluxo completo: criar, nomear, convidar, aceitar, cheio, sair, remover. Pedir ao dono a decisão sobre a remoção sem administrador e sobre a moderação do nome do grupo.

### P11 · ALTA · D1

D1 deixa sem lugar seis funções que funcionam hoje. (1) 'Aviso do altar das 12h30': a preferência fica gravada e é reagendada a cada abertura do app, então quem ligou não consegue mais desligar dentro do app. (2) 'Leitura' (modo de leitura), embora F2 prometa 'Dá para mudar depois quando quiser'. (3) O opt-in de analytics, que REGRAS 22 e S-06 exigem que exista. (4) 'Altar de hoje'. (5) 'Ajuda'. (6) O grupo 'Liderança' (Ferramentas de líder, Administração).

- **Evidência:** mobile/src/app/(tabs)/voce.tsx:183-188, 200-224, 225-235, 238-255, 265; mobile/src/settings/settingsStore.ts:28-29; mobile/src/reminders/useReminderSync.ts:35-44; mobile/src/app/aparencia.tsx:53-68, 96-109; TELAS.md:135-137, 203
- **Sugestão:** Pedir a posição de cada uma. No mínimo o aviso do altar e o analytics precisam de um controle alcançável; do contrário o aviso do altar tem que ser desligado e migrado na atualização.

### P12 · ALTA · E3, E4 (e B4)

Não está definida a ordem entre B4 ('Depois de concluir', que aparece ao concluir a leitura) e E3/E4 quando a conclusão é a 7ª, 25ª, 50ª, 75ª ou 100ª leitura. Qual aparece primeiro? Um substitui o outro? E quando a conclusão acontece fora do leitor (dia passado, própria Bíblia)?

- **Evidência:** TELAS.md:63 ('Ao concluir → B4'), :74-79, :243 ('marcos: 7, 25, 50, 75 → E3')
- **Sugestão:** Designer define a sequência. Sem isso, a implementação escolhe sozinha.

### P13 · MEDIA · A1, A3

42 de 100 dias têm duas ou mais referências (31 com 2, 7 com 3, 1 com 4, 3 com 5). Os rótulos mais longos: dia 93 "Efésios 5–6 · Filipenses 1–4 · Colossenses 1–4 · 1 Tessalonicenses 1" (68 caracteres), dia 95 (64), dia 76 (63). readingSummary junta com " · ", o mesmo separador de "12 capítulos · ~36 min" e de B4/B5 ("Josué 6–17 · lido aqui no app"). O resultado é ambíguo e, em A3, divide a linha com o botão "Ler", chegando a 3 ou 4 linhas. Todos os dias têm de 11 a 12 capítulos (~33 a 36 min).

- **Evidência:** dataset.json (distribuição de readings.length); readingSummary.ts:30; TELAS.md:24, :39, :75 e :82; REGRAS.md:49 (regra 32: "·" precisa de rótulo acessível)
- **Sugestão:** Pedir o tratamento de leitura com vários livros: separador (vírgula ou quebra por livro), limite de linhas e posição do botão "Ler" quando o rótulo quebra. Gerar accessibilityLabel sem "·" nem "~".

### P14 · MEDIA · A1

A1 não menciona o que a Jornada atual faz além das quatro formas de nó. Não fala da compressão com reticências clicáveis e "Comprimir a linha", dos nós de marco (7/25/50/75) e da bandeira do dia 100, do marcador "Seu ministério conduz o altar" (única função visível de "Meu ministério" além do aviso) nem da data e do monte à esquerda. O rótulo passado "Dia 15 · Economia" inclui o monte, mas para o futuro só diz "Nenhum conteúdo do dia aparece", sem dizer se o rótulo leva o monte. O código atual mostra o monte e a escala de dias futuros.

- **Evidência:** jornada.tsx:37-61 (buildRows), :46 (âncoras), :200-204 (monte de dia futuro), :159 (monte no a11y), :228-242 (marcador de ministério), :341-355 (marco e bandeira); ministries.ts:8-9; TOKENS.md:189-197; TELAS.md:17 e :27
- **Sugestão:** Confirmar se a compressão, os marcos e o marcador de ministério saem de propósito, e se o rótulo futuro é só "Dia 18". Se saírem, ajustar os testes que dependem deles.

### P15 · MEDIA · A4

"Folha modal sobre a jornada dessaturada" não cobre deep link a frio (/reader/40 sem pilha), porque não há Jornada renderizada atrás. Falta definir se a rota trancada redireciona para a Jornada abrindo a folha, o que muda o histórico e o comportamento de voltar, ou se desenha a folha sobre fundo vazio. Também falta o texto da variante da reflexão; só leitura e intercessão estão definidas. A dessaturação é viável: RN 0.86 com Fabric implementa filter grayscale/saturate também no iOS.

- **Evidência:** TELAS.md:43-45; node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm:1177-1186 (Grayscale e Saturate); _layout.tsx:69-77 (rotas com headerShown false)
- **Sugestão:** Proposta: a rota trancada faz router.replace para a Jornada com um parâmetro que abre a folha. Confirmar com o designer e definir o texto para reflexão.

### P16 · MEDIA · B1

No estado 'dia já concluído' a especificação repete um defeito atual. Hoje, com o dia concluído, o botão principal é 'Voltar' em TODOS os capítulos, e o '‹' está desabilitado no capítulo 1. Resultado: 'Reler este dia' abre o leitor preso no capítulo 1. TELAS diz 'Próximo capítulo, ou Concluir no último, ou Voltar se o dia já está concluído', e não dá para saber se 'Voltar' substitui só o 'Concluir' ou também o 'Próximo'. O link 'Prefiro ler' some nesse estado, e isso também não está especificado.

- **Evidência:** mobile/src/app/reader/[day].tsx:364-379, 383-385; mobile/src/app/dia/[day].tsx:277-281; TELAS.md:59
- **Sugestão:** Confirmar: num dia concluído, 'Próximo capítulo' continua nos capítulos intermediários e 'Voltar' só aparece no último.

### P17 · MEDIA · B1

A posição de leitura é gravada e nunca lida. saveReaderPosition é chamado a cada troca de capítulo, com readingIndex sempre 0 e sem tratar erro. loadReaderPosition não tem nenhum consumidor, e o leitor sempre abre no capítulo 1 (useState(0)). A especificação não diz se o leitor retoma de onde parou. O filete fala em 'fração de capítulos lidos', mas hoje é posição ((índice+1)/total) e não existe registro por capítulo. O leitor também não aceita parâmetro de capítulo: o 'Abrir no leitor' do versículo-base (E1) abre no capítulo 1.

- **Evidência:** mobile/src/app/reader/[day].tsx:57, 102, 157; mobile/src/reader/readerPosition.ts:8-26; mobile/src/app/intercessao/[day].tsx:102
- **Sugestão:** Designer decide sobre a retomada e o que o filete mede. Se houver retomada, ligar loadReaderPosition e aceitar um capítulo inicial por parâmetro.

### P18 · MEDIA · B2

O limiar é 'medido, não por constante', mas: (1) o rótulo muda de capítulo para capítulo ('Próximo capítulo' → 'Concluir leitura' → 'Voltar'), então o rodapé pode alternar entre linha e pilha enquanto a pessoa pagina; (2) empilhar dá mais largura ao rótulo, que volta a caber, e isso pode oscilar sem histerese; (3) o Button não expõe onTextLayout; (4) o react-test-renderer não roda Yoga, então nenhum teste prova o limiar. Não está especificado se o rótulo de 24/30 é tamanho-base (×2,9 ≈ 70pt) ou tamanho já renderizado, qual o estilo de 'Capítulo anterior', como fica no capítulo 1 (esconde ou mostra desabilitado) e se 'Prefiro ler' continua.

- **Evidência:** mobile/src/app/reader/[day].tsx:338-381; mobile/src/ui/components.tsx:357-379; docs/design/04-invariantes.md:122 (A-D6); TELAS.md:66-67; docs/design/05-decisoes-abertas.md:65-83
- **Sugestão:** Medir pelo rótulo mais longo possível do dia, uma vez só, e fixar o modo enquanto a largura e o fontScale não mudarem. O designer responde sobre o 24/30 e os estados que faltam.

### P19 · MEDIA · B3

'Amostra real' não pode ser texto bíblico (REGRAS 1); hoje a amostra é uma frase escrita pelo app ('Exemplo do tamanho atual do texto de leitura.'). A régua 14–30 não diz se é controle deslizante (não há biblioteca de slider instalada nem papel 'adjustable') ou só indicador. Não diz se 'Diminuir' e 'Aumentar' ficam desabilitados nos limites; hoje o valor é cortado sem aviso. B3 não lista o botão 'Pronto' que existe hoje, e sem ele só sobra o scrim 'Fechar' para sair.

- **Evidência:** mobile/src/app/reader/[day].tsx:392-399; mobile/src/ui/components.tsx:880-900 (Sheet com scrim 'Fechar'); mobile/package.json (sem slider); TELAS.md:70
- **Sugestão:** Designer confirma o texto da amostra, a natureza da régua, os estados nos limites e se o 'Pronto' sai.

### P20 · MEDIA · B3

'Diminuir' e 'Aumentar' ficam lado a lado dentro da folha, e em fonte grande transbordam na horizontal, o mesmo tipo de problema que B2 resolve. INFERÊNCIA, por estimativa de largura de glifo: com ~137pt úteis por botão, 'Diminuir' deixa de caber em uma linha a partir de ~1,8×, e o iOS quebra a palavra no meio. O layout de hoje é o mesmo.

- **Evidência:** mobile/src/app/reader/[day].tsx:392-395; mobile/src/app/aparencia.tsx:75-78; TELAS.md:70
- **Sugestão:** Aplicar a regra de empilhamento de B2 aos dois botões, com o mesmo critério medido.

### P21 · MEDIA · B4, B5

A navegação de B4 não está definida. Não está dito se é rota ou estado do leitor. Precisa substituir o leitor, senão o 'voltar' cai de novo no leitor. Se for rota com parâmetro de dia, é uma quinta rota do dia fora da lista da A4 ('mesma folha para as quatro rotas') e mostra a referência da leitura, então precisa do mesmo tranca-rota. Hoje o 'Salvar para mim' de B5 faz router.back(), o que, vindo de B4 ou C4, devolve para B4 em laço. O fluxo novo não tem 'Desfazer' em lugar nenhum (hoje existe no Início), então uma conclusão por engano não tem volta. Também não está definido se B4 aparece em toda conclusão (até 100 vezes).

- **Evidência:** mobile/src/app/reader/[day].tsx:165; mobile/src/app/reflexao/[day].tsx:70; mobile/src/app/(tabs)/index.tsx:185-193, 336; TELAS.md:45, 76-77, 113
- **Sugestão:** Designer define o destino depois de salvar em B5 conforme a origem, onde fica o desfazer e a frequência de B4. B4 como rota tem de entrar na regra de tranca.

### P22 · MEDIA · B5

Hoje, 'Salvar para mim' com o campo vazio apaga a reflexão em silêncio, sem a confirmação que o 'Excluir' exige. 'Desabilitado se vazio' não diz se vale para o texto salvo (como hoje) ou para o rascunho. 'Cancelar' e o gesto de fechar o modal descartam o rascunho sem aviso. Não há limite de caracteres: C-10 cita 5.000 para notas, e o TextInput não tem maxLength.

- **Evidência:** mobile/src/reflections/reflectionsStore.ts:47-49; mobile/src/app/reflexao/[day].tsx:66-74, 106-132, 154-172; mobile/src/app/_layout.tsx:74-77; docs/design/04-invariantes.md:53 (C-10)
- **Sugestão:** Designer define: salvar desabilitado com campo vazio, confirmação ao descartar e limite com ou sem contador.

### P23 · MEDIA · C1, C2

Fases da campanha e feed vazio. Antes de 23/09 e depois do dia 100, o que diz o cabeçalho 'Dia 17 · a igreja está lendo…'? Em C2, 'Ler o dia 1' leva a A1, mas antes da campanha o dia 1 está trancado (A5). C2 só cobre o primeiro dia: um feed vazio em qualquer outro dia (pouca gente, tudo bloqueado ou removido) mostraria 'o primeiro dia é assim'.

- **Evidência:** TELAS.md:91 e :98-100. TELAS.md:48-49 (A5: nenhum conteúdo do dia 1 revelado). useJourney.ts:72 (nenhum dia abre em before_start).
- **Sugestão:** Pedir as variantes de cabeçalho e de estado vazio por fase, e o vazio fora do dia 1.

### P24 · MEDIA · C3

Qual dia o post marca. B4 abre C3 depois de concluir qualquer dia, inclusive um dia em aberto do passado: 'Marcar o dia 17' marca hoje ou o dia lido? E antes ou depois da campanha? Com o interruptor desligado, o que substitui 'Dia 17 · há 2 h' em C1? Há ainda uma nota técnica: o dia oficial é calculado pelo relógio do aparelho (mais o override de DEV), então o servidor precisa validar day_number ≤ dia oficial. Senão um relógio adiantado publica 'Dia 18' antes da hora, o que é a porta dos fundos da regra 7.

- **Evidência:** TELAS.md:76 (B4 → C3), :92 e :103. useJourney.ts:54-64 (`now` do aparelho, `dayOverride`). officialDay.ts:41. PROMPT_REDESIGN.md:166-168.
- **Sugestão:** O designer define a regra do dia e o texto com o interruptor desligado. A implementação valida no servidor.

### P25 · MEDIA · C3, C1

Detalhes da foto e do campo. A área de foto é 4:3 em C3 e o feed mostra 1:1: quem recorta, e como? O post pode ter só foto? Há contador ou aviso perto dos 5.000 caracteres, e o que acontece ao colar texto maior? Qual é o avatar de 42 de quem não tem foto? (O Avatar atual usa iniciais sobre markSurface, components.tsx:321.)

- **Evidência:** TELAS.md:92 ('proporção 1:1') e :103-104 ('área de foto 4:3', 'Limite de 5.000 caracteres').
- **Sugestão:** Pedir a regra de recorte, o estado no limite de caracteres e o avatar sem foto.

### P26 · MEDIA · C5

Texto e comportamento da folha. Qual é a regra de abreviação de 'Cláudia R.' sobre um nome livre de 1 a 60 caracteres? 'Você não vê mais nada dela, e ela não vê você' usa gênero, que o app não coleta. Qual é o texto da variante em comentário ('Denunciar esta publicação')? Onde se vê e se desfaz um bloqueio? O post some para quem denunciou? Quem não tem conta pode denunciar ou bloquear?

- **Evidência:** TELAS.md:118-123. foundation.sql:27 (display_name livre, de 1 a 60). REGRAS.md:35 (minimização: sem dado de gênero).
- **Sugestão:** Pedir texto neutro ('Você não vê mais nada desta pessoa…'), a regra do nome, a variante para comentário e a lista de bloqueados.

### P27 · MEDIA · C6

Comentários: como 'Ver comentários' aparece sempre, sem contagem, C6 vai abrir vazio muitas vezes, e o estado vazio não está desenhado. Faltam também: se o primeiro comentário exige conta, idade e o consentimento C4 (comentário também fala de fé); o limite de caracteres; a ordem e o fim da lista; apagar o próprio comentário; e o rodapé com teclado aberto.

- **Evidência:** TELAS.md:125-127. REGRAS.md:23 (conta para publicar e reagir) e regra 28 (teclado aberto é estado de layout).
- **Sugestão:** Pedir o estado vazio de C6, as regras de entrada e a versão com teclado aberto.

### P28 · MEDIA · D4

O significado dos números está ambíguo e faltam estados. 'Leu hoje' e 'já leram o dia 17' são coisas diferentes: quem leu hoje o dia 15, para recuperar, conta? Não estão desenhados: antes da campanha (A5), campanha encerrada (E5), sem internet (F4, e aqui os dados vêm do servidor), carregando e erro, grupo só comigo, membro que não consentiu, sem conta.

- **Evidência:** TELAS.md:159; REGRAS.md:17 (dia oficial)
- **Sugestão:** Pedir a definição exata (dia oficial concluído em qualquer momento? concluído hoje?) e os estados que faltam.

### P29 · MEDIA · D3 (passo 2 'Seu nome'), D1

Todo passo tem 'Pular'. Se a pessoa pula o nome, o servidor já preencheu display_name com o prefixo do e-mail (split_part(email,'@',1)), e esse prefixo sai nos posts para a igreja toda. Isso vai contra a privacidade por padrão (S-06) e a minimização. D1 também mostra hoje o prefixo do e-mail como nome (voce.tsx:76-77). Falta dizer qual nome aparece para quem pulou o passo 2 e também como fica o avatar de quem tem conta mas não tem foto.

- **Evidência:** mobile/supabase/migrations/20260907120000_foundation.sql:119-123; mobile/src/app/(tabs)/voce.tsx:76-77, 129-131; TELAS.md:155; REGRAS.md:35
- **Sugestão:** Definir o nome de fallback (por exemplo, exigir nome antes da primeira publicação) e mudar o trigger para não derivar o nome do e-mail.

### P30 · MEDIA · D2, D3

Só o passo 1 está desenhado; 'cada passo segue este padrão' não diz o conteúdo dos outros. Faltam: o passo 2 com teclado aberto (REGRAS 28), validação de 1 a 60 caracteres; o passo 3 com a lista de 40 opções, as descrições de dias e o bloco 'Seus dias no altar'; o passo 4, com quais horários (hoje são manhã, tarde e noite, mais 6 horários, e 21:00 no onboarding) e o que mostrar se o lembrete já foi escolhido em F2; o passo 5 (criar ou entrar). No passo 1 falta o que acontece depois de escolher a foto (prévia, recorte, 'Continuar'). 'Parar no meio e voltar depois' não diz onde o progresso fica salvo nem onde a pessoa retoma. D1 não tem o botão que leva a D2, e não há onde editar o perfil depois (LGPD art. 18, III). O OnboardingStep tem o total fixo em 3.

- **Evidência:** TELAS.md:143-156, 240; mobile/src/app/ministerio.tsx:91-133; mobile/src/app/lembrete.tsx:19-26; mobile/src/app/onboarding/lembrete.tsx:9; mobile/src/ui/OnboardingStep.tsx:9; mobile/supabase/migrations/20260907120000_foundation.sql:27
- **Sugestão:** Pedir os passos 2 a 5, a entrada de D1 para D2 e a tela de editar perfil.

### P31 · MEDIA · D1

Várias linhas de D1 não dizem para onde vão. 'Meu jejum': /jejum não foi redesenhada e é o único lugar para ligar ou desligar a participação depois do onboarding. 'Minhas reflexões': só existe o estado vazio (F6); a lista com itens, que E4 e E5 também abrem, não foi desenhada. 'Lembrete de leitura': vai para o passo 4 de D2 ou para /lembrete, que tem cara de painel técnico ('agendamento(s) ativo(s)', 'Testar agora (5 s)')? 'Meu ministério': passo 3 ou /ministerio? 'Tamanho da letra': B3 é uma folha sobre o leitor, e o padrão de B3 é 19 contra 18 hoje, com passo de ±2 numa faixa 14–30 (de 19 não se chega às pontas pares); falta também o valor mostrado na linha. Também não estão definidos: 'Meu grupo' sem grupo ou sem conta, e a identidade de quem não escolheu ministério.

- **Evidência:** TELAS.md:134-140; mobile/src/app/jejum.tsx:91-104; mobile/src/app/reflexoes.tsx:28-49; mobile/src/app/lembrete.tsx:149-163; mobile/src/settings/settingsStore.ts:42; mobile/src/app/aparencia.tsx:19-20, 43-47
- **Sugestão:** Pedir o destino e o estado vazio de cada linha, e a regra de migração do tamanho de fonte (18 → 19).

### P32 · MEDIA · D5

O subtítulo de D5, 'Palavra · Consagração · Adoração · Intercessão', é o campaign.subtitle do dataset ('Palavra • Consagração • Adoração • Intercessão') com o '•' trocado por '·'. Já a página atual e o teste usam o subtítulo da orientação: '100 DIAS DE CONSAGRAÇÃO, PALAVRA, ADORAÇÃO E INTERCESSÃO'. Qual dos dois? Trocar o caractere mexe no texto da igreja, e o '·' precisa de rótulo acessível próprio (REGRAS 32).

- **Evidência:** mobile/content/100-dias-2026/proposito.json:3; mobile/content/100-dias-2026/dataset.json:5; mobile/src/app/proposito.tsx:156-162; mobile/src/__tests__/proposito.test.tsx:87; REGRAS.md:49
- **Sugestão:** Usar um dos dois campos tal como está no dado, com os separadores originais e um accessibilityLabel sem símbolos.

### P33 · MEDIA · E2

O E2 especifica só título, texto do passo e versículo-base; é o mock do passo 3. Não diz o que o passo 4 mostra no modo altar. Hoje ele mostra o monte, a ênfase e os motivos de oração em 22/31, que são o conteúdo central para quem conduz. Também não diz se o cap 'VERSÍCULO-BASE' continua no passo 3.

- **Evidência:** TELAS.md:176; AltarMode.tsx:124-160
- **Sugestão:** Designer especifica o passo 4 do modo altar.

### P34 · MEDIA · E2

O rodapé não está completo. Faltam: o rótulo e a ação do botão amarelo no último passo (hoje 'Concluir', que volta ao E1); o que acontece com o '‹' no passo 1 (oculto, ou desabilitado com opacidade e contraste declarado?); o nome acessível do '‹'; e a cor do texto do passo (hoje rgba(255,255,255,0.78), opacidade). 'Passo anterior' e 'Sair do modo altar' saem do rodapé; 'Sair' vai para o topo.

- **Evidência:** TELAS.md:176; AltarMode.tsx:14, 120, 163-191; TOKENS.md:161 (declarar contraste de opacidade)
- **Sugestão:** Designer completa os estados de primeiro e último passo.

### P35 · MEDIA · E3

Das frases dos marcos, só a do 25 foi especificada ('Vinte e cinco dias de Palavra. Você não desistiu.'), e ela é diferente da atual. As de 7, 50 e 75 não foram dadas. Os quatro rótulos batem com o código.

- **Evidência:** TELAS.md:181-182; milestones.ts:7-10 (celebration atual: 'Vinte e cinco dias. Você já construiu um ritmo.')
- **Sugestão:** Designer entrega as quatro frases. São cópia do app, revisável.

### P36 · MEDIA · E5

O E5 é estado do A1, mas não se diz se substitui a trilha, se fica acima dela, nem se tem cabeçalho e barra de navegação. 'Ver a jornada inteira' não tem destino claro. Faltam variantes: 0 lidos (instalou depois do fim), 100 lidos (a frase 'os dias que ficaram abertos' fica falsa), 0 ou 1 reflexão ('Minhas 0 reflexões', singular). 'Régua com 83% preenchido' pode ser contínua, o que pinta 1..83 como lidos e contraria o princípio da régua, ou pode pintar os dias lidos. O número por extenso ('Oitenta e três') pede uma função pt-BR que não existe.

- **Evidência:** TELAS.md:30, 191-192; HundredDayRuler.tsx:78-83; index.tsx:148, 247
- **Sugestão:** Designer define a fronteira E5/A1 e as variantes por valor.

### P37 · MEDIA · F2, A1

O que a escolha de F2 passo 1 muda no app novo? Hoje ela inverte a ação principal do Início ('Concluir leitura' vira o primário para quem lê na própria Bíblia), e o onboarding diz 'Isso muda só o destaque dos botões'. A1 no desenho tem ordem fixa: 'Ler agora' primário e 'Vou ler na minha Bíblia' sublinhado. Se nada reage, a pergunta é decorativa, e 'Vou alternar' nunca teve comportamento próprio.

- **Evidência:** TELAS.md:25-26; (tabs)/index.tsx:147 e :358-369; onboarding/leitura.tsx:22; __tests__/todayScreen.test.tsx:123 ('a preferência de leitura muda a ordem dos CTAs').
- **Sugestão:** O designer diz se A1 troca a ordem dos botões conforme o modo, ou se o passo 1 sai do onboarding.

### P38 · MEDIA · F2

Os passos 2 e 3 'seguem o mesmo molde', mas TELAS.md não traz título, opções, frase de apoio nem rótulos, e o PROMPT proíbe inventar. A cópia atual não serve sem mudar: o jejum diz 'aparece só uma marcação privada no seu Início', e o Início deixa de existir. Também ficam sem resposta: (a) no passo 3, quais horários aparecem? Hoje 'Escolher horário' grava 21:00 fixo sem deixar escolher, e não há biblioteca de seletor de hora instalada; (b) 'Continuar desabilitado até escolher' no passo 2 exige um estado 'sem resposta', mas fastingEnabled é booleano com padrão false, o que já deixa 'Ainda não' marcado; (c) tamanho dos três segmentos (D3 define 5px raio 3 só para o perfil; o StepBar de hoje tem 28×4); (d) as opções do passo 1 perdem as descrições? A de 'Ler aqui no app' ('O texto aparece direto na tela de hoje') é falsa sob o Gate 1.

- **Evidência:** TELAS.md:205; onboarding/jejum.tsx:17-18 e :25-34; onboarding/lembrete.tsx:9 e :72-79; settingsStore.ts:14 e :40; components.tsx:733-752; onboarding/leitura.tsx:8-12.
- **Sugestão:** Pedir ao designer a cópia exata e as opções dos passos 2 e 3. Se houver seletor livre de hora, é dependência nova.

### P39 · MEDIA · F1, F2

Depois de entrar por 'Já tenho perfil', a pessoa passa por F2 ou vai direto para A1? Modo de leitura, jejum e lembrete são só locais por decisão de privacidade e não voltam num aparelho novo: entrar não restaura nada disso.

- **Evidência:** settingsStore.ts:4 ('LOCAL-ONLY'); __tests__/localStores.test.ts:141-148 (jejum e reflexão sem caminho de rede); _layout.tsx:30.
- **Sugestão:** Sugestão: entrar e seguir para F2, porque as preferências locais precisam ser escolhidas neste aparelho.

### P40 · MEDIA · F1, F2

Os títulos grandes quebram no meio da palavra em fonte grande. Estimativa (INFERÊNCIA, largura média de ~0,58em do Schibsted 800): 'desistir' em displayXl 50px passa da coluna útil de 354pt já em 2× (~460pt) e fica muito maior em 3,571× (~830pt). O RN corta a palavra por caractere. E3 tem regra para o numeral ceder; F1 e F2 (34/38) não têm.

- **Evidência:** TELAS.md:199 e :203; REGRAS.md:25 (teto real 3,571×); o comentário em onboarding/index.tsx:23-24 registra o mesmo problema no título de hoje.
- **Sugestão:** O designer define se o título cede tamanho (medido) acima de um limiar, como em E3, ou se aceita quebra entre palavras com hífen.

### P41 · MEDIA · F5, B1, C1

Quais falhas mostram F5, e em quais telas? O conteúdo do dia está embarcado e é lido de forma síncrona, então 'A leitura de hoje não veio' quase não acontece. A única falha assíncrona real é getPassage do provedor bíblico no leitor. Build de release com conteúdo não autorizado quebra no carregamento do módulo, antes do React, então nunca mostra F5 (por desenho). Não há ErrorBoundary em nenhuma rota. C1 lista 'erro (F5)', mas a cópia e o 'Ler na minha Bíblia' não fazem sentido no feed. E 'Ler na minha Bíblia' conclui o dia ou não? No leitor de hoje conclui; no Início não (invariante P-09).

- **Evidência:** journey/datasetSource.ts:1, :33-39, :64-66; reader/[day].tsx:97-103; reader/[day].tsx:283-289 (mostra `message={error.message}` cru, o que viola 'nenhum código técnico' assim que houver provedor de rede); reader/[day].tsx:171-176 vs (tabs)/index.tsx:206-209; docs/design/04-invariantes.md:72 (P-09); TELAS.md:62 e :96; grep ErrorBoundary: zero.
- **Sugestão:** O designer lista os contextos de F5 com a cópia de cada um (leitor, feed, falha de leitura local) e diz se 'Ler na minha Bíblia' conclui. Na implementação: exportar ErrorBoundary nas rotas e nunca mostrar error.message.

### P42 · MEDIA · F3

F3 só define o esqueleto de A1. Outras 17 telas mostram 'carregando' hoje, com o mesmo spinner: jornada, você, dia, intercessão, reflexão, reflexões, jejum, lembrete, ministério, aparência, grupo (2), juntos (2), leitor, admin e dev. B1 lista 'carregando' sem forma, e C1 tem o esqueleto próprio. Também não está claro o fundo: 'surfaceSunken sobre surfaceWarm', mas o fundo de A1 é background #FFF e só o painel de hoje é quente. As medidas do esqueleto só existem no HTML, que não está no repositório.

- **Evidência:** TELAS.md:208; components.tsx:767-775; usos: (tabs)/index.tsx:93, jornada.tsx:110, voce.tsx:71, juntos.tsx:148 e :207, dia/[day].tsx:147, intercessao/[day].tsx:161, reflexao/[day].tsx:57, reflexoes.tsx:16, jejum.tsx:25, lembrete.tsx:51, ministerio.tsx:57, aparencia.tsx:37, grupo/[id].tsx:79 e :210, reader/[day].tsx:291, admin.tsx:84, dev.tsx:45; design_handoff_100_dias/design/FALTANDO.md.
- **Sugestão:** Definir um esqueleto genérico (título + blocos) para as telas sem forma própria, e o fundo de F3.

### P43 · MEDIA · todas as que têm parágrafo de interface (C5, D2, D3, F2, F4, legendas)

Não existe variante de parágrafo sem serifa, e 'body' muda de natureza. Hoje 'body' é Archivo 500 17/26 e é o variant PADRÃO de AppText; no TOKENS vira Source Serif 17/27. As 26 ocorrências de <AppText> sem variant e os 8 variant='body' viram serifa. Os variants 'secondary' (25 usos), 'muted' (17), 'tick' (17), 'readItalic', 'editor' e 'verse' não têm equivalente. Frases de interface como 'Alguém da igreja vai olhar em até 24 h' ou 'Ler na Bíblia impressa não é pior' ficam sem estilo definido.

- **Evidência:** components.tsx:106-188 (default 'body' na linha 182); TOKENS.md:114-136; TELAS.md:118, 150, 203
- **Sugestão:** Pedir ao designer o mapa variante antiga → nova e se existe um parágrafo de interface sem serifa (por exemplo Schibsted 400/500 15/22).

### P44 · MEDIA · D2, D4, D5, F6 e os destinos de D1

Cabeçalho nativo ou barra própria? Hoje 10 rotas mostram o header nativo com o título em fonts.label 17 (headerTitleStyle), que não acompanha o tamanho de letra do sistema nem o negrito. O desenho usa barra própria em A3, B1, B5, C3, C4, C6, D3, E1, E2 e F2, mas não diz nada para D2, D4, D5 e F6. D5 e F6 hoje têm header nativo com o mesmo título que o desenho põe em 32/36 na página, o que duplicaria o título. 'Lembrete de leitura', 'Meu ministério', 'Tamanho da letra', 'Conta e privacidade' e 'Meu jejum' não têm tela desenhada.

- **Evidência:** _layout.tsx:57-88 (linha 61: headerTitleStyle { fontFamily: fonts.label, fontSize: 17 }; 71-87: header nativo em ministerio, proposito, reflexoes, jejum, aparencia, ajuda, lembrete, conta, admin, dev); TELAS.md:134-137, 143, 159, 163, 221
- **Sugestão:** Recomendação: esconder o header nativo em todas as rotas e usar um TopBar único. Pedir ao designer o 'voltar' de D2/D4/D5/F6 e um molde para as telas não desenhadas.

### P45 · MEDIA · barra flutuante (A1, C1, D1)

Os '26 do fundo' contam da borda física ou da área segura? No iPhone de 402×874 do mock, o inset inferior é 34 (INFERÊNCIA), então 26 da borda põe a pílula sobre o indicador de home. No Android edge-to-edge com 3 botões (INFERÊNCIA: padrão no SDK 57), a pílula cobre a navegação do sistema. Hoje a barra soma insets.bottom. O comportamento em 2× e 3,571× também não foi desenhado: o rótulo de 11px chega a ~39px, 'Comunidade' não cabe numa coluna de ~110px, e o REGRAS 25 proíbe teto de fonte.

- **Evidência:** TOKENS.md:150, 176-179; TELAS.md:5; PROMPT.md:43; TabBar.tsx:172, 229; REGRAS.md:42, 64
- **Sugestão:** Pedir ao designer: bottom = max(26, insets.bottom + N)? Em fonte grande, a barra quebra o rótulo em linhas, esconde o ícone ou tem um teto declarado como exceção?

### P46 · MEDIA · A5, D1, E3, E4, E5 (régua)

A régua nova só define lido, futuro e hoje. O dia 'em aberto' (passado e não lido), que hoje ganha um círculo no topo, vira idêntico ao futuro. A invariante A-09 justifica a exceção de contraste do amarelo (1,46:1 sobre branco, 1,34:1 sobre quente) exatamente pela forma do 'em aberto'. As variantes A5 ('inativa'), E3 ('traços em text sobre trilha rgba(17,17,17,0.22)': que trilha?) e E4 não estão definidas, e E5 pede '83% preenchido'. Uma faixa contínua mentiria para quem leu dias salteados, o que o código atual evita de propósito.

- **Evidência:** TOKENS.md:199-201; TELAS.md:48, 181, 191; HundredDayRuler.tsx:238, 279-302; docs/design/04-invariantes.md:106
- **Sugestão:** Pedir ao designer a forma do 'em aberto' e a especificação de cada variante. E5 deve pintar os dias realmente lidos, não uma porcentagem contínua.

### P47 · MEDIA · etapa 1 (primitivos)

Faltam especificações dos primitivos que a etapa 1 exige. O PROMPT manda fazer pílula, linha de lista e caixa de marcação, que o TOKENS §5 não especifica. Também não estão especificados: o campo de texto, o interruptor 52×32 (o estado desligado é indefinido), os segmentos de passo (D3 5px, E2 6px, F2 sem medida; o StepBar atual é 28×4), o esqueleto de F3, o avatar com foto e o estado marcado da caixa de jejum. O título do botão diz 'quatro variantes', mas a tabela tem seis. O TOKENS pede 'declare o contraste resultante' do desabilitado e não declara. Medido: rótulo do primário com 0.45 = 3,03:1, contornado = 3,03:1, pílula azul 'Publicar' = 2,24:1, seta de B1 com 0.35 = 2,27:1 (a WCAG isenta componentes inativos, mas a regra do próprio pacote pede o número).

- **Evidência:** PROMPT.md:51; TOKENS.md:158-170; TELAS.md:22, 39, 59, 103, 154, 176, 208; components.tsx:507-599, 733-753
- **Sugestão:** Pedir ao designer uma seção 5b no TOKENS com esses primitivos e os contrastes do desabilitado.

### P48 · MEDIA · todas (navegação), folhas

A transição de 220ms ease-out não é aplicável como está. No native-stack, animationDuration só vale no iOS e só para slide_from_bottom, fade_from_bottom, fade e simple_push, não para a animação default. O _layout.tsx passa MOTION_MS com a animação default, então hoje isso não tem efeito, e o easing não é configurável. O TOKENS pede que todo movimento desligue com 'Reduzir movimento', mas a navegação não consulta useReducedMotion e o Sheet usa sempre animationType='slide'.

- **Evidência:** TOKENS.md:206-208; node_modules/expo-router/build/react-navigation/native-stack/types.d.ts:594-609; _layout.tsx:65; components.tsx:891; theme.ts:222-237
- **Sugestão:** Pedir ao designer: aceitar a transição nativa do sistema, ou trocar para simple_push/fade no iOS? Na implementação, animation 'none'/'fade' e Modal sem slide quando 'Reduzir movimento' estiver ligado.

### P49 · BAIXA · A3

Faltam detalhes em A3: se a linha "Altar das 12h30" é tocável e para onde vai; se a caixa de jejum respeita settings.fastingEnabled (hoje escondida quando desligado, e D1 tem "Meu jejum → Desligado"); se A3 mostra que o dia está concluído (hoje há check na leitura e "Reler este dia"); se "Cinco passos" deve sair de flow.length (hoje são 5 em proposito.json).

- **Evidência:** TELAS.md:39; dia/[day].tsx:248, :264-273 e :276-281; (tabs)/index.tsx:380; proposito.ts:54-57; proposito.json flow.length = 5
- **Sugestão:** Pedir as respostas junto com o estado concluído de A1.

### P50 · BAIXA · A1

Com A1 como casa e B4 aparecendo ao concluir, não está definida a ordem entre B4 e o marco em tela cheia (E3) quando a conclusão atinge 7, 25, 50 ou 75. Hoje o marco é disparado por efeito ao montar o Início.

- **Evidência:** (tabs)/index.tsx:82-88; TELAS.md:74-77 e :180
- **Sugestão:** Definir a ordem: B4 primeiro e o marco ao voltar para A1, ou o contrário.

### P51 · BAIXA · A1, A3, A4

Os dados de exemplo dos mocks não batem com o dataset. O dia 17 real é Educação, "Uma geração de coragem", conduzido por Evangelismo, em 09/10/2026 (não GOVERNO nem 17/10/2026). O dia 18 abre em 10/10/2026, não em 18/10/2026. Quem comparar "lado a lado" pode copiar o valor do mock.

- **Evidência:** dataset.json dia 17 (sphere educacao, title "Uma geração de coragem", altar.ministry "Evangelismo"); officialDay.ts:49-57 (23/09 + 16 = 09/10); TELAS.md:22, :39 e :44
- **Sugestão:** Tratar os valores do mock como marcadores e comparar estrutura e medidas, nunca o conteúdo.

### P52 · BAIXA · B1

Contraste declarado, como a especificação pede: o '‹' desabilitado com opacidade 0,35 mede 2,28:1 no tema claro (borda #111 sobre #FFF) e 3,21:1 no escuro. A WCAG 1.4.11 isenta controle inativo, mas fica abaixo de 3:1 no claro. O 'Excluir' desabilitado de B5 mede 1,95:1 hoje (opacidade 0,4) e 2,14:1 com o 0,45 de TOKENS. O paddingBottom 40 do rodapé não diz se inclui a área segura; hoje é insets.bottom + 12.

- **Evidência:** mobile/src/app/reader/[day].tsx:329, 355; mobile/src/app/reflexao/[day].tsx:125; TOKENS.md:170; TELAS.md:59
- **Sugestão:** Designer aceita os valores declarados ou troca o desabilitado por forma, e diz se os 40 incluem a área segura.

### P53 · BAIXA · B4

'Josué 6–17 · lido aqui no app': o armazenamento de conclusões só guarda um timestamp por dia, e o modo de leitura é global (lastUsedReadingMode). Só é verdade se B4 vier exclusivamente do leitor. Em 42 dos 100 dias do dataset há leituras de mais de um livro, e readingSummary junta com ' · ', o que gera 'Gênesis 49–50 · Êxodo 1–10 · lido aqui no app': o mesmo separador para duas coisas. O mesmo vale para a cap de B5.

- **Evidência:** mobile/src/progress/completionsStore.ts:9-13; mobile/src/settings/settingsStore.ts:13; mobile/src/journey/readingSummary.ts:30; mobile/content/100-dias-2026/dataset.json (42 dias com readings.length > 1)
- **Sugestão:** Designer define o separador para dias com mais de um livro e a cópia quando a leitura não foi no app.

### P54 · BAIXA · C4

Em C4, 'Guardar só para mim' leva a B5. Quando a pessoa chegou a C4 por 'Escrever' em C1 (e não por B4), B5 abre a reflexão de qual dia? Antes da campanha, B5 está trancado (A4).

- **Evidência:** TELAS.md:113 e :239. B5 é por dia: rota /reflexao/[day] (_layout.tsx:75-77). TELAS.md:45 (A4 vale também para a rota de reflexão).
- **Sugestão:** Definir o destino fora do fluxo de B4.

### P55 · BAIXA · E4

Hoje o E4 mostra '0 dias de jejum' até para quem recusou o jejum no onboarding, o que soa como falta (REGRAS regra 9). Além disso, 'dias lidos' é sempre 100, porque o gatilho é a contagem 100, e repete o numeral. Não estão especificadas as cores do numeral e do rótulo dos três números. A régua e a ênfase do Dia 100 (título atual) somem do desenho: confirmar.

- **Evidência:** marco/[day].tsx:97-99, 129-139, 155-161, 172-174; onboarding/jejum.tsx:32-33; TELAS.md:187-188
- **Sugestão:** Esconder o jejum quando fastingEnabled = false? Manter 'dias lidos'?

### P56 · BAIXA · E1

Não está dito qual é o rótulo de voltar ('‹ Dia 17') quando o E1 abre sem pilha e volta para a Jornada. O cadeado da intercessão é descrito como folha 'sobre a jornada dessaturada', mas por deep link não há jornada atrás; hoje é tela cheia com 'Voltar', não 'Voltar para a Jornada'.

- **Evidência:** TELAS.md:43-45, 171-172; intercessao/[day].tsx:182-198

### P57 · BAIXA · F3, F1

O esqueleto vai piscar. 'Carregando' dura só a leitura do AsyncStorage (ready = completions e settings não nulos). Na primeira abertura, enquanto o portão espera as configurações, a aba inicial mostra o carregando, e o esqueleto em forma de Jornada apareceria por um instante antes de F1 amarelo para quem nunca abriu o app.

- **Evidência:** journey/useJourney.ts:97; app/_layout.tsx:28 (`if (!settings) return;`) e :45-52 (a splash já segura só as fontes).
- **Sugestão:** Segurar a splash até as configurações carregarem, como já é feito com as fontes, e/ou só mostrar F3 depois de uns 300ms. O designer confirma.

### P58 · BAIXA · F6

'Escrever a de hoje' antes da campanha (nenhum dia liberado) e depois do dia 100 (officialDay preso em 100): o que acontece? A4 diz que a rota de reflexão de dia futuro cai no cadeado, mas hoje reflexao/[day] deixa escrever em dia fechado e só esconde a referência.

- **Evidência:** TELAS.md:45 e :221; journey/useJourney.ts:72; reflexao/[day].tsx:64.
- **Sugestão:** Antes de 23/09: esconder a ação ou levar para A5. Depois do dia 100: escrever no dia 100 ou esconder.

### P59 · BAIXA · F6 (molde)

'Molde de todo estado vazio' (ícone + título + frase + ação) não bate com vários vazios ou não-encontrados que existem hoje sem ícone, sem frase ou sem ação. O desenho não dá a cópia deles.

- **Evidência:** conta.tsx:47-51; admin.tsx:93-98; grupo/[id].tsx:88-93; marco/[day].tsx:66-70 (sem mensagem); reflexao/[day].tsx:45-49; dia/[day].tsx:156-161; intercessao/[day].tsx:172-177; reader/[day].tsx:144-149; (tabs)/juntos.tsx:209 (texto solto).
- **Sugestão:** O designer diz quais seguem o molde e com que cópia; os 'não encontrado' talvez sejam F5, não F6.

### P60 · BAIXA · F4

Em quais telas a faixa aparece? F4 só mostra A1. Não está dito se ela aparece em A3, B1, D1, nem como fica C1 offline ('o feed fica indisponível' não tem desenho).

- **Evidência:** TELAS.md:212 e :96.
- **Sugestão:** Sugestão: faixa só em A1 e estado próprio de C1.

### P61 · BAIXA · botão sublinhado, A1/A3 (realce), barra e leitor (vidro), A4, C3/D3, ícone Comunidade

Alguns valores literais não têm equivalente no RN 0.86. (1) O sublinhado com 'offset 3' não existe: o RN só tem textDecorationLine/Style/Color. (2) O realce 'padding 0 4 raio 4' numa palavra dentro de um parágrafo não funciona, porque Text aninhado não aceita padding nem borderRadius. (3) blur(20px)/blur(18px) do CSS não se traduz para a intensity 0–100 do expo-blur (hoje é 40). (4) A 'jornada dessaturada' de A4 depende de filter grayscale (INFERÊNCIA: só no Android). (5) A linha pontilhada 4/5 e os tracejados exatos exigem SVG. (6) O ícone Comunidade 'recorta com o fundo da barra', o que não funciona sobre vidro translúcido nem sobre a pílula ativa e exige máscara SVG. Por outro lado, as sombras funcionam literalmente via boxShadow. INFERÊNCIA não confirmável sem o HTML: se o HTML usa Source Serif 4 variável com eixo óptico, o numeral de 44px e o versículo de 24px não vão bater com os TTF estáticos.

- **Evidência:** TOKENS.md:99, 167, 184; TELAS.md:23, 43, 103, 154; node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:516-517, 574-575, 631-638; TabBar.tsx:237-241
- **Sugestão:** Pedir ao designer que aprove as aproximações: borda inferior ou decoração simples no sublinhado; espaço fino no realce sem raio; intensity calibrada no aparelho; scrim sem dessaturação no iOS.

### P62 · BAIXA · D1, Jornada

O TOKENS especifica o voo da pomba, mas nenhuma das 32 telas o usa: D1 mostra a régua e E3 tem pomba estática. FlyingDove.tsx, usado hoje no Você, ficaria órfão. Os nós especiais de marco (numeral) e do dia 100 (bandeira) também desaparecem da Jornada.

- **Evidência:** TOKENS.md:207; TELAS.md:134, 181; FlyingDove.tsx:25-158; (tabs)/jornada.tsx:340-356
- **Sugestão:** Pedir ao designer: onde a pomba voa? Os nós de marco e de chegada saem de propósito?


---

## Testes afetados

- mobile/src/__tests__/todayScreen.test.tsx
- mobile/src/__tests__/offlineResilience.test.tsx
- mobile/src/__tests__/dynamicType.test.tsx
- mobile/src/__tests__/diasFuturos.test.tsx
- mobile/src/__tests__/intercessao.test.tsx
- mobile/src/__tests__/journeyPhases.test.tsx
- mobile/src/__tests__/proposito.test.tsx
- mobile/src/__tests__/diasFuturos.test.tsx (espera o testID 'reader-locked-back' e o texto 'Abre em' da tranca inline do leitor, e espera o editor com 'reflection-save' num dia futuro, linhas 144-152)
- mobile/src/__tests__/dynamicType.test.tsx (FLOOR outline = 52 na linha 121; TOKENS pede 56 para os botões contornados de B3)
- mobile/src/__tests__/contrast.test.ts (par 'text' sobre 'readerBackground' na linha 34; B1 especifica o token 'background')
- mobile/src/__tests__/intercessao.test.tsx (linha 135 espera push para /reader/[day] só com { day }; quebra se o leitor ganhar parâmetro de capítulo)
- mobile/src/__tests__/localStores.test.ts (linhas 123-129: salvar vazio apaga; muda se 'Salvar para mim' com campo vazio mudar de semântica)
- mobile/src/__tests__/sqlPolicies.test.ts (linhas 25 e 33-36 afirmam que só existem as 5 tabelas da fundação, 'nada de feed, reações, denúncias ou push'; a linha 50 afirma que nenhuma policy concede acesso a anon, o que quebra se a leitura sem conta usar o papel anon)
- mobile/src/__tests__/proposito.test.tsx (importa TogetherScreen de '@/app/(tabs)/juntos' na linha 4; o bloco 'Juntos: altar das 12h30' das linhas 118-150 some quando Juntos virar Comunidade)
- mobile/src/__tests__/ministerio.test.tsx (linha 203 espera router.push('/(tabs)/juntos'))
- mobile/src/__tests__/cloudAuth.test.ts (linhas 163-166 afirmam que requestAccountDeletion sempre falha; muda quando a exclusão existir)
- mobile/src/__tests__/ministerio.test.tsx
- mobile/src/__tests__/cloudAuth.test.ts
- mobile/src/__tests__/cloudRoles.test.ts
- mobile/src/__tests__/sqlPolicies.test.ts
- mobile/src/__tests__/marcoScreen.test.tsx
- mobile/src/__tests__/contrast.test.ts
- mobile/src/__tests__/content100Dias.test.ts
- mobile/src/__tests__/offlineResilience.test.tsx (importa '@/app/(tabs)/index', que some quando Início e Jornada viram A1; o gatilho da faixa de F4 muda)
- mobile/src/__tests__/todayScreen.test.tsx (importa '@/app/(tabs)/index'; o teste da linha 123 depende de o modo de leitura escolhido em F2 mudar a ordem dos botões)
- Observação: nenhum teste cobre as telas de onboarding, o StateView ou o OfflineBanner; F1–F6 vão precisar de testes novos, não de reescrita
- mobile/src/__tests__/todayScreen.test.tsx — importa (tabs)/index (Início), que deixa de existir; 14 testes. Guardas a re-hospedar em A1/A3: número coletivo sem fonte, antes da campanha sem revelar o dia 1, depois da campanha, motivos de oração e bloco vazio, escala sem nomes de líder, retomada sem culpa
- mobile/src/__tests__/offlineResilience.test.tsx — importa Início e Jornada, usa testIDs complete-day/day-completed e o rótulo 'Dia 17 de 100'. A guarda 'o núcleo local sobrevive à nuvem quebrada' precisa sobreviver apontando para A1/A3/B1
- mobile/src/__tests__/dynamicType.test.tsx — PRECISA ser atualizado: FLOOR outline 52→56 (linhas 118-124), SpherePill minHeight 28→30 (156), reticência, journeyRowHeight e 'teto de 2×' (162-202, que A1 e REGRAS 26 eliminam), numeral do Dia 100 167→150 (222). O meta-teste do harness (85-112) sobrevive. Faltam casos para barra flutuante, folha, rodapé empilhado de B2 e negrito
- mobile/src/__tests__/contrast.test.ts — PRECISA ser atualizado: usa as chaves readerBackground (34), devBanner/devBannerSurface (53), nodeDone e success (62-64), que saem da paleta. Faltam pares blue/onBlue/blueSoft/onBlueSoft/onAccentMuted/warning, os das superfícies fixas (tinta e amarelo) e os do vidro sobre foto. O scanner de superfícies invertidas sobrevive, e a exceção do amarelo deve passar a medir sobre surface e surfaceWarm (régua nova)
- mobile/src/__tests__/proposito.test.tsx — importa (tabs)/juntos (2 testes de 'Juntos' quebram). Os 4 testes de D5 são guarda de texto literal da igreja e precisam sobreviver
- mobile/src/__tests__/ministerio.test.tsx — importa (tabs)/voce. O teste '"Meu ministério" e "Altar de hoje" substituem "Meu grupo"' contradiz D1, e altar-reminder-toggle não tem lugar no desenho. Precisam sobreviver: lista sem nomes de líder, banner de conteúdo e permissão sob gesto
- mobile/src/__tests__/intercessao.test.tsx — cópia e testIDs do modo altar ('Próximo passo', 'Concluir', 'Sair do modo altar', altar-next, altar-previous, exit-altar-mode) mudam em E2. Precisam sobreviver: cinco passos, sem nomes de líder, dia futuro trancado, content-banner (106) e voltar do Android saindo do modo
- mobile/src/__tests__/marcoScreen.test.tsx — mudam a cópia e o rótulo acessível da régua. Precisam sobreviver: marco é contagem pessoal, sem monte nem data, régua com os dias realmente lidos e Dia 100 com data
- mobile/src/__tests__/diasFuturos.test.tsx — o testID reader-locked-back e a tela de bloqueio viram a folha A4. As guardas de não pedir passagem ao provedor e não revelar a referência precisam sobreviver
- Sobrevivem sem mudança (são guardas de conteúdo, direitos, lembretes e dados): journeyPhases.test.tsx, reminders.test.ts, content100Dias.test.ts, dataset.test.ts, officialDay.test.ts, references.test.ts, localStores.test.ts, cloudAuth.test.ts, cloudRoles.test.ts, cloudSecurity.test.ts, sqlPolicies.test.ts. Linha de base de hoje: 20 suítes e 337 testes verdes
