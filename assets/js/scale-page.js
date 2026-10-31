import { SCALE_MAP } from './scales.js';
import { SCORERS, scoreScale } from './scoring.js';
import { describe, histogram, jsonToRows, parseCSV, toCSV } from './stats.js';
import { alphaBand, cronbachAlpha, inTextCitation } from './research.js';
import { $, $$, esc, fmt, toast, track } from './util.js';

// Exports, PDF and print are only needed after someone clicks, so load them then.
const exporter = () => import('./export.js');

function initTabs() {
  const tabs = $$('[data-tab]');
  const show = (name, push = true) => {
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $(`#panel-${t.dataset.tab}`).hidden = !on;
    });
    if (push) history.replaceState(null, '', name === 'take' ? location.pathname : `#${name}`);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    // Arrow keys move between tabs, as screen reader users expect from a tab list.
    t.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
      if (step == null) return;
      e.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      show(next.dataset.tab);
      next.focus();
    });
  });
  const fromHash = () => {
    const name = location.hash.slice(1);
    if (tabs.some(t => t.dataset.tab === name)) show(name, false);
  };
  addEventListener('hashchange', fromHash);
  fromHash();
}

function readAnswers(form, scale) {
  const answers = {};
  for (const item of scale.items) {
    const field = form.elements[`q${item.n}`];
    if (scale.type === 'slider') {
      if (!field.classList.contains('pristine')) answers[item.n] = Number(field.value);
    } else {
      const checked = $(`input[name="q${item.n}"]:checked`, form);
      if (checked) answers[item.n] = checked.value === 'na' ? null : Number(checked.value);
    }
  }
  return answers;
}

function initQuestionnaire(scale) {
  const form = $('[data-form]');
  const out = $('[data-results]');
  const total = scale.items.length;
  let lastResult = null;

  const updateProgress = () => {
    const answers = readAnswers(form, scale);
    const done = Object.keys(answers).length;
    $('[data-progress]').style.width = `${(done / total) * 100}%`;
    $('[data-progress-label]').textContent = `${done} of ${total} answered`;
    $$('.q', form).forEach(q => {
      const has = q.dataset.item in answers;
      q.classList.toggle('is-answered', has);
      if (has) q.classList.remove('is-missing');
    });
  };

  form.addEventListener('change', updateProgress);
  $$('input[type="range"]', form).forEach(slider => {
    const sync = () => {
      slider.classList.remove('pristine');
      slider.style.setProperty('--fill', `${slider.value}%`);
      slider.parentElement.querySelector('output').textContent = slider.value;
      updateProgress();
    };
    slider.addEventListener('input', sync);
    slider.addEventListener('pointerdown', () => { if (slider.classList.contains('pristine')) sync(); });
    slider.addEventListener('keydown', () => { if (slider.classList.contains('pristine')) sync(); });
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      $$('input[type="range"]', form).forEach(s => {
        s.classList.add('pristine');
        s.style.setProperty('--fill', '50%');
        s.parentElement.querySelector('output').textContent = '–';
      });
      $$('.q', form).forEach(q => q.classList.remove('is-missing'));
      updateProgress();
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const answers = readAnswers(form, scale);
    const missing = scale.items.filter(it => !(it.n in answers));
    if (missing.length) {
      missing.forEach(it => $(`.q[data-item="${it.n}"]`, form).classList.add('is-missing'));
      $(`.q[data-item="${missing[0].n}"]`, form).scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`${missing.length} ${missing.length === 1 ? 'question still needs' : 'questions still need'} an answer`);
      return;
    }
    let result;
    try {
      result = scoreScale(scale, answers);
    } catch (err) {
      toast(err.message);
      return;
    }
    const meta = {
      product: form.elements.product.value.trim(),
      participant: form.elements.participant.value.trim(),
      date: new Date(),
    };
    lastResult = { scale, result, answers, meta };
    track('questionnaire_complete', { scale_id: scale.id });
    out.innerHTML = renderResults(scale, result, meta);
    form.hidden = true;
    out.hidden = false;
    requestAnimationFrame(() => {
      const fill = $('.gauge .fill', out);
      if (fill) fill.style.strokeDashoffset = fill.dataset.offset;
    });
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  out.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'edit') {
      out.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (btn.dataset.action === 'new') {
      form.reset();
      form.elements.participant.value = '';
      out.hidden = true;
      form.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (btn.dataset.export) {
      try {
        await (await exporter()).exportSingle(btn.dataset.export, lastResult);
        track('results_export', { scale_id: scale.id, format: btn.dataset.export });
      } catch (err) {
        console.error(err);
        toast('Export failed. Try reloading the page.');
      }
    } else if (btn.dataset.action === 'copy') {
      await navigator.clipboard.writeText((await exporter()).summaryText(lastResult));
      toast('Summary copied');
    }
  });

  updateProgress();
}

function gauge(primary, tone) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (primary.value - primary.min) / (primary.max - primary.min)));
  return `<div class="gauge">
    <svg viewBox="0 0 170 170"><circle class="track" cx="85" cy="85" r="${r}"/><circle class="fill" cx="85" cy="85" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - pct)}" style="stroke: var(--${tone || 'accent'})"/></svg>
    <div class="gauge-value"><strong>${fmt(primary.value, primary.decimals)}${primary.suffix ?? ''}</strong><span>${primary.min} to ${primary.max}</span></div>
  </div>`;
}

function bar(s) {
  const span = s.max - s.min;
  const pos = v => ((v - s.min) / span) * 100;
  const v = s.value ?? s.min;
  let fill;
  if (s.min < 0) {
    const zero = pos(0);
    const p = pos(v);
    fill = `<span class="zero"></span><i class="tone-bg-${s.band?.tone ?? 'neutral'}" style="left:${Math.min(zero, p)}%;width:${Math.abs(p - zero)}%"></i>`;
  } else {
    fill = `<i class="tone-bg-${s.band?.tone ?? 'neutral'}" style="left:0;width:${pos(v)}%"></i>`;
  }
  const ticks = (s.ticks ?? []).map(t => `<span class="tick" style="left:${pos(t)}%" title="Benchmark boundary ${t}"></span>`).join('');
  const norm = s.norm != null ? `<span class="tick norm" style="left:${pos(s.norm)}%" title="Norm ${s.norm}"></span>` : '';
  return `<div class="bar-row">
    <div class="bar-label">${esc(s.name)}${s.band ? `<span class="pill tone-${s.band.tone}">${esc(s.band.label)}</span>` : ''}</div>
    <div class="bar">${fill}${ticks}${norm}</div>
    <span class="val">${fmt(s.value, s.decimals)}</span>
    ${s.ci ? `<span class="bar-note">95% CI ${fmt(s.ci[0], s.decimals)} to ${fmt(s.ci[1], s.decimals)} · n = ${s.n}</span>` : ''}
  </div>`;
}

function subscaleLegend(scale, subs) {
  const notes = [];
  if (subs.some(s => s.ticks)) notes.push('<span><i></i>UEQ benchmark boundaries (bad · below avg · above avg · good · excellent)</span>');
  if (subs.some(s => s.norm != null)) notes.push('<span><i></i>Published norm (Lewis, 2002)</span>');
  if (subs.some(s => s.lowerIsBetter)) notes.push('<span>Lower is better</span>');
  return notes.length ? `<div class="legend">${notes.join('')}</div>` : '';
}

function renderResults(scale, result, meta) {
  const p = result.primary;
  const who = [meta.product, meta.participant && `Participant ${meta.participant}`].filter(Boolean).join(' · ');
  const subs = result.subscales ?? [];
  return `<div class="results-head">
    <div><h2>Results</h2><p>${esc(who || scale.name)} · ${meta.date.toLocaleString()}</p></div>
    <div class="export-row">
      <button type="button" class="btn btn-ghost btn-small" data-action="edit">Edit answers</button>
      <button type="button" class="btn btn-primary btn-small" data-action="new">New response</button>
    </div>
  </div>
  <div class="card score-card">
    ${gauge(p, result.band?.tone)}
    <div class="score-detail">
      <span class="label">${esc(p.label)}${p.lowerIsBetter ? ' · lower is better' : ''}</span>
      ${result.band ? `<div><span class="pill tone-${result.band.tone}">${esc(result.band.label)}</span>${result.band.note ? ` <span class="muted">${esc(result.band.note)}</span>` : ''}</div>` : ''}
      <p>${esc(result.interpretation)}</p>
      <div class="facts">${result.facts.map(f => `<div class="fact"><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join('')}</div>
    </div>
  </div>
  ${subs.length ? `<div class="card"><h3>${scale.type === 'slider' ? 'Dimensions' : 'Subscales'}</h3><div class="bars">${subs.map(bar).join('')}</div>${subscaleLegend(scale, subs)}</div>` : ''}
  <div class="card">
    <h3>Responses</h3>
    <div class="table-wrap"><table>
      <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col" class="num">Response</th>${result.scoredLabel ? `<th scope="col" class="num hide-sm">${esc(result.scoredLabel)}</th>` : ''}</tr></thead>
      <tbody>${result.items.map(r => `<tr><td class="num">${r.n}</td><td>${esc(r.text)}${scale.items[r.n - 1].reverse ? '<span class="rev-tag">reversed</span>' : ''}</td><td class="num">${r.response ?? 'N/A'}</td>${result.scoredLabel ? `<td class="num hide-sm">${fmt(r.scored, Number.isInteger(r.scored) ? 0 : 1)}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div>
  </div>
  <div class="card">
    <h3>Export</h3>
    <div class="export-row">
      <button type="button" class="btn btn-ghost btn-small" data-export="pdf">PDF report</button>
      <button type="button" class="btn btn-ghost btn-small" data-export="csv">CSV</button>
      <button type="button" class="btn btn-ghost btn-small" data-export="json">JSON</button>
      <button type="button" class="btn btn-ghost btn-small" data-export="txt">Text</button>
      <button type="button" class="btn btn-ghost btn-small" data-export="zip">All as ZIP</button>
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost btn-small" data-action="copy">Copy summary</button>
    </div>
    <p class="muted small-note">Taking part in someone’s study? Send them any of these files. The researcher can merge everyone’s files with <a href="/combine/">Combine results</a>.</p>
  </div>`;
}

// ---- Dataset scoring ----

function readDataset(scale, text) {
  const nItems = scale.items.length;
  const isJSON = /^\s*[[{]/.test(text);
  const { rows, skipped } = isJSON ? jsonToRows(text, nItems) : { rows: parseCSV(text), skipped: {} };
  if (!rows.length) throw new Error('The file is empty.');
  const r = scale.response;
  let header = rows[0].map(h => h.toLowerCase().replace(/[\s_.-]/g, ''));
  let body = rows.slice(1);
  let idCol = -1;
  const itemCols = {};

  const looksNumeric = !isJSON && rows[0].every(c => c === '' || /^-?\d+(\.\d+)?$/.test(c) || /^n\/?a$/i.test(c));
  if (looksNumeric) {
    body = rows;
    const offset = rows[0].length === nItems + 1 ? 1 : 0;
    if (offset) idCol = 0;
    for (let n = 1; n <= nItems; n++) itemCols[n] = n - 1 + offset;
  } else {
    header.forEach((h, i) => {
      const m = h.match(/^(?:q|item)?(\d+)$/);
      if (m && +m[1] >= 1 && +m[1] <= nItems) itemCols[+m[1]] = i;
      else if (idCol < 0 && /^(id|respondent|participant|user|name)/.test(h)) idCol = i;
    });
  }
  const missingCols = scale.items.filter(it => itemCols[it.n] == null).map(it => `Q${it.n}`);
  if (missingCols.length) throw new Error(`Missing column${missingCols.length > 1 ? 's' : ''}: ${missingCols.join(', ')}. Download the template to see the expected layout.`);

  const respondents = [];
  const issues = [];
  body.forEach((row, i) => {
    const line = isJSON ? i + 1 : i + (looksNumeric ? 1 : 2);
    const where = isJSON ? 'Respondent' : 'Row';
    if (skipped[i]) { issues.push(`${where} ${line} ${skipped[i]} Skipped.`); return; }
    const id = idCol >= 0 && row[idCol] ? row[idCol] : `R${respondents.length + 1}`;
    const answers = {};
    for (const it of scale.items) {
      const raw = (row[itemCols[it.n]] ?? '').trim();
      if (raw === '' || /^n\/?a$/i.test(raw)) {
        if (r.na) { answers[it.n] = null; continue; }
        issues.push(`${where} ${line}: Q${it.n} is empty, so it was skipped.`);
        return;
      }
      const v = Number(raw.replace(',', '.'));
      const okStep = scale.type === 'slider' || Number.isInteger(v);
      if (!Number.isFinite(v) || v < r.min || v > r.max || !okStep) {
        issues.push(`${where} ${line}: Q${it.n} = "${raw}" is ${Number.isFinite(v) && !okStep ? 'not a whole number' : `outside ${r.min}–${r.max}`}, so it was skipped.`);
        return;
      }
      answers[it.n] = v;
    }
    try {
      respondents.push({ id, answers, result: scoreScale(scale, answers) });
    } catch (err) {
      issues.push(`${where} ${line}: ${err.message}`);
    }
  });
  return { respondents, issues };
}

export function aggregate(scale, respondents) {
  const scorer = SCORERS[scale.scorer];
  const p0 = respondents[0].result.primary;
  const primaryVals = respondents.map(r => r.result.primary.value);
  const stats = describe(primaryVals);
  const extra = scorer.aggregate?.(primaryVals) ?? {};
  const headline = extra.headline ?? { label: `Mean ${p0.label}`, value: stats.mean, min: p0.min, max: p0.max, decimals: Math.max(1, p0.decimals), ci: stats.ci, lowerIsBetter: p0.lowerIsBetter };
  const band = extra.headline ? null : scorer.describe(stats.mean, scale);

  const subs = (respondents[0].result.subscales ?? []).map((s, i) => {
    const d = describe(respondents.map(r => r.result.subscales[i].value));
    return { ...s, value: d.mean, ci: d.ci, n: d.n, sd: d.sd, band: s.describe && d.n ? s.describe(d.mean) : null };
  });
  return { stats, headline, band, facts: extra.facts ?? [], subs, primaryVals };
}

// Alpha per subscale where the questionnaire has them, otherwise across all items.
function reliability(scale, respondents) {
  if (scale.items.length < 2 || scale.type === 'slider' || scale.type === 'nps') return [];
  const { min, max } = scale.response;
  const groups = scale.subscales?.filter(s => s.items.length > 1).map(s => ({ name: s.name, items: s.items }))
    ?? [{ name: scale.abbr, items: scale.items.map(i => i.n) }];
  return groups.map(g => {
    const rows = respondents.map(r => g.items.map(n => {
      const v = r.answers[n];
      return v == null ? null : scale.items[n - 1].reverse ? min + max - v : v;
    }));
    try {
      const res = cronbachAlpha(rows);
      return { ...g, alpha: res.alpha, n: res.n };
    } catch {
      return { ...g, alpha: null, n: 0 };
    }
  });
}

const noZero = (v, d = 2) => fmt(v, d).replace(/^(−?)0\./, '$1.');

function writeUp(scale, agg, rel) {
  const h = agg.headline, s = agg.stats;
  const cite = scale.refs[0] ? inTextCitation(scale.refs[0].text) : null;
  const isMean = h.label.startsWith('Mean ');
  let what = isMean ? h.label.slice(5) : h.label;
  if (/^[A-Z][a-z]+(\s[^A-Z]\S*)*$/.test(what)) what = what[0].toLowerCase() + what.slice(1);
  what = /^mean/.test(what) ? `overall ${scale.abbr} ${what}` : isMean ? `mean ${what}` : what;
  const clamp = v => Math.min(h.max ?? Infinity, Math.max(h.min ?? -Infinity, v));
  const d = h.decimals ?? 1;
  let text = `A total of ${s.n} participants completed the ${scale.name}${scale.name.includes(scale.abbr) ? '' : ` (${scale.abbr}${cite ? `; ${cite}` : ''})`}${scale.name.includes(scale.abbr) && cite ? ` (${cite})` : ''}. `;
  text += `The ${what} was ${fmt(h.value, d)}${h.suffix ?? ''}${isMean ? ` (SD = ${fmt(s.sd, 2)})` : ''}`;
  if (h.ci) text += `, 95% CI [${fmt(clamp(h.ci[0]), d)}, ${fmt(clamp(h.ci[1]), d)}]`;
  text += agg.band ? `, which falls in the “${agg.band.label}” range.` : '.';
  if (agg.subs.length) text += ` Subscale means were ${agg.subs.map(x => `${x.name} (M = ${fmt(x.value, 2)}, SD = ${fmt(x.sd, 2)})`).join(', ')}.`;
  const ok = rel.filter(r => r.alpha != null);
  if (ok.length === 1 && rel.length === 1) text += ` Internal consistency was ${alphaBand(ok[0].alpha).label.toLowerCase()} (Cronbach’s α = ${noZero(ok[0].alpha)}).`;
  else if (ok.length) text += ` Cronbach’s α was ${ok.map(r => `${noZero(r.alpha)} for ${r.name}`).join(', ')}.`;
  return text;
}

function renderDataset(scale, data) {
  const { respondents, issues } = data;
  if (!respondents.length) {
    return `<div class="error-box">No valid rows found.</div>${fileNotes(data.notes)}${issues.length ? `<div class="issues"><ul>${issues.slice(0, 20).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}`;
  }
  const agg = aggregate(scale, respondents);
  const h = agg.headline;
  const s = agg.stats;
  const p0 = respondents[0].result.primary;
  const discrete = p0.decimals === 0 && p0.max - p0.min <= 10;
  const bins = discrete
    ? Array.from({ length: p0.max - p0.min + 1 }, (_, i) => ({ label: p0.min + i, count: agg.primaryVals.filter(v => v === p0.min + i).length }))
    : histogram(agg.primaryVals, p0.min, p0.max, 10).map(b => ({ label: fmt(b.from, p0.max - p0.min <= 10 ? 1 : 0), count: b.count }));
  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const subs = respondents[0].result.subscales ?? [];
  const rel = reliability(scale, respondents);

  return `<div class="dataset-results">
    ${fileNotes(data.notes)}
    ${issues.length ? `<div class="issues"><strong>${issues.length} row${issues.length > 1 ? 's' : ''} skipped</strong><ul>${issues.slice(0, 12).map(i => `<li>${esc(i)}</li>`).join('')}${issues.length > 12 ? `<li>…and ${issues.length - 12} more</li>` : ''}</ul></div>` : ''}
    <div class="card score-card">
      ${gauge(h, agg.band?.tone)}
      <div class="score-detail">
        <span class="label">${esc(h.label)} · n = ${s.n}</span>
        ${agg.band ? `<div><span class="pill tone-${agg.band.tone}">${esc(agg.band.label)}</span></div>` : ''}
        <p>${h.ci ? `95% confidence interval: ${fmt(Math.max(h.min ?? -Infinity, h.ci[0]), h.decimals)}${h.suffix ?? ''} to ${fmt(Math.min(h.max ?? Infinity, h.ci[1]), h.decimals)}${h.suffix ?? ''}.` : 'Add more respondents to get a confidence interval.'} ${s.n < 5 ? 'With fewer than five respondents, treat this as directional only.' : ''}</p>
        <div class="facts">
          ${agg.facts.map(f => `<div class="fact"><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join('')}
          <div class="fact"><span>Mean ${esc(p0.label)}</span><strong>${fmt(s.mean, Math.max(1, p0.decimals))}</strong></div>
          <div class="fact"><span>SD</span><strong>${fmt(s.sd, 2)}</strong></div>
          <div class="fact"><span>Median</span><strong>${fmt(s.median, Math.max(1, p0.decimals))}</strong></div>
          <div class="fact"><span>Range</span><strong>${fmt(s.min, p0.decimals)} – ${fmt(s.max, p0.decimals)}</strong></div>
        </div>
      </div>
    </div>
    ${agg.subs.length ? `<div class="card"><h3>${scale.type === 'slider' ? 'Dimensions' : 'Subscales'} (means)</h3><div class="bars">${agg.subs.map(bar).join('')}</div>${subscaleLegend(scale, agg.subs)}</div>` : ''}
    <div class="card">
      <h3>Distribution of ${esc(p0.label)}</h3>
      <div class="histogram">${bins.map(b => `<div><em>${b.count || ''}</em><i style="height:${(b.count / maxCount) * 100}%"></i><span>${b.label}</span></div>`).join('')}</div>
    </div>
    <div class="card">
      <h3>Respondents</h3>
      <div class="table-wrap scroll-table"><table>
        <thead><tr><th>ID</th><th class="num">${esc(p0.label)}</th><th>Band</th>${subs.map(x => `<th class="num">${esc(x.name)}</th>`).join('')}</tr></thead>
        <tbody>${respondents.map(r => `<tr><td>${esc(r.id)}</td><td class="num">${fmt(r.result.primary.value, p0.decimals)}</td><td>${r.result.band ? `<span class="pill tone-${r.result.band.tone}">${esc(r.result.band.label)}</span>` : ''}</td>${r.result.subscales?.map(x => `<td class="num">${fmt(x.value, x.decimals)}</td>`).join('') ?? ''}</tr>`).join('')}</tbody>
      </table></div>
    </div>
    ${rel.length ? `<div class="card">
      <h3>Reliability</h3>
      <div class="facts">${rel.map(r => `<div class="fact"><span>${esc(r.name)}${r.n ? ` · n = ${r.n}` : ''}</span><strong>${r.alpha == null ? 'Needs 3+ complete rows' : `α = ${noZero(r.alpha, 2)} <span class="pill tone-${alphaBand(r.alpha).tone}">${alphaBand(r.alpha).label}</span>`}</strong></div>`).join('')}</div>
      <p class="muted small-note">Cronbach’s alpha, with reversed items flipped first. For item-level detail use the <a href="/tools/cronbach-alpha/">Cronbach’s alpha calculator</a>.</p>
    </div>` : ''}
    <div class="card write-up">
      <div class="write-up-head"><h3>Write-up</h3><button type="button" class="btn btn-ghost btn-small" data-copy-writeup>Copy</button></div>
      <p data-write-up>${esc(writeUp(scale, agg, rel))}</p>
      <p class="muted small-note">APA-style summary to adapt for your report. Comparing two designs? Paste both sets of scores into the <a href="/tools/ab-test/">A/B test calculator</a>. Planning the next round? Try the <a href="/tools/sample-size/">sample size calculator</a>.</p>
    </div>
    <div class="card">
      <h3>Export</h3>
      <div class="export-row">
        <button type="button" class="btn btn-ghost btn-small" data-dexport="csv">Scored CSV</button>
        <button type="button" class="btn btn-ghost btn-small" data-dexport="json">JSON</button>
        <button type="button" class="btn btn-ghost btn-small" data-dexport="pdf">PDF summary</button>
      </div>
    </div>
  </div>`;
}

const fileNotes = notes => (notes?.length ? `<details class="issues toggle"><summary><span><strong>${notes.length} file note${notes.length > 1 ? 's' : ''}</strong><small>Which files were skipped or merged, and why.</small></span></summary><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : '');

function initDataset(scale) {
  const out = $('[data-dataset-out]');
  const drop = $('[data-dropzone]');
  let current = null;

  const run = (text, source, notes = []) => {
    try {
      current = { ...readDataset(scale, text), source, notes };
      current.agg = current.respondents.length ? aggregate(scale, current.respondents) : null;
      track('dataset_scored', { scale_id: scale.id });
      out.innerHTML = renderDataset(scale, current);
      if (current.respondents.length) toast(`Scored ${current.respondents.length} respondent${current.respondents.length === 1 ? '' : 's'}.`);
      requestAnimationFrame(() => $$('.gauge .fill', out).forEach(f => { f.style.strokeDashoffset = f.dataset.offset; }));
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      current = null;
      out.innerHTML = `<div class="error-box">${esc(err.message)}</div>${fileNotes(notes)}`;
    }
  };

  // One dataset file is scored as before. Single-person result files exported from the
  // Take tab (any number, any format, ZIPs too) are turned into one dataset first.
  const readFiles = async list => {
    const files = [...list];
    if (!files.length) return;
    out.innerHTML = '<p class="muted">Reading files…</p>';
    const im = await import('./import-results.js');
    const loadZip = async () => { await (await exporter()).loadLib('jszip'); return window.JSZip; };
    let read;
    try { read = await im.readFiles(files, loadZip); } catch (err) { out.innerHTML = `<div class="error-box">Could not open the files: ${esc(err.message)}</div>`; return; }
    const results = [];
    const notes = [];
    for (const f of read) {
      try {
        const r = im.parseResult(f.name, f.text);
        if (r.scale.id === scale.id) results.push(r);
        else notes.push(`${r.file}: a ${r.scale.abbr} result, not ${scale.abbr}. Skipped.`);
      } catch (err) {
        if (read.length === 1 && im.isDatasetError(err) && !/\.pdf$/i.test(f.name)) return run(f.text, f.name);
        notes.push(err.message);
      }
    }
    if (!results.length) {
      current = null;
      out.innerHTML = `<div class="error-box">None of these files ${read.length > 1 ? 'are' : 'is'} a ${esc(scale.abbr)} result.</div>${fileNotes(notes)}`;
      return;
    }
    const { groups, notes: merged } = im.combineResults(results);
    run(im.datasetCSV(scale, groups[0].people), `${results.length} result file${results.length > 1 ? 's' : ''}`, [...notes, ...merged]);
  };

  $('[data-file]').addEventListener('change', e => { readFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', e => { e.preventDefault(); readFiles(e.dataTransfer.files); });
  $('[data-paste-go]').addEventListener('click', () => run($('[data-paste]').value, 'pasted data'));

  // Sent here by the combine tool: score the merged files straight away.
  let handoff = null;
  try { handoff = JSON.parse(sessionStorage.getItem(`dataset:${scale.id}`)); sessionStorage.removeItem(`dataset:${scale.id}`); } catch {}
  if (handoff?.csv) run(handoff.csv, handoff.source, handoff.notes);

  $$('[data-template]').forEach(btn => btn.addEventListener('click', async () => {
    const r = scale.response;
    const range = `${r.min}–${r.max}`;
    if (btn.dataset.template === 'json') {
      const respondents = Array.from({ length: 3 }, (_, i) => ({ id: `P${i + 1}`, ...Object.fromEntries(scale.items.map(it => [`Q${it.n}`, null])) }));
      const note = `Replace each null with the raw answer (${range}${scale.type === 'slider' ? '' : ', whole numbers'})${r.na ? '. Leave null for not applicable' : ''}. Add one object per respondent.`;
      const json = JSON.stringify({ questionnaire: scale.abbr, note, respondents }, null, 2);
      (await exporter()).save(new Blob([json], { type: 'application/json' }), `${scale.id}-template.json`);
    } else {
      const header = ['id', ...scale.items.map(it => `Q${it.n}`)];
      const sample = Array.from({ length: 3 }, (_, i) => [`P${i + 1}`, ...scale.items.map(() => '')]);
      (await exporter()).save(new Blob([toCSV([header, ...sample])], { type: 'text/csv' }), `${scale.id}-template.csv`);
    }
    toast(`Template downloaded. Values ${range}${r.na ? ', NA allowed' : ''}.`);
  }));

  out.addEventListener('click', async e => {
    if (e.target.closest('[data-copy-writeup]')) {
      try { await navigator.clipboard.writeText($('[data-write-up]', out).textContent); toast('Write-up copied.'); } catch { toast('Could not copy. Select the text instead.'); }
      return;
    }
    const btn = e.target.closest('[data-dexport]');
    if (!btn || !current) return;
    try {
      await (await exporter()).exportDataset(btn.dataset.dexport, scale, current);
    } catch (err) {
      console.error(err);
      toast('Export failed. Try reloading the page.');
    }
  });
}

export function initScalePage(id) {
  const scale = SCALE_MAP[id];
  if (!scale) return;
  initTabs();
  initQuestionnaire(scale);
  initDataset(scale);
  // Warm the export module once the page is idle so the first click feels instant.
  (window.requestIdleCallback ?? setTimeout)(() => exporter());
  $('[data-print]').addEventListener('click', async () => {
    $('[data-print-sheet]').innerHTML = (await exporter()).printSheet(scale);
    window.print();
  });
  $('[data-copy-bibtex]')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('[data-bibtex]').textContent); toast('BibTeX copied.'); } catch { toast('Could not copy. Select the text instead.'); }
  });
  $('[data-copy-link]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      toast('Link copied');
    } catch {
      toast(location.origin + location.pathname);
    }
  });
}
