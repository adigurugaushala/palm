const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cfg = require('./config');
const { hashPassword } = require('./util');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, cfg.uploadDir), { recursive: true });

const { Schema, model } = mongoose;

const UserSchema = new Schema({
  role: { type: String, enum: ['customer', 'reviewer', 'admin'], required: true, index: true },
  name: { type: String, default: '' },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  mobile: { type: String, sparse: true, index: true },
  googleSub: { type: String, sparse: true, unique: true },
  passwordHash: { type: String, default: null },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const BookingSchema = new Schema({
  bookingId: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedGurujiId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  appointmentDate: { type: String, required: true },     // IST calendar date "YYYY-MM-DD"
  appointmentSlot: { type: String, required: true },
  amount: { type: Number, required: true },
  // -1 awaiting payment, 0 paid, 1 details submitted, 2 waiting, 3 assigned,
  // 4 under review, 5 scheduled, 6 completed, 7 report ready
  status: { type: Number, default: -1, index: true },
  cancelled: { type: Boolean, default: false, index: true },
  flag: { type: String, default: '' },
  form: { type: Object, default: () => ({}) },
  questions: { type: [String], default: [] },
  note: { type: String, default: '' },
  hand: { type: String, default: '' },
  checklist: { type: Object, default: () => ({}) },
  reportNotes: { type: String, default: '' },
  reportPublishedAt: { type: Date, default: null },
  meetRoom: { type: String, required: true },
}, { timestamps: true });
BookingSchema.index({ appointmentDate: 1, appointmentSlot: 1 });

const PaymentSchema = new Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  bookingId: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['payu', 'demo'], required: true },
  txnid: { type: String, index: true },          // our transaction id sent to PayU
  mihpayid: { type: String, default: '' },       // PayU's reference
  amount: { type: Number, required: true },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refund_pending', 'refunded'], required: true, default: 'created', index: true },
  mode: { type: String, default: '' },           // credit card / upi / etc
  refundRef: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  raw: { type: Object, default: () => ({}) },    // last callback payload for audit
}, { timestamps: true });

const PhotoSchema = new Schema({
  bookingId: { type: String, required: true, index: true },
  idx: { type: Number, required: true },
  filename: { type: String, required: true },
  mime: { type: String, required: true },
  width: Number, height: Number,
}, { timestamps: true });
PhotoSchema.index({ bookingId: 1, idx: 1 }, { unique: true });

const MessageSchema = new Schema({
  bookingId: { type: String, required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
}, { timestamps: true });

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },     // TTL auto-cleanup
});

const SettingsSchema = new Schema({
  _id: { type: String, default: 'global' },
  price: { type: Number, default: 799 },
  gstPercent: { type: Number, default: 18 },
  durationMin: { type: Number, default: 30 },
  daysAhead: { type: Number, default: 7 },
  slots: { type: [String], default: ['10:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'] },
  holdMinutes: { type: Number, default: 15 },
});

const AuditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorEmail: String,
  action: { type: String, required: true, index: true },
  target: { type: String, default: '' },
  meta: { type: Object, default: () => ({}) },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Customer reviews — only customers with a completed consultation can write one,
// and nothing is shown publicly until an admin approves it.
const ReviewSchema = new Schema({
  bookingId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true, maxlength: 1200 },
  displayName: { type: String, default: '' },
  city: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'pending', index: true },
}, { timestamps: true });

const models = {
  Review: model('Review', ReviewSchema),
  User: model('User', UserSchema),
  Booking: model('Booking', BookingSchema),
  Payment: model('Payment', PaymentSchema),
  Photo: model('Photo', PhotoSchema),
  Message: model('Message', MessageSchema),
  Session: model('Session', SessionSchema),
  Settings: model('Settings', SettingsSchema),
  Audit: model('Audit', AuditSchema),
};

let memoryServer = null;
async function connect() {
  let uri = cfg.mongo.uri;
  if (!uri) {
    if (!cfg.mongo.useMemory) throw new Error('MONGODB_URI is required in production');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('[mongo] using in-memory Mongo for development');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: cfg.mongo.dbName, serverSelectionTimeoutMS: 15000 });
  await models.Settings.updateOne({ _id: 'global' }, { $setOnInsert: {} }, { upsert: true });
  await seedStaff();
}

async function seedStaff() {
  const count = await models.User.countDocuments({ role: { $in: ['admin', 'reviewer'] } });
  if (count) return;
  const adminEmail = (process.env.ADMIN_EMAIL || (cfg.ownerEmails[0] || 'admin@guruji.local')).toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'changeme123';
  const gurujiEmail = (process.env.GURUJI_EMAIL || 'guruji@guruji.local').toLowerCase();
  const gurujiPass = process.env.GURUJI_PASSWORD || 'guruji123';
  await models.User.create([
    { role: 'admin', name: 'Admin', email: adminEmail, passwordHash: await hashPassword(adminPass) },
    { role: 'reviewer', name: 'Guruji (Senior)', email: gurujiEmail, passwordHash: await hashPassword(gurujiPass) },
  ]);
  console.log(`[seed] Staff created → admin: ${adminEmail} / ${process.env.ADMIN_PASSWORD ? '(from env)' : adminPass}` +
    ` · guruji: ${gurujiEmail} / ${process.env.GURUJI_PASSWORD ? '(from env)' : gurujiPass} — please change these!`);
}

async function getSettings() {
  const s = await models.Settings.findById('global').lean();
  return {
    price: s.price, gstPercent: s.gstPercent, gst_percent: s.gstPercent, durationMin: s.durationMin, duration_min: s.durationMin,
    daysAhead: s.daysAhead, days_ahead: s.daysAhead, slots: s.slots, holdMinutes: s.holdMinutes, hold_minutes: s.holdMinutes,
  };
}

async function updateSettings(patch) {
  await models.Settings.updateOne({ _id: 'global' }, { $set: patch });
  return getSettings();
}

async function disconnect() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { ...models, connect, disconnect, getSettings, updateSettings, DATA_DIR };
