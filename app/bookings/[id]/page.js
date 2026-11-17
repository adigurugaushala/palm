'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, Loader } from '@/components/Providers';
import { Journey, StatusBadge, MeetPanel, ReviewForm } from '@/components/Portal';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDayLong, inr } from '@/lib/format';

const NEXT_STEP = [
  'Payment received. Please add your details and palm photographs.',
  'Your details are saved. Add your palm photographs and submit them for review.',
  'Your details are with us. We are assigning a Guruji to your consultation.',
  'A Guruji has been assigned and will study your photographs shortly.',
  'Guruji is studying your palm photographs.',
  'Your session is scheduled. Join the room at your appointment time.',
  'Your consultation is complete. Guruji is preparing your written report.',
  'Your written report is ready to read and download.',
];

function Status() {
  const { id } = useParams();
  const router = useRouter();
  const { cfg, me } = useApp();
  const [b, setB] = useState(null);
  useEffect(() => {
    api('GET', `/bookings/${id}`).then(r => {
      if (r.booking.status < 0) router.replace(`/book/${id}/pay`);
      else setB(r.booking);
    }).catch(() => router.replace('/bookings'));
  }, [id, router]);
  if (!b) return <Loader />;

  return (
    <>
      <div className="page-head">
        <div><span className="eyebrow on-ivory">Booking {b.id}</span><h1>{fmtDayLong(b.date)}</h1><p style={{ marginTop: 6 }}>{b.slot}{b.reviewer ? ` · with ${b.reviewer}` : ''}</p></div>
        <StatusBadge b={b} />
      </div>
      <div className="layout-2">
        <div style={{ display: 'grid', gap: 20 }}>
          {b.cancelled && <div className="notice bad"><Icon name="alert" />This booking was cancelled and the payment refunded.</div>}
          {b.flag?.type === 'returned' && <div className="notice warn"><Icon name="alert" /><span>Guruji asked for a change: <b>{b.flag.reason}</b></span></div>}
          {b.flag?.type === 'rejected' && <div className="notice bad"><Icon name="alert" /><span>This request could not be accepted: {b.flag.reason}. Please write to {cfg.supportEmail} about a refund.</span></div>}
          {b.flag?.type === 'conflict' && <div className="notice warn"><Icon name="alert" />{b.flag.reason}</div>}

          <section className="card">
            <div className="card-title"><h3>Where things stand</h3></div>
            {!b.cancelled && <p style={{ marginBottom: 18 }}>{NEXT_STEP[b.status]}</p>}
            <div className="row wrap" style={{ marginBottom: 22 }}>
              {b.editable && b.status <= 1 && <Link href={`/book/${b.id}/details`} className="btn"><Icon name="document" />Add your details</Link>}
              {b.editable && b.flag?.type === 'returned' && <Link href={`/book/${b.id}/details?step=palm`} className="btn"><Icon name="camera" />Update photographs</Link>}
              {b.reportReady && <Link href={`/reports?id=${b.id}`} className="btn"><Icon name="document" />Read your report</Link>}
              {b.status >= 3 && !b.cancelled && <Link href={`/bookings/${b.id}/session`} className="btn outline"><Icon name="chat" />Messages &amp; session room</Link>}
            </div>
            <Journey b={b} statuses={cfg.statuses} />
          </section>

          {b.status >= 3 && !b.cancelled && b.status < 7 && (
            <section className="card"><div className="card-title"><h3>Consultation room</h3></div><MeetPanel meetUrl={b.meetUrl} displayName={me?.name} /></section>
          )}
          {b.status >= 6 && !b.cancelled && <ReviewForm bookingId={b.id} />}
        </div>
        <aside className="side">
          <div className="card summary">
            <h3>Details</h3>
            <div className="line"><span>Date</span><span>{fmtDayLong(b.date)}</span></div>
            <div className="line"><span>Time</span><span>{b.slot}</span></div>
            <div className="line"><span>Guruji</span><span>{b.reviewer || 'To be assigned'}</span></div>
            <div className="line"><span>Topics</span><span>{b.questions.join(', ') || '—'}</span></div>
            <div className="line"><span>Photographs</span><span>{b.photos.length} uploaded</span></div>
            <div className="line"><span>Payment</span><span>{b.payment ? `${inr(b.payment.amount)} · ${b.payment.status}` : '—'}</span></div>
          </div>
          <div className="card">
            <p className="small">Questions about this booking? Quote <b>{b.id}</b> when you write to <a className="link" href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a>.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Status /></CustomerShell>;
}
