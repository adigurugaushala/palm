'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { money } from '@/lib/checkout';
import { fmtStamp } from '@/lib/format';

export default function Page() {
  return <CustomerShell><Paid /></CustomerShell>;
}

function Paid() {
  const { id } = useParams();
  const [o, setO] = useState(undefined);
  useEffect(() => { api('GET', `/orders/${id}`).then(r => setO(r.order)).catch(() => setO(null)); }, [id]);
  if (o === undefined) return <Loader />;
  if (!o) return <div className="empty"><Icon name="info" /><p>We could not find that order.</p></div>;

  const isCourse = o.kind === 'course', isService = o.kind === 'service';
  const confirmed = o.status === 'paid';
  return (
    <div className="card" style={{ maxWidth: 620, margin: '24px auto', textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center' }}>
      <div className="seal"><Icon name={confirmed ? 'check' : 'clock'} size={30} strokeWidth={2} /></div>
      <h2>{confirmed ? (isCourse ? 'You are enrolled' : isService ? 'Thank you — request received' : 'Thank you for your donation') : 'Payment is being confirmed'}</h2>
      <p className="muted">{o.title} · {money(o.amount)} · Order {o.id}{o.paidAt ? ` · ${fmtStamp(o.paidAt)}` : ''}</p>
      <p>{isCourse ? 'Your course is now in Learning & orders. Guruji will share the class schedule with you there.' : isService ? 'Guruji’s team will contact you on your mobile number to arrange the session.' : 'A receipt is saved under Learning & orders.'}</p>
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <Link className="btn" href="/learning">Learning &amp; orders</Link>
        <Link className="btn outline" href="/account">Back to my account</Link>
      </div>
    </div>
  );
}
