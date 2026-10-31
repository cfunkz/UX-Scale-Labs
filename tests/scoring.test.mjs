import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALE_MAP } from '../docs/assets/js/scales.js';
import { scoreScale, SCORERS, susGrade } from '../docs/assets/js/scoring.js';
import { describe, t95, parseCSV, jsonToRows } from '../docs/assets/js/stats.js';

const fill = (id, fn) => Object.fromEntries(SCALE_MAP[id].items.map(it => [it.n, fn(it)]));
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('SUS: neutral answers give 50, best answers give 100', () => {
  near(scoreScale(SCALE_MAP.sus, fill('sus', () => 3)).primary.value, 50);
  near(scoreScale(SCALE_MAP.sus, fill('sus', it => (it.reverse ? 1 : 5))).primary.value, 100);
  near(scoreScale(SCALE_MAP.sus, fill('sus', it => (it.reverse ? 5 : 1))).primary.value, 0);
});

test('SUS curved grading scale boundaries', () => {
  assert.equal(susGrade(68).grade, 'C');
  assert.equal(susGrade(84.1).grade, 'A+');
  assert.equal(susGrade(84.0).grade, 'A');
  assert.equal(susGrade(51.6).grade, 'F');
});

test('UMUX and UMUX-LITE', () => {
  near(scoreScale(SCALE_MAP.umux, fill('umux', it => (it.reverse ? 1 : 7))).primary.value, 100);
  const lite = scoreScale(SCALE_MAP['umux-lite'], { 1: 7, 2: 7 });
  near(lite.rawValue, 100);
  near(lite.primary.value, 87.9);
});

test('UEQ transforms reversed pairs and neutral is zero', () => {
  const ueq = SCALE_MAP.ueq;
  near(scoreScale(ueq, fill('ueq', () => 4)).primary.value, 0);
  const best = scoreScale(ueq, fill('ueq', it => (it.reverse ? 1 : 7)));
  near(best.primary.value, 3);
  best.subscales.forEach(s => near(s.value, 3));
  assert.equal(ueq.subscales.map(s => s.items.length).join(), '6,4,4,4,4,4');
});

test('UEQ-S pragmatic and hedonic', () => {
  const r = scoreScale(SCALE_MAP['ueq-s'], { 1: 7, 2: 7, 3: 7, 4: 7, 5: 1, 6: 1, 7: 1, 8: 1 });
  near(r.subscales[0].value, 3);
  near(r.subscales[1].value, -3);
  near(r.primary.value, 0);
});

test('CUQ range is 0–100', () => {
  near(scoreScale(SCALE_MAP.cuq, fill('cuq', it => (it.reverse ? 1 : 5))).primary.value, 100);
  near(scoreScale(SCALE_MAP.cuq, fill('cuq', it => (it.reverse ? 5 : 1))).primary.value, 0);
});

test('PSSUQ skips N/A and keeps lower-is-better', () => {
  const a = fill('pssuq', () => 2);
  a[7] = null;
  const r = scoreScale(SCALE_MAP.pssuq, a);
  near(r.primary.value, 2);
  assert.equal(r.band.label, 'Much better than norm');
});

test('Trust reverses distrust items', () => {
  const r = scoreScale(SCALE_MAP.trust, fill('trust', it => (it.reverse ? 1 : 7)));
  near(r.primary.value, 7);
});

test('NASA-TLX raw score is the mean', () => {
  near(scoreScale(SCALE_MAP['nasa-tlx'], { 1: 50, 2: 0, 3: 100, 4: 25, 5: 75, 6: 50 }).primary.value, 50);
});

test('NPS aggregate', () => {
  const agg = SCORERS.nps.aggregate([10, 9, 8, 7, 6, 0, 10, 10, 9, 3]);
  near(agg.headline.value, 20);
  assert.ok(agg.headline.ci[0] < 20 && agg.headline.ci[1] > 20);
});

test('t critical values and descriptives', () => {
  near(t95(10), 2.228, 0.002);
  near(t95(30), 2.042, 0.002);
  const d = describe([1, 2, 3, 4, 5]);
  near(d.mean, 3);
  near(d.sd, Math.sqrt(2.5));
  near(d.ci[1] - 3, 2.776 * Math.sqrt(2.5) / Math.sqrt(5), 1e-3);
});

test('CSV parser handles quotes and semicolons', () => {
  assert.deepEqual(parseCSV('id;Q1\n"a;b";3\n'), [['id', 'Q1'], ['a;b', '3']]);
  assert.deepEqual(parseCSV('id,Q1\r\n"x ""y""",4'), [['id', 'Q1'], ['x "y"', '4']]);
});

test('JSON datasets accept objects, answer lists, arrays and the export format', () => {
  const { rows, skipped } = jsonToRows(JSON.stringify([
    { id: 'P1', Q1: 4, q2: '2', Q3: null },
    { participant: 'P2', answers: [1, 2, 3] },
    ['P3', 5, 4, 3],
    [1, 2],
    { id: 'P5', answers: { 1: 3, 2: 3, 3: 3 } },
  ]), 3);
  assert.deepEqual(rows, [
    ['id', 'Q1', 'Q2', 'Q3'],
    ['P1', '4', '2', ''],
    ['P2', '1', '2', '3'],
    ['P3', '5', '4', '3'],
    ['', '', '', ''],
    ['P5', '3', '3', '3'],
  ]);
  assert.match(skipped[3], /2 answers/);
  assert.equal(jsonToRows('{"respondents":[{"Q1":1}]}', 1).rows[1][1], '1');
  assert.throws(() => jsonToRows('[{"id": "P1",}]', 2), /not valid JSON/);
  assert.throws(() => jsonToRows('[{"id": "P1", "foo": 1}]', 2), /No answers found/);
  assert.throws(() => jsonToRows('{"x": 1}', 2), /list of respondents/);
});

test('every scale has items, a scorer and a response format', () => {
  for (const s of Object.values(SCALE_MAP)) {
    assert.ok(s.items.length > 0, s.id);
    assert.ok(SCORERS[s.scorer], `${s.id} scorer`);
    assert.ok(s.response.max > s.response.min, s.id);
  }
});

test('research statistics match textbook values', async () => {
  const r = await import('../docs/assets/js/research.js');
  near(r.tCrit(0.95, 10), 2.228, 0.001);
  near(r.zInv(0.975), 1.95996, 1e-4);
  // Welch: equal SDs and sizes reduce to the pooled t-test.
  const w = r.compareIndependent([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
  near(w.t, -2, 1e-9); near(w.df, 8, 1e-9); near(w.p, 0.0805, 1e-3);
  const pr = r.comparePaired([1, 2, 3, 4, 5], [2, 2, 4, 5, 7]);
  near(pr.t, -3.162, 1e-3); assert.equal(pr.df, 4);
  // Adjusted Wald for 10/10 at 95%: lower bound about 0.679.
  near(r.completionRate(10, 10).ci[0], 0.679, 1e-3);
  near(r.completionRate(10, 10).best, 11 / 12, 1e-9);
  assert.equal(r.sampleSizeDiscovery({ p: 0.31, goal: 0.85 }), 6);
  assert.equal(r.sampleSizeMean({ sd: 17.5, margin: 5 }), 50);
  near(r.taskTime([10, 1000]).geometric, 100, 1e-9);
  // Two perfectly parallel items give alpha = 1.
  near(r.cronbachAlpha([[1, 1], [2, 2], [3, 3], [4, 4]]).alpha, 1, 1e-9);
  assert.equal(r.inTextCitation('Sauro, J., & Lewis, J. R. (2016). Quantifying the user experience. Morgan Kaufmann.'), 'Sauro & Lewis, 2016');
  assert.match(r.toBibtex('Finstad, K. (2010). The usability metric for user experience. Interacting with Computers, 22(5), 323–327.', 'https://doi.org/10.1016/j.intcom.2010.04.004'), /@article\{finstad2010,[\s\S]*pages = \{323--327\}[\s\S]*doi = \{10\.1016/);
});
