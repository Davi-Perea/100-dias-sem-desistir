# Pacote de design — 100 Dias

> Para quem vai desenhar. Montado em 2026-09-20 a partir do código, não de uma intenção.

Este pacote existe para que um desenho novo nasça sabendo o que o produto já é, o que ele não pode
desdizer e onde estão as escolhas que ainda faltam. Ele é autossuficiente: quem receber isto não precisa
do repositório para trabalhar.

---

## 1. O produto em cinco frases

App mobile de leitura bíblica em pt-BR (iOS e Android), feito para a campanha **100 Dias** da Lagoinha —
23/09 a 31/12/2026, a igreja inteira lendo a mesma coisa no mesmo dia. O primeiro ambiente real são
~3.000 pessoas, mas o app não é "só de 100 dias": a arquitetura prevê outras jornadas (Bíblia em um ano).
Funciona **sem login** e offline; o que a pessoa escreve fica no aparelho dela. O conteúdo editorial é
material **próprio da igreja** — um guia diário de intercessão com leitura, ênfase, monte, versículo-base
e motivos de oração, mais a escala de ministérios que conduzem o altar das 12h30.

O que ele **não** é, e não deve virar num desenho novo: ranking, gamificação, plataforma multi-igrejas,
ou qualquer coisa que peça pagamento.

> **Mudança de escopo em 2026-09-20.** O app passa a ter um **feed da comunidade**, e ele passa a ser a
> primeira tela. Isso é decisão do fundador e supera quatro invariantes deste pacote — leia
> [00-DECISAO-FEED.md](00-DECISAO-FEED.md) antes de qualquer outra coisa, porque ela diz exatamente o que
> caiu, o que **continua valendo** e as dez obrigações legais e de loja que o feed traz junto.

---

## 2. O que tem aqui

| Peça | O que é |
|---|---|
| [00-DECISAO-FEED.md](00-DECISAO-FEED.md) | **Leia primeiro.** A mudança de escopo de 20/09: o feed entra, vira a primeira tela, e supera quatro regras deste pacote. Diz o que caiu, o que continua valendo e o que o feed obriga a existir. |
| [sistema-visual.html](sistema-visual.html) | Página autocontida: as duas paletas token por token, a tipografia renderizada nas fontes reais, espaço, raio, pisos de caixa e o inventário de componentes. As razões de contraste são calculadas na própria página a partir dos hex — não são números copiados à mão. |
| [01-sistema-de-tokens.md](01-sistema-de-tokens.md) | O sistema inteiro em texto: 27 tokens por tema, 18 variantes de tipografia, vidro, sombra, movimento, e cada primitivo de interface que já existe. |
| [02-contraste.md](02-contraste.md) | Contraste medido par a par nos dois temas, as exceções registradas e — mais importante — **o que a medição não alcança**. |
| [03-telas.md](03-telas.md) | Toda rota do app: para que serve, o que mostra, em que ordem, e todos os estados (carregando, vazio, trancado, antes da campanha, encerrada, sem conta). |
| [04-invariantes.md](04-invariantes.md) | As regras que um desenho novo não pode quebrar, cada uma com a fonte e a consequência de quebrá-la. |
| [05-decisoes-abertas.md](05-decisoes-abertas.md) | O que está esperando decisão de desenho, e os defeitos de interface que continuam abertos. |

---

## 3. O que é intocável

Não porque é bonito — porque quebrar custa caro, legal ou humanamente. A lista completa está em
[04-invariantes.md](04-invariantes.md); estas são as que mais restringem desenho:

1. **Nenhum texto de tradução bíblica na tela.** O app mostra **referências** ("Josué 6–17"), nunca o
   versículo, enquanto a licença de tradução não estiver resolvida. Não desenhe uma tela que pressuponha
   o texto sagrado visível — desenhe a que funciona sem ele, e a que funciona com ele depois.
2. **Nenhum nome de líder**, até autorização escrita e separada da igreja. A escala mostra o ministério,
   não as pessoas.
3. **O texto da igreja não se reescreve.** Ênfase, motivos de oração, nomes dos montes e a orientação aos
   líderes são reproduzidos como vieram. O que o app escreve por conta própria (rótulos, botões, avisos)
   é revisável; o material, não.
4. **O dia abre no dia oficial da igreja.** Nada de adiantar, e nada de punir quem entra tarde: quem
   entrar no dia 20 vê o dia 20, sem tela de culpa e sem dívida de 19 dias.
5. **Números coletivos honestos.** Se o dado não existe, o app diz que não existe. Não desenhe um gráfico
   de participação da igreja que precise de número inventado para ficar bonito.
6. **Alvo de toque nunca abaixo de 48pt**, e **toda caixa com texto cresce com a fonte do sistema** — o
   tamanho do desenho é piso, nunca teto. Este foi o defeito mais caro já corrigido no app.
7. **Amarelo nunca é texto.** É preenchimento e realce. No tema escuro, tinta e amarelo trocam de papel
   com a superfície.
8. **Convicção religiosa é dado sensível (LGPD art. 5º, II).** Progresso de leitura, reflexões e jejum
   são dados sensíveis: nada de expor por padrão, nada de compartilhamento implícito.

---

## 4. O que está aberto para desenho

Detalhe e opções em [05-decisoes-abertas.md](05-decisoes-abertas.md). Em resumo:

- **Fonte grande de verdade.** O app garante caixas que crescem, mas há lugares onde a composição não
  sobrevive: o rodapé do leitor não cabe acima de ~2,9×, as estatísticas do Dia 100 têm de quebrar em
  algum limiar, e o par de botões do Início já nasce em duas linhas com fonte padrão. Isso é composição,
  não código.
- **O tema escuro nunca foi desenhado.** Ele foi derivado por engenharia de uma única tela do handoff.
  Funciona e passa em contraste, mas ninguém o desenhou — e foi exatamente essa lacuna que fez a marca
  desaparecer no escuro até pouco tempo atrás.
- **A tela de chegada e os marcos** (7, 25, 50, 75 e o Dia 100) são o momento mais cerimonial do produto
  e o que menos recebeu atenção de desenho.
- **Estados que ninguém desenhou:** campanha encerrada, sem internet de verdade, lista vazia, erro.

---

## 5. O que este pacote não tem

Dito na frente para ninguém descobrir tarde:

- **Não tem capturas das telas.** O jeito honesto de ver o app é rodá-lo. A ordem útil de visita está no
  §6. A descrição estrutural de cada tela está em [03-telas.md](03-telas.md).
- **Não tem o handoff original.** O desenho atual veio de um handoff de 2026-09-07
  (`100 Dias Lagoinha.dc.html`), cuja implementação está mapeada em
  `docs/technical/DESIGN_IMPLEMENTATION.md`. Se o trabalho novo for **revisar** aquele desenho e não
  partir do zero, esse arquivo precisa ir junto — senão vão existir dois donos do mesmo desenho.
- **Não tem prova em aparelho.** Nenhum número de layout deste pacote foi medido num telefone real: são
  contas sobre as fontes empacotadas. O ambiente de desenvolvimento é Windows, sem Mac e sem SDK Android.
- **Não tem a marca em vetor.** A pomba da Lagoinha é um PNG de 224×144 extraído do arquivo do cliente.
  O SVG oficial está pendente, e sem ele a marca não é tingível por código.

---

## 6. Para ver o app rodando

```bash
cd mobile && npx expo start --web
```

Ordem de visita que conta a história do produto, do primeiro uso ao fim:

`/onboarding` → `/onboarding/leitura` → `/onboarding/jejum` → `/onboarding/lembrete` →
`/onboarding/pronto` → `/` (Início) → `/reader/17` → `/dia/17` → `/intercessao/17` → `/reflexao/17` →
`/jornada` → `/juntos` → `/proposito` → `/voce` → `/ministerio` → `/aparencia` → `/marco/25` →
`/marco/100`

Telas de apoio: `/reflexoes`, `/jejum`, `/lembrete`, `/conta`, `/ajuda`, `/grupo/[id]`.
Telas internas, fora do desenho do produto: `/dev`, `/admin`.

Vale ver **cada uma nos dois temas** (o app segue o tema do sistema; não há seletor no app) e ao menos
uma tela com a fonte do sistema aumentada.

---

## 7. O que precisa voltar

Para o desenho virar código sem tradução no meio do caminho:

1. **Tokens, se mudarem** — hex, tamanhos e espaçamentos como valores, não como imagem.
2. **Os dois temas**, ou a declaração explícita de que o escuro deriva do claro por regra (e qual regra).
3. **Cada tela em três tamanhos de fonte** (padrão, ~200% e o máximo), porque é aí que a composição
   decide se sobrevive.
4. **Os estados**, não só o caso feliz: vazio, carregando, erro, trancado, offline.
5. **O que mudou e por quê.** Um desenho novo que contradiga um invariante do §3 precisa dizer qual, e a
   decisão volta para o Product Brain — não se resolve no código.

---

## 8. Estado do produto, sem adoçar

O app está construído e testado (337 testes), mas **não está nas lojas** e não estará no primeiro dia da
campanha. Duas portas continuam fechadas: a licença de tradução bíblica (Gate 1) e a autorização escrita
da igreja para publicar o material (Gate 2). Enquanto a segunda não vier, builds de desenvolvimento mostram
um aviso de conteúdo e builds de release **falham na abertura**, de propósito.

Restam 24 achados de revisão em aberto, quase todos de leitor de tela, cópia e higiene — a lista está em
`docs/technical/EXECUTION_04_REVISAO.md` §3, e o que afeta interface está resumido em
[05-decisoes-abertas.md](05-decisoes-abertas.md).
