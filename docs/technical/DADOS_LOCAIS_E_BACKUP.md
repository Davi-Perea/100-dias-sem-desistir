# O que o app guarda, onde, e o que o sistema faz com isso

Escrito em 23/09/2026, depois da auditoria externa que perguntou se a frase
"ficam guardados só neste aparelho" é defensável na implementação.

Resposta curta: **é**, e agora está travada por teste nos dois sistemas.

## 1. O que é guardado

Tudo abaixo é **dado pessoal sensível** pela LGPD (art. 5º, II — convicção religiosa),
e por isso nasceu local.

| O que | Onde no código | Chave |
|---|---|---|
| Reflexões escritas | `src/reflections/reflectionsStore.ts` | `reflections:<campanha>` |
| Jejum | `src/fasting/fastingStore.ts` | `fasting:<campanha>` |
| Marcações e notas de versículo | `src/marks/marksStore.ts` | `marks:<campanha>` |
| Progresso de leitura (dias concluídos) | `src/journey/completionsStore.ts` | `completions:<campanha>` |
| Preferências, nome, metas, lembrete | `src/settings/settingsStore.ts` | `settings:v2` |

## 2. Onde fica

Tudo no **AsyncStorage** (`@react-native-async-storage/async-storage` 2.2.0).
Nenhum destes dados usa SecureStore, SQLite, sistema de arquivos ou rede —
conferido por varredura em `src/reflections`, `src/fasting`, `src/marks` e
`src/settings` em 23/09/2026.

## 3. O app transmite algo disso?

Não. Não existe chamada de rede que envie qualquer um desses valores.

- Na V1 a nuvem não liga em build de release (as variáveis não entram no build).
- Não há analytics no app. Não há push remoto. Os lembretes são notificações
  locais, agendadas pelo próprio aparelho.
- A Comunidade ("Juntos"), quando existir, envia **só** o que a pessoa escrever
  para publicar. Reflexão privada nunca vira publicação — é regra de produto
  (REGRAS 14) e a tela de publicar começa sempre em branco.

## 4. E o backup do sistema operacional?

Esta é a parte que a auditoria levantou, e é onde o app tinha metade da defesa.

### Android — barrado, e já estava

`android.allowBackup: false` em `mobile/app.config.ts`. Sem isso, o padrão do
Android e do Expo é `true` e o AsyncStorage iria para o backup do Google Drive.

Ressalva registrada (INFERÊNCIA, documentação do Android): a partir do Android 12
isso não desliga a transferência aparelho-a-aparelho que a própria pessoa faz ao
trocar de celular. Isso é cópia da pessoa para a pessoa, não envio para terceiro.

### iOS — barrado, e agora por escrito

`ios.infoPlist.RCTAsyncStorageExcludeFromBackup: true` em `mobile/app.config.ts`.

FATO (lido em `node_modules/@react-native-async-storage/async-storage/ios/RNCAsyncStorage.mm`,
linhas 518–527, versão 2.2.0, em 23/09/2026): **sem** essa chave a biblioteca já
exclui o diretório do backup — quando a chave não existe no Info.plist, ela
assume `YES` e aplica `NSURLIsExcludedFromBackupKey` no diretório
`RCTAsyncLocalStorage_V1`.

Ou seja: o comportamento já era o correto. A chave foi acrescentada porque a
promessa de uma tela do app não pode depender do padrão de uma biblioteca de
terceiro, que pode mudar numa atualização sem ninguém notar.

Os dois valores estão travados em `src/__tests__/nuvem-correcoes.test.ts`.

### Consequência para a pessoa

Trocar de celular **não** leva junto reflexões, jejum, marcações e progresso.
Isso é perda de conveniência aceita de propósito: o dado é sensível, e o app não
tem conta para restaurá-lo. Se um dia isso mudar, muda também o texto da tela.

## 5. O que a tela Privacidade pode prometer

Pode dizer, como diz hoje:

> Seu progresso, suas reflexões, seu jejum e suas preferências ficam guardados só
> neste aparelho.

E, sem nuvem configurada:

> Nesta versão o app não envia seus dados a ninguém. Não há conta, anúncio nem
> rastreamento. Os lembretes são avisos do próprio aparelho.

Ambas são defensáveis na implementação, nesta data, nesta versão das dependências.
