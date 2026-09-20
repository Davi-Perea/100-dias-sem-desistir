# EXECUTION 04 — revisão adversarial e correções

- **Data:** 2026-09-20 · **Estado:** três correções aplicadas, **não commitadas**
- **Método:** cinco lentes independentes (design, conteúdo, acessibilidade, correção, completude) produziram
  64 achados; cada achado foi submetido a três refutadores com ângulos distintos (reprodução no código,
  regra escrita que viola, impacto real). Sobrevive o que dois dos três não conseguiram refutar.
- **Resultado:** 48 confirmados (1 alto, 19 médios, 28 baixos), 16 refutados, 0 sem verificação.

Na primeira execução 117 dos 197 agentes morreram por limite de modelo, e a apuração tratava agente morto
como achado refutado — 39 achados foram descartados sem terem sido checados. A apuração foi corrigida
(agente morto vira "não verificado", nunca "refutado") e a execução retomada do ponto em que parou.

---

## 1. O que foi corrigido

### 1.1 Texto bíblico em tradução protegida dentro do conteúdo (ALTO)

A orientação da igreja fecha citando Levítico 6:13. O texto entrava no conteúdo como parágrafo comum e era
exibido em "Sobre o propósito" — o único texto de tradução do aplicativo, que por decisão de projeto não
mostra nenhuma enquanto o Gate 1 não fechar. Não havia guarda: mais versículos no `.docx` entrariam sozinhos.

| Onde | O que mudou |
|---|---|
| `scripts/convert-100-dias.mjs` | Reconhece citação (trecho entre aspas + referência), separa num bloco `scripture` com a referência canônica e **recusa a geração acima de três citações** |
| `content/100-dias-2026/proposito.json` | Ganhou `scripture_quotes` para auditoria; a citação virou bloco próprio |
| `src/journey/proposito.ts` | Tipo do bloco e `scriptureQuotes()` |
| `src/app/proposito.tsx` | Citação renderizada identificada como citação, com a referência ao lado |
| `content/source/README.md` | Regra e base legal registradas |

**Base:** citação avulsa e atribuída é lícita (Lei 9.610/98, art. 46, III), e a SBB admite até 500 versículos
sem autorização escrita. Isso **não** libera o Gate 1: o leitor continua sem exibir tradução nenhuma.
**Pendente:** a igreja precisa informar **qual tradução** é essa para a atribuição ficar completa.

### 1.2 Marco misturava contagem pessoal com dia da igreja (MÉDIO, efeito alto)

A tela de marco é disparada pela **contagem de leituras** da pessoa, mas descrevia o **dia de calendário**
homônimo: data, monte e ênfase. Quem entrasse atrasado e completasse a 25ª leitura com a igreja no dia 40 via
"17/10/2026 · Governo · Coração sábio para governar" — conteúdo de um dia que talvez nem tivesse lido.

- O rótulo passou a ser "Marco · 25 de 100 dias lidos", sem data.
- Saiu a linha com o monte e a ênfase do dia homônimo.
- **Terceira manifestação, não apontada pela revisão:** a régua ignorava os dias realmente lidos nas telas de
  marco e pintava de 1 até N como concluídos. Agora usa sempre o que a pessoa leu (`HundredDayRuler`).
- A **chegada do Dia 100 ficou intacta** (data e Ap 21:5): só se completa cem leituras tendo lido o dia 100.

### 1.3 Nomes de pessoas reais embarcados no binário (MÉDIO, tratado como grave)

O conversor gravava `leaders_label` (37 rótulos distintos com nomes de pessoas) no `dataset.json`, importado
estaticamente e embarcado inteiro no pacote. `altarForDisplay` só escondia **na tela**: bastava descompactar o
APK para ler os nomes. Com a igreja autorizando guia e escala mas não os nomes, o portão de produção passava e
um build de loja sairia com dado pessoal de terceiros sem consentimento.

- O conversor **não gera** o rótulo sem `leader_names_authorized`; a fonte `.docx` com hash continua guardando o original.
- `source_provider` deixou de embutir o nome da autora do arquivo (metadado do Word).
- `assertProductionReady` ganhou `production.leader_names`: recusa dataset com nomes sem autorização.
- Testes: o conteúdo embarcado não casa `/\bPrs?\.|\bPra\./`; o portão recusa contrabando; com autorização o rótulo volta a ser exibível.

---

## 2. Verificação

| Checagem | Resultado |
|---|---|
| `tsc --noEmit` · `expo lint` | limpos |
| `jest` | **298 testes, 18 suítes** (11 novos entre as três correções) |
| `content:check` | dataset e propósito conferem com as fontes |
| Navegador | citação atribuída; marco por leituras com a régua real; Dia 100 intacto; Juntos e Início sem nomes; zero erro de console em aba limpa |

---

## 3. Os 45 achados confirmados que continuam abertos

Agrupados por trabalho, não por arquivo. Nenhum foi corrigido.

| # | Tema | Achados | Severidade | Por que importa |
|---|---|---|---|---|
| A | **Amarelo sobre `colors.text` no tema escuro** (Início, tela do Dia, `Pill`/`Checkbox`/`ChoiceRow`) | 4 | 2 médios | No escuro o check de "concluído" vira amarelo sobre branco (1,46:1): some. É o par que o próprio sistema proíbe. Correção: usar `nodeDone` + `surface`, já auditado no teste de contraste |
| B | **Dynamic Type quebra caixas de altura fixa** (`Button`, `SpherePill`, estatísticas do Dia 100, `getItemLayout` da Jornada) | 6 | 3 médios | Texto transborda ou é cortado a partir de ~1,4× de fonte; no iOS a escala chega a 3,12× |
| C | **Permissão de notificação pedida sem ação do usuário** (`useReminderSync` na abertura; toque no aviso dispara dois pedidos) | 3 | 2 médios | Pedir permissão sem gesto é o caminho mais curto para o usuário negar para sempre |
| D | **Conteúdo de dia futuro acessível por rota** (leitor não checa `isDayUnlocked`) | 2 | 1 médio | Fura a regra de que o dia só abre no dia oficial |
| E | **Leitor de tela** (estado "concluído" não anunciado, rótulos com "~" e "·", cabeçalhos não marcados, anúncio triplicado no modo altar) | 7 | 1 médio | |
| F | **Cópia e consistência** (altar descrito de três jeitos; "hoje" em dia que não é hoje; "Tema" onde a igreja diz "Ênfase"; enum `pending_authorization` exposto) | 6 | 2 médios | |
| G | **Jejum** (continua como "propósito" da campanha e ganhou superfície nova, sem a confirmação da igreja) | 2 | 1 médio | Depende de resposta da igreja, não de código |
| H | **Rodapé de "Sobre o propósito"** afirma "reproduzido sem alterações", mas a página é uma seleção | 1 | médio | Afirmação falsa sobre o próprio conteúdo |
| I | **Tokens e higiene** (cores literais fora de `theme.ts`, `gutter.block` sem uso, código sem consumidor, teste tautológico, marco gravado duas vezes) | 14 | baixos | |

**Recomendação de ordem:** A e H primeiro (defeito visível e afirmação falsa, baratos); depois C e D (regras de
produto); B antes de qualquer teste em aparelho; E e F como um passe único de cópia e acessibilidade; G quando
a igreja responder; I por último.

---

## 4. Os 16 refutados

Vale registrar dois, porque parecem problemas e não são: o modo altar e a tela de marco **têm** o aviso de
conteúdo (vem da tela que os abre), e `campaign.id` com a marca no nome não é identificador de loja, é chave
local. Os outros catorze caíram por não se reproduzirem no código ou por citarem regra inexistente.

Dois achados aparecem nas duas listas — "texto bíblico" e "marco ancorado no dia" — porque as correções foram
aplicadas durante a verificação: quem leu antes confirmou, quem leu depois refutou. Ambos estão corrigidos.
