import withPWAInit from '@ducanh2912/next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development', // Désactivé en dev pour éviter les conflits
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache First pour les images
      {
        urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|avif)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'riwaya-images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
          },
        },
      },
      // Network First pour les pages
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'riwaya-pages',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24h
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com https://connect.facebook.net https://pagead2.googlesyndication.com https://challenges.cloudflare.com https://unpkg.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "frame-src 'self' https://www.openstreetmap.org https://www.google.com https://maps.googleapis.com https://maps.google.com https://pagead2.googlesyndication.com https://challenges.cloudflare.com",
              "connect-src 'self' https: blob:",
              "media-src 'self' blob: https:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },

      // Headers pour le Service Worker
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/books',
        permanent: false,
      },
      {
        source: '/shop/cart',
        destination: '/cart',
        permanent: true,
      },
      {
        source: '/:locale/shop/cart',
        destination: '/:locale/cart',
        permanent: true,
      },
      {
        source: '/shop/checkout',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/:locale/shop/checkout',
        destination: '/:locale/checkout',
        permanent: true,
      },
      {
        source: '/shop/:path*',
        destination: '/books/:path*',
        permanent: true,
      },
      {
        source: '/:locale/shop/:path*',
        destination: '/:locale/books/:path*',
        permanent: true,
      },
      {
        source: '/book/:path*',
        destination: '/books/:path*',
        permanent: true,
      },
      {
        source: '/:locale/book/:path*',
        destination: '/:locale/books/:path*',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/uploads/:path*',
          destination: 'https://riwaya.store/uploads/:path*',
        },
      ],
    }
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Force Turbopack à surveiller les fichiers de traduction
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
}

export default withPWA(withNextIntl(nextConfig))