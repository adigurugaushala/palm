'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Icon, { Rating } from './Icon';
import { Mandala } from './Ornaments';
import { api, uploadWithProgress } from '@/lib/api';
import { fmtTime, fmtStamp, statusTone } from '@/lib/format';
import { useAction, useApp } from './Providers';

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

// Palm photograph viewer with zoom and rotate — used by customers and Guruji alike.
export function Lightbox({ src, label, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  return (
    <Modal title={label || 'Palm photograph'} onClose={onClose} wide>
      <div className="lightbox" style={{ overflow: 'auto', maxHeight: '72vh', background: 'var(--cream)', borderRadius: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label || 'Palm photograph'} style={{ transform: `scale(${zoom}) rotate(${rot}deg)` }} />
      </div>
      <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
        <button className="btn outline sm" onClick={() => setZoom(z => Math.min(3, z + 0.5))}><Icon name="zoomIn" />Zoom in</button>
        <button className="btn outline sm" onClick={() => setZoom(1)}>Reset</button>
        <button className="btn outline sm" onClick={() => setRot(r => r + 90)}><Icon name="rotate" />Rotate</button>
      </div>
    </Modal>
  );
}

export function StatusBadge({ b, label }) {
  return <span className={`badge ${statusTone(b)}`}>{label || (b.cancelled ? 'Cancelled' : b.statusLabel)}</span>;
}

export function BookingStepper({ step }) {
  const { t } = useApp();
  const steps = [t('stepTime'), t('stepPay'), t('stepDetails'), t('stepPalm'), t('stepDone')];
  return (
    <div className="book-stepper">
      <ol className="stepper" aria-label="Booking progress">
        {steps.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="dot">{i < step ? <Icon name="check" size={14} strokeWidth={2} /> : i + 1}</span><span className="lbl">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// The 8-step consultation journey as a vertical timeline.
export function Journey({ b, statuses }) {
  return (
    <ol className="timeline">
      {statuses.map((s, i) => {
        const state = i < b.status ? 'done' : i === b.status ? 'current' : '';
        return <li key={s} className={state}><span className="mk">{state === 'done' && <Icon name="check" strokeWidth={2.4} />}</span>{s}</li>;
      })}
    </ol>
  );
}

// Booking chat. Polls every 4 seconds while mounted.
export function Chat({ bookingId, empty }) {
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useAction();
  const box = useRef(null);
  const last = useRef(0);

  const pull = useCallback(async (initial) => {
    const r = await api('GET', `/bookings/${bookingId}/messages${initial ? '' : `?after=${last.current}`}`);
    if (initial) setMsgs(r.messages);
    else if (r.messages.length) setMsgs(m => [...(m || []), ...r.messages]);
    if (r.messages.length) last.current = r.messages[r.messages.length - 1].id;
  }, [bookingId]);

  useEffect(() => {
    pull(true).catch(() => setMsgs([]));
    const id = setInterval(() => pull(false).catch(() => {}), 4000);
    return () => clearInterval(id);
  }, [pull]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  const send = async e => {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const ok = await run(() => api('POST', `/bookings/${bookingId}/messages`, { body }));
    setBusy(false);
    if (ok) { setText(''); pull(false).catch(() => {}); }
  };

  return (
    <div className="chat">
      <div className="msgs" ref={box} aria-live="polite">
        {msgs === null ? <div className="skeleton" style={{ height: 60 }} /> :
          msgs.length === 0 ? <p className="muted" style={{ textAlign: 'center', margin: 'auto' }}>{empty}</p> :
            msgs.map(m => <div key={m.id} className={`msg ${m.mine ? 'me' : ''}`}>{m.body}<small>{m.mine ? 'You' : m.from} · {fmtTime(m.at)}</small></div>)}
      </div>
      <form onSubmit={send}>
        <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Write a message" maxLength={2000} aria-label="Message" />
        <button className={`btn ${busy ? 'busy' : ''}`} type="submit" aria-label="Send"><Icon name="send" /></button>
      </form>
    </div>
  );
}

// Jitsi Meet: public meet.jit.si limits embedded calls, so it opens in a new tab there;
// a self-hosted or JaaS deployment is embedded in the page with the External API.
export function MeetPanel({ meetUrl, displayName }) {
  const { cfg } = useApp();
  const [embedded, setEmbedded] = useState(false);
  const holder = useRef(null);
  const apiRef = useRef(null);
  const canEmbed = cfg.meet?.provider && cfg.meet.provider !== 'public';
  const room = meetUrl ? meetUrl.split('/').pop() : '';

  const open = audio => {
    const cfgHash = `#userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName || 'Guest'))}${audio ? '&config.startWithVideoMuted=true' : ''}`;
    window.open(meetUrl + cfgHash, '_blank', 'noopener');
  };
  useEffect(() => {
    if (!embedded || !holder.current || !meetUrl) return;
    const base = new URL(meetUrl);
    const s = document.createElement('script');
    s.src = `${base.origin}/external_api.js`;
    s.onload = () => {
      // eslint-disable-next-line no-undef
      apiRef.current = new JitsiMeetExternalAPI(base.host, { roomName: room, parentNode: holder.current, userInfo: { displayName }, width: '100%', height: '100%' });
      apiRef.current.addListener('readyToClose', () => setEmbedded(false));
    };
    document.body.appendChild(s);
    return () => { apiRef.current?.dispose(); s.remove(); };
  }, [embedded, meetUrl, room, displayName]);

  if (!meetUrl) return <div className="notice"><Icon name="info" />Your video room opens once a Guruji has been assigned to your consultation.</div>;
  return (
    <div className="meet-card">
      <div className="room"><Icon name="lock" />Private room, shared only with your Guruji</div>
      {embedded ? (
        <>
          <div className="jitsi-frame" ref={holder} />
          <button className="btn outline" onClick={() => setEmbedded(false)}>Leave the call</button>
        </>
      ) : (
        <div className="row wrap">
          <button className="btn" onClick={() => (canEmbed ? setEmbedded(true) : open(false))}><Icon name="video" />Join video consultation</button>
          <button className="btn outline" onClick={() => open(true)}><Icon name="phone" />Join by audio only</button>
        </div>
      )}
      {!canEmbed && <p className="muted">The call opens in a new tab on Jitsi Meet. Allow camera and microphone access when asked.</p>}
    </div>
  );
}

const GUIDES = [
  ['Dominant hand', 'The whole palm and fingers, fingers together'],
  ['Other hand', 'The whole palm and fingers, fingers together'],
  ['Side of the hand', 'The little-finger edge, to show the lines that wrap round'],
  ['Close-up (optional)', 'Any area Guruji should look at closely'],
];

function GuideSvg({ idx }) {
  // Small instructional line drawing per photo slot.
  return (
    <svg className="guide" viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g transform={idx === 1 ? 'translate(80 0) scale(-1 1)' : undefined}>
        {idx === 2 ? (
          <path d="M30 92V52C30 40 32 22 34 12C35 8 41 8 41 13V40M41 26C42 21 47 21 47 26V48M47 34C48 30 53 30 53 35V55C54 72 50 84 48 92" />
        ) : (
          <path d="M24 92L22 70C18 64 10 58 8 52C6 46 12 43 16 47L23 54V24C23 19 30 19 30 24V44V14C30 9 37 9 37 14V44V12C37 7 44 7 44 12V44V18C44 13 51 13 51 18V46V28C51 23 58 23 58 28V58C58 72 54 82 52 92" />
        )}
        {idx === 3 && <circle cx="40" cy="62" r="11" strokeDasharray="3 3" />}
      </g>
    </svg>
  );
}

async function prepImage(file) {
  if (!/^image\//.test(file.type)) throw new Error('Please choose an image file');
  if (file.size > 30e6) throw new Error('That image is too large');
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("We couldn't read that photo — please use JPG or PNG"); }
  const { width: w, height: h } = bmp;
  if (Math.min(w, h) < 300) throw new Error('This photo is too small — please retake it in good light');
  if (file.size <= 3e6 && Math.max(w, h) <= 2600 && /jpeg|png|webp/.test(file.type)) return file;
  const k = Math.min(1, 2400 / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
}

export function PhotoUploader({ booking, onChange }) {
  const [progress, setProgress] = useState({});
  const [over, setOver] = useState(-1);
  const [view, setView] = useState(null);
  const run = useAction();
  const inputs = useRef({});
  const photo = i => booking.photos.find(p => p.idx === i);

  const upload = async (i, file) => {
    if (!file) return;
    await run(async () => {
      const blob = await prepImage(file);
      const fd = new FormData();
      fd.append('photo', blob, 'palm.jpg');
      setProgress(p => ({ ...p, [i]: 0.02 }));
      try {
        const r = await uploadWithProgress(`/bookings/${booking.id}/photos/${i}`, fd, f => setProgress(p => ({ ...p, [i]: Math.max(0.02, f) })));
        onChange(r.booking);
      } finally { setProgress(p => ({ ...p, [i]: undefined })); }
    }, 'Photograph uploaded');
  };
  const remove = async i => {
    const r = await run(() => api('DELETE', `/bookings/${booking.id}/photos/${i}`), 'Photograph removed');
    if (r) onChange(r.booking);
  };

  return (
    <>
      <div className="photo-grid">
        {GUIDES.map(([title, hint], i) => {
          const p = photo(i);
          const pr = progress[i];
          return (
            <div className="photo-card" key={i}>
              <header>
                <div><h4>{i + 1}. {title}</h4><p>{hint}</p></div>
                {i < 3 ? <span className="badge brand">Required</span> : <span className="badge">Optional</span>}
              </header>
              <div className={`drop ${over === i ? 'over' : ''}`}
                onDragOver={e => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(-1)}
                onDrop={e => { e.preventDefault(); setOver(-1); upload(i, e.dataTransfer.files?.[0]); }}>
                {p ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${p.id}`} alt={`${title} photograph`} onClick={() => setView({ src: `/api/photos/${p.id}`, label: title })} />
                    <span className="ok"><Icon name="check" strokeWidth={2.2} /></span>
                  </>
                ) : (
                  <div><GuideSvg idx={i} /><p className="hint">Drop a photograph here, or use the buttons below. Bright, even light — no flash glare.</p></div>
                )}
              </div>
              <div className="bar-wrap">{pr !== undefined && <div className="progress" aria-label="Upload progress"><i style={{ width: `${pr * 100}%` }} /></div>}</div>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden ref={el => (inputs.current['f' + i] = el)} onChange={e => { upload(i, e.target.files[0]); e.target.value = ''; }} />
              <input type="file" accept="image/*" capture="environment" hidden ref={el => (inputs.current['c' + i] = el)} onChange={e => { upload(i, e.target.files[0]); e.target.value = ''; }} />
              <div className="btns">
                {p ? (
                  <>
                    <button className="btn outline sm" onClick={() => inputs.current['f' + i].click()}><Icon name="refresh" />Replace</button>
                    <button className="btn danger sm" onClick={() => remove(i)}><Icon name="trash" />Delete</button>
                  </>
                ) : (
                  <>
                    <button className={`btn sm ${pr !== undefined ? 'busy' : ''}`} onClick={() => inputs.current['f' + i].click()}><Icon name="upload" />Upload</button>
                    <button className="btn outline sm" onClick={() => inputs.current['c' + i].click()}><Icon name="camera" />Camera</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {view && <Lightbox {...view} onClose={() => setView(null)} />}
    </>
  );
}

export function ReportView({ report }) {
  const obs = Object.entries(report.checklist || {}).filter(([, v]) => v && v !== '—');
  return (
    <article className="card report">
      <div className="head">
        <Mandala size={64} detail="lite" />
        <span className="eyebrow on-ivory" style={{ display: 'block', marginTop: 14 }}>Palmistry consultation report</span>
        <h2>Your reading</h2>
        <p className="muted">Booking {report.id} · {report.reviewer}{report.publishedAt ? ` · ${fmtStamp(report.publishedAt)}` : ''}</p>
      </div>
      {obs.length > 0 && (
        <>
          <span className="label">Palm observations</span>
          <dl className="obs">{obs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </>
      )}
      <span className="label">Guruji&rsquo;s guidance</span>
      <div className="body" style={{ marginTop: 12 }}>{String(report.notes || '').split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
      <p className="sig">— {report.reviewer}</p>
    </article>
  );
}

export function ReviewForm({ bookingId }) {
  const [existing, setExisting] = useState(undefined);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useAction();
  useEffect(() => { api('GET', `/bookings/${bookingId}/review`).then(r => setExisting(r.review)).catch(() => setExisting(null)); }, [bookingId]);
  if (existing === undefined) return null;
  if (existing) return (
    <div className="card">
      <div className="card-title"><h3>Your review</h3><span className={`badge ${existing.status === 'approved' ? 'ok' : 'gold'}`}>{existing.status === 'approved' ? 'Published' : 'Awaiting approval'}</span></div>
      <Rating value={existing.rating} /><p style={{ marginTop: 8 }}>{existing.text}</p>
    </div>
  );
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    const r = await run(() => api('POST', `/bookings/${bookingId}/review`, { rating, text }), 'Thank you — your review will appear once approved');
    setBusy(false);
    if (r) setExisting({ rating, text, status: 'pending' });
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="card-title"><h3>Share your experience</h3></div>
      <p className="small" style={{ marginBottom: 14 }}>Reviews are published after a short check, with your first name and city only.</p>
      <div className="field"><span className="label">Rating</span>
        <div className="rate-pick" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={n <= rating} aria-label={`${n} of 5`} onClick={() => setRating(n)}><svg viewBox="0 0 12 12" width="16" height="16" aria-hidden="true"><path d="M6 .8L11.2 6L6 11.2L.8 6Z" fill={n <= rating ? 'var(--gold)' : 'none'} stroke="var(--gold)" /></svg></button>)}
        </div>
      </div>
      <div className="field"><label htmlFor="rv">Your words</label><textarea id="rv" className="input" value={text} onChange={e => setText(e.target.value)} maxLength={1200} required minLength={10} /></div>
      <button className={`btn ${busy ? 'busy' : ''}`} style={{ marginTop: 16 }} type="submit">Submit review</button>
    </form>
  );
}

// Minimal SVG bar chart (no chart library needed for this data size).
export function BarChart({ data, valueKey, labelKey, height = 220, format = v => v }) {
  const max = Math.max(1, ...data.map(d => d[valueKey]));
  const W = 720, H = height, pad = { l: 44, r: 8, t: 10, b: 26 };
  const bw = (W - pad.l - pad.r) / data.length;
  const ticks = [0, 0.5, 1].map(f => Math.round(max * f));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
      {ticks.map(tk => {
        const y = pad.t + (H - pad.t - pad.b) * (1 - tk / max);
        return <g key={tk}><line className="grid" x1={pad.l} x2={W - pad.r} y1={y} y2={y} /><text x={pad.l - 8} y={y + 3} textAnchor="end">{format(tk)}</text></g>;
      })}
      <line className="axis" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
      {data.map((d, i) => {
        const h = (H - pad.t - pad.b) * (d[valueKey] / max);
        const x = pad.l + i * bw + bw * 0.18;
        return (
          <g key={i}>
            <rect x={x} y={H - pad.b - h} width={bw * 0.64} height={Math.max(h, d[valueKey] ? 1 : 0)} rx="1.5" fill="url(#barG)"><title>{`${d[labelKey]}: ${format(d[valueKey])}`}</title></rect>
            {(i % Math.ceil(data.length / 8) === 0) && <text x={x + bw * 0.32} y={H - 8} textAnchor="middle">{d[labelKey].slice(5)}</text>}
          </g>
        );
      })}
      <defs><linearGradient id="barG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#971719" /><stop offset="1" stopColor="#7B1113" /></linearGradient></defs>
    </svg>
  );
}

export function HBars({ rows, gold = false }) {
  const max = Math.max(1, ...rows.map(r => r.n));
  return (
    <div className="hbars">
      {rows.map(r => (
        <div key={r.label} className={`hbar ${gold ? 'gold' : ''}`}>
          <span>{r.label}</span><span className="track"><i style={{ width: `${(r.n / max) * 100}%` }} /></span><span className="n">{r.n}</span>
        </div>
      ))}
    </div>
  );
}
