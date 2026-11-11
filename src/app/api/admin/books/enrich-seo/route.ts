import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorizeAdminApi } from '@/lib/api-authorization'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { executeWithModelFallback } from '@/lib/gemini'
import { invalidateCatalogCache } from '@/lib/db/books'
import { createAuditLog } from '@/lib/server/audit'

const EnrichBooksSchema = z.object({
    bookIds: z.array(z.string().trim().min(1).max(64)).min(1).max(5),
})

interface GeneratedSeoDescriptions {
    descriptionPrimary?: string
    descriptionFr?: string
    descriptionEn?: string
    seoKeywords?: string
}

function parseJsonResponse(rawText: string): GeneratedSeoDescriptions {
    const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()

    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    const slice = firstBrace !== -1 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned
    return JSON.parse(slice)
}

async function enrichSingleBook(bookId: string) {
    const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
            id: true,
            active: true,
            title: true,
            titleFr: true,
            titleEn: true,
            author: true,
            category: true,
            language: true,
            description: true,
            descriptionFr: true,
            descriptionEn: true,
            seoKeywords: true,
        },
    })

    if (!book || !book.active) {
        return { bookId, status: 'skipped' as const, error: 'Livre introuvable ou inactif' }
    }

    const langCode = (book.language || 'fr').toLowerCase()
    const langLabel = langCode === 'ar' ? 'arabe littéraire' : langCode === 'en' ? 'anglais' : 'français'
    const existingSnippet = (book.description || book.descriptionFr || book.descriptionEn || '').trim().slice(0, 300)

    const prompt = `Tu es rédacteur éditorial et expert SEO pour la librairie marocaine en ligne Riwaya.
Enrichis la fiche produit du livre suivant avec un contenu factuel, spécifique à l'œuvre réelle, sans phrases creuses ni clichés génériques de suspense si le genre ne s'y prête pas :

- Titre : ${book.title}
- Titre FR : ${book.titleFr || 'N/A'}
- Titre EN : ${book.titleEn || 'N/A'}
- Auteur : ${book.author}
- Catégorie : ${book.category || 'Littérature'}
- Langue d'édition principale : ${langLabel} (${langCode})
- Résumé existant : ${existingSnippet || 'Aucun résumé existant'}

Consignes strictes :
1. "descriptionPrimary" : description éditoriale complète de 180 à 260 mots en ${langLabel} (minimum 220 caractères), incluant le sujet/thème du livre, le style de l'auteur et à quels lecteurs il s'adresse (sans spoiler ni balises HTML).
2. "descriptionFr" : version française naturelle de 160 à 230 mots (minimum 200 caractères).
3. "descriptionEn" : version anglaise naturelle de 160 à 230 mots (minimum 200 caractères).
4. "seoKeywords" : 6 mots-clés pertinents séparés par des virgules (ex: titre, auteur, genre, librairie maroc).

Réponds UNIQUEMENT avec un objet JSON strict valide, sans texte ni balise markdown :
{
  "descriptionPrimary": "...",
  "descriptionFr": "...",
  "descriptionEn": "...",
  "seoKeywords": "..."
}`

    const generated = await executeWithModelFallback(async (model) => {
        const result = await model.generateContent(prompt)
        return parseJsonResponse(result.response.text())
    })

    const updateData: Record<string, string> = {}
    const primaryText = (generated.descriptionPrimary || '').trim()
    const frText = (generated.descriptionFr || '').trim()
    const enText = (generated.descriptionEn || '').trim()

    // Ne jamais écraser une fiche déjà riche (>= 150 caractères)
    if ((book.description || '').trim().length < 150 && primaryText.length >= 160) {
        updateData.description = primaryText
    } else if ((book.description || '').trim().length < 150 && frText.length >= 160) {
        updateData.description = frText
    }

    if ((book.descriptionFr || '').trim().length < 150 && frText.length >= 160) {
        updateData.descriptionFr = frText
    }
    if ((book.descriptionEn || '').trim().length < 150 && enText.length >= 160) {
        updateData.descriptionEn = enText
    }
    if ((!book.seoKeywords || book.seoKeywords.trim().length < 10) && generated.seoKeywords) {
        updateData.seoKeywords = String(generated.seoKeywords).trim().slice(0, 500)
    }

    if (Object.keys(updateData).length === 0) {
        return { bookId: book.id, status: 'skipped' as const, error: 'Contenu généré insuffisant ou fiche déjà complète' }
    }

    await prisma.book.update({
        where: { id: book.id },
        data: updateData,
    })

    await invalidateCatalogCache(book.id)
    revalidatePath('/[locale]/books/[id]', 'page')
    revalidatePath('/[locale]/books', 'page')
    revalidatePath('/[locale]/admin/seo', 'page')

    await createAuditLog({
        action: 'AI_ENRICH_BOOK_SEO',
        entity: 'BOOK',
        entityId: book.id,
        details: `Enrichissement IA SEO (${Object.keys(updateData).join(', ')}) pour "${book.title}"`,
    })

    try {
        const { submitBookToIndexNow } = await import('@/lib/indexnow')
        submitBookToIndexNow(book.id)
    } catch {
        // Notification IndexNow optionnelle
    }

    const newLength = Math.max(
        (updateData.description ?? book.description ?? '').trim().length,
        (updateData.descriptionFr ?? book.descriptionFr ?? '').trim().length,
        (updateData.descriptionEn ?? book.descriptionEn ?? '').trim().length
    )

    return {
        bookId: book.id,
        title: book.title,
        status: 'enriched' as const,
        descriptionLength: newLength,
    }
}

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const ip = await getIpIdentifier()
    const rl = await rateLimit(`book-enrich-seo:${ip}`, { limit: 20, windowMs: 60000 })
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Trop de requêtes d\'enrichissement IA, patientez une minute.' },
            { status: 429, headers: { 'Cache-Control': 'no-store' } }
        )
    }

    try {
        const body = await req.json()
        const { bookIds } = EnrichBooksSchema.parse(body)

        const enriched: Array<{ bookId: string; title: string; descriptionLength: number }> = []
        const failed: Array<{ bookId: string; error: string }> = []

        for (const id of bookIds) {
            try {
                const res = await enrichSingleBook(id)
                if (res.status === 'enriched') {
                    enriched.push({
                        bookId: res.bookId,
                        title: res.title,
                        descriptionLength: res.descriptionLength,
                    })
                } else {
                    failed.push({ bookId: id, error: res.error })
                }
            } catch (err: any) {
                const msg = err?.message || ''
                if (msg.includes('GEMINI_API_KEY')) {
                    return NextResponse.json(
                        { error: 'Clé API Gemini manquante dans Configuration > Gemini.' },
                        { status: 503, headers: { 'Cache-Control': 'no-store' } }
                    )
                }
                failed.push({ bookId: id, error: 'Échec génération Gemini pour ce livre' })
            }
        }

        return NextResponse.json(
            { success: enriched.length > 0, enriched, failed },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Paramètres invalides (1 à 5 livres par lot)' },
                { status: 400, headers: { 'Cache-Control': 'no-store' } }
            )
        }
        return NextResponse.json(
            { error: 'Erreur interne lors de l\'enrichissement SEO' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        )
    }
}

