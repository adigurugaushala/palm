'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, Loader } from '@/components/Providers';
import { Chat, MeetPanel } from '@/components/Portal';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDayLong } from '@/lib/format';

function Session() {
  const { id } = useParams();
  const router = useRouter();
  const { me } = useApp();
  const [b, setB] = useState(null);
  useEffect(() => { api('GET', `/bookings/${id}`).then(r => setB(r.booking)).catch(() => router.replace('/bookings')); }, [id, router]);
  if (!b) return <Loader />;
  return (
    <>
      <div className="page-head">
        <div><Link href={`/bookings/${b.id}`} className="back-home" style={{ marginBottom: 10 }}><Icon name="arrowLeft" />Booking {b.id}</Link><h1>Session room</h1></div>
      </div>
      <div className="layout-2">
        <section className="card">
          <div className="card-title"><h3>Messages with {b.reviewer || 'Guruji'}</h3></div>
          <Chat bookingId={b.id} empty="No messages yet. Say namaste, or share anything Guruji should know before your session." />
        </section>
        <aside className="side">
          <div className="card">
            <div className="card-title"><h3>Video consultation</h3></div>
            <p className="small" style={{ marginBottom: 14 }}>{fmtDayLong(b.date)}, {b.slot}</p>
            <MeetPanel meetUrl={b.meetUrl} displayName={me?.name} />
          </div>
          <div className="card">
            <h4 style={{ marginBottom: 8 }}>Before you join</h4>
            <ul className="small" style={{ paddingLeft: 18, display: 'grid', gap: 6, color: 'var(--ink-2)' }}>
              <li>Sit somewhere quiet with good light on your hands.</li>
              <li>Keep your palms free of rings and henna if you can.</li>
              <li>Have your questions ready — the session follows them.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Session /></CustomerShell>;
}
