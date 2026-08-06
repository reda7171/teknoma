import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { exiftool } from 'exiftool-vendored'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
    try {
        await verifyAdmin()
        const { edits } = await req.json()
        
        if (!edits || typeof edits !== 'object') {
            return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
        }

        const bookIds = Object.keys(edits)
        const books = await (prisma as any).book.findMany({
            where: { id: { in: bookIds } }
        })

        let successCount = 0

        for (const book of books) {
            if (!book.image || !book.image.startsWith('/uploads/')) continue
            
            const filePath = path.join(process.cwd(), 'public', book.image)
            if (!fs.existsSync(filePath)) continue

            const edit = edits[book.id]
            if (!edit) continue

            const kwArray = edit.keywords ? edit.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []
            const title = edit.title || book.title

            try {
                await exiftool.write(filePath, {
                    XPTitle: title,
                    Title: title,
                    ObjectName: title,
                    XPSubject: title,
                    Subject: title,
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

                // Exiftool creates an _original backup file. Delete it.
                const backupPath = filePath + '_original'
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath)
                }
                
                successCount++
            } catch (err) {
                console.error(`Erreur EXIF pour ${book.title}:`, err)
            }
        }

        return NextResponse.json({ success: true, count: successCount })
    } catch (e: any) {
        console.error('EXIF BULK INJECT ERROR:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
