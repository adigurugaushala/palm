// Heritage ornaments drawn in SVG: the brand emblem, a generative mandala/yantra,
// a constellation field and a fine border motif. All line-art in antique gold.

const range = n => Array.from({ length: n }, (_, i) => i);

export function BrandMark({ size = 30, color = 'var(--gold)' }) {
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke={color} strokeWidth="0.9">
      <circle r="11" />
      <circle r="8.6" strokeOpacity="0.55" />
      {range(8).map(i => (
        <path key={i} transform={`rotate(${i * 45})`} d="M0 -1.9C1.6 -3.4 1.6 -5.6 0 -7.4C-1.6 -5.6 -1.6 -3.4 0 -1.9Z" />
      ))}
      <circle r="1.1" fill={color} stroke="none" />
    </svg>
  );
}

export function Wordmark({ light = false, size = 22 }) {
  return (
    <span className="wordmark" style={{ fontSize: size, color: light ? 'var(--ivory)' : 'var(--burgundy)' }}>GURUJI</span>
  );
}

// Concentric mandala built from lotus petals, a dotted ring and an eight-point yantra.
// Each ring is its own <g> so callers can rotate rings independently.
export function Mandala({ size = 420, color = 'var(--gold)', className = '', strokeWidth = 0.6, detail = 'full' }) {
  const full = detail === 'full';
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className={`mandala ${className}`} aria-hidden="true"
      fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
      <g className="m-ring m-r1">
        <circle r="97" />
        <circle r="93.5" strokeOpacity="0.6" />
        {full && range(72).map(i => <path key={i} transform={`rotate(${i * 5})`} d={i % 2 ? 'M0 -93.5V-90.5' : 'M0 -93.5V-88.5'} />)}
      </g>
      <g className="m-ring m-r2">
        {range(16).map(i => (
          <path key={i} transform={`rotate(${i * 22.5})`} d="M0 -56C9 -63 11 -75 0 -86C-11 -75 -9 -63 0 -56Z" />
        ))}
        {full && range(16).map(i => (
          <path key={'b' + i} transform={`rotate(${i * 22.5 + 11.25})`} d="M0 -58C5 -63 6 -70 0 -76C-6 -70 -5 -63 0 -58Z" strokeOpacity="0.6" />
        ))}
        <circle r="55" strokeOpacity="0.7" />
      </g>
      <g className="m-ring m-r3">
        {range(32).map(i => <circle key={i} transform={`rotate(${i * 11.25})`} cy="-49" r="0.9" fill={color} stroke="none" />)}
        <circle r="44" />
        <rect x="-31" y="-31" width="62" height="62" />
        <rect x="-31" y="-31" width="62" height="62" transform="rotate(45)" />
      </g>
      <g className="m-ring m-r4">
        <circle r="28" strokeOpacity="0.8" />
        <path d="M0 -25L21.6 12.5H-21.6Z" />
        <path d="M0 25L21.6 -12.5H-21.6Z" />
        {range(8).map(i => (
          <path key={i} transform={`rotate(${i * 45})`} d="M0 -4C3 -7 3 -11 0 -15C-3 -11 -3 -7 0 -4Z" />
        ))}
        <circle r="2" fill={color} stroke="none" />
      </g>
    </svg>
  );
}

// A sparse constellation field: fixed coordinates so server and client render identically.
const STARS = [[8, 14], [16, 9], [24, 17], [31, 11], [14, 30], [6, 42], [21, 46], [88, 12], [80, 20], [93, 28], [84, 37], [72, 9], [90, 58], [78, 66], [94, 80], [10, 74], [18, 84], [6, 92]];
const LINKS = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [7, 8], [8, 9], [9, 10], [7, 11], [12, 13], [13, 14], [15, 16], [16, 17]];
export function Constellations({ className = '', color = 'var(--gold)' }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={`constellations ${className}`} aria-hidden="true">
      {LINKS.map(([a, b], i) => (
        <line key={i} x1={STARS[a][0]} y1={STARS[a][1]} x2={STARS[b][0]} y2={STARS[b][1]} stroke={color} strokeWidth="0.12" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
      ))}
      {STARS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.09 : 0.15} fill={color} className="star" />)}
    </svg>
  );
}

// Thin ornamental divider: line, small lotus, line.
export function Divider({ color = 'var(--gold)', width = 180 }) {
  return (
    <svg viewBox="0 0 180 14" width={width} height={(width / 180) * 14} className="divider" aria-hidden="true" fill="none" stroke={color} strokeWidth="0.8">
      <path d="M0 7H72M108 7H180" strokeOpacity="0.7" />
      <path d="M90 2C93 4.5 93 8 90 12C87 8 87 4.5 90 2Z" />
      <path d="M90 12C86 10 81 10 78 11.5C81 13 86 13 90 12ZM90 12C94 10 99 10 102 11.5C99 13 94 13 90 12Z" />
      <circle cx="74" cy="7" r="1" fill={color} stroke="none" />
      <circle cx="106" cy="7" r="1" fill={color} stroke="none" />
    </svg>
  );
}

// Corner ornament for framed panels (rotate for each corner).
export function Corner({ className = '', color = 'var(--gold)' }) {
  return (
    <svg viewBox="0 0 40 40" className={`corner ${className}`} aria-hidden="true" fill="none" stroke={color} strokeWidth="0.8">
      <path d="M2 38V8a6 6 0 0 1 6-6h30" />
      <path d="M7 38V13a6 6 0 0 1 6-6h25" strokeOpacity="0.5" />
      <path d="M2 2c5 0 8 3 8 8c-5 0-8-3-8-8Z" />
    </svg>
  );
}
