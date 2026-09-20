# EXECUTION 02 — Identidade, grupos e papéis

- **Data:** 2026-09-07 · **Spec:** MASTER PRODUCT SPEC v1.1 · **Estado:** construída, **não commitada**
- **Execution 01 preservada:** os 121 testes anteriores continuam passando sem alteração de comportamento.
- **Ambiente:** sem projeto Supabase e **sem Docker** nesta máquina. Portanto RLS e autenticação reais estão
  **NOT TESTED**; teste com mock não é prova de política (exigência explícita do brief).

---

## 1. O que foi construído

### Banco (`mobile/supabase/`)
| Arquivo | Conteúdo |
|---|---|
| `migrations/20260907120000_foundation.sql` | 5 tabelas: `profiles`, `groups`, `group_memberships`, `app_admins`, `admin_audit_log`. Enums, índices, trigger de criação de perfil e **dois triggers de guarda de escalada**. |
| `migrations/20260907120100_rls.sql` | RLS ligada em todas as tabelas, revogação de `anon`, políticas por papel e as funções `admin_set_group_role` / `remove_group_member`. |
| `seed.dev.sql` | Seed de desenvolvimento (2 grupos, 1 membro, 1 líder, 1 admin). **Fora de `migrations/`** e bloqueado por chave explícita. |

**Fora do escopo de propósito:** `group_posts`, `reactions`, `reports`, `blocks`, push remoto e sync de progresso.
As migrations especulativas da Execution 01 foram substituídas por esta fundação mínima.

### Cliente (`mobile/src/cloud/`)
`config.ts` (configuração opcional + guarda contra chave service_role) · `secureStorage.ts` (chave no Keychain/Keystore,
sessão cifrada no AsyncStorage) · `client.ts` (cliente preguiçoso) · `auth.ts` (OTP por e-mail) · `groups.ts` (grupos,
membership, papéis) · `errors.ts` (mensagens que não vazam dados) · `useSession.ts` (estado de identidade) · `types.ts`.

### Telas
`conta.tsx` (e-mail → código, com reenvio controlado) · `(tabs)/juntos.tsx` (quatro estados) ·
`grupo/[id].tsx` (membros, para líder/admin) · `admin.tsx` (atribuir/remover liderança, com confirmação) ·
seção de conta em `(tabs)/voce.tsx`.

---

## 2. Como a segurança é construída

O ponto central: **papel nunca vem do cliente**. Três camadas independentes:

1. **Policy de INSERT** exige `role = 'member'` ao entrar num grupo.
2. **Trigger `guard_membership_role`** recusa qualquer mudança de `role` (e troca de dono da linha) a menos que a
   janela `app.role_change_authorized` esteja aberta — e só a função administrativa a abre, dentro da transação.
3. **`admin_set_group_role`** é `SECURITY DEFINER`, confere `is_app_admin()` antes de escrever e grava auditoria.

`app_admins` não tem nenhuma policy de escrita: conceder admin exige `service_role`, que não existe no aplicativo.
Esconder botão não é segurança — a tela de administração checa o papel só para não exibir algo inútil; quem recusa é o banco.

---

## 3. Setup quando houver um projeto Supabase

```bash
cp mobile/.env.example mobile/.env.local   # preencher URL e anon key
```

```bash
cd mobile && npx supabase link --project-ref SEU_REF && npx supabase db push
```

Depois, para criar os papéis de teste: crie três contas pelo app (membro, líder, admin) e rode o seed com a chave
explícita, conforme o cabeçalho de `supabase/seed.dev.sql`. Antes de produção, remova a função do seed:

```sql
drop function if exists public.dev_seed_roles(text, text, text);
```

**Região aprovada:** South America (São Paulo), `sa-east-1`. Criar o projeto é ação com custo e não foi feita aqui.

---

## 4. O que falta provar (exige banco real)

Rodar as migrations num Postgres e tentar violar cada regra com três sessões distintas:

| Cenário | Resultado esperado |
|---|---|
| Membro faz `update group_memberships set role='leader'` na própria linha | recusado pelo trigger |
| Membro insere membership com `role='leader'` | recusado pela policy e pelo trigger |
| Membro insere linha em `app_admins` | recusado (sem policy de escrita) |
| Membro lê membership de outro grupo | zero linhas |
| Líder chama `admin_set_group_role` | recusado (não é admin) |
| Líder lê membros de grupo alheio | zero linhas |
| Admin chama `admin_set_group_role` | sucesso + linha em `admin_audit_log` |
| Membership `removed` | perde acesso ao grupo |

Sem Docker não há como executar isso nesta máquina. É a primeira tarefa da Execution 03.
