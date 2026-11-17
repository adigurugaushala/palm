// Admin reports: revenue by product, donations by purpose, booking-to-paid conversion and staff
// turnaround, for a chosen period (IST dates). Every figure is computed from stored records; CSV
// exports use the same numbers as the screen.
const express = require('express');
const { Booking, Payment, Order, User } = require('../db');
const { STATUS, HttpError, wrap } = require('../util');

const admin = express.Router();
const DAY = 864e5;
const MAX_SPAN_DAYS = 366;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const istDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
const round = (n, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

// Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (IST). Defaults to the last 30 days.
function parseRange(q) {
  const to = ISO_DATE.test(q.to || '') ? q.to : istDate(new Date());
  const from = ISO_DATE.test(q.from || '') ? q.from : istDate(new Date(Date.parse(`${to}T00:00:00+05:30`) - 29 * DAY));
  const start = new Date(`${from}T00:00:00+05:30`), end = new Date(`${to}T23:59:59.999+05:30`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new HttpError(400, 'Check the dates: the start must be before the end');
  if (end - start > MAX_SPAN_DAYS * DAY) throw new HttpError(400, 'Choose a period of up to one year');
  return { from, to, start, end };
}

async function compute(r) {
  const window = field => ({ [field]: { $gte: r.start, $lte: r.end } });
  const [payments, orders, created, paidFromCreated, reported] = await Promise.all([
    Payment.find({ status: 'paid', ...window('updatedAt') }, { bookingId: 1, amount: 1, verifiedAt: 1, updatedAt: 1 }).lean(),
    Order.find({ status: 'paid', ...window('paidAt') }, { kind: 1, productSlug: 1, title: 1, amount: 1, purpose: 1 }).lean(),
    Booking.countDocuments({ ...window('createdAt'), cancelled: false }),
    Booking.countDocuments({ ...window('createdAt'), cancelled: false, status: { $gte: STATUS.PAID } }),
    Booking.find({ ...window('reportPublishedAt'), cancelled: false }, { bookingId: 1, assignedGurujiId: 1, reportPublishedAt: 1 }).lean(),
  ]);

  // Revenue by product: consultations, then each course and service.
  const productMap = new Map();
  const addProduct = (key, row) => {
    const cur = productMap.get(key) || { product: row.product, kind: row.kind, count: 0, revenue: 0 };
    cur.count += 1; cur.revenue += row.amount; productMap.set(key, cur);
  };
  for (const p of payments) addProduct('consultation', { product: 'Consultation', kind: 'Consultation', amount: p.amount });
  for (const o of orders.filter(x => x.kind !== 'donation')) {
    addProduct(`${o.kind}|${o.productSlug || o.title}`, { product: o.title, kind: o.kind === 'course' ? 'Course' : 'Service', amount: o.amount });
  }
  const products = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Donations by purpose.
  const donationMap = new Map();
  for (const o of orders.filter(x => x.kind === 'donation')) {
    const purpose = o.purpose || 'General donation';
    const cur = donationMap.get(purpose) || { purpose, count: 0, amount: 0 };
    cur.count += 1; cur.amount += o.amount; donationMap.set(purpose, cur);
  }
  const donations = [...donationMap.values()].sort((a, b) => b.amount - a.amount);

  // Booking-to-paid: of the consultations started in the period, how many were paid.
  const conversion = {
    started: created, paid: paidFromCreated,
    rate: created ? round((paidFromCreated / created) * 100) : 0,
  };

  // Turnaround: hours from payment to the report being sent, per Guruji.
  const paidAt = {};
  if (reported.length) {
    const pays = await Payment.find({ bookingId: { $in: reported.map(b => b.bookingId) }, status: 'paid' }, { bookingId: 1, verifiedAt: 1, updatedAt: 1 }).lean();
    for (const p of pays) paidAt[p.bookingId] = p.verifiedAt || p.updatedAt;
  }
  const gurujis = await User.find({ _id: { $in: reported.map(b => b.assignedGurujiId).filter(Boolean) } }, { name: 1 }).lean();
  const nameOf = Object.fromEntries(gurujis.map(u => [String(u._id), u.name]));
  const byGuruji = new Map();
  const allHours = [];
  for (const b of reported) {
    const from = paidAt[b.bookingId];
    if (!from) continue;
    const hours = (new Date(b.reportPublishedAt) - new Date(from)) / 36e5;
    if (hours < 0) continue;
    allHours.push(hours);
    const key = b.assignedGurujiId ? String(b.assignedGurujiId) : 'unassigned';
    const cur = byGuruji.get(key) || { guruji: b.assignedGurujiId ? (nameOf[key] || 'Guruji') : 'Not assigned', reports: 0, total: 0 };
    cur.reports += 1; cur.total += hours; byGuruji.set(key, cur);
  }
  const turnaround = {
    reports: allHours.length,
    averageHours: allHours.length ? round(allHours.reduce((s, h) => s + h, 0) / allHours.length) : 0,
    byGuruji: [...byGuruji.values()].map(g => ({ guruji: g.guruji, reports: g.reports, averageHours: round(g.total / g.reports) })).sort((a, b) => b.reports - a.reports),
  };

  const sum = (rows, pick) => rows.reduce((s, r) => s + pick(r), 0);
  const totals = {
    revenue: sum(products, p => p.revenue) + sum(donations, d => d.amount),
    consultations: products.find(p => p.product === 'Consultation')?.revenue || 0,
    courses: sum(products.filter(p => p.kind === 'Course'), p => p.revenue),
    services: sum(products.filter(p => p.kind === 'Service'), p => p.revenue),
    donations: sum(donations, d => d.amount),
  };
  return { range: { from: r.from, to: r.to }, totals, products, donations, conversion, turnaround };
}

admin.get('/reports', wrap(async (req, res) => {
  res.json(await compute(parseRange(req.query)));
}));

// ---- CSV export ----
// Values that spreadsheets would read as formulas get a leading apostrophe, so exported names and
// notes cannot run code when opened.
const csvCell = v => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

admin.get('/reports.csv', wrap(async (req, res) => {
  const r = parseRange(req.query);
  const data = await compute(r);
  const section = String(req.query.section || 'products');
  let csv;
  if (section === 'products') csv = toCsv(['Product', 'Type', 'Payments', 'Revenue (INR)'], data.products.map(p => [p.product, p.kind, p.count, p.revenue]));
  else if (section === 'donations') csv = toCsv(['Purpose', 'Donations', 'Amount (INR)'], data.donations.map(d => [d.purpose, d.count, d.amount]));
  else if (section === 'turnaround') csv = toCsv(['Guruji', 'Reports sent', 'Average hours from payment to report'], data.turnaround.byGuruji.map(g => [g.guruji, g.reports, g.averageHours]));
  else if (section === 'conversion') csv = toCsv(['Consultations started', 'Paid', 'Booking-to-paid (%)'], [[data.conversion.started, data.conversion.paid, data.conversion.rate]]);
  else throw new HttpError(400, 'Unknown report');
  res.type('text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="guruji-${section}-${r.from}-to-${r.to}.csv"`);
  res.send('﻿' + csv);
}));

module.exports = { admin, parseRange, compute, csvCell, toCsv };
