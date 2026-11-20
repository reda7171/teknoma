import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const indexable = process.env.PETSUNIVERS_MA_INDEXABLE === 'true'
  return {
    rules: indexable
      ? [{ userAgent: ['Googlebot', 'Googlebot-Image', '*'], allow: '/' }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: indexable ? 'https://petsunivers.ma/sitemap.xml' : undefined,
    host: indexable ? 'https://petsunivers.ma' : undefined,
  }
}
