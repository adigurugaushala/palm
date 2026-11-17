// Guruji icon set — 24×24 grid, 1.5px stroke, round caps. Drawn for this project;
// heritage motifs (lotus, kalash, diya, surya, yantra) sit alongside plain UI glyphs.
const P = {
  // Heritage motifs
  lotus: <><path d="M12 4.5c1.9 2 2.4 4.7 0 8.2c-2.4-3.5-1.9-6.2 0-8.2Z" /><path d="M12 12.7c-1.3-2.7-3.6-4.2-6.6-4.2c-.2 3.3 2.4 6.1 6.6 6.1" /><path d="M12 12.7c1.3-2.7 3.6-4.2 6.6-4.2c.2 3.3-2.4 6.1-6.6 6.1" /><path d="M4 14.6c2 2.3 4.7 3.4 8 3.4s6-1.1 8-3.4" /><path d="M7 20.5h10" /></>,
  kalash: <><path d="M9 9.5h6" /><path d="M9.6 9.5c-3.2 1.1-4.3 3.9-3.4 6.6c.6 1.9 2.7 3.2 5.8 3.2s5.2-1.3 5.8-3.2c.9-2.7-.2-5.5-3.4-6.6" /><path d="M10 9.5V8h4v1.5" /><path d="M12 8V6.2" /><path d="M12 6.2c-1.7.1-3-.9-3.4-2.6c1.7-.1 3 .9 3.4 2.6Zm0 0c1.7.1 3-.9 3.4-2.6c-1.7-.1-3 .9-3.4 2.6Z" /><path d="M7.5 13.5h9" /><path d="M8 21h8" /></>,
  diya: <><path d="M3.5 13.5c1.8 3.2 4.6 4.6 8.5 4.6s6.7-1.4 8.5-4.6Z" /><path d="M12 12.6c-1.9-1.5-2.2-3.6-.8-5.6c.5-.7.8-1.5.8-2.5c1.9 1.7 2.8 3.8 1.8 6c-.4.8-1 1.5-1.8 2.1Z" /><path d="M12 18.1V21" /><path d="M8.5 21h7" /></>,
  surya: <><circle cx="12" cy="12" r="3.6" /><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.3 5.3l2 2M16.7 16.7l2 2M5.3 18.7l2-2M16.7 7.3l2-2" /></>,
  yantra: <><circle cx="12" cy="12" r="9" /><path d="M12 4.6l6.4 11.1H5.6Z" /><path d="M12 19.4L5.6 8.3h12.8Z" /><circle cx="12" cy="12" r="1" /></>,
  constellation: <><path d="M4.5 17.5l4.5-5.5l4.5 2.5L19 6" /><circle cx="4.5" cy="17.5" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="13.5" cy="14.5" r="1.3" /><circle cx="19" cy="6" r="1.3" /><path d="M17 15.5l.6 1.4l1.4.6l-1.4.6l-.6 1.4l-.6-1.4l-1.4-.6l1.4-.6Z" /></>,
  palm: <><path d="M8 20.5c-1.8-1.6-3.6-4-4.2-6.3c-.4-1.4.9-2.1 1.8-1.2L8 15.3V5.8a1.2 1.2 0 0 1 2.4 0v5.4V4.4a1.2 1.2 0 0 1 2.4 0v6.8V5.4a1.2 1.2 0 0 1 2.4 0v6.2V7.6a1.2 1.2 0 0 1 2.4 0v6.6c0 3.4-1.8 5.6-4.4 6.3" /><path d="M10 16.2c1.4-.4 3-.4 4.6.3" /></>,
  mandala: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9" /></>,

  // Interface
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2.5" /></>,
  shield: <><path d="M12 3l7.5 3v5.6c0 4.5-3.2 8-7.5 9.4c-4.3-1.4-7.5-4.9-7.5-9.4V6Z" /><path d="M8.8 12l2.2 2.2l4.2-4.4" /></>,
  document: <><path d="M6 3.5h8.5L18.5 7.5v13H6Z" /><path d="M14 3.5V8h4.5" /><path d="M9 12h6M9 15h6M9 18h4" /></>,
  language: <><path d="M3.5 6h9M8 4v2M10.5 6c-.8 3.7-3.1 6.4-6.5 7.8" /><path d="M5.8 9.3c1 1.8 2.6 3.2 4.7 4" /><path d="M12.5 20.5l3.8-9l3.8 9M13.8 17.5h5" /></>,
  rupee: <><path d="M7 4.5h10M7 9h10M7 4.5c5.5 0 6.5 1.7 6.5 4.5S11.5 13.5 7 13.5l7.5 7" /></>,
  video: <><rect x="3" y="6.5" width="12.5" height="11" rx="1.5" /><path d="M15.5 10.5l5.5-3v9l-5.5-3" /></>,
  phone: <><path d="M6.5 3.5h3l1.5 4.2l-2 1.3a10.5 10.5 0 0 0 6 6l1.3-2l4.2 1.5v3a2 2 0 0 1-2.2 2C10.6 18.9 5.1 13.4 4.5 5.7a2 2 0 0 1 2-2.2Z" /></>,
  chat: <><path d="M4 5.5h16v11H9.5L5 20v-3.5H4Z" /><path d="M8 10h8M8 13h5" /></>,
  upload: <><path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4.5 15v5h15v-5" /></>,
  camera: <><path d="M4 8h3.5L9 5.5h6L16.5 8H20v11.5H4Z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="10" r="1.8" /><path d="M20.5 16.5l-5-5l-8.5 8" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
  arrowRight: <><path d="M4.5 12h15M14 6.5l5.5 5.5l-5.5 5.5" /></>,
  arrowLeft: <><path d="M19.5 12h-15M10 6.5L4.5 12l5.5 5.5" /></>,
  chevronDown: <><path d="M6 9.5l6 6l6-6" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6" /></>,
  users: <><circle cx="9" cy="9" r="3.5" /><path d="M2.5 19.5c.6-3.3 3.1-5.2 6.5-5.2s5.9 1.9 6.5 5.2" /><path d="M15.5 5.8a3.4 3.4 0 0 1 0 6.4M18 14.6c2 .7 3.2 2.4 3.5 4.9" /></>,
  logout: <><path d="M14 4.5H5v15h9" /><path d="M10 12h10.5M17 8.5l3.5 3.5l-3.5 3.5" /></>,
  home: <><path d="M3.5 11L12 4l8.5 7" /><path d="M6 9.5v10h12v-10" /><path d="M10 19.5v-5h4v5" /></>,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.8" cy="6.5" r=".9" /><circle cx="4.8" cy="12" r=".9" /><circle cx="4.8" cy="17.5" r=".9" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3 10h18M7 14.5h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></>,
  audit: <><path d="M6 3.5h12v17H6Z" /><path d="M9 8h6M9 11.5h6M9 15h3" /><path d="M14 17.5l1.2 1.2l2.3-2.4" /></>,
  quote: <><path d="M5 17c0-4 1.2-7 4.5-9M5 17h4v-4H5M14 17c0-4 1.2-7 4.5-9M14 17h4v-4h-4" /></>,
  eye: <><path d="M2.5 12c2.2-4 5.4-6 9.5-6s7.3 2 9.5 6c-2.2 4-5.4 6-9.5 6s-7.3-2-9.5-6Z" /><circle cx="12" cy="12" r="3" /></>,
  download: <><path d="M12 4v11.5M7.5 11L12 15.5l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.4" /></>,
  alert: <><path d="M12 4l9 15.5H3Z" /><path d="M12 10v4.5M12 17v.4" /></>,
  refresh: <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></>,
  zoomIn: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5" /></>,
  rotate: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
  send: <><path d="M4 12L20 4.5L15.5 20L11.5 13Z" /><path d="M11.5 13L20 4.5" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></>,
};

export default function Icon({ name, size, className, title, strokeWidth = 1.5, ...rest }) {
  const body = P[name];
  if (!body) return null;
  return (
    <svg viewBox="0 0 24 24" width={size || 24} height={size || 24} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
}

// A five-mark rating in drawn lotus-bud diamonds rather than emoji stars.
export function Rating({ value, size = 12 }) {
  return (
    <span className="rating" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
          <path d="M6 .8L11.2 6L6 11.2L.8 6Z" fill={i <= value ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1" />
        </svg>
      ))}
    </span>
  );
}
