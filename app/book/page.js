'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerShell } from '@/components/Shells';
import { useApp, useAction, Loader } from '@/components/Providers';
import { BookingStepper } from '@/components/Portal';
import MonthCalendar from '@/components/MonthCalendar';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';
import { dayParts, fmtDayLong, inr } from '@/lib/format';

function Book() {
  const { cfg, t } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const run = useAction();
  const [days, setDays] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('GET', '/slots').then(r => setDays(r.days)).catch(() => setDays([]));
  useEffect(() => {
    load();
    const topic = params.get('topic');
    if (topic) try { sessionStorage.setItem('gj:topic', topic); } catch {}
  }, [params]);

  if (!days) return <Loader label="Finding available times…" />;
  const day = days.find(d => d.date === selDate) || null;
  const openCount = d => d.slots.filter(s => s.available).length;
  const nextOpen = days.find(d => openCount(d) > 0);

  const reserve = async () => {
    setBusy(true);
    const r = await run(() => api('POST', '/bookings', { date: day.date, slot }));
    setBusy(false);
    if (r) {
      try { sessionStorage.setItem('gj:pay:' + r.booking.id, JSON.stringify({ ...r.payment, used: false })); } catch {}
      router.push(`/book/${r.booking.id}/pay`);
    } else { setSlot(null); load(); }
  };

  const summary = (
    <div className="card summary">
      <h3>Your consultation</h3>
      <div className="line"><span>Date</span><span>{day ? fmtDayLong(day.date) : '—'}</span></div>
      <div className="line"><span>Time</span><span>{slot || '—'}</span></div>
      <div className="line"><span>Session</span><span>Length depends on your questions</span></div>
      <div className="line"><span>Consultation</span><span>{inr(cfg.base)}</span></div>
      <div className="line"><span>GST ({cfg.gstPercent}%)</span><span>{inr(cfg.gst)}</span></div>
      <div className="total"><span>Total</span><b>{inr(cfg.price)}</b></div>
      <button className={`btn block ${busy ? 'busy' : ''}`} style={{ marginTop: 18 }} disabled={!slot} onClick={reserve}>Continue to payment<Icon name="arrowRight" /></button>
      <p className="muted" style={{ marginTop: 12, display: 'flex', gap: 8 }}><Icon name="shield" size={16} />Your time is held for a few minutes while you pay.</p>
    </div>
  );

  return (
    <>
      <div className="page-head"><div><span className="eyebrow on-ivory">New consultation</span><h1>{t('stepTime')}</h1></div></div>
      <BookingStepper step={0} />
      <div className="layout-2">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="card">
            <div className="card-title"><h3>Choose a date</h3><span className="muted">India Standard Time</span></div>
            {days.length ? (
              <>
                <MonthCalendar days={days} selected={selDate} onSelect={d => { setSelDate(d); setSlot(null); }} />
                {nextOpen && !day && (
                  <button type="button" className="btn outline sm next-open" onClick={() => { setSelDate(nextOpen.date); setSlot(null); }}>
                    <Icon name="calendar" />Jump to the next available date
                  </button>
                )}
              </>
            ) : <p className="muted">No dates are open for booking right now. Please check back soon.</p>}
          </section>
          {day && (
            <section className="card">
              <div className="card-title"><h3>Available times</h3><span className="muted">{fmtDayLong(day.date)}</span></div>
              <div className="slot-grid" role="group" aria-label="Times">
                {day.slots.map(s => (
                  <button key={s.time} className="slot-btn" aria-pressed={slot === s.time} disabled={!s.available} onClick={() => setSlot(s.time)}>
                    <Icon name="clock" />{s.time}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ marginTop: 14 }}>Times that are crossed out are already booked or too soon to prepare for.</p>
            </section>
          )}
        </div>
        <aside className="side">{summary}</aside>
      </div>
      <div className="sticky-cta">
        <div className="p">{inr(cfg.price)}<small>{slot && day ? `${dayParts(day.date).wd} ${dayParts(day.date).day} ${dayParts(day.date).mon} · ${slot}` : day ? 'Choose a time' : 'Choose a date'}</small></div>
        <button className={`btn ${busy ? 'busy' : ''}`} disabled={!slot} onClick={reserve}>Continue</button>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell sticky><Suspense fallback={<Loader />}><Book /></Suspense></CustomerShell>;
}
