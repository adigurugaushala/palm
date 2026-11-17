'use client';
import { useEffect, useState } from 'react';
import { PublicPage } from '@/components/SiteChrome';
import { ProductCard } from '@/components/Commerce';
import { Loader } from '@/components/Providers';
import Icon from '@/components/Icon';
import { api } from '@/lib/api';

export default function Services() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('GET', '/catalog?kind=service').then(r => setItems(r.products)).catch(() => setItems([])); }, []);
  return (
    <PublicPage>
      <section className="page-hero">
        <div className="container prose">
          <span className="eyebrow on-ivory">Spiritual services</span>
          <h1>Book a service</h1>
          <p>Palmistry and spiritual guidance beyond the standard consultation. Choose a service, tell us a little about what you need, and pay securely through PayU. Guruji&rsquo;s team contacts you to arrange the session.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          {!items ? <Loader /> : items.length ? (
            <div className="product-grid">{items.map(p => <ProductCard key={p.slug} p={p} base="/services" />)}</div>
          ) : (
            <div className="empty"><Icon name="palm" /><p>Services are being published. For an urgent request, email us.</p></div>
          )}
        </div>
      </section>
    </PublicPage>
  );
}
