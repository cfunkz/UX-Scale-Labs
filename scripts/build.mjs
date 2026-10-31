import { mkdir, writeFile, rm, readdir, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCALES } from '../docs/assets/js/scales.js';
import { ROOT } from './config.mjs';
import { SITE, renderHome, renderScalePage, renderNotFound, renderPrivacy } from './templates.mjs';
import { TOOLS, COMBINE, renderTool, renderToolsHub } from './tools.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const keep = new Set(['assets', 'icons', 'og', 'privacy', 'tools', 'combine']);

// Remove scale folders that no longer exist in the data file.
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isDirectory() && !keep.has(entry.name) && !SCALES.some(s => s.id === entry.name)) {
    await rm(join(root, entry.name), { recursive: true });
  }
}

await writeFile(join(root, 'index.html'), renderHome(SCALES));
await writeFile(join(root, '404.html'), renderNotFound());
await mkdir(join(root, 'privacy'), { recursive: true });
await writeFile(join(root, 'privacy', 'index.html'), renderPrivacy());
await rm(join(root, 'tools'), { recursive: true, force: true });
await mkdir(join(root, 'tools'), { recursive: true });
await writeFile(join(root, 'tools', 'index.html'), renderToolsHub());
for (const tool of TOOLS) {
  await mkdir(join(root, 'tools', tool.id), { recursive: true });
  await writeFile(join(root, 'tools', tool.id, 'index.html'), renderTool(tool));
}

await mkdir(join(root, 'combine'), { recursive: true });
await writeFile(join(root, 'combine', 'index.html'), renderTool(COMBINE));
// The combiner briefly lived under /tools/; keep that address working.
await mkdir(join(root, 'tools', 'combine-results'), { recursive: true });
await writeFile(join(root, 'tools', 'combine-results', 'index.html'), `<!doctype html><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE.url}/combine/"><meta http-equiv="refresh" content="0; url=/combine/"><a href="/combine/">Combine results has moved here.</a>\n`);

for (const scale of SCALES) {
  await mkdir(join(root, scale.id), { recursive: true });
  await writeFile(join(root, scale.id, 'index.html'), renderScalePage(scale, SCALES));
}

const today = new Date().toISOString().slice(0, 10);
const pages = [
  { path: '/', image: '/og/default.jpg', priority: '1.0' },
  ...SCALES.map(s => ({ path: `/${s.id}/`, image: `/og/${s.id}.jpg`, priority: s.status === 'informal' ? '0.5' : '0.8' })),
  { path: '/combine/', image: '/og/default.jpg', priority: '0.8' },
  { path: '/tools/', image: '/og/default.jpg', priority: '0.8' },
  ...TOOLS.map(t => ({ path: `/tools/${t.id}/`, image: '/og/default.jpg', priority: '0.8' })),
  { path: '/privacy/', priority: '0.3' },
];
await writeFile(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map(p => `  <url>
    <loc>${SITE.url}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
${p.image ? `    <image:image><image:loc>${SITE.url}${p.image}</image:loc></image:image>\n` : ''}  </url>`).join('\n')}
</urlset>
`);

await writeFile(join(root, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /404.html

Sitemap: ${SITE.url}/sitemap.xml
`);

// ads.txt is generated from SITE.adsClient so the ID only lives in one place.
// f08c47fec0942fa0 is Google's fixed certification authority ID, the same for every publisher.
if (SITE.adsClient) {
  await writeFile(join(root, 'ads.txt'), `google.com, ${SITE.adsClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
} else {
  await rm(join(root, 'ads.txt'), { force: true });
}

// CNAME tells GitHub Pages which custom domain to serve. A *.github.io address needs none.
const host = new URL(SITE.url).hostname;
if (host.endsWith('.github.io')) await rm(join(root, 'CNAME'), { force: true });
else await writeFile(join(root, 'CNAME'), `${host}\n`);

// A custom LOGO replaces the built-in mark in the header and the SVG favicon.
// The PNG icons and social images come from `npm run icons`.
if (SITE.logo) {
  await copyFile(join(ROOT, SITE.logo), join(root, 'logo.svg'));
  await copyFile(join(ROOT, SITE.logo), join(root, 'favicon.svg'));
} else {
  await rm(join(root, 'logo.svg'), { force: true });
}

await writeFile(join(root, 'site.webmanifest'), JSON.stringify({
  name: SITE.name,
  short_name: SITE.shortName,
  description: 'Standardised UX questionnaires with scoring, benchmarks and dataset analysis.',
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  lang: 'en',
  categories: ['education', 'productivity', 'utilities'],
  background_color: '#f7f7f4',
  theme_color: '#3d4bd8',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
  shortcuts: ['sus', 'ueq', 'nasa-tlx', 'nps'].map(id => {
    const s = SCALES.find(x => x.id === id);
    return { name: s.name, short_name: s.abbr, url: `/${id}/`, icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] };
  }),
}, null, 2) + '\n');

// Service worker. Its version is a hash of every file it may cache, so any change to the
// site produces a new sw.js and browsers drop the old cache on their next visit.
const hash = createHash('sha256');
for (const entry of (await readdir(root, { recursive: true, withFileTypes: true })).sort((a, b) => join(a.parentPath, a.name).localeCompare(join(b.parentPath, b.name)))) {
  if (entry.isFile() && /\.(html|css|js|woff2|svg|png|ico|webmanifest)$/.test(entry.name) && entry.name !== 'sw.js') {
    hash.update(join(entry.parentPath, entry.name).slice(root.length));
    hash.update(await readFile(join(entry.parentPath, entry.name)));
  }
}
const version = hash.digest('hex').slice(0, 12);
const precache = ['/', '/assets/css/main.css', '/assets/js/app.js', '/assets/js/util.js', '/assets/fonts/geist-latin.woff2', '/assets/fonts/bricolage-grotesque-latin.woff2', '/favicon.svg'];
await writeFile(join(root, 'sw.js'), `// Generated by scripts/build.mjs. Keeps the site's own files on the device so repeat
// visits load from disk. Pages are shown from the cache and refreshed in the background;
// scripts, styles and fonts are cache-first because every deploy gets a new cache.
const CACHE = 'uxsl-${version}';
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('uxsl-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const keep = (req, res) => {
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname === '/sw.js') return;

  if (req.mode === 'navigate') {
    const key = url.origin + url.pathname;
    const fresh = fetch(req).then(res => keep(key, res));
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match(key).then(hit => hit || fresh));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
});
`);

console.log(`Built ${SCALES.length} scale pages, ${TOOLS.length} stats tools and the combine page.`);
