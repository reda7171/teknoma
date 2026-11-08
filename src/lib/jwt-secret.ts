import 'server-only'
import { randomBytes } from 'node:crypto'

const developmentSecret = randomBytes(48).toString('hex')

// Validate at use time: builds need no production key; runtime fails closed.
export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim()
    if (secret && secret.length >= 32) return secret
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must contain at least 32 characters')
    }
    return developmentSecret
}
