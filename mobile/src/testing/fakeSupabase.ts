/**
 * Cliente Supabase falso para testes da camada de serviço.
 *
 * Serve para provar o comportamento do CLIENTE (o que ele envia, como trata erro,
 * por onde passa a mudança de papel). NÃO prova RLS: política só se prova contra
 * um Postgres real, e isso está marcado como NOT TESTED no relatório.
 */
export type RecordedCall = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  payload?: unknown;
  filters: { column: string; value: unknown }[];
};

type TableResult = { data?: unknown; error?: unknown };

export type FakeSupabase = {
  client: {
    auth: Record<string, jest.Mock>;
    from: jest.Mock;
    rpc: jest.Mock;
  };
  calls: RecordedCall[];
  rpcCalls: { fn: string; args: unknown }[];
  setTableResult: (table: string, result: TableResult) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
};

export function createFakeSupabase(): FakeSupabase {
  const calls: RecordedCall[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  const results = new Map<string, TableResult>();
  let user: { id: string; email?: string } | null = { id: 'user-1', email: 'pessoa@exemplo.com' };

  function builder(table: string) {
    const call: RecordedCall = { table, op: 'select', filters: [] };
    calls.push(call);

    const result = () => {
      const configured = results.get(table) ?? { data: null };
      return { data: configured.data ?? null, error: configured.error ?? null };
    };

    const chain: Record<string, unknown> = {
      select: (_columns?: string) => chain,
      insert: (payload: unknown) => {
        call.op = 'insert';
        call.payload = payload;
        return chain;
      },
      update: (payload: unknown) => {
        call.op = 'update';
        call.payload = payload;
        return chain;
      },
      delete: () => {
        call.op = 'delete';
        return chain;
      },
      eq: (column: string, value: unknown) => {
        call.filters.push({ column, value });
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => result(),
      single: async () => result(),
      // Uma consulta sem maybeSingle/single é aguardada diretamente.
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  }

  const client = {
    auth: {
      signInWithOtp: jest.fn(async () => ({ data: {}, error: null })),
      verifyOtp: jest.fn(async () => ({
        data: { session: { user, access_token: 'token' } },
        error: null,
      })),
      getSession: jest.fn(async () => ({ data: { session: user ? { user } : null }, error: null })),
      getUser: jest.fn(async () => ({ data: { user }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    from: jest.fn((table: string) => builder(table)),
    rpc: jest.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      const configured = results.get(`rpc:${fn}`) ?? {};
      return { data: configured.data ?? null, error: configured.error ?? null };
    }),
  };

  return {
    client,
    calls,
    rpcCalls,
    setTableResult: (table, result) => results.set(table, result),
    setUser: (next) => {
      user = next;
    },
  };
}
