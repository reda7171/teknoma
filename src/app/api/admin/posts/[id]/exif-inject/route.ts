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

        const post = await (prisma as any).post.findUnique({
            where: { id }
        })

        if (!post || !post.coverImage) {
            return NextResponse.json({ success: false, error: 'Article ou image introuvable' }, { status: 404 })
        }

        // Only process local uploads
        if (!post.coverImage.startsWith('/uploads/')) {
            return NextResponse.json({ success: false, error: 'Impossible d\'injecter EXIF sur une image distante' }, { status: 400 })
        }

        const filePath = path.join(process.cwd(), 'public', post.coverImage)

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'Fichier image introuvable sur le serveur' }, { status: 404 })
        }

        // Prepare keywords array
        const kwArray = keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []

        // Write EXIF data using exiftool-vendored
        await exiftool.write(filePath, {
            XPTitle: title || post.title,
            Title: title || post.title,
            ObjectName: title || post.title,
            XPKeywords: kwArray.join(';'),
            Keywords: kwArray,
            Subject: kwArray,
            XPAuthor: post.authorName || 'Riwaya',
            Artist: post.authorName || 'Riwaya',
            Creator: post.authorName || 'Riwaya',
            XPComment: 'Blog Riwaya',
            Description: 'Blog Riwaya',
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
