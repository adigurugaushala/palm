'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StaffShell, GURUJI_NAV } from '@/components/Shells';
import { useAction, Loader } from '@/components/Providers';
import { CaseTable } from '@/components/CaseTable';
import { api } from '@/lib/api';

const TABS = [['open', 'My open cases'], ['unassigned', 'Unassigned'], ['done', 'Published'], ['closed', 'Rejected']];

function Cases() {
  const run = useAction();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('open');
  const load = useCallback(() => api('GET', '/staff/cases').then(setD).catch(() => setD({ mine: [], unassigned: [], closed: [] })), []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Loader />;
  const rows = { open: d.mine.filter(c => c.status < 7), unassigned: d.unassigned, done: d.mine.filter(c => c.status >= 7), closed: d.closed || [] }[tab];
  const claim = async id => { if (await run(() => api('POST', `/staff/cases/${id}/claim`), 'Case claimed')) router.push(`/guruji/cases/${id}`); else load(); };
  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">Guruji workspace</span><h1>Cases</h1></div></div>
      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        {TABS.map(([k, l]) => {
          const n = { open: d.mine.filter(c => c.status < 7).length, unassigned: d.unassigned.length, done: d.mine.filter(c => c.status >= 7).length, closed: (d.closed || []).length }[k];
          return <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l} <span className="muted">({n})</span></button>;
        })}
      </div>
      <CaseTable rows={rows} onClaim={tab === 'unassigned' ? claim : undefined} empty="No cases in this list." />
    </>
  );
}

export default function Page() {
  return <StaffShell nav={GURUJI_NAV}><Cases /></StaffShell>;
}
