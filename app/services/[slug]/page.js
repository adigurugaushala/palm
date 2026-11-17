'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicPage } from '@/components/SiteChrome';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { beginOrderPayment, money } from '@/lib/checkout';

function Service() {
  const { slug } = useParams();
  const { me } = useApp();
  const router = useRouter();
  const run = useAction();
  const [p, setP] = useState(undefined);
  const [f, setF] = useState({ name: '', mobile: '', preferred: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api('GET', `/catalog/${slug}`).then(r => setP(r.product)).catch(() => setP(null)); }, [slug]);
  useEffect(() => { if (me) setF(x => ({ ...x, name: x.name || me.name || '', mobile: x.mobile || me.mobile || '' })); }, [me]);

  if (p === undefined) return <Loader />;
  if (p === null) return <div className="empty"><Icon name="info" /><p>This service is not available.</p><Link className="btn outline sm" href="/services">All services</Link></div>;

  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (!/^[6-9]\d{9}$/.test(f.mobile.replace(/\s+/g, ''))) return setErr('Enter a valid 10-digit mobile number');
    setBusy(true);
    const r = await run(() => api('POST', '/orders', { kind: 'service', slug, form: f }));
    setBusy(false);
    if (r) beginOrderPayment(r.payment, r.order.id, router);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container prose">
          <Link href="/services" className="back-link"><Icon name="arrowLeft" />All services</Link>
          <span className="eyebrow on-ivory" style={{ display: 'block', marginTop: 14 }}>{p.durationText}</span>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container layout-2">
          <div className="prose">
            {p.description && <p>{p.description}</p>}
            {p.outcomes?.length > 0 && (<><h2>What is included</h2><ul className="checks">{p.outcomes.map(o => <li key={o}><Icon name="check" size={16} strokeWidth={2} />{o}</li>)}</ul></>)}
          </div>
          <aside className="side">
            {me?.role === 'customer' ? (
              <form className="card summary" onSubmit={submit} noValidate>
                <h3>Request this service</h3>
                <div className="field"><label htmlFor="sn">Full name</label><input id="sn" className="input" value={f.name} onChange={set('name')} required maxLength={80} /></div>
                <div className="field"><label htmlFor="sm">Mobile number</label><input id="sm" className="input" inputMode="numeric" value={f.mobile} onChange={set('mobile')} required /></div>
                <div className="field"><label htmlFor="sp">Preferred days or times</label><input id="sp" className="input" value={f.preferred} onChange={set('preferred')} maxLength={120} placeholder="e.g. weekday evenings" /></div>
                <div className="field"><label htmlFor="sx">What would you like help with?</label><textarea id="sx" className="input" rows={4} value={f.notes} onChange={set('notes')} maxLength={1000} /></div>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="total"><span>Service fee</span><b>{money(p.price)}</b></div>
                <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 14 }} type="submit">Continue to payment<Icon name="arrowRight" /></button>
              </form>
            ) : (
              <div className="card summary">
                <h3>{money(p.price)}</h3>
                <p className="muted">Sign in to request this service. You will pay securely through PayU.</p>
                <Link className="btn block" style={{ marginTop: 14 }} href={`/login?next=${encodeURIComponent(`/services/${slug}`)}`}>Sign in to request</Link>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return <PublicPage><Service /></PublicPage>;
}
