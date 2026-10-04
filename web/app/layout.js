import './globals.css';

export const metadata = {
  title: 'ติวนักวิชาการคอม กรมที่ดิน',
  description: 'คลังข้อสอบและสรุปเนื้อหาจากเล่มน้ำตาล 1–2 แบ่งตามบทและระดับความยาก พร้อมจำลองสอบกรมที่ดิน',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
