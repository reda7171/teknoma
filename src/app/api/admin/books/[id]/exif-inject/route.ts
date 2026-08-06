import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await verifyAdmin()
        const { id } = await params
        const { title, keywords } = await req.json()

        const book = await (prisma as any).book.findUnique({
            where: { id }
        })

        if (!book || !book.image) {
            return NextResponse.json({ success: false, error: 'Livre ou image introuvable' }, { status: 404 })
        }

        // Only process local uploads
        if (!book.image.startsWith('/uploads/')) {
            return NextResponse.json({ success: false, error: 'Impossible d\'injecter EXIF sur une image distante' }, { status: 400 })
        }

        const filePath = path.join(process.cwd(), 'public', book.image)

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'Fichier image introuvable sur le serveur' }, { status: 404 })
        }

        // Prepare keywords array
        const kwArray = keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []

        // Write EXIF data using exiftool-vendored
        // Title -> XPTitle, Title, ObjectName
        // Keywords -> XPKeywords, Keywords, Subject
        await exiftool.write(filePath, {
            XPTitle: title || book.title,
            Title: title || book.title,
            ObjectName: title || book.title,
            XPSubject: title || book.title,
            Subject: title || book.title,
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
        })

        // Exiftool creates an _original backup file. We can delete it to save space.
        const backupPath = filePath + '_original'
        if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath)
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('EXIF INJECT ERROR:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
