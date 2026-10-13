import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'
import { getIndexNowKey, getSiteHost, submitUrlsToIndexNow } from '@/lib/indexnow'

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin()
        const host = await getSiteHost()
        const key = await getIndexNowKey()
        const keyLocation = `https://${host}/${key}.txt`

        return NextResponse.json({
            success: true,
            host,
            key,
            keyLocation,
            endpoint: 'https://api.indexnow.org/indexnow',
            supportedEngines: ['Bing', 'Yandex', 'Seznam', 'Naver']
        })
    } catch {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { urls, allProducts } = body
        const host = await getSiteHost()
        const baseUrl = `https://${host}`

        let urlList: string[] = Array.isArray(urls) ? urls : []

        if (allProducts) {
            const [books, packs] = await Promise.all([
                prisma.book.findMany({ where: { active: true }, select: { id: true } }),
                prisma.pack.findMany({ where: { active: true }, select: { id: true } })
            ])

            const generatedUrls: string[] = [
                `${baseUrl}/fr/books`,
                `${baseUrl}/ar/books`,
                `${baseUrl}/en/books`,
                `${baseUrl}/fr/packs`,
                `${baseUrl}/ar/packs`,
                `${baseUrl}/en/packs`
            ]

            books.forEach((b) => {
                generatedUrls.push(`${baseUrl}/fr/books/${b.id}`)
                generatedUrls.push(`${baseUrl}/ar/books/${b.id}`)
                generatedUrls.push(`${baseUrl}/en/books/${b.id}`)
            })

            packs.forEach((p) => {
                generatedUrls.push(`${baseUrl}/fr/packs/${p.id}`)
                generatedUrls.push(`${baseUrl}/ar/packs/${p.id}`)
                generatedUrls.push(`${baseUrl}/en/packs/${p.id}`)
            })

            urlList = generatedUrls
        }

        if (urlList.length === 0) {
            return NextResponse.json({ success: false, error: 'Aucune URL à soumettre' }, { status: 400 })
        }

        const result = await submitUrlsToIndexNow(urlList)

        return NextResponse.json({
            success: result.success,
            submittedCount: urlList.length,
            status: result.status,
            error: result.error
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
