'use strict';
/* Guruji — client. Same look & flow as the prototype; all data lives on the server. */
const $ = s => document.querySelector(s), app = $('#app'), RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const T = {
  en: { hi: 'Good morning', book: 'Book Your Consultation', cont: 'Continue', home: 'Home', track: 'Status', rep: 'Reports', google: 'Continue with Google', tag: 'Personal palmistry consultation, with a real expert.', pay: 'Pay', slot: 'Choose your slot', up: 'Upload palm photos', next: 'Next appointment', none: 'No appointment yet', lang: 'తెలుగు', sub: 'Submit for review', name: 'Full name', dob: 'Date of birth', mob: 'Mobile number', pl: 'Preferred language', done: 'Your consultation details have been submitted successfully.', disc: 'What would you like to discuss with Guruji?', emailLogin: 'Continue with email' },
  te: { hi: 'శుభోదయం', book: 'మీ కన్సల్టేషన్ బుక్ చేయండి', cont: 'కొనసాగించు', home: 'హోమ్', track: 'స్థితి', rep: 'నివేదికలు', google: 'Google తో కొనసాగండి', tag: 'నిజమైన నిపుణుడితో వ్యక్తిగత హస్తసాముద్రిక సంప్రదింపు.', pay: 'చెల్లించండి', slot: 'మీ స్లాట్ ఎంచుకోండి', up: 'అరచేతి ఫోటోలు అప్‌లోడ్', next: 'తదుపరి అపాయింట్‌మెంట్', none: 'అపాయింట్‌మెంట్ లేదు', lang: 'English', sub: 'సమీక్షకు సమర్పించండి', name: 'పూర్తి పేరు', dob: 'పుట్టిన తేదీ', mob: 'మొబైల్ నంబర్', pl: 'ఇష్టమైన భాష', done: 'మీ వివరాలు విజయవంతంగా సమర్పించబడ్డాయి.', disc: 'గురూజీతో మీరు ఏమి చర్చించాలనుకుంటున్నారు?', emailLogin: 'ఇమెయిల్‌తో కొనసాగండి' },
};
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('gj:' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('gj:' + k, JSON.stringify(v)); } catch {} },
};
const S = { l: store.get('lang', 'en'), screen: 'login', arg: null, di: 0, slot: null, tab: 'Overview' };
let CFG = {}, ME = null;
let V = {};
let F = { bid: null };
const PAYS = {};
const t = k => (T[S.l][k] || T.en[k] || k);
const ST = () => CFG.statuses || [];
const SCREENS_CUSTOMER = ['home', 'book', 'pay', 'paying', 'paid', 'failed', 'p1', 'p2', 'p3', 'palm', 'done', 'track', 'consult', 'reports', 'profile'];
const SCREENS_STAFF = ['rhome', 'rcase'];

async function api(method, url, body) {
  const isForm = body instanceof FormData;
  const r = await fetch('/api' + url, {
    method, credentials: 'same-origin',
    headers: { 'x-guruji': '1', ...(body && !isForm ? { 'content-type': 'application/json' } : {}) },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'Request failed'); e.status = r.status; throw e; }
  return d;
}
const dl = d => new Date(d + 'T12:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
function age(d) { if (!d) return ''; const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
function toast(m) { const b = $('#toast'); if (!b) return; const e = document.createElement('div'); e.textContent = m; b.append(e); setTimeout(() => e.remove(), 3200); }
function sheet(html, c) { const o = document.createElement('div'); o.className = 'ov' + (c ? ' c' : ''); o.innerHTML = '<div role="dialog" aria-modal="true">' + html + '</div>'; o.onclick = e => { if (e.target === o) o.remove(); }; app.append(o); o.querySelector('input,button')?.focus(); return o; }
const closeBtn = (label = 'Close') => `<button class="pri" data-a="close" style="margin-top:10px">${label}</button>`;
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); }); }
let poll = null; const stopPoll = () => { clearInterval(poll); poll = null; };
const latest = list => list.find(b => !b.cancelled && b.status < 7) || list[0];

function parseHash() { const [s, a] = location.hash.replace(/^#\/?/, '').split('/'); S.screen = s || ''; S.arg = a ? decodeURIComponent(a) : null; }
function homeFor(u) { return !u ? 'login' : u.role === 'admin' ? 'ahome' : u.role === 'reviewer' ? 'rhome' : 'home'; }
function go(s, arg) {
  S.screen = s; S.arg = arg ?? null;
  const hash = '#/' + s + (arg ? '/' + encodeURIComponent(arg) : '');
  if (location.hash !== hash) history.pushState(null, '', hash);
  return load();
}
addEventListener('popstate', () => { parseHash(); load(); });

async function load() {
  stopPoll();
  let s = S.screen;
  const ok = s === 'login' || s === 'staff-login' ? !ME
    : SCREENS_CUSTOMER.includes(s) ? ME?.role === 'customer'
    : SCREENS_STAFF.includes(s) ? ['reviewer', 'admin'].includes(ME?.role)
    : s === 'ahome' ? ME?.role === 'admin' : false;
  if (!ok) { S.screen = s = homeFor(ME); S.arg = null; history.replaceState(null, '', '#/' + s); }
  V = {};
  if (L[s]) {
    app.classList.add('busy');
    try { await L[s](); }
    catch (e) {
      if (e.status === 401) { ME = null; S.screen = 'login'; }
      else if (e.status === 404 && s !== homeFor(ME)) { toast(e.message); return go(homeFor(ME)); }
      else toast(e.message);
    } finally { app.classList.remove('busy'); }
  }
  if (S.screen !== s) return load();
  render();
}

const getBooking = async id => (await api('GET', '/bookings/' + encodeURIComponent(id))).booking;
async function loadForm() {
  V.cur = await getBooking(S.arg);
  if (!V.cur.editable) { S.screen = 'track'; return; }
  if (F.bid !== V.cur.id) {
    const c = V.cur;
    F = { bid: c.id, form: { lang: 'English', city: 'Hyderabad', cty: 'India', ba: 'Known', ...c.form }, q: [...c.questions], note: c.note, hand: c.hand };
    if (!F.form.name && ME.name) F.form.name = ME.name;
    if (!F.form.mob && ME.mobile) F.form.mob = ME.mobile;
  }
}
const L = {
  async home() { V.list = (await api('GET', '/bookings')).bookings; },
  async book() { V.days = (await api('GET', '/slots')).days; if (S.di >= V.days.length) S.di = 0; const d = V.days[S.di]; if (S.slot && !d.slots.find(x => x.time === S.slot && x.available)) S.slot = null; },
  async pay() { V.cur = await getBooking(S.arg); if (V.cur.status >= 0) { S.screen = 'paid'; } },
  async paid() {
    V.cur = await getBooking(S.arg);
    // After returning from a PayU redirect, confirm status with the backend before celebrating.
    if (V.cur.status < 0) {
      try { const v = await api('GET', '/payu/verify/' + encodeURIComponent(S.arg)); if (v.status === 'failed') S.screen = 'failed'; } catch {}
    }
  },
  async failed() { try { V.cur = await getBooking(S.arg); } catch { V.cur = null; } },
  p1: loadForm, p2: loadForm, p3: loadForm, palm: loadForm,
  async done() { V.cur = await getBooking(S.arg); },
  async track() { if (S.arg) V.cur = await getBooking(S.arg); else { V.list = (await api('GET', '/bookings')).bookings; V.cur = latest(V.list); } },
  async consult() { V.cur = await getBooking(S.arg); V.msgs = (await api('GET', `/bookings/${V.cur.id}/messages`)).messages; },
  async reports() { V.list = (await api('GET', '/bookings')).bookings; },
  async profile() { /* profile shown from ME */ },
  async rhome() { V.cases = await api('GET', '/staff/cases'); },
  async rcase() { const r = await api('GET', '/staff/cases/' + encodeURIComponent(S.arg)); V.case = r.case; V.items = r.checkItems; V.vals = r.checkValues; V.msgs = (await api('GET', `/bookings/${V.case.id}/messages`)).messages; },
  async ahome() {
    const tb = S.tab;
    if (tb === 'Overview') V.ov = await api('GET', '/admin/overview');
    if (tb === 'Orders') V.orders = await api('GET', '/admin/orders?limit=100');
    if (tb === 'Payments') V.pays = (await api('GET', '/admin/payments')).payments;
    if (tb === 'Guruji team') V.staff = (await api('GET', '/admin/staff')).staff;
    if (tb === 'Settings') V.settings = (await api('GET', '/admin/settings')).settings;
  },
};

const custNav = () => `<nav>${[['home', '⌂', t('home')], ['book', '＋', t('book').split(' ')[0]], ['track', '◔', t('track')], ['reports', '▤', t('rep')]].map(a => `<button data-a="go" data-v="${a[0]}" class="${S.screen == a[0] ? 'on' : ''}"><div style="font-size:18px" aria-hidden="true">${a[1]}</div>${a[2]}</button>`).join('')}</nav>`;
const hdr = (title, back, backArg) => `<div class="row" style="padding:12px 18px 0">${back ? `<button class="out" data-a="go" data-v="${back}" ${backArg ? `data-arg="${h(backArg)}"` : ''} aria-label="Back" style="padding:8px 14px;min-height:36px">←</button>` : ''}<h2 class="grow">${title}</h2><button class="sec" data-a="lang" style="padding:6px 12px;min-height:34px">${t('lang')}</button></div>`;
const err = k => `<div class="err" id="e-${k}"></div>`;
const staffBar = (title, back, backArg) => `<div class="row sp" style="padding:12px 18px;border-bottom:1px solid var(--g)"><h2>${back ? `<button class="out" data-a="go" data-v="${back}" ${backArg ? `data-arg="${h(backArg)}"` : ''} aria-label="Back" style="padding:6px 12px;min-height:34px">←</button> ` : ''}${title}</h2><div class="row">${ME?.role === 'admin' ? `<button class="out" data-a="go" data-v="${S.screen === 'ahome' ? 'rhome' : 'ahome'}" style="min-height:34px;padding:6px 12px">${S.screen === 'ahome' ? 'Cases' : 'Admin'}</button>` : ''}<span class="mut">${h(ME?.name)}</span><button class="sec" data-a="logout" style="min-height:34px;padding:6px 12px">Exit</button></div></div>`;
const msgHtml = m => `<div class="msg ${m.mine ? 'me' : ''}">${h(m.body)}<small>${m.mine ? 'You' : h(m.from)} · ${new Date(m.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></div>`;
const chat = (msgs, empty) => `<div class="card chatbox" id="chat">${msgs.length ? msgs.map(msgHtml).join('') : `<div class="msg">${empty}</div>`}</div><div class="row"><input id="cm" placeholder="Type a message" maxlength="2000" aria-label="Message"><button class="pri" data-a="send" style="width:auto">Send</button></div>`;
const flagNote = c => !c.flag ? '' : c.flag.type === 'returned' ? `<div class="demo">Guruji asked for changes: ${h(c.flag.reason)}</div>${c.editable ? `<button class="pri" data-a="go" data-v="palm" data-arg="${h(c.id)}">Update photos & resubmit</button>` : ''}`
  : c.flag.type === 'rejected' ? `<div class="demo">This request was declined: ${h(c.flag.reason)}. Contact ${h(CFG.supportEmail)} about a refund.</div>`
  : `<div class="demo">${h(c.flag.reason)}</div>`;
const payNote = () => CFG.payments?.mode === 'demo' ? '<div class="demo">DEMO PAYMENT — PayU keys not set, no real money moves</div>' : CFG.payments?.env === 'test' ? '<div class="demo">PayU TEST environment — use PayU test cards</div>' : '';

const S_ = {
  login: () => `<main style="display:flex;flex-direction:column;justify-content:center;text-align:center;gap:14px"><div class="pop" style="font-size:54px;color:var(--o)" aria-hidden="true">✦</div><h1>GURUJI</h1><p class="mut">PALMISTRY • GUIDANCE</p><h2>${t('tag')}</h2>
${CFG.googleClientId ? '<div id="gbtn"></div>' : ''}
<button class="pri" data-a="emaillogin">${t('emailLogin')}</button>
<button class="sec" data-a="emailregister" style="margin-top:-6px">Create a new account</button>
${CFG.devLogin ? '<div class="demo">DEV MODE — "Continue with name" below; disable in production</div><button class="out" data-a="devlogin" style="font-size:12px">Dev continue with just a name</button>' : ''}
<button class="sec" data-a="lang" style="font-size:12px;width:auto;margin:6px auto">${t('lang')}</button><p class="mut">By continuing, you agree to our <a href="#" data-a="terms" style="color:var(--r)">Terms & Privacy Policy</a>.</p></main>`,

  // Hidden staff entry — reachable only by typing #/staff-login or clicking the tiny footer link.
  'staff-login': () => `<main style="display:flex;flex-direction:column;justify-content:center;text-align:center;gap:14px"><div style="font-size:48px;color:var(--o)" aria-hidden="true">✦</div><h2>Staff sign-in</h2><p class="mut">Guruji and administrators only.</p>
<button class="pri" data-a="staff" data-v="Guruji portal">Guruji portal</button>
<button class="sec" data-a="staff" data-v="Admin portal">Admin portal</button>
<button class="out" data-a="go" data-v="login" style="font-size:12px;width:auto;margin:6px auto">← Back to customer sign-in</button></main>`,

  home: () => {
    const c = latest(V.list || []);
    const next = c && !c.cancelled && c.status < 7;
    return hdr(`${t('hi')}, ${h(ME.name || 'Guest')}`) + `<main><div class="hero"><h2>Palm reading with Guruji</h2><p style="opacity:.85;margin:6px 0 14px">Personal 1:1 session • ${CFG.durationMin} min • ₹${CFG.price}</p><button class="pri" data-a="go" data-v="book" style="background:#fff;color:var(--r)">${t('book')}</button></div>
<div class="card soft"><h3>${t('next')}</h3>${next ? `<p>${dl(c.date)}, ${h(c.slot)}</p><p class="mut">Booking ${h(c.id)} • ${h(c.statusLabel)}</p>${c.status <= 1 && c.editable ? `<button class="pri" data-a="go" data-v="p1" data-arg="${h(c.id)}" style="margin-top:8px">Complete your details</button>` : `<button class="sec" data-a="go" data-v="track" data-arg="${h(c.id)}" style="margin-top:8px">View booking</button>`}` : `<p class="mut">${t('none')}</p>`}</div>
<div class="grid">${['Career', 'Business', 'Marriage', 'Family'].map(x => `<button class="card tap" data-a="go" data-v="book" style="text-align:center">${x}</button>`).join('')}</div>
<div class="card row"><div style="font-size:34px;color:var(--o)" aria-hidden="true">✦</div><div><h3>Guruji</h3><p class="mut">Traditional palmistry guidance, one person at a time.</p></div></div>
<div class="row"><button class="out grow" data-a="go" data-v="profile">Profile</button><button class="out grow" data-a="help">Help</button><button class="out" data-a="logout">Sign out</button></div></main>` + custNav();
  },

  profile: () => hdr('Profile', 'home') + `<main><label for="pn">${t('name').toUpperCase()}</label><input id="pn" value="${h(ME.name)}"><label for="pm">${t('mob').toUpperCase()}</label><input id="pm" inputmode="numeric" maxlength="10" value="${h(ME.mobile || '')}"><div class="mut">Email: ${h(ME.email || '—')}</div><button class="pri" data-a="saveprofile" style="margin-top:12px">Save profile</button>
<h3 style="margin-top:20px">Change password</h3><label for="pcu">CURRENT PASSWORD</label><input id="pcu" type="password" autocomplete="current-password"><label for="pcn">NEW PASSWORD</label><input id="pcn" type="password" autocomplete="new-password"><button class="sec" data-a="changepw" style="margin-top:12px">Update password</button></main>` + custNav(),

  book: () => {
    const d = V.days?.[S.di];
    return hdr(t('slot'), 'home') + `<main><div class="card soft"><h3>Palm reading with Guruji</h3><p class="mut">${CFG.durationMin} min • <b>₹${CFG.price}</b></p></div><label>SELECT A DATE</label><div class="dates">${(V.days || []).map((x, i) => `<button class="dt ${S.di == i ? 'on' : ''}" data-a="date" data-v="${i}">${dl(x.date)}</button>`).join('')}</div>
<label>AVAILABLE TIMES</label><div class="row" style="flex-wrap:wrap">${d ? d.slots.map(s => `<button class="sl ${S.slot == s.time ? 'on' : ''}" data-a="slot" data-v="${h(s.time)}" ${s.available ? '' : 'disabled'}>${h(s.time)}</button>`).join('') : ''}</div>
<div class="card" id="sum">${S.slot && d ? `${dl(d.date)} • ${h(S.slot)} • ₹${CFG.price}` : 'Select a date and time'}</div><button class="pri" data-a="topay" ${S.slot ? '' : 'disabled'}>${t('cont')}</button></main>` + custNav();
  },

  pay: () => {
    const c = V.cur, demo = CFG.payments?.mode === 'demo', payu = CFG.payments?.mode === 'payu';
    return hdr('Checkout', 'book') + `<main>${payNote()}<div class="card"><h3>Palm reading with Guruji</h3><p class="mut">${dl(c.date)} • ${h(c.slot)} • Booking ${h(c.id)}</p><table><tr><td>Consultation</td><td>₹${CFG.base}</td></tr><tr><td>GST ${CFG.gstPercent}%</td><td>₹${CFG.gst}</td></tr><tr><th>Total</th><th>₹${c.amount}</th></tr></table></div>
${demo ? `<div class="row"><input type="checkbox" id="fl" style="width:20px" data-a="fl" ${S.fail ? 'checked' : ''}><label for="fl" style="margin:0">Simulate payment failure</label></div>` : payu ? '<p class="mut">You will pay securely through PayU (UPI, cards, netbanking, wallets).</p>' : '<p class="err">Payments are not configured.</p>'}
<p class="mut">Your slot is held for a few minutes while you pay.</p><button class="pri" data-a="dopay" ${payu || demo ? '' : 'disabled'}>${t('pay')} ₹${c.amount}</button></main>`;
  },
  paying: () => `<main style="display:grid;place-items:center;text-align:center"><div><div class="ring">…</div><h3 style="margin-top:20px">Processing payment…</h3><p class="mut">Please don't close this page.</p></div></main>`,
  paid: () => `<main style="display:grid;place-items:center;text-align:center"><div><div class="ring pop" style="background:var(--o);color:#fff;animation:none">✓</div><h2 style="margin:16px 0 4px">Payment successful</h2><p class="mut">Ref ${h(V.cur?.payment?.id)} • ${V.cur ? dl(V.cur.date) + ', ' + h(V.cur.slot) : ''}</p>${V.cur?.flag?.type === 'conflict' ? flagNote(V.cur) : ''}<button class="pri" data-a="go" data-v="p1" data-arg="${h(V.cur?.id || '')}" style="margin-top:20px">Complete your details</button></div></main>`,
  failed: () => `<main style="display:grid;place-items:center;text-align:center"><div><div class="ring pop" style="border-color:var(--r);color:var(--r);animation:none">✕</div><h2 style="margin:16px 0 4px">Payment failed</h2><p class="mut">Nothing was charged.</p>${V.cur ? `<button class="pri" data-a="go" data-v="pay" data-arg="${h(V.cur.id)}" style="margin-top:20px">Retry payment</button>` : ''}<button class="out" data-a="go" data-v="book" style="margin-top:10px;width:100%">Pick another slot</button></div></main>`,

  p1: () => `${hdr('About you · 1/3', 'home')}<main><div class="bar"><i style="width:33%"></i></div><label for="f-name">${t('name').toUpperCase()} *</label><input id="f-name" data-f="name" autocomplete="name" value="${h(F.form.name)}">${err('name')}<label for="f-dob">${t('dob').toUpperCase()} *</label><input id="f-dob" type="date" data-f="dob" value="${h(F.form.dob)}" max="${new Date().toISOString().slice(0, 10)}"><div class="mut" id="age">${F.form.dob ? 'Age: ' + age(F.form.dob) : ''}</div>${err('dob')}
<label for="f-mob">${t('mob').toUpperCase()} *</label><input id="f-mob" data-f="mob" inputmode="numeric" autocomplete="tel-national" maxlength="10" value="${h(F.form.mob)}">${err('mob')}<label for="f-lang">${t('pl').toUpperCase()}</label><select id="f-lang" data-f="lang">${['English', 'తెలుగు', 'हिन्दी'].map(o => `<option ${F.form.lang == o ? 'selected' : ''}>${o}</option>`).join('')}</select>
<label>CONSULTATION TYPE</label><div class="row">${['Palmistry', 'Astrology + Palmistry'].map(x => `<button class="chip ${(F.form.ct || 'Palmistry') == x ? 'on' : ''}" data-a="ct" data-v="${x}">${x}</button>`).join('')}</div><button class="pri" data-a="p1n" style="margin-top:12px">${t('cont')}</button></main>`,
  p2: () => { const fo = F.form, sel = (k, opts) => opts.map(o => `<option ${fo[k] == o ? 'selected' : ''}>${o}</option>`).join(''); return hdr('Birth details · 2/3', 'p1', F.bid) + `<main><div class="bar"><i style="width:66%"></i></div><label for="f-bp">BIRTHPLACE ${fo.ct && fo.ct != 'Palmistry' ? '*' : '(optional)'}</label><input id="f-bp" data-f="bp" value="${h(fo.bp)}">${err('bp')}<label for="f-bt">BIRTH TIME</label><input id="f-bt" type="time" data-f="bt" value="${h(fo.bt)}"><label for="f-ba">TIME ACCURACY</label><select id="f-ba" data-f="ba">${sel('ba', ['Known', 'Approximate', 'Unknown'])}</select><label for="f-city">CURRENT CITY</label><input id="f-city" data-f="city" value="${h(fo.city)}"><label for="f-cty">COUNTRY</label><input id="f-cty" data-f="cty" value="${h(fo.cty)}"><label for="f-gn">GENDER (optional)</label><select id="f-gn" data-f="gn">${sel('gn', ['', 'Female', 'Male', 'Other'])}</select><button class="pri" data-a="p2n" style="margin-top:12px">${t('cont')}</button></main>`; },
  p3: () => hdr('Questions · 3/3', 'p2', F.bid) + `<main><div class="bar"><i style="width:100%"></i></div><div class="row" style="flex-wrap:wrap">${CFG.topics.map(x => `<button class="chip ${F.q.includes(x) ? 'on' : ''}" data-a="q" data-v="${h(x)}" aria-pressed="${F.q.includes(x)}">${h(x)}</button>`).join('')}</div>${err('q')}<label for="f-note">${t('disc')}</label><textarea id="f-note" rows="5" data-f="note" maxlength="4000">${h(F.note)}</textarea><button class="pri" data-a="p3n">${t('cont')}</button></main>`,
  palm: () => {
    const n = ['Dominant hand – complete palm', 'Non-dominant hand – complete palm', 'Little-finger side – edge lines', 'Additional close-up (optional)'];
    const ph = i => V.cur.photos.find(p => p.idx === i);
    return hdr(t('up'), 'p3', F.bid) + `<main>${V.cur.flag?.type === 'returned' ? `<div class="demo">Guruji asked: ${h(V.cur.flag.reason)}</div>` : ''}<label>ARE YOU RIGHT-HANDED OR LEFT-HANDED? *</label><div class="row">${['Right-handed', 'Left-handed'].map(x => `<button class="chip grow ${F.hand == x ? 'on' : ''}" data-a="hand" data-v="${x}">${x}</button>`).join('')}</div>
${n.map((x, i) => { const p = ph(i); return `<div class="card"><div class="row sp"><h3>${i + 1}. ${x}</h3>${i < 3 ? '<span class="tag">Required</span>' : ''}</div><p class="mut">Open palm, fingers together, bright even light, no flash glare.</p><div class="up">${p ? `<img src="/api/photos/${p.id}" data-a="zoom" alt="Palm photo ${i + 1}">` : '🖐'}</div><div class="bar" style="margin:8px 0"><i id="pg${i}" style="width:${p ? 100 : 0}%"></i></div>
<div class="row"><input type="file" id="f${i}" accept="image/jpeg,image/png,image/webp,image/*" hidden data-a="file" data-v="${i}"><input type="file" id="c${i}" accept="image/*" capture="environment" hidden data-a="file" data-v="${i}">${p ? `<button class="sec grow" data-a="pick" data-v="f${i}">Retake</button><button class="dng" data-a="del" data-v="${i}">Delete</button>` : `<button class="pri grow" data-a="pick" data-v="f${i}">Upload</button><button class="sec" data-a="pick" data-v="c${i}">📷 Camera</button>`}</div></div>`; }).join('')}
<button class="pri" data-a="submit">${t('sub')}</button></main>`;
  },
  done: () => { const c = V.cur; return `<main style="display:grid;place-items:center;text-align:center"><div><div class="ring pop" style="background:var(--o);color:#fff;animation:none">✓</div><h2 style="margin:16px 0 8px">${t('done')}</h2><div class="card soft" style="text-align:left"><p>Booking ID: <b>${h(c.id)}</b></p><p>${dl(c.date)} • ${h(c.slot)}</p><p>Payment: ${h(c.payment?.id)}${c.payment?.provider === 'demo' ? ' (demo)' : ''}</p><p>Status: ${h(c.statusLabel)}</p></div><button class="pri" data-a="go" data-v="track" data-arg="${h(c.id)}" style="margin-top:14px">View booking status</button></div></main>`; },

  track: () => {
    const c = V.cur;
    return hdr('Booking status') + `<main>${c ? `<div class="card soft"><b>${h(c.id)}</b><p class="mut">${dl(c.date)} • ${h(c.slot)}${c.reviewer ? ' • ' + h(c.reviewer) : ''}</p></div>
${c.cancelled ? '<div class="demo">This booking was cancelled and refunded.</div>' : ''}${flagNote(c)}
${c.status <= 1 && c.editable ? `<button class="pri" data-a="go" data-v="p1" data-arg="${h(c.id)}">Complete your details</button>` : ''}
<div class="card">${ST().map((s, i) => `<div class="step ${i < c.status ? 'done' : i == c.status ? 'cur' : ''}"><div class="dot">${i < c.status ? '✓' : ''}</div><div><b>${s}</b></div></div>`).join('')}</div>
${c.status >= 3 && !c.cancelled ? `<button class="pri" data-a="go" data-v="consult" data-arg="${h(c.id)}">Join Guruji session</button>` : ''}${c.reportReady ? `<button class="sec" data-a="go" data-v="reports" style="width:100%">View report</button>` : ''}`
      : `<div class="card soft">No booking yet.</div><button class="pri" data-a="go" data-v="book">${t('book')}</button>`}</main>` + custNav();
  },
  consult: () => { const c = V.cur; return hdr('Guruji session', 'track', c.id) + `<main><p class="mut">${dl(c.date)} • ${h(c.slot)} • ${h(c.reviewer || 'Guruji')}</p>${chat(V.msgs, 'Namaste! Send Guruji a message here. Join the call at your appointment time.')}
<div class="row"><button class="sec grow" data-a="call" data-v="audio">📞 Audio call</button><button class="sec grow" data-a="call" data-v="video">🎥 Video call</button></div><p class="mut">Calls open in a secure Jitsi Meet room shared only with your Guruji.</p></main>`; },
  reports: () => {
    const list = V.list || [], ready = list.filter(b => b.reportReady), other = list.filter(b => !b.reportReady);
    return hdr(t('rep')) + `<main>${ready.length ? ready.map(c => `<div class="card"><h3>Palmistry Consultation Report</h3><p class="mut">${h(c.id)} • ${h(c.reviewer || 'Guruji')} • ${dl(c.date)}</p><div class="row" style="margin-top:8px"><button class="sec grow" data-a="prev" data-v="${h(c.id)}">Preview</button><a class="pri grow" style="text-align:center;padding:13px;border-radius:14px;text-decoration:none" href="/api/bookings/${encodeURIComponent(c.id)}/report.pdf" download>Download PDF</a></div></div>`).join('')
      : `<div class="card soft" style="text-align:center"><div style="font-size:40px" aria-hidden="true">▤</div>Reports appear here only after Guruji's approval.</div>`}
${other.length ? `<div class="card"><h3>Your bookings</h3>${other.map(b => `<p class="row sp"><span>${dl(b.date)} • ${h(b.slot)}<br><span class="mut">${h(b.id)} • ${b.cancelled ? 'Cancelled' : h(b.statusLabel)}</span></span><button class="out" data-a="go" data-v="track" data-arg="${h(b.id)}" style="min-height:34px;padding:6px 12px">Open</button></p>`).join('')}</div>` : ''}</main>` + custNav();
  },

  rhome: () => {
    const { mine, unassigned } = V.cases || { mine: [], unassigned: [] };
    const card = (c, claim) => `<div class="card row sp"><div><b>${h(c.name)}</b> • ${h(c.id)}<p class="mut">${h(c.statusLabel)} • ${dl(c.date)} ${h(c.slot)} • Age ${h(c.age ?? '—')}${c.flag ? ' • ' + h(c.flag.split(':')[0]) : ''}${!claim && c.reviewer && c.assignedTo !== String(ME.id) ? ' • ' + h(c.reviewer) : ''}</p></div><div class="row">${claim ? `<button class="out" data-a="claim" data-v="${h(c.id)}">Claim</button>` : ''}<button class="sec" data-a="go" data-v="rcase" data-arg="${h(c.id)}">Open</button></div></div>`;
    return staffBar('Guruji portal') + `<main><div class="grid">${[['Assigned', mine.length], ['Pending', mine.filter(c => c.status < 7).length], ['Completed', mine.filter(c => c.status >= 7).length], ['Unassigned', unassigned.length]].map(a => `<div class="card"><div class="big">${a[1]}</div>${a[0]}</div>`).join('')}</div>
<h2>Assigned cases</h2>${mine.length ? mine.map(c => card(c)).join('') : '<p class="mut">Nothing assigned to you yet.</p>'}
<h2>Unassigned</h2>${unassigned.length ? unassigned.map(c => card(c, true)).join('') : '<p class="mut">All caught up.</p>'}</main>`;
  },
  rcase: () => {
    const c = V.case, f = c.form, mine = c.assignedTo === String(ME.id);
    const kv = [['Customer', c.customer?.name || f.name], ['Age', c.age ?? '—'], ['DOB', f.dob], ['Mobile', f.mob || c.customer?.mobile], ['Email', c.customer?.email], ['Language', f.lang], ['Type', f.ct], ['Hand', c.hand], ['Birthplace', f.bp], ['Birth time', f.bt && `${f.bt} (${f.ba})`], ['City', [f.city, f.cty].filter(Boolean).join(', ')], ['Gender', f.gn], ['Topics', c.questions.join(', ')], ['Session', `${dl(c.date)} ${c.slot}`], ['Payment', `${c.payment?.id} • ${c.payment?.status}`]].filter(x => x[1]);
    return staffBar('Case ' + h(c.id), 'rhome') + `<main>${!c.assignedTo ? `<div class="demo">Unassigned — claim it to work on this case.</div><button class="pri" data-a="claim" data-v="${h(c.id)}">Claim case</button>` : !mine && ME.role !== 'admin' ? '<div class="demo">Assigned to another Guruji.</div>' : ''}
<div class="cols"><div>
<div class="card"><div class="row sp"><b>${h(c.customer?.name || f.name)}</b><span class="tag">${h(c.statusLabel)}</span></div>${c.flag ? `<p class="err">${h(c.flag.type)}: ${h(c.flag.reason)}</p>` : ''}<div class="kv" style="margin-top:8px">${kv.map(([k, v]) => `<b>${k}</b><span>${h(v)}</span>`).join('')}</div>${c.note ? `<p style="margin-top:8px"><b>Question:</b> ${h(c.note)}</p>` : ''}</div>
<h3 style="margin:14px 0 8px">Palm photos</h3><div class="photos4">${[0, 1, 2, 3].map(i => { const p = c.photos.find(x => x.idx === i); return p ? `<div class="up" style="font-size:28px"><img src="/api/photos/${p.id}" data-a="zoom" alt="Palm photo ${i + 1}"></div>` : i < 3 ? '<div class="up" style="font-size:28px">🖐</div>' : ''; }).join('')}</div>
<h3 style="margin:14px 0 8px">Messages</h3>${chat(V.msgs, 'No messages yet.')}
${c.meetUrl ? `<div class="row" style="margin-top:10px"><button class="sec grow" data-a="call" data-v="audio">📞 Audio call</button><button class="sec grow" data-a="call" data-v="video">🎥 Video call</button></div>` : ''}
</div><div>
<h3>Palm observation checklist</h3>${V.items.map(l => `<div class="row sp" style="margin:6px 0"><span>${l}</span><select style="width:auto" data-a="chk" data-v="${l}" aria-label="${l}">${V.vals.map(o => `<option ${(c.checklist[l] || '—') == o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`).join('')}
<label for="rn">NOTES & REPORT</label><textarea id="rn" rows="9" data-a="rn" placeholder="Observations and guidance — this text becomes the customer's report.">${h(c.reportNotes)}</textarea><p class="mut" id="saved">${c.reportPublishedAt ? 'Published ' + h(new Date(c.reportPublishedAt).toLocaleString()) : 'Auto-saved'}</p>
<div class="row" style="margin-top:8px"><button class="sec grow" data-a="act" data-v="schedule">Schedule</button><button class="sec grow" data-a="act" data-v="complete">Mark completed</button></div>
<div class="row" style="margin-top:8px"><button class="dng grow" data-a="act" data-v="return">Return</button><button class="dng grow" data-a="act" data-v="reject">Reject</button></div>
<button class="pri" data-a="act" data-v="approve" style="margin-top:8px">${c.status >= 7 ? 'Update published report' : 'Approve & publish'}</button>
</div></div></main>`;
  },

  ahome: () => staffBar('Admin portal') + `<main><div class="row" style="flex-wrap:wrap">${['Overview', 'Orders', 'Payments', 'Guruji team', 'Settings'].map(x => `<button class="chip ${S.tab == x ? 'on' : ''}" data-a="tab" data-v="${x}">${x}</button>`).join('')}</div>${adm()}</main>`,
};

function adm() {
  if (S.tab == 'Overview' && V.ov) return `<div class="grid">${[['₹' + V.ov.revenue.toLocaleString('en-IN'), 'Revenue'], [V.ov.orders, 'Orders'], [V.ov.unassigned, 'Unassigned'], [V.ov.awaitingDetails, 'Awaiting details'], [V.ov.reports, 'Reports published']].map(a => `<div class="card"><div class="big">${a[0]}</div>${a[1]}</div>`).join('')}</div>`;
  if (S.tab == 'Orders' && V.orders) return `<div style="overflow-x:auto"><table><tr><th>Case</th><th>Session</th><th>Status</th><th>Assign</th><th></th></tr>${V.orders.orders.map(c => `<tr><td>${h(c.id)}<br><span class="mut">${h(c.name)}</span></td><td>${dl(c.date)}<br><span class="mut">${h(c.slot)}</span></td><td>${c.cancelled ? 'Cancelled' : h(c.statusLabel)}${c.flag ? `<br><span class="mut">${h(c.flag.split(':')[0])}</span>` : ''}</td><td><select data-a="asg" data-v="${h(c.id)}" aria-label="Assign ${h(c.id)}" ${c.cancelled || c.status < 2 ? 'disabled' : ''}><option value="">Unassigned</option>${V.orders.reviewers.map(r => `<option value="${h(r.id)}" ${c.assignedTo == r.id ? 'selected' : ''}>${h(r.name)}</option>`).join('')}</select></td><td>${c.status >= 2 ? `<button class="out" data-a="go" data-v="rcase" data-arg="${h(c.id)}" style="min-height:34px;padding:6px 10px">Open</button>` : ''}</td></tr>`).join('')}</table></div>${V.orders.orders.length ? '' : '<p class="mut">No orders yet.</p>'}`;
  if (S.tab == 'Payments' && V.pays) return `<div style="overflow-x:auto"><table><tr><th>Payment</th><th>Booking</th><th>Amount</th><th>Status</th><th></th></tr>${V.pays.map(p => `<tr><td>${h(p.id)}<br><span class="mut">${h(p.provider)} • ${new Date(p.createdAt).toLocaleString()}</span></td><td>${h(p.bookingId)}<br><span class="mut">${h(p.customer)}</span></td><td>₹${p.amount}</td><td>${h(p.status)}${p.mihpayid ? `<br><span class="mut">${h(p.mihpayid)}</span>` : ''}</td><td>${p.status == 'paid' ? `<button class="dng" data-a="refund" data-v="${h(p.id)}" style="min-height:34px;padding:6px 10px">Refund</button>` : ''}</td></tr>`).join('')}</table></div>${V.pays.length ? '' : '<p class="mut">No payments yet.</p>'}`;
  if (S.tab == 'Guruji team' && V.staff) return V.staff.map(s => `<div class="card row sp"><div>${h(s.name)}<p class="mut">${h(s.email)} • ${s.role}</p></div><div class="row"><button class="out" data-a="pw" data-v="${h(s.id)}" style="min-height:34px;padding:6px 10px">Password</button><button class="${s.active ? 'sec' : 'out'}" data-a="active" data-v="${h(s.id)}" data-on="${s.active ? 1 : 0}">${s.active ? 'Active' : 'Inactive'}</button></div></div>`).join('') +
    `<div class="card"><h3>Add team member</h3><label for="ns-n">NAME</label><input id="ns-n"><label for="ns-e">EMAIL</label><input id="ns-e" type="email"><label for="ns-p">TEMPORARY PASSWORD (8+ CHARACTERS)</label><input id="ns-p" type="password" autocomplete="new-password"><label for="ns-r">ROLE</label><select id="ns-r"><option value="reviewer">Guruji / reviewer</option><option value="admin">Admin</option></select><button class="pri" data-a="addstaff" style="margin-top:12px">Add</button></div>`;
  if (S.tab == 'Settings' && V.settings) { const s = V.settings; return `<div class="card"><h3>Booking settings</h3>
<label for="st-price">PRICE (₹, INCL. GST)</label><input id="st-price" type="number" min="1" value="${s.price}"><label for="st-gst">GST %</label><input id="st-gst" type="number" min="0" max="50" value="${s.gstPercent}"><label for="st-dur">SESSION LENGTH (MIN)</label><input id="st-dur" type="number" value="${s.durationMin}">
<label for="st-days">BOOKABLE DAYS AHEAD</label><input id="st-days" type="number" min="1" max="60" value="${s.daysAhead}"><label for="st-slots">DAILY SLOTS (COMMA-SEPARATED)</label><input id="st-slots" value="${h(s.slots.join(', '))}"><label for="st-hold">UNPAID SLOT HOLD (MIN)</label><input id="st-hold" type="number" min="5" max="60" value="${s.holdMinutes}">
<button class="pri" data-a="savesettings" style="margin-top:12px">Save settings</button></div><div class="card"><h3>Integrations</h3><p class="mut">Payments: ${h(CFG.payments.mode)}${CFG.payments.env ? ' · ' + h(CFG.payments.env) : ''} · Google sign-in: ${CFG.googleClientId ? 'on' : 'off'} · Meet: ${h(CFG.meet?.provider || 'public')}</p><p class="mut">Configured through environment variables — see README.</p></div>`; }
  return '<div class="sk"></div>';
}

function render() {
  const sp = app.querySelector('#splash');
  app.className = ['rhome', 'rcase', 'ahome'].includes(S.screen) ? 'wide' : '';
  // On desktop, the logged-out login screen becomes a full-width landing page.
  const showLanding = (S.screen === 'login' || S.screen === 'staff-login') && !ME;
  document.body.classList.toggle('landing', showLanding);
  app.innerHTML = '<div id="toast" role="status" aria-live="polite"></div>' +
    (showLanding ? landingHtml() : '') + S_[S.screen]();
  if (sp) app.append(sp);
  const m = app.querySelector('main');
  if (m && !RM) m.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  document.documentElement.lang = S.l == 'te' ? 'te' : 'en';
  AFTER[S.screen]?.();
}

// Desktop landing — hidden on mobile via CSS. Content is purely marketing + nav;
// the real sign-in happens through the centered mobile shell below.
function landingHtml() {
  return `<div class="web-wrap">
    <header class="web-header">
      <div class="brand"><span aria-hidden="true">✦</span> GURUJI</div>
      <nav class="web-nav">
        <a href="#web-how">How it works</a>
        <a href="#web-topics">Topics</a>
        <a href="#web-testimonials">Reviews</a>
        <a href="#web-pricing">Pricing</a>
      </nav>
      <div class="web-actions">
        <button class="sec" data-a="scroll" data-v="web-signin">Sign in</button>
        <button class="pri" data-a="scroll" data-v="web-signin">Book a consultation</button>
      </div>
    </header>
    <section class="web-hero">
      <div>
        <span class="tagline">PALMISTRY • GUIDANCE</span>
        <h1>Personal palmistry consultation, with a real expert.</h1>
        <p class="lede">Book a 30-minute 1:1 session with Guruji. Share photos of your palm, ask what matters to you, and get a written report in English or Telugu.</p>
        <div class="hero-ctas">
          <button class="pri" data-a="scroll" data-v="web-signin">Book your consultation</button>
          <button class="out" data-a="scroll" data-v="web-how" style="width:auto;padding:14px 26px">How it works</button>
        </div>
        <div class="trust-row">
          <div><b>★ 4.9</b>Customer rating</div>
          <div><b>10,000+</b>Consultations</div>
          <div><b>2</b>English & Telugu</div>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">${palmSvg({ star: true, lineColor: '#FFC79A' })}</div>
    </section>

    <section class="web-section" id="web-how">
      <h2>How it works</h2>
      <p class="sub">Four simple steps between you and your reading.</p>
      <div class="steps-grid">
        <div class="step-tile"><div class="num">1</div><h3>Book a slot</h3><p>Pick a time that suits you. Secure payment through PayU.</p></div>
        <div class="step-tile"><div class="num">2</div><h3>Share details</h3><p>Your questions, your palm photos — stored privately.</p></div>
        <div class="step-tile"><div class="num">3</div><h3>Meet Guruji</h3><p>A 30-minute 1:1 session over chat and video.</p></div>
        <div class="step-tile"><div class="num">4</div><h3>Your report</h3><p>Guidance written for you, download as PDF.</p></div>
      </div>
    </section>

    <section class="web-section" id="web-topics">
      <h2>What people ask about</h2>
      <p class="sub">Every consultation is personal — these are the most common threads.</p>
      <div class="topic-grid">
        ${['Career & work', 'Business decisions', 'Marriage & relationships', 'Family life', 'Health & wellbeing', 'General guidance'].map(x => `<div class="topic-tile" data-a="scroll" data-v="web-signin">${x}</div>`).join('')}
      </div>
    </section>

    <section class="web-section" id="web-testimonials">
      <h2>What customers say</h2>
      <p class="sub">A few recent words from our consultations.</p>
      <div class="testimonial-grid">
        <div class="testimonial"><div class="stars">★★★★★</div><p>"Guruji was patient and spoke exactly to what I was going through at work. The report was a lovely surprise."</p><div class="who">— Ananya, Hyderabad</div></div>
        <div class="testimonial"><div class="stars">★★★★★</div><p>"The Telugu option meant my mother could sit with me during the session. We both felt heard."</p><div class="who">— Ravi, Vijayawada</div></div>
        <div class="testimonial"><div class="stars">★★★★★</div><p>"I didn't expect such thoughtful guidance in half an hour. The written report is something I keep coming back to."</p><div class="who">— Priya, Bengaluru</div></div>
      </div>
    </section>

    <section class="web-section" id="web-pricing">
      <div class="web-cta-banner">
        <h2>₹${CFG.price || 799} for a complete consultation</h2>
        <p>30 minutes with Guruji, a written report in your language, and photos stored privately.</p>
        <button class="pri" data-a="scroll" data-v="web-signin">Book your consultation</button>
      </div>
    </section>

    <div id="web-signin" class="web-section" style="padding-top:20px"></div>

    <footer class="web-footer">
      <div>© Guruji Palmistry · <a href="#" data-a="terms">Terms & Privacy</a> · <a href="#" data-a="help">Help</a></div>
      <div class="foot-staff"><a href="#/staff-login">Staff sign-in</a></div>
    </footer>
  </div>`;
}

// Palmistry palm — reused in both the splash and the hero art.
function palmSvg({ star, lineColor }) {
  const l = lineColor || '#FFC79A';
  return `<svg class="palm" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="pg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#FF6F00"/><stop offset="1" stop-color="#FF8A3A"/>
      </linearGradient>
    </defs>
    <!-- Palm outline: thumb on the left, four fingers above, wrist at the bottom -->
    <path class="outline" fill="none" stroke="url(#pg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M58,230 Q44,200 40,170 Q22,150 26,124 Q28,108 44,110 Q50,98 56,96 L62,54 Q64,42 76,42 Q88,42 90,54 L90,92 L100,92 L100,38 Q102,26 114,26 Q126,26 128,38 L128,92 L138,92 L138,50 Q140,38 152,38 Q164,38 166,52 L166,92 L174,92 L174,66 Q176,54 188,54 Q200,54 202,66 L202,106 Q206,140 196,180 Q190,210 180,230 Z"/>
    <!-- Three main palm lines + fate line -->
    <path class="line life"  fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M90,104 Q66,138 72,186 Q74,210 90,224"/>
    <path class="line heart" fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M60,124 Q104,118 150,122 Q174,124 186,132"/>
    <path class="line head"  fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M66,146 Q110,140 158,144 Q180,146 190,154"/>
    <path class="line fate"  fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M130,228 Q126,186 130,144 Q134,118 142,100"/>
    ${star ? '<text class="star" x="100" y="24" font-size="22" text-anchor="middle">✦</text>' : ''}
  </svg>`;
}
const AFTER = {
  login() { if (CFG.googleClientId) loadScript('https://accounts.google.com/gsi/client').then(() => {
    google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: r => api('POST', '/auth/google', { credential: r.credential }).then(d => afterLogin(d.user)).catch(e => toast(e.message)) });
    const el = $('#gbtn'); if (el) google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300 });
  }).catch(e => toast(e.message)); },
  consult: () => startChat(V.cur.id),
  rcase: () => startChat(V.case.id),
  palm() { if (!F.hand && !V.cur.hand) $('main').scrollTop = 0; },
};
function startChat(bid) {
  const box = $('#chat'); if (box) box.scrollTop = box.scrollHeight;
  poll = setInterval(() => refreshChat(bid).catch(() => {}), 4000);
}
async function refreshChat(bid) {
  const after = V.msgs.length ? V.msgs[V.msgs.length - 1].id : 0;
  const { messages } = await api('GET', `/bookings/${bid}/messages?after=${after}`);
  if (!messages.length) return;
  const box = $('#chat'); if (!box) return;
  if (!V.msgs.length) box.innerHTML = '';
  V.msgs.push(...messages);
  box.insertAdjacentHTML('beforeend', messages.map(msgHtml).join(''));
  box.scrollTop = box.scrollHeight;
}

async function prepImage(file) {
  if (!/^image\//.test(file.type)) throw new Error('Only image files allowed');
  if (file.size > 30e6) throw new Error('Image is too large');
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("Couldn't read this photo — please use JPG or PNG"); }
  const { width: w, height: hh } = bmp;
  if (Math.min(w, hh) < 300) throw new Error('Resolution too low — retake in better light');
  if (file.size <= 3e6 && Math.max(w, hh) <= 2600 && /jpeg|png|webp/.test(file.type)) return file;
  const k = Math.min(1, 2400 / Math.max(w, hh)), cv = document.createElement('canvas');
  cv.width = Math.round(w * k); cv.height = Math.round(hh * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
}
function uploadPhoto(bid, idx, blob, onp) {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(), fd = new FormData();
    fd.append('photo', blob, 'palm.jpg');
    x.open('POST', `/api/bookings/${encodeURIComponent(bid)}/photos/${idx}`);
    x.setRequestHeader('x-guruji', '1');
    x.upload.onprogress = e => e.lengthComputable && onp(e.loaded / e.total);
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} x.status < 300 ? res(d) : rej(new Error(d.error || 'Upload failed')); };
    x.onerror = () => rej(new Error('Network error — check your connection'));
    x.send(fd);
  });
}

const saveDetails = extra => api('PUT', `/bookings/${F.bid}/details`, { form: F.form, questions: F.q, note: F.note, hand: F.hand, ...extra });

// Submits a hidden form to PayU with the signed fields. This is a full-page redirect.
function postToPayU({ action, fields }) {
  const f = document.createElement('form');
  f.action = action; f.method = 'POST';
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.append(i);
  }
  document.body.append(f); f.submit();
}

const A = {
  go(e) { return go(e.dataset.v, e.dataset.arg); },
  close(e) { e.closest('.ov').remove(); },
  scroll(e) {
    // Scroll a landing-page anchor into view, then shift focus to the sign-in card
    // in the mobile shell at the bottom of the landing so form inputs get attention.
    const el = document.getElementById(e.dataset.v);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const btn = document.querySelector('main [data-a="emaillogin"], main [data-a="emailregister"]'); if (btn) btn.focus(); }, 500);
  },
  lang() { S.l = S.l == 'en' ? 'te' : 'en'; store.set('lang', S.l); render(); },
  terms() { sheet(`<h3>Terms & Privacy</h3><p class="mut" style="margin:8px 0">We use your details and palm photos only to prepare your consultation. Photos are visible only to you, your assigned Guruji and administrators. Readings are traditional guidance, not professional advice. Write to ${h(CFG.supportEmail)} to have your data deleted.</p>${closeBtn()}`); },
  help() { sheet(`<h3>Help & support</h3><p style="margin:8px 0">Email <a href="mailto:${h(CFG.supportEmail)}" style="color:var(--r)">${h(CFG.supportEmail)}</a></p>${closeBtn()}`); },

  devlogin() { sheet(`<div class="demo">DEV SIGN-IN — disable in production</div><label for="dn">NAME</label><input id="dn" autocomplete="name"><button class="pri" style="margin-top:12px" data-a="devlogin2">Sign in</button>`, 1); },
  async devlogin2() { const v = $('#dn').value.trim(); if (!v) return toast('Enter a name'); afterLogin((await api('POST', '/auth/dev', { name: v })).user); },

  emaillogin() { sheet(`<h3>Sign in</h3><label for="le">EMAIL</label><input id="le" type="email" autocomplete="email"><label for="lp">PASSWORD</label><input id="lp" type="password" autocomplete="current-password"><button class="pri" style="margin-top:12px" data-a="emailsignin">Sign in</button><p class="mut" style="margin-top:10px">Don't have an account? <button class="link" data-a="emailregister">Register</button></p>`, 1); },
  async emailsignin() { afterLogin((await api('POST', '/auth/login', { email: $('#le').value, password: $('#lp').value })).user); },

  emailregister() { document.querySelectorAll('.ov').forEach(o => o.remove()); sheet(`<h3>Create your account</h3><label for="rn">${t('name').toUpperCase()}</label><input id="rn" autocomplete="name"><label for="re">EMAIL</label><input id="re" type="email" autocomplete="email"><label for="rmo">${t('mob').toUpperCase()} (optional)</label><input id="rmo" inputmode="numeric" maxlength="10" autocomplete="tel-national"><label for="rp">PASSWORD (8+ CHARACTERS)</label><input id="rp" type="password" autocomplete="new-password"><button class="pri" style="margin-top:12px" data-a="dosignup">Create account</button><p class="mut" style="margin-top:10px">Already have one? <button class="link" data-a="emaillogin">Sign in</button></p>`, 1); },
  async dosignup() { afterLogin((await api('POST', '/auth/register', { name: $('#rn').value, email: $('#re').value, mobile: $('#rmo').value, password: $('#rp').value })).user); },

  staff(e) { sheet(`<h3>${h(e.dataset.v)}</h3><label for="se">EMAIL</label><input id="se" type="email" autocomplete="username"><label for="sp">PASSWORD</label><input id="sp" type="password" autocomplete="current-password"><button class="pri" style="margin-top:12px" data-a="stafflogin">Sign in</button>`, 1); },
  async stafflogin() { afterLogin((await api('POST', '/auth/staff', { email: $('#se').value, password: $('#sp').value })).user); },
  async logout() { await api('POST', '/auth/logout'); ME = null; F = { bid: null }; go('login'); },

  async saveprofile() { ME = (await api('PUT', '/auth/profile', { name: $('#pn').value, mobile: $('#pm').value })).user; toast('Profile saved'); render(); },
  async changepw() { await api('POST', '/auth/password/change', { current: $('#pcu').value, next: $('#pcn').value }); $('#pcu').value = ''; $('#pcn').value = ''; toast('Password updated'); },

  date(e) { S.di = +e.dataset.v; S.slot = null; render(); },
  slot(e) { S.slot = e.dataset.v; render(); },
  async topay() {
    const d = V.days[S.di];
    try {
      const r = await api('POST', '/bookings', { date: d.date, slot: S.slot });
      PAYS[r.booking.id] = r.payment; S.slot = null;
      go('pay', r.booking.id);
    } catch (e) { if (e.status === 409) { S.slot = null; await load(); } throw e; }
  },
  fl(e) { S.fail = e.checked; },
  async dopay() {
    const bid = V.cur.id;
    if (CFG.payments.mode === 'demo') {
      await go('paying');
      await new Promise(r => setTimeout(r, 1200));
      const r = await api('POST', '/payments/demo', { bookingId: bid, fail: !!S.fail });
      return go(r.ok ? 'paid' : 'failed', bid);
    }
    if (CFG.payments.mode === 'payu') {
      const p = PAYS[bid];
      if (!p?.action) { toast('This checkout expired — please pick your slot again'); return go('book'); }
      return postToPayU(p);
    }
    toast('Payments are not configured');
  },

  ct(e) { F.form.ct = e.dataset.v; render(); },
  async p1n() {
    let ok = 1; const f = F.form, E = (k, m) => { $('#e-' + k).textContent = m; ok = 0; };
    ['name', 'dob', 'mob'].forEach(k => $('#e-' + k).textContent = '');
    if (!f.name || f.name.trim().length < 2) E('name', 'Enter your full name');
    if (!f.dob) E('dob', 'Select your date of birth');
    if (!/^[6-9]\d{9}$/.test(f.mob || '')) E('mob', 'Enter a valid 10-digit mobile number');
    if (!f.ct) f.ct = 'Palmistry';
    if (!ok) return toast('Please fix the highlighted fields');
    await saveDetails();
    if (!ME.name) { ME = (await api('PUT', '/auth/profile', { name: f.name.trim() })).user; }
    go('p2', F.bid);
  },
  async p2n() { if (F.form.ct != 'Palmistry' && !F.form.bp) { $('#e-bp').textContent = 'Birthplace is needed for astrology'; return; } await saveDetails(); go('p3', F.bid); },
  q(e) { const v = e.dataset.v; F.q = F.q.includes(v) ? F.q.filter(x => x != v) : [...F.q, v]; render(); },
  async p3n() { if (!F.q.length) { $('#e-q').textContent = 'Choose at least one topic'; return; } await saveDetails(); go('palm', F.bid); },
  hand(e) { F.hand = e.dataset.v; render(); },
  pick(e) { $('#' + e.dataset.v).click(); },
  async file(e) {
    const f = e.files[0], i = +e.dataset.v; e.value = '';
    if (!f) return;
    const blob = await prepImage(f);
    const bar = $('#pg' + i); bar.style.width = '2%';
    const r = await uploadPhoto(F.bid, i, blob, p => { bar.style.width = Math.max(2, p * 100) + '%'; });
    V.cur = r.booking; render(); toast('Photo uploaded');
  },
  async del(e) { V.cur = (await api('DELETE', `/bookings/${F.bid}/photos/${e.dataset.v}`)).booking; render(); toast('Photo deleted'); },
  zoom(e) {
    const o = sheet(`<img src="${h(e.src)}" style="width:100%;transition:transform .2s;transform-origin:center" alt="Zoomed palm photo"><div class="row" style="margin-top:8px"><button class="sec grow" data-a="zin">Zoom +</button><button class="sec grow" data-a="zout">Reset</button><button class="pri grow" data-a="close">Close</button></div>`);
    o.firstChild.style.overflow = 'auto';
  },
  zin(e) { e.closest('.ov').querySelector('img').style.transform = 'scale(1.8)'; },
  zout(e) { e.closest('.ov').querySelector('img').style.transform = 'scale(1)'; },
  async submit() {
    if (!F.hand) return toast('Select right- or left-handed');
    if (![0, 1, 2].every(i => V.cur.photos.some(p => p.idx === i))) return toast('Upload the 3 required photos');
    await saveDetails();
    await api('POST', `/bookings/${F.bid}/submit`);
    const bid = F.bid; F = { bid: null };
    go('done', bid);
  },

  async send() {
    const i = $('#cm'), v = i.value.trim(); if (!v) return;
    const bid = V.cur?.id || V.case?.id;
    await api('POST', `/bookings/${bid}/messages`, { body: v });
    i.value = ''; await refreshChat(bid); i.focus();
  },
  call(e) {
    const c = V.cur || V.case;
    if (!c.meetUrl) return toast('Calls open once a Guruji is assigned');
    const url = c.meetUrl + (e.dataset.v === 'audio' ? '#config.startWithVideoMuted=true' : '') + `${e.dataset.v === 'audio' ? '&' : '#'}userInfo.displayName=${encodeURIComponent('"' + (ME.name || 'Guest') + '"')}`;
    window.open(url, '_blank', 'noopener');
  },
  async prev(e) {
    const r = await api('GET', `/bookings/${encodeURIComponent(e.dataset.v)}/report`);
    const obs = Object.entries(r.checklist).filter(([, v]) => v && v !== '—');
    sheet(`<h3>Palmistry Consultation Report</h3><p class="mut">${h(r.id)} • ${h(r.reviewer)}</p>${obs.length ? `<div class="kv" style="margin:10px 0">${obs.map(([k, v]) => `<b>${h(k)}</b><span>${h(v)}</span>`).join('')}</div>` : ''}<p style="margin:8px 0;white-space:pre-wrap">${h(r.notes)}</p>${closeBtn()}`);
  },

  async claim(e) { await api('POST', `/staff/cases/${encodeURIComponent(e.dataset.v)}/claim`); toast('Case claimed'); go('rcase', e.dataset.v); },
  async chk(e) { await api('PUT', `/staff/cases/${V.case.id}`, { checklist: { [e.dataset.v]: e.value } }); V.case.checklist[e.dataset.v] = e.value; },
  rn(e) { V.case.reportNotes = e.value; $('#saved').textContent = 'Saving…'; clearTimeout(A._rn); A._rn = setTimeout(() => saveNotes().catch(x => toast(x.message)), 700); },
  async act(e) {
    const a = e.dataset.v;
    if (a === 'return' || a === 'reject') {
      sheet(`<h3>${a === 'return' ? 'Return to customer' : 'Reject case'}</h3><label for="why">${a === 'return' ? 'WHAT SHOULD THEY FIX?' : 'REASON'}</label><textarea id="why" rows="3">${a === 'return' ? 'Please upload clearer palm photos in bright, even light.' : ''}</textarea><button class="${a === 'return' ? 'pri' : 'dng'}" data-a="act2" data-v="${a}" style="margin-top:12px;width:100%">${a === 'return' ? 'Return' : 'Reject'}</button>`, 1);
      return;
    }
    if (a === 'approve') { clearTimeout(A._rn); await saveNotes(); }
    await doAction(a);
  },
  async act2(e) { const why = $('#why').value; e.closest('.ov').remove(); await doAction(e.dataset.v, why); },

  tab(e) { S.tab = e.dataset.v; load(); },
  async asg(e) { await api('PUT', `/admin/orders/${encodeURIComponent(e.dataset.v)}/assign`, { reviewerId: e.value || null }); toast(e.value ? 'Assigned to ' + e.selectedOptions[0].text : 'Unassigned'); load(); },
  refund(e) { sheet(`<h3>Refund ${h(e.dataset.v)}?</h3><p class="mut" style="margin:8px 0">The booking is cancelled. For PayU, this records the refund request — actual refund happens through PayU settlement.</p><button class="dng" data-a="refund2" data-v="${h(e.dataset.v)}" style="width:100%">Refund</button>`, 1); },
  async refund2(e) { e.closest('.ov').remove(); await api('POST', `/admin/payments/${encodeURIComponent(e.dataset.v)}/refund`); toast('Refund recorded'); load(); },
  async active(e) { await api('PUT', `/admin/staff/${e.dataset.v}`, { active: e.dataset.on !== '1' }); load(); },
  pw(e) { sheet(`<h3>Set new password</h3><label for="npw">PASSWORD (8+ CHARACTERS)</label><input id="npw" type="password" autocomplete="new-password"><button class="pri" data-a="pw2" data-v="${h(e.dataset.v)}" style="margin-top:12px">Save</button>`, 1); },
  async pw2(e) { await api('PUT', `/admin/staff/${e.dataset.v}`, { password: $('#npw').value }); e.closest('.ov').remove(); toast('Password updated'); },
  async addstaff() { await api('POST', '/admin/staff', { name: $('#ns-n').value.trim(), email: $('#ns-e').value.trim(), password: $('#ns-p').value, role: $('#ns-r').value }); toast('Team member added'); load(); },
  async savesettings() {
    const v = id => $('#' + id).value;
    await api('PUT', '/admin/settings', { price: v('st-price'), gstPercent: v('st-gst'), durationMin: v('st-dur'), daysAhead: v('st-days'), slots: v('st-slots'), holdMinutes: v('st-hold') });
    CFG = await api('GET', '/config'); toast('Settings saved'); load();
  },
};
async function saveNotes() { await api('PUT', `/staff/cases/${V.case.id}`, { reportNotes: V.case.reportNotes }); const s = $('#saved'); if (s) s.textContent = 'Saved'; }
async function doAction(a, reason) {
  await api('POST', `/staff/cases/${V.case.id}/action`, { action: a, reason });
  toast({ schedule: 'Appointment scheduled', complete: 'Marked completed', return: 'Returned to customer', reject: 'Case rejected', approve: 'Approved — report published' }[a]);
  load();
}
function afterLogin(u) { ME = u; document.querySelectorAll('.ov').forEach(o => o.remove()); go(homeFor(u)); }

async function run(name, el, ev) {
  if (!A[name]) return;
  const btn = el.tagName === 'BUTTON' ? el : null;
  if (btn?.classList.contains('busy')) return;
  btn?.classList.add('busy');
  try { await A[name](el, ev); }
  catch (e) { if (e.status === 401) { ME = null; toast('Please sign in again'); go('login'); } else toast(e.message); }
  finally { btn?.classList.remove('busy'); }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName == 'SELECT' || el.tagName == 'TEXTAREA' || (el.tagName == 'INPUT' && el.type != 'checkbox')) return;
  if (el.tagName == 'A') e.preventDefault();
  run(el.dataset.a, el, e);
});
document.addEventListener('change', e => { const el = e.target; if (el.dataset.a && ['SELECT', 'INPUT'].includes(el.tagName) && el.type != 'checkbox') run(el.dataset.a, el, e); });
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.f) {
    if (el.dataset.f === 'note') F.note = el.value; else F.form[el.dataset.f] = el.value;
    if (el.dataset.f == 'dob') $('#age').textContent = 'Age: ' + age(el.value);
  }
  if (el.dataset.a == 'rn') A.rn(el);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'cm') { e.preventDefault(); run('send', e.target); }
  if (e.key === 'Enter' && e.target.closest('.ov') && e.target.tagName === 'INPUT') { const b = e.target.closest('.ov').querySelector('button[data-a]:not([data-a=close])'); if (b) b.click(); }
  if (e.key === 'Escape') document.querySelector('.ov:last-of-type')?.remove();
});

const SPLASH_MSGS = {
  en: ['Tracing the lines of destiny…', 'Reading your lifeline…', 'Consulting the stars…', 'Preparing your consultation…'],
  te: ['విధి రేఖలను చదువుతున్నాం…', 'జీవన రేఖను చూస్తున్నాం…', 'నక్షత్రాలతో సంప్రదింపు…', 'మీ కన్సల్టేషన్‌ను సిద్ధం చేస్తున్నాం…'],
};
function splash() {
  try { if (sessionStorage.getItem('gjIntro')) return; } catch {}
  const sp = document.createElement('div'); sp.id = 'splash';
  sp.innerHTML = `<div class="glow"></div><div class="palm-wrap">${palmSvg({ star: true, lineColor: '#FFC79A' })}</div><b>GURUJI</b><small id="splash-msg"></small><button id="sk">Skip</button>`;
  app.append(sp);
  const msgs = SPLASH_MSGS[S.l] || SPLASH_MSGS.en;
  const msgEl = sp.querySelector('#splash-msg');
  let mi = 0;
  msgEl.textContent = msgs[0];
  const cycler = setInterval(() => {
    mi = (mi + 1) % msgs.length;
    msgEl.classList.remove('swap'); void msgEl.offsetWidth;    // restart animation
    msgEl.classList.add('swap');
    msgEl.textContent = msgs[mi];
  }, 1300);
  let done = 0;
  const end = () => {
    if (done) return; done = 1;
    clearInterval(cycler);
    try { sessionStorage.setItem('gjIntro', 1); } catch {}
    sp.style.opacity = 0;
    setTimeout(() => sp.remove(), 600);
  };
  setTimeout(end, 4500);
  sp.querySelector('#sk').onclick = end;
}
(async function boot() {
  try { [CFG, ME] = await Promise.all([api('GET', '/config'), api('GET', '/auth/me').then(r => r.user)]); }
  catch { app.innerHTML = '<main style="display:grid;place-items:center;text-align:center"><div><h2>Can\'t reach Guruji right now</h2><p class="mut">Check your connection and reload.</p></div></main>'; return; }
  parseHash();
  if (!S.screen) S.screen = homeFor(ME);
  await load();
  splash();
})();
