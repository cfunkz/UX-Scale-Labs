// Homepage sample result: pick a questionnaire and drag the bar to see how a score is
// graded. Bands and facts come from the same scoring code the questionnaires use.
import { $, $$ } from './util.js';
import { SCORERS, susGrade, acceptability } from './scoring.js';

const fix = (v, d) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('-', '−');
const signed = (v, d) => (Math.round(v * 10 ** d) >= 0 ? '+' : '') + fix(v, d);

const TLX_BANDS = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 100]];

const SCALES = {
  sus: {
    name: 'SUS', href: '/sus/', min: 0, max: 100, step: 2.5, start: 82.5, decimals: 1,
    unit: 'of 100', ref: 68, refLabel: 'average 68',
    describe: SCORERS.sus.describe,
    facts: v => [['Percentile', susGrade(v).percentile], ['Acceptability', acceptability(v)], ['vs. average', signed(v - 68, 1)]],
  },
  ueq: {
    name: 'UEQ', href: '/ueq/', min: -3, max: 3, step: 0.05, start: 1.45, decimals: 2,
    unit: 'mean, −3 to +3', ref: 0.8, refLabel: 'positive above 0.8', minLabel: '−3', maxLabel: '+3',
    describe: SCORERS.ueq.describe,
    facts: (v, band) => [['Impression', band.label], ['vs. neutral (0)', signed(v, 2)], ['vs. 0.8 cut-off', signed(v - 0.8, 2)]],
  },
  tlx: {
    name: 'NASA-TLX', href: '/nasa-tlx/', min: 0, max: 100, step: 1, start: 34, decimals: 0,
    unit: 'of 100', ref: 50, refLabel: 'midpoint 50',
    describe: SCORERS.tlx.describe,
    facts: (v, band) => {
      const [lo, hi] = TLX_BANDS.find(([, top]) => v < top) ?? TLX_BANDS.at(-1);
      return [['Workload', band.label], ['Band range', `${lo}–${hi}`], ['Orientation', 'Lower is better']];
    },
  },
  seq: {
    name: 'SEQ', href: '/seq/', min: 1, max: 7, step: 0.1, start: 5.8, decimals: 1,
    unit: 'of 7', ref: 5.5, refLabel: 'average ≈ 5.5',
    describe: SCORERS.seq.describe,
    facts: (v, band) => [['Difficulty', band.label], ['vs. average', signed(v - 5.5, 1)], ['Worth probing', v < 4.5 ? 'Yes, ask why' : 'Not needed']],
  },
};

export function initPreview(card) {
  const input = $('[data-preview-input]', card);
  const fill = $('.preview-bar i', card);
  const marker = $('.preview-bar b', card);
  const tabs = $$('[data-preview-scale]', card);
  const out = {
    value: $('[data-preview-value]', card), unit: $('[data-preview-unit]', card), band: $('[data-preview-band]', card),
    min: $('[data-preview-min]', card), ref: $('[data-preview-ref]', card), max: $('[data-preview-max]', card),
    facts: $('[data-preview-facts]', card), link: $('[data-preview-link]', card),
  };
  const arrow = out.link.querySelector('svg')?.outerHTML ?? '';
  let scale = SCALES.sus;

  const pct = v => ((v - scale.min) / (scale.max - scale.min)) * 100;

  function render() {
    const v = Number(input.value);
    const band = scale.describe(v);
    const shown = fix(v, scale.decimals);
    out.value.textContent = shown;
    out.band.textContent = band.label;
    out.band.className = `pill tone-${band.tone}`;
    fill.style.setProperty('--tone', `var(--${band.tone})`);
    fill.style.setProperty('--w', `${pct(v)}%`);
    out.facts.replaceChildren(...scale.facts(v, band).map(([label, value]) => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      span.textContent = label;
      strong.textContent = value;
      div.append(span, strong);
      return div;
    }));
    input.setAttribute('aria-valuetext', `${shown} ${scale.unit}, ${band.label}`);
  }

  function select(key) {
    scale = SCALES[key];
    tabs.forEach(t => t.setAttribute('aria-pressed', t.dataset.previewScale === key));
    Object.assign(input, { min: scale.min, max: scale.max, step: scale.step });
    input.value = scale.start;
    input.setAttribute('aria-label', `Sample ${scale.name} score`);
    out.unit.textContent = scale.unit;
    out.min.textContent = scale.minLabel ?? scale.min;
    out.max.textContent = scale.maxLabel ?? scale.max;
    out.ref.textContent = scale.refLabel;
    marker.style.setProperty('--x', `${pct(scale.ref)}%`);
    out.link.innerHTML = `Take the ${scale.name} ${arrow}`;
    out.link.href = scale.href;
    render();
  }

  // Animate jumps (tab switch, arrow keys) but follow the pointer exactly while dragging.
  input.addEventListener('pointerdown', () => card.classList.add('is-dragging'));
  addEventListener('pointerup', () => card.classList.remove('is-dragging'));
  addEventListener('pointercancel', () => card.classList.remove('is-dragging'));
  input.addEventListener('input', render);
  tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.previewScale)));
  card.dataset.ready = '';
}
