import { NextResponse } from 'next/server'
import { buildNewBooksAtom } from '@/lib/new-books-feed'

export const dynamic = 'force-dynamic'

export async function GET() {
    const xml = await buildNewBooksAtom()
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/atom+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
    })
}
