import 'server-only'

import { timingSafeEqual } from 'crypto'

export function isAuthorizedCronRequest(request: Request) {
    const expected = process.env.CRON_SECRET?.replace(/^["']|["']$/g, '')
    if (!expected) return false

    const url = new URL(request.url)
    const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
        || url.searchParams.get('secret')
        || url.searchParams.get('token')
    if (!supplied) return false

    const expectedBuffer = Buffer.from(expected)
    const suppliedBuffer = Buffer.from(supplied)
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}
