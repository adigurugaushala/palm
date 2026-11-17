'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { Loader } from '@/components/Providers';
import { BookingStepper } from '@/components/Portal';
import { Mandala } from '@/components/Ornaments';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDayLong, inr } from '@/lib/format';

// Landing page after PayU redirects back. The server has already verified the PayU hash
// before redirecting here; we still confirm state from the API rather than trusting the URL.
function Paid() {
  const { id } = useParams();
  const router = useRouter();
  const [b, setB] = useState(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let tries = 0, stop = false;
    const check = async () => {
      try {
        const { booking } = await api('GET', `/bookings/${id}`);
        if (booking.status >= 0) { if (!stop) setB(booking); return; }
        const v = await api('GET', `/payu/verify/${id}`);
        if (v.status === 'failed') { router.replace(`/book/${id}/failed`); return; }
        setWaiting(true);
        if (++tries < 8 && !stop) setTimeout(check, 1500);
        else if (!stop) router.replace(`/bookings/${id}`);
      } catch { router.replace('/account'); }
    };
    check();
    return () => { stop = true; };
  }, [id, router]);

  if (!b) return <Loader label={waiting ? 'Confirming your payment with PayU…' : 'Loading…'} />;
  return (
    <>
      <BookingStepper step={2} />
      <div className="result">
        <div className="seal ok"><Mandala size={140} detail="lite" color="var(--orange)" /><Icon name="check" className="ic" strokeWidth={1.8} /></div>
        <span className="eyebrow on-ivory">Payment confirmed</span>
        <h1>Your consultation is booked</h1>
        <p>Thank you. Next, tell Guruji a little about yourself and share photographs of your palms.</p>
        <div className="card">
          <dl className="kv">
            <dt>When</dt><dd>{fmtDayLong(b.date)}, {b.slot}</dd>
            <dt>Booking</dt><dd>{b.id}</dd>
            <dt>Payment</dt><dd>{b.payment?.id} · {inr(b.amount)}{b.payment?.provider === 'demo' ? ' (demo)' : ''}</dd>
          </dl>
          {b.flag?.type === 'conflict' && <div className="notice warn" style={{ marginTop: 16 }}><Icon name="alert" />{b.flag.reason}</div>}
        </div>
        <div className="actions">
          <Link href={`/book/${b.id}/details`} className="btn">Add your details<Icon name="arrowRight" /></Link>
          <Link href="/account" className="btn outline">Later</Link>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Paid /></CustomerShell>;
}
