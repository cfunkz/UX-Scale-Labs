import { $, $$, toast } from './util.js';

function initTheme() {
  const root = document.documentElement;
  const isDark = () => (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  $$('[data-theme-toggle]').forEach(btn => {
    btn.setAttribute('aria-pressed', isDark());
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      btn.setAttribute('aria-pressed', next === 'dark');
      try { localStorage.setItem('theme', next); } catch {}
    });
  });
}

// Phone menu: the same links as the desktop bar, shown in a panel under the header.
function initMenu() {
  const nav = $('[data-nav]');
  const btn = $('[data-menu]');
  if (!nav || !btn) return;
  const set = open => { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('.nav-links a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) set(false); });
}

function initHome() {
  // Links from the old single-page version: /?q=sus and /#/sus
  const legacy = new URLSearchParams(location.search).get('q') || (location.hash.startsWith('#/') ? location.hash.slice(2) : '');
  if (legacy && $(`.scale-row[href="/${CSS.escape(legacy.toLowerCase())}/"]`)) {
    location.replace(`/${legacy.toLowerCase()}/`);
    return;
  }

  const input = $('[data-search-input]');
  const chips = $$('[data-filter]');
  let filter = 'all';

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    $$('[data-category-group]').forEach(group => {
      let groupVisible = 0;
      $$('.scale-row', group).forEach(card => {
        const show = (filter === 'all' || card.dataset.category === filter) && (!q || card.dataset.search.includes(q));
        card.hidden = !show;
        if (show) groupVisible++;
      });
      group.hidden = groupVisible === 0;
      visible += groupVisible;
    });
    $('[data-empty]').hidden = visible > 0;
  };

  input.addEventListener('input', apply);
  const preset = new URLSearchParams(location.search).get('s');
  if (preset) {
    input.value = preset;
    apply();
    $('#scales').scrollIntoView();
  }
  chips.forEach(chip => chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    chips.forEach(c => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-pressed', c === chip); });
    apply();
  }));
}

function showLoadTime() {
  const el = $('[data-load-time]');
  if (!el) return;
  const nav = performance.getEntriesByType?.('navigation')[0];
  const ms = nav?.loadEventEnd || (performance.timing && performance.timing.loadEventEnd - performance.timing.navigationStart);
  if (!ms || ms <= 0) return;
  el.textContent = `${Math.round(ms)} ms`;
  el.hidden = false;
}

// loadEventEnd is only set once the load handlers have finished, so wait a tick.
if (document.readyState === 'complete') setTimeout(showLoadTime);
else addEventListener('load', () => setTimeout(showLoadTime));

// Offline cache for repeat visits. Registered after load so it never competes with the first paint.
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

initTheme();
initMenu();
const page = document.body.dataset.page;
if (page === 'home') initHome();
if (page === 'scale') import('./scale-page.js').then(m => m.initScalePage(document.body.dataset.scale));
if (page === 'tool' && document.body.dataset.tool === 'combine') import('./combine.js').then(m => m.initCombine({ toast }));
else if (page === 'tool') import('./tools-ui.js').then(m => m.initTool(document.body.dataset.tool, { toast }));

