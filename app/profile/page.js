'use client';
import { useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction } from '@/components/Providers';
import { api, uploadWithProgress } from '@/lib/api';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX = 2 * 1024 * 1024;

function PhotoCard() {
  const { me, setMe } = useApp();
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setMsg('');
    if (!PHOTO_TYPES.includes(file.type)) return setErr('Use a JPG, PNG or WebP photo.');
    if (file.size > PHOTO_MAX) return setErr('The photo must be 2 MB or smaller.');
    const fd = new FormData();
    fd.append('photo', file);
    setBusy(true); setPct(0);
    try {
      const r = await uploadWithProgress('/me/avatar', fd, setPct);
      setMe({ ...me, avatarUrl: r.avatarUrl });
      setMsg('Profile photo updated.');
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const remove = async () => {
    setErr(''); setMsg('');
    try {
      const r = await api('DELETE', '/me/avatar');
      setMe({ ...me, avatarUrl: r.avatarUrl });
      setMsg('Profile photo removed.');
    } catch (ex) { setErr(ex.message); }
  };
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-title"><h3>Profile photo</h3></div>
      <div className="row wrap" style={{ alignItems: 'center', gap: 18 }}>
        <Avatar src={me.avatarUrl} name={me.name} size={88} />
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <p className="muted small" style={{ margin: 0 }}>JPG, PNG or WebP, up to 2 MB. Location and device details are removed when the photo is saved.</p>
          <div className="row wrap" style={{ gap: 10 }}>
            <label className="btn outline sm" style={{ position: 'relative', cursor: busy ? 'progress' : 'pointer' }}>
              <Icon name="camera" />{busy ? `Uploading ${pct}%` : me.avatarUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={busy} aria-label="Choose a profile photo"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'inherit' }} />
            </label>
            {me.avatarUrl && <button type="button" className="btn ghost sm" onClick={remove} disabled={busy}>Remove photo</button>}
          </div>
          {err && <p className="notice bad" role="alert" style={{ margin: 0 }}>{err}</p>}
          {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
        </div>
      </div>
    </section>
  );
}

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
      <PhotoCard />
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
