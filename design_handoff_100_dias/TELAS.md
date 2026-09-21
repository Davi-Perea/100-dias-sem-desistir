# As 32 telas, uma por uma

Cada tela tem um `data-screen-label` no elemento raiz dentro de `design/telas-100-dias.dc.html` — abra no navegador e compare.

Convenções: moldura de 402×874. Área útil começa a **58px** do topo (barra de status). Calha lateral **24** (20 nas telas de lista e feed). Barra flutuante a **26** do fundo, altura mínima **64**, margem lateral **20**.

**Navegação: três destinos.** Jornada (casa) · Comunidade · Você. Não existe aba "Início" — ela e a Jornada mostravam o mesmo dia de dois jeitos, e viraram uma.

---

## A · A jornada e o dia

### A1 · Jornada — a casa do app
Abre **onde a igreja está**, nunca no dia 1. Estrutura, de cima para baixo:

1. **Cabeçalho** (`minHeight 48`): pomba 30×19 (proporção 224×144) · "100 dias sem desistir" Schibsted 700 15/20 tracking −0,2 · círculo de conta 48×48 raio 24 em `surfaceMuted` com borda 1,5px `border` → abre D1.
2. **Linhas de dia passado** (`minHeight 48`, `gap 14`): coluna de trilho de 20px de largura com a linha de 2px em `text` e o nó; rótulo "Dia 15 · Economia" Schibsted 600 15/20; à direita "Concluído" Schibsted 500 12,5/17 em `textMuted`. Toque → A3 daquele dia.
3. **Linha de dia em aberto** (`minHeight 52`): fundo `blueSoft`, raio 14, recuo de −6 à esquerda. Nó = anel azul de 14px traço 3px. Rótulo em peso 700. À direita "Em aberto" Schibsted 700 12,5/17 em `blue` + chevron "›" em `blue`. **Esta linha é clicável** → A3 daquele dia. É a recuperação de quem faltou.
4. **Painel de hoje**: nó de 20px amarelo com anel de tinta de 3px; bloco `surfaceWarm` raio 22 padding 16 gap 12, recuo de 4 no topo e 10 embaixo. Dentro, em ordem:
   - cap "HOJE · A IGREJA ESTÁ AQUI" Schibsted 700 11/14 tracking +1,2 em `blue`
   - "Dia 17" Schibsted 800 58/54 tracking −2,6 + "de 100" Schibsted 600 15/20 em `textMuted`, alinhados pela base
   - pílula do monte: `minHeight 30`, raio 999, fundo `markSurface`, padding lateral 14, rótulo "GOVERNO" Schibsted 700 11/14 tracking +1,4 caixa alta em `onMark`
   - ênfase Schibsted 700 23/28 tracking −0,5, com **a palavra do campo `theme_highlight`** em fundo `accent` padding 0 4 raio 4. Se o campo não existir, mostra a ênfase inteira sem realce — **o app nunca escolhe a palavra**
   - "Josué 6–17" Schibsted 700 21/25 + "12 capítulos · ~36 min" Schibsted 500 13/18 em `textMuted`. O "~" é estimativa do app (3 min por capítulo) — sempre com o til
   - botão primário "Ler agora" → B1
   - sublinhado "Vou ler na minha Bíblia" → marca o modo e fecha; **não conclui o dia**
5. **Linhas de dia futuro** (`minHeight 48`): linha pontilhada, nó = ponto de 7px em `borderStrong`, rótulo em `textMuted`, "Em breve". Toque → **folha A4**. Nenhum conteúdo do dia aparece.
6. **Barra flutuante**, Jornada ativa.

**Estados:** carregando (F3) · retomada (A2) · sem internet (F4) · antes da campanha (A5) · encerrada (E5).
**Rolagem:** abertura a frio sempre volta para hoje.

### A2 · Jornada de quem faltou três dias
Igual a A1, com um bloco de acolhida depois do cabeçalho: `blueSoft` raio 18 padding 16, "Que bom ter você de volta." Schibsted 700 19/24 + "Três dias ficaram para trás e continuam abertos. Você pode retomar por onde quiser." Source Serif 15/24 em `onBlueSoft`. Abaixo, as três linhas em aberto clicáveis, e então o painel de hoje.
**Gatilho:** três ou mais dias em aberto consecutivos antes de hoje. **Nada de vermelho, nada de contagem de falta.**

### A3 · O dia completo
Fundo `surfaceWarm`. Alcançada tocando qualquer dia liberado da jornada.
Ordem: barra "‹ Jornada" + data "17/10/2026" à direita · "Dia 17" 50/48 −2,2 + "de 100" · pílula do monte · ênfase 25/30 com realce · bloco branco raio 22 com "Josué 6–17" 20/25 + "12 capítulos · ~36 min" e botão "Ler" 48 de piso à direita · cap "VERSÍCULO-BASE" + referência Source Serif 19/28 (**só a referência**) · cap "MOTIVOS DE ORAÇÃO" + lista com marcador amarelo de 6px (aqui entram os `prayer_points` do dataset) · filete · três linhas de 48: "Altar das 12h30 / Hoje conduz: {ministério}", "Intercessão do dia / Cinco passos · modo altar" → E1, "Minha reflexão / Só você vê" → B5 · caixa de jejum de 28×28 raio 8 borda 2px "Cumpri meu jejum hoje / Só você vê".
**Sem barra de navegação** — é tela contextual.

### A4 · Dia que ainda não abriu
Folha modal sobre a jornada dessaturada, com scrim `rgba(17,17,17,0.5)`.
Alça · círculo de 56 em `surfaceMuted` com cadeado (retângulo de 22×14 raio 4 em `text` + arco de 16×14 raio 8 8 0 0 traço 2,5px) · "Abre em 18/10/2026." Schibsted 700 24/28 · "A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado." Source Serif 17/27 · botão primário "Voltar para a Jornada".
**Mesma folha para as quatro rotas** do dia (dia, leitor, intercessão, reflexão). Variante da intercessão: "A intercessão de cada dia abre no dia oficial da igreja."

### A5 · Antes da campanha
"Faltam **2 dias**" Schibsted 800 52/52 −2,4, com "2 dias" em realce `accent` · "A igreja começa em 23/09/2026. Cem dias de jejum, oração e Palavra, todos juntos." Source Serif 20/32 · régua **inativa** (nenhum traço amarelo) · "Dia 1 · 23/09/2026" e "Dia 100 · 31/12/2026" nas pontas · botão primário "Ajustar meu lembrete" · botão contornado "Criar meu perfil" → D2.
**Nenhum conteúdo do dia 1 é revelado.**

---

## B · Ler

### B1 · Leitor
Fundo `background`. Um capítulo por página.
- **Barra de topo de vidro** (`blur(18px)`, filete): "✕" em alvo de 48×48 → volta · centro "Josué 9" Schibsted 700 16/20 + "Dia 17 · capítulo 4 de 12" 12/16 em `textMuted` · "Aa" em alvo de 48×48 com borda 1,5px `controlBorder` → folha B3. Abaixo, filete de progresso de 3px: trilha `surfaceSunken`, preenchimento `accent` na fração de capítulos lidos.
- **Corpo** (calha 26): cap "JOSUÉ" · numeral "9" Source Serif 600 44/48 · **caixa de aviso** borda 1,5px `border` raio 16 fundo `surfaceWarm`: "TEXTO AINDA NÃO LIBERADO" Schibsted 700 11/14 em `warning` + "Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida. Abra na sua Bíblia em Josué 9 e volte para marcar." · estrutura de versículos: numeral Source Serif 12 em `textMuted` + barras listradas onde o texto entrará.
- **Rodapé fixo** (filete no topo, `paddingBottom 40`): quadrado de 56 com borda 2px e "‹" (desabilitado no primeiro capítulo, `opacity 0.35` — **declare o contraste resultante**) + botão primário que ocupa o resto: "Próximo capítulo", ou "Concluir leitura" no último, ou "Voltar" se o dia já está concluído. Abaixo, sublinhado "Prefiro ler na minha Bíblia".
- A altura do rodapé é **medida** e devolvida à rolagem, para o fim do capítulo continuar alcançável em fonte grande.

**Estados:** dia trancado (A4) · vazio ("Leitura não encontrada / Este dia não tem leituras definidas.") · carregando · erro (F5) · último capítulo · dia já concluído.
Ao concluir → **B4**.

### B2 · Rodapé empilhado, fonte grande
O mesmo leitor acima de ~2,9× de escala de fonte. O rodapé **empilha**: "Concluir leitura" em cima, "Capítulo anterior" embaixo, os dois com `minHeight 64` e rótulo de 24/30. A seta virou rótulo de texto, porque quadrado de 56 com seta não cabe ao lado de uma palavra de 24px.
**É a resposta à decisão A1 do pacote** — a caixa mais apertada do app. Limiar: empilha quando a largura disponível não couber o rótulo em uma linha, medido, não por constante.

### B3 · Tamanho do texto
Folha modal sobre o leitor. Alça · "Tamanho do texto" Schibsted 700 24/28 · amostra real em bloco `surfaceWarm` raio 16 com o tamanho corrente · dois botões contornados de 56, "Diminuir" e "Aumentar" · régua: "14" — trilha de 8px com preenchimento `accent` — "30" — valor corrente "19 pt" em Schibsted 700 14 · "O texto também cresce com o tamanho de letra do seu celular, até o máximo que o sistema permite."
**Faixa 14 a 30, passo ±2, padrão 19, entrelinha sempre 1,7 ×.** A frase acima só pode existir se o texto **realmente** crescer sem teto — se houver teto, a frase muda.

### B4 · Depois de concluir
**A ponte para a comunidade, e o centro do desenho.** Aparece ao concluir a leitura.
- Bloco `surfaceWarm` raio 22: círculo de 48 em `markSurface` com ponto de 16px em `onMark` · "Dia 17 concluído" Schibsted 700 19/24 · "Josué 6–17 · lido aqui no app" 13/18.
- Bloco `blueSoft` raio 22 padding 20: "Quer dizer alguma coisa?" Schibsted 700 26/31 · "Você não é obrigado. Mas tem gente lendo o mesmo capítulo hoje." Source Serif 17/27 · botão `blue` "Escrever para a igreja" → C3 (ou C4 na primeira vez) · botão contornado "Guardar só para mim" → B5 · filete · "O que você escreve **para a igreja** qualquer pessoa com o app pode ler, inclusive quem você não conhece. O que você guarda **só para você** fica neste aparelho e nunca vira publicação."
- Sublinhado "Agora não" → A1.

**Duas portas do mesmo tamanho, com a diferença dita em palavra.** É aqui que o consentimento vira escolha em vez de aviso jurídico. O convite para publicar **não existe antes de concluir** — não é regra de acesso, é ordem de tela.

### B5 · Reflexão privada
Barra: "Cancelar" · "Dia 17" · "Excluir" em `danger` (desabilitado se vazio) · cadeado + cap "MINHA REFLEXÃO · SÓ VOCÊ VÊ" · "O que ficou com você hoje?" Schibsted 700 27/32 · campo `minHeight 220` raio 18 fundo `surfaceWarm`, placeholder "Escreva à vontade." Source Serif 19/32 em `textMuted` · caixa `blueSoft`: "Isto fica neste aparelho. Se depois você quiser dizer algo para a igreja, escreve de novo — do zero, de propósito." · rodapé fixo: cap "JOSUÉ 6–17 · SALVA NESTE APARELHO" + botão primário "Salvar para mim".
**Nunca pré-preenche publicação.** Excluir pede confirmação: "Esta reflexão será apagada deste aparelho."
**Precisa da versão com teclado aberto** — a partir de ~1,65× o rodapé e a barra excediam a coluna no app antigo e o campo ia a zero.

---

## C · A comunidade

### C1 · Feed
- **Cabeçalho** (filete embaixo): "Comunidade" Schibsted 700 30/34 −0,9 · pílula `blue` "Escrever" `minHeight 48` raio 999 → C3/C4. Abaixo, linha de 48: "Dia 17 · a igreja está lendo Josué 6–17" Schibsted 600 13/18 em `blue` → A1. **O feed nunca esquece de onde veio.**
- **Post:** avatar de 42 raio 21 · nome Schibsted 600 15/19 · "Dia 17 · há 2 h" 12/16 em `textMuted` · "···" em alvo de 48×48 → C5 · foto em **sangria total**, proporção 1:1, filete acima e abaixo · **fileira de ações**: dois alvos de 48×48 com `gap 4`, recuo lateral 14 — Amém (PNG 27px) e comentar (26px) · legenda: nome em Schibsted 600 15 seguido do texto em Source Serif 17/27 · "Ver comentários" em alvo de 48 → C6.
- **Sem rótulo nos ícones e sem número em nenhum lugar.** O Amém marca e desmarca alternando contorno e cheio. "Amém" é o nome acessível.
- **Barra flutuante**, Comunidade ativa.

**Estados:** vazio (C2) · carregando (esqueleto na forma do post) · erro (F5) · sem internet (o feed fica indisponível, a jornada não) · post bloqueado (desaparece).

### C2 · Feed vazio, primeiro dia
Centralizado: pomba 84×54 · "Hoje começa." Schibsted 700 26/31 · "Ninguém escreveu nada ainda — o primeiro dia é assim. Quando você terminar a leitura de hoje, o app pergunta se você quer dizer alguma coisa. Pode ser a sua a primeira." · botão primário "Ler o dia 1" → A1.
**Sem cara de erro, sem ilustração de caixa vazia.**

### C3 · Publicar
"Cancelar" · pílula `blue` "Publicar" (desabilitada até haver texto ou foto) · **aviso permanente** `blueSoft` raio 16 com o ícone de comunidade: "Vai aparecer para **toda a igreja**, com o seu nome e a sua foto." · área de foto 4:3 raio 18 tracejada 2px: "Escolher uma foto" Schibsted 700 16/21 + "Opcional" · campo `minHeight 140` raio 18 fundo `surfaceWarm`, placeholder "O que Deus falou com você hoje?" Source Serif 19/32 em `textMuted` · linha de 48 "Marcar o dia 17 / Aparece junto com a leitura de hoje" com interruptor de 52×32 (botão de 26 raio 13 em `onMark` sobre `markSurface`), ligado por padrão · teclado do sistema.
**Limite de 5.000 caracteres.** Sem localização, sem marcar pessoas.

### C4 · Consentimento, primeira publicação
**Superfície fixa em tinta** — não muda com o tema. Uma vez na vida, e depois nunca mais.
"‹ Voltar" · "Antes da sua primeira publicação" Schibsted 800 36/40 −1,4 em `#FFFFFF` · "O que você escrever aqui é sobre a sua fé. Isso é dado sensível pela lei brasileira, e por isso a gente pergunta uma vez, com todas as letras." Source Serif 18/29 · três itens com marcador amarelo de 10px, Schibsted 600 16/24:
1. "Qualquer pessoa que baixar o app vê a sua publicação — inclusive quem você não conhece."
2. "Sua leitura, seu jejum e a sua reflexão privada continuam só suas. Nada disso vai junto."
3. "Você pode apagar o que publicou, e pode apagar a sua conta inteira, quando quiser."

Botão `yellow` "Entendi, quero publicar" · sublinhado branco "Guardar só para mim" → B5.
**Registre a versão do texto de consentimento aceito, com data.**

### C5 · Denunciar e bloquear
Folha modal. Três linhas de `minHeight 60`, cada uma com círculo de 48 em `surfaceMuted`:
1. **"Denunciar esta publicação"** / "Alguém da igreja vai olhar em até 24 h" — ícone de bandeira (haste de 3×20 + retângulo de 12×9)
2. **"Bloquear Cláudia R."** / "Você não vê mais nada dela, e ela não vê você" — círculo de 20 traço 2,5 cortado por barra a 45°
3. **"Não quero ver este assunto"** / "Sem denunciar ninguém" — traço de 18×3

Botão contornado "Fechar".
**A mesma folha vale no comentário.** Os dois primeiros itens são exigência de loja; o terceiro é o que evita denúncia por desconforto.

### C6 · Comentários
"‹" em alvo de 48×48 · "Comentários" Schibsted 700 20/25 · lista: avatar de 40 · nome + "há 1 h" · texto Source Serif 16/26 · fileira com Amém (22px em alvo de 48) e "···" (alvo de 48) → C5 · rodapé fixo: campo pílula `minHeight 48` "Escrever um comentário" + botão circular de 48 em `blue` com seta diagonal.
**Sem contagem de comentários em lugar nenhum** — "Ver comentários", não "Ver 3 comentários".

---

## D · Você, o perfil e o grupo

### D1 · Você
Identidade: avatar de 56 · nome Schibsted 700 22/27 · ministério 13/18 · bloco `surfaceWarm` "MEU PROGRESSO" com "14" Schibsted 800 44/44 + "de 100 dias lidos" e a régua dos cem dias · grupos de linhas de `minHeight 48` com filete entre elas, cada grupo com um cap:
- **MINHA JORNADA** — "Minhas reflexões" → contagem real · "Meu jejum" → "11 dias" ou "Desligado" · "Meu grupo" → "7 pessoas" → D4
- **PREFERÊNCIAS** — "Lembrete de leitura" → "07:00" ou "Sem lembrete" · "Meu ministério" → nome ou "Escolher" · "Tamanho da letra" · "Conta e privacidade"
- "Sobre o propósito" → D5

**"Conta e privacidade" precisa conter exclusão de conta e exportação em JSON** — exigência das duas lojas.
Todo número desta tela é **real e local**. Sem conta, o avatar é neutro e o nome é "Sua jornada".

### D2 · Criar perfil, os cinco passos
"Vamos criar o seu perfil" Schibsted 800 38/40 −1,6 · "São cinco passos curtos. Você pode parar no meio e voltar depois." · cinco caixas de `minHeight 60` em `surfaceWarm` raio 18, cada uma com círculo de 36 em `markSurface` com o numeral em `onMark`, título Schibsted 700 17/22 e legenda 13/18:
1. **Sua foto** — "Tire agora ou escolha do celular"
2. **Seu nome** — "Como a igreja vai te chamar"
3. **Seu ministério** — "Para o app avisar quando é o seu altar"
4. **Seu lembrete** — "A que hora você quer ser chamado para ler"
5. **Seu grupo** — "Até doze amigos fazendo junto"

Botão primário "Começar pelo passo 1" · sublinhado "Depois — dá para ler sem perfil".
**Cinco caixas grandes, uma por vez, e não um formulário de cinco campos** — um formulário assusta quem não usa celular direito.

### D3 · Passo 1, sua foto — o padrão dos cinco
"‹ Voltar" + "Passo 1 de 5" Schibsted 700 13/18 · cinco segmentos de 5px raio 3, preenchidos em `text` e vazios em `borderStrong` · "Sua foto" Schibsted 800 38/40 · "É o que a igreja vê quando você escreve alguma coisa. Uma foto simples do rosto basta." · círculo de 168 tracejado 2px · botão primário "Tirar uma foto agora" · contornado "Escolher do celular" · sublinhado "Pular — ficar sem foto" · caixa `blueSoft`: "A foto só aparece no que você publicar. Sua leitura, seu jejum e o que você guarda só para você não têm foto e não têm nome."
**Cada um dos cinco passos segue este padrão e cada um tem "Pular".** Nenhum é obrigatório.
O passo 4 (lembrete) é o único ponto onde a **permissão de notificação** é pedida, e só ao escolher um horário. Recusa → volta para "Sem lembrete" e mostra o motivo, e o botão passa a "Continuar sem lembrete".

### D4 · Meu grupo
Fundo `surfaceWarm`. "Os Guerreiros" Schibsted 800 32/36 · "7 de 12 pessoas" · bloco branco "HOJE NO GRUPO" com "4" Schibsted 800 40/40 + "de 7 já leram o dia 17" e barra de 10px com preenchimento `accent` · cap "QUEM ESTÁ AQUI" + linhas de `minHeight 56` com avatar de 40, nome e nó de estado (cheio = leu hoje, anel cinza = não leu) · botão contornado "Convidar alguém" · "No grupo o Amém tem nome — vocês se conhecem. No feed geral ele continua sem nome e sem número."
**Máximo 12 pessoas. Sem nome de administrador, sem convite por link público.** Números reais, nunca estimados.

### D5 · Sobre o propósito
Reproduz a orientação da igreja **palavra por palavra**. "Sobre o propósito" Schibsted 800 32/36 · subtítulo "Palavra · Consagração · Adoração · Intercessão" Source Serif 21/32 · filete · parágrafos · **citação** com barra de 4px em `accent` à esquerda, texto Source Serif itálico 17/27 e atribuição "Levítico 6:13 · tradução a informar" · cap "OS CINCO PASSOS DO ALTAR" + passos com círculo de 32 em `markSurface`.
**Nenhum texto desta tela é escrito pelo app** — a página só decide a forma.

---

## E · Intercessão, altar e marcos

### E1 · Intercessão do dia
Fundo `surfaceWarm`. "‹ Dia 17" · cap "INTERCESSÃO DO DIA · 17/10/2026" · pílula do monte · ênfase Schibsted 700 27/32 · "Altar das 12h30 · hoje conduz: Intercessão" · **cinco blocos de passo** em `surface` raio 20: círculo de 34 em `markSurface` com o numeral + título e descrição **do dataset**. No passo 3 entram cap "VERSÍCULO-BASE" + referência e o link "Abrir no leitor"; no passo 4, o monte, a ênfase e os motivos de oração · botão primário "Modo altar" → E2.
Rota com retorno para a Jornada quando aberta sem pilha atrás (lembrete, deep link).

### E2 · Modo altar
**Superfície fixa em tinta.** Para quem conduz com o telefone apoiado.
"Passo 3 de 5" Schibsted 700 15/20 em `accent` · "Sair" em alvo de 48 · cinco segmentos de 6px (`accent` / `borderStrong`) · título Schibsted 700 36/42 em `#FFFFFF` · texto do passo 19/28 · versículo-base Source Serif 24/34 · rodapé: quadrado de 64 com borda 2px branca "‹" + botão `yellow` de 64 "Passo 4".
**Tela mantida acesa** (`activateKeepAwake`) · **gesto de voltar do iOS desativado** · voltar do Android **sai do modo**, não da tela · cada passo anunciado uma única vez para leitor de tela (o app antigo anunciava três vezes).

### E3 · Marco — 7, 25, 50, 75
**Superfície fixa em amarelo.** Modal de tela cheia, **aparece uma vez por marco**.
cap "MARCO · 25 DE 100 DIAS LIDOS" + pomba · numeral "25" Schibsted 800 180/160 −10 em `onAccent` · rótulo "Um quarto da jornada" Schibsted 700 34/38 · frase "Vinte e cinco dias de Palavra. Você não desistiu." Source Serif 19/30 em `textSecondary` · régua com os traços **dos dias realmente lidos**, em `text` sobre trilha de `rgba(17,17,17,0.22)` · botão primário "Continuar a jornada" · sublinhado "Guardar este marco".
**Marco é contagem pessoal, nunca dia de calendário: sem data, sem monte, sem ênfase.** Rótulos: "Primeira semana", "Um quarto da jornada", "Metade do caminho", "Reta final". Sem confete, sem pontos, sem XP.
O numeral cede tamanho para caber na largura e com fonte grande.

### E4 · Chegada do dia 100
**Superfície fixa em tinta.** A exceção: **aqui a data vale**, porque só se completa cem leituras tendo lido o dia 100.
cap "CHEGADA · DIA 100 · 31/12/2026" · "100" Schibsted 800 150/136 −8 em `accent` · "Cem dias. Você atravessou a jornada inteira." Schibsted 700 30/35 em `#FFFFFF` · "Apocalipse 21:5" Source Serif itálico 18/28 em `textSecondary` · **três números reais e locais**, empilhados, com filete entre eles: dias lidos · reflexões escritas · dias de jejum, numeral Schibsted 800 34/36 e rótulo 15/20 · botão `yellow` "Guardar minha jornada" · sublinhado "Ver minhas reflexões".
**Empilhados, não em três colunas** — é a decisão A3 do pacote. Se o jejum sair da campanha, sobram dois e a tela não muda de forma.

### E5 · Campanha encerrada
cap "JORNADA ENCERRADA · 100 DIAS" · "83" Schibsted 800 54/52 + "dias lidos de 100" · régua com 83% preenchido · "Oitenta e três dias na Palavra com a sua igreja. Os dias que ficaram abertos continuam abertos — pode ler quando quiser." · botão primário "Ver a jornada inteira" · contornado "Minhas 42 reflexões" · "A comunidade continua aberta. Quando a igreja marcar a próxima jornada, ela aparece aqui."
**Nada fica quebrado depois do dia 100.** Nenhum número inventado: 83 e 42 vêm do aparelho.

---

## F · Entrada e estados

### F1 · Boas-vindas
**Superfície fixa em amarelo.** pomba 112×72 · "100 dias<br>sem desistir" Schibsted 800 50/50 −2,4 em `onAccent` · "A igreja inteira lê a mesma coisa, no mesmo dia. Você não é obrigado a nada — pode só ler, pode só orar, pode voltar depois de faltar." Source Serif 20/32 em `textSecondary` · botão primário "Começar" · sublinhado "Já tenho perfil".
**Sem muro de login.** "Começar" vai direto para F2; conta só aparece quando a pessoa quiser publicar.

### F2 · Como você vai ler
"‹ Voltar" + "Passo 1 de 3" · três segmentos · "Como você pretende ler na maioria dos dias?" Schibsted 800 34/38 · três opções de `minHeight 76` raio 16: selecionada tem **borda de 2,5px em `text`** e círculo de 28 cheio em `markSurface` com ponto de 11px em `onMark`; não selecionada tem borda de 1,5px em `controlBorder` e círculo vazado de traço 2px. Rótulos: "Ler aqui no app", "Usar a minha Bíblia", "Vou alternar" · "Ler na Bíblia impressa não é pior. Dá para mudar depois quando quiser." · botão primário "Continuar", **desabilitado até escolher**.
**O estado aparece por forma e por cor** — borda mais grossa mais círculo preenchido, não só tom.
Os outros dois passos seguem o mesmo molde: consagração/jejum (sem perguntar do que a pessoa jejua) e lembrete.

### F3 · Carregando
**Esqueleto na forma do conteúdo**, não roda girando: a linha de dia, o nó, o bloco de hoje com os retângulos do numeral, da pílula, da ênfase e do botão, em `surfaceSunken` sobre `surfaceWarm`. "Carregando…" Schibsted 500 13/18 centralizado embaixo.
**Sem animação de brilho** — movimento tem que ser dispensável, e aqui ele não acrescenta nada.

### F4 · Sem internet
Cabeçalho normal, e abaixo a **faixa de alerta**: `minHeight 48` raio 14, fundo `alertSurface`, ponto de 8px em `accent`, texto Schibsted 600 13,5/19 em `onAlert`: "Sem internet. Sua leitura, seu progresso e as suas reflexões continuam salvos."
O painel de hoje continua **inteiro e funcional**. Embaixo: "A comunidade volta quando a internet voltar. O que você publicar agora fica na fila e sai sozinho depois."
**A faixa diz o que CONTINUA funcionando, nunca o que quebrou.** Leitura e progresso funcionam 100% offline por decisão de arquitetura — tratar ausência de rede como erro é mentir sobre o produto. `accessibilityRole="alert"`.

### F5 · Erro
Centralizado: círculo de 56 em `surfaceMuted` com "!" · "Não deu para carregar" Schibsted 700 26/31 · "A leitura de hoje não veio. Sua jornada e as suas reflexões estão salvas — nada foi perdido." Source Serif 17/27 · botão primário "Tentar de novo" · sublinhado "Ler na minha Bíblia".
**Uma saída sempre, e nenhum código técnico na tela** — nada de `pending_authorization` nem nome de enum na cópia.

### F6 · Lista vazia
"Minhas reflexões" Schibsted 800 32/36 · centralizado: círculo de 56 com cadeado · "Nada escrito ainda" Schibsted 700 24/29 · "Suas reflexões aparecem aqui depois que você escrever a primeira. Só você vê." · botão contornado "Escrever a de hoje".
**Molde de todo estado vazio:** ícone, título curto, uma frase que explica sem culpar, e uma ação.

---

## Mapa de navegação

```
F1 boas-vindas → F2 (3 passos) → A1
A1 jornada ─ hoje ─────────→ B1 leitor ──→ B4 depois de concluir ──→ C3/C4 publicar
          ├─ dia liberado ──→ A3 o dia ───→ E1 intercessão ──→ E2 modo altar
          │                            └──→ B5 reflexão privada
          ├─ dia em aberto ─→ A3 daquele dia
          ├─ dia futuro ────→ A4 folha de cadeado
          └─ conta ─────────→ D1 você
barra: A1 jornada · C1 comunidade · D1 você
C1 feed ─ "···" ──→ C5 denunciar e bloquear
        ├ "Ver comentários" → C6
        └ "Escrever" ──────→ C4 (primeira vez) → C3
D1 você → D2 criar perfil → D3 passo 1 … passo 5
        ├→ D4 meu grupo
        └→ D5 sobre o propósito
marcos: 7, 25, 50, 75 → E3 (uma vez cada) · 100 → E4
fases: antes 23/09/2026 → A5 · depois do dia 100 → E5
```
