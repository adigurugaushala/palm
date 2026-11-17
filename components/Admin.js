'use client';
import { useCallback, useEffect, useState } from 'react';
import { StaffShell, ADMIN_NAV } from './Shells';
import { Modal } from './Portal';
import Icon from './Icon';
import { api } from '@/lib/api';

export function AdminShell({ children }) {
  return <StaffShell roles={['admin']} nav={ADMIN_NAV}>{children}</StaffShell>;
}

export function PageHead({ eyebrow = 'Administration', title, children }) {
  return (
    <div className="page-head">
      <div><span className="eyebrow on-ivory">{eyebrow}</span><h1>{title}</h1></div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

// Loads a GET endpoint and exposes a reload function. `fallback` is used when the call fails.
export function useLoad(url, fallback) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    return api('GET', url).then(setData).catch(e => { setError(e.message); setData(fallback); });
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return [data, load, error];
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Icon name="search" />
      <input className="input" type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

// Debounces a fast-changing value (search fields) so the API is not called per keystroke.
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

export function Pager({ skip, limit, total, onPage }) {
  if (total <= limit) return total ? <div className="pager"><span>{total} {total === 1 ? 'record' : 'records'}</span></div> : null;
  return (
    <div className="pager">
      <span>{skip + 1}–{Math.min(skip + limit, total)} of {total}</span>
      <span className="row">
        <button className="btn outline sm" disabled={skip === 0} onClick={() => onPage(Math.max(0, skip - limit))}><Icon name="arrowLeft" />Previous</button>
        <button className="btn outline sm" disabled={skip + limit >= total} onClick={() => onPage(skip + limit)}>Next<Icon name="arrowRight" /></button>
      </span>
    </div>
  );
}

export function Confirm({ title, children, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 22 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'danger' : ''} ${busy ? 'busy' : ''}`} onClick={async () => { setBusy(true); const ok = await onConfirm(); setBusy(false); if (ok !== false) onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export const PAY_TONE = { paid: 'ok', failed: 'bad', refund_pending: 'warn', refunded: 'gold', created: '' };
export const PAY_LABEL = { paid: 'Paid', failed: 'Failed', refund_pending: 'Refund pending', refunded: 'Refunded', created: 'Started' };
