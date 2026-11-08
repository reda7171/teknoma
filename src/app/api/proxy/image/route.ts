import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { authorizeAdminApi } from '@/lib/api-authorization'
import { fetchPublicImage } from '@/lib/public-image-fetch'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
    const denied = await authorizeAdminApi(['ADMIN', 'MANAGER', 'BLOG_MODERATOR', 'SELLER'])
    if (denied) return denied
    const limiter = await rateLimit(`image_proxy_${await getIpIdentifier()}`, { limit: 20, windowMs: 60_000 })
    if (!limiter.success) return new NextResponse('Too many requests', { status: 429 })
    const url = request.nextUrl.searchParams.get('url')
    if (!url) return new NextResponse('URL required', { status: 400 })
    try {
        const input = await fetchPublicImage(url)
        const image = await sharp(input, { limitInputPixels: 25_000_000 })
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
        return new NextResponse(new Uint8Array(image), {
            headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
        })
    } catch { return new NextResponse('Image refused', { status: 400 }) }
}
