# Auditoria interna — 23/09/2026

Código auditado: worktree da branch `comunidade-v2` (V1 completa + aba "Juntos").
A V1 que vai para as lojas é a branch `main`, sem o Juntos.

Cada achado abaixo passou por uma segunda rodada, em que outra pessoa tentou derrubá-lo lendo o
código. Os que sobraram estão aqui. Nada foi escrito por suposição.

---

## 1. Veredito

A V1 pode ir para as lojas do lado do código: nesta auditoria não encontrei nenhum defeito de
código que, por si, reprove a V1 sem o Juntos. O que impede o envio hoje não é código, é decisão
e papel: falta a autorização escrita da igreja para publicar o guia (enquanto ela não vier, o
build de release falha de propósito), faltam as contas de desenvolvedor, falta o e-mail de
suporte e a política de privacidade publicada, e a ficha da loja ainda tem nove campos marcados
como `[PREENCHER]`. A aba "Juntos" é caso separado e não pode ser enviada de jeito nenhum agora:
não existe servidor, e três problemas sérios estão em pé — nome e bio entram no ar sem filtro,
quem entra do jeito normal não tem caminho para sair da comunidade nem excluir a conta, e abrir a
aba já manda o nome da pessoa ao servidor antes de qualquer aviso. Os outros doze achados são
ajustes: nenhum trava o app, nenhum perde dado da igreja, nenhum mexe no texto do guia ou da
Bíblia.

---

## 2. Bloqueia a loja

Nenhum achado de código desta auditoria bloqueia o envio da V1 por si só.

Os três portões que hoje impedem o envio não são defeito, são pendência de decisão — estão na
seção 5 ("Depende do Davi"). Vale registrar que dois deles o próprio app já defende sozinho:

- O portão de direitos derruba o build de release enquanto `rights_status` estiver em
  `pending_authorization`.
- `mobile/app.config.ts` derruba o build de produção se alguém tentar levar o Juntos para a loja
  sem exclusão de conta pronta e sem a lista de dados coletados preenchida.

Os três achados "alto" abaixo bloqueiam o envio do **Juntos**, não o da V1.

---

## 3. Alto

### 3.1 Nome e bio da pessoa aparecem sem passar por filtro nenhum

Arquivo: `mobile/supabase/migrations/20260922120000_comunidade_perfil_v2.sql:276`
(e o mesmo problema em `join_community`, linha 236, e em
`20260923070000_comunidade_aceite_no_ato.sql:60`)

O que quebra: todo post e todo comentário passam por um filtro antes de publicar (link, telefone,
e-mail, lista de palavras). O nome de exibição e a bio não passam por nada — só conferem tamanho e
vão direto para o ar. A pessoa pode pôr uma ofensa ou o telefone dela como nome e isso aparece em
cima de cada post e cada comentário dela, para a igreja inteira, na hora. A foto de perfil já
espera aprovação; o texto não. É exatamente o item da regra 1.2 da Apple sobre filtrar conteúdo
antes de publicar.

Correção: rodar o mesmo filtro (`private.community_text_verdict`) sobre o nome e a bio nos três
caminhos. Quando o filtro apontar algo, manter o valor anterior e mandar o novo para a fila
humana, como a foto já faz. Nunca gravar direto no perfil visível.

### 3.2 Quem entra no Juntos do jeito normal não tem como sair nem excluir a conta

Arquivo: `mobile/src/ui/voce/ProfileExtras.tsx:18` (falta a entrada) e
`mobile/src/app/conta.tsx:161` (único link existente)

O que quebra: a tela "Conta e privacidade" existe e funciona — é lá que se sai da comunidade, se
revoga o consentimento, se desbloqueia gente e se exclui a conta. Mas o único caminho até ela está
dentro de um trecho que só aparece para quem entrou com e-mail. A entrada no Juntos é automática e
sem e-mail, então esse trecho nunca é desenhado. Resultado: zero toques no app chegam à tela. E a
própria escrita do app manda a pessoa para lá ("em 'Conta e privacidade'", "toque em 'Deixar de
participar da comunidade'"). Apple 5.1.1(v) e a política de exclusão de dados do Google Play
exigem esse caminho dentro do app. A LGPD exige poder revogar o consentimento.

Correção: pôr uma linha "Conta e privacidade" na aba Você (e/ou no topo do feed) que abra a tela
direto, sem depender de e-mail. A tela já aceita a conta do aparelho — não precisa de mudança
nela.

### 3.3 Abrir a aba Juntos já manda o nome da pessoa ao servidor, antes de qualquer aviso

Arquivo: `mobile/src/community/useCommunitySession.ts:111`

O que quebra: a pessoa escreveu o nome dela na entrada do app — e a tela diz, com essas palavras,
"Fica só neste aparelho" (`mobile/src/app/onboarding/nome.tsx:54`). Quando ela toca na aba Juntos
só para ler, o app cria o perfil dela no servidor da igreja com esse nome, sem nenhum toque e sem
nenhuma tela antes. O aceite só é registrado depois, no primeiro Amém. Ou seja: o nome dela e o
fato de ela pertencer à comunidade de uma igreja ficam guardados no servidor antes de ela ler uma
linha. Nome mais vínculo religioso é dado sensível pela LGPD, e o documento
`docs/product/comunidade/02-lei.md` já registra que aqui não cabe legítimo interesse.

Correção: não criar perfil por abrir a aba. Deixar ler sem criar nada e criar o perfil no mesmo
toque que registra o aceite — o servidor já sabe fazer isso
(`apply_inline_accept` já entra na comunidade quando não existe perfil). Se o registro tiver de
existir para ler, entrar sem nome e mostrar antes o que será guardado.

---

## 4. Médio e baixo

### Médio

| O que é | Arquivo | O que acontece |
|---|---|---|
| O portão do build não confere a configuração do servidor | `mobile/app.config.ts:156` | Dá para publicar com a aba "Juntos" visível na barra mas morta para sempre ("O Juntos não está ligado nesta versão"), porque o portão não checa o endereço e a chave do Supabase, e o `eas.json` não os define. Correção: acrescentar os dois ao portão e fixá-los no perfil de produção. |
| No Android, denunciar e bloquear não anunciam nada | `mobile/src/ui/comunidade/sheets/ReportSheet.tsx:122` | Com leitor de tela no Android, a pessoa toca em "Enviar denúncia" e nada é falado — nem o recibo, nem o protocolo, nem que a publicação saiu do ar. O mesmo vale para bloquear, apagar, comentar e publicar. A maioria do público está no Android. Correção: marcar o aviso como região viva (`accessibilityLiveRegion="polite"`), como outras telas já fazem. |
| Erro e tela vazia não são anunciados | `mobile/src/ui/components.tsx:1027` | O molde único de erro e vazio não avisa o leitor de tela. Com servidor fora do ar, o app fala "Carregando" e depois silencia para sempre: a pessoa nunca fica sabendo que existe um "Tentar de novo" na tela. Correção: anunciar o título no caso de erro. |
| Aspas desequilibradas no Dia 100 | `mobile/src/bible/quote.ts:24` | A moldura de aspas olha só a primeira e a última letra. No Dia 100 (31/12, marco "Jornada completa") o versículo sai com três aspas de abertura e duas de fechamento. Também afeta 231 de 31.102 versículos no "Copiar". O texto da tradução em si não é alterado — a aspa é decoração ao lado. Correção: contar as aspas; emoldurar só quando o trecho não tiver aspas próprias. |
| A reflexão escrita é jogada fora sem perguntar | `mobile/src/app/reflexao/[day].tsx:211` | A pessoa escreve três parágrafos, arrasta a tela para baixo ou toca em "Cancelar" por engano, e o texto desaparece sem confirmação. A tela de publicar já pergunta antes de descartar. Correção: mesma pergunta aqui, e desligar o arrastar. |
| Não dá para retirar o Amém depois que a igreja atualiza as regras | `mobile/src/ui/comunidade/feed/FeedScreen.tsx:433` | Se a igreja publica uma versão nova das regras, quem já disse Amém vê o Amém marcado, toca para retirar e recebe "O texto foi atualizado. Atualize o app" — o nome dela fica no post de outra pessoa sem via de saída pelo app. O servidor e os comentários já deixam retirar livremente; só o feed exige o aceite para desmarcar. Correção: uma linha — desmarcar não passa pelo aceite. |

### Baixo

| O que é | Arquivo | O que acontece |
|---|---|---|
| A Ajuda promete que o dia futuro abre na data; ele abre na hora | `mobile/src/config/features.ts:36` e `mobile/src/app/ajuda.tsx:54` | A chave que abre todos os 100 dias de uma vez está ligada, mas a Ajuda diz "os que ainda não chegaram abrem na data". O usuário derruba a frase com um toque. A ficha da loja tem a mesma frase e já está na lista de coisas a corrigir antes do envio. |
| Legenda da caixa de 16 anos e de novidades não é falada | `mobile/src/ui/comunidade/perfil/PerfilCampos.tsx:49` | Quem enxerga lê "Não pedimos documento nem data de nascimento"; quem usa leitor de tela nunca ouve isso. O mesmo com "Dá para desmarcar quando quiser". Correção: pôr a legenda no nome do controle. |
| Foto carregando é um quadrado mudo | `mobile/src/ui/comunidade/feed/PhotoCarousel.tsx:92` | Com rede lenta, entre o texto do post e o Amém há um quadrado do tamanho da tela que o leitor de tela pula em silêncio. Se a assinatura da foto falhar, ele fica vazio para sempre. Correção: escrever "Carregando a foto…" ali, como a tela de publicar já faz. |
| Reflexão e jejum entram no backup do iCloud | `mobile/app.config.ts:257` | No Android o backup está desligado de propósito, com justificativa escrita. No iPhone não há nada equivalente, e a tela Privacidade afirma "ficam guardados só neste aparelho". O dado vai para o iCloud da própria pessoa, nunca para a igreja. Correção: excluir do backup no iOS, ou ajustar a frase. |
| "Davi foi suspensa da comunidade" | `mobile/src/ui/comunidade/moderacao/ModerationQueueScreen.tsx:270` | Erro de concordância em todo nome masculino, na tela de moderação. Correção: "A suspensão de X foi registrada." |
| A Ajuda diz que não existe espaço para escrever para a igreja — e existe | `mobile/src/app/ajuda.tsx:70` | Nesta branch a pessoa conclui o dia, toca em "Escrever para a igreja", publica, depois abre a Ajuda e lê que esse espaço "talvez exista um dia". Na V1 sem Juntos a frase está certa. Correção: condicionar o parágrafo ao Juntos estar ligado. |

---

## 5. Depende do Davi

Isto não é código. Ninguém aqui resolve no lugar dele.

1. **Autorização escrita da igreja** para publicar o guia dos 100 Dias e a escala no app. Enquanto
   ela não vier, o build de release falha de propósito na abertura. É o primeiro portão.
2. **Contas de desenvolvedor** na App Store e no Google Play.
3. **E-mail de suporte** e os outros nove campos marcados `[PREENCHER]` em
   `mobile/store.config.json` (nome da igreja, link do vídeo, contato).
4. **Política de privacidade publicada** num endereço na internet, e o endereço da página de
   exclusão de conta pela web.
5. **Servidor do Juntos** (projeto Supabase no ar, com a função de exclusão de conta). Sem isso o
   Juntos não existe de fato — e até existir, os três achados "alto" continuam em pé.
6. **A ficha da loja e a Ajuda dizem que cada dia abre na data dele.** Hoje os 100 abrem juntos.
   Se a intenção é abrir todos, é só corrigir os textos; se a intenção era o comportamento antigo,
   isso é decisão de produto, não de engenharia.

O que é código e a engenharia resolve sozinha: tudo nas seções 3 e 4.

---

## 6. O que já está certo

Não é cortesia. É o que a auditoria tentou derrubar e não conseguiu:

- **O texto do guia e da Bíblia não é alterado em lugar nenhum.** Nem cortado, nem corrigido, nem
  reescrito. O caso das aspas do Dia 100 é uma aspa desenhada ao lado do texto, em outro elemento —
  o texto da tradução continua intacto, e há teste que garante isso.
- **O portão de direitos funciona.** Com a autorização pendente, o build de release não sai.
- **O portão de loja do Juntos funciona.** Se alguém tentar levar a Comunidade para a loja sem
  exclusão de conta pronta e sem a lista de dados coletados, o build de produção falha — e existe
  teste afirmando, com essas palavras, que "a Comunidade não pode ir para a loja" como está hoje.
- **Sem servidor configurado, o app não cria sessão nem publica nada.** Em build de release, a
  nuvem simplesmente não liga. Não há caminho para vazar dado por engano.
- **Retirar o Amém é livre no servidor.** A regra está escrita na própria função, com comentário
  explicando por quê: "para a pessoa sempre poder retirar". O defeito é só a trava do lado do app.
- **Todo post e todo comentário passam pelo filtro** de link, telefone, e-mail e lista de termos, em
  todos os caminhos. A falha é só no nome e na bio.
- **A foto de perfil já espera aprovação humana** antes de aparecer.
- **O aviso de emergência da denúncia já é falado** pelo leitor de tela ("risco à vida" tem alerta
  próprio). Erros de gravação, faixa de offline e limite de caracteres também. O que falta é o
  aviso de sucesso no Android.
- **A tela de publicar já pergunta antes de descartar** o que a pessoa escreveu. É o padrão certo —
  falta só copiá-lo para a reflexão.
- **O consentimento de novidades vem desmarcado por padrão** e é separado dos outros.
- **Reflexão, jejum, marcações e metas são locais no aparelho**, como prometido. A única ressalva é
  o backup do iCloud no iPhone, e esse dado vai para a própria pessoa, nunca para a igreja.
- **O backup no Android está desligado de propósito**, com a justificativa da LGPD escrita no
  arquivo de configuração e teste que confere.
- **A aba Juntos está desligada por padrão.** A V1 que vai para as lojas não tem nada disso ligado.
