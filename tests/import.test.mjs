import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCALE_MAP } from '../docs/assets/js/scales.js';
import { parseResult, combineResults, datasetCSV, isDatasetError, pdfSubject } from '../docs/assets/js/import-results.js';
import { parseCSV } from '../docs/assets/js/stats.js';

// Real downloads from the SUS page, one per format.
const fixture = (name, enc = 'utf8') => readFileSync(new URL(`fixtures/${name}`, import.meta.url), enc);

test('reads every single-result format back to the same answers', () => {
  const expected = {
    'sus_p1.json': ['P1', [2, 3, 4, 5, 1, 2, 3, 4, 5, 1]],
    'sus_p2.csv': ['P2', [3, 4, 5, 1, 2, 3, 4, 5, 1, 2]],
    'sus_p3.txt': ['P3', [4, 5, 1, 2, 3, 4, 5, 1, 2, 3]],
    'sus_p4.pdf': ['P4', [5, 1, 2, 3, 4, 5, 1, 2, 3, 4]],
  };
  for (const [file, [who, values]] of Object.entries(expected)) {
    const r = parseResult(file, fixture(file, file.endsWith('.pdf') ? 'latin1' : 'utf8'));
    assert.equal(r.scale.id, 'sus', file);
    assert.equal(r.participant, who, file);
    assert.equal(r.product, 'Checkout v2', file);
    assert.deepEqual(Object.values(r.answers), values, file);
  }
});

test('N/A answers, slider values and the PDF subject round-trip', () => {
  const csuq = SCALE_MAP.csuq;
  const answers = Object.fromEntries(csuq.items.map(it => [it.n, it.n === 3 ? null : 6]));
  const json = JSON.stringify({ questionnaire: { id: 'csuq' }, participant: 'A', answers });
  assert.equal(parseResult('a.json', json).answers[3], null);

  const tlx = SCALE_MAP['nasa-tlx'];
  const meta = { product: 'Ünïcode app', participant: 'B 7', date: new Date('2026-10-01T10:00:00Z') };
  const sliders = Object.fromEntries(tlx.items.map(it => [it.n, it.n * 10 + 5]));
  const pdf = `%PDF-1.3\n<< /Subject (${pdfSubject({ scale: tlx, answers: sliders, meta })}) >>`;
  const r = parseResult('b.pdf', pdf);
  assert.equal(r.scale.id, 'nasa-tlx');
  assert.equal(r.product, 'Ünïcode app');
  assert.deepEqual(r.answers, sliders);
});

test('clear errors for datasets, old PDFs and bad values', () => {
  assert.ok(isDatasetError(catchErr(() => parseResult('d.csv', 'id,Q1,Q2\nP1,3,4'))));
  assert.ok(isDatasetError(catchErr(() => parseResult('d.json', '[{"Q1": 3}]'))));
  assert.match(catchErr(() => parseResult('old.pdf', '%PDF-1.3 no metadata')).message, /no answers stored/);
  const bad = fixture('sus_p1.json').replace('"1": 2', '"1": 9');
  assert.match(catchErr(() => parseResult('x.json', bad)).message, /Q1 = "9" is outside 1–5/);
});

test('combining counts duplicate formats once and keeps ids unique', () => {
  const a = parseResult('p1.json', fixture('sus_p1.json'));
  const sameAgain = { ...a, file: 'p1.csv' };
  const otherP1 = { ...a, file: 'p1-retake.json', answers: { ...a.answers, 1: 5 } };
  const { groups, notes } = combineResults([a, sameAgain, otherP1]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].people.map(p => p.id), ['P1', 'P1 (2)']);
  assert.equal(notes.length, 2);
  const rows = parseCSV(datasetCSV(SCALE_MAP.sus, groups[0].people));
  assert.deepEqual(rows[0].slice(0, 4), ['id', 'product', 'date', 'Q1']);
  assert.equal(rows[2][3], '5');
});

function catchErr(fn) {
  try { fn(); } catch (err) { return err; }
  throw new Error('expected an error');
}
