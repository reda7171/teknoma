import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const post = await prisma.post.findUnique({
        where: { slug: 'majdolin-gibran-roman-arabe' }
    })
    
    if (!post) {
        console.log("Post non trouvé")
        return
    }

    const newTitle = post.title.replace(/جبران خليل جبران/g, "مصطفى لطفي المنفلوطي")
    const newExcerpt = post.excerpt ? post.excerpt.replace(/جبران خليل جبران/g, "مصطفى لطفي المنفلوطي").replace(/جبران/g, "المنفلوطي") : null
    const newContent = post.content.replace(/جبران خليل جبران/g, "مصطفى لطفي المنفلوطي").replace(/جبران/g, "المنفلوطي")
    
    await prisma.post.update({
        where: { id: post.id },
        data: {
            title: newTitle,
            slug: 'majdolin-manfaluti-roman-arabe',
            excerpt: newExcerpt,
            content: newContent
        }
    })
    
    console.log("✅ Article Majdolin mis à jour avec le bon auteur (Al-Manfaluti) !")
    
    // Au cas où, on s'assure qu'il est bien lié au livre de Manfaluti
    await prisma.post.update({
        where: { id: post.id },
        data: {
            books: { connect: { id: '55847f15-d6de-45c2-b69e-ae22f55f6ae5' } }
        }
    })
    
    await prisma.$disconnect()
}

main().catch(console.error)
