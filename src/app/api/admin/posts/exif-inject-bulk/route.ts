import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","BLOG_MODERATOR"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { edits } = await req.json()
        let count = 0

        for (const [id, data] of Object.entries(edits) as [string, any][]) {
            const post = await (prisma as any).post.findUnique({
                where: { id }
            })

            if (post?.coverImage && post.coverImage.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', post.coverImage)

                if (fs.existsSync(filePath)) {
                    const kwArray = data.keywords ? data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []

                    await exiftool.write(filePath, {
                        XPTitle: data.title || post.title,
                        Title: data.title || post.title,
                        ObjectName: data.title || post.title,
                        XPKeywords: kwArray.join(';'),
                        Keywords: kwArray,
                        Subject: kwArray,
                        XPAuthor: post.authorName || 'Riwaya',
                        Artist: post.authorName || 'Riwaya',
                        Creator: post.authorName || 'Riwaya',
                        XPComment: 'Blog Riwaya',
                        Description: 'Blog Riwaya',
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
