import { parseCSV } from './stats.js';
import {
  alphaBand, compareIndependent, comparePaired, compareProportions, completionRate, cronbachAlpha,
  discoveryRate, parseNumbers, sampleSizeCompare, sampleSizeDiscovery, sampleSizeMean, taskTime,
} from './research.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : Number(v).toFixed(d).replace('-', '−'));
const pct = (v, d = 1) => `${fmt(v * 100, d)}%`;
// "an 80%" but "a 95%".
const aPct = (v, d = 0) => `${/^(8|1[18](\D|$))/.test(fmt(v * 100, d)) ? 'an' : 'a'} ${pct(v, d)}`;
// APA style: no leading zero for values that cannot exceed 1, exact p unless below .001.
const apaP = p => (p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3).replace(/^0/, '')}`);
const noZero = (v, d = 2) => fmt(v, d).replace(/^(−?)0\./, '$1.');
const clock = s => {
  if (!Number.isFinite(s)) return '–';
  const m = Math.floor(s / 60), sec = s - m * 60;
  return m ? `${m}:${sec.toFixed(0).padStart(2, '0')}` : `${s.toFixed(1)} s`;
};

const fact = (label, value) => `<div class="fact"><span>${esc(label)}</span><strong>${value}</strong></div>`;
const writeUp = text => `<div class="write-up"><div class="write-up-head"><h3>Write-up</h3><button type="button" class="btn btn-ghost btn-small" data-copy-text>Copy</button></div><p data-write-up>${esc(text)}</p><p class="muted small-note">APA-style sentence. Check the wording fits your study before using it.</p></div>`;
const result = ({ value, label, pill, facts = [], note = '', extra = '', apa }) => `<div class="card tool-result">
  <h2 class="sr-only">Result</h2>
  <div class="tool-headline"><strong>${value}</strong><div><span class="label">${esc(label)}</span>${pill ? ` <span class="pill tone-${pill.tone}">${esc(pill.label)}</span>` : ''}</div></div>
  ${note ? `<p class="tool-note">${note}</p>` : ''}
  ${facts.length ? `<div class="facts">${facts.join('')}</div>` : ''}
  ${extra}
  ${apa ? writeUp(apa) : ''}
</div>`;
const problem = msg => `<div class="error-box">${esc(msg)}</div>`;

function values(form) {
  const data = Object.fromEntries(new FormData(form));
  const n = k => (data[k] === '' || data[k] == null ? NaN : Number(data[k]));
  return { data, n };
}

const TOOLS = {
  'sample-size'(form) {
    const { data, n } = values(form);
    if (data.mode === 'estimate') {
      const c = n('confidence');
      const size = sampleSizeMean({ sd: n('sd'), margin: n('margin'), confidence: c });
      if (!size) return problem('Enter a standard deviation and a margin of error above zero.');
      return result({
        value: size, label: 'participants needed',
        note: `With ${size} participants, ${aPct(c)} confidence interval around the mean should be about ±${fmt(n('margin'), 1)} wide, assuming the standard deviation is about ${fmt(n('sd'), 1)}.`,
        facts: [10, 20, 30, 50].map(k => fact(`With ${k} people`, `±${fmt(n('margin') * Math.sqrt(size / k), 1)}`)),
        apa: `An a priori sample size calculation indicated that ${size} participants would be needed to estimate the mean with a margin of error of ±${fmt(n('margin'), 1)} at ${pct(c, 0)} confidence, assuming a standard deviation of ${fmt(n('sd'), 1)} (Sauro & Lewis, 2016).`,
      });
    }
    if (data.mode === 'compare') {
      const c = n('confidence2'), power = n('power'), paired = data.design === 'within';
      const size = sampleSizeCompare({ sd: n('sd2'), diff: n('diff'), confidence: c, power, paired });
      if (!size) return problem('Enter a standard deviation and a difference above zero.');
      return result({
        value: paired ? size : size * 2, label: paired ? 'participants in total (each tries both designs)' : `participants in total (${size} per design)`,
        note: `This gives ${aPct(power)} chance of detecting a true difference of ${fmt(n('diff'), 1)} or more with a two-sided test at α = ${fmt(1 - c, 2)}.`,
        apa: `A power analysis indicated that ${paired ? `${size} participants (within-subjects)` : `${size} participants per condition (${size * 2} in total)`} would provide ${pct(power, 0)} power to detect a difference of ${fmt(n('diff'), 1)} points (SD = ${fmt(n('sd2'), 1)}) with a two-tailed test at α = ${fmt(1 - c, 2)}.`,
      });
    }
    const p = n('p') / 100, goal = n('goal') / 100;
    const size = sampleSizeDiscovery({ p, goal });
    if (!size) return problem('Both percentages need to be between 1 and 99.');
    const rows = [1, 2, 3, 5, 8, 10, 15, 20].map(k => `<tr><td>${k}</td><td class="num">${pct(discoveryRate(p, k), 0)}</td></tr>`).join('');
    return result({
      value: size, label: 'participants needed',
      note: `With ${size} participants there is at least ${aPct(goal)} chance of seeing a problem that affects ${pct(p, 0)} of users at least once.`,
      extra: `<div class="table-wrap"><table><thead><tr><th>Participants</th><th class="num">Chance of seeing it</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      apa: `Following the cumulative binomial model (Nielsen & Landauer, 1993), ${size} participants give ${aPct(discoveryRate(p, size))} probability of observing a problem that affects ${pct(p, 0)} of users at least once.`,
    });
  },

  'ab-test'(form) {
    const { data, n } = values(form);
    if (data.mode === 'rates') {
      const c = n('confidence2');
      let r;
      try { r = compareProportions(n('x1'), n('n1'), n('x2'), n('n2'), c); } catch (e) { return problem(e.message); }
      const sig = r.p < 1 - c;
      return result({
        value: `${r.diff >= 0 ? '+' : '−'}${fmt(Math.abs(r.diff) * 100, 1)} pts`, label: 'difference in completion rate (A − B)',
        pill: sig ? { label: 'Statistically significant', tone: 'good' } : { label: 'Not significant', tone: 'neutral' },
        note: `Design A: ${pct(r.p1)} (${n('x1')}/${n('n1')}). Design B: ${pct(r.p2)} (${n('x2')}/${n('n2')}). ${sig ? 'The difference is unlikely to be due to chance alone.' : 'The data are consistent with no real difference; a larger sample may be needed.'}`,
        facts: [fact(`${pct(c, 0)} CI of difference`, `${fmt(r.ci[0] * 100, 1)} to ${fmt(r.ci[1] * 100, 1)} pts`), fact('z (N − 1)', fmt(r.z, 2)), fact('p-value', apaP(r.p).replace(/^p = /, ''))],
        apa: `The completion rate was ${pct(r.p1, 0)} for Design A (${n('x1')}/${n('n1')}) and ${pct(r.p2, 0)} for Design B (${n('x2')}/${n('n2')}). An N − 1 two-proportion test ${sig ? 'showed a statistically significant difference' : 'did not show a statistically significant difference'}, z = ${fmt(r.z, 2)}, ${apaP(r.p)}, ${pct(c, 0)} CI of the difference [${fmt(r.ci[0] * 100, 1)}, ${fmt(r.ci[1] * 100, 1)}] percentage points.`,
      });
    }
    const a = parseNumbers(data.a), b = parseNumbers(data.b);
    const bad = [...a.bad, ...b.bad];
    if (bad.length) return problem(`These values are not numbers: ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`);
    const c = n('confidence');
    let r;
    try { r = data.mode === 'paired' ? comparePaired(a.values, b.values, c) : compareIndependent(a.values, b.values, c); } catch (e) { return problem(e.message); }
    const sig = r.p < 1 - c;
    const size = Math.abs(r.d) >= 0.8 ? 'large' : Math.abs(r.d) >= 0.5 ? 'medium' : Math.abs(r.d) >= 0.2 ? 'small' : 'negligible';
    const testName = r.test === 'paired' ? 'A paired-samples t-test' : 'Welch’s t-test';
    return result({
      value: `${r.diff >= 0 ? '+' : '−'}${fmt(Math.abs(r.diff), 2)}`, label: 'difference in means (A − B)',
      pill: sig ? { label: 'Statistically significant', tone: 'good' } : { label: 'Not significant', tone: 'neutral' },
      note: `Design A: M = ${fmt(r.A.mean, 2)} (SD ${fmt(r.A.sd, 2)}, n = ${r.A.n}). Design B: M = ${fmt(r.B.mean, 2)} (SD ${fmt(r.B.sd, 2)}, n = ${r.B.n}). The effect is ${size}.`,
      facts: [
        fact(`${pct(c, 0)} CI of difference`, `${fmt(r.ci[0], 2)} to ${fmt(r.ci[1], 2)}`),
        fact(`t (df ${fmt(r.df, r.test === 'paired' ? 0 : 1)})`, fmt(r.t, 2)),
        fact('p-value', apaP(r.p).replace(/^p = /, '')),
        fact(r.test === 'paired' ? 'Cohen’s d_z' : 'Cohen’s d', fmt(r.d, 2)),
      ],
      apa: `${testName} ${sig ? 'showed' : 'did not show'} a statistically significant difference between Design A (M = ${fmt(r.A.mean, 2)}, SD = ${fmt(r.A.sd, 2)}) and Design B (M = ${fmt(r.B.mean, 2)}, SD = ${fmt(r.B.sd, 2)}), t(${fmt(r.df, r.test === 'paired' ? 0 : 2)}) = ${fmt(r.t, 2)}, ${apaP(r.p)}, d = ${fmt(r.d, 2)}, ${pct(c, 0)} CI of the difference [${fmt(r.ci[0], 2)}, ${fmt(r.ci[1], 2)}].`,
    });
  },

  'completion-rate'(form) {
    const { n } = values(form);
    const c = n('confidence'), bench = n('bench') / 100;
    let r;
    try { r = completionRate(n('x'), n('n'), c); } catch (e) { return problem(e.message); }
    let verdict = null;
    if (Number.isFinite(bench)) {
      verdict = r.ci[0] > bench ? { label: `Above ${pct(bench, 0)}`, tone: 'great' } : r.ci[1] < bench ? { label: `Below ${pct(bench, 0)}`, tone: 'bad' } : { label: `Not distinguishable from ${pct(bench, 0)}`, tone: 'ok' };
    }
    return result({
      value: pct(r.best, 0), label: 'best estimate of the completion rate', pill: verdict,
      note: `${n('x')} of ${n('n')} completed the task (${pct(r.observed, 0)}). The ${pct(c, 0)} adjusted-Wald interval runs from ${pct(r.ci[0], 0)} to ${pct(r.ci[1], 0)}. ${r.method === 'observed proportion' ? 'Between 50% and 90% the observed rate is already the best estimate.' : `The best estimate uses the ${r.method} adjustment for small samples.`}`,
      facts: [fact('Observed', pct(r.observed, 1)), fact('Best estimate', pct(r.best, 1)), fact(`${pct(c, 0)} CI low`, pct(r.ci[0], 1)), fact(`${pct(c, 0)} CI high`, pct(r.ci[1], 1))],
      apa: `${n('x')} of ${n('n')} participants (${pct(r.observed, 0)}) completed the task, ${pct(c, 0)} CI [${pct(r.ci[0], 0)}, ${pct(r.ci[1], 0)}] (adjusted Wald).${verdict && Number.isFinite(bench) ? ` ${r.ci[0] > bench ? `The interval lies entirely above the ${pct(bench, 0)} benchmark.` : r.ci[1] < bench ? `The interval lies entirely below the ${pct(bench, 0)} benchmark.` : `The interval includes the ${pct(bench, 0)} benchmark.`}` : ''}`,
    });
  },

  'time-on-task'(form) {
    const { data, n } = values(form);
    const { values: times, bad } = parseNumbers(data.times, { times: true });
    if (bad.length) return problem(`These values could not be read as times: ${bad.slice(0, 5).join(', ')}`);
    const c = n('confidence');
    let r;
    try { r = taskTime(times, c); } catch (e) { return problem(e.message); }
    return result({
      value: clock(r.geometric), label: 'geometric mean task time',
      note: `${pct(c, 0)} confidence interval: ${clock(r.ci[0])} to ${clock(r.ci[1])}. ${r.n < 25 ? 'With fewer than 25 times, the geometric mean is the best estimate of the typical (median) time.' : 'With 25 or more times, the median is also a good summary.'}${r.dropped ? ` ${r.dropped} value${r.dropped > 1 ? 's' : ''} of zero or less were ignored.` : ''}`,
      facts: [fact('Geometric mean', `${fmt(r.geometric, 1)} s`), fact('Median', `${fmt(r.median, 1)} s`), fact('Arithmetic mean', `${fmt(r.mean, 1)} s`), fact('SD', `${fmt(r.sd, 1)} s`), fact('Range', `${fmt(r.min, 0)}–${fmt(r.max, 0)} s`), fact('n', r.n)],
      apa: `The geometric mean task time was ${fmt(r.geometric, 1)} s, ${pct(c, 0)} CI [${fmt(r.ci[0], 1)}, ${fmt(r.ci[1], 1)}] (n = ${r.n}; median = ${fmt(r.median, 1)} s).`,
    });
  },

  'cronbach-alpha'(form) {
    const { data, n } = values(form);
    const rows = parseCSV(data.data.trim()).filter(r => r.some(c => c.trim() !== ''));
    if (!rows.length) return problem('Paste some responses first.');
    const isNum = c => /^-?\d+([.,]\d+)?$/.test(c.trim());
    const header = rows[0].some(c => c.trim() && !isNum(c) && !/^n\/?a$/i.test(c.trim()));
    let body = header ? rows.slice(1) : rows;
    const idCol = body.length && body.every(r => r[0] && !isNum(r[0]));
    if (idCol) body = body.map(r => r.slice(1));
    const names = header ? rows[0].slice(idCol ? 1 : 0) : body[0].map((_, i) => `Item ${i + 1}`);
    const reverse = new Set(String(data.reverse).split(/[\s,;]+/).map(Number).filter(Boolean));
    const lo = n('min'), hi = n('max');
    if (reverse.size && !(Number.isFinite(lo) && Number.isFinite(hi))) return problem('Enter the lowest and highest response so reversed items can be flipped.');
    const matrix = body.map(r => r.map((c, j) => {
      const t = c.trim();
      if (t === '' || /^n\/?a$/i.test(t) || !isNum(t)) return null;
      const v = Number(t.replace(',', '.'));
      return reverse.has(j + 1) ? lo + hi - v : v;
    }));
    let r;
    try { r = cronbachAlpha(matrix); } catch (e) { return problem(e.message); }
    const band = alphaBand(r.alpha);
    const rowsHtml = r.items.map(it => {
      const flag = it.alphaIfDeleted != null && it.alphaIfDeleted > r.alpha + 0.005;
      const weak = it.itemTotal != null && it.itemTotal < 0.3;
      return `<tr${flag || weak ? ' class="row-flag"' : ''}><td>${esc(names[it.index] ?? `Item ${it.index + 1}`)}${reverse.has(it.index + 1) ? ' <span class="rev-tag">reversed</span>' : ''}</td><td class="num">${fmt(it.mean, 2)}</td><td class="num">${fmt(it.sd, 2)}</td><td class="num">${fmt(it.itemTotal, 2)}</td><td class="num">${fmt(it.alphaIfDeleted, 3)}</td></tr>`;
    }).join('');
    const flagged = r.items.filter(it => it.alphaIfDeleted != null && it.alphaIfDeleted > r.alpha + 0.005);
    return result({
      value: `α = ${noZero(r.alpha, 3)}`, label: `Cronbach’s alpha · ${r.k} items · ${r.n} respondents`, pill: band,
      note: `${flagged.length ? `Dropping ${flagged.map(it => esc(names[it.index] ?? `item ${it.index + 1}`)).join(', ')} would raise alpha. Check the wording, or whether ${flagged.length > 1 ? 'they need' : 'it needs'} reversing.` : 'No single item would raise alpha if it were removed.'}${r.dropped ? ` ${r.dropped} row${r.dropped > 1 ? 's' : ''} with missing values were left out.` : ''}`,
      extra: `<div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Mean</th><th class="num">SD</th><th class="num">Item–total r</th><th class="num">α if deleted</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`,
      apa: `Internal consistency was ${band.label.toLowerCase()} (Cronbach’s α = ${noZero(r.alpha, 2)}, k = ${r.k}, N = ${r.n}).`,
    });
  },
};

async function fillAlphaPresets(form) {
  const select = $('[data-alpha-preset]', form);
  if (!select) return;
  const { SCALES } = await import('./scales.js');
  const usable = SCALES.filter(s => s.items.length > 1 && s.type !== 'slider' && s.type !== 'nps');
  select.insertAdjacentHTML('beforeend', usable.map(s => `<option value="${s.id}">${esc(s.abbr)}: ${esc(s.name)}</option>`).join(''));
  select.addEventListener('change', () => {
    const s = usable.find(x => x.id === select.value);
    if (!s) return;
    form.elements.reverse.value = s.items.filter(i => i.reverse).map(i => i.n).join(', ');
    form.elements.min.value = s.response.min;
    form.elements.max.value = s.response.max;
  });
}

export function initTool(id, { toast }) {
  const form = $('[data-tool-form]');
  const out = $('[data-tool-out]');
  const run = TOOLS[id];
  if (!form || !run) return;
  fillAlphaPresets(form);

  const syncModes = () => {
    const mode = form.elements.mode?.value;
    $$('[data-mode-fields]', form).forEach(el => { el.hidden = mode != null && !el.dataset.modeFields.split(' ').includes(mode); });
  };
  let timer;
  const update = () => {
    syncModes();
    clearTimeout(timer);
    timer = setTimeout(() => { out.innerHTML = run(form); }, 120);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', e => e.preventDefault());
  syncModes();
  out.innerHTML = run(form);

  out.addEventListener('click', async e => {
    if (!e.target.closest('[data-copy-text]')) return;
    try {
      await navigator.clipboard.writeText($('[data-write-up]', out).textContent);
      toast('Copied to clipboard.');
    } catch {
      toast('Could not copy. Select the text instead.');
    }
  });
}
