'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminShell, PageHead, SearchBox, Pager, useDebounced } from '@/components/Admin';
import { caseTone } from '@/components/CaseTable';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDay } from '@/lib/format';

const LIMIT = 25;

function Orders() {
  const { cfg } = useApp();
  const run = useAction();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [date, setDate] = useState('');
  const [skip, setSkip] = useState(0);
  const [d, setD] = useState(null);
  const q = useDebounced(search);

  const load = () => {
    const qs = new URLSearchParams({ limit: LIMIT, skip, ...(q && { search: q }), ...(status !== '' && { status }), ...(date && { date }) });
    return api('GET', `/admin/orders?${qs}`).then(setD).catch(() => setD({ orders: [], total: 0, reviewers: [] }));
  };
  useEffect(() => { load(); }, [q, status, date, skip]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSkip(0); }, [q, status, date]);

  const assign = async (id, reviewerId) => {
    if (await run(() => api('PUT', `/admin/orders/${id}/assign`, { reviewerId: reviewerId || null }), reviewerId ? 'Guruji assigned' : 'Assignment removed')) load();
  };

  return (
    <>
      <PageHead title="Bookings" />
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search booking ID, name or mobile" />
        <select className="input" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by stage">
          <option value="">All stages</option>
          {cfg.statuses.map((s, i) => <option key={s} value={i}>{s}</option>)}
        </select>
        <input className="input" style={{ width: 'auto' }} type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Appointment date" />
        {(search || status !== '' || date) && <button className="btn ghost sm" onClick={() => { setSearch(''); setStatus(''); setDate(''); }}>Clear filters</button>}
      </div>

      {!d ? <Loader /> : !d.orders.length ? (
        <div className="empty"><Icon name="list" /><p>No bookings match these filters.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Customer</th><th>Session</th><th>Stage</th><th>Guruji</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {d.orders.map(c => (
                <tr key={c.id}>
                  <td><b>{c.name || '—'}</b><span className="sub">{c.id}</span></td>
                  <td>{fmtDay(c.date)}<span className="sub">{c.slot}</span></td>
                  <td>
                    <span className={`badge ${caseTone(c)}`}>{c.cancelled ? 'Cancelled' : c.statusLabel}</span>
                    {c.flag && <span className="sub">{String(c.flag).split(':').slice(1).join(':') || String(c.flag)}</span>}
                  </td>
                  <td>
                    <select className="input" style={{ minHeight: 38, width: 'auto', maxWidth: 200 }} value={c.assignedTo || ''} disabled={c.cancelled || c.status >= 7}
                      onChange={e => assign(c.id, e.target.value)} aria-label={`Guruji for ${c.id}`}>
                      <option value="">Unassigned</option>
                      {d.reviewers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}><Link className="btn sm outline" href={`/guruji/cases/${c.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {d && <Pager skip={skip} limit={LIMIT} total={d.total} onPage={setSkip} />}
    </>
  );
}

export default function Page() {
  return <AdminShell><Suspense fallback={<Loader />}><Orders /></Suspense></AdminShell>;
}
