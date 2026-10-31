// Small helpers shared by the page scripts.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fmt(v, decimals = 1) {
  if (v == null || Number.isNaN(v)) return '–';
  return Number(v).toFixed(decimals).replace('-', '−');
}

// Only the scale id is sent, never answers or scores.
export const track = (name, params) => { try { window.gtag?.('event', name, params); } catch {} };

export function toast(msg) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('is-on'), 2600);
}
