import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()

        const { imageUrl, gravity = 'southeast' } = await req.json()
        if (!imageUrl) {
            return NextResponse.json({ error: 'URL de l\'image manquante' }, { status: 400 })
        }

        // URL comes as relative to public, e.g., /uploads/books/...
        const publicDir = path.join(process.cwd(), 'public')
        const baseImagePath = path.join(publicDir, imageUrl.replace(/^\/+/, ''))
        const logoPath = path.join(publicDir, 'logo.png')

        // Vérifier que l'image de base existe
        try {
            await fs.access(baseImagePath)
        } catch {
            return NextResponse.json({ error: 'Image introuvable localement' }, { status: 404 })
        }

        // Lire l'image de base pour avoir ses dimensions
        const baseImage = sharp(baseImagePath)
        const metadata = await baseImage.metadata()

        if (!metadata.width || !metadata.height) {
            return NextResponse.json({ error: 'Impossible de lire les dimensions de l\'image' }, { status: 500 })
        }

        // Calculer la taille du logo (35% de la plus petite dimension)
        const maxLogoSize = Math.max(50, Math.round(Math.min(metadata.width, metadata.height) * 0.35))

        const logoBuffer = await sharp(logoPath)
            .trim() // Enlever les marges transparentes du logo
            .resize({ width: maxLogoSize, height: maxLogoSize, fit: 'inside' })
            .toBuffer()

        const watermarkedFileName = `watermarked_${Date.now()}_${path.basename(baseImagePath)}`
        const uploadsMarketingDir = path.join(publicDir, 'uploads', 'marketing')
        
        // S'assurer que le dossier existe
        await fs.mkdir(uploadsMarketingDir, { recursive: true })

        const outputPath = path.join(uploadsMarketingDir, watermarkedFileName)

        // Validate gravity against sharp's supported values to prevent malicious input
        const validGravities = ['northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south', 'southeast']
        const finalGravity = validGravities.includes(gravity) ? gravity : 'southeast'

        // Superposer le logo
        await sharp(baseImagePath)
            .withMetadata() // Préserver les métadonnées (orientation EXIF, etc.)
            .composite([
                {
                    input: logoBuffer,
                    gravity: finalGravity,
                    blend: 'over'
                }
            ])
            .toFile(outputPath)

        const finalUrl = `/uploads/marketing/${watermarkedFileName}`

        // Enregistrer dans la base de données
        const asset = await prisma.marketingAsset.create({
            data: {
                name: watermarkedFileName,
                url: finalUrl,
                type: 'image'
            }
        })

        return NextResponse.json({ success: true, asset })
    } catch (error: any) {
        console.error('Watermark Error:', error)
        return NextResponse.json({ error: error.message || 'Erreur lors du filigranage' }, { status: 500 })
    }
}
