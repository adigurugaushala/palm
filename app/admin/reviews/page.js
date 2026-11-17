'use client';
import { useState } from 'react';
import { AdminShell, PageHead, useLoad } from '@/components/Admin';
import { useAction, Loader } from '@/components/Providers';
import Icon, { Rating } from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtStamp } from '@/lib/format';

const TABS = [['pending', 'Awaiting approval'], ['approved', 'Published'], ['hidden', 'Hidden']];

function Reviews() {
  const run = useAction();
  const [d, load] = useLoad('/admin/reviews', { reviews: [] });
  const [tab, setTab] = useState('pending');
  if (!d) return <Loader />;
  const rows = d.reviews.filter(r => r.status === tab);
  const set = async (r, status) => { if (await run(() => api('PUT', `/admin/reviews/${r.id}`, { status }), status === 'approved' ? 'Review published' : status === 'hidden' ? 'Review hidden' : 'Moved back to pending')) load(); };

  return (
    <>
      <PageHead title="Reviews" />
      <p className="muted" style={{ marginTop: -12, marginBottom: 18 }}>Only published reviews appear on the website, with the customer&rsquo;s first name and city.</p>
      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l} ({d.reviews.filter(r => r.status === k).length})</button>)}
      </div>
      {!rows.length ? <div className="empty"><Icon name="quote" /><p>{tab === 'pending' ? 'No reviews are waiting for approval.' : 'Nothing here yet.'}</p></div> : (
        <div style={{ display: 'grid', gap: 14 }}>
          {rows.map(r => (
            <article className="card" key={r.id}>
              <div className="card-title"><div><Rating value={r.rating} /><span className="muted small" style={{ marginLeft: 10 }}>{r.name}{r.city ? `, ${r.city}` : ''} · Booking {r.bookingId} · {fmtStamp(r.at)}</span></div></div>
              <p style={{ marginTop: 6 }}>{r.text}</p>
              <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                {r.status !== 'hidden' && <button className="btn ghost sm" onClick={() => set(r, 'hidden')}><Icon name="eye" />Hide</button>}
                {r.status !== 'pending' && <button className="btn outline sm" onClick={() => set(r, 'pending')}>Move to pending</button>}
                {r.status !== 'approved' && <button className="btn sm" onClick={() => set(r, 'approved')}><Icon name="check" />Publish</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <AdminShell><Reviews /></AdminShell>;
}
