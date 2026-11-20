import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'
import { join } from 'path'
import { rename, stat } from 'fs/promises'
import fs from 'fs'

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-\u0600-\u06FF]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        try { await verifyAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

        const { id } = await params;
        const book = await prisma.book.findUnique({
            where: { id },
            select: { image: true, titleFr: true, title: true }
        })

        if (!book || !book.image) {
            return NextResponse.json({ success: false, error: 'Livre introuvable ou aucune image' }, { status: 404 })
        }

        const imageUrl = book.image
        if (!imageUrl.startsWith('/uploads/')) {
            return NextResponse.json({ success: false, error: 'Seules les images locales peuvent être renommées' }, { status: 400 })
        }

        const absolutePath = join(process.cwd(), 'public', imageUrl)

        try {
            await stat(absolutePath)
        } catch {
            // Logique de secours : si le fichier n'existe pas, on tente de le télécharger depuis petsunivers.ma
            try {
                const remoteUrl = `https://petsunivers.ma${imageUrl}`;
                const response = await fetch(remoteUrl);
                if (!response.ok) throw new Error('Introuvable sur le serveur distant');

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // S'assurer que le dossier parent existe
                const dir = join(process.cwd(), 'public', ...imageUrl.split('/').slice(0, -1).filter(Boolean));
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(absolutePath, buffer);
                void(`[Auto-Recovery] Image téléchargée depuis petsunivers.ma: ${imageUrl}`);
            } catch (dlError) {
                return NextResponse.json({ success: false, error: 'Fichier introuvable localement et sur petsunivers.ma' }, { status: 404 })
            }
        }

        const title = book.titleFr || book.title || 'livre'
        const baseSlug = slugify(title)

        const pathParts = imageUrl.split('/').filter(Boolean) // ['uploads', 'books', 'file.jpg']
        const fileName = pathParts[pathParts.length - 1]
        const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i)
        const extension = extensionMatch ? extensionMatch[1] : 'jpg'

        // Retirer le nom de fichier pour obtenir le dossier (ex: ['uploads', 'books'])
        const folderParts = pathParts.slice(0, -1)
        const dirPath = join(process.cwd(), 'public', ...folderParts)

        let newFileName = `${baseSlug || 'livre'}.${extension}`

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

        const newUrl = `/${folderParts.join('/')}/${newFileName}`

        await prisma.book.update({
            where: { id },
            data: { image: newUrl }
        })

        return NextResponse.json({ success: true, newUrl })

    } catch (error: any) {
        console.error("Rename Image Error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
