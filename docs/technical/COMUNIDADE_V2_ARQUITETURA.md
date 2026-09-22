# Comunidade (V2): arquitetura do servidor

- **Data:** 2026-09-21. **Autor:** Claude (Principal Mobile Engineer + Technical Architect).
- **Estado:** SQL e cliente escritos. SQL **executado num Postgres local** (PGlite, §12); ainda **NÃO EXECUTADO no
  Supabase real** (sem Docker/CLI nesta máquina). Nada disto vai
  para a V1. As telas só chamam o cliente com `COMMUNITY_ENABLED` ligado (`mobile/src/config/features.ts`), e ele
  continua `false`.
- **Decisões que valem aqui** (do fundador, 2026-09-21, no lugar da ratificação do Product Brain): a V1 vai para a loja
  sem Comunidade, e a Comunidade chega como atualização. Não há mensagem privada: "chegar na pessoa" é comentar no post
  dela e dar Amém. As recomendações de `docs/product/comunidade/00-DECISOES.md` foram adotadas: a igreja inteira entra
  com código, a conta é só para 18+, o login é por e-mail com código, a moderação é híbrida, o Amém não tem contador, o
  feed tem fim, e a exclusão de conta funciona no app e na web.
- **Arquivos:** `mobile/supabase/migrations/20260921130000_comunidade_tabelas.sql`, `…130100_comunidade_funcoes.sql` e
  `…130200_comunidade_storage.sql`. Os pgTAP estão em `mobile/supabase/tests/07` a `10_comunidade_*.test.sql`. O
  cliente está em `mobile/src/community/` (`api.ts`, `errors.ts`, `photos.ts`, `validation.ts` e `types.ts`). Os testes
  Jest são `src/__tests__/comunidade-{cliente,fotos,sql}.test.ts`.

## 1. Princípio

O app **nunca lê nem escreve as tabelas de conteúdo**. Toda a superfície é RPC, no mesmo padrão da fundação (D3/D5 em
`SEGURANCA_MIGRATIONS_CORRECOES.md`): a implementação fica em `private.*` como `SECURITY DEFINER`, com
`search_path = ''`. Em `public` fica só um invólucro `SECURITY INVOKER` com o mesmo nome. Toda função tem
`revoke … from public, anon`.

- O app **nunca recebe o `user_id` de outra pessoa**. Bloquear e denunciar partem do id do post ou do comentário.
- O app **nunca recebe contagem de Amém**. A única coisa que ele sabe é se a própria pessoa deu Amém.
- Quando o conteúdo não existe e quando ele existe mas não é visível para quem pergunta, a resposta é a mesma (`P0002`).
  Assim a RPC não serve de oráculo.

## 2. Modelo de dados

| Tabela | Para quê | O app acessa? |
|---|---|---|
| `private.community_settings` | Versão e hash dos textos de consentimento e das regras, dia 1 da campanha, janela do feed, limites e prazos | Não |
| `private.invite_codes` | Códigos de entrada, **só o hash**, com rótulo (líder ou ministério), validade, limite de usos e revogação | Não |
| `private.invite_code_attempts` | Tentativas de código (no máximo 5 por hora por pessoa) | Não |
| `private.community_filter_terms` | Lista de termos da igreja para o filtro automático | Não |
| `private.storage_deletion_queue` | Fotos a apagar do Storage (drenada pela Edge Function) | Não |
| `community_profiles` | Quem entrou com código, nome na comunidade, estado (ativo, suspenso ou removido), data da declaração de 18+ | Não (só via RPC) |
| `community_moderators` | Quem modera | Não |
| `consent_records` | Consentimento específico e aceite das regras, com versão, sha256 do texto e versão do app | **Lê as próprias linhas** |
| `community_posts` | Texto e/ou 1 foto, dia opcional (1–100, nunca futuro), estado e motivo da análise | Não |
| `community_comments` | Comentários, com a mesma máquina de estados | Não |
| `community_amens` | Um Amém por pessoa por post. **Sem contagem em lugar nenhum** | **Lê só as próprias linhas, sem `user_id`** |
| `community_blocks` | Uma linha por bloqueio, com efeito nos dois sentidos | Não |
| `community_reports` | Denúncia de post, de comentário ou de pessoa, com motivo, urgência e prazo | Não |
| `community_moderation_actions` | Tudo o que o filtro ou uma pessoa decidiu, com o motivo e a nota para o autor | Não |

## 3. RLS e privilégios

- Todas as tabelas de `public` estão com RLS ligada, e `anon` e `authenticated` tiveram **todos** os privilégios revogados.
- Existem só **duas policies**, ambas `for select to authenticated using (user_id = (select auth.uid()))`:
  - `community_amens`, com `grant select (post_id, created_at)`. Um
    `HEAD /community_amens?post_id=eq.X` com `Prefer: count=exact` devolve 0 ou 1, que é o Amém de quem pergunta. Nem o
    autor do post alcança o total.
  - `consent_records`, que funciona como recibo do que a pessoa aceitou.
- Nas outras tabelas a RLS está ligada **sem policy**, o que nega tudo. Se alguém conceder um GRANT por engano, a RLS
  continua segurando.
- Storage (`storage.objects`, bucket `community-photos`):
  - **upload** só com `private.can_publish()` e nome `<uuid>.jpg`.
  - **leitura e URL assinada** para o dono do arquivo, para quem pode ver o post publicado (sem bloqueio entre os dois)
    e para a moderação.
  - **apagar** só o dono, e só um arquivo solto, que não virou post.
  - **Sem UPDATE**: a foto não pode ser trocada depois de aprovada.

**Regra de visibilidade** (`private.can_view_post`): o post está `published`, o autor é membro **ativo**, quem vê é
membro ativo e **não há bloqueio em nenhum dos dois sentidos**. Feed, comentários, Amém, denúncia, bloqueio e URL da foto
passam por ela. Em análise, só o autor (em "Minhas publicações") e a moderação veem.

## 4. Entrada, idade e consentimento

1. A pessoa entra com a conta de e-mail (código por e-mail, já existente). Sessão anônima é recusada (`CM006`).
2. Depois vem `redeem_invite_code(código, nome, confirma_18)`. O código é normalizado para 10 caracteres sem 0/O/1/I,
   e o servidor compara o sha256. Código inválido, vencido, revogado ou esgotado dão a mesma resposta (`false`). O
   limite é de 5 tentativas por hora. Quem foi suspenso ou removido não volta com outro código (`CM004`).
3. A pessoa aceita as regras e dá o consentimento específico com `accept_community_terms(finalidade, versão, sha256)`. O
   servidor confere **a versão e o hash do texto exato que a tela mostrou**. Enquanto a versão configurada for
   `PENDENTE`, ninguém consegue aceitar e, portanto, **ninguém publica**. É o portão do texto aprovado por advogado.
4. Revogar o consentimento (`revoke_community_publish_consent`) **tira do ar e apaga** tudo o que a pessoa publicou
   (02-lei §6). Ela continua lendo.

## 5. Fluxo de publicação

```
[enviado]  → só no aparelho, entre o toque e a resposta
    ↓ create_community_post / create_community_comment
texto limpo ─────────────→ published (aparece na hora)
texto com link, e-mail,  ─→ in_review ── moderação ──→ published | not_published
telefone ou termo da lista
QUALQUER foto ───────────→ in_review ── pessoa aprova ─→ published | not_published (a foto é apagada)
published ── denúncia "criança exposta" ou "rosto de terceiro" ──→ in_review na hora (urgent_hide)
published ── moderação "remove" (com motivo) ──→ removed (a foto é apagada)
```

- O filtro automático (`private.community_text_verdict`) **nunca recusa sozinho**: ele só segura o texto para uma
  pessoa olhar. Hoje ele pega links, e-mails, telefones (8 dígitos ou mais) e a lista de termos da igreja. O ToxiBR
  entra numa Edge Function (ver §9).
- Toda ação vai para `community_moderation_actions` com `decided_by` = `pessoa` ou `automatico`, o motivo da lista
  fechada e a nota para o autor. É o que o ECA Digital (arts. 29–30) e o Tema 987 pedem.
- Limites por pessoa em 24 h: 10 posts, 60 comentários e 20 denúncias (`CM003`). São valores **PROPOSTOS**.
- Ninguém modera o próprio conteúdo, e ninguém suspende a si mesmo.
- **"Minhas publicações"** (`my_community_posts`) mostra todos os posts da pessoa, em qualquer estado, com o motivo e
  se quem decidiu foi pessoa ou filtro. **Nunca** mostra qual pessoa decidiu.

## 6. Fotos

- O bucket é **privado**, aceita só `image/jpeg` e tem limite de 1,5 MB. O nome do arquivo é `<uuid aleatório>.jpg`,
  sem `user_id`, porque o caminho aparece na URL.
- A leitura é só por **URL assinada de 1 h**, gerada em lote, uma chamada por página do feed (`signPhotoUrls`). Um
  caminho que o servidor recusa não volta.
- **No aparelho:** a foto é redimensionada para no máximo 1600 px e reencodada em JPEG 0,8 com
  `expo-image-manipulator`, que **ainda não está instalado** (ver pedidos). Depois disso,
  `assertPhotoSafeToUpload` **inspeciona os bytes e recusa** um JPEG que ainda tenha EXIF (onde fica o GPS), XMP ou
  IPTC. Continua **NÃO CONFIRMADO** que o reencode do iOS e do Android descarta o EXIF. Por isso a barreira existe, e é
  preciso um teste com uma foto real de câmera com GPS ligado antes de a tela prometer "sem localização".
- **No servidor:** a pessoa que modera olha toda foto antes de ela aparecer. Recusar ou remover **apaga a foto**, e a
  foto não é guardada para recurso (a retenção depende de decisão jurídica, `03-dados-e-seguranca.md` §2.4).

## 7. Fila de moderação

A página web interna usa o mesmo login do app e chama `community_moderation_queue` (tudo o que está em análise, mais o
que está publicado com denúncia aberta, com o urgente primeiro e depois o prazo), `community_open_reports`,
`moderate_community_post` e `moderate_community_comment` (approve, reject, remove e restore), `resolve_community_report` e
`suspend_community_author` (suspende, remove ou reativa quem escreveu, a partir do post, do comentário ou da denúncia: nem
a moderação recebe o user_id de outra pessoa; a fila traz só `author_known`/`reported_known`, e
`set_community_member_status`, que recebe user_id, não é executável pelo app). O admin gera e revoga códigos (`admin_create_invite_code`, que devolve o código em claro
**uma única vez**; `admin_revoke_invite_code`; `admin_list_invite_codes`, que mostra quantos membros vieram de cada
código para achar o que vazou) e nomeia moderadores (`admin_set_community_moderator`). Tudo isso vai para
`admin_audit_log`. O prazo é de 24 h para denúncia comum (o que a Apple cobra pela 1.2) e 4 h para urgente, ambos **PROPOSTA**, e fica em
`community_settings`. A promessa da tela C5 precisa bater com esses números.

## 8. Exclusão de conta

- **Pelo app ou pela web**, a Edge Function `delete-account` (com `service_role`) faz, nesta ordem:
  reautenticação recente → `auth.admin.deleteUser`. A cascata apaga `community_profiles`, os posts, os comentários,
  os Amém, os bloqueios (dos dois lados), os consentimentos e as tentativas de código. Em `community_reports.reporter_id`
  e `reported_user_id` e em `community_moderation_actions.*` o valor vira `null`: a denúncia e o registro ficam, mas sem
  apontar para ninguém.
- As **fotos**: apagar a linha de `storage.objects` por SQL deixa o arquivo órfão. Por isso o trigger
  `community_posts_enqueue_photo` (que também dispara na cascata) põe o arquivo em `private.storage_deletion_queue`. A
  Edge Function `drain-storage-deletions` (cron) chama `claim_storage_deletions` e depois `confirm_storage_deletion`,
  que só a `service_role` executa, e apaga pela API do Storage. Uploads soltos com mais de 24 h, sem post, são apagados
  pelo mesmo job, listando por `owner_id`.
- **Sair da comunidade** sem apagar a conta é o `leave_community`, que apaga tudo o que a pessoa fez nela. Quem foi
  suspenso ou removido fica com uma linha mínima de estado, para não voltar com outro código.
- **Retenção do consentimento:** está `on delete cascade`, então a prova some com a conta. É o lado conservador da LGPD.
  Guardar por prazo depende de parecer jurídico (`03-dados-e-seguranca.md` §2.4).

## 9. O que NÃO foi feito (e precisa existir antes de ligar)

1. **Rodar tudo no Supabase real:** `supabase start`, `supabase db reset`, `supabase test db`. Feito em parte: as
   migrations e os pgTAP 01–13 rodam no PGlite (§12); no Supabase real, ainda não. Suposições a conferir: o papel `postgres` lê e insere em `storage.objects`; o
   `pgcrypto` fica em `extensions`; e os códigos de erro próprios (`CM001`…`CM006`) chegam ao cliente pelo PostgREST no
   campo `code`.
2. **Edge Functions:** `delete-account` (a V1 também precisa dela, como item D-6), `drain-storage-deletions` (cron) e
   `text-filter` com ToxiBR, com versão fixada e lista revisada.
3. **Página web de moderação**, estimada em 4 a 6 dias (`04-moderacao.md` §5), e a página "Retirar conteúdo" para
   quem não tem o app.
4. **Telas no app:** entrada com código, nome, 18+, regras, consentimento, feed com fim, post, comentários, Amém,
   denunciar, bloquear e desbloquear, Minhas publicações, sair e revogar. Mais o `expo-image-manipulator` e o teste de
   EXIF com uma foto real.
5. **Foto de perfil:** fora deste schema, porque o nome basta. Se o produto quiser, entra como coluna nova com o
   mesmo bucket privado.
6. **Riscos aceitos e visíveis:** uma única denúncia de "criança" ou "rosto" tira o post do ar. Isso pode ser usado
   para abuso; a mitigação é o limite de 20 denúncias por dia e a moderação vendo quem denuncia demais. Um código
   vazado vale até ser revogado, e revogar **não expulsa** quem já entrou (decisão da igreja).

## 10. Custos (preços consultados em 2026-09-21, `00-DECISOES.md` §6)

| Item | Custo |
|---|---|
| Supabase Pro em São Paulo, que cobre banco, login, fotos e Edge Functions | US$ 25/mês |
| Resend, para o código de login por e-mail no pico | US$ 20/mês (grátis até 100 por dia) |
| Estimativa de uso: ~6 GB de fotos e ~120 GB/mês de tráfego (HIPÓTESE) | Cabe no Pro |
| Filtro ToxiBR (MIT) | Grátis |
| **Não** contratar Supabase Team (US$ 599/mês): a página interna substitui o painel para voluntários | — |

Os custos que pesam de verdade são o advogado e as pessoas (§11).

## 11. O que falta de fora da engenharia

**Do fundador:** criar a organização no Supabase **no nome da entidade dona**, com 2FA obrigatório, o projeto em
**São Paulo (`sa-east-1`)** e a chave **publishable** nova (as chaves `anon` e `service_role` estão sendo descontinuadas
até o fim de 2026). Ligar o Pro. Passar para o app só a URL e a chave publicável (a chave de serviço **nunca** vai para o
app; `assertNotServiceRoleKey` já recusa). Criar a conta no Resend. Nomear o primeiro admin (uma linha em `app_admins`,
pela chave de serviço).

**Da igreja:** as **regras da comunidade** escritas e a lista de termos, com um responsável. **14 moderadores + 2 de apoio
pastoral + 1 responsável legal**, treinados, com a escala de 20/12 a 03/01 fechada até 30/11. Os **líderes e ministérios**
que recebem os códigos, e quem os revoga. O **texto final** do consentimento e das regras, revisado por advogado: a
versão e o sha256 de cada texto vão para `community_settings` e substituem `PENDENTE`. A promessa de prazo da tela C5
(24 h ou 48 h). O que acontece com o feed depois de 31/12.

## 12. Execução

**2026-09-21: o SQL rodou pela primeira vez, num Postgres local.** Isto substitui o "NÃO EXECUTADO" do cabeçalho e o
item 1 do §9 **só em parte**: o primeiro `supabase db reset && supabase test db` num projeto de verdade continua
obrigatório antes de ligar.

**Como rodar** (Node, sem Docker nem Supabase CLI):

```
cd mobile
npm i --no-save @electric-sql/pglite      # ou PGLITE_DIR=<pasta com node_modules/@electric-sql/pglite>
node scripts/sql/run-supabase-sql.mjs [--only 07,11] [--log saida.txt]
```

`mobile/scripts/sql/` tem três arquivos:

- `supabase-stubs.sql` monta o mínimo do Supabase: os papéis `anon`, `authenticated` e `service_role` (este com
  BYPASSRLS), os grants padrão em `public`, `auth.users` com `auth.uid()`, `auth.jwt()` e `auth.role()` lendo
  `request.jwt.claims`, `storage.buckets` e `storage.objects` com RLS e `storage.foldername()`, `vault.decrypted_secrets`
  vazio e `net.http_post` falso.
- `mini-pgtap.sql` traz as asserções do pgTAP que os testes usam, com a mesma semântica: `plan`, `ok`, `is`, `isnt`,
  `matches`, `throws_ok`, `lives_ok`, `is_empty`, `results_eq` e `finish`. O PGlite não tem pgTAP, então os `.test.sql`
  rodam **sem tradução**.
- `run-supabase-sql.mjs` aplica as 6 migrations em ordem e roda os 12 arquivos de teste.

**Fidelidade.** As migrations e os testes rodam **conectados** como `supa_postgres`, que faz o papel do `postgres` do
Supabase. Ele **não** é superusuário, tem BYPASSRLS e é dono dos objetos. Por isso as funções SECURITY DEFINER rodam com
os mesmos limites de privilégio do projeto real. Rodando como superusuário, os testes passariam por motivos errados.

**Diferenças conhecidas (INFERÊNCIA, conferir no primeiro `supabase test db`):**

- O PGlite 0.5.8 roda Postgres **18.3**, e o projeto usa 17.
- `create extension pg_net` e `create extension pgtap` viram no-op. O harness avisa na saída.
- A posse das tabelas do Storage foi modelada assim: `supabase_storage_admin` é o dono e `postgres` é membro desse
  papel. Assim o `create policy` em `storage.objects` passa, como passa no Supabase (supabase/cli#96, visto em
  2026-09-21). O harness também aceitaria um `ALTER TABLE storage.objects`, que o Supabase recusa. Nenhuma migration faz
  isso.
- Não testado aqui: o PostgREST (se `CM001`…`CM006` chegam no campo `code`), a Storage API de verdade (quem grava
  `owner_id`) e o Vault de verdade.

**Resultado:** as 6 migrations aplicam sem erro. Das 247 asserções em 12 arquivos, **247 passam**:

| Arquivos | Asserções | O que cobrem |
|---|---|---|
| 01–06 (fundação) | 37 | grupos, colunas de perfil, funções privadas, RLS, service_role, remoção |
| 07–10 (Comunidade) | 91 | visibilidade, Amém e bloqueio, moderação e exclusão, entrada e consentimento |
| 11 (novo) | 58 | invariantes trocando papel e claims (lista abaixo) |
| 12 (novo) | 61 | executa as RPCs que nenhum teste chamava (PL/pgSQL só é validado quando roda) |

O arquivo 11 prova estas invariantes:

- Ninguém entra em grupo alheio nem põe outra pessoa num grupo, nem o líder.
- O colega de grupo não lê a linha nem a `age_band` do outro. O líder de outro grupo não vê nem remove ninguém.
- `anon` não chama nenhuma RPC. `authenticated` não chama as funções `service_*` nem `purge`, e não lê as tabelas de
  `private`.
- Um post ou comentário em análise só aparece para o autor. Amém, denúncia e bloqueio nesse conteúdo respondem sempre
  igual e não servem de oráculo.
- Ninguém lê a contagem de Amém, nem a moderação.
- Denúncia urgente de comentário tira o comentário do ar na hora. "Risco à vida" só passa para o topo da fila.
- Amém, comentário e upload exigem consentimento **na versão vigente**. Sessão anônima não publica nem sobe foto.
- Revogar o consentimento apaga o conteúdo e **mantém os bloqueios**.
- A exclusão de conta pelo caminho da Edge Function apaga tudo em cascata, dos dois lados do bloqueio. A exclusão
  direta em `auth.users` também não trava com Amém, comentário ou bloqueio vivos.

**Os testes pegam defeito?** Fiz um teste de mutação, com o script no scratchpad da sessão, fora do projeto. Foram 16
mutações, e cada uma quebra uma invariante numa cópia das migrations:

- o feed ignora o bloqueio;
- o `user_id` do Amém fica legível;
- o Amém é gravado sem consentimento;
- a denúncia urgente não tira do ar;
- revogar apaga os bloqueios;
- a `age_band` fica legível;
- o colega vê o perfil;
- o usuário drena a fila do Storage;
- o conteúdo em análise fica visível;
- o Amém trava a exclusão de conta;
- a força bruta no código passa;
- o upload passa sem consentimento;
- quem foi removido volta sozinho;
- a entrada passa sem declarar 18+;
- a sessão anônima publica;
- o feed mostra conteúdo em análise.

**As 16 foram pegas.** Duas mutações escaparam na primeira rodada, e cada uma virou teste novo:

- A exclusão direta de uma conta com Amém vivo não era testada. Hoje é a seção J do arquivo 11.
- A sessão anônima numa conta que já tinha consentimento não era testada. Hoje está na seção G do arquivo 11.

**pg_net e Vault.** Conferi à parte, porque o Vault real não aceita INSERT direto num `.test.sql`:

- Sem os segredos, publicar não chama nada.
- Com a URL e um segredo de 40 caracteres, um texto limpo chama `…/moderate-text` uma vez. O corpo leva só
  `{action, kind, id}`, sem o texto.
- Texto segurado não chama a função.
- Segredo com menos de 32 caracteres não chama.
- Se o `http_post` falhar, a publicação continua.

**Correções nas migrations:** nenhuma de lógica, porque nada quebrou. Mudou só o cabeçalho das 4 migrations da
Comunidade e dos testes 01–10. Agora diz "executado no PGlite; ainda NÃO EXECUTADO no Supabase real". O marcador
"NÃO EXECUTADO" continua ali porque `src/__tests__/comunidade-sql.test.ts` o exige.

**Correção posterior (integração, 2026-09-21):** `private.is_community_moderator()` passou a exigir conta ativa:
`profiles.account_status = 'active'` e, se existe perfil na comunidade, `community_profiles.status = 'active'`. O admin do
app sem perfil na comunidade continua moderando. Antes, um moderador suspenso ou removido continuava chamando as RPCs
de moderação. Coberto por `13_moderador_conta_ativa.test.sql` (10 asserções, junto com o caso do Amém com
consentimento e sem as regras aceitas, CM002). Resultado com ele: 257/257.

**Observado, sem correção (não quebra invariante):**

- Quando o conteúdo denunciado sai (a pessoa revoga ou apaga), a denúncia continua `open`, com `post_id` e
  `comment_id` nulos. Ela some da fila, mas continua em `community_open_reports`, e a moderação fecha à mão.
- `private.campaign_day()` devolve 1 antes de 23/09. Quem postar antes do início pode marcar "dia 1".
