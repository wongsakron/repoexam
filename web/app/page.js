import Script from 'next/script';
import { VERSION } from '../lib/version';

export const dynamic = 'force-static';

// The quiz UI is a hash-routed vanilla JS app (public/app.js). React only renders the shell;
// #app is filled via innerHTML so React never reconciles the app's own DOM.
export default function Home() {
  return (
    <>
      <div
        id="app"
        data-v={VERSION}
        dangerouslySetInnerHTML={{ __html: '<div class="boot">กำลังโหลดข้อสอบ…</div>' }}
      />
      <noscript>
        <p style={{ padding: 16 }}>หน้านี้ต้องเปิด JavaScript</p>
      </noscript>
      <Script src={`/app.js?v=${VERSION}`} strategy="afterInteractive" />
    </>
  );
}
