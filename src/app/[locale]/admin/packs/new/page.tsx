import { requirePageRole } from '@/lib/page-authorization'
import { getBooks } from '@/lib/db/books'
import PackForm from './PackForm'
import { getSetting } from '@/lib/server/site-settings'
import { prisma } from '@/lib/prisma'

export default async function NewPackPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    const [books, accessories, whatsappPhone] = await Promise.all([
        getBooks({ includeInactive: true, limit: 5000 }),
        prisma.extraProduct.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                price: true,
                image: true,
                category: true,
                active: true,
                stock: true,
            },
        }),
        getSetting('contact_whatsapp')
    ])

    const selectableItems = [
        ...books.map(book => ({ ...book, itemType: 'BOOK' as const })),
        ...accessories.map(accessory => ({
            id: accessory.id,
            title: accessory.name,
            author: accessory.category === 'KIDS' ? 'Produits enfants' : 'Accessoires',
            price: accessory.price,
            image: accessory.image || undefined,
            category: accessory.category === 'KIDS'
                ? 'Produits enfants'
                : `Accessoires · ${accessory.category}`,
            language: 'MULTI',
            active: accessory.active,
            stock: accessory.stock,
            itemType: 'ACCESSORY' as const,
        })),
    ]

    return <PackForm books={selectableItems} whatsappPhone={whatsappPhone || undefined} />
}
