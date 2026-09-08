import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JD Sales & Consulting',
  description: 'JD Sales and Consulting L.L.C. — internal dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
