'use client';
import { useState } from 'react';
import { AdminShell, PageHead, useLoad } from '@/components/Admin';
import { HBars } from '@/components/Portal';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { inr } from '@/lib/format';

const istDay = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
const daysAgo = n => istDay(new Date(Date.now() - n * 864e5));
const PRESETS = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']];
const hours = h => (h >= 48 ? `${Math.round(h / 24)} days` : `${Math.round(h)} hours`);

function Reports() {
  const [range, setRange] = useState(() => ({ from: daysAgo(29), to: daysAgo(0) }));
  const [draft, setDraft] = useState(range);
  const [err, setErr] = useState('');
  const [d, , loadErr] = useLoad(`/admin/reports?from=${range.from}&to=${range.to}`, null);
  if (!d && !loadErr) return <Loader />;

  const apply = next => { setErr(''); if (next.from > next.to) return setErr('The start date must be before the end date.'); setRange(next); setDraft(next); };
  const exportCsv = section => window.open(`/api/admin/reports.csv?from=${range.from}&to=${range.to}&section=${section}`, '_blank', 'noopener');
  const shownErr = err || loadErr;

  return (
    <>
      <PageHead title="Reports" />

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div className="field" style={{ minWidth: 160 }}><label htmlFor="rf">From</label><input id="rf" type="date" className="input" value={draft.from} max={draft.to} onChange={e => setDraft({ ...draft, from: e.target.value })} /></div>
          <div className="field" style={{ minWidth: 160 }}><label htmlFor="rt">To</label><input id="rt" type="date" className="input" value={draft.to} min={draft.from} onChange={e => setDraft({ ...draft, to: e.target.value })} /></div>
          <button className="btn" onClick={() => apply(draft)}>Show report</button>
          {PRESETS.map(([n, label]) => <button key={n} className="btn ghost sm" onClick={() => apply({ from: daysAgo(n - 1), to: daysAgo(0) })}>{label}</button>)}
        </div>
        {shownErr && <p className="notice bad" role="alert" style={{ marginTop: 12 }}>{shownErr}</p>}
        <p className="muted small" style={{ margin: '10px 0 0' }}>Dates are Indian Standard Time. A period can be up to one year.</p>
      </section>

      {d && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="card kpi"><div className="v">{inr(d.totals.revenue)}</div><div className="l">Total revenue</div></div>
            <div className="card kpi"><div className="v">{inr(d.totals.consultations)}</div><div className="l">Consultations</div></div>
            <div className="card kpi"><div className="v">{inr(d.totals.courses)}</div><div className="l">Courses</div></div>
            <div className="card kpi"><div className="v">{inr(d.totals.services)}</div><div className="l">Services</div></div>
            <div className="card kpi"><div className="v">{inr(d.totals.donations)}</div><div className="l">Donations</div></div>
            <div className="card kpi"><div className="v">{d.conversion.rate}%</div><div className="l">Booking-to-paid ({d.conversion.paid} of {d.conversion.started})</div></div>
            <div className="card kpi"><div className="v">{d.turnaround.reports ? hours(d.turnaround.averageHours) : '—'}</div><div className="l">Average time to send a report</div></div>
          </div>

          <section className="card" style={{ marginBottom: 18 }}>
            <div className="card-title"><h3>Revenue by product</h3><button className="btn ghost sm" onClick={() => exportCsv('products')}><Icon name="download" />CSV</button></div>
            {d.products.length ? (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>Product</th><th>Type</th><th>Payments</th><th>Revenue</th></tr></thead>
                <tbody>{d.products.map(p => (
                  <tr key={`${p.kind}-${p.product}`}><td><b>{p.product}</b></td><td>{p.kind}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.count}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(p.revenue)}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="muted">No paid products in this period.</p>}
          </section>

          <div className="dash-grid">
            <section className="card">
              <div className="card-title"><h3>Donations by purpose</h3><button className="btn ghost sm" onClick={() => exportCsv('donations')}><Icon name="download" />CSV</button></div>
              {d.donations.length ? <HBars rows={d.donations.map(x => ({ label: `${x.purpose} · ${inr(x.amount)}`, n: x.count }))} />
                : <p className="muted">No donations in this period.</p>}
            </section>
            <section className="card">
              <div className="card-title"><h3>Booking-to-paid</h3><button className="btn ghost sm" onClick={() => exportCsv('conversion')}><Icon name="download" />CSV</button></div>
              <p style={{ margin: 0 }}><b>{d.conversion.rate}%</b> of consultations started in this period were paid.</p>
              <p className="muted small" style={{ margin: '6px 0 0' }}>{d.conversion.started} started, {d.conversion.paid} paid. Unpaid bookings are counted as started only.</p>
            </section>
          </div>

          <section className="card" style={{ marginTop: 18 }}>
            <div className="card-title"><h3>Turnaround by Guruji</h3><button className="btn ghost sm" onClick={() => exportCsv('turnaround')}><Icon name="download" />CSV</button></div>
            <p className="muted small" style={{ margin: '0 0 10px' }}>Hours from payment to the report being sent, for reports sent in this period.</p>
            {d.turnaround.byGuruji.length ? (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>Guruji</th><th>Reports sent</th><th>Average time</th></tr></thead>
                <tbody>{d.turnaround.byGuruji.map(g => (
                  <tr key={g.guruji}><td><b>{g.guruji}</b></td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.reports}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{hours(g.averageHours)}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="muted">No reports were sent in this period.</p>}
          </section>
        </>
      )}
    </>
  );
}

export default function Page() {
  return <AdminShell><Reports /></AdminShell>;
}
