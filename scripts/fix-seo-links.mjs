import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== SEMAINE 1 : Corrections maillage interne ===\n')

    // ========================================
    // 1. Lier les livres Dostoïevski manquants
    // ========================================
    const dostoPost = '026c5d0b-854a-4018-88fc-1225fe28efe6' // Article biographie Dostoïevski
    const dostoBooks = [
        '7bfe9331-5358-430e-9e51-796ba6a9d55e', // زوجة رجل آخر وزوج تحت السرير
        '7da8d8a7-58eb-4974-aac9-b5d5f22e1fe4', // الفقراء
        '86e14171-b1e7-4649-9bcd-28ee99d224a3', // حلم العم
        '8c9aeb7e-6cb2-4b53-a85f-ebec24dd1f12', // الليالي البيضاء
        '6a283804-d84a-4a96-ac00-7f144983e031', // المزدوج
    ]

    for (const bookId of dostoBooks) {
        try {
            await prisma.post.update({
                where: { id: dostoPost },
                data: { books: { connect: { id: bookId } } }
            })
            console.log(`✅ Dostoïevski: lié livre ${bookId}`)
        } catch (e: any) {
            console.log(`⚠️  ${bookId}: ${e.message}`)
        }
    }

    // ========================================
    // 2. Mailler les 3 articles Housemaid entre eux
    //    On utilise relatedPosts si elle existe, sinon on vérifie
    // ========================================
    // Les 3 articles Housemaid
    const housemaidPosts = [
        '32832d46-df8e-4b0c-9511-df7cfc47aa6c', // The Housemaid (book 1)
        '281b10a2-67ec-406b-86f1-18af9879e82e', // The Housemaid's Secret (book 2)
        '5fe30f85-35ec-4299-8a85-57569e2bb908', // The Housemaid is Watching (book 3) - déjà lié au livre
    ]

    // Lier le livre Housemaid is Watching depuis les 2 autres articles
    const housemaidWatchingBook = '15b3514b-0d56-48d6-94c3-987ae2ee5d3f'
    for (const postId of housemaidPosts.slice(0, 2)) {
        try {
            await prisma.post.update({
                where: { id: postId },
                data: { books: { connect: { id: housemaidWatchingBook } } }
            })
            console.log(`✅ Housemaid: lié livre "is Watching" à article ${postId}`)
        } catch (e: any) {
            console.log(`⚠️  Housemaid book link: ${e.message}`)
        }
    }

    // ========================================
    // 3. Corriger الزمهرير → mauvais livre lié
    //    Article al-zamharir est lié à "شمس منتصف الليل" ce qui est faux
    //    On déconnecte l'erreur — vérifier d'abord quel livre est le bon
    // ========================================
    const zamharirPost = '9d3663cf-a3c7-4caa-ba0b-fa814395a250'
    const wrongBook = '0a4168dc-0d0f-4a91-bfb1-59342d901a93' // شمس منتصف الليل (mauvais)
    
    // Chercher le vrai livre الزمهرير dans le catalogue
    const zamharirBook = await prisma.book.findFirst({
        where: { title: { contains: 'زمهرير' } }
    })
    
    if (zamharirBook) {
        await prisma.post.update({
            where: { id: zamharirPost },
            data: { books: { disconnect: { id: wrongBook } } }
        })
        await prisma.post.update({
            where: { id: zamharirPost },
            data: { books: { connect: { id: zamharirBook.id } } }
        })
        console.log(`✅ الزمهرير: corrigé → lié au bon livre "${zamharirBook.title}"`)
    } else {
        // Pas de livre الزمهرير en stock → déconnecter le faux lien uniquement
        await prisma.post.update({
            where: { id: zamharirPost },
            data: { books: { disconnect: { id: wrongBook } } }
        })
        console.log(`⚠️  الزمهرير: livre non trouvé en catalogue, mauvais lien supprimé`)
    }

    // ========================================
    // 4. Corriger ماجدولين → mauvaise attribution auteur
    //    L'article parle de جبران خليل جبران mais le livre lié est de المنفلوطي
    //    Chercher le bon livre ماجدولين de جبران
    // ========================================
    const majdolinPost = 'bf2fe14d-8f94-4ec9-acee-a00b8c8c1cdc'
    const majdolinWrongBook = '55847f15-d6de-45c2-b69e-ae22f55f6ae5' // المنفلوطي
    
    const gibranMajdolin = await prisma.book.findFirst({
        where: {
            OR: [
                { title: { contains: 'ماجدولين' }, author: { contains: 'جبران' } },
                { title: { contains: 'majdolin' } }
            ]
        }
    })
    
    if (gibranMajdolin) {
        await prisma.post.update({
            where: { id: majdolinPost },
            data: { books: { disconnect: { id: majdolinWrongBook } } }
        })
        await prisma.post.update({
            where: { id: majdolinPost },
            data: { books: { connect: { id: gibranMajdolin.id } } }
        })
        console.log(`✅ ماجدولين: corrigé → "${gibranMajdolin.title}" de ${gibranMajdolin.author}`)
    } else {
        console.log(`⚠️  ماجدولين de جبران: non trouvé en catalogue — correction manuelle nécessaire`)
        console.log(`   Le livre المنفلوطي (55847f15) reste lié — à réviser éditorialement`)
    }

    // ========================================
    // 5. Lier livres islamiques depuis l'article Top 10 FR
    //    Déjà bien lié — vérification
    // ========================================
    const islamPost = '3020974f-415a-4187-a70f-d42aac156eb2'
    const islamPostData = await prisma.post.findUnique({
        where: { id: islamPost },
        select: { books: { select: { id: true, title: true } } }
    })
    console.log(`\nTop 10 livres islamiques — livres liés: ${islamPostData?.books.length}`)
    islamPostData?.books.forEach(b => console.log(`  - ${b.title}`))

    // ========================================
    // 6. Lier السماح بالرحيل → cluster tطوير الذات
    //    Aussi lier depuis article تطوير الذات si possible
    // ========================================
    const psyPost = '489a2e60-cb56-4b8f-a8d0-63b85feac91a' // أفضل 5 كتب علم النفس
    const salmaBook = '9531e4a8-3f30-48e0-bf11-1e17cf2af947' // السماح بالرحيل
    
    try {
        await prisma.post.update({
            where: { id: psyPost },
            data: { books: { connect: { id: salmaBook } } }
        })
        console.log(`✅ Psychologie: lié "السماح بالرحيل" à l'article تطوير الذات`)
    } catch (e: any) {
        console.log(`⚠️  Psychologie link: ${e.message}`)
    }

    // ========================================
    // 7. Lier عداء الطائرة الورقية → bon livre Khaled Hosseini
    //    Actuellement lié à un livre Dostoïevski (!!) → corriger
    // ========================================
    const kitePost = 'f30c62bd-c340-4905-a0d6-fc912e3f901d'
    const dostoWrongInKite = '7bfe9331-5358-430e-9e51-796ba6a9d55e' // Dostoïevski (faux)
    
    const kiteRunnerBook = await prisma.book.findFirst({
        where: {
            OR: [
                { title: { contains: 'الطائرة الورقية' } },
                { title: { contains: 'kite runner' } }
            ]
        }
    })
    
    // Déconnecter le mauvais livre
    try {
        await prisma.post.update({
            where: { id: kitePost },
            data: { books: { disconnect: { id: dostoWrongInKite } } }
        })
        console.log(`✅ عداء الطائرة: mauvais lien Dostoïevski supprimé`)
    } catch (e: any) {
        console.log(`⚠️  Kite disconnect: ${e.message}`)
    }
    
    if (kiteRunnerBook) {
        await prisma.post.update({
            where: { id: kitePost },
            data: { books: { connect: { id: kiteRunnerBook.id } } }
        })
        console.log(`✅ عداء الطائرة: lié au bon livre "${kiteRunnerBook.title}"`)
    } else {
        console.log(`⚠️  The Kite Runner: non trouvé dans le catalogue`)
    }

    // ========================================
    // 8. صاحب الظل الطويل → mauvais livre lié (فارس الاندلس ≠ صاحب الظل الطويل)
    // ========================================
    const shadowPost = '1e13a1e0-af3c-49c6-95ee-9d7207a12301'
    const farisWrong = 'f4758af4-54fd-4386-ae64-8f79713162b2' // فارس الاندلس (faux)
    
    const shadowBook = await prisma.book.findFirst({
        where: { title: { contains: 'الظل الطويل' } }
    })
    
    try {
        await prisma.post.update({
            where: { id: shadowPost },
            data: { books: { disconnect: { id: farisWrong } } }
        })
        console.log(`✅ صاحب الظل الطويل: mauvais lien supprimé`)
    } catch (e: any) {
        console.log(`⚠️  Shadow disconnect: ${e.message}`)
    }
    
    if (shadowBook) {
        await prisma.post.update({
            where: { id: shadowPost },
            data: { books: { connect: { id: shadowBook.id } } }
        })
        console.log(`✅ صاحب الظل الطويل: lié au bon livre "${shadowBook.title}"`)
    } else {
        console.log(`⚠️  صاحب الظل الطويل: non trouvé en catalogue`)
    }

    console.log('\n=== TERMINÉ ===')
    await prisma.$disconnect()
}

main().catch(console.error)
