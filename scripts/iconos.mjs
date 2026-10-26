// Renderiza public/icons/icono.svg a los PNG del manifiesto (usa el Chromium de Playwright).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright no es dependencia del proyecto: se usa el instalado globalmente.
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync('public/icons/icono.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const salidas = [
  ['public/icons/icono-192.png', 192, 0],
  ['public/icons/icono-512.png', 512, 0],
  ['public/icons/apple-touch-icon.png', 180, 0],
  ['public/icons/icono-maskable-512.png', 512, 0.12],
];
for (const [ruta, tam, margen] of salidas) {
  await page.setViewportSize({ width: tam, height: tam });
  const pad = Math.round(tam * margen);
  await page.setContent(
    `<body style="margin:0;background:#080d13"><div style="width:${tam}px;height:${tam}px;padding:${pad}px;box-sizing:border-box">${svg.replace('<svg ', `<svg width="${tam - 2 * pad}" height="${tam - 2 * pad}" `)}</div></body>`,
  );
  await page.screenshot({ path: ruta, omitBackground: false });
  console.log(ruta);
}
await browser.close();
