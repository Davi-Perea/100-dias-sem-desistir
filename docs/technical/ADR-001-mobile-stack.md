# ADR-001 — Stack mobile

- **Status:** PROPOSTA (aguarda aprovação do fundador e do Product Brain)
- **Data:** 2026-09-07
- **Decisores:** Davi (fundador), Product Brain (ChatGPT), Principal Mobile Engineer (Claude)
- **Pesquisa de base:** `../research/MOBILE_STACK_RESEARCH.md` (≈75 fontes primárias, acessadas em 2026-09-07)

## Contexto

Precisamos de um app **mobile real** (iOS + Android) de leitura e estudo bíblico, pt-BR, com ~3.000 usuários iniciais,
time pequeno, desenvolvimento assistido por IA, sem pagamentos, com leitura offline, planos de leitura, notas privadas,
lembretes locais, push ocasional, deep links e publicação real nas lojas. WebView/PWA embrulhada está descartado por requisito.

Restrição dominante do ambiente (FATO, verificado em 2026-09-07): a máquina de desenvolvimento é **Windows 10, sem Mac/Xcode**.
Qualquer stack precisa de um caminho para compilar, testar e publicar iOS sem Mac local.

Restrições das lojas em vigor (FATO, fontes primárias em 2026-09-07):
- App Store: uploads exigem **Xcode 26 / SDK iOS 26 desde 2026-04-28** (Apple, "Upcoming requirements").
- Google Play: **targetSdk 36 (Android 16) desde 2026-08-31**, extensão possível até 2026-11-01; suporte a **16 KB page size** obrigatório.

## Opções consideradas

| Opção | Estado em 2026-09-07 | Veredito |
|---|---|---|
| **React Native + Expo** | Expo SDK 57 (2026-06-30) = RN 0.86, React 19.2, Hermes V1, só New Architecture; EAS Build/Submit/Update; Expo Router v7; `@expo/ui` (SwiftUI/Compose) estável no SDK 56; native tabs com Liquid Glass no iOS 26 (alpha) | **Recomendada** |
| **Flutter** | 3.47 (2026-08-12), Dart 3.13; Impeller; `material_ui`/`cupertino_ui` 1.0 standalone; UIScene migrado automaticamente; predictive back padrão; Liquid Glass e M3 Expressive **não** implementados (issues abertas, "not developing / not accepting contributions") | **Segunda colocada** |
| Kotlin Multiplatform + Compose Multiplatform | iOS estável desde 1.8 (2025); UI desenhada (sem Liquid Glass); exige Mac para iOS; sem code push; time sem Kotlin | Não entra |
| Nativo duplo (SwiftUI + Compose) | Melhor fidelidade; dois codebases; SwiftUI exige Mac para qualquer iteração | Não entra (time pequeno, sem Mac) |
| .NET MAUI | Hot Restart (deploy iOS sem Mac) removido no VS 2026; ecossistema mobile menor | Não entra |
| Lynx (ByteDance), Skip | Lynx ainda "embedded-only" sem ecossistema equivalente; Skip exige macOS | Não entram |
| Capacitor/Ionic/Cordova/PWA | WebView como produto | Descartado por requisito |

## Decisão (proposta)

**React Native + Expo**, com:

- Expo SDK estável mais recente no início do Sprint 1 (hoje: **SDK 57 / RN 0.86**), TypeScript, New Architecture (única disponível).
- **Development builds** (`expo-dev-client`) — nunca Expo Go como ambiente de referência; push e vários módulos não funcionam no Expo Go.
- **EAS Build + EAS Submit** na nuvem para iOS e Android (único caminho iOS a partir do Windows); iteração no iPhone físico via
  development build + Metro rodando no Windows (hot reload de JS sem rebuild nativo).
- **Expo Router** (navegação file-based; native tabs quando estabilizar — hoje alpha, encapsular).
- **expo-sqlite** (FTS5 habilitado por padrão) para texto bíblico empacotado, busca local e dados offline; **MMKV** para chave-valor síncrono.
- **expo-notifications** para lembrete diário como notificação local (sem servidor); push remoto via provedor a decidir no ADR de push (ver ADR-002 / arquitetura).
- **EAS Update** para OTA restrito a correções/conteúdo, dentro das regras Apple (DPLA 3.3.1(B), Guideline 2.5.2) e Google Play (exceção de código interpretado). Política: nenhuma feature nova via OTA; nenhuma mudança de permissões via OTA.
- Reanimated/FlashList/`react-native-view-shot`/`expo-audio` apenas quando a feature correspondente for aprovada.

**Segunda colocada:** Flutter 3.47 + Codemagic (build/assinatura/publicação iOS na nuvem) + Shorebird (code push) + drift/sqlite3 +
flutter_local_notifications + audio_service. Seria a escolha se as condições da seção "O que mudaria a decisão" ocorrerem.

## Por quê (drivers, em ordem de peso)

1. **Ciclo de desenvolvimento iOS a partir do Windows.** Flutter exige macOS/Xcode para rodar/depurar iOS (docs oficiais de setup);
   a partir do Windows só compila e publica na nuvem (Codemagic) e testa via TestFlight a cada iteração. Expo documenta o caminho
   Windows → EAS Build → development build no iPhone → hot reload via Metro. Para safe areas, teclado, gestos e Cupertino, isso é a
   diferença entre minutos e horas por bug. (FATO + INFERÊNCIA)
2. **Fidelidade nativa no iOS 26.** RN usa views nativas; native tabs do Expo Router recebem Liquid Glass do sistema; `@expo/ui` expõe
   SwiftUI/Compose. Flutter desenha tudo e o time declarou não estar desenvolvendo Liquid Glass/M3 Expressive no core. (FATO)
3. **Acessibilidade e tipografia nativas.** Texto renderizado pelo motor nativo respeita Dynamic Type/fontScale e VoiceOver/TalkBack
   sem reimplementação — relevante para leitura com público amplo e idosos. (FATO/INFERÊNCIA)
4. **Ecossistema cobre as necessidades sem infra própria** (SQLite+FTS5, notificações locais, deep links com entitlement registrado
   automaticamente pelo EAS, view-shot, áudio em background). Flutter tem paridade — o ponto é remover a objeção "Expo é limitado". (FATO)
5. **Governança e sustentabilidade.** React/React Native sob a React Foundation (Linux Foundation, 2025–2026); Expo com Series B de
   US$ 45M (2026-04). Flutter é saudável, mas depende de um único patrocinador com histórico de cortes (2024). (FATO)
6. **Velocidade com time pequeno + IA.** TypeScript, Expo Router e tooling de agentes oficiais da Expo. (INFERÊNCIA)

Custo não é diferenciador: ambos os caminhos ficam em US$ 0–20/mês para 3.000 usuários (EAS Free: 15 builds iOS + 15 Android/mês,
EAS Update até 1.000 MAU; Starter US$ 19/mês com US$ 45 de crédito de build e 3.000 MAU, excedente US$ 0,005/MAU; Codemagic Free
500 min/mês em Mac M2; Shorebird Free 5.000 patch installs/mês). Apple Developer Program US$ 99/ano e Google Play US$ 25 (uma vez)
valem para qualquer stack. (FATO, páginas de preço acessadas em 2026-09-07)

## Evidência contrária (registrada de propósito)

1. **UIScene / Xcode 27.** O template do `expo prebuild` (SDK 56) falha ao abrir com Xcode 27 beta por falta de `UIApplicationSceneManifest`
   (expo/expo #46664, aberta em 2026-06-08, aceita e atribuída); o PR de UIScene no RN core (#54763) não foi mergeado. Flutter migra
   automaticamente desde 3.41. Enquanto o EAS compilar com Xcode 26 nada quebra; a Apple ainda não anunciou data para exigir Xcode 27
   (padrão histórico: abril do ano seguinte). **Checkpoint obrigatório: fevereiro/2027.** (FATO + INFERÊNCIA)
2. **Hermes V1 teve regressões em 2026** (memória quase dobrando no SDK 56/57 até expo@57.0.17; `hermesc` sem binário Windows no SDK 55).
   Mitigação: ficar em patch releases estáveis; testar em Android de entrada. (FATO)
3. **Predictive back no Android ainda é experimental no RN** (Stack v5), com targetSdk 36 já obrigatório. Flutter tem por padrão. (FATO)
4. **Performance de rendering:** o único benchmark com metodologia (SynergyBoat 2025, qualidade baixa/média) mostra Flutter com 0% de
   frames perdidos vs 15,5% no RN (iOS) e metade da memória. Para um app de leitura (texto estático, poucas animações) o impacto
   prático é pequeno, mas existe. (EVIDÊNCIA)
5. **Churn:** 3+ SDKs Expo/ano, mínimos de Xcode/iOS subindo em meses, native tabs em alpha. (FATO)
6. **Dependência comercial da Expo (EAS).** Mitigação: o projeto é sempre "ejetável" via `expo prebuild`; `expo-updates` aceita servidor próprio. (INFERÊNCIA)

## O que mudaria a decisão (a favor do Flutter)

1. Um Mac na equipe (mesmo um Mac mini M-series) — remove o driver nº 1 e empata a matriz.
2. Time com experiência prévia em Dart/Flutter.
3. Decisão de produto por um leitor "desenhado" (layout de texto próprio, tipografia editorial idêntica nas duas plataformas, animações de página).
4. UIScene não resolvido no RN/Expo até fevereiro/2027.
5. Áudio da Bíblia em background virar feature central cedo (`audio_service`/`just_audio` são mais maduros que `expo-audio`).

## Consequências

Positivas: um codebase TypeScript; iOS sem Mac; UI nativa; OTA convencional; ecossistema amplo; boa base para contratação no Brasil.
Negativas: aceitar churn de SDK (planejar 1 upgrade por SDK); acompanhar a issue UIScene; testar memória em Android de entrada;
não usar Expo Go para nada além de protótipos descartáveis; `eas build --local` não suportado no Windows (WSL não testado oficialmente).

## Spikes descartáveis recomendados para o Sprint 1 (antes de qualquer tela de produto)

1. Renderizar Salmo 119 (176 versículos) com `Text` aninhado, 50 destaques coloridos e escala de fonte 200% em Android físico de entrada — validar artefatos de `backgroundColor` em spans.
2. `npx expo export` e `eas update` a partir do Windows no SDK 57 (issue do `hermesc`); fallback: EAS Workflows/WSL.
3. Stack v5 + predictive back em Android 16 físico.
4. Medir o loop "EAS dev build → iPhone → Metro no Windows" (tempo real de iteração).
5. `expo-notifications` com `DailyTriggerInput` (lembrete diário) sem `SCHEDULE_EXACT_ALARM`.

## Confiança

**72%** de que RN + Expo é a melhor escolha para este time, nesta máquina, neste produto. Não é vitória por nocaute: Flutter vence em
performance de rendering, prontidão para Xcode 27 e testes. O que decide é o ciclo iOS sem Mac e a fidelidade nativa.
