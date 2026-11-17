'use client';
import { useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction } from '@/components/Providers';
import { api } from '@/lib/api';

function Profile() {
  const { me, setMe, t, lang, setLang } = useApp();
  const run = useAction();
  const [name, setName] = useState(me.name || '');
  const [mobile, setMobile] = useState(me.mobile || '');
  const [cur, setCur] = useState('');
  const [nxt, setNxt] = useState('');
  const [busy, setBusy] = useState('');

  const save = async e => {
    e.preventDefault();
    setBusy('p');
    const r = await run(() => api('PUT', '/auth/profile', { name, mobile }), 'Profile saved');
    setBusy('');
    if (r) setMe(r.user);
  };
  const change = async e => {
    e.preventDefault();
    if (nxt.length < 8) return run(async () => { throw new Error('New password must be at least 8 characters'); });
    setBusy('w');
    const r = await run(() => api('POST', '/auth/password/change', { current: cur, next: nxt }), 'Password updated');
    setBusy('');
    if (r) { setCur(''); setNxt(''); }
  };

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Your account</span><h1>{t('profile')}</h1></div></div>
      <div className="layout-2">
        <form className="card" onSubmit={save}>
          <div className="card-title"><h3>Personal details</h3></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="pn">{t('name')}</label><input id="pn" className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div>
            <div className="field"><label htmlFor="pm">{t('mob')}</label><input id="pm" className="input" value={mobile} onChange={e => setMobile(e.target.value)} inputMode="numeric" maxLength={10} /></div>
            <div className="field"><span className="label">Email</span><input className="input" value={me.email || ''} disabled /><span className="hint">Your sign-in email cannot be changed here.</span></div>
            <div className="field"><span className="label">Language</span>
              <div className="segmented"><button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button><button type="button" aria-pressed={lang === 'te'} onClick={() => setLang('te')}>తెలుగు</button></div>
            </div>
          </div>
          <div className="form-foot"><span /><button className={`btn ${busy === 'p' ? 'busy' : ''}`} type="submit">Save changes</button></div>
        </form>
        <aside className="side">
          <form className="card" onSubmit={change}>
            <div className="card-title"><h3>Password</h3></div>
            <div className="field"><label htmlFor="pc">Current password</label><input id="pc" className="input" type="password" value={cur} onChange={e => setCur(e.target.value)} autoComplete="current-password" /><span className="hint">Leave empty if you have only ever used Google sign-in.</span></div>
            <div className="field"><label htmlFor="pnw">New password</label><input id="pnw" className="input" type="password" value={nxt} onChange={e => setNxt(e.target.value)} autoComplete="new-password" /></div>
            <button className={`btn outline block ${busy === 'w' ? 'busy' : ''}`} style={{ marginTop: 18 }} type="submit">Update password</button>
          </form>
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Profile /></CustomerShell>;
}
