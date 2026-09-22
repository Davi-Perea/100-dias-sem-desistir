# Versão final: o que está pronto e o que falta (só você, a igreja ou o designer)

- **Data:** 2026-09-21 (segunda). **Dia 1 da campanha:** quarta, 23/09. **Autor:** Claude. **Para:** Davi, que repassa ao ChatGPT.
- **Base:** `LANCAMENTO_EXPRESSO_IOS.md` (passo a passo completo do iPhone), `CONVERSA_COM_A_IGREJA.md`,
  `design_handoff_100_dias/MENSAGEM_AO_DESIGNER_2.md` e `COMUNIDADE_V2_DEPLOY.md` (no branch `comunidade-v2`).
- **Regra:** senha, pagamento, código de duas etapas, aceite de contrato, publicação e commit são **seus**. Eu não faço
  nenhum deles.

---

## 1. O que está PRONTO (conferido hoje)

| Parte | Estado | Prova |
|---|---|---|
| **App V1** (hoje, leitura, intercessão, modo altar, jornada, ministério, tema claro e escuro, tamanho de letra) | Pronto, com o conteúdo real em `pending_authorization` | `main`: tsc 0 erros, lint 0 avisos, **931/931 testes** em 51 suítes, `content:check` OK (100 dias, 1189 capítulos) |
| **Bíblia no app** (Bíblia Livre, CC BY 4.0, offline, créditos) | Pronta e no build | `bible:check` OK (66 livros, 1189 capítulos, 31.102 versículos) |
| **Lembrete diário** (você escolhe a hora; a notificação diz qual é a leitura) | Pronto, notificação local | commit `482dcea` |
| **Modo demonstração** (ver o app como se a campanha já tivesse começado) | Pronto, só em desenvolvimento | commits `fbfd7e2`, `8370d5d` |
| **Ficha da App Store** | Pronta em `mobile/store.config.json`, sobe com `eas metadata:push` | faltam os 9 `[PREENCHER]` (seus dados) |
| **Páginas públicas** (política, suporte, exclusão) | Prontas em `site/`, **não publicadas** | faltam 14 `[PREENCHER]` |
| **Comunidade** (branch `comunidade-v2`) | Em **demonstração**: escondida no app, não entra na V1 | tsc 0, lint 0, **1110/1110 testes** em 57 suítes |
| **SQL da Comunidade** | **Executado localmente** (PGlite): 6 migrations ok, **257/257 asserções** em 13 arquivos. **Ainda não executado no Supabase real** | `npm run db:test:local` no branch |

**Não pronto de propósito:** o build de loja **se recusa** a sair enquanto faltarem a autorização da igreja, o e-mail e
a URL da política (travas do `app.config.ts`). Android não entra esta semana (teste fechado de 14 dias, abaixo).

**Ainda sem commit:** as mudanças de hoje (tema escuro, leitor, `store.config.json`, `site/`) estão só no working tree,
no `main` e no branch. O merge do branch no `main` também não foi feito.

---

## 2. O que falta, EM ORDEM

Legenda: **[VOCÊ]** Davi · **[IGREJA]** seu pai / liderança · **[DESIGNER]**. Em cada item: o que fazer e **o que me
mandar de volta**.

### Hoje (segunda, 21/09)

1. **[IGREJA] Autorização escrita do guia e da escala.** Mande ao seu pai o texto do `LANCAMENTO_EXPRESSO_IOS.md` §2
   (itens 1 a 3: você publica em conta pessoal, provisoriamente, com transferência depois; uso do nome e da pomba;
   "autorizo o guia e a escala dos 100 Dias no app"). Basta e-mail ou WhatsApp com **nome, cargo e data**. Guarde fora
   do repositório.
   **Me mande:** a data e o canal (ex.: "WhatsApp, 22/09, pastor Fulano"). Não mande o print. Nomes de líderes ficam
   de fora da V1.
2. **[VOCÊ] E-mail de contato.** Escolha um e-mail que alguém leia todo dia (a Apple exige, diretriz 1.5). Pode ser um
   Gmail novo só do app.
   **Me mande:** o endereço.
3. **[VOCÊ] Preencher e publicar `site/`.** Troque todo `[PREENCHER: ...]` nos 3 arquivos (nome legal, e-mail, nome da
   igreja, prazo de resposta, data de vigência). Publique a pasta: **app.netlify.com/drop → arrastar a pasta `site/`**
   (ou GitHub Pages). Confira que abre em **https** no celular.
   Conferir que não sobrou nada (tem de voltar vazio):
   ```powershell
   Select-String -Path "C:\Users\Administrator\Bible Study App\site\*.html" -Pattern PREENCHER
   ```
   **Me mande:** a URL da política e a URL do suporte. Eu ponho em `mobile/src/config/contato.ts` e no
   `store.config.json`.
4. **[VOCÊ] Conta Expo.** Crie em **expo.dev → Sign up**. Depois, no PowerShell:
   ```powershell
   cd "C:\Users\Administrator\Bible Study App\mobile"
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   **Me mande:** o id que o `init` imprime. Eu colo em `EAS_PROJECT_ID` (`mobile/app.config.ts`).
5. **[VOCÊ] Vídeo para o revisor** (1 a 2 min, no seu iPhone, pelo Expo Go ou modo demonstração): onboarding, contagem,
   um dia aberto, a aba Bíblia abrindo um capítulo e os créditos da Bíblia Livre. Sem nome de líder. Suba como **não
   listado** no YouTube.
   **Me mande:** o link.
6. **[VOCÊ] Dados do revisor:** nome, sobrenome, telefone `+55 ...`, nome legal para o copyright, nome da igreja como
   deve aparecer na loja.
   **Me mande:** esses dados. Eu preencho o `store.config.json` e rodo `metadata:lint`.
7. **[VOCÊ] Autorizar o commit** das mudanças de hoje (`main`) e dizer se quer o merge do branch `comunidade-v2` agora
   ou depois do envio. **Minha recomendação:** commit no `main` hoje; merge **depois** do envio à Apple, para não mexer
   no build.
   **Me mande:** "pode commitar" (e, se quiser, "pode fazer o merge").

### Terça (22/09), com a Apple aprovada e a autorização em mãos

8. **[VOCÊ] Conferir a aprovação da Apple** (e-mail da Apple ou app Apple Developer → Conta). Se passar de 48 h sem
   resposta, abra contato em developer.apple.com/contact.
   **Me mande:** "Apple aprovada".
9. **[EU, depois do item 1]** preencho `rights.json`, rodo `npm run content:convert` e `npm run content:check`. Aviso
   quando estiver verde. Você não mexe no `dataset.json`.
10. **[VOCÊ] Build de loja** (você digita Apple ID, senha e código; responda "sim" para o EAS gerenciar certificados):
    ```powershell
    npx eas-cli@latest build -p ios --profile production
    ```
    **Me mande:** o link do build, ou o log se falhar.
11. **[VOCÊ] Criar o app** em appstoreconnect.apple.com → **Apps → "+" → Novo app**: iOS, nome `100 dias sem desistir`
    (se estiver em uso: `100 dias sem desistir: guia`), Português (Brasil), identificador `com.cemdiassemdesistir.app`,
    SKU `cemdias-2026`.
    **Me mande:** qual nome ficou.
12. **[VOCÊ] Enviar o binário e a ficha:**
    ```powershell
    npx eas-cli@latest submit -p ios --latest
    npx eas-cli@latest metadata:lint
    npx eas-cli@latest metadata:push
    ```
    **Me mande:** a saída de erro, se houver.
13. **[IGREJA] Seu pai vê o app no TestFlight** do seu iPhone e diz "de acordo". Em paralelo ao item 14.
14. **[VOCÊ] Cliques no App Store Connect** (o EAS não faz): capturas de tela (6,9" ou 6,5"; me mande antes que eu
    confiro); Privacidade do app → **Dados não coletados**; Direitos de conteúdo → **Sim / Sim**; preço **Grátis**,
    disponibilidade **só Brasil**; questionário etário (social media = **Não**); escolher o build na 1.0.0.
    Detalhes: `LANCAMENTO_EXPRESSO_IOS.md` §3 item 13.
15. **[VOCÊ] "Adicionar para revisão" → "Enviar"** e logo depois a **revisão acelerada** em
    developer.apple.com/contact/app-store/?topic=expedite (texto pronto no §4.11 do mesmo documento).
    **Me mande:** "enviado" e a hora.
16. **[VOCÊ] Aprovado + pai de acordo → "Lançar esta versão".** Se rejeitar, **me mande o texto da rejeição** antes de
    reenviar (roteiro no §5 do mesmo documento).

### Esta semana (até sexta, 25/09)

17. **[VOCÊ] Google Play (ainda não criado).** play.google.com/console → criar conta **pessoal** (US$ 25, você paga e
    verifica identidade). Conta pessoal nova precisa de **teste fechado com 12 pessoas por 14 dias seguidos** antes da
    produção. Começando até sexta, a loja fica para **meados de outubro** (~12 a 16/10).
    **Me mande:** "conta Play criada" e a lista de 12 e-mails de testadores (Gmail) quando tiver. Eu preparo o build
    Android e a ficha.
18. **[IGREJA] Respostas curtas** (`CONVERSA_COM_A_IGREJA.md` §4): nome definitivo do app (e marca, se tiver
    "Lagoinha"); tradução da citação de Levítico 6:13; se há jejum oficial ou é "consagração"; até quando o material
    pode ficar no app (sugestão 30/06/2027).
    **Me mande:** uma frase por resposta.
19. **[DESIGNER] Arquivos e respostas ainda não chegaram.** Envie `design_handoff_100_dias/MENSAGEM_AO_DESIGNER_2.md`
    (copiar tudo abaixo da linha). Prioridade: parte 1 (itens 1 a 8, travam telas), depois parte 3 (tema escuro, itens
    14 a 23), capturas do grupo F e pomba branca em @2x e @3x. A parte 4 (Comunidade) só se a Comunidade for aprovada.
    **Me mande:** os arquivos numa pasta (ex.: `design_handoff_100_dias/recebido-AAAA-MM-DD/`) e as respostas como
    vierem. O que não chegar continua marcado PROVISÓRIO e não trava o envio à Apple.

### Só para a Comunidade (atualização futura, não trava a V1)

20. **[VOCÊ] Supabase na região certa.** O projeto foi criado em "Americas"; a Comunidade precisa de **São Paulo
    (`sa-east-1`)** (dado sensível, ADR-002). A região **não muda** num projeto existente: crie outro em
    supabase.com/dashboard → **New project → Region: South America (São Paulo)**, com 2FA na conta. Apague o antigo
    só depois (clique seu). A V1 não usa Supabase.
    **Me mande:** o **Project ID** (20 letras). Nunca a senha do banco nem chaves.
21. **[VOCÊ] Rodar o deploy** seguindo `COMUNIDADE_V2_DEPLOY.md` §2 a §9 (`npx supabase login`, `link`,
    `db push --dry-run`, `db push`, `functions deploy`, segredos, Vault, cron), **primeiro num projeto de teste**.
    **Me mande:** a saída de cada erro, se houver (sem segredos). Quando passar, eu troco o marcador "NÃO EXECUTADO"
    nos docs e no `comunidade-sql.test.ts`.
22. **[IGREJA] Só se quiserem a Comunidade:** advogado, 17 pessoas (14 moderadores, 2 apoio pastoral, 1 responsável),
    regras escritas pela igreja, encarregado de dados, e aceitar a indicação **16+** do app inteiro na App Store.
    Data honesta: meados de novembro; se não estiver pronto até **15/11**, deixar para depois da campanha.

---

## 3. Perguntas abertas para o Product Brain (não são código)

1. Leitor: guardar a posição dentro do capítulo, ou não?
2. Comunidade: botão "Concordo e quero publicar" para quem chega vindo de um Amém (texto do rascunho legal).
3. Comunidade: enviar comentário só com ícone, sem rótulo?
4. Comunidade: "Sair desta conta" sem confirmação?
5. Comunidade: denúncia aberta cujo conteúdo o autor apagou fecha sozinha ou continua aberta?
6. `@electric-sql/pglite` como devDependency (muda o lockfile) ou continua instalado sob demanda?

**Pendências técnicas minhas, registradas:** barra de status por tela (precisa de teste no aparelho); anel "não leu"
da D4 deve nascer com `controlBorder`; amostra do tamanho de letra no escuro marcada PROVISÓRIA até a resposta 15 do
designer.
