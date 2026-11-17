'use client';
import { PublicPage } from '@/components/SiteChrome';
import { useApp } from '@/components/Providers';

export default function Terms() {
  const { cfg } = useApp();
  const mail = cfg.supportEmail ? <a className="link" href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a> : 'our support team';
  return (
    <PublicPage>
      <section className="page-hero"><div className="container prose"><span className="eyebrow on-ivory">Terms &amp; privacy</span><h1>How Guruji works with you</h1><p>Plain-language terms for consultations and how we handle your information.</p></div></section>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container prose">
          <h2>The consultation</h2>
          <p>Guruji offers palmistry and astrology as traditional guidance for reflection. A reading is not medical, legal, financial or psychological advice, and should not replace advice from a qualified professional.</p>
          <h2>What we collect</h2>
          <ul>
            <li>Your name, email, optional mobile number and password (stored only as a secure hash).</li>
            <li>Details you give for your reading: date, time and place of birth, current city, language and your questions.</li>
            <li>Photographs of your palms, messages with your Guruji, and the report Guruji writes for you.</li>
            <li>Payment references from PayU. We never receive or store card, UPI or bank details.</li>
          </ul>
          <h2>Who can see it</h2>
          <p>Your photographs, messages and report are visible only to you, the Guruji assigned to your consultation, and our administrators. We do not sell or share your information, and approved reviews show only your first name and city.</p>
          <h2>Payments and refunds</h2>
          <p>Payments are processed by PayU India. If we cannot accept a consultation, we refund it to the original payment method. For any other refund or rescheduling request, write to {mail} with your booking number.</p>
          <h2>Video sessions</h2>
          <p>Sessions take place in a private Jitsi Meet room linked to your booking. Sessions are not recorded by Guruji.</p>
          <h2>Your choices</h2>
          <p>You can update your profile at any time. To have your account, photographs and reports deleted, write to {mail} from your registered email address.</p>
        </div>
      </section>
    </PublicPage>
  );
}
