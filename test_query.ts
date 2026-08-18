import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const slug = "Best Personal Finance Books";
    const normalizedSlug = slug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
        
    console.log("Recherche avec normalizedSlug:", normalizedSlug);

    const post = await prisma.post.findFirst({
        where: { slug: normalizedSlug, published: true },
        select: { title: true, slug: true }
    });
    console.log("Post trouvé avec normalizedSlug ?", post);
    
    const postExact = await prisma.post.findFirst({
        where: { slug: slug, published: true },
        select: { title: true, slug: true }
    });
    console.log("Post trouvé avec slug exact ?", postExact);
}

main().finally(() => prisma.$disconnect());
