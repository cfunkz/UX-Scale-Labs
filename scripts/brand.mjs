// The mark is a five-point rating scale drawn as a gauge, with the needle on the fourth point.
const C = { x: 32, y: 41, r: 20 };
const polar = (deg, r = C.r) => [C.x + r * Math.cos((deg * Math.PI) / 180), C.y - r * Math.sin((deg * Math.PI) / 180)];
const f = n => n.toFixed(2);

function segment(from, to, r) {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 1 ${f(x2)} ${f(y2)}`;
}

export function markPaths({ ink = '#fff', accent = '#9ef0c4', stroke = 7.5, gap = 5 } = {}) {
  const step = 180 / 5;
  const segs = Array.from({ length: 5 }, (_, i) => {
    const from = 180 - i * step - gap / 2;
    const to = 180 - (i + 1) * step + gap / 2;
    const on = i === 3;
    return `<path d="${segment(from, to, C.r)}" fill="none" stroke="${on ? accent : ink}" stroke-opacity="${on ? 1 : 0.38 + i * 0.12}" stroke-width="${stroke}"/>`;
  }).join('');
  const [nx, ny] = polar(180 - 3.5 * step, C.r - 8);
  return `${segs}<path d="M${C.x} ${C.y}L${f(nx)} ${f(ny)}" stroke="${ink}" stroke-width="4.2" stroke-linecap="round"/><circle cx="${C.x}" cy="${C.y}" r="4.6" fill="${ink}"/>`;
}

const bg = (rx, id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5865f2"/><stop offset="1" stop-color="#2f37b3"/></linearGradient></defs><rect width="64" height="64" rx="${rx}" fill="url(#${id})"/>`;

// Full-colour app icon. `rx` 0 gives a full-bleed square for iOS and maskable icons.
export function iconSVG({ rx = 16, padding = 0, id = 'g' } = {}) {
  const scale = 1 - padding * 2;
  const inner = padding ? `<g transform="translate(${32 - 32 * scale} ${32 - 32 * scale}) scale(${scale})">${markPaths()}</g>` : markPaths();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg(rx, id)}${inner}</svg>`;
}

// Inline header logo; colours come from CSS so it follows the theme.
export function headerLogo() {
  return `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="currentColor"/>${markPaths({ ink: 'var(--logo-ink)', accent: 'var(--logo-accent)' })}</svg>`;
}
