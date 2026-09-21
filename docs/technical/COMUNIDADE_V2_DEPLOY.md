# Comunidade (V2): como pôr o servidor no ar

- **Data:** 2026-09-21. **Autor:** Claude (agente "Servidor: funções", branch `comunidade-v2`).
- **Para quem:** Davi, o fundador. **Você digita as senhas e os segredos.** Nenhum agente digita, vê ou guarda
  senha, token ou chave.
- **Estado:** nada disto rodou ainda. Não há Supabase CLI, Docker nem Deno nesta máquina. A lógica das funções foi
  testada no Jest com dependências falsas (27 testes em `mobile/supabase/functions/_tests/`). O SQL e o runtime Deno
  só vão rodar pela primeira vez quando você seguir este passo a passo.
- **Arquitetura:** `COMUNIDADE_V2_ARQUITETURA.md`. Este documento cobre só o deploy.

## 0. O que vai para o servidor

| Peça | Onde está | O que faz |
|---|---|---|
| 4 migrations da Comunidade | `mobile/supabase/migrations/20260921130000…140000_comunidade_*.sql` | Tabelas, RPCs, bucket de fotos, e o que as funções usam |
| `delete-account` | `mobile/supabase/functions/delete-account/` | Exclusão de conta pelo app e pela web. Exige login de até 10 minutos atrás |
| `drain-storage-deletions` | `mobile/supabase/functions/drain-storage-deletions/` | Roda a cada 15 min e apaga do Storage as fotos recusadas, removidas ou de contas excluídas, além dos uploads abandonados há mais de 24 h |
| `moderate-text` | `mobile/supabase/functions/moderate-text/` | Filtro de palavras em pt-BR (§6). Não usa serviço externo |
| `config.toml` | `mobile/supabase/config.toml` | Configuração do CLI (não muda o projeto hospedado sozinho) |

**Recomendação:** faça tudo primeiro num projeto de **teste** (outro projeto Supabase, grátis), confira a §9 e só
depois repita no projeto de produção. O SQL nunca rodou; se algo quebrar, é melhor que quebre no projeto de teste.

## 1. Antes de começar (uma vez)

1. O projeto Supabase já existe **na organização da entidade dona**, com 2FA, região **São Paulo (`sa-east-1`)** e
   plano Pro (produção). Anote o **Reference ID**: *Project Settings → General → Project ID*. Ele tem 20 letras.
   Abaixo, `SEU_REF` é esse valor.
2. Tenha à mão a **senha do banco**: *Project Settings → Database → Database password* (se não souber, redefina lá).
3. Abra o **PowerShell** na pasta `mobile` do código que vai para o ar. Hoje, neste branch, é:

   ```powershell
   cd "C:\Users\Administrator\Bible Study App - comunidade\mobile"
   ```

   Depois do merge no `main`, use `C:\Users\Administrator\Bible Study App\mobile`.

## 2. Entrar e ligar o projeto

```powershell
npx supabase --version
npx supabase login
```

O `login` abre o navegador. Entre na conta do Supabase e autorize. Depois:

```powershell
npx supabase link --project-ref SEU_REF
```

Ele pede a **senha do banco**. Digite (ela não aparece na tela) e aperte Enter.

## 3. Aplicar as migrations

Primeiro veja o que vai ser aplicado, sem aplicar:

```powershell
npx supabase migration list
npx supabase db push --dry-run
```

A lista precisa mostrar as migrations da fundação (se ainda não estiverem no projeto) e as 4 da Comunidade. Se
estiver certo:

```powershell
npx supabase db push
```

Responda `Y`. Se der erro, **pare** e me mande a mensagem de erro inteira. Não tente consertar no painel.

> A Comunidade continua **invisível** no app mesmo com as tabelas no servidor: ela só aparece em builds com
> `EXPO_PUBLIC_COMMUNITY_ENABLED=true`. E ninguém consegue publicar enquanto os textos de consentimento e regras
> estiverem `PENDENTE` (§8).

## 4. Publicar as três funções

```powershell
npx supabase functions deploy delete-account --project-ref SEU_REF
npx supabase functions deploy drain-storage-deletions --project-ref SEU_REF
npx supabase functions deploy moderate-text --project-ref SEU_REF
```

Se aparecer um erro pedindo **Docker**, repita cada linha com `--use-api` no fim (assim o empacotamento é feito no
servidor do Supabase).

As funções usam `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, que o Supabase injeta sozinho.
**NÃO CONFIRMADO:** se um dia você desligar as chaves antigas (*API Keys → Legacy*), crie os segredos
`COMMUNITY_SECRET_KEY` (a chave `sb_secret_…`) e `COMMUNITY_PUBLISHABLE_KEY` (a `sb_publishable_…`), do mesmo jeito da §5.
A chave secreta **nunca** vai para o app.

## 5. Segredos das funções

1. Gere um segredo aleatório (64 caracteres) no PowerShell:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Copie o valor. Ele vai em dois lugares: aqui e no Vault (§6). **Não** mande esse valor para ninguém, nem no chat.

2. Grave o segredo nas funções. Troque `COLE_AQUI` pelo valor:

   ```powershell
   npx supabase secrets set COMMUNITY_CRON_SECRET=COLE_AQUI --project-ref SEU_REF
   ```

3. Opcionais (dá para fazer depois):

   | Segredo | Para quê | Exemplo |
   |---|---|---|
   | `ALLOWED_ORIGINS` | Endereços das páginas web (exclusão de conta e moderação) que podem chamar as funções | `https://exclusao.suaigreja.org,https://moderacao.suaigreja.org` |
   | `FILTER_EXTRA_TERMS` | Termos a mais na lista base do filtro, separados por vírgula | `termo um,termo dois` |
   | `FILTER_DISABLED_TERMS` | Termos da lista base que a igreja quer desligar | `pix` |
   | `DELETE_ACCOUNT_MAX_AUTH_AGE_SECONDS` | Até quantos segundos depois do login a exclusão é aceita (60 a 3600; padrão 600) | `600` |

   ```powershell
   npx supabase secrets list --project-ref SEU_REF
   ```

   Esse comando mostra só os nomes, e é assim que tem que ser.

## 6. Vault e agendamento (no painel)

Abra *SQL Editor → New query* no projeto, cole e rode **um bloco de cada vez**.

**6.1 Guardar o endereço das funções e o segredo no Vault.** O banco usa esses dois valores para chamar as funções.
Troque `SEU_REF` e `COLE_AQUI` (**o mesmo valor** da §5):

```sql
select vault.create_secret('https://SEU_REF.supabase.co/functions/v1', 'community_functions_url');
select vault.create_secret('COLE_AQUI', 'community_cron_secret');
```

**6.2 Ligar o agendador** (se já estiver ligado em *Integrations → Cron*, pule):

```sql
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
```

**6.3 Agendar** (os horários são UTC):

```sql
select cron.schedule(
  'comunidade-drenar-fotos', '*/15 * * * *',
  $$select private.community_call_function('drain-storage-deletions', '{}'::jsonb)$$
);
select cron.schedule(
  'comunidade-sincronizar-termos', '17 6 * * *',
  $$select private.community_call_function('moderate-text', '{"action":"sync_terms"}'::jsonb)$$
);
```

**6.4 Primeira sincronização da lista de termos (agora), e conferência:**

```sql
select private.community_call_function('moderate-text', '{"action":"sync_terms"}'::jsonb);
```

Espere uns 10 segundos e rode:

```sql
select status_code, content from net._http_response order by created desc limit 3;
select source, count(*) from private.community_filter_terms group by source;
```

O esperado é `status_code = 200` com `{"added":…,"removed":0,"total":…}`, e uma linha `base` com uns 47 termos. Se
aparecer `401`, o segredo do Vault não bate com o da §5: apague com
`delete from vault.secrets where name = 'community_cron_secret';` e refaça o 6.1 só com essa linha.

## 7. Primeiro administrador e primeiro moderador

1. No app (build de desenvolvimento ligada a este projeto), entre com **o seu e-mail** e o código. Isso cria a sua
   conta em `auth.users`.
2. No *SQL Editor*, troque o e-mail e rode:

   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com'
   on conflict do nothing;

   insert into public.community_moderators (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com'
   on conflict do nothing;

   select u.email, a.user_id is not null as admin, m.user_id is not null as moderador
   from auth.users u
   left join public.app_admins a on a.user_id = u.id
   left join public.community_moderators m on m.user_id = u.id
   where u.email = 'seu-email@exemplo.com';
   ```

   A última consulta precisa mostrar `admin = true` e `moderador = true`.
3. Os outros moderadores entram do mesmo jeito (depois de criarem a conta no app), ou pela página de moderação,
   quando ela existir (`admin_set_community_moderator`).
4. **Códigos de entrada** (`admin_create_invite_code`) precisam de um admin logado. O caminho normal é a página de
   moderação. Até ela existir: *SQL Editor → seletor de papel (canto de cima) → `authenticated` → escolher o seu
   usuário*, e rodar `select public.admin_create_invite_code('Nome do líder ou ministério', 300, 60);`. O código
   aparece **uma única vez**. Anote e entregue ao líder.

## 8. O que continua trancado (de propósito)

- **Ninguém publica** enquanto `publish_consent_version` e `rules_version` estiverem `PENDENTE` em
  `private.community_settings`. Quando o texto final (revisado por advogado) estiver pronto, a versão e o sha256 de
  cada texto vão para lá. Esse passo tem instrução própria, que entra com o texto aprovado.
- **A V1 continua sem nuvem em release**: `ACCOUNT_DELETION_AVAILABLE` em `mobile/src/cloud/config.ts` só vira `true`
  quando existirem as três coisas: a função `delete-account` no ar, o botão "Excluir conta" no app **e** a página web
  de exclusão (Google Play). A função é só uma das três.

## 9. Conferir que funcionou (projeto de teste)

1. **Funções no ar:** *Edge Functions* no painel lista as três.
2. **Exclusão de conta:** crie uma conta de teste pelo app, entre na Comunidade, publique um texto e envie uma foto.
   Depois use "Excluir conta" logo em seguida ao login. Confira:

   ```sql
   select count(*) from auth.users where email = 'conta-de-teste@exemplo.com';           -- 0
   select count(*) from private.storage_deletion_queue;                                   -- 0 (ou some em 15 min)
   ```

   Se você esperar **mais de 10 minutos** depois do login, o app precisa pedir um código novo antes de apagar.
3. **Segunda passada do filtro:** publique `que p0rr4` (com zero e quatro). O texto aparece e, em segundos, vai para
   "Em análise" em "Minhas publicações".
4. **Drenagem:** *Edge Functions → drain-storage-deletions → Logs* mostra um `storage_drained` a cada 15 minutos.
5. **Logs sem dado pessoal:** os logs das três funções só têm nome de evento e números, nunca e-mail, id ou texto.

Se algum item falhar, me mande o texto do log ou do erro. Não mande senha, segredo ou chave.

## 10. Como funciona o filtro (para a igreja)

- **Primeira camada, no banco, antes de aparecer:** segura link, e-mail, telefone e qualquer termo de
  `private.community_filter_terms`. Nessa tabela estão a lista base (`source = 'base'`), sincronizada pela função, e
  os termos da igreja (`source = 'igreja'`, acrescentados com `admin_set_filter_term`).
- **Segunda camada, logo depois de aparecer:** o banco chama `moderate-text` só com o id do conteúdo, e a função pega
  disfarces como `merdaaa`, `p0rr4` e `p u t a`. Se pegar, o conteúdo volta para "Em análise". Pode ficar visível por
  alguns segundos. Esse é o limite de não usar serviço externo e de não atrasar a publicação.
- **O filtro nunca recusa sozinho.** Ele só segura o conteúdo para uma pessoa da moderação olhar. A lista base
  (`_shared/terms-pt-br.ts`) é uma **PROPOSTA** do engenheiro; a igreja revisa, acrescenta e desliga termos (§5).

## 11. Mudar algo depois

- **Código de uma função:** rode de novo o `functions deploy` dela (§4).
- **Lista base:** mude o segredo (§5) e rode o 6.4. Ou espere a sincronização diária.
- **Nova migration:** `npx supabase db push` (§3).
- **Parar o agendamento:** `select cron.unschedule('comunidade-drenar-fotos');` (e o mesmo com o outro nome).
