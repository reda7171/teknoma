import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== SEMAINE 2 : Liens croisés & clusters ===\n')

    // ========================================
    // 1. Cluster Khaled Hosseini — relier les 2 articles entre eux
    //    Lier "ألف شمس ساطعة" au livre عداء الطائرة الورقية (même auteur)
    //    et vice versa
    // ========================================
    const alfShamsPost = 'cb9b3453-4c45-42d8-b2a3-0775a2d42ac7' // ألف شمس ساطعة
    const kitePost = 'f30c62bd-c340-4905-a0d6-fc912e3f901d'     // عداء الطائرة الورقية
    
    const alfShamsBook = '15fc662e-d9d9-4fb8-ad5e-589d15812e52'  // ألف شمس ساطعة book
    const kiteBook = await prisma.book.findFirst({
        where: { title: { contains: 'الطائرة الورقية' } }
    })
    
    // Lier le livre "ألف شمس" depuis l'article عداء الطائرة
    try {
        await prisma.post.update({
            where: { id: kitePost },
            data: { books: { connect: { id: alfShamsBook } } }
        })
        console.log(`✅ Hosseini cluster: lié "ألف شمس ساطعة" à l'article عداء الطائرة`)
    } catch (e: any) { console.log(`⚠️  ${e.message}`) }
    
    // Lier le livre "عداء الطائرة" depuis l'article ألف شمس
    if (kiteBook) {
        try {
            await prisma.post.update({
                where: { id: alfShamsPost },
                data: { books: { connect: { id: kiteBook.id } } }
            })
            console.log(`✅ Hosseini cluster: lié "عداء الطائرة الورقية" à l'article ألف شمس ساطعة`)
        } catch (e: any) { console.log(`⚠️  ${e.message}`) }
    }

    // ========================================
    // 2. Cluster Adham Charqawi — lier السيرة + وبالحق أنزلناه depuis article biographie
    // ========================================
    const adhamPost = '0614eedd-3d85-4a53-b8e0-587d5e3c1b4a' // Biographie Adham Charqawi
    const adhamExtraBooks = [
        '52615dd0-9b74-44dc-999e-85a2ceaac49d', // السيرة
        '294e426e-2a66-41f9-b979-732e0fb69e06', // وبالحق أنزلناه
    ]
    for (const bookId of adhamExtraBooks) {
        try {
            await prisma.post.update({
                where: { id: adhamPost },
                data: { books: { connect: { id: bookId } } }
            })
            const b = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } })
            console.log(`✅ Adham: lié "${b?.title}" à l'article biographie`)
        } catch (e: any) { console.log(`⚠️  Adham book ${bookId}: ${e.message}`) }
    }

    // ========================================
    // 3. Cluster عالم صوفي — relier les 2 articles entre eux via livre commun
    // ========================================
    const alamSoufiPost1 = '02dd2cde-7eec-439f-b9a0-217fd750b0bc' // présentation
    const alamSoufiPost2 = '25746dbe-a5c5-4abb-8c5f-c5c95d17f203' // مراجعة شاملة
    const alamBook = 'bf9e79a2-ee23-47b4-ad01-455f7cd041a1'
    
    // Les deux doivent avoir le même livre lié
    for (const postId of [alamSoufiPost1, alamSoufiPost2]) {
        try {
            await prisma.post.update({
                where: { id: postId },
                data: { books: { connect: { id: alamBook } } }
            })
        } catch (e: any) { /* déjà lié */ }
    }
    console.log(`✅ عالم صوفي: les 2 articles partagent le même livre`)

    // ========================================
    // 4. Articles Atomic Habits — lier livre depuis article biographie James Clear
    // ========================================
    const jamesClearPost = '0e289a57-881d-4c16-b793-f8e0323a618b'
    
    // Chercher Atomic Habits dans le catalogue
    const atomicBook = await prisma.book.findFirst({
        where: {
            OR: [
                { title: { contains: 'atomic habits' } },
                { title: { contains: 'العادات' } }
            ]
        }
    })
    if (atomicBook) {
        try {
            await prisma.post.update({
                where: { id: jamesClearPost },
                data: { books: { connect: { id: atomicBook.id } } }
            })
            console.log(`✅ James Clear: lié "${atomicBook.title}" à la biographie`)
        } catch (e: any) { console.log(`⚠️  Atomic Habits: ${e.message}`) }
    } else {
        console.log(`⚠️  Atomic Habits: non trouvé en catalogue`)
    }

    // ========================================
    // 5. Article "فكر وازدد ثراء" ↔ articles Think and Grow Rich EN
    //    Lier le livre depuis les 2 articles EN
    // ========================================
    const thinkRichBook = '9c7ef415-6029-44e8-80d3-54803c0c16bc' // فكر وازدد ثراء
    const thinkRichPosts = [
        '26b1769d-1b06-4762-9986-7e4ed2bdca6c', // Think And Grow Rich - A Complete Book Review (EN)
        'd923f88d-8f5c-4201-aa83-778703c94346', // Think And Grow Rich By Napoleon Hill (EN)
    ]
    for (const postId of thinkRichPosts) {
        try {
            await prisma.post.update({
                where: { id: postId },
                data: { books: { connect: { id: thinkRichBook } } }
            })
            console.log(`✅ Think & Grow Rich: lié livre arabe à l'article EN ${postId.slice(0, 8)}`)
        } catch (e: any) { console.log(`⚠️  ${e.message}`) }
    }

    // ========================================
    // 6. Articles lecture orphelins EN — lier des livres pertinents
    // ========================================
    const orphanLinks = [
        {
            // Why Reading Is The Best Habit → Atomic Habits
            post: '67597114-9fd4-4786-a7ae-85cfc3b73b12',
            book: '0199942d-3cec-4ad8-a8e2-cf471d7be496', // Ego is the Enemy (self-help)
            label: 'Why Reading Is The Best Habit'
        },
        {
            // The Alchemist EN → خيميائي book
            post: 'eeb8e5ab-66ac-4a8c-bda0-2031fdbff647',
            book: '97951263-d9da-4790-83e5-de78bb25a2c1', // الخيميائي
            label: 'The Alchemist EN'
        },
        {
            // The 48 Laws of Power EN → livre arabe en stock
            post: 'e612f189-69e6-47d2-9bda-72ae2195022a',
            book: '8390acf8-8bdb-4c5c-aab6-860c8aee1446', // The 48 Laws of Power
            label: '48 Laws of Power EN'
        },
        {
            // Rich Dad Poor Dad EN → livre arabe en stock
            post: 'f126d47d-3e15-42bb-a8dc-44129065a58c',
            book: '524141f5-976c-4205-a9a0-34c7456d2c19', // Rich Dad Poor Dad
            label: 'Rich Dad Poor Dad EN'
        },
        {
            // $100M Money Models EN → livre en stock
            post: '9f20f029-90b4-4a89-b160-43ef5aa17417',
            book: '7a056c22-dfb2-4f78-8348-10747ab3462d', // $100M Money models
            label: '$100M Money Models EN'
        },
    ]

    for (const { post, book, label } of orphanLinks) {
        try {
            await prisma.post.update({
                where: { id: post },
                data: { books: { connect: { id: book } } }
            })
            console.log(`✅ Orphelin: lié livre à "${label}"`)
        } catch (e: any) { console.log(`⚠️  ${label}: ${e.message}`) }
    }

    // ========================================
    // 7. Articles "Roman \u0026 Fiction" orphelins en arabe → leurs livres
    // ========================================
    const extraLinks: Array<{post: string, book: string, label: string}> = [
        {
            post: '81c57dc5-76f7-4682-9269-d1d2cbb1ad14', // تحت مسمى الرجولة (summary)
            book: '1e991512-c3a7-4c32-bb3c-37858eab3dfa', // تحت مسمى الرجولة
            label: 'تحت مسمى الرجولة (summary)'
        },
        {
            post: '7f6ed318-ba3e-42ea-aeec-f4aff648ea0c', // اكتب حتى لا يأكلني الشيطان
            book: 'e71ed021-b739-4664-8e4c-6fc3ef740bc3', // اكتب حتى لا ياكلني الشيطان
            label: 'اكتب حتى لا يأكلني'
        },
    ]
    for (const { post, book, label } of extraLinks) {
        try {
            await prisma.post.update({
                where: { id: post },
                data: { books: { connect: { id: book } } }
            })
            console.log(`✅ Extra: lié "${label}"`)
        } catch (e: any) { console.log(`⚠️  ${label}: ${e.message}`) }
    }

    console.log('\n=== SEMAINE 2 TERMINÉE ===')
    await prisma.$disconnect()
}

main().catch(console.error)
