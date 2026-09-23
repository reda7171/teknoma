import { getPackById } from '@/lib/actions/packs'
import { getBooks } from '@/lib/db/books'
import { notFound } from 'next/navigation'
import PackEditForm from './PackEditForm'
import { getSetting } from '@/lib/actions/site-settings'

export default async function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const [packResult, books, whatsappPhone] = await Promise.all([
        getPackById(id),
        getBooks({ includeInactive: true, limit: 1000 }),
        getSetting('contact_whatsapp')
    ])


    if (!packResult.success || !packResult.data) {
        notFound()
    }

    const pack = packResult.data
    const selectedBookIds = pack.books.map(pb => pb.bookId)

    return (
        <PackEditForm
            pack={{
                id: pack.id,
                name: pack.name,
                nameFr: (pack as any).nameFr || '',
                nameEn: (pack as any).nameEn || '',
                description: pack.description || '',
                descriptionFr: (pack as any).descriptionFr || '',
                descriptionEn: (pack as any).descriptionEn || '',
                price: pack.price,
                originalPrice: pack.originalPrice,
                image: pack.image || '',
                isFreeDelivery: pack.isFreeDelivery,
                shippingFees: pack.shippingFees,
                sellerSku: pack.sellerSku || '',
                selectedBookIds
            }}
            books={books}
            whatsappPhone={whatsappPhone || undefined}
        />
    )
}
