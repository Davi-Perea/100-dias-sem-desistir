# Lançamento expresso no iPhone: o que fazer, em ordem

- **Data:** 2026-09-21 (segunda). **Dia 1 da campanha:** quarta, 23/09/2026. **Meta:** enviar à Apple na terça, 22/09.
- **Autor:** Claude. **Para:** Davi, que executa. Não é parecer jurídico: onde fala de autorização e política de
  privacidade, é rascunho.
- **Decisão já tomada (fundador, 21/09):** iPhone primeiro, pela **conta Apple de pessoa física do Davi**;
  identificador `com.cemdiassemdesistir.app`; V1 **sem Comunidade** (aba escondida); nuvem desligada; o app **não
  envia dado nenhum**. Isso substitui, para o iPhone, o caminho "Organização + D-U-N-S" do `PLANO_DE_LANCAMENTO.md`
  (que continua valendo para a conta definitiva e para a transferência depois).
- **Atualização (fundador, 21/09, `DECISOES_DO_FUNDADOR.md`):** Gate 1 decidido pela **Bíblia Livre dentro do app**
  (aba **Bíblia**, CC BY 4.0, texto empacotado, funciona offline), **se ficar pronta e testada** até o build; senão
  entra na primeira atualização. Comunidade continua fora da V1 (vem como atualização) e, quando vier, **sem mensagem
  privada**. Os textos do §4 têm duas variantes: **[COM ABA BÍBLIA]** e **[SEM ABA BÍBLIA]**. Use a que bater com o
  build enviado.
- **Atualização (pacote da loja, 21/09):** a ficha agora vai **pelo terminal**. Os textos do §4 estão em
  **`mobile/store.config.json`** (formato EAS Metadata, variante **[COM ABA BÍBLIA]**, que é a do build: a aba existe
  e os 66 livros estão empacotados) e sobem com `eas metadata:push`; o binário sobe com `eas submit`. As três páginas
  públicas (política, suporte, exclusão) estão prontas em **`site/`** na raiz do repositório, **não publicadas**. O que
  continua sendo clique manual no App Store Connect está no §3, itens 13 a 15.
- **Etiquetas:** **FATO** (fonte oficial, acessada em 21/09/2026, lista no fim) · **INFERÊNCIA** (conclusão minha)
  · **NÃO CONFIRMADO** (procurei e não achei fonte oficial).
- **Senhas, pagamento, código de duas etapas e aceites de contrato são seus.** Eu não digito nenhum deles.

---

## 1. A verdade: o que dá e o que não dá até quarta

| # | Afirmação | Etiqueta |
|---|---|---|
| 1 | Pessoa física pode se inscrever no Apple Developer Program com Apple ID com verificação em duas etapas, maioridade e **nome legal**. **Seu nome legal aparece na App Store como vendedor** do app. Custa **US$ 99 por ano**, cobrados em moeda local na inscrição. | FATO [A1] |
| 2 | Dá para se inscrever **pelo app Apple Developer no iPhone** (foto de documento com foto, pagamento com a forma de pagamento da sua conta Apple; saldo de cartão-presente não vale). Tem que ser **o mesmo aparelho do começo ao fim**. | FATO [A2][A3] |
| 3 | **O Brasil é suportado pelo app?** A Apple diz só "regiões selecionadas" e não publica a lista; o anúncio mais recente que encontrei (2021) não cita o Brasil. O app existe onde há App Store, "exceto regiões com restrição". | **NÃO CONFIRMADO.** INFERÊNCIA: tente pelo app primeiro; se ele não oferecer a inscrição, faça pela web em developer.apple.com/programs/enroll. |
| 4 | A Apple **não publica prazo** de aprovação da inscrição. | FATO [A1][A3] |
| 5 | Pessoa física sem pendência costuma ser aprovada entre minutos e 2 dias. Se a Apple pedir documento a mais, pode passar de uma semana. | INFERÊNCIA (relatos, não oficial) |
| 6 | Revisão do app: "em média, **90% dos envios são revisados em menos de 24 horas**". | FATO [A4] |
| 7 | **Revisão acelerada existe** para "lançar o app junto com um evento ao qual você está diretamente ligado". O pedido tem de dizer **o evento, a data e a ligação do app com ele**. Só se pede **depois** de enviar para revisão. | FATO [A4], formulário [A5] |
| 8 | Revisão acelerada não é garantida; a Apple decide caso a caso. | INFERÊNCIA |
| 9 | O app pode ser **transferido** depois para a conta da igreja sem perder usuários, notas e atualizações; o identificador (`com.cemdiassemdesistir.app`) não muda. | FATO [A6] (conferir os critérios de transferência antes) |
| 10 | **Android não entra na loja esta semana.** Conta pessoal nova do Google Play precisa de **teste fechado com 12 pessoas por 14 dias seguidos** antes de pedir produção. | FATO, `docs/technical/ANDROID_VERIFICACAO_30_09.md` [F13] |
| 11 | Android, data honesta: se a conta pessoal do Play e o teste fechado com 12 pessoas começarem até sexta (25/09), os 14 dias fecham ~09/10; somando o pedido de acesso à produção e a revisão, **meados de outubro** (~12 a 16/10). | INFERÊNCIA |

### Datas realistas (iPhone)

| Cenário | Premissa | Na App Store |
|---|---|---|
| **Bom** | Inscrição aprovada até terça de manhã; autorização da igreja por escrito até terça; envio terça; revisão em < 24 h (acelerada ou não) | **quarta 23/09 a quinta 24/09** |
| **Realista** | Uma rejeição (ver §5) ou inscrição aprovada só na terça à noite | **sexta 25/09 a segunda 28/09** |
| **Ruim** | Apple pede documento a mais na inscrição, ou a autorização da igreja não sai esta semana | **semana de 29/09** ou depois |

**O que falar para a igreja:** "o app está sendo enviado à Apple; chega nos próximos dias; quem entrar depois começa
do dia de hoje e não perde nada". **Não prometer "quarta"** antes de a Apple aprovar.

---

## 2. O que depende do seu pai / da igreja

**Sem isto, o build de loja nem é gerado** (o `app.config.ts` recusa a variante production com o conteúdo em
`pending_authorization`, `docs/technical/BUILD_E_IDENTIFICADORES.md` §2). É o item que mais pode travar a terça.

Modelo: `docs/legal/AUTORIZACAO_DA_IGREJA_rascunho.md` (Parte B). Ele foi escrito para uma **entidade com CNPJ**
publicando. Para o caminho expresso, acrescentar (rascunho, a igreja e o advogado ajustam):

1. **Quem recebe a autorização:** "**[NOME COMPLETO DO FUNDADOR]**, CPF [CPF], pessoa física, que publica o app
   na App Store em nome próprio, **provisoriamente**" (no lugar da entidade com CNPJ).
2. **Publicação em conta pessoal, com transferência:** "A IGREJA autoriza que o app seja publicado na conta de
   desenvolvedor pessoal de [NOME], onde o nome dele aparece como vendedor, **até a transferência** do app para a
   conta de **[ENTIDADE]**, que [NOME] se compromete a fazer quando a IGREJA pedir e a conta dela existir."
3. **Marca e pomba:** "A IGREJA autoriza o uso do nome **[NOME DA IGREJA / DA CAMPANHA]** e do símbolo da pomba no
   ícone, nas imagens e na página do app nas lojas." (O modelo atual diz, em B.3 item 4, que **não cobre marca**:
   por isso precisa desta linha.)
4. **O resto do modelo continua:** os três arquivos com SHA-256 (B.1), exibir sem alterar o texto (B.2), sem cobrança
   nem anúncio (B.3), revogação (B.6). **Nomes de líderes ficam de fora** (Parte C): o app sai sem eles.

**Forma mínima aceitável para terça:** uma mensagem escrita (e-mail ou WhatsApp) de quem responde pela igreja, com
nome, cargo e data, dizendo os itens 1 a 3 e "autorizo o guia e a escala dos 100 Dias no app". Guarde fora do
repositório. Versão assinada formal pode vir depois. **Você me passa a data e o canal; eu registro e rodo o
conversor** (`rights_reference` é um código neutro, tipo `autorizacao-2026-09-22`, sem nome de pessoa: é o que o
`rights.json` exige hoje; o exemplo com nome no item A.2 do modelo está desatualizado).

**Por que isso importa para a Apple:** a diretriz 5.2.1 pede que o app seja enviado por quem é dono do conteúdo ou
tem licença dele. Se o revisor perguntar, você responde anexando essa autorização (FATO, diretrizes [A7]).

---

## 3. Checklist, na ordem (terminal: PowerShell, dentro de `mobile/`)

Tempo total de mão na massa: ~3 horas, fora as esperas da Apple.

**Segunda à tarde (ao acordar)**

- [ ] **1. Inscrição Apple (pessoa física).** App Apple Developer no iPhone → Conta → Inscrever-se. Nome legal igual
      ao do documento. Pagar US$ 99. Se o app não oferecer a inscrição no Brasil: developer.apple.com/programs/enroll.
- [ ] **2. Pedir a autorização à igreja/ao seu pai** (§2). Hoje mesmo.
- [ ] **3. Política de privacidade e suporte publicados** (a Apple exige as duas URLs). As páginas já estão
      prontas em `site/`: `politica-de-privacidade.html` (Parte 1 do rascunho, caminho pessoa física, sem o
      interruptor de estatísticas), `suporte.html` (contato e perguntas frequentes) e `excluir-conta.html` (a V1 não
      tem conta; como apagar os dados do aparelho, sem prometer função futura), mais `estilo.css`. São HTML estático, sem script,
      legíveis no celular, claro e escuro. **Antes de publicar:** troque todo `[PREENCHER: ...]` (nome, e-mail, igreja,
      prazo de resposta, data de vigência) e, se der, peça a um advogado para ler a política. **Publicar é com você**
      (eu não publico nada): qualquer hospedagem estática gratuita serve (ex.: GitHub Pages, Netlify arrastando a
      pasta `site/`, ou colar o texto num Google Sites). O endereço tem de ser **https**. Me mande as duas URLs e o
      e-mail: eles entram em `mobile/src/config/contato.ts` e em `mobile/store.config.json` **antes** do build (sem
      isso, a tela Privacidade não mostra o link, o app não mostra contato, diretriz 1.5 da Apple, e o build de loja é
      recusado pelo `app.config.ts`).
- [ ] **4. Conta Expo:** crie em expo.dev (o e-mail é seu). Depois:

```powershell
cd "C:\Users\Administrator\Bible Study App\mobile"
npx eas-cli@latest login        # o pacote se chama eas-cli; "npx eas" sozinho não é o CLI
npx eas-cli@latest init         # cria o projeto "biblia-app" e IMPRIME um id
```

- [ ] **5. Colar o id** em `mobile/app.config.ts`: `const EAS_PROJECT_ID = '<id>';` (ou me mande o id que eu colo).
      Com config dinâmico o `eas init` não grava sozinho.
- [ ] **6. Vídeo para o revisor:** grave no Expo Go, no seu iPhone, 1 a 2 minutos: abrir o app, onboarding, a contagem
      e o propósito, e (se der) um dia aberto pelo painel DEV. Suba como **não listado** (YouTube ou Google Drive com
      link aberto) e guarde o link para as notas (§4.10). Não mostre nome de líder. **[COM ABA BÍBLIA]** mostre
      também a aba Bíblia abrindo um capítulo e a tela de créditos da Bíblia Livre (é o que prova conteúdo real antes
      de 23/09, §5). **[SEM ABA BÍBLIA]** não mostre texto bíblico.

**Terça de manhã (com a inscrição aprovada e a autorização em mãos)**

- [ ] **7. Autorização registrada:** me avise. **Eu** preencho `rights.json`, rodo `npm run content:convert` e
      `npm run content:check`. Você não edita o `dataset.json`.
- [ ] **8. Build de loja:**

```powershell
npx eas-cli@latest build -p ios --profile production
```

  O EAS pede seu **Apple ID**, a senha e o **código de duas etapas** (você digita), escolhe o time e cria sozinho
  o identificador `com.cemdiassemdesistir.app` e os certificados: responda "sim" para deixar o EAS gerenciar.
  Leva ~20 a 60 min com fila (INFERÊNCIA; plano gratuito tem fila).
- [ ] **9. Criar o app no App Store Connect** (appstoreconnect.apple.com → Apps → "+" → Novo app): plataforma iOS,
      nome (§4.1), idioma principal Português (Brasil), identificador `com.cemdiassemdesistir.app`, SKU
      `cemdias-2026`, acesso total. Se o nome estiver em uso por outro app, use a alternativa do §4.1.
- [ ] **10. Enviar o build:**

```powershell
npx eas-cli@latest submit -p ios --latest
```

  Pede o Apple ID de novo. O build aparece no TestFlight em ~15 a 60 min ("Processando").
- [ ] **11. Seu pai revisa no TestFlight** (instale o app TestFlight no seu iPhone; o build aparece para você).
      Em paralelo, siga para o 12: a revisão da Apple e a do seu pai correm juntas.
- [ ] **12. Subir a ficha pelo terminal (EAS Metadata).** Antes, troque em `mobile/store.config.json` todo
      `[PREENCHER: ...]`: copyright (seu nome legal), nome da igreja (descrição e notas), e-mail de suporte, as duas
      URLs do item 3, e o bloco `review` (seu nome, sobrenome, e-mail, telefone `+55 ...`, link do vídeo do item 6).
      Ou me mande os dados que eu preencho. Depois:

```powershell
npx eas-cli@latest metadata:lint    # confere o arquivo; não pede login
npx eas-cli@latest metadata:push    # pede o Apple ID (você digita) e grava tudo no App Store Connect
```

  O `metadata:lint` **falha de propósito** enquanto `review.email` estiver com `[PREENCHER]` (o schema exige e-mail
  válido): é a trava para não subir a ficha pela metade. Com um e-mail de teste no lugar, o arquivo passa ("Store
  configuration is valid", eas-cli 24.7.0, conferido em 21/09). As URLs e os outros `[PREENCHER]` **não** são
  barrados pelo lint: confira com `Select-String -Path store.config.json -Pattern PREENCHER` (tem de voltar vazio).
  O `metadata:push` precisa de o app já existir no App Store Connect (item 9) e de um build já enviado (item 10)
  (FATO [E3]). **O que ele grava** (FATO, schema [E4]): nome, subtítulo, descrição, palavras-chave, texto
  promocional, URLs de suporte e política, copyright, categorias (**Referência** + **Estilo de vida**), respostas da
  classificação etária (todas "não/nenhum": 4+ esperado), dados de contato e notas para o revisor, e
  **lançamento manual** (`automaticRelease: false`, que substitui o antigo item 13). Se você mudar algo no site da
  Apple depois, `npx eas-cli@latest metadata:pull` traz de volta para o arquivo.
- [ ] **13. O que continua sendo clique no App Store Connect** (o EAS Metadata não cobre, ou não vale a pena):
      1. **Capturas de tela** (a documentação do EAS Metadata diz "Upload screenshots ✗", FATO [E3]): tire no seu
         iPhone pelo TestFlight (dia aberto, intercessão, modo altar, jornada, lembrete, e um capítulo aberto na aba
         Bíblia com o crédito BLIVRE visível, sem outra tradução na tela). A Apple aceita 6,9" (1320 × 2868) ou 6,5"
         (1284 × 2778); se o seu iPhone for menor, amplie antes de subir (me mande que eu confiro).
         (O eas-cli 24.7.0 já aceita um campo `screenshots` não documentado; não usamos. Sem ele, o
         `metadata:push` não mexe nas capturas: pode rodar de novo depois de subi-las. FATO, código do eas-cli, 21/09.)
      2. **Privacidade do app** → "Dados não coletados" (§4.8). Não faz parte do `store.config.json`.
      3. **Direitos de conteúdo** → "contém conteúdo de terceiros: Sim; tem os direitos: Sim" (§4.9), só com a
         autorização da §2.
      4. **Preço Grátis** e **disponibilidade só Brasil** (Preços e disponibilidade).
      5. **Classificação etária:** abra o questionário e confira. A pergunta de **social media** (obrigatória desde
         set/2026, `FICHA_DE_LOJA_rascunho.md` §5.1) **não existe** no schema do EAS: responda **Não** à mão.
         As menções no guia a temas como abuso, pornografia ou violência são **motivos de oração**, não retratos:
         por isso "Nenhum" (INFERÊNCIA; releia se o revisor questionar).
      6. **Escolher o build** na versão 1.0.0 (seção "Build"), se ele não aparecer já selecionado.
      7. **Criptografia:** não deve perguntar (`usesNonExemptEncryption: false`); se perguntar, "não usa além da
         isenta".
- [ ] **14. Enviar para revisão** (botão "Adicionar para revisão" → "Enviar"). Clique seu: nem o `eas submit` nem o
      `metadata:push` enviam para revisão sozinhos (INFERÊNCIA: a doc do EAS não diz que enviam, e o `submit` só sobe
      o binário para o TestFlight).
- [ ] **15. Pedir revisão acelerada** logo depois: developer.apple.com/contact/app-store/?topic=expedite. Texto
      pronto no §4.11. (Formulário web, clique seu.)

**Resumo do envio, em ordem:** `eas build` (item 8) → criar o app no site (item 9, clique) → `eas submit` (item 10)
→ `eas metadata:push` (item 12) → capturas, privacidade, direitos, preço, build (item 13, cliques) → enviar para
revisão (item 14, clique) → revisão acelerada (item 15, formulário).

**Quarta:** aprovado e seu pai de acordo → "Lançar esta versão". Link público da App Store para a igreja.

**Se aparecer a pergunta de criptografia** a cada build: responda que o app **não usa criptografia além da isenta**
(pedido já feito ao agente do `app.config.ts` para declarar isso no build; aí a pergunta some).

---

## 4. Textos prontos para colar no App Store Connect

Conferido em 21/09 com o app **como estará no build**. Se alguma função listada na descrição sair do app antes do
build, apague a linha dela. Contagens feitas no PowerShell.

**Para o envio vale o `mobile/store.config.json`** (variante com aba Bíblia, sobe com `metadata:push`); esta seção
fica como referência. Diferenças conferidas no código em 21/09: lá a descrição inclui "Sua reflexão" (a tela existe:
Você › Minhas reflexões) e diz "Leia no próprio app ou na sua Bíblia" (o leitor do dia mostra a Bíblia Livre); as
notas ao revisor citam as abas reais (Jornada, Bíblia, Você) e dizem que os lembretes ficam em Você › Lembretes.

**4.1 Nome** (máx. 30): `100 dias sem desistir` (21). Se já existir outro app com esse nome:
`100 dias sem desistir: guia` (27).

**4.2 Subtítulo** (máx. 30): `Leitura e oração, dia a dia` (27).

**4.3 Palavras-chave** (máx. 100 bytes; sem repetir nome e subtítulo; 93 bytes):

```
biblia,plano,intercessao,devocional,igreja,jornada,guia,diario,consagracao,adoracao,capitulos
```

**4.4 Texto promocional** (máx. 170; 143):

```
De 23 de setembro a 31 de dezembro, a igreja caminha junta: a leitura de cada dia, a direção de oração e um lembrete na hora que você escolher.
```

**4.5 Descrição** (texto puro; preencher os colchetes antes):

```
100 dias sem desistir é o guia da campanha 100 Dias da [NOME DA IGREJA], de 23 de setembro a 31 de dezembro de 2026.

Todo dia o app mostra, num lugar só:

• A leitura do dia: quais capítulos ler hoje, no plano da igreja para os 100 dias. Leia na sua Bíblia e marque como lido.
• A direção de oração: o tema, a ênfase e os motivos de intercessão do dia, do guia preparado pela igreja.
• Modo altar: letra grande, passo a passo, para orar sozinho, em família ou no altar.
• Lembrete diário: na hora que você escolher. Um por dia.
• Meu ministério: escolha o seu e veja os dias em que ele conduz o altar.
• [SÓ COM ABA BÍBLIA] A Bíblia no app: leia qualquer livro e capítulo na Bíblia Livre, sem internet.

Entrou depois do começo? Tudo bem. O app começa no dia de hoje, e os dias que ficaram para trás continuam abertos para você fazer no seu ritmo.

Cada dia abre à meia-noite (horário de Brasília), na data dele.

Funciona sem internet e sem cadastro. O que você marca fica só no seu celular. Não pedimos nome, e-mail nem telefone.

Respeita o tamanho de letra do seu celular e o modo escuro.

O conteúdo do guia é da [NOME DA IGREJA] e é usado com autorização dela.

[SÓ COM ABA BÍBLIA] Texto bíblico: Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, licença Creative Commons Atribuição 4.0 (CC BY 4.0), obtida em ebible.org. Créditos completos dentro do app.

Dúvidas: [E-MAIL DE SUPORTE]
```

Apague as linhas marcadas **[SÓ COM ABA BÍBLIA]** (e o marcador) se a aba não estiver no build. Com a aba, a linha
"A leitura do dia" pode continuar dizendo "Leia na sua Bíblia" (a pessoa escolhe onde ler); não trocar por "leia no
app" se o leitor do dia ainda não abrir o capítulo direto na aba Bíblia.

Não escrever: "comunidade", "compartilhe", "grátis", "nº 1", "para crianças", nome de **outra** tradução (NVI, ARA,
NAA, NTLH…). **Sem a aba Bíblia**, também não escrever "Bíblia completa" nem "Bíblia Livre". **Com a aba**, "Bíblia
Livre" pode e deve aparecer; "Bíblia completa" só depois de conferir no build que os 66 livros abrem (motivos em
`FICHA_DE_LOJA_rascunho.md` §4).

**Atribuição na ficha (INFERÊNCIA):** a CC BY exige crédito "razoável ao meio" onde o texto é distribuído, isto é,
**dentro do app** (tela de créditos). A ficha não distribui o texto, então a linha de crédito na descrição não é
exigida pela licença; está aqui porque é barata, é honesta e mostra ao revisor a origem legal do texto (diretriz
5.2.1).

**4.6 Categoria:** principal **Referência**; secundária **Estilo de vida**. Nunca "Crianças".

**4.7 Classificação etária** (questionário do App Store Connect; responder olhando o formulário real):
controles parentais / verificação de idade **Não** · acesso irrestrito à web **Não** (o app só abre o link fixo da
política) · conteúdo gerado por usuário **Não** · mensagens e chat **Não** · social media **Não** · publicidade **Não** ·
violência, sexo, palavrões, drogas, álcool, jogos de azar, temas médicos **Nenhum**. Resultado esperado: **4+** (Brasil:
**L**). INFERÊNCIA. Se a Comunidade voltar numa versão futura, este questionário muda (A16 no Brasil,
`FICHA_DE_LOJA_rascunho.md` §6).

**4.8 Privacidade do app:** **"Dados não coletados" (Data Not Collected).** Evidência (código lido em 21/09):

- nuvem desligada à força em build de release (`src/cloud/config.ts`, `BUILD_E_IDENTIFICADORES.md` §2, trava 3), e
  Comunidade escondida nesta versão;
- nenhum `fetch`, nenhum SDK de estatística, erro, anúncio ou push remoto no `package.json` e em `src/`;
- o interruptor "Enviar dados de uso anônimos" **saiu do app**; o registro de eventos só funciona em desenvolvimento e,
  em release, não grava nada (`src/analytics/analytics.ts`, `src/app/_layout.tsx`);
- lembretes são notificações locais do próprio celular (`src/reminders/reminders.ts`);
- as únicas saídas são abrir a política no navegador (`src/app/privacidade.tsx`) e abrir o app de e-mail da pessoa
  com o endereço de suporte (`src/app/ajuda.tsx`), sempre por toque dela: o app não transmite nada
  (INFERÊNCIA: o e-mail que a pessoa decide mandar sai pelo app de e-mail dela, não por este app).

A regra da Apple: "coletar" = transmitir para fora do aparelho (FATO [A8]). Condição: o build de loja é gerado **sem**
as variáveis `EXPO_PUBLIC_SUPABASE_*`. **[COM ABA BÍBLIA]** a resposta continua a mesma **desde que** o texto vá
empacotado no binário (nada baixado em tempo de execução) e a posição de leitura, se guardada, fique só no aparelho. Se um dia entrar SDK de estatística ou conta, esta resposta muda **antes**.

**4.9 URLs:** Suporte: **[URL DE SUPORTE]** · Política de privacidade: **[URL DA POLÍTICA]** · Marketing: opcional,
deixe vazio. **Faltam as duas primeiras** (checklist item 3). **Copyright:** `2026 [NOME DO FUNDADOR]`.
**Direitos de conteúdo:** "O app contém conteúdo de terceiros?" **Sim**; "tem os direitos necessários?" **Sim**, só
depois da autorização da §2. **[COM ABA BÍBLIA]** o terceiro inclui a Bíblia Livre, cujo direito vem da licença CC BY
4.0 (pública; cumprida com a tela de créditos). Não precisa de carta.

**4.10 Notas para o revisor** (App Review Information → Notes; em inglês, que é o que o revisor lê mais rápido):

```
This app is the official daily companion for the "100 Dias" (100 Days) prayer and Bible-reading campaign of [CHURCH NAME], Brazil, running from September 23 to December 31, 2026. The content (daily reading references, prayer guide and ministry schedule) was written by the church and is used with its written authorization. I am a member of the church and publish the app on its behalf.

How the app works:
- No login, no account, no in-app purchases, no user-generated content shared with others. Everything stays on the device and works offline.
- Each campaign day unlocks at 00:00 São Paulo time (UTC-3) on its date. Day 1 unlocks on September 23, 2026.
- Before September 23, the app shows the countdown to Day 1 and the purpose of the campaign. This is intentional: the church asked that no day be opened early.
- From September 23 on, the Today screen shows the day's reading, the prayer guide, altar mode and reminders.
- [WITHOUT BIBLE TAB] The app does not display Bible text; it shows chapter references for people to read in their own Bible.
- [WITH BIBLE TAB] The Bible tab is available at any time, including before September 23: it contains the full text of the Bíblia Livre (Portuguese, CC BY 4.0, from ebible.org), bundled in the app and readable offline. Credits and license are in the app. Reading in the Bible tab does not unlock or complete campaign days.

Demo video of the full daily flow (Day 1 open): [VIDEO LINK]

Contact: [YOUR NAME], [PHONE], [E-MAIL].
```

**4.11 Pedido de revisão acelerada** (formulário [A5]):

```
Our app "100 dias sem desistir" is the companion app for the "100 Dias" campaign of [CHURCH NAME], which starts on Wednesday, September 23, 2026 (Day 1) and runs until December 31, 2026. About 3,000 people from the church are waiting to use it from Day 1. The app content is the church's own daily guide, used with its written authorization, and each day unlocks on its date. We kindly ask for an expedited review so the app is available when the campaign starts on September 23.
```

---

## 5. Risco honesto

**PROBLEMA.** Se o revisor abrir o app **antes de 00h de 23/09** (hora de São Paulo), ele vê só a contagem e o
propósito. Pode ler isso como app incompleto (diretriz 2.1) ou com funcionalidade mínima (4.2).

**EVIDÊNCIA.** O envio é na terça; 90% das revisões fecham em < 24 h (FATO [A4]), então a revisão pode cair tanto
na terça (só contagem) quanto na quarta (dia 1 aberto).

**O que já reduz o risco:** as notas do §4.10 explicam a data; o vídeo mostra o dia aberto; o pedido de revisão
acelerada amarra o app ao evento da data.

**Nota de 2026-09-21 — a aba Bíblia reduz o risco 4.2 (INFERÊNCIA):** com a Bíblia Livre no build, o revisor que
abrir o app antes de 23/09 **não vê só a contagem**: tem uma aba inteira de leitura, funcional e offline, fora do
calendário da campanha. Isso ataca direto o motivo "funcionalidade mínima" (4.2) e "incompleto" (2.1). Não zera o
risco: (i) a diretriz **4.3** (muitos apps de Bíblia parecidos) passa a ser a pergunta provável, e a resposta é o
que só este app tem: o guia diário da igreja, o modo altar, a escala do ministério; (ii) a aba só ajuda se estiver
**pronta e testada** no build: aba quebrada ou meio vazia piora a revisão (2.1). **Sem a aba**, este §5 vale como
estava. Mesmo com a aba, **não** abrir dias da campanha antes da data para o revisor (item 5 abaixo).

**Se rejeitar:**

1. Leia o motivo na Central de Resoluções (App Store Connect). Não reenvie no escuro.
2. Se for 2.1/4.2 por "só contagem": **responda na própria Central** (sem build novo), a partir de quarta 00h,
   dizendo que o dia 1 já está aberto e pedindo nova análise. Custo típico: ~1 dia (INFERÊNCIA).
3. Se for 5.2.1 (direitos do conteúdo) ou dúvida sobre pessoa física publicando material da igreja: responda anexando a
   autorização da §2.
4. Se for qualquer outra coisa (falha técnica, link quebrado, metadado): me mande o texto; eu corrijo, você roda de
   novo os comandos 8 e 10 e reenvia.
5. **O que eu não recomendo:** abrir dias antes da data "só para o revisor". É mudar o produto e o combinado com a
   igreja; se for preciso, é decisão sua e da igreja, não minha.

**Outros riscos:** inscrição Apple travar em verificação de identidade (sem prazo publicado; se passar de 48 h, abra
contato com o suporte do Developer Program); nome "100 dias sem desistir" já em uso (alternativa no §4.1); build falhar
por configuração (me mande o log do EAS).

---

## Fontes (acessadas em 2026-09-21)

- [A1] Apple — Enrollment (pessoa física, nome legal exibido como vendedor, US$ 99, sem prazo publicado):
  https://developer.apple.com/programs/enroll/
- [A2] Apple — Account Help, inscrição pelo app Apple Developer (mesmo aparelho, documento com foto, pagamento, regiões
  "selecionadas"): https://developer.apple.com/support/app-account/
- [A3] Apple — Enrolling, verifying, and renewing with the Apple Developer app (sem lista de regiões, sem prazo):
  https://developer.apple.com/help/account/membership/enrolling-in-the-app/ ; anúncio de 08/04/2021 (7 países, sem
  Brasil): https://developer.apple.com/news/?id=ay4rbpsp
- [A4] Apple — App Review (90% em < 24 h; revisão acelerada para evento): https://developer.apple.com/distribute/app-review/
- [A5] Apple — formulário de revisão acelerada: https://developer.apple.com/contact/app-store/?topic=expedite
- [A6] Apple — Overview of app transfer: https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer
- [A7] Apple — App Review Guidelines (1.5, 2.1, 4.2, 5.2.1): https://developer.apple.com/app-store/review/guidelines/
  (via `FICHA_DE_LOJA_rascunho.md` e `AUTORIZACAO_DA_IGREJA_rascunho.md`; não reaberto hoje)
- [A8] Apple — App privacy details: https://developer.apple.com/app-store/app-privacy-details/ (via
  `POLITICA_DE_PRIVACIDADE_rascunho.md` [B1])
- [E1] Expo — Submit to the Apple App Store (conta paga obrigatória; `--auto-submit`): https://docs.expo.dev/submit/ios/
- [E2] Expo SDK 57 — app config (`ios.config.usesNonExemptEncryption`; `ios.supportsTablet` padrão `false`):
  https://docs.expo.dev/versions/v57.0.0/config/app/
- [E3] Expo — EAS Metadata: https://docs.expo.dev/eas/metadata/ ("Upload screenshots" não suportado; beta) e
  https://docs.expo.dev/eas/metadata/getting-started/ (app registrado na Apple e binário enviado antes do `push`;
  arquivo na raiz do projeto ou em `metadataPath` do `eas.json`)
- [E4] Expo — store config schema: https://docs.expo.dev/eas/metadata/schema/ e o schema do próprio eas-cli 24.7.0
  (`schema/metadata-0.json`, que já traz os campos novos da classificação etária: `messagingAndChat`,
  `userGeneratedContent`, `advertising`, `parentalControls`, `ageAssurance`, `healthOrWellnessTopics`,
  `gunsOrOtherWeapons`, `ageRatingOverrideV2`; a página web ainda não lista esses campos)
- [F13] Google Play — requisito de teste para contas pessoais novas: ver `docs/technical/ANDROID_VERIFICACAO_30_09.md`.

**Não confirmado:** se a inscrição pelo app Apple Developer funciona no Brasil; prazo real de aprovação de pessoa física;
se contas de pessoa física podem convidar outra pessoa (seu pai) como usuário do App Store Connect (por isso o
roteiro usa o seu próprio iPhone no TestFlight). **Regras da Apple mudam: reconferir no dia do envio.**
