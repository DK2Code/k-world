import type { Metadata } from 'next';
import './globals.css';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? '';
const isUserSite = repository.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const defaultGitHubUrl = owner && repository
  ? `https://${owner}.github.io${isUserSite ? '' : `/${repository}`}`
  : 'http://localhost:3000';
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || defaultGitHubUrl).replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'K World — Learn. Play. Explore.',
  description: 'A magical educational adventure where young explorers learn through stories, puzzles, and play.',
  openGraph: {
    title: 'K World — Learn. Play. Explore.',
    description: 'Create a hero, explore magical realms, and grow through science, maths, English, and play.',
    type: 'website',
    images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: 'K World — Learn. Play. Explore.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'K World — Learn. Play. Explore.',
    description: 'A magical educational RPG for curious young explorers.',
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
