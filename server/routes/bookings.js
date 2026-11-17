const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { imageSize } = require('image-size');
const { Booking, Payment, Photo, Message, User, Audit, getSettings, DATA_DIR } = require('../db');
const { requireUser } = require('../auth');
const { STATUS, STATUSES, HttpError, wrap, localDate, slotToMs, token, json, rateLimit } = require('../util');
const cfg = require('../config');
const payu = require('../payu');
const { renderReport } = require('../report');

const router = express.Router();
const UPLOADS = path.join(DATA_DIR, cfg.uploadDir);
const PHOTO_SLOTS = 4, REQUIRED_PHOTOS = [0, 1, 2];
const TOPICS = ['Career', 'Business', 'Marriage & relationships', 'Family', 'General guidance', 'Other'];

const randDigits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

// ---------------- helpers ----------------
const findBooking = id => Booking.findOne({ bookingId: id });
async function canAccess(user, b) {
  if (!user || !b) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'reviewer') return String(b.assignedGurujiId || '') === String(user._id) || (!b.assignedGurujiId && b.status >= STATUS.WAITING);
  return String(b.userId) === String(user._id);
}
async function loadOwned(req) {
  const b = await findBooking(req.params.id);
  if (!b || !(await canAccess(req.user, b))) throw new HttpError(404, 'Booking not found');
  return b;
}
const flagOf = b => {
  const [type, ...rest] = (b.flag || '').split(':');
  return type ? { type, reason: rest.join(':') } : null;
};
const isEditable = b => !b.cancelled && b.status >= STATUS.PAID &&
  (b.status <= STATUS.WAITING || flagOf(b)?.type === 'returned') && flagOf(b)?.type !== 'rejected';

async function slotTaken(date, slot, exceptId = '') {
  const holdMs = (await getSettings()).holdMinutes * 60e3;
  const cutoff = new Date(Date.now() - holdMs);
  return !!await Booking.exists({
    appointmentDate: date, appointmentSlot: slot, cancelled: false, bookingId: { $ne: exceptId },
    $or: [{ status: { $gte: 0 } }, { createdAt: { $gt: cutoff } }],
  });
}

async function bookingView(b, user) {
  const photos = await Photo.find({ bookingId: b.bookingId }).sort({ idx: 1 }).lean();
  const payment = await Payment.findOne({ bookingId: b.bookingId }).sort({ createdAt: -1 }).lean();
  const reviewer = b.assignedGurujiId ? await User.findById(b.assignedGurujiId).lean() : null;
  const v = {
    id: b.bookingId, date: b.appointmentDate, slot: b.appointmentSlot, amount: b.amount,
    status: b.status, statusLabel: STATUSES[b.status] || 'Awaiting payment',
    cancelled: !!b.cancelled, flag: flagOf(b), editable: isEditable(b),
    form: b.form || {}, questions: b.questions || [], note: b.note, hand: b.hand,
    photos: photos.map(p => ({ id: String(p._id), idx: p.idx, width: p.width, height: p.height })),
    payment: payment ? { id: payment.paymentId, amount: payment.amount, status: payment.status, provider: payment.provider } : null,
    reviewer: reviewer?.name || null,
    meetUrl: b.status >= STATUS.ASSIGNED && !b.cancelled ? `${cfg.meetBase}/${b.meetRoom}` : null,
    reportReady: b.status >= STATUS.REPORT,
    reportPublishedAt: b.reportPublishedAt,
  };
  if (user.role !== 'customer') Object.assign(v, { checklist: b.checklist || {}, reportNotes: b.reportNotes, assignedTo: b.assignedGurujiId ? String(b.assignedGurujiId) : null });
  return v;
}

async function markPaid(bookingId, { mihpayid, mode, raw } = {}) {
  const b = await findBooking(bookingId);
  if (!b) return null;
  await Payment.updateMany({ bookingId, status: { $in: ['created', 'failed'] } },
    { $set: { status: 'paid', mihpayid: mihpayid || '', mode: mode || '', verifiedAt: new Date(), raw: raw || {} } });
  if (b.status === STATUS.PENDING_PAYMENT) {
    const conflict = await slotTaken(b.appointmentDate, b.appointmentSlot, b.bookingId);
    b.status = STATUS.PAID;
    b.cancelled = false;
    if (conflict) b.flag = 'conflict:Slot was taken while paying — we will contact you to reschedule';
    await b.save();
  }
  return findBooking(bookingId);
}

async function markFailed(bookingId, { raw } = {}) {
  await Payment.updateMany({ bookingId, status: 'created' }, { $set: { status: 'failed', raw: raw || {} } });
}

// ---------------- config & slots ----------------
router.get('/config', wrap(async (req, res) => {
  const s = await getSettings();
  const base = Math.round(s.price / (1 + s.gstPercent / 100));
  res.json({
    price: s.price, base, gst: s.price - base, gstPercent: s.gstPercent, durationMin: s.durationMin,
    statuses: STATUSES, topics: TOPICS,
    googleClientId: cfg.googleClientId || null, devLogin: cfg.devLogin,
    payments: cfg.payu ? { mode: 'payu', env: cfg.payu.mode } : cfg.demoPayments ? { mode: 'demo' } : { mode: 'off' },
    meet: { provider: cfg.meetProvider, base: cfg.meetBase },
    supportEmail: cfg.supportEmail,
  });
}));

router.get('/slots', wrap(async (req, res) => {
  const s = await getSettings();
  const days = [];
  const dates = Array.from({ length: s.daysAhead }, (_, i) => localDate(i + 1));
  const taken = await Booking.aggregate([
    { $match: { appointmentDate: { $in: dates }, cancelled: false, $or: [{ status: { $gte: 0 } }, { createdAt: { $gt: new Date(Date.now() - s.holdMinutes * 60e3) } }] } },
    { $group: { _id: { d: '$appointmentDate', s: '$appointmentSlot' } } },
  ]);
  const takenSet = new Set(taken.map(t => `${t._id.d}|${t._id.s}`));
  for (const date of dates) {
    days.push({
      date,
      slots: s.slots.map(time => ({
        time,
        available: slotToMs(date, time) > Date.now() + 60 * 60e3 && !takenSet.has(`${date}|${time}`),
      })),
    });
  }
  res.json({ days });
}));

// ---------------- customer bookings ----------------
router.post('/bookings', requireUser('customer'), wrap(async (req, res) => {
  const s = await getSettings();
  const { date, slot } = req.body;
  const allowed = Array.from({ length: s.daysAhead }, (_, i) => localDate(i + 1));
  if (!allowed.includes(date) || !s.slots.includes(slot)) throw new HttpError(400, 'Choose a valid date and time');
  if (!cfg.payu && !cfg.demoPayments) throw new HttpError(503, 'Payments are not configured yet');

  // Cancel the customer's own unpaid hold first, then take the new slot.
  await Booking.updateMany({ userId: req.user._id, status: -1, cancelled: false }, { $set: { cancelled: true } });
  if (await slotTaken(date, slot)) throw new HttpError(409, 'Sorry, that slot was just taken — please pick another');

  let bookingId;
  for (let i = 0; i < 5; i++) {
    bookingId = 'GJ-' + randDigits(5);
    if (!await Booking.exists({ bookingId })) break;
  }
  const booking = await Booking.create({
    bookingId, userId: req.user._id, appointmentDate: date, appointmentSlot: slot, amount: s.price,
    meetRoom: `Guruji-${bookingId}-${token(9).replace(/[^A-Za-z0-9]/g, '')}`,
  });

  const payment = cfg.payu
    ? await preparePayuPayment(booking, req.user)
    : await prepareDemoPayment(booking);

  res.status(201).json({ booking: await bookingView(booking, req.user), payment });
}));

async function prepareDemoPayment(booking) {
  const paymentId = 'TX-' + randDigits(8);
  await Payment.create({ paymentId, bookingId: booking.bookingId, userId: booking.userId, provider: 'demo', amount: booking.amount, status: 'created' });
  return { mode: 'demo' };
}

async function preparePayuPayment(booking, user) {
  const paymentId = 'TX-' + randDigits(8);
  const txnid = `GJT${Date.now()}${randDigits(4)}`;
  await Payment.create({ paymentId, bookingId: booking.bookingId, userId: booking.userId, provider: 'payu', amount: booking.amount, status: 'created', txnid });
  const { action, fields } = payu.buildCheckoutFields(cfg.payu, {
    txnid, amount: booking.amount, productinfo: `Guruji consultation ${booking.bookingId}`,
    firstname: (user.name || 'Customer').slice(0, 60), email: user.email || `guest+${booking.bookingId}@guruji.local`,
    phone: user.mobile || '',
    surl: `${cfg.appBaseUrl}/api/payu/success`,
    furl: `${cfg.appBaseUrl}/api/payu/failure`,
    udf1: booking.bookingId, udf2: String(user._id),
  });
  return { mode: 'payu', action, fields, env: cfg.payu.mode };
}

// Start (or restart) payment for an unpaid booking. Each attempt gets a fresh PayU txnid,
// which is what PayU requires for retries and for recovering a refreshed checkout page.
router.post('/bookings/:id/pay', requireUser('customer'), wrap(async (req, res) => {
  const b = await findBooking(req.params.id);
  if (!b || String(b.userId) !== String(req.user._id)) throw new HttpError(404, 'Booking not found');
  if (b.status >= STATUS.PAID) throw new HttpError(409, 'This booking is already paid');
  if (!cfg.payu && !cfg.demoPayments) throw new HttpError(503, 'Payments are not configured yet');
  const holdMs = (await getSettings()).holdMinutes * 60e3;
  if (b.cancelled || b.createdAt.getTime() < Date.now() - holdMs) {
    // The hold lapsed — re-take the slot only if nobody else has it.
    if (await slotTaken(b.appointmentDate, b.appointmentSlot, b.bookingId)) throw new HttpError(409, 'That time was taken while you were away — please choose another slot');
    await Booking.updateMany({ userId: req.user._id, status: -1, cancelled: false, bookingId: { $ne: b.bookingId } }, { $set: { cancelled: true } });
    // createdAt doubles as the hold timestamp; Mongoose marks it immutable, so use the driver directly.
    await Booking.collection.updateOne({ _id: b._id }, { $set: { cancelled: false, createdAt: new Date() } });
    b.cancelled = false;
  }
  await Payment.updateMany({ bookingId: b.bookingId, status: 'created' }, { $set: { status: 'failed' } });
  const payment = cfg.payu ? await preparePayuPayment(b, req.user) : await prepareDemoPayment(b);
  res.json({ booking: await bookingView(b, req.user), payment });
}));

router.post('/payments/demo', requireUser('customer'), wrap(async (req, res) => {
  if (!cfg.demoPayments) throw new HttpError(404, 'Not found');
  const b = await findBooking(req.body.bookingId);
  if (!b || String(b.userId) !== String(req.user._id)) throw new HttpError(404, 'Booking not found');
  const p = await Payment.findOne({ bookingId: b.bookingId }).sort({ createdAt: -1 });
  if (req.body.fail) { await Payment.updateOne({ _id: p._id }, { $set: { status: 'failed' } }); return res.json({ ok: false }); }
  await markPaid(b.bookingId, { mihpayid: 'demo_' + token(6) });
  res.json({ ok: true, booking: await bookingView(await findBooking(b.bookingId), req.user), paymentId: p.paymentId });
}));

router.get('/bookings', requireUser('customer'), wrap(async (req, res) => {
  const rows = await Booking.find({ userId: req.user._id, status: { $gte: 0 } }).sort({ createdAt: -1 });
  res.json({ bookings: await Promise.all(rows.map(b => bookingView(b, req.user))) });
}));

router.get('/bookings/:id', requireUser(), wrap(async (req, res) => {
  res.json({ booking: await bookingView(await loadOwned(req), req.user) });
}));

router.put('/bookings/:id/details', requireUser('customer'), wrap(async (req, res) => {
  const b = await loadOwned(req);
  if (!isEditable(b)) throw new HttpError(409, 'These details can no longer be changed');
  const f = req.body.form || {};
  const clean = {};
  for (const k of ['name', 'dob', 'mob', 'lang', 'ct', 'bp', 'bt', 'ba', 'city', 'cty', 'gn'])
    if (f[k] != null) clean[k] = String(f[k]).slice(0, 200);
  b.form = { ...(b.form || {}), ...clean };
  if (Array.isArray(req.body.questions)) b.questions = req.body.questions.filter(q => TOPICS.includes(q));
  if (req.body.note != null) b.note = String(req.body.note).slice(0, 4000);
  if (['Right-handed', 'Left-handed'].includes(req.body.hand)) b.hand = req.body.hand;
  if (b.status < STATUS.DETAILS) b.status = STATUS.DETAILS;
  b.markModified('form');
  await b.save();
  if (clean.name && !req.user.name) await User.updateOne({ _id: req.user._id }, { $set: { name: clean.name } });
  res.json({ booking: await bookingView(b, req.user) });
}));

function validateDetails(b) {
  const f = b.form || {};
  const errs = [];
  if (!f.name || f.name.trim().length < 2) errs.push('full name');
  if (!f.dob || isNaN(Date.parse(f.dob)) || Date.parse(f.dob) > Date.now()) errs.push('date of birth');
  if (!/^[6-9]\d{9}$/.test(f.mob || '')) errs.push('mobile number');
  if (f.ct && f.ct !== 'Palmistry' && !f.bp) errs.push('birthplace');
  if (!(b.questions || []).length) errs.push('at least one topic');
  if (!b.hand) errs.push('right- or left-handed');
  return errs;
}

router.post('/bookings/:id/submit', requireUser('customer'), wrap(async (req, res) => {
  const b = await loadOwned(req);
  if (!isEditable(b)) throw new HttpError(409, 'This booking has already been submitted');
  const errs = validateDetails(b);
  const photos = await Photo.find({ bookingId: b.bookingId }).lean();
  const have = new Set(photos.map(p => p.idx));
  if (!REQUIRED_PHOTOS.every(i => have.has(i))) errs.push('the 3 required palm photos');
  if (errs.length) throw new HttpError(400, 'Missing: ' + errs.join(', '));
  b.status = b.assignedGurujiId ? STATUS.ASSIGNED : STATUS.WAITING;
  b.flag = '';
  await b.save();
  res.json({ booking: await bookingView(b, req.user) });
}));

// ---------------- palm photos ----------------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.uploadMaxBytes, files: 1 } });
const EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

router.post('/bookings/:id/photos/:idx', requireUser('customer'), upload.single('photo'), wrap(async (req, res) => {
  const b = await loadOwned(req);
  const idx = +req.params.idx;
  if (!(idx >= 0 && idx < PHOTO_SLOTS)) throw new HttpError(400, 'Bad photo slot');
  if (!isEditable(b)) throw new HttpError(409, 'Photos can no longer be changed');
  if (!req.file) throw new HttpError(400, 'No file received');
  let dim;
  try { dim = imageSize(req.file.buffer); } catch { throw new HttpError(400, 'Only image files allowed'); }
  if (!EXT[dim.type]) throw new HttpError(400, 'Use a JPG, PNG or WebP photo');
  if (Math.min(dim.width, dim.height) < 300) throw new HttpError(400, 'Resolution too low — retake in better light');

  const dir = path.join(UPLOADS, b.bookingId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${b.bookingId}/${idx}-${token(8)}.${dim.type}`;
  fs.writeFileSync(path.join(UPLOADS, filename), req.file.buffer);
  const prev = await Photo.findOne({ bookingId: b.bookingId, idx });
  if (prev) fs.rm(path.join(UPLOADS, prev.filename), { force: true }, () => {});
  await Photo.updateOne({ bookingId: b.bookingId, idx }, { $set: { filename, mime: EXT[dim.type], width: dim.width, height: dim.height } }, { upsert: true });
  res.status(201).json({ booking: await bookingView(b, req.user) });
}));

router.delete('/bookings/:id/photos/:idx', requireUser('customer'), wrap(async (req, res) => {
  const b = await loadOwned(req);
  if (!isEditable(b)) throw new HttpError(409, 'Photos can no longer be changed');
  const p = await Photo.findOne({ bookingId: b.bookingId, idx: +req.params.idx });
  if (p) {
    await Photo.deleteOne({ _id: p._id });
    fs.rm(path.join(UPLOADS, p.filename), { force: true }, () => {});
  }
  res.json({ booking: await bookingView(b, req.user) });
}));

router.get('/photos/:pid', requireUser(), wrap(async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.pid)) throw new HttpError(404, 'Not found');
  const p = await Photo.findById(req.params.pid);
  if (!p) throw new HttpError(404, 'Not found');
  const b = await findBooking(p.bookingId);
  if (!(await canAccess(req.user, b))) throw new HttpError(404, 'Not found');
  res.set('Cache-Control', 'private, max-age=86400').type(p.mime).sendFile(path.join(UPLOADS, p.filename));
}));

// ---------------- messages ----------------
router.get('/bookings/:id/messages', requireUser(), wrap(async (req, res) => {
  const b = await loadOwned(req);
  const after = req.query.after ? new Date(+req.query.after || 0) : new Date(0);
  const rows = await Message.find({ bookingId: b.bookingId, createdAt: { $gt: after } }).sort({ createdAt: 1 }).limit(200).lean();
  const users = Object.fromEntries((await User.find({ _id: { $in: rows.map(r => r.senderId) } }).lean()).map(u => [String(u._id), u]));
  res.json({
    messages: rows.map(m => {
      const u = users[String(m.senderId)] || {};
      return { id: m.createdAt.getTime(), body: m.body, at: m.createdAt.toISOString(),
        mine: String(m.senderId) === String(req.user._id), from: u.role === 'customer' ? u.name || 'Customer' : u.name || 'Guruji' };
    }),
  });
}));

router.post('/bookings/:id/messages', requireUser(), rateLimit({ windowMs: 60e3, max: 30, key: r => 'msg:' + (r.user?._id || r.ip) }), wrap(async (req, res) => {
  const b = await loadOwned(req);
  if (b.status < STATUS.PAID || b.cancelled) throw new HttpError(409, 'Chat is not open for this booking');
  const body = String(req.body.body || '').trim().slice(0, 2000);
  if (!body) throw new HttpError(400, 'Message is empty');
  const m = await Message.create({ bookingId: b.bookingId, senderId: req.user._id, body });
  res.status(201).json({ id: m.createdAt.getTime() });
}));

// ---------------- report ----------------
router.get('/bookings/:id/report', requireUser(), wrap(async (req, res) => {
  const b = await loadOwned(req);
  if (b.status < STATUS.REPORT) throw new HttpError(404, 'Report not ready yet');
  const reviewer = b.assignedGurujiId ? (await User.findById(b.assignedGurujiId).lean())?.name : 'Guruji';
  res.json({ id: b.bookingId, reviewer, publishedAt: b.reportPublishedAt, notes: b.reportNotes, checklist: b.checklist || {} });
}));

router.get('/bookings/:id/report.pdf', requireUser(), wrap(async (req, res) => {
  const b = await loadOwned(req);
  // Customers get the PDF only after Guruji has sent the report. Guruji and admins can preview it
  // from the moment the consultation is complete, so they can check the wording before sending.
  const staffPreview = req.user.role !== 'customer' && b.status >= STATUS.COMPLETED;
  if (b.status < STATUS.REPORT && !staffPreview) throw new HttpError(404, 'Report not ready yet');
  const reviewer = b.assignedGurujiId ? (await User.findById(b.assignedGurujiId).lean())?.name : 'Guruji';
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="guruji-report-${b.bookingId}.pdf"`);
  renderReport({
    id: b.bookingId, date: b.appointmentDate, slot: b.appointmentSlot, form: b.form || {},
    hand: b.hand, questions: b.questions || [], checklist: b.checklist || {},
    report_notes: b.reportNotes, report_published_at: b.reportPublishedAt?.toISOString() || '',
  }, reviewer, res);
}));

module.exports = { router, markPaid, markFailed, findBooking, bookingView };
