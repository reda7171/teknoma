import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'riwaya.store', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.riwaya.store', pathname: '/uploads/**' },
    ],
  },
}

export default nextConfig
