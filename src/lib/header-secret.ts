import 'server-only'
import { timingSafeEqual } from 'node:crypto'

export function hasHeaderSecret(request: Request, expected: string | undefined) {
    const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-webhook-secret')
    if (!expected || expected.length < 32 || !provided) return false
    const a = Buffer.from(expected), b = Buffer.from(provided)
    return a.length === b.length && timingSafeEqual(a, b)
}
