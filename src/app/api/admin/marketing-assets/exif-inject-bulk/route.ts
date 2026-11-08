import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { edits } = await req.json()
        let count = 0

        for (const [id, data] of Object.entries(edits) as [string, any][]) {
            const asset = await (prisma as any).marketingAsset.findUnique({
                where: { id }
            })

            if (asset?.url && asset.url.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', asset.url)

                if (fs.existsSync(filePath)) {
                    const kwArray = data.keywords ? data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []

                    await exiftool.write(filePath, {
                        XPTitle: data.title || asset.name,
                        Title: data.title || asset.name,
                        ObjectName: data.title || asset.name,
                        XPKeywords: kwArray.join(';'),
                        Keywords: kwArray,
                        Subject: kwArray,
                        XPAuthor: 'Riwaya Marketing',
                        Artist: 'Riwaya Marketing',
                        Creator: 'Riwaya Marketing',
                        XPComment: 'Promo Riwaya',
                        Description: 'Promo Riwaya',
                    })

                    const backupPath = filePath + '_original'
                    if (fs.existsSync(backupPath)) {
                        fs.unlinkSync(backupPath)
                    }
                    count++
                }
            }
        }

        return NextResponse.json({ success: true, count })
    } catch (e: any) {
        console.error('BULK EXIF INJECT ERROR:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
