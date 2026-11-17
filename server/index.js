const cfg = require('./config');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { connect } = require('./db');
const { router: authRouter, loadUser, requireUser } = require('./auth');
const bookings = require('./routes/bookings');
const payu = require('./routes/payu');
const reviews = require('./routes/reviews');
const commerce = require('./routes/commerce');
const reports = require('./routes/reports');
const { staff, admin } = require('./routes/staff');

// The Express app owns /api; everything else is rendered by Next.js (see start()).
function buildApi() {
  const app = express();
  app.disable('x-powered-by');
  if (cfg.prod) app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use((req, res, next) => { res.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()'); next(); });

  // PayU posts urlencoded forms cross-origin, so its routes bypass the CSRF-header gate below.
  app.use('/api/payu', cookieParser(), loadUser, payu.router);

  app.use('/api', express.json({ limit: '200kb' }), cookieParser());
  // CSRF defence: state-changing calls from the browser must carry a custom header,
  // which other sites cannot add to a cross-origin request.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('x-guruji') === '1') return next();
    res.status(403).json({ error: 'Missing request header' });
  });
  app.use('/api', loadUser);
  app.use('/api/auth', authRouter);
  app.use('/api/staff', staff);
  app.use('/api/admin', requireUser('admin'), reviews.admin);
  app.use('/api/admin', admin);
  app.use('/api', reviews.router);
  app.use('/api/admin', requireUser('admin'), commerce.admin);
  app.use('/api/admin', requireUser('admin'), reports.admin);
  app.use('/api', commerce.router);
  app.use('/api', bookings.router);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  app.use('/api', (err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image is too large' });
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong — please try again' : err.message });
  });
  return app;
}

async function start() {
  await connect();
  const app = buildApi();
  const next = require('next')({ dev: !cfg.prod, dir: path.join(__dirname, '..') });
  await next.prepare();
  const handle = next.getRequestHandler();
  app.all(/.*/, (req, res) => handle(req, res));
  app.listen(cfg.port, () => {
    console.log(`Guruji running on ${cfg.appBaseUrl}`);
    console.log(`  payments: ${cfg.payu ? 'PayU ' + cfg.payu.mode : cfg.demoPayments ? 'DEMO (no money moves)' : 'OFF'}` +
      ` · Google: ${cfg.googleClientId ? 'on' : 'off'} · dev login: ${cfg.devLogin ? 'on' : 'off'} · meet: ${cfg.meetProvider}`);
  });
}

if (require.main === module) start().catch(e => { console.error(e); process.exit(1); });
module.exports = { buildApi, start };
