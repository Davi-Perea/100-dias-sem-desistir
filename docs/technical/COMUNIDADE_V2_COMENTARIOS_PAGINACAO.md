# Paginação dos comentários — pendência de servidor

Aberto em 23/09/2026, pela auditoria externa. Estado: **BLOQUEADO POR SERVIDOR**.

## O problema, medido no código

`private.community_post_comments(target_post uuid)`
(`mobile/supabase/migrations/20260921130100_comunidade_funcoes.sql:576`) termina assim:

```sql
  order by c.created_at asc, c.id asc
  limit 200;
```

Sem cursor. Sem `before`/`after`. Sem total.

Consequência real: num post com 250 comentários, os 50 mais novos **não existem**
para o app. A pessoa que comentou por último não vê o próprio comentário. E até
23/09 nada na tela dizia isso — era um corte silencioso.

A auditoria externa descreveu este achado como "o app baixa todos os comentários".
Não é bem isso: o payload é limitado a 200. O defeito verdadeiro é outro e é pior,
porque some com conteúdo sem avisar.

## O que já foi feito no app (23/09)

1. As duas listas de comentários viraram `FlatList`: a folha do feed
   (`sheets/CommentsSheet.tsx`) e a tela cheia (`feed/CommentsScreen.tsx`).
   Antes eram `items.map` dentro de um `ScrollView`, com todas as linhas
   montadas ao mesmo tempo.
2. Quando a lista chega em `COMMENTS_SERVER_LIMIT` (`community/types.ts`), a tela
   escreve, embaixo da conversa: "Esta conversa passou de 200 comentários. Por
   enquanto o app mostra os 200 primeiros." Não é solução — é parar de mentir.

**O que NÃO foi feito, de propósito:** baixar tudo e fatiar no aparelho. Isso
fingiria escala e pioraria o payload.

## O que o servidor precisa expor

Uma função nova, no mesmo padrão de `community_feed` (que já é keyset):

```sql
create or replace function private.community_post_comments_page(
  target_post   uuid,
  after_created timestamptz default null,  -- cursor: o created_at do último lido
  after_comment uuid        default null,  -- desempate estável do cursor
  page_size     int         default 50
)
returns table (
  comment_id uuid, body text, status text, created_at timestamptz,
  author_name text, is_mine boolean
)
```

Requisitos:

- **Mesmo recorte de visibilidade** da função atual, sem exceção: `can_view_post`,
  o próprio autor vê os seus em qualquer estado, os dos outros só `published` com
  o perfil `active`, e nada de quem tem bloqueio nos dois sentidos
  (`blocked_between`). Este recorte é regra de moderação — não pode ser relaxado
  em nome de paginar.
- **Ordem estável**: `order by created_at asc, id asc`, a mesma de hoje, senão o
  cursor pula ou repete linhas.
- **Keyset, não OFFSET**: `where (created_at, id) > (after_created, after_comment)`.
  OFFSET degrada e duplica quando chega comentário novo no meio.
- `page_size` limitado no servidor (sugestão: teto de 50), nunca vindo do cliente
  sem trava.
- `security definer`, `set search_path = ''`, `revoke ... from public, anon` e
  `grant execute ... to authenticated`, como todas as outras.
- Espelho em `public.community_post_comments_page` chamando a `private`.
- Índice conferido: `community_comments (post_id, created_at, id)`.

E o mesmo para o Amém dos comentários (`community_comment_amens`), que hoje é
buscado de uma vez para o post inteiro: precisa aceitar a lista de ids da página
em vez do post.

## Do lado do app, quando existir

- `postComments(postId, cursor)` em `community/api.ts` devolvendo
  `{ items, nextCursor, ended }`, como `fetchFeedPage` já faz.
- `useComments` acumulando páginas, com o mesmo `onEndReached`/botão que o feed usa.
- A `FlatList` já está no lugar: não precisa mexer na tela.
- Apagar o aviso de teto e o `COMMENTS_SERVER_LIMIT`.

## Por que isso não bloqueia a V1

A V1 vai para as lojas **sem** o Juntos. Nenhuma linha disto roda com
`COMMUNITY_ENABLED = false`. Isto entra na lista do dia em que a Comunidade for
ligada — junto com o servidor, o filtro de imagem e a exclusão de conta.
