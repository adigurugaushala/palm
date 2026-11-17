// Course content validation: lessons and live classes must be well-formed and use https links.
const test = require('node:test');
const assert = require('node:assert');
const { parseLessons, parseSessions, isHttps, MAX_LESSONS, MAX_SESSIONS } = require('../../server/courses');

const throws = (fn, msg) => assert.throws(fn, err => err.status === 400 && err.message.includes(msg));

test('only https links are accepted', () => {
  assert.ok(isHttps('https://example.com/watch?v=1'));
  assert.ok(!isHttps('http://example.com'));
  assert.ok(!isHttps('javascript:alert(1)'));
  assert.ok(!isHttps('https://'));
});

test('lessons keep title, link and notes and trim whitespace', () => {
  const out = parseLessons([{ title: '  Lines of the palm  ', url: ' https://video.example/1 ', notes: ' Practise on both hands ' }]);
  assert.deepStrictEqual(out, [{ title: 'Lines of the palm', url: 'https://video.example/1', notes: 'Practise on both hands' }]);
});

test('a lesson may be text-only with no link', () => {
  assert.deepStrictEqual(parseLessons([{ title: 'Reading' }]), [{ title: 'Reading', url: '', notes: '' }]);
});

test('lesson without a title is rejected', () => {
  throws(() => parseLessons([{ title: '  ', url: 'https://x.example' }]), 'Lesson 1 needs a title');
});

test('lesson with a non-https link is rejected', () => {
  throws(() => parseLessons([{ title: 'Intro', url: 'http://insecure.example' }]), 'must start with https://');
});

test('lesson count is capped', () => {
  const many = Array.from({ length: MAX_LESSONS + 1 }, (_, i) => ({ title: `L${i}` }));
  throws(() => parseLessons(many), 'up to');
});

test('non-array lessons become an empty list', () => {
  assert.deepStrictEqual(parseLessons(undefined), []);
  assert.deepStrictEqual(parseSessions('nope'), []);
});

test('live class needs a valid start date and a title', () => {
  throws(() => parseSessions([{ title: 'Week 1' }]), 'needs a date and time');
  throws(() => parseSessions([{ title: 'Week 1', startsAt: 'not a date' }]), 'needs a date and time');
  throws(() => parseSessions([{ startsAt: '2026-12-01T10:00:00Z' }]), 'needs a title');
});

test('live class duration must be between 5 and 480 minutes', () => {
  const base = { title: 'Week 1', startsAt: '2026-12-01T10:00:00Z' };
  throws(() => parseSessions([{ ...base, durationMin: 4 }]), 'duration must be 5 to 480');
  throws(() => parseSessions([{ ...base, durationMin: 481 }]), 'duration must be 5 to 480');
  assert.strictEqual(parseSessions([{ ...base, durationMin: 90 }])[0].durationMin, 90);
});

test('live class defaults to 60 minutes and an optional join link', () => {
  const [s] = parseSessions([{ title: 'Week 1', startsAt: '2026-12-01T10:00:00Z' }]);
  assert.strictEqual(s.durationMin, 60);
  assert.strictEqual(s.joinUrl, '');
  assert.ok(s.startsAt instanceof Date);
});

test('live class join link must be https when given', () => {
  throws(() => parseSessions([{ title: 'W', startsAt: '2026-12-01T10:00:00Z', joinUrl: 'http://meet.example' }]), 'join link must start with https://');
});

test('session count is capped', () => {
  const many = Array.from({ length: MAX_SESSIONS + 1 }, (_, i) => ({ title: `S${i}`, startsAt: '2026-12-01T10:00:00Z' }));
  throws(() => parseSessions(many), 'up to');
});
