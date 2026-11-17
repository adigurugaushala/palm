'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicPage } from '@/components/SiteChrome';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { beginOrderPayment, money } from '@/lib/checkout';

function Course() {
  const { slug } = useParams();
  const { me } = useApp();
  const router = useRouter();
  const run = useAction();
  const [p, setP] = useState(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('GET', `/catalog/${slug}`).then(r => setP(r.product)).catch(() => setP(null)); }, [slug]);

  if (p === undefined) return <Loader />;
  if (p === null) return <div className="empty"><Icon name="info" /><p>This course is not available.</p><Link className="btn outline sm" href="/courses">All courses</Link></div>;

  const enrol = async () => {
    setBusy(true);
    const r = await run(() => api('POST', '/orders', { kind: 'course', slug }));
    setBusy(false);
    if (r) beginOrderPayment(r.payment, r.order.id, router);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container prose">
          <Link href="/courses" className="back-link"><Icon name="arrowLeft" />All courses</Link>
          <span className="eyebrow on-ivory" style={{ display: 'block', marginTop: 14 }}>{p.durationText}</span>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container layout-2">
          <div className="prose">
            {p.description && <p>{p.description}</p>}
            {p.outcomes?.length > 0 && (<><h2>What you will learn</h2><ul className="checks">{p.outcomes.map(o => <li key={o}><Icon name="check" size={16} strokeWidth={2} />{o}</li>)}</ul></>)}
          </div>
          <aside className="side">
            <div className="card summary">
              <h3>Enrol in this course</h3>
              <div className="total"><span>Course fee</span><b>{money(p.price)}</b></div>
              <p className="muted small" style={{ marginTop: 6 }}>Includes GST where applicable.</p>
              {me?.role === 'customer' ? (
                <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 16 }} onClick={enrol}>Enrol and pay<Icon name="arrowRight" /></button>
              ) : (
                <Link className="btn block" style={{ marginTop: 16 }} href={`/login?next=${encodeURIComponent(`/courses/${slug}`)}`}>Sign in to enrol</Link>
              )}
              <p className="muted small" style={{ marginTop: 12 }}>You pay on PayU&rsquo;s secure page. Your enrolment is confirmed only after payment is verified.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return <PublicPage><Course /></PublicPage>;
}
