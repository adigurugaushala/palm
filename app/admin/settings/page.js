'use client';
import { useEffect, useState } from 'react';
import { AdminShell, PageHead, useLoad } from '@/components/Admin';
import { useApp, useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';

const NUMS = [
  ['price', 'Consultation price (₹, incl. GST)', 1, 1e6, 'Shown on the website and charged through PayU.'],
  ['gstPercent', 'GST included in the price (%)', 0, 50, 'Used to show the tax breakdown on receipts.'],
  ['durationMin', 'Session length (minutes)', 5, 240, ''],
  ['daysAhead', 'Days open for booking', 1, 60, 'How far ahead customers can book.'],
  ['holdMinutes', 'Slot hold during payment (minutes)', 5, 60, 'A slot is held for this long while the customer pays.'],
];

function Settings() {
  const { refreshConfig } = useApp();
  const run = useAction();
  const [d] = useLoad('/admin/settings', null);
  const [f, setF] = useState(null);
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (d?.settings) setF({ ...d.settings, slots: [...(d.settings.slots || [])] }); }, [d]);
  if (!d) return <Loader />;
  if (!f) return <div className="notice"><Icon name="alert" />Settings could not be loaded.</div>;

  const base = Math.round(f.price / (1 + f.gstPercent / 100));
  const addSlot = () => {
    const m = /^(\d{1,2}):([0-5]\d)\s*(am|pm)$/i.exec(slot.trim());
    if (!m || +m[1] < 1 || +m[1] > 12) return;
    const s = `${m[1].padStart(2, '0')}:${m[2]} ${m[3].toUpperCase()}`;
    if (!f.slots.includes(s)) setF({ ...f, slots: [...f.slots, s] });
    setSlot('');
  };
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(NUMS.map(([k]) => [k, +f[k]]));
    const r = await run(() => api('PUT', '/admin/settings', { ...body, slots: f.slots }), 'Settings saved');
    setBusy(false);
    if (r) refreshConfig().catch(() => {});
  };

  return (
    <form onSubmit={save}>
      <PageHead title="Booking settings"><button className={`btn ${busy ? 'busy' : ''}`} type="submit"><Icon name="check" />Save changes</button></PageHead>
      <div className="dash-grid" style={{ marginTop: 0 }}>
        <section className="card" style={{ display: 'grid', gap: 18 }}>
          <div className="card-title"><h3>Price and schedule</h3></div>
          {NUMS.map(([k, label, min, max, hint]) => (
            <div className="field" key={k}>
              <label htmlFor={k}>{label}</label>
              <input id={k} className="input" type="number" min={min} max={max} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} required />
              {hint && <small className="muted">{hint}</small>}
            </div>
          ))}
        </section>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <section className="card">
            <div className="card-title"><h3>Daily time slots (IST)</h3></div>
            <div className="chips" style={{ marginBottom: 14 }}>
              {f.slots.map(s => (
                <span className="chip" key={s} style={{ cursor: 'default' }}>{s}
                  <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setF({ ...f, slots: f.slots.filter(x => x !== s) })} aria-label={`Remove ${s}`}><Icon name="close" size={14} /></button>
                </span>
              ))}
            </div>
            <div className="row">
              <input className="input" value={slot} onChange={e => setSlot(e.target.value)} placeholder="e.g. 05:30 PM" aria-label="New slot"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSlot(); } }} />
              <button type="button" className="btn outline" onClick={addSlot}><Icon name="plus" />Add</button>
            </div>
            <small className="muted" style={{ display: 'block', marginTop: 8 }}>Existing bookings keep their time even if you remove a slot.</small>
          </section>
          <section className="card">
            <div className="card-title"><h3>What customers see</h3></div>
            <dl className="kv">
              <dt>Price</dt><dd><b>{inr(+f.price)}</b></dd>
              <dt>Consultation fee</dt><dd>{inr(base)}</dd>
              <dt>GST ({f.gstPercent}%)</dt><dd>{inr(+f.price - base)}</dd>
              <dt>Session</dt><dd>{f.durationMin} minutes, video or audio</dd>
            </dl>
          </section>
        </div>
      </div>
    </form>
  );
}

export default function Page() {
  return <AdminShell><Settings /></AdminShell>;
}
