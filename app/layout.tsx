import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Change Review',
  description: 'Review and edit vision analysis change detection results',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
