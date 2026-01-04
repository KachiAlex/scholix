/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: '/api/auth/:path*' },
      { source: '/sis/:path*', destination: '/api/sis/:path*' },
      { source: '/cbt/:path*', destination: '/api/cbt/:path*' },
    ];
  },
};

module.exports = nextConfig;
