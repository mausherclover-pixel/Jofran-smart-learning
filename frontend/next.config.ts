import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Lesson media and avatars served from S3 + CloudFront (architecture §12).
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
};

export default nextConfig;
