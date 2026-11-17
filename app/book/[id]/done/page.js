'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { Loader } from '@/components/Providers';
import { BookingStepper } from '@/components/Portal';
import { Mandala } from '@/components/Ornaments';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDayLong } from '@/lib/format';

function Done() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  useEffect(() => { api('GET', `/bookings/${id}`).then(r => setB(r.booking)).catch(() => setB(false)); }, [id]);
  if (b === null) return <Loader />;
  return (
    <>
      <BookingStepper step={4} />
      <div className="result">
        <div className="seal ok"><Mandala size={140} detail="lite" /><Icon name="check" className="ic" strokeWidth={1.8} /></div>
        <span className="eyebrow on-ivory">Details received</span>
        <h1>Guruji has everything needed</h1>
        <p>Your details and palm photographs are with us. We&rsquo;ll assign your Guruji, who may message you here before your session.</p>
        {b && (
          <div className="card">
            <dl className="kv">
              <dt>Session</dt><dd>{fmtDayLong(b.date)}, {b.slot}</dd>
              <dt>Booking</dt><dd>{b.id}</dd>
              <dt>Status</dt><dd>{b.statusLabel}</dd>
            </dl>
          </div>
        )}
        <div className="actions">
          <Link href={`/bookings/${id}`} className="btn">Follow your booking<Icon name="arrowRight" /></Link>
          <Link href="/account" className="btn outline">Back to overview</Link>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Done /></CustomerShell>;
}
