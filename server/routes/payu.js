const express = require('express');
const { Payment, Audit } = require('../db');
const { wrap } = require('../util');
const cfg = require('../config');
const payu = require('../payu');
const { markPaid, markFailed, findBooking } = require('./bookings');

const router = express.Router();
const form = express.urlencoded({ extended: true, limit: '64kb' });

function redirectHome(res, hash) { res.redirect(303, cfg.appBaseUrl + hash); }

// Browser is redirected here by PayU after a successful payment (form-encoded body).
// The hash is verified before anything is marked paid — a redirect by itself is not proof.
async function handleCallback(req, res, kind) {
  if (!cfg.payu) return redirectHome(res, '/#/failed');
  const body = req.body || {};
  const bookingId = body.udf1 || '';
  const okHash = payu.verifyResponseHash(cfg.payu, body);
  const payment = await Payment.findOne({ txnid: body.txnid });
  const amountOk = payment && Number(payment.amount).toFixed(2) === Number(body.amount).toFixed(2);
  if (!okHash || !payment || payment.bookingId !== bookingId || !amountOk) {
    await Audit.create({ action: 'payu.callback.invalid', target: bookingId, meta: { kind, txnid: body.txnid, hashOk: okHash } });
    return redirectHome(res, `/#/failed/${encodeURIComponent(bookingId || '')}`);
  }
  if (kind === 'success' && String(body.status).toLowerCase() === 'success') {
    await markPaid(bookingId, { mihpayid: body.mihpayid, mode: body.mode, raw: body });
    return redirectHome(res, `/#/paid/${encodeURIComponent(bookingId)}`);
  }
  await markFailed(bookingId, { raw: body });
  redirectHome(res, `/#/failed/${encodeURIComponent(bookingId)}`);
}

router.post('/payu/success', form, wrap((req, res) => handleCallback(req, res, 'success')));
router.post('/payu/failure', form, wrap((req, res) => handleCallback(req, res, 'failure')));

// Server-to-server webhook from PayU — idempotent backstop in case the browser never came back.
router.post('/payu/webhook', form, wrap(async (req, res) => {
  if (!cfg.payu) return res.status(404).end();
  const body = req.body || {};
  if (!payu.verifyResponseHash(cfg.payu, body)) {
    await Audit.create({ action: 'payu.webhook.badhash', target: body.txnid || '' });
    return res.status(400).json({ ok: false });
  }
  const p = await Payment.findOne({ txnid: body.txnid });
  if (!p) return res.status(404).json({ ok: false });
  if (Number(p.amount).toFixed(2) !== Number(body.amount).toFixed(2)) {
    await Audit.create({ action: 'payu.webhook.badamount', target: body.txnid, meta: body });
    return res.status(400).json({ ok: false });
  }
  const status = String(body.status).toLowerCase();
  if (status === 'success' && p.status !== 'paid') {
    await markPaid(p.bookingId, { mihpayid: body.mihpayid, mode: body.mode, raw: body });
  } else if (['failure', 'failed', 'cancelled', 'cancel'].includes(status) && p.status === 'created') {
    await markFailed(p.bookingId, { raw: body });
  }
  res.json({ ok: true });
}));

// SPA can poll this after being redirected back from PayU.
router.get('/payu/verify/:bookingId', wrap(async (req, res) => {
  const p = await Payment.findOne({ bookingId: req.params.bookingId }).sort({ createdAt: -1 }).lean();
  const b = await findBooking(req.params.bookingId);
  res.json({ status: p?.status || 'unknown', bookingStatus: b?.status ?? null, flag: b?.flag || '' });
}));

module.exports = { router };
