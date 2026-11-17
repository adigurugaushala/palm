'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicPage } from '@/components/SiteChrome';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { beginOrderPayment, money } from '@/lib/checkout';

export default function Donate() {
  const { me } = useApp();
  const router = useRouter();
  const run = useAction();
  const [opts, setOpts] = useState(null);
  const [amount, setAmount] = useState(501);
  const [custom, setCustom] = useState('');
  const [purpose, setPurpose] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('GET', '/donations/options').then(o => { setOpts(o); setPurpose(o.purposes[0]); }).catch(() => setOpts({ purposes: [], presets: [], min: 11, max: 500000 }));
  }, []);
  if (!opts) return <PublicPage><Loader /></PublicPage>;

  const value = custom ? Math.round(Number(custom)) : amount;
  const valid = value >= opts.min && value <= opts.max;

  const give = async () => {
    setErr('');
    if (!valid) return setErr(`Enter an amount between ${money(opts.min)} and ${money(opts.max)}`);
    setBusy(true);
    const r = await run(() => api('POST', '/orders', { kind: 'donation', amount: value, purpose, anonymous, donorName }));
    setBusy(false);
    if (r) beginOrderPayment(r.payment, r.order.id, router);
  };

  return (
    <PublicPage>
      <section className="page-hero">
        <div className="container prose">
          <span className="eyebrow on-ivory">Donations</span>
          <h1>Support Guruji&rsquo;s work</h1>
          <p>Your donation supports the community programmes Guruji runs. Choose an amount and a purpose, then pay securely through PayU. You receive a receipt in your account.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container layout-2">
          <div className="card" style={{ display: 'grid', gap: 18 }}>
            <div>
              <span className="label">Amount</span>
              <div className="chips" role="group" aria-label="Preset amounts" style={{ marginTop: 10 }}>
                {opts.presets.map(p => (
                  <button key={p} type="button" className="chip" aria-pressed={!custom && amount === p} onClick={() => { setAmount(p); setCustom(''); }}>{money(p)}</button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="cu">Or enter another amount (₹)</label>
                <input id="cu" className="input" inputMode="numeric" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ''))} placeholder={`${money(opts.min)} to ${money(opts.max)}`} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pu">Purpose</label>
              <select id="pu" className="input" value={purpose} onChange={e => setPurpose(e.target.value)}>
                {opts.purposes.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            {me?.role === 'customer' ? (
              <>
                <div className="field"><label htmlFor="dn">Name for the receipt</label><input id="dn" className="input" value={donorName} onChange={e => setDonorName(e.target.value)} maxLength={80} placeholder={me.name} /></div>
                <label className="check-line"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} /> Show my donation as anonymous</label>
              </>
            ) : null}
            {err && <p className="err" role="alert">{err}</p>}
            {me?.role === 'customer' ? (
              <button className={`btn block ${busy ? 'busy' : ''}`} disabled={!valid || busy} onClick={give}>Donate {valid ? money(value) : ''}<Icon name="arrowRight" /></button>
            ) : (
              <Link className="btn block" href={`/login?next=${encodeURIComponent('/donate')}`}>Sign in to donate</Link>
            )}
          </div>
          <aside className="side">
            <div className="card soft">
              <h3>How your donation is used</h3>
              <p className="muted">Funds go to the programme you choose. Guruji&rsquo;s team keeps a record of every donation, and you can see your receipts under Learning &amp; orders.</p>
              <p className="muted small" style={{ marginTop: 10 }}>Questions? <Link className="link" href="/help">Help &amp; support</Link></p>
            </div>
          </aside>
        </div>
      </section>
    </PublicPage>
  );
}
