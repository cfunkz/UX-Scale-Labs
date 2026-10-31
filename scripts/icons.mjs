// Renders the icon set and social preview images from scripts/brand.mjs.
// Needs Playwright and Chromium: run `npm run icons:setup` once, then `npm run icons`.
// The generated files are committed, so this only needs running after changing the logo or scale list.
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCALES, CATEGORIES, STATUS } from '../docs/assets/js/scales.js';
import { iconSVG, markPaths } from './brand.mjs';
import { SITE, ROOT } from './config.mjs';
import { readFileSync } from 'node:fs';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm run icons:setup` once, then `npm run icons` again.');
  process.exit(1);
}

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error('Chromium for Playwright is missing. Run `npx playwright install chromium`, then try again.');
  console.error(err.message.split('\n')[0]);
  process.exit(1);
}
const page = await browser.newPage();

async function png(svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block">`);
  const buf = await page.screenshot({ omitBackground: true, type: 'png' });
  if (file) await writeFile(join(docs, file), buf);
  return buf;
}

// ICO files can hold PNG data directly; every current browser reads this format.
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const o = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, o);
    header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(i => i.data)]);
}

await mkdir(join(docs, 'icons'), { recursive: true });
await mkdir(join(docs, 'og'), { recursive: true });

// A custom logo from settings.yml is used as it is for every icon size.
const custom = SITE.logo ? readFileSync(join(ROOT, SITE.logo), 'utf8') : null;
const rounded = custom ?? iconSVG();
const square = custom ?? iconSVG({ rx: 0, id: 's' });
const maskable = custom ?? iconSVG({ rx: 0, padding: 0.12, id: 'm' });

await writeFile(join(docs, 'favicon.svg'), rounded);

const icoParts = [];
for (const size of [16, 32, 48]) icoParts.push({ size, data: await png(rounded, size) });
await writeFile(join(docs, 'favicon.ico'), ico(icoParts));

await png(square, 180, 'apple-touch-icon.png');
for (const size of [192, 512]) {
  await png(rounded, size, `icons/icon-${size}.png`);
  await png(maskable, size, `icons/icon-maskable-${size}.png`);
}

function ogHTML({ kicker, title, subtitle, chips }) {
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;font-family:Inter,sans-serif;background:#f7f7f4;color:#15161a;position:relative;overflow:hidden}
.glow{position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,#e3e6fd 0,rgba(247,247,244,0) 68%)}
.mark{position:absolute;right:70px;top:150px;width:380px;height:380px}
.wrap{position:absolute;inset:64px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-family:'Bricolage Grotesque';font-weight:700;font-size:28px}
.brand img{width:48px;height:48px}
.kicker{margin-top:62px;font-family:'JetBrains Mono';font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:#3d4bd8}
h1{font-family:'Bricolage Grotesque';font-size:${title.length > 34 ? 62 : 76}px;line-height:1.04;letter-spacing:-.025em;margin:14px 0 0;max-width:720px}
p{font-size:27px;line-height:1.4;color:#4a4c55;margin:22px 0 0;max-width:680px}
.foot{margin-top:auto;display:flex;gap:12px;align-items:center}
.chip{font-size:21px;font-weight:600;padding:8px 18px;border-radius:99px;background:#fff;border:1.5px solid #e2e2dc;color:#4a4c55}
.chip.v{color:#16794a;background:#e2f3ea;border-color:#bfe3cf}
.url{margin-left:auto;font-family:'JetBrains Mono';font-size:21px;color:#7b7d86}
</style></head><body>
<div class="glow"></div>
<svg class="mark" viewBox="0 0 64 64">${markPaths({ ink: '#3d4bd8', accent: '#16a35f' }).replace(/stroke-opacity="([\d.]+)"/g, (_, o) => `stroke-opacity="${Math.min(1, o * 0.55)}"`)}</svg>
<div class="wrap">
  <div class="brand"><img src="data:image/svg+xml;base64,${Buffer.from(rounded).toString('base64')}">${esc(SITE.name)}</div>
  <div class="kicker">${esc(kicker)}</div>
  <h1>${esc(title)}</h1>
  <p>${esc(subtitle)}</p>
  <div class="foot">${chips.map(c => `<span class="chip${c === STATUS.validated.label ? ' v' : ''}">${esc(c)}</span>`).join('')}<span class="url">${esc(SITE.url.replace(/^https?:\/\//, ''))}</span></div>
</div></body></html>`;
}

async function og(file, data) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHTML(data), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(docs, 'og', file), type: 'jpeg', quality: 86 });
}

await og('default.jpg', {
  kicker: 'Open-source UX measurement',
  title: 'Standardised UX questionnaires, scored properly.',
  subtitle: 'SUS, UEQ, NASA-TLX, UMUX-LITE and more, with published benchmarks, dataset analysis and exports.',
  chips: [`${SCALES.length} questionnaires`, 'Free', 'Runs in your browser'],
});

for (const s of SCALES) {
  const cat = CATEGORIES.find(c => c.id === s.category);
  const minutes = s.minutes < 1 ? `${Math.round(s.minutes * 60)} sec` : `${s.minutes} min`;
  const summary = s.summary.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? s.summary;
  await og(`${s.id}.jpg`, {
    kicker: `${s.abbr} · ${cat.name}`,
    title: s.name,
    subtitle: summary,
    chips: [STATUS[s.status].label, `${s.items.length} ${s.items.length === 1 ? 'item' : 'items'}`, minutes],
  });
}

await browser.close();
console.log(`Wrote icons and ${SCALES.length + 1} social images.`);
