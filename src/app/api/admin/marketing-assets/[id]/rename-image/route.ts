import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'
import { join } from 'path'
import { rename, stat } from 'fs/promises'
import fs from 'fs'

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        try { await verifyAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

        const asset = await prisma.marketingAsset.findUnique({
            where: { id: params.id },
            select: { image: true, name: true }
        })

        if (!asset || !asset.image) {
            return NextResponse.json({ success: false, error: 'Asset introuvable ou aucune image' }, { status: 404 })
        }

        const imageUrl = asset.image
        if (!imageUrl.startsWith('/uploads/')) {
            return NextResponse.json({ success: false, error: 'Seules les images locales peuvent être renommées' }, { status: 400 })
        }

        const absolutePath = join(process.cwd(), 'public', imageUrl)
        
        try {
            await stat(absolutePath)
        } catch {
            return NextResponse.json({ success: false, error: 'Fichier image introuvable sur le disque' }, { status: 404 })
        }

        const title = asset.name || 'asset'
        const baseSlug = slugify(title)
        
        const pathParts = imageUrl.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i)
        const extension = extensionMatch ? extensionMatch[1] : 'jpg'
        
        let newFileName = `${baseSlug}.${extension}`
        const dirPath = join(process.cwd(), 'public', 'uploads')
        
        // Ensure no collisions
        let counter = 1
        let newAbsolutePath = join(dirPath, newFileName)
        
        if (newAbsolutePath === absolutePath) {
             return NextResponse.json({ success: true, message: 'Fichier déjà bien nommé', newUrl: imageUrl })
        }
        
        while (fs.existsSync(newAbsolutePath)) {
            newFileName = `${baseSlug}-${counter}.${extension}`
            newAbsolutePath = join(dirPath, newFileName)
            counter++
        }

        await rename(absolutePath, newAbsolutePath)
        
        const newUrl = `/uploads/${newFileName}`
        
        await prisma.marketingAsset.update({
            where: { id: params.id },
            data: { image: newUrl }
        })

        return NextResponse.json({ success: true, newUrl })

    } catch (error: any) {
        console.error("Rename Image Error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
