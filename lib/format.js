const TZ = 'Asia/Kolkata';

// Booking dates are IST calendar dates ("YYYY-MM-DD"); anchor them at IST noon before formatting.
const atNoon = d => new Date(`${d}T12:00:00+05:30`);
export const fmtDay = d => (d ? atNoon(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }) : '');
export const fmtDayLong = d => (d ? atNoon(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }) : '');
export const dayParts = d => {
  const x = atNoon(d);
  return {
    wd: x.toLocaleDateString('en-IN', { weekday: 'short', timeZone: TZ }),
    day: x.toLocaleDateString('en-IN', { day: 'numeric', timeZone: TZ }),
    mon: x.toLocaleDateString('en-IN', { month: 'short', timeZone: TZ }),
  };
};
export const fmtStamp = s => (s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '');
export const fmtTime = s => (s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '');
export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export function age(dob) {
  if (!dob) return '';
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

// Status → badge tone for the eight-step consultation journey.
export function statusTone(b) {
  if (!b) return '';
  if (b.cancelled) return 'bad';
  if (b.flag?.type === 'rejected' || (typeof b.flag === 'string' && b.flag.startsWith('rejected'))) return 'bad';
  if (b.flag?.type === 'returned' || (typeof b.flag === 'string' && b.flag.startsWith('returned'))) return 'warn';
  if (b.status >= 7) return 'ok';
  if (b.status < 0) return 'warn';
  if (b.status <= 1) return 'gold';
  return 'brand';
}

export const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
