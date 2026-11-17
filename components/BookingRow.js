'use client';
import Link from 'next/link';
import { StatusBadge } from './Portal';
import { dayParts } from '@/lib/format';

export default function BookingRow({ b }) {
  const p = dayParts(b.date);
  return (
    <Link href={`/bookings/${b.id}`} className="list-row">
      <span className="date"><b>{p.day}</b><small>{p.mon}</small></span>
      <span><span className="t">{p.wd}, {b.slot}</span><span className="s" style={{ display: 'block' }}>Booking {b.id}{b.payment ? ` · Payment ${b.payment.status}` : ''}</span></span>
      <StatusBadge b={b} />
    </Link>
  );
}
