# Build e identificadores — primeiro build Android em aparelho real

Data: 2026-09-21. Escopo: configuração para o fundador instalar o app no próprio celular Android e, desde a
revisão da tarde de 2026-09-21, o **caminho expresso para a App Store** (§6).
Classificação: **FATO** (fonte + data de acesso), **INFERÊNCIA**, **HIPÓTESE**.

---

## 1. Resposta curta (leia isto primeiro)

**Um build `preview` ou `production` NÃO abre com o conteúdo enquanto a igreja não autorizar.**
FATO (código lido em 2026-09-21): `mobile/src/journey/datasetSource.ts`, função `chooseInitialDataset()`.
Em build de release (`__DEV__ === false`, que é o caso de todo build sem Metro) ela chama
`assertProductionReady()` (`mobile/src/journey/validator.ts`), que exige `rights_status === "authorized"`.
O `dataset.json` embarcado hoje tem `rights_status: "pending_authorization"`, então o app lança erro
na abertura: *"Build de release com conteúdo não liberado para produção"*. Isso é proposital.
(INFERÊNCIA: o sintoma visível é o app fechar ou mostrar a tela de erro logo ao abrir.)

**O perfil para o fundador testar antes da autorização é `development`.** Ele gera um APK de
"development build" (debug, `__DEV__ === true`): o portão não bloqueia e toda tela mostra o aviso
*"Conteúdo real dos 100 Dias, aguardando autorização escrita da igreja para publicação. Não distribuir esta versão."*

O que isso exige:

- **Computador ligado com o Metro rodando** (`npx expo start`). O APK de desenvolvimento não traz o
  JavaScript dentro; ele baixa do computador. Sem Metro, o app abre só a tela do dev client.
- **Celular e computador na mesma rede Wi-Fi** (caminho simples). Alternativas: `npx expo start --tunnel`
  (funciona em redes diferentes; instala o `@expo/ngrok` na primeira vez) ou cabo USB com `adb reverse`
  (exige Android platform-tools, que não estão instalados nesta máquina).
- Depois que o app carregou, dá para desligar a rede e testar o modo offline até recarregar o app.

**Proibido:** mandar o APK (de qualquer perfil) para outras pessoas antes da autorização escrita.
O perfil `development` com `distribution: internal` é só para o aparelho do próprio fundador.

---

## 2. O que foi configurado

| Arquivo | O quê |
|---|---|
| `mobile/app.config.ts` (novo) | Substitui o `app.json` do spike. Variantes por `APP_VARIANT`. |
| `mobile/app.json` (apagado) | Era o do spike ("Leitura Bíblica (spike)", `bible-study-spike`, `biblespike`, splash azul do template). |
| `mobile/eas.json` (novo) | Perfis `development`, `preview`, `production`. |
| `mobile/assets/provisorio/splash-transparente.png` (novo) | PNG 288×288 100% transparente, para o splash não mostrar ícone nenhum. |

### Valores por variante

| | development | preview | production |
|---|---|---|---|
| Nome na tela do celular | `100 dias (dev)` | `100 dias (preview)` | `100 dias` (o longo "100 dias sem desistir" é o nome de loja, definido no App Store Connect) |
| `android.package` / `ios.bundleIdentifier` | `com.cemdiassemdesistir.app.dev` | `com.cemdiassemdesistir.app.preview` | `com.cemdiassemdesistir.app` |
| `scheme` (deep link) | `bibliaapp-dev` | `bibliaapp-preview` | `bibliaapp` |
| Tipo de build | debug + dev client, precisa de Metro | release, APK, sem Metro | release, loja (AAB) |
| Abre antes da autorização? | **Sim**, com aviso | **Não** (portão) | Não (nem gera: `assertRightsForStore`) |
| Ícone | provisório "100" (§6.2) | idem | idem |
| iPad (`supportsTablet`) | `false` | `false` | `false` |
| Nuvem (login/grupos) | liga se houver `EXPO_PUBLIC_SUPABASE_*` | **desligada à força** | **desligada à força** |
| `android.allowBackup` | `false` | `false` | `false` |

Sem `APP_VARIANT` definida, o config assume `development` (é o caso de `npx expo start` local).
Valor inválido lança erro.

### Decisões e porquês

- **Slug `biblia-app`** (nome interno do projeto no EAS e nas URLs do painel expo.dev; o usuário nunca vê).
  Escolhido agora porque o projeto EAS ainda não existe; depois de criado, trocar o slug significa
  projeto novo. É neutro: não amarra o projeto a "100 dias" (há outras jornadas previstas, ver `CLAUDE.md`)
  nem a uma marca que ainda não foi decidida.
- **Identificador de produção.** Era `null` de propósito (esperava entidade e domínio, PLANO_DE_LANCAMENTO D1/D3/D8).
  **Substituído em 2026-09-21** pela decisão do fundador: `com.cemdiassemdesistir.app` (§6). `android.package` e
  `ios.bundleIdentifier` não mudam depois do primeiro envio à loja (mudar = app novo; usuários não recebem atualização).
- **Identificadores de teste.** Os antigos `br.provisorio.bibliaapp.dev/.preview` saíram; dev/preview agora são
  `com.cemdiassemdesistir.app.dev` / `.preview` (o código deriva do definitivo). Custo: reinstalar os apps de teste e
  gerar credenciais novas no EAS. Nenhum usuário afetado.
- **Scheme trocado.** Antes de trocar `biblespike` foi feito grep em `mobile/src`, testes e scripts:
  nenhum uso (só o próprio `app.json`). Um scheme por variante permite ter dev e produção no mesmo celular
  sem o Android perguntar "abrir com qual app?". O scheme de produção (`bibliaapp`) também fica caro de trocar
  depois que houver links publicados; revisar junto com o D8.
- **Notificações:** plugin `expo-notifications` adicionado com `color: #2A4C86` (azul do tema).
  FATO (docs Expo SDK 57, https://docs.expo.dev/versions/v57.0.0/sdk/notifications/, acesso 2026-09-21):
  o ícone deve ser PNG 96×96 todo branco sobre fundo transparente. **Esse asset não existe** (é do designer);
  sem ele o Android mostra um quadrado/ícone genérico na barra de notificação. Quando chegar:
  `icon: './assets/notificacao/icone-android.png'` no plugin.
- **Splash (PROVISÓRIO):** fundo do tema, `#FFFFFF` no claro e `#111111` no escuro (`mobile/src/ui/theme.ts`, `background`).
  FATO (https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/, acesso 2026-09-21): `image` é opcional e
  `dark.backgroundColor` é suportado. Mesmo assim usei um PNG transparente como `image`.
  INFERÊNCIA: no Android 12+ a tela de abertura do sistema sempre desenha um ícone no centro; sem imagem própria
  ela tende a usar o ícone do app, que ainda é o do template Expo. O PNG transparente garante tela lisa.
  Splash definitivo e ícone de loja são do designer.

### Portões de release (2026-09-21)

Três travas independentes, todas no código (não dependem de lembrar de nada):

1. **Direitos na geração do build de loja (DIR-06).** `app.config.ts` → `assertRightsForStore()`: a variante
   `production` recusa gerar config se `content/100-dias-2026/dataset.json` (o que vai para o binário) não tiver
   `rights_status = "authorized"` e `rights_reference` preenchido. Hoje `production` já falha antes, pelo
   identificador; quando o identificador existir, esta trava continua. `preview` não é barrada na geração
   (é teste interno) e fecha na abertura pelo portão de produção.
2. **Direitos na abertura** (já existia): `src/journey/datasetSource.ts`, com `__DEV__` falso.
3. **Nuvem desligada em release (D-6, SEC-04).** `src/cloud/config.ts`: com `__DEV__` falso,
   `getCloudConfig()` devolve `null` mesmo com as variáveis `EXPO_PUBLIC_SUPABASE_*` embutidas, enquanto
   `ACCOUNT_DELETION_AVAILABLE` for `false`. Motivo: o app cria conta (`shouldCreateUser: true`) e ainda não
   tem "Sair"/"Excluir conta" no app nem página web de exclusão (Apple 5.1.1(v), política de exclusão do Google
   Play, LGPD art. 18). A constante só vira `true` no mesmo commit que entregar os três.

### Backup do Android (R1-5)

`android.allowBackup: false` em todas as variantes. A tela de reflexão promete "Isto fica neste aparelho", e
reflexão é dado sensível (LGPD art. 5º, II). FATO (tipo `ExpoConfig` do SDK 57, `@expo/config-types`, lido
em 2026-09-21): com `false` "no backup or restore of the application will ever be performed"; o padrão é `true`.
O plugin `expo-secure-store` continua gravando as regras de backup dele no manifesto; com o backup desligado elas
não têm efeito. Ressalvas:
- INFERÊNCIA (documentação de Auto Backup do Android, não reverificada nesta sessão): a partir do Android 12, para
  apps com targetSdk 31+, `allowBackup=false` desliga o backup na nuvem mas **não** a transferência
  aparelho-a-aparelho iniciada pelo próprio usuário ao trocar de celular. Fechar isso exige `dataExtractionRules`
  próprio (plugin de config). Não fiz: o dado vai para o novo aparelho da mesma pessoa, e a decisão sobre a frase
  "fica neste aparelho" é de produto/design.
- iOS: o AsyncStorage entra no backup do iCloud/computador por padrão (INFERÊNCIA, não verificado). Não há opção
  de config do Expo para isso; excluir do backup é código nativo no armazenamento das reflexões. Pendência
  registrada para quem é dono da tela e do armazenamento de reflexões.

---

## 3. O que ficou provisório ou aberto

| Item | Situação | Depende de |
|---|---|---|
| Identificador de produção | **decidido 2026-09-21**: `com.cemdiassemdesistir.app` (fundador; §6) | — |
| Nome de loja | "100 dias sem desistir" (App Store Connect); sob o ícone: "100 dias" | Fundador (decidido 2026-09-21) |
| Ícone do app | **PROVISÓRIO tipográfico** "100" (§6.2); o do template Expo saiu do config | Designer (definitivo) |
| Ícone de notificação Android (96×96 branco/transparente) | falta | Designer |
| Splash | fundo liso provisório | Designer |
| `ios.supportsTablet` | `false` (V1 só iPhone; 2026-09-21) | — |
| Criptografia de exportação | `ios.config.usesNonExemptEncryption: false` (§6.3) | Vale para build SEM nuvem (V1-A) |
| Manifesto de privacidade iOS | `ios.privacyManifests` preenchido (§6.3) | Reconferir após o 1º build iOS |
| `SCHEDULE_EXACT_ALARM` | EVIDÊNCIA (`node_modules/expo-notifications` 57.0.17, `android/src/main/AndroidManifest.xml`, lido em 2026-09-21): a biblioteca **não** declara essa permissão (só `RECEIVE_BOOT_COMPLETED` e `POST_NOTIFICATIONS`); o CHANGELOG dela diz que, para alarme exato, a permissão tem de ser adicionada à mão. O app **não** a declara de propósito (`mobile/src/reminders/reminders.ts`): os lembretes são inexatos, que é o que a política da Google Play pede para lembretes. Antes de enviar à loja, conferir no manifesto final do build (*merged manifest*, o que junta os manifestos de todas as dependências) que nenhuma outra dependência a adiciona | Verificar antes da loja |
| `extra.eas.projectId` | constante `EAS_PROJECT_ID = null` em `app.config.ts` | Preencher com o valor que o `eas init` imprimir |
| Versões de pacotes | `expo-doctor` (2026-09-21) aponta 13 pacotes com patch atrasado (ex.: `expo-router` 57.0.19 → ~57.0.22). Não mexi (package.json está sendo editado por outro trabalho) | Quem cuida do package.json |

`eas.json`:
- `cli.version: ">= 24.7.0"`. FATO: versão mais recente do `eas-cli` no npm é 24.7.0 (`npm view eas-cli`, publicada em 2026-09-16, consultado em 2026-09-21).
- `appVersionSource: "remote"`: o EAS guarda e incrementa o número de build (`versionCode`). FATO: é o recomendado desde o eas-cli 12
  (https://docs.expo.dev/build-reference/app-versions/, acesso 2026-09-21). `production` tem `autoIncrement: true`.
- `development` e `preview` geram **APK** (`buildType: apk`, instala direto no celular); `production` gera AAB (padrão, é o que a Play aceita).

---

## 4. Comandos do primeiro build (na ordem)

Pré-requisitos: conta no expo.dev (o fundador cria), celular Android com "instalar apps de fontes desconhecidas" permitido para o navegador.
Todos os comandos rodam dentro de `mobile/`. Em PowerShell:

```powershell
cd "C:\Users\Administrator\Bible Study App\mobile"

# 1. Instalar o dev client (NÃO está instalado; sem ele o perfil development não funciona)
npx expo install expo-dev-client
#    Isso altera package.json e package-lock.json. Rodar só quando ninguém estiver mexendo nesses
#    arquivos, e rodar `npm test` depois.

# 2. Instalar o EAS CLI (uma vez, global) e entrar na conta
npm install -g eas-cli
eas login

# 3. Criar o projeto no EAS (usa o slug "biblia-app")
eas init
#    Como o config é dinâmico (app.config.ts), o eas init NÃO consegue gravar o projectId sozinho:
#    ele imprime o ID. Cole em app.config.ts:  const EAS_PROJECT_ID = '<id impresso>';

# 4. Conferir o config que vai para o build
$env:APP_VARIANT='development'; npx expo config --type public
#    O $env: vale até fechar esta janela do PowerShell. Se mudar a variante nesta janela
#    (ex.: $env:APP_VARIANT='preview'), volte com `Remove-Item Env:APP_VARIANT` antes do `npx expo start`.
#    O `eas build` não sofre com isso: ele usa o `env` de cada perfil no eas.json.

# 5. Build Android de desenvolvimento, na nuvem (gera e guarda a chave de assinatura no EAS: responda "sim")
eas build --profile development --platform android

# 6. Instalar: abrir no celular o link/QR code que o comando imprime e instalar o APK.

# 7. Com celular e computador na mesma Wi-Fi, subir o Metro para o dev client
npx expo start --dev-client
#    No app "100 dias (dev)" no celular, escolher o servidor que aparece (ou ler o QR code).
#    Redes diferentes: npx expo start --dev-client --tunnel
#    Na primeira vez, o Windows pergunta se o Node.js pode usar a rede: permitir em redes Privadas.
#    Se o celular não achar o servidor (fica parado na tela do dev client), confira se a Wi-Fi do
#    computador está como rede Privada (Configurações > Rede e Internet > Wi-Fi > propriedades da rede),
#    ou use: npx expo start --dev-client --tunnel
```

Não rodar `eas build --profile preview` para testar antes da autorização: o APK instala, mas o portão bloqueia a abertura.
`eas build --profile production` falha de propósito enquanto o dataset não tiver `rights_status = "authorized"`.

---

## 5. Validação feita (2026-09-21)

`npx expo config --type public` com cada `APP_VARIANT`:

- `development`: nome `100 dias (dev)`, slug `biblia-app`, scheme `bibliaapp-dev`, package/bundle `br.provisorio.bibliaapp.dev`, splash `#FFFFFF`/`#111111`, plugin de notificações presente.
- `preview`: nome `100 dias (preview)`, scheme `bibliaapp-preview`, package/bundle `br.provisorio.bibliaapp.preview`.
- `production` (até a manhã de 2026-09-21): erro pelo identificador `null`. **Depois da decisão do identificador**: erro esperado
  pelo portão de direitos, *"Variante production bloqueada: o dataset embarcado está com rights_status "pending_authorization"…"*.
- `APP_VARIANT=xyz`: erro *"APP_VARIANT inválida"*. Sem variável: cai em `development`.
- 2026-09-21 (G6c): `npx expo config --json` mostra `android.allowBackup: false`. `assertRightsForStore()` coberto por
  `src/__tests__/nuvem-correcoes.test.ts` (recusa o dataset atual, aceita um dataset autorizado).
- `npx tsc --noEmit`: nenhum erro em `app.config.ts`.

---

## 6. Caminho expresso iOS (App Store), decidido em 2026-09-21

Contexto: a campanha começa na quarta 23/09/2026; meta de enviar para revisão da Apple na terça 22/09.

### 6.1 Decisões (fundador, 2026-09-21)

| Item | Valor | Observação |
|---|---|---|
| Conta de desenvolvedor | **pessoa física do fundador** (Apple Developer Program) | A da igreja (Organização) depende de D-U-N-S e não sai a tempo. Diverge da decisão anterior "conta como Organização" (`CLAUDE.md`, Lojas/legal): exceção consciente, com plano de transferir depois. |
| Identificador (iOS e Android) | `com.cemdiassemdesistir.app` | Não cita a pessoa física. Não muda nunca mais depois do 1º envio. dev/preview viraram `…app.dev` / `…app.preview` (reinstalar os apps de teste). |
| Nome sob o ícone | `100 dias` | Curto para não cortar na tela inicial. |
| Nome na loja | `100 dias sem desistir` | Definido no App Store Connect, não no config. |
| Versão | `1.0.0` | Número de build remoto (`appVersionSource: remote`, `autoIncrement` no perfil production). |
| iPad | `supportsTablet: false` | Sem capturas de iPad, sem layout de iPad não testado. |

Transferência para a conta da organização depois: INFERÊNCIA (não reverificado nesta sessão) a Apple permite
transferir o app entre contas mantendo o bundle ID, com pré-requisitos (ex.: ao menos uma versão aprovada, contratos
ativos dos dois lados). **Reverificar a página "Transferring an app" da Apple antes.** Até a transferência, o nome do
vendedor na loja é o da pessoa física (INFERÊNCIA pelo modelo de conta individual; reconferir no App Store Connect).

### 6.2 Ícone provisório

PROVISÓRIO (decisão do engenheiro, 2026-09-21: o designer ainda não entregou). "100" em Schibsted Grotesk 800,
`#111111` sobre `#FFD100`, sem logo da igreja.

| Arquivo | Tamanho | Uso |
|---|---|---|
| `mobile/assets/icone/icone-ios.png` | 1024×1024, RGB **sem alfa** (conferido no IHDR) | `icon` e `ios.icon` |
| `mobile/assets/icone/android-frente.png` | 1024×1024 RGBA transparente; "100" a no máx. 258 px do centro (zona segura: 313 px) | `android.adaptiveIcon.foregroundImage`, fundo `#FFD100` |
| `mobile/assets/icone/android-monocromo.png` | igual ao anterior | ícone temático do Android 13+ |

Regenerar: de `mobile/`, `node scripts/loja/gerar-icone.mjs` (Chrome headless + `scripts/loja/icone.html`; o script
confere dimensões, ausência de alfa no iOS e a zona segura). Conferido que a fonte carrega (a captura difere da
renderização com fonte de sistema). Os arquivos do template (`assets/expo.icon`, `assets/images/icon.png`,
`assets/images/android-icon-*`) não são mais referenciados pelo config; `assets/images/favicon.png` ainda é (web).

### 6.3 Declarações no binário

- `ios.config.usesNonExemptEncryption: false` → `ITSAppUsesNonExemptEncryption = NO`. Base:
  `docs/product/PRIVACIDADE_NAS_LOJAS_rascunho.md` §5 (Criptografia), opção A, recomendada para a **V1-A** (build de
  loja sem `EXPO_PUBLIC_SUPABASE_*`: o código com aes-js não executa; o resto é HTTPS do sistema). INFERÊNCIA, não
  parecer. **Se a loja receber um build COM as variáveis de nuvem**, reler a opção B daquele documento antes de enviar.
  FATO (tipo `ExpoConfig`, `@expo/config-types`, lido 2026-09-21): a chave grava esse valor no Info.plist.
- `ios.privacyManifests`: os quatro motivos de API do §4 do mesmo documento; `NSPrivacyCollectedDataTypes: []`
  (V1-A). Depois do primeiro build iOS, conferir o relatório de privacidade do arquivo.

### 6.4 Ordem dos passos (iOS)

Pré-requisitos do fundador: Apple Developer Program ativo na conta pessoa física; app criado no App Store Connect
com o bundle ID `com.cemdiassemdesistir.app`, nome "100 dias sem desistir", idioma principal Português (Brasil);
URL da política de privacidade publicada.

```powershell
cd "C:\Users\Administrator\Bible Study App\mobile"
npm install -g eas-cli; eas login
eas init                       # colar o ID impresso em app.config.ts: const EAS_PROJECT_ID = '<id>';

# BLOQUEIO: o build de loja só gera depois da autorização escrita da igreja
# (content/100-dias-2026/rights.json -> npm run content:convert -> rights_status "authorized").

eas build --profile production --platform ios
#   Na 1ª vez o EAS pede login da Apple e cria certificado e perfil de distribuição (responder sim).
#   Build de loja NÃO leva as variáveis EXPO_PUBLIC_SUPABASE_* (V1-A); conferir que não há .env com elas.
eas submit --profile production --platform ios --latest
#   Envia para o App Store Connect (TestFlight). Na 1ª vez pede o app (ascAppId); dá para gravar depois em
#   eas.json -> submit.production.ios.ascAppId.
```

Depois, no App Store Connect: capturas (§6.5), descrição, privacidade ("não coleta dados" só vale para V1-A),
classificação etária, contato para a revisão, e "Enviar para revisão". Liberação manual é mais segura que automática
(dá para esperar a revisão do pai do fundador antes de publicar).

### 6.5 Capturas de tela

`mobile/scripts/loja/capturas.mjs` está **só preparado, nunca foi rodado**. Gera 5 PNGs de 1320×2868 (6,9") a partir
da versão web (`npx expo start --web`), com `puppeteer-core` instalado numa pasta temporária (não no projeto).
**Só pode rodar depois da autorização escrita**: antes, toda tela mostra a faixa "aguardando autorização", e o script
se recusa a rodar (confere o dataset e a faixa na tela). Instruções no topo do script. Limitação (INFERÊNCIA): é a
renderização web do mesmo código, sem a barra de status do iOS; com Simulador ou iPhone de 6,9" à mão, capturas
nativas são melhores.

### 6.6 Validação feita (2026-09-21, tarde)

- `npx expo config --type public`, development e preview: nomes `100 dias (dev)` / `100 dias (preview)`, identificadores
  `com.cemdiassemdesistir.app.dev` / `.preview`, ícones novos, `supportsTablet: false`, fundo adaptativo `#FFD100`.
  `--json` mostra `ios.config.usesNonExemptEncryption: false` e os 4 motivos do manifesto (o `--type public` omite `ios.config`).
- production: falha pelo portão de direitos (esperado). Com um dataset autorizado SIMULADO numa pasta temporária
  (chamando a função do config direto), sai nome `100 dias`, versão `1.0.0`, scheme `bibliaapp`, bundle/package
  `com.cemdiassemdesistir.app`, `usesNonExemptEncryption: false`.
