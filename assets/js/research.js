// Statistics for the research tools. Formulas follow Sauro & Lewis (2016), Quantifying the
// User Experience, unless noted. Everything is plain functions so the tests can call them.

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const variance = xs => {
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
};

// ---- Distributions ----

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Continued fraction for the regularised incomplete beta function (Numerical Recipes, betacf).
function betacf(a, b, x) {
  const FPMIN = 1e-300;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}

function incBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}

export function tCdf(t, df) {
  const p = 0.5 * incBeta(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}

// Inverse of the standard normal CDF (Acklam's rational approximation, error < 1.2e-9).
export function zInv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -zInv(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Upper tail of the standard normal, from the complementary error function
// (Numerical Recipes erfcc, fractional error below 1.2e-7).
function normalTail(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? erfc / 2 : 1 - erfc / 2;
}

// Two-sided critical t for a given confidence level, found by bisection on the CDF.
export function tCrit(confidence, df) {
  const target = 1 - (1 - confidence) / 2;
  let lo = 0, hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---- Parsing helpers ----

// Pulls numbers out of free text: one per line, or separated by commas, spaces or tabs.
// Times can be written as m:ss or h:mm:ss.
export function parseNumbers(text, { times = false } = {}) {
  const tokens = String(text).split(/[\s,;]+/).map(t => t.trim()).filter(Boolean);
  const values = [], bad = [];
  for (const tok of tokens) {
    let v = NaN;
    if (times && /^\d+(:\d{1,2}){1,2}(\.\d+)?$/.test(tok)) {
      v = tok.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
    } else if (/^-?\d+(\.\d+)?$/.test(tok)) {
      v = Number(tok);
    }
    if (Number.isFinite(v)) values.push(v); else bad.push(tok);
  }
  return { values, bad };
}

// ---- Sample size ----

// Respondents needed to estimate a mean within ±margin. Iterates because t depends on n.
export function sampleSizeMean({ sd, margin, confidence = 0.95 }) {
  if (!(sd > 0) || !(margin > 0)) return null;
  let n = Math.max(2, Math.ceil((zInv(1 - (1 - confidence) / 2) * sd / margin) ** 2));
  for (let i = 0; i < 50; i++) {
    const next = Math.max(2, Math.ceil((tCrit(confidence, n - 1) * sd / margin) ** 2));
    if (next === n) break;
    n = next;
  }
  return n;
}

// Sample size to detect a difference between two means (per group for between-subjects,
// total for within-subjects), two-sided test.
export function sampleSizeCompare({ sd, diff, confidence = 0.95, power = 0.8, paired = false }) {
  if (!(sd > 0) || !(diff > 0)) return null;
  const k = paired ? 1 : 2;
  const za = zInv(1 - (1 - confidence) / 2), zb = zInv(power);
  let n = Math.max(2, Math.ceil(k * ((za + zb) * sd / diff) ** 2));
  for (let i = 0; i < 50; i++) {
    const df = paired ? n - 1 : 2 * n - 2;
    const ta = tCrit(confidence, df);
    const tb = tCrit(1 - 2 * (1 - power), df);
    const next = Math.max(2, Math.ceil(k * ((ta + tb) * sd / diff) ** 2));
    if (next === n) break;
    n = next;
  }
  return n;
}

// Users needed to see a problem at least once, given how often it occurs: 1 − (1 − p)^n.
export function sampleSizeDiscovery({ p, goal }) {
  if (!(p > 0 && p < 1) || !(goal > 0 && goal < 1)) return null;
  return Math.ceil(Math.log(1 - goal) / Math.log(1 - p));
}
export const discoveryRate = (p, n) => 1 - (1 - p) ** n;

// ---- Comparing two groups ----

export function summarise(xs) {
  return { n: xs.length, mean: mean(xs), sd: xs.length > 1 ? Math.sqrt(variance(xs)) : 0 };
}

// Welch's t-test for independent groups. Accepts raw arrays or { mean, sd, n } summaries.
export function compareIndependent(a, b, confidence = 0.95) {
  const A = Array.isArray(a) ? summarise(a) : a;
  const B = Array.isArray(b) ? summarise(b) : b;
  if (A.n < 2 || B.n < 2) throw new Error('Each group needs at least two values.');
  const va = A.sd ** 2 / A.n, vb = B.sd ** 2 / B.n;
  const se = Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (A.n - 1) + vb ** 2 / (B.n - 1));
  const diff = A.mean - B.mean;
  const t = se ? diff / se : 0;
  const p = se ? 2 * (1 - tCdf(Math.abs(t), df)) : 1;
  const half = tCrit(confidence, df) * se;
  const pooled = Math.sqrt(((A.n - 1) * A.sd ** 2 + (B.n - 1) * B.sd ** 2) / (A.n + B.n - 2));
  return { A, B, diff, se, df, t, p, ci: [diff - half, diff + half], d: pooled ? diff / pooled : 0, test: 'welch' };
}

// Paired t-test on matched values (same participants, two conditions).
export function comparePaired(a, b, confidence = 0.95) {
  if (a.length !== b.length) throw new Error(`Paired data needs the same number of values in each list (you have ${a.length} and ${b.length}).`);
  if (a.length < 2) throw new Error('Paired data needs at least two pairs.');
  const diffs = a.map((v, i) => v - b[i]);
  const D = summarise(diffs);
  const se = D.sd / Math.sqrt(D.n);
  const df = D.n - 1;
  const t = se ? D.mean / se : 0;
  const p = se ? 2 * (1 - tCdf(Math.abs(t), df)) : 1;
  const half = tCrit(confidence, df) * se;
  return { A: summarise(a), B: summarise(b), diff: D.mean, se, df, t, p, ci: [D.mean - half, D.mean + half], d: D.sd ? D.mean / D.sd : 0, test: 'paired' };
}

// N−1 two-proportion test, recommended by Sauro & Lewis for small-sample completion rates.
export function compareProportions(x1, n1, x2, n2, confidence = 0.95) {
  if (!(n1 > 0 && n2 > 0) || x1 > n1 || x2 > n2 || x1 < 0 || x2 < 0) throw new Error('Successes must be between 0 and the number of attempts.');
  const p1 = x1 / n1, p2 = x2 / n2, N = n1 + n2;
  const P = (x1 + x2) / N;
  const se0 = Math.sqrt(P * (1 - P) * (1 / n1 + 1 / n2));
  const z = se0 ? ((p1 - p2) / se0) * Math.sqrt((N - 1) / N) : 0;
  const p = se0 ? 2 * normalTail(Math.abs(z)) : 1;
  // Adjusted-Wald interval for the difference (Agresti & Caffo, 2000).
  const a1 = (x1 + 1) / (n1 + 2), a2 = (x2 + 1) / (n2 + 2);
  const se = Math.sqrt(a1 * (1 - a1) / (n1 + 2) + a2 * (1 - a2) / (n2 + 2));
  const zc = zInv(1 - (1 - confidence) / 2);
  const diff = p1 - p2;
  return { p1, p2, diff, z, p, ci: [a1 - a2 - zc * se, a1 - a2 + zc * se] };
}

// ---- Completion rates ----

export function completionRate(x, n, confidence = 0.95) {
  if (!(n > 0) || x < 0 || x > n || !Number.isInteger(x) || !Number.isInteger(n)) throw new Error('Enter whole numbers, with successes between 0 and the number of attempts.');
  const z = zInv(1 - (1 - confidence) / 2);
  const observed = x / n;
  const nAdj = n + z * z;
  const pAdj = (x + z * z / 2) / nAdj;
  const half = z * Math.sqrt(pAdj * (1 - pAdj) / nAdj);
  // Best point estimate for small samples (Lewis & Sauro, 2006).
  const best = observed <= 0.5 ? (x + z * z / 2) / nAdj : observed >= 0.9 ? (x + 1) / (n + 2) : observed;
  const method = observed <= 0.5 ? 'Wilson' : observed >= 0.9 ? 'Laplace' : 'observed proportion';
  return { observed, best, method, ci: [Math.max(0, pAdj - half), Math.min(1, pAdj + half)] };
}

// ---- Time on task ----

// Sauro & Lewis recommend the geometric mean for task times when n < 25, because times are
// positively skewed; the interval is built on the log scale and transformed back.
export function taskTime(times, confidence = 0.95) {
  const xs = times.filter(v => v > 0);
  if (xs.length < 2) throw new Error('Enter at least two task times greater than zero.');
  const logs = xs.map(Math.log);
  const L = summarise(logs);
  const half = tCrit(confidence, L.n - 1) * L.sd / Math.sqrt(L.n);
  const sorted = [...xs].sort((a, b) => a - b);
  const n = xs.length;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const S = summarise(xs);
  return {
    n, geometric: Math.exp(L.mean), ci: [Math.exp(L.mean - half), Math.exp(L.mean + half)],
    median, mean: S.mean, sd: S.sd, min: sorted[0], max: sorted[n - 1], dropped: times.length - n,
  };
}

// ---- Reliability ----

// Cronbach's alpha with corrected item–total correlations and alpha if each item is dropped.
// Rows are respondents, columns are items. Rows with any missing value are dropped (listwise).
export function cronbachAlpha(rows) {
  const complete = rows.filter(r => r.every(v => v != null && Number.isFinite(v)));
  const k = complete[0]?.length ?? 0;
  if (k < 2) throw new Error('Cronbach’s alpha needs at least two items (columns).');
  if (complete.length < 3) throw new Error('Cronbach’s alpha needs at least three complete respondents (rows).');
  const cols = Array.from({ length: k }, (_, j) => complete.map(r => r[j]));
  const alphaOf = idx => {
    if (idx.length < 2) return null;
    const totals = complete.map(r => idx.reduce((s, j) => s + r[j], 0));
    const vt = variance(totals);
    if (!vt) return null;
    const sumVar = idx.reduce((s, j) => s + variance(cols[j]), 0);
    return (idx.length / (idx.length - 1)) * (1 - sumVar / vt);
  };
  const all = cols.map((_, j) => j);
  const corr = (x, y) => {
    const mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  };
  const items = cols.map((col, j) => {
    const rest = complete.map(r => r.reduce((s, v, i) => (i === j ? s : s + v), 0));
    return { index: j, mean: mean(col), sd: Math.sqrt(variance(col)), itemTotal: corr(col, rest), alphaIfDeleted: alphaOf(all.filter(i => i !== j)) };
  });
  return { alpha: alphaOf(all), k, n: complete.length, dropped: rows.length - complete.length, items };
}

// George & Mallery's (2003) widely quoted rule of thumb.
export function alphaBand(a) {
  if (a == null) return { label: 'Not available', tone: 'neutral' };
  if (a >= 0.9) return { label: 'Excellent', tone: 'great' };
  if (a >= 0.8) return { label: 'Good', tone: 'good' };
  if (a >= 0.7) return { label: 'Acceptable', tone: 'ok' };
  if (a >= 0.6) return { label: 'Questionable', tone: 'poor' };
  return { label: a >= 0.5 ? 'Poor' : 'Unacceptable', tone: 'bad' };
}

// ---- Citations ----

// Splits an APA reference string into parts. Good enough for the references on this site,
// which all follow "Authors (Year). Title. Source." Not a general APA parser.
export function parseApa(text) {
  const m = text.match(/^(.*?)\s\((\d{4})\)\.\s(.*)$/);
  if (!m) return null;
  const [, authorStr, year, rest] = m;
  const authors = authorStr.split(/(?<=\.),\s*(?:&\s*)?|\s&\s/).map(a => a.trim()).filter(Boolean);
  const cut = rest.search(/[.?!]\s(?=[A-Za-z])/);
  const title = (cut >= 0 ? rest.slice(0, cut + 1) : rest).replace(/\.$/, '');
  const source = cut >= 0 ? rest.slice(cut + 2).replace(/\.$/, '') : '';
  return { authors, year, title, source };
}

export function inTextCitation(text) {
  const p = parseApa(text);
  if (!p) return null;
  const names = p.authors.map(a => a.split(',')[0]);
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} & ${names[1]}` : `${names[0]} et al.`;
  return `${who}, ${p.year}`;
}

export function toBibtex(text, url) {
  const p = parseApa(text);
  if (!p) return '';
  const key = `${p.authors[0].split(',')[0].toLowerCase().replace(/[^a-z]/g, '')}${p.year}`;
  const fields = { author: p.authors.join(' and '), title: `{${p.title}}`, year: p.year };
  let type = 'misc';
  const art = p.source.match(/^(.*?),\s*(\d+)\(([^)]+)\),\s*([\d–-]+)$/) || p.source.match(/^(.*?),\s*(\d+)\(([^)]+)\)()$/) || p.source.match(/^(.*?),\s*(\d+),\s*([\d–-]+)$/);
  if (art && art.length === 5) {
    type = 'article'; Object.assign(fields, { journal: art[1], volume: art[2], number: art[3], ...(art[4] ? { pages: art[4].replace('–', '--') } : {}) });
  } else if (art) {
    type = 'article'; Object.assign(fields, { journal: art[1], volume: art[2], pages: art[3].replace('–', '--') });
  } else if (/^In\s.*\(Eds?\.\)/.test(p.source)) {
    const m = p.source.match(/^In\s(.*?)\s\(Eds?\.\),\s*(.*?)(?:\s*\(pp\.\s*([\d–-]+)\))?\.\s*(.*)$/);
    type = 'incollection';
    if (m) Object.assign(fields, { editor: m[1].replace(/,?\s&\s|,\s(?=[A-Z]\.)/g, ' and '), booktitle: m[2], ...(m[3] ? { pages: m[3].replace('–', '--') } : {}), publisher: m[4] });
  } else if (/^In\s/.test(p.source) || /Proceedings/i.test(p.source)) {
    type = /Proceedings/i.test(p.source) ? 'inproceedings' : 'incollection';
    const pages = p.source.match(/(?:pp\.\s*)?(\d+)[–-](\d+)/);
    fields.booktitle = p.source.replace(/^In\s/, '').replace(/\s*\(pp\.[^)]*\)/, '').replace(/,\s*\d+[–-]\d+$/, '').split('. ')[0];
    if (pages) fields.pages = `${pages[1]}--${pages[2]}`;
  } else if (p.source) {
    type = 'book'; fields.publisher = p.source;
  }
  const ed = fields.title.match(/\s\((\d+)(?:st|nd|rd|th) ed\.\)\}$/);
  if (ed) { fields.title = fields.title.replace(ed[0], '}'); fields.edition = ed[1]; }
  if (url?.includes('doi.org/')) fields.doi = url.split('doi.org/')[1];
  else if (url) fields.url = url;
  return `@${type}{${key},\n${Object.entries(fields).map(([k, v]) => `  ${k} = {${String(v).replace(/&/g, '\\&')}}`).join(',\n')}\n}`;
}
