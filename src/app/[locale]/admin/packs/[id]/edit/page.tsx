import { requirePageRole } from '@/lib/page-authorization'
import { getPackById } from '@/lib/actions/packs'
import { getBooks } from '@/lib/db/books'
import { notFound } from 'next/navigation'
import PackEditForm from './PackEditForm'
import { getSetting } from '@/lib/server/site-settings'
import { prisma } from '@/lib/prisma'

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
    await requirePageRole(["ADMIN","MANAGER"])

    const { id } = await params

    const [packResult, books, whatsappPhone, allPacks] = await Promise.all([
        getPackById(id),
        getBooks({ includeInactive: true, limit: 1000 }),
        getSetting('contact_whatsapp'),
        prisma.pack.findMany({
            select: { id: true, name: true },
            orderBy: { createdAt: 'desc' }
        })
    ])

    if (!packResult.success || !packResult.data) {
        notFound()
    }

    const pack = packResult.data
    const selectedBookIds = pack.books.map(pb => pb.bookId)

    const currentIndex = allPacks.findIndex(p => p.id === id)
    const prevPack = currentIndex > 0 ? allPacks[currentIndex - 1] : null
    const nextPack = currentIndex >= 0 && currentIndex < allPacks.length - 1 ? allPacks[currentIndex + 1] : null
    const positionInfo = {
        current: currentIndex >= 0 ? currentIndex + 1 : 1,
        total: allPacks.length
    }

    return (
        <PackEditForm
            pack={{
                id: pack.id,
                name: pack.name,
                nameFr: (pack as any).nameFr || '',
                nameEn: (pack as any).nameEn || '',
                language: (pack as any).language || 'fr',
                description: pack.description || '',
                descriptionFr: (pack as any).descriptionFr || '',
                descriptionEn: (pack as any).descriptionEn || '',
                price: pack.price,
                originalPrice: pack.originalPrice,
                image: pack.image || '',
                isFreeDelivery: pack.isFreeDelivery,
                shippingFees: pack.shippingFees,
                sellerSku: pack.sellerSku || '',
                jumiaHighlights: (pack as any).jumiaHighlights || '',
                jumiaHighlightsAr: (pack as any).jumiaHighlightsAr || '',
                jumiaHighlightsFr: (pack as any).jumiaHighlightsFr || '',
                jumiaHighlightsEn: (pack as any).jumiaHighlightsEn || '',
                jumiaPackageContent: (pack as any).jumiaPackageContent || '',
                jumiaPackageContentAr: (pack as any).jumiaPackageContentAr || '',
                jumiaPackageContentFr: (pack as any).jumiaPackageContentFr || '',
                jumiaPackageContentEn: (pack as any).jumiaPackageContentEn || '',
                selectedBookIds
            } as any}
            books={books}
            whatsappPhone={whatsappPhone || undefined}
            prevPack={prevPack}
            nextPack={nextPack}
            positionInfo={positionInfo}
        />
    )
}
