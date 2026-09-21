# Privacidade nas lojas: respostas prontas (rascunho)

- **Data:** 2026-09-21 · **Autor:** Claude. Não é parecer jurídico. As declarações às lojas são **declarações legais
  da entidade que publica**: quem assina decide; aqui só estão a evidência e a recomendação.
- **Etiquetas:** **FATO** = está no código ou em fonte oficial (link + data no fim) · **INFERÊNCIA** = conclusão minha
  · **HIPÓTESE** = palpite não medido.
- **Nada no app foi alterado.** Os trechos de configuração abaixo são para o agente que cuida do `app.config.ts`.

---

## 0. O achado que muda as respostas: existem DUAS V1, não uma

**PROBLEMA.** "V1 sem comunidade" não é, no código de hoje, um app sem rede. A aba **Comunidade** (`juntos.tsx`) já
tem conta por e-mail e entrada em grupos, e ela liga sozinha se a build tiver as variáveis de nuvem.

**EVIDÊNCIA (FATO, código lido em 2026-09-21):**
- `mobile/src/cloud/config.ts`: a nuvem só existe se `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  estiverem no bundle. Sem elas, `getSupabase()` devolve `null` e nada sai do aparelho.
- `mobile/src/cloud/auth.ts`: login por **e-mail + código** (`signInWithOtp`, `verifyOtp`).
- `mobile/src/cloud/groups.ts`: lê/grava as tabelas `profiles` (`display_name`, `age_band`), `groups`,
  `group_memberships`, `app_admins` e as funções `admin_set_group_role`, `remove_group_member`.
- `mobile/src/app/(tabs)/_layout.tsx:41`: a aba `juntos` aparece com o título "Comunidade".
- Não há `.env.local` no repositório hoje (só `.env.example`).

**IMPACTO.** As respostas às lojas dependem de qual build vai para a loja:

| Build | O que sai do aparelho | Resposta às lojas |
|---|---|---|
| **V1-A: sem variáveis de nuvem** | Nada (ver §1) | "Não coleta dados" nas duas lojas |
| **V1-B: com variáveis de nuvem** (conta + grupos, sem feed) | e-mail, ID de usuário, nome exibido, faixa etária, grupo a que a pessoa pertence | Coleta dados, **incluindo dado sensível** (INFERÊNCIA: estar num grupo de uma igreja revela fé) |
| **Com Comunidade** (`comunidade/00-DECISOES.md`) | Tudo da V1-B + publicações, fotos, Amém, comentários, denúncias, bloqueios | §6 |

**RECOMENDAÇÃO.** Mandar para a loja a **V1-A** (build de release **sem** as duas variáveis) enquanto a comunidade não
estiver decidida e o servidor não estiver pronto. Aí as respostas das seções 2 e 3 são verdadeiras. Se a build for
publicada **com** as variáveis, usar a coluna V1-B. Declarar "não coleta" numa build V1-B é declaração falsa.
Sugestão para o agente do `app.config.ts`: registrar no build de release um aviso se as variáveis estiverem presentes
enquanto a decisão não existir (decisão dele; não editei nada).

---

## 1. Inventário de TODA saída de rede (V1-A)

Busca feita em `mobile/src` (sem `__tests__`) por `fetch(`, `supabase`, `Linking.openURL`, `https://`, `mailto`,
Sentry, PostHog, analytics, push token, fontes remotas.

| Possível saída | Existe? | Evidência (FATO) |
|---|---|---|
| `fetch(` direto | **Não** | nenhuma ocorrência |
| Supabase (servidor) | Só se as variáveis existirem | `src/cloud/config.ts`, `src/cloud/client.ts` (cliente criado sob demanda) |
| `Linking.openURL` / links para sites / `mailto` | **Não** | nenhuma ocorrência de `openURL`, `https://` ou `mailto` em `src` |
| Análise de uso (analytics) | **Não envia** | `src/analytics/analytics.ts`: "Nenhum fornecedor está conectado"; `track()` só guarda até 200 eventos **na memória** (some ao fechar o app), e só se o interruptor estiver ligado; desligado por padrão |
| Interruptor "Enviar dados de uso anônimos" | Existe, não envia nada | `src/app/aparencia.tsx:116-119`; ver risco abaixo |
| Relatório de erros (Sentry etc.) | **Não** | nenhum SDK no `package.json` |
| Push remoto (Expo Push) | **Não** | `src/reminders/reminders.ts` só agenda notificação **local** diária (`scheduleNotificationAsync`, gatilho `DAILY`); não há `getExpoPushTokenAsync` |
| Fontes | Locais | `src/ui/fonts.ts` importa os arquivos `.ttf` dos pacotes `@expo-google-fonts/*`, que vão **dentro** do app; não baixa nada do Google |
| Conteúdo (guia dos 100 Dias) | Local | `mobile/content/100-dias-2026/dataset.json` empacotado |
| `expo-device` | Local | `src/app/lembrete.tsx` lê informação do aparelho, não envia |
| Atualização pela rede (EAS Update) | **Não configurado** | `app.json` sem `updates`; `expo-updates` não está no `package.json` |

**INFERÊNCIA.** A V1-A não transmite dado de usuário para fora do aparelho. Dependências nativas do Expo/React Native
não fazem chamadas próprias de análise (HIPÓTESE razoável; não auditei os binários nativos).

**Risco do interruptor (PROBLEMA de honestidade, não de coleta).** Um interruptor que diz "enviar" e não envia não
viola "não coleta", mas é uma promessa de coleta futura. Se um dia um SDK for ligado a ele, **as respostas das lojas
precisam mudar antes da build sair**. Recomendação: ou esconder o interruptor na release até existir fornecedor, ou
mudar o texto para não prometer envio. Decisão de produto/design; registro aqui porque o revisor da loja pode perguntar.

---

## 2. Google Play: formulário "Segurança dos dados"

Regra do Google (FATO, [G1]): "coletar" = transmitir para fora do aparelho. Dado só processado no aparelho não conta.

### 2.1 V1-A (sem variáveis de nuvem)

| Pergunta | Resposta | Evidência |
|---|---|---|
| O app coleta ou compartilha algum dos tipos de dados exigidos? | **Não** | §1: nenhuma saída de rede com dado de usuário |
| Todos os dados coletados são criptografados em trânsito? | Não se aplica (sem coleta; o formulário pula) | — |
| Oferece forma de pedir a exclusão dos dados? | Não se aplica (sem conta, sem servidor) | Tudo fica no aparelho; desinstalar apaga. O painel DEV apaga via `AsyncStorage.clear()`, mas é só DEV |
| Política de privacidade (URL) | Obrigatória mesmo assim | Ficha: `FICHA_DE_LOJA_rascunho.md` §1, campo em aberto |
| Seção "Público-alvo e conteúdo" | Ver §5 | — |

Resultado na página da loja: "Nenhum dado coletado" / "Nenhum dado compartilhado com terceiros".

### 2.2 V1-B (com variáveis de nuvem: conta + grupos)

| Tipo de dado (nome no formulário) | Coleta? | Compartilha? | Obrigatório/opcional | Finalidade | Evidência |
|---|---|---|---|---|---|
| Informações pessoais › **E-mail** | Sim | Não¹ | Opcional (só quem cria conta) | Gerenciamento de conta | `auth.ts:45` `signInWithOtp` |
| Informações pessoais › **Nome** | Sim | Não¹ | Opcional | Funcionalidade do app | `groups.ts` `updateDisplayName` |
| Informações pessoais › **IDs do usuário** | Sim | Não¹ | Opcional | Gerenciamento de conta | `auth.user.id` em `groups.ts` |
| Informações pessoais › **Crenças religiosas ou políticas** | **Sim** (INFERÊNCIA) | Não¹ | Opcional | Funcionalidade do app | pertencer a um grupo de igreja em `group_memberships` revela fé; LGPD art. 5º, II |
| Informações pessoais › Outras (faixa etária `age_band`) | Sim | Não¹ | Opcional | Gerenciamento de conta / segurança | `groups.ts` `select(... age_band ...)` |
| Atividade no app | Não | — | — | — | grupos lidos/gravados, mas não há registro de uso; `track()` não envia |

¹ **Compartilhar**, para o Google, é enviar a terceiro. Prestador que processa em nome do app (Supabase) **não conta
como compartilhamento** (FATO, [G1] "service provider"). Precisa estar no contrato e na política.

- Criptografado em trânsito: **Sim** (FATO: supabase-js fala com `https://…supabase.co`; INFERÊNCIA: a URL do projeto é HTTPS).
- Pedido de exclusão: **Sim, obrigatório** — no app **e** por um link web (FATO, política de exclusão de conta do Google
  Play, [G2]). **Hoje o código não tem exclusão de conta** (não achei função de delete em `src/cloud`): isso **bloqueia**
  publicar a V1-B.

---

## 3. App Store: "Privacidade do app"

Regra da Apple (FATO, [A1]): "coletar" = transmitir para fora do aparelho e guardar por mais tempo que o necessário
para atender o pedido na hora.

- **V1-A: "Data Not Collected" (Dados não coletados)** é verdadeiro. Evidência: §1.
- **V1-B:** marcar "Contact Info › Email Address", "Contact Info › Name", "Identifiers › User ID", "Sensitive Info"
  (INFERÊNCIA: grupo de igreja = convicção religiosa), e "Other Data" (faixa etária). Todos **"Linked to the user"**
  (vinculados à identidade), **não** usados para rastreamento (tracking), finalidade **App Functionality**.
- Apple também exige exclusão de conta dentro do app quando há criação de conta (FATO, diretriz 5.1.1(v), [A2]).
  Mesmo bloqueio da §2.2.

---

## 4. Manifesto de privacidade do iOS (`PrivacyInfo.xcprivacy`)

**O que é:** um arquivo que declara por que o app usa certas funções do iOS que podem servir para identificar o
aparelho ("APIs de motivo obrigatório"). Sem ele a Apple recusa o envio (FATO, [A3]).

**O Expo junta os manifestos das dependências sozinho?** **Não de forma confiável.** FATO ([E1], acesso 2026-09-21):
a documentação do Expo diz que a Apple não lê corretamente todos os `PrivacyInfo` de dependências CocoaPods estáticas
e manda declarar os motivos na configuração do app (`ios.privacyManifests`).

**O que as dependências instaladas declaram** (FATO, lido em `mobile/node_modules/**/ios/PrivacyInfo.xcprivacy`):

| Categoria | Motivo | Quem usa |
|---|---|---|
| UserDefaults (preferências do sistema) | `CA92.1` (ler/gravar dados do próprio app) | react-native, expo-constants, expo-notifications, expo-system-ui |
| FileTimestamp (data de arquivo) | `C617.1` (arquivos do próprio app) | react-native, @react-native-async-storage, expo-application |
| FileTimestamp | `0A2A.1`, `3B52.1` | expo-file-system |
| SystemBootTime (tempo desde que ligou) | `35F9.1` (medir tempo decorrido) | react-native (timing), expo-device |
| DiskSpace (espaço em disco) | `E174.1`, `85F4.1` | expo-file-system |

O código do app em si (JavaScript) não chama nada disso diretamente; AsyncStorage e SecureStore passam pelas libs acima.
`expo-file-system` e `expo-application` entram como dependências do Expo (não estão no `package.json` direto).

**Trecho que falta** (para o agente do `app.config.ts`; **não editei**). Hoje o `app.json` não tem `privacyManifests`:

```ts
ios: {
  privacyManifests: {
    NSPrivacyTracking: false,
    NSPrivacyTrackingDomains: [],
    NSPrivacyCollectedDataTypes: [], // V1-A. Na V1-B/Comunidade, preencher (e-mail, nome, user ID, dado sensível).
    NSPrivacyAccessedAPITypes: [
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
        NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
        NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'] },
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
        NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
      { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
        NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'] },
    ],
  },
},
```

**Conferir depois do primeiro `eas build` de iOS:** abrir o relatório de privacidade do arquivo (Xcode Organizer ou o
e-mail de aviso da Apple) e ver se aparece alguma categoria não listada. A lista acima vem do `node_modules` de hoje;
atualizar dependências pode mudar.

---

## 5. Criptografia: conformidade de exportação

**Onde o app usa `aes-js` e para quê (FATO, `mobile/src/cloud/secureStorage.ts`):** guarda a **sessão de login** do
Supabase no aparelho. Gera uma chave aleatória de 32 bytes (`expo-crypto`), guarda a chave no Keychain/Keystore
(`expo-secure-store`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`) e cifra a sessão com **AES-256 em modo CTR** antes de gravá-la
no AsyncStorage. Só roda se a nuvem estiver configurada (V1-B). Na V1-A o código vai no binário, mas nunca executa.
Além disso, supabase-js usa HTTPS do sistema.

**Regra da Apple (FATO, [A4][A5], acesso 2026-09-21):**
- `ITSAppUsesNonExemptEncryption = NO` quando o app não usa criptografia ou só usa formas **isentas** de documentação.
  Criptografia do sistema (ex.: HTTPS pelo iOS) é tipicamente isenta.
- Criptografia **proprietária ou não padronizada** exige documentação. AES é padrão (NIST/ISO), não proprietário.
- A Apple lista "algoritmos de criptografia padrão" e "criptografia do sistema" entre os casos que pedem uma
  **determinação** de exportação, e diz que é responsabilidade do desenvolvedor ler a regra americana (EAR/BIS).
- França tem controle próprio sobre apps de "armazenamento seguro"; **não se aplica** se a distribuição for só Brasil
  (decisão vigente no CLAUDE.md).

**Leitura (INFERÊNCIA, não é parecer):** o `aes-js` é criptografia padrão implementada **fora** do sistema, mas usada
só para proteger a credencial de login do próprio usuário no aparelho, num app cuja função não é segurança. Isso cabe
nas categorias que a regra americana costuma tratar como isentas de documentação (autenticação / uso acessório em
produto de mercado de massa). É o mesmo padrão recomendado pela documentação do Supabase para React Native
(HIPÓTESE: muitos apps assim declaram `NO`).

**Opções para quem assina:**

| Opção | O que declarar | Risco |
|---|---|---|
| A (recomendada para V1-A) | `NO`; na App Store Connect: usa criptografia só isenta | Baixo: o código com aes-js não executa nessa build, e o resto é HTTPS do sistema |
| B (V1-B) | `NO`, apoiado na isenção de autenticação/uso acessório | Baixo a médio: se a leitura estiver errada, a consequência é ter que enviar documentação depois; não há pedido de dado sensível aqui |
| C (mais conservadora) | `YES` e responder o questionário de "algoritmos padrão" | Mais burocracia a cada versão; talvez pedido de documento anual (não confirmado hoje) |
| D (técnica) | Trocar aes-js por armazenamento só no Keychain (sessões menores / dividir em pedaços) | Some a dúvida; custa engenharia. Decisão de arquitetura, não para agora |

Trecho de configuração (agente do `app.config.ts`): `ios: { config: { usesNonExemptEncryption: false } }` grava
`ITSAppUsesNonExemptEncryption` no Info.plist (FATO de memória da doc do Expo [E2]; **reconfirmar** na página de
config antes de usar). Sem essa chave, a App Store Connect pergunta em toda build enviada.

---

## 6. Versão COM Comunidade (feed da igreja com código, conforme `comunidade/00-DECISOES.md`)

Parte do desenho recomendado: conta 18+, código de entrada, publicação com texto e foto, Amém sem contagem,
comentários, denúncia, bloqueio, moderação.

**Google Play — Segurança dos dados** (tudo **coletado**, nada compartilhado com terceiros se só o Supabase processar;
criptografado em trânsito: sim; exclusão: sim, no app e na web — obrigatório):

| Tipo de dado | Obrigatório? | Finalidade |
|---|---|---|
| E-mail, Nome, IDs do usuário | Obrigatório para quem entra na Comunidade | Gerenciamento de conta, funcionalidade |
| **Crenças religiosas ou políticas** | Obrigatório (o conteúdo é de fé) | Funcionalidade |
| Fotos (fotos de perfil e de publicações) | Opcional | Funcionalidade |
| Mensagens › Outras mensagens no app (publicações e comentários) | Opcional | Funcionalidade |
| Atividade no app › Interações (Amém, denúncias, bloqueios) | Opcional | Funcionalidade, segurança/antifraude |
| Outros (data de nascimento/faixa etária) | Obrigatório | Segurança, conformidade legal |
| Conteúdo gerado pelo usuário é visto por outros usuários | — | Declarar na política; não é "compartilhar" pelo critério do Google, mas o revisor olha |

**App Store — Privacidade do app:** Contact Info (Name, Email), Identifiers (User ID), **Sensitive Info**, User Content
(Photos or Videos, Other User Content), Usage Data › Product Interaction (Amém, denúncias), Other Data (idade). Tudo
**vinculado ao usuário**, sem rastreamento, finalidade App Functionality. Não pode mais usar "Data Not Collected".

**Manifesto iOS:** `NSPrivacyCollectedDataTypes` passa a listar os tipos acima (mesmas categorias da Apple); se entrar
seleção de foto (`expo-image-picker`) ou upload, conferir os `PrivacyInfo` das novas libs e somar à lista da §4.

**Criptografia:** não muda (HTTPS do sistema + aes-js da sessão). Se entrar criptografia de ponta a ponta de mensagens,
refazer a §5 — aí deixa de ser uso acessório.

---

## 7. Classificação indicativa: só as divergências com `FICHA_DE_LOJA_rascunho.md`

A ficha já tem os questionários A (sem Comunidade) e B (com Comunidade). Conferi e não repito; aponto só o que diverge:

1. **A ficha trata a "versão A" como "o app não tem conta"** (§5, linha "Controles no app": "O app não tem conta").
   Isso só é verdade na **V1-A**. Na **V1-B** o app tem conta e grupos; a resposta "Usuários interagem ou trocam
   conteúdo" continua **Não** (grupos sem mensagens), mas o Play pede declarar que há **conta** e o Google pede
   exclusão de conta. A ficha precisa dizer explicitamente que a versão A = build sem variáveis de nuvem.
2. **A aba se chama "Comunidade" no app de hoje** (`(tabs)/_layout.tsx:41`), enquanto a ficha §4 proíbe a palavra
   "comunidade" na loja porque ela "não existe". Um revisor que abrir a V1-A vê uma aba "Comunidade" dizendo que a conta
   está indisponível. INFERÊNCIA: não muda a classificação, mas contradiz a ficha e pode ser lido como função
   incompleta (diretriz 2.1 da Apple, "app completo"). Levar ao design/produto: esconder a aba na V1-A ou renomear.
3. **Nada a corrigir** na versão B (A16 no Brasil, IARC com interação entre usuários): as respostas da ficha batem com a
   §6 deste documento.

---

## 8. O que precisa acontecer antes de enviar

1. Decidir qual build vai: **V1-A** (recomendado) ou V1-B. Tudo aqui depende disso.
2. Se V1-B: implementar exclusão de conta no app e por web (bloqueio nas duas lojas).
3. Agente do `app.config.ts`: `ios.privacyManifests` (§4) e `usesNonExemptEncryption` (§5, após decisão de quem assina).
4. Produto/design: interruptor de "dados anônimos" que não envia (§1) e aba "Comunidade" na V1-A (§7).
5. Política de privacidade publicada com as mesmas afirmações (sem coleta na V1-A).

---

## Fontes (acesso em 2026-09-21, salvo indicação)

- [G1] Google Play Console Help, "Provide information for Google Play's Data safety section" —
  https://support.google.com/googleplay/android-developer/answer/10787469 (definição de coleta, processamento no
  aparelho, tipos de dados incluindo "Religious or political beliefs", perguntas de trânsito e exclusão).
- [G2] Google Play, requisito de exclusão de conta — https://support.google.com/googleplay/android-developer/answer/13327111
  (**não reaberto hoje**; citado também em `docs/technical/MOBILE_STORE_REQUIREMENTS.md`).
- [A1] Apple, "App privacy details on the App Store" — https://developer.apple.com/app-store/app-privacy-details/
  (**não reaberto hoje**; definição de coleta).
- [A2] Apple, App Review Guidelines 5.1.1(v) — https://developer.apple.com/app-store/review/guidelines/ (**não reaberto hoje**).
- [A3] Apple, "Describing use of required reason API" —
  https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api (**não reaberto hoje**).
- [A4] Apple, "Overview of export compliance" (App Store Connect Help) —
  https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance
- [A5] Apple, "Complying with Encryption Export Regulations" —
  https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations (conteúdo não
  carregou no acesso; resumo via resultados de busca que citam a página e https://help.apple.com/xcode/mac/current/en.lproj/dev0dc15d044.html).
- [E1] Expo, "Privacy manifests" — https://docs.expo.dev/guides/apple-privacy/
- [E2] Expo, configuração do app (`ios.config.usesNonExemptEncryption`) — https://docs.expo.dev/versions/latest/config/app/
  (**não reaberto hoje; reconfirmar**).
- Código: `mobile/src/cloud/{config,client,auth,groups,secureStorage}.ts`, `mobile/src/analytics/analytics.ts`,
  `mobile/src/reminders/reminders.ts`, `mobile/src/ui/fonts.ts`, `mobile/src/app/(tabs)/_layout.tsx`, `mobile/app.json`,
  `mobile/package.json`, `mobile/node_modules/**/ios/PrivacyInfo.xcprivacy` (lidos em 2026-09-21).
