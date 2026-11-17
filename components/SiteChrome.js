'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from './Providers';
import { BrandMark, Mandala } from './Ornaments';
import Icon from './Icon';
import { homeFor } from '@/lib/api';

// Anchor links work on the landing page; elsewhere they point back to it.
const anchor = (onHome, id) => (onHome ? `#${id}` : `/#${id}`);

export function SiteNav({ onHome = false, showReviews = false }) {
  const { t, lang, setLang, me } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const links = [
    ['how', t('navHow')], ['palmistry', t('navPalmistry')], ['topics', t('navTopics')],
    ...(showReviews ? [['reviews', t('navReviews')]] : []), ['pricing', t('navPricing')],
  ];
  const account = me ? { href: homeFor(me), label: me.role === 'customer' ? t('overview') : 'Workspace' } : { href: '/login', label: t('signIn') };

  return (
    <>
      <header className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link href="/" className="brand" aria-label="Guruji home">
            <BrandMark size={30} />
            <span className="wordmark" style={{ fontSize: 21, color: 'var(--burgundy)' }}>GURUJI</span>
          </Link>
          <nav className="links" aria-label="Primary">
            {links.map(([id, label]) => <a key={id} href={anchor(onHome, id)} data-scroll>{label}</a>)}
          </nav>
          <div className="actions">
            <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'te' : 'en')} aria-label="Switch language">{t('language')}</button>
            <Link href={account.href} className="signin">{account.label}</Link>
            <Link href="/book" className="btn">{t('book')}</Link>
            <button className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="nav-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <Mandala size={520} className="bg-mandala" />
          <div className="top">
            <span className="brand"><BrandMark size={28} /><span className="wordmark" style={{ fontSize: 19, color: 'var(--ivory)' }}>GURUJI</span></span>
            <button className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="close" /></button>
          </div>
          <nav aria-label="Mobile">
            {links.map(([id, label]) => <a key={id} href={anchor(onHome, id)} data-scroll onClick={() => setOpen(false)}>{label}</a>)}
          </nav>
          <div className="foot">
            <Link href="/book" className="btn gold block" onClick={() => setOpen(false)}>{t('bookYour')}</Link>
            <Link href={account.href} className="btn on-dark outline block" onClick={() => setOpen(false)}>{account.label}</Link>
            <button className="btn on-dark outline block" onClick={() => setLang(lang === 'en' ? 'te' : 'en')}>{t('language')}</button>
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter({ onHome = false }) {
  const { cfg, t } = useApp();
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <Mandala size={560} className="bg-mandala" />
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand"><BrandMark size={34} /><span className="wordmark" style={{ fontSize: 22, color: 'var(--ivory)' }}>GURUJI</span></span>
            <p>{t('tagline')}</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li><a href={anchor(onHome, 'how')} data-scroll>{t('navHow')}</a></li>
              <li><a href={anchor(onHome, 'palmistry')} data-scroll>{t('navPalmistry')}</a></li>
              <li><a href={anchor(onHome, 'topics')} data-scroll>{t('navTopics')}</a></li>
              <li><a href={anchor(onHome, 'pricing')} data-scroll>{t('navPricing')}</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Your account</h4>
            <ul>
              <li><Link href="/login">{t('signIn')}</Link></li>
              <li><Link href="/register">Create an account</Link></li>
              <li><Link href="/book">{t('book')}</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><Link href="/help">Help &amp; questions</Link></li>
              {cfg.supportEmail && <li><a href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a></li>}
              <li><Link href="/terms">Terms &amp; Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} Guruji. Palmistry is offered as traditional guidance.</span>
          <Link href="/staff">Staff sign-in</Link>
        </div>
      </div>
    </footer>
  );
}

// Shared layout for simple public pages (help, terms, auth).
export function PublicPage({ children }) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
