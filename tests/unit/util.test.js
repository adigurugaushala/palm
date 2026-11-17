const test = require('node:test');
const assert = require('node:assert');
const { slotToMs, hashPassword, verifyPassword } = require('../../server/util');

test('slotToMs parses IST slots correctly', () => {
  // 10:00 AM on 2026-11-18 IST → 2026-11-18T04:30:00Z
  assert.strictEqual(slotToMs('2026-11-18', '10:00 AM'), Date.parse('2026-11-18T04:30:00Z'));
  assert.strictEqual(slotToMs('2026-11-18', '04:00 PM'), Date.parse('2026-11-18T10:30:00Z'));
  assert.strictEqual(slotToMs('2026-11-18', '12:00 PM'), Date.parse('2026-11-18T06:30:00Z'));
});

test('bcrypt round-trips passwords', async () => {
  const h = await hashPassword('hunter2-long-enough');
  assert.ok(await verifyPassword('hunter2-long-enough', h));
  assert.ok(!(await verifyPassword('wrong', h)));
});
