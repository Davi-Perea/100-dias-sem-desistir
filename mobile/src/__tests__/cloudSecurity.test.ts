import fs from 'fs';
import path from 'path';

import { _setCloudConfigForTests, assertNotServiceRoleKey, getCloudConfig, isCloudConfigured } from '@/cloud/config';

const SRC = path.join(__dirname, '..');
const MOBILE = path.join(__dirname, '..', '..');

/** Código de produção apenas: os testes citam os padrões proibidos para poder auditá-los. */
const EXCLUDED_DIRS = new Set(['__tests__', 'testing']);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

afterEach(() => _setCloudConfigForTests(null));

describe('configuração da nuvem é opcional', () => {
  test('sem variáveis de ambiente o app roda em modo local', () => {
    _setCloudConfigForTests(null);
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(getCloudConfig()).toBeNull();
    expect(isCloudConfigured()).toBe(false);
  });

  test('placeholders do .env.example não contam como configuração', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'cole-aqui-a-anon-key';
    expect(isCloudConfigured()).toBe(false);
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  test('configuração parcial não habilita a nuvem', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://projeto.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(isCloudConfigured()).toBe(false);
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  });
});

describe('chave service_role nunca vai para o cliente', () => {
  const makeJwt = (payload: object) =>
    ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64'), 'assinatura'].join('.');

  test('recusa uma chave cujo payload diz service_role', () => {
    expect(() => assertNotServiceRoleKey(makeJwt({ role: 'service_role' }))).toThrow(/service_role/);
  });

  test('aceita a chave anônima', () => {
    expect(() => assertNotServiceRoleKey(makeJwt({ role: 'anon' }))).not.toThrow();
  });

  test('chave que não é JWT passa sem falso positivo', () => {
    expect(() => assertNotServiceRoleKey('sb_publishable_abc123')).not.toThrow();
  });
});

describe('nenhum segredo no repositório', () => {
  test('nenhum arquivo de código traz chave, URL de projeto ou service_role', () => {
    for (const file of sourceFiles(SRC)) {
      const source = fs.readFileSync(file, 'utf8');
      // Um projeto Supabase real tem host <ref>.supabase.co com 20 letras.
      expect(source).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/);
      // JWT literal embutido.
      expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/);
      // Nome da variável de service role jamais é lido no cliente.
      expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE|service_role_key/i);
    }
  });

  test('o app lê apenas as variáveis públicas', () => {
    const config = fs.readFileSync(path.join(SRC, 'cloud', 'config.ts'), 'utf8');
    const envReads = [...config.matchAll(/process\.env\[?['"]?([A-Z_]+)/g)].map((m) => m[1]);
    for (const name of envReads) {
      expect(name.startsWith('EXPO_PUBLIC_')).toBe(true);
    }
  });

  test('.env.example existe, é o único versionado e não contém chave real', () => {
    const example = fs.readFileSync(path.join(MOBILE, '.env.example'), 'utf8');
    expect(example).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(example).toMatch(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}/);
    expect(example).toMatch(/service_role NUNCA entra no cliente/);
  });

  test('.gitignore cobre arquivos .env preenchidos', () => {
    const rootIgnore = fs.readFileSync(path.join(MOBILE, '..', '.gitignore'), 'utf8');
    expect(rootIgnore).toMatch(/^\.env$/m);
    expect(rootIgnore).toMatch(/^\.env\.\*$/m);
    expect(rootIgnore).toMatch(/^!\.env\.example$/m);
  });
});

describe('sessão guardada com proteção', () => {
  test('o storage da sessão usa SecureStore para a chave e limpa tudo no logout', () => {
    const storage = fs.readFileSync(path.join(SRC, 'cloud', 'secureStorage.ts'), 'utf8');
    expect(storage).toMatch(/SecureStore\.setItemAsync/);
    expect(storage).toMatch(/WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
    // removeItem apaga o texto cifrado E a chave.
    const removeItem = storage.match(/async removeItem[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(removeItem).toMatch(/AsyncStorage\.removeItem/);
    expect(removeItem).toMatch(/SecureStore\.deleteItemAsync/);
  });

  test('o cliente não expõe sessão na URL (sem fluxo OAuth nesta execução)', () => {
    const client = fs.readFileSync(path.join(SRC, 'cloud', 'client.ts'), 'utf8');
    expect(client).toMatch(/detectSessionInUrl: false/);
  });
});
