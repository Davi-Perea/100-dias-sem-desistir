# Perguntas ao designer — antes da implementação

> Copie tudo abaixo da linha e envie ao designer.
> Levantado em 2026-09-21 comparando as 32 telas com o código real. O registro completo está em `LACUNAS.md`.

---

Recebi o handoff e comparei as 32 telas com o código do app, uma por uma. Está muito bom — a maior parte
dá para implementar com fidelidade. Antes de começar, preciso de respostas em três frentes.

**Primeiro, o que eu vou resolver sozinho**, para você não precisar especificar de novo. É a parte técnica,
e a regra aqui é que o desenho é seu e fazer ele funcionar é comigo:

- **Telas de fundo fixo** (F1, C4, E2, E3, E4): o `TELAS.md` usa ali tokens que mudam com o tema, e o texto
  some — "Apocalipse 21:5" mede 1,74:1 no claro, e a frase do E3 e do F1 cai para 1,19:1 no escuro. Vou
  fixar as cores: as telas pretas usam os valores do tema escuro e as amarelas os do claro.
- **Campos de texto** (B5, C3, C6) sem borda sobre página branca medem 1,09:1 de limite. Vou pôr uma borda
  de 1,5px em `controlBorder` e um estado de foco.
- **Onde `TELAS.md` e `TOKENS.md` discordam** (cap 600 contra 700, "Faltam N dias" 50 contra 52, e outros),
  a tela específica vence a tabela geral.
- **Tamanho do texto de 14 a 30, passo 2, padrão 19**: a conta não fecha (de 19 só dá ímpar). Vou manter os
  extremos 14 e 30 como último passo de cada lado.
- **Estrutura de versículos no leitor**: o app não tem a contagem de versículos por capítulo, e numerar
  versículos seria inventar uma estrutura que não existe. O leitor mostra o capítulo, o numeral e o aviso.
- **Texto em negrito do sistema**: vou promover um peso dentro das oito faces (500→600, 600→700, 700→800;
  serifa 400→600). O 800 fica 800, porque não há face mais pesada empacotada.
- **O que o React Native não faz igual ao CSS**: sublinhado com offset, realce com raio numa palavra dentro
  do parágrafo, `blur(20px)`, transição de 220ms. Vou aproximar e mostro na revisão da etapa.
- **Barra flutuante**: os 26 do fundo passam a contar a partir da área segura, senão ela cobre o indicador
  de home do iPhone.
- **Cabeçalho**: todas as telas com barra própria, nenhuma com o cabeçalho nativo, porque o título nativo não
  cresce com a fonte do sistema.

**Agora, o que só você pode responder.** Estão em ordem: as primeiras travam telas inteiras.

## As que travam uma tela

1. **O painel de hoje depois de concluído.** A1 só mostra o estado aberto ("Ler agora"). O estado mais comum,
   de quem já leu hoje, não está desenhado. E não existe **desfazer** em lugar nenhum: um toque errado em
   "Concluir leitura" fica sem volta.

2. **Como conclui o dia quem lê na própria Bíblia.** "Vou ler na minha Bíblia" "marca o modo e fecha, mas
   não conclui". Então onde essa pessoa marca que leu? A3 perdeu o "Marcar como concluído", e o aviso de B1
   diz "volte para marcar" sem dizer onde. Isso é crítico: **enquanto a licença de tradução não sair, o
   leitor não tem texto nenhum — na prática, todo mundo vai ler na própria Bíblia.** E "Prefiro ler na minha
   Bíblia", dentro do leitor, segue a mesma regra?

3. **Da casa até o dia de hoje completo.** O A3 só abre tocando dias passados. Pelo painel de hoje não se
   chega nele — e é no A3 que ficam a intercessão, o altar, a reflexão e o jejum de hoje. O painel inteiro
   abre o A3? Ou tem um "Ver o dia"?

4. **A ordem entre "Depois de concluir" (B4) e o marco (E3/E4).** Quando a leitura concluída é a 7ª, 25ª,
   50ª, 75ª ou 100ª, qual aparece primeiro? Um substitui o outro? E quando a conclusão acontece fora do leitor?

5. **A faixa de aviso de conteúdo.** Enquanto a igreja não autorizar a publicação do material, é obrigatório
   mostrar *"Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja para publicação. Não
   distribuir esta versão."* (versão curta: *"Aguardando autorização da igreja."*) em toda tela de conteúdo.
   Nenhuma das 32 telas reserva lugar para ela. Onde ela entra, nas versões longa e curta, inclusive nas
   telas pretas?

6. **B5 com o teclado aberto.** O `TELAS.md` exige essa versão mas não descreve. O que fica no rodapé, a cap
   continua, onde vai a caixa azul?

7. **O fim do feed.** A lei proíbe rolagem infinita, então o feed tem fim — como é esse fim? E qual a ordem
   dos posts, e o recorte: só de hoje, ou a campanha inteira? Me mostre também os piores casos que eu tinha
   pedido: o post sem nenhum Amém, e um post de luto logo acima de uma foto de festa.

8. **O caminho completo até publicar.** Publicar exige conta, e conta é só para maiores de 18. O mapa vai de
   "Escrever" direto para C4 e C3, sem conta, sem idade e sem as regras da comunidade. Onde isso entra? E o
   que acontece quando alguém sem conta toca Amém, comentar ou "Escrever"?

9. **"Não quero ver este assunto".** O que é "assunto"? O app não tem tema nem etiqueta nos posts. É o monte
   do dia, o autor, o post? Se não houver definição, sugiro trocar por "Ocultar esta publicação".

10. **O grupo, do começo ao fim.** Criar, dar nome, convidar **sem link público**, aceitar, grupo cheio, sair,
    remover alguém — sem administrador. Hoje só o D4 existe. E "Convidar alguém" sem link é o ponto mais
    difícil: código mostrado pessoalmente funciona, mas mandado por WhatsApp vira link; buscar por nome expõe
    as ~3.000 pessoas da igreja.

11. **Seis coisas que existem hoje em "Você" e não têm lugar no D1:** o aviso diário do altar das 12h30 (quem
    ligou não vai conseguir desligar), o modo de leitura (o F2 promete "dá para mudar depois"), a opção de
    estatísticas de uso (é obrigatória por regra), a Ajuda, o altar de hoje e o jejum.

12. **Telas que faltam:** a de entrar ("Já tenho perfil" não leva a nenhuma das 32), a de **Conta e
    privacidade** — sair, excluir a conta dizendo o que acontece com os posts, apagar publicações, exportar
    os dados, revogar o consentimento; as duas lojas exigem —, e um molde para as telas que você não desenhou:
    lembrete, ministério, jejum, ajuda e aparência.

## As que eu consigo contornar, mas prefiro ouvir

13. **Primitivos da etapa 1 sem medida no `TOKENS.md`:** pílula, linha de lista, caixa de marcação, campo de
    texto, interruptor desligado, segmentos de passo, esqueleto e avatar com foto.
14. **Régua dos cem dias:** qual é a forma do dia "em aberto"? Na régua nova ele ficou igual ao dia futuro.
15. **Variantes de texto:** hoje o parágrafo de interface é sem serifa e no desenho vira serifa. Existe um
    parágrafo de interface sem serifa, para legendas longas e textos de apoio?
16. **A pomba voando** está no `TOKENS.md`, mas nenhuma tela a usa. Onde ela voa? E os nós especiais de marco e
    da chegada saíram da Jornada de propósito?
17. **O ícone do Amém:** preciso dele em vetor, nos dois estados (contorno e cheio), de um conjunto com licença
    por escrito. O Phosphor Icons (licença MIT) tem, pelo que sei, um de mãos em oração — eu confirmo antes de
    usar.
18. **O grupo F** (F1 a F6): recebi as capturas de A a E, mas não as de F.

Pode responder aos poucos. Eu começo pela parte que não depende de nenhuma dessas respostas: os tokens e
os componentes-base.
