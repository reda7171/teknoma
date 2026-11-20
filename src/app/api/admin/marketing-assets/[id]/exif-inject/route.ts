import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    let tempFilePath: string | null = null
    try {
        await verifyAdmin()
        const { id } = await params
        const { title, keywords } = await req.json()

        const asset = await (prisma as any).marketingAsset.findUnique({ where: { id } })

        if (!asset || !asset.url) {
            return NextResponse.json({ success: false, error: 'Asset ou image introuvable' }, { status: 404 })
        }

        const kwArray = keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []
        const exifTitle = title || asset.name

        const exifData = {
            XPTitle: exifTitle,
            Title: exifTitle,
            ObjectName: exifTitle,
            XPKeywords: kwArray.join(';'),
            Keywords: kwArray,
            Rating: 5,
            RatingPercent: 99,
            Copyright: 'PetsUnivers',
            Software: 'PetsUnivers',
        }

        // Image locale
        if (asset.url.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), 'public', asset.url)
            if (!fs.existsSync(filePath)) {
                return NextResponse.json({ success: false, error: 'Fichier image introuvable sur le serveur' }, { status: 404 })
            }
            await exiftool.write(filePath, exifData)
            const backupPath = filePath + '_original'
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
            return NextResponse.json({ success: true })
        }

        // Image distante — télécharger → temp → EXIF → supprimer temp
        const imageUrl = asset.url.startsWith('http') ? asset.url : `https://petsunivers.ma${asset.url}`
        const response = await fetch(imageUrl)
        if (!response.ok) {
            return NextResponse.json({ success: false, error: `Image distante inaccessible (${response.status})` }, { status: 400 })
        }

        const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
        tempFilePath = path.join(os.tmpdir(), `petsunivers-exif-asset-${id}.${ext}`)
        fs.writeFileSync(tempFilePath, Buffer.from(await response.arrayBuffer()))

        await exiftool.write(tempFilePath, exifData)
        const backupPath = tempFilePath + '_original'
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)

        return NextResponse.json({ success: true, note: 'EXIF injecté sur copie locale (image distante)' })

    } catch (e: any) {
        console.error('EXIF INJECT MARKETING ERROR:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath) } catch {}
        }
    }
}
