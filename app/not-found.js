import Link from 'next/link';
import { Mandala } from '@/components/Ornaments';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <Mandala size={120} detail="lite" />
        <p className="eyebrow on-ivory" style={{ marginTop: 22 }}>Page not found</p>
        <h1 style={{ margin: '10px 0 14px' }}>This path leads nowhere</h1>
        <p>The page you were looking for has moved or never existed.</p>
        <p style={{ marginTop: 24 }}><Link href="/" className="btn">Return home</Link></p>
      </div>
    </main>
  );
}
