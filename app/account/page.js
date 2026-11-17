'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerShell } from '@/components/Shells';
import { useApp, Loader } from '@/components/Providers';
import BookingRow from '@/components/BookingRow';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import { api } from '@/lib/api';
import { fmtDayLong, firstName } from '@/lib/format';

// The booking a customer most likely cares about right now.
const currentBooking = list => list.find(b => !b.cancelled && b.status < 7) || null;

function nextAction(b) {
  if (b.flag?.type === 'returned' && b.editable) return { href: `/book/${b.id}/details?step=palm`, label: 'Update your photographs', icon: 'camera' };
  if (b.status <= 1 && b.editable) return { href: `/book/${b.id}/details`, label: 'Add your details', icon: 'document' };
  if (b.status >= 3) return { href: `/bookings/${b.id}/session`, label: 'Open your session room', icon: 'video' };
  return null;
}

function Dashboard() {
  const { me, t, cfg } = useApp();
  const [list, setList] = useState(null);
  useEffect(() => { api('GET', '/bookings').then(r => setList(r.bookings)).catch(() => setList([])); }, []);
  if (!list) return <Loader />;
  const cur = currentBooking(list);
  const act = cur && nextAction(cur);
  const reports = list.filter(b => b.reportReady);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

  return (
    <>
      <div className="page-head greet">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <Avatar src={me.avatarUrl} name={me.name} size={56} />
          <div><span className="eyebrow on-ivory">{today}</span><h1>{t('namaste')}, <em>{firstName(me.name) || 'friend'}</em></h1></div>
        </div>
        <Link href="/book" className="btn"><Icon name="plus" />{t('book')}</Link>
      </div>

      {cur ? (
        <section className="panel-burgundy next-card" aria-label="Your upcoming consultation">
          <span className="frame" />
          <div style={{ position: 'relative' }}>
            <span className="eyebrow">Upcoming consultation</span>
            <div className="when">{fmtDayLong(cur.date)}</div>
            <div className="meta">
              <span><Icon name="clock" />{cur.slot}</span>
              <span><Icon name="document" />Booking {cur.id}</span>
              {cur.reviewer && <span><Icon name="user" />{cur.reviewer}</span>}
            </div>
            <div className="prog">
              <div className="progress"><i style={{ width: `${((cur.status + 1) / 8) * 100}%` }} /></div>
              <small>STEP {cur.status + 1} OF 8 · {cur.statusLabel.toUpperCase()}</small>
            </div>
            {cur.flag && <div className="notice warn" style={{ marginTop: 18, maxWidth: 520 }}><Icon name="alert" />{cur.flag.type === 'returned' ? `Guruji asked: ${cur.flag.reason}` : cur.flag.reason}</div>}
          </div>
          <div className="actions">
            {act && <Link href={act.href} className="btn gold"><Icon name={act.icon} />{act.label}</Link>}
            <Link href={`/bookings/${cur.id}`} className="btn on-dark outline">View booking status</Link>
          </div>
        </section>
      ) : (
        <section className="panel-burgundy next-card">
          <span className="frame" />
          <div style={{ position: 'relative' }}>
            <span className="eyebrow">{list.length ? 'Ready for another reading?' : 'Your first consultation'}</span>
            <div className="when">Choose a time with Guruji</div>
            <p style={{ maxWidth: 480 }}>Book a personal consultation, share your palm photographs and receive a written report in English or Telugu.</p>
          </div>
          <div className="actions"><Link href="/book" className="btn gold"><Icon name="calendar" />{t('bookYour')}</Link></div>
        </section>
      )}

      <div className="layout-2" style={{ marginTop: 24 }}>
        <section className="card">
          <div className="card-title"><h3>Recent bookings</h3>{list.length > 0 && <Link href="/bookings" className="link small">All bookings</Link>}</div>
          {list.length ? <div className="list-rows">{list.slice(0, 5).map(b => <BookingRow key={b.id} b={b} />)}</div>
            : <div className="empty"><Icon name="calendar" /><h3>No bookings yet</h3><p>Your consultations will appear here.</p></div>}
        </section>
        <aside className="side">
          <div className="card">
            <div className="card-title"><h3>Reports</h3></div>
            {reports.length ? (
              <>
                <p className="small">You have {reports.length} published report{reports.length > 1 ? 's' : ''}.</p>
                <Link href="/reports" className="btn outline block" style={{ marginTop: 14 }}><Icon name="document" />Read your reports</Link>
              </>
            ) : <p className="small">Your written report appears here once Guruji has published it.</p>}
          </div>
          <div className="card">
            <div className="card-title"><h3>Learning, services &amp; giving</h3></div>
            <div className="list-rows">
              <Link href="/courses" className="list-row"><Icon name="document" /><span><span className="t">Courses</span><span className="s" style={{ display: 'block' }}>Learn palmistry step by step</span></span><Icon name="arrowRight" /></Link>
              <Link href="/services" className="list-row"><Icon name="palm" /><span><span className="t">Services</span><span className="s" style={{ display: 'block' }}>Spiritual and palmistry services</span></span><Icon name="arrowRight" /></Link>
              <Link href="/donate" className="list-row"><Icon name="heart" /><span><span className="t">Donate</span><span className="s" style={{ display: 'block' }}>Support Guruji&rsquo;s community work</span></span><Icon name="arrowRight" /></Link>
            </div>
            <Link href="/learning" className="link small" style={{ display: 'inline-block', marginTop: 12 }}>Your learning, orders and receipts</Link>
          </div>
          <div className="card">
            <div className="card-title"><h3>Need help?</h3></div>
            <p className="small">Questions about a booking, payment or your photographs — we&rsquo;re glad to help.</p>
            <div className="row wrap" style={{ marginTop: 14 }}>
              <Link href="/help" className="btn ghost sm"><Icon name="info" />Help</Link>
              {cfg.supportEmail && <a href={`mailto:${cfg.supportEmail}`} className="btn ghost sm"><Icon name="chat" />Email us</a>}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return <CustomerShell><Dashboard /></CustomerShell>;
}
