'use client';
import { useState } from 'react';
import { AdminShell, PageHead, SearchBox, useLoad } from '@/components/Admin';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { fmtStamp } from '@/lib/format';

const LABELS = {
  'order.assign': 'Assigned a booking', 'settings.update': 'Changed booking settings', 'staff.add': 'Added a team member',
  'payment.refund.request': 'Requested a refund', 'payment.refund.confirm': 'Confirmed a refund', 'review.approved': 'Published a review',
  'review.hidden': 'Hid a review', 'review.pending': 'Moved a review to pending', 'case.approve': 'Published a report',
  'case.return': 'Returned a case to the customer', 'case.reject': 'Rejected a case', 'case.schedule': 'Scheduled a session',
  'case.complete': 'Marked a session complete', 'case.claim': 'Claimed a case', 'staff.login': 'Signed in to the workspace',
  'payu.callback.invalid': 'Rejected a PayU callback (failed verification)', 'payu.webhook.badhash': 'Rejected a PayU webhook (bad signature)',
  'payu.webhook.badamount': 'Rejected a PayU webhook (amount mismatch)',
};

const detail = m => {
  if (!m || typeof m !== 'object') return '';
  return Object.entries(m).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
};

function Audit() {
  const [d] = useLoad('/admin/audit', { entries: [] });
  const [q, setQ] = useState('');
  if (!d) return <Loader />;
  const s = q.trim().toLowerCase();
  const rows = d.entries.filter(e => !s || [e.action, e.actor, e.target, LABELS[e.action]].some(x => String(x || '').toLowerCase().includes(s)));

  return (
    <>
      <PageHead title="Audit log" />
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Filter by person, action or booking" /><span className="muted small">Latest 200 entries</span></div>
      {!rows.length ? <div className="empty"><Icon name="audit" /><p>No entries.</p></div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtStamp(e.at)}</td>
                  <td>{e.actor || <span className="muted">System</span>}</td>
                  <td><b>{LABELS[e.action] || e.action}</b>{e.target && <span className="sub">{e.target}</span>}</td>
                  <td className="small muted" style={{ maxWidth: 360, overflowWrap: 'anywhere' }}>{detail(e.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <AdminShell><Audit /></AdminShell>;
}
