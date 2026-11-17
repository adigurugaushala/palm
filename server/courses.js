// Course content: lessons (video or reading links) and live classes. Validated on the server so a
// bad link or date can never reach a learner. Only https links are accepted.
const { HttpError } = require('./util');

const MAX_LESSONS = 60, MAX_SESSIONS = 40;
const isHttps = s => /^https:\/\/\S+$/i.test(s);

function parseLessons(v) {
  const rows = Array.isArray(v) ? v : [];
  if (rows.length > MAX_LESSONS) throw new HttpError(400, `A course can have up to ${MAX_LESSONS} lessons`);
  return rows.map((r, i) => {
    const title = String(r?.title || '').trim().slice(0, 120);
    const url = String(r?.url || '').trim().slice(0, 500);
    if (!title) throw new HttpError(400, `Lesson ${i + 1} needs a title`);
    if (url && !isHttps(url)) throw new HttpError(400, `Lesson ${i + 1}: the link must start with https://`);
    return { title, url, notes: String(r?.notes || '').trim().slice(0, 1000) };
  });
}

function parseSessions(v) {
  const rows = Array.isArray(v) ? v : [];
  if (rows.length > MAX_SESSIONS) throw new HttpError(400, `A course can have up to ${MAX_SESSIONS} live classes`);
  return rows.map((r, i) => {
    const title = String(r?.title || '').trim().slice(0, 120);
    const startsAt = r?.startsAt ? new Date(r.startsAt) : null;
    const durationMin = Math.round(Number(r?.durationMin) || 60);
    const joinUrl = String(r?.joinUrl || '').trim().slice(0, 500);
    if (!title) throw new HttpError(400, `Live class ${i + 1} needs a title`);
    if (!startsAt || Number.isNaN(startsAt.getTime())) throw new HttpError(400, `Live class ${i + 1} needs a date and time`);
    if (!(durationMin >= 5 && durationMin <= 480)) throw new HttpError(400, `Live class ${i + 1}: duration must be 5 to 480 minutes`);
    if (joinUrl && !isHttps(joinUrl)) throw new HttpError(400, `Live class ${i + 1}: the join link must start with https://`);
    return { title, startsAt, durationMin, joinUrl };
  });
}

module.exports = { parseLessons, parseSessions, isHttps, MAX_LESSONS, MAX_SESSIONS };
