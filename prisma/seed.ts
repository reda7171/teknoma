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

    // 3. Books included in the 9-books pack
    const packBooks = [
        {
            id: '0caea93f-7406-4c1c-8ff5-4d150c581b13',
            title: 'محاط بالحمقى',
            author: 'Thomas Erikson',
            price: 59,
            image: '/uploads/books/محاط-بالحمقى.jpg',
            category: 'Développement Personnel',
        },
        {
            id: '26c4d394-af46-4dc4-a6ab-0b1ee72c98df',
            title: 'قوانين التحرر من الصراع النفسي',
            author: 'يوسف الحسني',
            price: 55,
            image: '/uploads/books/قوانين-التحرر-من-الصراع-النفسي.jpg',
            category: 'Développement Personnel',
        },
        {
            id: '47d602f3-958b-486f-ba64-190aa6bf0491',
            title: ' ‫عقدك النفسية سجنك الأبدي',
            author: 'يوسف الحسني',
            price: 55,
            image: '/uploads/books/عقدك-النفسية-سجنك-الأبدي.jpg',
            category: 'Développement Personnel',
        },
        {
            id: '513a3f81-da7e-44e5-8e0e-c2a1508653fe',
            title: 'فهم الأمراض النفسية منطقيًا',
            author: 'دين بيرنيت',
            price: 59,
            image: '/uploads/books/فهم-الأمراض-النفسية-منطقيا.jpg',
            category: 'Vie pratique',
        },
        {
            id: '8787b42f-d360-4f56-914f-9fc5585eba73',
            title: 'قوة عقلك الباطن',
            author: 'Joseph Murphy',
            price: 49,
            image: '/uploads/books/قوة-عقلك-الباطن.jpg',
            category: 'Développement Personnel',
        },
        {
            id: '9531e4a8-3f30-48e0-bf11-1e17cf2af947',
            title: 'السماح بالرحيل',
            author: 'ديفيد هاوكينز',
            price: 59,
            image: '/uploads/books/السماح-بالرحيل.jpg',
            category: 'Développement Personnel',
        },
        {
            id: '957925af-097d-47f3-b4c5-dcc1101872e4',
            title: 'L’intelligence émotionnelle 1&2',
            author: 'Daniel Goleman',
            price: 89,
            image: '/uploads/books/lintelligence-motionnelle-12.jpg',
            category: 'Psychologie & Sociologie',
        },
        {
            id: 'a620ceda-19bc-4ebf-bc2c-bbd1dfa150c2',
            title: 'كلنا مرضى نفسيين',
            author: 'إسماعيل عرفة',
            price: 53,
            image: '/uploads/books/كلنا-مرضى-نفسيين.jpg',
            category: 'Vie pratique',
        },
    ]

    for (const b of packBooks) {
        await prisma.book.upsert({
            where: { id: b.id },
            update: {
                title: b.title,
                author: b.author,
                active: true,
            },
            create: {
                id: b.id,
                title: b.title,
                author: b.author,
                description: b.title,
                price: b.price,
                stock: 10,
                image: b.image,
                category: b.category,
                active: true,
            },
        })
    }

    // 4. Real Sample Pack (9 books)
    const packId = '8484b12d-f103-48fb-86d4-4fec152eea4d'
    await prisma.pack.upsert({
        where: { id: packId },
        update: {
            name: "باقة 9 كتب – علم النفس وتطوير الذات- فهم النفس والمشاعر والعلاقات",
            nameFr: "Pack 9 Livres – Psychologie & Développement Personnel - Confiance, Émotions et Compréhension de Soi",
            nameEn: "Pack 9 Books - Psychology & Personal Development",
            active: true,
        },
        create: {
            id: packId,
            name: "باقة 9 كتب – علم النفس وتطوير الذات- فهم النفس والمشاعر والعلاقات",
            nameFr: "Pack 9 Livres – Psychologie & Développement Personnel - Confiance, Émotions et Compréhension de Soi",
            nameEn: "Pack 9 Books - Psychology & Personal Development",
            description: "اكتشف باقة مميزة تضم 9 كتب في علم النفس وتطوير الذات، تساعد على فهم النفس والمشاعر والسلوكيات والعلاقات مع الآخرين، وتقدم أفكاراً متنوعة حول الوعي الذاتي والتطور الشخصي.",
            descriptionFr: "Découvrez un pack de 9 livres dédiés à la psychologie et au développement personnel, conçu pour approfondir la compréhension de soi, des émotions, des comportements et des relations avec les autres.",
            descriptionEn: "Discover a curated collection of 9 books dedicated to psychology and personal development.",
            price: 499,
            originalPrice: 850,
            image: "/uploads/books/66791fa321a94fcb-pack_cover______9_____________________________________________________________1789642160724.png",
            active: true,
            isFreeDelivery: false,
            shippingFees: 30,
            books: {
                create: packBooks.map(b => ({ bookId: b.id })),
            },
        },
    })

    // Ensure all books are linked in PackBook
    for (const b of packBooks) {
        const existingRel = await prisma.packBook.findFirst({
            where: { packId, bookId: b.id },
        })
        if (!existingRel) {
            await prisma.packBook.create({
                data: {
                    packId,
                    bookId: b.id,
                },
            }).catch(() => null)
        }
    }

    // 4. WhatsApp Message Logs (only real messages are logged dynamically)

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
