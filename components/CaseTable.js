'use client';
import Link from 'next/link';
import Icon from './Icon';
import { fmtDay } from '@/lib/format';

export function caseTone(c) {
  if (c.cancelled) return 'bad';
  if (c.flag?.startsWith?.('rejected')) return 'bad';
  if (c.flag?.startsWith?.('returned')) return 'warn';
  if (c.status >= 7) return 'ok';
  if (c.status >= 3) return 'brand';
  return 'gold';
}

export function CaseTable({ rows, onClaim, empty = 'Nothing here right now.', showReviewer = false }) {
  if (!rows.length) return <div className="empty"><Icon name="list" /><p>{empty}</p></div>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Customer</th><th>Session</th><th>Status</th>{showReviewer && <th>Guruji</th>}<th aria-label="Actions" /></tr></thead>
        <tbody>
          {rows.map(c => (
            <tr key={c.id}>
              <td><b>{c.name}</b><span className="sub">{c.id}{c.age ? ` · Age ${c.age}` : ''}</span></td>
              <td>{fmtDay(c.date)}<span className="sub">{c.slot}</span></td>
              <td>
                <span className={`badge ${caseTone(c)}`}>{c.statusLabel}</span>
                {c.flag && <span className="sub">{c.flag.split(':')[0] === 'returned' ? 'Returned to customer' : c.flag.split(':')[0] === 'rejected' ? 'Rejected' : 'Needs attention'}</span>}
              </td>
              {showReviewer && <td>{c.reviewer || <span className="muted">Unassigned</span>}</td>}
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {onClaim && <button className="btn outline sm" style={{ marginRight: 8 }} onClick={() => onClaim(c.id)}>Claim</button>}
                <Link href={`/guruji/cases/${c.id}`} className="btn sm">Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
