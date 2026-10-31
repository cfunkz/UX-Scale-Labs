import { toCSV } from './stats.js';
import { pdfSubject } from './import-results.js';

// The build puts the site's address on <html data-site>, so it follows site_url in settings.yml.
const SITE = document.documentElement.dataset.site || location.host;
const ACCENT = [61, 75, 216];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '' : Number(v).toFixed(d));
const stamp = d => d.toISOString().slice(0, 10);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// jsPDF's built-in fonts only cover WinAnsi, so swap the few characters we use outside it.
const pdfSafe = s => String(s ?? '').replace(/−/g, '-').replace(/≈/g, '~').replace(/Σ/g, 'Sum ').replace(/[…]/g, '...');

export function save(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function baseName({ scale, meta }) {
  const parts = [scale.id, meta.product && slug(meta.product), meta.participant && slug(meta.participant), stamp(meta.date)];
  return parts.filter(Boolean).join('_');
}

function singleRows({ scale, result, meta }) {
  const p = result.primary;
  const rows = [
    ['questionnaire', `${scale.abbr} – ${scale.name}`],
    ['product', meta.product],
    ['participant', meta.participant],
    ['date', meta.date.toISOString()],
    [],
    ['metric', 'value'],
    [p.label, fmt(p.value, p.decimals)],
  ];
  if (result.band) rows.push(['band', result.band.label]);
  result.facts.forEach(f => rows.push([f.label, f.value]));
  (result.subscales ?? []).forEach(s => rows.push([s.name, fmt(s.value, s.decimals)]));
  rows.push([], ['item', 'text', 'response', 'reversed', result.scoredLabel ?? 'scored']);
  result.items.forEach(r => rows.push([`Q${r.n}`, r.text, r.response ?? 'NA', scale.items[r.n - 1].reverse ? 'yes' : 'no', r.scored == null ? '' : fmt(r.scored, Number.isInteger(r.scored) ? 0 : 2)]));
  return rows;
}

function singleJSON({ scale, result, answers, meta }) {
  return JSON.stringify({
    questionnaire: { id: scale.id, abbr: scale.abbr, name: scale.name, references: scale.refs.map(r => r.text) },
    product: meta.product || null,
    participant: meta.participant || null,
    date: meta.date.toISOString(),
    score: { label: result.primary.label, value: result.primary.value, min: result.primary.min, max: result.primary.max, band: result.band?.label ?? null },
    facts: result.facts,
    subscales: (result.subscales ?? []).map(s => ({ name: s.name, value: s.value, band: s.band?.label ?? null })),
    answers,
    generator: SITE,
  }, null, 2);
}

export function summaryText({ scale, result, meta }) {
  const p = result.primary;
  const lines = [
    `${scale.abbr} – ${scale.name}`,
    [meta.product, meta.participant && `Participant ${meta.participant}`].filter(Boolean).join(' · '),
    `${p.label}: ${fmt(p.value, p.decimals)} (range ${p.min}–${p.max})${result.band ? ` · ${result.band.label}` : ''}`,
    ...result.facts.map(f => `${f.label}: ${f.value}`),
    ...(result.subscales ?? []).map(s => `${s.name}: ${fmt(s.value, s.decimals)}${s.band ? ` (${s.band.label})` : ''}`),
    '',
    result.interpretation,
  ];
  return lines.filter((l, i) => l !== '' || i > 3).join('\n');
}

function singleTXT(last) {
  const { scale, result } = last;
  const rule = '─'.repeat(64);
  return [
    'UX SCALE LABS · RESULTS',
    rule,
    summaryText(last),
    rule,
    'RESPONSES',
    ...result.items.map(r => `Q${r.n}. ${r.text}\n     ${r.response ?? 'N/A'}${scale.items[r.n - 1].reverse ? '  (reverse scored)' : ''}`),
    rule,
    'REFERENCES',
    ...(scale.refs.length ? scale.refs.map(r => `- ${r.text}${r.url ? ` ${r.url}` : ''}`) : ['- None (industry or informal measure)']),
    '',
    `Generated at ${SITE}`,
  ].join('\n');
}

// jsPDF and JSZip are large, so they are only fetched the first time someone exports.
const LIBS = { jspdf: '/assets/vendor/jspdf-2.5.2.umd.min.js', jszip: '/assets/vendor/jszip-3.10.1.min.js' };
const loading = {};
export function loadLib(key) {
  loading[key] ??= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = LIBS[key];
    el.onload = resolve;
    el.onerror = () => { delete loading[key]; reject(new Error(`${key} did not load`)); };
    document.head.append(el);
  });
  return loading[key];
}

function needLib(name, global) {
  if (!global) throw new Error(`${name} did not load`);
  return global;
}

class PdfWriter {
  constructor(title, subtitle) {
    const { jsPDF } = needLib('jsPDF', window.jspdf);
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.y = 0;
    this.margin = 18;
    this.width = 210 - this.margin * 2;
    const d = this.doc;
    d.setFillColor(...ACCENT);
    d.rect(0, 0, 210, 30, 'F');
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold').setFontSize(16).text(pdfSafe(title), this.margin, 14);
    d.setFont('helvetica', 'normal').setFontSize(9.5).text(pdfSafe(subtitle), this.margin, 22);
    this.y = 42;
  }
  ensure(h) {
    if (this.y + h > 280) { this.doc.addPage(); this.y = 20; }
  }
  heading(text) {
    this.ensure(14);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(20, 22, 26).text(pdfSafe(text), this.margin, this.y);
    this.y += 7;
  }
  para(text, size = 10, color = [70, 72, 80]) {
    const d = this.doc;
    d.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...color);
    const lines = d.splitTextToSize(pdfSafe(text), this.width);
    lines.forEach(line => { this.ensure(5); d.text(line, this.margin, this.y); this.y += size * 0.45; });
    this.y += 2;
  }
  big(value, label, band) {
    const d = this.doc;
    this.ensure(30);
    d.setFillColor(244, 245, 250).roundedRect(this.margin, this.y, this.width, 26, 3, 3, 'F');
    d.setFont('helvetica', 'bold').setFontSize(26).setTextColor(...ACCENT).text(pdfSafe(value), this.margin + 8, this.y + 17);
    d.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(100, 100, 110).text(pdfSafe(label), this.margin + 62, this.y + 11);
    if (band) d.setFont('helvetica', 'bold').setFontSize(11).setTextColor(20, 22, 26).text(pdfSafe(band), this.margin + 62, this.y + 18);
    this.y += 33;
  }
  table(head, rows, widths) {
    const d = this.doc;
    const draw = (cells, bold) => {
      d.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(8.5).setTextColor(bold ? 90 : 50, bold ? 90 : 50, bold ? 100 : 60);
      const wrapped = cells.map((c, i) => d.splitTextToSize(pdfSafe(c), widths[i] - 2));
      const h = Math.max(...wrapped.map(w => w.length)) * 3.8 + 2.4;
      this.ensure(h);
      let x = this.margin;
      wrapped.forEach((w, i) => { d.text(w, x, this.y + 3.6); x += widths[i]; });
      this.y += h;
      d.setDrawColor(226, 226, 220).line(this.margin, this.y - 1, this.margin + this.width, this.y - 1);
    };
    draw(head, true);
    rows.forEach(r => draw(r, false));
    this.y += 4;
  }
  refs(scale) {
    if (!scale.refs.length) return;
    this.heading('References');
    scale.refs.forEach(r => this.para(`${r.text}${r.url ? ` ${r.url}` : ''}`, 8.5));
  }
  blob() {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      d.setPage(i);
      d.setFont('helvetica', 'normal').setFontSize(8).setTextColor(140, 140, 150);
      d.text(`${SITE} · page ${i} of ${pages}`, this.margin, 290);
    }
    return d.output('blob');
  }
}

function singlePDF({ scale, result, answers, meta }) {
  const p = result.primary;
  const pdf = new PdfWriter(`${scale.abbr} · ${scale.name}`, [meta.product, meta.participant && `Participant ${meta.participant}`, meta.date.toLocaleString()].filter(Boolean).join('  ·  '));
  // The raw answers ride along in the metadata so the PDF can be read back by the combine tool.
  pdf.doc.setProperties({ title: `${scale.abbr} result`, subject: pdfSubject({ scale, answers, meta }), creator: SITE });
  pdf.big(fmt(p.value, p.decimals), `${p.label} (${p.min} to ${p.max})${p.lowerIsBetter ? ', lower is better' : ''}`, result.band && `${result.band.label}${result.band.note ? ` · ${result.band.note}` : ''}`);
  pdf.para(result.interpretation);
  if (result.facts.length) pdf.table(['Metric', 'Value'], result.facts.map(f => [f.label, String(f.value)]), [90, 84]);
  if (result.subscales?.length) {
    pdf.heading(scale.type === 'slider' ? 'Dimensions' : 'Subscales');
    pdf.table(['Name', 'Score', 'Band'], result.subscales.map(s => [s.name, fmt(s.value, s.decimals), s.band?.label ?? '']), [80, 30, 64]);
  }
  pdf.heading('Responses');
  pdf.table(['#', 'Item', 'Response'], result.items.map(r => [String(r.n), r.text + (scale.items[r.n - 1].reverse ? ' (R)' : ''), String(r.response ?? 'N/A')]), [10, 144, 20]);
  pdf.refs(scale);
  return pdf.blob();
}

export async function exportSingle(kind, last) {
  if (kind === 'pdf' || kind === 'zip') await loadLib('jspdf');
  if (kind === 'zip') await loadLib('jszip');
  const name = baseName(last);
  const make = {
    pdf: () => singlePDF(last),
    csv: () => new Blob([toCSV(singleRows(last))], { type: 'text/csv' }),
    json: () => new Blob([singleJSON(last)], { type: 'application/json' }),
    txt: () => new Blob([singleTXT(last)], { type: 'text/plain' }),
  };
  if (kind === 'zip') {
    const JSZip = needLib('JSZip', window.JSZip);
    const zip = new JSZip();
    for (const k of ['pdf', 'csv', 'json', 'txt']) zip.file(`${name}.${k}`, make[k]());
    save(await zip.generateAsync({ type: 'blob' }), `${name}.zip`);
    return;
  }
  save(make[kind](), `${name}.${kind}`);
}

export async function exportDataset(kind, scale, data) {
  if (kind === 'pdf') await loadLib('jspdf');
  const { respondents, agg } = data;
  const name = `${scale.id}_dataset_${stamp(new Date())}`;
  const p0 = respondents[0].result.primary;
  const subNames = (respondents[0].result.subscales ?? []).map(s => s.name);

  if (kind === 'csv') {
    const rows = [
      ['id', ...scale.items.map(it => `Q${it.n}`), p0.label, 'band', ...subNames],
      ...respondents.map(r => [
        r.id,
        ...scale.items.map(it => r.answers[it.n] ?? 'NA'),
        fmt(r.result.primary.value, Math.max(2, p0.decimals)),
        r.result.band?.label ?? '',
        ...(r.result.subscales ?? []).map(s => fmt(s.value, 2)),
      ]),
      [],
      ['summary', 'n', 'mean', 'sd', 'ci95_low', 'ci95_high'],
      [p0.label, agg.stats.n, fmt(agg.stats.mean, 3), fmt(agg.stats.sd, 3), fmt(agg.stats.ci?.[0], 3), fmt(agg.stats.ci?.[1], 3)],
      ...agg.subs.map(s => [s.name, s.n, fmt(s.value, 3), fmt(s.sd, 3), fmt(s.ci?.[0], 3), fmt(s.ci?.[1], 3)]),
    ];
    if (agg.headline.ci && agg.headline.label !== `Mean ${p0.label}`) {
      rows.push([agg.headline.label, agg.stats.n, fmt(agg.headline.value, 2), '', fmt(agg.headline.ci[0], 2), fmt(agg.headline.ci[1], 2)]);
    }
    save(new Blob([toCSV(rows)], { type: 'text/csv' }), `${name}.csv`);
  } else if (kind === 'json') {
    save(new Blob([JSON.stringify({
      questionnaire: { id: scale.id, abbr: scale.abbr, name: scale.name },
      n: agg.stats.n,
      headline: { label: agg.headline.label, value: agg.headline.value, ci95: agg.headline.ci ?? null, band: agg.band?.label ?? null },
      primary: agg.stats,
      subscales: agg.subs.map(s => ({ name: s.name, n: s.n, mean: s.value, sd: s.sd, ci95: s.ci, band: s.band?.label ?? null })),
      respondents: respondents.map(r => ({ id: r.id, answers: r.answers, score: r.result.primary.value, band: r.result.band?.label ?? null })),
      generator: SITE,
    }, null, 2)], { type: 'application/json' }), `${name}.json`);
  } else if (kind === 'pdf') {
    const h = agg.headline;
    const pdf = new PdfWriter(`${scale.abbr} · dataset summary`, `${agg.stats.n} respondents · ${data.source} · ${new Date().toLocaleString()}`);
    pdf.big(`${fmt(h.value, h.decimals)}${h.suffix ?? ''}`, `${h.label}${h.ci ? `, 95% CI ${fmt(h.ci[0], h.decimals)} to ${fmt(h.ci[1], h.decimals)}` : ''}`, agg.band?.label);
    pdf.table(['Statistic', 'Value'], [
      ['n', String(agg.stats.n)],
      [`Mean ${p0.label}`, fmt(agg.stats.mean, 2)],
      ['SD', fmt(agg.stats.sd, 2)],
      ['Median', fmt(agg.stats.median, 2)],
      ['Min – max', `${fmt(agg.stats.min, p0.decimals)} – ${fmt(agg.stats.max, p0.decimals)}`],
      ...agg.facts.map(f => [f.label, String(f.value)]),
    ], [90, 84]);
    if (agg.subs.length) {
      pdf.heading('Subscales');
      pdf.table(['Name', 'Mean', 'SD', '95% CI', 'Band'], agg.subs.map(s => [s.name, fmt(s.value, 2), fmt(s.sd, 2), s.ci ? `${fmt(s.ci[0], 2)} to ${fmt(s.ci[1], 2)}` : '', s.band?.label ?? '']), [52, 22, 22, 40, 38]);
    }
    pdf.heading('Respondents');
    pdf.table(['ID', p0.label, 'Band'], respondents.map(r => [r.id, fmt(r.result.primary.value, p0.decimals), r.result.band?.label ?? '']), [60, 50, 64]);
    pdf.refs(scale);
    save(pdf.blob(), `${name}.pdf`);
  }
}

export function printSheet(scale) {
  const r = scale.response;
  const boxes = (from, to, step = 1, cls = '') => {
    const out = [];
    for (let v = from; v <= to; v += step) out.push(`<b class="${cls}">${cls ? '' : v}</b>`);
    return out.join('');
  };
  const item = it => {
    if (scale.type === 'differential') {
      return `<div class="pq"><div class="boxes"><span class="end">${esc(it.left)}</span>${boxes(1, 7, 1, 'blank')}<span class="end">${esc(it.right)}</span></div></div>`;
    }
    if (scale.type === 'slider') {
      return `<div class="pq"><p><strong>${it.n}. ${esc(it.short)}</strong> ${esc(it.text.split(': ')[1])}</p><div class="boxes"><span class="end">${esc(it.left)}</span>${boxes(0, 100, 5, 'tiny')}<span class="end">${esc(it.right)}</span></div></div>`;
    }
    return `<div class="pq"><p>${it.n}. ${esc(it.text)}</p><div class="boxes"><span class="end">${esc(r.labels[0])}</span>${boxes(r.min, r.max)}${r.na ? '<b style="width:auto;padding:0 4pt">N/A</b>' : ''}<span class="end">${esc(r.labels[1])}</span></div></div>`;
  };
  return `<h1>${esc(scale.abbr)} – ${esc(scale.name)}</h1>
  <p class="cite">${esc(scale.refs[0]?.text ?? '')}</p>
  <div class="fields"><div>Participant</div><div>Product / system</div><div>Date</div></div>
  ${scale.type === 'differential' ? '<p>For each pair of terms, mark the box that best matches your impression.</p>' : scale.type === 'slider' ? '<p>Mark one box on each scale.</p>' : `<p>Mark one box per statement, from ${r.min} (${esc(r.labels[0])}) to ${r.max} (${esc(r.labels[1])}).</p>`}
  ${scale.items.map(item).join('')}
  <p class="foot">Printed from ${SITE}/${scale.id}/ · Score online by entering the answers or uploading a CSV.</p>`;
}
