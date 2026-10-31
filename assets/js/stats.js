const T_SMALL = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262 };

// Two-sided 95% t critical value. Exact for small df, Cornish–Fisher expansion beyond that
// (accurate to about three decimals, which is plenty for reporting).
export function t95(df) {
  if (df < 1) return NaN;
  if (T_SMALL[df]) return T_SMALL[df];
  const z = 1.959964;
  const z3 = z ** 3, z5 = z ** 5, z7 = z ** 7;
  return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3);
}

export function describe(values) {
  const xs = values.filter(v => v != null && !Number.isNaN(v));
  const n = xs.length;
  if (!n) return { n: 0 };
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0;
  const half = n > 1 ? t95(n - 1) * (sd / Math.sqrt(n)) : null;
  const sorted = [...xs].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { n, mean: m, sd, median, min: sorted[0], max: sorted[n - 1], ci: half == null ? null : [m - half, m + half] };
}

export function histogram(values, min, max, bins = 10) {
  const width = (max - min) / bins;
  const counts = Array(bins).fill(0);
  for (const v of values) {
    if (v == null) continue;
    const i = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)));
    counts[i]++;
  }
  return counts.map((count, i) => ({ from: min + i * width, to: min + (i + 1) * width, count }));
}

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const delimiter = detectDelimiter(text);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.map(r => r.map(f => f.trim())).filter(r => r.some(f => f !== ''));
}

function detectDelimiter(text) {
  const first = text.split(/\r?\n/, 1)[0];
  const counts = [',', ';', '\t'].map(d => [d, first.split(d).length]);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

export const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\n');

const ID_KEYS = ['id', 'participant', 'respondent', 'user', 'name'];
const ANSWER_KEYS = ['answers', 'responses', 'items', 'values'];
const LIST_KEYS = ['respondents', 'responses', 'participants', 'data', 'rows'];

function cell(v) {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

// Turns a JSON dataset into the same header + rows shape that parseCSV returns, so both
// formats go through one validation path. Accepts a list of respondents, or an object
// wrapping that list (which is also what the dataset JSON export produces). Each respondent
// can be an object keyed Q1…Qn, an object with an `answers` list or map, or a plain array.
export function jsonToRows(text, nItems) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`This is not valid JSON (${err.message}). Check for a missing or extra comma, bracket or quote mark.`);
  }
  if (data && !Array.isArray(data) && typeof data === 'object') {
    const key = LIST_KEYS.find(k => Array.isArray(data[k]));
    if (!key) throw new Error('Expected a list of respondents, for example [{"id": "P1", "Q1": 4, …}] or {"respondents": […]}.');
    data = data[key];
  }
  if (!Array.isArray(data)) throw new Error('Expected a list of respondents, for example [{"id": "P1", "Q1": 4, …}].');
  if (!data.length) throw new Error('The respondent list is empty.');

  const header = ['id', ...Array.from({ length: nItems }, (_, i) => `Q${i + 1}`)];
  const rows = [];
  const skipped = {};
  let found = 0;

  data.forEach((entry, i) => {
    const row = Array(nItems + 1).fill('');
    const fail = msg => { skipped[i] = msg; rows.push(row); };
    let source = entry;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const lower = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k.toLowerCase(), v]));
      const idKey = ID_KEYS.find(k => lower[k] != null && typeof lower[k] !== 'object');
      if (idKey) row[0] = cell(lower[idKey]);
      const nested = ANSWER_KEYS.find(k => lower[k] && typeof lower[k] === 'object');
      if (nested) source = lower[nested];
    } else if (!Array.isArray(entry)) {
      return fail(`should be an object or a list of answers, but is ${JSON.stringify(entry)}.`);
    }

    if (Array.isArray(source)) {
      let values = source;
      if (values.length === nItems + 1 && typeof values[0] === 'string' && !/^-?\d+([.,]\d+)?$/.test(values[0].trim())) {
        row[0] = values[0];
        values = values.slice(1);
      }
      if (values.length !== nItems) return fail(`has ${values.length} answer${values.length === 1 ? '' : 's'}, but this questionnaire has ${nItems} items.`);
      values.forEach((v, j) => { row[j + 1] = cell(v); });
      found++;
    } else {
      let any = false;
      for (const [k, v] of Object.entries(source)) {
        const m = k.toLowerCase().replace(/[\s_.-]/g, '').match(/^(?:q|item)?(\d+)$/);
        if (m && +m[1] >= 1 && +m[1] <= nItems) { row[+m[1]] = cell(v); any = true; }
      }
      if (any) found++;
    }
    rows.push(row);
  });

  if (!found) throw new Error(`No answers found. Give each respondent keys Q1 to Q${nItems}, or an "answers" list with ${nItems} values. Download the JSON template to see the layout.`);
  return { rows: [header, ...rows], skipped };
}
