import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const CORS_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
}

function getContentType(pathStr: string): string {
    const ext = pathStr.split('.').pop()?.toLowerCase()
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'png') return 'image/png'
    if (ext === 'gif') return 'image/gif'
    if (ext === 'webp') return 'image/webp'
    if (ext === 'svg') return 'image/svg+xml'
    if (ext === 'avif') return 'image/avif'
    return 'application/octet-stream'
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
    const resolvedParams = await Promise.resolve(params)
    const rawPath = resolvedParams.path || []
    const pathArray = rawPath.map(p => decodeURIComponent(p))
    if (pathArray[0] === 'school-lists') return new NextResponse('Not found', { status: 404 })

    if (pathArray.some(segment => segment.includes('..'))) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const localPath = join(process.cwd(), 'public', 'uploads', ...pathArray)
    if (existsSync(localPath)) {
        return new NextResponse(null, {
            headers: {
                'Content-Type': getContentType(localPath),
                ...CORS_HEADERS,
            },
            status: 200,
        })
    }

    return new NextResponse(null, {
        headers: {
            'Content-Type': 'image/png',
            ...CORS_HEADERS,
        },
        status: 200,
    })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
    const resolvedParams = await Promise.resolve(params)
    const rawPath = resolvedParams.path || []
    const pathArray = rawPath.map(p => decodeURIComponent(p))
    if (pathArray[0] === 'school-lists') return new NextResponse('Not found', { status: 404 })

    // Sécurité: Empêcher de remonter dans les dossiers
    if (pathArray.some(segment => segment.includes('..'))) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const localPath = join(process.cwd(), 'public', 'uploads', ...pathArray)

    // 1. Si le fichier existe localement sur le disque
    if (existsSync(localPath)) {
        try {
            const fileBuffer = await readFile(localPath)
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': getContentType(localPath),
                    ...CORS_HEADERS,
                }
            })
        } catch {
            // Continuer vers les solutions de secours
        }
    }

    // 2. Si non trouvé localement, tenter de récupérer depuis le serveur de production
    const remoteUrl = `https://riwaya.store/uploads/${pathArray.join('/')}`
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const remoteRes = await fetch(remoteUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (remoteRes.ok) {
            const contentType = remoteRes.headers.get('content-type') || getContentType(remoteUrl)
            if (contentType.startsWith('image/')) {
                const arrayBuffer = await remoteRes.arrayBuffer()
                return new NextResponse(Buffer.from(arrayBuffer), {
                    headers: {
                        'Content-Type': contentType,
                        ...CORS_HEADERS,
                    }
                })
            }
        }
    } catch {
        // En cas d'erreur réseau, continuer vers le placeholder
    }

    // 3. Fallback: Renvoyer le placeholder local pour ne jamais faire planter next/image
    try {
        const placeholderPath = join(process.cwd(), 'public', 'book-placeholder.png')
        if (existsSync(placeholderPath)) {
            const placeholderBuffer = await readFile(placeholderPath)
            return new NextResponse(placeholderBuffer, {
                headers: {
                    'Content-Type': 'image/png',
                    ...CORS_HEADERS,
                }
            })
        }
    } catch {
        // Ignorer
    }

    return new NextResponse('Not found', { status: 404 })
}
