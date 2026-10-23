import 'server-only'

import { timingSafeEqual } from 'crypto'

function normalizeCronSecret(value: string | undefined) {
    if (!value) return null

    const trimmed = value.trim()
    const unquoted = trimmed.match(/^(['"])(.*)\1$/)?.[2] ?? trimmed
    return unquoted.trim() || null
}

export function getCronSecret() {
    return normalizeCronSecret(process.env.CRON_SECRET)
}

export function isAuthorizedCronRequest(request: Request) {
    const expected = getCronSecret()
    if (!expected) return false

    const url = new URL(request.url)
    const supplied = normalizeCronSecret(
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
        || url.searchParams.get('secret')
        || url.searchParams.get('token')
        || undefined
    )
    if (!supplied) return false

    const expectedBuffer = Buffer.from(expected)
    const suppliedBuffer = Buffer.from(supplied)
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}
