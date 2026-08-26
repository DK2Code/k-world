import type { NextConfig } from 'next';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? '';
const isGitHubBuild = process.env.GITHUB_ACTIONS === 'true';
const isUserSite = repository.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const basePath = isGitHubBuild && repository && !isUserSite ? `/${repository}` : '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};

export default nextConfig;
