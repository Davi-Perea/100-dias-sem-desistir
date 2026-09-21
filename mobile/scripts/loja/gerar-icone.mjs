// Gera o ícone PROVISÓRIO tipográfico ("100") a partir de scripts/loja/icone.html.
// PROVISÓRIO (decisão do engenheiro, 2026-09-21: o designer ainda não entregou o ícone; quando entregar,
// trocar os PNGs em assets/icone/ e apagar este script e o HTML).
//
// Uso (de mobile/):  node scripts/loja/gerar-icone.mjs
// Precisa do Google Chrome instalado (caminho abaixo ou variável CHROME) e do pngjs (já vem no
// node_modules como dependência do Expo; não é dependência direta do projeto).
//
// Saída (assets/icone/):
//   icone-ios.png                 1024x1024, RGB SEM canal alfa (a App Store recusa ícone com alfa)
//   android-frente.png            1024x1024 RGBA transparente (foreground do ícone adaptativo)
//   android-monocromo.png         1024x1024 RGBA (Android 13+: ícone temático, só o alfa conta)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizMobile = path.resolve(aqui, '..', '..');
const html = path.join(aqui, 'icone.html');
const destino = path.join(raizMobile, 'assets', 'icone');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LADO = 1024;

fs.mkdirSync(destino, { recursive: true });

function capturar(modo, arquivo) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icone-'));
  const saida = path.join(tmp, 'captura.png');
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files', // a fonte vem de file:// (node_modules)
    '--force-device-scale-factor=1',
    '--virtual-time-budget=3000', // espera a fonte carregar antes de fotografar
    '--default-background-color=00000000',
    `--user-data-dir=${path.join(tmp, 'perfil')}`,
    `--window-size=${LADO},${LADO}`,
    `--screenshot=${saida}`,
    `${pathToFileURL(html).href}#${modo}`,
  ], { stdio: 'ignore' });
  const png = PNG.sync.read(fs.readFileSync(saida));
  fs.rmSync(tmp, { recursive: true, force: true });
  if (png.width !== LADO || png.height !== LADO) {
    throw new Error(`${modo}: captura com ${png.width}x${png.height}, esperado ${LADO}x${LADO}`);
  }
  return png;
}

/** Caixa da "tinta" (pixels escuros e opacos): serve para conferir margem e centralização. */
function caixaDaTinta(png) {
  let x0 = LADO, y0 = LADO, x1 = -1, y1 = -1;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4;
      const escuro = png.data[i] < 80 && png.data[i + 1] < 80 && png.data[i + 2] < 80 && png.data[i + 3] > 128;
      if (escuro) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) throw new Error('nenhuma tinta encontrada: o "100" não foi desenhado');
  return { x0, y0, x1, y1, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

function lerIHDR(arquivo) {
  const b = fs.readFileSync(arquivo);
  const assinatura = b.subarray(0, 8).toString('hex');
  if (assinatura !== '89504e470d0a1a0a' || b.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${arquivo}: não é PNG`);
  const tipos = { 0: 'cinza', 2: 'RGB', 3: 'paleta', 4: 'cinza+alfa', 6: 'RGBA' };
  return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20), bits: b[24], cor: tipos[b[25]] ?? b[25] };
}

// iOS: achata sobre o amarelo e grava como RGB (colorType 2), sem alfa.
const ios = capturar('ios');
const iosCaixa = caixaDaTinta(ios);
const rgb = new PNG({ width: LADO, height: LADO, colorType: 2, inputColorType: 6, inputHasAlpha: true, bgColor: { red: 0xff, green: 0xd1, blue: 0x00 } });
for (let i = 0; i < ios.data.length; i += 4) {
  const a = ios.data[i + 3] / 255;
  rgb.data[i] = Math.round(ios.data[i] * a + 0xff * (1 - a));
  rgb.data[i + 1] = Math.round(ios.data[i + 1] * a + 0xd1 * (1 - a));
  rgb.data[i + 2] = Math.round(ios.data[i + 2] * a + 0x00 * (1 - a));
  rgb.data[i + 3] = 255;
}
fs.writeFileSync(path.join(destino, 'icone-ios.png'), PNG.sync.write(rgb, { colorType: 2 }));

// Android: foreground transparente e monocromo (mesma forma; o sistema usa só o alfa do monocromo).
const android = capturar('android');
const androidCaixa = caixaDaTinta(android);
fs.writeFileSync(path.join(destino, 'android-frente.png'), PNG.sync.write(android));
fs.writeFileSync(path.join(destino, 'android-monocromo.png'), PNG.sync.write(android));

// Zona segura do ícone adaptativo: círculo de 66 dp num quadro de 108 dp → raio 1024*33/108 ≈ 313 px.
const raioSeguro = (LADO * 33) / 108;
const c = LADO / 2;
const cantos = [[androidCaixa.x0, androidCaixa.y0], [androidCaixa.x1, androidCaixa.y0], [androidCaixa.x0, androidCaixa.y1], [androidCaixa.x1, androidCaixa.y1]];
const distMax = Math.max(...cantos.map(([x, y]) => Math.hypot(x - c, y - c)));

for (const nome of ['icone-ios.png', 'android-frente.png', 'android-monocromo.png']) {
  const h = lerIHDR(path.join(destino, nome));
  console.log(`${nome}: ${h.largura}x${h.altura}, ${h.bits} bits, ${h.cor}`);
}
console.log('iOS, caixa do "100":', iosCaixa);
console.log('Android, caixa do "100":', androidCaixa, `canto mais distante do centro: ${distMax.toFixed(0)} px (limite ${raioSeguro.toFixed(0)} px)`);
if (lerIHDR(path.join(destino, 'icone-ios.png')).cor !== 'RGB') throw new Error('icone-ios.png ficou com alfa');
if (distMax > raioSeguro) throw new Error('o "100" do Android sai da zona segura: diminua .android .numero no HTML');
