import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMMUNITY_PHOTOS_ENABLED } from '@/config/features';

/**
 * Decisões de lançamento do Juntos (fundador, 2026-09-23): sai hoje como texto +
 * comentários. A foto espera o filtro automático de imagem.
 *
 * Estes testes guardam o que NÃO pode ser afrouxado junto.
 */
const fonte = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

describe('foto desligada até existir filtro automático de imagem', () => {
  test('a chave está desligada', () => {
    expect(COMMUNITY_PHOTOS_ENABLED).toBe(false);
  });

  test('sem a chave, Galeria e Câmera não existem na tela de publicar', () => {
    const s = fonte('app', 'comunidade', 'publicar.tsx');
    // Os dois botões vivem dentro do spread condicional, não soltos na lista.
    expect(s).toMatch(/\.\.\.\(COMMUNITY_PHOTOS_ENABLED/);
    const bloco = s.slice(s.indexOf('...(COMMUNITY_PHOTOS_ENABLED'), s.indexOf('] as AttachButton[])'));
    expect(bloco).toMatch(/'Galeria'/);
    expect(bloco).toMatch(/'Câmera'/);
  });

  test('sem a chave, a foto de perfil também some', () => {
    expect(fonte('app', 'comunidade', 'perfil.tsx')).toMatch(/\{COMMUNITY_PHOTOS_ENABLED \? \(/);
  });

  test('o caminho da foto NÃO foi apagado: volta sem reescrever nada', () => {
    const foto = fonte('ui', 'comunidade', 'publicar', 'foto.ts');
    expect(foto).toMatch(/export async function pickManyFromLibrary/);
    expect(foto).toMatch(/export async function takePhoto/);
    expect(foto).toMatch(/export async function preparePhoto/);
    // E as proteções da foto continuam de pé.
    expect(foto).toMatch(/stripJpegMetadata/);
    expect(foto).toMatch(/assertPhotoSafeToUpload/);
  });
});

describe('nada da moderação foi enfraquecido junto', () => {
  test('denunciar e bloquear continuam na folha do feed', () => {
    const s = fonte('ui', 'comunidade', 'sheets', 'ReportSheet.tsx');
    expect(s).toMatch(/report/i);
    expect(s).toMatch(/block|bloque/i);
  });

  test('a fila de moderação continua existindo', () => {
    expect(() => fonte('ui', 'comunidade', 'moderacao', 'ModerationQueueScreen.tsx')).not.toThrow();
    expect(() => fonte('ui', 'comunidade', 'moderacao', 'ModerationEntry.tsx')).not.toThrow();
  });

  test('o filtro de texto continua obrigatório no servidor', () => {
    const sql = readFileSync(
      join(__dirname, '..', '..', 'supabase', 'migrations', '20260921130100_comunidade_funcoes.sql'),
      'utf8',
    );
    expect(sql).toMatch(/community_text_verdict/);
  });

  test('o portão de loja da Comunidade continua no app.config', () => {
    const cfg = readFileSync(join(__dirname, '..', '..', 'app.config.ts'), 'utf8');
    expect(cfg).toMatch(/assertCommunityForStore/);
  });
});

describe('os textos legais estão com os valores reais da igreja', () => {
  const campos = () => {
    const t = fonte('ui', 'comunidade', 'publicar', 'textos.ts');
    return t.slice(t.indexOf('export const CAMPOS'), t.indexOf('export type CampoId'));
  };

  test('nenhum valor de TESTE sobrou no código', () => {
    expect(campos()).not.toContain('TESTE');
    expect(campos()).not.toContain('example.invalid');
  });

  test('os quatro campos que o texto usa estão preenchidos', () => {
    // Só estes quatro entram nos dois documentos (os textos foram encurtados
    // em 22/09). Sem eles, hasOpenFields continua true e ninguém publica.
    const c = campos();
    expect(c).toContain("razaoSocial: 'Primeira Igreja Batista da Lagoinha no Distrito Federal'");
    expect(c).toContain("emailPublicado: 'pereadavi12@gmail.com'");
    expect(c).toContain('politica-de-privacidade');
    expect(c).toContain("dataApagamento: 'a moderação retirar'");
  });

  test('o prazo de denúncia do texto é o mesmo do servidor: 24 horas', () => {
    expect(campos()).toContain("prazoDenuncia: '24 horas'");
    const sql = readFileSync(
      join(__dirname, '..', '..', 'supabase', 'migrations', '20260921130000_comunidade_tabelas.sql'),
      'utf8',
    );
    expect(sql).toContain("('report_due_hours',        '24')");
  });
});
