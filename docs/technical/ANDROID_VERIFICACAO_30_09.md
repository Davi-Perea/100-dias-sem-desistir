# Verificação de desenvolvedor do Android (30/09/2026) — o que muda para este projeto

- **Data da pesquisa:** 2026-09-21. Todas as fontes oficiais foram acessadas nesta data.
- **Classificação:** FATO (fonte + data) / INFERÊNCIA / HIPÓTESE, como manda o `CLAUDE.md`.
- **Regra:** o Google mexeu nesse programa várias vezes em 2026. **Reverificar as fontes [F1]–[F4] antes de cada decisão.**

---

## 1. Resposta curta

1. **O fundador consegue instalar builds no próprio Android depois de 30/09 sem conta verificada? Sim**, por dois
   caminhos oficiais: **cabo USB com `adb`** (isento, sem espera) ou **"fluxo avançado"** (liga uma opção nas Opções do
   desenvolvedor, reinicia e **espera 24 horas uma única vez**). O que para de funcionar é o jeito "normal": baixar o APK
   pelo link do Expo e tocar em instalar.
2. **Os 20–50 líderes recebem o app pelo Google Play, em "teste interno"** (até 100 testadores, sem análise demorada),
   numa conta do Play Console verificada. **APK por link não serve para eles depois de 30/09**: exigiria o fluxo
   avançado (24 h, Opções do desenvolvedor) em cada celular, o que é inaceitável para líderes.
3. **Agora:** o fundador não precisa de nada novo para o próprio teste (adb ou fluxo avançado resolvem). O gargalo real é
   **quando existe uma conta Play Console verificada** para o teste interno dos líderes. Dá para começar como **pessoa
   física** e **converter para Organização depois** (o Google permite; o contrário não). Isso é decisão do Product
   Brain/fundador, não minha — ver §5.

---

## 2. Como está o programa hoje (2026-09-21)

| # | Afirmação | Classe | Fonte |
|---|---|---|---|
| 1 | A partir de **30/09/2026**, no **Brasil**, Indonésia, Singapura e Tailândia, apps precisam estar registrados por desenvolvedor verificado para serem **instalados e atualizados** em aparelhos Android certificados. Global em 2027. | FATO | [F1], [F3] |
| 2 | Vale para aparelhos certificados com **Android 7 ou superior**; a regra chega pelo Google Play Services (não depende de atualização do sistema). | FATO | [F4] |
| 3 | O bloqueio vale para instalação por lojas participantes (Google Play, Galaxy Store, lojas da Xiaomi, OPPO, vivo, Honor, Transsion) **e por arquivo APK** fora de loja. | FATO ([F1]: "apps must be registered by verified developers to be installed"); a parte do APK também em [F6] (secundária) | [F1], [F2], [F6] |
| 4 | **ADB é isento.** "Apps installed using ADB won't require verification." Sem espera de 24 h, sem mudança no ADB. | FATO | [F4] |
| 5 | **Fluxo avançado** (lançado em agosto/2026, em liberação gradual): Opções do desenvolvedor → "Apps de desenvolvedores não verificados" → autenticar com a trava de tela → confirmar que ninguém está pressionando → **reiniciar e esperar 24 h** → escolher liberar por 7 dias ou sem prazo → instalar com aviso. Não há comando para pular as 24 h. | FATO (passos: [F7], [F8]; espera e ausência de atalho: [F4]) | [F4], [F7], [F8] |
| 6 | App **não registrado** só instala **ou atualiza** com fluxo avançado ligado ou por ADB. Com o fluxo desligado, a atualização falha. | FATO | [F4] |
| 7 | **Conta de distribuição limitada:** gratuita, sem documento de identidade, só conta Google com verificação em 2 etapas + perfil de pagamentos; compartilha apps com **até 20 aparelhos**, cada um autorizado pelo usuário por QR code/link. Público declarado: estudantes, professores, hobbistas, "sem intenção comercial". Pode migrar para conta completa; o contrário não. | FATO | [F4], [F5] |
| 8 | **Play Console:** ao criar um app no Play Console, o Google **registra o nome do pacote automaticamente** e o liga à conta; ~99% dos apps existentes já foram registrados sozinhos. O Play Console também registra apps distribuídos fora do Play. | FATO | [F2], [F9] |
| 9 | Registro = nome do pacote + impressão digital SHA-256 do certificado de assinatura. Dá para **adicionar outras chaves** depois (provando posse com um APK assinado por ela). | FATO | [F10], [F11] |
| 10 | Conta completa custa US$ 25; Organização exige D-U-N-S. | FATO | [F3], [F4] |
| 11 | Play Console **pessoal → Organização é permitido** (novo perfil de pagamentos de organização, verificação, vincular). Organização → pessoal, não. | FATO | [F12] |
| 12 | Contas **pessoais** criadas depois de 13/11/2023 precisam de **teste fechado com 12 testadores por 14 dias** antes de publicar em produção. **Teste interno não tem requisito.** Organização não está sujeita. | FATO | [F13] |
| 13 | Um app já instalado antes de 30/09 continua abrindo depois dessa data; o que falha é instalar de novo ou atualizar. | INFERÊNCIA (o FAQ fala só de "install" e "update"; nada sobre desativar apps instalados) | [F4] |
| 14 | Build distribuído pelo teste interno do Play de uma conta verificada instala normalmente depois de 30/09 (o pacote foi registrado ao criar o app no Console). | INFERÊNCIA forte (itens 1 e 8 juntos); nenhuma fonte fala de "teste interno" especificamente | [F2], [F9] |

---

## 3. Respostas para este projeto

### (1) Build de teste no Android do fundador depois de 30/09, sem conta verificada

**Sim.** Ordem de preferência:

1. **Antes de 30/09 (até terça, 29/09):** APK pelo link do EAS, instalação normal. Continua valendo o que o plano diz.
2. **Depois de 30/09, cabo + `adb`:** o fundador instala o Android SDK Platform-Tools (download oficial do Google,
   feito por ele) no Windows, liga a "Depuração USB" no celular e roda `adb install arquivo.apk`. Isento (FATO [F4]).
3. **Depois de 30/09, sem cabo:** fluxo avançado uma única vez (24 h de espera) e depois instala o APK pelo link, com
   aviso. Liberação é gradual (FATO [F8]): pode ainda não ter chegado ao celular dele — nesse caso, `adb`.

Dois detalhes técnicos que o plano não diz (FATO, lido em `mobile/` hoje):

- **Não existe `eas.json`, nem `android.package` no `app.json`, nem `expo-dev-client` no `package.json`.** Tudo isso
  precisa existir antes do primeiro build.
- Para o teste de 1 hora, o build certo é um **"preview" independente** (APK com o código embutido, distribuição
  interna do EAS), **não** um "development build": este precisa do computador rodando o servidor de desenvolvimento na
  mesma rede e testaria outra coisa (INFERÊNCIA, pela forma como o `expo-dev-client` funciona).

**Consequência que o plano não mostra:** instalar antes de 30/09 **não resolve as correções**. Cada build novo depois
de 30/09 é uma atualização, e atualização de app não registrado exige `adb` ou fluxo avançado (FATO [F4]). Então o
fundador deve **deixar o `adb` (ou o fluxo avançado) pronto de qualquer jeito**, mesmo que teste antes do dia 30.

**Conta de distribuição limitada para isso? Não recomendo.** Resolve 20 aparelhos sem documento, mas: (a) o público
declarado é estudante/hobbista "sem intenção comercial" e este é um app para ~3.000 pessoas de uma igreja (HIPÓTESE:
não fere uma regra escrita, mas usa a conta para o que ela não é); (b) registra o nome do pacote numa conta pessoal
do fundador, e depois esse nome precisa ir para a conta da entidade (migração limitada → completa existe, FATO [F4],
mas transferência de nome de pacote entre contas **não está documentada**); (c) `adb` e fluxo avançado já cobrem
o aparelho do fundador de graça. Se mesmo assim for usada, **usar um nome de pacote separado** (ex.: sufixo `.preview`)
para nunca prender o nome definitivo numa conta errada.

### (2) Como os 20–50 líderes recebem o app

**Teste interno do Google Play**, numa conta Play Console verificada (teste interno "sem requisitos": FATO [F13];
limite de até 100 testadores: não relido hoje, reverificar). Cada líder aceita o convite por link com a
conta Google e instala pela Play Store, com atualização automática. Teste fechado não é necessário para uma conta de
Organização e acrescenta análise do Google a cada versão (INFERÊNCIA).

**APK por link, não.** Depois de 30/09 cada líder teria de ativar Opções do desenvolvedor e esperar 24 h, e cada
atualização exigiria o fluxo ligado (FATO [F4], [F7]). Mesmo antes de 30/09, APK solto não se atualiza sozinho.

**O gargalo é a conta.** Sem Play Console verificada não há teste interno. Pelo plano, a conta da Organização sai por
volta de 02–26/10 (INFERÊNCIA do próprio plano, §0/1.2). Até lá, líderes não conseguem instalar nada de forma
aceitável — o beta de D16 depende de D5, e isso tem de estar escrito.

### (3) O que o fundador precisa fazer agora

1. **Esta semana:** testar no próprio Android antes de 30/09 (plano atual) **e** deixar o `adb` preparado no Windows
   para as correções depois do dia 30. Opcional: ligar o fluxo avançado já (as 24 h correm enquanto isso).
2. **Não criar conta de distribuição limitada** com o nome de pacote definitivo.
3. **Decidir (Product Brain + fundador) entre duas rotas para a conta Play** — ver §5.
4. Com a conta criada: criar o app no Play Console (isso registra o pacote, FATO [F9]), conferir o "status de registro"
   (item 7 da tabela do plano) e subir o primeiro build no teste interno.

**Dá para verificar como pessoa física agora e virar Organização depois? Sim** (FATO [F12]): o Play Console aceita
mudar de pessoal para Organização criando e verificando um perfil de pagamentos de organização (com D-U-N-S). Custos e
cuidados na §5.

---

## 4. Onde o `PLANO_DE_LANCAMENTO.md` está errado ou incompleto

| Onde | O que diz | Correção |
|---|---|---|
| §0 item 8 (linhas 39–41) | Teste Android "precisa acontecer antes de 30/09, ou depois dele só pelos caminhos técnicos de exceção" | Exagera. `adb` é o caminho **oficial** para desenvolvedor testar no próprio aparelho, sem espera (FATO [F4]). E testar antes do dia 30 **não cobre as correções**: todo build novo depois do dia 30 também precisa de `adb` ou fluxo avançado. |
| §1.3 (linhas 100–104) | "build de desenvolvimento … se instala por arquivo" | O build certo para o roteiro é **preview** (APK independente), não development build; e ainda faltam `eas.json` e `android.package`. |
| §1.3 (linha 104) | caminhos técnicos "piores para um teste com líderes (EVIDÊNCIA [G4]; reverificar)" | Reverificado: para líderes, APK depois de 30/09 é **inviável**, não só "pior" (24 h + Opções do desenvolvedor por aparelho, FATO [F4][F7]). Líderes só pelo Play. |
| D5 (linha 58) | Conta Play libera "instalação em Android após 30/09" e "teste fechado" | Para o beta, o caminho é **teste interno** (até 100, sem requisito). E a instalação do fundador depois de 30/09 **não depende** de D5 (adb). |
| D16 (linha 69) | Beta com "teste fechado do Play" | Trocar por **teste interno**, e registrar que D16 **depende de D5** (conta verificada). Sem D5, não há beta Android. |
| Linha 312 ("Não confirmado") | Comportamento do bloqueio para builds de desenvolvimento | Agora confirmado: ADB isento; APK por arquivo só com pacote registrado ou fluxo avançado (FATO [F4]). |
| [G4] | Fonte secundária para o bloqueio de APK | Substituir por fontes oficiais [F1], [F4]. |

O resto (data 30/09 no Brasil, Play Console registrando apps automaticamente, conferir o status de registro) está certo.

---

## 5. Decisão para o Product Brain: conta Play pessoal agora ou só Organização

**PROBLEMA.** O beta dos líderes no Android depende de uma conta Play Console verificada. A conta de Organização
depende de CNPJ + D-U-N-S e, pelo próprio plano, só sai entre 02 e ~26/10.

**EVIDÊNCIA.** Teste interno não tem requisito em conta pessoal (FATO [F13]); pessoal → Organização é permitido
(FATO [F12]); a regra dos 12 testadores por 14 dias vale só para produção em conta pessoal (FATO [F13]).

**IMPACTO.** Cada semana sem conta é uma semana a menos de beta numa campanha que já começou em 23/09.

**ALTERNATIVAS.**

- **A. Só Organização (plano atual).** Mais simples e correto desde o início; beta Android só depois de ~02–26/10.
- **B. Conta pessoal do fundador agora (US$ 25, documento de identidade), teste interno já, conversão para
  Organização antes de produção.** Beta semanas antes. Custos: o nome e dados do fundador aparecem como desenvolvedor
  enquanto for pessoal (INFERÊNCIA; confirmar no Console); a conta fica no Google do fundador e precisa depois de
  transferência de titularidade para a entidade [F14]; se a conversão atrasar e for preciso publicar como pessoal,
  entra a regra dos 12 testadores/14 dias; o prazo de verificação de identidade não é publicado (INFERÊNCIA: dias).
- **C. Criar uma conta nova de Organização depois e transferir o app** (transferência entre contas existe [F15]).
  Mais trabalho que B, sem vantagem clara.

**RECOMENDAÇÃO.** Se o CNPJ **já tem** D-U-N-S, fazer **A**. Se precisar pedir o D-U-N-S, fazer **B** com a conta
em um Google criado para o projeto (não o pessoal do dia a dia), já planejando a conversão. Não contradiz
`MOBILE_STORE_REQUIREMENTS.md` item 5 (publicar como Organização): a publicação continua como Organização; só o teste
começa antes. A exigência de pessoa jurídica da Apple (5.1.1(ix)) não muda em nada com isso.

---

## 6. Fontes (acessadas em 2026-09-21)

- [F1] Android Developers — Android developer verification: https://developer.android.com/developer-verification
- [F2] Android Developers — Register on Google Play Console: https://developer.android.com/developer-verification/guides/google-play-console
- [F3] Android Developers Blog (03/2026) — Rolling out to all developers on Play Console and Android Developer Console: https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html
- [F4] Android Developers — FAQ (ADB, 24 h, conta limitada, Android 7+, atualização de app não registrado): https://developer.android.com/developer-verification/guides/faq?hl=en
- [F5] Android Developers — Register for limited distribution: https://developer.android.com/developer-verification/guides/limited-distribution
- [F6] The Hacker News (06/2026, secundária) — Google Sets Sept. 30 Deadline…: https://thehackernews.com/2026/06/google-sets-sept-30-deadline-for.html
- [F7] 9to5Google (19/03/2026, secundária, com capturas) — advanced flow com espera de um dia: https://9to5google.com/2026/03/19/android-advanced-flow-sideloading/
- [F8] 9to5Google (18/08/2026, secundária) — fluxo avançado em liberação gradual; "ADB installs are not affected": https://9to5google.com/2026/08/18/google-gradually-rolling-out-androids-advanced-sideloading-ahead-of-developer-verification/
- [F9] Play Console Help — Registering Play package names: https://support.google.com/googleplay/android-developer/answer/16984799?hl=en
- [F10] Play Console Help — Registering Android package names: https://support.google.com/googleplay/android-developer/answer/16761053?hl=en
- [F11] Android Developers — Register on Android Developer Console: https://developer.android.com/developer-verification/guides/android-developer-console
- [F12] Play Console Help — Keeping your developer account information up to date (pessoal → Organização): https://support.google.com/googleplay/android-developer/answer/13634888?hl=en
- [F13] Play Console Help — App testing requirements for new personal developer accounts: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- [F14] Play Console Help — Transferring ownership of a Play Console developer account: https://support.google.com/googleplay/android-developer/answer/16909862?hl=en
- [F15] Play Console Help — Transfer apps to a different developer account: https://support.google.com/googleplay/android-developer/answer/6230247?hl=en

**Não confirmado:** limite de 100 testadores do teste interno não foi relido hoje numa página oficial (conhecido da
documentação do Play; reverificar); se nomes de pacote registrados numa conta limitada podem ser transferidos para
outra conta; prazo de verificação de identidade da conta pessoal; se a chave de upload do EAS precisa ser registrada à
parte para APKs fora do Play (a do Play App Signing é tratada pelo Console).
