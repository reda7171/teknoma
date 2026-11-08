import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getJwtSecret } from './jwt-secret'

type Purpose = 'admin' | 'community'

export function readSessionSubject(token: string): string | null {
    if (!token || token.length > 1024) return null
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':')
    return parts.length === 3 && /^[a-zA-Z0-9_-]{1,100}$/.test(parts[0]) ? parts[0] : null
}

export function createSessionToken(id: string, passwordHash: string, purpose: Purpose, now = Date.now()) {
    const payload = `${id}:${now}`
    const signature = createHmac('sha256', getJwtSecret()).update(`${purpose}:${payload}:${passwordHash}`).digest('hex')
    return Buffer.from(`${payload}:${signature}`).toString('base64')
}

export function verifySessionToken(token: string, passwordHash: string, purpose: Purpose, maxAgeMs: number, now = Date.now()) {
    if (!readSessionSubject(token)) return false
    const [id, timestamp, signature] = Buffer.from(token, 'base64').toString('utf8').split(':')
    const issuedAt = Number(timestamp)
    if (!Number.isFinite(issuedAt) || now < issuedAt || now - issuedAt > maxAgeMs || !/^[a-f0-9]{64}$/.test(signature)) return false
    const expected = createHmac('sha256', getJwtSecret()).update(`${purpose}:${id}:${timestamp}:${passwordHash}`).digest()
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}
