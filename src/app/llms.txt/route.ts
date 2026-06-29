import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultLlmsText = `# Riwaya — Librairie en ligne au Maroc

> Riwaya est la meilleure librairie en ligne au Maroc. Vente de livres, packs de livres et échange de livres entre lecteurs. Livraison COD partout au Maroc.

## Présentation

Riwaya (رواية) est une librairie e-commerce marocaine spécialisée dans :
- La vente de livres individuels
- La vente de packs de livres
- L'échange de livres entre lecteurs
- La livraison Cash on Delivery (COD) partout au Maroc

**Site** : https://riwaya.store  
**Langues** : Français, Arabe, Anglais  
**Pays** : Maroc (MA)  
**Devise** : MAD (Dirham marocain)  
**Paiement** : Cash on Delivery uniquement
`

export async function GET() {
    try {
        const setting = await prisma.siteSettings.findUnique({
            where: { key: 'llms_txt_content' }
        })

        const content = setting?.value || defaultLlmsText

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            }
        })
    } catch (error) {
        return new NextResponse(defaultLlmsText, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            }
        })
    }
}
