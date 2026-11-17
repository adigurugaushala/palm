// Report date ranges (IST) and CSV escaping for exports.
const test = require('node:test');
const assert = require('node:assert');
const { parseRange, csvCell, toCsv } = require('../../server/routes/reports');

test('a range covers whole IST days', () => {
  const r = parseRange({ from: '2026-11-01', to: '2026-11-30' });
  assert.strictEqual(r.start.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.strictEqual(r.end.toISOString(), '2026-11-30T18:29:59.999Z');
});

test('defaults to the last 30 days ending on the given end date', () => {
  const r = parseRange({ to: '2026-11-30' });
  assert.strictEqual(r.from, '2026-11-01');
  assert.strictEqual(r.to, '2026-11-30');
});

test('start after end is rejected', () => {
  assert.throws(() => parseRange({ from: '2026-12-01', to: '2026-11-01' }), err => err.status === 400);
});

test('a period longer than a year is rejected', () => {
  assert.throws(() => parseRange({ from: '2025-01-01', to: '2026-06-01' }), err => err.status === 400 && err.message.includes('one year'));
});

test('malformed dates fall back to the default period', () => {
  const r = parseRange({ from: '01/11/2026', to: 'tomorrow' });
  assert.match(r.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(r.to, /^\d{4}-\d{2}-\d{2}$/);
});

test('csv cells with commas, quotes and newlines are quoted', () => {
  assert.strictEqual(csvCell('Annadanam, community'), '"Annadanam, community"');
  assert.strictEqual(csvCell('He said "hi"'), '"He said ""hi"""');
  assert.strictEqual(csvCell('line\nbreak'), '"line\nbreak"');
});

test('values that look like spreadsheet formulas are neutralised', () => {
  assert.strictEqual(csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
  assert.strictEqual(csvCell('+1'), "'+1");
  assert.strictEqual(csvCell('-2'), "'-2");
  assert.strictEqual(csvCell('@SUM(A1)'), "'@SUM(A1)");
});

test('numbers and empty values pass through', () => {
  assert.strictEqual(csvCell(4999), '4999');
  assert.strictEqual(csvCell(null), '');
});

test('toCsv writes a header row and CRLF line endings', () => {
  assert.strictEqual(toCsv(['A', 'B'], [[1, 'x']]), 'A,B\r\n1,x\r\n');
});
