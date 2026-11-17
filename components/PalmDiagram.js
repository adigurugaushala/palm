'use client';
import { useEffect, useRef } from 'react';

// A classical palmistry chart: an anatomical open right palm drawn in fine line-art, with the
// principal lines (heart, head, life, fate, sun, mercury), finger creases, wrist rascettes,
// mount markers and manuscript-style labels. Lines draw in with GSAP when `animate` is set.

const OUTLINE = 'M184,552 L180,515 C174,480 164,440 154,402 C136,380 114,356 102,326 C92,302 88,278 92,260 C96,242 114,236 126,246 C138,256 146,278 156,300 C160,308 164,310 166,306 C164,276 158,200 156,128 C156,108 188,104 192,124 C194,180 198,214 202,238 C202,190 204,130 206,88 C206,66 244,64 246,88 C248,140 250,200 250,236 C252,190 252,140 254,106 C254,86 290,86 292,108 C294,160 296,210 296,244 C298,210 300,180 302,160 C302,142 330,142 332,162 C334,200 336,240 336,262 C346,310 348,370 340,420 C334,460 324,490 318,515 L314,552';

const CREASES = [
  'M161,200 Q179,205 197,203', 'M158,160 Q175,164 193,162',
  'M204,180 Q226,185 249,182', 'M205,130 Q226,135 247,132',
  'M252,192 Q273,197 295,194', 'M253,146 Q272,150 293,148',
  'M298,216 Q316,220 335,218', 'M300,186 Q316,190 333,188',
  'M97,292 Q120,284 146,286',
  'M190,522 C232,530 280,530 314,520', 'M192,537 C233,544 278,544 312,535',
];

const LINES = {
  heart: 'M338,300 C300,290 262,280 216,276 C200,275 188,268 182,258',
  head: 'M164,312 C206,322 270,336 326,362',
  life: 'M164,316 C186,360 186,440 214,502',
  fate: 'M252,504 C246,440 240,360 232,286',
  sun: 'M292,430 C288,380 282,330 276,292',
  mercury: 'M302,470 C312,420 318,370 322,322',
};

const MOUNTS = [[182, 262], [227, 258], [272, 264], [318, 280], [170, 432], [316, 440]];

const LABELS = [
  { key: 'heart', text: 'Heart line', from: [334, 299], to: [364, 284], anchor: 'start' },
  { key: 'head', text: 'Head line', from: [320, 359], to: [364, 352], anchor: 'start' },
  { key: 'fate', text: 'Fate line', from: [246, 448], to: [364, 452], anchor: 'start' },
  { key: 'life', text: 'Life line', from: [184, 420], to: [80, 440], anchor: 'end' },
];

export default function PalmDiagram({ tone = 'dark', animate = false, highlight = null, labels = true, className = '' }) {
  const ref = useRef(null);
  const dark = tone === 'dark';
  const c = {
    outline: dark ? 'rgba(248,242,233,0.88)' : 'var(--burgundy)',
    crease: dark ? 'rgba(248,242,233,0.38)' : 'rgba(123,17,19,0.35)',
    line: dark ? 'var(--gold-light)' : 'var(--gold)',
    label: dark ? 'var(--gold-light)' : '#8A6A2B',
    leader: dark ? 'rgba(226,197,138,0.55)' : 'rgba(156,122,53,0.55)',
  };

  useEffect(() => {
    if (!animate || !ref.current) return;
    const show = () => { if (ref.current) ref.current.dataset.anim = 'ready'; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(); return; }
    let tl;
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !ref.current) return;
      const root = ref.current;
      show();
      const prep = sel => [...root.querySelectorAll(sel)].map(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        return p;
      });
      const outline = prep('.pd-outline');
      const creases = prep('.pd-crease');
      const lines = prep('.pd-line');
      const leaders = prep('.pd-leader');
      tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, delay: 0.15 });
      tl.to(outline, { strokeDashoffset: 0, duration: 2.2 })
        .to(creases, { strokeDashoffset: 0, duration: 0.9, stagger: 0.04 }, '-=1.1')
        .to(lines, { strokeDashoffset: 0, duration: 1.1, stagger: 0.18 }, '-=0.6')
        .fromTo(root.querySelectorAll('.pd-mount'), { opacity: 0, scale: 0.2, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power1.out' }, '-=0.5')
        .to(leaders, { strokeDashoffset: 0, duration: 0.5, stagger: 0.08 }, '-=0.3')
        .fromTo(root.querySelectorAll('.pd-label'), { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.4');
    });
    return () => { cancelled = true; tl?.kill(); };
  }, [animate]);

  return (
    <svg ref={ref} viewBox="0 0 440 560" className={`palm-diagram ${className}`} role="img" data-anim={animate ? 'pending' : 'none'}
      aria-label="Palmistry chart of an open right palm showing the heart, head, life and fate lines" fill="none">
      <path className="pd-outline" d={OUTLINE} stroke={c.outline} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {CREASES.map((d, i) => <path key={i} className="pd-crease" d={d} stroke={c.crease} strokeWidth="0.9" strokeLinecap="round" />)}
      {Object.entries(LINES).map(([k, d]) => {
        const on = highlight === k;
        const dim = highlight && !on;
        return (
          <path key={k} className={`pd-line pd-${k}`} data-line={k} d={d} stroke={c.line} strokeLinecap="round"
            strokeWidth={on ? 2.6 : k === 'mercury' || k === 'sun' ? 1 : 1.6}
            strokeOpacity={dim ? 0.3 : k === 'mercury' ? 0.6 : 1}
            strokeDasharray={k === 'mercury' && !animate ? '3 4' : undefined}
            style={{ transition: 'stroke-width .3s, stroke-opacity .3s' }} />
        );
      })}
      {MOUNTS.map(([x, y], i) => (
        <g key={i} className="pd-mount">
          <circle cx={x} cy={y} r="4.2" stroke={c.line} strokeWidth="0.7" strokeOpacity="0.8" />
          <circle cx={x} cy={y} r="1.3" fill={c.line} />
        </g>
      ))}
      {labels && LABELS.map(l => (
        <g key={l.key} opacity={highlight && highlight !== l.key ? 0.4 : 1} style={{ transition: 'opacity .3s' }}>
          <path className="pd-leader" d={`M${l.from[0]},${l.from[1]} L${l.to[0]},${l.to[1]}`} stroke={c.leader} strokeWidth="0.7" strokeDasharray={animate ? undefined : '2 3'} />
          <circle cx={l.from[0]} cy={l.from[1]} r="1.6" fill={c.line} />
          <text className="pd-label" x={l.anchor === 'start' ? l.to[0] + 6 : l.to[0] - 6} y={l.to[1] + 4} textAnchor={l.anchor}
            fill={c.label} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, letterSpacing: '0.02em' }}>{l.text}</text>
        </g>
      ))}
    </svg>
  );
}
