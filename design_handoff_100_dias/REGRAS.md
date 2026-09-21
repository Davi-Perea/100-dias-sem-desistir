# Regras que o desenho não pode quebrar

Não são preferências. São lei brasileira, exigência de loja e promessa do produto. O levantamento completo está em `contexto/invariantes-do-produto.md`; abaixo o que afeta quem está implementando.

---

## 1. Conteúdo — bloqueante

1. **Nenhum texto de tradução bíblica na tela.** O app mostra a **referência** ("Josué 6–17"), nunca o versículo. A licença não está resolvida. O leitor (B1) foi desenhado para funcionar assim — e para funcionar depois, quando o texto puder aparecer, sem refazer a tela.
2. **Citação bíblica só como bloco identificado como citação**, com a referência canônica ao lado (é o que D5 faz). Nunca como parágrafo comum. Base: Lei 9.610/98 art. 46, III.
3. **Nenhum nome de líder.** A escala do altar mostra o ministério ("Hoje conduz: Intercessão"), nunca a pessoa. O rótulo não é nem gerado no dataset — nome dentro do pacote vira nome dentro do binário.
4. **O texto da igreja não se reescreve.** Ênfase, motivos de oração, nomes dos montes e a orientação vêm como vieram do `dataset.json`. O que o app escreve por conta própria (botões, rótulos, avisos) é revisável; o material não.
5. **Onde o desenho tem barra listrada com legenda monoespaçada, entra o campo real do dataset.** Não escreva texto devocional para preencher.

## 2. Produto — bloqueante

6. **O dia abre no dia oficial da igreja**, derivado de `start_date` + fuso da campanha, igual para todo mundo independente do fuso do aparelho. Campanha: 23/09/2026 a 31/12/2026.
7. **Dia futuro é fechado, e o bloqueio é da ROTA, não do botão.** Link direto, histórico e deep link chegam no mesmo cadeado de A4, sem revelar a leitura daquele dia.
8. **Dia em aberto do passado é clicável** (linha azul com chevron em A1 e A2). Entrada tardia e falta são comportamento normal, não erro.
9. **Nada de culpa.** Sem sequência que quebra, sem vermelho de falha, sem "você perdeu N dias", sem ranking. Dia não lido é **"Em aberto"** em azul — a cor da comunidade, não do erro.
10. **Sem mecânica de uso compulsivo.** Streak, badge, ranking, autoplay e recompensa por tempo são **proibidos por lei aplicável** (ECA Digital, Lei 15.211/2025; Decreto 12.880/2026 art. 9º), não só por escopo. Sanção de R$ 10 a R$ 1.000 por usuário cadastrado.
    > **Nota do engenheiro (2026-09-21), sem mudar a regra:** a pesquisa jurídica (`docs/product/comunidade/02-lei.md`) mostrou que o decreto lista quatro mecanismos — esconder o ponto de parada, autoplay, recompensa por tempo de uso e notificação excessiva. Streak, badge e ranking não aparecem no texto legal: estão fora por **decisão de produto** alinhada à lei. A regra continua valendo igual para o desenho; muda só o fundamento de parte dela.
11. **Número coletivo sem fonte vira estado honesto.** Se o dado não existe, a tela diz que não existe. Os números de D4 (grupo) e E4 (dia 100) são reais e locais — mantenha reais.
12. **Uso completo sem conta.** Ler, marcar, refletir e jejuar funcionam sem login e offline (Apple 5.1.1(v)). Conta serve para **publicar e reagir** na Comunidade. Nenhuma tela de entrada pode exigir conta — F1 tem "Começar" e D2 tem "Depois — dá para ler sem perfil".
13. **Permissão de notificação só sob gesto explícito** (escolher o lembrete, escolher o ministério). Nunca na abertura: o iOS mostra o diálogo uma vez na vida do app. Recusa **desfaz a preferência** em vez de prometer aviso que não vem.
14. **O que é privado continua privado.** Reflexão, jejum e progresso ficam no aparelho. A reflexão privada (B5) **nunca** pré-preenche uma publicação — quem quiser dizer algo para a igreja escreve de novo, do zero, de propósito.

## 3. Comunidade — exigência de loja

15. **Denunciar e bloquear visíveis e fáceis** (C5), no post e no comentário. Sem isso a Apple e o Google reprovam qualquer app com conteúdo publicado por usuário.
16. **Moderação humana com prazo.** C5 promete "alguém da igreja vai olhar em até 24 h" — isso precisa existir de verdade, com fila e responsável.
17. **Consentimento destacado antes da primeira publicação** (C4), com texto próprio, não escondido em termos, e versão registrada. Convicção religiosa é dado pessoal sensível (LGPD art. 5º, II).
18. **Aviso permanente de visibilidade acima do campo** em toda publicação (C3), dizendo quem vai ver.
19. **Sem contador de reação.** O Amém marca e desmarca, e ninguém vê quantos foram — **nem quem publicou**. Decisão de produto: não existe post com três reações ao lado de um post com nenhuma.
20. **Exclusão de conta dentro do app e por link web**, mais exportação em JSON. Exigência das duas lojas e da LGPD art. 18.
21. **Minimização.** Não colete CPF, telefone, endereço, data de nascimento exata, localização nem contatos. O perfil tem foto, nome e ministério, e nada mais.
22. **Sem session replay, sem SDK de anúncio ou atribuição.** Analytics desligado por padrão.
23. **Nada de pagamento, oferta ou doação** na interface.

## 4. Acessibilidade — bloqueante

24. **Alvo de toque nunca abaixo de 48**, com espaço entre alvos. Este app é para dedo de idoso também.
25. **Toda caixa com texto cresce com a fonte do sistema.** `minHeight` com `paddingVertical`, nunca `height`. O tamanho do desenho é piso, nunca teto. O teto real do React Native neste build é **3,571×** (AX5).
26. **Nenhum número de layout pode ser constante se ele reserva espaço para caixa de texto.** Meça com `onLayout`.
27. **Nenhuma tela sem rolagem.** Folha modal para em 88% e rola por dentro.
28. **Teclado aberto é estado de layout**, não detalhe — C3 e B5 precisam da versão com teclado.
29. **Contraste 4,5:1 para texto e 3:1 para limite de controle, nos dois temas.** `controlBorder` (`#8A877F`) e `accent` (`#FFD100`) **nunca** são cor de texto. Placeholder de campo é texto: usa `textMuted`.
30. **Estado nunca depende só de cor.** Nó da jornada, opção selecionada e aba ativa mudam de forma e de peso, não só de tom.
31. **Suporte a "Texto em Negrito" do sistema** — hoje é zero no app. Entra neste passe.
32. **Cabeçalho de seção marcado como cabeçalho** para leitor de tela. Cópia com "·" e "~" precisa de rótulo acessível separado, senão o leitor fala os símbolos.
33. **"Amém" é o nome acessível** do ícone de mão, em todo lugar.

---

## 5. Decisões que voltam para mim, não para o código

| # | Assunto | Situação |
|---|---|---|
| 1 | **Adiantar a leitura.** "Estou no dia 1, achei pouco, quero ler mais" contraria a regra 7, que é bloqueante. Minha recomendação: liberar só a **leitura bíblica** adiantada, mantendo ênfase, altar e intercessão no dia oficial. | **Não implemente sem decisão.** Hoje: futuro fechado. |
| 2 | **Licença do ícone de Amém.** `assets/icone-oracao.png` saiu de uma busca de imagens. Um ícone empacotado em app de loja precisa de licença por escrito (conjunto livre tipo OFL ou CC0). E precisa virar **vetor**, porque no tema escuro ele tem que ficar branco — PNG preto só inverte por filtro, e filtro não é cor de token. | **Pendente.** Use o PNG por enquanto. **Decidido (2026-09-21):** Phosphor `hands-praying` (MIT), `bold` = desmarcado, `fill` = marcado; entra no código só quando a Comunidade for construída. |
| 3 | **A pomba da Lagoinha em SVG.** Hoje é PNG 224×144 extraído do arquivo do cliente, e o desenho **depende de tingir a pomba** (branca no escuro, tinta sobre superfície amarela). Nos mocks ela está como espaço reservado na proporção certa. | **Bloqueia o tema escuro.** |
| 4 | **Jejum.** A igreja ainda não confirmou que existe jejum oficial nesta campanha; o material fala de consagração. As superfícies do jejum (linha em A3, contagem em D1, número em E4) foram desenhadas para **sair sem refazer a tela**. Se a resposta for não, a palavra provável é "consagração". | **Desenhado para ser removível.** |
| 5 | **Enviar para fora do app.** Cortado de propósito: mandar para o WhatsApp transforma o que alguém escreveu sobre a fé dela em mensagem fora daqui. Se voltar, volta com aviso na tela antes. | **Fora.** |
| 6 | **Comentário** é superfície nova de moderação além do post. Denúncia, bloqueio e remoção valem para ele também. | **Dentro, com o custo de moderação.** |
| 7 | **Tema escuro e os três tamanhos de letra** (padrão, 2× e 3,571×) ainda não foram desenhados tela por tela. Os valores estão em `TOKENS.md` e B2 mostra o padrão de empilhamento em fonte grande. | **Aplique a regra e me mostre antes de seguir.** |
| 8 | **Nome e identidade de loja.** Na tela o app se chama **100 dias sem desistir**. Ícone de loja e splash ainda não existem. | **Pendente.** |
