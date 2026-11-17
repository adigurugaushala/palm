const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const STATUSES = ['Payment Successful', 'Details Submitted', 'Waiting for Guruji', 'Assigned to Expert',
  'Under Review', 'Appointment Scheduled', 'Consultation Completed', 'Report Ready'];
const STATUS = { PENDING_PAYMENT: -1, PAID: 0, DETAILS: 1, WAITING: 2, ASSIGNED: 3, REVIEW: 4, SCHEDULED: 5, COMPLETED: 6, REPORT: 7 };

const hashPassword = pw => bcrypt.hash(pw, 11);
const verifyPassword = (pw, stored) => stored ? bcrypt.compare(pw, stored) : Promise.resolve(false);
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const sha512 = s => crypto.createHash('sha512').update(s).digest('hex');
const token = (n = 32) => crypto.randomBytes(n).toString('base64url');

const TZ = process.env.TZ_NAME || 'Asia/Kolkata';
function localDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function slotToMs(date, slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot);
  if (!m) return NaN;
  let h = +m[1] % 12; if (m[3].toUpperCase() === 'PM') h += 12;
  return Date.parse(`${date}T${String(h).padStart(2, '0')}:${m[2]}:00+05:30`);
}

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function rateLimit({ windowMs, max, key = req => req.ip }) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req), now = Date.now();
    let e = hits.get(k);
    if (!e || e.reset < now) { e = { n: 0, reset: now + windowMs }; hits.set(k, e); }
    if (++e.n > max) return res.status(429).json({ error: 'Too many attempts — please wait a few minutes and try again.' });
    next();
  };
}

const json = (s, fallback) => { try { return typeof s === 'string' ? JSON.parse(s) : (s ?? fallback); } catch { return fallback; } };

module.exports = { STATUSES, STATUS, hashPassword, verifyPassword, sha256, sha512, token, localDate, slotToMs, HttpError, wrap, rateLimit, json };
