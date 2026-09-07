<!-- Pesquisa bruta da Frente A (Sprint 0). Produzida por agente de pesquisa em 2026-09-07 e revisada por amostragem: os fatos-chave (Expo SDK 57, exigência Xcode 26 desde 2026-04-28, target API 36 desde 2026-08-31, issue Liquid Glass do Flutter, preços EAS, issue UIScene expo/expo#46664, local builds no Windows) foram reverificados nas fontes primárias. Correção aplicada ao ADR-001: plano Starter do EAS inclui US$ 45 de crédito de build (não builds ilimitados) e excedente do EAS Update custa US$ 0,005/MAU acima de 3.000. A decisão consolidada está em ../technical/ADR-001-mobile-stack.md. -->

# Sprint 0 — Frente A: Mobile Stack
## Pesquisa técnica para o app de leitura e estudo bíblico (iOS + Android, pt-BR, ~3.000 usuários iniciais)

**Data da pesquisa:** 2026-09-07
**Máquina de desenvolvimento real:** Windows 10 Pro, Node 24, sem Mac/Xcode, sem Flutter/Dart/Java.
**Convenções de rotulagem usadas neste documento:**
- **[FATO]** — verificado em fonte primária (URL na seção 11, acessada em 2026-09-07).
- **[EVIDÊNCIA]** — fonte secundária (blog, relato de engenharia, benchmark de terceiros); qualidade indicada.
- **[INFERÊNCIA]** — conclusão minha a partir de fatos/evidências.
- **[HIPÓTESE]** — plausível, não testado; precisa de spike.
- **[RECOMENDAÇÃO]** — decisão proposta.
- **NÃO VERIFICADO** — não consegui confirmar em fonte primária hoje.

Referências entre colchetes `[S#]` apontam para a seção 11 (Fontes).

---

## 1. Resumo executivo

**Recomendação:** **React Native + Expo** (Expo SDK 57 / React Native 0.86 / Hermes V1 / New Architecture / Expo Router v7 / EAS Build + Submit + Update), com *development builds* (nunca Expo Go como ambiente de produção), `expo-sqlite` (FTS5 habilitado por padrão) + MMKV, `expo-notifications`, `expo-audio` (ou `react-native-track-player` se o áudio virar feature real), `react-native-view-shot` para "versículo como imagem".

**Segunda colocada:** **Flutter 3.47** (Dart 3.13) + Codemagic (build/publicação iOS a partir do Windows) + Shorebird (code push) + drift/sqlite3 + flutter_local_notifications + audio_service.

**Confiança:** **72%**. Não é uma vitória por nocaute: Flutter vence em performance de rendering, em "prontidão de loja hoje" (UIScene automático, predictive back padrão) e em testes; RN+Expo vence de forma decisiva em duas coisas que pesam mais para *este* time, *nesta* máquina, *neste* produto: o ciclo de desenvolvimento iOS a partir do Windows e a fidelidade a componentes nativos do iOS 26.

**As 5 razões principais (em ordem de peso):**

1. **Windows sem Mac é o fato dominante.** [FATO] Flutter exige macOS + Xcode para rodar/depurar em iPhone ou simulador; a documentação de setup iOS não prevê nenhum caminho a partir de Windows [S21]. Só é possível *compilar e publicar* iOS via nuvem (Codemagic), sem hot reload, sem debug, testando via TestFlight a cada iteração. [FATO] Com Expo, a própria FAQ documenta o caminho Windows → EAS Build (nuvem) → EAS Submit, e o teste em iPhone físico via development build [S36][S45]; o hot reload de JS no iPhone acontece com o Metro rodando no Windows. Para um time pequeno sem Mac, isso é a diferença entre "ver o bug de safe area/teclado em 5 segundos" e "esperar 20 minutos de build + processamento do TestFlight".

2. **Sensação nativa real no iOS 26 (Liquid Glass) sem esperar o framework.** [FATO] Expo Router *native tabs* usa a tab bar do sistema e "on iOS 26+ the system draws the tab bar with Liquid Glass" [S41]; `expo-glass-effect` expõe `UIVisualEffectView` com efeito glass; `@expo/ui` (SwiftUI/Jetpack Compose a partir de React) é declarado **estável no SDK 56** [S3][S42]. [FATO] No Flutter, o time declarou em 2025-06-10 que **não** está desenvolvendo o design iOS 26 no Cupertino e não aceita contribuições; a issue #170310 segue aberta com prioridade P3 e "nenhuma feature Liquid Glass foi lançada"; o trabalho migrou para o pacote `cupertino_ui` (1.0 em 2026-08-12), sem data pública para Liquid Glass [S18][S14]. Material 3 Expressive está na mesma situação (issue #168813) [S19].

3. **Ecossistema cobre 100% das necessidades do app sem infra própria (REUSE FIRST).** [FATO] `expo-sqlite` compila com FTS3/4/5 habilitados por padrão (`enableFTS: true`) e funciona inclusive no Expo Go [S38]; `expo-notifications` tem `DailyTriggerInput`, trata a permissão do Android 13 e documenta `SCHEDULE_EXACT_ALARM` [S40]; `expo-audio` suporta background + lock screen [S2 e PR #40919]; Universal Links com entitlement registrado automaticamente pelo EAS Build [S46]; `react-native-view-shot` 4.x suporta New Architecture [S68]. Flutter tem paridade (drift/sqlite3, flutter_local_notifications 22.3.0, audio_service 0.18.19, share_plus) — não é um diferencial *contra* Flutter, mas remove a objeção "Expo é limitado".

4. **OTA/code push convencional e barato.** [FATO] EAS Update envia JS/assets (código interpretado), exatamente o caso previsto na DPLA 3.3.1(B) e na exceção de "interpreter" da política do Google Play [S35][S36][S37]; plano Free cobre 1K MAU, Starter (US$ 19/mês) 3K MAU [S24]. Shorebird para Flutter também é viável (interpretador Dart customizado no iOS, +~2 MB, Free 5.000 patch installs/mês, Pro US$ 20/mês) [S26][S27], mas é uma abordagem mais nova e menos convencional que o precedente de dez anos de CodePush/EAS Update.

5. **Governança e dinheiro.** [FATO] React/React Native foram transferidos para a **React Foundation** (Linux Foundation) com conselho de Amazon, Callstack, Expo, Meta, Microsoft, Software Mansion e Vercel [S61][S62]; Expo levantou **US$ 45M (Series B, 2026-04-16)** [S63]. Flutter continua saudável e com roadmap 2026 publicado [S17], mas depende de um único patrocinador que fez layoffs no time em 2024 [S64] e cancelou macros do Dart em 2025 [S65]. O fork Flock é irrelevante (382 estrelas) [S52].

**O que me faria trocar para Flutter (resumo; detalhes na seção 8):** um Mac na mesa do time; um time com experiência prévia em Dart; ou a decisão de produto de que o leitor bíblico será um *canvas* totalmente customizado (layout de texto próprio, animações pesadas a 120 Hz), onde o renderer próprio do Flutter dá mais controle e desempenho.

---

## 2. Estado atual de cada stack (versões, datas, fontes)

### 2.1 React Native + Expo

| Item | Estado em 2026-09-07 | Rótulo / Fonte |
|---|---|---|
| Expo SDK estável | **SDK 57** (2026-06-30): React Native **0.86**, React 19.2, Hermes V1 padrão; patches 57.0.9 (RN 0.86.2) e 57.0.17 (RN 0.86.3) corrigiram regressões de memória/startup do Hermes V1. Último no npm: 57.0.20. | [FATO] [S2] |
| Expo SDK 58 | Nenhum anúncio/beta encontrado; RN 0.87 (2026-08-11) ainda não está em um SDK Expo. | NÃO VERIFICADO (ausência de evidência) |
| Expo SDK 56 (2026-05-21) | RN 0.85; Hermes V1 padrão; `expo-router` deixou de depender de `react-navigation`; **Expo UI (SwiftUI/Compose) estável**; **Xcode mínimo 26.4**; **iOS mínimo 16.4** (antes 15.1); Stack v5 experimental (react-native-screens 4.25.0-beta.1) com "initial support for Material-style headers and **predictive back gesture**"; Expo Go do SDK 56 não foi publicado nas lojas (TestFlight/`eas go`). | [FATO] [S3][S4] |
| Expo SDK 55 (2026-02-25) | RN 0.83; **Legacy Architecture removida** (`newArchEnabled` não existe mais); Expo Router v7 (native tabs, zoom transitions, `Stack.Toolbar`); *bytecode diffing* do EAS Update (~75% menos download; padrão no SDK 56); Xcode mínimo 26; Node `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| ^25.0.0`; `expo-av` removido do Expo Go e sem patches; `expo-brownfield`; `expo-widgets` (alpha); servidor MCP e repositório `expo/skills`. | [FATO] [S5] |
| Expo SDK 54 (set/2025) | Native tabs (alpha) com Liquid Glass no iOS 26; ícones Liquid Glass (Icon Composer); `expo-glass-effect`; "Compiling your project with Xcode 26 is required if you plan to take advantage of the iOS 26 features". | [FATO] [S6][S41] |
| Cadência | SDK 57 anunciou nova cadência: upgrades "quase imediatos" e opcionais para releases do RN sem breaking changes; cada SDK mantém "lifetime of approximately one year". Expo Go só acompanha o SDK mais recente. | [FATO] [S2] |
| React Native | **0.87** (2026-08-11): Strict TypeScript API padrão (deep imports removidos), AGP 9, Kotlin 2.0+, compileSdk 37, Node ≥ 22.13, SwiftPM experimental. **0.86** (2026-06-11): edge-to-edge padrão no Android 15+, zero breaking. **0.85** (2026-04-07): novo backend de animação; removeu `StyleSheet.absoluteFillObject`. **0.84** (2026-02-11): Hermes V1 padrão, binários iOS pré-compilados por padrão, código Legacy removido (iOS via `RCT_REMOVE_LEGACY_ARCH`). **0.83** (2025-12-10): primeira release sem breaking changes. **0.82** (2025-10-08): só New Architecture. **0.81** (2025-08-12): targetSdk 36, predictive back padrão para targetSdk 36, `SafeAreaView` deprecado, "React Native is already 16KB page size compliant", Xcode ≥ 16.1. | [FATO] [S7]–[S12] |
| Hermes V1 | Padrão desde RN 0.84 / SDK 56. Regressão grave de memória em SDK 56/57 inicial com `react-native-worklets`/`reanimated` (RAM 149 → 266 MB num exemplo; 580 MB → 1,1 GB num app real), corrigida em `expo@57.0.17` (RN 0.86.3). | [FATO] [S2][S57] |
| Libs-chave | Reanimated 4 estável (2025-07-23), **somente New Architecture** [S70]; FlashList v2 (JS-only, só New Arch) [S69]; react-native-mmkv v4 (Nitro; 4.3.2 em 2026-06-22) [S71]; react-native-view-shot 4.x com Fabric [S68]; op-sqlite com plugin FTS5, sqlite-vec, rtree, backends libsql/turso/SQLCipher [S39]. | [FATO] |
| Adoção | State of React Native 2025 (3.501 respostas, 2025-12-09 a 2026-01-08, iniciativa da Software Mansion): New Architecture 80%, Expo Router 71% entre libs de navegação. | [EVIDÊNCIA, survey comunitário] [S60] |

### 2.2 Flutter

| Item | Estado em 2026-09-07 | Rótulo / Fonte |
|---|---|---|
| Flutter estável | **3.47.0** (2026-08-12); **3.47.1** (2026-08-19) com **Dart 3.13.1**; docs referem 3.47.2. | [FATO] [S13][S14][S28] |
| 3.47 (2026-08-12) | Pacotes standalone **`material_ui` 1.0 e `cupertino_ui` 1.0** no pub.dev (opt-in), com releases semanais independentes; Material/Cupertino embutidos no SDK "scheduled for formal deprecation in the upcoming Fall stable release in November"; Impeller padrão em desktop; **iOS mínimo 13 → 15**, macOS 10.15 → 12; trata o mandato UIScene do iOS 27 ("apps built with Xcode 27 that do not adopt UIScene will fail to launch"); Widget Previews estável. | [FATO] [S14] |
| 3.44 (2026-05-20, Dart 3.12) | SwiftPM padrão no iOS (substitui CocoaPods); suporte UIScene; Material/Cupertino **congelados** no core; AGP 9; testes contra betas do Android 17; Hybrid Composition++ (opt-in). A alegação "Skia removido no Android 10+ / Impeller Vulkan obrigatório" aparece só em fonte secundária. | [FATO] [S15]; Skia: [EVIDÊNCIA fraca] [S79] — NÃO VERIFICADO no blog oficial |
| 3.41 (fev/2026, Dart 3.11) | UIScene padrão; CLI migra apps automaticamente em `flutter run`/`flutter build ios` ("Finished migration to UIScene lifecycle"); migração manual se AppDelegate customizado ou plugins que usam lifecycle legado. | [FATO] [S20] |
| 3.38 (2025-11-12, Dart 3.10) | "Flutter fully supports ... iOS 26, Xcode 26, and macOS 26"; targetSdk 36; NDK r28 (16 KB); **predictive back habilitado por padrão**; Java 17 mínimo. Regressão: headings deixaram de ser anunciados pelo TalkBack (fonte secundária). | [FATO] [S16]; regressão: [EVIDÊNCIA] [S78] |
| Roadmap 2026 (2026-02-24) | Prioridades: concluir Impeller no Android e remover Skia; Wasm padrão na web; "day-zero support for Android 17 and upcoming iOS releases"; GenUI/A2UI; **"interpreted bytecode support to Dart for ephemeral code delivery"**; Gemini CLI/Antigravity/MCP; decoupling Material/Cupertino; Primary Constructors e Augmentations no Dart. Ressalva explícita: "aspirational strategy ... plans tend to shift". | [FATO] [S17] |
| Liquid Glass (iOS 26) | Issue #170310 aberta, P3; "not developing ... and we will not be accepting contributions" (2025-06-10); "All new work for iOS26 updates in Cupertino will happen in the new packages" (2025-07-29); nada lançado. Se `cupertino_ui` 1.0 inclui Liquid Glass: NÃO VERIFICADO (o blog do 3.47 não menciona). Fontes secundárias estimam "late 2026". | [FATO] [S18]; estimativa: [EVIDÊNCIA fraca] [S83] |
| Material 3 Expressive | Issue #168813 aberta: "not actively developing ... not accepting contributions" (2025-05-14); trabalho futuro em `material_ui`. Conteúdo do `material_ui` 1.0: NÃO VERIFICADO. | [FATO] [S19] |
| Dart macros | Cancelados em jan/2025; repositório arquivado 2025-02-04. `build_runner` continua sendo o caminho (freezed, drift, riverpod_generator). | [FATO] [S65] |
| Bancos locais | **Isar abandonado pelo autor original** (issue #1689 "Isar is dead, long live Isar"); fork `isar_community` só manutenção do v3; Hive original também parado. drift + `sqlite3` 3.x (bundle via hooks/native assets; `sqlite3_flutter_libs` obsoleto). | [FATO] [S50][S51][S81][S82] |
| Shorebird | Suporta Flutter 3.47.1; "quarterly minor releases are updated within 5 business days; patches within 1 business day"; mínimo 3.24.0 (Android/iOS). | [FATO] [S28] |
| Governança | Layoffs de ~200 pessoas em Flutter/Dart/Python em abr/2024 (CNBC via TechCrunch); Flutter continuou lançando (Impeller, Dart 3.x, roadmap). Fork Flock: 382 estrelas, 22 forks; última atividade reportada dez/2025 (secundário). | [FATO] [S64]; Flock: [FATO stars] [S52], atividade [EVIDÊNCIA] |

### 2.3 Plataformas (Apple / Google) — o que vale hoje

| Requisito | Estado | Fonte |
|---|---|---|
| App Store: SDK/Xcode | Desde **2026-04-28** uploads exigem **Xcode 26 / iOS 26 SDK**. Privacy manifests / required-reason APIs desde 2024-05-01. | [FATO] [S33] |
| iOS 27 / Xcode 27 | Anunciado na WWDC 2026-06-08; lançamento previsto ~2026-09-14; Xcode 27 beta 6 em 2026-08-24. Apps compilados com Xcode 27 **sem UIScene não abrem** [S14][S20]. Data em que a Apple exigirá Xcode 27 para upload: NÃO VERIFICADO (padrão histórico: abril do ano seguinte → [INFERÊNCIA] ~abril/2027). | [EVIDÊNCIA] [S73]; UIScene: [FATO] |
| Google Play: target API | Desde **2026-08-31** apps novos e updates devem ter **targetSdk 36 (Android 16)**; extensão possível até 2026-11-01; apps existentes precisam de ≥ 35 para continuar visíveis a novos usuários. | [FATO] [S31] |
| Android 17 (API 37) | Lançado 2026-06-16; exigência no Play prevista para ~ago/2027 (secundário). | [FATO] [S72]; prazo: [EVIDÊNCIA] |
| 16 KB page size | Apps novos e updates com targetSdk ≥ 35 desde 2025-11-01; página oficial hoje diz que a partir de **2027-02-01** updates sem suporte a 16 KB não poderão ser publicados; AGP ≥ 8.5.1 e NDK ≥ r28. RN 0.81+ e Flutter 3.38+ (NDK r28) são compatíveis. | [FATO] [S32][S87][S12][S16] |
| Apple OTA (regra) | Guideline 2.5.2: apps "may not download, install, or execute code which introduces or changes features or functionality of the app". DPLA 3.3.1(B) (texto citado pela FAQ da Expo, versão de 2024-04-25): "Interpreted code may be downloaded to an Application but only so long as such code: (a) does not change the primary purpose of the Application..." — texto integral na Apple exige login: NÃO VERIFICADO diretamente hoje. | [FATO] [S34]; DPLA via [S36] |
| Google Play OTA (regra) | "An app distributed via Google Play may not modify, replace, or update itself using any method other than Google Play's update mechanism. ... This restriction does not apply to code that runs in a virtual machine or an interpreter where either provides indirect access to Android APIs (such as JavaScript in a webview or browser)." | [FATO] [S35] |

### 2.4 Alternativas — entram ou não na disputa?

- **Kotlin Multiplatform + Compose Multiplatform.** [FATO] iOS estável desde CMP 1.8.0 (mai/2025); 1.11.0 (mai/2026) trouxe input de texto nativo *experimental* sobre `UIView` e render concorrente por padrão [S48][S49]; acessibilidade VoiceOver suportada [S89]. **Não entra**: exige macOS/Xcode para compilar e rodar iOS (mesmo problema do Flutter, sem o ecossistema de plugins do Flutter), UI iOS desenhada por Skia (sem Liquid Glass), sem code push, ecossistema mobile-UI menor, e o time não tem Kotlin/Gradle. Seria a escolha certa para um time Android-nativo com Mac.
- **Nativo duplo (SwiftUI + Jetpack Compose).** Melhor fidelidade possível, mas dois codebases, dois conjuntos de skills, e SwiftUI exige Xcode/Mac para *qualquer* iteração. **Não entra** com um time pequeno e sem Mac. [INFERÊNCIA]
- **.NET MAUI.** [FATO] Hot Restart (deploy iOS sem Mac) foi **removido no Visual Studio 2026**; o caminho é *Pair to Mac* [S75]. Ecossistema mobile menor. **Não entra.**
- **Lynx (ByteDance).** [FATO] Open source desde mar/2025, usado em superfícies do TikTok. [EVIDÊNCIA] Continua *embedded-only*: precisa de um host app nativo; Callstack criou "Sparkling" como camada de app justamente por essa lacuna [S76]. Sem ecossistema de notificações/SQLite/áudio comparável. **Não entra.**
- **Skip (Swift → Android).** [FATO] Gratuito e open source desde jan/2026, mas exige macOS 15 + Xcode 16.4+ [S74]. **Não entra** (Windows).
- **Capacitor/Ionic/Cordova/PWA.** Descartados por requisito (WebView). [FATO] Guideline 4.2.2 da Apple também restringe apps que são "web clippings" [S34].

---

## 3. Matriz comparativa por critério

Escala 1–5 (5 = melhor). Terceira coluna (KMP/CMP) só para referência.

| Critério | RN + Expo | Flutter | KMP/CMP | Justificativa resumida |
|---|:-:|:-:|:-:|---|
| 1. Qualidade iOS/Android e "sensação nativa" (iOS 26 Liquid Glass, Android 16 M3E) | **4** | 3 | 3 | RN usa views nativas (UILabel/UITextView, UINavigationController, UITabBarController via native tabs) → Liquid Glass "de graça" no iOS 26 [S41]; `@expo/ui` estável [S3]. Flutter desenha tudo (Impeller): Cupertino sem Liquid Glass, M3 Expressive não implementado, ambos "paused" no core [S18][S19]. No Android, Flutter tem predictive back padrão desde 3.38 [S16]; no RN é experimental (Stack v5) [S4]. Nenhum dos dois tem M3 Expressive pronto. |
| 2. Velocidade de desenvolvimento (time pequeno + IA) | **5** | 4 | 2 | TypeScript + Expo Router (file-based) + SDK único; Expo entrega `AGENTS.md`/`CLAUDE.md` em projetos novos, MCP server e skills oficiais [S3][S5]. Flutter tem hot reload excelente e Widget Previews [S14], MCP/Gemini CLI no roadmap [S17], mas exige `build_runner` para freezed/drift/riverpod (macros cancelados [S65]). |
| 3. Performance (startup, scroll longo, memória) | 3,5 | **4,5** | 3,5 | Único benchmark com metodologia publicada (SynergyBoat 2025, 3 execuções, versões omitidas, camada de DB inconsistente): Flutter frame time 1,7 ms vs RN 16,7 ms no iOS (15,5% frames perdidos no RN), memória Flutter 14–25 MB vs RN 33–45 MB [S59]. Qualidade da evidência: **baixa/média**. Hermes V1 melhora RN [S10], mas teve regressões de memória em 2026 [S57]. Para texto longo, RN usa o motor de texto nativo — bom, mas com menos controle. |
| 4. Manutenção e churn de upgrades | 3 | 3,5 | 3 | RN/Expo: 3+ SDKs/ano com lifetime ~1 ano [S2]; Xcode mínimo 26 → 26.4 e iOS mínimo 15.1 → 16.4 em 3 meses [S3][S5]; breaking changes em 0.85 e 0.87 [S7]; regressões Hermes V1 [S57]. Flutter: trimestral; deprecação de Material/Cupertino embutidos em nov/2026 (migração para `material_ui`/`cupertino_ui`) [S14]; iOS mínimo 13 → 15 [S14]; UIScene migrado automaticamente [S20]. |
| 5. Ecossistema/libs para este app | **4,5** | 4 | 2,5 | RN: expo-sqlite (FTS5), MMKV, expo-notifications, expo-audio/track-player, view-shot, FlashList v2, Reanimated 4 — todos mantidos e New-Arch. Flutter: drift/sqlite3, flutter_local_notifications 22.3.0, audio_service, share_plus — paridade; porém o DB "famoso" (Isar) morreu [S50]. |
| 6. Notificações (push + locais diárias, permissões iOS/Android 13+) | **4,5** | 4 | 3 | expo-notifications: `DailyTriggerInput`, permissão Android 13, nota `SCHEDULE_EXACT_ALARM`, tokens Expo ou FCM/APNs diretos [S40]. flutter_local_notifications: `zonedSchedule` + `matchDateTimeComponents`, `requestNotificationsPermission()`, `requestExactAlarmsPermission()` [S66] + firebase_messaging. Ambos ok; Expo Push Service remove infra própria. |
| 7. Offline (DB local, sync, posição de leitura) | **4,5** | 4,5 | 3,5 | expo-sqlite com FTS5 por padrão [S38]; op-sqlite se precisar de sqlite-vec/libsql [S39]; MMKV para posição/progresso [S71]. Flutter: `sqlite3` 3.x bundle automático [S81][S82] — FTS5 na build padrão: NÃO VERIFICADO (verificar com `PRAGMA compile_options`). |
| 8. Testes (unit, component, E2E) | 4 | **4,5** | 3 | RN: Jest + RNTL + Maestro (YAML, black-box, sem instalar nada no app) ou Detox (gray-box). Flutter: widget tests de primeira classe + `integration_test` + Patrol (interage com diálogos nativos de permissão; 4.7.0 com SwiftPM) [S80]. E2E iOS em ambos exige macOS (CI). |
| 9. Integração nativa | 4 | 4 | **5** | RN: Expo Modules API (Swift/Kotlin) e Nitro; com Windows, o código Swift só compila na nuvem (feedback lento). Flutter: platform channels / Pigeon / FFI — mesma limitação de Swift no Windows. |
| 10. App Store / Google Play — cumpre HOJE? | 3,5 | **4,5** | 3,5 | Ambos: Xcode 26 ✔, targetSdk 36 ✔, 16 KB ✔, privacy manifests ✔, edge-to-edge ✔. RN: predictive back só experimental (Stack v5) [S4][S58]; **UIScene**: PR no core não mergeado, RFC pendente [S55]; template do `expo prebuild` sem `UIApplicationSceneManifest` — falha ao abrir com Xcode 27 (issue aberta em jun/2026) [S53]. Flutter: UIScene automático desde 3.41 [S20]; predictive back padrão [S16]. |
| 11. Code push / OTA + conformidade | **4,5** | 3,5 | 1 | EAS Update = JS/assets interpretados, dentro da exceção Apple/Google [S36][S37]; diffs de bytecode [S5]. Shorebird = interpretador Dart customizado no iOS (+~2 MB, só device arm64, sem dados públicos de overhead) [S27]. Ambos "não mudam propósito primário". |
| 12. Builds a partir do Windows | **5** | 2,5 | 2 | Expo: EAS Build/Submit na nuvem, dev build em iPhone com Metro no Windows [S36][S45]; `eas build --local` não suportado no Windows [S43]. Flutter: Codemagic compila/assina/publica iOS (500 min M2/mês grátis) [S25], mas **não há como rodar/depurar iOS a partir do Windows** [S21]. |
| 13. Evolução futura / governança | **4,5** | 3,5 | 4 | React Foundation (Linux Foundation) com 7 empresas [S61][S62]; Expo US$ 45M [S63]. Flutter: roadmap 2026 [S17], mas único patrocinador com histórico de layoffs [S64] e cancelamentos (macros) [S65]. JetBrains + Google apoiam KMP. |
| 14. Acessibilidade (Dynamic Type, VoiceOver/TalkBack) | **4,5** | 3,5 | 3,5 | RN expõe a árvore de acessibilidade nativa; `Text` respeita escala do sistema (`allowFontScaling` padrão, `maxFontSizeMultiplier`) [S47]. Flutter mantém árvore de semântica própria — boa, mas com regressões (headings no TalkBack em 3.38 [S78]) e "double announcements" reportados. |
| **Média simples** | **4,1** | **3,9** | 3,0 | Diferença pequena na média; a decisão vem dos critérios 1, 2, 12 e 13, que são os que mais importam para este contexto. |

**Leitura honesta da matriz:** Flutter ganha em 3, 4, 8 e 10. Se o time tivesse um Mac, a média ficaria empatada e a escolha seria por afinidade de linguagem e pela decisão de produto sobre "nativo vs. desenhado".

---

## 4. Necessidades específicas do app de leitura bíblica — como cada stack resolve

### 4.1 Capítulos longos com versículos tocáveis, multi-seleção, highlights persistidos, tipografia, escala de fonte, dark/sepia

- **RN + Expo.** [FATO] `<Text>` aninhado suporta `onPress` por span e é renderizado pelo motor de texto nativo (CoreText / Android TextLayout) — Salmo 119 (176 versículos) é um único `Text` com 176 spans. [HIPÓTESE a testar] `backgroundColor` em spans aninhados no Android historicamente teve inconsistências visuais (bordas de linha, padding); validar em spike com highlights coloridos. Multi-seleção = estado próprio (Set de ids) + spans com estilo; não depender da seleção de texto do sistema. Fontes customizadas via `expo-font`; escala do sistema respeitada por padrão (`allowFontScaling`), com teto por `maxFontSizeMultiplier` para não quebrar layout [S47]; escala própria do app (slider) é só um multiplicador de `fontSize`. Dark/sepia = temas via `useColorScheme` + tokens. Capítulos longos: renderizar por capítulo num `ScrollView` (não é lista virtualizada — o texto é um bloco) e usar FlashList v2 só para listas (livros/capítulos/planos) [S69].
- **Flutter.** [FATO] `Text.rich`/`RichText` com `TextSpan(recognizer: TapGestureRecognizer)` e `TextStyle(background: Paint())` para highlights; `SelectionArea` se quiser seleção livre. Controle total do layout de texto (mesmo resultado em iOS e Android) — vantagem para tipografia "de livro" (hifenização, justificação customizada). Escala do sistema via `MediaQuery.textScalerOf` / `TextScaler` [S22]. Dark/sepia trivial com `ThemeData`. **Ponto a favor do Flutter** se o produto quiser um leitor visualmente idêntico nas duas plataformas.
- **Veredito:** ambos resolvem; RN entrega "texto nativo" (seleção/zoom/VoiceOver nativos), Flutter entrega "texto idêntico e controlável". [INFERÊNCIA] Para leitura com público amplo/idosos, a fidelidade ao Dynamic Type e ao VoiceOver nativos pesa a favor do RN.

### 4.2 Busca full-text local (FTS5)

- **expo-sqlite:** [FATO] "Whether to enable the FTS3, FTS4 and FTS5 extensions" — `enableFTS` padrão `true`; disponível em Android, iOS, web e **Expo Go** [S38]. A issue #26866 (SDK 50, FTS quebrado) foi superada — hoje é opção documentada.
- **op-sqlite:** [FATO] "FTS5 plugin", tokenizers customizados, rtree, sqlite-vec [S39]. Exige dev build (não roda no Expo Go).
- **Flutter (`sqlite3` 3.x / drift):** [FATO] bundle automático do SQLite via hooks [S81][S82]; **FTS5 na build padrão: NÃO VERIFICADO hoje** (a página do pub.dev não lista compile options; verificar `PRAGMA compile_options` no Sprint 1 — expectativa [INFERÊNCIA]: sim, versões anteriores do `sqlite3_flutter_libs` documentavam FTS5).
- **Dica pt-BR (ambas as stacks):** usar tokenizer `unicode61 remove_diacritics 2` para busca sem acento ("coracao" → "coração"); indexar a tabela de versículos com `content=` para não duplicar o texto.

### 4.3 Persistência de posição/progresso, offline completo

- Ambas: Bíblia inteira embarcada em SQLite (pt-BR NVI/ARA/NTLH conforme licença — fora do escopo desta frente) — ~4–6 MB por tradução; progresso de plano e posição de leitura em tabela local + espelho remoto opcional. RN: MMKV (síncrono, JSI/Nitro) para "última posição" [S71]; Flutter: `shared_preferences` ou a própria SQLite. Sync (se houver login) é problema de backend, não de stack.

### 4.4 Áudio em background com controles de lock screen (futuro)

- **RN:** [FATO] `expo-audio` documenta `shouldPlayInBackground` e controles de lock screen; correção de categoria `.playback` para Now Playing mergeada em nov/2025 (PR #40919) [S2]. Para player "de verdade" (fila, skip, CarPlay/Android Auto), `react-native-track-player` com dev client. [INFERÊNCIA] `expo-audio` é mais novo; track-player é o padrão de mercado.
- **Flutter:** [FATO] `audio_service` 0.18.19 (ryanheise, 1,33k likes): background, lock screen, MediaSession/MPNowPlayingInfoCenter, Android Auto/CarPlay [S67] + `just_audio`. Mais maduro que `expo-audio`. **Leve vantagem Flutter** neste item específico.

### 4.5 Deep links (Universal Links / App Links) para plano/dia/capítulo

- **RN/Expo:** [FATO] `ios.associatedDomains` no app config; AASA em `/.well-known/`; "EAS Build ... ensures that the entitlement is registered with Apple automatically"; Expo Router mapeia URL → tela; teste sem deploy via `--tunnel` [S46]. Sem Mac, o registro automático de entitlements pelo EAS é valioso.
- **Flutter:** [FATO] suporte nativo a App Links/Universal Links com `FlutterDeepLinkingEnabled`; cookbooks para intent filters e associated domains; go_router como Router [S23]. Configuração manual de entitlements no Xcode/Apple Developer (via Codemagic para assinar).

### 4.6 Compartilhar versículo como imagem (view → PNG) + share sheet

- **RN:** [FATO] `react-native-view-shot` 4.x (Fabric/TurboModules, `npx expo install`) [S68] + `expo-sharing`/`Share` API. 
- **Flutter:** `RepaintBoundary.toImage()` (API do framework) + `share_plus` — NÃO RE-VERIFICADO HOJE (APIs estáveis há anos).

### 4.7 Notificações diárias de lembrete (local) + push

- **RN:** [FATO] `DailyTriggerInput` ("Once per day when the hour and minute date components match"); Android 13 prompt automático; `SCHEDULE_EXACT_ALARM` documentado; push via Expo Push Service (`getExpoPushTokenAsync`) ou FCM/APNs direto; **push não funciona no Expo Go Android desde SDK 53** — usar dev build [S40].
- **Flutter:** [FATO] `flutter_local_notifications` 22.3.0: `zonedSchedule` + `matchDateTimeComponents` (diário/semanal), `requestNotificationsPermission()`, `requestExactAlarmsPermission()` ou `USE_EXACT_ALARM` [S66]; push com `firebase_messaging`. [FATO] O plugin tem issue aberta para suporte a UIScene (#2751) — sinal de que a migração UIScene também alcança plugins Flutter.
- [RECOMENDAÇÃO] Lembrete diário deve ser **notificação local** (não depende de servidor nem de rede); push remoto só para comunicados da igreja. Evitar `SCHEDULE_EXACT_ALARM` (Play pode questionar) — inexact é suficiente para "lembrete às 7h".

---

## 5. Builds / CI / publicação a partir do Windows — custos e caminhos

### 5.1 Caminho RN + Expo (recomendado)

1. **Local (Windows):** Node 24 é suportado (`^24.3.0`) [S5]; Android Studio + JDK 17 opcionais (para emulador/`expo run:android`). Sem Xcode.
2. **iOS dev loop:** `eas build --profile development --platform ios` (nuvem, worker macOS) → *internal distribution* ad hoc (registrar UDID do iPhone com `eas device:create`; limite Apple de 100 devices/ano) [S44] → instalar no iPhone → `npx expo start` no Windows → o dev client conecta ao Metro (LAN/tunnel) → hot reload de JS/estilos [S45]. Rebuild só quando mudar código nativo/config.
3. **Release:** `eas build --profile production` + `eas submit` (TestFlight/App Store e Play Console) — tudo a partir do Windows [S36].
4. **OTA:** `eas update` para JS/assets (ver seção 6).
5. **Limites/custos [FATO] [S24]:** Free: **15 builds iOS + 15 Android/mês**, timeout 45 min, 1 concorrência, fila de baixa prioridade; EAS Update 1K MAU / 100 GiB. Starter **US$ 19/mês**: timeout 2 h, 3K MAU. Production US$ 199/mês: 50K MAU, 1 TiB. Overage por build: Android medium US$ 1, large US$ 2; iOS medium US$ 2, large US$ 4. Apple Developer Program US$ 99/ano e Google Play US$ 25 (uma vez) valem para qualquer stack.
6. **Ressalvas [FATO]:** `eas build --local` "not supported on Windows (macOS and Linux are supported)"; WSL não testado oficialmente [S43]. Issue #43949 (SDK 55): build Android *release local* no Windows falhava por falta do executável `hermesc` para Windows com Hermes V1 — aberta/"stale" [S56]. **Impacto:** afeta `gradlew assembleRelease` local e possivelmente `npx expo export`/`eas update` executados no Windows; **verificar no SDK 57 no Sprint 1**; contorno: rodar export/update via EAS Workflows (nuvem) ou WSL.

### 5.2 Caminho Flutter

1. **Local (Windows):** Flutter SDK + Android Studio/JDK 17 → desenvolvimento Android completo com hot reload. **iOS: nada roda localmente** [S21].
2. **iOS build/publicação:** Codemagic (worker macOS) compila, assina com App Store Connect API key e publica no TestFlight/App Store. [FATO] Free: **500 min/mês em Mac mini M2**, 1 build paralelo, 120 min máx por build; PAYG: M2 US$ 0,095/min, M4 US$ 0,114/min; planos fixos a partir de US$ 3.990/ano [S25]. Alternativas: Bitrise Hobby 300 créditos/mês (conversão crédito→minuto por máquina; valor em USD NÃO VERIFICADO) [S29]; GitHub Actions 2.000 min/mês grátis em repositórios privados, macOS a US$ 0,062/min adicional [S30], com multiplicador macOS 10× sobre os minutos incluídos ([EVIDÊNCIA secundária] [S90] — a página oficial não mostrou a tabela) → ~200 min macOS/mês efetivos.
3. **Teste iOS:** TestFlight a cada iteração (build 10–20 min + processamento). Sem hot reload, sem debugger, sem inspector de layout no iOS. [INFERÊNCIA] Bugs específicos de iOS (safe area, teclado, gestos, Cupertino) serão descobertos tarde e corrigidos "às cegas".
4. **OTA:** Shorebird (ver seção 6) — também suportado no Codemagic.

### 5.3 Comparação de custo mensal estimado (3.000 usuários, 1–2 devs) — [INFERÊNCIA]

| | RN + Expo | Flutter |
|---|---|---|
| Builds iOS/mês | Free até 15+15; Starter US$ 19 se precisar de mais/timeout 2 h | Codemagic free (500 min ≈ 25–40 builds iOS) |
| OTA | Free até 1K MAU; **Starter US$ 19 para 3K MAU** — com ~3.000 usuários o teto é justo; overage de MAU: NÃO VERIFICADO | Shorebird Free 5.000 patch installs/mês (≈ 1 patch/mês para 3.000 usuários); Pro US$ 20 → 50.000 |
| Total típico | **US$ 0–19/mês** | **US$ 0–20/mês** |

Custo não é diferenciador. O diferenciador é o **ciclo de feedback iOS**.

---

## 6. OTA / code push — regras e recomendação

**Regras [FATO]:**
- Apple 2.5.2: proíbe baixar/executar código que "introduces or changes features or functionality" [S34]. DPLA 3.3.1(B) (texto citado pela Expo, 2024-04-25): código interpretado pode ser baixado desde que (a) não mude o propósito primário, (b) não contorne assinatura/sandbox, (c) não crie uma loja [S36]. Texto atual na Apple: NÃO VERIFICADO diretamente (requer login). [EVIDÊNCIA] A cláusula foi reeditada em out/2025 sem mudar a essência (secundário).
- Google Play: proíbe auto-update fora do Play, exceto "code that runs in a virtual machine or an interpreter" [S35].

**Como cada stack se enquadra:**
- **EAS Update** (RN): atualiza "JS, styling, and images"; não atualiza código nativo, permissões ou SDK; `runtimeVersion` impede update incompatível; Expo alerta que "changes to your app's behavior need to be reviewed" [S37]. É o mesmo modelo do CodePush (dez anos de precedente). Bytecode diffing reduz ~75% o download [S5].
- **Shorebird** (Flutter): "custom interpreter designed specifically for arm64 iOS devices"; "Shorebird uses a custom Dart interpreter to comply with the interpreter-only restriction"; patcha Dart e assets, não código nativo/plugins novos; +~2 MB; não roda em simulador; sem dados públicos de overhead de execução do código patchado no iOS [S27]. [FATO] O roadmap 2026 do Flutter menciona "interpreted bytecode support to Dart for ephemeral code delivery" — sinal de que o Google quer um caminho oficial [S17].

**[RECOMENDAÇÃO] Política de uso de OTA (qualquer stack):**
1. OTA só para correções, textos, estilos, ajustes de planos de leitura — nunca para features novas "escondidas" da revisão.
2. Toda feature nova vai por build de loja; OTA acompanha com hotfixes.
3. Rollout gradual + rollback (EAS: branches/channels; Shorebird Pro: rollbacks).
4. Nunca alterar permissões ou comportamento de notificação via OTA.

---

## 7. Evidência contrária à recomendação (RN + Expo)

Esta seção existe para que a decisão não seja tomada por popularidade. Cada item é real e verificado.

1. **UIScene / Xcode 27 é uma bomba-relógio no RN/Expo.** [FATO] O PR #54763 (suporte a UIScene no `RCTAppDelegate`) **não foi mergeado**; o mantenedor disse em 2025-12-08 "We have an RFC in draft to fix this properly and holistically" e o PR foi marcado *stale* em 2026-06-19 [S55]. [FATO] Issues #46663/#46664 (2026-06-08): app gerado pelo `expo prebuild` (SDK 56) "fails to launch when built with Xcode 27 beta" por falta de `UIApplicationSceneManifest` — abertas [S53]; o changelog do SDK 57 não menciona UIScene [S2]. Enquanto o EAS compilar com Xcode 26 nada quebra; quando a Apple exigir Xcode 27 (padrão histórico: abril; NÃO VERIFICADO), a Expo/RN **precisam** ter resolvido. [INFERÊNCIA] Com o tamanho do ecossistema e o dinheiro envolvido, vão resolver — mas é uma dependência de terceiros num prazo que a Apple controla. **Flutter já migra automaticamente desde 3.41** [S20].

2. **Hermes V1 teve um 2026 turbulento.** [FATO] SDK 56/57: memória quase dobrando (149 → 266 MB; 580 MB → 1,1 GB em app real) até `expo@57.0.17` [S57][S2]; `hermesc` sem binário Windows no SDK 55 [S56]; crashes de PAC (pointer authentication) em iPhones com iOS 26 (#44356, #44606 — status atual NÃO VERIFICADO). Engine novo = risco de regressão por mais alguns ciclos.

3. **Predictive back no Android ainda é experimental no RN.** [FATO] Mantenedor do react-native-screens em 2025-07-11: "months away" por limitação de FragmentManager [S58]; SDK 56 trouxe "initial support" em Stack v5 **experimental** [S4]. targetSdk 36 é obrigatório desde 2026-08-31 [S31]. Relatos de app fechando ao pressionar back com API 36 sem Stack v5 [S58]. Flutter tem isso resolvido por padrão desde nov/2025 [S16].

4. **Performance de rendering: Flutter é objetivamente melhor no benchmark disponível.** [EVIDÊNCIA, qualidade baixa/média] SynergyBoat 2025: RN perdeu 15,5% dos frames numa lista de 100 itens no iPhone 16 Plus; Flutter 0%; memória delta RN 45 MB vs Flutter 25 MB (iOS), 33 vs 14 MB (Android) [S59]. Metodologia fraca (3 execuções, versões omitidas, ORM vs SQLite cru), mas a direção coincide com outros relatos. Num app que vai rodar em Android de entrada (público de igreja no Brasil), memória importa.

5. **Churn de versões mínimas e de SDK.** [FATO] Em 3 meses: Xcode mínimo 26 → 26.4; iOS mínimo 15.1 → 16.4 [S3][S5]; RN 0.85 e 0.87 com breaking changes [S7]; Expo Go só serve o SDK atual; SDKs "aposentam" em ~1 ano [S2]. Expo Router mudou de base (saiu do react-navigation) no SDK 56 [S3] e React Navigation 8 está em andamento [S86] — o ecossistema de navegação ainda está se rearranjando.

6. **Native tabs (a peça que dá Liquid Glass) ainda é alpha.** [FATO] "Native tabs is in alpha ... Its API is subject to change"; máximo de 5 abas; sem adicionar/remover abas em runtime; limitações com FlatList [S41].

7. **Windows é cidadão de segunda classe também no Expo.** [FATO] `eas build --local` não suportado [S43]; issue do `hermesc` [S56]. Não é bloqueante (EAS na nuvem), mas mostra que o caminho "100% Windows" tem arestas.

8. **Dependência comercial da Expo.** [INFERÊNCIA] EAS é o caminho fácil; sair dele (self-host de updates, CI próprio com `expo prebuild` + fastlane no Codemagic) é possível, mas custa. Pricing pode mudar (Series B costuma vir com pressão de receita). Mitigação: `expo-updates` suporta servidor customizado (NÃO RE-VERIFICADO HOJE) e o projeto é sempre "ejetável" via prebuild.

9. **Acessibilidade no Flutter não é ruim.** Não quero exagerar o ponto: a árvore de semântica do Flutter melhorou (compilação 80% mais rápida no 3.32, secundário) e VoiceOver/TalkBack funcionam; o que existe são regressões pontuais [S78] e o custo de "reimplementar" o que o SO já dá.

---

## 8. O que mudaria a recomendação (condições em que Flutter venceria)

1. **Um Mac na equipe** (mesmo um Mac mini M-series usado). Remove a razão nº 1. Com Mac, Flutter recupera hot reload iOS, `flutter run` em iPhone, Xcode para depurar — e a matriz fica empatada; a escolha passaria a ser por linguagem/visão de produto.
2. **Time com experiência em Dart/Flutter** ou preferência forte por uma linguagem única, sound null safety e sem toolchain JS (Metro/npm/Node).
3. **Decisão de produto por um leitor "desenhado"** (layout de texto próprio, animações de página, tipografia editorial idêntica nas duas plataformas, 120 Hz garantido). O renderer próprio do Flutter é uma vantagem real aqui; o RN depende do motor de texto nativo e de views.
4. **Se o UIScene não estiver resolvido no RN/Expo até ~fev/2027** (dois meses antes da provável exigência de Xcode 27). Definir este como *checkpoint* explícito.
5. **Se a regressão de memória/estabilidade do Hermes V1 reaparecer** em SDK 58+ e o público for majoritariamente Android de entrada.
6. **Se áudio (Bíblia narrada em background) virar feature central cedo** — `audio_service`/`just_audio` são mais maduros que `expo-audio`.
7. **Se o Google publicar Liquid Glass/M3 Expressive em `cupertino_ui`/`material_ui`** antes de o app ir para a loja — reduz a razão nº 2 (ainda ficaria o ponto do Windows).

Condições em que **nenhuma** das duas vence: se aparecer um Mac **e** um dev iOS nativo — aí nativo duplo (SwiftUI + Compose) com backend compartilhado passa a ser defensável para um app de leitura com escopo pequeno. Hoje não é o caso.

---

## 9. Riscos e mitigação (para a recomendação RN + Expo)

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Expo/RN não entregam UIScene antes de a Apple exigir Xcode 27 | Média | Alto (bloqueia uploads) | Checkpoint em fev/2027; fixar imagem de build do EAS em Xcode 26.x até lá; acompanhar #46664/#54763; plano B: `expo prebuild` + patch manual do template (SceneDelegate) via config plugin. |
| Regressões do Hermes V1 (memória/crash) | Média | Médio | Ficar em patch releases estáveis (≥ 57.0.17); testes de memória em Android de entrada (2–3 GB RAM) antes de cada release; monitorar issues #44356/#44606. |
| Predictive back quebra navegação com targetSdk 36 | Média | Médio | Usar Stack v5 (experimental) e testar back gesture em Android 16 físico; fallback documentado: `android:enableOnBackInvokedCallback="false"` (perde animação, mantém comportamento). |
| Native tabs (alpha) muda API | Alta | Baixo | Encapsular a tab bar num componente próprio; aceitar refactor pontual. |
| Limite de 3K MAU no Starter do EAS Update com ~3.000 usuários | Média | Baixo | Verificar overage de MAU antes de ativar OTA; alternativa: servidor de updates próprio ou reduzir uso de OTA a hotfixes. |
| `hermesc`/export no Windows | Média | Baixo | Testar `npx expo export` e build release local no SDK 57 no Sprint 1; se falhar, usar EAS Workflows/WSL. |
| Fila lenta do EAS Free | Alta | Baixo | Starter (US$ 19) quando incomodar; agrupar mudanças nativas. |
| Highlights em spans no Android com artefatos | Média | Médio | Spike de 1 dia: renderizar Salmo 119 com 50 highlights coloridos + escala 200% em Android físico; se falhar, desenhar highlights com `WidgetSpan`/overlay. |
| Churn de SDK (3+/ano) | Alta | Médio | Upgrade 1× por SDK, sempre em patch ≥ .10; manter `expo-doctor` verde; congelar versões de libs nativas entre releases. |

---

## 10. Perguntas abertas / NÃO VERIFICADO

1. Existe Expo SDK 58 (beta) com RN 0.87? Nenhuma evidência encontrada em 2026-09-07.
2. O template do `expo prebuild` no SDK 57 já inclui `UIApplicationSceneManifest`/SceneDelegate? Issue #46664 aberta; changelog do SDK 57 silente.
3. Data em que a Apple exigirá Xcode 27 / iOS 27 SDK para uploads (padrão: abril/2027).
4. Se o binário `hermesc` para Windows foi incluído no SDK 56/57 (issue #43949 sem resolução registrada).
5. Se a build padrão do `sqlite3` Dart 3.x inclui FTS5 (a página do pub.dev não lista compile options).
6. Conteúdo real de `cupertino_ui` 1.0 e `material_ui` 1.0 (Liquid Glass? M3 Expressive?) — o blog do 3.47 não detalha.
7. "Skia removido no Android 10+" no Flutter 3.44 — só fonte secundária; o blog oficial fala em melhorias de Vulkan.
8. Overage de MAU do EAS Update no plano Starter.
9. Conversão de créditos Bitrise para minutos/USD; multiplicador macOS do GitHub Actions (10×) — só fontes secundárias.
10. Texto atual da DPLA 3.3.1(B) (página da Apple exige login); usei a citação da FAQ da Expo (2024-04-25).
11. Status atual das issues de crash Hermes/PAC em iOS 26 (#44356, #44606).
12. Compose Multiplatform 1.12.0 aparece no GitHub — data/conteúdo não verificados.
13. Atividade real do Flock em 2026 (a página do GitHub não mostrou datas de commit).
14. Se Stack v5/predictive back saiu de "experimental" no SDK 57.
15. Overhead de execução do código patchado pelo interpretador do Shorebird no iOS (Shorebird não publica números).
16. Preços de Mac mini usado no Brasil (relevante para a seção 8, item 1).

---

## 11. Fontes (todas acessadas em 2026-09-07)

Primárias (docs/blogs oficiais, repositórios, políticas):

- [S1] Expo changelog (índice) — https://expo.dev/changelog
- [S2] Expo SDK 57 — https://expo.dev/changelog/sdk-57 — publicado 2026-06-30
- [S3] Expo SDK 56 — https://expo.dev/changelog/sdk-56 — 2026-05-21
- [S4] Expo SDK 56 Beta — https://expo.dev/changelog/sdk-56-beta — 2026-05-06
- [S5] Expo SDK 55 — https://expo.dev/changelog/sdk-55 — 2026-02-25
- [S6] Expo SDK 54 — https://expo.dev/changelog/sdk-54 — set/2025
- [S7] React Native blog (índice) — https://reactnative.dev/blog
- [S8] React Native 0.87 — https://reactnative.dev/blog/2026/08/11/react-native-0.87 — 2026-08-11
- [S9] React Native 0.86 — https://reactnative.dev/blog/2026/06/11/react-native-0.86 — 2026-06-11
- [S10] React Native 0.84 — https://reactnative.dev/blog/2026/02/11/react-native-0.84 — 2026-02-11
- [S11] React Native 0.82 — https://reactnative.dev/blog/2025/10/08/react-native-0.82 — 2025-10-08
- [S12] React Native 0.81 — https://reactnative.dev/blog/2025/08/12/react-native-0.81 — 2025-08-12
- [S13] Flutter release notes — https://docs.flutter.dev/release/release-notes — página atualizada 2026-08-12
- [S14] What's new in Flutter 3.47 — https://flutter.dev/blog/whats-new-in-flutter-3-47 — 2026-08-12
- [S15] What's new in Flutter 3.44 — https://flutter.dev/blog/whats-new-in-flutter-3-44 — 2026-05-20
- [S16] What's new in Flutter 3.38 — https://flutter.dev/blog/whats-new-in-flutter-3-38 — 2025-11-12
- [S17] Flutter & Dart's 2026 roadmap — https://flutter.dev/blog/flutter-darts-2026-roadmap — 2026-02-24
- [S18] flutter/flutter #170310 (Liquid Glass) — https://github.com/flutter/flutter/issues/170310 — comentários 2025-06-10 e 2025-07-29
- [S19] flutter/flutter #168813 (Material 3 Expressive) — https://github.com/flutter/flutter/issues/168813 — 2025-05-14 / 2025-07-29
- [S20] Flutter — UIScene adoption — https://docs.flutter.dev/release/breaking-changes/uiscenedelegate
- [S21] Flutter — iOS setup — https://docs.flutter.dev/platform-integration/ios/setup
- [S22] Flutter — Accessibility — https://docs.flutter.dev/ui/accessibility
- [S23] Flutter — Deep linking — https://docs.flutter.dev/ui/navigation/deep-linking
- [S24] Expo pricing — https://expo.dev/pricing
- [S25] Codemagic pricing — https://codemagic.io/pricing/
- [S26] Shorebird pricing — https://shorebird.dev/pricing/
- [S27] Shorebird FAQ — https://docs.shorebird.dev/code-push/faq/
- [S28] Shorebird — Flutter versions — https://docs.shorebird.dev/getting-started/flutter-version/
- [S29] Bitrise pricing — https://bitrise.io/pricing
- [S30] GitHub Actions billing — https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
- [S31] Google Play — Target API level requirements — https://developer.android.com/google/play/requirements/target-sdk
- [S32] Android — Support 16 KB page sizes — https://developer.android.com/guide/practices/page-sizes
- [S33] Apple — Upcoming requirements — https://developer.apple.com/news/upcoming-requirements/
- [S34] Apple — App Review Guidelines (2.5.2, 4.2) — https://developer.apple.com/app-store/review/guidelines/
- [S35] Google Play — Device and Network Abuse policy — https://support.google.com/googleplay/android-developer/answer/9888379
- [S36] Expo FAQ (OTA policies; iOS from Windows) — https://docs.expo.dev/faq/
- [S37] EAS Update — Introduction — https://docs.expo.dev/eas-update/introduction/
- [S38] expo-sqlite — https://docs.expo.dev/versions/latest/sdk/sqlite/
- [S39] op-sqlite — https://github.com/OP-Engineering/op-sqlite
- [S40] expo-notifications — https://docs.expo.dev/versions/latest/sdk/notifications/
- [S41] Expo Router — Native tabs — https://docs.expo.dev/router/advanced/native-tabs/
- [S42] Expo UI — https://docs.expo.dev/versions/latest/sdk/ui/
- [S43] EAS — Local builds — https://docs.expo.dev/build-reference/local-builds/
- [S44] EAS — Internal distribution — https://docs.expo.dev/build/internal-distribution/
- [S45] Expo — Development builds — https://docs.expo.dev/develop/development-builds/introduction/
- [S46] Expo — iOS Universal Links — https://docs.expo.dev/linking/ios-universal-links/
- [S47] React Native — Accessibility — https://reactnative.dev/docs/accessibility
- [S48] Compose Multiplatform 1.11.0 — https://blog.jetbrains.com/kotlin/2026/05/compose-multiplatform-1-11-0/ — mai/2026
- [S49] Compose Multiplatform 1.8.0 (iOS stable) — https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/ — mai/2025
- [S50] isar/isar #1689 "Isar is dead, long live Isar" — https://github.com/isar/isar/issues/1689
- [S51] isar_community — https://pub.dev/packages/isar_community
- [S52] Flock — https://github.com/join-the-flock/flock
- [S53] expo/expo #46664 (UIScene / Xcode 27) — https://github.com/expo/expo/issues/46664 — 2026-06-08
- [S54] facebook/react-native #54739 — https://github.com/facebook/react-native/issues/54739
- [S55] facebook/react-native PR #54763 (UIScene) — https://github.com/facebook/react-native/pull/54763 — criado 2025-12-03; stale 2026-06-19
- [S56] expo/expo #43949 (hermesc Windows) — https://github.com/expo/expo/issues/43949
- [S57] expo/expo #46519 (regressão de memória SDK 56) — https://github.com/expo/expo/issues/46519
- [S58] react-native-screens discussion #2540 (predictive back) — https://github.com/software-mansion/react-native-screens/discussions/2540 — 2025-07-11
- [S61] Meta — Introducing the React Foundation — https://engineering.fb.com/2025/10/07/open-source/introducing-the-react-foundation-the-new-home-for-react-react-native/ — 2025-10-07
- [S62] Linux Foundation — formation of the React Foundation — https://www.prnewswire.com/news-releases/linux-foundation-announces-the-formation-of-the-react-foundation-302695870.html — fev/2026
- [S63] Expo — What Expo's Series B means for you — https://expo.dev/blog/what-expo-s-series-b-funding-means-for-you — abr/2026 (US$ 45M, 2026-04-16)
- [S65] dart-lang/macros (arquivado) — https://github.com/dart-lang/macros — 2025-02-04
- [S66] flutter_local_notifications 22.3.0 — https://pub.dev/packages/flutter_local_notifications
- [S67] audio_service 0.18.19 — https://pub.dev/packages/audio_service
- [S68] react-native-view-shot — https://github.com/gre/react-native-view-shot
- [S69] Shopify — FlashList v2 — https://shopify.engineering/flashlist-v2 — 2025
- [S70] Software Mansion — Reanimated 4 stable — https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713 — 2025-07-23
- [S71] react-native-mmkv releases — https://github.com/mrousavy/react-native-mmkv/releases
- [S72] Android Developers Blog — Android 17 is here — https://android-developers.googleblog.com/2026/06/Android-17.html — 2026-06-16
- [S74] Skip — free & open source — https://skip.dev/blog/skip-is-free/ ; FAQ — https://skip.dev/docs/faq/
- [S75] Microsoft — .NET MAUI Hot Restart — https://learn.microsoft.com/en-us/dotnet/maui/ios/hot-restart?view=net-maui-10.0 ; Pair to Mac — https://learn.microsoft.com/en-us/dotnet/maui/ios/pair-to-mac?view=net-maui-10.0
- [S76] Lynx — Quick start — https://lynxjs.org/guide/start/quick-start.html
- [S77] Impeller/Android issues — https://github.com/flutter/flutter/issues/160941 , /172624 , /187237 , /177873
- [S80] Patrol — https://patrol.leancode.co/ ; Maestro — https://maestro.dev/
- [S81] drift — Platforms — https://drift.simonbinder.eu/platforms/
- [S82] sqlite3 (Dart) 3.5.2 — https://pub.dev/packages/sqlite3
- [S85] expo/expo #44356 (Hermes PAC crash iOS 26) — https://github.com/expo/expo/issues/44356
- [S86] React Navigation 8.0 — July progress — https://reactnavigation.org/blog/2026/07/08/react-navigation-8.0-july-progress/ — 2026-07-08
- [S87] Android Developers Blog — 16 KB page size requirement — https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html — mai/2025
- [S89] Kotlin — Compose iOS accessibility — https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html

Secundárias (blogs/benchmarks/imprensa — usadas para experiência prática e rotuladas como EVIDÊNCIA):

- [S59] SynergyBoat — Flutter vs React Native vs Native benchmark 2025 — https://www.synergyboat.com/blog/flutter-vs-react-native-vs-native-performance-benchmark-2025
- [S60] State of React Native 2025 (Software Mansion) — https://results.stateofreactnative.com/en-US/
- [S64] TechCrunch — Google lays off staff from Flutter, Dart, Python — https://techcrunch.com/2024/04/29/google-lays-off-staff-from-flutter-dart-python-weeks-before-its-developer-conference — 2024-04-29
- [S73] MacRumors — iOS 27 roundup — https://www.macrumors.com/roundup/ios-27/
- [S76b] Callstack — Sparkling: the missing app layer for Lynx — https://www.callstack.com/blog/sparkling-the-missing-app-layer-for-lynx-js
- [S78] Abra — Flutter 3.38.0 broke Android headings — https://abra.ai/blog/flutter-3-38-0-how-an-accessibility-upgrade-broke-android-headings
- [S79] Level Up Coding — "Flutter just removed Skia from every modern Android device" — https://levelup.gitconnected.com/flutter-just-removed-skia-from-every-modern-android-device-impeller-vulkan-is-now-mandatory-b52de5038587
- [S83] Medium — "Flutter won't ship Liquid Glass support" (mai/2026) — https://medium.com/@simra.cse/flutter-wont-ship-liquid-glass-support-your-ios-26-app-is-stuck-in-2024-40a26af9b8fc
- [S84] Expo blog — Expo Go vs development builds — https://expo.dev/blog/expo-go-vs-development-builds
- [S90] cicdpipelinecost — GitHub Actions pricing/multipliers — https://cicdpipelinecost.com/github-actions-pricing

---

*Fim do relatório — Frente A, Sprint 0.*
