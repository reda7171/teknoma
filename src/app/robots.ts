import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        rules: [
            // Règle générale
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/*/admin',
                    '/api',
                    '/_next',
                    '/static',
                    '/checkout',
                    '/*/checkout',
                    '/cart',
                    '/*/cart',
                    '/*/*/cart',
                    '/orders',
                    '/*/orders',
                ],
            },
            // GPTBot (OpenAI / ChatGPT) — autoriser les pages publiques
            {
                userAgent: 'GPTBot',
                allow: ['/fr/', '/ar/', '/en/', '/fr/blog/', '/ar/blog/', '/en/blog/', '/fr/books/', '/ar/books/', '/en/books/', '/fr/faq', '/ar/faq', '/en/faq'],
                disallow: ['/admin', '/api', '/checkout', '/cart'],
            },
            // PerplexityBot
            {
                userAgent: 'PerplexityBot',
                allow: ['/fr/', '/ar/', '/en/', '/fr/blog/', '/ar/blog/', '/en/blog/'],
                disallow: ['/admin', '/api', '/checkout', '/cart'],
            },
            // ClaudeBot (Anthropic)
            {
                userAgent: 'ClaudeBot',
                allow: ['/fr/', '/ar/', '/en/', '/fr/blog/', '/ar/blog/', '/en/blog/'],
                disallow: ['/admin', '/api', '/checkout', '/cart'],
            },
            // Amazonbot
            {
                userAgent: 'Amazonbot',
                allow: ['/fr/', '/ar/', '/en/'],
                disallow: ['/admin', '/api', '/checkout', '/cart'],
            },
            // Bytespider (TikTok AI)
            {
                userAgent: 'Bytespider',
                allow: ['/fr/', '/ar/', '/en/'],
                disallow: ['/admin', '/api'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
