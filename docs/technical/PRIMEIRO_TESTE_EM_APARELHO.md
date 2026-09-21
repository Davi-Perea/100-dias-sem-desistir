# Primeiro teste em aparelho — roteiro

- **Data:** 2026-09-21. Fontes externas acessadas nesta data (lista no fim).
- **Status:** PROPOSTA. Nada aqui foi executado: nenhum build foi feito e nenhuma conta foi criada.
- **Classificação:** FATO (fonte + data) · EVIDÊNCIA · INFERÊNCIA · HIPÓTESE · RECOMENDAÇÃO.
- **Complementa, sem repetir:** `BUILD_E_IDENTIFICADORES.md` (variantes, `eas.json`, comandos Android),
  `ANDROID_VERIFICACAO_30_09.md` (instalação no Android depois de 30/09) e `EXPO_GO_TESTE_RAPIDO.md` (olhar pelo Expo Go).

O app **nunca rodou num telefone de verdade**. Os testes em Jest rodam com `react-native` simulado: eles não
provam fonte carregada, vidro, sombra, teclado, leitor de tela, notificação nem tamanho de fonte do sistema.
Este roteiro diz o que é preciso para o primeiro development build, quem faz cada passo e o que só o aparelho prova.

---

## 0. Correções ao pedido e aos documentos atuais (leia primeiro)

1. **O scheme já não é `biblespike`.** FATO (código lido em 2026-09-21): `mobile/app.json` foi apagado e substituído
   por `mobile/app.config.ts`, com um scheme por variante: `bibliaapp-dev`, `bibliaapp-preview` e `bibliaapp`
   (`app.config.ts:74-78`). `docs/technical/EXPO_GO_TESTE_RAPIDO.md:45` e `docs/design/03-telas.md:482` ainda citam
   `biblespike`: estão desatualizados.
2. **O primeiro teste tem que ser um development build, não um preview.** `ANDROID_VERIFICACAO_30_09.md` §3 recomenda
   um "preview" (APK independente). **Isso não funciona hoje:** preview é build de release (`__DEV__ === false`), e o
   portão de produção (`mobile/src/journey/datasetSource.ts:90-98`) lança erro na abertura enquanto
   `rights_status = pending_authorization`. O correto é o que diz `BUILD_E_IDENTIFICADORES.md` §1: perfil
   `development`, com o Metro rodando no computador. O portão fica como está: ele é a Launch Gate 2.
3. **Consequência:** desempenho de release, abertura sem Metro e o próprio portão só podem ser testados depois da
   autorização escrita da igreja. Um development build é mais lento que o app final (INFERÊNCIA: JS sem
   otimização de release e com ferramentas de depuração ligadas). Lentidão nele não reprova o app, mas travamento sim.
4. **`expo-dev-client` não está instalado.** FATO (`mobile/package.json`, lido em 2026-09-21). Sem ele o perfil
   `development` do `eas.json` não gera um dev client utilizável.

---

## 1. Quem faz o quê

### 1.1 Só o fundador pode fazer

Claude não cria conta, não digita senha, não paga e não aceita termos em nome de ninguém.

| # | Ação | Por que só o fundador | Custo / prazo |
|---|---|---|---|
| F1 | Criar conta em expo.dev e rodar `eas login` no terminal | Login com senha | Grátis. FATO (ADR-001, preços lidos em 2026-09-07): plano Free com 15 builds iOS + 15 Android por mês; **reverificar antes** |
| F2 | Inscrição no **Apple Developer Program** (só para iPhone) | Identidade, contrato, pagamento | US$ 99/ano. Pessoa física sai em horas ou dias (INFERÊNCIA). **Organização exige D-U-N-S** (prazo não publicado; o plano estima 2–6 semanas, `MOBILE_STORE_REQUIREMENTS.md` §2.2) |
| F3 | Aceitar os termos do Apple Developer e do Expo quando o `eas build` pedir | Aceite de termos | — |
| F4 | Registrar o iPhone: `eas device:create`, abrir o link **no iPhone** e instalar o perfil | Ação no aparelho dele | — |
| F5 | Ligar o **Modo de Desenvolvedor** no iPhone (iOS 16+): Ajustes → Privacidade e Segurança → Modo de Desenvolvedor, reiniciar | Ação no aparelho | FATO (docs Expo, "iOS Developer Mode", acesso 2026-09-21): obrigatório para builds de distribuição interna |
| F6 | Android: permitir "instalar apps desconhecidos" (antes de 30/09) **ou** instalar o Android Platform-Tools (`adb`) e ligar a Depuração USB (depois de 30/09) | Download e ajuste no aparelho | Grátis. Detalhe em `ANDROID_VERIFICACAO_30_09.md` §3 |
| F7 | Liberar o Node.js no Firewall do Windows (rede **Privada**) e, se precisar, autorizar o `@expo/ngrok` para `--tunnel` | Permissão no sistema | — |
| F8 | No iPhone, tocar "Permitir" no pedido de **Rede Local** que o dev client faz para achar o Metro | Ação no aparelho | INFERÊNCIA: sem isso o dev client não enxerga o computador na Wi-Fi |

**Não é preciso para este teste:** conta Google Play Console (US$ 25), D-U-N-S, CNPJ, domínio ou conta de Organização.
O aparelho do próprio fundador se resolve com a conta Expo, mais a Apple (no iPhone) ou o `adb` (no Android).

### 1.2 O que Claude pode fazer, com o fundador acompanhando

- `npx expo install expo-dev-client` (muda `package.json`; hoje outros agentes editam esse arquivo, então coordenar antes).
- Colar em `app.config.ts` o `EAS_PROJECT_ID` que o `eas init` imprimir.
- Conferir o config com `APP_VARIANT=development npx expo config --type public`.
- Disparar `eas build` **depois** do login feito pelo fundador, e ler os logs do build.
- Nenhum commit sem autorização explícita (regra do projeto).

---

## 2. Decisões difíceis de reverter — não tomar às pressas

O primeiro build **não exige nenhuma delas**. `app.config.ts` já foi escrito para isso: identificadores provisórios e
descartáveis nos builds de teste, e a variante production recusa gerar config (`app.config.ts:34,51-64`).

| Decisão | Estado hoje | Por que é cara | O que fazer agora |
|---|---|---|---|
| **Bundle identifier / package definitivo** | `PRODUCTION_IDENTIFIER = null` (`app.config.ts:34`) | Não muda depois do primeiro envio à loja: mudar é lançar outro app (`HARD_TO_REVERSE_DECISIONS.md` A13) | **Nada.** Testar com `br.provisorio.bibliaapp.dev`. Não registrar o identificador definitivo em conta pessoal: INFERÊNCIA, um App ID registrado num time da Apple fica preso a esse time até ser apagado, e um pacote registrado numa conta Google não tem transferência documentada (`ANDROID_VERIFICACAO_30_09.md` §3) |
| **Titular das contas (Apple / Google)** | Não decidido (depende da entidade dona, D1) | A Apple 5.1.1(ix) exige pessoa jurídica para app com dado sensível; trocar de titular depois exige transferência | Um time Apple **pessoal** serve para o dev build com o identificador provisório. Os certificados de desenvolvimento são descartáveis (INFERÊNCIA) |
| **Nome de loja** | Pendente; nome de tela de produção "100 dias sem desistir" (`app.config.ts:66-72`) | Muda com revisão, mas afeta ficha, marca e busca | Os builds de teste já mostram "100 dias (dev)" |
| **Scheme de produção `bibliaapp`** | Definido só no código; nenhum link publicado | Link publicado num material impresso ou mensagem não pode ser recolhido | Decidir junto com o domínio de Universal Links / App Links (A14) **antes** de qualquer link sair do app. Os schemes dev/preview são descartáveis |
| **Slug EAS `biblia-app`** | Escolhido; projeto EAS ainda não existe | Depois do `eas init`, trocar o slug é criar outro projeto EAS (`BUILD_E_IDENTIFICADORES.md` §2) | Confirmar com o fundador **antes** do `eas init` (é o primeiro passo irreversível do roteiro) |
| **`android.allowBackup`** | Não declarado, e o padrão do Android é `true` | Ver achado A4 abaixo: reflexão, jejum e progresso entram no backup do Google | Decisão de produto e LGPD. Não mudar sem o Product Brain |
| **`ios.supportsTablet`** | Não declarado | Muda capturas de tela e a revisão da Apple | Não afeta o primeiro teste |
| **Conta EAS pessoal ou de organização** | — | Credenciais de assinatura (keystore Android) ficam guardadas no EAS | INFERÊNCIA: a keystore do **dev** é descartável. A de produção, não: ela nasce no primeiro build `production`, que hoje é bloqueado |

---

## 3. Passo a passo — Android (primeiro, porque é mais barato)

Os comandos estão em `BUILD_E_IDENTIFICADORES.md` §4. A ordem, com o responsável de cada passo:

1. **[Fundador]** F1: conta Expo; depois, no terminal, `npm install -g eas-cli` e `eas login`.
2. **[Fundador decide]** Confirmar o slug `biblia-app` (tabela da §2).
3. **[Claude]** `npx expo install expo-dev-client`, depois `npx expo-doctor`. FATO (`BUILD_E_IDENTIFICADORES.md` §3,
   2026-09-21): o doctor apontou 13 pacotes com correção (patch) atrasada. Alinhar **antes** do build, porque cada build
   gasta cota.
4. **[Claude, com o fundador logado]** `eas init`, depois colar o `projectId` em `app.config.ts:45`.
5. **[Claude]** `eas build --profile development --platform android`. O EAS gera e guarda a keystore de dev: responder "sim".
6. **[Fundador]** Instalar o APK. **Até 29/09:** pelo link ou QR code, com "fontes desconhecidas" permitido.
   **A partir de 30/09:** `adb install <arquivo>.apk` pelo cabo, ou pelo fluxo avançado (24 h de espera, uma vez só).
   FATO (`ANDROID_VERIFICACAO_30_09.md`, fontes de 2026-09-21): toda atualização depois de 30/09 também precisa de
   `adb` ou do fluxo avançado. **Por isso vale deixar o `adb` pronto de qualquer forma.**
7. **[Claude]** `npx expo start --dev-client` (ou `--tunnel`). **[Fundador]** Abrir "100 dias (dev)" e escolher o servidor.
8. **[Os dois]** Rodar a checklist da §5.

## 4. Passo a passo — iPhone

Pré-requisitos: F2 (Apple Developer pago), F4, F5.
FATO (docs EAS "Internal distribution", acesso 2026-09-21): a distribuição interna no iOS usa perfil **ad hoc**, exige
conta paga, aceita no máximo 100 iPhones por ano, e **cada aparelho novo exige rebuild** (ou nova assinatura).

1. **[Fundador]** `eas device:create`, abrir o link no iPhone e instalar o perfil (registra o UDID).
2. **[Claude, com o fundador logado]** `eas build --profile development --platform ios`. Na primeira vez o EAS pede login na
   Apple **dentro do terminal** para criar certificado e perfil. Quem digita é o fundador.
3. **[Fundador]** Instalar pelo link, ligar o Modo de Desenvolvedor (F5), reiniciar e confirmar.
4. **[Fundador]** Na primeira abertura, permitir a Rede Local (F8). **[Claude]** subir o Metro como no Android.

INFERÊNCIA: registrar os aparelhos de teste (fundador e mais um ou dois) **antes** do primeiro build iOS evita um
rebuild por aparelho.

---

## 5. Checklist — o que só o aparelho prova

Regra: cada item roda no **iPhone e no Android**, salvo indicação, e nos temas **claro e escuro**. Anotar modelo,
versão do sistema, escala de fonte e resultado. Captura de tela de toda falha.

### 5.1 Tamanho de fonte do sistema

| Item | Como testar | Passa se |
|---|---|---|
| **Dynamic Type até AX5** (iOS) | Ajustes → Acessibilidade → Tela e Tamanho do Texto → Texto Maior → ligar e levar ao máximo. EVIDÊNCIA: no máximo o RN informa `fontScale ≈ 3,571` | Em **cada tela nova**, nenhum texto cortado, sobreposto ou fora da tela; tudo alcançável rolando |
| Telas que precisam passar | Jornada (A1, com a acolhida A2 e as linhas de lacuna), Dia, Leitor (barra de topo, rodapé, folha de tamanho), Reflexão, Intercessão e modo altar, Marco, Você, Meu ministério, Lembrete, Aparência, Jejum, Onboarding (3 passos), Antes da campanha, Campanha encerrada, Dia trancado | idem |
| Rolagem inicial da Jornada | Abrir a Jornada em AX5 e em 1× | Abre **em hoje** (ou na acolhida), não no Dia 1 nem no meio. `index.tsx` corrige a rolagem uma vez só, com base na primeira medição: é lógica de layout que o Jest não mede |
| Troca de escala com o app aberto | Mudar o tamanho com o app em segundo plano e voltar | Nada quebra, e as medidas antigas são descartadas (`index.tsx`, `measuredState`) |
| Textos com `allowFontScaling={false}` | `ui/components.tsx:410`, `ui/entrada/States.tsx:57`, `ui/leitor/ReaderTopBar.tsx:124` | Continuam legíveis e não cortam em 1×. Conferir se é intencional |
| **Android** | Configurações → Tela → Tamanho da fonte no máximo. EVIDÊNCIA (conhecimento geral, reverificar): o Android 14+ vai até 200% com escala não linear | Mesmo critério. O teto do Android é menor que o do iOS: passar no Android **não** dispensa o iPhone |

### 5.2 Texto em Negrito, VoiceOver e TalkBack

| Item | Como testar | Passa se |
|---|---|---|
| **Texto em Negrito** (iOS) | Ajustes → Acessibilidade → Tela e Tamanho do Texto → Texto em Negrito, com o app aberto | As faces trocam para a versão mais pesada **sem reiniciar o app** (`ui/theme.ts:282-300` escuta `boldTextChanged`; `promoteFace` troca 400→500… 700→800). Nenhum texto passa a cortar |
| Negrito no Android 12+ | Configurações → Acessibilidade → Texto em negrito | HIPÓTESE: com `fontFamily` própria o ajuste do Android não tem efeito, e o código só trata o iOS (`theme.ts:287`). Registrar o que acontece: é decisão, não falha automática |
| **VoiceOver** (iOS) | Navegar Jornada → Dia → Leitor → Reflexão → Intercessão → modo altar só com gestos | Ordem de leitura lógica; rótulos em pt-BR; as abas anunciam "aba, selecionada"; os cabeçalhos são anunciados como cabeçalho; o modo altar anuncia "Passo N de 5" (`AltarMode.tsx:69`); o dia trancado diz a data em que abre |
| **TalkBack** (Android) | Mesmo roteiro | Idem, e o voltar do sistema fecha o modo altar (`BackHandler` em `AltarMode.tsx`) |
| Alvos de toque | Com leitor de tela e sem ele | Nada menor que 44 pt / 48 dp perdido entre elementos vizinhos |

### 5.3 Visual nativo

| Item | Como testar | Passa se |
|---|---|---|
| **Vidro da barra** (`expo-blur`) | Barra de abas (`TabBar.tsx:79-85`) e barra do leitor (`ReaderTopBar.tsx:61`), rolando conteúdo por baixo, nos temas claro e escuro | **iOS:** desfoque real e rótulos legíveis sobre qualquer conteúdo. **Android:** superfície sólida (`useGlass = Platform.OS === 'ios'`, `TabBar.tsx:51`), sem retângulo translúcido. FATO (docs expo-blur v57, acesso 2026-09-21): no Android o desfoque real exige `blurMethod` e `BlurTargetView`, que o app não usa de propósito |
| **Sombras em `boxShadow`** | Folha modal, barra flutuante, cartões (`theme.ts:349-357`) | Sombra visível e sem serrilhado nos dois sistemas. FATO (docs RN, acesso 2026-09-21): `boxShadow` só existe na New Architecture; sombra externa exige **Android 9+** e sombra interna, Android 10+. Testar num Android 8 (se houver) para ver o fallback |
| **As oito fontes** | Telas que usam cada face: Schibsted 400/500/600/700/800 e Source Serif 400, 400 itálico e 600 (`ui/fonts.ts`) | Cada face aparece. **Atenção:** `useAppFonts` libera o app mesmo **com erro** (`fonts.ts:40-43`), então uma face faltando **não gera erro visível**: o texto cai na fonte do sistema. Comparar com a captura de referência do design, sobretudo o itálico e o 800 |
| **Tema escuro** | Trocar o tema do sistema com o app aberto e também antes de abrir | Splash escuro `#111111`, barra de status clara, vidro com tinta escura, sem texto escuro sobre fundo escuro, e a pomba da marca visível |
| Ícone e splash | Tela inicial do aparelho e abertura | Continuam os do template Expo (PROVISÓRIO, `app.config.ts:91-110`). Isso é esperado, não é falha |

### 5.4 Sistema e ciclo de vida

| Item | Como testar | Passa se |
|---|---|---|
| **Modo altar com tela acesa** | Entrar no modo altar e não tocar por mais tempo que o bloqueio automático do aparelho (ex.: 30 s) | A tela **não apaga** (`useKeepAwake`, `AltarMode.tsx:44`). Ao sair do modo altar, o bloqueio automático volta a funcionar |
| **Lembrete diário** | Escolher um horário 2 min à frente, **fechar o app de vez** (tirar da lista de recentes) | Chega com o nome e o ícone do app. No Android pode atrasar alguns minutos: o alarme é inexato (`reminders.ts:12-14`). Registrar quanto atrasou |
| Diálogo de permissão | Instalação limpa; abrir o app sem tocar em lembrete | **Nenhum** diálogo na abertura. Ele só aparece ao escolher um horário, ao ligar o aviso do altar ou ao escolher o ministério (`reminders.ts:34-46, 87-98`). No iPhone, negar e conferir a mensagem que aparece |
| Véspera do ministério e altar das 12h | Escolher um ministério e ligar o aviso do altar | A tela Lembrete mostra a contagem de agendados (`lembrete.tsx:44-46`) |
| **Limite de 64 no iOS** | Contar os agendados com ministério **Intercessão/Bálsamo** (o maior: 24 dias) + altar ligado + lembrete diário | EVIDÊNCIA (doc `UILocalNotification` da Apple e fórum da Apple, acesso 2026-09-21): o iOS guarda os **64 próximos** e descarta o resto. Conta do código com o dataset de hoje: 24 + 14 + 1 = **39**, abaixo do limite. Conferir que o número exibido bate |
| Ícone de notificação Android | Receber qualquer lembrete | Hoje **deve** sair um quadrado genérico: falta o PNG 96×96 branco (`app.config.ts:133-141`). Registrar como pendência do designer |
| `SCHEDULE_EXACT_ALARM` | Ver as permissões do app no Android (Configurações → Apps → 100 dias (dev) → Permissões) ou no manifesto do APK | FATO (`BUILD_E_IDENTIFICADORES.md` §3, docs de 2026-09-21): a biblioteca declara essa permissão sozinha. Confirmar no APK real, antes de pensar na Play |
| **Teclado sobre a reflexão** | Abrir a Reflexão, digitar 10 linhas, em 1× e em AX5 | **iOS:** o campo e o "Salvar para mim" continuam visíveis (`reflexao/[day].tsx:154-160`, `behavior="padding"`). **Android: maior risco.** O `behavior` é `undefined` e o comentário do próprio código diz que o edge-to-edge do RN 0.86 "ainda não foi verificado em aparelho". Passa se o teclado não cobrir o que está sendo digitado |
| **Android com três botões** | Configurações → Sistema → Navegação → três botões. Repetir com navegação por gestos | A barra de abas flutuante fica **acima** dos botões (usa `insets.bottom`), nada fica por baixo da barra do sistema, e o voltar do sistema volta uma tela (o predictive back está desligado em `app.config.ts:111`) |
| Área segura do iPhone | Aparelho com Dynamic Island | Nada debaixo da ilha nem do indicador inicial |
| Offline | Modo avião **depois** de o app carregar do Metro | Jornada, Dia, Leitor (texto provisório), Reflexão e Jejum funcionam. Aviso: recarregar o app em modo avião num dev build **não** funciona (o JS vem do Metro), e isso não é defeito do app |
| Segundo plano | Abrir, ir para outro app, voltar | Estado preservado; o dia oficial é reavaliado ao voltar (`useJourney.ts:43-52`) |
| Deep links | `adb shell am start -a android.intent.action.VIEW -d "bibliaapp-dev://dia/90"` (Android) ou abrir o link no Safari (iOS) | Dia futuro abre **trancado**, não com o conteúdo. Ver também o achado A3 (`/dev`) |
| Memória em Android de entrada | Usar 10 min num Android barato (2–3 GB de RAM) | Não fecha sozinho. FATO (ADR-001, 2026-09-07): o Hermes V1 teve regressões de memória no SDK 56/57 |

### 5.5 Achados da auditoria de lógica que o aparelho reproduz

Estes são defeitos encontrados lendo o código em 2026-09-21. Cada um tem cenário; o aparelho confirma.

- **A1: a meia-noite com o app aberto não vira o dia.** `useJourney.ts:43-52` só recalcula a data quando o app volta
  a ficar ativo. Teste: deixar o app na Jornada, com a tela acesa, às 23h58 e esperar até 00h02. Hoje ele continua
  mostrando o dia anterior como "hoje", e o dia novo fica trancado até o app ir para segundo plano e voltar.
  Mesmo efeito em 23/09: quem espera a abertura com o app aberto vê "Antes da campanha" com zero dias faltando.
- **A2: o lembrete diário continua depois de 31/12 (e toca antes de 23/09).** O disparo `DAILY`
  (`reminders.ts:117-137`) não tem data de fim, e nada o cancela quando a campanha termina. Teste: com o lembrete
  ligado, mudar a data do aparelho para 02/01/2027. "Sua leitura de hoje" continua chegando todo dia.
- **A3: o painel DEV abre num build de release.** `app/dev.tsx` não tem guarda de `__DEV__` (`componentes.tsx:73` tem).
  O Expo Router expõe todo arquivo como rota, então `bibliaapp://dev` abre o painel mesmo no build da loja. Lá dá
  para simular um dia (`dev.tsx:136`, respeitado por `useJourney.ts:61-66`) e abrir dias futuros, carregar as
  fixtures e ver o conteúdo do AsyncStorage, reflexões inclusive. Só se prova num preview ou production, depois da
  autorização. Deve entrar na correção antes disso.
- **A4: reflexão, jejum e progresso saem do aparelho pelo backup do sistema.** FATO (docs Expo v57, `android.allowBackup`,
  acesso 2026-09-21): o padrão é `true`, e `app.config.ts` não declara nada. O AsyncStorage entra no backup automático
  do Google Drive (INFERÊNCIA: e no backup do iCloud no iOS). O app diz "Fica só neste aparelho" (`ministerio.tsx:91`)
  e "salva neste aparelho" (rodapé da Reflexão). Teste: escrever uma reflexão, fazer o backup, reinstalar ou restaurar
  noutro aparelho: a reflexão volta. Isso afeta dado sensível e o texto mostrado à pessoa, então não é para mudar em
  silêncio. Vai ao Product Brain no formato PROBLEMA → … → RECOMENDAÇÃO.

---

## 6. Módulos nativos que o redesenho vai exigir (e que pedem build novo)

Regra: **mudança só em JS chega pelo Metro sem build novo. Módulo nativo novo, ou mudança de config plugin (permissão,
ícone de notificação, `allowBackup`, texto de uso de câmera/fotos), exige um build novo por plataforma.**
Cada build gasta cota do EAS e, no iPhone, reinstalação.

| Módulo | Para quê (tela do redesenho) | Situação | Observação |
|---|---|---|---|
| `expo-dev-client` | O próprio dev build | **Falta** (`package.json`) | Obrigatório já no primeiro build |
| `expo-network` | Faixa "Sem internet" (F4, A1, C1) | Falta. Hoje a faixa só aparece quando a consulta à nuvem falha (`session.degraded`, `(tabs)/index.tsx`), não quando falta rede | FATO (docs expo-network v57, acesso 2026-09-21): `useNetworkState()`, `getNetworkStateAsync()`, `addNetworkStateListener()`, com `isInternetReachable`. No Android acrescenta `ACCESS_NETWORK_STATE`/`ACCESS_WIFI_STATE` sozinho. É nativo: **build novo** |
| `expo-image-picker` | Foto do perfil (D3) e foto do post (C3) | Falta | FATO (docs expo-image-picker v57, acesso 2026-09-21): `launchImageLibraryAsync` não precisa de pedido de permissão; as opções do plugin (`photosPermission`, `cameraPermission`, `microphonePermission`) "exigem um novo binário". RECOMENDAÇÃO: `cameraPermission: false` e `microphonePermission: false` se só houver galeria (minimização, Apple 5.1.1(iii)) |
| `expo-image-manipulator` | Reencodar e reduzir a foto antes do upload (tira o EXIF com localização) | Falta | Sugerido em `design_handoff_100_dias/LACUNAS.md`. Nativo: build novo |
| `expo-camera` | Tirar foto na hora, se o designer mantiver "câmera" | Falta | Só se aprovado; senão, o seletor do sistema basta |
| `expo-sqlite` | Fila offline de publicações (F4) | Falta | **Não recomendado na V1** (`LACUNAS.md`, pergunta sobre fila offline): publicar desabilitado sem rede. Só entra se o Product Brain aprovar a fila |
| `expo-apple-authentication` | Sign in with Apple | Falta | Só se o login deixar de ser apenas e-mail + código (`cloud/auth.ts:104-106`). Com Google Sign-In, a Apple 4.8 obriga Sign in with Apple |
| `expo-blur` com `BlurTargetView` | Vidro real no Android | Já instalado | Não pede módulo novo; é decisão de design (hoje o Android usa superfície sólida) |

**Mudanças de config que também pedem build:** ícone de notificação do Android (asset do designer), ícone e splash
definitivos, `android.allowBackup` (se o Product Brain decidir), textos de permissão de fotos.

RECOMENDAÇÃO: não instalar módulo "para adiantar" (regra 7 do `CLAUDE.md`). Mas quando dois módulos já aprovados estiverem
prontos, juntá-los no mesmo build economiza cota e reinstalação.

---

## 7. Critério de saída do primeiro teste

O primeiro teste termina com uma planilha (item × aparelho × resultado) e uma lista de defeitos. **Ele não aprova o app para a
loja.** A loja ainda depende de: autorização escrita da igreja (Launch Gate 2), licença da tradução (Gate 1), identificador
definitivo, contas de Organização, política de privacidade, exclusão de conta e ícones definitivos
(`MOBILE_STORE_REQUIREMENTS.md` §7).

---

## Fontes (acessadas em 2026-09-21)

- Expo — app config v57 (`android.allowBackup` padrão `true`; `ios.bundleIdentifier`, `android.package`, `scheme`): https://docs.expo.dev/versions/v57.0.0/config/app/
- Expo — expo-notifications v57 (`DailyTriggerInput`; notificações locais no Expo Go): https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- Expo — expo-network v57: https://docs.expo.dev/versions/v57.0.0/sdk/network/
- Expo — expo-image-picker v57: https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/
- Expo — expo-blur v57 (`blurMethod`, `BlurTargetView` no Android): https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/
- Expo — Internal distribution (ad hoc, conta paga, 100 iPhones/ano, rebuild por aparelho novo): https://docs.expo.dev/build/internal-distribution/
- Expo — iOS Developer Mode (iOS 16+, caminho nos Ajustes): https://docs.expo.dev/guides/ios-developer-mode/
- React Native — View style props, `boxShadow` (New Architecture; Android 9+/10+): https://reactnative.dev/docs/view-style-props#boxshadow
- Apple — `UILocalNotification` (limite de 64 notificações locais; texto legado): https://developer.apple.com/documentation/uikit/uilocalnotification
- Apple Developer Forums — "Does UNNotificationRequest have a 64-notification scheduling limit?" (EVIDÊNCIA; a documentação atual do `UNUserNotificationCenter` não detalha): https://developer.apple.com/forums/thread/811171
- Documentos internos: `BUILD_E_IDENTIFICADORES.md`, `ANDROID_VERIFICACAO_30_09.md`, `EXPO_GO_TESTE_RAPIDO.md`, `ADR-001-mobile-stack.md`,
  `MOBILE_STORE_REQUIREMENTS.md`, `HARD_TO_REVERSE_DECISIONS.md`, `design_handoff_100_dias/LACUNAS.md`.

**Não verificado hoje:** o teto de escala de fonte do Android 14+ (200%); o comportamento do Texto em Negrito do Android com fonte
própria; a cota atual do plano Free do EAS (último dado: 2026-09-07); se o backup do iCloud inclui o diretório do AsyncStorage
no iOS com a configuração atual do Expo.
