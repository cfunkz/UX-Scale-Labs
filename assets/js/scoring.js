// Every scorer takes the answers object ({ itemNumber: value | null }) and returns
// { primary, band, facts, subscales, interpretation, items }.
// `describe(value)` maps a primary value to a band so dataset means can be graded too.

const round = (v, d = 1) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const mean = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const answered = (scale, answers, nums) =>
  (nums ?? scale.items.map(i => i.n)).map(n => answers[n]).filter(v => v != null);

const CGS = [
  [84.1, 'A+', '96–100'], [80.8, 'A', '90–95'], [78.9, 'A−', '85–89'], [77.2, 'B+', '80–84'],
  [74.1, 'B', '70–79'], [72.6, 'B−', '65–69'], [71.1, 'C+', '60–64'], [65.0, 'C', '41–59'],
  [62.7, 'C−', '35–40'], [51.7, 'D', '15–34'], [0, 'F', '0–14'],
];

const toneForGrade = g => (g.startsWith('A') ? 'great' : g.startsWith('B') ? 'good' : g.startsWith('C') ? 'ok' : g === 'D' ? 'poor' : 'bad');

export function susGrade(score) {
  const [, grade, percentile] = CGS.find(([min]) => score >= min);
  return { grade, percentile };
}

function susBand(score, prefix = '') {
  const { grade } = susGrade(score);
  return { label: `${prefix}Grade ${grade}`, tone: toneForGrade(grade) };
}

function acceptability(score) {
  return score > 70 ? 'Acceptable' : score >= 50 ? 'Marginal' : 'Not acceptable';
}

function susInterpretation(score, what = 'This score') {
  const { grade, percentile } = susGrade(score);
  const vsAvg = score >= 68 ? 'above' : 'below';
  return `${what} is ${vsAvg} the average SUS of 68 and earns a ${grade} on the Sauro–Lewis curved grading scale, better than roughly ${percentile.split('–')[0]}% of products in the reference database. Bangor et al. would classify it as “${acceptability(score).toLowerCase()}”.`;
}

function itemRows(scale, answers, scoredFn = () => null) {
  return scale.items.map(it => ({ n: it.n, text: it.text, response: answers[it.n], scored: answers[it.n] == null ? null : scoredFn(it, answers[it.n]) }));
}

function subscaleMeans(scale, answers, valueOf = (it, v) => v) {
  return (scale.subscales ?? []).map(sub => {
    const vals = sub.items.map(n => [scale.items[n - 1], answers[n]]).filter(([, v]) => v != null).map(([it, v]) => valueOf(it, v));
    return { key: sub.key, name: sub.name, value: mean(vals), sub };
  });
}

const meanBand = (value, { min, max, lowerIsBetter }) => {
  let pct = (value - min) / (max - min);
  if (lowerIsBetter) pct = 1 - pct;
  if (pct >= 0.8) return { label: 'Very favourable', tone: 'great' };
  if (pct >= 0.65) return { label: 'Favourable', tone: 'good' };
  if (pct >= 0.5) return { label: 'Mixed', tone: 'ok' };
  if (pct >= 0.35) return { label: 'Unfavourable', tone: 'poor' };
  return { label: 'Very unfavourable', tone: 'bad' };
};

const ueqBand = v => (v > 0.8 ? { label: 'Positive', tone: 'good' } : v < -0.8 ? { label: 'Negative', tone: 'bad' } : { label: 'Neutral', tone: 'ok' });

function ueqBenchmark(value, bench) {
  const [ex, good, above, below] = bench;
  if (value > ex) return { label: 'Excellent', tone: 'great' };
  if (value > good) return { label: 'Good', tone: 'good' };
  if (value > above) return { label: 'Above average', tone: 'ok' };
  if (value > below) return { label: 'Below average', tone: 'poor' };
  return { label: 'Bad', tone: 'bad' };
}

// Subscales carry their own describe() so dataset means can be banded the same way.
const withBand = (s, describe) => ({ ...s, describe, band: s.value == null ? null : describe(s.value) });

const ueqTransform = (it, v) => (it.reverse ? 4 - v : v - 4);

export const SCORERS = {
  sus: {
    score(scale, a) {
      const contrib = (it, v) => (it.reverse ? 5 - v : v - 1);
      const sum = scale.items.reduce((s, it) => s + contrib(it, a[it.n]), 0);
      const value = sum * 2.5;
      return {
        primary: { label: 'SUS score', value, min: 0, max: 100, decimals: 1 },
        band: this.describe(value),
        facts: [
          { label: 'Percentile', value: susGrade(value).percentile },
          { label: 'Acceptability', value: acceptability(value) },
          { label: 'vs. average (68)', value: `${value >= 68 ? '+' : ''}${round(value - 68)}` },
        ],
        interpretation: susInterpretation(value),
        items: itemRows(scale, a, contrib),
        scoredLabel: 'Contribution (0–4)',
      };
    },
    describe: v => susBand(v),
  },

  umux: {
    score(scale, a) {
      const contrib = (it, v) => (it.reverse ? 7 - v : v - 1);
      const sum = scale.items.reduce((s, it) => s + contrib(it, a[it.n]), 0);
      const value = (sum / 24) * 100;
      return {
        primary: { label: 'UMUX score', value, min: 0, max: 100, decimals: 1 },
        band: this.describe(value),
        facts: [{ label: 'Percentile (SUS scale)', value: susGrade(value).percentile }],
        interpretation: susInterpretation(value, 'Read on the SUS scale, this score'),
        items: itemRows(scale, a, contrib),
        scoredLabel: 'Contribution (0–6)',
      };
    },
    describe: v => susBand(v, 'SUS-equivalent '),
  },

  umuxLite: {
    score(scale, a) {
      const raw = ((a[1] + a[2] - 2) / 12) * 100;
      const value = 0.65 * raw + 22.9;
      return {
        primary: { label: 'SUS-equivalent score', value, min: 0, max: 100, decimals: 1 },
        band: this.describe(value),
        facts: [
          { label: 'Raw UMUX-LITE', value: round(raw) },
          { label: 'Percentile (SUS scale)', value: susGrade(value).percentile },
        ],
        interpretation: `${susInterpretation(value, 'The regression-adjusted score')} The adjustment compresses the range to 22.9–87.9, so a perfect raw score maps to 87.9.`,
        items: itemRows(scale, a),
        rawValue: raw,
      };
    },
    describe: v => susBand(v, ''),
  },

  csuq: {
    score(scale, a) {
      const value = mean(answered(scale, a));
      const subs = subscaleMeans(scale, a).map(s => ({ ...s, min: 1, max: 7, decimals: 2 }));
      const pct = ((value - 1) / 6) * 100;
      return {
        primary: { label: 'Overall (1–7)', value, min: 1, max: 7, decimals: 2 },
        band: this.describe(value),
        facts: [{ label: '0–100 equivalent', value: round(pct) }, { label: 'Items answered', value: `${answered(scale, a).length} / 16` }],
        subscales: subs,
        interpretation: `Rescaled to 0–100 the overall score is ${round(pct)}. Lewis (2018) found rescaled CSUQ scores sit very close to SUS, so as a rough guide this is about a ${susGrade(pct).grade} on the SUS curved grading scale.`,
        items: itemRows(scale, a),
      };
    },
    describe(v) {
      const pct = ((v - 1) / 6) * 100;
      return susBand(pct, 'Approx. SUS ');
    },
  },

  pssuq: {
    score(scale, a) {
      const value = mean(answered(scale, a));
      const subs = subscaleMeans(scale, a).map(s => withBand({ ...s, min: 1, max: 7, decimals: 2, lowerIsBetter: true, norm: s.sub.norm }, v => normBand(v, s.sub.norm)));
      const better = subs.filter(s => s.value != null && s.value < s.norm).map(s => s.name);
      return {
        primary: { label: 'Overall (1–7)', value, min: 1, max: 7, decimals: 2, lowerIsBetter: true },
        band: this.describe(value, scale),
        facts: [{ label: 'Norm (Lewis, 2002)', value: scale.overallNorm.toFixed(2) }, { label: 'Items answered', value: `${answered(scale, a).length} / 16` }],
        subscales: subs,
        interpretation: `Lower is better on the PSSUQ. The overall score is ${value < scale.overallNorm ? 'better' : 'worse'} than the published norm of ${scale.overallNorm}. ${better.length ? `Subscales beating their norm: ${better.join(', ')}.` : 'No subscale beats its norm.'}`,
        items: itemRows(scale, a),
      };
    },
    describe: v => normBand(v, 2.82),
  },

  seq: {
    score(scale, a) {
      const value = a[1];
      return {
        primary: { label: 'SEQ', value, min: 1, max: 7, decimals: 0 },
        band: this.describe(value),
        facts: [{ label: 'Reference average', value: '≈ 5.5' }],
        interpretation: `The task was rated ${value >= 5.5 ? 'easier' : 'harder'} than the average task (≈ 5.5). Scores below about 4.5 usually point to a task worth investigating; ask why in a follow-up question.`,
        items: itemRows(scale, a),
      };
    },
    describe: v => (v >= 6 ? { label: 'Easier than average', tone: 'great' } : v >= 5.5 ? { label: 'About average', tone: 'good' } : v >= 4.5 ? { label: 'Harder than average', tone: 'ok' } : { label: 'Difficult', tone: 'bad' }),
  },

  asq: {
    score(scale, a) {
      const value = mean(answered(scale, a));
      return {
        primary: { label: 'ASQ (1–7)', value, min: 1, max: 7, decimals: 2, lowerIsBetter: true },
        band: this.describe(value),
        facts: [{ label: 'Orientation', value: 'Lower is better' }],
        interpretation: 'The ASQ keeps its original orientation, where 1 means strong agreement with being satisfied. Compare scenarios against each other rather than against an absolute threshold.',
        items: itemRows(scale, a),
      };
    },
    describe: v => meanBand(v, { min: 1, max: 7, lowerIsBetter: true }),
  },

  tlx: {
    score(scale, a) {
      const value = mean(answered(scale, a));
      const subs = scale.items.map(it => ({ key: `d${it.n}`, name: it.short, value: a[it.n], min: 0, max: 100, decimals: 0, lowerIsBetter: true }));
      const top = [...subs].sort((x, y) => y.value - x.value)[0];
      return {
        primary: { label: 'Raw TLX', value, min: 0, max: 100, decimals: 1, lowerIsBetter: true },
        band: this.describe(value),
        facts: [{ label: 'Highest dimension', value: `${top.name} (${top.value})` }],
        subscales: subs,
        interpretation: `Overall perceived workload is ${this.describe(value).label.toLowerCase()}. The biggest contributor was ${top.name.toLowerCase()}. TLX has no universal cut-offs, so compare designs or task variants against each other.`,
        items: itemRows(scale, a),
      };
    },
    describe: v => (v < 20 ? { label: 'Low', tone: 'great' } : v < 40 ? { label: 'Moderate', tone: 'good' } : v < 60 ? { label: 'Substantial', tone: 'ok' } : v < 80 ? { label: 'High', tone: 'poor' } : { label: 'Very high', tone: 'bad' }),
  },

  ueq: {
    score(scale, a) {
      const subs = subscaleMeans(scale, a, ueqTransform).map(s => withBand({ ...s, min: -3, max: 3, decimals: 2, ticks: s.sub.bench }, v => ueqBenchmark(v, s.sub.bench)));
      const value = mean(subs.map(s => s.value));
      const strong = subs.filter(s => ['Excellent', 'Good'].includes(s.band.label)).map(s => s.name);
      const weak = subs.filter(s => ['Below average', 'Bad'].includes(s.band.label)).map(s => s.name);
      return {
        primary: { label: 'Mean of scales', value, min: -3, max: 3, decimals: 2 },
        band: this.describe(value),
        facts: [
          { label: 'Attractiveness', value: round(subs[0].value, 2) },
          { label: 'Pragmatic quality', value: round(mean(subs.filter(s => ['per', 'eff', 'dep'].includes(s.key)).map(s => s.value)), 2) },
          { label: 'Hedonic quality', value: round(mean(subs.filter(s => ['sti', 'nov'].includes(s.key)).map(s => s.value)), 2) },
        ],
        subscales: subs,
        interpretation: [
          strong.length ? `Strong against the benchmark: ${strong.join(', ')}.` : '',
          weak.length ? `Weak against the benchmark: ${weak.join(', ')}.` : '',
          'Report the six scales individually; the mean is shown only as a summary.',
        ].filter(Boolean).join(' '),
        items: itemRows(scale, a, ueqTransform),
        scoredLabel: 'Value (−3…+3)',
      };
    },
    describe: ueqBand,
  },

  ueqs: {
    score(scale, a) {
      const subs = subscaleMeans(scale, a, ueqTransform).map(s => withBand({ ...s, min: -3, max: 3, decimals: 2 }, ueqBand));
      const value = mean(scale.items.map(it => ueqTransform(it, a[it.n])));
      return {
        primary: { label: 'Overall', value, min: -3, max: 3, decimals: 2 },
        band: this.describe(value),
        facts: subs.map(s => ({ label: s.name, value: `${round(s.value, 2)} · ${s.band.label}` })),
        subscales: subs,
        interpretation: `Pragmatic quality is ${subs[0].band.label.toLowerCase()} and hedonic quality is ${subs[1].band.label.toLowerCase()}. Values between −0.8 and +0.8 are neutral; above +2 is rare in practice.`,
        items: itemRows(scale, a, ueqTransform),
        scoredLabel: 'Value (−3…+3)',
      };
    },
    describe: ueqBand,
  },

  cuq: {
    score(scale, a) {
      const odd = scale.items.filter(it => !it.reverse).reduce((s, it) => s + a[it.n], 0);
      const even = scale.items.filter(it => it.reverse).reduce((s, it) => s + a[it.n], 0);
      const value = ((odd - 8 + (40 - even)) / 64) * 100;
      return {
        primary: { label: 'CUQ score', value, min: 0, max: 100, decimals: 1 },
        band: this.describe(value),
        facts: [{ label: 'Σ positive items', value: odd }, { label: 'Σ negative items', value: even }],
        interpretation: 'CUQ is scored on a 0–100 range like the SUS, but there are no published grade norms yet. Track it across versions, or compare with a competitor bot tested the same way.',
        items: itemRows(scale, a, (it, v) => (it.reverse ? 5 - v : v - 1)),
        scoredLabel: 'Contribution (0–4)',
      };
    },
    describe: v => meanBand(v, { min: 0, max: 100 }),
  },

  trust: {
    score(scale, a) {
      const adj = (it, v) => (it.reverse ? 8 - v : v);
      const value = mean(scale.items.map(it => adj(it, a[it.n])));
      const subs = subscaleMeans(scale, a).map(s => ({ ...s, min: 1, max: 7, decimals: 2, lowerIsBetter: s.key === 'distrust' }));
      return {
        primary: { label: 'Overall trust (1–7)', value, min: 1, max: 7, decimals: 2 },
        band: this.describe(value),
        facts: subs.map(s => ({ label: s.name, value: round(s.value, 2) })),
        subscales: subs,
        interpretation: 'Higher means more trust. In AI and automation work the goal is usually calibrated trust: high enough that people use the system, not so high that they stop checking its output. Look at the distrust items separately.',
        items: itemRows(scale, a, adj),
        scoredLabel: 'Adjusted (1–7)',
      };
    },
    describe: v => meanBand(v, { min: 1, max: 7 }),
  },

  mean: {
    score(scale, a) {
      const r = scale.response;
      const value = mean(answered(scale, a));
      const subs = subscaleMeans(scale, a).map(s => withBand({ ...s, min: r.min, max: r.max, decimals: 2 }, v => meanBand(v, r)));
      return {
        primary: { label: `Mean (${r.min}–${r.max})`, value, min: r.min, max: r.max, decimals: 2 },
        band: this.describe(value, scale),
        facts: subs.length ? subs.map(s => ({ label: s.name, value: round(s.value, 2) })) : [{ label: 'Scale midpoint', value: (r.min + r.max) / 2 }],
        subscales: subs,
        interpretation: scale.status === 'informal'
          ? 'This is an informal measure without published norms. The band is based on the position within the response range only.'
          : 'There is no published benchmark for this mean, so the band reflects the position within the response range. Compare against previous rounds or alternative designs.',
        items: itemRows(scale, a),
      };
    },
    describe: (v, scale) => meanBand(v, scale?.response ?? { min: 1, max: 7 }),
  },

  nps: {
    score(scale, a) {
      const value = a[1];
      const band = this.describe(value);
      return {
        primary: { label: 'Rating', value, min: 0, max: 10, decimals: 0 },
        band,
        facts: [{ label: 'Category', value: band.label }],
        interpretation: 'A single rating only places this respondent into a category. NPS itself is a group statistic: use “Score a dataset” to calculate it.',
        items: itemRows(scale, a),
      };
    },
    describe: v => (v >= 9 ? { label: 'Promoter', tone: 'great' } : v >= 7 ? { label: 'Passive', tone: 'ok' } : { label: 'Detractor', tone: 'bad' }),
    aggregate(values) {
      const n = values.length;
      const p = values.filter(v => v >= 9).length / n;
      const d = values.filter(v => v <= 6).length / n;
      const nps = (p - d) * 100;
      // Variance of a difference of two proportions from the same multinomial sample.
      const se = Math.sqrt((p + d - (p - d) ** 2) / n) * 100;
      return {
        headline: { label: 'Net Promoter Score', value: nps, min: -100, max: 100, decimals: 1, ci: [nps - 1.96 * se, nps + 1.96 * se] },
        facts: [
          { label: 'Promoters (9–10)', value: `${round(p * 100)}%` },
          { label: 'Passives (7–8)', value: `${round((1 - p - d) * 100)}%` },
          { label: 'Detractors (0–6)', value: `${round(d * 100)}%` },
        ],
      };
    },
  },

  csat: {
    score(scale, a) {
      const value = a[1];
      return {
        primary: { label: 'Rating', value, min: 1, max: 5, decimals: 0 },
        band: this.describe(value),
        facts: [{ label: 'Counts as satisfied', value: value >= 4 ? 'Yes' : 'No' }],
        interpretation: 'CSAT is normally reported as the percentage of satisfied (4–5) responses across many people. Use “Score a dataset” for that figure.',
        items: itemRows(scale, a),
      };
    },
    describe: v => meanBand(v, { min: 1, max: 5 }),
    aggregate(values) {
      const n = values.length;
      const p = values.filter(v => v >= 4).length / n;
      const se = Math.sqrt((p * (1 - p)) / n) * 100;
      return {
        headline: { label: 'CSAT', value: p * 100, min: 0, max: 100, decimals: 1, suffix: '%', ci: [Math.max(0, p * 100 - 1.96 * se), Math.min(100, p * 100 + 1.96 * se)] },
        facts: [{ label: 'Satisfied (4–5)', value: values.filter(v => v >= 4).length }, { label: 'Not satisfied (1–3)', value: values.filter(v => v < 4).length }],
      };
    },
  },

  ces: {
    score(scale, a) {
      const value = a[1];
      return {
        primary: { label: 'CES', value, min: 1, max: 7, decimals: 0 },
        band: this.describe(value),
        facts: [{ label: 'Agrees (5–7)', value: value >= 5 ? 'Yes' : 'No' }],
        interpretation: 'Higher means the experience felt easier. Low-effort experiences are strongly associated with repeat use; follow up on anything below 5.',
        items: itemRows(scale, a),
      };
    },
    describe: v => meanBand(v, { min: 1, max: 7 }),
    aggregate(values) {
      const n = values.length;
      const agree = values.filter(v => v >= 5).length;
      return { facts: [{ label: '% agree (5–7)', value: `${round((agree / n) * 100)}%` }] };
    },
  },
};

function normBand(value, norm) {
  const diff = value - norm;
  if (diff <= -0.5) return { label: 'Much better than norm', tone: 'great' };
  if (diff < 0) return { label: 'Better than norm', tone: 'good' };
  if (diff < 0.5) return { label: 'Worse than norm', tone: 'ok' };
  return { label: 'Much worse than norm', tone: 'bad' };
}

export function scoreScale(scale, answers) {
  const scorer = SCORERS[scale.scorer];
  if (scale.response.na && answered(scale, answers).length === 0) {
    throw new Error('At least one item needs an answer other than N/A.');
  }
  return scorer.score(scale, answers);
}

export { round, mean };
