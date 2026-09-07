# SPIKE 001 — Mobile Foundation (React Native + Expo)

- **Data:** 2026-09-07 (Sprint 0.5, janela de ~45 min de execução real)
- **Status:** concluído; código descartável em `mobile/`; **nada commitado**; **não é o MVP** e não congela produto.
- **Pergunta do spike:** React Native + Expo é uma fundação adequada para este produto (leitura + planos + progresso local + lembrete local), e quanto do primeiro produto existiria sem backend?
- **Resposta curta:** sim, com ressalvas. Toda a fatia vertical (Home → Planos → Plano → Dia → progresso persistido → lembrete local) existe sem backend, com TypeScript, lint, 16 testes e bundles Hermes gerados no Windows. O que **não** foi possível validar aqui é o comportamento em aparelho real (iOS e Android), porque a máquina não tem Android SDK nem Mac.

---

## 1. Objetivo

Transformar a pesquisa do Sprint 0 em evidência técnica: criar um app Expo real, navegar entre telas nativas, ler um "dia" offline, marcar como concluído, fechar/reabrir e ver o progresso salvo, e agendar um lembrete local às 07:00 sem configuração externa.

## 2. O que foi construído (`mobile/`)

| Item pedido | Implementação | Arquivo |
|---|---|---|
| A. Navegação nativa | Expo Router v7 (file-based) com `Stack` nativo (react-native-screens); modais para lembrete e painel de testes | `src/app/_layout.tsx` |
| B. Home | Saudação, cartão "Continuar lendo" (aparece após progresso), cartões dos planos com barra de progresso, cartão do lembrete, link para painel de testes | `src/app/index.tsx` |
| C. Planos | Lista dos 2 planos com progresso; estados loading/erro/vazio | `src/app/plans/index.tsx` |
| D. Plano | Descrição, progresso (%), "Começar pelo dia 1 / Continuar no dia N", `FlatList` com 100 ou 365 dias (`getItemLayout`), check por dia | `src/app/plans/[planId]/index.tsx` |
| E. Leitura do dia | Chips das leituras, banner de "texto placeholder", passagens com "versículos" numerados, fonte serifada, A−/A+, barra inferior com "Marcar como concluído", dia anterior/próximo, título dinâmico "Dia N de M" | `src/app/plans/[planId]/day/[dayNo].tsx` |
| F. Progresso local | Um registro por plano `{completedDays, updatedAt}`; marcar/desmarcar idempotente; próximo dia pendente; reset | `src/progress/progressStore.ts` |
| G. Armazenamento local | AsyncStorage (opção local mais madura no Expo, funciona no Expo Go, tem mock oficial para Jest); trocar por SQLite depois toca só os stores | `src/progress/progressStore.ts`, `src/settings/settingsStore.ts` |
| H. Lembrete local | `expo-notifications`: permissão, canal Android, gatilho `DAILY` (hora/minuto), cancelar, "testar em 5 s", lista de agendamentos do sistema; chips de horário (06:00, 07:00, 08:00, 12:00, 20:00, 21:30) | `src/reminders/reminders.ts`, `src/app/reminder.tsx` |
| I. Estados loading/empty/error | `StateView` + hook `useAsync`; painel de testes com flags "carregamento lento", "falha ao carregar", "lista vazia" que passam pelo caminho real do repositório | `src/ui/components.tsx`, `src/ui/useAsync.ts`, `src/app/dev.tsx` |
| J. Acessibilidade básica | `accessibilityRole` (button/header/progressbar/switch/radio), `accessibilityLabel`/`Hint`/`State` (checked, disabled, selected), `accessibilityValue` na barra de progresso, `accessibilityLiveRegion` nos feedbacks, `maxFontSizeMultiplier` com escala do sistema respeitada, alvos ≥ 48 dp | todos os componentes |
| K. Safe areas / mobile | `useSafeAreaInsets` na barra inferior e no fim das listas (Android edge-to-edge), `contentInsetAdjustmentBehavior="automatic"` (iOS), headers nativos, ripple no Android, feedback de toque (`pressed`), modo claro/escuro automático | telas e `src/ui/theme.ts` |

Conteúdo: `src/content/books.ts` (66 livros e contagens de capítulos, fatos públicos), `src/content/plans.ts` (gera "Bíblia em 100 dias" e "Bíblia em 1 ano" distribuindo os 1.189 capítulos em ordem canônica, cada capítulo exatamente uma vez), `src/content/placeholderText.ts` (frases neutras criadas para o spike; **nenhum texto bíblico, aberto ou protegido, foi copiado**), `src/content/repository.ts` (única costura entre telas e conteúdo; assíncrona de propósito para poder virar SQLite/API sem mudar telas).

Tamanho: ~1.870 linhas de TypeScript incluindo testes. Nenhuma abstração além do repositório e dos dois stores.

## 3. Dependências

Runtime (20, todas as do template Expo 57 menos as removidas, mais duas): `expo ~57.0.20`, `react-native 0.86.3`, `react 19.2.3`, `expo-router ~57.0.19`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated` + `worklets` (exigidos pelo router), `expo-constants`, `expo-linking`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `expo-device`, `react-dom` + `react-native-web` (só para a evidência visual em navegador), **`@react-native-async-storage/async-storage 2.2.0`**, **`expo-notifications ~57.0.17`**.
Removidas do template por não serem usadas: `@expo/ui`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`.
Dev: `typescript ~6.0.3`, `jest ~29.7`, `jest-expo ~57.0.5`, `@testing-library/react-native 14.0.1`, `@types/jest`, `eslint 9` + `eslint-config-expo` (instalados pelo `expo lint`).
Sem WebView, sem backend, sem analytics, sem Supabase/Firebase/Sentry/PostHog.

## 4. Testes e validações executados (Windows 10, Node 24, sem Android SDK, sem Mac)

| # | Validação pedida | Resultado | Como |
|---|---|---|---|
| 1 | Projeto inicia | **OK (web)** — Metro subiu e serviu o app em `http://localhost:8081`; **NÃO TESTADO em iOS/Android** | `expo start --web` |
| 2 | TypeScript compila | **OK** — `tsc --noEmit` sem erros (TS 6.0, strict) | `npm run typecheck` |
| 3 | Navegação funciona | **OK (web + testes)** — Home → Plano → Dia → próximo dia; `router.replace` verificado em teste; **fidelidade nativa NÃO TESTADA** | navegador + Jest |
| 4 | Progresso local persiste | **OK** — teste grava `progress:v1:100-dias` = `{"completedDays":[1]}`; web mostra a chave no painel de testes | Jest + navegador |
| 5 | Reload não perde progresso | **OK** — teste limpa o cache em memória e recarrega do disco; na web, recarregar a página manteve "Concluído ✓" e a Home passou a mostrar "Continuar lendo · Dia 2" | Jest + navegador |
| 6 | Leitor funciona offline com dados locais | **OK** — nenhuma requisição de rede existe no código; conteúdo gerado localmente; teste renderiza "Gênesis 1" sem mocks de rede | Jest |
| 7 | Notificação local pode ser agendada | **Implementado; NÃO TESTADO em aparelho** (web não suporta). Verificado no código-fonte do módulo: no Android, `expo-notifications` usa `setExactAndAllowWhileIdle` apenas se `canScheduleExactAlarms()`; como **não declara `SCHEDULE_EXACT_ALARM`**, cai em `setAndAllowWhileIdle` (alarme inexato, compatível com a política do Play) | leitura de `ExpoSchedulingDelegate.kt` e do manifesto |
| 8 | Nenhum WebView | **OK** — `grep -ri webview src app.json package.json` vazio | grep |
| 9 | Nenhum backend necessário | **OK** — zero chamadas HTTP; tudo em AsyncStorage | inspeção |
| 10 | Nenhuma dependência claramente desnecessária | **OK após poda** — 5 pacotes do template removidos; `react-native-web`/`react-dom` mantidos só para a evidência visual (remover se web não for canal) | `package.json` |
| — | Lint | **OK** — `expo lint` sem erros (inclui regras do React 19 / React Compiler) | `npm run lint` |
| — | Testes unitários e de tela | **OK — 16/16** em 3 suítes (`plans`, `progressStore`, `dayScreen`: carregar, concluir, reabrir, loading, erro + retry, fonte, navegação) | `npm test` |
| — | Saúde do projeto | **OK** — `expo-doctor` 21/21 | `npm run doctor` |
| — | Bundling nativo no Windows | **OK** — `expo export --platform android` (2,8 MB `.hbc`) e `--platform ios` (2,5 MB `.hbc`): **bytecode Hermes gerado no Windows** no SDK 57, refutando o risco do `hermesc` apontado na pesquisa (SDK 55) | `expo export` |

Evidência visual (navegador embutido, viewport 375×812, apenas como proxy visual — a web **não** é o produto): Home com dois planos e cartão de lembrete; plano de 100 dias com "Dia 1 · Gênesis 1–11" … "Dia 5 · Gênesis 48–50, Êxodo 1–9"; leitor com versículos numerados em serifa e barra inferior (A−, A+, Marcar como concluído, Dia anterior/Próximo dia); após marcar e recarregar, botão "Concluído ✓ (desmarcar)" e Home com "Continuar lendo · Bíblia em 100 dias · Dia 2"; painel de testes listando `settings:v1` e `progress:v1:100-dias` no AsyncStorage. Console do navegador sem erros.

## 5. Problemas encontrados (e o que dizem sobre a stack)

1. **RNTL 14 tornou `render`/`unmount` assíncronos** (React 19): sem `await`, o `screen` não estava vinculado e os testes falhavam em ordem dependente. Custo: 15 min. Lição: documentar `await render()`.
2. **Regra de lint do React 19 (`react-hooks/set-state-in-effect`)** reprovou o `useAsync` inicial e dois efeitos; refatorado para estado chaveado por dependências (sem `setState` síncrono em efeito). Bom para qualidade, mas é churn de ecossistema.
3. **`npx expo install ... -- --save-dev` não respeitou `--save-dev`** (jest foi para `dependencies`); corrigido à mão.
4. **`expo lint` na primeira execução instalou o ESLint e depois não o encontrou**; funcionou na segunda execução.
5. **Template padrão traz peso desnecessário** (`@expo/ui`, glass effect, símbolos, web-browser, tabs nativas, tutorial); poda manual necessária.
6. **`predictiveBackGestureEnabled: false`** vem no template — o gesto preditivo do Android 16 continua **não validado** (risco já listado no ADR-001).
7. Clique por coordenada no navegador embutido travou uma vez (irrelevante para mobile; clique por DOM funcionou).
8. Nada de UIScene/Xcode 27 foi exercitado (build nativo não rodou aqui).

## 6. Decisão pós-spike: RN + Expo — **MANTER COM RESSALVAS**

| Critério | Avaliação |
|---|---|
| Velocidade real | Alta: projeto novo → fatia vertical com 7 telas, persistência, lembrete, 16 testes e lint verde em ~45 min de execução, incluindo debugging. TypeScript + rotas tipadas ajudaram. |
| Qualidade mobile | Boa no que foi mensurável (headers nativos, safe areas, listas virtualizadas, escala de fonte, acessibilidade). **Não mensurada em aparelho** — ressalva principal. |
| Complexidade | Baixa: 2 stores, 1 repositório, 1 hook; sem arquitetura especulativa. |
| Offline | Trivial para este escopo; AsyncStorage suficiente para progresso/preferências; SQLite entra só com texto bíblico real. |
| Notificações | API simples e completa; alarme inexato por padrão no Android (bom para o Play). Falta prova em aparelho. |
| Manutenção | Ressalva: churn (RNTL 14, regras de lint do React 19, template mudando a cada SDK). Planejar 1 upgrade por SDK. |
| Tooling no Windows | Tudo rodou: criação, typecheck, lint, testes, doctor, export Hermes para as duas plataformas, dev server. |
| Caminho iOS | **NÃO TESTADO**. Próximo passo obrigatório: `eas build --profile development --platform ios` (conta Apple + UDID) e teste em iPhone. |
| Problemas | Nenhum bloqueante; todos resolvidos em minutos. |

**Maior argumento ainda favorável ao Flutter:** o que ficou sem prova é justamente a camada nativa. Flutter chega às lojas hoje com UIScene migrado automaticamente, predictive back por padrão e renderização determinística (mesmo layout de leitor nos dois sistemas, 0% de frames perdidos no único benchmark disponível). Se o teste em aparelho revelar problemas de safe area/edge-to-edge no Android 16, de gesto de voltar, ou de memória do Hermes em Android de entrada, o Flutter passa a ser a resposta. Nada disso é resolvido por este spike; só o teste em aparelho resolve.

**Condições para REABRIR a decisão:** falha no dev build iOS via EAS a partir do Windows; predictive back quebrando navegação no Android 16 físico; UIScene não resolvido no Expo até fev/2027; regressão de memória do Hermes em aparelho de 2–3 GB.

## 7. Como testar em aparelho (próximo passo, ~1 hora)

```bash
cd mobile
npx expo start            # Android: escanear com Expo Go compatível com SDK 57 (notificação local funciona no Expo Go)
```

```bash
cd mobile
npx eas build --profile development --platform android   # ou --platform ios (exige conta Apple + UDID cadastrado)
```

Roteiro: Home → Bíblia em 100 dias → Dia 1 → Marcar como concluído → fechar o app (matar processo) → reabrir → Home deve mostrar "Continuar lendo · Dia 2"; Lembrete → ativar 07:00 → "Testar agora (5 s)" deve exibir notificação; painel de testes → verificar chaves; Android 16: verificar barras (edge-to-edge) e gesto de voltar.

## 8. O que manter quando o MASTER PRODUCT SPEC chegar

- Modelo de conteúdo: `books.ts` (cânon + capítulos), gerador de cronogramas (`plans.ts`), referência canônica USFM + capítulo.
- Costura `repository.ts` (vira SQLite/API), stores de progresso e preferências (forma dos dados; storage pode migrar).
- `useAsync` + `StateView` (padrão de estados), `Button`/`Card`/`ProgressBar` (base de componentes), `reminders.ts`.
- Testes (padrões de mock do router, `await render`, flags de estado) e a configuração de Jest/lint/typecheck.
- Configuração validada: SDK 57, Expo Router, EAS export funcionando no Windows.

## 9. O que descartar

- Texto placeholder e o gerador de "versículos"; banner de placeholder.
- Painel de testes (ou mantê-lo só em builds de desenvolvimento).
- Tema visual, cópias de tela, chips de horário fixos (entra o time picker do sistema), nomes/slug/scheme do app (`bible-study-spike`, `biblespike`).
- Restos do template (`AGENTS.md`, `README.md`, `scripts/reset-project.js`, `assets/expo.icon`), `react-native-web`/`react-dom` se web não for canal.
- Qualquer decisão de UX tomada aqui só para exercitar a stack (abas ausentes, ordem das telas, textos).
