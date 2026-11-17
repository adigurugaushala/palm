'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { fmtStamp } from '@/lib/format';

export default function Page() {
  return <CustomerShell><Course /></CustomerShell>;
}

// A live class can be joined from 15 minutes before it starts until it has run for its length.
const JOIN_EARLY_MS = 15 * 60 * 1000;
function joinState(x, now) {
  const start = new Date(x.startsAt).getTime();
  const end = start + (x.durationMin || 60) * 60 * 1000;
  if (now < start - JOIN_EARLY_MS) return 'upcoming';
  if (now > end) return 'ended';
  return 'open';
}

function Course() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { api('GET', `/learning/${id}`).then(r => setC(r.course)).catch(e => setErr(e.message || 'Course not found')); }, [id]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (err) return <p className="muted">{err}. <Link className="link" href="/learning">Back to learning &amp; orders</Link></p>;
  if (!c) return <Loader />;

  const done = c.courseStatus === 'completed';
  const upcoming = c.sessions.filter(x => joinState(x, now) !== 'ended');
  return (
    <>
      <div className="page-head"><div><Link className="back-link" href="/learning"><Icon name="arrowLeft" />Learning &amp; orders</Link><span className="eyebrow on-ivory">Your course</span><h1>{c.title}</h1>
        <p className="muted" style={{ margin: 0 }}>{c.durationText}{c.paidAt ? ` · Enrolled ${fmtStamp(c.paidAt)}` : ''}</p></div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><h3>Progress</h3><span className={`badge ${done ? 'ok' : 'gold'}`}>{done ? 'Completed' : 'Learning'}</span></div>
        {done ? (
          <div className="row wrap" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0 }}>Guruji has marked this course complete. Your certificate is ready{c.completedAt ? `, completed ${fmtStamp(c.completedAt)}` : ''}.</p>
            <button className="btn" type="button" onClick={() => window.open(`/api/learning/${c.id}/certificate.pdf`, '_blank', 'noopener')}><Icon name="document" />Download certificate</button>
          </div>
        ) : <p className="muted" style={{ margin: 0 }}>Your certificate will be available here once Guruji marks the course complete.</p>}
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><h3>Live classes</h3></div>
        {upcoming.length ? (
          <div className="list-rows">
            {upcoming.map((x, i) => {
              const st = joinState(x, now);
              return (
                <div className="list-row" key={i} style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                  <div><span className="t">{x.title}</span><span className="s" style={{ display: 'block' }}>{fmtStamp(x.startsAt)} · {x.durationMin} minutes</span></div>
                  <div>
                    {x.joinUrl && st === 'open'
                      ? <a className="btn sm" href={x.joinUrl} target="_blank" rel="noopener noreferrer"><Icon name="calendar" />Join class</a>
                      : <span className="s">{x.joinUrl ? 'Join opens 15 minutes before the class' : 'Link to follow'}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="muted" style={{ margin: 0 }}>No live classes are scheduled yet.</p>}
      </section>

      <section className="card">
        <div className="card-title"><h3>Lessons</h3></div>
        {c.lessons.length ? (
          <ol className="lesson-list">
            {c.lessons.map((l, i) => (
              <li key={i}>
                <div><span className="t">{l.title}</span>{l.notes && <span className="s" style={{ display: 'block' }}>{l.notes}</span>}</div>
                {l.url ? <a className="btn outline sm" href={l.url} target="_blank" rel="noopener noreferrer">Open lesson</a> : <span className="s">Lesson material to follow</span>}
              </li>
            ))}
          </ol>
        ) : <p className="muted" style={{ margin: 0 }}>Lessons will appear here as Guruji publishes them.</p>}
      </section>
    </>
  );
}
