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

        const asset = await (prisma as any).marketingAsset.findUnique({
            where: { id }
        })

        if (!asset || !asset.url) {
            return NextResponse.json({ success: false, error: 'Asset ou image introuvable' }, { status: 404 })
        }

        // Only process local uploads
        if (!asset.url.startsWith('/uploads/')) {
            return NextResponse.json({ success: false, error: 'Impossible d\'injecter EXIF sur une image distante' }, { status: 400 })
        }

        const filePath = path.join(process.cwd(), 'public', asset.url)

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'Fichier image introuvable sur le serveur' }, { status: 404 })
        }

        // Prepare keywords array
        const kwArray = keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []

        // Write EXIF data using exiftool-vendored
        await exiftool.write(filePath, {
            XPTitle: title || asset.name,
            Title: title || asset.name,
            ObjectName: title || asset.name,
            XPKeywords: kwArray.join(';'),
            Keywords: kwArray,
            Subject: kwArray,
            XPAuthor: 'Riwaya Marketing',
            Artist: 'Riwaya Marketing',
            Creator: 'Riwaya Marketing',
            XPComment: 'Promo Riwaya',
            Description: 'Promo Riwaya',
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
