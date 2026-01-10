/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: '/api/auth/:path*' },
      { source: '/sis/:path*', destination: '/api/sis/:path*' },
      { source: '/cbt/:path*', destination: '/api/cbt/:path*' },
    ];
  },
};

module.exports = nextConfig;
