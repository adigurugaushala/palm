'use client';
import { useMemo, useState } from 'react';
import Icon from './Icon';

// Month-view date picker. `days` is the /api/slots response: [{ date: 'YYYY-MM-DD', slots: [{ time, available }] }].
// Dates in that list are bookable (orange when a time is still free, red-tinted when fully booked);
// every other date is shown as not open. All dates are Indian calendar dates (IST).

const TZ = 'Asia/Kolkata';
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(y, m) {
  return new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function MonthCalendar({ days, selected, onSelect }) {
  const byDate = useMemo(() => Object.fromEntries(days.map(d => [d.date, d])), [days]);
  const firstOpen = days.find(d => d.slots.some(s => s.available)) || days[0];
  const start = (selected || firstOpen?.date || todayIST()).split('-').map(Number);

  const [view, setView] = useState({ y: start[0], m: start[1] - 1 });
  const today = todayIST();
  const lastDate = days.length ? days[days.length - 1].date : today;
  const [ty, tm] = today.split('-').map(Number);
  const [ly, lm] = lastDate.split('-').map(Number);
  const canPrev = view.y > ty || (view.y === ty && view.m > tm - 1);
  const canNext = view.y < ly || (view.y === ly && view.m < lm - 1);

  const first = new Date(Date.UTC(view.y, view.m, 1, 12));
  const pad0 = first.getUTCDay();
  const count = new Date(Date.UTC(view.y, view.m + 1, 0, 12)).getUTCDate();
  const cells = [...Array(pad0).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const status = date => {
    if (date < today) return 'past';
    const d = byDate[date];
    if (!d) return 'closed';
    return d.slots.some(s => s.available) ? 'open' : 'full';
  };
  const labelFor = { open: 'open, times available', full: 'fully booked', closed: 'not open for booking', past: 'in the past' };

  const shift = n => setView(v => {
    const t = new Date(Date.UTC(v.y, v.m + n, 1, 12));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
  });

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month"><Icon name="arrowLeft" /></button>
        <h4>{monthLabel(view.y, view.m)}</h4>
        <button type="button" className="cal-nav" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month"><Icon name="arrowRight" /></button>
      </div>

      <div className="cal-grid" role="grid" aria-label={monthLabel(view.y, view.m)}>
        {WD.map(w => <div key={w} className="cal-wd" role="columnheader">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal-cell empty" aria-hidden="true" />;
          const date = ymd(view.y, view.m, d);
          const st = status(date);
          const isSel = selected === date;
          const disabled = st !== 'open';
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              className={`cal-cell ${st} ${isSel ? 'sel' : ''} ${date === today ? 'today' : ''}`}
              aria-pressed={isSel}
              aria-label={`${date}, ${labelFor[st]}`}
              disabled={disabled}
              onClick={() => onSelect(date)}
            >
              <span>{d}</span>
            </button>
          );
        })}
      </div>

      <ul className="cal-legend" aria-label="Legend">
        <li><i className="k open" />Available</li>
        <li><i className="k full" />Fully booked</li>
        <li><i className="k closed" />Not open</li>
      </ul>
    </div>
  );
}
