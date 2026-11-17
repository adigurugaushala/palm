'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp, RequireRole } from './Providers';
import { BrandMark, Mandala } from './Ornaments';
import Icon from './Icon';
import { api } from '@/lib/api';

function useSignOut() {
  const { setMe } = useApp();
  const router = useRouter();
  return async () => {
    try { await api('POST', '/auth/logout'); } catch {}
    setMe(null);
    router.replace('/');
  };
}

const CUSTOMER_NAV = [
  ['/account', 'home', 'overview'],
  ['/book', 'calendar', 'bookShort'],
  ['/bookings', 'list', 'bookings'],
  ['/reports', 'document', 'reports'],
  ['/profile', 'user', 'profile'],
];

export function CustomerShell({ children, sticky = false }) {
  const { me, t, lang, setLang } = useApp();
  const path = usePathname();
  const signOut = useSignOut();
  const active = href => (href === '/account' ? path === href : path.startsWith(href) && !(href === '/book' && path.startsWith('/bookings')));
  return (
    <RequireRole roles={['customer']}>
      <div className={sticky ? 'has-sticky' : ''}>
        <header className="app-top">
          <div className="container">
            <Link href="/" className="brand" aria-label="Guruji home"><BrandMark size={28} /><span className="wordmark" style={{ fontSize: 19, color: 'var(--burgundy)' }}>GURUJI</span></Link>
            <nav aria-label="Account">
              {CUSTOMER_NAV.map(([href, ic, k]) => (
                <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={ic} />{t(k)}</Link>
              ))}
            </nav>
            <div className="right">
              <span className="who">{me?.name}</span>
              <button className="btn ghost sm" onClick={() => setLang(lang === 'en' ? 'te' : 'en')}>{t('language')}</button>
              <button className="icon-btn" onClick={signOut} aria-label={t('signOut')} title={t('signOut')}><Icon name="logout" /></button>
            </div>
          </div>
        </header>
        <main className="container app-main">{children}</main>
        <nav className="tabbar" aria-label="Account">
          {CUSTOMER_NAV.map(([href, ic, k]) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={ic} />{t(k)}</Link>
          ))}
        </nav>
      </div>
    </RequireRole>
  );
}

export function StaffShell({ children, roles = ['reviewer', 'admin'], nav }) {
  const { me } = useApp();
  const path = usePathname();
  const signOut = useSignOut();
  const items = (typeof nav === 'function' ? nav(me) : nav) || [];
  const isActive = href => path === href || (href !== '/admin' && href !== '/guruji' && path.startsWith(href));
  return (
    <RequireRole roles={roles}>
      <div className="staff">
        <aside className="staff-side" aria-label="Workspace navigation">
          <Link href="/" className="brand"><BrandMark size={28} /><span><span className="wordmark" style={{ fontSize: 18, color: 'var(--ivory)' }}>GURUJI</span><small>{me?.role === 'admin' ? 'Administration' : 'Guruji workspace'}</small></span></Link>
          {items.map(group => (
            <div key={group.title}>
              <div className="grp">{group.title}</div>
              {group.items.map(([href, ic, label]) => (
                <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}><Icon name={ic} />{label}</Link>
              ))}
            </div>
          ))}
          <div className="me">{me?.name}<small>{me?.email}</small></div>
          <button className="nav" onClick={signOut}><Icon name="logout" />Sign out</button>
        </aside>
        <div className="staff-mobile">
          <div className="bar">
            <span className="brand"><BrandMark size={24} /><span className="wordmark" style={{ fontSize: 16, color: 'var(--ivory)' }}>GURUJI</span></span>
            <button className="icon-btn" onClick={signOut} aria-label="Sign out"><Icon name="logout" /></button>
          </div>
          <nav className="scroller" aria-label="Workspace" ref={el => el?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })}>
            {items.flatMap(g => g.items).map(([href, , label]) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>)}
          </nav>
        </div>
        <main className="staff-main">{children}</main>
      </div>
    </RequireRole>
  );
}

export const GURUJI_NAV = me => [
  { title: 'Consultations', items: [['/guruji', 'home', 'Overview'], ['/guruji/cases', 'list', 'All cases']] },
  ...(me?.role === 'admin' ? [{ title: 'Administration', items: [['/admin', 'chart', 'Admin dashboard']] }] : []),
];

export const ADMIN_NAV = [
  { title: 'Overview', items: [['/admin', 'chart', 'Dashboard'], ['/admin/reports', 'chart', 'Reports']] },
  { title: 'Operations', items: [['/admin/orders', 'list', 'Bookings'], ['/admin/customers', 'users', 'Customers'], ['/admin/payments', 'card', 'Payments'], ['/admin/commerce', 'list', 'Learning & services'], ['/guruji', 'palm', 'Guruji workspace']] },
  { title: 'Management', items: [['/admin/team', 'user', 'Guruji team'], ['/admin/reviews', 'quote', 'Reviews'], ['/admin/settings', 'settings', 'Booking settings'], ['/admin/audit', 'audit', 'Audit log']] },
];

// Split-screen layout used by sign-in, registration and staff sign-in.
export function AuthLayout({ quote, children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <span className="frame" />
        <Mandala size={700} color="var(--orange-light)" strokeWidth={0.45} />
        <Link href="/" className="brand" style={{ position: 'relative' }}><BrandMark size={32} /><span className="wordmark" style={{ fontSize: 21, color: 'var(--ivory)' }}>GURUJI</span></Link>
        <blockquote>{quote}</blockquote>
        <span className="muted small">Private · Personal · Secure payment by PayU</span>
      </div>
      <div className="auth-form"><div className="inner">{children}</div></div>
    </div>
  );
}
