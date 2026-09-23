import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

// Headers CORS pour permettre à Instagram/Facebook de télécharger les images
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Robots-Tag': 'noindex',
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    const pathArray = params.path || []
    
    // Sécurité: Empêcher de remonter dans les dossiers (Path Traversal)
    if (pathArray.some(segment => segment.includes('..'))) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const filePath = join(process.cwd(), 'public', 'uploads', ...pathArray)
    
    if (!existsSync(filePath)) {
        return new NextResponse('Not found', { status: 404 })
    }
    
    try {
        const fileBuffer = await readFile(filePath)
        
        // Déterminer le content-type
        let contentType = 'application/octet-stream'
        const ext = filePath.split('.').pop()?.toLowerCase()
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg'
        else if (ext === 'png') contentType = 'image/png'
        else if (ext === 'gif') contentType = 'image/gif'
        else if (ext === 'webp') contentType = 'image/webp'
        
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                ...CORS_HEADERS,
            }
        })
    } catch (e) {
        return new NextResponse('Internal error', { status: 500 })
    }
}
