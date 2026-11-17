'use client';
import { useEffect, useState } from 'react';
import { PublicPage } from '@/components/SiteChrome';
import { ProductCard } from '@/components/Commerce';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';

export default function Courses() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('GET', '/catalog?kind=course').then(r => setItems(r.products)).catch(() => setItems([])); }, []);
  return (
    <PublicPage>
      <section className="page-hero">
        <div className="container prose">
          <span className="eyebrow on-ivory">Learning &amp; courses</span>
          <h1>Learn palmistry from Guruji</h1>
          <p>Structured courses in palmistry and related subjects. Explore a course, read what it covers, and enrol when you are ready. Enrolment is paid securely through PayU.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          {!items ? <Loader /> : items.length ? (
            <div className="product-grid">{items.map(p => <ProductCard key={p.slug} p={p} base="/courses" />)}</div>
          ) : (
            <div className="empty"><Icon name="document" /><p>New courses are being prepared. Email us and we will tell you when enrolment opens.</p></div>
          )}
        </div>
      </section>
    </PublicPage>
  );
}
