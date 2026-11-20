import { GET as getFeed } from '@/app/feed.xml/route'

export const dynamic = 'force-dynamic'
export const revalidate = 1800

export async function GET() {
    return getFeed()
}
