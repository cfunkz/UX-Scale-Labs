// Reads the single-result files this site exports (JSON, CSV, TXT and PDF) back into
// answers, so a researcher can drop in a folder of files instead of typing them up.
import { SCALES, SCALE_MAP } from './scales.js';
import { parseCSV, toCSV } from './stats.js';

// PDFs carry their answers in the document's Subject field, prefixed with this tag.
const PDF_TAG = 'uxsl1:';

const BY_ABBR = Object.fromEntries(SCALES.map(s => [s.abbr.toLowerCase(), s]));
const findScale = key => SCALE_MAP[String(key ?? '').toLowerCase()] ?? BY_ABBR[String(key ?? '').trim().toLowerCase()];
const baseName = name => String(name).replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');

const toBase64 = text => btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''));
const fromBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export function pdfSubject({ scale, answers, meta }) {
  const record = { scale: scale.id, product: meta.product || null, participant: meta.participant || null, date: meta.date.toISOString(), answers };
  return PDF_TAG + toBase64(JSON.stringify(record));
}

class NotASingleResult extends Error {}
const notSingle = msg => new NotASingleResult(msg);
const DATASET_HINT = 'This looks like a whole dataset rather than one person’s result. Upload it on its own in the questionnaire’s “Score a dataset” tab.';

function cleanAnswers(scale, raw, file) {
  const r = scale.response;
  const answers = {};
  for (const it of scale.items) {
    const key = [String(it.n), `Q${it.n}`, `q${it.n}`].find(k => k in raw);
    const v = key === undefined ? undefined : raw[key];
    if (v === undefined || v === '') throw new Error(`${file}: Q${it.n} has no answer.`);
    if (v === null || /^n\/?a$/i.test(String(v).trim())) {
      if (!r.na) throw new Error(`${file}: Q${it.n} is N/A, but ${scale.abbr} has no N/A option.`);
      answers[it.n] = null;
      continue;
    }
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n < r.min || n > r.max) throw new Error(`${file}: Q${it.n} = "${v}" is outside ${r.min}–${r.max}.`);
    answers[it.n] = n;
  }
  return answers;
}

function fromJSON(text, file) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`${file}: not valid JSON.`); }
  if (Array.isArray(data) || data?.respondents || data?.responses || data?.participants || data?.rows) throw notSingle(`${file}: ${DATASET_HINT}`);
  const scale = findScale(data?.questionnaire?.id ?? data?.questionnaire?.abbr ?? data?.questionnaire ?? data?.scale);
  if (!scale || !data.answers || typeof data.answers !== 'object') throw notSingle(`${file}: not a result file from this site.`);
  return { scale, participant: data.participant, product: data.product, date: data.date, answers: data.answers };
}

function fromCSV(text, file) {
  const rows = parseCSV(text);
  const field = key => rows.find(r => r[0]?.toLowerCase() === key)?.[1] ?? '';
  const q = field('questionnaire');
  if (!q) {
    if (rows[0]?.some(c => /^q?1$/i.test(c))) throw notSingle(`${file}: ${DATASET_HINT}`);
    throw notSingle(`${file}: not a result file from this site.`);
  }
  const scale = findScale(q.split(/\s+[–-]\s+/)[0]);
  if (!scale) throw new Error(`${file}: unknown questionnaire "${q}".`);
  const answers = {};
  rows.forEach(r => { const m = r[0]?.match(/^Q(\d+)$/); if (m) answers[m[1]] = r[2] ?? ''; });
  return { scale, participant: field('participant'), product: field('product'), date: field('date'), answers };
}

function fromTXT(text, file) {
  const lines = text.split(/\r?\n/);
  if (!/^UX SCALE LABS/i.test(lines[0] ?? '')) throw notSingle(`${file}: not a result file from this site.`);
  const scale = findScale((lines[2] ?? '').split(/\s+[–-]\s+/)[0]);
  if (!scale) throw new Error(`${file}: unknown questionnaire "${lines[2] ?? ''}".`);
  // The line under the title holds "Product · Participant X"; either part can be missing.
  let product = '', participant = '';
  const who = lines[3] ?? '';
  if (!who.includes(':')) {
    const m = who.match(/^(?:(.*?) · )?Participant (.+)$/);
    if (m) { product = m[1] ?? ''; participant = m[2]; } else product = who;
  }
  const answers = {};
  const start = lines.indexOf('RESPONSES');
  for (let i = start + 1; start >= 0 && i < lines.length; i++) {
    const m = lines[i].match(/^Q(\d+)\. /);
    if (m) answers[m[1]] = (lines[i + 1] ?? '').trim().split(/\s+/)[0];
    else if (/^─/.test(lines[i])) break;
  }
  return { scale, participant, product, answers };
}

function fromPDF(text, file) {
  const m = text.match(/\/Subject \(uxsl1:([A-Za-z0-9+/=]+)\)/);
  if (!m) throw notSingle(`${file}: this PDF has no answers stored in it. PDFs from older versions of the site only contain the printed report, so use the JSON, CSV or TXT download for those people.`);
  let data;
  try { data = JSON.parse(fromBase64(m[1])); } catch { throw new Error(`${file}: the answers stored in this PDF are damaged.`); }
  const scale = findScale(data.scale);
  if (!scale) throw new Error(`${file}: unknown questionnaire "${data.scale}".`);
  return { scale, participant: data.participant, product: data.product, date: data.date, answers: data.answers };
}

// `text` is the file's contents; for a PDF pass the raw bytes decoded as latin1.
export function parseResult(name, text) {
  const file = String(name).replace(/^.*[\\/]/, '');
  const ext = (file.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase();
  const reader = text.startsWith('%PDF') ? fromPDF
    : /^\s*[[{]/.test(text) ? fromJSON
    : /^UX SCALE LABS/i.test(text) ? fromTXT
    : ext === 'pdf' ? fromPDF
    : fromCSV;
  const found = reader(text, file);
  return {
    file,
    scale: found.scale,
    participant: String(found.participant ?? '').trim(),
    product: String(found.product ?? '').trim(),
    date: found.date ? String(found.date) : '',
    answers: cleanAnswers(found.scale, found.answers, file),
  };
}

export const isDatasetError = err => err instanceof NotASingleResult;

// Groups parsed results by questionnaire. The same answers saved in several formats
// (for example the JSON and PDF from one ZIP) count once, and repeated participant
// labels get a numbered suffix so every row keeps a unique id.
export function combineResults(results) {
  const groups = new Map();
  const notes = [];
  const seen = new Set();
  for (const r of results) {
    const who = r.participant || baseName(r.file);
    const key = [r.scale.id, who, JSON.stringify(r.answers)].join('|');
    if (seen.has(key)) { notes.push(`${r.file}: same answers as another file for ${who}, counted once.`); continue; }
    seen.add(key);
    if (!groups.has(r.scale.id)) groups.set(r.scale.id, { scale: r.scale, people: [], ids: new Map() });
    const g = groups.get(r.scale.id);
    const count = (g.ids.get(who) ?? 0) + 1;
    g.ids.set(who, count);
    const id = count > 1 ? `${who} (${count})` : who;
    if (count > 1) notes.push(`${r.file}: a second ${r.scale.abbr} result for ${who}, listed as "${id}".`);
    g.people.push({ ...r, id });
  }
  const byId = (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true });
  const list = [...groups.values()].map(({ scale, people }) => ({ scale, people: people.sort(byId) }));
  list.sort((a, b) => b.people.length - a.people.length || a.scale.abbr.localeCompare(b.scale.abbr));
  return { groups: list, notes };
}

// Same layout as the dataset template, plus product and date so nothing is lost.
export function datasetCSV(scale, people) {
  const header = ['id', 'product', 'date', ...scale.items.map(it => `Q${it.n}`)];
  return toCSV([header, ...people.map(p => [p.id, p.product, p.date, ...scale.items.map(it => p.answers[it.n] ?? 'NA')])]);
}

export function datasetJSON(scale, people) {
  return JSON.stringify({
    questionnaire: scale.abbr,
    respondents: people.map(p => ({ id: p.id, product: p.product || null, date: p.date || null, ...Object.fromEntries(scale.items.map(it => [`Q${it.n}`, p.answers[it.n]])) })),
  }, null, 2);
}

// Reads a mix of File objects in the browser, opening ZIPs with JSZip when one turns up.
export async function readFiles(files, loadZip) {
  const out = [];
  for (const f of files) {
    if (/^\./.test(f.name)) continue;
    if (/\.zip$/i.test(f.name)) {
      const JSZip = await loadZip();
      const zip = await JSZip.loadAsync(f);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || /(^|\/)(__MACOSX|\.)/.test(entry.name)) continue;
        const isPdf = /\.pdf$/i.test(entry.name);
        out.push({ name: `${f.name}/${entry.name}`, text: isPdf ? latin1(await entry.async('uint8array')) : await entry.async('string') });
      }
    } else {
      out.push({ name: f.webkitRelativePath || f.name, text: /\.pdf$/i.test(f.name) ? latin1(new Uint8Array(await f.arrayBuffer())) : await f.text() });
    }
  }
  return out;
}

const latin1 = bytes => new TextDecoder('latin1').decode(bytes);
