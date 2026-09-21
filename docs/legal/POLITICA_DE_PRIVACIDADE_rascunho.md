# Política de Privacidade do app "[NOME DO APP]": RASCUNHO

> **ATENÇÃO: ISTO É UM RASCUNHO, NÃO É PARECER JURÍDICO.**
> Foi escrito pela equipe técnica (Claude, Principal Mobile Engineer) em 2026-09-21 para que um **advogado** revise,
> corrija e aprove antes de publicar. Nenhum trecho deve ir ao ar sem essa revisão. Os campos entre colchetes
> (`[ASSIM]`) precisam ser preenchidos pela igreja: não inventamos nome, CNPJ, endereço ou contato de ninguém.
> É um modelo interno para a igreja adaptar; não copia nem imita documento de outra organização.

**Como este arquivo está organizado**

- **Parte 1:** a política para o app **como ele é hoje** (sem conta, sem servidor). É esta que vai para as lojas na
  primeira versão.
- **Parte 2:** o que **entra** na política quando existirem conta e Comunidade. **Não publicar a Parte 2 antes de a
  função existir de verdade**: descrever coleta que não acontece também é declaração falsa.
- **Parte 3:** tabela para preencher os rótulos de privacidade da App Store e a seção "Segurança dos dados" (Data
  safety) do Google Play.
- **Anexo A:** o que conferimos no código, para o advogado e para quem for preencher as lojas.
- **Anexo B:** fontes, com data de acesso.

As notas marcadas com **[NOTA PARA A IGREJA/ADVOGADO]** são instruções internas: **apagar antes de publicar**.

> **Atualização de 2026-09-21 — caminho expresso (pessoa física).** Por decisão do fundador, a primeira versão do
> iPhone sai pela **conta Apple de pessoa física do fundador**, com transferência para a conta da igreja depois
> (`docs/product/LANCAMENTO_EXPRESSO_IOS.md`). Enquanto for assim, **o controlador é o fundador**, não uma pessoa
> jurídica: use os campos `[NOME]` e `[E-MAIL]` na Parte 1 e ignore `[CNPJ]` e `[ENDEREÇO DO CONTROLADOR]`.
> Quando o app for transferido para a entidade, a Parte 1 volta a ter `[CONTROLADOR]` e `[CNPJ]` e a versão muda.
> O interruptor "Enviar dados de uso anônimos" **saiu do app** (código de 21/09); a seção 6 foi reescrita.

---

## Campos a preencher (lista única)

| Campo | O que é | Quem fornece |
|---|---|---|
| `[NOME DO APP]` | Nome que vai aparecer nas lojas | Igreja / fundador |
| `[NOME]` | **Caminho expresso:** nome civil completo do fundador, controlador enquanto o app estiver na conta pessoal dele (é o mesmo nome que a App Store mostra como vendedor) | Fundador |
| `[E-MAIL]` | **Caminho expresso:** e-mail que o fundador lê todo dia, para dúvidas e pedidos sobre dados | Fundador |
| `[CONTROLADOR]` | Depois da transferência: razão social da pessoa jurídica dona do app (quem responde pelos dados perante a lei) | Igreja |
| `[CNPJ]` | Depois da transferência: CNPJ do controlador | Igreja |
| `[ENDEREÇO DO CONTROLADOR]` | Depois da transferência: endereço completo da sede | Igreja |
| `[ENCARREGADO]` | Nome da pessoa (ou empresa) encarregada de dados pessoais (LGPD art. 41). No caminho expresso, o próprio fundador | Igreja / fundador |
| `[E-MAIL DE PRIVACIDADE]` | E-mail lido todo dia para pedidos sobre dados (no caminho expresso, é o `[E-MAIL]`) | Igreja (domínio próprio) |
| `[CANAL ALTERNATIVO]` | Telefone, formulário ou endereço para quem não usa e-mail | Igreja |
| `[URL DA POLÍTICA]` | Endereço público onde esta política fica publicada | Igreja / equipe técnica |
| `[URL DE EXCLUSÃO]` | Página web "Excluir minha conta" (só na Parte 2) | Equipe técnica |
| `[DATA DE VIGÊNCIA]` | Data em que esta versão passa a valer | Advogado |
| `[VERSÃO]` | Número da versão desta política | Equipe técnica |
| `[PRAZO DE RETENÇÃO ...]` | Prazos de guarda depois da exclusão (Parte 2) | **Advogado** |
| `[DATA DE ENCERRAMENTO DA COMUNIDADE]` | Data anunciada para apagar o feed, se essa for a decisão | Fundador / igreja |

---

# PARTE 1: o app como é hoje

## 1. Quem somos

O aplicativo **[NOME DO APP]** é publicado por **[NOME]**, pessoa física, membro da **[NOME DA IGREJA]**, que
responde por este app e por esta política. Nesta política, "nós" é [NOME] e "você" é quem usa o app. O conteúdo do
guia é da [NOME DA IGREJA] e é usado com autorização dela.

**[NOTA PARA A IGREJA/ADVOGADO: texto do caminho expresso. Quando o app for transferido para a entidade, trocar por:
"é oferecido por [CONTROLADOR], inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO DO CONTROLADOR]" e publicar
como nova versão. Advogado: confirmar se a pessoa física publicadora é controladora mesmo sem receber nenhum dado.]**

O app acompanha a leitura bíblica da campanha **"100 dias"** da igreja, de 23/09/2026 a 31/12/2026.

## 2. O resumo, em poucas linhas

- **Você não precisa criar conta.** O app funciona inteiro sem cadastro e sem internet.
- **O que você anota fica no seu celular.** Sua leitura, sua reflexão, seu jejum e suas preferências ficam guardados
  **só no seu aparelho**. Nós **não recebemos** esses dados. Não temos servidor que os guarde.
- **Nenhuma análise de uso é enviada.** Não usamos ferramentas de estatística, publicidade ou rastreamento.
- **Os lembretes são do próprio celular.** Eles são programados no aparelho e não passam por nós.
- **Para apagar tudo, basta desinstalar o app** (ou limpar os dados dele nas configurações do celular).

## 3. O que fica guardado no seu celular (e nunca sai dele)

Tudo abaixo é gravado **apenas na memória do seu aparelho**, dentro da área reservada ao app. Não é enviado para nós
nem para ninguém.

| O que | Para quê |
|---|---|
| Os dias que você marcou como lidos | Mostrar seu caminho nos 100 dias |
| Sua **reflexão** de cada dia (o texto que você escreve) | Você reler depois. **Ninguém mais vê.** |
| Seu registro de **jejum**, se você ativar | Acompanhar sua decisão pessoal. **Ninguém mais vê.** |
| Onde você parou na leitura | Voltar ao mesmo ponto |
| Preferências: forma de leitura, tamanho da letra, horário do lembrete, ministério escolhido, marcos já vistos | Deixar o app do seu jeito |

**Por que falamos disso se nada sai do aparelho?** Porque sabemos que anotações sobre leitura bíblica, oração e jejum
dizem respeito à sua fé, e a lei trata convicção religiosa como **dado pessoal sensível** (LGPD, art. 5º, II). Por
isso decidimos que esses dados **ficam só com você**.

**Cuidados que valem para você:**

- Quem tiver acesso ao seu celular desbloqueado pode abrir o app e ver o que você escreveu. Use o bloqueio de tela do
  aparelho.
- No **iPhone**, o backup do próprio celular (iCloud ou computador) pode copiar os dados dos apps, inclusive deste,
  para a sua conta pessoal na Apple. Isso é configurado por você no celular, não por nós, e nós não temos acesso a
  esse backup. No **Android**, este app não entra no backup automático do Google.
  **[NOTA PARA A IGREJA/ADVOGADO: Android: `android.allowBackup: false` confirmado no `app.config.ts` (FATO,
  `docs/technical/BUILD_E_IDENTIFICADORES.md`, "Backup do Android"). iPhone: INFERÊNCIA, não verificado em
  aparelho, de que os dados entram no backup do iCloud; não há opção de configuração do Expo para excluir.]**

## 4. O que o app NÃO faz

- **Não pede** nome, e-mail, telefone, CPF, data de nascimento, foto ou localização.
- **Não usa** câmera, microfone, contatos nem localização.
- **Não tem** anúncios, nem ferramentas de publicidade, nem rastreamento entre apps e sites.
- **Não vende nem compartilha** dados, porque não recebe dados seus.
- **Não usa inteligência artificial** para ler o que você escreve.
- **Não baixa conteúdo da internet** durante o uso: o guia da campanha e as fontes de letra vêm dentro do app.
  O app só sai de si mesmo quando você pede: tocar no link desta política abre o seu navegador, e tocar no e-mail
  de contato abre o seu aplicativo de e-mail. O que você escrever nesse e-mail vai direto para [E-MAIL], pelo seu
  próprio aplicativo de e-mail.

## 5. Notificações (lembretes)

Se você **pedir**, o app programa lembretes **no próprio celular**:

- o lembrete diário da leitura, no horário que você escolher;
- o aviso na véspera do dia do seu ministério, se você escolher um ministério;
- o aviso do altar do meio-dia, se você ligar essa opção.

O celular só mostra lembretes depois que você autoriza, na janela de permissão do próprio sistema. Você pode desligar
a qualquer momento no app ou nas configurações do celular. Esses lembretes **não passam por servidor nosso** e não
registram se você os abriu. Não enviamos notificações "de fora" (push remoto).

## 6. Estatísticas de uso

O app **não tem** ferramenta de estatística de uso e não envia nenhum dado sobre como você usa o app. Se um dia isso
mudar, esta política será atualizada **antes**, dizendo qual ferramenta, quais dados e para quê, e a função virá
**desligada** até você decidir ligar. Reflexão, jejum e textos que você escreve **nunca** farão parte desses dados.

**[NOTA PARA A IGREJA/ADVOGADO: a chave "Enviar dados de uso anônimos" saiu do app em 2026-09-21 (FATO,
`src/analytics/analytics.ts`: o registro de eventos só liga em desenvolvimento; em release não grava nada). Por isso
esta seção não fala mais de chave.]**

## 7. O que as lojas e o celular fazem por conta própria

Ao baixar o app, a **Apple** (App Store) ou o **Google** (Google Play) tratam dados seus, como a sua conta na loja e
estatísticas de instalação, segundo as políticas deles, e não as nossas. Essas empresas podem nos mostrar números
**agregados** (por exemplo, quantas instalações houve), sem identificar você. Se você permitir no seu celular que
relatórios de erro sejam compartilhados com desenvolvedores, podemos receber relatórios de falha técnica **pela loja**,
sem o conteúdo que você escreveu.
**[NOTA PARA A IGREJA/ADVOGADO: confirmar com a equipe técnica o que o App Store Connect e o Play Console mostram, e
se isso muda a Parte 3.]**

## 8. Crianças e adolescentes

O app é para a igreja inteira, **de criança a idoso**. Na versão atual ele **não coleta dados pessoais de ninguém**,
de nenhuma idade, e não tem área onde pessoas conversem entre si. Pais e responsáveis podem ver, no próprio aparelho do
filho, tudo o que foi guardado, e apagar tudo desinstalando o app.
**[NOTA PARA O ADVOGADO: avaliar se o ECA Digital (Lei 15.211/2025, art. 16) exige, mesmo nesta versão, uma página
pública para pais acessível sem instalar o app. A pesquisa interna (`docs/product/comunidade/02-lei.md`) indica que
sim quando houver comunidade.]**

## 9. Como apagar seus dados

Como tudo fica no seu celular, **você tem controle total**:

- **Desinstale o app**: os dados dele são apagados do aparelho.
- Ou, no Android, **Configurações > Apps > [NOME DO APP] > Armazenamento > Limpar dados**.
- Se o backup automático do celular estiver ligado, apague também o backup na sua conta Apple ou Google, se quiser.

Nós **não conseguimos** apagar, ver ou recuperar esses dados por você, porque eles nunca chegam até nós. Pelo mesmo
motivo, **se você trocar ou perder o celular, as anotações não voltam** (a menos que estejam no backup do seu próprio
aparelho).

## 10. Seus direitos

A LGPD (art. 18) garante direitos a você sobre seus dados pessoais: saber se tratamos dados seus, ter acesso, corrigir,
apagar, entre outros. Nesta versão, **não tratamos dados pessoais seus** fora do seu aparelho. Mesmo assim, se tiver
qualquer dúvida, fale com o encarregado (seção 12). Você também pode reclamar à **Autoridade Nacional de Proteção de
Dados (ANPD)**.

## 11. Mudanças nesta política

Se o app passar a coletar qualquer dado (por exemplo, quando existir conta), **atualizaremos esta política antes** e
avisaremos **dentro do app**. Para dado sobre fé, pediremos o seu **consentimento próprio e destacado** antes de
coletar qualquer coisa. Nada muda sem você saber.

## 12. Contato e encarregado de dados

- **Responsável pelo app e por esta política:** [NOME].
- **E-mail:** [E-MAIL].

**[NOTA PARA A IGREJA/ADVOGADO: caminho expresso. Depois da transferência para a entidade, voltar a:
"Controlador: [CONTROLADOR], CNPJ [CNPJ], [ENDEREÇO DO CONTROLADOR]. Encarregado: [ENCARREGADO]. E-mail:
[E-MAIL DE PRIVACIDADE] · Outro canal: [CANAL ALTERNATIVO]." Advogado: confirmar se pessoa física que não recebe
dado nenhum precisa nomear encarregado (LGPD art. 41; a ANPD dispensa agentes de pequeno porte em certos casos —
não conferido hoje).]**

Versão [VERSÃO], em vigor desde [DATA DE VIGÊNCIA]. Endereço desta política: [URL DA POLÍTICA].

---

# PARTE 2: quando existirem conta e Comunidade

> **[NOTA PARA A IGREJA/ADVOGADO]** Esta parte **substitui e amplia** a Parte 1 no dia em que a conta e a Comunidade
> forem ligadas. Ela segue as recomendações do memorando `docs/product/comunidade/00-DECISOES.md` (2026-09-21):
> alcance "igreja inteira com código de entrada", conta só para maiores de 18 anos para ler e publicar, fotos aprovadas
> por uma pessoa da igreja antes de aparecer, filtro automático de texto, servidor em São Paulo. **Essas decisões ainda
> não foram tomadas.** Se o fundador escolher outro caminho, esta parte muda. Os trechos entre `{chaves}` dependem de
> decisão.

## 13. O que continua igual

- O app **continua funcionando sem conta**. Conta só é pedida quando você quer usar a Comunidade.
- Sua **reflexão privada** e seu **jejum** continuam **só no seu celular**, mesmo com conta. **Nunca vão para o
  servidor**, nem para a Comunidade, nem para líderes.
- {Seus dias lidos continuam só no seu celular.} **[NOTA: se um dia houver sincronização de progresso entre aparelhos,
  isso exige consentimento próprio e esta frase muda.]**
- Nada do que você escreve em particular vira público sozinho: publicar na Comunidade é sempre um texto novo, que você
  escreve e envia de propósito.

## 14. Quem pode ter conta

A conta e a Comunidade são **só para maiores de 18 anos**. No cadastro, pedimos que você informe a sua faixa de idade, e
o app pode consultar o sinal de faixa etária oferecido pelo próprio celular ou pela loja. Se houver indicação de que a
pessoa tem menos de 18 anos, a Comunidade não é liberada. Crianças e adolescentes continuam usando todo o resto do app,
como na Parte 1.

## 15. O que passa a ir para o servidor

| Dado | Quando | Para quê |
|---|---|---|
| **E-mail** | Ao criar conta ou entrar | Enviar o código de acesso de 6 dígitos e identificar sua conta |
| **Identificador da conta** (um código aleatório) | Ao criar conta | Ligar suas publicações a você |
| **Nome de exibição** e **foto de perfil** (se você puser) | Ao preparar seu perfil na Comunidade | Mostrar quem publicou |
| **Faixa de idade** declarada | No cadastro | Liberar a Comunidade só para maiores de 18 |
| **Código de entrada** da igreja usado | Ao entrar na Comunidade | Garantir que só pessoas da igreja vejam as publicações |
| **Registro do seu consentimento** (qual texto você aceitou, e quando) | Ao aceitar | Provar que você concordou (LGPD art. 8º) |
| **Suas publicações**: texto e, se quiser, foto | Quando você publica | Mostrar para a Comunidade |
| **Comentários** e **Amém** que você dá | Quando você comenta ou dá Amém | Mostrar na publicação. O número de Amém **não é exibido**. |
| **Denúncias** e **bloqueios** que você faz | Quando você denuncia ou bloqueia | Moderação e segurança |
| **Decisões de moderação** sobre o seu conteúdo | Quando algo é analisado | Avisar você do motivo e permitir recurso |
| **Dados técnicos de acesso** (data e hora, endereço IP) | A cada acesso ao servidor | Segurança, prevenção de abuso e obrigações legais. {Prazo: ver seção 19} |

**O que NÃO vai para o servidor:** reflexão privada, jejum, onde você parou na leitura, preferências do app, lista de
contatos, localização.

**Sobre a sua fé:** publicar na Comunidade de uma igreja, com seu nome, revela a sua convicção religiosa. Por isso,
tudo o que você publica, e o próprio fato de participar, é tratado como **dado pessoal sensível**.

## 16. Por que podemos tratar esses dados (base legal)

- **Suas publicações, comentários, Amém, perfil e participação na Comunidade:** **consentimento específico e
  destacado** (LGPD art. 11, I). Antes de publicar pela primeira vez, você verá uma **tela própria**, separada de
  qualquer outro aceite, dizendo em palavras simples:
  - quem vai ver: {as pessoas da igreja que entraram na Comunidade com um código, hoje cerca de [N] pessoas}, com seu
    nome e sua foto, algumas das quais você não conhece;
  - que {fotos só aparecem depois que uma pessoa da igreja aprova} e textos passam por um filtro automático;
  - por quanto tempo a publicação fica visível: {até [DATA DE ENCERRAMENTO DA COMUNIDADE]};
  - que você pode **retirar o consentimento quando quiser**, e o que acontece se retirar (seção 18).
  Você pode usar todo o resto do app **sem** dar esse consentimento.
- **E-mail e identificador da conta:** necessários para fornecer a conta que você pediu. Como a conta existe para a
  Comunidade, e a Comunidade revela fé, tratamos esses dados também sob o mesmo consentimento.
  **[NOTA PARA O ADVOGADO: confirmar a base legal do e-mail e da conta, considerando que "legítimo interesse" não vale
  para dado sensível (art. 11) e que a própria existência da conta pode revelar vínculo religioso.]**
- **Registro do consentimento, conteúdo removido sob contestação, dados técnicos de acesso e material de denúncia
  envolvendo criança:** cumprimento de obrigação legal e exercício regular de direitos (LGPD art. 11, II, "a" e "d").
  **[NOTA PARA O ADVOGADO: confirmar cada hipótese.]**

## 17. Com quem os dados são compartilhados

**Não vendemos dados. Não usamos dados para publicidade.**

| Quem | Por quê | Onde |
|---|---|---|
| **Supabase** (servidor, banco de dados, login e fotos) | Guardar e entregar os dados da Comunidade em nosso nome | Servidores na região de **São Paulo (Brasil)**. {Confirmar se há transferência internacional para suporte ou cópia de segurança} |
| **[SERVIÇO DE E-MAIL]** (ex.: Resend, se contratado) | Enviar o código de acesso | {Confirmar país dos servidores; se fora do Brasil, é transferência internacional (LGPD arts. 33 a 36)} |
| **Moderadores voluntários da igreja**, treinados e com termo de sigilo | Analisar publicações retidas, fotos e denúncias | Pela ferramenta interna de moderação |
| **Autoridades públicas** | Somente quando a lei ou uma ordem judicial exigir, ou para proteger uma criança | — |

Os outros membros da Comunidade veem o que você publicou, com seu nome e foto. **Não temos como impedir que alguém
tire uma captura de tela.** Por isso, pense antes de publicar algo que não gostaria de ver circulando.

**[NOTA PARA A IGREJA/ADVOGADO: se forem adicionadas ferramentas de relatório de erro (ex.: Sentry) ou de
estatística (ex.: PostHog), como previsto em ADR-002, elas entram aqui com país de servidor e mecanismo de
transferência, e na Parte 3.]**

## 18. Seus controles no app

Na área **"Conta e privacidade"** você poderá:

1. **Apagar uma publicação ou comentário seu**, a qualquer momento.
2. **Apagar tudo o que publicou**, sem apagar a conta.
3. **Retirar o consentimento.** Isso **tira do ar** tudo o que você publicou na Comunidade e desliga sua participação.
   O que foi feito antes da retirada continua válido (LGPD art. 8º, §5º).
4. **Baixar uma cópia dos seus dados** (arquivo em formato aberto, como JSON): perfil, publicações, fotos,
   comentários, Amém dados, consentimentos e denúncias feitas.
5. **Excluir sua conta** dentro do app. A exclusão apaga perfil, publicações, comentários, Amém e fotos.
6. **Excluir a conta pela web**, mesmo sem o app instalado: **[URL DE EXCLUSÃO]**. Por segurança, confirmamos por
   e-mail que o pedido é seu.

## 19. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Conta, perfil, publicações, comentários, Amém | Enquanto a conta existir, ou até você apagar. {Se a Comunidade tiver data para acabar: as publicações são apagadas em [DATA DE ENCERRAMENTO DA COMUNIDADE].} |
| Depois da exclusão da conta | Apagamos em até **[PRAZO DE EXCLUSÃO, ex.: 30 dias]**, incluindo cópias de segurança em até **[PRAZO DO BACKUP]** |
| Registro do consentimento | **[PRAZO DE RETENÇÃO DO CONSENTIMENTO]**, só para provar que você concordou, sem o conteúdo |
| Conteúdo removido por moderação e sob contestação | **[PRAZO DE RETENÇÃO DE CONTEÚDO REMOVIDO]** |
| Dados técnicos de acesso (data, hora, IP) | **[PRAZO DE RETENÇÃO DE REGISTROS DE ACESSO]** |
| Material ligado a denúncia de abuso contra criança | **[PRAZO LEGAL]**, conforme ECA Digital art. 27 §2º |

**[NOTA PARA O ADVOGADO: os prazos acima são decisão jurídica e bloqueiam a versão final do banco de dados
(`docs/product/comunidade/03-dados-e-seguranca.md` §2.4). Há conflito já registrado: `SECURITY_V0.md` prevê guardar
consentimentos por 5 anos após a exclusão, sem fundamento escrito. O Marco Civil art. 15 (registros de acesso por 6
meses) se aplica a pessoa jurídica "com fins econômicos"; a aplicação a uma igreja precisa de parecer, e o ECA Digital
art. 27 §2º remete a esse prazo para casos envolvendo criança.]**

## 20. Seus direitos (LGPD art. 18)

Você pode pedir, **de graça**, a qualquer momento:

1. **Confirmação** de que tratamos dados seus;
2. **Acesso** aos seus dados;
3. **Correção** de dados incompletos, errados ou desatualizados;
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desacordo com a lei;
5. **Portabilidade** dos dados, na forma da regulamentação da ANPD;
6. **Eliminação** dos dados tratados com o seu consentimento (salvo os casos de guarda obrigatória da seção 19);
7. **Informação** sobre com quem compartilhamos seus dados;
8. **Informação** sobre a possibilidade de não consentir e o que acontece se você não consentir (resposta: você usa
   todo o app, menos a Comunidade);
9. **Revogação** do consentimento.

Também pode pedir revisão de decisões tomadas só por computador (art. 20), como a retenção de um texto pelo filtro
automático: toda retenção pode ser revista por uma pessoa.

**Como pedir:** pelo app (seção 18) ou pelo e-mail [E-MAIL DE PRIVACIDADE]. Respondemos o acesso simplificado
imediatamente e a declaração completa em **até 15 dias** (LGPD art. 19). Se não ficar satisfeito, você pode reclamar à
**ANPD** (www.gov.br/anpd).

## 21. Segurança

- Os dados ficam em servidor no Brasil, com acesso restrito por regras no próprio banco de dados, de modo que cada
  pessoa só consegue ver o que a Comunidade permite.
- A sessão da sua conta fica guardada no celular de forma **cifrada**, com a chave no cofre seguro do sistema
  (Keychain no iPhone, Keystore no Android).
- Moderadores só acessam o necessário para moderar, por uma ferramenta própria, e assinam termo de sigilo.
- Se houver um incidente de segurança que possa causar risco ou dano relevante, avisaremos você e a ANPD, como manda a
  lei (LGPD art. 48). **[NOTA PARA O ADVOGADO: indicar o prazo da regulamentação vigente da ANPD.]**

## 22. Regras da Comunidade e moderação

Para publicar, você precisa **aceitar as Regras da Comunidade** ([URL DAS REGRAS]). Quando retiramos algo seu, avisamos
o motivo, dizemos se a decisão foi de pessoa ou de computador e você pode recorrer. Qualquer pessoa, **mesmo sem o
app**, pode pedir a retirada de conteúdo em que aparece: [URL "RETIRAR CONTEÚDO"] ou [E-MAIL DE PRIVACIDADE].

---

# PARTE 3: tabela para os rótulos das lojas

**Regra das duas lojas (FATO, fontes B1 e B2, acesso em 2026-09-21):** "coletar" significa **transmitir o dado para
fora do aparelho**. Dado que é processado **só no aparelho** não é coleta e **não precisa ser declarado**. As duas
lojas exigem o link da política de privacidade mesmo para apps que não coletam nada.

## 3.1 Hoje (versão 1, sem conta, sem servidor)

**Resposta geral:**
- **App Store (App Privacy):** "**Dados não coletados**" (*Data Not Collected*).
- **Google Play (Data safety):** "Seu app coleta ou compartilha algum dos tipos de dados de usuário exigidos?" →
  **Não**. Criptografia em trânsito: **não se aplica** (nada é transmitido). Exclusão de dados: os dados ficam no
  aparelho e são apagados ao desinstalar.

| Dado que o app toca | Onde fica | App Store | Google Play | Por quê |
|---|---|---|---|---|
| Dias lidos | Só no aparelho | Não coletado | Não coletado | Não sai do celular (`completionsStore.ts`) |
| Reflexão privada (texto) | Só no aparelho | Não coletado | Não coletado | Não sai do celular (`reflectionsStore.ts`) |
| Jejum | Só no aparelho | Não coletado | Não coletado | Não sai do celular (`fastingStore.ts`) |
| Preferências, ministério, lembrete | Só no aparelho | Não coletado | Não coletado | `settingsStore.ts` |
| Posição de leitura | Só no aparelho | Não coletado | Não coletado | `readerPosition.ts` |
| Eventos de uso | Nenhum em release (só em desenvolvimento, na memória) | Não coletado | Não coletado | Sem fornecedor; a chave saiu do app; em release `track` não grava nada (`analytics.ts`, `app/_layout.tsx`) |
| Lembretes | Agendados no sistema do celular | Não coletado | Não coletado | Notificação local, sem push remoto |
| E-mail | — | Não coletado | Não coletado | **Só se** a versão de loja for gerada sem servidor configurado. Ver condição abaixo |

**Condições para esta resposta valer (conferir no dia do envio):**
1. A versão de loja é gerada **sem** `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Com elas, a tela de
   conta (`src/app/conta.tsx`) passa a enviar e-mail ao servidor, e a resposta vira a da tabela 3.2.
2. Nenhuma biblioteca de relatório de erro, estatística ou anúncio foi adicionada (hoje não há nenhuma em
   `mobile/package.json`).
3. O "privacy manifest" do iOS gerado pelo Expo não declara coleta ligada às bibliotecas usadas (conferir ao gerar a
   versão). **[NOTA TÉCNICA: revisar a cada atualização do Expo.]**
4. O questionário de classificação etária é outro formulário, separado deste (sem comunidade, não há "social media").

## 3.2 Quando existirem conta e Comunidade (preencher de novo antes dessa versão)

Tipos de dado com os nomes das lojas. **Tudo "ligado à identidade"** (a conta). **Nada é usado para rastreamento nem
publicidade.** Nada é "compartilhado" no sentido do Google, porque o Supabase e o serviço de e-mail agem em nosso nome
(operadores). **[NOTA PARA O ADVOGADO: confirmar a classificação de operadores.]**

| Dado | App Store: tipo | Google Play: tipo | Finalidade (as duas lojas) | Obrigatório ou opcional |
|---|---|---|---|---|
| E-mail | Contact Info > Email Address | Personal info > Email address | App functionality; Account management | Obrigatório para ter conta |
| Nome de exibição | Contact Info > Name | Personal info > Name | App functionality | Obrigatório na Comunidade |
| Identificador da conta | Identifiers > User ID | Personal info > User IDs | App functionality; Account management | Obrigatório para ter conta |
| Faixa de idade | {Other Data} | {Personal info > Other info} | App functionality (controle de idade) | Obrigatório para ter conta |
| Participação na Comunidade de uma igreja | Sensitive Info (crenças religiosas) | Personal info > Political or religious beliefs | App functionality | Opcional (só quem consente) |
| Foto publicada e foto de perfil | User Content > Photos or Videos | Photos and videos > Photos | App functionality | Opcional |
| Texto publicado e comentários | User Content > Other User Content | App activity > Other user-generated content | App functionality | Opcional |
| Amém, denúncias, bloqueios | User Content > Other User Content; {Usage Data > Product Interaction} | App activity > App interactions | App functionality; segurança | Opcional |
| IP e registros de acesso | {Identifiers / Other Data — avaliar} | {Device or other IDs — avaliar} | Segurança; prevenção de fraude | Automático |
| Relatórios de erro | Só se houver ferramenta (ex.: Sentry): Diagnostics > Crash Data | App info and performance > Crash logs | App functionality | {decidir} |
| Reflexão, jejum, dias lidos | **Não coletado** (continua no aparelho) | **Não coletado** | — | — |

Outras respostas do Google Play nessa versão: dados **criptografados em trânsito: Sim**; **pode solicitar exclusão:
Sim**, com o link [URL DE EXCLUSÃO] (o Google exige link web de exclusão para apps com conta, ver
`docs/technical/MOBILE_STORE_REQUIREMENTS.md`). **[NOTA PARA O ADVOGADO: a decisão de declarar "crenças religiosas"
por inferência está registrada como pendente em `MOBILE_STORE_REQUIREMENTS.md`. Recomendação técnica: declarar, pois
num app de uma igreja a participação revela fé; declarar a menos é declaração falsa, declarar a mais não é.]**

---

# Anexo A: o que conferimos no código (2026-09-21)

Para o advogado e para quem preencher as lojas. Tudo em `C:\Users\Administrator\Bible Study App\mobile\`.

| Arquivo | O que faz | Consequência para a política |
|---|---|---|
| `src/analytics/analytics.ts` | Define os eventos de uso. **Nenhum fornecedor conectado.** A chave "Enviar dados de uso anônimos" **saiu da interface** (D-4, 2026-09-21); o registro só liga em desenvolvimento (`app/_layout.tsx`: `__DEV__ && settings.analyticsEnabled`); em release nada é gravado nem transmitido. | "Nenhuma análise de uso é enviada" é verdade hoje |
| `src/settings/settingsStore.ts` | `analyticsEnabled: false` por padrão (campo antigo, sem chave na tela); preferências só no aparelho | Padrão protetor confirmado |
| `src/app/privacidade.tsx`, `src/config/contato.ts` | Abre a URL da política no navegador **quando a pessoa toca** no link; só aparece se `PRIVACY_URL` estiver preenchida | Abrir um link não é coleta; o fundador preenche `PRIVACY_URL` e `SUPPORT_EMAIL` antes do build |
| `src/cloud/config.ts`, `client.ts` | Só cria conexão com o servidor se `EXPO_PUBLIC_SUPABASE_URL` e `..._ANON_KEY` existirem. **Não há arquivo `.env` no repositório hoje**, só `.env.example` | Sem essas variáveis, nada vai ao servidor |
| `src/cloud/auth.ts`, `src/app/conta.tsx` | Login por e-mail + código, só quando a pessoa pede. Sem servidor configurado, a tela mostra que a conta não está disponível | Se a versão de loja tiver servidor configurado, o e-mail passa a ser coletado |
| `src/cloud/secureStorage.ts` | Sessão cifrada (AES) com chave no Keychain/Keystore | Base da seção 21 |
| `src/cloud/groups.ts` | Grupos e perfil (nome de exibição, faixa de idade) no servidor, código já escrito mas **servidor nunca aplicado** | Entra só na Parte 2 |
| `src/reflections/`, `src/fasting/`, `src/progress/`, `src/reader/readerPosition.ts` | Tudo em `AsyncStorage` (memória local). Os comentários do código proíbem caminho de rede para reflexão e jejum | "Fica no aparelho" confirmado |
| `src/reminders/reminders.ts` | `scheduleNotificationAsync` com gatilho local. **Nenhuma chamada de token de push remoto** encontrada | Seção 5 |
| `src/ui/fonts.ts` | Fontes empacotadas no app, nada buscado na rede | Seção 4 |
| `src/community/communityState.ts` | Progresso coletivo devolve "indisponível"; não existe agregação no servidor | Nada coletado para a Comunidade hoje |
| `package.json` | Sem Sentry, PostHog, Firebase, anúncios ou `expo-updates` | Parte 3.1 |

**Pendências técnicas que afetam o texto (não resolvidas aqui, pois este arquivo não altera código):**
1. Backup: Android resolvido (`allowBackup: false`); iPhone continua INFERÊNCIA (seção 3).
2. Versão de loja sem as variáveis do servidor: garantido em release pelo código (`src/cloud/config.ts` devolve `null`
   com `__DEV__` falso); mesmo assim, gerar o build sem elas.
3. ~~Texto da chave "Enviar dados de uso anônimos"~~: resolvido, a chave saiu do app (2026-09-21).

# Anexo B: fontes (acesso em 2026-09-21)

- **[B1] Apple — App Privacy Details on the App Store.** Define "coletar" como transmitir dado para fora do aparelho de
  forma que fique acessível além do necessário para atender o pedido; dado processado só no aparelho não é coletado;
  lista os tipos (Contact Info, User Content, Sensitive Info, Identifiers, Usage Data, Diagnostics).
  https://developer.apple.com/app-store/app-privacy-details/
- **[B2] Google Play Console Help — Provide information for Google Play's Data safety section.** Define coleta como
  transmissão para fora do aparelho; processamento só no aparelho não precisa ser declarado; link de política de
  privacidade obrigatório mesmo sem coleta; tipos incluem "Political or religious beliefs".
  https://support.google.com/googleplay/android-developer/answer/10787469
- **[B3] Apple — App Store Review Guidelines, 5.1.1(i) (política de privacidade no app e no App Store Connect) e
  5.1.1(v) (uso sem login; exclusão de conta no app).** https://developer.apple.com/app-store/review/guidelines/
  (via `docs/technical/MOBILE_STORE_REQUIREMENTS.md` e `docs/product/comunidade/01-lojas.md`, acesso 2026-09-21)
- **[B4] LGPD, Lei 13.709/2018** (arts. 5º II, 7º, 8º, 9º, 11, 16, 18, 19, 20, 33–36, 41, 48).
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (via `docs/product/comunidade/02-lei.md`,
  acesso 2026-09-21)
- **[B5] ECA Digital, Lei 15.211/2025** (arts. 16, 24, 27). https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm
  (via `02-lei.md`, acesso 2026-09-21)
- **[B6] Marco Civil da Internet, Lei 12.965/2014** (arts. 7º X, 15). https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
  (via `02-lei.md` e `03-dados-e-seguranca.md`; texto do art. 15 lido em fonte secundária)

**Não confirmado neste rascunho:** se a ANPD já regulamentou a portabilidade (art. 18, V); o prazo vigente de
comunicação de incidente; a aplicação do Marco Civil art. 15 a igreja sem fins econômicos; o país dos servidores do
serviço de e-mail; se o backup automático está ligado na versão de loja. Políticas de loja mudam: **reconferir B1 a B3
no dia do envio.**
