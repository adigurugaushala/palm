'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/Providers';
import { SiteNav, SiteFooter } from '@/components/SiteChrome';
import { Mandala, Constellations, Divider, Corner } from '@/components/Ornaments';
import PalmDiagram from '@/components/PalmDiagram';
import Icon, { Rating } from '@/components/Icon';
import Intro from '@/components/Intro';
import { useLandingMotion } from '@/components/useLandingMotion';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';

const TRUST = [
  ['user', 'Personal consultation', 'One-to-one with Guruji. The questions you bring shape the conversation.'],
  ['lock', 'Private photographs', 'Your palm photographs are seen only by you, your assigned Guruji and our administrators.'],
  ['document', 'Written report', 'A considered written report after your session, yours to keep as a PDF.'],
  ['language', 'Your language', 'Consult and receive your report in English or Telugu.'],
  ['shield', 'Secure payment', 'Hosted checkout by PayU — your card and UPI details never reach us.'],
];

const STEPS = [
  ['Choose your consultation', 'Pick a date and time that suits you, and pay securely through PayU.'],
  ['Share your details', 'Tell us what you would like to discuss and upload photographs of both palms.'],
  ['Meet Guruji', 'Join a private video or audio session from your phone or computer.'],
  ['Receive your report', 'Guruji writes up the reading — preview it online or download it as a PDF.'],
];

const LINES = [
  ['heart', 'Heart line', 'Read for emotional life — how you love, connect and express feeling.'],
  ['head', 'Head line', 'Associated with your thinking style — how you reason, focus and decide.'],
  ['life', 'Life line', 'Traditionally linked with vitality and major life changes — not with the length of a life.'],
  ['fate', 'Fate line', 'Speaks to direction: work, responsibility and the path you are shaping.'],
  ['sun', 'Sun line', 'Associated with recognition, creativity and personal fulfilment.'],
];

// Copy for the consultation topics the booking form actually offers.
const TOPIC_COPY = {
  Career: ['surya', 'Work, ambition, timing of change and the direction your efforts are taking.'],
  Business: ['kalash', 'Ventures, partnerships and decisions where prosperity and risk meet.'],
  'Marriage & relationships': ['lotus', 'Companionship, marriage and the patterns you bring to close relationships.'],
  Family: ['diya', 'Parents, children and the responsibilities that shape a household.'],
  'General guidance': ['constellation', 'An open reading of your hands when you simply want perspective.'],
};

export default function Home() {
  const { cfg, t, cfgReady } = useApp();
  const [reviews, setReviews] = useState(null);
  const [line, setLine] = useState('heart');
  const [ctaVisible, setCtaVisible] = useState(false);
  const root = useRef(null);

  useEffect(() => { api('GET', '/reviews').then(setReviews).catch(() => setReviews({ reviews: [], count: 0 })); }, []);
  useLandingMotion(root, [cfgReady]);

  // Mobile booking bar appears once the hero has scrolled away.
  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(!e.isIntersecting), { threshold: 0.05 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const topics = (cfg.topics?.length ? cfg.topics : Object.keys(TOPIC_COPY)).filter(x => TOPIC_COPY[x]);
  const hasReviews = (reviews?.count || 0) > 0;

  return (
    <div ref={root}>
      <Intro />
      <SiteNav onHome showReviews={hasReviews} />
      <main>
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="hero" aria-labelledby="hero-title">
          <Constellations />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow on-ivory">Palmistry consultation <span className="deva" lang="hi">हस्त सामुद्रिक</span></span>
              <h1 id="hero-title">
                <span className="line"><span>{t('heroA')}</span></span>
                <span className="line it"><span>{t('heroB')}</span></span>
              </h1>
              <p className="lede">{t('heroLede')}</p>
              <div className="ctas">
                <Link href="/book" className="btn">{t('bookYour')}<Icon name="arrowRight" /></Link>
                <a href="#how" data-scroll className="btn outline">{t('explore')}</a>
              </div>
              <div className="assure">
                <span><Icon name="shield" />Secure PayU checkout</span>
                <span><Icon name="lock" />Private photographs</span>
                <span><Icon name="language" />English · తెలుగు</span>
              </div>
            </div>
            <div className="hero-art">
              <Mandala size={640} className="hero-orbit" strokeWidth={0.5} />
              <div className="arch">
                <Mandala size={600} className="arch-mandala" color="var(--gold-light)" strokeWidth={0.45} />
                <PalmDiagram tone="dark" animate />
              </div>
              <p className="arch-caption">Hasta rekha — the principal lines of the palm</p>
            </div>
          </div>
        </section>

        {/* ── Trust ──────────────────────────────────────── */}
        <section className="trust" aria-label="What every consultation includes">
          <div className="container trust-grid" data-stagger>
            {TRUST.map(([ic, h, p]) => (
              <div className="trust-item" key={h}>
                <div className="ic"><Icon name={ic} /></div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────── */}
        <section className="section" id="how">
          <div className="container">
            <div className="section-head" data-reveal>
              <span className="eyebrow on-ivory">How it works</span>
              <h2>Four unhurried steps</h2>
              <p>From choosing a time to reading your report, everything happens in one private space.</p>
            </div>
            <div className="steps">
              <div className="track" aria-hidden="true"><i /></div>
              {STEPS.map(([h, p], i) => (
                <div className="step" key={h} data-reveal>
                  <div className="num">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3>{h}</h3>
                    <p>{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Palmistry ─────────────────────────────────── */}
        <section className="section palmistry" id="palmistry">
          <div className="container palm-grid">
            <figure className="palm-plate" data-reveal>
              <Corner className="tl" /><Corner className="tr" /><Corner className="bl" /><Corner className="br" />
              <PalmDiagram tone="light" highlight={line} />
              <figcaption>The right palm, as read in hasta samudrika shastra</figcaption>
            </figure>
            <div>
              <div className="section-head" data-reveal style={{ marginBottom: 28 }}>
                <span className="eyebrow on-ivory">The art of palmistry</span>
                <h2>What Guruji reads in your hands</h2>
                <p>Each line is read alongside the shape of the hand, the fingers and the mounts beneath them. Select a line to see where it runs.</p>
              </div>
              <ol className="lines-list" data-stagger>
                {LINES.map(([k, h, p], i) => (
                  <li key={k}>
                    <button aria-pressed={line === k} onMouseEnter={() => setLine(k)} onFocus={() => setLine(k)} onClick={() => setLine(k)}>
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <h3>{h}</h3>
                      <p>{p}</p>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="palm-note"><Icon name="info" />Palmistry is a traditional practice offered for reflection and guidance. It is not a substitute for medical, legal or financial advice.</p>
            </div>
          </div>
        </section>

        {/* ── Topics ────────────────────────────────────── */}
        <section className="section" id="topics">
          <div className="container">
            <div className="section-head center" data-reveal>
              <span className="eyebrow on-ivory">Consultation topics</span>
              <h2>Bring the question that matters to you</h2>
              <Divider />
            </div>
            <div className="topics-grid" data-stagger>
              {topics.map(name => (
                <Link key={name} href={`/book?topic=${encodeURIComponent(name)}`} className="topic">
                  <span className="ic"><Icon name={TOPIC_COPY[name][0]} strokeWidth={1.1} /></span>
                  <h3>{name}</h3>
                  <p>{TOPIC_COPY[name][1]}</p>
                  <span className="go">Book on this topic <Icon name="arrowRight" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Reviews (only real, approved reviews; hidden when there are none) ── */}
        {hasReviews && (
          <section className="section" id="reviews" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="reviews-head" data-reveal>
                <div className="section-head" style={{ margin: 0 }}>
                  <span className="eyebrow on-ivory">Reviews</span>
                  <h2>In our customers&rsquo; words</h2>
                </div>
                {reviews.average != null && (
                  <div className="reviews-avg">
                    <div className="v">{reviews.average.toFixed(1)}</div>
                    <Rating value={Math.round(reviews.average)} />
                    <div className="muted">from {reviews.count} review{reviews.count === 1 ? '' : 's'}</div>
                  </div>
                )}
              </div>
              <div className="reviews-grid" data-stagger>
                {reviews.reviews.slice(0, 6).map(r => (
                  <figure className="review" key={r.id}>
                    <Icon name="quote" className="q" />
                    <blockquote>{r.text}</blockquote>
                    <Rating value={r.rating} />
                    <figcaption className="who"><b>{r.name}</b>{r.city ? `, ${r.city}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Pricing ───────────────────────────────────── */}
        <section className="section" id="pricing" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="pricing-panel" data-reveal>
              <span className="frame" /><span className="frame inner" />
              <Corner className="tl" color="var(--gold-light)" /><Corner className="tr" color="var(--gold-light)" />
              <Corner className="bl" color="var(--gold-light)" /><Corner className="br" color="var(--gold-light)" />
              <Mandala size={520} className="bg-mandala" color="var(--gold-light)" />
              <div className="pricing-grid">
                <div>
                  <span className="eyebrow">Pricing</span>
                  <h2>Complete consultation</h2>
                  <div className="price">{inr(cfg.price)}</div>
                  <p className="price-note">Inclusive of {cfg.gstPercent}% GST · One consultation, everything included</p>
                  <div className="pricing-cta">
                    <Link href="/book" className="btn ivory">{t('bookYour')}<Icon name="arrowRight" /></Link>
                    <span className="muted"><Icon name="shield" />Secure payment by PayU</span>
                  </div>
                </div>
                <ul className="includes">
                  <li><Icon name="check" /><span>One-to-one consultation with Guruji<small>Session length depends on your questions</small></span></li>
                  <li><Icon name="check" /><span>Personalised discussion<small>Built around the topics you choose</small></span></li>
                  <li><Icon name="check" /><span>Written report<small>Preview online or download as a PDF</small></span></li>
                  <li><Icon name="check" /><span>Your choice of language<small>English or Telugu</small></span></li>
                  <li><Icon name="check" /><span>Private photograph storage<small>Visible only to you and your Guruji</small></span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter onHome />
      <div className={`mobile-cta ${ctaVisible ? 'show' : ''}`} aria-hidden={!ctaVisible}>
        <div className="p">{inr(cfg.price)}<small>COMPLETE CONSULTATION</small></div>
        <Link href="/book" className="btn" tabIndex={ctaVisible ? 0 : -1}>{t('book')}</Link>
      </div>
    </div>
  );
}
