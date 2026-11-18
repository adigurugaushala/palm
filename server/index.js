const cfg = require('./config');
const path = require('path');
const fs = require('fs');
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
const avatars = require('./routes/avatars');
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
  app.use('/api', cookieParser(), loadUser, payu.router);

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
  app.use('/api', avatars.router);
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

const app = buildApi();

// Immediate synchronous listen for Hostinger / Passenger / cPanel compatibility
const server = app.listen(cfg.port, () => {
  console.log(`Guruji running on ${cfg.appBaseUrl} (port ${cfg.port})`);
  console.log(`  payments: ${cfg.payu ? 'PayU ' + cfg.payu.mode : cfg.demoPayments ? 'DEMO (no money moves)' : 'OFF'}` +
    ` · Google: ${cfg.googleClientId ? 'on' : 'off'} · dev login: ${cfg.devLogin ? 'on' : 'off'}` +
    ` · meet: ${cfg.meetProvider}`);
});

// Prepare Next.js in background without blocking listen()
let nextHandler = null;
let nextErr = null;
let isBuilding = false;

const nextDir = path.join(__dirname, '..');
const dotNext = path.join(nextDir, '.next');

async function initNext() {
  if (cfg.prod && !fs.existsSync(dotNext)) {
    console.log('[next] No production build found in .next. Running automatic next build...');
    isBuilding = true;
    const { execSync } = require('child_process');
    const nextCli = path.join(nextDir, 'node_modules', 'next', 'dist', 'bin', 'next');
    try {
      if (fs.existsSync(nextCli)) {
        execSync(`"${process.execPath}" "${nextCli}" build`, { cwd: nextDir, stdio: 'inherit', env: process.env });
      } else {
        execSync('npx next build', { cwd: nextDir, stdio: 'inherit', env: process.env });
      }
      console.log('[next] Build completed successfully.');
    } catch (buildErr) {
      console.error('[next] Automatic build failed:', buildErr.message);
      isBuilding = false;
      throw buildErr;
    }
    isBuilding = false;
  }

  const nextApp = require('next')({ dev: !cfg.prod, dir: nextDir });
  await nextApp.prepare();
  nextHandler = nextApp.getRequestHandler();
  console.log('[next] Next.js ready to serve requests');
}

initNext().catch((err) => {
  console.error('[next] Next.js initialization failed:', err.message || err);
  nextErr = err;
});

app.all(/.*/, (req, res) => {
  if (nextHandler) {
    return nextHandler(req, res);
  }
  if (nextErr) {
    return res.status(500).send(`Server Error starting frontend: ${nextErr.message || nextErr}`);
  }
  const msg = isBuilding ? 'Building production assets, please wait a moment...' : 'Please wait a few seconds while the app initializes.';
  res.status(503).send(`<html><head><meta http-equiv="refresh" content="3"></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>Starting Guruji application...</h2><p>${msg}</p></body></html>`);
});

// Connect to MongoDB asynchronously without blocking listen()
connect()
  .then(() => {
    console.log('[db] MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('[db] MongoDB connection error:', err.message || err);
  });

module.exports = { app, server, connect, buildApi };
