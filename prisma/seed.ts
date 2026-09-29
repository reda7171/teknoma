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

    // 2. Real Sample Book for SEO & Tests
    const bookId = '08f41f86-a23c-48f6-b486-109383b0f6e0'
    const book = await prisma.book.upsert({
        where: { id: bookId },
        update: {
            title: "اول مرة اتدبر القران",
            titleFr: "اول مرة اتدبر القران",
            titleEn: "First Time I Ponder the Quran",
            author: "عادل محمد خليل",
            category: "القرآن وعلومه",
            active: true,
        },
        create: {
            id: bookId,
            title: "اول مرة اتدبر القران",
            titleFr: "اول مرة اتدبر القران",
            titleEn: "First Time I Ponder the Quran",
            author: "عادل محمد خليل",
            description: "كتاب مميز وميسر يساعد القارئ على تدبر آيات القرآن الكريم وفهم مقاصد السور وتطبيقها في الحياة اليومية.",
            descriptionFr: "Un livre remarquable et accessible qui aide le lecteur à méditer sur les versets du Saint Coran.",
            descriptionEn: "An inspiring book helping readers reflect upon the Holy Quran and understand its deeper meanings.",
            price: 65,
            originalPrice: 85,
            stock: 25,
            image: "https://riwaya.store/uploads/books/placeholder.jpg",
            category: "القرآن وعلومه",
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
