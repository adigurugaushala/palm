'use client';
import { useState } from 'react';
import { AdminShell, PageHead, useLoad, Confirm, PAY_TONE, PAY_LABEL } from '@/components/Admin';
import { Modal } from '@/components/Portal';
import { useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtStamp, inr } from '@/lib/format';

const FILTERS = [['', 'All'], ['paid', 'Paid'], ['refund_pending', 'Refund pending'], ['refunded', 'Refunded'], ['failed', 'Failed']];
const MODES = { CC: 'Credit card', DC: 'Debit card', NB: 'Net banking', UPI: 'UPI', CASH: 'Wallet', EMI: 'EMI', demo: 'Demo' };

function Payments() {
  const run = useAction();
  const [d, load] = useLoad('/admin/payments?limit=200', { payments: [] });
  const [filter, setFilter] = useState('');
  const [view, setView] = useState(null);
  const [refund, setRefund] = useState(null);
  const [confirmRef, setConfirmRef] = useState(null);
  const [ref, setRef] = useState('');
  if (!d) return <Loader />;

  const rows = d.payments.filter(p => !filter || p.status === filter);
  const total = d.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHead title="Payments"><span className="muted">Collected: <b style={{ color: 'var(--burgundy)' }}>{inr(total)}</b></span></PageHead>
      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
        {FILTERS.map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>{l} ({k ? d.payments.filter(p => p.status === k).length : d.payments.length})</button>)}
      </div>

      {!rows.length ? <div className="empty"><Icon name="card" /><p>No payments here.</p></div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Payment</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td><b>{p.id}</b><span className="sub">Booking {p.bookingId}</span></td>
                  <td>{p.customer || '—'}<span className="sub">{MODES[p.mode] || p.mode || (p.provider === 'payu' ? 'PayU' : p.provider)}</span></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(p.amount)}</td>
                  <td><span className={`badge ${PAY_TONE[p.status] || ''}`}>{PAY_LABEL[p.status] || p.status}</span></td>
                  <td>{fmtStamp(p.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => setView(p)}>Details</button>
                    {p.status === 'paid' && <button className="btn outline sm" style={{ marginLeft: 6 }} onClick={() => setRefund(p)}>Refund</button>}
                    {p.status === 'refund_pending' && <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => { setRef(''); setConfirmRef(p); }}>Confirm refund</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && (
        <Modal title={`Payment ${view.id}`} onClose={() => setView(null)}>
          <dl className="kv">
            <dt>Booking</dt><dd>{view.bookingId}</dd>
            <dt>Customer</dt><dd>{view.customer || '—'}</dd>
            <dt>Amount</dt><dd>{inr(view.amount)}</dd>
            <dt>Status</dt><dd><span className={`badge ${PAY_TONE[view.status] || ''}`}>{PAY_LABEL[view.status] || view.status}</span></dd>
            <dt>Provider</dt><dd>{view.provider === 'payu' ? 'PayU' : view.provider}</dd>
            <dt>Payment mode</dt><dd>{MODES[view.mode] || view.mode || '—'}</dd>
            <dt>Transaction ID</dt><dd><code>{view.txnid || '—'}</code></dd>
            <dt>PayU ID (mihpayid)</dt><dd><code>{view.mihpayid || '—'}</code></dd>
            {view.refundRef && <><dt>Refund reference</dt><dd><code>{view.refundRef}</code></dd></>}
            <dt>Created</dt><dd>{fmtStamp(view.createdAt)}</dd>
          </dl>
        </Modal>
      )}

      {refund && (
        <Confirm title="Refund this payment?" danger confirmLabel={refund.provider === 'payu' ? 'Mark refund requested' : 'Refund'} onClose={() => setRefund(null)}
          onConfirm={async () => { const r = await run(() => api('POST', `/admin/payments/${refund.id}/refund`), 'Refund recorded'); if (r) load(); return !!r; }}>
          <p>{inr(refund.amount)} to {refund.customer || 'the customer'} for booking {refund.bookingId}. The booking will be cancelled.</p>
          {refund.provider === 'payu' && (
            <div className="notice"><Icon name="info" />Issue the refund in the PayU merchant dashboard first. This payment will show as &ldquo;Refund pending&rdquo; until you enter PayU&rsquo;s refund reference.</div>
          )}
        </Confirm>
      )}

      {confirmRef && (
        <Confirm title="Confirm the PayU refund" confirmLabel="Mark as refunded" onClose={() => setConfirmRef(null)}
          onConfirm={async () => { const r = await run(() => api('POST', `/admin/payments/${confirmRef.id}/refund/confirm`, { reference: ref }), 'Refund confirmed'); if (r) load(); return !!r; }}>
          <p>Enter the refund reference shown in the PayU dashboard for {confirmRef.id} ({inr(confirmRef.amount)}).</p>
          <div className="field"><label htmlFor="rref">PayU refund reference</label><input id="rref" className="input" value={ref} onChange={e => setRef(e.target.value)} maxLength={80} autoFocus /></div>
        </Confirm>
      )}
    </>
  );
}

export default function Page() {
  return <AdminShell><Payments /></AdminShell>;
}
