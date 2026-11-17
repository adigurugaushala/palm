const express = require('express');
const { User, Session, Audit } = require('./db');
const { sha256, token, hashPassword, verifyPassword, HttpError, wrap, rateLimit } = require('./util');
const cfg = require('./config');

const SESSION_DAYS = 30;
const COOKIE = 'gj_session';

async function createSession(res, userId) {
  const t = token();
  await Session.create({ tokenHash: sha256(t), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) });
  res.cookie(COOKIE, t, { httpOnly: true, sameSite: 'lax', secure: cfg.secureCookies, maxAge: SESSION_DAYS * 864e5, path: '/' });
}

async function loadUser(req, res, next) {
  const t = req.cookies[COOKIE];
  if (!t) return next();
  const s = await Session.findOne({ tokenHash: sha256(t), expiresAt: { $gt: new Date() } }).lean();
  if (!s) return next();
  const u = await User.findById(s.userId);
  if (u && u.active) req.user = u;
  next();
}

const requireUser = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in'));
  if (roles.length && !roles.includes(req.user.role)) return next(new HttpError(403, 'Not allowed'));
  next();
};

const publicUser = u => u && ({ id: String(u._id || u.id), role: u.role, name: u.name, email: u.email, mobile: u.mobile, avatarUrl: u.avatar ? `/api/avatars/${u._id || u.id}?v=${u.avatarVersion || 0}` : null });
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const router = express.Router();
const authLimit = rateLimit({ windowMs: 15 * 60e3, max: 30 });

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/register', authLimit, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  const email = String(req.body.email || '').trim().toLowerCase();
  const mobile = String(req.body.mobile || '').replace(/\D/g, '').slice(-10);
  const password = String(req.body.password || '');
  if (name.length < 2) throw new HttpError(400, 'Enter your full name');
  if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new HttpError(400, 'Enter a valid 10-digit mobile number');
  const existing = await User.findOne({ email });
  if (existing) throw new HttpError(409, 'An account with this email already exists — sign in instead');
  const u = await User.create({ role: 'customer', name, email, mobile: mobile || null, passwordHash: await hashPassword(password) });
  await createSession(res, u._id);
  res.status(201).json({ user: publicUser(u) });
}));

router.post('/login', authLimit, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = await User.findOne({ email, role: 'customer' });
  if (!u || !(await verifyPassword(String(req.body.password || ''), u.passwordHash))) throw new HttpError(401, 'Wrong email or password');
  if (!u.active) throw new HttpError(403, 'This account is inactive');
  await createSession(res, u._id);
  res.json({ user: publicUser(u) });
}));

router.post('/staff', authLimit, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = await User.findOne({ email, role: { $in: ['admin', 'reviewer'] } });
  if (!u || !(await verifyPassword(String(req.body.password || ''), u.passwordHash))) throw new HttpError(401, 'Wrong email or password');
  if (!u.active) throw new HttpError(403, 'This account is inactive');
  await createSession(res, u._id);
  await Audit.create({ actorId: u._id, actorEmail: u.email, action: 'staff.login' });
  res.json({ user: publicUser(u) });
}));

router.post('/google', authLimit, wrap(async (req, res) => {
  if (!cfg.googleClientId) throw new HttpError(503, 'Google sign-in is not configured');
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(cfg.googleClientId);
  let p;
  try {
    p = (await client.verifyIdToken({ idToken: req.body.credential, audience: cfg.googleClientId })).getPayload();
  } catch { throw new HttpError(401, 'Google sign-in failed'); }
  if (!p || !p.email_verified) throw new HttpError(401, 'Google email not verified');
  const email = p.email.toLowerCase();
  let u = await User.findOne({ $or: [{ googleSub: p.sub }, { email }] });
  if (u && u.role !== 'customer') throw new HttpError(403, 'Staff accounts must use the staff portal sign-in');
  if (!u) {
    u = await User.create({ role: 'customer', name: p.name || '', email, googleSub: p.sub });
  } else if (!u.googleSub) {
    u.googleSub = p.sub; await u.save();
  }
  if (!u.active) throw new HttpError(403, 'This account is disabled');
  await createSession(res, u._id);
  res.json({ user: publicUser(u) });
}));

// Dev-only shortcut — for local development only. Disabled in production.
router.post('/dev', wrap(async (req, res) => {
  if (!cfg.devLogin) throw new HttpError(404, 'Not found');
  const name = String(req.body.name || '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Enter a name');
  const email = `dev+${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@guruji.local`;
  let u = await User.findOne({ email });
  if (!u) u = await User.create({ role: 'customer', name, email });
  await createSession(res, u._id);
  res.json({ user: publicUser(u) });
}));

router.post('/logout', wrap(async (req, res) => {
  const t = req.cookies[COOKIE];
  if (t) await Session.deleteOne({ tokenHash: sha256(t) });
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
}));

router.put('/profile', requireUser(), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  if (name.length < 2) throw new HttpError(400, 'Enter your full name');
  const update = { name };
  if (req.body.mobile != null) {
    const mob = String(req.body.mobile).replace(/\D/g, '').slice(-10);
    if (mob && !/^[6-9]\d{9}$/.test(mob)) throw new HttpError(400, 'Enter a valid 10-digit mobile number');
    update.mobile = mob || null;
  }
  await User.updateOne({ _id: req.user._id }, { $set: update });
  const u = await User.findById(req.user._id);
  res.json({ user: publicUser(u) });
}));

router.post('/password/change', requireUser(), authLimit, wrap(async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.next || '');
  if (next.length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
  // If the account has no password yet (Google-only), skip the current check.
  if (req.user.passwordHash && !(await verifyPassword(current, req.user.passwordHash))) throw new HttpError(401, 'Current password is wrong');
  await User.updateOne({ _id: req.user._id }, { $set: { passwordHash: await hashPassword(next) } });
  await Session.deleteMany({ userId: req.user._id });
  await createSession(res, req.user._id);
  res.json({ ok: true });
}));

module.exports = { router, loadUser, requireUser, publicUser };
