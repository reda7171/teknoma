import 'server-only'
import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { LookupFunction } from 'node:net'

export function isPublicIPv4(address: string) {
    if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(address)) return false
    const parts = address.split('.').map(Number)
    if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return false
    const [a, b, c] = parts
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
        (a === 192 && b === 0) || (a === 192 && b === 88 && c === 99) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113))
}

export async function fetchPublicImage(input: string, redirects = 0): Promise<Buffer> {
    if (redirects > 3 || input.length > 2048) throw new Error('Image URL refused')
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) throw new Error('Image URL refused')
    const addresses = await lookup(url.hostname, { all: true, family: 4 })
    if (!addresses.length || addresses.some(a => !isPublicIPv4(a.address))) throw new Error('Image URL refused')
    const address = addresses[0]
    // Pin the checked address: a second DNS resolution must not allow rebinding.
    const pinnedLookup: LookupFunction = (_host, _options, callback) => callback(null, address.address, 4)
    const result = await new Promise<Buffer | URL>((resolve, reject) => {
        const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
            family: 4, autoSelectFamily: false, lookup: pinnedLookup,
            headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif,image/avif' },
        }, response => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
                response.resume()
                resolve(new URL(response.headers.location, url))
                return
            }
            if (response.statusCode !== 200 || !/^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(response.headers['content-type'] || '')) {
                response.resume(); reject(new Error('Image response refused')); return
            }
            const chunks: Buffer[] = []
            let size = 0
            response.on('data', (chunk: Buffer) => {
                size += chunk.length
                if (size > 8 * 1024 * 1024) request.destroy(new Error('Image too large'))
                else chunks.push(chunk)
            })
            response.on('end', () => resolve(Buffer.concat(chunks)))
            response.on('error', reject)
        })
        request.setTimeout(10_000, () => request.destroy(new Error('Image request timed out')))
        request.on('error', reject)
        request.end()
    })
    return result instanceof URL ? fetchPublicImage(result.href, redirects + 1) : result
}
