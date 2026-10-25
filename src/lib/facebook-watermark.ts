import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import sharp from 'sharp'

export interface FacebookWatermarkConfig {
    enabled: boolean
    text?: string
    phone?: string
    showPrice?: boolean
    position?: 'bottom' | 'top' | 'corner' | 'center'
    style?: 'banner' | 'badge' | 'logo' | 'custom'
    color?: string
    opacity?: number
}

function escapeXml(unsafe: string): string {
    return (unsafe || '').replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case '\'': return '&apos;'
            case '"': return '&quot;'
            default: return c
        }
    })
}

export async function generateFacebookWatermarkedImage(
    book: { id: string, title: string, price: number, image: string | null },
    config: FacebookWatermarkConfig
): Promise<{ success: boolean, relativeUrl: string, absolutePath: string } | null> {
    if (!book.image) return null

    const publicDir = path.join(process.cwd(), 'public')
    const rawImagePath = path.join(publicDir, book.image.replace(/^\/+/, ''))

    // Télécharger depuis riwaya.store si manquant en local
    if (!fs.existsSync(rawImagePath)) {
        try {
            const prodUrl = `https://riwaya.store${book.image.startsWith('/') ? book.image : '/' + book.image}`
            const res = await fetch(prodUrl)
            if (res.ok) {
                const buffer = await res.arrayBuffer()
                const dir = path.dirname(rawImagePath)
                await fsPromises.mkdir(dir, { recursive: true })
                await fsPromises.writeFile(rawImagePath, Buffer.from(buffer))
            } else {
                return null
            }
        } catch {
            return null
        }
    }

    if (!fs.existsSync(rawImagePath)) return null

    try {
        const metadata = await sharp(rawImagePath).metadata()
        const width = metadata.width || 800
        const height = metadata.height || 1200

        const bannerHeight = Math.round(height * 0.15)
        const bannerColor = config.color || '#0f172a'
        const opacity = config.opacity !== undefined ? config.opacity : 0.92
        const brandText = 'RIWAYA.STORE'
        const customText = config.text || 'WhatsApp: +212 666-038129 • Livraison Partout au Maroc'
        const position = config.position || 'bottom'
        const showPrice = config.showPrice !== false

        // Construire les éléments SVG
        const svgParts: string[] = []

        // 1. Badge de Prix (en haut à gauche ou en haut à droite)
        if (showPrice) {
            const badgeW = Math.round(width * 0.38)
            const badgeH = Math.round(height * 0.08)
            const badgeX = Math.round(width * 0.04)
            const badgeY = Math.round(height * 0.04)
            const priceFontSize = Math.round(badgeH * 0.52)
            const priceText = `${book.price} MAD`

            svgParts.push(`
                <g filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.45))">
                    <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="#2563eb" fill-opacity="0.95" />
                    <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.8" />
                    <text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH / 2 + priceFontSize * 0.35}" 
                          fill="#ffffff" font-size="${priceFontSize}" font-weight="900" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
                        ${escapeXml(priceText)}
                    </text>
                </g>
            `)
        }

        // 2. Filigrane principal selon la position
        if (position === 'center') {
            const centerFontSize = Math.round(width * 0.08)
            svgParts.push(`
                <g transform="rotate(-30, ${width / 2}, ${height / 2})">
                    <rect x="${width * 0.1}" y="${height / 2 - 40}" width="${width * 0.8}" height="80" rx="16" fill="${bannerColor}" fill-opacity="${opacity * 0.7}" />
                    <text x="${width / 2}" y="${height / 2 + 15}" fill="#ffffff" font-size="${centerFontSize}" font-weight="900" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" letter-spacing="2">
                        ${escapeXml(brandText)}
                    </text>
                </g>
            `)
        } else if (position === 'corner') {
            const cornerW = Math.round(width * 0.5)
            const cornerH = Math.round(height * 0.1)
            const cornerX = width - cornerW - 20
            const cornerY = height - cornerH - 20
            const fontSize = Math.round(cornerH * 0.35)

            svgParts.push(`
                <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.5))">
                    <rect x="${cornerX}" y="${cornerY}" width="${cornerW}" height="${cornerH}" rx="16" fill="${bannerColor}" fill-opacity="${opacity}" stroke="#3b82f6" stroke-width="2" />
                    <text x="${cornerX + cornerW / 2}" y="${cornerY + cornerH * 0.42}" fill="#ffffff" font-size="${fontSize}" font-weight="900" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
                        ${escapeXml(brandText)}
                    </text>
                    <text x="${cornerX + cornerW / 2}" y="${cornerY + cornerH * 0.78}" fill="#93c5fd" font-size="${Math.round(fontSize * 0.7)}" font-weight="700" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
                        ${escapeXml(customText)}
                    </text>
                </g>
            `)
        } else {
            // Bandeau en haut ou en bas (default = bottom)
            const bannerY = position === 'top' ? 0 : (height - bannerHeight)
            const titleFontSize = Math.round(bannerHeight * 0.28)
            const subFontSize = Math.round(bannerHeight * 0.22)
            const accentY = position === 'top' ? (bannerHeight - 4) : bannerY

            svgParts.push(`
                <!-- Bandeau fond -->
                <rect x="0" y="${bannerY}" width="${width}" height="${bannerHeight}" fill="${bannerColor}" fill-opacity="${opacity}" />
                <!-- Ligne d'accentuation Riwaya -->
                <rect x="0" y="${accentY}" width="${width}" height="4" fill="#3b82f6" />
                
                <!-- Titre de la marque -->
                <text x="${width / 2}" y="${bannerY + bannerHeight * 0.42}" 
                      fill="#ffffff" font-size="${titleFontSize}" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
                    ${escapeXml(brandText)}
                </text>
                
                <!-- Texte secondaire (WhatsApp, Contact, Livraison) -->
                <text x="${width / 2}" y="${bannerY + bannerHeight * 0.78}" 
                      fill="#93c5fd" font-size="${subFontSize}" font-weight="700" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
                    ${escapeXml(customText)}
                </text>
            `)
        }

        const compositeSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgParts.join('\n')}</svg>`
        const svgBuffer = Buffer.from(compositeSvg)

        const outputDir = path.join(publicDir, 'uploads', 'facebook-bot')
        await fsPromises.mkdir(outputDir, { recursive: true })

        const outputFileName = `watermarked_${book.id}.jpg`
        const outputPath = path.join(outputDir, outputFileName)

        await sharp(rawImagePath)
            .resize({ width: Math.min(width, 1400), height: Math.min(height, 1400), fit: 'inside' })
            .composite([{ input: svgBuffer, blend: 'over' }])
            .jpeg({ quality: 92 })
            .toFile(outputPath)

        return {
            success: true,
            relativeUrl: `/uploads/facebook-bot/${outputFileName}?t=${Date.now()}`,
            absolutePath: outputPath
        }
    } catch (err) {
        console.error('Erreur generateFacebookWatermarkedImage:', err)
        return null
    }
}
