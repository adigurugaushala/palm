const express = require('express');
const { Review, Booking, Audit } = require('../db');
const { requireUser } = require('../auth');
const { STATUS, HttpError, wrap, rateLimit } = require('../util');

// Public + customer review routes (mounted under /api).
const router = express.Router();

router.get('/reviews', wrap(async (req, res) => {
  const [rows, agg] = await Promise.all([
    Review.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(12).lean(),
    Review.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$rating' } } }]),
  ]);
  res.json({
    reviews: rows.map(r => ({ id: String(r._id), rating: r.rating, text: r.text, name: r.displayName, city: r.city, at: r.createdAt })),
    count: agg[0]?.n || 0,
    average: agg[0] ? Math.round(agg[0].avg * 10) / 10 : null,
  });
}));

router.get('/bookings/:id/review', requireUser('customer'), wrap(async (req, res) => {
  const r = await Review.findOne({ bookingId: req.params.id, userId: req.user._id }).lean();
  res.json({ review: r ? { rating: r.rating, text: r.text, status: r.status } : null });
}));

router.post('/bookings/:id/review', requireUser('customer'), rateLimit({ windowMs: 60 * 60e3, max: 10, key: r => 'rev:' + r.user?._id }), wrap(async (req, res) => {
  const b = await Booking.findOne({ bookingId: req.params.id, userId: req.user._id });
  if (!b) throw new HttpError(404, 'Booking not found');
  if (b.status < STATUS.COMPLETED || b.cancelled) throw new HttpError(409, 'You can review after your consultation is complete');
  const rating = Math.round(+req.body.rating);
  const text = String(req.body.text || '').trim().slice(0, 1200);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Choose a rating from 1 to 5');
  if (text.length < 10) throw new HttpError(400, 'Please write at least a sentence');
  const firstName = String((b.form?.name || req.user.name || '').trim().split(/\s+/)[0] || 'Customer').slice(0, 40);
  await Review.findOneAndUpdate(
    { bookingId: b.bookingId },
    { $set: { userId: req.user._id, rating, text, displayName: firstName, city: String(b.form?.city || '').slice(0, 60), status: 'pending' } },
    { upsert: true },
  );
  res.status(201).json({ ok: true, status: 'pending' });
}));

// Admin moderation (mounted under /api/admin, behind requireUser('admin')).
const admin = express.Router();
admin.get('/reviews', wrap(async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {};
  const rows = await Review.find(q).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ reviews: rows.map(r => ({ id: String(r._id), bookingId: r.bookingId, rating: r.rating, text: r.text, name: r.displayName, city: r.city, status: r.status, at: r.createdAt })) });
}));
admin.put('/reviews/:id', wrap(async (req, res) => {
  if (!['approved', 'hidden', 'pending'].includes(req.body.status)) throw new HttpError(400, 'Unknown status');
  const r = await Review.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } });
  if (!r) throw new HttpError(404, 'Not found');
  await Audit.create({ actorId: req.user._id, actorEmail: req.user.email, action: 'review.' + req.body.status, target: r.bookingId });
  res.json({ ok: true });
}));

module.exports = { router, admin };
