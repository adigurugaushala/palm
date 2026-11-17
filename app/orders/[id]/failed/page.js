'use client';
import Link from 'next/link';
import { CustomerShell } from '@/components/Shells';
import Icon from '@/components/Icon';
import { useParams } from 'next/navigation';

export default function Page() {
  return <CustomerShell><Failed /></CustomerShell>;
}

function Failed() {
  const { id } = useParams();
  return (
    <div className="card" style={{ maxWidth: 620, margin: '24px auto', textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center' }}>
      <div className="seal bad"><Icon name="close" size={30} strokeWidth={2} /></div>
      <h2>Payment was not completed</h2>
      <p className="muted">Nothing has been charged for order {id}. You can try again from the course, service or donation page.</p>
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <Link className="btn" href="/courses">Browse courses</Link>
        <Link className="btn outline" href="/help">Get help</Link>
      </div>
    </div>
  );
}
