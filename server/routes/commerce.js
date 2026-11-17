// Learning & courses, services and donations. These share one order model and the same PayU
// checkout as bookings. Prices are read from the catalogue on the server, never from the browser.
const express = require('express');
const { Order, Product, User, Audit } = require('../db');
const { requireUser } = require('../auth');
const { HttpError, wrap, token } = require('../util');
const cfg = require('../config');
const payu = require('../payu');
const { parseLessons, parseSessions } = require('../courses');
const { renderCertificate } = require('../report');

const router = express.Router();
const admin = express.Router();

const DONATION_PURPOSES = ['General donation', 'Annadanam (community meals)', 'Education and scholarships', 'Temple and ashram support'];
const DONATION_MIN = 11, DONATION_MAX = 500000;
const DONATION_PRESETS = [101, 501, 1100, 2100, 5100];

const randDigits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const money = n => Number(n || 0);

const publicProduct = p => ({
  slug: p.slug, kind: p.kind, title: p.title, summary: p.summary, description: p.description,
  price: p.price, durationText: p.durationText, outcomes: p.outcomes || [],
});

const orderView = o => ({
  id: o.orderId, kind: o.kind, title: o.title, amount: o.amount, status: o.status, purpose: o.purpose,
  anonymous: !!o.anonymous, productSlug: o.productSlug, fulfilment: o.fulfilment,
  paidAt: o.paidAt, createdAt: o.createdAt,
});

// ---------------- public catalogue ----------------
router.get('/catalog', wrap(async (req, res) => {
  const q = { active: true };
  if (['course', 'service'].includes(req.query.kind)) q.kind = req.query.kind;
  const rows = await Product.find(q).sort({ sort: 1, title: 1 }).lean();
  res.json({ products: rows.map(publicProduct) });
}));

router.get('/catalog/:slug', wrap(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!p) throw new HttpError(404, 'This course or service is not available');
  res.json({ product: publicProduct(p) });
}));

router.get('/donations/options', (req, res) => {
  res.json({ purposes: DONATION_PURPOSES, presets: DONATION_PRESETS, min: DONATION_MIN, max: DONATION_MAX });
});

// ---------------- checkout ----------------
function serviceForm(input) {
  const f = input || {};
  const name = String(f.name || '').trim().slice(0, 80);
  const mobile = String(f.mobile || '').replace(/\s+/g, '');
  const preferred = String(f.preferred || '').trim().slice(0, 120);
  const notes = String(f.notes || '').trim().slice(0, 1000);
  if (name.length < 2) throw new HttpError(400, 'Enter your full name');
  if (!/^[6-9]\d{9}$/.test(mobile)) throw new HttpError(400, 'Enter a valid 10-digit mobile number');
  return { name, mobile, preferred, notes };
}

async function prepareCheckout(order, user) {
  if (!cfg.payu) return { mode: 'demo' };
  const txnid = `GJO${Date.now()}${randDigits(4)}`;
  order.txnid = txnid;
  await order.save();
  const { action, fields } = payu.buildCheckoutFields(cfg.payu, {
    txnid, amount: order.amount,
    productinfo: `Guruji ${order.kind} ${order.orderId}`,
    firstname: (user.name || 'Customer').slice(0, 60), email: user.email || `guest+${order.orderId}@guruji.local`,
    phone: user.mobile || '',
    surl: `${cfg.appBaseUrl}/api/payu/success`,
    furl: `${cfg.appBaseUrl}/api/payu/failure`,
    udf1: order.orderId, udf2: String(user._id),
  });
  return { mode: 'payu', action, fields, env: cfg.payu.mode };
}

router.post('/orders', requireUser('customer'), wrap(async (req, res) => {
  const body = req.body || {};
  const kind = String(body.kind || '');
  let order;

  if (kind === 'course' || kind === 'service') {
    const p = await Product.findOne({ slug: String(body.slug || ''), kind, active: true });
    if (!p) throw new HttpError(404, 'This course or service is not available');
    if (kind === 'course') {
      const enrolled = await Order.exists({ userId: req.user._id, productSlug: p.slug, status: 'paid' });
      if (enrolled) throw new HttpError(409, "You're already enrolled in this course");
    }
    const form = kind === 'service' ? serviceForm(body.form) : {};
    order = new Order({
      orderId: 'ORD-' + randDigits(8), userId: req.user._id, kind, productSlug: p.slug, title: p.title,
      amount: p.price, form, provider: cfg.payu ? 'payu' : 'demo',
    });
  } else if (kind === 'donation') {
    const amount = Math.round(Number(body.amount));
    if (!(amount >= DONATION_MIN && amount <= DONATION_MAX)) throw new HttpError(400, `Choose an amount between ₹${DONATION_MIN} and ₹${DONATION_MAX.toLocaleString('en-IN')}`);
    const purpose = DONATION_PURPOSES.includes(body.purpose) ? body.purpose : DONATION_PURPOSES[0];
    order = new Order({
      orderId: 'ORD-' + randDigits(8), userId: req.user._id, kind, title: 'Donation to Guruji', amount,
      purpose, anonymous: !!body.anonymous, form: { donorName: String(body.donorName || '').trim().slice(0, 80) },
      provider: cfg.payu ? 'payu' : 'demo',
    });
  } else {
    throw new HttpError(400, 'Unknown order type');
  }

  await order.save();
  const payment = await prepareCheckout(order, req.user);
  res.status(201).json({ order: orderView(order), payment });
}));

// Demo payments (no PayU keys, non-production only).
router.post('/orders/:id/demo-pay', requireUser('customer'), wrap(async (req, res) => {
  if (!cfg.demoPayments) throw new HttpError(404, 'Not found');
  const o = await Order.findOne({ orderId: req.params.id, userId: req.user._id });
  if (!o) throw new HttpError(404, 'Order not found');
  if (o.status === 'paid') return res.json({ ok: true, order: orderView(o) });
  if (req.body?.fail) { o.status = 'failed'; await o.save(); return res.json({ ok: false, order: orderView(o) }); }
  await markOrderPaid(o, { mihpayid: 'demo_' + token(6), mode: 'demo' });
  res.json({ ok: true, order: orderView(o) });
}));

router.get('/orders', requireUser('customer'), wrap(async (req, res) => {
  const rows = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ orders: rows.map(orderView) });
}));

router.get('/orders/:id', requireUser('customer'), wrap(async (req, res) => {
  const o = await Order.findOne({ orderId: req.params.id, userId: req.user._id }).lean();
  if (!o) throw new HttpError(404, 'Order not found');
  res.json({ order: orderView(o) });
}));

// ---------------- learning: lessons, live classes and certificates for paid learners ----------------
async function ownedCourse(req) {
  const o = await Order.findOne({ orderId: req.params.id, userId: req.user._id, kind: 'course', status: 'paid' }).lean();
  if (!o) throw new HttpError(404, 'Course not found');
  const p = await Product.findOne({ slug: o.productSlug }).lean();
  return { o, p };
}

router.get('/learning/:id', requireUser('customer'), wrap(async (req, res) => {
  const { o, p } = await ownedCourse(req);
  res.json({ course: {
    id: o.orderId, title: o.title, durationText: p?.durationText || '', paidAt: o.paidAt,
    courseStatus: o.courseStatus || 'active', completedAt: o.completedAt || null, certificateNo: o.certificateNo || '',
    lessons: (p?.lessons || []).map(l => ({ title: l.title, url: l.url, notes: l.notes })),
    sessions: (p?.sessions || []).map(x => ({ title: x.title, startsAt: x.startsAt, durationMin: x.durationMin, joinUrl: x.joinUrl })),
  } });
}));

router.get('/learning/:id/certificate.pdf', requireUser('customer'), wrap(async (req, res) => {
  const { o } = await ownedCourse(req);
  if (o.courseStatus !== 'completed' || !o.certificateNo) throw new HttpError(404, 'Certificate not issued yet');
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="guruji-certificate-${o.certificateNo}.pdf"`);
  renderCertificate({ name: req.user.name || 'Learner', course: o.title, date: o.completedAt, certNo: o.certificateNo }, res);
}));

// ---------------- settling payments (called by routes/payu.js) ----------------
async function markOrderPaid(o, body) {
  if (o.status === 'paid') return;
  o.status = 'paid';
  o.paidAt = new Date();
  o.mihpayid = String(body.mihpayid || '');
  o.mode = String(body.mode || '');
  o.raw = body;
  await o.save();
  await Audit.create({ action: 'order.paid', target: o.orderId, meta: { kind: o.kind, amount: o.amount } });
}

async function markOrderFailed(o, body) {
  if (o.status !== 'created') return;
  o.status = 'failed';
  o.raw = body;
  await o.save();
}

// Verifies the PayU response (hash and amount) before the order is settled. Returns the order
// and whether the payment was successful. Used by the browser callback and the webhook.
async function settleOrder(body, { fromWebhook = false } = {}) {
  const okHash = payu.verifyResponseHash(cfg.payu, body);
  const o = await Order.findOne({ orderId: String(body.udf1 || ''), txnid: String(body.txnid || '') });
  const amountOk = o && Number(o.amount).toFixed(2) === Number(body.amount).toFixed(2);
  if (!okHash || !o || !amountOk) {
    await Audit.create({ action: fromWebhook ? 'payu.webhook.badorder' : 'payu.callback.invalid', target: String(body.udf1 || ''), meta: { order: true, hashOk: okHash } });
    return { order: o, ok: false };
  }
  const status = String(body.status).toLowerCase();
  if (status === 'success') await markOrderPaid(o, body);
  else if (['failure', 'failed', 'cancelled', 'cancel'].includes(status)) await markOrderFailed(o, body);
  return { order: o, ok: status === 'success' };
}

const isOrderCallback = body => String(body.udf1 || '').startsWith('ORD-');

// ---------------- admin: catalogue and orders ----------------
admin.get('/catalog', wrap(async (req, res) => {
  const rows = await Product.find({}).sort({ kind: 1, sort: 1, title: 1 }).lean();
  res.json({ products: rows.map(p => ({
    ...publicProduct(p), active: !!p.active,
    lessons: p.lessons || [],
    sessions: (p.sessions || []).map(x => ({ title: x.title, startsAt: x.startsAt ? new Date(x.startsAt).toISOString() : '', durationMin: x.durationMin, joinUrl: x.joinUrl })),
  })) });
}));

const parseOutcomes = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean).slice(0, 12);
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

admin.post('/catalog', wrap(async (req, res) => {
  const b = req.body || {};
  if (!['course', 'service'].includes(b.kind)) throw new HttpError(400, 'Choose course or service');
  const title = String(b.title || '').trim();
  const price = Math.round(Number(b.price));
  if (title.length < 3) throw new HttpError(400, 'Enter a title');
  if (!(price >= 1 && price <= 1e6)) throw new HttpError(400, 'Enter a price in rupees');
  let slug = slugify(b.slug || title);
  if (!slug) throw new HttpError(400, 'Enter a title');
  if (await Product.exists({ slug })) slug = `${slug}-${randDigits(3)}`;
  const p = await Product.create({
    slug, kind: b.kind, title: title.slice(0, 120), summary: String(b.summary || '').slice(0, 240),
    description: String(b.description || '').slice(0, 4000), price, durationText: String(b.durationText || '').slice(0, 120),
    outcomes: parseOutcomes(b.outcomes), active: !!b.active,
    lessons: b.kind === 'course' ? parseLessons(b.lessons) : [],
    sessions: b.kind === 'course' ? parseSessions(b.sessions) : [],
  });
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'catalog.add', target: p.slug, meta: { kind: p.kind, price } });
  res.status(201).json({ ok: true, slug: p.slug });
}));

admin.put('/catalog/:slug', wrap(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug });
  if (!p) throw new HttpError(404, 'Not found');
  const b = req.body || {};
  const changed = {};
  if (b.title != null) { p.title = String(b.title).trim().slice(0, 120); changed.title = p.title; }
  if (b.summary != null) p.summary = String(b.summary).slice(0, 240);
  if (b.description != null) p.description = String(b.description).slice(0, 4000);
  if (b.durationText != null) p.durationText = String(b.durationText).slice(0, 120);
  if (b.outcomes != null) p.outcomes = parseOutcomes(b.outcomes);
  if (b.price != null) {
    const price = Math.round(Number(b.price));
    if (!(price >= 1 && price <= 1e6)) throw new HttpError(400, 'Enter a price in rupees');
    p.price = price; changed.price = price;
  }
  if (b.active != null) { p.active = !!b.active; changed.active = p.active; }
  if (p.kind === 'course') {
    if (b.lessons != null) { p.lessons = parseLessons(b.lessons); changed.lessons = p.lessons.length; }
    if (b.sessions != null) { p.sessions = parseSessions(b.sessions); changed.sessions = p.sessions.length; }
  }
  await p.save();
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'catalog.update', target: p.slug, meta: changed });
  res.json({ ok: true });
}));

admin.get('/orders', wrap(async (req, res) => {
  const q = {};
  if (['course', 'service', 'donation'].includes(req.query.kind)) q.kind = req.query.kind;
  if (req.query.status === 'paid') q.status = 'paid';
  if (req.query.product) q.productSlug = String(req.query.product).slice(0, 60);
  const rows = await Order.find(q).sort({ createdAt: -1 }).limit(300).lean();
  const users = Object.fromEntries((await User.find({ _id: { $in: rows.map(r => r.userId) } }, { name: 1, email: 1, mobile: 1 }).lean()).map(u => [String(u._id), u]));
  const paid = rows.filter(r => r.status === 'paid');
  const totals = {
    donations: paid.filter(r => r.kind === 'donation').reduce((s, r) => s + r.amount, 0),
    courses: paid.filter(r => r.kind === 'course').reduce((s, r) => s + r.amount, 0),
    services: paid.filter(r => r.kind === 'service').reduce((s, r) => s + r.amount, 0),
  };
  res.json({
    totals,
    orders: rows.map(o => {
      const u = users[String(o.userId)] || {};
      return {
        ...orderView(o), txnid: o.txnid, mihpayid: o.mihpayid,
        customer: o.anonymous ? 'Anonymous donor' : (u.name || ''), email: u.email || '', mobile: u.mobile || '',
        form: o.kind === 'service' ? o.form : (o.kind === 'donation' ? { donorName: o.form?.donorName || '' } : {}),
        courseStatus: o.courseStatus || 'active', certificateNo: o.certificateNo || '',
      };
    }),
  });
}));

admin.put('/orders/:id', wrap(async (req, res) => {
  const o = await Order.findOne({ orderId: req.params.id });
  if (!o) throw new HttpError(404, 'Order not found');
  if (!['new', 'contacted', 'done'].includes(req.body?.fulfilment)) throw new HttpError(400, 'Unknown status');
  o.fulfilment = req.body.fulfilment;
  await o.save();
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'order.fulfilment', target: o.orderId, meta: { fulfilment: o.fulfilment } });
  res.json({ ok: true });
}));

// Guruji marks a paid course as completed. Completing issues a certificate number; the learner can
// then download the certificate. Setting it back to active keeps the number so nothing is reissued.
admin.put('/orders/:id/course', wrap(async (req, res) => {
  const o = await Order.findOne({ orderId: req.params.id, kind: 'course', status: 'paid' });
  if (!o) throw new HttpError(404, 'Paid course order not found');
  const status = req.body?.courseStatus;
  if (!['active', 'completed'].includes(status)) throw new HttpError(400, 'Unknown course status');
  o.courseStatus = status;
  if (status === 'completed') {
    if (!o.completedAt) o.completedAt = new Date();
    o.certificateNo = o.certificateNo || `GJC-${o.orderId.slice(-8)}`;
  } else {
    o.completedAt = null;
  }
  await o.save();
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'course.status', target: o.orderId, meta: { courseStatus: status } });
  res.json({ ok: true, certificateNo: o.certificateNo });
}));

module.exports = {
  router, admin, settleOrder, isOrderCallback, markOrderPaid, DONATION_PURPOSES,
};
