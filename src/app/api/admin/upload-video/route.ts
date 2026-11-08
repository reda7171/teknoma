import { authorizeAdminApi } from '@/lib/api-authorization'
import { writeFile, mkdir } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { verifyAdmin } from '@/lib/actions/auth'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'

const ALLOWED_MIME_TYPES = ['video/mp4','video/webm','video/quicktime','video/x-msvideo','video/mpeg']
const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mpeg']
const MAX_FILE_SIZE = 200 * 1024 * 1024

export async function POST(request: NextRequest) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        try { await verifyAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`upload_video_${ip}`, { limit: 10, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ error: 'Trop de requetes.' }, { status: 429 })

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
        if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: 'Format video non autorise. Formats acceptes : MP4, WebM, MOV.' }, { status: 400 })

        const ext = path.extname(file.name).toLowerCase()
        if (!ALLOWED_EXTENSIONS.includes(ext)) return NextResponse.json({ error: `Extension non autorisee : ${ext}` }, { status: 400 })
        if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux. Max 200MB.' }, { status: 400 })

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const sanitized = sanitizeFilename(file.name)
        const hash = createHash('sha256').update(buffer.slice(0, 1024)).update(Date.now().toString()).digest('hex').substring(0, 12)
        const fileName = `${hash}-${sanitized}`

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')
        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, fileName)
        const normalized = path.normalize(filePath)
        if (!normalized.startsWith(uploadDir)) return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })

        await writeFile(normalized, buffer)
        return NextResponse.json({ success: true, url: `/uploads/videos/${fileName}` })
    } catch (error: any) {
        console.error('[VIDEO UPLOAD ERROR]', error.message)
        return NextResponse.json({ error: 'Erreur lors de l upload video' }, { status: 500 })
    }
}
