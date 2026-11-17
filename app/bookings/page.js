'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { Loader, useApp } from '@/components/Providers';
import Icon from '@/components/Icon';
import BookingRow from '@/components/BookingRow';
import { api } from '@/lib/api';

function History() {
  const { t } = useApp();
  const [list, setList] = useState(null);
  useEffect(() => { api('GET', '/bookings').then(r => setList(r.bookings)).catch(() => setList([])); }, []);
  if (!list) return <Loader />;
  const upcoming = list.filter(b => !b.cancelled && b.status < 7);
  const past = list.filter(b => b.cancelled || b.status >= 7);
  return (
    <>
      <div className="page-head">
        <div><span className="eyebrow on-ivory">Your consultations</span><h1>{t('bookings')}</h1></div>
        <Link href="/book" className="btn"><Icon name="plus" />{t('book')}</Link>
      </div>
      {!list.length ? (
        <div className="card empty"><Icon name="calendar" /><h3>No bookings yet</h3><p>When you book a consultation it will appear here.</p><Link href="/book" className="btn" style={{ marginTop: 18 }}>{t('bookYour')}</Link></div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {upcoming.length > 0 && <section className="card"><div className="card-title"><h3>In progress</h3></div><div className="list-rows">{upcoming.map(b => <BookingRow key={b.id} b={b} />)}</div></section>}
          {past.length > 0 && <section className="card"><div className="card-title"><h3>Completed &amp; past</h3></div><div className="list-rows">{past.map(b => <BookingRow key={b.id} b={b} />)}</div></section>}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <CustomerShell><History /></CustomerShell>;
}
