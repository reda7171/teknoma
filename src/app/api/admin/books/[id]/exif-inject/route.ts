import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    let tempFilePath: string | null = null
    try {
        await verifyAdmin()
        const { id } = await params
        const { title, keywords } = await req.json()

        const book = await (prisma as any).book.findUnique({ where: { id } })

        if (!book || !book.image) {
            return NextResponse.json({ success: false, error: 'Livre ou image introuvable' }, { status: 404 })
        }

        const kwArray = keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []
        const exifTitle = title || book.title

        const exifData = {
            XPTitle: exifTitle,
            Title: exifTitle,
            ObjectName: exifTitle,
            XPSubject: exifTitle,
            Subject: exifTitle,
            XPKeywords: kwArray.join(';'),
            Keywords: kwArray,
            Rating: 5,
            RatingPercent: 99,
            XPAuthor: `${book.author} | Riwaya`,
            Artist: `${book.author} | Riwaya`,
            Creator: `${book.author} | Riwaya`,
            XPComment: `Acheter ${book.title} de ${book.author} sur la librairie Riwaya Maroc`,
            Description: `Acheter ${book.title} de ${book.author} sur la librairie Riwaya Maroc`,
            Copyright: 'Riwaya',
            Software: 'Riwaya',
        }

        // Image locale /uploads/
        if (book.image.startsWith('/uploads/')) {
            let filePath = path.join(process.cwd(), 'public', book.image)

            // Télécharger depuis prod si fichier manquant en local
            if (!fs.existsSync(filePath)) {
                const remoteUrl = `https://riwaya.store${book.image}`
                const response = await fetch(remoteUrl)
                if (!response.ok) {
                    return NextResponse.json({ success: false, error: 'Fichier image introuvable (local et prod)' }, { status: 404 })
                }
                const buffer = Buffer.from(await response.arrayBuffer())
                const dir = path.dirname(filePath)
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                fs.writeFileSync(filePath, buffer)
            }

            await exiftool.write(filePath, exifData)
            const backupPath = filePath + '_original'
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)

            return NextResponse.json({ success: true })
        }

        // Image distante (Cloudinary, S3, URL absolue...)
        // Télécharger → temp → EXIF → supprimer temp
        const imageUrl = book.image.startsWith('http') ? book.image : `https://riwaya.store${book.image}`
        const response = await fetch(imageUrl)
        if (!response.ok) {
            return NextResponse.json({ success: false, error: `Image distante inaccessible (${response.status})` }, { status: 400 })
        }

        const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
        const buffer = Buffer.from(await response.arrayBuffer())
        tempFilePath = path.join(os.tmpdir(), `riwaya-exif-${id}.${ext}`)
        fs.writeFileSync(tempFilePath, buffer)

        await exiftool.write(tempFilePath, exifData)

        const backupPath = tempFilePath + '_original'
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)

        // Retourner l'image avec EXIF injectés en base64 pour info (optionnel)
        // Pour les images distantes, l'injection EXIF est faite sur une copie temp locale
        // Les métadonnées SEO sont dans la DB via image-seo endpoint

        return NextResponse.json({ success: true, note: 'EXIF injecté sur copie locale (image distante)' })

    } catch (e: any) {
        console.error('EXIF INJECT ERROR:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    } finally {
        // Nettoyer le fichier temp
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath) } catch {}
        }
    }
}
