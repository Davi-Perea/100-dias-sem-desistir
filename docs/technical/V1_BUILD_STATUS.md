# V1 — Estado do build

- **Data:** 2026-09-07 · **Spec:** MASTER PRODUCT SPEC v1.1 (aprovado para build)
- **Código:** `mobile/` (React Native + Expo SDK 57, TypeScript). Substitui o spike do Sprint 0.5.
- **Nada commitado.** `git status` continua com tudo não rastreado.
- **Conteúdo (atualizado 2026-09-19):** o app embarca o **material real da igreja** (`mobile/content/100-dias-2026/dataset.json`),
  com `rights_status = pending_authorization`. As fixtures DEV ficaram só para testes e painel DEV. O plano 42360 está superado.

---

## 1. O que está construído e verificado

### Fase 1 — Core journey (completa)
Campanha, modelo de dia, Dia oficial, Hoje, Jornada, progresso, milestones, offline, entrada tardia e retomada.

| Item do spec | Onde | Verificado |
|---|---|---|
| §6 Hoje: cabeçalho Dia X/100, tema, leitura, versículo-chave, direção, oração, CTAs, conclusão explícita com desfazer, jejum, reflexão pós-conclusão, um card de grupo, próximo passo | `src/app/(tabs)/index.tsx` | navegador + 6 testes |
| §8 Jornada: caminho vertical 1–100, estados concluído/hoje/pendente/futuro (nunca "falhou"), milestones, datas, conteúdo futuro indisponível | `src/app/(tabs)/jornada.tsx`, `src/app/dia/[day].tsx` | navegador |
| §8 Dia oficial derivado de `start_date` + fuso da campanha, igual para toda a igreja | `src/journey/officialDay.ts` | 7 testes |
| §8 Entrada tardia (entra no dia 17, dias 1–16 continuam disponíveis, sem backlog obrigatório) | `useJourney` + `completionsStore` | teste |
| §4.5 Retomada como sucesso: "Você voltou. Continue de onde quiser." Sem "perdeu sua sequência" | `src/app/(tabs)/index.tsx` | teste que falha se aparecer "perdeu"/"sequência" |
| §10 Milestones 7/25/50/75/100, sem streak, XP, ranking ou culpa | `src/journey/milestones.ts` | 3 testes |

### Fase 2 — Dataset contract (completa)
| Item | Onde |
|---|---|
| Shape único para fixture e dataset oficial | `src/journey/types.ts` |
| Proveniência: `source_name`, `source_external_id`, `source_provider`, `rights_status`, `rights_reference`, `content_version` | `types.ts`, `0001_schema.sql` |
| Validador determinístico: exatamente 100 dias, 1–100, sem duplicatas, referências válidas, campos obrigatórios, proveniência, versão | `src/journey/validator.ts` |
| Portão de produção: recusa fixture DEV e `rights_status ≠ authorized` | `assertProductionReady` |
| Caminho de importação (`loadDataset`) com modo produção | `src/journey/datasetSource.ts` |
| Fixtures marcadas `DEV_ONLY` / `NOT_PRODUCTION_CONTENT` + banner na UI | `fixtures/devCampaign.ts`, `DevContentBanner` |
| Fonte canônica desejada registrada sem reproduzir conteúdo | `CANONICAL_SOURCE_TARGET` |

14 testes cobrem o validador, incluindo dia faltando, duplicado, referência inválida, direitos ausentes e autorização parcial (campos nulos = aviso, não erro).

### Fase 3 — Onboarding e núcleo pessoal (completa, escopo da EXECUTION 01)
Quatro passos: welcome → forma de leitura → jejum → lembrete → pronto ("Hoje é o Dia X de 100").
As telas de **grupo** e **conta condicional** foram removidas: pertencem às execuções de backend/social, não à 01.
Jejum e reflexão são local-only. Permissão de notificação pedida só após a escolha, e recusá-la não bloqueia o fluxo.

### Fase 4 — Reader (completa, sem texto protegido)
Rota contextual (não é aba), paginação por capítulo, tamanho de fonte persistido, tema claro/escuro, aviso de licença do provider, conclusão do dia.
`BibleTextProvider` com quatro capacidades (passagem, metadados, copyright, política de cache). Provider ativo é o de desenvolvimento.

### Fases 5–8 — backend, auth, grupos, social, moderação (parcial: artefatos)
- `mobile/supabase/migrations/0001_schema.sql` e `0002_rls.sql`: schema completo do spec §21 com RLS.
- Papéis são server-side: nenhuma policy deixa o usuário se autopromover; `app_admins` não tem policy de escrita.
- O schema **não tem** tabelas de jejum, reflexão, posição de leitura ou preferências: isso é local por decisão de produto.
- **Não aplicado:** exige um projeto Supabase em `sa-east-1` e credenciais que não existem nesta máquina.
- A UI diz a verdade sobre isso: a aba Juntos e a tela de conta mostram o que depende de backend em vez de simular dados.

### Fase 10 — analytics (contrato apenas)
`src/analytics/analytics.ts` fixa o vocabulário de eventos do spec §23 num buffer local, desligado por padrão. Nenhum fornecedor conectado.
Dois testes garantem que nenhum evento pode carregar conteúdo do usuário e que o jejum diário nunca vira evento.

---

## 2. O que NÃO está construído (e por quê)

| Item | Motivo |
|---|---|
| Conteúdo real dos 100 dias | **Launch Gate 2**: plano 42360 sem autorização. Scraping proibido; nenhum cronograma alternativo foi criado. |
| Tradução bíblica no Reader | **Launch Gate 1**: sem licença. Provider de desenvolvimento no lugar. |
| Conta, login OTP, sincronização | Fase 5 exige projeto Supabase e credenciais. |
| Grupos, insights, reações, push remoto, moderação ativa | Fases 6–9, dependem da Fase 5. |
| Regras de menores (≤16) | **Launch Gate 3**: definição jurídica pendente (ECA Digital art. 24). |
| Publicação nas lojas | **Launch Gate 4** + gates 1–3. |

---

## 3. Validação executada (Windows, sem Android SDK, sem Mac)

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` (strict) | 0 erros |
| `expo lint` (regras React 19 / React Compiler) | 0 erros |
| `jest` | **64 testes, 5 suítes, todos passando** |
| `expo-doctor` | 21/21 |
| `expo export --platform android` | bundle Hermes 3,3 MB gerado no Windows |
| Fluxo completo no navegador | onboarding (7 telas) → Hoje → concluir → jejum → reflexão → Reader (3 capítulos) → Jornada → Você; estado persistido após reload |

**NÃO TESTADO:** aparelho físico iOS e Android (sem Mac e sem Android SDK). O navegador é proxy visual, não o produto.
Próximo passo: `npx eas build --profile development` e o roteiro da seção 5.

### Passe de design (skill ui-ux-pro-max)

Design system em `design-system/jornada-100-dias/MASTER.md`, sintetizado das consultas por domínio da skill
(`product`, `style`, `color`, `ux`, `web`, stack `react-native`) mais o checklist de `references/pro-rules.md`.
A saída bruta de `--design-system` foi descartada por vir enviesada para landing page web (padrão "Community/Forum
Landing", `clamp(10vw)`, hover, paleta de streak — proibida pelo spec §10).

Auditoria de contraste WCAG encontrou **8 reprovações reais**, todas corrigidas e agora cobertas por 47 asserções
automatizadas em `src/__tests__/contrast.test.ts`. Também entraram: token `controlBorder` (contorno de controle ≥3:1),
token `onDanger`, tokens de tamanho de ícone, `useReducedMotion`, altura de linha da Jornada escalando com `fontScale`
(Dynamic Type sem cortar texto na lista virtualizada), medida máxima de leitura de 640 e calha adaptativa por largura.

### EXECUTION 01 — fechamento (2026-09-07)

Auditoria formal contra os requisitos A–H do closeout. Três falhas encontradas e corrigidas:

1. **Vazamento de conteúdo antes da campanha.** `isDayUnlocked` só comparava com o dia oficial, que é *clampado* em 1.
   Com a campanha ainda por começar, o Dia 1 aparecia liberado e o Hoje mostrava sua leitura. O clamp serve para exibição,
   não para permissão. Agora nenhum dia abre enquanto a fase for `before_start`, e `todayDay` é nulo.
2. **Faltavam os estados de fase.** O Hoje tratava só "em curso". Agora tem três telas distintas: antes da campanha
   (sem conteúdo, com a data de início), em curso, e encerrada (com o dia 100 ainda acessível para quem não concluiu).
3. **Onboarding fora de escopo.** Tinha seis passos, incluindo grupo e conta. A EXECUTION 01 define quatro.
   Removidos os passos e toda a funcionalidade de grupo (`community/groups.ts`, seleção em Você, card no Hoje,
   campo `groupId` e os eventos de grupo/social do contrato de analytics). A aba Juntos continua existindo
   (spec §16) como um lugar honesto que diz que a comunidade vem depois.

### EXECUTION 03 — conteúdo real (2026-09-19)

O material da igreja (guia diário + escala + orientação aos líderes) virou dataset por conversor determinístico
(`mobile/scripts/convert-100-dias.mjs`), com proveniência, hashes das fontes e 17 testes que fixam as medições
(1.189 capítulos exatamente uma vez, 11–12 por dia, sete montes em rotação, versículo dentro da leitura, 39 ministérios).
Detalhes e regras de direitos: `EXECUTION_03_CONTEUDO_REAL.md`. **239 testes, 13 suítes.**

## 4. Bug encontrado e corrigido durante a validação

**A negativa de permissão de notificação prendia o usuário no onboarding.** Na tela de lembrete, uma falha ao agendar
retornava sem navegar, deixando a pessoa sem saída. Isso aconteceria em qualquer aparelho onde o usuário recusasse a
permissão. Corrigido: a falha é explicada e o botão passa a "Continuar sem lembrete", que avança. O lembrete é opcional
e nunca pode bloquear o onboarding.

## 5. Roteiro de teste em aparelho (~1 hora)

```bash
cd mobile
npx expo start
```

1. Onboarding completo, incluindo recusar a permissão de notificação (não pode travar).
2. Hoje: concluir, desfazer, marcar jejum, salvar reflexão.
3. Matar o app, reabrir: progresso, jejum e reflexão intactos.
4. Reader: paginar capítulos, A−/A+, verificar aviso de licença.
5. Jornada: rolar até o dia 100, abrir um dia futuro (deve estar indisponível) e um dia pendente.
6. Painel DEV: simular dia 1, 50 e 100; validar dataset (produção deve ficar BLOQUEADO).
7. Lembrete: agendar, testar em 5 s, verificar entrega.
8. Android 16: barras (edge-to-edge) e gesto de voltar.

## 6. Como o conteúdo real entra e sai do app (desde a Execution 03)

1. As fontes da igreja ficam em `mobile/content/source/` (nunca editar; revisão nova = arquivo novo).
2. `npm run content:convert` regenera `mobile/content/100-dias-2026/dataset.json`; `npm run content:check` confere.
3. Quando a autorização escrita chegar, ela é registrada em `mobile/content/100-dias-2026/rights.json`
   (`rights_status`, `rights_reference`, `leader_names_authorized`) e o conversor é rodado de novo. O
   `dataset.json` nunca é editado à mão.
4. Build de release sem autorização falha na abertura (portão de produção em `datasetSource.ts`), e
   `node scripts/convert-100-dias.mjs --check --require-authorized` falha antes do build. É proposital.
