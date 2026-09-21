# Decisões do fundador

- **O que é:** registro datado das decisões que o fundador (Davi) tomou diretamente. Cada decisão diz **o que ela
  supera** e **o que continua valendo**. Decisão nova entra no fim, com data; decisão antiga não se apaga, se marca
  como superada.
- **Quem escreve:** Claude (engenharia), a partir do que o fundador disse. **Quem decide:** o fundador.
- **Etiquetas:** FATO · INFERÊNCIA · RECOMENDAÇÃO, como no resto do repositório.

---

## 2026-09-21 — quatro decisões

### D-2026-09-21-1 · A Bíblia Livre entra dentro do app (Gate 1 decidido: opção b1)

- **Decisão:** a **Bíblia Livre** (eBible `porbr2018`) é empacotada no app e lida numa aba **Bíblia**, já na V1
  **se ficar pronta e testada a tempo**; se não ficar, entra na primeira atualização. Permissão explícita do fundador
  para baixar `https://ebible.org/Scriptures/porbr2018_usfm.zip` (1,4 MB).
- **Licença (FATO, eBible, relida em 2026-09-21, `GATE_1_DECISAO.md` §2.1):** CC BY 4.0 (o link "4.0 Brasil" do eBible
  redireciona para a 4.0 Internacional). **Obrigações:** atribuição (título, titulares "Diego Santos, Mario Sérgio e
  Marco Teles", licença com link, fonte e data da versão empacotada) e **indicar alterações** se houver (inclusive
  conversão que tire notas ou marcas do USFM). Sem share-alike: o app não precisa ser aberto. O texto **não pode ir
  cifrado** (vedação de medida técnica da CC). Tela de créditos/licença obrigatória no app.
- **Supera:** a RECOMENDAÇÃO do `GATE_1_DECISAO.md` §5 (opção **a**, só referências + link externo). O documento fica
  como histórico; a pergunta "(a), (b1), (b2) ou (a+b)?" está respondida: **b1**.
- **Não muda:**
  - Gate 1 continua **independente** do Gate 2 (autorização escrita da igreja para o guia e a escala).
  - Traduções protegidas (NVI, NAA, ARA, NTLH…) continuam só por contrato; a carta à SBB/Biblica segue opcional.
  - A leitura livre na aba Bíblia **não conclui dias da campanha** nem revela conteúdo da igreja de dias futuros
    (registrado em `design_handoff_100_dias/REGRAS.md` §5, linha 1).
  - Nada da lista de bloqueio entra; nunca scraping do YouVersion.
- **Pergunta que continua aberta (para a igreja, não bloqueia):** "a Bíblia Livre serve para o público de vocês?"
  (`GATE_1_DECISAO.md` §2.2: fraseado Almeida, não é o que o altar usa).

### D-2026-09-21-2 · V1 na App Store esta semana, sem Comunidade

- **Decisão:** a V1 vai para a App Store **esta semana sem Comunidade** (aba escondida, nuvem desligada, "Dados não
  coletados"). A Comunidade vem como **atualização**, meta do fundador **~2 semanas**.
- **Supera:** nada novo no iPhone (já estava em `LANCAMENTO_EXPRESSO_IOS.md`); passa a ser decisão registrada.
- **Aviso honesto (INFERÊNCIA, sem mudar a decisão):** o memorando `comunidade/00-DECISOES.md` §7 estimou a Comunidade
  para **fim de outubro a meados de novembro**, por depender de servidor, equipe de moderação com prazo de 24 h,
  pessoa jurídica responsável e novo questionário etário (A16 no Brasil). A meta de 2 semanas só se sustenta se esses
  itens da igreja andarem em paralelo, não depois do código. Quando a Comunidade for ao ar, a ficha muda para a
  **versão B** (`FICHA_DE_LOJA_rascunho.md` §6) **na mesma versão**.

### D-2026-09-21-3 · Sem mensagem privada na primeira Comunidade

- **Decisão:** a primeira Comunidade **não tem mensagem privada**. "Chegar na pessoa" = **comentar no post dela** e
  marcar **Amém** (sem contador, `REGRAS.md` regra 19). Mensagem privada fica para depois.
- **Supera:** o pedido do fundador de "escrever pra outra pessoa e chegar pra ela" como DM; fica atendido, nesta
  etapa, por comentário e Amém.
- **Por que ajuda (INFERÊNCIA):** mensagem privada é a superfície mais cara de moderar e a que mais pesa em proteção
  de menores (ECA Digital) e na declaração "Mensagens e chat" das lojas; adiá-la reduz risco sem tirar o essencial.
- **Quando voltar:** entra com decisão própria, moderação, denúncia/bloqueio e revisão da classificação etária.

### D-2026-09-21-4 · O fundador assume a decisão da Comunidade

- **Decisão:** o fundador **assume** a decisão da Comunidade (feed da igreja, comentário, Amém sem contador, na forma
  do desenho de `design_handoff_100_dias/`) **no lugar da ratificação do Product Brain**.
- **Supera:** a pendência de ratificação em `PARA_O_PRODUCT_BRAIN.md` (perguntas 1 e seguintes) e em
  `comunidade/00-DECISOES.md` (linha 5 e item 12 da lista de próximos passos). O Product Brain pode continuar revisando, mas a
  Comunidade não espera por ele.
- **Não muda:** as regras de Comunidade do `REGRAS.md` §3 (denunciar e bloquear, moderação humana com prazo,
  consentimento destacado, aviso de visibilidade, sem contador, exclusão de conta, minimização) continuam
  **bloqueantes**; são lei e loja, não preferência. Streak, badge, ranking e amigos continuam fora.
- **`CLAUDE.md`:** é do fundador e **não foi editado**. A lista "Hipóteses NÃO aprovadas" ainda cita feed,
  comunidade, comentários e reações; a sugestão de texto está em `docs/technical/SUGESTOES_CLAUDE_MD.md` §13.

---

## Onde cada decisão foi aplicada nos documentos (2026-09-21)

| Documento | Mudança |
|---|---|
| `GATE_1_DECISAO.md` | Status: DECIDIDO (b1); nota no topo. |
| `LANCAMENTO_EXPRESSO_IOS.md` | Aba Bíblia na descrição, notas ao revisor e risco 4.2 (§5). |
| `FICHA_DE_LOJA_rascunho.md` | Descrição menciona a Bíblia Livre; atribuição CC BY; tabela "dizer / não dizer". |
| `design_handoff_100_dias/REGRAS.md` | Notas datadas na regra 1 e no §5 linha 1. |
| `docs/technical/SUGESTOES_CLAUDE_MD.md` | §13: sugestões de texto para o fundador aplicar no `CLAUDE.md`. |
