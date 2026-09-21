# Implementação do handoff "100 Dias — Lagoinha"

- **Data:** 2026-09-07
- **Fonte:** `Waiting on design decisions.zip` → `100 Dias Lagoinha.dc.html` (direção final) + `README.md`
- **Status:** implementado no app. `historico/Jornada 100 Dias.dc.html` **não** foi implementado, conforme o próprio handoff pede.
- Este documento **substitui** `design-system/jornada-100-dias/MASTER.md`, que veio da passagem
  anterior de ui-ux-pro-max e não descreve mais a aparência do produto.

---

## 1. Onde cada tela do handoff virou código

| Handoff | Rota | Arquivo |
|---|---|---|
| 01a Boas-vindas | `/onboarding` | `src/app/onboarding/index.tsx` |
| 01b Como você vai ler | `/onboarding/leitura` | `src/app/onboarding/leitura.tsx` |
| 01c Jejum | `/onboarding/jejum` | `src/app/onboarding/jejum.tsx` |
| 01d Lembrete | `/onboarding/lembrete` | `src/app/onboarding/lembrete.tsx` |
| 01e Tudo pronto | `/onboarding/pronto` | `src/app/onboarding/pronto.tsx` |
| 02 Início (antes de ler) · 03 (concluído) · e1 · e2 | `/` | `src/app/(tabs)/index.tsx` |
| 04 Leitor | `/reader/[day]` | `src/app/reader/[day].tsx` |
| 05 Jornada · e3 (folha de dia futuro) | `/jornada` | `src/app/(tabs)/jornada.tsx` |
| 05b Tela do Dia | `/dia/[day]` | `src/app/dia/[day].tsx` |
| 06 Juntos | `/juntos` | `src/app/(tabs)/juntos.tsx` |
| 07 Grupo + folha de líder | `/grupo/[id]` | `src/app/grupo/[id].tsx` |
| 08 Você | `/voce` | `src/app/(tabs)/voce.tsx` |
| 09 Minha reflexão | `/reflexao/[day]` | `src/app/reflexao/[day].tsx` |
| 10 Marco Dia 25 · 11 Dia 100 | `/marco/[day]` | `src/app/marco/[day].tsx` |
| e4 Faixa sem internet | componente | `OfflineBanner` em `src/ui/components.tsx` |

Telas de apoio que o handoff cita nas listas de Você e não desenha em separado:
`/reflexoes`, `/jejum`, `/aparencia`, `/ajuda`.

### Sistema visual

| Peça | Arquivo |
|---|---|
| Tokens, tipografia, vidro, movimento | `src/ui/theme.ts` |
| Fontes empacotadas (Archivo + Literata) | `src/ui/fonts.ts` |
| Primitivos (texto, botão, bloco, folha, linhas) | `src/ui/components.tsx` |
| Ícones SVG traço 1,9 | `src/ui/icons.tsx` |
| Régua dos 100 dias | `src/ui/HundredDayRuler.tsx` |
| Pomba voando (progresso pessoal) | `src/ui/FlyingDove.tsx` |
| Marca | `src/ui/brand.tsx` · `mobile/assets/brand/*.png` |
| Tab bar de vidro | `src/ui/TabBar.tsx` |

---

## 2. Desvios do handoff, e por quê

Três, todos registrados no código no ponto exato onde acontecem.

### 2.1 Borda do círculo não selecionado: `#A9A69E` → `#8A877F`

O handoff pede `#A9A69E` no contorno da opção não marcada (01b, 01c). Medido pela
fórmula da WCAG 2.1, isso dá **2,43:1** sobre branco — abaixo do mínimo de 3:1 para
limite de controle (WCAG 1.4.11), e o próprio handoff exige contraste acessível.
O valor foi escurecido para o tom mais próximo que passa sobre branco **e** sobre os
off-whites quentes (3,6:1 e 3,1:1), mantendo o mesmo cinza quente.

### 2.2 Tema escuro

O handoff especifica uma aparência clara. O aplicativo já oferecia tema escuro, e
removê-lo seria uma regressão para quem depende dele. O tema escuro foi derivado da
**própria tela 11 do handoff** (Dia 100: fundo `#111`, amarelo e branco), então as
relações de marca são as mesmas — tinta e amarelo só trocam de papel com a superfície.

### 2.3 Compressão da linha da Jornada

O handoff comprime "trechos longos entre marcos" com reticências, sem definir a regra.
A implementada: ficam visíveis o dia de hoje e três dias para cada lado, todos os
marcos, as duas pontas e **todo dia em aberto**. O resto vira reticência, que é
clicável e expande a linha inteira.

---

## 3. Exceção de contraste registrada

O preenchimento amarelo da régua e das barras de progresso mede ~1,4:1 contra a
trilha clara. Isso está abaixo de 3:1 e é aceito porque **o amarelo nunca carrega o
dado sozinho**:

- a régua distingue os dias pela **altura e forma** do traço (hoje é o traço mais
  alto; em aberto ganha um círculo no topo; futuro é curto e baixo);
- toda barra de progresso vem com rótulo em texto e `accessibilityValue`;
- a aba ativa muda ícone, cor de tinta e peso do rótulo, além da pílula, e anuncia
  `selected` para leitores de tela.

`src/__tests__/contrast.test.ts` mede e fixa essa exceção, para que ela continue
explícita em vez de virar hábito.

---

## 4. O que o design mostra e o produto ainda não tem

As telas 02, 06, 07, 10 e 11 do handoff trazem números coletivos concretos
("1.812 pessoas já leram hoje", "64% da igreja", insights, reações "Amém",
ferramentas de publicação do líder). **Nenhum desses dados tem fonte hoje**: a
Execution 02 construiu identidade, grupos e papéis, e deixou feed, insights,
reações e progresso coletivo explicitamente fora de escopo.

A decisão tomada: **manter a estrutura da tela e substituir o número por um estado
honesto de indisponível.** Exibir o valor do protótipo seria mostrar dado inventado
como se fosse real, o que este projeto recusa desde o Sprint 0.

| Onde | O que aparece hoje |
|---|---|
| Início, linha coletiva | "Progresso da igreja" + motivo da indisponibilidade |
| Juntos, número de 52px | Bloco de progresso da igreja com o mesmo motivo |
| Juntos, recado fixado | Bloco preto com a marca, dizendo que ainda não há recado publicado |
| Juntos e Grupo, insights | Explicação de que insights ainda não estão disponíveis |
| Grupo, barra de progresso | Contagem real de membros; sem "41 de 64 hoje" |
| Grupo, folha de líder | As quatro linhas do handoff, desativadas, com o motivo à vista |
| Reflexão, "Compartilhar um insight" | Botão contornado desativado, com a regra de privacidade ao lado |
| Dia 100, três números | Dados **reais** e locais: dias lidos, reflexões, dias de jejum |

Quando a agregação existir no servidor, o único arquivo que muda é
`src/community/communityState.ts`.

---

## 5. Mudanças de comportamento vindas do handoff

- **Aba "Hoje" virou "Início"**, conforme a navegação do handoff.
- **"Vou ler na minha Bíblia" não conclui mais o dia.** O handoff é explícito: a
  ação fecha para o Início e passa a mostrar "Concluir leitura" como ação do dia.
  Marcar por conta própria seria decidir no lugar da pessoa.
- **Marco em tela cheia aparece uma vez** por marco alcançado. O que já foi visto
  fica em `settings.milestonesSeen`.
- **A Jornada abre onde a igreja está**, não no dia 1.
- **Lembrete da tarde às 13:00** (era 14:00), como o handoff mostra em 01d.
- **Novo campo opcional no dataset:** `JourneyDay.theme_highlight`. É a palavra do
  tema que recebe o realce amarelo no Início. Vem do dado, não de heurística —
  escolher a ênfase por algoritmo seria o app inventando destaque editorial.

---

## 6. Pendências

1. **SVG oficial da marca.** Os PNGs em `mobile/assets/brand/` foram extraídos do
   arquivo do cliente pelo time de design, que pede explicitamente a substituição
   pelo vetor. Em produção a marca precisa ser nítida em qualquer escala e
   tingível por código. Trocar é mudança de asset, não de layout.
2. **Teste em aparelho.** O vidro da tab bar (iOS) e a superfície sólida com
   elevação (Android) só foram verificados no bundle e no navegador; não há Mac nem
   SDK Android nesta máquina.
3. **Conteúdo.** ~~Tudo continua rodando sobre fixtures DEV. Os Launch Gates 1
   (licença de tradução) e 2 (autorização do plano 42360) seguem abertos, e o
   validador de produção continua recusando fixtures.~~

   **Vencido em 2026-09-19.** O material real da igreja chegou e o app passou a
   embarcá-lo com `rights_status = pending_authorization`; o plano 42360 do
   YouVersion está **superado** e não é mais referência. O **Launch Gate 2** deixou
   de ser "autorização do plano 42360" e passou a ser a **autorização escrita da
   própria igreja** para publicar o guia e a escala, com os nomes de líderes
   dependendo de autorização separada. O Gate 1 (licença de tradução bíblica)
   continua aberto e independente. Ver `CLAUDE.md` e
   `docs/technical/EXECUTION_04_REVISAO.md`. As fixtures DEV continuam existindo
   só para testes e painel DEV.
