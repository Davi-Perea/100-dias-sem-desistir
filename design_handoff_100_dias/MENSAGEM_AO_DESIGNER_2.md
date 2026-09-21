# Mensagem ao designer (2): tudo numa mensagem só

> Copie tudo abaixo da linha e envie. Ela **substitui** o envio separado de `PERGUNTAS_AO_DESIGNER.md`, da seção 5 de
> `docs/design/TEMA_ESCURO_PROPOSTA.md` e da lista de desenho de `docs/product/comunidade/01-lojas.md` §6.
> Montada em 2026-09-21. As perguntas repetidas entre as três listas aparecem uma vez só.

---

Olá! Juntei numa mensagem só tudo o que preciso de você, para não chegar em pedaços. Está em ordem de prioridade:
responda de cima para baixo, e pode ser aos poucos.

**Um aviso antes:** a parte 4 (Comunidade) **só vale se a Comunidade for aprovada**. Essa decisão ainda está aberta com
o Davi e com a liderança. Enquanto ela não sair, pode deixar a parte 4 de lado.

## 0. O que a engenharia já resolveu (não precisa refazer)

É a parte técnica. A regra é: o desenho é seu, e fazer ele funcionar é com a engenharia.

- **Telas de fundo fixo** (F1, C4, E2, E3, E4): fixei as cores. As pretas usam os valores do tema escuro e as amarelas,
  os do claro. Com tokens que mudam de tema, o texto sumia (1,19:1 no pior caso).
- **Campos de texto** (B5, C3, C6): ganharam borda de 1,5 px em `controlBorder` e estado de foco. Sem borda, o limite
  do campo mede 1,09:1.
- **Quando `TELAS.md` e `TOKENS.md` discordam**, vale a tela específica.
- **Tamanho do texto 14–30, passo 2, padrão 19:** a conta não fecha. Mantive 14 e 30 como último passo de cada lado.
- **Leitor sem números de versículo:** o app não tem essa contagem, e inventar seria fabricar estrutura. Mostra o
  capítulo, o numeral e o aviso.
- **Negrito do sistema:** subo um peso dentro das oito faces empacotadas (500→600, 600→700, 700→800; serifa 400→600).
- **O que o React Native não faz igual ao CSS** (sublinhado com offset, realce com raio dentro do parágrafo,
  `blur(20px)`, transição de 220 ms): vou aproximar e mostro na revisão.
- **Barra flutuante:** os 26 px contam a partir da área segura, para não cobrir o indicador de home do iPhone.
- **Cabeçalho:** todas as telas com barra própria, porque o título nativo não cresce com a fonte do sistema.
- **Barra de voltar (BackBar):** em fonte grande ela quebra em duas linhas em vez de cortar o título.
- **Faixa "sem internet":** agora aparece só quando a rede cai de verdade, não mais por falha de consulta.
- **Acolhida do A2:** sem número nenhum (regra 9 é bloqueante); a cópia não traz contagem.

## 1. O que trava a primeira versão

Sem estas, eu não fecho as telas principais (`docs/product/PLANO_DE_LANCAMENTO.md`, item D13).

1. **Painel de hoje já concluído.** Decidido provisoriamente: com o dia concluído, o painel mostra que a leitura foi
   concluída e um sublinhado discreto "Desfazer" (rótulo acessível "Desfazer a conclusão do dia N"), que desmarca.
   Se discordar, diga.
2. **Onde conclui quem lê na própria Bíblia?** Decidido provisoriamente: "Vou ler / Prefiro ler na minha Bíblia" nunca
   conclui o dia (invariante P-09); grava o modo e volta. Concluir é sempre um gesto explícito "Concluir leitura", no
   último capítulo do leitor e no painel de hoje, nos dois modos. Se discordar, diga.
3. **Do painel até o dia de hoje completo.** Decidido provisoriamente: o painel mantém "Ver o dia completo", que abre o
   A3 de hoje. Se discordar, diga.
4. **B4 ou marco (E3/E4) primeiro?** Nas leituras 7, 25, 50, 75 e 100, qual aparece antes? Um substitui o outro? E
   quando a pessoa conclui fora do leitor?
5. **Faixa de aviso de conteúdo.** Até a igreja autorizar, toda tela de conteúdo precisa mostrar *"Conteúdo real dos 100
   Dias, aguardando autorização escrita da igreja para publicação. Não distribuir esta versão."* (curta: *"Aguardando
   autorização da igreja."*). Nenhuma tela tem lugar para ela. Onde entra, nas duas versões, inclusive nas telas pretas?
6. **B5 com o teclado aberto:** o que fica no rodapé, a cap continua, onde vai a caixa azul?
7. **O que existe hoje em "Você" e sumiu do D1:** aviso do altar das 12h30 (quem ligou não consegue desligar), modo de
   leitura (o F2 promete "dá para mudar depois"), Ajuda, altar de hoje e jejum. (A opção de estatísticas de uso saiu
   do app: ele não tem análise de uso e não envia nada.)
8. **Telas que faltam:** a de entrar ("Já tenho perfil" não leva a nenhuma tela) e um molde para as que você não
   desenhou: lembrete, ministério, jejum, ajuda e aparência. (Conta e privacidade está na parte 4.)

## 2. O que eu contorno, mas prefiro ouvir

9. **Medidas que faltam no `TOKENS.md`:** pílula, linha de lista, caixa de marcação, campo de texto, interruptor
   desligado, segmentos de passo, esqueleto, avatar com foto. Também sem cor: área de foto tracejada, círculo tracejado
   de D3 e barras listradas do leitor (as minhas propostas estão em C3, D3 e B1 no documento do tema escuro).
10. **Régua dos cem dias:** qual é a forma do dia "em aberto"? Hoje ficou igual ao dia futuro.
11. **Parágrafo de interface sem serifa** para legendas longas e textos de apoio: existe?
12. **A pomba voando** está no `TOKENS.md` e em nenhuma tela. Onde ela voa? Os nós de marco e de chegada saíram da
    Jornada de propósito?
13. **Grupo F** (F1 a F6): recebi as capturas de A a E, mas não as de F.

## 3. Tema escuro (etapa 8)

O raciocínio e as medidas estão em `docs/design/TEMA_ESCURO_PROPOSTA.md`. Confirme ou troque:

14. **Realce:** a palavra dentro do amarelo é sempre `#111111`, nos dois temas?
15. **Bloco sobre fundo quente** (A3, B3, D4, E1): `surfaceMuted` `#232220` com borda?
16. **Folha modal:** filete no topo, ou outra solução?
17. **Anel de "não leu" em D4 e borda da caixa de jejum em A3:** `controlBorder`?
18. **Pomba branca:** é variante aprovada da marca? Você manda em @2x e @3x?
19. **Faixa "sem internet":** fica `#6B6A63` (minha recomendação) ou a azul com borda?
20. **Nó de hoje:** o anel continua branco?
21. **Caixas de D2 sem borda:** ganham `controlBorder`, como já fiz nos campos de texto?
22. **Telas amarelas (F1, E3) à noite:** ficam amarelas, como diz a regra? Eu proponho que sim.
23. **Fotos do feed:** nenhum tratamento no escuro, certo?

## 4. Comunidade (só se for aprovada)

As pesquisas de lojas, lei e moderação (`docs/product/comunidade/`) mostraram que publicar exige telas que não estão
entre as 32. O resumo de cada item está em `01-lojas.md` §3 e §6.

24. **Estados do próprio post:** "Em análise" (só o autor vê) e "Não publicado" (com motivo e um jeito de contestar),
    em C1 e C3, e o mesmo para comentário. A Apple exige filtrar **antes** de aparecer (regra 1.2), então C3 não pode
    publicar direto.
25. **Regras da comunidade com aceite**, numa tela própria, antes da primeira publicação, comentário ou Amém. A pessoa
    rola até o fim e toca "Li e aceito as regras", sem opção de pular, com link para as regras em C1 e C3. É exigência do
    Google Play. Depois dela vem o C4, que continua sendo uma tela separada
    (`docs/legal/COMUNIDADE_REGRAS_E_CONSENTIMENTO_rascunho.md` §1).
26. **"Denunciar [pessoa]"** em C5, além de denunciar a publicação (Google Play). Na mesma folha: os motivos (inclusive
    "apareço nesta foto e não autorizei"), o recibo da denúncia e uma versão de C5 para o próprio post (apagar, sem
    "bloquear").
27. **Tela "Conta e privacidade"**: sair; excluir a conta, dizendo que posts, comentários, fotos e Améns somem junto;
    avisar que também dá para excluir pela web, sem o app; apagar o que publiquei; exportar meus dados; revogar o
    consentimento ("Deixar de participar da comunidade", tão fácil quanto aceitar); ver quem bloqueei. As duas lojas
    exigem essa tela (`01-lojas.md` §1.4 e §2).
28. **Entrada com código**, se a igreja escolher a opção "igreja inteira com código" (a recomendada em
    `00-DECISOES.md` §1). Falta o caminho: onde digitar, código errado, código vencido ou cancelado, e o que acontece
    depois de entrar. O código é entregue por um líder ou ministério e fica guardado na conta.
29. **A aba Comunidade para quem não tem conta** (ou ainda não tem código): um convite, nunca erro nem muro. Texto
    proposto: "Para ler e publicar na comunidade, crie sua conta e use o código da sua igreja" (`00-DECISOES.md` §2).
    Isso responde também o que acontece quando alguém sem conta toca Amém, comentar ou "Escrever".
30. **Uma frase só sobre quem vê**, idêntica em C3, C4 e B4. Hoje C3 diz "toda a igreja" e C4 diz "qualquer pessoa que
    baixar o app". Com textos diferentes, o consentimento pode ser anulado (LGPD art. 9º §1º). Rascunho, ainda sem
    revisão de advogado: *"Sua publicação aparece, com o seu nome e a sua foto de perfil, para as pessoas que entraram
    na comunidade da [NOME DA IGREJA] com um código da igreja — hoje cerca de [N] pessoas maiores de 18 anos. Algumas
    você não conhece."* No B4, a segunda frase sobre o que é "só para você" continua (`COMUNIDADE_REGRAS...` §3).
31. **Caminho completo até publicar:** conta, idade (só maiores de 18), código, regras, consentimento. Hoje o mapa vai
    de "Escrever" direto para C4 e C3.
32. **O fim do feed.** A lei proíbe esconder o ponto natural de parada (Decreto 12.880/2026, art. 9º), e feed sem fim
    cai nisso. Como é esse fim, qual a ordem dos posts e o recorte (só hoje ou a
    campanha inteira)? Mostre também os piores casos: post sem nenhum Amém, e post de luto logo acima de foto de festa.
33. **"Não quero ver este assunto":** o app não tem tema nos posts. Se não houver definição, sugiro "Ocultar esta
    publicação".
34. **O grupo, do começo ao fim** (criar, nomear, convidar **sem link público**, aceitar, grupo cheio, sair, remover
    alguém, sem administrador). Atenção: o estudo recomenda **tirar D4 da V1**, porque mostrar quem leu contradiz o
    próprio consentimento (`00-DECISOES.md` §5). Se o Davi decidir assim, essa parte muda.
35. **Ícone do Amém.** Decidido provisoriamente: Phosphor `hands-praying` (MIT), `bold` desmarcado e `fill` marcado,
    em branco no escuro; entra quando a Comunidade for construída. Se discordar, diga.
36. **Prazo da denúncia em C5:** "até 24 h" não vem de lei nem de loja, e vira promessa cobrável. O prazo final depende
    da escala de moderadores da igreja. Deixe o número como variável por enquanto (`04-moderacao.md` §1).

Obrigado! Os tokens e os componentes-base já estão prontos. Enquanto isso, a engenharia segue montando as telas com as
regras que já temos e marca como provisório o que depende destas respostas.
