# Comunidade: o que a lei brasileira exige (insumo para decisão)

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer). Não sou advogado; nada aqui é parecer jurídico.
- **Para quê:** o fundador decidiu em 2026-09-20 que o app terá uma Comunidade (feed com foto e texto, "Amém" sem
  contagem visível, comentários, denunciar/bloquear, consentimento destacado antes da primeira publicação).
  A decisão ainda depende de ratificação do Product Brain (`docs/design/00-DECISAO-FEED.md`). Este documento diz
  o que a lei brasileira exige dessa Comunidade e o que isso muda no desenho (`design_handoff_100_dias/TELAS.md`
  grupo C, `REGRAS.md` §3).
- **Método:** em 2026-09-21 li os textos consolidados no Planalto (LGPD, ECA Digital, Decreto 12.880, Marco Civil,
  Código Civil, ECA, Constituição) e baixei o **FAQ da ANPD sobre o ECA Digital (versão de 30/07/2026)**, que a
  pesquisa do Sprint 0 não tinha conseguido ler. O Tema 987 veio de um documento do STF e de fontes secundárias,
  porque o portal do STF devolveu 403. As fontes estão no fim, com URL e data de acesso.
- **Rótulos:** **FATO** (texto de lei ou documento oficial citado) · **INFERÊNCIA** (conclusão minha a partir
  dos fatos) · **HIPÓTESE** (não verificado) · **NÃO CONFIRMADO** (procurei e não consegui confirmar) ·
  **JURÍDICO** (precisa de advogado humano).

---

## 0. Resumo para quem decide

1. **A Comunidade pode ser feita dentro da lei, mas muda o enquadramento jurídico do app inteiro.** Hoje o app é
   um leitor com conteúdo editorial da igreja. Um feed com publicação de usuários o aproxima da definição legal de
   **rede social** (ECA Digital art. 2º, III) e do regime de **provedor de conteúdo de terceiros** (Marco Civil
   art. 19 com o Tema 987). Pôr o feed como **primeira tela** reforça essa leitura (INFERÊNCIA). A pesquisa do
   Sprint 0 contava com o regime mais leve de "serviço com controle editorial" (ECA Digital art. 39 §1º). **Esse
   regime não cobre um feed de usuários** (INFERÊNCIA; JURÍDICO).
2. **Publicar sobre fé é tratar dado pessoal sensível** (LGPD art. 5º, II). A única base legal realista é o
   **consentimento específico e destacado** (art. 11, I). O art. 11 não admite legítimo interesse. Esse
   consentimento só vale se o texto disser a verdade sobre quem vê. Hoje C3 ("toda a igreja") e C4 ("qualquer
   pessoa que baixar o app") se contradizem, e isso sozinho pode anular o consentimento (art. 9º §1º; ver
   `LACUNAS.md` C5).
3. **Pessoas de terceiros que aparecem em fotos não têm base legal limpa.** Uma foto do culto revela a
   convicção religiosa de quem aparece nela (art. 11 §1º). Essas pessoas não consentiram, e o art. 11 não tem
   saída de legítimo interesse. Para criança na foto, o art. 14 §1º exige consentimento de um dos pais. **O desenho
   precisa reduzir o problema na origem**: regra contra rosto identificável de terceiro sem autorização, aviso na
   hora de publicar, motivo de denúncia próprio e canal de retirada para quem não tem o app.
4. **Idade.** A regra mais barata e mais segura para a V1 é **publicar, comentar e dar Amém só com 18 anos ou
   mais**, com menores usando o resto do app. Abrir para 16–17 é possível, mas pede parecer. Abrir para menos de
   16 exige **vincular a conta a um responsável** (ECA Digital art. 24), o que está fora do alcance da V1.
5. **Mecânicas proibidas**: o texto do Decreto é mais estreito do que os nossos documentos dizem. O Decreto 12.880
   art. 9º lista quatro mecanismos: ocultar pontos naturais de parada, disparar conteúdo novo sem pedido, dar
   recompensa por tempo de uso e mandar notificação excessiva (FATO). "Rolagem infinita", "streak" e "badge" **não
   aparecem com esses nomes**. O feed sem fim cai quase com certeza no inciso I (INFERÊNCIA forte). Streak e badge
   são discutíveis. Quem diz que "streak é proibido por lei" está exagerando, e é melhor corrigir essa frase do
   que defendê-la diante de um advogado.
6. **Remoção e contestação são obrigação legal, não só exigência de loja.** O ECA Digital (arts. 29–30) e o
   Tema 987 exigem canal de notificação, remoção diligente, aviso ao autor com motivo, recurso com prazo e registro.
   Moderação humana com responsável nomeado é pré-requisito do lançamento.
7. **Exclusão**: revogar o consentimento tem de **despublicar** o que foi publicado com base nele (INFERÊNCIA a
   partir do art. 8º §5º e do art. 18, VI e IX). Guardar conteúdo removido para defesa, ou registros de
   consentimento, exige prazo e fundamento definidos por advogado.
8. **Pontos que só um advogado resolve**: listados na §8. Os mais caros de errar: quem é o controlador (qual CNPJ),
   idade mínima (18 ou 16/17), alcance do art. 24, enquadramento como rede social, base legal para terceiros
   em foto, prazos de retenção e a leitura final do Tema 987 depois dos embargos de 17/06/2026.

---

## 1. LGPD: convicção religiosa é dado sensível (art. 5º, II; art. 11)

### O que a lei diz

- **FATO.** Art. 5º, II: "dado pessoal sensível: dado pessoal sobre origem racial ou étnica, **convicção religiosa**
  […] filiação a sindicato ou a **organização de caráter religioso** […], quando vinculado a uma pessoa natural".
- **FATO.** Art. 11, caput e I: dado sensível só pode ser tratado "quando o titular ou seu responsável legal
  consentir, de forma **específica e destacada**, para **finalidades específicas**". As hipóteses sem consentimento
  (inciso II, alíneas a–g) são indispensáveis para: obrigação legal, políticas públicas, pesquisa, exercício regular
  de direitos, proteção da vida, tutela da saúde e prevenção à fraude na autenticação. **Nenhuma cobre "publicar um
  testemunho num feed".** O legítimo interesse (art. 7º, IX) **não existe** no art. 11.
- **FATO.** Art. 11 §1º: o art. 11 se aplica "a qualquer tratamento de dados pessoais que **revele** dados pessoais
  sensíveis e que possa causar dano ao titular". Isso alcança dados que, sozinhos, não seriam sensíveis. Uma foto
  dentro do templo, o nome numa lista de quem deu Amém ou a frequência com que alguém publica sobre fé revelam
  convicção religiosa.
- **FATO.** Art. 8º: o consentimento deve demonstrar a vontade do titular (caput). Se vier por escrito, deve estar em
  cláusula destacada (§1º). **O ônus da prova é do controlador** (§2º). Autorizações genéricas são nulas (§4º). A
  revogação pode ocorrer "a qualquer momento", por "procedimento gratuito e facilitado" (§5º). Mudanças de
  finalidade ou de informação precisam ser comunicadas com destaque, e o titular pode revogar (§6º; art. 9º §2º).
- **FATO.** Art. 9º §1º: o consentimento é **nulo** se as informações "tenham conteúdo enganoso ou abusivo ou não
  tenham sido apresentadas previamente com transparência, de forma clara e inequívoca".
- **FATO.** Art. 9º §3º: quando o tratamento é condição para o serviço, o titular deve ser informado com destaque.
- **FATO.** Art. 4º, I exclui da LGPD o tratamento "realizado por pessoa natural para fins exclusivamente
  particulares e não econômicos". Isso protege **quem publica**, não quem hospeda e distribui. A igreja (ou quem for
  o controlador) continua sujeita à lei ao armazenar e exibir o post (INFERÊNCIA).
- **FATO.** Res. CD/ANPD 2/2022: o regime simplificado para agentes de pequeno porte inclui entidades sem fins
  lucrativos (art. 2º), mas **exclui quem faz tratamento de alto risco** (art. 3º). Alto risco é um critério geral
  (larga escala, ou tratamento que possa afetar significativamente direitos fundamentais) somado a um critério
  específico, como dados sensíveis ou dados de crianças, adolescentes e idosos (art. 4º). **INFERÊNCIA:** a
  Comunidade tende a ser alto risco. O controlador deve indicar encarregado (art. 41) e não conta com as flexibilizações
  do regime simplificado (JURÍDICO confirma).

### Base legal, ponto a ponto

| Tratamento | Base provável | Situação |
|---|---|---|
| Publicar post (texto + foto) da própria pessoa | Consentimento específico e destacado (art. 11, I) | **INFERÊNCIA.** Única base viável. |
| Nome e foto de perfil exibidos junto do post | Mesmo consentimento, com finalidade enumerada | **INFERÊNCIA.** Nome e foto associados a um post sobre fé também são dado sensível (art. 11 §1º). |
| Comentário | Mesmo consentimento, com o comentário listado como finalidade | **INFERÊNCIA.** Não pode ficar implícito (art. 8º §4º). |
| Amém (registro de quem reagiu a quê) | Mesmo consentimento. Leitura restrita a quem reagiu | **INFERÊNCIA.** O Amém revela engajamento religioso. Sem contagem visível é o melhor desenho para a LGPD, desde que a RLS **negue** a leitura das reações alheias (`LACUNAS.md` B9). Se a contagem puder ser lida pela API, a promessa da tela é falsa e o dado vaza. |
| Denúncia (quem denunciou quem) | Exercício regular de direitos (art. 11, II, d) ou obrigação legal (ECA Digital arts. 29–30; Tema 987) | **INFERÊNCIA; JURÍDICO.** A denúncia **não pode** depender do consentimento de publicar, porque não-usuários também denunciam. |
| Registro do consentimento (quem, qual versão, quando) | Ônus da prova do art. 8º §2º; exercício regular de direitos | **INFERÊNCIA.** Precisa sobreviver à exclusão da conta por um prazo que só o jurídico define (`LACUNAS.md` B12). |
| Terceiros identificáveis em foto | **Sem base limpa.** Ver §2 | **JURÍDICO.** |

### O que o app precisa fazer

1. **Consentimento como tela própria (C4)**, antes do primeiro post, comentário ou Amém. Não pode ser caixinha
   dentro de termos. As finalidades vêm enumeradas: post, foto, nome e foto de perfil, comentário, Amém. O texto
   diz **quem vê, com número concreto ou definição exata**, e o que acontece ao revogar. A caixa começa desmarcada.
2. **Consentimento guardado no servidor por conta e por versão**, com data e hora. Texto novo gera novo pedido
   (art. 8º §6º). Isso substitui a frase de C4 "uma vez na vida, e depois nunca mais" (`LACUNAS.md` C10).
3. **Revogação tão fácil quanto o aceite**, em "Conta e privacidade" (art. 8º §5º; Decreto 12.880 art. 10, III veda
   dificultar a revogação em serviço de acesso provável por menores).
4. **A mesma frase sobre audiência em C3, C4 e B4.** Se o texto enganar sobre quem vê, o consentimento é nulo
   (art. 9º §1º). **Isso depende da decisão de alcance** (igreja inteira, grupo, qualquer pessoa com o app): ver §7.
5. **Nome público escolhido pela pessoa**, nunca derivado do e-mail. O trigger atual (`split_part(email,'@',1)`)
   expõe parte do e-mail a desconhecidos, o que fere minimização (art. 6º, III) e o consentimento informado
   (`LACUNAS.md` C12).
6. **A reflexão privada nunca pré-preenche uma publicação** (REGRAS 14). Isso mantém separados um dado local e um
   dado publicado sob consentimento (INFERÊNCIA, e já está no desenho).

### O que muda no desenho

- C4 deixa de ser "uma vez na vida" e passa a ter versão, revogação e efeito da revogação descrito na tela.
- C3 ganha o aviso de audiência **idêntico** ao de C4, e ele depende de uma decisão que ainda não foi tomada.
- D2/D3: sem nome escolhido não há primeira publicação.
- Reações: a interface esconde a contagem **e** o servidor não a expõe.

---

## 2. Foto com terceiros (LGPD art. 11 §1º e art. 14; direito de imagem)

### O que a lei diz

- **FATO.** LGPD art. 11 §1º (acima): tratamento que **revela** dado sensível entra no regime do art. 11.
- **FATO.** LGPD art. 14 §1º: dado de **criança** (até 12 anos incompletos, ECA art. 2º) exige "consentimento
  específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal". O §5º pede "todos os esforços
  razoáveis" para verificar que o consentimento veio mesmo do responsável.
- **FATO.** Constituição art. 5º, X: são invioláveis "a intimidade, a vida privada, a honra e a imagem das pessoas".
  Código Civil art. 20: a publicação da imagem de alguém pode ser proibida a seu requerimento, "sem prejuízo da
  indenização", se atingir honra, boa fama ou respeitabilidade ou tiver fim comercial. ECA art. 17: o direito ao
  respeito da criança e do adolescente abrange "a preservação da imagem, da identidade […] dos valores, idéias e
  crenças".
- **FATO.** ECA Digital art. 29: conteúdo que viola direitos de criança ou adolescente deve ser retirado "assim que"
  o fornecedor for comunicado pela vítima, por representantes, pelo MP ou por entidade habilitada,
  "independentemente de ordem judicial". Isso vale se o app for de acesso provável por menores (ver §4).

### Análise

- **INFERÊNCIA.** Quem aparece ao fundo de uma foto do culto tem a convicção religiosa revelada para toda a
  audiência do feed. Essa pessoa não consentiu, não é usuária e muitas vezes nem sabe. O art. 11 não oferece base sem
  consentimento que sirva a esse caso. Também não serve dizer que o dado foi "tornado manifestamente público"
  (art. 7º §4º): quem tornou público foi o autor do post, não a pessoa fotografada.
- **INFERÊNCIA.** A responsabilidade não fica toda com o autor. O app armazena, redimensiona e distribui a imagem,
  e isso é tratamento pelo controlador do serviço.
- **HIPÓTESE (não verificada).** Existe prática de mercado de transferir ao autor, nos termos de uso, a garantia
  de que tem autorização das pessoas retratadas. Isso reduz o risco civil perante o autor, mas não cria base legal
  para o dado sensível do terceiro. JURÍDICO.

### O que o app precisa fazer

1. **Regra da comunidade explícita**: não publicar rosto identificável de outra pessoa sem autorização dela, e
   **nunca** de criança que não seja filho ou filha de quem publica. Uma posição mais protetora, e mais simples de
   moderar, é **nenhuma criança identificável** (RECOMENDAÇÃO; decisão do fundador com o jurídico).
2. **Aviso no momento de escolher a foto (C3)**, curto, sem juridiquês: "Tem mais alguém nesta foto? Só publique
   se a pessoa concordou." Isso é aviso, não caixinha que transfere culpa.
3. **Motivo de denúncia próprio**: "Apareço nesta foto e não autorizei" / "Há uma criança nesta foto".
   Esse motivo tem **prioridade**: tira o post do ar primeiro e analisa depois (RECOMENDAÇÃO baseada no art. 29 do
   ECA Digital para criança e na ausência de base legal para adulto).
4. **Canal de retirada para quem não tem o app**: uma página web com formulário ou e-mail publicado. O Tema 987
   fala em canais acessíveis "tanto para usuários quanto para não usuários" (ver §5). Sem isso, a pessoa na foto
   não tem por onde reclamar.
5. **Pré-moderação de foto** antes de o post ficar visível, pelo menos enquanto o volume for pequeno (ver §5 e
   `LACUNAS.md` C6). Isso também atende à exigência da Apple de filtrar antes de publicar.
6. **Tirar metadados (EXIF/GPS)** ao reencodar a imagem. É minimização (art. 6º, III) e cumpre a promessa "sem
   localização" de C3 (`LACUNAS.md` B7).

### O que muda no desenho

- C3 ganha um aviso contextual na foto e um link para as regras.
- C5 ganha lista de motivos com "apareço nesta foto" e "criança na foto".
- Surge uma superfície **fora do app**: a página web de retirada, a mesma infraestrutura da exclusão de conta pela web.
- O post sai do estado "em análise" e só depois fica visível (`LACUNAS.md` C6, B8).

---

## 3. Crianças e adolescentes na LGPD (art. 14)

### O que a lei diz

- **FATO.** Art. 14 caput: tratamento de dados de crianças **e** adolescentes "em seu melhor interesse".
- **FATO.** §1º: para **criança**, consentimento específico e em destaque de um dos pais ou responsável. A LGPD **não**
  exige consentimento parental para **adolescente** (12 a 17 anos).
- **FATO.** §4º: não condicionar a participação de criança em aplicações ao fornecimento de dados "além das
  estritamente necessárias". §6º: informação simples e adequada ao entendimento da criança.
- **FATO (fonte secundária do Sprint 0, não reverificada hoje).** Enunciado CD/ANPD nº 1/2023: dados de crianças e
  adolescentes podem ser tratados com base nas hipóteses do art. 7º ou 11, desde que prevaleça o melhor interesse.
- **FATO.** Código Civil art. 4º, I: maiores de 16 e menores de 18 são **relativamente incapazes**. Art. 5º: a
  menoridade cessa aos 18.

### Análise

- **INFERÊNCIA.** Se criança não publica, a exigência do §1º some da Comunidade. O que sobra é a criança como
  **leitora** do feed e como **terceira** em foto (§2).
- **JURÍDICO.** Um adolescente de 16 ou 17 anos, relativamente incapaz, pode dar sozinho o consentimento
  "específico e destacado" do art. 11, I para dado sensível? O Sprint 0 já tinha deixado essa pergunta aberta
  (`STORES_LEGAL_RESEARCH.md` §8) e ela continua aberta.

### O que o app precisa fazer

- Não coletar data de nascimento exata. Basta faixa etária, o que já está em REGRAS 21 (minimização).
- Página pública para pais sobre o que o app coleta e como exercer direitos (art. 14 §2º; ECA Digital art. 16).

---

## 4. ECA Digital (Lei 15.211/2025) e Decreto 12.880/2026

### Vigência, âmbito e autoridade

- **FATO.** Lei 15.211, de 17/09/2025. Vigência em **17/03/2026** (art. 41-A, na redação da Lei 15.352/2026).
- **FATO.** Decreto **12.880, de 18/03/2026**, regulamenta a lei e dá à **ANPD** a regulamentação e a fiscalização
  (art. 1º, parágrafo único). O número do decreto citado no pedido está confirmado.
- **FATO.** A lei vale para produto ou serviço "direcionado a crianças e a adolescentes […] ou **de acesso provável**
  por eles" (art. 1º). O parágrafo único define acesso provável: (I) probabilidade suficiente de uso e atratividade;
  (II) facilidade de acesso; (III) risco significativo, "**especialmente** no caso de produtos ou serviços que tenham
  por finalidade permitir a **interação social e o compartilhamento de informações em larga escala** entre usuários".
- **INFERÊNCIA.** Uma campanha de igreja "de criança a idoso", distribuída publicamente nas lojas, com feed legível
  sem conta, preenche os incisos I e II. O feed puxa também o inciso III. **Trate o app como de acesso provável.**
- **FATO.** Cronograma da ANPD: etapa I (sinal de idade, lojas e sistemas operacionais) já em curso. Etapa II
  (implementação da aferição) de agosto a novembro de 2026. **Ações de fiscalização a partir de janeiro de 2027.**
  As obrigações já valem desde 17/03/2026 (Agência Brasil 03/2026; JOTA; HDPO).

### Rede social ou não

- **FATO.** Art. 2º, III: rede social é aplicação "que tem como **principal finalidade** o compartilhamento e a
  disseminação, pelos usuários, de opiniões e informações veiculadas por textos ou arquivos de imagens […], por
  meio de contas conectadas ou acessíveis de forma articulada, permitida a conexão entre usuários".
- **FATO.** Decreto art. 19 §2º: sem prejuízo da avaliação do próprio fornecedor, "a ANPD poderá, a qualquer tempo,
  determinar enquadramento diverso".
- **INFERÊNCIA.** A finalidade principal do app é leitura bíblica, e isso afasta a definição. Mas **o feed como
  primeira tela** e a comparação explícita "como no Instagram" (`00-DECISAO-FEED.md`) enfraquecem esse argumento.
  Nosso desenho já não tem "conexão entre usuários" (seguir, amigos), e isso ajuda. **JURÍDICO:** posicionar o feed
  como aba secundária é também uma decisão jurídica, não só de UX.

### Idade mínima e vínculo com responsável (art. 24)

- **FATO.** A lei **não fixa idade mínima** para redes sociais. O FAQ da ANPD (30/07/2026) diz que as faixas
  recomendadas "são regidas pela Classificação Indicativa" e que "o caminho da lei brasileira não é o de proibição,
  mas sim o de garantir a supervisão dos pais".
- **FATO.** Art. 24, caput: os provedores de serviços direcionados a menores ou de acesso provável "deverão
  garantir que usuários ou contas de crianças e de adolescentes **de até 16 (dezesseis) anos** de idade estejam
  vinculados ao usuário ou à conta de um de seus responsáveis legais". O FAQ da ANPD lê como "se o usuário tem
  **menos de 16 anos**, a conta deve estar ligada à de um dos responsáveis" e enquadra a regra em "Para usar redes
  sociais".
- **FATO.** Art. 24 §4º: diante de "fundados indícios" de conta operada por menor em desconformidade com a idade
  mínima, o provedor de rede social deve suspender e abrir procedimento de apelação para o responsável. §5º: sem
  conta de responsável, é vedado baixar a supervisão abaixo do padrão protetivo.
- **NÃO CONFIRMADO / JURÍDICO.** (a) Se o caput do art. 24 vale para **todo** serviço de acesso provável, como a
  letra sugere, ou só para redes sociais, como o capítulo e o FAQ sugerem. (b) Se "até 16" inclui quem tem 16. O
  texto da lei e o FAQ divergem na redação.
- **FATO.** Arts. 12 e 14: lojas e sistemas operacionais fornecem **sinal de idade** por API, e o fornecedor deve
  "garantir o recebimento" dessa informação (art. 14). O Decreto só torna o recebimento **expresso** para quem
  oferece conteúdo impróprio ou proibido (art. 26). Havendo divergência entre a aferição própria e o sinal, vale "a
  alternativa mais protetiva" (Decreto art. 25 §4º).
- **FATO.** A autodeclaração é **vedada** como verificação para conteúdo impróprio ou proibido (Lei art. 9º §1º;
  Decreto arts. 15–19). O FAQ diz genericamente que "a autodeclaração de idade deixa de ser considerada um método
  válido", mas no contexto de conteúdo proibido. **NÃO CONFIRMADO:** se a autodeclaração basta para limitar a
  publicação a maiores de 18 num serviço sem conteúdo impróprio. JURÍDICO.

**Opções de idade para publicar, comentar e dar Amém**

| Opção | O que exige | Custo | Risco |
|---|---|---|---|
| **A. Só 18+** (recomendada) | Autodeclaração de faixa + leitura do sinal da loja (Declared Age Range / Play Age Signals). Em divergência, bloquear publicação. Menores leem o feed e usam o resto do app. | Baixo: um passo no cadastro e uma tela "aqui você lê; publicar é para maiores" | Baixo. Some a questão do adolescente consentir sozinho e a do art. 24. Resta a suficiência da autodeclaração (JURÍDICO). |
| **B. 16+** | O mesmo que A, com parecer sobre (i) capacidade de 16–17 para consentir dado sensível sozinho e (ii) "até 16" do art. 24 | Baixo em código, médio em jurídico | Médio. Inclui a juventude, que provavelmente é o público mais ativo. |
| **C. Menores de 16 com vínculo** | Conta de responsável, vínculo verificável, painel de supervisão (arts. 17–18 e 24) | Alto: é um produto dentro do produto | Alto para a V1. **Não recomendo.** |

### Mecânicas de uso compulsivo (texto exato)

- **FATO.** Lei art. 8º, IV: adotar por padrão "configurações que evitem o uso compulsivo".
- **FATO.** Lei art. 17 §4º, II: as configurações-padrão de supervisão parental devem limitar recursos que "aumentar,
  sustentar ou estender artificialmente o uso", "como reprodução automática de mídia, **recompensas pelo tempo de
  uso**, notificações e outros recursos que possam resultar em uso excessivo".
- **FATO.** Decreto art. 9º, parágrafo único: são mecanismos de incentivo ao uso compulsivo "(I) a **ocultação de
  pontos naturais de parada**; (II) o **acionamento de novos conteúdos sem solicitação**; (III) a oferta de
  **recompensas pelo tempo de uso**; e (IV) o aparecimento de **notificações excessivas**".
- **FATO.** Decreto art. 10: a ANPD vai coibir práticas manipulativas, como obstruir interrupção, cancelamento ou
  mudança de preferência; urgência fabricada e pressão emocional; e ocultar ou dificultar controles de privacidade,
  consentimento ou revogação. O FAQ dá como exemplo proibido notificações do tipo "seu amigo está esperando por você!".

| Mecânica | O que a norma diz | Classificação |
|---|---|---|
| Rolagem infinita | Não citada pelo nome. Inciso I (ocultar ponto natural de parada) | **INFERÊNCIA forte:** proibida. **O feed tem fim** ("Você viu tudo de hoje"). |
| Autoplay de vídeo | Inciso II; Lei art. 17 §4º, II | **FATO.** Não há vídeo no desenho. Manter assim. |
| Streak (dias seguidos) | Não citado. "Recompensa pelo tempo de uso" é o mais próximo | **INFERÊNCIA fraca/discutível.** Já está fora por decisão de produto (REGRAS 9). Chamar de "proibido por lei" é exagero. |
| Badge/medalha | Não citado. Pode ser recompensa ou prática manipulativa (art. 10, II) | **INFERÊNCIA discutível.** Fora por produto. |
| Badge de não-lidos / contador | Não citado. Pode ser urgência fabricada (art. 10, II) | **INFERÊNCIA.** Evitar. |
| Notificação "fulano comentou" | Inciso IV fala em notificação **excessiva**, não em toda notificação | **INFERÊNCIA.** Não é proibida em si. Como só adultos terão conta (opção A), o risco é baixo. Mantenha desligada por padrão, com frequência limitada e sem tom de urgência. |
| Contador de Amém | Não é mecânica listada | A decisão de não mostrar é **de produto**, e reduz a pressão social (alinhada ao art. 10, II). |

**Correção recomendada:** `REGRAS.md` regra 10 e `00-DECISAO-FEED.md` item 10 dizem que streak, badge, ranking,
badge de não-lidos e notificação de atividade alheia são "proibidos por lei aplicável". O texto legal só sustenta com
segurança **autoplay** e **esconder o ponto de parada** (feed sem fim). O resto é decisão de produto **alinhada** à lei.
A diferença importa: uma regra de produto pode ser revista pelo Product Brain, uma proibição legal não.

### Sanções

- **FATO.** Art. 35: advertência com prazo de até 30 dias; multa de até 10% do faturamento do grupo econômico no
  Brasil **ou, ausente o faturamento**, de R$ 10 a R$ 1.000 **por usuário cadastrado**, limitada a R$ 50 milhões por
  infração; suspensão; proibição. Advertência e multa cabem à ANPD, e suspensão e proibição, ao Judiciário (§5º).
  Na gradação entram a "finalidade social do fornecedor" e a capacidade econômica (§1º). As multas são corrigidas
  pelo IPCA (§4º).
- **INFERÊNCIA.** Com ~3.000 contas, o teto teórico pela régua "por usuário" é de R$ 3 milhões por infração. Se a
  entidade tiver "faturamento", a régua passa a ser os 10%. **JURÍDICO:** o que conta como faturamento de uma
  associação religiosa, e o "grupo econômico" de uma rede de igrejas.

### Outras obrigações que a Comunidade ativa

| Obrigação | Artigo (FATO) | O que o app faz | Classificação |
|---|---|---|---|
| Padrão mais protetivo | Lei art. 7º | Tudo que expõe começa desligado. Perfil só aparece em post publicado | INFERÊNCIA |
| Canal de notificação de violações a direitos de menores | Lei art. 28; Decreto art. 41 (acessível, gratuito, divulgado) | Denúncia no post e no comentário (C5) + canal web | FATO |
| Retirada imediata a pedido de vítima, MP, polícia ou entidade habilitada, sem ordem judicial; **denúncia anônima vedada** | Lei art. 29 (§2º: identificar conteúdo e notificante); Decreto art. 43 | Formulário que identifica notificante e conteúdo. Fila prioritária | FATO |
| Contestação: aviso ao autor, motivo, **se a análise foi humana ou automatizada**, recurso, prazos | Lei art. 30 | Estado "removido" com motivo, botão de contestar, prazos escritos | FATO |
| Coibir abuso da denúncia; sanções com devido processo | Lei arts. 32–33 | Regras publicadas; suspensão por abuso com recurso | FATO |
| Remover e comunicar conteúdo de exploração ou abuso sexual infantil à Polícia Federal (Centro Nacional de Triagem) e preservar dados | Lei art. 27; Decreto arts. 36–39 | Procedimento escrito para esse caso. Avaliar detecção por hash | FATO (obrigação) / HIPÓTESE (ferramenta; não pesquisei disponibilidade nem custo) |
| Prevenção a intimidação sistemática (cyberbullying) com apoio à vítima | Lei art. 6º §2º | Regras da comunidade + motivo de denúncia | FATO |
| Termos em português com classificação indicativa | Decreto art. 12 §4º | Termos e regras da comunidade em pt-BR | FATO |
| Classificação indicativa considera **interação entre usuários** | Decreto art. 12 §2º, I | A classificação do app provavelmente sobe com o feed | FATO (norma) / INFERÊNCIA (efeito) |
| Informação para pais, acessível sem instalar o app | Lei art. 16 | Página web pública | FATO |
| Avaliação de impacto à segurança e saúde de menores, com **resumo público** | Lei art. 16 par. ún.; Decreto art. 47 | Documento único com o RIPD da LGPD (art. 38) | FATO |
| Ferramentas de supervisão parental (tempo de uso, restrição de interação) | Lei arts. 17–18 | Dispensa do art. 39 §1º só para controle editorial. **Com feed, a dispensa não cobre a Comunidade** (INFERÊNCIA). O art. 39 caput modula pela interferência, pelo número de usuários e pelo porte | JURÍDICO |
| Relatório semestral de transparência | Lei art. 31 | Só acima de 1 milhão de usuários menores | FATO: **não se aplica** |
| Representante legal no país | Lei art. 40 | Entidade brasileira | FATO: sem impacto |

---

## 5. Marco Civil art. 19 e Tema 987 do STF

### O que a lei e o STF dizem

- **FATO.** Marco Civil art. 19 (texto original): o provedor de aplicações só responde civilmente por conteúdo de
  terceiros se, "após ordem judicial específica", não tornar o conteúdo indisponível. Art. 21: para nudez ou ato
  sexual privado divulgado sem autorização, basta a notificação do participante. Art. 20: o provedor deve comunicar
  ao autor os motivos da indisponibilização.
- **FATO (documento do STF "Informação à Sociedade", RE 1.037.396 e RE 1.057.258).** Em **26/06/2025**, por 8 a 3,
  o STF declarou o art. 19 **parcialmente inconstitucional**. Tese:
  - (3) responsabilidade "nos termos do art. 21" por conteúdo de terceiros em casos de **crime ou ato ilícito**
    depois de notificação extrajudicial, inclusive para contas inautênticas;
  - (3.1) **crime contra a honra** continua exigindo ordem judicial, "sem prejuízo da possibilidade de remoção por
    notificação extrajudicial";
  - (3.2) replicações de fato ofensivo já reconhecido em juízo devem ser removidas a partir de notificação;
  - (4) presunção de responsabilidade em anúncios, impulsionamento pago e redes de robôs;
  - (5) **dever de cuidado** para rol taxativo de crimes graves, entre eles induzimento a suicídio e automutilação,
    incitação à discriminação (inclusive religiosa), crimes graves contra crianças e adolescentes, crimes contra a
    mulher e atos antidemocráticos, com responsabilização apenas por **falha sistêmica**;
  - responsabilidade **subjetiva**;
  - o art. 19 vale integralmente para e-mail, reuniões fechadas e mensageria **quanto a comunicações interpessoais**;
  - deveres de **autorregulação**: sistema de notificação, canais de atendimento divulgados, **devido processo** com
    recurso e **relatórios anuais de transparência**;
  - efeitos prospectivos.
- **FATO (fontes secundárias concordam na data).** Em **17/06/2026** o STF concluiu os **embargos de declaração**.
  Os provedores ganharam **60 dias** para implementar obrigações estruturais, contados da publicação da ata. Segundo
  Trench Rossi Watanabe (18/06/2026), a responsabilidade após notificação passou a ser **solidária**, com excludente
  de "dúvida razoável" após análise diligente. Violação à honra por ilícito civil também voltou ao regime de ordem
  judicial. A presunção em impulsionamento virou presunção relativa de culpa. Os efeitos contam a partir de 05/08/2025.
- **NÃO CONFIRMADO: o alcance por porte.** As fontes divergem sobre se as obrigações estruturais e o dever de cuidado
  ficaram restritos a provedores de grande porte (mais de 1 milhão de usuários no Brasil):
  - ConJur (11/06/2026, maioria em formação) e um resumo de busca dizem que sim;
  - Gomes Altimari diz que o corte por número de usuários foi **rejeitado**;
  - ConJur (17/06/2026) diz que o texto não diferencia por porte;
  - Trench Rossi diz que não há critério de porte.
  **Não consegui ler a tese final no portal do STF (HTTP 403).** JURÍDICO precisa ler o acórdão dos embargos.

### O que isso significa para a Comunidade

- **INFERÊNCIA.** Quem opera o feed é "provedor de aplicações" que hospeda conteúdo de terceiros. Receber uma
  **notificação extrajudicial** (a própria denúncia no app, ou um e-mail) sobre conteúdo ilícito e não remover
  depois de análise diligente pode gerar responsabilidade civil. Isso vale **independentemente de porte**, porque é
  o núcleo da tese de 2025, e as fontes não divergem sobre ele.
- **INFERÊNCIA.** A lista do dever de cuidado inclui "discriminação […] religião" e "crimes graves contra crianças".
  Um feed religioso público pode atrair ataques a outras fés ou à própria igreja. A pré-moderação reduz o risco de
  "falha sistêmica" mesmo que esse dever se aplique só aos grandes.
- **INFERÊNCIA.** Mesmo que as obrigações estruturais do Tema 987 se limitem aos grandes, os **mesmos itens**
  (notificação, motivo, recurso, prazos, registro) já são exigidos pelo **ECA Digital art. 30** e pelas lojas. Na
  prática, o conjunto a construir não muda.
- **FATO.** Marco Civil art. 19 §2º: infração a **direito autoral** fica fora do art. 19 e depende de lei específica.
  **INFERÊNCIA:** foto ou letra de música de terceiros num post seguem o regime geral. Convém remover mediante
  notificação do titular. JURÍDICO.
- **FATO.** Marco Civil art. 15: o dever de guardar registros de acesso por 6 meses é só de pessoa jurídica "com fins
  econômicos". **Porém** o ECA Digital art. 27 §2º manda reter, pelo prazo do art. 15, conteúdo e dados ligados a um
  relatório de abuso sexual infantil. Esse dever específico vale para todos (FATO).

### O que o app precisa fazer

1. **Denúncia com motivo** (C5): ilegal, ódio ou discriminação, assédio, "apareço nesta foto", "criança na foto",
   conteúdo sexual, spam, direito autoral, outro.
2. **Recibo e estado** da denúncia. **Prazo escrito e cumprido**: C5 promete 24 h, então precisa existir fila,
   responsável e cobertura em fim de semana.
3. **Aviso ao autor** quando algo sai do ar, com motivo, indicação de análise humana ou automática, caminho de
   contestação e prazo de resposta (ECA Digital art. 30; Marco Civil art. 20).
4. **Registro** de cada notificação e de cada decisão (`moderation_actions`), porque é a prova de diligência.
5. **Regras da comunidade** públicas, alcançáveis do feed e da tela de publicar.
6. **Canal para não usuários** (página web + e-mail publicado).
7. **Relatório anual simples**: quantas denúncias, quantas remoções, tempo médio. É barato, e cobre o cenário em
   que as obrigações estruturais valham para todos (RECOMENDAÇÃO).
8. **Procedimento de abuso sexual infantil**: remover, preservar e comunicar à PF, com responsável nomeado.

### O que muda no desenho

Tudo isto já aparece nos bloqueios do grupo C (`LACUNAS.md` B4, B10, B11; C6, C8, C9, C11), agora com a base legal
explícita. A novidade é que **não são só exigência de loja**: sem elas, a igreja responde civilmente e perante a ANPD.

---

## 6. Direitos do titular (LGPD art. 18)

### O que a lei diz

- **FATO.** Art. 18: confirmação e acesso (I–II); correção (III); anonimização, bloqueio ou eliminação do que for
  excessivo (IV); **portabilidade** "de acordo com a regulamentação da autoridade nacional" (V); **eliminação dos dados
  tratados com consentimento**, exceto nas hipóteses do art. 16 (VI); informação sobre compartilhamentos (VII); sobre
  a possibilidade de não consentir e as consequências (VIII); **revogação do consentimento** (IX). O atendimento é
  gratuito (§5º). É preciso avisar os operadores para que repitam a eliminação (§6º).
- **FATO.** Art. 19: acesso em formato simplificado imediatamente, ou declaração completa em **até 15 dias**. §3º:
  quando a base é consentimento, o titular pode pedir "cópia eletrônica integral" em formato reutilizável.
- **FATO.** Art. 16: a conservação depois do término é autorizada para obrigação legal, pesquisa, transferência
  lícita ou uso exclusivo do controlador **anonimizado**.
- **FATO.** Marco Civil art. 7º, X: exclusão definitiva dos dados fornecidos, a pedido, ao término da relação.
- **NÃO CONFIRMADO.** Se a ANPD já editou regulamento específico de portabilidade (art. 18, V). Não verifiquei hoje.

### O que o app precisa fazer

1. **Três ações separadas**:
   - **apagar um post ou comentário**: C5 precisa de variante para conteúdo próprio (`LACUNAS.md` C9);
   - **apagar tudo o que publiquei** sem sair do app (`00-DECISAO-FEED.md` item 9);
   - **excluir a conta** em cascata: posts, comentários, Amém e fotos no Storage, que não caem por FK.
2. **Revogar o consentimento = despublicar.** **INFERÊNCIA:** manter o post no ar depois da revogação seria
   continuar tratando dado sensível sem base. O art. 8º §5º ratifica o tratamento **passado**, não o futuro. A tela
   de revogação precisa dizer isso antes de confirmar.
3. **Exportação** (JSON) com posts, comentários, fotos (ou links assinados), Amém dados, consentimentos e denúncias
   feitas. Isso cobre acesso (art. 19 §3º) e, na prática, a portabilidade.
4. **Exclusão também pela web**, para quem desinstalou (lojas + Marco Civil art. 7º, X).
5. **Retenção mínima e justificada** do que sobrevive à exclusão:
   - registro do consentimento (prova, art. 8º §2º);
   - conteúdo removido sob contestação (exercício regular de direitos, art. 7º, VI e art. 11, II, d);
   - material de relatório de abuso infantil (ECA Digital art. 27 §2º).
   **Os prazos são JURÍDICO.** A retenção de consentimentos por 5 anos prevista em `SECURITY_V0.md` §1 precisa de
   fundamento escrito.
6. **Informar com honestidade o limite técnico**: capturas de tela feitas por outros não podem ser apagadas. Isso
   entra na cópia de C4 e da exclusão.

### O que muda no desenho

D1 "Conta e privacidade" ganha: revogar consentimento (com o efeito), apagar tudo o que publiquei, exportar,
excluir conta. C5 ganha a variante "é meu" (apagar em vez de denunciar ou bloquear a si mesmo).

---

## 7. O que isto muda nas decisões em aberto

| Decisão pendente | Consequência legal |
|---|---|
| **Alcance** (igreja inteira, grupo, qualquer pessoa com o app) | Define o texto do consentimento (art. 9º §1º). Com cadastro aberto a qualquer e-mail, "toda a igreja" é **falso** e anula o consentimento. Ou a audiência é "qualquer pessoa com o app", ou é preciso verificar vínculo com a igreja. |
| **Feed legível sem conta** | Menores leem conteúdo de terceiros, o que ativa ECA Digital arts. 8º, III e 28–30 e pesa a favor da pré-moderação. Tecnicamente, leitura anônima torna o conteúdo raspável (`LACUNAS.md` B5), e raspagem de dado sensível é incidente em potencial (art. 46). |
| **Feed como primeira tela** | Reforça o enquadramento como rede social (art. 2º, III) e empurra para a regra do art. 24. Uma aba secundária é defensável. |
| **Pré-moderação ou filtro automático** | Pré-moderação humana é a leitura mais segura do dever de cuidado e do ECA Digital art. 8º, III, e é viável com o volume de ~3.000 pessoas (INFERÊNCIA). Exige desenhar "em análise" e "recusado com motivo". |
| **Comentários** | Dobram a superfície de notificação, remoção e contestação. Já estão aceitos em REGRAS §5.6. |
| **Idade** | Recomendação: opção A (18+) na V1 (ver §4). |
| **Quem é o controlador** | É o CNPJ que responde perante a ANPD e o Judiciário, assina a política de privacidade, indica o encarregado e define "faturamento" para a multa. Não está decidido em lugar nenhum do repositório (INFERÊNCIA a partir da leitura de `SECURITY_V0.md` e do CLAUDE.md, que falam em "entidade dona" sem nomeá-la). |

---

## 8. O que exige parecer jurídico humano

Em ordem de custo de errar:

1. **Controlador e encarregado:** qual pessoa jurídica controla os dados da Comunidade (Lagoinha? uma igreja local?
   uma associação?) e quem é o encarregado (LGPD art. 41). Confirmar a exclusão do regime de pequeno porte por alto
   risco (Res. CD/ANPD 2/2022 art. 4º).
2. **Idade mínima para publicar:** 18 ou 16/17. Capacidade de 16–17 para consentir dado sensível sozinho
   (CC art. 4º, I; LGPD art. 11, I). Suficiência de autodeclaração + sinal da loja num serviço sem conteúdo impróprio.
3. **Alcance do ECA Digital art. 24** (todo serviço de acesso provável ou só rede social; "até 16" inclui 16?) e
   **enquadramento do app como rede social** (art. 2º, III; Decreto art. 19 §2º), inclusive o efeito de o feed ser
   a primeira tela.
4. **Terceiros em foto:** existe base legal para exibir terceiro identificável num contexto religioso? A regra "sem
   rosto de terceiro sem autorização" basta? Proibir criança identificável?
5. **Revogação e exclusão:** confirmar que revogar implica despublicar. Prazos de retenção do registro de consentimento,
   do conteúdo removido sob contestação e dos logs de moderação.
6. **Tema 987 depois dos embargos (17/06/2026):** ler o acórdão e confirmar se as obrigações estruturais e o dever de
   cuidado valem para um provedor de ~3.000 usuários, e se a responsabilidade virou solidária.
7. **ECA Digital, modulação do art. 39:** o que das ferramentas de supervisão parental (arts. 17–18) se aplica a uma
   Comunidade em que menores só leem.
8. **Faturamento para fins de multa** (ECA Digital art. 35, II) de uma associação religiosa e o seu "grupo econômico".
9. **Textos:** consentimento (C4), regras da comunidade, termos com classificação indicativa, política de privacidade,
   página para pais e resumo público da avaliação de impacto (Decreto art. 47 §1º).
10. **Direito autoral** em post de usuário (Marco Civil art. 19 §2º) e a licença que os termos pedem ao autor para
    exibir o post.

---

## 9. O que eu **não** confirmei

- O texto final da tese do Tema 987 depois dos embargos: portal do STF com 403 e fontes secundárias divergentes
  sobre o porte.
- A existência de regulamento da ANPD sobre portabilidade (art. 18, V).
- O Enunciado CD/ANPD 1/2023, citado pela pesquisa do Sprint 0 e não relido hoje.
- A disponibilidade e o custo de ferramentas de detecção de material de abuso infantil por hash para uma entidade deste
  porte.
- Qualquer regulamento específico da ANPD sobre supervisão parental (Lei art. 17 §1º) ou segurança por padrão
  (Decreto art. 10) publicado depois do FAQ de 30/07/2026.

---

## Fontes (todas acessadas em 2026-09-21)

1. Lei 13.709/2018 (LGPD), texto compilado: arts. 4º, 5º, 7º, 8º, 9º, 11, 14, 16, 18, 19, 37, 38, 41, 46, 48 e 52.
   https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
2. Lei 15.211/2025 (ECA Digital), texto compilado com o art. 41-A na redação da Lei 15.352/2026 e o art. 36-A da
   Lei 15.504/2026. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm
3. Decreto 12.880, de 18/03/2026 (regulamenta o ECA Digital).
   https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm
4. ANPD / MJSP / Secom: "Perguntas e respostas sobre o ECA Digital", atualizado em 30/07/2026 (PDF, página publicada
   em 31/07/2026). https://www.gov.br/anpd/pt-br/assuntos/eca-digital/perguntas_respostas_eca_digital_30072026.pdf
5. Lei 12.965/2014 (Marco Civil da Internet): arts. 7º, 15, 19, 20, 21.
   https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
6. STF: "Informação à Sociedade", RE 1.037.396 (Tema 987) e RE 1.057.258 (Tema 533), julgamento de 26/06/2025, com a
   tese. https://www.stf.jus.br/arquivo/cms/noticiaNoticiaStf/anexo/Informac807a771oa768SociedadeArt19MCI_vRev.pdf
7. STF: página do Tema 987 (**HTTP 403 nesta sessão; não lida**).
   https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=987
8. Trench Rossi Watanabe: "Brazilian Supreme Court refines its decision on application providers' liability in ruling
   on motions for clarification" (18/06/2026).
   https://www.trenchrossi.com/en/legal-alerts/brazilian-supreme-court-refines-its-decision-on-application-providers-liability-in-ruling-on-motions-for-clarification/
9. ConJur: "STF ajusta Marco Civil e amplia responsabilidade das plataformas" (17/06/2026).
   https://conjur.com.br/2026-jun-17/stf-amplia-responsabilidade-das-plataformas-digitais-e-redefine-aplicacao-do-marco-civil-da-internet/
10. ConJur: "Maioria do STF quer que plataformas sigam Marco Civil em 60 dias" (11/06/2026).
    https://www.conjur.com.br/2026-jun-11/stf-tem-maioria-pelo-prazo-de-60-dias-para-plataformas-se-adequarem-a-tese-do-marco-civil/
11. Gomes Altimari Advogados: "STF conclui o julgamento do Tema 987 e fecha os pontos pendentes".
    https://gomesaltimari.com.br/stf-conclui-o-julgamento-do-tema-987-e-fecha-os-pontos-pendentes-o-que-a-tese-definitiva-muda-para-as-empresas-que-operam-no-ambiente-digital/
12. ConJur: "STF fixa tese sobre responsabilização de plataformas por conteúdo" (26/06/2025).
    https://conjur.com.br/2025-jun-26/supremo-fixa-tese-sobre-responsabilizacao-de-plataformas-por-conteudo-de-usuarios/
13. Agência Brasil: "Cronograma prevê fiscalização efetiva do ECA Digital pela ANPD em 2027" (03/2026).
    https://agenciabrasil.ebc.com.br/direitos-humanos/noticia/2026-03/cronograma-preve-fiscalizacao-efetiva-do-eca-digital-pela-anpd-em-2027
14. JOTA: "ANPD divulga calendário do ECA Digital com fiscalização da aferição de idade em 2027".
    https://www.jota.info/executivo/anpd-divulga-calendario-do-eca-digital-com-fiscalizacao-da-afericao-de-idade-em-2027
15. HDPO: "ECA Digital: agosto abre a etapa II da fiscalização da ANPD".
    https://hdpo.com.br/eca-digital-etapa-ii-fiscalizacao-anpd-agosto-2026/
16. Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte), arts. 2º, 3º, 4º e 16 (transcrição em NormasLegais;
    página oficial: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).
    https://www.normaslegais.com.br/legislacao/resolucao-anpd-2-2022.htm
17. Lei 10.406/2002 (Código Civil): arts. 4º, 5º, 20, 21.
    https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
18. Lei 8.069/1990 (ECA): arts. 2º e 17. https://www.planalto.gov.br/ccivil_03/leis/l8069.htm
19. Constituição Federal: art. 5º, VI e X. https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm
20. Enunciado CD/ANPD nº 1/2023: citado da pesquisa do Sprint 0 (`docs/research/STORES_LEGAL_RESEARCH.md` [B10]),
    **não relido nesta sessão**. https://bibliotecadigital.mj.gov.br/handle/1/10215

Documentos internos usados: `docs/design/00-DECISAO-FEED.md`, `design_handoff_100_dias/REGRAS.md`,
`design_handoff_100_dias/LACUNAS.md` (bloqueios B3–B12, conflitos C5–C13), `design_handoff_100_dias/TELAS.md`
(C1–C6), `docs/research/STORES_LEGAL_RESEARCH.md`, `docs/technical/SECURITY_V0.md`,
`docs/technical/MOBILE_STORE_REQUIREMENTS.md`.
