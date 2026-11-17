'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { money } from '@/lib/checkout';
import { fmtStamp } from '@/lib/format';
import { STATUS_LABEL, FULFIL_LABEL } from '@/components/Commerce';

export default function Page() {
  return <CustomerShell><Learning /></CustomerShell>;
}

function Learning() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api('GET', '/orders').then(r => setOrders(r.orders)).catch(() => setOrders([])); }, []);
  if (!orders) return <Loader />;

  const courses = orders.filter(o => o.kind === 'course' && o.status === 'paid');
  const services = orders.filter(o => o.kind === 'service');
  const donations = orders.filter(o => o.kind === 'donation' && o.status === 'paid');

  const Row = ({ o }) => (
    <div className="list-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
      <div><span className="t">{o.title}</span><span className="s" style={{ display: 'block' }}>{o.id}{o.paidAt ? ` · ${fmtStamp(o.paidAt)}` : ''}{o.kind === 'donation' && o.purpose ? ` · ${o.purpose}` : ''}</span></div>
      <div style={{ textAlign: 'right' }}><b>{money(o.amount)}</b><span className={`badge ${o.status === 'paid' ? 'ok' : 'gold'}`} style={{ display: 'inline-flex', marginTop: 6 }}>{STATUS_LABEL[o.status] || o.status}</span>
        {o.kind === 'service' && o.status === 'paid' && <span className="s" style={{ display: 'block', marginTop: 4 }}>{FULFIL_LABEL[o.fulfilment] || ''}</span>}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Your account</span><h1>Learning &amp; orders</h1></div>
        <div className="row wrap"><Link className="btn outline sm" href="/courses"><Icon name="document" />Courses</Link><Link className="btn outline sm" href="/services"><Icon name="palm" />Services</Link><Link className="btn sm" href="/donate"><Icon name="heart" />Donate</Link></div>
      </div>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><h3>My courses</h3></div>
        {courses.length ? <div className="list-rows">{courses.map(o => <Row key={o.id} o={o} />)}</div>
          : <p className="muted">You are not enrolled in any course yet. <Link className="link" href="/courses">Browse courses</Link>.</p>}
      </section>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><h3>Service requests</h3></div>
        {services.length ? <div className="list-rows">{services.map(o => <Row key={o.id} o={o} />)}</div>
          : <p className="muted">No service requests yet. <Link className="link" href="/services">See services</Link>.</p>}
      </section>
      <section className="card">
        <div className="card-title"><h3>Donation receipts</h3></div>
        {donations.length ? <div className="list-rows">{donations.map(o => <Row key={o.id} o={o} />)}</div>
          : <p className="muted">No donations yet. Thank you for considering one.</p>}
      </section>
    </>
  );
}
