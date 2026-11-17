// Screenshot every screen at several widths against the fixture server, and report
// console errors, failed requests and horizontal overflow. Visual QA only.
// Usage: node tests/visual/fixture-server.js 3200 &  then  node tests/visual/shoot.js [outDir]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = process.argv[2] || '/tmp/shots';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = [
  ['guest', '/', 'home'], ['guest', '/login', 'login'], ['guest', '/register', 'register'], ['guest', '/staff', 'staff-login'],
  ['guest', '/help', 'help'], ['guest', '/terms', 'terms'],
  ['customer', '/account', 'account'], ['customer', '/book', 'book'], ['customer', '/book/GJ-PENDING/pay', 'pay'],
  ['customer', '/book/GJ-NEW/paid', 'paid'], ['customer', '/book/GJ-PENDING/failed', 'failed'], ['customer', '/book/GJ-NEW/details', 'details'],
  ['customer', '/book/GJ-55102/done', 'done'], ['customer', '/bookings', 'bookings'], ['customer', '/bookings/GJ-48211', 'booking'],
  ['customer', '/bookings/GJ-48211/session', 'session'], ['customer', '/reports', 'reports'], ['customer', '/profile', 'profile'],
  ['reviewer', '/guruji', 'guruji'], ['reviewer', '/guruji/cases', 'cases'], ['reviewer', '/guruji/cases/GJ-48211', 'case'],
  ['admin', '/admin', 'admin'], ['admin', '/admin/orders', 'orders'], ['admin', '/admin/customers', 'customers'],
  ['admin', '/admin/payments', 'payments'], ['admin', '/admin/team', 'team'], ['admin', '/admin/reviews', 'reviews'],
  ['admin', '/admin/settings', 'settings'], ['admin', '/admin/audit', 'audit'],
];
const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const problems = [];
  for (const [role, path, name] of SCREENS) {
    if (ONLY && !ONLY.test(name)) continue;
    for (const w of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: w < 600 ? 844 : 900, deviceScaleFactor: 1 });
      await page.setCookie({ name: 'mock_role', value: role, url: BASE });
      // Scroll-triggered reveals never fire in a full-page capture, so shoot the settled (reduced-motion) layout.
      if (!process.env.MOTION) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      // Skip the intro animation so screens are captured in their settled state.
      await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('gj:intro', '1'); } catch {} });
      const errs = [];
      page.on('console', m => m.type() === 'error' && errs.push(m.text()));
      page.on('pageerror', e => errs.push(e.message));
      page.on('requestfailed', r => !r.url().includes('_rsc=') && errs.push('FAILED ' + r.url()));
      page.on('response', r => r.status() >= 400 && !r.url().includes('favicon') && errs.push(`${r.status()} ${r.url()}`));
      await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => errs.push(e.message));
      await new Promise(r => setTimeout(r, 900));
      const overflow = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const bad = [...document.querySelectorAll('body *')].filter(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || r.right <= W + 1) return false;
          for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; }
          return true;
        }).slice(0, 3).map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} → ${Math.round(el.getBoundingClientRect().right)}px`);
        return { scroll: document.documentElement.scrollWidth > W + 1, bad };
      });
      await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
      if (errs.length || overflow.scroll) problems.push({ name, w, errs: [...new Set(errs)].slice(0, 5), overflow: overflow.scroll ? overflow.bad : undefined });
      await page.close();
    }
  }
  await browser.close();
  console.log(problems.length ? JSON.stringify(problems, null, 1) : 'No console errors or horizontal overflow.');
})();
