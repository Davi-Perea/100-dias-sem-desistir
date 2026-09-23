/**
 * Correções do grupo G6c (nuvem, conteúdo e configuração).
 * Cada teste guarda um achado da auditoria; o id está no nome.
 *
 * O que NÃO se prova aqui: RLS (só num Postgres real, ver supabase/tests/*.sql)
 * nem o SecureStore nativo (o mock abaixo reproduz a validação de chave do
 * expo-secure-store 57, que é exatamente o que quebrava o login).
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import aesjs from 'aes-js';
import { render, screen, waitFor } from '@testing-library/react-native';
import { createElement } from 'react';

import appConfig, { assertContactForStore, assertRightsForStore } from '../../app.config';
import { _setSupabaseClientForTests } from '@/cloud/client';
import { _setCloudConfigForTests, cloudAllowedInThisBuild, getCloudConfig, isCloudConfigured } from '@/cloud/config';
import { classifyError } from '@/cloud/errors';
import { getEffectiveRole, getMyMembership } from '@/cloud/groups';
import { decrypt, encrypt, secureKeyName, secureSessionStorage } from '@/cloud/secureStorage';

const MOBILE = path.join(__dirname, '..', '..');

/* ------------------------------------------------------------------ mocks */

// Reproduz a validação do expo-secure-store 57.0.3 (build/SecureStore.js: /^[\w.-]+$/).
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => {
  const check = (key: string) => {
    if (!/^[\w.-]+$/.test(key)) throw new Error('Invalid key provided to SecureStore.');
  };
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key: string) => {
      check(key);
      return mockSecure.get(key) ?? null;
    }),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      check(key);
      mockSecure.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      check(key);
      mockSecure.delete(key);
    }),
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytes: (size: number) => new Uint8Array(jest.requireActual('crypto').randomBytes(size)),
}));

const mockSession: {
  role: 'none' | 'member' | 'leader' | 'admin';
  membership: null | { group: { id: string; name: string }; role: 'member' | 'leader' };
} = { role: 'none', membership: null };
const mockMembers = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: 'grupo-b' }),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), SafeAreaView: View, SafeAreaProvider: View };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/journey/useJourney', () => ({ useJourney: () => ({ officialDay: 5 }) }));
jest.mock('@/community/communityState', () => ({
  getGroupProgress: () => ({ status: 'offline' }),
  collectiveNotice: () => 'Progresso do grupo indisponível.',
}));
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: true,
    loading: false,
    session: { user: { id: 'eu' } },
    signedIn: true,
    role: mockSession.role,
    membership: mockSession.membership,
    degraded: false,
    refresh: () => {},
  }),
}));
jest.mock('@/cloud/groups', () => {
  const actual = jest.requireActual('@/cloud/groups');
  return { ...actual, listGroupMembers: (...args: unknown[]) => mockMembers(...args), removeGroupMember: jest.fn() };
});

beforeEach(async () => {
  mockSecure.clear();
  await AsyncStorage.clear();
});

afterEach(() => {
  _setCloudConfigForTests(null);
  _setSupabaseClientForTests(null);
});

/* ------------------------------------------------------- SEC-01 / PER-07 */

describe('SEC-01: a chave do SecureStore é aceita pelo expo-secure-store', () => {
  const SUPABASE_KEY = 'sb-abcdefgh-auth-token';

  test('o nome da chave casa com /^[\\w.-]+$/, sem dois-pontos', () => {
    expect(secureKeyName(SUPABASE_KEY)).toMatch(/^[\w.-]+$/);
    expect(secureKeyName(SUPABASE_KEY)).not.toContain(':');
    // Qualquer caractere fora do permitido vira "_", nunca exceção.
    expect(secureKeyName('a:b/c d')).toMatch(/^[\w.-]+$/);
  });

  test('gravar, ler e apagar a sessão passa pelo SecureStore real (validado) sem lançar', async () => {
    const session = JSON.stringify({ access_token: 'x'.repeat(900), refresh_token: 'r'.repeat(40) });
    await expect(secureSessionStorage.setItem(SUPABASE_KEY, session)).resolves.toBeUndefined();
    await expect(secureSessionStorage.getItem(SUPABASE_KEY)).resolves.toBe(session);
    await secureSessionStorage.removeItem(SUPABASE_KEY);
    expect(mockSecure.size).toBe(0);
    await expect(secureSessionStorage.getItem(SUPABASE_KEY)).resolves.toBeNull();
  });
});

describe('PER-07/SEC-11: contador aleatório por gravação', () => {
  test('duas gravações do mesmo texto saem com contador e cifra diferentes', async () => {
    const a = await encrypt('k', 'mesma sessão');
    const b = await encrypt('k', 'mesma sessão');
    expect(a).toMatch(/^v2:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(a.split(':')[1]).not.toBe(b.split(':')[1]);
    expect(a.split(':')[2]).not.toBe(b.split(':')[2]);
    await expect(decrypt('k', a)).resolves.toBe('mesma sessão');
    await expect(decrypt('k', b)).resolves.toBe('mesma sessão');
  });

  test('o formato antigo (hex puro, contador fixo em 1) continua legível', async () => {
    await encrypt('k', 'cria a chave');
    const key = aesjs.utils.hex.toBytes(mockSecure.get(secureKeyName('k'))!);
    const legacy = aesjs.utils.hex.fromBytes(
      new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1)).encrypt(aesjs.utils.utf8.toBytes('sessão antiga')),
    );
    await expect(decrypt('k', legacy)).resolves.toBe('sessão antiga');
  });

  test('toda gravação nova sai no formato v2', async () => {
    await secureSessionStorage.setItem('k', 'nova');
    expect(await AsyncStorage.getItem('k')).toMatch(/^v2:/);
  });

  test('texto cifrado adulterado vira "sem sessão", sem quebrar', async () => {
    await secureSessionStorage.setItem('k', 'x');
    await AsyncStorage.setItem('k', 'v2:zz:qq');
    await expect(secureSessionStorage.getItem('k')).resolves.toBeNull();
    expect(await AsyncStorage.getItem('k')).toBeNull();
  });
});

/* ---------------------------------------------------------- SEC-04 / D-6 */

describe('SEC-04/D-6: nuvem desligada à força em build de release', () => {
  const globals = globalThis as unknown as { __DEV__: boolean };
  const original = globals.__DEV__;
  afterEach(() => {
    globals.__DEV__ = original;
  });

  test('sem exclusão de conta, release não permite nuvem; desenvolvimento permite', () => {
    expect(cloudAllowedInThisBuild(false)).toBe(false);
    expect(cloudAllowedInThisBuild(true)).toBe(true);
  });

  test('com __DEV__ falso, nem configuração válida liga a nuvem', () => {
    _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
    expect(isCloudConfigured()).toBe(true);
    globals.__DEV__ = false;
    expect(getCloudConfig()).toBeNull();
    expect(isCloudConfigured()).toBe(false);
  });
});

/* ---------------------------------------------------------------- SEC-06 */

function fakeClient(options: {
  userError?: unknown;
  memberships?: unknown[];
  profiles?: unknown[];
}) {
  const calls: { table: string; select?: string; filters: [string, string, unknown][] }[] = [];
  const client = {
    auth: {
      getUser: jest.fn(async () =>
        options.userError
          ? { data: { user: null }, error: options.userError }
          : { data: { user: { id: 'eu' } }, error: null },
      ),
    },
    from: jest.fn((table: string) => {
      const call = { table, select: undefined as string | undefined, filters: [] as [string, string, unknown][] };
      calls.push(call);
      const data = table === 'profiles' ? options.profiles ?? [] : options.memberships ?? [];
      const chain: Record<string, unknown> = {
        select: (columns: string) => {
          call.select = columns;
          return chain;
        },
        eq: (column: string, value: unknown) => {
          call.filters.push(['eq', column, value]);
          return chain;
        },
        in: (column: string, value: unknown) => {
          call.filters.push(['in', column, value]);
          return chain;
        },
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
      };
      return chain;
    }),
  };
  _setCloudConfigForTests({ url: 'https://projeto.supabase.co', anonKey: 'anon-key' });
  _setSupabaseClientForTests(client as unknown as SupabaseClient);
  return { client, calls };
}

describe('SEC-06: sem internet o papel não vira "none" em silêncio', () => {
  const offline = { name: 'AuthRetryableFetchError', message: 'Network request failed', status: 0 };

  test('getUser com erro de rede faz getEffectiveRole e getMyMembership lançarem "offline"', async () => {
    fakeClient({ userError: offline });
    await expect(getEffectiveRole()).rejects.toMatchObject({ code: 'offline' });
    await expect(getMyMembership()).rejects.toMatchObject({ code: 'offline' });
  });

  test('sem sessão de verdade continua "none", sem lançar', async () => {
    fakeClient({ userError: { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 } });
    await expect(getEffectiveRole()).resolves.toBe('none');
    await expect(getMyMembership()).resolves.toBeNull();
  });
});

/* ---------------------------------------------------------------- SEC-07 */

describe('SEC-07: "código inválido" só no fluxo de código por e-mail', () => {
  test('uuid malformado de deep link (22P02) vira "não encontrado"', () => {
    expect(classifyError({ code: '22P02', message: 'invalid input syntax for type uuid: "abc"' }).code).toBe('not_found');
  });

  test('JWT vencido numa consulta de dados vira "sessão terminou"', () => {
    expect(classifyError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('session_expired');
    expect(classifyError({ status: 401 }).code).toBe('session_expired');
  });

  test('código errado no verifyOtp continua "código inválido ou expirado"', () => {
    expect(classifyError({ message: 'Token has expired or is invalid', status: 401 }, 'auth').code).toBe(
      'invalid_or_expired_code',
    );
  });

  test('códigos do Postgres vêm antes da palavra da mensagem', () => {
    expect(classifyError({ code: '42501', message: 'invalid permission' }).code).toBe('not_authorized');
    expect(classifyError({ code: '42501', message: 'invalid permission' }, 'auth').code).toBe('not_authorized');
  });

  test('rede fora do auth-js vira "offline"', () => {
    expect(classifyError({ name: 'AuthRetryableFetchError', message: '{}', status: 0 }).code).toBe('offline');
  });
});

/* ---------------------------------------------------------------- SEC-12 */

describe('SEC-12: lista de membros sem embed e só com as colunas liberadas', () => {
  test('memberships e nomes em duas consultas; de profiles só user_id e display_name', async () => {
    const { calls } = fakeClient({
      memberships: [
        { group_id: 'g', user_id: 'a', role: 'leader', status: 'active', joined_at: '' },
        { group_id: 'g', user_id: 'b', role: 'member', status: 'active', joined_at: '' },
      ],
      profiles: [
        { user_id: 'a', display_name: 'Ana' },
        { user_id: 'b', display_name: 'Beto' },
      ],
    });
    const rows = await jest.requireActual<typeof import('@/cloud/groups')>('@/cloud/groups').listGroupMembers('g');
    expect(rows.map((r) => r.profile?.display_name)).toEqual(['Ana', 'Beto']);
    const membershipCall = calls.find((c) => c.table === 'group_memberships');
    expect(membershipCall?.select).not.toMatch(/profiles/);
    const profileCall = calls.find((c) => c.table === 'profiles');
    expect(profileCall?.select).toBe('user_id, display_name');
    expect(profileCall?.filters).toEqual([['in', 'user_id', ['a', 'b']]]);
  });
});

describe('SEC-12: tela do grupo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GroupScreen = require('@/app/grupo/[id]').default as () => null;
  const ownRow = { group_id: 'grupo-b', user_id: 'eu', role: 'member', status: 'active', joined_at: '', profile: { user_id: 'eu', display_name: 'Eu' } };

  test('membro comum não vê "1 membro" nem a própria linha como se fosse o grupo', async () => {
    mockSession.role = 'member';
    mockSession.membership = { group: { id: 'grupo-b', name: 'Grupo B' }, role: 'member' };
    mockMembers.mockResolvedValue([ownRow]);
    mockMembers.mockClear();
    await render(createElement(GroupScreen));
    await waitFor(() => expect(mockMembers).toHaveBeenCalled());
    expect(screen.queryByText(/1 membro/)).toBeNull();
    expect(screen.queryByTestId('leader-tools')).toBeNull();
  });

  test('quem lidera o grupo A não ganha ferramentas de líder no grupo B', async () => {
    mockSession.role = 'leader';
    mockSession.membership = { group: { id: 'grupo-a', name: 'Grupo A' }, role: 'leader' };
    mockMembers.mockResolvedValue([ownRow]);
    mockMembers.mockClear();
    await render(createElement(GroupScreen));
    await waitFor(() => expect(mockMembers).toHaveBeenCalled());
    expect(screen.queryByTestId('leader-tools')).toBeNull();
    expect(screen.queryByText(/você lidera este grupo/)).toBeNull();
  });

  test('o líder deste grupo vê a contagem real e não recebe "Remover" na própria linha', async () => {
    mockSession.role = 'leader';
    mockSession.membership = { group: { id: 'grupo-b', name: 'Grupo B' }, role: 'leader' };
    mockMembers.mockResolvedValue([
      { ...ownRow, role: 'member' },
      { group_id: 'grupo-b', user_id: 'outra', role: 'member', status: 'active', joined_at: '', profile: { user_id: 'outra', display_name: 'Outra' } },
    ]);
    mockMembers.mockClear();
    await render(createElement(GroupScreen));
    await waitFor(() => expect(screen.getByText(/2 membros/)).toBeTruthy());
    expect(screen.getByText(/você lidera este grupo/)).toBeTruthy();
    expect(screen.queryByTestId('remove-eu')).toBeNull();
  });
});

/* ------------------------------------------------------------- DIR-02..06 */

function runConverter(args: string[]): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [path.join(MOBILE, 'scripts', 'convert-100-dias.mjs'), ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

function tempRights(reference: string | null): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rights-')), 'rights.json');
  fs.writeFileSync(
    file,
    JSON.stringify({ rights_status: 'authorized', rights_reference: reference, leader_names_authorized: false }),
  );
  return file;
}

describe('DIR-02: nome de quem autorizou não vai para o bundle', () => {
  test('o exemplo antigo (frase com tratamento e nome) é recusado', () => {
    const result = runConverter(['--check', '--rights', tempRights('E-mail da Pra. Fulana em 2026-09-25')]);
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/identificador neutro/);
  });

  test('identificador que traz um nome da escala é recusado', () => {
    // Nenhum nome escrito no teste: o primeiro nome vem da coluna "Autor no arquivo" do
    // README das fontes (a mesma pessoa aparece na escala).
    const readme = fs.readFileSync(path.join(MOBILE, 'content', 'source', 'README.md'), 'utf8');
    const author = readme.match(/\| (\p{L}+) \p{L}+ \| 2026-08-28 \|/u)?.[1];
    expect(author).toBeTruthy();
    const leaderWord = author!.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const result = runConverter(['--check', '--rights', tempRights(`autorizacao-${leaderWord}-2026`)]);
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/nome que aparece na escala/);
  });

  test('tratamento sozinho também é recusado', () => {
    const result = runConverter(['--check', '--rights', tempRights('email-pra-2026-09-25')]);
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/tratamento de pessoa/);
  });

  test('identificador neutro passa da validação (o check só acusa que o dataset não foi regenerado)', () => {
    const result = runConverter(['--check', '--rights', tempRights('autorizacao-2026-09-25')]);
    expect(result.out).not.toMatch(/rights_reference/);
    expect(result.out).toMatch(/DESATUALIZADO/);
  });

  test('o exemplo de rights.json não traz mais nome de pessoa', () => {
    const rights = fs.readFileSync(path.join(MOBILE, 'content', '100-dias-2026', 'rights.json'), 'utf8');
    expect(rights).not.toMatch(/\bPra?s?\.\s/);
    expect(rights).toMatch(/autorizacao-2026-09-25/);
  });
});

describe('DIR-03: fim de linha fixo no conteúdo derivado', () => {
  test('.gitattributes força LF nos JSON de conteúdo e trata .docx como binário', () => {
    const attrs = fs.readFileSync(path.join(MOBILE, '.gitattributes'), 'utf8');
    expect(attrs).toMatch(/^content\/\*\*\/\*\.json text eol=lf$/m);
    expect(attrs).toMatch(/^\*\.docx binary$/m);
  });

  test('o --check do conteúdo versionado passa', () => {
    expect(runConverter(['--check']).code).toBe(0);
  });
});

describe('DIR-04/05/06: o README diz a verdade', () => {
  const readme = fs.readFileSync(path.join(MOBILE, 'content', 'source', 'README.md'), 'utf8');

  test('DIR-04: nomes de líderes não são gerados no dataset sem autorização', () => {
    expect(readme).not.toMatch(/Eles ficam no dataset/);
    expect(readme).toMatch(/não os gera/);
  });

  test('DIR-05: a orientação vira proposito.json e vai inteira para o bundle', () => {
    expect(readme).not.toMatch(/não vira dataset/);
    expect(readme).toMatch(/proposito\.json/);
  });

  test('DIR-06: o README não promete que o --require-authorized está ligado a um build', () => {
    expect(readme).not.toMatch(/o portão de\s+produção bloqueia builds de loja/);
    expect(readme).toMatch(/não\*\* está\s+ligado a nenhum script/);
  });

  /**
   * Em 23/09/2026 a igreja autorizou e o dataset embarcado virou "authorized",
   * então o projeto real passa a PASSAR neste portão. A prova de que o portão
   * ainda barra é feita com um dataset pendente construído aqui — assim ela não
   * depende da situação de direitos do dia.
   */
  test('DIR-06: a variante production recusa gerar config com dataset pendente', () => {
    const pendente = fs.mkdtempSync(path.join(os.tmpdir(), 'store-pendente-'));
    fs.mkdirSync(path.join(pendente, 'content', '100-dias-2026'), { recursive: true });
    fs.writeFileSync(
      path.join(pendente, 'content', '100-dias-2026', 'dataset.json'),
      JSON.stringify({ provenance: { rights_status: 'pending_authorization', rights_reference: null } }),
    );
    expect(() => assertRightsForStore(pendente)).toThrow(/rights_status "pending_authorization"/);

    const autorizado = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
    fs.mkdirSync(path.join(autorizado, 'content', '100-dias-2026'), { recursive: true });
    fs.writeFileSync(
      path.join(autorizado, 'content', '100-dias-2026', 'dataset.json'),
      JSON.stringify({ provenance: { rights_status: 'authorized', rights_reference: 'autorizacao-2026-09-25' } }),
    );
    expect(() => assertRightsForStore(autorizado)).not.toThrow();
  });

  test('DIR-06: o projeto real, já autorizado, passa no portão de direitos', () => {
    expect(() => assertRightsForStore(MOBILE)).not.toThrow();
  });

  test('1.5 / 5.1.1(i): a variante production recusa gerar config sem e-mail de suporte e URL https da política', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contato-'));
    fs.mkdirSync(path.join(root, 'src', 'config'), { recursive: true });
    const file = path.join(root, 'src', 'config', 'contato.ts');
    const write = (email: string, url: string) =>
      fs.writeFileSync(
        file,
        `export const SUPPORT_EMAIL: string | null = ${email};\nexport const PRIVACY_URL: string | null = ${url};\n`,
      );
    write('null', 'null');
    expect(() => assertContactForStore(root)).toThrow(/SUPPORT_EMAIL .* e PRIVACY_URL/);
    write("'contato@exemplo.org'", 'null');
    expect(() => assertContactForStore(root)).toThrow(/PRIVACY_URL \(https\)/);
    write("'contato@exemplo.org'", "'http://exemplo.org/privacidade'");
    expect(() => assertContactForStore(root)).toThrow(/PRIVACY_URL/);
    write('null', "'https://exemplo.org/privacidade'");
    expect(() => assertContactForStore(root)).toThrow(/SUPPORT_EMAIL/);
    write("'contato@exemplo.org'", "'https://exemplo.org/privacidade'");
    expect(() => assertContactForStore(root)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ R1-5 */

describe('R1-5: sem backup de sistema para o que "fica neste aparelho"', () => {
  const config = () =>
    appConfig({ config: {}, projectRoot: MOBILE, staticConfigPath: null, packageJsonPath: null } as never);

  test('android.allowBackup é false', () => {
    expect(config().android?.allowBackup).toBe(false);
  });

  /**
   * Auditoria externa de 2026-09-23: a tela Privacidade promete que reflexão,
   * jejum, marcações e progresso ficam só no aparelho, e o Android já era
   * barrado — faltava o iPhone estar barrado por escrito.
   *
   * O AsyncStorage 2.2.0 exclui o próprio diretório do backup por padrão
   * (ios/RNCAsyncStorage.mm: sem a chave no Info.plist, assume YES). Este teste
   * existe porque a promessa de uma tela do app não pode depender do padrão de
   * uma biblioteca de terceiro: se alguém remover a chave, a falha aparece aqui
   * e não num aparelho de alguém.
   */
  test('ios.infoPlist exclui o AsyncStorage do backup do iCloud', () => {
    expect(config().ios?.infoPlist?.RCTAsyncStorageExcludeFromBackup).toBe(true);
  });
});
