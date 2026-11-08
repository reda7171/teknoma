import { getSetting } from '@/lib/server/site-settings'
import { NextResponse } from 'next/server'

export async function GET() {
    const customAdsTxt = await getSetting('adsense_ads_txt')
    if (customAdsTxt && customAdsTxt.trim()) {
        return new NextResponse(customAdsTxt.trim(), {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600'
            }
        })
    }

    const publisherIdSetting = await getSetting('adsense_publisher_id')
    const rawId = publisherIdSetting || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'pub-6513929866629555'

    // Format strict standard IAB pour Google AdSense :
    // DOIT être sous la forme pub-XXXXXXXXXXXXXXXX (jamais ca-pub- dans ads.txt)
    let cleanId = rawId.replace(/^ca-/, '').trim()
    if (!cleanId.startsWith('pub-')) {
        cleanId = `pub-${cleanId}`
    }

    const content = `google.com, ${cleanId}, DIRECT, f08c47fec0942fa0`

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
    })
}
