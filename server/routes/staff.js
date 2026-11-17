const express = require('express');
const { Booking, Payment, User, Audit, getSettings, updateSettings } = require('../db');
const { requireUser } = require('../auth');
const { STATUS, STATUSES, HttpError, wrap, hashPassword } = require('../util');
const { bookingView, findBooking } = require('./bookings');
const cfg = require('../config');

const CHECK_ITEMS = ['Hand type', 'Life line', 'Fate line', 'Heart line', 'Sun line', 'Business line', 'Palm colour'];
const CHECK_VALUES = ['—', 'Clear', 'Not clear', 'Partially visible', 'Not visible'];

function ageOf(dob) {
  if (!dob) return null;
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}
const caseRow = (b, reviewerName, customerName) => ({
  id: b.bookingId, name: (b.form?.name) || customerName || 'Customer', age: ageOf(b.form?.dob),
  date: b.appointmentDate, slot: b.appointmentSlot, status: b.status, statusLabel: STATUSES[b.status],
  assignedTo: b.assignedGurujiId ? String(b.assignedGurujiId) : null, reviewer: reviewerName || null,
  flag: b.flag, cancelled: !!b.cancelled,
});
async function withNames(rows) {
  const uIds = [...new Set(rows.flatMap(b => [b.userId, b.assignedGurujiId].filter(Boolean).map(String)))];
  const users = Object.fromEntries((await User.find({ _id: { $in: uIds } }).lean()).map(u => [String(u._id), u]));
  return rows.map(b => caseRow(b, users[String(b.assignedGurujiId || '')]?.name, users[String(b.userId)]?.name));
}
async function canAccessCase(user, b) {
  if (!b) return false;
  if (user.role === 'admin') return true;
  return String(b.assignedGurujiId || '') === String(user._id) || (!b.assignedGurujiId && b.status >= STATUS.WAITING);
}

// ================= Guruji / reviewer portal =================
const staff = express.Router();
staff.use(requireUser('reviewer', 'admin'));

staff.get('/cases', wrap(async (req, res) => {
  // Rejected cases are kept out of the working queues and listed separately as closed.
  const base = { cancelled: false, status: { $gte: STATUS.WAITING }, flag: { $not: /^rejected:/ } };
  const closedQ = { status: { $gte: STATUS.WAITING }, flag: /^rejected:/ };
  if (req.user.role !== 'admin') closedQ.assignedGurujiId = req.user._id;
  const [mineDocs, unassignedDocs, closedDocs] = await Promise.all([
    Booking.find({ ...base, assignedGurujiId: req.user._id }).sort({ appointmentDate: 1, appointmentSlot: 1 }).lean(),
    Booking.find({ ...base, assignedGurujiId: null }).sort({ createdAt: 1 }).lean(),
    Booking.find(closedQ).sort({ updatedAt: -1 }).limit(50).lean(),
  ]);
  res.json({ mine: await withNames(mineDocs), unassigned: await withNames(unassignedDocs), closed: await withNames(closedDocs), checkItems: CHECK_ITEMS, checkValues: CHECK_VALUES });
}));

async function loadCase(req) {
  const b = await findBooking(req.params.id);
  if (!b || b.status < STATUS.PAID || !(await canAccessCase(req.user, b))) throw new HttpError(404, 'Case not found');
  return b;
}

staff.get('/cases/:id', wrap(async (req, res) => {
  let b = await loadCase(req);
  // Opening an assigned case moves it into review.
  if (b.status === STATUS.ASSIGNED && String(b.assignedGurujiId) === String(req.user._id)) {
    b.status = STATUS.REVIEW; await b.save();
  }
  const customer = await User.findById(b.userId).lean();
  const view = await bookingView(b, req.user);
  view.customer = { name: customer?.name, email: customer?.email, mobile: customer?.mobile, avatarUrl: customer?.avatar ? `/api/avatars/${customer._id}?v=${customer.avatarVersion || 0}` : null };
  view.age = ageOf(b.form?.dob);
  res.json({ case: view, checkItems: CHECK_ITEMS, checkValues: CHECK_VALUES });
}));

staff.post('/cases/:id/claim', wrap(async (req, res) => {
  const r = await Booking.updateOne({ bookingId: req.params.id, assignedGurujiId: null, status: { $gte: STATUS.WAITING } },
    { $set: { assignedGurujiId: req.user._id, status: STATUS.ASSIGNED } });
  if (!r.modifiedCount) throw new HttpError(409, 'Already assigned');
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'case.claim', target: req.params.id });
  res.json({ ok: true });
}));

staff.put('/cases/:id', wrap(async (req, res) => {
  const b = await loadCase(req);
  const cl = { ...(b.checklist || {}) };
  for (const [k, v] of Object.entries(req.body.checklist || {}))
    if (CHECK_ITEMS.includes(k) && CHECK_VALUES.includes(v)) cl[k] = v;
  b.checklist = cl; b.markModified('checklist');
  if (req.body.reportNotes != null) b.reportNotes = String(req.body.reportNotes).slice(0, 20000);
  await b.save();
  res.json({ ok: true });
}));

staff.post('/cases/:id/action', wrap(async (req, res) => {
  const b = await loadCase(req);
  const reason = String(req.body.reason || '').trim().slice(0, 300);
  switch (req.body.action) {
    case 'schedule': b.status = Math.max(b.status, STATUS.SCHEDULED); b.flag = ''; break;
    case 'complete': b.status = Math.max(b.status, STATUS.COMPLETED); b.flag = ''; break;
    case 'return': b.status = STATUS.WAITING; b.flag = 'returned:' + (reason || 'Please upload clearer palm photos'); break;
    case 'reject': b.status = STATUS.WAITING; b.flag = 'rejected:' + (reason || 'This request could not be accepted'); break;
    case 'approve':
      if (!b.reportNotes.trim()) throw new HttpError(400, 'Write the report notes before publishing');
      b.status = STATUS.REPORT; b.flag = ''; b.reportPublishedAt = new Date(); break;
    default: throw new HttpError(400, 'Unknown action');
  }
  await b.save();
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'case.' + req.body.action, target: b.bookingId, meta: { reason } });
  res.json({ case: await bookingView(b, req.user) });
}));

// ================= Admin portal =================
const admin = express.Router();
admin.use(requireUser('admin'));

admin.get('/overview', wrap(async (req, res) => {
  const [revenue, orders, unassigned, awaitingDetails, reports, paidCount, pendingPayments, activeGurujis, completed] = await Promise.all([
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, v: { $sum: '$amount' } } }]).then(r => r[0]?.v || 0),
    Booking.countDocuments({ status: { $gte: 0 } }),
    Booking.countDocuments({ status: { $gte: STATUS.WAITING }, assignedGurujiId: null, cancelled: false }),
    Booking.countDocuments({ status: { $in: [0, 1] }, cancelled: false }),
    Booking.countDocuments({ status: STATUS.REPORT }),
    Payment.countDocuments({ status: 'paid' }),
    Payment.countDocuments({ status: 'created', createdAt: { $gt: new Date(Date.now() - 864e5) } }),
    User.countDocuments({ role: 'reviewer', active: true }),
    Booking.countDocuments({ status: { $gte: STATUS.COMPLETED }, cancelled: false }),
  ]);
  res.json({ revenue, orders, unassigned, awaitingDetails, reports, paidCount, pendingPayments, activeGurujis, completed });
}));

// Revenue per day (last 30 days), bookings per status, and workload per team member.
admin.get('/analytics', wrap(async (req, res) => {
  const since = new Date(Date.now() - 30 * 864e5);
  const [daily, byStatus, workload] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid', updatedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt', timezone: 'Asia/Kolkata' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([{ $match: { status: { $gte: 0 }, cancelled: false } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { assignedGurujiId: { $ne: null }, cancelled: false, status: { $gte: STATUS.ASSIGNED, $lt: STATUS.REPORT } } },
      { $group: { _id: '$assignedGurujiId', open: { $sum: 1 } } },
    ]),
  ]);
  const team = await User.find({ role: { $in: ['reviewer', 'admin'] } }, { name: 1, active: 1, role: 1 }).lean();
  const load = Object.fromEntries(workload.map(w => [String(w._id), w.open]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() - i * 864e5));
    const hit = daily.find(x => x._id === d);
    days.push({ date: d, revenue: hit?.revenue || 0, count: hit?.count || 0 });
  }
  res.json({
    days,
    byStatus: STATUSES.map((label, i) => ({ status: i, label, n: byStatus.find(s => s._id === i)?.n || 0 })),
    workload: team.map(t => ({ id: String(t._id), name: t.name, role: t.role, active: !!t.active, open: load[String(t._id)] || 0 })),
  });
}));

admin.get('/customers', wrap(async (req, res) => {
  const limit = Math.min(+req.query.limit || 50, 200);
  const skip = Math.max(+req.query.skip || 0, 0);
  const q = { role: 'customer' };
  if (req.query.search) {
    const s = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q.$or = [{ name: new RegExp(s, 'i') }, { email: new RegExp(s, 'i') }, { mobile: new RegExp(s, 'i') }];
  }
  const [users, total] = await Promise.all([User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(q)]);
  const counts = await Booking.aggregate([
    { $match: { userId: { $in: users.map(u => u._id) }, status: { $gte: 0 } } },
    { $group: { _id: '$userId', n: { $sum: 1 }, last: { $max: '$appointmentDate' } } },
  ]);
  const byUser = Object.fromEntries(counts.map(c => [String(c._id), c]));
  res.json({
    total,
    customers: users.map(u => ({ id: String(u._id), name: u.name, email: u.email, mobile: u.mobile, active: !!u.active, joined: u.createdAt,
      bookings: byUser[String(u._id)]?.n || 0, lastBooking: byUser[String(u._id)]?.last || null, google: !!u.googleSub })),
  });
}));

admin.get('/orders', wrap(async (req, res) => {
  const limit = Math.min(+req.query.limit || 50, 200);
  const skip = Math.max(+req.query.skip || 0, 0);
  const q = { status: { $gte: 0 } };
  if (req.query.status !== undefined && req.query.status !== '') q.status = +req.query.status;
  if (req.query.date) q.appointmentDate = String(req.query.date);
  if (req.query.search) {
    // Escape user input so it is matched literally, not as a regular expression.
    const s = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q.$or = [{ bookingId: new RegExp(s, 'i') }, { 'form.name': new RegExp(s, 'i') }, { 'form.mob': new RegExp(s, 'i') }];
  }
  const [docs, total, reviewers] = await Promise.all([
    Booking.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(q),
    User.find({ role: { $in: ['reviewer', 'admin'] }, active: true }, { name: 1 }).sort({ name: 1 }).lean(),
  ]);
  res.json({ orders: await withNames(docs), total, reviewers: reviewers.map(r => ({ id: String(r._id), name: r.name })) });
}));

admin.put('/orders/:id/assign', wrap(async (req, res) => {
  const b = await findBooking(req.params.id);
  if (!b || b.status < 0) throw new HttpError(404, 'Order not found');
  const rid = req.body.reviewerId || null;
  if (rid) {
    const ok = await User.exists({ _id: rid, role: { $in: ['reviewer', 'admin'] }, active: true });
    if (!ok) throw new HttpError(400, 'Pick an active team member');
  }
  b.assignedGurujiId = rid;
  if (rid && b.status >= STATUS.WAITING && b.status < STATUS.ASSIGNED) b.status = STATUS.ASSIGNED;
  if (!rid && b.status === STATUS.ASSIGNED) b.status = STATUS.WAITING;
  await b.save();
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'order.assign', target: b.bookingId, meta: { reviewerId: rid } });
  res.json({ ok: true });
}));

admin.get('/payments', wrap(async (req, res) => {
  const limit = Math.min(+req.query.limit || 50, 200);
  const rows = await Payment.find({ status: { $ne: 'created' } }).sort({ createdAt: -1 }).limit(limit).lean();
  const users = Object.fromEntries((await User.find({ _id: { $in: rows.map(r => r.userId) } }, { name: 1 }).lean()).map(u => [String(u._id), u.name]));
  res.json({
    payments: rows.map(p => ({
      id: p.paymentId, bookingId: p.bookingId, amount: p.amount, status: p.status, provider: p.provider,
      mode: p.mode, txnid: p.txnid, mihpayid: p.mihpayid, refundRef: p.refundRef, createdAt: p.createdAt, customer: users[String(p.userId)] || '',
    })),
  });
}));

// Refunds. A demo payment is refunded at once. A PayU payment moves to "refund_pending":
// the refund is issued from the PayU merchant dashboard (or its refund API, once enabled for
// this merchant account), and an admin confirms it here with PayU's refund reference.
// Nothing is shown as refunded until that confirmation.
admin.post('/payments/:id/refund', wrap(async (req, res) => {
  const p = await Payment.findOne({ paymentId: req.params.id });
  if (!p) throw new HttpError(404, 'Payment not found');
  if (p.status === 'refund_pending' || p.status === 'refunded') throw new HttpError(409, 'A refund has already been requested for this payment');
  if (p.status !== 'paid') throw new HttpError(400, 'Only paid payments can be refunded');
  p.status = p.provider === 'payu' ? 'refund_pending' : 'refunded';
  p.refundRef = p.provider === 'payu' ? '' : 'DEMO-' + Date.now();
  await p.save();
  await Booking.updateOne({ bookingId: p.bookingId }, { $set: { cancelled: true } });
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'payment.refund.request', target: p.paymentId, meta: { bookingId: p.bookingId, amount: p.amount } });
  res.json({ ok: true, status: p.status });
}));

admin.post('/payments/:id/refund/confirm', wrap(async (req, res) => {
  const ref = String(req.body.reference || '').trim().slice(0, 80);
  if (!ref) throw new HttpError(400, "Enter PayU's refund reference");
  const p = await Payment.findOneAndUpdate({ paymentId: req.params.id, status: 'refund_pending' }, { $set: { status: 'refunded', refundRef: ref } }, { new: true });
  if (!p) throw new HttpError(409, 'This payment is not awaiting a refund');
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'payment.refund.confirm', target: p.paymentId, meta: { reference: ref } });
  res.json({ ok: true });
}));

admin.get('/staff', wrap(async (req, res) => {
  const rows = await User.find({ role: { $in: ['reviewer', 'admin'] } }).sort({ role: 1, name: 1 }).lean();
  res.json({ staff: rows.map(u => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, active: !!u.active })) });
}));
admin.post('/staff', wrap(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || String(password || '').length < 8 || !['reviewer', 'admin'].includes(role))
    throw new HttpError(400, 'Name, valid email, role and an 8+ character password are required');
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'That email is already in use');
  await User.create({ role, name: String(name).slice(0, 80), email: email.toLowerCase(), passwordHash: await hashPassword(password) });
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'staff.add', target: email });
  res.status(201).json({ ok: true });
}));
admin.put('/staff/:id', wrap(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: { $in: ['reviewer', 'admin'] } });
  if (!u) throw new HttpError(404, 'Not found');
  if (req.body.active != null) {
    if (String(u._id) === String(req.user._id) && !req.body.active) throw new HttpError(400, "You can't deactivate yourself");
    u.active = !!req.body.active;
    if (!u.active) await require('../db').Session.deleteMany({ userId: u._id });
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) throw new HttpError(400, 'Password must be 8+ characters');
    u.passwordHash = await hashPassword(req.body.password);
  }
  await u.save();
  res.json({ ok: true });
}));

admin.get('/settings', wrap(async (req, res) => res.json({ settings: await getSettings() })));
admin.put('/settings', wrap(async (req, res) => {
  const s = req.body || {};
  const patch = {};
  const int = (k, min, max, aliases = []) => {
    const src = [k, ...aliases].find(n => s[n] != null);
    if (src == null) return;
    const v = Math.round(+s[src]);
    if (!(v >= min && v <= max)) throw new HttpError(400, `Invalid ${k}`);
    patch[k] = v;
  };
  int('price', 1, 1e6);
  int('gstPercent', 0, 50, ['gst_percent']);
  int('durationMin', 5, 240, ['duration_min']);
  int('daysAhead', 1, 60, ['days_ahead']);
  int('holdMinutes', 5, 60, ['hold_minutes']);
  if (s.slots != null) {
    const slots = (Array.isArray(s.slots) ? s.slots : String(s.slots).split(','))
      .map(x => String(x).trim().toUpperCase().replace(/^(\d):/, '0$1:')).filter(Boolean);
    if (!slots.length || !slots.every(x => /^(0\d|1[0-2]):[0-5]\d (AM|PM)$/.test(x)))
      throw new HttpError(400, 'Slots must look like "10:00 AM, 04:30 PM"');
    patch.slots = slots;
  }
  const settings = await updateSettings(patch);
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'settings.update', meta: patch });
  res.json({ settings });
}));

admin.get('/audit', wrap(async (req, res) => {
  const rows = await Audit.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ entries: rows.map(a => ({ at: a.createdAt, action: a.action, actor: a.actorEmail || null, target: a.target, meta: a.meta })) });
}));

module.exports = { staff, admin };
