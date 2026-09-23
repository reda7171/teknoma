import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

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
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        })
    } catch (e) {
        return new NextResponse('Internal error', { status: 500 })
    }
}
