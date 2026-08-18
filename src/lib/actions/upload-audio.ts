'use server'

import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, normalize, extname } from 'path'
import { existsSync } from 'fs'
import { verifyAdmin } from './auth'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'

const ALLOWED_AUDIO_TYPES: Record<string, string[]> = {
    'audio/mpeg': ['494433', 'fffb', 'fffa', 'fff3', 'fff2'], // mp3
    'audio/ogg': ['4f676753'], // ogg
    'audio/wav': ['52494646'], // wav
    'audio/x-m4a': ['00000020', '0000001c', '00000018', '66747970'], // m4a
    'audio/mp4': ['00000020', '0000001c', '00000018', '66747970'], // m4a/mp4 audio
    'audio/webm': ['1a45dfa3'] // webm audio
}

const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB

async function handleSecureAudioUpload(file: File, subDir: string, prefix: string) {
    if (!file) {
        throw new Error("Aucun fichier fourni")
    }

    if (!Object.keys(ALLOWED_AUDIO_TYPES).includes(file.type)) {
        throw new Error(`Format non supporté: ${file.type}. Utilisez MP3, OGG, WAV ou M4A.`)
    }

    if (file.size > MAX_AUDIO_SIZE) {
        throw new Error(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 10MB.`)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const baseName = sanitizeFilename(file.name).split('.')[0]
    const hash = createHash('sha256').update(buffer).update(Date.now().toString()).digest('hex').substring(0, 12)
    const extension = extname(file.name) || '.mp3'
    
    const filename = `${prefix}_${hash}_${baseName}${extension}`

    const uploadDir = join(process.cwd(), 'public', 'uploads', subDir)
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
    }

    const filepath = normalize(join(uploadDir, filename))
    
    if (!filepath.startsWith(uploadDir)) {
        throw new Error("Chemin de fichier invalide")
    }

    await writeFile(filepath, buffer)

    return `/uploads/${subDir}/${filename}`
}

export async function uploadAudioTestimonial(formData: FormData) {
    try {
        await verifyAdmin()
        const file = formData.get('audio') as File
        const audioUrl = await handleSecureAudioUpload(file, 'audios', 'testimonial')
        return { success: true, audioUrl }
    } catch (error: any) {
        console.error('[AUDIO UPLOAD ERROR]', error.message)
        return { success: false, error: error.message || "Erreur lors de l'upload audio" }
    }
}

export async function deleteAudioFile(audioUrl: string) {
    try {
        await verifyAdmin()

        if (!audioUrl || !audioUrl.startsWith('/uploads/audios/')) {
            return { success: false, error: "URL audio invalide" }
        }

        const publicDir = join(process.cwd(), 'public')
        const filepath = normalize(join(publicDir, audioUrl))

        if (!filepath.startsWith(join(publicDir, 'uploads', 'audios'))) {
            return { success: false, error: "Tentative de suppression non autorisée" }
        }

        if (existsSync(filepath)) {
            await unlink(filepath)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Erreur lors de la suppression de l'audio" }
    }
}
