'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { BookingStepper } from '@/components/Portal';
import Icon from '@/components/Icon';
import { useApp } from '@/components/Providers';

function Failed() {
  const { id } = useParams();
  const { cfg } = useApp();
  return (
    <>
      <BookingStepper step={1} />
      <div className="result">
        <div className="seal bad"><Icon name="close" className="ic" strokeWidth={1.6} /></div>
        <span className="eyebrow on-ivory">Payment not completed</span>
        <h1>Nothing has been charged</h1>
        <p>The payment didn&rsquo;t go through or was cancelled. Your chosen time may still be held for a few minutes — you can try again now.</p>
        <div className="card">
          <p className="small">If money left your account but this page appeared, don&rsquo;t worry: PayU confirms payments to us directly, and your booking will update automatically. If it doesn&rsquo;t within an hour, write to {cfg.supportEmail || 'support'} with booking {id}.</p>
        </div>
        <div className="actions">
          <Link href={`/book/${id}/pay`} className="btn"><Icon name="refresh" />Try payment again</Link>
          <Link href="/book" className="btn outline">Choose another time</Link>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Failed /></CustomerShell>;
}
