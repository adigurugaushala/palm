import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/noto-sans-telugu/400.css';
import '@fontsource/noto-sans-telugu/600.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/site.css';
import '@/styles/portal.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: { default: 'Guruji — Personal Palmistry Consultation', template: '%s · Guruji' },
  description: 'A personal palmistry consultation with Guruji. Share your palm photographs, ask what matters to you, and receive a written report in English or Telugu.',
  icons: { icon: '/emblem.svg' },
};

export const viewport = { themeColor: '#981515', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
