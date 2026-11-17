'use client';
import { useEffect, useRef, useState } from 'react';
import { Mandala } from './Ornaments';
import { useApp } from './Providers';

// Cinematic introduction: rotating gold mandala, drifting gold particles, wordmark and tagline.
// Shown once per browser session, skippable, ~2.6s, and static/quick with reduced motion.
export default function Intro() {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  const root = useRef(null);
  const canvas = useRef(null);
  const exit = useRef(() => {});

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('gj:intro') === '1'; } catch {}
    if (!seen) setShow(true);
  }, []);

  useEffect(() => {
    if (!show || !root.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.style.overflow = 'hidden';
    let raf = 0, tl, done = false, gsapRef = null;

    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('gj:intro', '1'); } catch {}
      const close = () => { cancelAnimationFrame(raf); document.documentElement.style.overflow = ''; setShow(false); };
      if (gsapRef && !reduced) gsapRef.to(root.current, { opacity: 0, duration: 0.6, ease: 'power2.inOut', onComplete: close });
      else close();
    };
    exit.current = finish;

    // Gold particles
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (ctx && !reduced) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
      size();
      const N = innerWidth < 640 ? 34 : 64;
      const ps = Array.from({ length: N }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height, r: (Math.random() * 1.4 + 0.4) * dpr,
        v: (Math.random() * 0.25 + 0.08) * dpr, a: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.006,
      }));
      const draw = () => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (const p of ps) {
          p.y -= p.v; p.a += p.s; p.x += Math.sin(p.a) * 0.15 * dpr;
          if (p.y < -10) { p.y = cv.height + 10; p.x = Math.random() * cv.width; }
          ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(p.a * 2));
          ctx.fillStyle = '#E2C58A';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    if (reduced) { const id = setTimeout(finish, 900); return () => { clearTimeout(id); document.documentElement.style.overflow = ''; }; }

    import('gsap').then(({ gsap }) => {
      gsapRef = gsap;
      const r = root.current;
      if (!r || done) return;
      tl = gsap.timeline();
      tl.fromTo(r.querySelector('.mandala'), { opacity: 0, scale: 0.86, rotate: -12 }, { opacity: 0.9, scale: 1, rotate: 0, duration: 1.6, ease: 'power3.out' })
        .fromTo(r.querySelectorAll('.wordmark span'), { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.07, ease: 'power2.out' }, 0.35)
        .fromTo(r.querySelector('.tag'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.95)
        .fromTo(r.querySelector('.bar i'), { scaleX: 0 }, { scaleX: 1, duration: 1.9, ease: 'power1.inOut' }, 0.4)
        .add(finish, '+=0.2');
    });

    return () => { tl?.kill(); cancelAnimationFrame(raf); document.documentElement.style.overflow = ''; };
  }, [show]);

  if (!show) return null;
  return (
    <div className="intro spin" ref={root} role="dialog" aria-label="Welcome to Guruji">
      <canvas ref={canvas} aria-hidden="true" />
      <button className="skip" onClick={() => exit.current()}>Skip intro</button>
      <div className="stage">
        <Mandala size={500} color="var(--gold)" strokeWidth={0.55} />
        <div className="mark">
          <div className="wordmark" aria-label="Guruji">{'GURUJI'.split('').map((c, i) => <span key={i} aria-hidden="true">{c}</span>)}</div>
          <div className="tag">{t('tagline')}</div>
          <div className="bar" aria-hidden="true"><i /></div>
        </div>
      </div>
    </div>
  );
}
