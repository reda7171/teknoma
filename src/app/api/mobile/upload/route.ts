import { getMobileCustomer } from '@/lib/mobile-auth'
import { writeFile, mkdir } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'

import { getJwtSecret } from '@/lib/jwt-secret';

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
    const mobileCustomer = await getMobileCustomer(request)
    if (!mobileCustomer) return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })

    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        let decoded: any;
        try {
          decoded = jwt.verify(token, getJwtSecret());
        } catch (e) {
          return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
        }

        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`upload_mobile_${ip}`, { limit: 10, windowMs: 60000 })

        if (!limiter.success) {
            return NextResponse.json(
                { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
                { status: 429 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Fichier trop lourd (Max 5MB)' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const originalName = file.name || 'uploaded_image'
        const ext = path.extname(originalName).toLowerCase()

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: 'Extension non autorisée' }, { status: 400 })
        }

        const safeBaseName = sanitizeFilename(path.basename(originalName, ext))

        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const hash = createHash('md5').update(`${timestamp}-${randomString}`).digest('hex').substring(0, 16)

        const finalFilename = `${hash}-${safeBaseName}_${timestamp}${ext}`

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (err) {
            console.error('Erreur création dossier:', err)
        }

        const filepath = path.join(uploadDir, finalFilename)
        await writeFile(filepath, buffer)

        return NextResponse.json({
            success: true,
            url: `/uploads/avatars/${finalFilename}`
        })
    } catch (error) {
        console.error('Erreur upload mobile:', error)
        return NextResponse.json(
            { error: "Erreur lors de l'upload" },
            { status: 500 }
        )
    }
}
