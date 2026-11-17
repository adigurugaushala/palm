'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StaffShell, GURUJI_NAV } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import { Chat, Lightbox, MeetPanel, Modal } from '@/components/Portal';
import { caseTone } from '@/components/CaseTable';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import { api } from '@/lib/api';
import { fmtDayLong, fmtStamp } from '@/lib/format';

const PHOTO_LABELS = ['Dominant hand', 'Other hand', 'Side of hand', 'Close-up'];

function Workspace() {
  const { id } = useParams();
  const router = useRouter();
  const { me } = useApp();
  const run = useAction();
  const [c, setC] = useState(null);
  const [items, setItems] = useState([]);
  const [vals, setVals] = useState([]);
  const [notes, setNotes] = useState('');
  const [save, setSave] = useState('saved');
  const [preview, setPreview] = useState(false);
  const [view, setView] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const timer = useRef(null);

  const load = useCallback(() => api('GET', `/staff/cases/${id}`).then(r => {
    setC(r.case); setItems(r.checkItems); setVals(r.checkValues); setNotes(r.case.reportNotes || '');
  }).catch(() => router.replace('/guruji/cases')), [id, router]);
  useEffect(() => { load(); }, [load]);

  const persistNotes = useCallback(async text => {
    setSave('saving');
    try { await api('PUT', `/staff/cases/${id}`, { reportNotes: text }); setSave('saved'); } catch { setSave('error'); }
  }, [id]);
  const onNotes = e => {
    const v = e.target.value;
    setNotes(v); setSave('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persistNotes(v), 800);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!c) return <Loader />;
  const f = c.form || {};
  const unassigned = !c.assignedTo;
  const mineOrAdmin = c.assignedTo === me.id || me.role === 'admin';
  const flagType = c.flag?.type;
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  const setCheck = async (k, v) => {
    setC(x => ({ ...x, checklist: { ...x.checklist, [k]: v } }));
    await run(() => api('PUT', `/staff/cases/${id}`, { checklist: { [k]: v } }));
  };
  const act = async (action, msg) => {
    setBusy(action);
    if (action === 'approve') { clearTimeout(timer.current); await persistNotes(notes); }
    const r = await run(() => api('POST', `/staff/cases/${id}/action`, { action, reason }), msg);
    setBusy(''); setDialog(null); setReason('');
    if (r) load();
  };
  const claim = async () => { if (await run(() => api('POST', `/staff/cases/${id}/claim`), 'Case claimed')) load(); };

  const kv = [['Date of birth', f.dob ? `${f.dob}${c.age != null ? ` (age ${c.age})` : ''}` : ''], ['Mobile', f.mob || c.customer?.mobile], ['Email', c.customer?.email],
    ['Language', f.lang], ['Consultation', f.ct], ['Dominant hand', c.hand], ['Birthplace', f.bp], ['Birth time', f.bt ? `${f.bt} (${f.ba || 'Known'})` : ''],
    ['Lives in', [f.city, f.cty].filter(Boolean).join(', ')], ['Gender', f.gn], ['Payment', c.payment ? `${c.payment.id} · ${c.payment.status}` : '']].filter(x => x[1]);

  return (
    <>
      <Link href="/guruji/cases" className="back-home"><Icon name="arrowLeft" />All cases</Link>
      <div className="case-head">
        <div>
          <span className="eyebrow on-ivory">Case {c.id}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Avatar src={c.customer?.avatarUrl} name={c.customer?.name || f.name} size={56} />
            <h1>{c.customer?.name || f.name}</h1>
          </div>
          <p className="small" style={{ marginTop: 4 }}>{fmtDayLong(c.date)} · {c.slot}{c.reviewer ? ` · ${c.reviewer}` : ''}</p>
        </div>
        <span className={`badge ${caseTone({ ...c, flag: c.flag ? `${c.flag.type}:` : '' })}`}>{c.statusLabel}</span>
      </div>

      {unassigned && <div className="notice" style={{ marginBottom: 18, alignItems: 'center' }}><Icon name="info" /><span className="grow">This case is unassigned. Claim it to work on it.</span><button className="btn sm" onClick={claim}>Claim case</button></div>}
      {flagType && <div className={`notice ${flagType === 'rejected' ? 'bad' : 'warn'}`} style={{ marginBottom: 18 }}><Icon name="alert" /><span><b>{flagType === 'returned' ? 'Returned to customer' : flagType === 'rejected' ? 'Rejected' : 'Attention'}:</b> {c.flag.reason}</span></div>}

      <div className="case-grid">
        <div style={{ display: 'grid', gap: 18 }}>
          <section className="card">
            <div className="card-title"><h3>Customer</h3></div>
            <dl className="kv">{kv.map(([k, v]) => <><dt key={k + 't'}>{k}</dt><dd key={k + 'd'}>{v}</dd></>)}</dl>
          </section>
          <section className="card">
            <div className="card-title"><h3>Their questions</h3></div>
            <div className="chips" style={{ marginBottom: c.note ? 14 : 0 }}>{c.questions.map(q => <span key={q} className="badge brand">{q}</span>)}</div>
            {c.note ? <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.5, color: 'var(--ink)' }}>&ldquo;{c.note}&rdquo;</p> : <p className="muted">No written question.</p>}
          </section>
          <section className="card">
            <div className="card-title"><h3>Palm photographs</h3><span className="muted">{c.photos.length} of 4</span></div>
            <div className="thumbs">
              {[0, 1, 2, 3].map(i => {
                const p = c.photos.find(x => x.idx === i);
                return p ? (
                  <button key={i} onClick={() => setView({ src: `/api/photos/${p.id}`, label: PHOTO_LABELS[i] })} aria-label={`View ${PHOTO_LABELS[i]}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${p.id}`} alt="" /><span>{PHOTO_LABELS[i]}</span>
                  </button>
                ) : <div key={i} className="thumbs missing" style={{ border: '1px dashed var(--line-strong)', borderRadius: 6, aspectRatio: '3/4', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--ink-3)' }}>{i < 3 ? 'Missing' : 'Optional'}</div>;
              })}
            </div>
          </section>
          <section className="card">
            <div className="card-title"><h3>Messages</h3></div>
            <Chat bookingId={c.id} empty="No messages yet. Introduce yourself or ask for anything you need." />
          </section>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          {c.meetUrl && <section className="card"><div className="card-title"><h3>Video consultation</h3></div><MeetPanel meetUrl={c.meetUrl} displayName={me.name} /></section>}
          <section className="card">
            <div className="card-title"><h3>Observation checklist</h3><span className="muted">Saved as you choose</span></div>
            {items.map(k => (
              <div className="check-row" key={k}>
                <span className="lbl">{k}</span>
                <div className="segmented" role="group" aria-label={k}>
                  {vals.filter(v => v !== '—').map(v => (
                    <button key={v} type="button" aria-pressed={(c.checklist?.[k] || '—') === v} disabled={!mineOrAdmin} onClick={() => setCheck(k, (c.checklist?.[k] === v ? '—' : v))}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <section className="card">
            <div className="editor-head">
              <h3 style={{ fontSize: '1.5rem' }}>Report</h3>
              <div className="row">
                <span className={`save-state ${save === 'saving' ? 'saving' : save === 'error' ? 'err' : ''}`}>{save === 'saving' ? 'Saving…' : save === 'error' ? 'Not saved — retrying on next edit' : 'Draft saved'}</span>
                <div className="segmented"><button aria-pressed={!preview} onClick={() => setPreview(false)}>Write</button><button aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button></div>
              </div>
            </div>
            {preview ? (
              <div className="report" style={{ padding: 0 }}><div className="body">{notes.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}{!notes.trim() && <p className="muted">Nothing written yet.</p>}</div></div>
            ) : (
              <textarea className="input" rows={14} value={notes} onChange={onNotes} disabled={!mineOrAdmin} aria-label="Report text"
                placeholder={'Write the reading in plain paragraphs.\n\nObservations — what you see in the hand and lines.\nInterpretation — what that traditionally indicates for their questions.\nGuidance — your recommendations.'} />
            )}
            <p className="muted" style={{ marginTop: 8 }}>{words} words · Separate paragraphs with a blank line. {c.reportPublishedAt ? `Published ${fmtStamp(c.reportPublishedAt)}.` : 'The customer sees this only after you send it.'}</p>
          </section>
          {mineOrAdmin && (
            <section className="card">
              <div className="card-title"><h3>Case actions</h3></div>
              <div className="action-bar">
                <button className={`btn outline ${busy === 'schedule' ? 'busy' : ''}`} disabled={c.status >= 5} onClick={() => act('schedule', 'Marked as scheduled')}><Icon name="calendar" />Mark scheduled</button>
                <button className={`btn outline ${busy === 'complete' ? 'busy' : ''}`} disabled={c.status >= 6} onClick={() => act('complete', 'Consultation marked complete')}><Icon name="check" />Consultation complete</button>
              </div>
              <div className="action-bar" style={{ marginTop: 10 }}>
                <button className="btn danger" disabled={c.status >= 7} onClick={() => { setReason('Please upload clearer palm photographs in bright, even light.'); setDialog('return'); }}>Return to customer</button>
                <button className="btn danger" disabled={c.status >= 7} onClick={() => { setReason(''); setDialog('reject'); }}>Reject</button>
              </div>
              <div className="send-steps">
                <p className="small muted">After the consultation: preview the PDF, check it, then send it to the customer yourself. Nothing is sent automatically.</p>
                <div className="action-bar" style={{ marginTop: 10 }}>
                  <button className="btn outline" disabled={c.status < 6 || !notes.trim()} onClick={() => window.open(`/api/bookings/${id}/report.pdf`, '_blank', 'noopener')}><Icon name="document" />Preview PDF</button>
                  <button className="btn block" disabled={!notes.trim() || c.status < 6} onClick={() => setDialog('approve')}><Icon name="chat" />{c.status >= 7 ? 'Send updated report' : 'Send to customer'}</button>
                </div>
                {c.status < 6 && <p className="small muted" style={{ marginTop: 8 }}>The PDF can be previewed once the consultation is marked complete.</p>}
              </div>
            </section>
          )}
        </div>
      </div>

      {view && <Lightbox {...view} onClose={() => setView(null)} />}
      {(dialog === 'return' || dialog === 'reject') && (
        <Modal title={dialog === 'return' ? 'Return to customer' : 'Reject this case'} onClose={() => setDialog(null)}>
          <p className="small" style={{ marginBottom: 14 }}>{dialog === 'return' ? 'The customer will see this message and can update their details or photographs.' : 'The customer will see this reason. Rejected cases leave the working queues; refunds are handled by an administrator.'}</p>
          <div className="field"><label htmlFor="why">{dialog === 'return' ? 'What should they change?' : 'Reason'}</label><textarea id="why" className="input" rows={4} value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div className="form-foot"><button className="btn ghost" onClick={() => setDialog(null)}>Cancel</button><button className={`btn ${dialog === 'reject' ? 'danger' : ''} ${busy ? 'busy' : ''}`} disabled={!reason.trim()} onClick={() => act(dialog, dialog === 'return' ? 'Returned to customer' : 'Case rejected')}>{dialog === 'return' ? 'Return case' : 'Reject case'}</button></div>
        </Modal>
      )}
      {dialog === 'approve' && (
        <Modal title={c.status >= 7 ? 'Send the updated report?' : 'Send this report to the customer?'} onClose={() => setDialog(null)}>
          <p>The customer will see the report and can download the PDF from their account. This only happens when you press Send.</p>
          <div className="form-foot"><button className="btn ghost" onClick={() => setDialog(null)}>Keep editing</button><button className={`btn ${busy ? 'busy' : ''}`} onClick={() => act('approve', 'Report sent to the customer')}>Send</button></div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <StaffShell nav={GURUJI_NAV}><Workspace /></StaffShell>;
}
