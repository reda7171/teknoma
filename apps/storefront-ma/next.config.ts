import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    qualities: [60, 75, 85],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440],
    imageSizes: [32, 48, 64, 96, 128, 192, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'petsunivers.ma', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.petsunivers.ma', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'petsunivers.ma', pathname: '/api/books/**' },
      { protocol: 'https', hostname: 'www.petsunivers.ma', pathname: '/api/books/**' },
    ],
  },
}

export default nextConfig
