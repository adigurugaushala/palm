'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StaffShell, GURUJI_NAV } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import { CaseTable } from '@/components/CaseTable';
import { api } from '@/lib/api';
import { firstName } from '@/lib/format';

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function Overview() {
  const { me } = useApp();
  const run = useAction();
  const router = useRouter();
  const [d, setD] = useState(null);
  const load = useCallback(() => api('GET', '/staff/cases').then(setD).catch(() => setD({ mine: [], unassigned: [], closed: [] })), []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Loader />;

  const open = d.mine.filter(c => c.status < 7);
  const today = d.mine.filter(c => c.date === todayIST() && c.status < 7);
  const claim = async id => { if (await run(() => api('POST', `/staff/cases/${id}/claim`), 'Case claimed')) router.push(`/guruji/cases/${id}`); else load(); };

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Guruji workspace</span><h1>Namaste, {firstName(me.name)}</h1></div></div>
      <div className="kpi-grid">
        {[['Open cases', open.length], ['Sessions today', today.length], ['Awaiting report', d.mine.filter(c => c.status === 6).length], ['Published', d.mine.filter(c => c.status >= 7).length], ['Unassigned queue', d.unassigned.length]].map(([l, v]) => (
          <div className="card kpi" key={l}><div className="v">{v}</div><div className="l">{l}</div></div>
        ))}
      </div>
      {today.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div className="card-title"><h3>Today&rsquo;s sessions</h3></div>
          <CaseTable rows={today} />
        </section>
      )}
      <section style={{ marginTop: 26 }}>
        <div className="card-title"><h3>Your open cases</h3></div>
        <CaseTable rows={open} empty="No open cases are assigned to you." />
      </section>
      <section style={{ marginTop: 26 }}>
        <div className="card-title"><h3>Unassigned queue</h3><span className="muted">Claim a case to take it on</span></div>
        <CaseTable rows={d.unassigned} onClaim={claim} empty="The queue is clear." />
      </section>
    </>
  );
}

export default function Page() {
  return <StaffShell nav={GURUJI_NAV}><Overview /></StaffShell>;
}
