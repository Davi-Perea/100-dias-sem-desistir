# Ver o app no celular hoje com o Expo Go (sem build)

Verificado em 2026-09-21. Serve para **olhar e tocar** no app. Não serve para aprovar o app para as lojas.

## Veredito

**Deve funcionar.** Tudo o que o app usa já vem dentro do Expo Go, e na versão certa. Ele abre em modo de
desenvolvimento, com o aviso "aguardando autorização" (o comportamento esperado enquanto a igreja não autoriza).
O portão de produção **não** atrapalha: ele só age em build de release.

## 1. Existe Expo Go para o SDK 57 nas lojas?

- **iPhone (App Store):** a página do Expo Go mostra a versão **57.0.9**, que é a linha do SDK 57 (React Native 0.86).
  FATO, https://apps.apple.com/us/app/expo-go/id982107779 (acesso em 2026-09-21). A data de publicação que a
  página mostrou não bateu com o ano. Por isso, depois de instalar, confira a versão em *Expo Go → Settings*.
  Contexto: no lançamento do SDK 57 (30/06/2026) essa versão ainda aguardava aprovação da Apple.
  FATO, https://expo.dev/changelog/sdk-57 (acesso em 2026-09-21).
- **Android (Google Play):** a página oficial "Expo Go para SDK 57, Android, aparelho físico" manda instalar pela
  Google Play. EVIDÊNCIA, https://expo.dev/go?device=true&platform=android&sdkVersion=57 (acesso em 2026-09-21).
  Não consegui ler a versão na própria página da Play Store.
- **Isso tem prazo.** O SDK 58 entrou em beta em 15/09/2026. As lojas vão trocar o Expo Go para o SDK 58
  "logo depois" da versão estável, e aí o Expo Go da loja **deixa de abrir projetos SDK 57**.
  FATO, https://expo.dev/changelog/sdk-58-beta (acesso em 2026-09-21). INFERÊNCIA: isso deve acontecer em
  poucas semanas. Depois disso, ver o app no celular exige build de desenvolvimento (EAS).

## 2. As dependências cabem no Expo Go?

Comparei `mobile/package.json` com `mobile/node_modules/expo/bundledNativeModules.json`, que é a lista do que o
Expo Go traz. Todos os módulos nativos batem com a versão esperada: expo-*, reanimated 4.5.1, worklets 0.10.1,
gesture-handler, screens, safe-area, svg 15.15.4, async-storage 2.2.0 e react-native 0.86.3.
`expo-keep-awake` 57.0.2 contra ~57.0.1 é só diferença de correção (patch) e é compatível.
Os pacotes fora da lista não têm parte nativa, então rodam em qualquer lugar: supabase-js, aes-js e as fontes Google.
**Nenhum bloqueio.**

## 3. O que muda no Expo Go (comparado com o app de verdade)

| Item | No Expo Go |
|---|---|
| Lembretes (expo-notifications) | Notificações **locais** funcionam nos dois sistemas (FATO, https://docs.expo.dev/versions/latest/sdk/notifications/, acesso em 2026-09-21). Aparecem com o nome e o ícone do Expo Go. O push remoto no Android não existe no Expo Go desde o SDK 53, mas o app não usa push. Ao abrir, aparece um aviso amarelo "not fully supported in Expo Go": pode ignorar. |
| Permissão de notificação | Quem pede é o Expo Go. O teste "o diálogo aparece uma vez só no iPhone" **não vale** aqui. |
| expo-secure-store (sessão) | Funciona. Hoje, porém, não há `.env.local`, então a nuvem está desligada e a aba Juntos diz que a conta está indisponível. É o esperado. |
| Fontes | São arquivos do próprio projeto, carregados na abertura. Funcionam. |
| Blur (barra de abas e barra do leitor) | Igual à build de desenvolvimento. No Android o efeito é de translucidez, não de desfoque real. |
| React Compiler e rotas tipadas | Agem só no código e nos tipos durante o desenvolvimento. Nada muda. |
| Nome, ícone, splash, esquema de link (`bibliaapp-dev://`, `bibliaapp-preview://`, `bibliaapp://`) | São ignorados. O Expo Go usa os dele. |

## 4. Não dá para testar no Expo Go

- ícone, nome e tela de abertura reais;
- deep links com o esquema do app;
- comportamento de app instalado: permissão de notificação "de verdade" e horário exato dos lembretes com o app fechado;
- o portão de produção (build de release) e o desempenho real, porque o modo de desenvolvimento é mais lento;
- login na nuvem, até existir `.env.local` com o Supabase;
- nada disso vale como aprovação para a App Store ou a Google Play.

## 5. Passo a passo no Windows

1. No celular, instale **Expo Go** (App Store ou Google Play).
2. O PC e o celular precisam estar **na mesma rede Wi-Fi**.
3. No PC, abra o terminal na pasta `mobile` e rode:
   ```
   npx expo start
   ```
   Não use `--no-dev`. Esse modo imita a build de release e o portão de produção fecha o app de propósito.
4. Aparece um QR code. **Android:** abra o Expo Go e toque em "Scan QR code". **iPhone:** aponte a câmera e toque no aviso.
5. **Firewall:** na primeira vez o Windows pergunta se o Node.js pode usar a rede. Marque **Redes privadas** e permita.
   Confira também se o Wi-Fi do PC está como rede **Privada** (Configurações → Rede e Internet → Wi-Fi → a rede → Privada).
   Numa rede Pública o celular não enxerga o PC, que usa a porta 8081.
6. **Se o celular não conectar** (rede de visitante, Wi-Fi da igreja ou da empresa, roteador que isola os aparelhos):
   ```
   npx expo start --tunnel
   ```
   O túnel passa pela internet, não pela rede local. É mais lento, e na primeira vez o Expo pede para instalar um
   pacote de túnel (`@expo/ngrok`), o que você precisa autorizar.
7. Se aparecer tela vermelha ou algo "velho", pare (Ctrl+C) e rode `npx expo start -c` para limpar o cache.
8. Com o app aberto, sacudir o celular abre o menu de desenvolvimento (recarregar e outras opções).
