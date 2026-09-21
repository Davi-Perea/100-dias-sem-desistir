# Correções de segurança nas migrations do Supabase

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer + Technical Architect)
- **Arquivos alterados:** `mobile/supabase/migrations/20260907120000_foundation.sql`,
  `mobile/supabase/migrations/20260907120100_rls.sql`, `mobile/supabase/seed.dev.sql`.
- **Arquivos novos:** `mobile/supabase/tests/01_entrada_em_grupo.test.sql`, `02_perfil_colunas.test.sql`,
  `03_funcoes_privadas.test.sql`, `04_rls_grants_exclusao.test.sql`, `05_service_role.test.sql` (pgTAP, formato do `supabase test db`).
- **Por que as próprias migrations foram editadas:** nenhum banco existe. Elas nunca foram aplicadas, então não há
  histórico para preservar; uma migration de remendo só deixaria a versão insegura registrada para sempre.
- **O que NÃO foi feito:** nada em `mobile/src`, nos testes Jest ou no `package.json`. Nenhuma funcionalidade nova
  (feed, posts, fotos, convite). Nada foi executado num banco (**não há banco nem Supabase CLI nesta máquina**).
  Todo o SQL abaixo está **NÃO TESTADO** até rodar `supabase test db`.

Convicção religiosa é dado pessoal sensível (LGPD art. 5º, II). Estar num grupo de intercessão de uma igreja já revela
fé; por isso "quem entra no grupo" e "quem vê quem está no grupo" são perguntas de segurança, não de conveniência.

---

## Resumo

| # | Defeito | Gravidade | Estado |
|---|---|---|---|
| D1 | Qualquer conta autenticada entrava sozinha em qualquer grupo ativo | Alta | Corrigido (auto-ingresso removido) |
| D2 | Colegas de grupo liam `age_band` (faixa etária) e `account_status` | Média | Corrigido (privilégio por coluna) |
| D3 | Funções `SECURITY DEFINER` no schema `public`, exposto pela API | Média | Corrigido (schema `private`, `search_path = ''`) |
| D4 | Membro **removido** pelo líder voltava sozinho; quem saiu reentrava | Alta | Corrigido (policy + grant por coluna) |
| D5 | `revoke ... from anon` sem `public` não tirava nada (EXECUTE padrão vai para PUBLIC) | Média | Corrigido nas funções atuais; o "padrão para funções futuras" NÃO funciona para PUBLIC (ver D5) |
| D6 | Cadastro sem e-mail (sessão anônima) ou com e-mail longo **quebrava**; nome padrão vazava o e-mail | Alta (funcional) / Baixa (privacidade) | Corrigido |
| D7 | Exclusão de conta de admin (ou de alvo de auditoria) travava por chave estrangeira | Alta (LGPD art. 18) | Corrigido (`on delete set null` + índices) |
| D8 | Funções nas policies chamadas por linha, sem `(select ...)` | Baixa (desempenho) | Corrigido |
| D9 | Chave de serviço (painel admin, Edge Function) não conseguia escrever em `profiles`/`group_memberships`: faltava permissão em `private` | Média (funcional) | Corrigido (revisão) |
| D10 | Duas funções da fundação usavam `# Correções de segurança nas migrations do Supabase

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer + Technical Architect)
- **Arquivos alterados:** `mobile/supabase/migrations/20260907120000_foundation.sql`,
  `mobile/supabase/migrations/20260907120100_rls.sql`, `mobile/supabase/seed.dev.sql`.
- **Arquivos novos:** `mobile/supabase/tests/01_entrada_em_grupo.test.sql`, `02_perfil_colunas.test.sql`,
  `03_funcoes_privadas.test.sql`, `04_rls_grants_exclusao.test.sql`, `05_service_role.test.sql` (pgTAP, formato do `supabase test db`).
- **Por que as próprias migrations foram editadas:** nenhum banco existe. Elas nunca foram aplicadas, então não há
  histórico para preservar; uma migration de remendo só deixaria a versão insegura registrada para sempre.
- **O que NÃO foi feito:** nada em `mobile/src`, nos testes Jest ou no `package.json`. Nenhuma funcionalidade nova
  (feed, posts, fotos, convite). Nada foi executado num banco (**não há banco nem Supabase CLI nesta máquina**).
  Todo o SQL abaixo está **NÃO TESTADO** até rodar `supabase test db`.

Convicção religiosa é dado pessoal sensível (LGPD art. 5º, II). Estar num grupo de intercessão de uma igreja já revela
fé; por isso "quem entra no grupo" e "quem vê quem está no grupo" são perguntas de segurança, não de conveniência.

---

## Resumo

| # | Defeito | Gravidade | Estado |
|---|---|---|---|
| D1 | Qualquer conta autenticada entrava sozinha em qualquer grupo ativo | Alta | Corrigido (auto-ingresso removido) |
| D2 | Colegas de grupo liam `age_band` (faixa etária) e `account_status` | Média | Corrigido (privilégio por coluna) |
| D3 | Funções `SECURITY DEFINER` no schema `public`, exposto pela API | Média | Corrigido (schema `private`, `search_path = ''`) |
| D4 | Membro **removido** pelo líder voltava sozinho; quem saiu reentrava | Alta | Corrigido (policy + grant por coluna) |
| D5 | `revoke ... from anon` sem `public` não tirava nada (EXECUTE padrão vai para PUBLIC) | Média | Corrigido nas funções atuais; o "padrão para funções futuras" NÃO funciona para PUBLIC (ver D5) |
| D6 | Cadastro sem e-mail (sessão anônima) ou com e-mail longo **quebrava**; nome padrão vazava o e-mail | Alta (funcional) / Baixa (privacidade) | Corrigido |
| D7 | Exclusão de conta de admin (ou de alvo de auditoria) travava por chave estrangeira | Alta (LGPD art. 18) | Corrigido (`on delete set null` + índices) |
| D8 | Funções nas policies chamadas por linha, sem `(select ...)` | Baixa (desempenho) | Corrigido |
| D9 | Chave de serviço (painel admin, Edge Function) não conseguia escrever em `profiles`/`group_memberships`: faltava permissão em `private` | Média (funcional) | Corrigido (revisão) |
 em vez de `$`: a migration inteira falhava | Crítica (funcional) | Corrigido (revisão) |
| D11 | `remove_group_member` gravava auditoria de "remoção" contra qualquer uuid, mesmo sem membership ativa (SEC-05) | Baixa | Corrigido (2026-09-21, G6c) |

Verificados e **sem defeito**: RLS está habilitada nas 5 tabelas; nenhuma policy usa `using (true)`; nenhuma policy é
`to anon`; toda policy de UPDATE tem `WITH CHECK`; os triggers já impediam trocar `user_id`/`group_id`/`role`; as FKs
de `profiles`, `group_memberships` e `app_admins.user_id` já tinham `on delete cascade`; o seed não tem dado real
(só dois grupos genéricos marcados "(DEV)" e UUIDs fixos; os e-mails são passados na hora e o comentário agora pede
contas de teste).

---

## D1 — auto-ingresso em qualquer grupo

**Antes** (`20260907120100_rls.sql`):

```sql
create policy "entro em grupo ativo como membro" on public.group_memberships
  for insert to authenticated
  with check ((select auth.uid()) = user_id and role = 'member' and status = 'active'
              and exists (select 1 from public.groups g where g.id = group_id and g.status = 'active'));
```

Com `"grupos ativos são legíveis"` mostrando o catálogo inteiro, qualquer conta (inclusive sessão anônima, que também
recebe o papel `authenticated`) listava os grupos e entrava em todos. Hoje isso daria ao intruso só a própria linha;
no dia em que houver qualquer coisa "só do grupo", daria acesso a ela.

**Depois:** a policy foi **removida**. O schema não tem convite nem código, e criar um é funcionalidade nova (decisão de
produto, ver `docs/product/comunidade/03-dados-e-seguranca.md` §3.1). Até lá, quem põe pessoas em grupo é o **admin**
(policy `"admin gerencia memberships"`, que já existia). O trigger `guard_membership_role()` continua recusando
`role <> 'member'`.

**Por quê:** o pedido era "entrada só por convite validado no servidor ou por quem lidera; se não houver convite,
remover o auto-ingresso". Não há convite. Líder incluir membro também seria caminho novo (RPC nova); ficou como
pendência, não como improviso.

## D4 — removido voltava sozinho (achado novo, mesma família de D1)

**Antes:**

```sql
create policy "saio do meu grupo" on public.group_memberships
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status in ('active', 'left'));
```

O `USING` não olhava o estado antigo e o `WITH CHECK` aceitava `'active'`. Resultado: quem o líder **removeu**
(`status = 'removed'`) fazia `update ... set status = 'active'` e voltava; quem saiu reentrava. Além disso, o cliente
podia reescrever `joined_at`.

**Depois:**

```sql
revoke update on public.group_memberships from authenticated;
grant  update (status) on public.group_memberships to authenticated;

create policy "saio do meu grupo" on public.group_memberships
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'active')
  with check ((select auth.uid()) = user_id and status = 'left');
```

**Por quê:** a única transição que o cliente precisa é `active → left`. Qualquer outra é decisão do líder ou do admin.

## D2 — faixa etária visível para colegas

**Antes:** a policy de `profiles` entregava a **linha inteira** a quem dividia grupo, inclusive `age_band` e
`account_status`. (Na prática, como o join rodava sob a RLS de `group_memberships`, só o líder via os membros; mas via
tudo.) Num grupo de 7 pessoas, o líder saberia quem é menor de idade e quem pediu exclusão de conta.

**Depois:**

```sql
revoke select, insert, update, delete on public.profiles from authenticated;
grant  select (user_id, display_name) on public.profiles to authenticated;
grant  update (display_name)          on public.profiles to authenticated;

create policy "perfil próprio, de membro que lidero, ou admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id
         or (select private.is_app_admin())
         or private.leads_group_of(user_id));

-- o dono lê a própria linha inteira:
create or replace function public.my_profile() returns table (...)
language sql stable security invoker set search_path = '' as $$ select * from private.my_profile(); $$;
```

**Por que privilégio por coluna e não view `security_invoker`:** uma view `security_invoker` roda com as permissões de
quem consulta, então herdaria exatamente a mesma RLS e as mesmas colunas da tabela; ela só esconderia colunas se
quem consulta não pudesse ler a tabela direto, e aí teria de ser `security definer` (o linter do Supabase marca view
assim como erro). Tirar a coluna do `GRANT` fecha o buraco na própria tabela, vale para qualquer caminho (REST, embed,
`select=*`) e não cria objeto novo. Custo: o dono também não lê `age_band` pela tabela, por isso `my_profile()`.
Não existe coluna de avatar hoje; quando existir, entra no mesmo `grant select (...)`.

**Bônus:** `update (display_name)` impede o cliente de gravar `age_band` por conta própria. A regra de faixa etária
(spec §25) não foi decidida; quando for, entra por RPC com validação, não por UPDATE livre.

## D3 — SECURITY DEFINER no schema exposto

**Antes:** `is_app_admin()`, `is_group_member()`, `is_group_leader()`, `handle_new_user()`, `admin_set_group_role()`,
`remove_group_member()` e o `dev_seed_roles()` do seed estavam em `public` com `set search_path = public`.

**Depois:**

- Schema `private` criado na fundação, **fora** da lista de schemas da API; `authenticated` tem só `USAGE` (para as
  policies conseguirem chamar as funções) e `EXECUTE` função a função; `anon` não tem nada.
- Todas as `SECURITY DEFINER` vivem em `private`, com `set search_path = ''` e nomes totalmente qualificados
  (`public.group_memberships`, `pg_catalog.set_config`, `auth.uid()`).
- `admin_set_group_role` e `remove_group_member` continuam **chamáveis pelo app com o mesmo nome e argumentos**: em
  `public` ficou um invólucro `SECURITY INVOKER` de uma linha que chama a versão privada. O invólucro não tem privilégio
  próprio; a verificação (sessão, admin/líder) está dentro da função privada.

```sql
create or replace function private.is_group_leader(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_memberships m
                 where m.group_id = target_group and m.user_id = (select auth.uid())
                   and m.status = 'active' and m.role = 'leader');
$$;
revoke all on function private.is_group_leader(uuid) from public, anon;
grant execute on function private.is_group_leader(uuid) to authenticated;

create or replace function public.admin_set_group_role(target_user uuid, target_group uuid, new_role public.group_role)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_group_role(target_user, target_group, new_role);
$$;
```

## D5 — `revoke ... from anon` não revogava

O Postgres dá `EXECUTE` em toda função nova para o pseudo-papel `PUBLIC`, e `anon`/`authenticated` herdam de `PUBLIC`.
Então `revoke execute ... from anon, authenticated` (usado em `role_change_is_authorized()` e em `dev_seed_roles()`)
não tirava o acesso. **Depois:** todo `revoke` de função inclui `public`. A fundação também tem:

```sql
alter default privileges in schema public  revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon;
```

**Correção da revisão (2026-09-21):** a primeira versão deste documento dizia que esses dois comandos fazem toda função
nova nascer sem `EXECUTE`. **Isso era falso.** Um padrão definido por schema só soma ao padrão global; não consegue tirar
o que o padrão global dá. O `EXECUTE` para `PUBLIC` é padrão global, então a parte `from public` não faz nada. A parte
`from anon` em `public` desfaz o grant por schema que o Supabase configura (INFERÊNCIA; não verificado num banco). Em
`private` o Supabase não configura grant nenhum, então lá o comando não muda nada, mas não atrapalha.

Na prática: **toda função nova precisa de `revoke all on function ... from public, anon` explícito e de
`grant execute ... to authenticated` (e `service_role`, se o servidor usar) explícito.** As funções atuais têm isso, e o
teste 03 falha se alguma função de `public`/`private` tiver `EXECUTE` para `PUBLIC` ou para `anon`. Não troquei pela
forma global (`alter default privileges for role postgres revoke execute on functions from public`): ela valeria também
para extensões criadas depois, como o pgTAP, e poderia impedir `authenticated` de chamar `throws_ok`/`lives_ok` nos
testes (HIPÓTESE, não testada).

Nota: `role_change_is_authorized()` foi para `private`, mas **precisa** de `EXECUTE` para `authenticated` e para
`service_role`, porque os triggers de guarda rodam como quem faz a escrita (ver D9). Ela só lê uma configuração local
da transação.

## D9 — servidor (chave de serviço) bloqueado pelos triggers de guarda (achado da revisão)

Os triggers `guard_membership_role` e `guard_profile_protected_columns` rodam como quem faz a escrita e chamam
`private.role_change_is_authorized()`. Só `authenticated` tinha `USAGE` no schema `private` e `EXECUTE` na função.
`service_role` ignora a RLS, mas não é superusuário (INFERÊNCIA, pela doc de papéis do Supabase, que só diz que ele
"ignora RLS"), então não ignora essa permissão. Resultado: qualquer INSERT/UPDATE em `group_memberships` ou UPDATE em
`profiles` feito pelo servidor (painel admin, Edge Function de exclusão marcando `deletion_requested`) falharia com
`permission denied for schema private`. Não era brecha (falhava fechado), mas travava o caminho de administração.

**Depois:** `grant usage on schema private to service_role;` e
`grant execute on function private.role_change_is_authorized() to service_role;` na fundação. Mesmo com isso, o
servidor só muda `role`/`account_status` ligando `app.role_change_authorized` na própria transação. Novo teste
`05_service_role.test.sql` cobre os dois lados.

## D10 — a fundação nem rodava (achado da revisão)

Os corpos de `private.handle_new_user()` e `private.role_change_is_authorized()` estavam entre `$` simples
(`as $` ... `end $;`), não `$$`. Conferido nos bytes. `$` sozinho não delimita texto no Postgres: a primeira migration
dava erro de sintaxe e **nada** era criado; D1–D8 só existiam no papel e os testes pgTAP nem começavam. **Depois:** os
quatro delimitadores viraram `$$`. Uma busca por `$` isolado em `migrations/*.sql` e `tests/*.sql` volta vazia.
Isso reforça o item "nada foi executado": só `supabase test db` pega esse tipo de erro.

---

## Fontes e classificação

- **FATO** (documentação do PostgreSQL, "ALTER DEFAULT PRIVILEGES", acessada em 2026-09-21): padrão por schema só soma
  ao global; `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` não tem efeito; sem
  `FOR ROLE`, vale para objetos criados pelo papel atual. https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html
- **FATO** (Supabase, "Postgres Roles", acessada em 2026-09-21): `service_role` é usado pela API para ignorar RLS; a
  página não diz que é superusuário nem que tem acesso automático a schemas próprios.
  https://supabase.com/docs/guides/database/postgres/roles
- **FATO** (Supabase, "Row Level Security", acessado em 2026-09-21 na pesquisa da frente de comunidade): funções
  `security definer` não devem ficar em schema exposto; views ignoram RLS salvo `security_invoker = true`; envolver
  funções em `(select ...)` melhora desempenho. https://supabase.com/docs/guides/database/postgres/row-level-security
- **FATO, não reverificado nesta sessão** (documentação do PostgreSQL, "Privileges"): o padrão de funções é `EXECUTE`
  para `PUBLIC`. https://www.postgresql.org/docs/current/ddl-priv.html — conferir antes de citar fora daqui.
- **FATO, não reverificado nesta sessão** (Supabase, "Column Level Security"): privilégio por coluna funciona com a API e
  `select=*` passa a falhar quando há coluna sem permissão.
  https://supabase.com/docs/guides/database/postgres/column-level-security
- **INFERÊNCIA:** disparar trigger não exige `EXECUTE` do usuário (só criá-lo). Por isso o `revoke` nas funções de
  trigger é higiene. Coberto indiretamente pelos testes 01/02 (se estiver errado, eles falham).
- **HIPÓTESE a testar:** o trigger em `auth.users` que chama `private.handle_new_user()` funciona quando o cadastro é
  feito pelo papel `supabase_auth_admin` (sem `USAGE` em `private`). Se falhar, `grant usage on schema private to
  supabase_auth_admin`. O teste 02 insere em `auth.users` como `postgres` e **não** prova isso; testar cadastro real.

---

## O que ficou aberto

1. **Entrada em grupo:** hoje só admin inclui. Convite/código validado no servidor (ou líder incluindo membro) é
   decisão de produto, desenhada em `docs/product/comunidade/03-dados-e-seguranca.md` §3.1. Não implementado.
2. **Catálogo de grupos** continua legível por qualquer conta autenticada, inclusive anônima. Nomes de grupo não
   identificam pessoas; revisar se algum nome vier a identificar.
3. **Membro comum não vê nomes dos colegas** (já era assim na prática). Se o produto quiser, é decisão explícita.
4. **Retenção do log de auditoria:** o log guarda `meta` e `target_group_id` sem prazo. Definir prazo com o jurídico.
5. **`deletion_requests`, `consents`, Edge Function de exclusão:** previstos no `SECURITY_V0.md`, ainda não existem.
6. **Nada foi executado.** A revisão achou um erro de sintaxe (D10) que impedia a fundação de rodar; outros podem existir. Os 5 arquivos pgTAP precisam rodar com `supabase start` + `supabase test db` num ambiente
   com Docker ou num projeto de desenvolvimento.
. **Função nova sem `revoke` explícito fica executável por `anon`** via PUBLIC (D5). A proteção é disciplina + teste 03,
   não o padrão do banco. Avaliar a forma global de `alter default privileges` só depois de testar com o pgTAP.
9. **`service_role` sem superusuário** e as permissões de tabela que o Supabase dá a ele em `public` são INFERÊNCIA: o
   teste 05 confirma ou derruba.

---

## D11 — auditoria falsa em remove_group_member (SEC-05, segunda metade)

**Antes:** o `update ... set status = 'removed'` podia não achar linha nenhuma e a função seguia para o
`insert into admin_audit_log`. Um líder gravava "removi X" para qualquer conta existente, inclusive de quem nunca
esteve no grupo dele. **Depois:** `if not found then raise exception ... using errcode = 'P0002'` antes da
auditoria (o cliente mostra "Não encontramos o que você procura."). Teste pgTAP novo:
`mobile/supabase/tests/06_remocao_sem_alvo.test.sql` (NÃO EXECUTADO, como os outros).

Conferência dos achados da auditoria contra as migrations (2026-09-21, G6c): SEC-02 (removido volta / líder
removido volta como líder) coberto por D4; SEC-03 (qualquer conta entra em qualquer grupo; nome tirado do e-mail)
coberto por D1 e D6; SEC-05 (FKs sem `on delete`) coberto por D7, e a parte "planta linhas" agora por D11; SEC-10
(`age_band`/`created_at` editáveis) coberto por D2 (`grant update (display_name)`).

## O que o código do app precisava mudar — feito em 2026-09-21 (G6c)

- `getMyProfile()` agora usa `supabase.rpc('my_profile')`; o tipo do dono é `MyProfile`.
- `listGroupMembers()` faz duas consultas (memberships, depois `profiles.select('user_id, display_name').in(...)`),
  sem embed. `Profile` passou a ter só `user_id` e `display_name` (o que se lê de outra pessoa).
- `joinGroup()` continua no código (o teste `cloudRoles.test.ts` o cobre), com o aviso de que o banco real o
  recusa. **Falta, fora deste grupo:** a tela Juntos parar de oferecer "Entrar" num grupo.
- `sqlPolicies.test.ts` reescrito para o desenho novo: 44 testes, todos passando (antes: 11 falhas).

Texto original desta seção, mantido como registro:

## O que o código do app precisa mudar (não editei `mobile/src`)

Arquivo: `mobile/src/cloud/groups.ts`.

| Função | Hoje | Com as migrations novas | O que mudar |
|---|---|---|---|
| `joinGroup()` (l. 96–105) | `.from('group_memberships').insert(...)` | **Sempre falha** (sem policy de INSERT) | Remover da UI ou trocar por "peça ao seu líder/admin" até existir convite |
| `getMyProfile()` (l. 24–35) | `.from('profiles').select('user_id, display_name, age_band, account_status, created_at, updated_at')` | **Falha** (permission denied em colunas) | `supabase.rpc('my_profile').maybeSingle()` |
| `listGroupMembers()` (l. 121–133) | embed `profiles(user_id, display_name, age_band, account_status, created_at, updated_at)` | **Falha** pelas colunas; e o embed **já não resolvia antes**: `group_memberships.user_id` aponta para `auth.users`, não para `profiles`, então o PostgREST não acha a relação | Buscar `profiles` à parte com `.select('user_id, display_name').in('user_id', ids)`; o tipo `Profile` para outra pessoa passa a ter só esses dois campos |
| `leaveGroup()` | update `status: 'left'` | Funciona | — |
| `updateDisplayName()` | update `display_name` | Funciona | — |
| `adminSetGroupRole()`, `removeGroupMember()` | `rpc('admin_set_group_role' / 'remove_group_member')` | Funcionam (mesmo nome, invólucro em `public`) | — |
| `listActiveGroups()`, `getMyMembership()`, `getEffectiveRole()` | leitura | Funcionam | — |

`mobile/src/cloud/types.ts`: `Profile` mistura dados do dono (`age_band`, `account_status`) com o que se vê de outra
pessoa; separar em `MyProfile` e `MemberName`.

**Teste estático que vai quebrar:** `mobile/src/__tests__/sqlPolicies.test.ts` lê o texto das migrations e afirma o
desenho antigo. Rodado nesta sessão: **11 falhas, 18 passam**. Todas as falhas afirmam exatamente o que foi corrigido:

- `entrar em grupo exige role "member" na própria policy` → a policy não existe mais (D1). Trocar por "não existe
  policy de INSERT do cliente em group_memberships".
- `as policies de líder passam por is_group_leader`, `remover membro exige líder...`, os 6 testes de
  `admin_set_group_role`, `funções auxiliares fixam search_path` → procuram `function public.<nome>` e
  `set search_path = public`. Devem procurar `private.<nome>` e `set search_path = ''`, e afirmar que em `public` só
  existe o invólucro `security invoker`.
- `o cliente não pode ligar a janela de autorização` → a função agora é `private.role_change_is_authorized()` e
  **precisa** de EXECUTE para `authenticated` (ver D5).
- `a função de seed não tem GRANT para o aplicativo` → agora `revoke all on function private.dev_seed_roles(...) from
  public, anon, authenticated`.

`mobile/src/__tests__/cloudRoles.test.ts` usa um cliente falso e continua passando, mas afirma um `joinGroup` que o
banco real vai recusar.
