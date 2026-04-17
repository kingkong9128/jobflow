import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobFlow - Smart Job Search & Application Prep',
  description: 'Discover jobs, tailor your CV, and track applications with AI-powered tools.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}