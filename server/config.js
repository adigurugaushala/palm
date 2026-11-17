const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const prod = process.env.NODE_ENV === 'production';
const on = v => v === '1' || v === 'true';

const payuKey = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || '';
const payuSalt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || '';
const payuMode = (process.env.PAYU_MODE || process.env.PAYU_ENV || 'test').toLowerCase();
const payuBase = process.env.PAYU_BASE_URL || (payuMode === 'live' || payuMode === 'production' ? 'https://secure.payu.in' : 'https://test.payu.in');
const payuReady = !!(payuKey && payuSalt);

module.exports = {
  prod,
  port: +process.env.PORT || 3000,
  appBaseUrl: (process.env.APP_BASE_URL || process.env.BACKEND_URL || `http://localhost:${+process.env.PORT || 3000}`).replace(/\/$/, ''),
  secureCookies: prod,
  sessionSecret: process.env.SESSION_SECRET || process.env.AUTH_SECRET || '',
  // Simulated sign-in shown on screen in development only.
  devLogin: process.env.DEV_LOGIN ? on(process.env.DEV_LOGIN) : !prod,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  mongo: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'guruji',
    useMemory: !process.env.MONGODB_URI && !prod,
  },
  payu: payuReady ? { key: payuKey, salt: payuSalt, mode: payuMode, baseUrl: payuBase } : null,
  // Without PayU keys, checkout runs in demo mode (no money moves). Never allowed in production.
  get demoPayments() { return !this.payu && !prod; },
  paymentPendingTtlMinutes: +process.env.PAYMENT_PENDING_TTL_MINUTES || 30,
  meetBase: process.env.MEET_BASE_URL || 'https://meet.jit.si',
  meetProvider: process.env.MEET_PROVIDER || 'public',
  supportEmail: process.env.SUPPORT_EMAIL || 'care@adiguruayurveda.com',
  ownerEmails: (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  uploadMaxBytes: +process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024,
  rateLimit: {
    windowMs: +process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000,
    max: +process.env.RATE_LIMIT_MAX || 300,
  },
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
};
