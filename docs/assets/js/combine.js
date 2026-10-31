// "Combine result files" tool: reads many single-person exports, groups them by
// questionnaire and scores each group. The parsing and scoring code is only fetched
// once files are dropped, so the page itself stays light.
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : Number(v).toFixed(d).replace('-', '−'));
const day = s => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s || '');

let state = null;

const load = () => Promise.all([import('./import-results.js'), import('./scale-page.js'), import('./scoring.js')]);
const exporter = () => import('./export.js');

function groupCard(g, i) {
  const { scale, people, agg } = g;
  const h = agg.headline, s = agg.stats;
  const clamp = v => Math.min(h.max ?? Infinity, Math.max(h.min ?? -Infinity, v));
  const p0 = people[0].result.primary;
  const subs = people[0].result.subscales ?? [];
  return `<section class="card combine-group">
    <div class="combine-head">
      <div><span class="abbr">${esc(scale.abbr)}</span><h3>${esc(scale.name)}</h3></div>
      <span class="muted">${people.length} ${people.length === 1 ? 'person' : 'people'}</span>
    </div>
    <div class="tool-headline"><strong>${fmt(h.value, h.decimals)}${h.suffix ?? ''}</strong><div><span class="label">${esc(h.label)}${h.ci ? `, 95% CI ${fmt(clamp(h.ci[0]), h.decimals)} to ${fmt(clamp(h.ci[1]), h.decimals)}` : ''}</span>${agg.band ? ` <span class="pill tone-${agg.band.tone}">${esc(agg.band.label)}</span>` : ''}</div></div>
    <div class="facts">
      ${agg.facts.map(f => `<div class="fact"><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join('')}
      <div class="fact"><span>SD</span><strong>${fmt(s.sd, 2)}</strong></div>
      <div class="fact"><span>Median</span><strong>${fmt(s.median, Math.max(1, p0.decimals))}</strong></div>
      <div class="fact"><span>Range</span><strong>${fmt(s.min, p0.decimals)} – ${fmt(s.max, p0.decimals)}</strong></div>
      ${agg.subs.map(x => `<div class="fact"><span>${esc(x.name)}</span><strong>${fmt(x.value, 2)}</strong></div>`).join('')}
    </div>
    <div class="table-wrap scroll-table"><table>
      <thead><tr><th scope="col">Participant</th><th scope="col" class="num">${esc(p0.label)}</th>${people.some(p => p.result.band) ? '<th scope="col">Band</th>' : ''}${subs.map(x => `<th scope="col" class="num">${esc(x.name)}</th>`).join('')}<th scope="col">Product</th><th scope="col">Date</th></tr></thead>
      <tbody>${people.map(p => `<tr><td>${esc(p.id)}</td><td class="num">${fmt(p.result.primary.value, p.result.primary.decimals)}</td>${people.some(q => q.result.band) ? `<td>${esc(p.result.band?.label ?? '')}</td>` : ''}${(p.result.subscales ?? []).map(x => `<td class="num">${fmt(x.value, 2)}</td>`).join('')}<td>${esc(p.product)}</td><td class="nowrap">${esc(day(p.date))}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="export-row">
      <button type="button" class="btn btn-primary btn-small" data-open="${i}">Full analysis in the ${esc(scale.abbr)} calculator</button>
      <button type="button" class="btn btn-ghost btn-small" data-save="${i}" data-kind="csv">Dataset CSV</button>
      <button type="button" class="btn btn-ghost btn-small" data-save="${i}" data-kind="json">Dataset JSON</button>
    </div>
  </section>`;
}

// One row per participant label, one column per questionnaire. Only useful when people
// filled in more than one questionnaire, so it is skipped otherwise.
function byPerson(groups) {
  if (groups.length < 2) return null;
  const rows = new Map();
  groups.forEach((g, gi) => g.people.forEach(p => {
    if (!rows.has(p.id)) rows.set(p.id, Array(groups.length).fill(null));
    rows.get(p.id)[gi] = p.result.primary;
  }));
  const shared = [...rows.values()].filter(r => r.filter(Boolean).length > 1).length;
  if (!shared) return null;
  return { head: groups.map(g => g.scale.abbr), rows: [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })) };
}

function render(out) {
  const { groups, notes, files } = state;
  const people = byPerson(groups);
  const total = groups.reduce((a, g) => a + g.people.length, 0);
  out.innerHTML = `
    <h2 class="sr-only">Results</h2>
    <p class="combine-summary"><strong>${files} file${files === 1 ? '' : 's'} read.</strong> ${total} result${total === 1 ? '' : 's'} from ${groups.length} questionnaire${groups.length === 1 ? '' : 's'}.</p>
    ${notes.length ? `<details class="issues toggle"><summary><span><strong>${notes.length} file note${notes.length > 1 ? 's' : ''}</strong><small>Which files were skipped or merged, and why.</small></span></summary><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
    ${groups.map(groupCard).join('')}
    ${people ? `<section class="card combine-group">
      <div class="combine-head"><div><h3>By participant</h3></div><button type="button" class="btn btn-ghost btn-small" data-save-people>CSV</button></div>
      <p class="muted small-note">Matched on the participant label, so use the same label for a person in every questionnaire.</p>
      <div class="table-wrap scroll-table"><table>
        <thead><tr><th>Participant</th>${people.head.map(h => `<th class="num">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${people.rows.map(([id, vals]) => `<tr><td>${esc(id)}</td>${vals.map(v => `<td class="num">${v ? fmt(v.value, v.decimals) : ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </section>` : ''}`;
  state.people = people;
}

async function handle(list, out, toast) {
  const files = [...list];
  if (!files.length) return;
  out.innerHTML = '<p class="muted">Reading files…</p>';
  const [im, page, scoring] = await load();
  const loadZip = async () => { await (await exporter()).loadLib('jszip'); return window.JSZip; };
  let read;
  try {
    read = await im.readFiles(files, loadZip);
  } catch (err) {
    out.innerHTML = `<div class="error-box">Could not open the files: ${esc(err.message)}</div>`;
    return;
  }
  const results = [];
  const notes = [];
  for (const f of read) {
    try { results.push(im.parseResult(f.name, f.text)); } catch (err) { notes.push(err.message); }
  }
  const combined = im.combineResults(results);
  notes.push(...combined.notes);
  const groups = [];
  for (const g of combined.groups) {
    const people = [];
    for (const p of g.people) {
      try { people.push({ ...p, result: scoring.scoreScale(g.scale, p.answers) }); } catch (err) { notes.push(`${p.file}: ${err.message}`); }
    }
    if (people.length) groups.push({ scale: g.scale, people, agg: page.aggregate(g.scale, people) });
  }
  if (!groups.length) {
    state = null;
    out.innerHTML = `<div class="error-box">No result files found among ${read.length} file${read.length === 1 ? '' : 's'}.</div>${notes.length ? `<div class="issues"><ul>${notes.slice(0, 30).map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}`;
    return;
  }
  state = { groups, notes, files: read.length, im };
  render(out);
  toast(`${groups.reduce((a, g) => a + g.people.length, 0)} results combined.`);
}

export function initCombine({ toast }) {
  const out = $('[data-tool-out]');
  const drop = $('[data-dropzone]');
  const inputs = [$('[data-files]'), $('[data-folder]')];
  inputs.forEach(input => input?.addEventListener('change', e => { handle(e.target.files, out, toast); e.target.value = ''; }));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', e => { e.preventDefault(); handle(e.dataTransfer.files, out, toast); });

  out.addEventListener('click', async e => {
    if (!state) return;
    const open = e.target.closest('[data-open]');
    const save = e.target.closest('[data-save]');
    if (open) {
      const g = state.groups[open.dataset.open];
      try {
        sessionStorage.setItem(`dataset:${g.scale.id}`, JSON.stringify({ csv: state.im.datasetCSV(g.scale, g.people), source: `${g.people.length} combined result files` }));
        location.href = `/${g.scale.id}/#dataset`;
      } catch {
        toast('Your browser blocked the hand-off. Download the dataset CSV and upload it in the calculator instead.');
      }
    } else if (save) {
      const g = state.groups[save.dataset.save];
      const csv = save.dataset.kind === 'csv';
      const text = csv ? state.im.datasetCSV(g.scale, g.people) : state.im.datasetJSON(g.scale, g.people);
      (await exporter()).save(new Blob([text], { type: csv ? 'text/csv' : 'application/json' }), `${g.scale.id}_dataset_${new Date().toISOString().slice(0, 10)}.${save.dataset.kind}`);
    } else if (e.target.closest('[data-save-people]') && state.people) {
      const { toCSV } = await import('./stats.js');
      const { head, rows } = state.people;
      const csv = toCSV([['participant', ...head], ...rows.map(([id, vals]) => [id, ...vals.map(v => (v ? fmt(v.value, Math.max(2, v.decimals)).replace('−', '-') : ''))])]);
      (await exporter()).save(new Blob([csv], { type: 'text/csv' }), `participants_${new Date().toISOString().slice(0, 10)}.csv`);
    }
  });
}
