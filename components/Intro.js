'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './Providers';

// Cinematic loader: deep red → dark reddish-brown → near-black burgundy, an orange palm
// line drawing, a revolving globe on an orbit, and the white wordmark. Shown once per browser
// session, skippable, about 3 seconds. Reduced motion shows it briefly and without animation.

// Palm in line art (open right palm, fingers up). Drawn with pathLength=1 so CSS can animate it.
const PALM = 'M100 236 C66 226 50 198 48 166 L44 118 C43 104 56 100 61 113 L68 138 L66 42 C66 28 84 28 84 42 L86 112 L88 22 C88 8 106 8 106 22 L106 112 L114 28 C115 15 132 15 132 28 L130 112 L138 42 C139 28 156 28 156 42 L150 122 L160 104 C166 96 175 104 170 118 L156 168 C154 198 138 226 100 236 Z';
const LINES = [
  'M124 92 C142 84 160 88 170 98',  // heart
  'M120 118 C102 120 86 130 72 150', // head
  'M98 118 C74 124 62 150 64 188',   // life
  'M104 194 C104 164 103 140 106 120', // fate
];

function Palm() {
  return (
    <svg className="palm-art" viewBox="0 0 220 250" aria-hidden="true" fill="none" stroke="#FF6F00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path className="draw" pathLength="1" d={PALM} />
      {LINES.map((d, i) => <path key={i} className="draw d2" pathLength="1" style={{ animationDelay: `${0.7 + i * 0.25}s` }} d={d} />)}
    </svg>
  );
}

// A globe that turns on its axis while a small satellite circles it on an orbit.
function Earth() {
  const W = 200; // width of one full turn of the continents
  const land = 'M18 52 C26 40 40 40 46 50 C52 60 46 72 36 76 C28 80 18 70 18 52 Z M70 38 C84 30 98 34 102 46 C106 58 96 68 84 70 C74 72 66 60 70 38 Z M126 60 C138 52 152 56 156 68 C160 80 150 90 138 88 C128 86 118 70 126 60 Z M168 34 C176 30 184 36 182 44 C180 52 170 52 168 34 Z';
  return (
    <svg className="earth" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="globeShade" cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#FFB27A" />
          <stop offset="0.55" stopColor="#FF6F00" />
          <stop offset="1" stopColor="#8A1212" />
        </radialGradient>
        <clipPath id="globeClip"><circle cx="100" cy="100" r="62" /></clipPath>
      </defs>
      <circle cx="100" cy="100" r="62" fill="url(#globeShade)" />
      <g clipPath="url(#globeClip)">
        <g>
          <animateTransform attributeName="transform" type="translate" from="0 0" to={`-${W} 0`} dur="14s" repeatCount="indefinite" />
          <path d={land} fill="#FFFFFF" opacity="0.55" />
          <path d={land} fill="#FFFFFF" opacity="0.55" transform={`translate(${W} 0)`} />
          <path d={land} fill="#FFFFFF" opacity="0.55" transform={`translate(-${W} 0)`} />
        </g>
        <ellipse cx="100" cy="100" rx="62" ry="22" fill="none" stroke="#FFFFFF" strokeOpacity="0.25" />
        <ellipse cx="100" cy="100" rx="30" ry="62" fill="none" stroke="#FFFFFF" strokeOpacity="0.25" />
      </g>
      <ellipse className="orbit" cx="100" cy="100" rx="84" ry="26" fill="none" stroke="#FF6F00" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="2 5" transform="rotate(-14 100 100)" />
      <circle r="5" fill="#FFFFFF">
        <animateMotion dur="9s" repeatCount="indefinite" path="M 16 100 A 84 26 0 1 0 184 100 A 84 26 0 1 0 16 100" rotate="auto" />
      </circle>
    </svg>
  );
}

export default function Intro() {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
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
    let raf = 0, done = false, timer = 0;

    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('gj:intro', '1'); } catch {}
      setLeaving(true);
      setTimeout(() => { cancelAnimationFrame(raf); document.documentElement.style.overflow = ''; setShow(false); }, 500);
    };
    exit.current = finish;

    // Warm orange particles drifting upward.
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (ctx && !reduced) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
      size();
      const N = innerWidth < 640 ? 30 : 60;
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
          ctx.fillStyle = '#FFB27A';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // Total length about 3 seconds; reduced motion finishes sooner.
    timer = setTimeout(finish, reduced ? 900 : 3000);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); document.documentElement.style.overflow = ''; };
  }, [show]);

  if (!show) return null;
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} ref={root} role="dialog" aria-label="Welcome to Guruji">
      <canvas ref={canvas} aria-hidden="true" />
      <button className="skip" onClick={() => exit.current()}>Skip intro</button>
      <div className="stage">
        <div className="motif"><Palm /></div>
        <Earth />
        <div className="mark">
          <div className="wordmark" aria-label="Guruji">{'GURUJI'.split('').map((c, i) => <span key={i} aria-hidden="true" style={{ animationDelay: `${0.2 + i * 0.07}s` }}>{c}</span>)}</div>
          <div className="tag">{t('tagline')}</div>
          <div className="bar" aria-hidden="true"><i /></div>
        </div>
      </div>
    </div>
  );
}
