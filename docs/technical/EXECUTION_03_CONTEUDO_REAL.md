# EXECUTION 03 — Conteúdo real dos 100 Dias

- **Data:** 2026-09-19 · **Aprovação:** Davi ("aprovado, pode começar a converter o material em dataset") · **Estado:** construída, **não commitada**
- **Escopo:** só a conversão do material da igreja em dataset, com validação e proveniência. Telas do dia real,
  texto bíblico e lojas são as execuções seguintes (`docs/product/PLANO_FASE_FINAL_100_DIAS.md`, seção 4).

---

## 1. O que entrou

| Peça | Onde | O que faz |
|---|---|---|
| Fontes | `mobile/content/source/` | Os três `.docx` da igreja, byte a byte, com nome ASCII e hash SHA-256 registrado no `README.md` |
| Conversor | `mobile/scripts/convert-100-dias.mjs` | Lê os `.docx` (leitor de ZIP próprio, sem dependências), extrai as tabelas, traduz abreviações para códigos USFM, monta o dataset e **recusa qualquer inconsistência**. Determinístico: `--check` falha se o JSON versionado divergir das fontes |
| Dataset | `mobile/content/100-dias-2026/dataset.json` | 100 dias, campanha `lagoinha-100-dias-2026`, início 2026-09-23, `rights_status = pending_authorization` |
| Contrato | `src/journey/types.ts`, `src/journey/spheres.ts` | Campos novos: `sphere` (monte), `prayer_points` (motivos em lista), `altar` (ministério e rótulo dos líderes), `campaign.subtitle`, `provenance.source_files`, `provenance.leader_names_authorized` |
| Validador | `src/journey/validator.ts` | Regras novas: monte válido e em rotação, versículo dentro da leitura, capítulo repetido entre dias, altar com ministério, nomes de líderes só em dataset autorizado |
| Carregador | `src/journey/datasetSource.ts` | O dataset real é o conteúdo **padrão** do app. `contentState()` distingue `fixture` / `pending` / `authorized`; `altarForDisplay()` esconde nomes até autorização; build de release sem autorização **falha na abertura** |
| Interface | `DevContentBanner` | Passa a dizer a verdade em cada estado: fictício, ou real aguardando autorização |
| Painel DEV | `src/app/dev.tsx` | Alterna entre conteúdo real e fixtures; mostra proveniência e estado dos nomes |
| Testes | `src/__tests__/content100Dias.test.ts` (17 novos) | Cobertura exata da Bíblia, rotação, versículo na leitura, escala, marcos, proveniência, portão, nomes ocultos, JSON sincronizado com as fontes |
| Scripts | `npm run content:convert` · `npm run content:check` | Regenerar e conferir |

## 2. Mapeamento do guia para o contrato

| Coluna do guia | Campo | Observação |
|---|---|---|
| Dia/Data | `day_number`; `campaign.start_date` | A data de cada dia é conferida contra o início; qualquer quebra é erro |
| Monte | `sphere` | Sete valores fixos; rotação conferida |
| Leitura | `readings[]` | Uma referência canônica por livro ("GEN 49-50", "EXO 1-10") |
| Versículo-base | `key_verse_reference` | Conferido dentro da leitura do dia |
| Ênfase | `title` | `theme` fica nulo: o guia não tem um segundo campo de tema |
| Motivos de oração | `prayer_focus` (frase original) e `prayer_points[]` (itens) | Só o ponto final da frase é removido nos itens |
| Escala: Ministério / Líderes | `altar.ministry` / `altar.leaders_label` | Rótulo verbatim; exibição depende de autorização |

Campos que ficam **nulos de propósito**: `official_direction`, `next_day_teaser`, `theme`, `theme_highlight`. O
material não os tem e o app não inventa.

## 3. Medições do material (FATO, produzidas pelo conversor e fixadas em teste)

| | |
|---|---|
| Dias | 100, de 23/09 a 31/12/2026, datas contínuas |
| Capítulos | 1.189, cada um exatamente uma vez, em ordem canônica |
| Por dia | 11 (11 dias) ou 12 (89 dias) |
| Montes | rotação fixa sem quebra; dia 1 Igreja, dia 100 Família |
| Versículo-base | 100/100 dentro da leitura do dia |
| Ministérios | 39; Intercessão/Bálsamo 24 dias, os outros 38 com 2 dias cada |
| Guia × Escala | 0 divergências |

## 4. Direitos, do jeito que o código aplica

- `rights_status = pending_authorization` até a igreja autorizar por escrito. A autorização é registrada em
  `mobile/content/100-dias-2026/rights.json` (`rights_status`, `rights_reference`, `leader_names_authorized`) e o
  conversor é rodado de novo; o `dataset.json` nunca é editado à mão. O conversor recusa `authorized` sem referência
  e recusa liberar nomes sem autorização.
- Build de desenvolvimento: conteúdo real visível, com aviso "aguardando autorização".
- Build de release (`__DEV__ === false`): `assertProductionReady` roda na abertura e **derruba o app** se o
  conteúdo não estiver autorizado. É intencional: nenhum build de loja sai com conteúdo pendente. O mesmo portão
  faz `expo export --platform web` falhar na pré-renderização, com a mensagem "Build de release com conteúdo não
  liberado para produção". Antes de qualquer build de loja: `node scripts/convert-100-dias.mjs --check --require-authorized`.
- Nomes de pessoas (`leaders_label`) só saem de `altarForDisplay()` quando `leader_names_authorized === true`, e o
  validador recusa essa flag em dataset não autorizado.

## 5. Verificação

| Checagem | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `expo lint` | 0 erros |
| `jest` | 239 testes, 13 suítes |
| `content:check` | OK |
| Navegador | App abre no conteúdo real: estado "antes da campanha" com a data de início e o aviso de autorização; com o dia simulado, Início/Dia/Jornada mostram o guia |

## 6. Pendências que este passo deixa explícitas

1. Autorização escrita da igreja (guia, escala, nomes de líderes) — bloqueia release.
2. Confirmação sobre jejum (o material não fala em jejum; o onboarding ainda pergunta).
3. As telas ainda tratam o conteúdo como "tema + leitura": monte, motivos em lista, altar do dia e modo altar são a
   Execução 04.
4. Carga de leitura real (11–12 capítulos): a estimativa de tempo do Início sai de 2,6 min/capítulo e precisa ser
   revista junto com leitura em partes (Execução 04/05).
