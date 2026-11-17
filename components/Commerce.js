'use client';
import Link from 'next/link';
import Icon from './Icon';
import { money } from '@/lib/checkout';

// A course or service card in the catalogue grid.
export function ProductCard({ p, base }) {
  return (
    <article className="card product">
      <div className="product-top">
        <span className="badge brand">{p.kind === 'course' ? 'Course' : 'Service'}</span>
        {p.durationText && <span className="muted small">{p.durationText}</span>}
      </div>
      <h3>{p.title}</h3>
      <p className="muted">{p.summary}</p>
      <div className="product-foot">
        <b className="price-tag">{money(p.price)}</b>
        <Link className="btn sm" href={`${base}/${p.slug}`}>{p.kind === 'course' ? 'View course' : 'View service'}<Icon name="arrowRight" /></Link>
      </div>
    </article>
  );
}

export const STATUS_LABEL = { created: 'Awaiting payment', paid: 'Paid', failed: 'Payment failed', refund_pending: 'Refund pending', refunded: 'Refunded' };
export const FULFIL_LABEL = { new: 'Received', contacted: 'Guruji has contacted you', done: 'Completed' };
