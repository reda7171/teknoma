import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        rules: [
            // Règle générale pour TOUS les bots (y compris Google, Bing, etc.)
            {
                userAgent: '*',
                allow: ['/', '/api/merchant-image', '/api/merchant-image/*'],
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
                    '/*/orders',
                ],
            },
            // Autorisation explicite pour Google AdSense et Googlebot
            {
                userAgent: ['Mediapartners-Google', 'Googlebot', 'Googlebot-Image', 'AdsBot-Google'],
                allow: ['/', '/api/merchant-image', '/api/merchant-image/*'],
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
                    '/orders',
                ],
            }
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
