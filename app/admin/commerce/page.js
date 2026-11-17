'use client';
import { useState } from 'react';
import { AdminShell, PageHead, useLoad, SearchBox } from '@/components/Admin';
import { Modal } from '@/components/Portal';
import { useAction, Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { money } from '@/lib/checkout';
import { fmtStamp } from '@/lib/format';
import { STATUS_LABEL } from '@/components/Commerce';

const KINDS = { course: 'Course', service: 'Service', donation: 'Donation' };
const FULFIL = { new: 'New', contacted: 'Contacted', done: 'Completed' };

function ProductForm({ initial, onClose, onSaved }) {
  const run = useAction();
  const isNew = !initial;
  const [f, setF] = useState({
    kind: initial?.kind || 'course', title: initial?.title || '', summary: initial?.summary || '',
    description: initial?.description || '', price: initial?.price ?? '', durationText: initial?.durationText || '',
    outcomes: (initial?.outcomes || []).join('\n'), active: initial ? !!initial.active : false,
  });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, price: Number(f.price) };
    const r = await run(() => (isNew ? api('POST', '/admin/catalog', body) : api('PUT', `/admin/catalog/${initial.slug}`, body)), isNew ? 'Added' : 'Saved');
    setBusy(false);
    if (r) { onSaved(); onClose(); }
  };
  return (
    <Modal title={isNew ? 'Add a course or service' : `Edit ${initial.title}`} onClose={onClose} wide>
      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        {isNew && (
          <div className="field"><span className="label">Type</span>
            <div className="segmented" role="group" aria-label="Type">
              {['course', 'service'].map(k => <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })}>{KINDS[k]}</button>)}
            </div>
          </div>
        )}
        <div className="field"><label htmlFor="pt">Title</label><input id="pt" className="input" value={f.title} onChange={set('title')} required maxLength={120} /></div>
        <div className="field"><label htmlFor="ps">Short summary</label><input id="ps" className="input" value={f.summary} onChange={set('summary')} maxLength={240} /></div>
        <div className="field"><label htmlFor="pd">Full description</label><textarea id="pd" className="input" rows={4} value={f.description} onChange={set('description')} maxLength={4000} /></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="pp">Price (₹)</label><input id="pp" className="input" inputMode="numeric" value={f.price} onChange={set('price')} required /></div>
          <div className="field"><label htmlFor="pdur">Duration or format</label><input id="pdur" className="input" value={f.durationText} onChange={set('durationText')} maxLength={120} placeholder="e.g. 6 weeks, online" /></div>
        </div>
        <div className="field"><label htmlFor="po">What is included or learned (one per line)</label><textarea id="po" className="input" rows={4} value={f.outcomes} onChange={set('outcomes')} /></div>
        <label className="check-line"><input type="checkbox" checked={f.active} onChange={set('active')} /> Published on the website</label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${busy ? 'busy' : ''}`} type="submit"><Icon name="check" />{isNew ? 'Add' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Catalogue() {
  const run = useAction();
  const [d, load] = useLoad('/admin/catalog', { products: [] });
  const [edit, setEdit] = useState(null);
  if (!d) return <Loader />;
  const toggle = async p => { if (await run(() => api('PUT', `/admin/catalog/${p.slug}`, { active: !p.active }), p.active ? 'Hidden from the website' : 'Published')) load(); };
  return (
    <>
      <div className="toolbar"><button className="btn" onClick={() => setEdit('new')}><Icon name="plus" />Add a course or service</button></div>
      {!d.products.length ? <div className="empty"><Icon name="list" /><p>No courses or services yet.</p></div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Title</th><th>Type</th><th>Price</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {d.products.map(p => (
                <tr key={p.slug}>
                  <td><b>{p.title}</b><span className="sub">{p.durationText}</span></td>
                  <td>{KINDS[p.kind]}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{money(p.price)}</td>
                  <td><span className={`badge ${p.active ? 'ok' : ''}`}>{p.active ? 'Published' : 'Draft'}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => setEdit(p)}>Edit</button>
                    <button className="btn outline sm" style={{ marginLeft: 6 }} onClick={() => toggle(p)}>{p.active ? 'Unpublish' : 'Publish'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ProductForm initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={load} />}
    </>
  );
}

function Orders() {
  const run = useAction();
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [d, load] = useLoad(`/admin/orders${kind ? `?kind=${kind}` : ''}`, { orders: [], totals: {} });
  if (!d) return <Loader />;
  const rows = d.orders.filter(o => !q || [o.id, o.title, o.customer, o.email, o.mobile].some(x => String(x || '').toLowerCase().includes(q.toLowerCase())));
  const setFulfil = async (o, fulfilment) => { if (await run(() => api('PUT', `/admin/orders/${o.id}`, { fulfilment }), 'Updated')) load(); };
  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="v">{money(d.totals.donations)}</div><div className="l">Donations received</div></div>
        <div className="card kpi"><div className="v">{money(d.totals.courses)}</div><div className="l">Course enrolments</div></div>
        <div className="card kpi"><div className="v">{money(d.totals.services)}</div><div className="l">Service requests paid</div></div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search order, name, mobile" />
        <select className="input" style={{ width: 'auto' }} value={kind} onChange={e => setKind(e.target.value)} aria-label="Type">
          <option value="">All types</option><option value="course">Courses</option><option value="service">Services</option><option value="donation">Donations</option>
        </select>
      </div>
      {!rows.length ? <div className="empty"><Icon name="card" /><p>No orders match.</p></div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Order</th><th>From</th><th>Amount</th><th>Payment</th><th>Follow-up</th></tr></thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.id}>
                  <td><b>{o.title}</b><span className="sub">{o.id} · {KINDS[o.kind]}{o.purpose ? ` · ${o.purpose}` : ''}</span></td>
                  <td>{o.customer || '—'}<span className="sub">{o.mobile || o.email}</span>{o.kind === 'service' && o.form?.preferred && <span className="sub">Prefers: {o.form.preferred}</span>}{o.kind === 'service' && o.form?.notes && <span className="sub" style={{ whiteSpace: 'normal' }}>{o.form.notes}</span>}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{money(o.amount)}</td>
                  <td><span className={`badge ${o.status === 'paid' ? 'ok' : o.status === 'failed' ? 'bad' : ''}`}>{STATUS_LABEL[o.status] || o.status}</span>{o.paidAt && <span className="sub">{fmtStamp(o.paidAt)}</span>}</td>
                  <td>
                    {o.kind === 'service' && o.status === 'paid' ? (
                      <select className="input" style={{ minHeight: 38, width: 'auto' }} value={o.fulfilment} onChange={e => setFulfil(o, e.target.value)} aria-label={`Status for ${o.id}`}>
                        {Object.entries(FULFIL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Commerce() {
  const [tab, setTab] = useState('catalogue');
  return (
    <>
      <PageHead title="Learning, services & donations" />
      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        <button role="tab" aria-selected={tab === 'catalogue'} onClick={() => setTab('catalogue')}>Courses &amp; services</button>
        <button role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>Orders &amp; donations</button>
      </div>
      {tab === 'catalogue' ? <Catalogue /> : <Orders />}
    </>
  );
}

export default function Page() {
  return <AdminShell><Commerce /></AdminShell>;
}
