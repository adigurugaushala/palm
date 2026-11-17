// Scrolls the animated landing page top to bottom (full motion, Lenis + GSAP) and checks that
// every revealed element finishes fully visible. Usage: node tests/visual/motion-check.js
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3200';
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  let failed = 0;
  for (const w of [1440, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 860 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('gj:intro', '1'));
    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 400) { await page.mouse.wheel({ deltaY: 400 }); await new Promise(r => setTimeout(r, 120)); }
    await new Promise(r => setTimeout(r, 2000));
    const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-stagger] > *, .hero h1 .line > span')]
      .filter(el => +getComputedStyle(el).opacity < 0.99).map(el => el.className || el.tagName));
    const y = await page.evaluate(() => Math.round(window.scrollY + innerHeight - document.documentElement.scrollHeight));
    console.log(`${w}px: ${hidden.length ? 'STILL HIDDEN: ' + hidden.slice(0, 6).join(', ') : 'all sections visible'}; reached bottom: ${y >= -2}; errors: ${errs.length ? errs.join(' | ') : 'none'}`);
    if (hidden.length || errs.length) failed++;
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
