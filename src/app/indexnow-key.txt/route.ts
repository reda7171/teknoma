import { NextResponse } from 'next/server'
import { getIndexNowKey } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

export async function GET() {
    const key = await getIndexNowKey()
    return new NextResponse(key, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'X-Robots-Tag': 'noindex',
        },
    })
}

