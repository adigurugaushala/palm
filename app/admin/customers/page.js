'use client';
import { useEffect, useState } from 'react';
import { AdminShell, PageHead, SearchBox, Pager, useDebounced } from '@/components/Admin';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtDay, fmtStamp } from '@/lib/format';

const LIMIT = 25;

function Customers() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [d, setD] = useState(null);
  const q = useDebounced(search);
  useEffect(() => { setSkip(0); }, [q]);
  useEffect(() => {
    const qs = new URLSearchParams({ limit: LIMIT, skip, ...(q && { search: q }) });
    api('GET', `/admin/customers?${qs}`).then(setD).catch(() => setD({ customers: [], total: 0 }));
  }, [q, skip]);

  return (
    <>
      <PageHead title="Customers" />
      <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, email or mobile" /></div>
      {!d ? <Loader /> : !d.customers.length ? (
        <div className="empty"><Icon name="users" /><p>{q ? 'No customers match that search.' : 'No customers have registered yet.'}</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Customer</th><th>Contact</th><th>Joined</th><th>Bookings</th><th>Last session</th></tr></thead>
            <tbody>
              {d.customers.map(c => (
                <tr key={c.id}>
                  <td><b>{c.name}</b>{!c.active && <span className="sub">Deactivated</span>}</td>
                  <td>{c.email}<span className="sub">{c.mobile || 'No mobile'}{c.google ? ' · Google sign-in' : ''}</span></td>
                  <td>{fmtStamp(c.joined).split(',')[0]}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.bookings}</td>
                  <td>{c.lastBooking ? fmtDay(c.lastBooking) : <span className="muted">—</span>}</td>
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
  return <AdminShell><Customers /></AdminShell>;
}
