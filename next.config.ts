import withPWAInit from '@ducanh2912/next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
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
      // Network First uniquement pour les navigations publiques. Les pages admin,
      // API et assets Next ne doivent jamais être mélangés entre deux déploiements.
      {
        urlPattern: ({ request, url }) =>
          request.mode === 'navigate' &&
          !url.pathname.startsWith('/api/') &&
          !url.pathname.startsWith('/_next/') &&
          !url.pathname.split('/').includes('admin'),
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
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizeCss: true, // Réduit le CSS critique en pré-rendrant les styles
  },
  output: process.env.OUTPUT_STANDALONE === 'false' ? undefined : 'standalone',
  poweredByHeader: false,
  // Keep Next's gzip fallback enabled. The reverse proxy can still serve
  // Brotli/gzip, but responses must never reach visitors uncompressed.
  compress: true,
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    dangerouslyAllowLocalIP: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'riwaya.store',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
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
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com https://connect.facebook.net https://pagead2.googlesyndication.com https://challenges.cloudflare.com https://unpkg.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://maps.googleapis.com https://www.clarity.ms https://*.clarity.ms",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "frame-src 'self' https://www.openstreetmap.org https://www.google.com https://maps.googleapis.com https://maps.google.com https://pagead2.googlesyndication.com https://challenges.cloudflare.com https://accounts.google.com https://smartlock.google.com https://www.facebook.com",
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
      // Headers CORS pour les images uploadées (évite le blocage www vs non-www)
      {
        source: '/uploads/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
      // Headers anti-indexation SEO pour l'administration et ses APIs
      {
        source: '/:locale/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:locale/admin',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      ...(process.env.NODE_ENV === 'production' ? [
        // Headers pour les assets statiques (images, polices, CSS, JS) — immutable cache
        {
          source: '/(.*)\\.(png|jpg|jpeg|svg|gif|webp|ico|avif|woff2|woff|ttf)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
        // Chunks CSS Next.js — cache long terme (hash dans le nom)
        {
          source: '/_next/static/chunks/(.*)\\.css',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
        // Chunks JS Next.js — cache long terme
        {
          source: '/_next/static/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ] : [])
    ]
  },
  async redirects() {
    return [
      // Preserve existing blog links after normalizing legacy slugs containing spaces.
      {
        source: '/blog/Top Marketing Books for Entrepreneurs',
        destination: '/blog/top-marketing-books-for-entrepreneurs',
        permanent: true,
      },
      {
        source: '/:locale/blog/Top Marketing Books for Entrepreneurs',
        destination: '/:locale/blog/top-marketing-books-for-entrepreneurs',
        permanent: true,
      },
      {
        source: '/blog/Best Personal Finance Books',
        destination: '/blog/best-personal-finance-books',
        permanent: true,
      },
      {
        source: '/:locale/blog/Best Personal Finance Books',
        destination: '/:locale/blog/best-personal-finance-books',
        permanent: true,
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
      {
        source: '/return-policy',
        destination: '/returns',
        permanent: true,
      },
      {
        source: '/:locale/return-policy',
        destination: '/:locale/returns',
        permanent: true,
      },
      {
        source: '/sell-book',
        destination: '/devenir-vendeur',
        permanent: true,
      },
      {
        source: '/:locale/sell-book',
        destination: '/:locale/devenir-vendeur',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    }
  },

  // Force Turbopack à surveiller les fichiers de traduction
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
}

export default withPWA(withNextIntl(nextConfig))
