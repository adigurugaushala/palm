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
const COURSE_STATUS = { active: 'Learning', completed: 'Completed' };

// ISO time to the value a datetime-local input expects (browser's local time).
const toLocalInput = iso => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const blankLesson = () => ({ title: '', url: '', notes: '' });
const blankSession = () => ({ title: '', startsAt: '', durationMin: 60, joinUrl: '' });

function ProductForm({ initial, onClose, onSaved }) {
  const run = useAction();
  const isNew = !initial;
  const [f, setF] = useState({
    kind: initial?.kind || 'course', title: initial?.title || '', summary: initial?.summary || '',
    description: initial?.description || '', price: initial?.price ?? '', durationText: initial?.durationText || '',
    outcomes: (initial?.outcomes || []).join('\n'), active: initial ? !!initial.active : false,
  });
  const [lessons, setLessons] = useState(() => (initial?.lessons || []).map(l => ({ title: l.title || '', url: l.url || '', notes: l.notes || '' })));
  const [sessions, setSessions] = useState(() => (initial?.sessions || []).map(x => ({ title: x.title || '', startsAt: toLocalInput(x.startsAt), durationMin: x.durationMin || 60, joinUrl: x.joinUrl || '' })));
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const editRow = (list, setList, i, patch) => setList(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, price: Number(f.price) };
    if (f.kind === 'course') {
      body.lessons = lessons.filter(l => l.title.trim() || l.url.trim() || l.notes.trim());
      body.sessions = sessions.filter(x => x.title.trim() || x.startsAt).map(x => {
        const d = new Date(x.startsAt);
        return { ...x, durationMin: Number(x.durationMin) || 60, startsAt: x.startsAt && !isNaN(d) ? d.toISOString() : '' };
      });
    }
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
        {f.kind === 'course' && (
          <>
            <fieldset className="course-content">
              <legend>Lessons</legend>
              <p className="sub" style={{ margin: '0 0 10px' }}>Learners see these after they enrol. Links must start with https://</p>
              {lessons.map((l, i) => (
                <div className="edit-row lessons" key={i}>
                  <div className="field"><label htmlFor={`lt${i}`}>Lesson title</label><input id={`lt${i}`} className="input" value={l.title} maxLength={120} onChange={e => editRow(lessons, setLessons, i, { title: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`lu${i}`}>Video or reading link</label><input id={`lu${i}`} className="input" type="url" value={l.url} maxLength={500} placeholder="https://" onChange={e => editRow(lessons, setLessons, i, { url: e.target.value })} /></div>
                  <button type="button" className="btn ghost sm" onClick={() => setLessons(lessons.filter((_, j) => j !== i))} aria-label={`Remove lesson ${i + 1}`}>Remove</button>
                  <div className="field wide"><label htmlFor={`ln${i}`}>Notes for the learner</label><input id={`ln${i}`} className="input" value={l.notes} maxLength={1000} onChange={e => editRow(lessons, setLessons, i, { notes: e.target.value })} /></div>
                </div>
              ))}
              <button type="button" className="btn outline sm" onClick={() => setLessons([...lessons, blankLesson()])}><Icon name="plus" />Add a lesson</button>
            </fieldset>
            <fieldset className="course-content">
              <legend>Live classes</legend>
              {sessions.map((x, i) => (
                <div className="edit-row sessions" key={i}>
                  <div className="field"><label htmlFor={`st${i}`}>Class title</label><input id={`st${i}`} className="input" value={x.title} maxLength={120} onChange={e => editRow(sessions, setSessions, i, { title: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`ss${i}`}>Starts</label><input id={`ss${i}`} className="input" type="datetime-local" value={x.startsAt} onChange={e => editRow(sessions, setSessions, i, { startsAt: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`sd${i}`}>Minutes</label><input id={`sd${i}`} className="input" inputMode="numeric" value={x.durationMin} onChange={e => editRow(sessions, setSessions, i, { durationMin: e.target.value })} /></div>
                  <button type="button" className="btn ghost sm" onClick={() => setSessions(sessions.filter((_, j) => j !== i))} aria-label={`Remove live class ${i + 1}`}>Remove</button>
                  <div className="field wide"><label htmlFor={`sj${i}`}>Join link</label><input id={`sj${i}`} className="input" type="url" value={x.joinUrl} maxLength={500} placeholder="https://" onChange={e => editRow(sessions, setSessions, i, { joinUrl: e.target.value })} /></div>
                </div>
              ))}
              <button type="button" className="btn outline sm" onClick={() => setSessions([...sessions, blankSession()])}><Icon name="plus" />Add a live class</button>
            </fieldset>
          </>
        )}
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
  const [product, setProduct] = useState('');
  const [q, setQ] = useState('');
  const [cat] = useLoad('/admin/catalog', { products: [] });
  const qs = new URLSearchParams();
  if (kind) qs.set('kind', kind);
  if (product) qs.set('product', product);
  const [d, load] = useLoad(`/admin/orders${qs.toString() ? `?${qs}` : ''}`, { orders: [], totals: {} });
  if (!d) return <Loader />;
  const rows = d.orders.filter(o => !q || [o.id, o.title, o.customer, o.email, o.mobile].some(x => String(x || '').toLowerCase().includes(q.toLowerCase())));
  const setFulfil = async (o, fulfilment) => { if (await run(() => api('PUT', `/admin/orders/${o.id}`, { fulfilment }), 'Updated')) load(); };
  const setCourse = async (o, courseStatus) => { if (await run(() => api('PUT', `/admin/orders/${o.id}/course`, { courseStatus }), courseStatus === 'completed' ? 'Marked complete' : 'Set to learning')) load(); };
  const courses = (cat?.products || []).filter(p => p.kind === 'course');
  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="v">{money(d.totals.donations)}</div><div className="l">Donations received</div></div>
        <div className="card kpi"><div className="v">{money(d.totals.courses)}</div><div className="l">Course enrolments</div></div>
        <div className="card kpi"><div className="v">{money(d.totals.services)}</div><div className="l">Service requests paid</div></div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search order, name, mobile" />
        <select className="input" style={{ width: 'auto' }} value={kind} onChange={e => { setKind(e.target.value); if (e.target.value !== 'course') setProduct(''); }} aria-label="Type">
          <option value="">All types</option><option value="course">Courses</option><option value="service">Services</option><option value="donation">Donations</option>
        </select>
        {kind === 'course' && (
          <select className="input" style={{ width: 'auto' }} value={product} onChange={e => setProduct(e.target.value)} aria-label="Course">
            <option value="">All courses</option>
            {courses.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
        )}
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
                    ) : o.kind === 'course' && o.status === 'paid' ? (
                      <>
                        <select className="input" style={{ minHeight: 38, width: 'auto' }} value={o.courseStatus || 'active'} onChange={e => setCourse(o, e.target.value)} aria-label={`Progress for ${o.id}`}>
                          {Object.entries(COURSE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        {o.certificateNo && (o.courseStatus === 'completed') && <span className="sub">Certificate {o.certificateNo}</span>}
                      </>
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
