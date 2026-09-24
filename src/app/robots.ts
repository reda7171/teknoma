import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        rules: [
            // Règle générale pour TOUS les bots (y compris Google, Bing, etc.)
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/*/admin',
                    '/api',
                    '/checkout',
                    '/*/checkout',
                    '/cart',
                    '/*/cart',
                    '/*/*/cart',
                    '/orders',
                    '/*/orders',
                ],
            },
            // Autorisation explicite pour Google AdSense
            {
                userAgent: ['Mediapartners-Google', 'Googlebot', 'AdsBot-Google'],
                allow: '/',
                disallow: [
                    '/admin',
                    '/*/admin',
                    '/api',
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
