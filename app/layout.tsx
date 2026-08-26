import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'K World — Learn. Play. Explore.',
  description: 'A magical educational adventure where young explorers learn through stories, puzzles, and play.',
  openGraph: {
    title: 'K World — Learn. Play. Explore.',
    description: 'Create a hero, explore magical realms, and grow through science, maths, English, and play.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'K World — Learn. Play. Explore.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'K World — Learn. Play. Explore.',
    description: 'A magical educational RPG for curious young explorers.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
