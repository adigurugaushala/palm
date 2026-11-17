const cfg = require('./config');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = (() => { try { return require('helmet'); } catch { return null; } })();
const { connect } = require('./db');
const { router: authRouter, loadUser } = require('./auth');
const bookings = require('./routes/bookings');
const payu = require('./routes/payu');
const { staff, admin } = require('./routes/staff');

const app = express();
app.disable('x-powered-by');
if (cfg.prod) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  });
  next();
});
if (helmet) app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// PayU callbacks arrive as application/x-www-form-urlencoded from PayU directly,
// which is cross-origin — they must bypass the JSON+CSRF-header gate below.
app.use('/api/payu', loadUser, payu.router);

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

// CSRF defence: every state-changing API call from the browser carries a custom header,
// which third-party sites cannot add cross-origin.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-guruji') === '1') return next();
  res.status(403).json({ error: 'Missing request header' });
});
app.use('/api', loadUser);
app.use('/api/auth', authRouter);
app.use('/api/staff', staff);
app.use('/api/admin', admin);
app.use('/api', bookings.router);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: cfg.prod ? '1h' : 0 }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image over 8 MB' });
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong — please try again' : err.message });
});

async function start() {
  await connect();
  app.listen(cfg.port, () => {
    console.log(`Guruji running on ${cfg.appBaseUrl}`);
    console.log(`  payments: ${cfg.payu ? 'PayU ' + cfg.payu.mode : cfg.demoPayments ? 'DEMO (no money moves)' : 'OFF'}` +
      ` · Google: ${cfg.googleClientId ? 'on' : 'off'} · dev login: ${cfg.devLogin ? 'on' : 'off'}` +
      ` · meet: ${cfg.meetProvider}`);
  });
}
if (require.main === module) start().catch(e => { console.error(e); process.exit(1); });
module.exports = { app, start };
