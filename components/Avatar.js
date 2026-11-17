'use client';
// Profile photo, or the customer's initials on a brand circle when there is no photo.
export default function Avatar({ src, name = '', size = 56 }) {
  const initials = String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || 'G';
  const box = {
    width: size, height: size, borderRadius: '50%', flex: 'none', overflow: 'hidden',
    border: '1px solid var(--orange-hair)', background: 'var(--cream)', color: 'var(--burgundy)',
  };
  if (src) return <img src={src} alt="" width={size} height={size} style={{ ...box, objectFit: 'cover' }} />;
  return (
    <span aria-hidden="true" style={{ ...box, display: 'inline-grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.38), lineHeight: 1 }}>
      {initials}
    </span>
  );
}
