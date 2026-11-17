'use client';
import { useEffect } from 'react';

// Landing-page motion system: Lenis smooth scrolling (no hijacking — native scroll positions,
// eased) driving GSAP ScrollTrigger reveals. Everything is skipped under reduced motion, and
// elements are only hidden by JS right before they animate, so content never stays invisible.
export function useLandingMotion(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis, ctx, cancelled = false, onAnchor;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      if (!reduced) {
        const { default: Lenis } = await import('lenis');
        if (cancelled) return;
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // In-page anchors scroll with an offset for the sticky navigation.
      onAnchor = e => {
        const a = e.target.closest('a[data-scroll]');
        if (!a) return;
        const id = (a.getAttribute('href') || '').split('#')[1];
        const el = id && document.getElementById(id);
        if (!el || !a.getAttribute('href').startsWith('#')) return;
        e.preventDefault();
        const offset = -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76) + 1;
        if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 });
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset });
        history.replaceState(null, '', '#' + id);
      };
      document.addEventListener('click', onAnchor);

      if (reduced) return;

      ctx = gsap.context(() => {
        // Hero headline: each line slides up from behind its mask.
        gsap.from('.hero h1 .line > span', { yPercent: 105, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
        gsap.from('.hero .eyebrow, .hero .lede, .hero .ctas, .hero .assure', { opacity: 0, y: 18, duration: 0.9, ease: 'power2.out', stagger: 0.1, delay: 0.45 });
        gsap.from('.hero-art .arch', { opacity: 0, y: 30, duration: 1.2, ease: 'power3.out', delay: 0.2 });

        // Gentle parallax on ornamental layers only (never on content).
        gsap.to('.hero-orbit', { yPercent: 18, rotate: 20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.arch-mandala', { rotate: 40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.pricing-panel .bg-mandala', { rotate: 60, ease: 'none', scrollTrigger: { trigger: '.pricing-panel', start: 'top bottom', end: 'bottom top', scrub: true } });

        // Section reveals and staggered groups.
        gsap.utils.toArray('[data-reveal]').forEach(el => {
          gsap.from(el, { opacity: 0, y: 28, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
        });
        gsap.utils.toArray('[data-stagger]').forEach(group => {
          gsap.from(group.children, { opacity: 0, y: 26, duration: 0.8, ease: 'power2.out', stagger: 0.09, scrollTrigger: { trigger: group, start: 'top 84%', once: true } });
        });

        // The process track draws itself as the steps come into view.
        const track = root.querySelector('.steps .track i');
        if (track) {
          const vertical = window.matchMedia('(max-width: 860px)').matches;
          gsap.fromTo(track, vertical ? { scaleY: 0 } : { scaleX: 0 }, { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 55%', scrub: true } });
        }
      }, root);
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      if (onAnchor) document.removeEventListener('click', onAnchor);
      ctx?.revert();
      lenis?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
