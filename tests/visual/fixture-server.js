// Visual-QA server: the real Next.js front-end backed by a FIXTURE API (in-memory sample data).
// Used only to take screenshots of every screen without a database. Not used in production.
// Usage: node tests/visual/fixture-server.js [port]   (run `npx next build` first)
// Switch the signed-in role with the cookie  mock_role=guest|customer|reviewer|admin
const path = require('path');
const express = require('express');

const PORT = +process.argv[2] || 3200;
const today = new Date();
const d = n => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(today.getTime() + n * 864e5));
const STATUSES = ['Payment Successful', 'Details Submitted', 'Waiting for Guruji', 'Assigned to Expert', 'Under Review', 'Appointment Scheduled', 'Consultation Completed', 'Report Ready'];
const TOPICS = ['Career', 'Business', 'Marriage & relationships', 'Family', 'General guidance', 'Other'];
const USERS = {
  customer: { id: 'c1', role: 'customer', name: 'Ananya Rao', email: 'ananya@example.com', mobile: '9876543210' },
  reviewer: { id: 'r1', role: 'reviewer', name: 'Guruji (Senior)', email: 'guruji@example.com' },
  admin: { id: 'a1', role: 'admin', name: 'Admin', email: 'admin@example.com' },
};
const photos = [0, 1, 2].map(i => ({ id: 'p' + i, idx: i, width: 1200, height: 1600 }));
const form = { name: 'Ananya Rao', dob: '1992-03-14', mob: '9876543210', lang: 'English', ct: 'Palmistry', city: 'Hyderabad', cty: 'India', ba: 'Known', bt: '06:40', bp: 'Vijayawada', gn: 'Female' };
const mk = (id, status, extra = {}) => ({
  id, date: d(status >= 7 ? -9 : 2), slot: '04:00 PM', amount: 799, status, statusLabel: STATUSES[status] || 'Awaiting payment',
  cancelled: false, flag: null, editable: status >= 0 && status <= 2, form: status >= 1 ? form : {}, questions: status >= 1 ? ['Career', 'Family'] : [],
  note: status >= 1 ? 'I am weighing a move to a new role abroad next year. What do my hands suggest about timing?' : '', hand: status >= 1 ? 'Right-handed' : '',
  photos: status >= 2 ? photos : [], payment: { id: 'TX-48213907', amount: 799, status: status >= 0 ? 'paid' : 'created', provider: 'payu' },
  reviewer: status >= 3 ? 'Guruji (Senior)' : null, meetUrl: status >= 3 ? 'https://meet.jit.si/Guruji-GJ-48211-x9Qa7' : null,
  reportReady: status >= 7, reportPublishedAt: status >= 7 ? new Date(today.getTime() - 7 * 864e5).toISOString() : null, ...extra,
});
const BOOKINGS = [mk('GJ-48211', 5), mk('GJ-31877', 7), mk('GJ-55102', 1)];
const staffView = b => ({ ...b, checklist: { 'Hand type': 'Clear', 'Life line': 'Clear', 'Heart line': 'Partially visible' }, reportNotes: 'The life line is long and well formed, sweeping wide around the thenar mount — traditionally read as steady energy and resilience through change.\n\nThe head line runs clear and gently sloping, suggesting a thoughtful, imaginative decision-maker.', assignedTo: 'r1', customer: { name: 'Ananya Rao', email: 'ananya@example.com', mobile: '9876543210' }, age: 34 });
const caseRow = (id, name, st, extra = {}) => ({ id, name, age: 30 + (id.charCodeAt(5) % 15), date: d(st >= 7 ? -3 : 1), slot: ['10:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'][id.charCodeAt(4) % 4], status: st, statusLabel: STATUSES[st], assignedTo: 'r1', reviewer: 'Guruji (Senior)', flag: '', cancelled: false, ...extra });
const msgs = [
  { id: 1, body: 'Namaste Guruji, I have uploaded my palm photographs.', at: new Date(today.getTime() - 3600e3).toISOString(), mine: true, from: 'Ananya' },
  { id: 2, body: 'Namaste Ananya. The photographs are clear — thank you. We will speak at 4:00 PM on Thursday.', at: new Date(today.getTime() - 3000e3).toISOString(), mine: false, from: 'Guruji (Senior)' },
];

const app = express();
app.use(express.json());
const role = req => (/mock_role=(\w+)/.exec(req.headers.cookie || '') || [])[1] || 'guest';
const me = req => USERS[role(req)] || null;

app.get('/api/config', (req, res) => res.json({ price: 799, base: 677, gst: 122, gstPercent: 18, durationMin: 30, statuses: STATUSES, topics: TOPICS, googleClientId: null, devLogin: false, payments: { mode: 'payu', env: 'test' }, meet: { provider: 'public', base: 'https://meet.jit.si' }, supportEmail: 'care@adiguruayurveda.com' }));
app.get('/api/auth/me', (req, res) => res.json({ user: me(req) }));
app.get('/api/reviews', (req, res) => res.json(process.env.NO_REVIEWS ? { reviews: [], count: 0, average: null } : {
  count: 3, average: 4.7, reviews: [
    { id: '1', rating: 5, text: 'Guruji listened before he spoke. The reading of my head line matched exactly the choice I was struggling with at work.', name: 'Ananya', city: 'Hyderabad' },
    { id: '2', rating: 5, text: 'My mother joined the call in Telugu. The written report is something we both keep returning to.', name: 'Ravi', city: 'Vijayawada' },
    { id: '3', rating: 4, text: 'Calm, unhurried and private. I appreciated that my photographs were handled carefully.', name: 'Priya', city: 'Bengaluru' },
  ] }));
app.get('/api/slots', (req, res) => res.json({ days: Array.from({ length: 30 }, (_, i) => i + 1).map(n => ({ date: d(n), slots: ['10:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'].map((time, i) => ({ time, available: n % 7 === 3 ? false : (n + i) % 4 !== 1 })) })) }));
app.get('/api/bookings', (req, res) => res.json({ bookings: BOOKINGS }));
app.get('/api/bookings/:id', (req, res) => {
  const b = BOOKINGS.find(x => x.id === req.params.id) || (req.params.id === 'GJ-PENDING' ? mk('GJ-PENDING', -1) : req.params.id === 'GJ-NEW' ? mk('GJ-NEW', 0, { editable: true }) : null);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: me(req)?.role === 'customer' ? b : staffView(b) });
});
app.get('/api/bookings/:id/messages', (req, res) => res.json({ messages: req.query.after ? [] : msgs.map(m => ({ ...m, mine: me(req)?.role === 'customer' ? m.mine : !m.mine })) }));
app.get('/api/bookings/:id/review', (req, res) => res.json({ review: null }));
app.get('/api/bookings/:id/report', (req, res) => res.json({ id: req.params.id, reviewer: 'Guruji (Senior)', publishedAt: new Date().toISOString(), checklist: staffView({}).checklist, notes: staffView({}).reportNotes }));
app.get('/api/photos/:id', (req, res) => res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#E9D9C6"/><path d="M90 380 C80 300 70 260 80 210 C70 170 75 120 95 110 C110 100 120 120 120 140 L120 70 C120 50 145 50 145 70 L145 130 L150 40 C150 20 178 20 178 40 L178 130 L185 60 C185 42 210 42 210 60 L210 140 L215 100 C215 85 238 85 238 100 L238 220 C240 280 225 330 215 380Z" fill="#D9B99B" stroke="#B48E6B"/></svg>`));
app.get('/api/staff/cases', (req, res) => res.json({
  mine: [caseRow('GJ-48211', 'Ananya Rao', 5), caseRow('GJ-50933', 'Suresh Kumar', 4), caseRow('GJ-51290', 'Lakshmi Devi', 3), caseRow('GJ-31877', 'Ananya Rao', 7)],
  unassigned: [caseRow('GJ-52014', 'Mohan Reddy', 2, { assignedTo: null, reviewer: null }), caseRow('GJ-52200', 'Kavya S', 2, { assignedTo: null, reviewer: null, flag: 'returned:Please upload clearer palm photos' })],
  closed: [], checkItems: ['Hand type', 'Life line', 'Fate line', 'Heart line', 'Sun line', 'Business line', 'Palm colour'], checkValues: ['—', 'Clear', 'Not clear', 'Partially visible', 'Not visible'],
}));
app.get('/api/staff/cases/:id', (req, res) => res.json({ case: staffView(BOOKINGS[0]), checkItems: ['Hand type', 'Life line', 'Fate line', 'Heart line', 'Sun line', 'Business line', 'Palm colour'], checkValues: ['—', 'Clear', 'Not clear', 'Partially visible', 'Not visible'] }));
app.get('/api/admin/overview', (req, res) => res.json({ revenue: 47940, orders: 64, unassigned: 3, awaitingDetails: 5, reports: 41, paidCount: 60, pendingPayments: 2, activeGurujis: 3, completed: 46 }));
app.get('/api/admin/analytics', (req, res) => res.json({
  days: Array.from({ length: 30 }, (_, i) => ({ date: d(i - 29), revenue: [0, 799, 1598, 2397, 799, 0, 3196][(i * 5) % 7], count: [0, 1, 2, 3, 1, 0, 4][(i * 5) % 7] })),
  byStatus: STATUSES.map((label, i) => ({ status: i, label, n: [2, 3, 3, 4, 3, 5, 5, 41][i] })),
  workload: [{ id: 'r1', name: 'Guruji (Senior)', role: 'reviewer', active: true, open: 6 }, { id: 'r2', name: 'S. Murthy', role: 'reviewer', active: true, open: 4 }, { id: 'r3', name: 'A. Devi', role: 'reviewer', active: false, open: 0 }, { id: 'a1', name: 'Admin', role: 'admin', active: true, open: 1 }],
}));
app.get('/api/admin/orders', (req, res) => res.json({ total: 64, reviewers: [{ id: 'r1', name: 'Guruji (Senior)' }, { id: 'r2', name: 'S. Murthy' }], orders: [caseRow('GJ-52014', 'Mohan Reddy', 2, { assignedTo: null, reviewer: null }), caseRow('GJ-48211', 'Ananya Rao', 5), caseRow('GJ-50933', 'Suresh Kumar', 4, { assignedTo: 'r2', reviewer: 'S. Murthy' }), caseRow('GJ-55102', 'Ananya Rao', 1, { assignedTo: null }), caseRow('GJ-31877', 'Ananya Rao', 7), caseRow('GJ-29001', 'Irfan Ali', 2, { assignedTo: null, flag: 'rejected:Photographs were not of a palm' })] }));
app.get('/api/admin/customers', (req, res) => res.json({ total: 3, customers: [{ id: 'c1', name: 'Ananya Rao', email: 'ananya@example.com', mobile: '9876543210', active: true, joined: d(-40), bookings: 3, lastBooking: d(2), google: false }, { id: 'c2', name: 'Mohan Reddy', email: 'mohan@example.com', mobile: '9123456780', active: true, joined: d(-12), bookings: 1, lastBooking: d(1), google: true }, { id: 'c3', name: 'Kavya S', email: 'kavya@example.com', mobile: null, active: true, joined: d(-4), bookings: 1, lastBooking: d(1), google: false }] }));
app.get('/api/admin/payments', (req, res) => res.json({ payments: [
  { id: 'TX-48213907', bookingId: 'GJ-48211', amount: 799, status: 'paid', provider: 'payu', mode: 'UPI', txnid: 'GJT17635012345678', mihpayid: '403993715531077182', createdAt: new Date().toISOString(), customer: 'Ananya Rao' },
  { id: 'TX-51120044', bookingId: 'GJ-52014', amount: 799, status: 'paid', provider: 'payu', mode: 'CC', txnid: 'GJT17634998765432', mihpayid: '403993715531075511', createdAt: new Date().toISOString(), customer: 'Mohan Reddy' },
  { id: 'TX-50992210', bookingId: 'GJ-50001', amount: 799, status: 'failed', provider: 'payu', mode: '', txnid: 'GJT17634911112222', mihpayid: '', createdAt: new Date().toISOString(), customer: 'Ravi T' },
  { id: 'TX-49001123', bookingId: 'GJ-29001', amount: 799, status: 'refunded', provider: 'payu', mode: 'NB', txnid: 'GJT17630011110000', mihpayid: '403993715531011111', createdAt: new Date().toISOString(), customer: 'Irfan Ali' },
] }));
app.get('/api/admin/staff', (req, res) => res.json({ staff: [{ id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin', active: true }, { id: 'r1', name: 'Guruji (Senior)', email: 'guruji@example.com', role: 'reviewer', active: true }, { id: 'r2', name: 'S. Murthy', email: 'murthy@example.com', role: 'reviewer', active: true }, { id: 'r3', name: 'A. Devi', email: 'devi@example.com', role: 'reviewer', active: false }] }));
app.get('/api/admin/settings', (req, res) => res.json({ settings: { price: 799, gstPercent: 18, durationMin: 30, daysAhead: 7, slots: ['10:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'], holdMinutes: 15 } }));
app.get('/api/admin/reviews', (req, res) => res.json({ reviews: [{ id: '1', bookingId: 'GJ-31877', rating: 5, text: 'Guruji listened before he spoke.', name: 'Ananya', city: 'Hyderabad', status: 'approved', at: new Date().toISOString() }, { id: '4', bookingId: 'GJ-40011', rating: 4, text: 'Helpful and patient. Would have liked a longer session.', name: 'Sai', city: 'Guntur', status: 'pending', at: new Date().toISOString() }] }));
app.get('/api/admin/audit', (req, res) => res.json({ entries: [{ at: new Date().toISOString(), action: 'case.approve', actor: 'guruji@example.com', target: 'GJ-31877', meta: {} }, { at: new Date().toISOString(), action: 'order.assign', actor: 'admin@example.com', target: 'GJ-48211', meta: { reviewerId: 'r1' } }, { at: new Date().toISOString(), action: 'settings.update', actor: 'admin@example.com', target: '', meta: { price: 799 } }] }));
const PRODUCTS = [
  { slug: 'foundations-of-palmistry', kind: 'course', title: 'Foundations of Palmistry', summary: 'Learn to read the major lines and mounts of the palm with confidence.', description: 'Six weekly live classes. You practise on sample palms and receive feedback from Guruji after each class.', price: 4999, durationText: '6 weeks · online, one live class a week', outcomes: ['Identify the principal lines', 'Read the mounts and their meanings', 'Practise on sample palms'], active: true, sort: 1 },
  { slug: 'palm-reading-practitioner', kind: 'course', title: 'Palm Reading Practitioner', summary: 'A longer programme for people who want to read palms for others.', description: 'Twelve weeks with live sessions, case studies and a supervised reading.', price: 12999, durationText: '12 weeks · online with live sessions', outcomes: ['Full palm reading method', 'Case studies', 'Supervised practice readings'], active: true, sort: 2 },
  { slug: 'detailed-palm-reading', kind: 'service', title: 'Detailed Palm Reading', summary: 'A longer reading with a written report.', description: 'A 45-minute video or audio reading. You receive a written report after the session.', price: 1499, durationText: '45 minutes, video or audio', outcomes: ['Written report', 'Question-led discussion'], active: true, sort: 1 },
  { slug: 'muhurtham-guidance', kind: 'service', title: 'Muhurtham Guidance', summary: 'Auspicious dates for weddings, griha pravesh and new beginnings.', description: 'Share the dates you are considering and Guruji suggests auspicious timings.', price: 2100, durationText: 'Written guidance within 3 days', outcomes: ['Shortlist of auspicious dates', 'Short written explanation'], active: true, sort: 2 },
];
const ORDERS = [
  { id: 'ORD-40113201', kind: 'course', title: 'Foundations of Palmistry', amount: 4999, status: 'paid', purpose: '', anonymous: false, productSlug: 'foundations-of-palmistry', fulfilment: 'new', paidAt: new Date(today.getTime() - 3 * 864e5).toISOString(), createdAt: new Date(today.getTime() - 3 * 864e5).toISOString() },
  { id: 'ORD-40113877', kind: 'service', title: 'Detailed Palm Reading', amount: 1499, status: 'paid', purpose: '', anonymous: false, productSlug: 'detailed-palm-reading', fulfilment: 'contacted', paidAt: new Date(today.getTime() - 1 * 864e5).toISOString(), createdAt: new Date(today.getTime() - 1 * 864e5).toISOString() },
  { id: 'ORD-40114020', kind: 'donation', title: 'Donation to Guruji', amount: 501, status: 'paid', purpose: 'Annadanam (community meals)', anonymous: false, productSlug: '', fulfilment: 'new', paidAt: new Date(today.getTime() - 5 * 864e5).toISOString(), createdAt: new Date(today.getTime() - 5 * 864e5).toISOString() },
];
app.get('/api/catalog', (req, res) => res.json({ products: PRODUCTS.filter(p => p.active && (!req.query.kind || p.kind === req.query.kind)) }));
app.get('/api/catalog/:slug', (req, res) => {
  const p = PRODUCTS.find(x => x.slug === req.params.slug && x.active);
  if (!p) return res.status(404).json({ error: 'This course or service is not available' });
  res.json({ product: p });
});
app.get('/api/donations/options', (req, res) => res.json({ purposes: ['General donation', 'Annadanam (community meals)', 'Education and scholarships', 'Temple and ashram support'], presets: [101, 501, 1100, 2100, 5100], min: 11, max: 500000 }));
app.get('/api/orders', (req, res) => res.json({ orders: me(req)?.role === 'customer' ? ORDERS : [] }));
app.get('/api/orders/:id', (req, res) => {
  const o = ORDERS.find(x => x.id === req.params.id) || { ...ORDERS[0], id: req.params.id, status: 'created', paidAt: null };
  res.json({ order: o });
});
app.get('/api/learning/:id', (req, res) => {
  const o = ORDERS.find(x => x.id === req.params.id) || ORDERS[0];
  res.json({ course: {
    id: o.id, title: 'Foundations of Palmistry', durationText: '6 weeks · online, one live class a week', paidAt: o.paidAt,
    courseStatus: 'active', completedAt: null, certificateNo: '',
    lessons: [
      { title: 'The shape of the hand', url: 'https://video.example/lesson-1', notes: 'Watch once, then practise on your own palm.' },
      { title: 'The life line', url: 'https://video.example/lesson-2', notes: '' },
      { title: 'Reading notes (to follow)', url: '', notes: '' },
    ],
    sessions: [
      { title: 'Live class 1: mounts', startsAt: new Date(today.getTime() + 2 * 864e5).toISOString(), durationMin: 60, joinUrl: 'https://meet.example/gj-1' },
      { title: 'Live class 2: lines', startsAt: new Date(today.getTime() + 9 * 864e5).toISOString(), durationMin: 60, joinUrl: '' },
    ],
  } });
});
app.get('/api/admin/catalog', (req, res) => res.json({ products: PRODUCTS.map(p => ({ ...p })).concat([{ ...PRODUCTS[0], slug: 'palm-draft', title: 'Draft: Hand Shapes', active: false, price: 999 }]) }));
app.get('/api/admin/orders', (req, res) => {
  const kind = req.query.kind;
  const rows = ORDERS.map(o => ({ ...o, txnid: 'GJO1763' + o.id.slice(-4), mihpayid: '40399371553', customer: 'Ananya Rao', email: 'ananya@example.com', mobile: '9876543210', form: o.kind === 'service' ? { name: 'Ananya Rao', mobile: '9876543210', preferred: 'Weekday evenings', notes: 'Career change, and timing of a move abroad.' } : o.kind === 'donation' ? { donorName: 'Ananya' } : {} }));
  res.json({ totals: { donations: 501, courses: 4999, services: 1499 }, orders: kind ? rows.filter(r => r.kind === kind) : rows });
});
app.all(/^\/api\/.*/, (req, res) => res.json({ ok: true }));

(async () => {
  const next = require('next')({ dev: false, dir: path.join(__dirname, '..', '..') });
  await next.prepare();
  const handle = next.getRequestHandler();
  app.all(/.*/, (req, res) => handle(req, res));
  app.listen(PORT, () => console.log('fixture server on ' + PORT));
})();
