import { CATEGORIES, STATUS, SCALE_MAP } from '../docs/assets/js/scales.js';
import { headerLogo } from './brand.mjs';
import { toBibtex } from '../docs/assets/js/research.js';

import { SITE } from './config.mjs';

export { SITE };

// Google cuts titles at about 60 characters and shows the site name separately, so the
// brand suffix is only added when it still fits.
export const pageTitle = t => (t.length + SITE.name.length + 3 <= 62 ? `${t} | ${SITE.name}` : t);

const ads = () => SITE.adsClient ? `  <meta name="google-adsense-account" content="${SITE.adsClient}">
  <script>addEventListener('load',()=>{const go=()=>{const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsClient}';document.head.append(s)};'requestIdleCallback' in window?requestIdleCallback(go,{timeout:2500}):setTimeout(go,1200)})</script>
` : '';

function privacyNote() {
  const used = [SITE.adsClient && 'shows Google AdSense ads', SITE.gaId && 'uses Google Analytics'].filter(Boolean);
  if (!used.length) return '';
  return `<p class="muted small-note">This site ${used.join(' and ')}, which may use cookies. ${used.length > 1 ? 'Neither ever sees' : 'It never sees'} your questionnaire answers. See the <a href="/privacy/">privacy policy</a>.</p>`;
}

const analytics = () => SITE.gaId ? `  <script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.gaId}');</script>
` : '';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const minutesLabel = m => (m < 1 ? `${Math.round(m * 60)} sec` : `${m} min`);

export function responseLabel(scale) {
  const r = scale.response;
  if (scale.type === 'slider') return `${r.min}–${r.max} rating`;
  if (scale.type === 'nps') return '0–10 rating';
  if (scale.type === 'differential') return '7-point differential';
  return `${r.max - r.min + 1}-point scale`;
}

const logo = SITE.logo ? '<img class="logo-mark" src="/logo.svg" alt="" width="32" height="32">' : headerLogo();

const icon = {
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  files: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M16 3v4h4M2 8v12a2 2 0 0 0 2 2h10"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-5 5m5-5 5 5M4 20h16"/></svg>',
};
export { icon };

// Lets the browser fetch a page's modules in parallel instead of discovering them one import at a time.
export const modulePreload = names => names.map(n => `  <link rel="modulepreload" href="/assets/js/${n}.js">\n`).join('');

export function head({ title, description, path, jsonld, scripts = '', image = '/og/default.jpg', imageAlt = SITE.name, noindex = false }) {
  const url = SITE.url + path;
  const img = SITE.url + image;
  return `<!doctype html>
<html lang="en" data-site="${esc(SITE.url.replace(/^https?:\/\//, ''))}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
  <meta name="author" content="${SITE.name}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#101114" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:locale" content="en_GB">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${img}">
  <meta name="twitter:image:alt" content="${esc(imageAlt)}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="application-name" content="${SITE.name}">
  <meta name="apple-mobile-web-app-title" content="${esc(SITE.shortName)}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="format-detection" content="telephone=no">
${ads()}${analytics()}  <link rel="preload" href="/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/main.css">
  <script>try{const t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${scripts}  <script type="speculationrules">{"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/assets/*"}}]},"eagerness":"moderate"}]}</script>
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>`;
}

// The four places people go: answer a questionnaire, merge collected results, run the
// statistics, or get help choosing. `active` marks the current section for screen readers.
export const NAV = [
  ['scales', '/#scales', 'Questionnaires', 'Answer and score 20 UX questionnaires'],
  ['combine', '/combine/', 'Combine results', 'Merge result files from your participants'],
  ['tools', '/tools/', 'Stats tools', 'Sample size, A/B tests, reliability and more'],
  ['choose', '/#choose', 'Which one?', 'Pick the right questionnaire for your study'],
];

export function header(active = '') {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <div class="brand-wrap">
      <a class="brand" href="/">${logo}<span>${esc(SITE.name)}</span></a>
      <span class="load-time" data-load-time title="Page load time, from navigation start to the load event" hidden></span>
    </div>
    <nav class="nav" aria-label="Main" data-nav>
      <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="site-menu" data-menu>${icon.menu}<span class="sr-only">Menu</span></button>
      <ul class="nav-links" id="site-menu">
        ${NAV.map(([id, href, label, hint]) => `<li><a href="${href}"${id === active ? ' aria-current="page"' : ''}>${label}<small>${hint}</small></a></li>`).join('\n        ')}
      </ul>
      ${SITE.repo ? `<a class="icon-btn" href="${SITE.repo}" aria-label="Source on GitHub">${icon.github}</a>` : ''}
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Dark mode" aria-pressed="false"><span class="i-sun">${icon.sun}</span><span class="i-moon">${icon.moon}</span></button>
    </nav>
  </div>
</header>`;
}

const FOOTER_CALCULATORS = ['sus', 'umux-lite', 'ueq', 'nasa-tlx', 'nps', 'csat'];
const FOOTER_TOOLS = [
  ['sample-size', 'Sample size calculator'],
  ['ab-test', 'A/B test calculator'],
  ['completion-rate', 'Completion rate calculator'],
  ['time-on-task', 'Time on task calculator'],
  ['cronbach-alpha', 'Cronbach’s alpha calculator'],
];

export function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="/">${logo}<span>${esc(SITE.name)}</span></a>
        <p>Free UX questionnaire calculators, scored with the methods from the original papers. Open source under the MIT License.</p>
      </div>
      <nav class="foot-nav" aria-label="Footer">
        <div class="footer-links">
          <h2>Questionnaires</h2>
          ${FOOTER_CALCULATORS.map(id => `<a href="/${id}/">${esc(SCALE_MAP[id].abbr)} calculator</a>`).join('\n          ')}
          <a href="/#scales">All ${Object.keys(SCALE_MAP).length} questionnaires</a>
        </div>
        <div class="footer-links">
          <h2>Analyse results</h2>
          <a href="/combine/">Combine result files</a>
          ${FOOTER_TOOLS.map(([id, name]) => `<a href="/tools/${id}/">${name}</a>`).join('\n          ')}
        </div>
        <div class="footer-links">
          <h2>About</h2>
          <a href="/#choose">Which questionnaire to use</a>
          <a href="/privacy/">Privacy policy</a>
          ${SITE.repo ? `<a href="${SITE.repo}">Source on GitHub</a>` : ''}
          ${SITE.kofi ? `<a href="${SITE.kofi}">Support on Ko-fi</a>` : ''}
        </div>
      </nav>
    </div>
    <p class="fine-print">© ${new Date().getFullYear()} ${esc(SITE.name)}. Not affiliated with the authors of the questionnaires or their institutions. Always cite the original sources in published work.</p>
  </div>
</footer>`;
}

function scaleCard(s) {
  const st = STATUS[s.status];
  return `<a class="scale-row" href="/${s.id}/" data-category="${s.category}" data-search="${esc([s.abbr, s.name, s.summary, s.when].join(' ').toLowerCase())}">
  <span class="abbr">${esc(s.abbr)}</span>
  <div class="scale-row-main">
    <h3>${esc(s.name)} <span class="status status-${s.status}" title="${esc(st.hint)}">${st.label}</span></h3>
    <p>${esc(s.summary)}</p>
  </div>
  <div class="scale-row-meta">
    <span>${s.items.length} ${s.items.length === 1 ? 'item' : 'items'}</span>
    <span>${minutesLabel(s.minutes)}</span>
    <span>${responseLabel(s)}</span>
  </div>
  <span class="scale-row-go">${icon.arrow}</span>
</a>`;
}

const PICKS = [
  ['After each task', ['seq', 'asq', 'nasa-tlx'], 'SEQ is fastest. NASA-TLX when workload matters.'],
  ['End of a usability test', ['sus', 'pssuq'], 'SUS is the most comparable. PSSUQ adds subscales.'],
  ['Short in-product survey', ['umux-lite', 'ueq-s'], 'Two to eight items that still give a solid score.'],
  ['The whole experience', ['ueq', 'visawi-s'], 'Pragmatic and hedonic quality, with a benchmark.'],
  ['Chatbots and AI', ['cuq', 'trust'], 'Conversation quality plus trust in the system.'],
  ['Loyalty tracking', ['nps', 'csat', 'ces'], 'Single items, best read across many people.'],
];

// Questions people search for before they land here. Each answer is kept as HTML for the
// page and as plain text for the FAQ structured data.
function homeFAQ(byId) {
  const link = (id, text) => `<a href="/${id}/">${esc(text)}</a>`;
  return [
    {
      q: 'How do I calculate a SUS score?',
      text: 'For each odd-numbered item subtract 1 from the answer, and for each even-numbered item subtract the answer from 5. Add the ten results and multiply by 2.5 to get a score from 0 to 100. The SUS calculator on this site does this as soon as all ten items are answered.',
      html: `<p>For each odd-numbered item subtract 1 from the answer, and for each even-numbered item subtract the answer from 5. Add the ten results and multiply by 2.5 to get a score from 0 to 100. The ${link('sus', 'SUS calculator')} does this as soon as all ten items are answered.</p>`,
    },
    { q: 'What is a good SUS score?', text: byId.sus.seo.good, html: `<p>${esc(byId.sus.seo.good)}</p>` },
    {
      q: 'Which UX questionnaire should I use?',
      text: 'It depends on when you ask. Use SEQ or NASA-TLX after each task, SUS or PSSUQ at the end of a usability test, UMUX-LITE for a short in-product survey and UEQ to measure the whole experience.',
      html: `<p>It depends on when you ask. Use ${link('seq', 'SEQ')} or ${link('nasa-tlx', 'NASA-TLX')} after each task, ${link('sus', 'SUS')} or ${link('pssuq', 'PSSUQ')} at the end of a usability test, ${link('umux-lite', 'UMUX-LITE')} for a short in-product survey and ${link('ueq', 'UEQ')} to measure the whole experience. The <a href="#choose">guide above</a> covers more study types.</p>`,
    },
    {
      q: 'Can I score a whole study at once?',
      text: 'Yes, in two ways. If each participant filled in a questionnaire here and sent you their download, drop all the files in at once: PDF, CSV, JSON or the ZIP export, in any mix. Combine results scores every person and merges them into one dataset. You can also collect answers in Excel, Google Forms, Qualtrics or any other tool, with one row per person and one column per item (Q1, Q2 and so on), and upload that table on the questionnaire’s Score a dataset tab whenever you are ready to analyse it. Both give the mean, a 95% confidence interval, reliability and a write-up.',
      html: `<p>Yes, in two ways. If each participant filled in a questionnaire here and sent you their download, drop all the files in at once: PDF, CSV, JSON or the ZIP export, in any mix. <a href="/combine/">Combine results</a> scores every person and merges them into one dataset.</p><p>You can also collect answers in Excel, Google Forms, Qualtrics or any other tool, with one row per person and one column per item (Q1, Q2 and so on), and upload that table on the questionnaire’s <em>Score a dataset</em> tab whenever you are ready to analyse it. Both give the mean, a 95% confidence interval, reliability and a write-up.</p>`,
    },
    {
      q: 'Is it free, and where do my answers go?',
      text: 'Everything is free and needs no account. Scoring happens in your browser, so answers and uploaded files are never sent to a server.',
      html: `<p>Everything is free and needs no account. Scoring happens in your browser, so answers and uploaded files are never sent to a server. The <a href="/privacy/">privacy policy</a> has the details.</p>`,
    },
    {
      q: 'How do I cite a questionnaire in my thesis or paper?',
      text: 'Each questionnaire’s Method tab lists the original references and gives BibTeX you can copy into LaTeX, Overleaf or Zotero. Always cite the original authors rather than this site.',
      html: `<p>Each questionnaire’s <em>Method</em> tab lists the original references and gives BibTeX you can copy into LaTeX, Overleaf or Zotero. Always cite the original authors rather than this site.</p>`,
    },
  ];
}

export function renderHome(scales) {
  const byId = Object.fromEntries(scales.map(s => [s.id, s]));
  const validated = scales.filter(s => s.status === 'validated').length;
  const faq = homeFAQ(byId);
  const description = `Free SUS, UEQ, NASA-TLX, NPS and ${scales.length - 4} more UX questionnaire calculators with instant scores, benchmarks, dataset analysis and stats tools. Private, in your browser.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, description, inLanguage: 'en',
        alternateName: [`${SITE.name} calculators`, 'UX questionnaire scoring tool'],
        publisher: { '@id': `${SITE.url}/#org` },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/?s={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      },
      {
        '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: `${SITE.url}/`,
        logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png`, width: 512, height: 512 },
        ...(SITE.repo ? { sameAs: [SITE.repo] } : {}),
      },
      {
        '@type': 'WebApplication', '@id': `${SITE.url}/#app`, name: `${SITE.name}: UX questionnaire calculators`, url: `${SITE.url}/`,
        applicationCategory: 'EducationalApplication', operatingSystem: 'Any', isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: ['SUS calculator', 'UEQ analysis', 'NASA-TLX calculator', 'NPS calculator', 'Usability score benchmarks', 'CSV and JSON dataset scoring', 'Combine participant result files', 'UX sample size calculator', 'A/B test calculator', 'Task completion rate confidence interval', 'Time on task geometric mean', 'Cronbach’s alpha calculator', 'APA write-up and BibTeX citations'],
        publisher: { '@id': `${SITE.url}/#org` },
      },
      {
        '@type': 'ItemList', name: 'UX questionnaire calculators', numberOfItems: scales.length,
        itemListElement: scales.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/${s.id}/`, name: `${s.abbr} calculator: ${s.name}` })),
      },
      { '@type': 'FAQPage', '@id': `${SITE.url}/#faq`, mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.text } })) },
    ],
  };

  const groups = CATEGORIES.map(cat => {
    const list = scales.filter(s => s.category === cat.id);
    if (!list.length) return '';
    return `<section class="category" data-category-group="${cat.id}">
      <div class="category-head"><h2>${esc(cat.name)}</h2><p>${esc(cat.blurb)}</p></div>
      <div class="scale-list">${list.map(scaleCard).join('\n')}</div>
    </section>`;
  }).join('\n');

  return `${head({ title: `Free UX Questionnaire Calculators: SUS, UEQ, NASA-TLX | ${SITE.name}`, description, path: '/', jsonld, imageAlt: `${SITE.name}: standardised UX questionnaires, scored properly` })}
<body data-page="home">
${header()}
<main id="main">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <h1>Score UX questionnaires the way their authors intended.</h1>
        <p class="lede">SUS, UEQ, NASA-TLX and ${scales.length - 3} more, each scored from the original paper and graded against published benchmarks. Everything runs in your browser.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#scales">Browse ${icon.arrow}</a>
          <a class="btn btn-ghost" href="#analyse">Analyse</a>
        </div>
      </div>
      <div class="preview-card" aria-hidden="true">
        <div class="preview-head"><span class="abbr">SUS</span><span class="pill tone-great">Grade A</span></div>
        <div class="preview-score">82.5<small>of 100</small></div>
        <div class="preview-bar"><i style="--w:82.5%"></i><b style="--x:68%"></b></div>
        <div class="preview-legend"><span>0</span><span>average 68</span><span>100</span></div>
        <div class="preview-rows">
          <div><span>Percentile</span><strong>90–95</strong></div>
          <div><span>Acceptability</span><strong>Acceptable</strong></div>
          <div><span>vs. average</span><strong>+14.5</strong></div>
        </div>
      </div>
    </div>
    <div class="wrap">
      <dl class="hero-stats">
        <div><dt>Questionnaires</dt><dd>${scales.length}</dd></div>
        <div><dt>Peer-reviewed</dt><dd>${validated}</dd></div>
        <div><dt>Stats tools</dt><dd>5</dd></div>
        <div><dt>Answers sent to a server</dt><dd>0</dd></div>
      </dl>
    </div>
  </section>

  <section id="scales" class="section library">
    <div class="wrap">
      <div class="library-head">
        <div class="section-head">
          <h2>UX questionnaires and calculators</h2>
          <p class="muted">Answer one online for an instant score, or upload a whole study on its dataset tab.</p>
        </div>
        <label class="search">${icon.search}<input type="search" placeholder="Search, e.g. SUS calculator" aria-label="Search questionnaires" data-search-input></label>
      </div>
      <div class="filter-bar" role="group" aria-label="Filter by category">
        <button type="button" class="filter is-active" data-filter="all" aria-pressed="true">All<span>${scales.length}</span></button>
        ${CATEGORIES.map(c => `<button type="button" class="filter" data-filter="${c.id}" aria-pressed="false" title="${esc(c.name)}">${esc(c.short)}<span>${scales.filter(s => s.category === c.id).length}</span></button>`).join('\n        ')}
      </div>
      <div data-library>${groups}</div>
      <p class="empty" data-empty hidden>No questionnaires match that search.</p>
    </div>
  </section>

  <section id="choose" class="section">
    <div class="wrap">
      <div class="section-head"><h2>Which questionnaire should I use?</h2><p class="muted">A starting point for common study designs.</p></div>
      <div class="pick-grid">
        ${PICKS.map(([situation, ids, note]) => `<div class="pick">
          <h3>${esc(situation)}</h3>
          <div class="pick-links">${ids.map(id => `<a class="abbr" href="/${id}/" title="${esc(byId[id].abbr)} calculator">${esc(byId[id].abbr)}</a>`).join('')}</div>
          <p>${esc(note)}</p>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="analyse" class="section">
    <div class="wrap">
      <div class="section-head"><h2>Analyse your results</h2><p class="muted">Pick the route that matches what you have.</p></div>
      <div class="route-grid">
        <a class="route" href="/combine/">
          <span class="route-icon">${icon.files}</span>
          <h3>One file per participant</h3>
          <p>Drop everyone’s downloads in at once and get each score plus the group average.</p>
          <span class="route-go">Combine results ${icon.arrow}</span>
        </a>
        <a class="route" href="/sus/#dataset">
          <span class="route-icon">${icon.table}</span>
          <h3>A spreadsheet of answers</h3>
          <p>Upload one row per person on any questionnaire’s dataset tab for means and reliability.</p>
          <span class="route-go">Score a dataset ${icon.arrow}</span>
        </a>
        <a class="route" href="/tools/">
          <span class="route-icon">${icon.chart}</span>
          <h3>Scores to compare or plan</h3>
          <p>Sample size, A/B tests, completion rates, task times and Cronbach’s alpha.</p>
          <span class="route-go">Stats tools ${icon.arrow}</span>
        </a>
      </div>
    </div>
  </section>

  <section id="faq" class="section home-faq">
    <div class="wrap">
      <div class="faq">
        <div class="section-head"><h2>Frequently asked questions</h2></div>
        <div class="faq-list">
          ${faq.map(f => `<details class="faq-item"><summary><h3>${esc(f.q)}</h3><span class="faq-icon" aria-hidden="true"></span></summary><div class="faq-body">${f.html}</div></details>`).join('\n          ')}
        </div>
        ${privacyNote()}
      </div>
    </div>
  </section>
</main>
${footer()}
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

function renderItem(scale, item) {
  const r = scale.response;
  const name = `q${item.n}`;
  const num = `<span class="q-num">${item.n}</span>`;

  if (scale.type === 'differential') {
    const opts = [];
    for (let v = r.min; v <= r.max; v++) {
      opts.push(`<label class="dot-opt"><input type="radio" name="${name}" value="${v}" aria-label="${v} of ${r.max}"><span></span></label>`);
    }
    return `<fieldset class="q q-diff" data-item="${item.n}">
  <legend class="sr-only">${item.n}. ${esc(item.left)} to ${esc(item.right)}</legend>
  ${num}<span class="diff-term left">${esc(item.left)}</span><div class="dots">${opts.join('')}</div><span class="diff-term right">${esc(item.right)}</span>
</fieldset>`;
  }

  if (scale.type === 'slider') {
    return `<fieldset class="q q-slider" data-item="${item.n}">
  <legend><span class="q-num">${item.n}</span><span class="q-text"><strong>${esc(item.short)}</strong> ${esc(item.text.split(': ')[1])}</span></legend>
  <div class="slider-wrap">
    <input type="range" name="${name}" min="${r.min}" max="${r.max}" step="${r.step}" value="50" class="pristine" aria-label="${esc(item.short)}">
    <output>–</output>
  </div>
  <div class="scale-ends"><span>${esc(item.left)}</span><span>${esc(item.right)}</span></div>
</fieldset>`;
  }

  const opts = [];
  for (let v = r.min; v <= r.max; v++) {
    const anchor = r.anchors?.[v - r.min];
    const tone = scale.type === 'nps' ? (v >= 9 ? ' nps-pro' : v >= 7 ? ' nps-pas' : ' nps-det') : '';
    opts.push(`<label class="seg${tone}"><input type="radio" name="${name}" value="${v}"><span><b>${v}</b>${anchor ? `<small>${esc(anchor)}</small>` : ''}</span></label>`);
  }
  const na = r.na ? `<label class="seg seg-na"><input type="radio" name="${name}" value="na"><span><b>N/A</b></span></label>` : '';
  return `<fieldset class="q q-likert${r.anchors ? ' has-anchors' : ''}" data-item="${item.n}">
  <legend><span class="q-num">${item.n}</span><span class="q-text">${esc(item.text)}</span></legend>
  <div class="segments" style="--count:${r.max - r.min + 1}">${opts.join('')}</div>
  <div class="scale-ends"><span>${esc(r.labels[0])}</span>${na}<span>${esc(r.labels[1])}</span></div>
</fieldset>`;
}

// Each answer is kept as both HTML for the page and plain text for the FAQ structured data.
function scaleFAQ(scale, scales) {
  const n = scale.items.length;
  const related = scale.seo.related.map(id => scales.find(s => s.id === id));
  const p = t => `<p>${esc(t)}</p>`;
  const named = r => (r.name.includes(r.abbr) || r.name.includes('(') ? r.name : `${r.name} (${r.abbr})`);
  const duration = scale.minutes < 1 ? `${Math.round(scale.minutes * 60)} seconds` : `${scale.minutes} minute${scale.minutes === 1 ? '' : 's'}`;
  const calcText = `${scale.method.join(' ')} This calculator applies these steps automatically as soon as every item is answered.`;
  const multiText = `Yes. Collect the answers in Excel, Google Forms, Qualtrics or any other tool with one row per participant and columns Q1 to Q${n}, then upload the table as CSV or JSON on the "Score a dataset" tab. If participants filled in the ${scale.abbr} here and sent you their downloads, drop all the PDF, CSV, JSON or ZIP files in at once instead. You get a score for every person, plus the mean, standard deviation and 95% confidence interval.`;
  const lengthText = `The ${scale.abbr} has ${n} ${n === 1 ? 'item' : 'items'} and takes about ${duration}. Typical use: ${scale.when}`;
  const relatedText = `Similar questionnaires include ${related.map(named).join(', ')}.`;
  return [
    { q: `How do I calculate the ${scale.abbr} score?`, text: calcText, html: `<ol class="steps">${scale.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol>${p('This calculator applies these steps automatically as soon as every item is answered.')}` },
    { q: `What is a good ${scale.abbr} score?`, text: scale.seo.good, html: p(scale.seo.good) },
    { q: `How long does the ${scale.abbr} take?`, text: lengthText, html: p(lengthText) },
    { q: `Can I calculate ${scale.abbr} scores for many participants at once?`, text: multiText, html: p(multiText) },
    { q: `What is similar to the ${scale.abbr}?`, text: relatedText, html: `<p>Similar questionnaires include ${related.map(r => `<a href="/${r.id}/">${esc(named(r))}</a>`).join(', ')}.</p>` },
  ];
}

export function renderScalePage(scale, scales) {
  const cat = CATEGORIES.find(c => c.id === scale.category);
  const st = STATUS[scale.status];
  const path = `/${scale.id}/`;
  const label = scale.name.includes(scale.abbr) || scale.name.includes('(') ? scale.name : `${scale.name} (${scale.abbr})`;
  const title = pageTitle(scale.seo.title);
  const faq = scaleFAQ(scale, scales);
  const lead = scale.summary.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? scale.summary;
  const tail = ' Instant score, benchmarks and dataset analysis, private in your browser.';
  const base = `Free online ${scale.abbr} calculator. ${lead}`;
  const shortTail = ' Instant score and dataset analysis in your browser.';
  const description = base.length + tail.length <= 165 ? base + tail
    : base.length + shortTail.length <= 165 ? base + shortTail
    : base.length <= 165 ? base
    : `Free online ${scale.abbr} calculator for the ${scale.name}. Instant score, benchmarks and dataset analysis, private in your browser.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${SITE.url}${path}#webpage`, url: SITE.url + path, name: title, description, inLanguage: 'en',
        isPartOf: { '@id': `${SITE.url}/#website` },
        breadcrumb: { '@id': `${SITE.url}${path}#breadcrumbs` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE.url}/og/${scale.id}.jpg`, width: 1200, height: 630 },
        about: { '@type': 'Thing', name: `${scale.name} (${scale.abbr})` },
        citation: scale.refs.map(r => ({ '@type': 'CreativeWork', name: r.text, ...(r.url ? { url: r.url } : {}) })),
      },
      {
        '@type': 'WebApplication', '@id': `${SITE.url}${path}#app`, name: `${scale.abbr} calculator`, alternateName: scale.seo.terms, url: SITE.url + path,
        applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: ['Online questionnaire', 'Automatic scoring', 'Benchmark grading', 'CSV and JSON dataset analysis', 'PDF, CSV and JSON export', 'Printable paper form'],
        publisher: { '@id': `${SITE.url}/#org` },
      },
      {
        '@type': 'FAQPage', '@id': `${SITE.url}${path}#faq`,
        mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.text } })),
      },
      { '@type': 'BreadcrumbList', '@id': `${SITE.url}${path}#breadcrumbs`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: 'Questionnaires', item: `${SITE.url}/#scales` },
        { '@type': 'ListItem', position: 3, name: scale.abbr, item: SITE.url + path },
      ] },
    ],
  };
  const scripts = modulePreload(['scale-page', 'util', 'scales', 'scoring', 'stats', 'research']);
  const related = scale.seo.related.map(id => scales.find(s => s.id === id));
  const r = scale.response;
  const orientation = !r.lowerIsBetter ? '' : scale.type === 'slider'
    ? '<p class="notice">Lower ratings mean less workload. Note that the Performance scale runs from Perfect to Failure.</p>'
    : '<p class="notice">Lower scores are better on this scale. The anchors keep the original authors’ orientation, starting with “Strongly agree”.</p>';

  return `${head({ title, description, path, jsonld, scripts, image: `/og/${scale.id}.jpg`, imageAlt: `${scale.name} (${scale.abbr}) on ${SITE.name}` })}
<body data-page="scale" data-scale="${scale.id}">
${header('scales')}
<main id="main">
  <section class="scale-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#scales">Questionnaires</a><span>/</span><span>${esc(cat.name)}</span></nav>
      <div class="scale-title">
        <span class="abbr abbr-lg">${esc(scale.abbr)}</span>
        <span class="status status-${scale.status}" title="${esc(st.hint)}">${st.label}</span>
      </div>
      <h1>${esc(label)} calculator</h1>
      <p class="lede">${esc(scale.summary)}</p>
      <p class="intro-line">Free and private: answer the ${esc(scale.abbr)} online for an instant score with benchmarks, or upload a CSV or JSON file to score every respondent at once.</p>
      <div class="meta-row">
        <span>${scale.items.length} ${scale.items.length === 1 ? 'item' : 'items'}</span>
        <span>About ${minutesLabel(scale.minutes)}</span>
        <span>${responseLabel(scale)}</span>
        <button type="button" class="btn btn-small btn-ghost" data-print>${icon.print} Print blank form</button>
        <button type="button" class="btn btn-small btn-ghost" data-copy-link>${icon.link} Copy link</button>
      </div>
      <div class="tabs" role="tablist">
        <button role="tab" type="button" class="tab" id="tab-take" aria-controls="panel-take" aria-selected="true" data-tab="take">Questionnaire</button>
        <button role="tab" type="button" class="tab" id="tab-dataset" aria-controls="panel-dataset" aria-selected="false" data-tab="dataset">Score a dataset</button>
        <button role="tab" type="button" class="tab" id="tab-method" aria-controls="panel-method" aria-selected="false" data-tab="method">Method</button>
      </div>
    </div>
  </section>

  <div class="wrap scale-body">
    <section id="panel-take" role="tabpanel" aria-labelledby="tab-take" class="panel">
      <form class="questionnaire" data-form novalidate>
        <div class="context-card">
          <label>Product or system <input type="text" name="product" placeholder="e.g. Checkout redesign v2" autocomplete="off"></label>
          <label>Participant ID <input type="text" name="participant" placeholder="Optional" autocomplete="off"></label>
        </div>
        ${orientation}
        <p class="instructions">${scale.type === 'differential' ? 'For each pair, pick the point that best matches your impression. There are no right or wrong answers; go with your first instinct.' : scale.type === 'slider' ? 'Move each slider to reflect the task you just completed. Every dimension needs a rating.' : 'Pick the option that best matches your experience.'}</p>
        <div class="items items-${scale.type}">
${scale.items.map(it => renderItem(scale, it)).join('\n')}
        </div>
        <div class="form-bar">
          <div class="progress"><div class="progress-track"><i data-progress></i></div><span data-progress-label>0 of ${scale.items.length} answered</span></div>
          <div class="form-actions">
            <button type="reset" class="btn btn-ghost">Clear</button>
            <button type="submit" class="btn btn-primary">See results</button>
          </div>
        </div>
      </form>
      <div class="results" data-results hidden></div>
    </section>

    <section id="panel-dataset" role="tabpanel" aria-labelledby="tab-dataset" class="panel" hidden>
      <h2>Score many respondents at once</h2>
      <p class="muted dataset-lede">Bring your answers in either of these two forms. Both go in the same box below, and you get the group score, a confidence interval, reliability and a write-up.</p>
      <div class="dataset-options">
        <div class="option-card">
          <h3>${icon.table} A table with everyone’s answers</h3>
          <p>One row per person and one column per item (<code>Q1</code>…<code>Q${scale.items.length}</code>), with answers from ${r.min} to ${r.max}${r.na ? ' (leave a cell empty or write <code>NA</code> for not applicable)' : ''}, for example exported from Excel, Google Forms or Qualtrics. Upload it as CSV or JSON in the box below, or paste it here. The templates show the layout.</p>
          <div class="template-btns">
            <button type="button" class="btn btn-ghost btn-small" data-template="csv">${icon.download} CSV template</button>
            <button type="button" class="btn btn-ghost btn-small" data-template="json">${icon.download} JSON template</button>
          </div>
          <details class="paste toggle">
            <summary><span><strong>Paste the table</strong><small>Copy the rows straight from your spreadsheet.</small></span></summary>
            <textarea rows="6" placeholder="id,Q1,Q2,… or [{&quot;id&quot;: &quot;P1&quot;, &quot;Q1&quot;: 4, …}]" data-paste spellcheck="false"></textarea>
            <button type="button" class="btn btn-primary btn-small" data-paste-go>Score pasted data</button>
          </details>
        </div>
        <div class="option-card">
          <h3>${icon.files} One result file per person</h3>
          <p>Your participants filled in the Questionnaire tab and sent you their download. Select all their files at once, in any mix of PDF, JSON, CSV, TXT or ZIP, and they are merged into one dataset.</p>
          <p class="muted small-note">Files from several questionnaires, or a per-person overview? Use <a href="/combine/">Combine results</a>.</p>
        </div>
      </div>
      <label class="dropzone" data-dropzone>
        <input type="file" multiple accept=".csv,.tsv,.txt,.json,.pdf,.zip,text/csv,application/json,application/pdf,application/zip" data-file>
        ${icon.upload}<span><strong>Drop your table or result files here</strong> or click to choose</span>
        <small>Read on your device. Nothing is uploaded.</small>
      </label>
      <div data-dataset-out></div>
    </section>

    <section id="panel-method" role="tabpanel" aria-labelledby="tab-method" class="panel" hidden>
      <div class="method-grid">
        <div class="method-main">
          <h2>When to use it</h2>
          <p>${esc(scale.when)}</p>
          <h2>How it is scored</h2>
          <ol class="steps">${scale.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol>
          ${scale.subscales ? `<h2>Subscales</h2><ul class="plain">${scale.subscales.map(s => `<li><strong>${esc(s.name)}</strong> · items ${s.items.join(', ')}</li>`).join('')}</ul>` : ''}
          ${scale.items.some(i => i.reverse) ? `<h2>Reverse-scored items</h2><p>${scale.items.filter(i => i.reverse).map(i => i.n).join(', ')}. Participants are not told which items are reversed.</p>` : ''}
        </div>
        <aside class="refs">
          <h2>References</h2>
          ${scale.refs.length ? `<ol>${scale.refs.map(rf => `<li>${esc(rf.text)}${rf.url ? ` <a href="${rf.url}" rel="noopener">${esc(rf.url.replace('https://', ''))}</a>` : ''}</li>`).join('')}</ol>` : `<p class="muted">${scale.status === 'informal' ? 'This is an informal set of items with no academic source.' : 'This is an industry convention without a single academic source.'}</p>`}
          <p class="muted small-note">${esc(st.hint)}</p>
        </aside>
        ${scale.refs.length ? `<section class="cite-block">
          <div class="cite-head"><h2>Cite it in LaTeX</h2><button type="button" class="btn btn-ghost btn-small" data-copy-bibtex>Copy BibTeX</button></div>
          <pre><code data-bibtex>${esc(scale.refs.map(rf => toBibtex(rf.text, rf.url)).filter(Boolean).join('\n\n'))}</code></pre>
        </section>` : ''}
      </div>
    </section>

    <section class="faq" id="faq">
      <h2 class="section-title small">Frequently asked questions about the ${esc(scale.abbr)}</h2>
      <div class="faq-list">
        ${faq.map(f => `<details class="faq-item"><summary><h3>${esc(f.q)}</h3><span class="faq-icon" aria-hidden="true"></span></summary><div class="faq-body">${f.html}</div></details>`).join('\n        ')}
      </div>
    </section>

    <section class="related">
      ${related.length ? `<h2 class="section-title small">Similar questionnaires</h2>
      <div class="scale-list">${related.map(scaleCard).join('\n')}</div>` : ''}
      <h2 class="section-title small related-sub">Analyse your ${esc(scale.abbr)} results</h2>
      <div class="cross-links">
        <a class="cross-link" href="/combine/"><strong>Combine result files</strong><span>Each participant sent you their own ${esc(scale.abbr)} download? Merge them into one dataset.</span></a>
        <a class="cross-link" href="/tools/sample-size/"><strong>Sample size calculator</strong><span>How many people you need for a precise ${esc(scale.abbr)} score.</span></a>
        <a class="cross-link" href="/tools/ab-test/"><strong>A/B test calculator</strong><span>Compare ${esc(scale.abbr)} scores from two designs or versions.</span></a>
      </div>
    </section>
  </div>
</main>
${footer()}
<div class="print-sheet" data-print-sheet aria-hidden="true"></div>
<div class="toast" data-toast role="status" aria-live="polite"></div>
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

export function renderPrivacy() {
  const path = '/privacy/';
  const title = `Privacy Policy | ${SITE.name}`;
  const description = `${SITE.name} collects no personal data. Questionnaire answers stay in your browser. This page explains the Google cookies used for ads and analytics.`;
  const contact = SITE.contactEmail
    ? `email <a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a> or open an issue on <a href="${SITE.repo}/issues">GitHub</a>`
    : `open an issue on <a href="${SITE.repo}/issues">GitHub</a>`;
  const section = (h, body) => `<section><h2>${h}</h2>${body}</section>`;
  const google = [SITE.adsClient && 'Google AdSense', SITE.gaId && 'Google Analytics'].filter(Boolean);
  const parts = [
    `<p class="legal-lede">I don’t collect any personal data. Your questionnaire answers, scores and uploaded files stay in your browser and are never sent anywhere.${google.length ? ` The only third party that sets cookies here is Google, through ${google.join(' and ')}, as explained below.` : ''}</p>`,
    section('Your answers and files', `<p>All scoring happens on your own device. Nothing you type in, and no file you upload (a dataset or a batch of participants’ result files), is sent to a server or stored anywhere. Close the tab and it’s gone. Exports (PDF, CSV, JSON) are created in your browser and saved straight to your device.</p>
      <p>The site remembers one thing in your browser’s local storage: whether you picked the light or dark theme. It also keeps a copy of its own pages, styles, scripts and fonts in your browser’s cache so the next visit loads instantly and works offline. That cache holds only the site’s files, never your answers, and you can clear it in your browser settings.</p>`),
    SITE.adsClient ? section('Ads', `<p>Ads are served by Google AdSense. Google and its partners use cookies to show ads, which may be based on your visits to this and other websites, and to measure how they perform. This site has no access to those cookies, and the ad code can’t see your answers.</p>
      <p>If you’re in the EEA, the UK or Switzerland, you’ll be asked for consent first and can change your choice at any time. Anyone can turn off personalised ads in <a href="https://adssettings.google.com/" rel="noopener">Google Ad Settings</a>. Google explains how it uses this data in <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites that use its services</a>.</p>`) : '',
    SITE.gaId ? section('Analytics', `<p>Google Analytics counts page visits and three actions: finishing a questionnaire, scoring a dataset and exporting results. Each action only records the questionnaire’s name and the file type, never answers or scores. You can block it with the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out add-on</a> or any content blocker.</p>`) : '',
    section('Hosting', `<p>The site is hosted on GitHub Pages, which may briefly log your IP address like any web server. Fonts and scripts are served from this site itself. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub privacy statement</a>.</p>`),
    section('Questions', `<p>If anything here is unclear, ${contact}.</p>`),
  ].filter(Boolean).join('\n');

  return `${head({ title, description, path, jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE.url + path, description, isPartOf: { '@id': `${SITE.url}/#website` } } })}
<body data-page="privacy">
${header()}
<main id="main" class="wrap legal">
  ${SITE.privacyUpdated ? `<p class="kicker">Last updated ${esc(SITE.privacyUpdated)}</p>` : ''}
  <h1>Privacy policy</h1>
  ${parts}
</main>
${footer()}
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

export function renderNotFound() {
  return `${head({ title: `Page not found · ${SITE.name}`, description: 'This page does not exist.', path: '/404.html', noindex: true, jsonld: { '@context': 'https://schema.org', '@type': 'WebPage' } })}
<body data-page="404">
${header()}
<main id="main" class="wrap not-found">
  <p class="kicker">Error 404</p>
  <h1>That page doesn’t exist.</h1>
  <p class="lede">The scale may have moved. Everything is listed in the library.</p>
  <a class="btn btn-primary" href="/#scales">Browse scales ${icon.arrow}</a>
</main>
${footer()}
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}
