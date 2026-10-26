import { NextResponse } from 'next/server'
import { buildNewBooksRss } from '@/lib/new-books-feed'

export const dynamic = 'force-dynamic'

export async function GET() {
    const xml = await buildNewBooksRss()
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
    })
}
