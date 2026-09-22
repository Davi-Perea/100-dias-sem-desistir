# Comunidade ("Juntos") — teste de carga

**Pergunta do fundador (2026-09-22, prévia do Dia 23):** *"se muita gente publicar, dá problema?"*

**Resposta curta:** não. Com o tamanho real do primeiro ambiente — 3.000 pessoas e 1.000 publicações
num único dia — todas as consultas do app são cobertas por índice e a escrita (publicar, dar Amém) fica
em milissegundos. **Mas o teste encontrou duas coisas**, e as duas foram tratadas ou estão registradas:

1. **Corrigido agora:** a tela do feed gastava ~40% do tempo dela varrendo a tabela de membros inteira,
   60 vezes por página. `migrations/20260923070000_comunidade_aceite_no_ato.sql` reescreve três funções
   (`amen_count_for`, `amen_faces_for`, `comment_count_for`) e isso sai. Sem índice novo, sem mudança de
   comportamento — os pgTAP 15 e 16 continuam iguais e passando.
2. **Não corrigido, registrado:** o que quebra primeiro não é "muita gente publicar", é **um post que
   viraliza** e o **egress de fotos**. Ver §5 e §6. As duas coisas exigem decisão de produto, não conserto
   de SQL — por isso estão como recomendação, não como código.

---

## 1. Como foi medido

Script: `mobile/scripts/sql/carga-comunidade.mjs`

```
cd mobile
npm i --no-save @electric-sql/pglite     # ou PGLITE_DIR=<node_modules com ele>
node scripts/sql/carga-comunidade.mjs --log carga.md
node scripts/sql/carga-comunidade.mjs --comparar candidato.sql   # antes/depois de um índice ou reescrita
```

O script aplica **todas as migrations de verdade** num Postgres local, semeia o cenário, mede cada função
que o app chama e roda `EXPLAIN (ANALYZE)` no **corpo real** de cada função do feed — lido de `pg_proc`,
não numa consulta parecida escrita à mão (é assim que se erra um teste de carga).

Cenário semeado:

| | |
| --- | --- |
| pessoas na comunidade | 3.000 (com nome, 16+, consentimento e regras aceitos) |
| publicações no dia | 1.000, espalhadas pelas últimas 24 h |
| Améns | 30.000 (10 por pessoa) |
| comentários | 6.000 (concentrados no terço mais recente dos posts) |
| bloqueios | 600 (`blocked_between` entra em toda leitura) |

### Ressalva que não deve ser omitida

`[FATO]` A medição roda em **PGlite 0.5.8 = PostgreSQL 18 compilado para WebAssembly**, em um processo
Node, sem disco de verdade e sem concorrência. O projeto hospedado é Postgres 17 no Supabase.

Consequência, dita sem rodeios:

- **os PLANOS de consulta valem** (índice x varredura, junção escolhida, número de buscas): é o mesmo
  planejador, com as mesmas estatísticas;
- **os TEMPOS ABSOLUTOS NÃO valem.** Servem para comparar consulta com consulta e antes com depois, no
  mesmo processo. Entre processos, a mesma consulta com o mesmo plano mediu 34 ms e 62 ms. Em Postgres
  nativo com dados em cache, cada número abaixo deve cair uma ordem de grandeza.
- A latência de verdade só sai medindo no projeto hospedado, depois do primeiro
  `supabase db reset && supabase test db` — que continua pendente (esta máquina não tem Docker nem o CLI).

---

## 2. Tempos medidos (3.000 pessoas · 1.000 posts no dia)

Mediana de 25 execuções.

| ação do app | função | mediana | p95 | pior |
| --- | --- | --- | --- | --- |
| abrir o feed (1ª página, 20 posts) | `community_feed()` | 35,0 ms | 45,3 ms | 59,8 ms |
| rolar (2ª página, com cursor) | `community_feed(cursor)` | 33,5 ms | 35,9 ms | 36,2 ms |
| — só as contagens e rostinhos dessa página | `amen_count_for` + `comment_count_for` + `amen_faces_for` × 20 | 33,7 ms | 41,2 ms | 42,6 ms |
| abrir a conversa de um post | `community_post_comments()` | 2,0 ms | 3,6 ms | 3,9 ms |
| número de Amém dos comentários | `community_comment_amens()` | 2,1 ms | 4,7 ms | 5,3 ms |
| **publicar** | `create_community_post()` | 3,4 ms | 8,0 ms | 8,0 ms |
| **dar Amém** | `set_amen(true)` | 2,5 ms | 6,8 ms | 6,8 ms |
| retirar o Amém | `set_amen(false)` | 0,7 ms | 1,5 ms | 1,5 ms |
| estado da pessoa (abre a aba) | `my_community_status()` | 3,7 ms | 7,8 ms | 8,3 ms |
| minhas publicações | `my_community_posts()` | 3,2 ms | 5,9 ms | 6,0 ms |
| sino / atividade | `my_community_activity()` | 6,3 ms | 9,3 ms | 10,5 ms |
| **paginação: 5 páginas seguidas, 100 publicações** | | **160,8 ms no total** | | |

Leitura disto:

- **Publicar e dar Amém são baratos** (2–4 ms) e não dependem de quantas pessoas ou posts existem: a
  escrita é um `insert` mais a checagem de limite diário, que tem índice
  (`community_posts_author_idx`). "Muita gente publicando ao mesmo tempo" é o caso FÁCIL.
- **O custo do app está em LER o feed**, e dentro dele quase tudo (33,7 dos 35,0 ms) são as contagens e
  os rostinhos: `amen_count_for`, `comment_count_for` e `amen_faces_for` rodam **uma vez por post**, 20
  posts por página. Foi aí que o teste achou o desperdício (§4).

---

## 3. Índices: o que o `EXPLAIN (ANALYZE)` diz

Depois da correção da §4, **nenhuma** consulta do feed varre tabela grande:

| consulta (corpo real da função) | veredicto | índice |
| --- | --- | --- |
| escolher os 20 posts da página | coberta | `community_posts_feed_idx` (parcial, `status = 'published'`) + PK de perfis |
| `amen_count_for` | coberta | `community_amens_post_idx` + `community_profiles_pkey` |
| `amen_faces_for` | coberta | idem |
| `comment_count_for` | coberta | `community_comments_post_idx` + `community_profiles_pkey` |
| `post_photo_paths` | coberta | PK de `community_post_photos` |
| `blocked_between` (nos dois sentidos) | coberta | PK (`blocker_id`, `blocked_id`) + `community_blocks_blocked_idx` |
| limite diário de publicações | coberta (Index **Only** Scan) | `community_posts_author_idx` |

**Nenhum índice novo foi criado.** Os que existem desde `20260921130000` e `20260922180000` bastam.
Dois candidatos foram medidos e **descartados** por não pagarem o custo de escrita que cobram:

- `community_amens (post_id, created_at desc)` — os rostinhos escolhem 3 de ~30 linhas; o `sort` já é
  irrelevante, e a ordenação final acontece **depois** da busca do perfil, então o índice não a fornece.
- `community_comments (post_id, created_at) where status = 'published'` — `community_comments_post_idx`
  já cobre; o ganho medido ficou dentro do ruído.
- `community_profiles (user_id) where status = 'active'` — **não mudou o plano em nada** (o planejador
  seguiu escolhendo a varredura). Foi o que mostrou que o problema não era falta de índice.

---

## 4. O que foi corrigido: 60 varreduras da tabela de membros por página

`[EVIDÊNCIA — EXPLAIN (ANALYZE) no arquivo de saída do script]`

`amen_count_for` e `amen_faces_for` juntavam `community_amens` com `community_profiles`
(`join ... on ap.user_id = am.user_id and ap.status = 'active'`). Com 3.000 membros, a tabela de perfis
tem 43 páginas — **pequena o bastante para o planejador preferir Hash Join, varrendo os 3.000 perfis
inteiros a cada chamada**. E a chamada é por post: 20 posts × 3 funções = **até 60 varreduras completas
da tabela de membros para desenhar UMA página do feed**.

A correção não é índice: a PK de `community_profiles` já é a certa. É **tirar do planejador a opção de
varrer**, consultando o perfil por **subconsulta escalar** (uma busca pela PK por linha de Amém). Medido
no mesmo processo, antes/depois:

| medida | antes | depois | |
| --- | --- | --- | --- |
| feed, 1ª página | 55,7 ms | 34,1 ms | **-39%** |
| feed, 2ª página | 55,2 ms | 33,1 ms | **-40%** |
| contagens e rostinhos da página | 52,7 ms | 31,9 ms | **-39%** |
| paginação, 5 páginas | 284,6 ms | 169,6 ms | **-40%** |

`comment_count_for` tinha o mesmo defeito, mas ele só aparece no post que viraliza: com 18 comentários o
planejador usa o índice; com 518, volta a varrer os perfis. Mesma correção.

**Detalhe honesto:** com **30.000** membros o planejador escolhe o índice **sozinho** (a varredura fica
cara) e as duas versões empatam. Isto **não era um precipício de escala** — era desperdício exatamente no
tamanho que a igreja tem hoje. A reescrita também deixa o plano **estável**: não depende mais de quantos
membros existem nem do humor do planejador.

**Semântica inalterada**, e é o que os pgTAP provam sem uma linha de mudança neles: só Amém de perfil
ativo conta, bloqueio vale nos dois sentidos, o rostinho traz nome + foto **aprovada** (a minha sempre),
no máximo 3, o meu primeiro, e quem não escolheu nome conta no número mas não tem rosto.

---

## 5. O que quebra primeiro (no banco): UM post que viraliza

Não é 1.000 posts num dia. É um post só com o Amém da igreja inteira.

Medido no mesmo cenário, depois de dar a um post o Amém de **todas as 3.000 pessoas** e **518 comentários**:

| | mediana | p95 |
| --- | --- | --- |
| contar Amém + comentários + rostinhos **desse** post | 157,1 ms | 217,6 ms |
| a página do feed **com ele dentro** | 226,3 ms | 252,5 ms |
| abrir a conversa dele (518 comentários, **sem paginação**) | 30,5 ms | 50,8 ms |

Comparar com os 35 ms da página normal: **um único post viral multiplica por ~6 o custo de TODA a página
do feed**, para **todo mundo que rolar até ele**.

**PROBLEMA** — a contagem de Amém é recalculada a cada leitura, linha por linha. O `EXPLAIN` mostra, para
esse post: 2.999 buscas na PK de perfis (8.997 páginas lidas) + 2.999 chamadas de `blocked_between`
(~12.600 páginas) = 21.656 páginas para produzir **um número**.

**EVIDÊNCIA** — plano no arquivo de saída do script, seção "contagem de Amém de um post".

**IMPACTO** — cresce com (Améns no post) × (pessoas que abrem o feed). Com 3.000 pessoas abrindo o feed e
um post viral, é o mesmo trabalho repetido 3.000 vezes por dia. No Postgres nativo com tudo em cache isso
são milissegundos, não segundos — mas é a única curva do sistema que multiplica dois números grandes.

**ALTERNATIVAS**

1. **Contar até um teto.** A tela já mostra no máximo 3 rostos + um número. Parar de contar em, digamos,
   500 e exibir "500+" limita o custo a 500 linhas, para sempre. Uma linha de SQL (`limit` dentro do
   `count`). Custo: o número deixa de ser exato nos posts grandes.
2. **Hoistar o bloqueio.** `blocked_between` é chamada por linha (dois índices por chamada). Buscar a
   lista de bloqueios do leitor **uma vez** por consulta e comparar com um conjunto corta mais da metade
   das páginas lidas. Custo: a invariante de segurança fica menos óbvia de auditar — hoje o teste
   estático `comunidade-sql.test.ts` confere literalmente `not private.blocked_between(viewer, …)` em
   cada função.
3. **Guardar a contagem numa coluna** (gatilho ou `pg_cron`). É o mais rápido de ler e o que vai contra a
   invariante atual — `comunidade-sql.test.ts` exige que **nenhuma tabela guarde contagem**, justamente
   para o número nunca divergir do bloqueio de quem está lendo. Uma contagem materializada não sabe quem
   é o leitor.
4. **Não fazer nada agora.** Com o volume da prévia (dezenas de Améns por post) não aparece.

**RECOMENDAÇÃO** — (1) agora, se e quando um post passar de algumas centenas de Améns, e (2) junto, se a
medição no Supabase real mostrar necessidade. (3) **não**: quebra a garantia de que a contagem respeita o
bloqueio de quem lê, que é uma decisão de privacidade já tomada. Nada disso bloqueia o Dia 23.

**Achado junto:** `community_post_comments()` **não tem paginação** — devolve todos os comentários
publicados do post de uma vez (518 linhas no teste). Funciona, mas a tela vai receber um pacote grande e
crescer sem limite. Registrado em "pedidos" para a pessoa do feed.

---

## 6. Limites do plano Supabase, e quantas fotos cabem

`[FATO — docs/research/BACKEND_RESEARCH.md, verificado em 2026-09-07; políticas e preços de plataforma
mudam: REVERIFICAR antes de publicar]`

| | Free | **Pro (US$ 25/mês)** |
| --- | --- | --- |
| Banco (disco) | **500 MB** | **8 GB** (+US$ 0,125/GB) |
| Storage (fotos) | **1 GB** | **100 GB** (+US$ 0,0213/GB) |
| Egress (saída) | — | **250 GB/mês** (+US$ 0,09/GB) |
| MAU | 50 k | 100 k |
| Backups | não tem | diários, 7 dias |
| Inatividade | **pausa o projeto após 1 semana** | não pausa |

ADR-002 já decidiu **Pro em `sa-east-1`**. O Free não serve nem por espaço nem por pausar sozinho.

### Banco: medido, não estimado

Tamanhos reais das tabelas depois de **um dia** deste tamanho (com índices):

| tabela | espaço | bytes por linha |
| --- | --- | --- |
| `community_activity` (o sino) | 8.816 kB | ~245 |
| `community_amens` | 4.376 kB | 149 |
| `community_comments` | 1.904 kB | 325 |
| `community_profiles` | 536 kB | 183 (uma vez só, não por dia) |
| `community_posts` | 400 kB | 410 |
| `community_blocks` | 216 kB | 369 |

**≈ 15,5 MB por dia** neste ritmo (1.000 posts, 30.000 Améns, 6.000 comentários por dia — um ritmo
pesado: uma publicação para cada 3 pessoas e 10 Améns por pessoa, **todos os dias**).

- **100 dias de campanha ≈ 1,55 GB** → **19% dos 8 GB do Pro.** Sobra folga para umas cinco campanhas.
- No **Free**, os 500 MB acabariam por volta do **dia 32**.
- A maior tabela é a do **sino** (`community_activity`), não a de posts: ela guarda uma linha por Amém e
  por comentário recebido. É a primeira candidata a uma limpeza por `pg_cron` (apagar atividade vista com
  mais de X dias) se o disco apertar.

**O banco não é o gargalo.**

### Fotos: quantas por dia cabem

`[FATO — código]` Toda foto é preparada no aparelho: no máximo **1600 px** no lado maior, JPEG
**qualidade 0,8**, e o servidor recusa acima de **1,5 MB** (`PHOTO_MAX_BYTES`, e o bucket
`community-photos` tem o mesmo teto). Até **4 fotos por post**, no máximo **10 posts por pessoa por dia**.
`[INFERÊNCIA]` uma foto de celular a 1600 px / q0,8 sai tipicamente em **300–500 KB**; usei **400 KB** nas
contas abaixo, e o teto de 1,5 MB no pior caso.

**Disco (Storage), Pro 100 GB, para os 100 dias:**

| a 400 KB por foto | no teto de 1,5 MB |
| --- | --- |
| ~260.000 fotos ≈ **2.600 por dia** | ~68.000 fotos ≈ **680 por dia** |

O teto *teórico* do produto é muito maior que isso: 3.000 pessoas × 10 posts × 4 fotos = **120.000 fotos
por dia**, que a 400 KB seriam **48 GB por dia** — o disco do Pro iria em dois dias. Ninguém faz isso, mas
é bom saber que **nada no servidor impede**: o limite diário é de *posts*, não de *fotos* nem de *bytes*.

**Egress é o que acaba antes do disco.** `[INFERÊNCIA]` As fotos são servidas por **URL assinada com
1 hora de validade** (`SIGNED_URL_TTL_SECONDS = 3600`): cada assinatura é uma URL diferente, então o cache
de borda ajuda pouco — na prática cada pessoa baixa cada foto que vê.

| cenário de leitura | egress por mês | dentro dos 250 GB do Pro? |
| --- | --- | --- |
| 1.000 pessoas/dia, 1 abertura, 4 fotos por página | ~48 GB | sim, com folga |
| 3.000 pessoas/dia, 3 aberturas, 4 fotos por página | ~432 GB | **não** — ~US$ 16/mês a mais |

**RECOMENDAÇÃO sobre fotos** (nenhuma bloqueia o Dia 23):

1. Antes de abrir a foto para todo mundo, **medir o egress real** no painel do Supabase na primeira
   semana. É o número que decide, e ele só existe depois do lançamento.
2. **Não** usar a transformação de imagem do Supabase (é paga por imagem de origem e só no Pro): o
   redimensionamento no aparelho já resolve, e é o que o código faz.
3. Se o egress apertar, a saída barata é **cache no aparelho** (a foto já baixada não volta a ser
   baixada) antes de qualquer CDN nova.
4. Se as fotos virarem o centro do produto, `Cloudflare R2` tem **egress zero**
   `[FATO S81, BACKEND_RESEARCH.md]` — mas isso é troca de arquitetura, não de configuração.

---

## 7. O que quebra primeiro, em ordem

1. **Egress de fotos** (250 GB/mês no Pro), se a foto pegar e todo mundo abrir o feed várias vezes por
   dia. Custa dinheiro (US$ 0,09/GB), não indisponibilidade. §6.
2. **Um post que viraliza**: a contagem de Amém recalculada a cada leitura multiplica o custo da página do
   feed por ~6 para todo mundo. §5.
3. **A conversa sem paginação** de um post com centenas de comentários. §5.
4. **Disco do banco**, lá na frente: ~1,55 GB em 100 dias de ritmo pesado contra 8 GB. A maior tabela é a
   do sino, e ela é a primeira a poder ser limpa. §6.
5. **Nada mais.** Publicar, dar Amém, abrir o feed, paginar, abrir a conversa: milissegundos, com índice,
   e sem depender de quantas pessoas ou posts existem.

E o plano **Free** não entra nesta lista porque não entra no projeto: pausa sozinho depois de uma semana
sem uso e não tem backup.

---

## 8. Reproduzir

```
cd mobile
PGLITE_DIR=<caminho> node scripts/sql/carga-comunidade.mjs --log carga.md
```

Opções: `--pessoas`, `--posts`, `--amens`, `--comentarios`, `--bloqueios`, `--repeticoes`,
`--extra-sql <arquivo>` (aplica SQL depois de semear) e `--comparar <arquivo>` (mede, aplica o SQL, mede
de novo e imprime antes/depois **no mesmo processo** — a única comparação que vale, dado o ruído do
relógio em WebAssembly).

O script sai com código 1 se alguma consulta do feed voltar a varrer tabela grande: serve como guarda.
A guarda equivalente no Jest (sem precisar de banco) é `mobile/src/__tests__/carga.test.ts`.
