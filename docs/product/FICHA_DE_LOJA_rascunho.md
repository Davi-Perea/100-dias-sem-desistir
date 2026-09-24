# Ficha de loja — rascunho (App Store e Google Play)

> **RASCUNHO PARA REVISÃO.** Este texto não é parecer jurídico nem texto final de marketing. Ele precisa ser revisto por
> quem responde pela igreja (e por advogado nos pontos de classificação etária, marca e declarações às lojas) antes de
> ir para qualquer loja. Onde aparece **[CAMPO]**, falta um dado que só a igreja tem. Nada aqui foi enviado a loja nenhuma.

- **Data:** 2026-09-21 · **Autor:** Claude (Principal Mobile Engineer / Technical Architect)
- **Para:** Davi (fundador), Product Brain e a pessoa da igreja que vai assinar a publicação.
- **Nome usado aqui:** **"100 dias sem desistir" — PROVISÓRIO.** O nome definitivo depende da igreja.
- **Etiquetas:** **FATO** (fonte oficial + data de acesso) · **INFERÊNCIA** (conclusão minha) · **NÃO CONFIRMADO**
  (procurei e não achei fonte primária). Todas as fontes foram acessadas em **2026-09-21**. Regras de loja mudam:
  reconferir tudo no dia do envio.

---

---

## DECISÃO DO FUNDADOR — 2026-09-24 (identidade e descoberta) — FECHADA

Esta seção **prevalece** sobre as propostas de nome, subtítulo e palavras-chave do resto do documento.
Todos os valores abaixo estão **decididos** — não há campo pendente aqui.

| Campo | Valor final | Medida | Onde está aplicado |
|---|---|---|---|
| Nome na loja (marca) | **100 Dias Sem Desistir** | 21 de 30 | `store.config.json`, título da web |
| Nome sob o ícone, no celular | **100 dias** | — | `app.config.ts`, `NAMES.production` |
| Subtítulo / identificação curta | **Jornada de leitura bíblica** | 26 de 30 | `store.config.json`, título da web |
| Descrição da web | **Uma jornada de 100 dias para ler a Bíblia, fortalecer sua fé e caminhar em comunidade.** | 86 | `meta description` e `og:` |
| Descrição curta — 1º envio iOS | **100 dias para ler a Bíblia, fortalecer sua fé e caminhar com a sua igreja.** | 73 | ver nota 1 |
| Descrição curta — Google Play | **100 dias para ler a Bíblia, fortalecer sua fé e caminhar em comunidade.** | 71 de 80 | ver nota 2 |
| Palavras-chave (Apple) | `biblia,devocional,fe,cristao,oracao,igreja,comunidade,crista,plano,intercessao,guia,diario,adoracao` | 99 de 100 bytes | `store.config.json` |
| Ícone | `assets/icone/icone-ios.png` — o "100" preto sobre `#FFD100` que já existia | — | iOS, Android adaptativo, favicon, atalho e cartão de link da web |

**A marca é "100 Dias Sem Desistir".** "Jornada de leitura bíblica" é identificação descritiva: existe para a
pessoa entender o que o app é. Não é nome novo e não substitui a marca em lugar nenhum.

### Por que a descrição curta tem DUAS versões

**Nota 1 — iOS, primeiro envio: "com a sua igreja".** "Caminhar em comunidade" descreve o Juntos, que está
ligado na web mas **escondido no build de loja**. Descrever função ausente é reprovação pela regra 2.3.1
(metadados precisos). "Com a sua igreja" descreve a campanha coletiva, que existe no build, sem prometer feed.

A App Store não tem campo de "descrição curta": esta frase é a linha de abertura / texto promocional. O
`promoText` que já estava no `store.config.json` continua valendo — ele fala da campanha, não do Juntos.
Quando o Juntos entrar num build de loja, esta linha pode voltar a terminar em "e caminhar em comunidade".

**Nota 2 — Google Play: "em comunidade".** Cabe em 71 de 80 caracteres. O Android sai depois do iPhone
(meados de outubro), e a intenção é que o Juntos já esteja no build. **Reconferir na véspera do envio:** se
o Juntos ainda estiver escondido, usar a versão "com a sua igreja", pelo mesmo motivo da nota 1.

### Palavras-chave: por que não são as dez que o fundador listou, ao pé da letra

A lista pedida (`Bíblia, leitura bíblica, devocional, 100 dias, fé, cristão, jornada bíblica, oração, igreja,
comunidade cristã`) dá **118 bytes**, e o limite da Apple são **100**. Além disso a Apple indexa
nome + subtítulo + palavras-chave juntos: repetir "jornada", "leitura", "bíblica" e "100 dias" gastaria bytes
sem ganhar alcance. O campo aplicado tem os oito termos restantes do fundador mais cinco que já estavam aqui
e couberam. Sem acento: é como a pessoa digita, e acento custa 2 bytes.

---

## Valores prontos para colar no Google Play Console

Ainda **não existe** arquivo de metadados da Play no projeto (o `store.config.json` do Expo só cobre a Apple).
Até existir, estes são os valores finais:

| Campo do Play Console | Limite | Valor |
|---|---|---|
| Nome do app | 30 | `100 Dias Sem Desistir` |
| Descrição curta | 80 | `100 dias para ler a Bíblia, fortalecer sua fé e caminhar em comunidade.` |
| Descrição completa | 4.000 | a mesma do `store.config.json` (`apple.info.pt-BR.description`), com os `[PREENCHER]` resolvidos |
| Categoria | — | Livros e referências |
| Ícone | 512×512 PNG | derivado de `assets/icone/icone-ios.png` — mesmo desenho, sem redesenhar |

---

## O que mudou em 2026-09-21 (caminho expresso do iPhone)

Decisão do fundador: o iPhone sai primeiro pela **conta Apple de pessoa física do Davi**, com transferência para a
conta da igreja depois. Os textos prontos para colar estão em **`docs/product/LANCAMENTO_EXPRESSO_IOS.md` §4**, que
**prevalece** sobre esta ficha para o primeiro envio. Mudanças em relação ao que está abaixo:

1. **Conta que publica / desenvolvedor exibido (§1):** no caminho expresso é o **nome legal do fundador** (a App Store
   mostra o nome legal da pessoa física como vendedor, FATO, Apple Enrollment, 21/09). Isso só com a autorização
   escrita da igreja cobrindo publicação em conta pessoal, marca e pomba (`LANCAMENTO_EXPRESSO_IOS.md` §2). A regra
   "não usar nome pessoal do Davi" vale de novo depois da transferência.
2. **Identificador:** `com.cemdiassemdesistir.app` (definitivo; não muda nem na transferência).
3. **Comunidade:** aba escondida na V1. Versão A dos questionários (§5) é a que vale; a V1-B de
   `PRIVACIDADE_NAS_LOJAS_rascunho.md` não existe no build de loja (nuvem desligada em release).
4. **Privacidade:** "Dados não coletados". O interruptor "Enviar dados de uso anônimos" saiu do app.
5. **Descrição (§3.3):** "Sua reflexão" saiu da lista do texto expresso até confirmarmos que a tela continua no build;
   "Entrou depois" agora diz que os dias passados continuam abertos (é o comportamento do app). A linha sobre
   abertura dos dias foi corrigida em 23/09: com FUTURE_DAYS_OPEN ligado, os 100 dias abrem a partir do Dia 1 e a
   ficha não pode dizer que cada dia abre na data dele.
6. **Notas para o revisor (§7):** substituídas pela versão em inglês do `LANCAMENTO_EXPRESSO_IOS.md` §4.10, que
   explica a contagem antes de 23/09 e oferece vídeo. A frase "publica na própria conta de organização" **não vale**
   no caminho expresso.
7. **iPad:** `ios.supportsTablet` não declarado = `false` (padrão do Expo SDK 57, FATO, docs Expo 21/09). Só
   capturas de iPhone.
8. **Android:** fora desta semana (conta pessoal nova: teste fechado de 12 pessoas por 14 dias). A parte Google desta
   ficha continua valendo para meados de outubro.
9. **Gate 1 decidido (fundador, 21/09, `DECISOES_DO_FUNDADOR.md` D-2026-09-21-1):** a **Bíblia Livre** entra dentro
   do app numa aba **Bíblia** (CC BY 4.0, empacotada, offline), na V1 se ficar pronta e testada. Com a aba no build,
   a descrição (§3.3) ganha a linha da Bíblia e a linha de crédito, a tabela do §4 muda e entra uma captura (§8.2).
   Sem a aba, tudo abaixo vale como estava. As linhas que dependem disso estão marcadas **[SÓ COM ABA BÍBLIA]**.
10. **Comunidade:** vem como atualização (~2 semanas, meta do fundador), **sem mensagem privada**: "chegar na pessoa"
   é comentar no post dela e Amém. A versão B (§6) só vale nessa atualização; "Mensagens e chat" continua sendo
   pergunta a responder olhando o formulário, porque a Apple inclui "public posting" nessa definição.

---

## 0. Resumo em oito linhas

1. A ficha tem que descrever **o app que existe no dia do envio**, não o que ele vai virar.
2. Gate 1 **decidido em 21/09: Bíblia Livre dentro do app** (aba Bíblia). A ficha só fala nela **se a aba estiver
   no build enviado**; sem a aba, não diz "leia a Bíblia no app". Nunca cita outra tradução (NVI, ARA, NAA…).
3. Hoje **não existe Comunidade.** A ficha não pode falar em feed, amigos, grupos que conversam, "compartilhe".
4. O conteúdo é da igreja e só pode ser publicado com a **autorização escrita** dela (Gate 2). Sem ela, não há ficha.
5. Limites: nome e subtítulo da Apple **30 caracteres**; palavras-chave **100 bytes**; na Google Play, nome **30**,
   descrição curta **80**, descrição longa **4.000** (fontes na §9).
6. Categoria sugerida: **Referência** (Apple) e **Livros e referências** (Google). Nunca "Crianças/Kids".
7. Sem Comunidade, a classificação esperada é **Livre / 4+** (INFERÊNCIA). Com a Comunidade da igreja inteira,
   a App Store Brasil vai para **A16** (13+ fora do Brasil) — isso vem de `docs/product/comunidade/01-lojas.md` §1.5.
8. A lista de capturas de tela está na §8; nenhuma pode mostrar dado real de pessoa, nome de líder sem autorização
   ou texto bíblico.

---

## 1. Identidade na loja

| Campo | Proposta | Observação |
|---|---|---|
| Nome do app (Apple e Google, máx. 30) | **100 dias sem desistir** (21 caracteres) — PROVISÓRIO | Nome final: **[CAMPO: nome aprovado pela igreja]**. Se a igreja quiser o nome dela no título, é ela quem decide e autoriza. |
| Conta que publica | **[CAMPO: razão social da entidade com CNPJ]** | Conta de **Organização** nas duas lojas, em nome da entidade dona do conteúdo (ver `docs/technical/MOBILE_STORE_REQUIREMENTS.md`, Apple 4.2.6 / 5.1.1(ix)). A Google Play mostra nome legal, endereço, e-mail e telefone publicamente. |
| Nome do desenvolvedor exibido | **[CAMPO]** | Deve bater com a entidade. Não usar nome pessoal do Davi nem de pastor. **Exceção temporária (21/09):** no caminho expresso do iPhone é o nome legal do Davi, até a transferência (ver bloco "O que mudou"). |
| URL de suporte | **[CAMPO: página ou e-mail atendido]** | Obrigatória na Apple. Precisa responder de verdade. |
| URL da política de privacidade | **[CAMPO]** | Obrigatória nas duas lojas. Texto em `docs/legal/` (rascunho) após revisão. |
| E-mail de contato | **[CAMPO: e-mail da entidade]** | Público na Google Play. |
| Idioma principal | Português (Brasil) | Distribuição só no Brasil (decisão vigente, PROPOSTA). |

---

## 2. App Store (Apple)

### 2.1 Subtítulo — máximo **30 caracteres** (FATO, Apple, "App information", acesso 2026-09-21)

Opções (contagem com espaços):

| Opção | Caracteres | Comentário |
|---|---|---|
| **Leitura e oração, dia a dia** | 27 | Recomendada. Honesta: o app guia leitura e oração, sem prometer texto. |
| Um dia de cada vez, até o 100 | 29 | Mais emocional; diz menos o que o app faz. |
| Guia diário de intercessão | 26 | Fiel ao nome do material da igreja; esconde a parte da leitura. |

Evitar no subtítulo: "Bíblia completa", "Bíblia NVI", "grátis", "nº 1", "o melhor", "comunidade".

### 2.2 Texto promocional — máximo **170 caracteres** (FATO, Apple, "Platform version information")

Pode ser trocado sem nova versão. Proposta (143 caracteres):

> De 23 de setembro a 31 de dezembro, a igreja caminha junta: a leitura de cada dia, a direção de oração e um lembrete
> na hora que você escolher.

### 2.3 Descrição — máximo **4.000 caracteres**, texto puro, sem HTML (FATO, mesma fonte)

Use a mesma descrição longa da Google Play (§3.3), trocando só o que for específico de loja. A Apple **não** indexa a
descrição para busca da mesma forma que o Google; o que pesa na busca da Apple é nome, subtítulo e palavras-chave
(INFERÊNCIA amplamente aceita; a Apple não publica o algoritmo).

### 2.4 Palavras-chave — máximo **100 bytes**, separadas por vírgula, cada uma com mais de 2 caracteres (FATO, mesma fonte)

Atenção: é limite em **bytes**, não em letras. Letra acentuada (á, ç, ã) ocupa 2 bytes. Proposta sem acento e sem
repetir palavras que já estão no nome e no subtítulo:

```
biblia,plano,intercessao,devocional,igreja,jornada,guia,diario,consagracao,adoracao,capitulos
```

Isso dá **93 bytes** (conferido). **NÃO CONFIRMADO:** se a busca da App Store trata "biblia" e "bíblia" como iguais.
Testar com o app já publicado e ajustar numa versão seguinte.

Não usar como palavra-chave: nomes de outros apps (YouVersion etc.), nomes de traduções que o app não tem (NVI, ARA,
NAA, NTLH, ACF), nomes de pessoas, "grátis". A Apple rejeita metadado com nomes de terceiros ou termos irrelevantes
(Guideline 2.3.7, FATO, App Review Guidelines, acesso 2026-09-21).

### 2.5 Categoria

| | Sugestão | Por quê |
|---|---|---|
| Principal | **Referência (Reference)** | FATO: a Apple cita "religion" entre os exemplos de Referência ("Choosing a category", acesso 2026-09-21). |
| Secundária | **Estilo de vida (Lifestyle)** | Opção comum para apps de fé; é "general-interest subject matter". |
| **Nunca** | **Crianças (Kids)** | Categoria Kids tem regras próprias (sem analytics de terceiros, portões para pais etc.) e o app não foi feito para ela. Também não sugerir público infantil fora dela (Apple 2.3.8 / 5.1.4, ver `MOBILE_STORE_REQUIREMENTS.md`). |
| Não usar | Livros (Books) | Pela definição da Apple, Books é para conteúdo de livro com interatividade — e o app não mostra o texto. Reforça o risco da regra 4.2 ("app que é só um livro"). **Nota 21/09:** mesmo com a aba Bíblia, continua Referência: o centro é o guia da campanha, e Books reforçaria a leitura "só um livro". |
| Só se a Comunidade existir | Redes sociais (Social Networking) | Não recomendado nem assim: o centro do produto continua sendo a jornada. |

---

## 3. Google Play

### 3.1 Nome — máximo **30 caracteres** (FATO, Play Console Help "Add preview assets", acesso 2026-09-21)

**100 dias sem desistir** (21) — PROVISÓRIO. O Google proíbe emoji, caixa alta de efeito e termos de ranking/preço no
nome (mesma fonte e política de metadados).

### 3.2 Descrição curta — máximo **80 caracteres** (FATO, mesma fonte)

| Opção | Caracteres |
|---|---|
| **Leitura do dia, direção de oração e lembrete: 100 dias caminhando juntos.** | 73 |
| Guia diário da campanha: capítulos do dia, intercessão, reflexão e lembrete. | 76 |

### 3.3 Descrição longa — máximo **4.000 caracteres** (FATO, mesma fonte)

Proposta (≈1.400 caracteres com os campos ainda vazios; cabe nas duas lojas). Trechos entre colchetes dependem da igreja. O negrito é só deste documento: as lojas recebem texto puro.

> **100 dias sem desistir** é o guia da campanha [CAMPO: nome da campanha] da [CAMPO: nome da igreja], de 23 de
> setembro a 31 de dezembro de 2026.
>
> Todo dia o app mostra, num lugar só:
>
> • **A leitura do dia** — quais capítulos ler hoje, dentro do plano da igreja para os 100 dias. Leia na sua Bíblia
> e marque como lido.
> • **A direção de oração** — o monte, a ênfase, o versículo-base e os motivos de intercessão do dia, do guia
> preparado pela igreja.
> • **Modo altar** — letra grande, passo a passo, tela que não apaga: para orar sozinho, em família ou no altar.
> • **Sua reflexão** — um espaço para escrever o que Deus falou com você. Fica só no seu celular.
> • **Lembrete diário** — na hora que você escolher. Um por dia, sem insistência.
> • **Meu ministério** — escolha o seu e veja os dias em que ele conduz o altar.
> • **[SÓ COM ABA BÍBLIA] A Bíblia no app** — leia qualquer livro e capítulo na Bíblia Livre, sem internet.
>
> **Entrou depois do começo?** Tudo bem. O app começa no dia de hoje, sem cobrança pelos dias que passaram.
>
> **Funciona sem internet e sem cadastro.** Seu progresso e suas reflexões ficam no seu aparelho. Não pedimos nome,
> e-mail nem telefone para usar.
>
> **Acessível:** respeita o tamanho de letra do seu celular e o modo escuro.
>
> O conteúdo do guia é da [CAMPO: nome da igreja] e é usado com autorização dela.
>
> **[SÓ COM ABA BÍBLIA]** Texto bíblico: Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, licença
> Creative Commons Atribuição 4.0 (CC BY 4.0), obtida em ebible.org. Créditos completos dentro do app.
>
> Dúvidas: [CAMPO: e-mail de suporte]. Privacidade: [CAMPO: URL da política].

**Atribuição CC BY na ficha — a licença pede? (INFERÊNCIA, não parecer):** a CC BY 4.0 (§3(a)) exige o crédito
quando o material é **compartilhado**, "de forma razoável ao meio". Quem distribui o texto é o **app**, então o
crédito obrigatório fica **dentro do app** (tela de créditos com título, titulares, licença com link, fonte, data da
versão e aviso de alteração, se houver). A ficha não reproduz o texto, então a licença **não exige** a linha na
descrição; ela entra mesmo assim porque é curta, é correta e mostra ao revisor de onde vem o texto (Apple 5.2.1).
Se alguma captura mostrar versículos, o crédito "BLIVRE" deve estar visível na própria captura ou na legenda.

Antes de enviar, conferir cada item contra o app real do envio: se "Meu ministério", "Modo altar" ou o lembrete não
estiverem na versão, a linha sai. Se o passo de jejum for mantido (pergunta 5 do `PLANO_FASE_FINAL_100_DIAS.md`),
entra uma linha; se não, não entra.

### 3.4 Categoria e tags

- **Categoria sugerida: Livros e referências (Books & Reference).** FATO: o Google não tem categoria de religião; os
  exemplos de "Books and Reference" incluem obras de referência (Play Console Help, "Choose a category and tags",
  acesso 2026-09-21). Alternativa: **Estilo de vida**.
- **Não** entrar no programa "Designed for Families" nem marcar público-alvo abaixo de 13 anos sem decisão explícita:
  isso aciona as Políticas para Famílias (ver `01-lojas.md`, [G5]).
- Público-alvo declarado no Play Console: **INFERÊNCIA/RECOMENDAÇÃO:** 18+ se a Comunidade existir (conta só 18+);
  sem Comunidade, "13 a 15, 16 a 17, 18+" ou só adultos — **decisão jurídica** (ECA Digital), não desta ficha.

---

## 4. O que dizer e o que NÃO dizer

| Dizer | NÃO dizer (enquanto for verdade o motivo) | Motivo |
|---|---|---|
| "a leitura do dia", "quais capítulos ler hoje", "leia na sua Bíblia" | "leia a Bíblia no app", "Bíblia completa", "Bíblia offline", "áudio da Bíblia", "versão NVI/ARA/NAA…" | **Gate 1** (sem a aba Bíblia no build): o app não mostra texto bíblico. Prometer o que o app não faz é metadado enganoso (Apple 2.3.1/2.3.7; política de metadados do Google). |
| **[SÓ COM ABA BÍBLIA]** "a Bíblia Livre no app", "sem internet", "qualquer livro e capítulo" | "áudio da Bíblia", "várias versões", qualquer outra tradução pelo nome; "Bíblia completa" antes de conferir no build que os 66 livros abrem | Gate 1 decidido em 21/09 (b1). Dizer o nome da tradução que o app **tem** é informação, não marca de terceiro. Ler na aba **não** conclui dias: não sugerir que ler lá "cumpre o plano". |
| "o guia de intercessão da igreja", "material da igreja, usado com autorização" | qualquer frase antes de existir a **autorização escrita** (Gate 2) | Sem ela, o build de release nem abre. |
| "você não caminha sozinho", "a igreja inteira no mesmo dia" (sentido de campanha) | "comunidade", "feed", "compartilhe", "converse", "amigos", "grupos", "curta", "Amém dos irmãos" | **Comunidade não existe.** Só entra na ficha na mesma versão em que ela for ao ar. |
| "sem cadastro", "funciona offline", "fica no seu celular" | "100% seguro", "nunca coletamos nada" | Verdadeiro hoje; frase absoluta vira problema quando houver conta/servidor. Revisar a cada versão. |
| "no seu ritmo", "um lembrete por dia" | "não quebre sua sequência", "ranking", "conquistas", "desafio" | Sem mecânica compulsiva (ECA Digital; decisão vigente). "Sem desistir" no nome é convite, não placar. |
| "para toda a igreja" | "para crianças", "infantil", "kids" (também em imagens) | Sugerir público infantil fora da categoria Kids é vedado (Apple 2.3.8). |
| O nome da igreja, **se a igreja autorizar por escrito** | Marcas de terceiros: YouVersion, nomes de traduções, logotipos de sociedades bíblicas, "Bible App", ícones parecidos | Marca de terceiro (Apple 4.1/5.2.1; política de propriedade intelectual do Google). |
| — | "grátis", "nº 1", "o melhor", "novo", depoimentos, preço nas imagens | Proibido em ícone/imagens da Google Play (FATO, "Preview assets") e desaconselhado pela Apple 2.3.7. |
| — | Nomes de líderes em texto ou captura | Só com `leader_names_authorized`; mesmo assim, não é necessário na loja. |

---

## 5. Questionário de classificação etária — **versão A: sem Comunidade** (a V1 atual)

**Tudo aqui é INFERÊNCIA** a partir do app de hoje. As perguntas exatas só aparecem dentro do App Store Connect e do
Play Console; responder olhando o formulário real, na versão que for enviada.

### 5.1 Apple (questionário de 2025, com as perguntas de "social media" obrigatórias desde set/2026 — ver `01-lojas.md` [A3][A6])

| Grupo de perguntas | Resposta provável | Observação |
|---|---|---|
| Controles no app (controle parental, verificação de idade) | Não | O app não tem conta. |
| Acesso irrestrito à web | Não | Só abre links fixos (política, orientação da igreja). Conferir se algum link abre navegador livre. |
| Conteúdo gerado por usuário (UGC) | **Não** | A reflexão é privada e fica só no aparelho; ninguém mais vê. **NÃO CONFIRMADO** como a Apple enquadra notas privadas (lacuna já listada em `MOBILE_STORE_REQUIREMENTS.md`). |
| Mensagens e chat | Não | |
| **Social media** | **Não** | Não existe feed. |
| Publicidade | Não | |
| Violência, horror, sexualidade/nudez, palavrões | Nenhum | **Revisar o `dataset.json`**: motivos de oração podem citar vícios, violência, abuso. Mencionar um tema para orar não é "retratar"; se algo for descritivo, avaliar "raro/leve". |
| Álcool, tabaco, drogas | Nenhum (ver linha acima) | Idem. |
| Temas médicos ou de bem-estar | Nenhum | O app não dá orientação médica. Se o jejum ficar, **não** apresentar como prática de saúde. |
| Jogos de azar, concursos, "loot boxes" | Não | |

**Resultado esperado:** **4+** no mundo e **Livre (L)** no Brasil. INFERÊNCIA.

### 5.2 Google Play (questionário IARC; no Brasil emite a classificação ClassInd — `01-lojas.md` [G7][G8])

| Pergunta | Resposta provável |
|---|---|
| Tipo de app | "Referência, notícias ou educacional" (ou "outros tipos de app") — escolher a que o formulário oferecer |
| Violência, sexo, linguagem, substâncias, jogos de azar | Não (mesma ressalva do dataset acima) |
| Usuários interagem ou trocam conteúdo | **Não** |
| Compartilha localização com outros usuários | Não |
| Compras digitais | Não |
| Acesso irrestrito à internet | Não |

**Resultado esperado:** **Livre**, sem elementos interativos. INFERÊNCIA.

---

## 6. Questionário de classificação etária — **versão B: com Comunidade** (só quando ela for ao ar)

Pressupõe o desenho recomendado em `docs/product/comunidade/00-DECISOES.md`: feed da igreja inteira com código de
entrada, foto e texto, Amém sem contagem, comentários, denúncia e bloqueio, conta 18+ para ler e publicar.

### 6.1 Apple

| Grupo | Resposta | Observação |
|---|---|---|
| Controles no app | **Sim** — verificação de idade | Idade declarada no cadastro + **Declared Age Range API** antes de mostrar o feed (`01-lojas.md` §1.5). |
| UGC | **Sim** | Fotos e textos vistos por outras pessoas. |
| Mensagens e chat | **Sim** | A Apple inclui "public posting" nessa definição. |
| **Social media** | **Sim** | Feed que espalha conteúdo para muitos usuários, com interação ("likes, comments"). Amém sem número **continua** sendo interação. Responder "não" seria declaração falsa (`00-DECISOES.md`). |
| "Social media desligado para menores de 13" | Pode marcar (a regra é 18+) | **No Brasil não reduz a faixa:** as duas opções levam a A16. |
| Demais grupos | Como na versão A | |

**Resultado:** **13+ no mundo e A16 na App Store Brasil** (FATO sobre as regras [A3][A4]; INFERÊNCIA de alta confiança
sobre o enquadramento deste app, `01-lojas.md` §1.5).

**Consequência A16 — em linguagem simples:**

- A página do app na App Store do Brasil passa a mostrar **16 anos** e o selo **"Social Media"**.
- Isso vale para o **app inteiro**, não só para a aba da Comunidade — inclusive para quem só quer a leitura do dia.
- Celulares de crianças e adolescentes com limite de idade configurado pelos pais (Compartilhamento Familiar / Tempo
  de Uso) abaixo de 16 **podem não conseguir baixar ou abrir** o app. **NÃO CONFIRMADO** exatamente como o iPhone
  aplica a faixa A16 a contas infantis: testar com uma conta infantil real antes de lançar a Comunidade.
- O bloqueio automático da Apple no Brasil é para apps **18+** (FATO [A8]); A16 não chega a isso.
- Para uma campanha "de criança a idoso", isso é **decisão de produto**, não detalhe técnico: a igreja precisa saber
  antes, e o texto da ficha, dos termos e da página para pais muda junto. Alternativa já levantada: feed só do grupo
  pequeno, que **talvez** fique em 4+ — **NÃO CONFIRMADO** (a Apple não define "muitos usuários").

### 6.2 Google Play

| Pergunta | Resposta |
|---|---|
| Usuários interagem ou trocam conteúdo | **Sim** |
| Compartilha fotos/imagens de usuários | **Sim** |
| Demais | Como na versão A |

**Resultado:** **NÃO CONFIRMADO.** O mais provável é a faixa continuar baixa e aparecer o elemento interativo
"Usuários interagem" (`01-lojas.md` §2.6), mas só o formulário real mostra. Reenviar o questionário **na mesma versão**
em que a Comunidade entrar, junto com o formulário de Segurança dos dados (Nome, Fotos, Outro conteúdo do usuário,
**Crenças religiosas**).

### 6.3 O que muda na ficha quando a Comunidade entrar

- Descrição ganha um bloco "Comunidade da igreja" que diz **para quem é** (18+, com código da igreja), **que tudo é
  revisado antes de aparecer** e **como denunciar e bloquear**.
- Categoria continua Referência / Livros e referências.
- Capturas novas (§8.2).
- A App Store passa a exibir o selo "Social Media"; a descrição não deve disfarçar isso.

---

## 7. Notas para a revisão da Apple e do Google (não aparecem na loja)

Rascunho da "nota para o revisor" (Apple, "App Review Information"):

> O app é o guia da campanha de 100 dias da [CAMPO: igreja], dona do conteúdo, que publica na própria conta de
> organização. O app indica a leitura diária (referências de capítulos) e a direção de oração; não exibe texto de
> tradução bíblica nesta versão. Não há login, compras ou conteúdo gerado por usuário. Funciona offline. As datas da
> campanha começaram em 23/09/2026: o app abre no dia atual; os dias futuros ficam fechados até a data deles.

Isso responde de antemão à dúvida da regra 4.2 ("funcionalidade mínima") e 4.3 (muitos apps de Bíblia): o diferencial
é a jornada própria da igreja, o modo altar, o lembrete e o ministério. **Com Comunidade**, a Apple exige **conta de
demonstração e servidor ligado** na revisão (`01-lojas.md` [A1] §2.1): **[CAMPO: login de teste]**.

---

## 8. Capturas de tela necessárias

### 8.1 Especificações (FATO, fontes na §9)

| Loja | O que é obrigatório |
|---|---|
| Apple — iPhone | De **1 a 10** capturas no tamanho **6,9"** (ex.: 1320 × 2868 px) **ou** 6,5" (ex.: 1284 × 2778 px). JPG ou PNG, sem transparência. |
| Apple — iPad | **Obrigatório se o app declara suporte a iPad**, tamanho 13" (2064 × 2752 px). O `app.config.ts` não declara `supportsTablet`, e o padrão do Expo SDK 57 é `false` (FATO, docs Expo, 21/09): **só iPhone**, sem capturas de iPad. |
| Google — telefone | Mínimo **2** (somando tipos de aparelho), máximo **8** por tipo; lado entre 320 e 3840 px, lado maior no máximo 2× o menor. Recomendado **4 ou mais** com 1080 px ou mais. |
| Google — ícone | 512 × 512 px, PNG 32 bits, até 1 MB, sem selos de ranking/preço. |
| Google — imagem de destaque | 1024 × 500 px, JPG ou PNG 24 bits (sem transparência), sem "melhor", "nº 1", "novo", "grátis". |
| Google — tablets | Opcional; só se quiser aparecer como app para tablet. |

### 8.2 Lista de capturas (ordem sugerida; mesma sequência nas duas lojas)

**Versão A — sem Comunidade (V1):**

| # | Tela | Legenda sugerida (curta, sem promessa) | Cuidados |
|---|---|---|---|
| 1 | **Início** do dia (monte, ênfase, leitura do dia, versículo-base) | "Cada dia, o que ler e por que orar." | Usar um dia **real do dataset**, já passado ou o de hoje. Sem nome de líder. |
| 2 | **Intercessão do dia** (os 5 passos) | "A direção de oração da igreja, passo a passo." | Texto do guia **exatamente** como está no dataset. |
| 3 | **Modo altar** | "Letra grande para orar em família ou no altar." | Mostra acessibilidade de verdade. |
| 4 | **Leitura do dia** (capítulos, marcar como lido) | "Leia na sua Bíblia e marque como lido." | **Não mostrar** a faixa "texto ainda não liberado" como se fosse defeito, nem texto bíblico de qualquer tradução. Se o Gate 1 fechar antes, refazer. **(21/09: Gate 1 fechado em b1; refazer conforme o leitor do build.)** |
| 4b | **[SÓ COM ABA BÍBLIA] Aba Bíblia** com um capítulo aberto | "A Bíblia Livre no seu celular, sem internet." | Só texto da Bíblia Livre; crédito "BLIVRE" visível na tela ou na legenda. Nenhuma outra tradução, nenhum logo de terceiro. |
| 5 | **Jornada / régua dos 100 dias** | "Entrou depois? Comece de hoje." | Progresso de exemplo; dias futuros fechados, como no app. |
| 6 | **Reflexão** | "Escreva o que Deus falou. Fica só no seu celular." | Texto de exemplo neutro, escrito pela equipe — **nunca** reflexão de pessoa real. |
| 7 | **Lembrete** | "Um lembrete por dia, na hora que você escolher." | |
| 8 | **Meu ministério** | "Veja os dias em que o seu ministério conduz o altar." | Escolher um ministério; **sem** nomes de líderes. |
| (opc.) | Modo escuro de uma das telas acima | — | Só se couber no limite. |

**Versão B — com Comunidade (acrescentar, sem passar de 10 na Apple / 8 no Google):**

| # | Tela | Cuidados |
|---|---|---|
| C1 | Feed da igreja com publicações de exemplo | Fotos e textos **criados pela equipe com autorização de imagem**; nunca pessoa real sem consentimento escrito; nada de criança nas fotos. |
| C2 | Publicar (com aviso de que tudo é revisado antes de aparecer) | Mostra a pré-aprovação. |
| C3 | Denunciar / bloquear | Mostra segurança; ajuda a revisão. |

### 8.3 Regras para todas as capturas

- Tirar de **build de release autorizado** (sem banner DEV, sem fixtures `DEV_ONLY`). Fixture DEV nunca vai para a loja.
- Nada de dados pessoais reais, notificações de outros apps, operadora ou hora que denuncie teste.
- Molduras e legendas podem existir, mas **sem** preço, ranking, depoimento ou chamada do tipo "baixe já" (Google).
- Nada que imite marca, ícone ou visual de outro app bíblico.

---

## 9. Fontes (todas acessadas em 2026-09-21)

**Apple**
- App Store Connect Help — "App information" (nome 30, subtítulo 30, categorias): https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- App Store Connect Help — "Platform version information" (texto promocional 170, descrição 4.000, palavras-chave 100 bytes): https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- App Store Connect Help — "Screenshot specifications": https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- "Choosing a category": https://developer.apple.com/app-store/categories/
- App Review Guidelines (2.3.1, 2.3.7, 2.3.8, 4.1, 4.2, 4.3, 5.1.4, 5.2.1): https://developer.apple.com/app-store/review/guidelines/
- Classificação etária e "Social Media"/A16: fontes [A3], [A4], [A6], [A8] listadas em `docs/product/comunidade/01-lojas.md`.

**Google**
- Play Console Help — "Add preview assets to showcase your app" (nome 30, curta 80, longa 4.000): https://support.google.com/googleplay/android-developer/answer/9859152
- Play Console Help — especificações de ícone, imagem de destaque e capturas: https://support.google.com/googleplay/android-developer/answer/9866151
- Play Console Help — "Choose a category and tags for your app": https://support.google.com/googleplay/android-developer/answer/9859673
- Classificação IARC/ClassInd e requisitos do Brasil: fontes [G5], [G7], [G8] listadas em `docs/product/comunidade/01-lojas.md`.

**Internas:** `CLAUDE.md`, `docs/technical/MOBILE_STORE_REQUIREMENTS.md`, `docs/product/PLANO_FASE_FINAL_100_DIAS.md`,
`docs/product/comunidade/00-DECISOES.md`, `docs/product/comunidade/01-lojas.md`.

---

## 10. Campos que a igreja precisa preencher

- [CAMPO] Nome definitivo do app (e se o nome da igreja aparece nele — com autorização escrita)
- [CAMPO] Nome da campanha e da igreja como devem aparecer
- [CAMPO] Razão social e CNPJ da entidade que publica; endereço e telefone públicos (Google Play)
- [CAMPO] E-mail e URL de suporte atendidos
- [CAMPO] URL da política de privacidade publicada
- [CAMPO] Autorização escrita para publicar o guia e a escala (Gate 2)
- [CAMPO] Resposta sobre o jejum (entra ou não na descrição)
- [CAMPO] Login de teste para a revisão (só com Comunidade)
- [CAMPO] Autorização de imagem das pessoas nas capturas da Comunidade (só com Comunidade)
