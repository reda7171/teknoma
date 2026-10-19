import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        rules: [
            // Règle générale pour TOUS les bots (y compris Google, Bing, etc.)
            {
                userAgent: '*',
                allow: ['/', '/api/merchant-image', '/api/merchant-image/*', '/api/merchant-pack-image', '/api/merchant-pack-image/*'],
                disallow: [
                    '/admin',
                    '/admin/*',
                    '/*/admin',
                    '/*/admin/*',
                    '/api',
                    '/api/*',
                    '/checkout',
                    '/*/checkout',
                    '/cart',
                    '/*/cart',
                    '/*/*/cart',
                    '/orders',
                    '*/opengraph-image',
                    '*/opengraph-image/*',
                    '/*/orders',
                ],
            },
            // Keep Google product-page crawling unambiguous for Merchant Center.
            // Separate groups are emitted instead of combining several agents in
            // one block, and Google is not given the broad /api/* exclusion that
            // could conflict with the Merchant image endpoints.
            {
                userAgent: 'Googlebot',
                allow: ['/', '/api/merchant-image', '/api/merchant-image/*', '/api/merchant-pack-image', '/api/merchant-pack-image/*'],
                disallow: [
                    '/admin',
                    '/admin/*',
                    '/*/admin',
                    '/*/admin/*',
                    '/checkout',
                    '/*/checkout',
                    '/cart',
                    '/*/cart',
                    '/orders',
                    '*/opengraph-image',
                    '*/opengraph-image/*',
                ],
            },
            {
                userAgent: 'Googlebot-Image',
                allow: ['/', '/uploads/', '/uploads/*', '/api/merchant-image', '/api/merchant-image/*', '/api/merchant-pack-image', '/api/merchant-pack-image/*'],
            },
            {
                userAgent: ['Mediapartners-Google', 'AdsBot-Google'],
                allow: '/',
                disallow: [
                    '/admin',
                    '/admin/*',
                    '/*/admin',
                    '/*/admin/*',
                    '/checkout',
                    '/*/checkout',
                    '/cart',
                    '/*/cart',
                    '/orders',
                    '*/opengraph-image',
                    '*/opengraph-image/*',
                    '/*/orders',
                ],
            }
        ],
        sitemap: [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/feed.xml`,
        ],
    }
}
