'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { money } from '@/lib/checkout';

// Demo checkout only (no PayU keys, non-production). With PayU configured, this page is never used.
export default function Page() {
  return <CustomerShell><Pay /></CustomerShell>;
}

function Pay() {
  const { id } = useParams();
  const { cfg } = useApp();
  const router = useRouter();
  const run = useAction();
  const [o, setO] = useState(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('GET', `/orders/${id}`).then(r => { setO(r.order); if (r.order.status === 'paid') router.replace(`/orders/${id}/paid`); }).catch(() => setO(null)); }, [id, router]);

  if (o === undefined) return <Loader />;
  if (!o) return <div className="empty"><Icon name="info" /><p>We could not find that order.</p></div>;

  const pay = async fail => {
    setBusy(true);
    const r = await run(() => api('POST', `/orders/${id}/demo-pay`, { fail }));
    setBusy(false);
    if (r) router.replace(r.ok ? `/orders/${id}/paid` : `/orders/${id}/failed`);
  };

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Checkout</span><h1>{o.title}</h1></div></div>
      <div className="layout-2">
        <section className="card summary">
          <h3>Order {o.id}</h3>
          <div className="total"><span>Total</span><b>{money(o.amount)}</b></div>
          {cfg.payments?.mode !== 'demo' ? (
            <p className="muted" style={{ marginTop: 14 }}>Payments are not configured on this server.</p>
          ) : (
            <>
              <div className="demo-note"><Icon name="info" />Demo payment. No money moves.</div>
              <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 14 }} onClick={() => pay(false)}>Pay {money(o.amount)} (demo)</button>
              <button className="btn outline block" style={{ marginTop: 10 }} onClick={() => pay(true)}>Simulate a failed payment</button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
