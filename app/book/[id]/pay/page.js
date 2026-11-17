'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import { BookingStepper } from '@/components/Portal';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDayLong, inr } from '@/lib/format';

const key = id => 'gj:pay:' + id;
const readPay = id => { try { return JSON.parse(sessionStorage.getItem(key(id))); } catch { return null; } };
const writePay = (id, p) => { try { sessionStorage.setItem(key(id), JSON.stringify(p)); } catch {} };

// Build and submit a form to PayU's hosted checkout (a full-page redirect).
function postToPayU({ action, fields }) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

function Pay() {
  const { id } = useParams();
  const { cfg } = useApp();
  const router = useRouter();
  const run = useAction();
  const [b, setB] = useState(null);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('GET', `/bookings/${id}`).then(r => {
      if (r.booking.status >= 0) router.replace(`/book/${id}/paid`);
      else setB(r.booking);
    }).catch(() => router.replace('/book'));
  }, [id, router]);

  if (!b) return <Loader />;
  const mode = cfg.payments?.mode;

  const pay = async () => {
    setBusy(true);
    // Reuse the signed checkout from booking creation once; any retry gets a fresh PayU txnid.
    let p = readPay(id);
    if (!p || p.used || p.mode !== mode) {
      const r = await run(() => api('POST', `/bookings/${id}/pay`));
      if (!r) { setBusy(false); return; }
      p = r.payment;
    }
    writePay(id, { ...p, used: true });
    if (mode === 'payu') return postToPayU(p);
    const r = await run(() => api('POST', '/payments/demo', { bookingId: id, fail }));
    setBusy(false);
    if (r) router.push(`/book/${id}/${r.ok ? 'paid' : 'failed'}`);
  };

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Booking {b.id}</span><h1>Payment</h1></div></div>
      <BookingStepper step={1} />
      <div className="layout-2">
        <section className="card">
          <div className="card-title"><h3>Secure checkout</h3><span className="badge gold">PayU</span></div>
          {mode === 'demo' && <div className="notice warn" style={{ marginBottom: 18 }}><Icon name="alert" />Demo mode — PayU keys are not configured, so no money moves. This mode is disabled in production.</div>}
          {mode === 'payu' && cfg.payments.env !== 'live' && <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" />PayU test environment — use PayU&rsquo;s published test cards or UPI handles.</div>}
          <p>You&rsquo;ll be taken to PayU&rsquo;s secure page to pay by UPI, card, net banking or wallet. Guruji never sees your card or bank details. When payment is confirmed by PayU you&rsquo;ll return here automatically.</p>
          <div className="row wrap" style={{ gap: 20, margin: '20px 0 4px' }}>
            <span className="row small"><Icon name="lock" size={18} />Encrypted by PayU</span>
            <span className="row small"><Icon name="shield" size={18} />Verified on our server</span>
            <span className="row small"><Icon name="clock" size={18} />Time held while you pay</span>
          </div>
          {mode === 'demo' && (
            <label className="row small" style={{ marginTop: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)} /> Simulate a failed payment
            </label>
          )}
          {mode === 'off' && <div className="notice bad" style={{ marginTop: 16 }}><Icon name="alert" />Payments are not available right now. Please try again later.</div>}
          <div className="form-foot">
            <Link href="/book" className="btn ghost"><Icon name="arrowLeft" />Change time</Link>
            <button className={`btn ${busy ? 'busy' : ''}`} onClick={pay} disabled={mode === 'off'}>Pay {inr(b.amount)} securely<Icon name="arrowRight" /></button>
          </div>
        </section>
        <aside className="side">
          <div className="card summary">
            <h3>Summary</h3>
            <div className="line"><span>Date</span><span>{fmtDayLong(b.date)}</span></div>
            <div className="line"><span>Time</span><span>{b.slot}</span></div>
            <div className="line"><span>Consultation</span><span>{inr(cfg.base)}</span></div>
            <div className="line"><span>GST ({cfg.gstPercent}%)</span><span>{inr(cfg.gst)}</span></div>
            <div className="total"><span>Total</span><b>{inr(b.amount)}</b></div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Pay /></CustomerShell>;
}
