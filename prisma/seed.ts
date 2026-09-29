import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding initial data for Riwaya...')

    // 1. Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({
        where: { email: 'admin@riwaya.com' },
        update: {},
        create: {
            email: 'admin@riwaya.com',
            password: hashedPassword,
            role: 'ADMIN',
            fullName: 'Admin Riwaya',
        },
    })

    // 2. Sample Book for SEO & Tests
    const bookId = 'c0000000-0000-0000-0000-000000000001'
    const book = await prisma.book.upsert({
        where: { id: bookId },
        update: {},
        create: {
            id: bookId,
            title: "L'Alchimiste",
            titleFr: "L'Alchimiste",
            titleEn: "The Alchemist",
            author: "Paulo Coelho",
            description: "Un chef-d'œuvre de la littérature universelle racontant l'histoire de Santiago, un jeune berger andalou qui part à la recherche d'un trésor enfoui près des pyramides d'Égypte.",
            descriptionFr: "Un chef-d'œuvre de la littérature universelle racontant l'histoire de Santiago, un jeune berger andalou qui part à la recherche d'un trésor enfoui près des pyramides d'Égypte.",
            descriptionEn: "A magical story about following your dreams and listening to your heart.",
            price: 65,
            originalPrice: 85,
            stock: 25,
            image: "https://riwaya.store/uploads/books/placeholder.jpg",
            category: "Développement Personnel",
            active: true,
        },
    })

    // 3. Sample Pack
    const packId = 'p0000000-0000-0000-0000-000000000001'
    await prisma.pack.upsert({
        where: { id: packId },
        update: {},
        create: {
            id: packId,
            name: "Pack Développement & Succès",
            nameFr: "Pack Développement & Succès",
            nameEn: "Self Development & Success Pack",
            description: "Une sélection exclusive de livres inspirants pour booster votre productivité et transformer votre vie.",
            descriptionFr: "Une sélection exclusive de livres inspirants pour booster votre productivité et transformer votre vie.",
            descriptionEn: "An exclusive selection of inspiring books to boost productivity and change your life.",
            price: 150,
            originalPrice: 210,
            image: "https://riwaya.store/uploads/books/placeholder.jpg",
            active: true,
            isFreeDelivery: true,
            books: {
                create: [
                    { bookId: book.id }
                ]
            }
        },
    })

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
