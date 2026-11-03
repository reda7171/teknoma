'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { getCached } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { writeFile, readFile, mkdir, unlink } from 'fs/promises'
import { join, normalize } from 'path'
import { existsSync } from 'fs'
import { sanitizeFilename } from '@/lib/security'
import { createHash } from 'crypto'
import sharp from 'sharp'

const ALLOWED_FILES: Record<string, string[]> = {
    'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
    'image/png': ['89504e47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646']
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function blurPhoneOnBuffer(imageBuffer: Buffer): Promise<Buffer> {
    const meta = await sharp(imageBuffer).metadata()
    if (!meta.width || !meta.height) return imageBuffer

    // Région proportionnelle correspondant au bandeau numéro de WhatsApp
    const box = {
        left: Math.round(meta.width * 0.22),
        top: Math.round(meta.height * 0.035),
        width: Math.round(meta.width * 0.44),
        height: Math.round(meta.height * 0.042)
    }

    if (box.left + box.width <= meta.width && box.top + box.height <= meta.height) {
        const patch = await sharp(imageBuffer)
            .extract(box)
            .blur(25)
            .toBuffer()

        return await sharp(imageBuffer)
            .composite([{ input: patch, top: box.top, left: box.left }])
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer()
    }
    return imageBuffer
}

async function handleSecureImageUpload(file: File, subDir: string, prefix: string, autoBlurPhone = true) {
    if (!file) {
        throw new Error("Aucun fichier fourni")
    }

    if (!Object.keys(ALLOWED_FILES).includes(file.type)) {
        throw new Error(`Format non supporté: ${file.type}. Utilisez JPG, PNG, WebP ou GIF.`)
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 5MB.`)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const magicBytes = buffer.slice(0, 4).toString('hex')
    const expectedSignatures = ALLOWED_FILES[file.type]
    if (expectedSignatures && !expectedSignatures.some(sig => magicBytes.startsWith(sig))) {
        throw new Error("Le contenu du fichier ne correspond pas à son extension (Signature invalide)")
    }

    let processedBuffer: Buffer
    try {
        processedBuffer = await sharp(buffer)
            .jpeg({ quality: 85, mozjpeg: true })
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
            .toBuffer()

        if (autoBlurPhone) {
            processedBuffer = await blurPhoneOnBuffer(processedBuffer)
        }
    } catch (sharpError) {
        processedBuffer = buffer
    }

    const baseName = sanitizeFilename(file.name).split('.')[0]
    const hash = createHash('sha256').update(processedBuffer).update(Date.now().toString()).digest('hex').substring(0, 12)
    const filename = `${prefix}_${hash}_${baseName}.jpg`

    const uploadDir = join(process.cwd(), 'public', 'uploads', subDir)
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
    }

    const filepath = normalize(join(uploadDir, filename))
    if (!filepath.startsWith(uploadDir)) {
        throw new Error("Chemin de fichier invalide")
    }

    await writeFile(filepath, processedBuffer)

    return `/uploads/${subDir}/${filename}`
}

export async function uploadImageTestimonial(formData: FormData) {
    try {
        await verifyAdmin()

        const file = formData.get('image') as File
        const customerName = formData.get('customerName') as string

        if (!file || !customerName) {
            return { success: false, error: "Le fichier et le nom du client sont requis" }
        }

        const shouldBlur = formData.get('blurPhone') !== 'false'
        const imageUrl = await handleSecureImageUpload(file, 'testimonials', 'testimonial_img', shouldBlur)

        await prisma.imageTestimonial.create({
            data: {
                customerName,
                imageUrl,
                isApproved: true,
            }
        })

        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Erreur lors de l'upload de l'image" }
    }
}

export async function getImageTestimonials() {
    try {
        await verifyAdmin()
        const testimonials = await prisma.imageTestimonial.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, testimonials }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getApprovedImageTestimonials(limit?: number) {
    return getCached(`testimonials:image:approved:${limit ?? 'all'}`, async () => {
        try {
            const testimonials = await prisma.imageTestimonial.findMany({
                where: { isApproved: true },
                orderBy: { createdAt: 'desc' },
                ...(limit ? { take: limit } : {}),
            })
            return { success: true, testimonials }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }, 3600) // 1 hour cache
}

export async function deleteImageTestimonial(id: string) {
    try {
        await verifyAdmin()

        const testimonial = await prisma.imageTestimonial.findUnique({ where: { id } })
        if (!testimonial) {
            return { success: false, error: 'Avis introuvable' }
        }

        const publicDir = process.cwd()
        const filepath = normalize(join(publicDir, 'public', testimonial.imageUrl))

        if (filepath.startsWith(join(publicDir, 'public', 'uploads', 'testimonials')) && existsSync(filepath)) {
            await unlink(filepath)
        }

        await prisma.imageTestimonial.delete({ where: { id } })
        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur lors de la suppression' }
    }
}

export async function deleteImageTestimonials(ids: string[]) {
    try {
        await verifyAdmin()
        if (!ids || ids.length === 0) {
            return { success: false, error: 'Aucun avis sélectionné' }
        }

        const testimonials = await prisma.imageTestimonial.findMany({
            where: { id: { in: ids } }
        })

        const publicDir = process.cwd()
        for (const t of testimonials) {
            const filepath = normalize(join(publicDir, 'public', t.imageUrl))
            if (filepath.startsWith(join(publicDir, 'public', 'uploads', 'testimonials')) && existsSync(filepath)) {
                await unlink(filepath).catch(() => { })
            }
        }

        await prisma.imageTestimonial.deleteMany({
            where: { id: { in: ids } }
        })
        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur lors de la suppression' }
    }
}

export async function toggleImageTestimonial(id: string) {
    try {
        await verifyAdmin()
        const testimonial = await prisma.imageTestimonial.findUnique({ where: { id } })

        if (!testimonial) {
            return { success: false, error: 'Avis introuvable' }
        }

        await prisma.imageTestimonial.update({
            where: { id },
            data: { isApproved: !testimonial.isApproved }
        })

        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Erreur lors du changement d'état" }
    }
}

export async function blurTestimonialPhoneNumber(id: string) {
    try {
        await verifyAdmin()
        const testimonial = await prisma.imageTestimonial.findUnique({ where: { id } })
        if (!testimonial) {
            return { success: false, error: 'Avis introuvable' }
        }

        const publicDir = process.cwd()
        const filepath = normalize(join(publicDir, 'public', testimonial.imageUrl))
        if (!existsSync(filepath)) {
            return { success: false, error: 'Fichier image introuvable sur le disque' }
        }

        const fileBuffer = await readFile(filepath)
        const blurredBuffer = await blurPhoneOnBuffer(fileBuffer)
        await writeFile(filepath, blurredBuffer)

        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur lors du floutage du numéro' }
    }
}

export async function blurAllTestimonialPhoneNumbers() {
    try {
        await verifyAdmin()
        const testimonials = await prisma.imageTestimonial.findMany()
        const publicDir = process.cwd()
        let count = 0

        for (const t of testimonials) {
            const filepath = normalize(join(publicDir, 'public', t.imageUrl))
            if (existsSync(filepath)) {
                try {
                    const fileBuffer = await readFile(filepath)
                    const blurredBuffer = await blurPhoneOnBuffer(fileBuffer)
                    await writeFile(filepath, blurredBuffer)
                    count++
                } catch (e) { }
            }
        }

        revalidatePath('/admin/reviews')
        revalidatePath('/', 'layout')
        return { success: true, count }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur lors du floutage général' }
    }
}
