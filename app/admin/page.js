'use client';
import Link from 'next/link';
import { AdminShell, PageHead, useLoad } from '@/components/Admin';
import { BarChart, HBars } from '@/components/Portal';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { inr } from '@/lib/format';

function Dashboard() {
  const [o] = useLoad('/admin/overview', {});
  const [a] = useLoad('/admin/analytics', { days: [], byStatus: [], workload: [] });
  if (!o || !a) return <Loader />;

  const last30 = a.days.reduce((s, d) => s + d.revenue, 0);
  const kpis = [
    ['Total revenue', inr(o.revenue), 'rupee'],
    ['Revenue, last 30 days', inr(last30), 'chart'],
    ['Paid bookings', o.paidCount ?? 0, 'card'],
    ['Waiting for a Guruji', o.unassigned ?? 0, 'users', '/admin/orders?status=2'],
    ['Awaiting customer details', o.awaitingDetails ?? 0, 'document', '/admin/orders?status=0'],
    ['Reports published', o.reports ?? 0, 'check'],
    ['Active Gurujis', o.activeGurujis ?? 0, 'user', '/admin/team'],
    ['Payments started today', o.pendingPayments ?? 0, 'clock', '/admin/payments'],
  ];

  return (
    <>
      <PageHead title="Dashboard">
        <Link className="btn outline" href="/admin/orders"><Icon name="list" />All bookings</Link>
        <Link className="btn" href="/admin/settings"><Icon name="settings" />Booking settings</Link>
      </PageHead>

      <div className="kpi-grid">
        {kpis.map(([l, v, ic, href]) => {
          const inner = <><Icon name={ic} size={20} style={{ color: 'var(--orange)' }} /><div className="v" style={{ marginTop: 10 }}>{v}</div><div className="l">{l}</div></>;
          return href ? <Link key={l} href={href} className="card kpi" style={{ textDecoration: 'none' }}>{inner}</Link> : <div key={l} className="card kpi">{inner}</div>;
        })}
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-title"><h3>Revenue, last 30 days</h3><span className="muted small">Paid PayU transactions, IST</span></div>
          {last30 ? <BarChart data={a.days} valueKey="revenue" labelKey="date" format={v => (v >= 1000 ? `₹${Math.round(v / 100) / 10}k` : `₹${v}`)} />
            : <div className="empty"><Icon name="chart" /><p>No paid bookings in the last 30 days.</p></div>}
        </section>
        <section className="card">
          <div className="card-title"><h3>Bookings by stage</h3></div>
          <HBars rows={a.byStatus.map(s => ({ label: s.label, n: s.n }))} />
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-title"><h3>Team workload</h3><span className="muted small">Open consultations per person</span></div>
        {a.workload.length ? <HBars gold rows={a.workload.map(w => ({ label: `${w.name}${w.active ? '' : ' (inactive)'}`, n: w.open }))} />
          : <p className="muted">No team members yet.</p>}
      </section>
    </>
  );
}

export default function Page() {
  return <AdminShell><Dashboard /></AdminShell>;
}
