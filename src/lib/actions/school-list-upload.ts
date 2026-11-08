'use server'

import { writeFile, mkdir } from 'fs/promises'
import { join, normalize } from 'path'
import { existsSync } from 'fs'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'text/plain'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadSchoolList(formData: FormData) {
    try {
        if (!(await rateLimit(`school_list_${await getIpIdentifier()}`, { limit: 3, windowMs: 15 * 60 * 1000 })).success) return { success: false, error: 'Veuillez réessayer plus tard' }
        const file = formData.get('file') as File
        const name = formData.get('name') as string
        const phone = formData.get('phone') as string

        if (!file || !name || !phone) {
            return { success: false, error: "Veuillez remplir tous les champs et fournir un fichier." }
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
             // Browser sometimes sends weird MIME types for docx, so we also check extension
             const ext = file.name.split('.').pop()?.toLowerCase()
             if (ext !== 'pdf' && ext !== 'docx' && ext !== 'txt') {
                 return { success: false, error: "Format non supporté. Utilisez PDF, DOCX ou TXT." }
             }
        }

        if (file.size > MAX_FILE_SIZE) {
            return { success: false, error: "Fichier trop volumineux (10MB max)." }
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!extension || !['pdf', 'docx', 'txt'].includes(extension)) return { success: false, error: 'Format invalide' }
        if (extension === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') return { success: false, error: 'PDF invalide' }
        if (extension === 'docx' && buffer.subarray(0, 2).toString() !== 'PK') return { success: false, error: 'Document invalide' }

        const baseName = sanitizeFilename(file.name).split('.')[0]
        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
        const hash = createHash('sha256').update(buffer).update(Date.now().toString()).digest('hex').substring(0, 8)

        const filename = `list_${hash}_${baseName}.${ext}`

        const uploadDir = join(process.cwd(), 'data', 'private-school-lists')
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filepath = normalize(join(uploadDir, filename))

        if (!filepath.startsWith(uploadDir)) {
            throw new Error("Chemin invalide")
        }

        await writeFile(filepath, buffer)

        const { prisma } = await import('@/lib/prisma')
        await prisma.schoolList.create({
            data: {
                name,
                phone,
                fileUrl: `/api/admin/school-lists/files/${encodeURIComponent(filename)}`,
                status: 'PENDING'
            }
        })

        return { success: true, message: "Votre liste a été envoyée avec succès !" }

    } catch (error: any) {
        console.error('[SCHOOL LIST UPLOAD ERROR]', error)
        return { success: false, error: "Erreur lors de l'envoi du fichier." }
    }
}
