'use client';
import Link from 'next/link';
import { PublicPage } from '@/components/SiteChrome';
import { useApp } from '@/components/Providers';

const FAQ = [
  ['How do I book?', 'Choose a date and time, pay securely through PayU, then add your details and photographs of both palms. Guruji is assigned once your details are in.'],
  ['How should I photograph my palms?', 'Use bright, even daylight and avoid flash. Hold the whole palm and fingers in the frame, fingers together. We need your dominant hand, your other hand and the little-finger edge of your hand.'],
  ['Who can see my photographs?', 'Only you, the Guruji assigned to your consultation and our administrators. Photographs are never public and are not used for anything else.'],
  ['How does the session happen?', 'Through a private Jitsi Meet video or audio room opened from your booking page. You can also message Guruji before and after the session.'],
  ['When do I get my report?', 'After your consultation, Guruji writes your report. It appears in Reports, where you can read it online or download a PDF.'],
  ['My payment failed or I was charged twice.', 'A failed payment is not charged. If money left your account but your booking did not update within an hour, write to us with your booking number and we will check with PayU.'],
  ['Can I change my appointment?', 'Write to us with your booking number and a preferred new time, and we will do our best to move it.'],
  ['I forgot my password.', 'Write to us from the email address you registered with and we will help you reset it.'],
];

export default function Help() {
  const { cfg } = useApp();
  return (
    <PublicPage>
      <section className="page-hero"><div className="container prose"><span className="eyebrow on-ivory">Help</span><h1>Questions &amp; support</h1><p>Answers to the questions customers ask most. Anything else — just write to us.</p></div></section>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container prose">
          {FAQ.map(([q, a]) => <div key={q}><h2>{q}</h2><p>{a}</p></div>)}
          <h2>Contact</h2>
          <p>Email {cfg.supportEmail ? <a className="link" href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a> : 'our support team'}. Please include your booking number if you have one.</p>
          <p style={{ marginTop: 24 }}><Link href="/book" className="btn">Book a consultation</Link></p>
        </div>
      </section>
    </PublicPage>
  );
}
