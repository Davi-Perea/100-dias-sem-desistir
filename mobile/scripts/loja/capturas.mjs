// Capturas de tela para a App Store (iPhone 6,9": 1320x2868). SÓ PREPARADO: ainda NÃO foi rodado.
//
// PROVISÓRIO (decisão do engenheiro, 2026-09-21: sem Mac não há Simulador de iOS; a versão web do mesmo código
// React Native é o caminho mais rápido para 5 capturas no tamanho exigido. Trocar por capturas do aparelho/
// Simulador quando houver).
//
// ─── QUANDO PODE RODAR ────────────────────────────────────────────────────────────────────────────────────────
// Só DEPOIS da autorização escrita da igreja (content/100-dias-2026/rights.json → npm run content:convert,
// rights_status = "authorized"). O portão é o dataset: o script confere `rights_status` antes de abrir o
// navegador e se recusa a rodar sem autorização.
//
// ATENÇÃO (2026-09-22, feedback do fundador): a faixa de "aguardando autorização" NÃO aparece mais em tela —
// ela virou uma linha discreta no fim de Ajustes (DevContentBanner só desenha no estado `fixture`). Então a
// conferência de `content-banner` abaixo não protege mais contra conteúdo não autorizado; quem protege é o
// `rights_status` acima. O que ela ainda pega é uma captura feita por engano com as fixtures DEV_ONLY, que
// continuam avisadas — por isso ela fica.
//
// ─── COMO RODAR ───────────────────────────────────────────────────────────────────────────────────────────────
// 1. puppeteer-core fica FORA do projeto (não entra no package.json). Numa pasta temporária:
//      mkdir $env:TEMP\capturas; cd $env:TEMP\capturas; npm init -y; npm install puppeteer-core
// 2. Em outra janela, de mobile/:   npx expo start --web     (porta 8081)
// 3. De mobile/:
//      $env:PUPPETEER_DIR="$env:TEMP\capturas"; node scripts/loja/capturas.mjs
//    Opcional: $env:DIA='12' escolhe o dia mostrado (padrão 5). Saída: mobile/capturas-loja/ (não versionar).
//
// ─── O QUE FAZ ────────────────────────────────────────────────────────────────────────────────────────────────
// Abre http://localhost:8081 com viewport 440x956 e deviceScaleFactor 3 (= 1320x2868, tamanho 6,9" aceito pela
// App Store Connect), grava no localStorage um estado pronto (onboarding concluído, leitura no app, dias
// 1..DIA-1 concluídos, dia simulado = DIA; o dia simulado só vale em modo desenvolvimento, que é o do
// `expo start`), e salva 5 PNGs: Jornada, painel de hoje, leitor, intercessão, Você.
// Nada de nome de líder: o estado não escolhe ministério e as capturas mostram só o que o dataset autoriza.
//
// Chaves do localStorage (AsyncStorage na web grava a chave crua; conferido em
// @react-native-async-storage/async-storage 2.2.0, lib/module/AsyncStorage.js, 2026-09-21):
//   settings:v2                         → src/settings/settingsStore.ts (SETTINGS_KEY)
//   completions:v1:<campaign id>        → src/progress/completionsStore.ts (COMPLETIONS_PREFIX)
// Se as rotas ou as chaves mudarem, ajustar ROTAS / estadoInicial abaixo.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizMobile = path.resolve(aqui, '..', '..');
const URL_BASE = process.env.URL_BASE || 'http://localhost:8081';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DIA = Number(process.env.DIA || 5);
const SAIDA = path.join(raizMobile, 'capturas-loja');

// 1) Portão: sem autorização escrita, não roda.
const dataset = JSON.parse(fs.readFileSync(path.join(raizMobile, 'content', '100-dias-2026', 'dataset.json'), 'utf8'));
const status = dataset.provenance?.rights_status;
if (status !== 'authorized') {
  console.error(`Recusado: rights_status = "${status}". As capturas mostrariam a faixa "aguardando autorização".`);
  process.exit(1);
}
const campanhaId = dataset.campaign?.id ?? dataset.id;
if (!campanhaId) throw new Error('não achei o id da campanha no dataset');
if (!Number.isInteger(DIA) || DIA < 1) throw new Error(`DIA inválido: ${process.env.DIA}`);

// 2) puppeteer-core de fora do projeto.
if (!process.env.PUPPETEER_DIR) throw new Error('defina PUPPETEER_DIR (pasta onde o puppeteer-core foi instalado)');
const requireDeFora = createRequire(path.join(process.env.PUPPETEER_DIR, 'package.json'));
const puppeteer = requireDeFora('puppeteer-core');

const agora = new Date().toISOString();
const concluidos = {};
for (let d = 1; d < DIA; d++) concluidos[d] = agora;

const estadoInicial = {
  'settings:v2': JSON.stringify({
    onboardingCompleted: true,
    readingMode: 'in_app',
    lastUsedReadingMode: 'in_app',
    fastingEnabled: false,
    reminder: { slot: 'none', hour: 7, minute: 0 },
    analyticsEnabled: false,
    milestonesSeen: [1, 3, 7], // não abrir tela de marco no meio das capturas
    milestonesKept: [],
    ministry: null,
    altarReminder: false,
    dev: { dayOverride: DIA },
  }),
  [`completions:v1:${campanhaId}`]: JSON.stringify({ days: concluidos, updatedAt: agora }),
};

// Ordem = ordem das capturas na loja.
const ROTAS = [
  ['1-jornada', '/'],
  ['2-hoje', `/dia/${DIA}`],
  ['3-leitor', `/reader/${DIA}`],
  ['4-intercessao', `/intercessao/${DIA}`],
  ['5-voce', '/voce'],
];

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 440, height: 956, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  // Estado gravado na origem certa ANTES do app ler.
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((estado) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(estado)) localStorage.setItem(k, v);
  }, estadoInicial);

  for (const [nome, rota] of ROTAS) {
    await page.goto(URL_BASE + rota, { waitUntil: 'networkidle0', timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 1500)); // fontes e animação de entrada
    // Hoje isto só dispara com fixtures DEV_ONLY (ver o bloco no topo do arquivo).
    const temFaixa = await page.$('[data-testid="content-banner"]');
    if (temFaixa) throw new Error(`${nome}: a faixa de conteúdo fictício apareceu; captura não serve para a loja`);
    const arquivo = path.join(SAIDA, `${nome}.png`);
    await page.screenshot({ path: arquivo, type: 'png' });
    const b = fs.readFileSync(arquivo);
    console.log(`${nome}.png: ${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`);
  }
} finally {
  await browser.close();
}
console.log(`Pronto: ${SAIDA}. Conferir cada imagem à mão antes de enviar (texto da igreja, sem nome de líder).`);
