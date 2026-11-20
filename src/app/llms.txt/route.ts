import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultLlmsText = "# Tekno Store\n\nBoutique High-Tech en ligne au Maroc : smartphones, ordinateurs portables, Mac et accessoires technologiques.\n\n- Accueil : https://tekno.ma/fr\n- Boutique : https://tekno.ma/fr/products\n- Services : https://tekno.ma/fr/services\n- Contact : https://tekno.ma/fr/contact\n"

export async function GET() {
    try {
        const setting = await prisma.siteSettings.findFirst({
            where: {
                key: {
                    in: ['aeo_llms_txt_content_fr', 'aeo_llms_txt_content', 'llms_txt_content']
                }
            },
            orderBy: {
                key: 'asc'
            }
        })

        // On prend par ordre de priorité, idéalement le FR de AEO (puisqu'il est géré par l'admin).
        // Mais orderBy 'asc' n'est pas parfait pour la priorité, donc on va faire une requête in avec un findMany et trouver manuellement
        const allSettings = await prisma.siteSettings.findMany({
            where: {
                key: {
                    in: ['aeo_llms_txt_content_fr', 'aeo_llms_txt_content', 'llms_txt_content']
                }
            }
        })

        let content = defaultLlmsText

        const frContent = allSettings.find(s => s.key === 'aeo_llms_txt_content_fr')?.value
        const aeoContent = allSettings.find(s => s.key === 'aeo_llms_txt_content')?.value
        const legacyContent = allSettings.find(s => s.key === 'llms_txt_content')?.value

        if (frContent) content = frContent
        else if (aeoContent) content = aeoContent
        else if (legacyContent) content = legacyContent

        const categories = await prisma.categoryConfig.findMany({
            select: { name: true },
            take: 20
        })

        const topBooks = await prisma.book.findMany({
            where: { active: true },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { id: true, title: true }
        })

        let dynamicLinks = `\n\n## 📚 Explorer notre Catalogue (Liens Dynamiques)\n\n### Nos Catégories\n`

        categories.forEach(c => {
            const catName = c.name;
            // On encode pour l'URL
            dynamicLinks += `- [${catName}](https://tekno.ma/fr/products?category=${encodeURIComponent(catName)})\n`
        })

        dynamicLinks += `\n### Nouveautés & Bestsellers\n`
        topBooks.forEach(b => {
            dynamicLinks += `- [${b.title.replace(/\[|\]/g, '')}](https://tekno.ma/fr/products/${b.id})\n`
        })

        const finalContent = content + dynamicLinks;

        return new NextResponse(finalContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            }
        })
    } catch (error) {
        return new NextResponse(defaultLlmsText, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
            }
        })
    }
}
